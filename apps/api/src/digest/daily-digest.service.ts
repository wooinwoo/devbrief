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

  private dayStart(date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
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
      this.logger.debug(`Daily digest already generated for ${today.toISOString().slice(0, 10)}`);
      return existing.items as unknown as DigestPayload;
    }

    if (!this.gemini.isAvailable()) {
      this.logger.warn('Gemini 미설정 — digest skip');
      return null;
    }

    // 그 날 (또는 그 직전) 들어온 글 30개
    const articles = await this.prisma.article.findMany({
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

    if (articles.length === 0) {
      this.logger.log('오늘 들어온 글 없음 — digest skip');
      return null;
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
        prompt: `오늘 (${today.toISOString().slice(0, 10)}) 글 ${articles.length}개. 각 줄: id | 제목 | 소스 | 태그.\n\n${listText}\n\n핵심 5개 JSON.`,
        maxTokens: 8000,
      });
    } catch (e) {
      this.logger.warn(`digest 생성 실패: ${(e as Error).message}`);
      return null;
    }

    // 유효한 articleId 만 유지
    const validIds = new Set(input.map((a) => a.id));
    const cleanItems = (parsed.items ?? [])
      .filter((it) => validIds.has(it.articleId))
      .slice(0, 5);

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

    this.logger.log(
      `Digest 생성 완료: ${today.toISOString().slice(0, 10)} (${result.items.length} items)`,
    );
    return result;
  }

  async getForDate(date: Date) {
    const day = this.dayStart(date);
    return this.prisma.dailyDigest.findUnique({ where: { date: day } });
  }
}
