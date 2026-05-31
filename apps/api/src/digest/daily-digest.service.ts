import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_PROMPT = `당신은 한국 개발자 매체의 시니어 에디터입니다.
그 날 들어온 글 N 개 중 핵심 5 개를 골라 *오늘의 다이제스트* 를 만듭니다.

선별 기준 (중요도 순):
1. 중대한 발표 / 출시 / 신기술 (예: 새 모델, 새 프레임워크 메이저 버전)
2. 한국 개발자에게 실용 가치 큰 운영 사례 / 깊이 있는 분석
3. 산업 동향 / 큰 흐름의 변곡점
4. 흥미롭지만 클릭베이트 제외

JSON 만 출력. 마크다운 금지, em dash 금지.

스키마:
{
  "intro": "오늘의 흐름을 1~2 문장 한국어로. 전반적 톤 / 키워드 캡쳐.",
  "items": [
    {
      "articleId": "원본 article id 그대로",
      "headline": "한국어 한 줄 제목 (40자 내외). 영문 제목은 자연스러운 한글로.",
      "takeaway": "왜 중요한지 / 핵심 포인트 한국어 한 줄 (50자 내외)."
    }
  ]
}

items 는 5개. 글이 5개 미만이면 그 만큼.`;

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

    const listText = input
      .map(
        (a, i) =>
          `[${i + 1}] id=${a.id}\n    제목: ${a.titleKo ?? a.title}\n    원문: ${a.title}\n    소스: ${a.sourceName} | 태그: ${a.tags.slice(0, 5).join(', ')}\n    요약: ${a.summaryOneLine ?? '(없음)'}`,
      )
      .join('\n\n');

    let parsed: DigestPayload;
    try {
      parsed = await this.gemini.generateJson<DigestPayload>({
        system: SYSTEM_PROMPT,
        prompt: `오늘 (${today.toISOString().slice(0, 10)}) 들어온 글 ${articles.length} 개입니다.\n\n${listText}\n\n핵심 5 개를 골라 JSON 으로 응답하세요.`,
        maxTokens: 1500,
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
