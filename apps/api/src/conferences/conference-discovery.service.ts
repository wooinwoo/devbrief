import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_PROMPT = `당신은 한국어 / 영어 기술 글에서 컨퍼런스 이벤트 정보를 추출하는 NER 전문가입니다.

주어진 글 (제목 + 본문) 안에서 개발자 컨퍼런스 / 컨퍼런스성 행사 정보를 식별해 JSON으로만 응답합니다.

규칙:
- 단순 언급(예: "지난 FECONF에서 본..." 같은 회고)은 제외
- 미래 일정이 명시된 것만 (예: "2026년 10월 22일 개최", "다음 달에 열립니다")
- 글 안에 공식 URL이 있으면 url 필드에 포함, 없으면 url=null
- 컨퍼런스가 아니면 빈 배열 반환 (밋업 / 1회성 토크 / 라이브 스트림은 제외)
- 같은 글에서 여러 컨퍼런스가 발견되면 모두 포함
- date 는 ISO yyyy-mm-dd. 정확한 날짜 모르면 null

JSON 스키마:
{ "conferences": [{ "name": string, "url": string|null, "startDate": string|null, "endDate": string|null, "location": string|null, "topics": string[] }] }

회고 / 과거 / 컨퍼런스 아님이면: { "conferences": [] }`;

export interface DiscoveredConference {
  name: string;
  url: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  topics: string[];
}

@Injectable()
export class ConferenceDiscoveryService {
  private readonly logger = new Logger(ConferenceDiscoveryService.name);

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
  ) {}

  /** 글 1개를 Gemini Flash 에 NER 요청. 추출 후보 반환. */
  async extractFromArticle(article: {
    id: string;
    title: string;
    snippet: string;
  }): Promise<DiscoveredConference[]> {
    if (!this.gemini.isAvailable()) return [];

    try {
      const parsed = await this.gemini.generateJson<{
        conferences?: DiscoveredConference[];
      }>({
        system: SYSTEM_PROMPT,
        prompt: `제목: ${article.title}\n\n본문:\n${article.snippet.slice(0, 4000)}`,
        maxTokens: 700,
      });
      return parsed.conferences ?? [];
    } catch (e) {
      this.logger.debug(`[${article.id}] NER 실패: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * 추출된 후보들을 conference 테이블에 PROPOSED 상태로 upsert.
   * - URL이 있으면 url 기준 unique 매칭 (이미 ACTIVE이면 skip)
   * - URL 없으면 이름 + startDate로 fuzzy dedupe (간단히 이름만 비교)
   * - 동일 후보가 REJECTED 상태로 있으면 재제안 X
   */
  async saveProposals(
    candidates: DiscoveredConference[],
    sourceArticleId: string,
  ): Promise<{ saved: number; skipped: number }> {
    let saved = 0;
    let skipped = 0;

    // 날짜 있는 후보만 유효 — 미상은 부적합
    const dated = candidates.filter((c) => {
      if (c.startDate) return true;
      skipped++;
      return false;
    });

    // URL 있는 후보의 중복 판정을 위해 url 목록을 한 번에 조회 (N+1 제거).
    const urls = dated
      .map((c) => c.url)
      .filter((u): u is string => typeof u === 'string' && u.length > 0);
    const existing = urls.length
      ? await this.prisma.conference.findMany({
          where: { url: { in: urls } },
          select: { url: true },
        })
      : [];
    const existingUrls = new Set(existing.map((r) => r.url));

    type CreateData = Parameters<typeof this.prisma.conference.create>[0]['data'];
    const toCreate: CreateData[] = [];

    for (const c of dated) {
      const startDate = new Date(c.startDate as string);

      if (c.url) {
        // 기존 DB + 같은 배치 내 중복 모두 차단
        if (existingUrls.has(c.url)) {
          skipped++;
          continue;
        }
        existingUrls.add(c.url);
        toCreate.push({
          name: c.name,
          url: c.url,
          startDate,
          endDate: c.endDate ? new Date(c.endDate) : null,
          location: c.location ?? '미정',
          topics: c.topics ?? [],
          status: 'PROPOSED',
          discoveredFromArticleId: sourceArticleId,
          discoveredAt: new Date(),
        });
      } else {
        // URL 없는 후보는 이름 + 날짜로 중복 체크 (간단 dedupe)
        const dup = await this.prisma.conference.findFirst({
          where: { name: c.name, startDate },
          select: { id: true },
        });
        if (dup) {
          skipped++;
          continue;
        }
        // URL 없는 후보는 임시 unique url (placeholder)
        toCreate.push({
          name: c.name,
          url: `proposed://${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          startDate,
          endDate: c.endDate ? new Date(c.endDate) : null,
          location: c.location ?? '미정',
          topics: c.topics ?? [],
          status: 'PROPOSED',
          discoveredFromArticleId: sourceArticleId,
          discoveredAt: new Date(),
        });
      }
    }

    if (toCreate.length) {
      try {
        // 신규 후보를 일괄 적재. createMany 는 중복(unique 충돌) 행을 skip.
        const r = await this.prisma.conference.createMany({
          data: toCreate as never,
          skipDuplicates: true,
        });
        saved += r.count;
        skipped += toCreate.length - r.count;
      } catch (e) {
        this.logger.warn(`후보 일괄 저장 실패 (${toCreate.length}건): ${(e as Error).message}`);
        skipped += toCreate.length;
      }
    }

    return { saved, skipped };
  }

  /**
   * 최근 N일 글 중 컨퍼런스 관련 키워드 포함된 글을 골라 NER 실행.
   * 키워드 필터로 LLM 호출 비용을 1차 절감.
   */
  async discoverFromRecentArticles(opts: { days?: number; limit?: number } = {}) {
    const days = opts.days ?? 7;
    const limit = opts.limit ?? 50;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 키워드 1차 필터 — 본문 fetch 안 하고 title + summary로 컨퍼런스 시그널 검출
    const KEYWORDS = [
      '컨퍼런스',
      '콘퍼런스',
      'conference',
      'summit',
      '개최',
      'meetup',
      'devcon',
      'devfest',
      'feconf',
      'deview',
      'slash',
      'pycon',
      'if(kakao)',
    ];

    const articles = await this.prisma.article.findMany({
      where: {
        publishedAt: { gte: since },
        OR: KEYWORDS.flatMap((k) => [
          { title: { contains: k, mode: 'insensitive' as const } },
          { summaryOneLine: { contains: k, mode: 'insensitive' as const } },
        ]),
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, summaryThreeLine: true, summaryOneLine: true },
    });

    this.logger.log(`Discovery 대상 글: ${articles.length}개`);

    let totalSaved = 0;
    let totalSkipped = 0;
    let llmCalls = 0;

    for (const a of articles) {
      try {
        const snippet = a.summaryThreeLine ?? a.summaryOneLine ?? '';
        const candidates = await this.extractFromArticle({
          id: a.id,
          title: a.title,
          snippet,
        });
        llmCalls++;
        if (candidates.length === 0) continue;
        const r = await this.saveProposals(candidates, a.id);
        totalSaved += r.saved;
        totalSkipped += r.skipped;
        if (r.saved > 0) {
          this.logger.log(`[${a.id}] ${candidates.length}개 후보 → ${r.saved}건 저장`);
        }
      } catch (e) {
        this.logger.warn(`Discovery [${a.id}] 실패: ${(e as Error).message}`);
      }
    }

    return {
      scannedArticles: articles.length,
      llmCalls,
      proposed: totalSaved,
      skipped: totalSkipped,
    };
  }
}
