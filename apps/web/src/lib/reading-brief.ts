import type { ArticleDto } from '@/components/article-card';
import { readableSummary } from './article-summary';
import { categoryOf } from './category';

/** 요약이 있는 최근 7일의 미열람 개발 글에서 최신순과 출처 다양성으로 최대 3편을 고른다. */
export function selectReadingBrief(
  articles: ArticleDto[],
  interests: string[],
  readSet: Set<string>,
  now: number,
): { items: ArticleDto[]; candidateCount: number } {
  const seen = new Set<string>();
  const urls = new Set<string>();
  const candidates = articles
    .filter((article) => {
      const published = Date.parse(article.publishedAt);
      const category = categoryOf(article).key;
      if (
        seen.has(article.id) ||
        readSet.has(article.id) ||
        !Number.isFinite(published) ||
        published > now ||
        published < now - 7 * 86_400_000 ||
        !readableSummary(article.summaryOneLine) ||
        (interests.length > 0 ? !interests.includes(category) : category === 'etc')
      )
        return false;
      seen.add(article.id);
      return true;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((article) => {
      // 같은 원문이 여러 수집처에 올라와도 추천 공간을 중복해서 쓰지 않는다.
      const url = article.url.split('#')[0];
      if (urls.has(url)) return false;
      urls.add(url);
      return true;
    });

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
