import type { ArticleDto } from '@/components/article-card';
import { CATEGORIES, categoryOf } from '@/lib/category';
import { sourceColor } from '@/lib/source-colors';

/** 글 목록 필터 조건. 모든 필드는 선택. 비어 있으면 해당 조건 미적용. */
export interface ArticleFilter {
  /** 키워드 — 제목/번역 제목/한 줄 요약/태그를 대소문자 무시로 부분 일치 검색 */
  query?: string;
  /** 소스 provider (예: geeknews) */
  source?: string | null;
  /**
   * 카테고리 — 표시 칩과 같은 진실인 categoryOf 6분류 키(ai/frontend/…)와 일치.
   * 유효하지 않은 키(과거 태그 기반 URL 의 ?cat=react 등)는 무시해 빈 결과를 만들지 않는다.
   */
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
  // 카테고리는 목록 칩(categoryOf)과 같은 진실로 매칭 — 태그 없는 글도 제목/요약 기반으로 잡힌다.
  // (과거엔 원시 RSS 태그 정확 일치라, 칩은 Frontend 인데 어떤 카테고리를 골라도 안 나오는 글이 생겼다.)
  const cat = category?.toLowerCase() ?? null;
  const catKey = cat && CATEGORIES[cat] ? cat : null;
  return articles.filter((a) => {
    if (source && a.source.provider !== source) return false;
    if (catKey && categoryOf(a).key !== catKey) return false;
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
 * 표시 칩과 같은 진실(categoryOf 6분류)로 카테고리 옵션 집계.
 * 과거엔 원시 RSS 태그 빈도 상위 N개였으나, 글 다수가 태그가 없어
 * 칩(제목+요약 기반)과 사이드바 필터가 서로 다른 분류를 가리켰다.
 * 옵션 순서는 CATEGORIES 선언 순서로 고정(데이터에 따라 출렁이지 않게), 글이 없는 분류는 제외.
 */
export function categoryOptionsOf(articles: ArticleDto[]): CategoryOption[] {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const key = categoryOf(a).key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.values(CATEGORIES)
    .map((c) => ({ value: c.key, label: c.label, count: counts.get(c.key) ?? 0 }))
    .filter((o) => o.count > 0);
}
