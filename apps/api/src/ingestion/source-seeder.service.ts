import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface SourceSeed {
  provider: string;
  name: string;
  feedUrl: string;
  homepage: string;
  language: 'ko' | 'en' | 'mixed';
}

// 시드: 한국어 RSS 우선 + 영어는 자동 번역 표시.
const DEFAULT_SOURCES: SourceSeed[] = [
  // 한국어
  {
    provider: 'geeknews',
    name: 'GeekNews',
    feedUrl: 'https://feeds.feedburner.com/geeknews-feed',
    homepage: 'https://news.hada.io',
    language: 'ko',
  },
  {
    provider: 'kakao_tech',
    name: '카카오 기술블로그',
    feedUrl: 'https://tech.kakao.com/feed/',
    homepage: 'https://tech.kakao.com',
    language: 'ko',
  },
  {
    provider: 'toss_tech',
    name: '토스 기술블로그',
    feedUrl: 'https://toss.tech/rss.xml',
    homepage: 'https://toss.tech',
    language: 'ko',
  },
  {
    provider: 'woowahan',
    name: '우아한형제들',
    feedUrl: 'https://techblog.woowahan.com/feed/',
    homepage: 'https://techblog.woowahan.com',
    language: 'ko',
  },
  {
    provider: 'naver_d2',
    name: 'NAVER D2',
    feedUrl: 'https://d2.naver.com/d2.atom',
    homepage: 'https://d2.naver.com',
    language: 'ko',
  },
  // 영어 (Gemini 가 한국어 번역해서 표시)
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
