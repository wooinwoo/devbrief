import { Injectable } from '@nestjs/common';
import { kstDateLabel, kstDayStart } from '../common/kst';
import { PrismaService } from '../prisma/prisma.service';

/** 소스별 글 수 (상위 N) */
export interface SourceCount {
  sourceId: string;
  name: string;
  count: number;
}

/** 일자별 수집 글 수 (yyyy-mm-dd) */
export interface DailyCount {
  date: string;
  count: number;
}

/** 어드민 대시보드 수집 통계 집계 결과 */
export interface CollectionStats {
  articles: {
    total: number;
    summarized: number;
    unsummarized: number;
    embedded: number;
  };
  topSources: SourceCount[];
  recentDaily: DailyCount[];
  conferences: number;
  videos: number;
  repos: number;
}

/** 최근 N일 추이 윈도우 (오늘 포함) */
const RECENT_DAYS = 7;
/** 소스별 상위 노출 개수 */
const TOP_SOURCES = 8;
/** 하루 (서울은 DST 없어 24h 고정 안전) */
const DAY_MS = 86_400_000;

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 어드민 대시보드용 수집 통계를 한 번에 집계한다.
   * count/groupBy/$queryRaw 만 사용해 N+1 없이 고정 쿼리 수로 처리한다.
   */
  async collection(): Promise<CollectionStats> {
    // 일자 경계는 KST — 크론(Asia/Seoul)·다이제스트와 "그날" 정의를 통일한다.
    const since = new Date(kstDayStart().getTime() - (RECENT_DAYS - 1) * DAY_MS);

    const [total, summarized, embedded, grouped, daily] = await Promise.all([
      this.prisma.article.count(),
      // summaryOneLine 이 채워진 글 = 요약 완료
      this.prisma.article.count({ where: { summaryOneLine: { not: null } } }),
      this.embeddedCount(),
      // 소스별 글 수 (상위 N) — DB 에서 group + 정렬 + 절단
      this.prisma.article.groupBy({
        by: ['sourceId'],
        _count: { _all: true },
        orderBy: { _count: { sourceId: 'desc' } },
        take: TOP_SOURCES,
      }),
      this.dailyCounts(since),
    ]);

    const [conferences, videos, repos] = await Promise.all([
      this.prisma.conference.count(),
      this.prisma.video.count(),
      this.prisma.repo.count(),
    ]);

    const topSources = await this.attachSourceNames(grouped);

    return {
      articles: {
        total,
        summarized,
        unsummarized: total - summarized,
        embedded,
      },
      topSources,
      recentDaily: fillRecentDays(daily, since),
      conferences,
      videos,
      repos,
    };
  }

  /**
   * embedding 은 Prisma 의 Unsupported(vector) 타입이라 일반 count where 로
   * NULL 판별이 불가능하다. raw count 로 직접 집계한다.
   */
  private async embeddedCount(): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Article" WHERE embedding IS NOT NULL
    `;
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * fetchedAt 기준 일자별(KST) 수집 글 수. DB 에서 date_trunc 으로 집계해
   * 행 전체를 끌어오지 않는다.
   * fetchedAt 은 naive timestamp(UTC 값 저장)라 +9h 시프트 후 trunc 하면
   * 세션 타임존과 무관하게 KST 달력 날짜 경계가 된다 (digest 의 KST 패턴과 동일).
   */
  private async dailyCounts(since: Date): Promise<DailyCount[]> {
    const rows = await this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
      SELECT date_trunc('day', "fetchedAt" + interval '9 hours') AS day,
             COUNT(*)::bigint AS count
      FROM "Article"
      WHERE "fetchedAt" >= ${since}
      GROUP BY day
      ORDER BY day ASC
    `;
    // day 는 "KST 자정을 UTC 인 척 담은" naive timestamp — ISO 슬라이스가 곧 KST 날짜다.
    return rows.map((r) => ({
      date: toIsoDate(r.day),
      count: Number(r.count),
    }));
  }

  /** groupBy 결과에 소스 이름을 붙인다. 단일 findMany 로 N+1 회피. */
  private async attachSourceNames(
    grouped: { sourceId: string; _count: { _all: number } }[],
  ): Promise<SourceCount[]> {
    if (grouped.length === 0) return [];
    const ids = grouped.map((g) => g.sourceId);
    const sources = await this.prisma.source.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameById = new Map(sources.map((s) => [s.id, s.name]));
    return grouped.map((g) => ({
      sourceId: g.sourceId,
      name: nameById.get(g.sourceId) ?? '(알 수 없는 소스)',
      count: g._count._all,
    }));
  }
}

/** Date → yyyy-mm-dd (자정 경계가 이미 반영된 naive 값 전용 — 그대로 슬라이스) */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 집계에서 0건인 날은 행이 빠진다. since(=KST 자정의 UTC 순간)부터 오늘까지
 * 모든 날을 채워 빈 막대도 그릴 수 있게 한다. 라벨은 KST 달력 날짜.
 */
export function fillRecentDays(rows: DailyCount[], since: Date): DailyCount[] {
  const countByDate = new Map(rows.map((r) => [r.date, r.count]));
  const out: DailyCount[] = [];
  for (let i = 0; i < RECENT_DAYS; i++) {
    const date = kstDateLabel(new Date(since.getTime() + i * DAY_MS));
    out.push({ date, count: countByDate.get(date) ?? 0 });
  }
  return out;
}
