import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
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

  async ingestSource(sourceId: string, feedUrl: string): Promise<number> {
    const feed = await this.rss.parse(feedUrl);
    let newCount = 0;

    for (const item of feed.items ?? []) {
      const url = item.link;
      const title = item.title;
      if (!url || !title) continue;

      const existed = await this.prisma.article.findUnique({ where: { url } });
      if (existed) continue;

      const article = await this.prisma.article.create({
        data: {
          sourceId,
          title: title.trim().slice(0, 500),
          url,
          author: item.creator ?? null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          tags: (item.categories ?? []).slice(0, 10),
        },
      });
      newCount++;

      const snippet =
        item['content:encoded'] ?? item.contentSnippet ?? item.description ?? item.content ?? '';

      await this.summarizationQueue.add('summarize', {
        articleId: article.id,
        title: article.title,
        snippet: String(snippet).slice(0, 4000),
      });
      await this.embeddingQueue.add('embed', {
        articleId: article.id,
        title: article.title,
        snippet: String(snippet).slice(0, 2000),
      });
    }

    return newCount;
  }
}
