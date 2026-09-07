import type { ArticleDto } from '@/components/article-card';
import { describe, expect, it } from 'vitest';
import {
  categoryOptionsOf,
  filterArticles,
  isFiltering,
  matchesQuery,
  sourceOptionsOf,
} from './filter-articles';

function makeArticle(partial: Partial<ArticleDto> & { id: string }): ArticleDto {
  return {
    title: 'title',
    titleKo: null,
    url: 'https://x',
    summaryOneLine: null,
    summaryThreeLine: null,
    publishedAt: '2026-05-30T00:00:00Z',
    tags: [],
    imageUrl: null,
    language: 'ko',
    source: { name: 'GeekNews', provider: 'geeknews' },
    ...partial,
  };
}

const ARTICLES: ArticleDto[] = [
  makeArticle({
    id: 'a',
    title: 'React 19 Server Components',
    summaryOneLine: 'RSC 정식 도입',
    tags: ['React', 'frontend'],
    source: { name: 'Dev.to', provider: 'devto' },
  }),
  makeArticle({
    id: 'b',
    title: 'Claude Opus benchmark',
    titleKo: '클로드 벤치마크',
    tags: ['AI', 'llm'],
    source: { name: 'Anthropic', provider: 'anthropic' },
  }),
  makeArticle({
    id: 'c',
    title: 'Postgres 인덱스 튜닝',
    summaryOneLine: '쿼리 최적화',
    tags: ['backend', 'ai'],
    source: { name: 'GeekNews', provider: 'geeknews' },
  }),
];

describe('matchesQuery', () => {
  it('빈 쿼리는 항상 매칭', () => {
    expect(matchesQuery(ARTICLES[0], '')).toBe(true);
    expect(matchesQuery(ARTICLES[0], '   ')).toBe(true);
  });

  it('제목 대소문자 무시 부분 일치', () => {
    expect(matchesQuery(ARTICLES[0], 'react')).toBe(true);
    expect(matchesQuery(ARTICLES[0], 'REACT')).toBe(true);
    expect(matchesQuery(ARTICLES[0], 'vue')).toBe(false);
  });

  it('번역 제목(titleKo)도 검색 대상', () => {
    expect(matchesQuery(ARTICLES[1], '클로드')).toBe(true);
  });

  it('요약과 태그도 검색 대상', () => {
    expect(matchesQuery(ARTICLES[2], '최적화')).toBe(true);
    expect(matchesQuery(ARTICLES[2], 'backend')).toBe(true);
  });
});

describe('filterArticles', () => {
  it('조건 없으면 전체 반환', () => {
    expect(filterArticles(ARTICLES, {})).toHaveLength(3);
  });

  it('키워드 필터', () => {
    const r = filterArticles(ARTICLES, { query: 'postgres' });
    expect(r.map((a) => a.id)).toEqual(['c']);
  });

  it('소스 필터', () => {
    const r = filterArticles(ARTICLES, { source: 'anthropic' });
    expect(r.map((a) => a.id)).toEqual(['b']);
  });

  // 카테고리는 목록 칩과 같은 진실(categoryOf 6분류) — a=frontend(react), b=ai(claude),
  // c=backend(postgres; 태그에 ai 가 있어도 칩과 같은 backend 로 분류).
  it('카테고리는 칩과 같은 categoryOf 6분류 키로 매칭', () => {
    expect(filterArticles(ARTICLES, { category: 'ai' }).map((a) => a.id)).toEqual(['b']);
    expect(filterArticles(ARTICLES, { category: 'frontend' }).map((a) => a.id)).toEqual(['a']);
    expect(filterArticles(ARTICLES, { category: 'backend' }).map((a) => a.id)).toEqual(['c']);
  });

  it('태그 없는 글도 제목 기반으로 필터에 잡힌다(칩=필터 일치)', () => {
    const list = [makeArticle({ id: 'x', title: 'React 19 출시', tags: [] })];
    expect(filterArticles(list, { category: 'frontend' }).map((a) => a.id)).toEqual(['x']);
  });

  it('카테고리 키 대문자 입력도 정규화', () => {
    expect(filterArticles(ARTICLES, { category: 'AI' }).map((a) => a.id)).toEqual(['b']);
  });

  it('유효하지 않은 카테고리 키(과거 태그 URL 잔재)는 무시 — 빈 결과를 만들지 않음', () => {
    expect(filterArticles(ARTICLES, { category: 'react' })).toHaveLength(3);
  });

  it('hideRead 는 readSet 의 글을 제외', () => {
    const read = new Set(['b']);
    const r = filterArticles(ARTICLES, { hideRead: true }, read);
    expect(r.map((a) => a.id)).toEqual(['a', 'c']);
  });

  it('hideRead 가 true 라도 readSet 없으면 제외하지 않음', () => {
    expect(filterArticles(ARTICLES, { hideRead: true })).toHaveLength(3);
  });

  it('여러 조건 AND 결합', () => {
    const r = filterArticles(ARTICLES, { category: 'backend', source: 'geeknews' });
    expect(r.map((a) => a.id)).toEqual(['c']);
    expect(filterArticles(ARTICLES, { category: 'ai', source: 'geeknews' })).toHaveLength(0);
  });

  it('입력 배열을 변형하지 않음', () => {
    const copy = [...ARTICLES];
    filterArticles(ARTICLES, { query: 'react' });
    expect(ARTICLES).toEqual(copy);
  });
});

