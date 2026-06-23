import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_PROMPT = `당신은 한국 개발자 매체의 시니어 에디터입니다.
그 날 들어온 글 N 개 중 핵심 5 개를 골라 *오늘의 다이제스트* 를 만듭니다.

매우 짧게. 토큰 절약 필수.

스키마 (이 키 외 추가 금지):
{
  "intro": "최대 35자, 한 문장",
  "items": [
    { "articleId": "원본 id", "headline": "최대 30자", "takeaway": "최대 40자" }
  ]
}

규칙:
- items 정확히 5개. 글 5개 미만이면 그만큼.
- 영문 제목은 자연스러운 한국어로.
- em dash 금지, 마크다운 금지, 줄바꿈 금지 (\\n 금지).
- 모든 값 큰따옴표.`;

interface ArticleInput {
  id: string;
  title: string;
  titleKo: string | null;
  summaryOneLine: string | null;
  sourceName: string;
  tags: string[];
}

export interface DigestPayload {
  intro: string;
  items: Array<{
    articleId: string;
    headline: string;
    takeaway: string;
  }>;
}

@Injectable()
export class DailyDigestService {
  private readonly logger = new Logger(DailyDigestService.name);

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
  ) {}

  // 다이제스트 날짜 경계는 KST(Asia/Seoul, UTC+9) 기준. 크론이 09:30 KST에 돌 때
  // 서버가 UTC면 setHours(0,0,0,0)이 전날로 어긋난다. 로컬타임 의존 없이 KST 자정의
  // UTC 순간을 계산한다. (서울은 DST 없어 +9 고정)
  private static readonly KST_OFFSET_MS = 9 * 60 * 60 * 1000;

  private dayStart(date: Date = new Date()): Date {
    const kstMs = date.getTime() + DailyDigestService.KST_OFFSET_MS;
    const kst = new Date(kstMs);
    // KST 기준 연/월/일을 UTC getter로 읽어 그 날 00:00 KST의 UTC 순간 도출
    const kstMidnightUtcMs =
      Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) -
      DailyDigestService.KST_OFFSET_MS;
    return new Date(kstMidnightUtcMs);
  }

  /** dayStart(=KST 자정의 UTC 순간)를 KST 기준 yyyy-mm-dd 문자열로. */
  private dayLabel(dayStartUtc: Date): string {
    return new Date(dayStartUtc.getTime() + DailyDigestService.KST_OFFSET_MS)
      .toISOString()
      .slice(0, 10);
  }

  /**
   * 그 날 들어온 글 → Gemini 가 5 개 골라 headline/takeaway 작성.
   * 같은 날짜에 이미 있으면 update.
   */
  async generateForToday(opts: { force?: boolean } = {}): Promise<DigestPayload | null> {
    const today = this.dayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await this.prisma.dailyDigest.findUnique({
      where: { date: today },
    });
    if (existing && !opts.force) {
      this.logger.debug(`Daily digest already generated for ${this.dayLabel(today)}`);
      return existing.items as unknown as DigestPayload;
    }

    // 그 날 (또는 그 직전) 들어온 글 30개
    let articles = await this.prisma.article.findMany({
      where: {
        OR: [
          { fetchedAt: { gte: today, lt: tomorrow } },
          { publishedAt: { gte: today, lt: tomorrow } },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      include: { source: { select: { name: true } } },
    });

    // 당일 글이 부족하면(수집 공백·주말 등) 최신 글로 폴백 → 다이제스트가 비지 않게.
    // 개인 프로젝트 특성상 매일 수집이 돌지 않을 수 있어 "오늘의 핵심"을 최근 글 기준으로 채운다.
    if (articles.length < 5) {
      this.logger.log(`당일 글 ${articles.length}개 — 최신 글로 폴백해 digest 생성`);
      articles = await this.prisma.article.findMany({
        orderBy: { publishedAt: 'desc' },
        take: 30,
        include: { source: { select: { name: true } } },
      });
    }

    if (articles.length === 0) {
      this.logger.log('글이 하나도 없음 — digest skip');
      return null;
    }

    // Gemini 키 없으면 곧장 무료 휴리스틱
    if (!this.gemini.isAvailable()) {
      return this.generateHeuristic(today, articles);
    }

    const input: ArticleInput[] = articles.map((a) => ({
      id: a.id,
      title: a.title,
      titleKo: a.titleKo,
      summaryOneLine: a.summaryOneLine,
      sourceName: a.source.name,
      tags: a.tags,
    }));

    // 입력 압축 — id / 제목 / 소스 / 태그만 (요약은 대부분 비어 있어 정보 X)
    const listText = input
      .map(
        (a) =>
          `${a.id} | ${a.titleKo ?? a.title} | ${a.sourceName} | ${a.tags.slice(0, 4).join(',')}`,
      )
      .join('\n');

    let parsed: DigestPayload;
    try {
      parsed = await this.gemini.generateJson<DigestPayload>({
        system: SYSTEM_PROMPT,
        prompt: `오늘 (${this.dayLabel(today)}) 글 ${articles.length}개. 각 줄: id | 제목 | 소스 | 태그.\n\n${listText}\n\n핵심 5개 JSON.`,
        maxTokens: 8000,
      });
    } catch (e) {
      // 키 만료/한도 등 — 휴리스틱으로 폴백 (다이제스트를 비우지 않는다)
      this.logger.warn(`digest Gemini 실패 → 휴리스틱 폴백: ${(e as Error).message.slice(0, 100)}`);
      return this.generateHeuristic(today, articles);
    }

    // 유효한 articleId 만 유지
    const validIds = new Set(input.map((a) => a.id));
    const cleanItems = (parsed.items ?? []).filter((it) => validIds.has(it.articleId)).slice(0, 5);

    const result: DigestPayload = {
      intro: parsed.intro?.trim() ?? '',
      items: cleanItems,
    };

    await this.prisma.dailyDigest.upsert({
      where: { date: today },
      create: {
        date: today,
        intro: result.intro,
        items: result.items as never,
      },
      update: {
        intro: result.intro,
        items: result.items as never,
        generatedAt: new Date(),
      },
    });

    this.logger.log(`Digest 생성 완료: ${this.dayLabel(today)} (${result.items.length} items)`);
    return result;
  }

  /**
   * 무료 휴리스틱 다이제스트 — LLM 없이 "오늘의 5선".
   * 점수 = 소스 가중치 + 최신성 + 한국어화 가점. headline/takeaway는 기존 필드 재사용.
   */
  private async generateHeuristic(
    today: Date,
    articles: Array<{
      id: string;
      title: string;
      titleKo: string | null;
      summaryOneLine: string | null;
      publishedAt: Date;
      tags: string[];
      source: { name: string };
    }>,
  ): Promise<DigestPayload> {
    // 큐레이션 매체에 가중치 (개인 잡담성 소스보다 우선)
    const SOURCE_WEIGHT: Record<string, number> = {
      GeekNews: 5,
      'Hacker News': 4,
      TechCrunch: 4,
      'NAVER D2': 4,
      '토스 기술블로그': 4,
      '카카오 기술블로그': 4,
      우아한형제들: 4,
      OpenAI: 4,
      'Google DeepMind': 4,
      'Simon Willison': 3,
      'Latent Space': 3,
      'Hugging Face': 2,
      'dev.to': 1,
    };
    const now = Date.now();
    const scored = articles
      .map((a) => {
        const w = SOURCE_WEIGHT[a.source.name] ?? 2;
        const ageH = (now - new Date(a.publishedAt).getTime()) / 3.6e6;
        const recency = Math.max(0, 4 - ageH / 12); // 0~4 (이틀이면 소멸)
        // 한국어로 보여줄 수 있는 글 강하게 우선 — headline은 titleKo ?? title 이라
        // 번역 안 된 순수 영문은 한국어 다이제스트에 영문으로 박혀 어색하다.
        const isKo = !!a.titleKo || this.hasKo(a.title);
        const koBonus = isKo ? 6 : 0;
        const enPenalty = isKo ? 0 : 4; // 영문 미번역 글 감점
        const tagBonus = Math.min(a.tags.length, 3) * 0.3;
        return { a, score: w + recency + koBonus + tagBonus - enPenalty };
      })
      .sort((x, y) => y.score - x.score);

    // 소스 쏠림 방지 — 같은 소스 최대 2개
    const perSource = new Map<string, number>();
    const picked: typeof scored = [];
    for (const s of scored) {
      const n = perSource.get(s.a.source.name) ?? 0;
      if (n >= 2) continue;
      perSource.set(s.a.source.name, n + 1);
      picked.push(s);
      if (picked.length >= 5) break;
    }

    const items = picked.map(({ a }) => {
      // 요약이 없거나 URL/메타 쓰레기면 takeaway를 비운다 (소스명 폴백 금지)
      const s = (a.summaryOneLine ?? '').trim();
      const clean = s && !/^https?:\/\/|^기사 URL/i.test(s) ? s.slice(0, 80) : '';
      return {
        articleId: a.id,
        headline: (a.titleKo ?? a.title).slice(0, 60),
        takeaway: clean,
      };
    });

    const result: DigestPayload = {
      intro: `오늘 들어온 ${articles.length}개 글에서 추린 핵심`,
      items,
    };

    await this.prisma.dailyDigest.upsert({
      where: { date: today },
      create: { date: today, intro: result.intro, items: result.items as never },
      update: {
        intro: result.intro,
        items: result.items as never,
        generatedAt: new Date(),
      },
    });
    this.logger.log(`Digest(휴리스틱) 생성: ${this.dayLabel(today)} (${items.length} items)`);
    return result;
  }

  private hasKo(s: string): boolean {
    return /[가-힣]/.test(s);
  }

  async getForDate(date: Date) {
    const day = this.dayStart(date);
    return this.prisma.dailyDigest.findUnique({ where: { date: day } });
  }
}
