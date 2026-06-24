import type { ArticleDto } from '@/components/article-card';
import { describe, expect, it } from 'vitest';
import { pickRelated } from './related-articles';

function makeArticle(over: Partial<ArticleDto> & { id: string }): ArticleDto {
  return {
    title: over.id,
    titleKo: null,
    url: `https://example.com/${over.id}`,
    summaryOneLine: null,
    summaryThreeLine: null,
    publishedAt: '2026-06-01T00:00:00Z',
    tags: [],
    imageUrl: null,
    source: { name: 'S', provider: 'rss_generic' },
    ...over,
  };
}

describe('pickRelated', () => {
  const base = makeArticle({
    id: 'base',
    tags: ['AI', 'LLM'],
    source: { name: 'Anthropic', provider: 'anthropic' },
  });

  it('같은 출처 글을 포함한다', () => {
    const pool = [
      makeArticle({ id: 'same-source', source: { name: 'Anthropic', provider: 'anthropic' } }),
      makeArticle({ id: 'unrelated', source: { name: 'X', provider: 'devto' } }),
    ];
    const result = pickRelated(base, pool, 5);
    expect(result.map((a) => a.id)).toEqual(['same-source']);
  });

  it('태그가 겹치는 글을 포함한다', () => {
    const pool = [makeArticle({ id: 'tag-match', tags: ['LLM', '워크플로우'] })];
    const result = pickRelated(base, pool, 5);
    expect(result.map((a) => a.id)).toEqual(['tag-match']);
  });

  it('자기 자신은 제외한다', () => {
    const pool = [base, makeArticle({ id: 'same-source', source: base.source })];
    const result = pickRelated(base, pool, 5);
    expect(result.map((a) => a.id)).toEqual(['same-source']);
  });

  it('limit 개수만큼만 반환한다', () => {
    const pool = Array.from({ length: 6 }, (_, i) =>
      makeArticle({ id: `s${i}`, source: base.source }),
    );
    expect(pickRelated(base, pool, 3)).toHaveLength(3);
  });

  it('limit 이 0 이하면 빈 배열', () => {
    const pool = [makeArticle({ id: 'same-source', source: base.source })];
    expect(pickRelated(base, pool, 0)).toEqual([]);
  });

  it('관련 글이 없으면 빈 배열', () => {
    const pool = [makeArticle({ id: 'unrelated', source: { name: 'X', provider: 'devto' } })];
    expect(pickRelated(base, pool, 5)).toEqual([]);
  });
});