describe('isFiltering', () => {
  it('모든 조건 비어 있으면 false', () => {
    expect(isFiltering({})).toBe(false);
    expect(isFiltering({ query: '   ', source: null, category: null, hideRead: false })).toBe(
      false,
    );
  });

  it('하나라도 활성이면 true', () => {
    expect(isFiltering({ query: 'a' })).toBe(true);
    expect(isFiltering({ source: 'devto' })).toBe(true);
    expect(isFiltering({ category: 'ai' })).toBe(true);
    expect(isFiltering({ hideRead: true })).toBe(true);
  });
});

describe('sourceOptionsOf', () => {
  it('소스별 빈도 내림차순 집계', () => {
    const dupe = [
      ...ARTICLES,
      makeArticle({ id: 'd', source: { name: 'Dev.to', provider: 'devto' } }),
    ];
    const opts = sourceOptionsOf(dupe);
    expect(opts[0]).toMatchObject({ value: 'devto', label: 'Dev.to', count: 2 });
    expect(opts.map((o) => o.value)).toContain('anthropic');
    // 색 토큰이 채워져 있어야 함
    expect(typeof opts[0].color).toBe('string');
  });

  it('빈 배열 → []', () => {
    expect(sourceOptionsOf([])).toEqual([]);
  });
});

describe('categoryOptionsOf', () => {
  it('categoryOf 6분류 기준으로 집계, CATEGORIES 선언 순서 고정', () => {
    expect(categoryOptionsOf(ARTICLES)).toEqual([
      { value: 'ai', label: 'AI', count: 1 },
      { value: 'frontend', label: 'Frontend', count: 1 },
      { value: 'backend', label: 'Backend', count: 1 },
    ]);
  });

  it('태그 없는 글도 제목 기반으로 집계 — 칩과 옵션이 같은 분류를 가리킨다', () => {
    const list = [
      makeArticle({ id: '1', title: 'React 19 출시' }),
      makeArticle({ id: '2', title: 'Next.js 16 정식 릴리스' }),
    ];
    expect(categoryOptionsOf(list)).toEqual([{ value: 'frontend', label: 'Frontend', count: 2 }]);
  });

  it('신호 없는 글은 기타로 집계되고, 글이 없는 분류는 옵션에서 제외', () => {
    const list = [makeArticle({ id: '1', title: '주말에 다녀온 제주도 맛집 후기' })];
    expect(categoryOptionsOf(list)).toEqual([{ value: 'etc', label: '기타', count: 1 }]);
  });

  it('빈 배열 → []', () => {
    expect(categoryOptionsOf([])).toEqual([]);
  });
});
