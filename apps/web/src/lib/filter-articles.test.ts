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

  it('카테고리는 태그와 정확 일치(대소문자 무시), 부분 일치 아님', () => {
    expect(filterArticles(ARTICLES, { category: 'ai' }).map((a) => a.id)).toEqual(['b', 'c']);
    // 'ai' 가 'frontend' 같은 태그의 부분으로 잘못 매칭되면 안 됨
    expect(filterArticles(ARTICLES, { category: 'front' })).toHaveLength(0);
  });

  it('카테고리 키 대문자 입력도 정규화', () => {
    expect(filterArticles(ARTICLES, { category: 'AI' }).map((a) => a.id)).toEqual(['b', 'c']);
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
    const r = filterArticles(ARTICLES, { category: 'ai', source: 'geeknews' });
    expect(r.map((a) => a.id)).toEqual(['c']);
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
  it('태그 빈도 내림차순, # 접두 라벨', () => {
    const opts = categoryOptionsOf(ARTICLES);
    const ai = opts.find((o) => o.value === 'ai');
    expect(ai).toMatchObject({ value: 'ai', count: 2 });
    expect(ai?.label.startsWith('#')).toBe(true);
  });

  it('대소문자만 다른 태그는 lowercase 키로 합치고 최빈 표기를 라벨로', () => {
    const list = [
      makeArticle({ id: '1', tags: ['AI'] }),
      makeArticle({ id: '2', tags: ['ai'] }),
      makeArticle({ id: '3', tags: ['ai'] }),
    ];
    const opts = categoryOptionsOf(list);
    expect(opts).toHaveLength(1);
    expect(opts[0]).toMatchObject({ value: 'ai', count: 3, label: '#ai' });
  });

  it('limit 으로 상위 N개만', () => {
    const list = [makeArticle({ id: '1', tags: ['a', 'b', 'c', 'd'] })];
    expect(categoryOptionsOf(list, 2)).toHaveLength(2);
  });
});
