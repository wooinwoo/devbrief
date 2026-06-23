import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubTrendingService } from './github-trending.service';

/** 설명/이름 텍스트로 분야 추론. 위에서부터 먼저 매칭되는 것 채택. */
const CATEGORY_RULES: Array<{ category: string; re: RegExp }> = [
  {
    category: 'ai',
    re: /\b(ai|llm|gpt|agent|agentic|rag|ml|machine.?learning|neural|diffusion|prompt|chatbot|inference|embedding|transformer|fine.?tun|openai|anthropic|claude|gemini|computer.?vision|\bvision\b|notebook.?lm)/i,
  },
  {
    category: 'web',
    re: /\b(react|vue|svelte|next\.?js|nuxt|astro|frontend|css|tailwind|web|browser|component|fullstack|api framework|http server)/i,
  },
  {
    category: 'infra',
    re: /\b(kubernetes|k8s|docker|terraform|devops|cloud|deploy|infra|observability|monitoring|database|postgres|sql|cache|queue|kafka|nginx|proxy)/i,
  },
  {
    category: 'cli',
    re: /\b(cli|terminal|command.?line|shell|tui|dotfiles|zsh|bash)/i,
  },
  {
    category: 'data',
    re: /\b(data|etl|pipeline|analytics|pandas|spark|warehouse|dataset|scrap|crawl)/i,
  },
];

export function categorize(text: string): string {
  for (const { category, re } of CATEGORY_RULES) {
    if (re.test(text)) return category;
  }
  return 'etc';
}

/** GitHub 설명에 섞인 이모지·장식문자 제거 — 서비스 톤 통일 */
export function stripEmoji(s: string): string {
  return s
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

@Injectable()
export class ReposService {
  private readonly logger = new Logger(ReposService.name);

  constructor(
    private prisma: PrismaService,
    private trending: GithubTrendingService,
  ) {}

  /** period별 트렌딩을 통째로 갈아끼움(deleteMany→createMany). 누적 없음. */
  async refresh(period: 'daily' | 'weekly') {
    const repos = await this.trending.fetch(period);
    if (!repos.length) {
      this.logger.warn(`trending ${period}: 0건 파싱 (페이지 구조 변경?)`);
      return { period, synced: 0 };
    }

    await this.prisma.$transaction([
      this.prisma.repo.deleteMany({ where: { period } }),
      this.prisma.repo.createMany({
        data: repos.map((r) => ({
          fullName: r.fullName,
          owner: r.owner,
          name: r.name,
          url: r.url,
          description: r.description ? stripEmoji(r.description) || null : null,
          language: r.language,
          languageColor: r.languageColor,
          stars: r.stars,
          forks: r.forks,
          periodStars: r.periodStars,
          period,
          rank: r.rank,
          category: categorize(`${r.name} ${r.description ?? ''}`),
        })),
      }),
    ]);

    this.logger.log(`trending ${period}: ${repos.length}건 갱신`);
    return { period, synced: repos.length };
  }

  private syncing = false;

  async refreshAll() {
    // cron + 수동 /sync 동시 호출 방어
    if (this.syncing) {
      this.logger.warn('이미 sync 진행 중 — 중복 호출 스킵');
      return { daily: 0, weekly: 0, skipped: true };
    }
    this.syncing = true;
    try {
      const daily = await this.refresh('daily');
      const weekly = await this.refresh('weekly');
      return { daily: daily.synced, weekly: weekly.synced };
    } finally {
      this.syncing = false;
    }
  }

  async list(opts: { period?: string; language?: string; category?: string }) {
    const period = opts.period === 'weekly' ? 'weekly' : 'daily';
    return this.prisma.repo.findMany({
      where: {
        period,
        ...(opts.language ? { language: opts.language } : {}),
        ...(opts.category ? { category: opts.category } : {}),
      },
      orderBy: { rank: 'asc' },
    });
  }
}
