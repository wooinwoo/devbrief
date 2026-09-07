import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobsOptions, Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RssItem, RssParserService } from './rss-parser.service';
import { normalizeArticleUrl } from './url-normalizer';

// 한도/일시 장애 시 지수 backoff 재시도 (1분 → 2분 → 4분 ...) — 요약/임베딩 공통 정책
const ANALYSIS_RETRY_OPTS: JobsOptions = {
  attempts: 6,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

interface ExistingArticle {
  id: string;
  url: string;
  title: string;
  summaryOneLine: string | null;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private rss: RssParserService,
    @InjectQueue('summarization') private summarizationQueue: Queue,
    @InjectQueue('embedding') private embeddingQueue: Queue,
  ) {}

  async ingestAll(): Promise<{ sourceCount: number; newArticles: number }> {
    const sources = await this.prisma.source.findMany({
      where: { active: true },
    });
    let total = 0;
    for (const source of sources) {
      try {
        const count = await this.ingestSource(source.id, source.feedUrl);
        total += count;
        this.logger.log(`[${source.name}] +${count} 신규`);
      } catch (e) {
        this.logger.error(`[${source.name}] 수집 실패: ${(e as Error).message}`);
      }
    }
    return { sourceCount: sources.length, newArticles: total };
  }

  /** 소스당 최신 수집 상한 — 아카이브 전체가 실린 피드(OpenAI 등)의 폭주 방지.
   *  Gemini 일일 한도 안에서 번역/요약이 돌게 하는 1차 밸브이기도 하다. */
  private readonly maxPerSource = Number(process.env.INGEST_MAX_PER_SOURCE) || 30;

  /**
   * 소스 1개 수집. 성공/실패를 Source.lastFetchedAt/lastError 에 기록해
   * 죽은 피드(URL 변경/폐쇄/영구 4xx)가 로그 한 줄로만 남지 않게 한다.
   * ingest-source 잡으로 직접 호출되는 경로도 있어 상태 기록은 여기(서비스 내부)에 둔다.
   */
  async ingestSource(sourceId: string, feedUrl: string): Promise<number> {
    try {
      const newCount = await this.collectSource(sourceId, feedUrl);
      await this.recordSourceStatus(sourceId, {
        lastFetchedAt: new Date(),
        lastError: null,
      });
      return newCount;
    } catch (e) {
      await this.recordSourceStatus(sourceId, {
        lastError: String((e as Error).message ?? e).slice(0, 500),
      });
      throw e;
    }
  }

  private async collectSource(sourceId: string, feedUrl: string): Promise<number> {
    const feed = await this.rss.parse(feedUrl);
    let newCount = 0;

    const items = [...(feed.items ?? [])]
      .sort((a, b) => {
        const ta = a.isoDate ? Date.parse(a.isoDate) : 0;
        const tb = b.isoDate ? Date.parse(b.isoDate) : 0;
        return tb - ta;
      })
      .slice(0, this.maxPerSource);

    // url별 findUnique N+1 제거 — 후보 url 을 한 번에 조회해 Map 으로 중복 판정.
    // 기존 행은 정규화 전 원시 url 로 저장돼 있을 수 있어 원시/정규화 양쪽을 본다.
    const candidateUrls = new Set<string>();
    for (const it of items) {
      const raw = this.itemUrl(it);
      if (!raw) continue;
      candidateUrls.add(raw);
      candidateUrls.add(normalizeArticleUrl(raw));
    }
    const existingRows: ExistingArticle[] = candidateUrls.size
      ? await this.prisma.article.findMany({
          where: { url: { in: [...candidateUrls] } },
          select: { id: true, url: true, title: true, summaryOneLine: true },
        })
      : [];
    const existingByUrl = new Map(existingRows.map((r) => [r.url, r]));
    // 같은 피드 안에 동일 글이 중복으로 실린 경우 1회만 처리 (정규화 키 기준)
    const seenInFeed = new Set<string>();

    for (const item of items) {
      const rawUrl = this.itemUrl(item);
      const title = item.title;
      if (!rawUrl || !title) continue;
      const url = normalizeArticleUrl(rawUrl);

      const rawSnippet =
        item['content:encoded'] ?? item.contentSnippet ?? item.description ?? item.content ?? '';
      const snippet = String(rawSnippet);

      const existing = existingByUrl.get(url) ?? existingByUrl.get(rawUrl);
      if (existing) {
        // 이미 저장된 글 — 과거 큐 적재가 유실됐다면(요약 null 고아) 잡만 재적재해 복구.
        // jobId 가 결정적이라 이미 대기/재시도 중인 잡과는 중복 적재되지 않는다.
        if (existing.summaryOneLine === null) {
          await this.enqueueAnalysisJobs(existing.id, existing.title, snippet);
        }
        continue;
      }
      if (seenInFeed.has(url)) continue;
      seenInFeed.add(url);

      // 이미지 해석 실패가 글 수집 자체를 막지 않게 격리 — 실패 시 썸네일 없이 진행
      let imageUrl: string | null = null;
      try {
        imageUrl = await this.rss.resolveImageUrl(item);
      } catch (e) {
        this.logger.warn(`이미지 해석 실패 (${url}): ${(e as Error).message}`);
      }

      // 요약 재생성용 본문 평문 발췌 (HTML 제거 후 800자). 백필 시 재취득 불필요.
      const contentSnippet =
        snippet
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 800) || null;

      let article: { id: string; title: string };
      try {
        article = await this.prisma.article.create({
          data: {
            sourceId,
            title: title.trim().slice(0, 500),
            url, // 정규화 url 로 저장 — 트래킹 파라미터 변형에도 중복 방지
            author: item.creator ?? null,
            publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
            tags: (item.categories ?? []).slice(0, 10),
            imageUrl,
            contentSnippet,
          },
        });
      } catch (e) {
        // 동시 수집(서버 크론 ↔ GHA CLI) 경합의 unique(url) 충돌은 정상 스킵 —
        // 상대편이 이미 저장+큐 적재했으므로 다음 아이템으로 진행한다.
        if ((e as { code?: string }).code === 'P2002') {
          this.logger.debug(`중복 url 경합 스킵: ${url}`);
          continue;
        }
        // 그 외 실패도 아이템 단위로 격리 — 한 건이 피드 나머지 수집을 막지 않게.
        this.logger.warn(`아이템 저장 실패 (${url}): ${(e as Error).message}`);
        continue;
      }
      newCount++;

      await this.enqueueAnalysisJobs(article.id, article.title, snippet);
    }

    return newCount;
  }

  /** link 가 없는 피드 아이템은 guid 가 http(s) URL 이면 그것을 링크로 사용 (guid 폴백) */
  private itemUrl(item: RssItem): string | undefined {
    if (item.link) return item.link;
    if (item.guid && /^https?:\/\//i.test(item.guid)) return item.guid;
    return undefined;
  }

  /**
   * 요약/임베딩 잡 적재 — 결정적 jobId(summarize:<id>/embed:<id>)로 동시 수집 경합 시
   * 이중 적재를 막는다. 적재 실패(Redis 순단 등)는 로그만 남기고 진행 — 글은 이미
   * 저장돼 있고 일일 reanalyze 백필이 회수한다. (완료/실패 잡이 큐에 남아 있으면 같은
   * jobId 재적재가 무시될 수 있으나 그 경우도 reanalyze 가 커버)
   */
  private async enqueueAnalysisJobs(
    articleId: string,
    title: string,
    snippet: string,
  ): Promise<void> {
    try {
      // summarization/embedding 큐 add 는 서로 독립이라 병렬로 적재한다.
      await Promise.all([
        this.summarizationQueue.add(
          'summarize',
          { articleId, title, snippet: snippet.slice(0, 4000) },
          { ...ANALYSIS_RETRY_OPTS, jobId: `summarize:${articleId}` },
        ),
        this.embeddingQueue.add(
          'embed',
          { articleId, title, snippet: snippet.slice(0, 2000) },
          { ...ANALYSIS_RETRY_OPTS, jobId: `embed:${articleId}` },
        ),
      ]);
    } catch (e) {
      this.logger.error(
        `큐 적재 실패 (articleId=${articleId}) — reanalyze 백필로 회수: ${(e as Error).message}`,
      );
    }
  }

  /** 소스 상태 기록은 원래 에러를 가리지 않게 자체 실패를 삼킨다 */
  private async recordSourceStatus(
    sourceId: string,
    data: { lastFetchedAt?: Date; lastError: string | null },
  ): Promise<void> {
    try {
      await this.prisma.source.update({ where: { id: sourceId }, data });
    } catch (e) {
      this.logger.warn(`소스 상태 기록 실패 (${sourceId}): ${(e as Error).message}`);
    }
  }
}
