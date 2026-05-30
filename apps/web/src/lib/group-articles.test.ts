import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { groupByTime, extractTopTags } from './group-articles';
import type { ArticleDto } from '@/components/article-card';

function makeArticle(
  partial: Partial<ArticleDto> & { id: string; publishedAt: string },
): ArticleDto {
  return {
    title: 'title',
    url: 'https://x',
    summaryOneLine: null,
    summaryThreeLine: null,
    tags: [],
    imageUrl: null,
    source: { name: 'GeekNews', provider: 'geeknews' },
    ...partial,
  };
}

describe('groupByTime', () => {
  const FIXED = new Date('2026-05-30T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('빈 배열은 빈 배열', () => {
    expect(groupByTime([])).toEqual([]);
  });

  it('3시간 이내 → 방금', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-30T10:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('방금');
    expect(groups[0].articles[0].id).toBe('1');
  });

  it('24시간 이내 → 오늘', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-30T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('오늘');
  });

  it('48시간 이내 → 어제', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-29T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('어제');
  });

  it('7일 이내 → 이번 주', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-26T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('이번 주');
  });

  it('7일 초과 → 그 외', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-01T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('그 외');
  });

  it('여러 그룹 동시에 — 빈 그룹은 제외', () => {
    const list = [
      makeArticle({ id: 'recent', publishedAt: '2026-05-30T11:00:00Z' }),
      makeArticle({ id: 'today', publishedAt: '2026-05-30T05:00:00Z' }),
      makeArticle({ id: 'old', publishedAt: '2026-05-01T00:00:00Z' }),
    ];
    const groups = groupByTime(list);
    expect(groups.map((g) => g.label)).toEqual(['방금', '오늘', '그 외']);
  });
});

describe('extractTopTags', () => {
  it('태그 빈도 내림차순 + 기본 limit 8', () => {
    const list = [
      { tags: ['AI', 'LLM'] },
      { tags: ['AI', 'Anthropic'] },
      { tags: ['AI', 'LLM', 'Claude'] },
    ].map(
      (p, i) =>
        ({
          id: `a${i}`,
          publishedAt: '2026-05-30T00:00:00Z',
          title: '',
          url: '',
          summaryOneLine: null,
          summaryThreeLine: null,
          imageUrl: null,
          source: { name: 'X', provider: 'x' },
          ...p,
        }) as ArticleDto,
    );

    const result = extractTopTags(list);
    expect(result[0]).toEqual({ tag: 'AI', count: 3 });
    expect(result[1]).toEqual({ tag: 'LLM', count: 2 });
    expect(result.map((r) => r.tag)).toEqual([
      'AI',
      'LLM',
      'Anthropic',
      'Claude',
    ]);
  });

  it('limit 인자가 결과 길이를 제한', () => {
    const list = [
      { tags: ['a', 'b', 'c', 'd', 'e'] },
    ].map(
      (p, i) =>
        ({
          id: `a${i}`,
          publishedAt: '2026-05-30T00:00:00Z',
          title: '',
          url: '',
          summaryOneLine: null,
          summaryThreeLine: null,
          imageUrl: null,
          source: { name: 'X', provider: 'x' },
          ...p,
        }) as ArticleDto,
    );

    expect(extractTopTags(list, 2)).toHaveLength(2);
  });

  it('빈 배열 → []', () => {
    expect(extractTopTags([])).toEqual([]);
  });
});
