import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../ai/gemini.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConferenceFeedService } from './conference-feed.service';
import { type DiscoveredConference, normalizeEventCandidate } from './event-candidate';
import { VERIFIED_KOREAN_EVENTS } from './verified-korean-events';
export type { DiscoveredConference } from './event-candidate';

const SYSTEM_PROMPT = `당신은 한국어 / 영어 기술 글에서 컨퍼런스 이벤트 정보를 추출하는 NER 전문가입니다.

주어진 글 (제목 + 본문) 안에서 개발자 컨퍼런스 / 해커톤 / 개발 경진대회 / 기술 밋업·세미나 정보를 식별해 JSON으로만 응답합니다.

규칙:
- 단순 언급(예: "지난 FECONF에서 본..." 같은 회고)은 제외
- 미래 일정이 명시된 것만 (예: "2026년 10월 22일 개최", "다음 달에 열립니다")
- 글 안에 공식 URL이 있으면 url 필드에 포함, 없으면 url=null
- 개발자 대상 기술 행사가 아니면 빈 배열 반환 (채용 공고 / 상시 강의 / 제품 홍보 방송은 제외)
- 신청·접수 기간을 행사 개최일로 쓰지 말 것
- 상대 날짜는 글 발행일을 기준으로만 해석하고, 발행일이나 정확한 행사 날짜가 불명확하면 null
- kind는 conference, hackathon, meetup. 개발 경진대회는 hackathon, 기술 밋업·세미나·워크숍은 meetup으로 분류
- 같은 글에서 여러 컨퍼런스가 발견되면 모두 포함
- date 는 ISO yyyy-mm-dd. 정확한 날짜 모르면 null

JSON 스키마:
{ "conferences": [{ "kind": "conference"|"hackathon"|"meetup", "name": string, "url": string|null, "startDate": string|null, "endDate": string|null, "location": string|null, "topics": string[] }] }

회고 / 과거 / 컨퍼런스 아님이면: { "conferences": [] }`;

@Injectable()
export class ConferenceDiscoveryService {
  private readonly logger = new Logger(ConferenceDiscoveryService.name);

  constructor(
    private gemini: GeminiService,
    private prisma: PrismaService,
    private feeds: ConferenceFeedService,
  ) {}

