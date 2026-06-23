import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RssParserService } from './rss-parser.service';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private rss: RssParserService,
    @InjectQueue('summarization') private summarizationQueue: Queue,
    @InjectQueue('embedding') private embeddingQueue: Queue,
  ) {}

  async ingestAll(): Promise<{ sourceCount: number; newArticles: number }> {
    const sources = await this.prisma.source.findMany({ where: { active: true } });
    let total = 0;
    for (const source of sources) {
      try {
        const count = await this.ingestSource(source.id, source.feedUrl);
        total += count;
        this.logger.log(`[${source.name}] +${count} 신규`);
      } catch (e) {
        this.logger.error(`[${source.name}] 수집 실패: ${(e as Error).message}`);
      }
    }
    return { sourceCount: sources.length, newArticles: total };
  }

  /** 소스당 최신 수집 상한 — 아카이브 전체가 실린 피드(OpenAI 등)의 폭주 방지.
   *  Gemini 일일 한도 안에서 번역/요약이 돌게 하는 1차 밸브이기도 하다. */
  private readonly maxPerSource = Number(process.env.INGEST_MAX_PER_SOURCE) || 30;

  async ingestSource(sourceId: string, feedUrl: string): Promise<number> {
    const feed = await this.rss.parse(feedUrl);
    let newCount = 0;

    const items = [...(feed.items ?? [])]
      .sort((a, b) => {
        const ta = a.isoDate ? Date.parse(a.isoDate) : 0;
        const tb = b.isoDate ? Date.parse(b.isoDate) : 0;
        return tb - ta;
      })
      .slice(0, this.maxPerSource);

    for (const item of items) {
      const url = item.link;
      const title = item.title;
      if (!url || !title) continue;

      const existed = await this.prisma.article.findUnique({ where: { url } });
      if (existed) continue;

      const imageUrl = await this.rss.resolveImageUrl(item);

      const rawSnippet =
        item['content:encoded'] ?? item.contentSnippet ?? item.description ?? item.content ?? '';
      const snippet = String(rawSnippet);
      // 요약 재생성용 본문 평문 발췌 (HTML 제거 후 800자). 백필 시 재취득 불필요.
      const contentSnippet =
        snippet
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 800) || null;

      const article = await this.prisma.article.create({
        data: {
          sourceId,
          title: title.trim().slice(0, 500),
          url,
          author: item.creator ?? null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          tags: (item.categories ?? []).slice(0, 10),
          imageUrl,
          contentSnippet,
        },
      });
      newCount++;

      await this.summarizationQueue.add(
        'summarize',
        {
          articleId: article.id,
          title: article.title,
          snippet: String(snippet).slice(0, 4000),
        },
        // 한도/일시 장애 시 지수 backoff 재시도 (1분 → 2분 → 4분 ...)
        {
          attempts: 6,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
      await this.embeddingQueue.add(
        'embed',
        {
          articleId: article.id,
          title: article.title,
          snippet: String(snippet).slice(0, 2000),
        },
        // summarization 과 동일한 지수 backoff 재시도
        {
          attempts: 6,
          backoff: { type: 'exponential', delay: 60_000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      );
    }

    return newCount;
  }
}
