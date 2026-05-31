import { Controller, Post, Query } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ingestion')
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
  async reanalyze(
    @Query('onlyMissing') onlyMissing?: string,
    @Query('limit') limitStr?: string,
  ) {
    const all = onlyMissing === '0';
    const limit = Math.min(Number(limitStr) || 500, 2000);

    const articles = await this.prisma.article.findMany({
      where: all ? {} : { summaryOneLine: null },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, url: true },
    });

    for (const a of articles) {
      // snippet 정보 부족 — 제목만으로 일단 추정
      await this.summarizationQueue.add('summarize', {
        articleId: a.id,
        title: a.title,
        snippet: '',
      });
      await this.embeddingQueue.add('embed', {
        articleId: a.id,
        title: a.title,
        snippet: '',
      });
    }
    return { queued: articles.length };
  }
}