  /** 글 1개를 Gemini Flash 에 NER 요청. 추출 후보 반환. */
  async extractFromArticle(article: {
    id: string;
    title: string;
    snippet: string;
    publishedAt?: Date;
  }): Promise<DiscoveredConference[]> {
    if (!this.gemini.isAvailable()) return [];

    try {
      const parsed = await this.gemini.generateJson<{
        conferences?: DiscoveredConference[];
      }>({
        system: SYSTEM_PROMPT,
        prompt: `글 발행일: ${article.publishedAt?.toISOString() ?? '미상'}\n제목: ${article.title}\n\n본문:\n${article.snippet.slice(0, 7000)}`,
        maxTokens: 1200,
      });
      return Array.isArray(parsed?.conferences) ? parsed.conferences : [];
    } catch (e) {
      this.logger.debug(`[${article.id}] NER 실패: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * 추출된 후보들을 conference 테이블에 PROPOSED 상태로 upsert.
   * - url 기준 unique 매칭 (url in 일괄 조회 후 메모리 판정)
   * - URL 유무와 무관하게 name+startDate 조합으로도 dedupe (name in 일괄 조회 후 메모리 판정, N+1 제거)
   * - placeholder URL 로 저장된 기존 행과 같은 name+startDate 후보가 실제 URL 을 들고 오면
   *   중복 행을 만들지 않고 기존 행의 url 을 실제 URL 로 승격
   */
  async saveProposals(
    candidates: DiscoveredConference[],
    sourceArticleId: string | null,
  ): Promise<{ saved: number; skipped: number; failed: number }> {
    let saved = 0;
    let skipped = 0;
    let failed = 0;

    const dated = candidates.flatMap((candidate) => {
      const normalized = normalizeEventCandidate(candidate);
      if (normalized) return [normalized];
      skipped++;
      return [];
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

    // name+startDate dedupe 는 URL 유무와 무관하게 적용. findFirst N회 대신
    // 후보 이름 전체를 한 번에 조회한 뒤 name+startDate 조합을 메모리에서 판정 (N+1 제거).
    // URL 있는 후보도 이 검사를 통과해야 create — placeholder 로 먼저 저장된 행이
    // 나중에 실제 URL 과 함께 재추출돼도 중복 행이 생기지 않는다.
    const candidateNames = [...new Set(dated.map((c) => c.name))];
    const nameDatedExisting = candidateNames.length
      ? await this.prisma.conference.findMany({
          where: { name: { in: candidateNames, mode: 'insensitive' } },
          select: { id: true, name: true, startDate: true, url: true },
        })
      : [];
    // 조합 키: name + startDate(UTC 달력 날짜). 구분자는 name 에 못 들어가는 NUL.
    const nameDateKey = (name: string, startDate: Date) =>
      `${name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase()}\u0000${startDate.toISOString().slice(0, 10)}`;
    // key → 기존 행(id, url). 같은 배치 내 신규 후보는 id: null 로 누적해 중복 차단.
    const byNameDate = new Map<string, { id: string | null; url: string; pending?: number }>();
    for (const r of nameDatedExisting) {
      byNameDate.set(nameDateKey(r.name, r.startDate), {
        id: r.id,
        url: r.url,
      });
    }

    type CreateData = Parameters<typeof this.prisma.conference.create>[0]['data'];
    const toCreate: CreateData[] = [];

    for (const c of dated) {
      const startDate = new Date(c.startDate as string);
      const key = nameDateKey(c.name, startDate);
      if (c.url && existingUrls.has(c.url)) {
        skipped++;
        continue;
      }
      const known = byNameDate.get(key);
      if (known) {
        if (c.url && known.url.startsWith('proposed://')) {
          if (known.pending !== undefined) {
            toCreate[known.pending].url = c.url;
            known.url = c.url;
            existingUrls.add(c.url);
            skipped++;
          } else if (known.id) {
            try {
              await this.prisma.conference.update({
                where: { id: known.id },
                data: { url: c.url },
              });
              known.url = c.url;
              existingUrls.add(c.url);
              saved++;
            } catch (error) {
              this.logger.warn(
                `placeholder URL 승격 실패 (${c.name}): ${(error as Error).message}`,
              );
              failed++;
            }
          }
        } else {
          skipped++;
        }
        continue;
      }
      const url =
        c.url ?? `proposed://${createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
      byNameDate.set(key, { id: null, url, pending: toCreate.length });
      existingUrls.add(url);
      toCreate.push({
        name: c.name,
        url,
        startDate,
        endDate: c.endDate ? new Date(c.endDate) : null,
        location: c.location ?? '미정',
        topics: c.topics,
        description: c.description,
        status: 'PROPOSED',
        discoveredFromArticleId: sourceArticleId,
        discoveredAt: new Date(),
      });
    }

    if (toCreate.length) {
      try {
        // 신규 후보를 일괄 적재. createMany 는 중복(unique 충돌) 행을 skip.
        const r = await this.prisma.conference.createMany({
          data: toCreate,
          skipDuplicates: true,
        });
        saved += r.count;
        skipped += toCreate.length - r.count;
      } catch (e) {
        this.logger.warn(`후보 일괄 저장 실패 (${toCreate.length}건): ${(e as Error).message}`);
        failed += toCreate.length;
      }
    }

    return { saved, skipped, failed };
  }

  /** 공개 피드는 AI 키 없이도 수집한다. 소스별 실패는 다른 소스의 성공을 취소하지 않는다. */
  async collectPublicEvents() {
    const sources: Array<{
      source: string;
      candidates: number;
      saved: number;
      skipped: number;
      failed: number;
      error?: string;
    }> = [];
    const feeds = [...(await this.feeds.collect())];
    const verified = VERIFIED_KOREAN_EVENTS.flatMap((row) => {
      const candidate = normalizeEventCandidate(row);
      return candidate ? [candidate] : [];
    });
    // 공식 공지에서 확인한 개최일·유형이 목록의 축약 정보보다 먼저 저장되도록 한다.
    feeds.unshift({
      source: '국내 주최자 공식 공지 (2026-09-08 확인)',
      candidates: verified,
      skipped: VERIFIED_KOREAN_EVENTS.length - verified.length,
    });
    for (const feed of feeds) {
      if (feed.error) {
        sources.push({
          source: feed.source,
          candidates: 0,
          saved: 0,
          skipped: 0,
          failed: 0,
          error: feed.error,
        });
        continue;
      }
      try {
        const result = await this.saveProposals(feed.candidates, null);
        sources.push({
          source: feed.source,
          candidates: feed.candidates.length,
          ...result,
          skipped: feed.skipped + result.skipped,
        });
      } catch (error) {
        sources.push({
          source: feed.source,
          candidates: feed.candidates.length,
          saved: 0,
          skipped: feed.skipped,
          failed: feed.candidates.length,
          error: (error as Error).message,
        });
      }
    }
    return {
      sources,
      proposed: sources.reduce((sum, source) => sum + source.saved, 0),
      skipped: sources.reduce((sum, source) => sum + source.skipped, 0),
      failedSources: sources.filter((source) => source.error || source.failed > 0).length,
    };
  }

  async discover(opts: { days?: number; limit?: number } = {}) {
    const feeds = await this.collectPublicEvents();
    const articles = await this.discoverFromRecentArticles(opts);
    return {
      ...articles,
      proposed: feeds.proposed + articles.proposed,
      skipped: feeds.skipped + articles.skipped,
      sources: feeds.sources,
      failedSources: feeds.failedSources,
    };
  }

  /**
   * 최근 N일 글 중 컨퍼런스 관련 키워드 포함된 글을 골라 NER 실행.
   * 키워드 필터로 LLM 호출 비용을 1차 절감.
   */
  async discoverFromRecentArticles(opts: { days?: number; limit?: number } = {}) {
    if (!this.gemini.isAvailable())
      return { scannedArticles: 0, llmCalls: 0, proposed: 0, skipped: 0, failed: 0 };
    const days = Number.isSafeInteger(opts.days) && opts.days! > 0 ? Math.min(opts.days!, 90) : 7;
    const limit =
      Number.isSafeInteger(opts.limit) && opts.limit! > 0 ? Math.min(opts.limit!, 500) : 50;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 키워드 1차 필터 — 본문 fetch 안 하고 title + summary로 컨퍼런스 시그널 검출
    const KEYWORDS = [
      '해커톤',
      'hackathon',
      'buildathon',
      '개발 경진대회',
      '컨퍼런스',
      '콘퍼런스',
      'conference',
      'summit',
      '개최',
      'meetup',
      '밋업',
      '세미나',
      '워크숍',
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
      select: {
        id: true,
        title: true,
        contentSnippet: true,
        publishedAt: true,
        summaryThreeLine: true,
        summaryOneLine: true,
      },
    });

    this.logger.log(`Discovery 대상 글: ${articles.length}개`);

    let totalSaved = 0;
    let totalSkipped = 0;
    let llmCalls = 0;
    let failed = 0;

    for (const a of articles) {
      try {
        const snippet = a.contentSnippet || a.summaryThreeLine || a.summaryOneLine || '';
        const candidates = await this.extractFromArticle({
          id: a.id,
          title: a.title,
          snippet,
          publishedAt: a.publishedAt,
        });
        llmCalls++;
        if (candidates.length === 0) continue;
        const r = await this.saveProposals(candidates, a.id);
        totalSaved += r.saved;
        totalSkipped += r.skipped;
        failed += r.failed;
        if (r.saved > 0) {
          this.logger.log(`[${a.id}] ${candidates.length}개 후보 → ${r.saved}건 저장`);
        }
      } catch (e) {
        failed++;
        this.logger.warn(`Discovery [${a.id}] 실패: ${(e as Error).message}`);
      }
    }

    return {
      scannedArticles: articles.length,
      llmCalls,
      proposed: totalSaved,
      skipped: totalSkipped,
      failed,
    };
  }
}
