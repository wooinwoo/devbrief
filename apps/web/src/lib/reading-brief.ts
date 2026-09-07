import type { ArticleDto } from '@/components/article-card';
import { categoryOf } from './category';

/** 불러온 최근 7일의 미열람 글에서 최신순과 출처 다양성을 기준으로 최대 3편을 고른다. */
export function selectReadingBrief(
  articles: ArticleDto[],
  interests: string[],
  readSet: Set<string>,
  now: number,
): { items: ArticleDto[]; candidateCount: number } {
  const seen = new Set<string>();
  const candidates = articles
    .filter((article) => {
      const published = Date.parse(article.publishedAt);
      if (
        seen.has(article.id) ||
        readSet.has(article.id) ||
        !Number.isFinite(published) ||
        published > now ||
        published < now - 7 * 86_400_000 ||
        (interests.length > 0 && !interests.includes(categoryOf(article).key))
      )
        return false;
      seen.add(article.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  const items: ArticleDto[] = [];
  const sources = new Set<string>();
  for (const article of candidates) {
    const source = `${article.source.provider}:${article.source.name}`;
    if (sources.has(source)) continue;
    items.push(article);
    sources.add(source);
    if (items.length === 3) break;
  }
  // 소스가 적어도 읽을 글은 남긴다. 이미 고른 글을 중복해서 넣지 않는다.
  for (const article of candidates) {
    if (items.length === 3) break;
    if (!items.some((item) => item.id === article.id)) items.push(article);
  }
  return { items, candidateCount: candidates.length };
}
