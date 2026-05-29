import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SourceSeed {
  provider: string;
  name: string;
  feedUrl: string;
  homepage: string;
  language: 'ko' | 'en' | 'mixed';
}

const DEFAULT_SOURCES: SourceSeed[] = [
  {
    provider: 'geeknews',
    name: 'GeekNews',
    feedUrl: 'https://feeds.feedburner.com/geeknews-feed',
    homepage: 'https://news.hada.io',
    language: 'ko',
  },
  {
    provider: 'hackernews',
    name: 'Hacker News',
    feedUrl: 'https://hnrss.org/frontpage',
    homepage: 'https://news.ycombinator.com',
    language: 'en',
  },
  {
    provider: 'devto',
    name: 'dev.to',
    feedUrl: 'https://dev.to/feed',
    homepage: 'https://dev.to',
    language: 'en',
  },
  {
    provider: 'techcrunch',
    name: 'TechCrunch',
    feedUrl: 'https://techcrunch.com/feed/',
    homepage: 'https://techcrunch.com',
    language: 'en',
  },
  {
    provider: 'anthropic',
    name: 'Anthropic',
    feedUrl: 'https://www.anthropic.com/news/rss.xml',
    homepage: 'https://www.anthropic.com/news',
    language: 'en',
  },
];

@Injectable()
export class SourceSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SourceSeederService.name);

  constructor(private prisma: PrismaService) {}

  async onApplicationBootstrap() {
    try {
      for (const src of DEFAULT_SOURCES) {
        await this.prisma.source.upsert({
          where: { feedUrl: src.feedUrl },
          create: src,
          update: {
            name: src.name,
            homepage: src.homepage,
            language: src.language,
            active: true,
          },
        });
      }
      this.logger.log(`Seeded ${DEFAULT_SOURCES.length} sources`);
    } catch (e) {
      this.logger.warn(`Source seeding skipped: ${(e as Error).message}`);
    }
  }
}
