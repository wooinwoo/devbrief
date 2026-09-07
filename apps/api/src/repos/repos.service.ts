import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GithubTrendingService } from './github-trending.service';

// ASCII(latin/digit) 기준 단어 경계 — web 의 category.ts 와 동일한 규칙.
// \b 는 후행 경계가 없으면 접두 일치를 허용해 'aims'→ai, 'airflow'→ai, 'client'→cli 같은
// 오분류가 DB 에 영속됐다. 접미 파생이 필요한 토큰(agents, fine-tuning 등)은 명시적으로 적는다.
const WB_BEFORE = '(?<![A-Za-z0-9])';
const WB_AFTER = '(?![A-Za-z0-9])';

const bounded = (alternation: string): RegExp =>
  new RegExp(`${WB_BEFORE}(?:${alternation})${WB_AFTER}`, 'i');

/** 설명/이름 텍스트로 분야 추론. 위에서부터 먼저 매칭되는 것 채택. */
const CATEGORY_RULES: Array<{ category: string; re: RegExp }> = [
  {
    category: 'ai',
    re: bounded(
      'ai|llms?|gpt|agents?|agentic|rag|ml|machine.?learning|neural|diffusion|prompts?|chatbots?|inference|embeddings?|transformers?|fine.?tun\\w*|openai|anthropic|claude|gemini|computer.?vision|vision|notebook.?lm',
    ),
  },
  {
    category: 'web',
    re: bounded(
      'react|vue|svelte|next\\.?js|nuxt|astro|frontend|css|tailwind|web|browsers?|components?|fullstack|api framework|http server',
    ),
  },
  {
    category: 'infra',
    re: bounded(
      'kubernetes|k8s|docker|terraform|devops|cloud|deploy\\w*|infra\\w*|observability|monitoring|databases?|postgres\\w*|sql|sqlite|cach(?:e|es|ing)|queues?|kafka|nginx|prox(?:y|ies)',
    ),
  },
  {
    category: 'cli',
    re: bounded('cli|terminal|command.?line|shell|tui|dotfiles|zsh|bash'),
  },
  {
    category: 'data',
    re: bounded(
      'data|etl|pipelines?|analytics|pandas|spark|warehouse|datasets?|scrap(?:e|er|ers|ing)|crawl\\w*',
    ),
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
  return (
    s
      // biome-ignore lint/suspicious/noMisleadingCharacterClass: 이모지 본체·변형 선택자·ZWJ를 의도적으로 함께 제거
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

/** 마지막 성공 sync 이후 이 시간을 넘기면 stale 경고 (갱신 실패가 지속 중이라는 신호) */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

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
      // 0건이면 기존 데이터를 보존(갈아끼우지 않음)하되, 영구 파손 감지를 위해 error로 격상.
      // fetch 실패/페이지 구조 변경 모두 여기로 수렴하므로 가시성이 중요하다.
      this.logger.error(
        `trending ${period}: 0건 파싱 — 기존 데이터 보존. 페이지 구조 변경 또는 fetch 실패 의심.`,
      );
      await this.warnIfStale(period);
      return { period, synced: 0 };
    }

    // 부분 파손 가드 — stars 셀렉터만 깨지면 전부 0으로 정상 데이터를 덮어쓴다.
    // 전원 periodStars=0 은 실데이터에서 나올 수 없는 조합이므로 파싱 파손으로 보고 보존한다.
    if (repos.every((r) => r.periodStars === 0)) {
      this.logger.warn(
        `trending ${period}: 전 항목 periodStars=0 — 셀렉터 부분 파손 의심, 기존 데이터 보존.`,
      );
      await this.warnIfStale(period);
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

  /**
   * 갱신 실패가 지속되면 몇 주 전 트렌딩이 최신인 척 서빙된다.
   * fetchedAt(성공 sync 마다 행이 재생성돼 = 마지막 성공 시각)이 48h 를 넘으면 warn.
   * 응답 shape 은 바꾸지 않는다 — 로그 기반 감지만.
   */
  private async warnIfStale(period: 'daily' | 'weekly') {
    try {
      const agg = await this.prisma.repo.aggregate({
        where: { period },
        _max: { fetchedAt: true },
      });
      const last = agg._max.fetchedAt;
      if (!last) return; // 데이터 자체가 없으면 stale 개념 없음
      const ageMs = Date.now() - last.getTime();
      if (ageMs > STALE_THRESHOLD_MS) {
        this.logger.warn(
          `trending ${period}: 마지막 성공 sync ${Math.floor(ageMs / 3.6e6)}시간 전 — stale 데이터 서빙 중.`,
        );
      }
    } catch (e) {
      // stale 감지는 부가 기능 — 조회 실패가 refresh 흐름을 깨지 않게 한다.
      this.logger.warn(`trending ${period}: stale 감지 조회 실패: ${(e as Error).message}`);
    }
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
