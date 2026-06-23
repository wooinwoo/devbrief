import type { ArticleDto } from '@/components/article-card';

export interface ArticleGroup {
  label: string;
  articles: ArticleDto[];
}

export function groupByTime(articles: ArticleDto[]): ArticleGroup[] {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;

  const buckets: Record<string, ArticleDto[]> = {
    방금: [],
    오늘: [],
    어제: [],
    '이번 주': [],
    '그 외': [],
  };

  for (const a of articles) {
    const diff = now - new Date(a.publishedAt).getTime();
    if (diff < HOUR * 3) buckets.방금.push(a);
    else if (diff < HOUR * 24) buckets.오늘.push(a);
    else if (diff < HOUR * 48) buckets.어제.push(a);
    else if (diff < HOUR * 24 * 7) buckets['이번 주'].push(a);
    else buckets['그 외']?.push(a);
  }

  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, articles: list }));
}

export function extractTopTags(
  articles: ArticleDto[],
  limit = 8,
): Array<{ tag: string; count: number }> {
  const map = new Map<string, number>();
  for (const a of articles) {
    for (const t of a.tags) {
      map.set(t, (map.get(t) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
