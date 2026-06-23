import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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
  // AI / LLM 생태계 — 모델 릴리스 · 벤치마크 · 에이전트 하네스
  {
    provider: 'openai',
    name: 'OpenAI',
    feedUrl: 'https://openai.com/news/rss.xml',
    homepage: 'https://openai.com/news',
    language: 'en',
  },
  {
    provider: 'deepmind',
    name: 'Google DeepMind',
    feedUrl: 'https://deepmind.google/blog/rss.xml',
    homepage: 'https://deepmind.google/blog',
    language: 'en',
  },
  {
    provider: 'huggingface',
    name: 'Hugging Face',
    feedUrl: 'https://huggingface.co/blog/feed.xml',
    homepage: 'https://huggingface.co/blog',
    language: 'en',
  },
  {
    provider: 'simonwillison',
    name: 'Simon Willison',
    feedUrl: 'https://simonwillison.net/atom/everything/',
    homepage: 'https://simonwillison.net',
    language: 'en',
  },
  {
    provider: 'latentspace',
    name: 'Latent Space',
    feedUrl: 'https://www.latent.space/feed',
    homepage: 'https://www.latent.space',
    language: 'en',
  },
  {
    provider: 'importai',
    name: 'Import AI',
    feedUrl: 'https://jack-clark.net/feed/',
    homepage: 'https://jack-clark.net',
    language: 'en',
  },
  // 프론트엔드/웹 거물 블로그 — 한국 FE 커뮤니티가 번역해 읽는 양질 소스 (자동 번역).
  {
    provider: 'overreacted',
    name: 'overreacted (Dan Abramov)',
    feedUrl: 'https://overreacted.io/rss.xml',
    homepage: 'https://overreacted.io',
    language: 'en',
  },
  {
    provider: 'josh_comeau',
    name: 'Josh W. Comeau',
    feedUrl: 'https://www.joshwcomeau.com/rss.xml',
    homepage: 'https://www.joshwcomeau.com',
    language: 'en',
  },
  {
    provider: 'kent_dodds',
    name: 'Kent C. Dodds',
    feedUrl: 'https://kentcdodds.com/blog/rss.xml',
    homepage: 'https://kentcdodds.com',
    language: 'en',
  },
  {
    provider: 'isquared',
    name: 'isquaredsoftware (Mark Erikson)',
    feedUrl: 'https://blog.isquaredsoftware.com/index.xml',
    homepage: 'https://blog.isquaredsoftware.com',
    language: 'en',
  },
  {
    provider: 'ben_myers',
    name: 'Ben Myers (a11y)',
    feedUrl: 'https://benmyers.dev/feed.xml',
    homepage: 'https://benmyers.dev',
    language: 'en',
  },
  {
    provider: 'css_tricks',
    name: 'CSS-Tricks',
    feedUrl: 'https://css-tricks.com/feed/',
    homepage: 'https://css-tricks.com',
    language: 'en',
  },
  {
    provider: 'smashing',
    name: 'Smashing Magazine',
    feedUrl: 'https://www.smashingmagazine.com/feed/',
    homepage: 'https://www.smashingmagazine.com',
    language: 'en',
  },
  {
    provider: 'web_dev',
    name: 'web.dev',
    feedUrl: 'https://web.dev/static/blog/feed.xml',
    homepage: 'https://web.dev',
    language: 'en',
  },
  {
    provider: 'v8_dev',
    name: 'V8',
    feedUrl: 'https://v8.dev/blog.atom',
    homepage: 'https://v8.dev',
    language: 'en',
  },
  {
    provider: 'mdn',
    name: 'MDN Blog',
    feedUrl: 'https://developer.mozilla.org/en-US/blog/rss.xml',
    homepage: 'https://developer.mozilla.org/en-US/blog',
    language: 'en',
  },
  {
    provider: 'pragmatic',
    name: 'Pragmatic Engineer',
    feedUrl: 'https://newsletter.pragmaticengineer.com/feed',
    homepage: 'https://newsletter.pragmaticengineer.com',
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
      // 공식 RSS 가 사라진 Anthropic 소스 비활성화 (404)
      await this.prisma.source.updateMany({
        where: { provider: 'anthropic' },
        data: { active: false },
      });
      this.logger.log(`Seeded ${DEFAULT_SOURCES.length} sources`);
    } catch (e) {
      this.logger.warn(`Source seeding skipped: ${(e as Error).message}`);
    }
  }
}
