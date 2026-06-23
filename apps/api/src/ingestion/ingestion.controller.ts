import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from './ingestion.service';

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
   * onlyMissing=1 이면 summaryOneLine 비어 있는 글만 (기본).
   */
  @Post('reanalyze')
  async reanalyze(@Query('onlyMissing') onlyMissing?: string, @Query('limit') limitStr?: string) {
    const all = onlyMissing === '0';
    const limit = Math.min(Number(limitStr) || 500, 2000);

    const articles = await this.prisma.article.findMany({
      // 기본: 한 줄 또는 세 줄 요약이 빠진 글 (무료 추출요약으로 백필)
      where: all ? {} : { OR: [{ summaryOneLine: null }, { summaryThreeLine: null }] },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, contentSnippet: true },
    });

    const retryOpts = {
      attempts: 6,
      backoff: { type: 'exponential', delay: 60_000 },
      removeOnComplete: 500,
      removeOnFail: 1000,
    };
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
}
