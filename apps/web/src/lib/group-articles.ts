import type { ArticleDto } from '@/components/article-card';

export interface ArticleGroup {
  label: string;
  articles: ArticleDto[];
}

const HOUR = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR;
const KST_OFFSET_MS = 9 * HOUR;

/** epoch(ms)이 속한 KST 달력 일 인덱스 — KST 는 DST 없는 고정 UTC+9 라 산술만으로 충분 */
function kstDayIndex(t: number): number {
  return Math.floor((t + KST_OFFSET_MS) / DAY_MS);
}

/**
 * 발행 시각 기준 그룹핑. '오늘'/'어제'/'이번 주'는 rolling 윈도우가 아닌
 * KST 달력 날짜 경계로 나눈다(어제 밤 발행 글이 '오늘'에 섞이던 버그 수정).
 * '방금'(3시간 이내)만 자정을 걸쳐도 유지되는 의도된 예외.
 * now 는 SSR/CSR 이 같은 기준으로 계산하도록 주입 가능(기본 현재 시각).
 */
export function groupByTime(articles: ArticleDto[], now: number = Date.now()): ArticleGroup[] {
  const todayIdx = kstDayIndex(now);

  const buckets: Record<string, ArticleDto[]> = {
    방금: [],
    오늘: [],
    어제: [],
    '이번 주': [],
    '그 외': [],
  };

  for (const a of articles) {
    const t = new Date(a.publishedAt).getTime();
    const dayDiff = todayIdx - kstDayIndex(t);
    if (now - t < HOUR * 3) buckets.방금.push(a);
    else if (dayDiff <= 0) buckets.오늘.push(a);
    else if (dayDiff === 1) buckets.어제.push(a);
    else if (dayDiff <= 6) buckets['이번 주'].push(a);
    else buckets['그 외']?.push(a);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, articles: list }));
}

/**
 * 태그 빈도 상위 N개. filter-articles.ts 의 categoryOptionsOf 와 같은 병합 규칙 —
 * 대소문자만 다른 태그(#AI/#ai)는 lowercase 키로 합치고 라벨은 최빈 원형 표기를 쓴다.
 */
export function extractTopTags(
  articles: ArticleDto[],
  limit = 8,
): Array<{ tag: string; count: number }> {
  const map = new Map<string, { count: number; forms: Map<string, number> }>();
  for (const a of articles) {
    for (const t of a.tags) {
      const key = t.toLowerCase();
      const cur = map.get(key) ?? { count: 0, forms: new Map() };
      cur.count += 1;
      cur.forms.set(t, (cur.forms.get(t) ?? 0) + 1);
      map.set(key, cur);
    }
  }
  return [...map.entries()]
    .map(([, { count, forms }]) => ({
      tag: [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
