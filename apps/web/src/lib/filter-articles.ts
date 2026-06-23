import type { ArticleDto } from '@/components/article-card';
import { sourceColor } from '@/lib/source-colors';

/** 글 목록 필터 조건. 모든 필드는 선택. 비어 있으면 해당 조건 미적용. */
export interface ArticleFilter {
  /** 키워드 — 제목/번역 제목/한 줄 요약/태그를 대소문자 무시로 부분 일치 검색 */
  query?: string;
  /** 소스 provider (예: geeknews) */
  source?: string | null;
  /** 카테고리 — 태그 lowercase 정규화 키와 정확히 일치 */
  category?: string | null;
  /** true 면 read 집합에 든 글을 제외 */
  hideRead?: boolean;
}

/** 글 하나가 단일 키워드와 매칭되는지 (제목/번역/요약/태그 대상) */
export function matchesQuery(article: ArticleDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay =
    `${article.title} ${article.titleKo ?? ''} ${article.summaryOneLine ?? ''} ${article.tags.join(' ')}`.toLowerCase();
  return hay.includes(q);
}

/**
 * 조건에 맞는 글만 추려 반환 (순수 함수 — 입력 배열 불변).
 * 검색/소스/카테고리/읽음 숨김을 AND 로 적용한다.
 */
export function filterArticles(
  articles: ArticleDto[],
  filter: ArticleFilter,
  readSet?: Set<string>,
): ArticleDto[] {
  const { query = '', source = null, category = null, hideRead = false } = filter;
  const cat = category?.toLowerCase() ?? null;
  return articles.filter((a) => {
    if (source && a.source.provider !== source) return false;
    if (cat && !a.tags.some((t) => t.toLowerCase() === cat)) return false;
    if (hideRead && readSet?.has(a.id)) return false;
    if (!matchesQuery(a, query)) return false;
    return true;
  });
}

/** 필터 조건 중 하나라도 활성인지 (섹션 헤더 분기·결과 카운트 표기용) */
export function isFiltering(filter: ArticleFilter): boolean {
  return !!filter.query?.trim() || !!filter.source || !!filter.category || !!filter.hideRead;
}

export interface SourceOption {
  value: string;
  label: string;
  count: number;
  color: string;
}

/** 글 목록에서 소스별 옵션을 빈도 내림차순으로 집계 */
export function sourceOptionsOf(articles: ArticleDto[]): SourceOption[] {
  const map = new Map<string, { name: string; count: number }>();
  for (const a of articles) {
    const cur = map.get(a.source.provider);
    if (cur) cur.count += 1;
    else map.set(a.source.provider, { name: a.source.name, count: 1 });
  }
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([value, { name, count }]) => ({
      value,
      label: name,
      count,
      color: sourceColor(value),
    }));
}

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

/**
 * 글 태그를 빈도 내림차순으로 집계해 상위 N개 카테고리 옵션 반환.
 * 대소문자만 다른 태그(#AI/#ai)는 lowercase 키로 합치고,
 * label 은 가장 많이 쓰인 원형 표기를 쓴다.
 */
export function categoryOptionsOf(articles: ArticleDto[], limit = 6): CategoryOption[] {
  const map = new Map<string, { count: number; forms: Map<string, number> }>();
  for (const a of articles)
    for (const t of a.tags) {
      const key = t.toLowerCase();
      const cur = map.get(key) ?? { count: 0, forms: new Map() };
      cur.count += 1;
      cur.forms.set(t, (cur.forms.get(t) ?? 0) + 1);
      map.set(key, cur);
    }
  return [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([value, { count, forms }]) => {
      const label = [...forms.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { value, label: `#${label}`, count };
    });
}
