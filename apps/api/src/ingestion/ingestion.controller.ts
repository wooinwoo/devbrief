import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from './ingestion.service';

// onlyMissing 백필 대상 행 — embedding 은 pgvector Unsupported 타입이라 raw 쿼리로만 거를 수 있다
interface ReanalyzeRow {
  id: string;
  title: string;
  contentSnippet: string | null;
  needSummary: boolean;
  needEmbedding: boolean;
}

@Controller('ingestion')
@UseGuards(AdminGuard)
export class IngestionController {
  constructor(
    private ingestion: IngestionService,
    private prisma: PrismaService,
    @InjectQueue('ingestion') private queue: Queue,
    @InjectQueue('summarization') private summarizationQueue: Queue,
    @InjectQueue('embedding') private embeddingQueue: Queue,
  ) {}

  @Post('run')
  async runAsync() {
    await this.queue.add('ingest-all', {});
    return { status: 'queued' };
  }

  @Post('run-sync')
  async runSync() {
    return this.ingestion.ingestAll();
  }

  /**
   * 기존 글 전체에 요약/임베딩 큐 다시 push.
   * AI 모델 교체 후 (Anthropic → Gemini, Voyage → Gemini embed) 일괄 재처리용.
   * onlyMissing=1(기본)이면 요약/임베딩이 비어 있거나 무료 추출요약(summarySource='free')으로
   * 임시 백필된 글만 — 결손 종류별로 필요한 큐에만 선별 적재해 멀쩡한 요약을 덮지 않는다.
   */
  @Post('reanalyze')
  async reanalyze(@Query('onlyMissing') onlyMissing?: string, @Query('limit') limitStr?: string) {
    const all = onlyMissing === '0';
    const limit = Math.min(Number(limitStr) || 500, 2000);

    const retryOpts = {
      attempts: 6,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    };

    if (all) {
      // 전체 재처리 — 최신순으로 요약+임베딩 둘 다 재생성
      const articles = await this.prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: { id: true, title: true, contentSnippet: true },
      });
      for (const a of articles) {
        // 저장된 본문 발췌(contentSnippet)로 요약 재생성 — 없으면 제목만 번역
        const snippet = a.contentSnippet ?? '';
        await this.summarizationQueue.add(
          'summarize',
          { articleId: a.id, title: a.title, snippet },
          retryOpts,
        );
        await this.embeddingQueue.add(
          'embed',
          { articleId: a.id, title: a.title, snippet },
          retryOpts,
        );
      }
      return { queued: articles.length };
    }

    // 결손 백필 — embedding IS NULL 은 Prisma where 로 못 거르므로 CLI reanalyze 와 동일하게 raw 쿼리.
    // summarySource='free'(키 장애 중 무료 추출요약으로 채운 글)도 키 복구 후 재요약 대상.
    const rows = await this.prisma.$queryRawUnsafe<ReanalyzeRow[]>(
      `SELECT id, title, "contentSnippet",
              ("summaryOneLine" IS NULL OR "summaryThreeLine" IS NULL OR "summarySource" = 'free') AS "needSummary",
              (embedding IS NULL) AS "needEmbedding"
         FROM "Article"
        WHERE "summaryOneLine" IS NULL
           OR "summaryThreeLine" IS NULL
           OR "summarySource" = 'free'
           OR embedding IS NULL
        ORDER BY "publishedAt" DESC
        LIMIT $1`,
      limit,
    );

    let needSummary = 0;
    let needEmbedding = 0;
    for (const row of rows) {
      const snippet = row.contentSnippet ?? '';
      if (row.needSummary) {
        await this.summarizationQueue.add(
          'summarize',
          { articleId: row.id, title: row.title, snippet },
          retryOpts,
        );
        needSummary++;
      }
      if (row.needEmbedding) {
        await this.embeddingQueue.add(
          'embed',
          { articleId: row.id, title: row.title, snippet },
          retryOpts,
        );
        needEmbedding++;
      }
    }
    return { queued: rows.length, needSummary, needEmbedding };
  }
}
