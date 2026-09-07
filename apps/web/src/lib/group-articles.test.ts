import type { ArticleDto } from '@/components/article-card';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { extractTopTags, groupByTime } from './group-articles';

function makeArticle(
  partial: Partial<ArticleDto> & { id: string; publishedAt: string },
): ArticleDto {
  return {
    title: 'title',
    titleKo: null,
    url: 'https://x',
    summaryOneLine: null,
    summaryThreeLine: null,
    tags: [],
    imageUrl: null,
    language: 'ko',
    source: { name: 'GeekNews', provider: 'geeknews' },
    ...partial,
  };
}

describe('groupByTime — KST 달력 날짜 경계', () => {
  // 2026-05-30 21:00 KST (= 12:00 UTC) 고정
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

  it('같은 KST 달력 날짜 → 오늘', () => {
    // KST 05-30 09:00 발행, 현재 KST 05-30 21:00
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-30T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('오늘');
  });

  it('어제 밤 발행(23시간 전)은 오늘이 아니라 어제 — rolling 24h 윈도우 회귀 가드', () => {
    // KST 05-29 22:00 발행 — 23시간 전이지만 달력상 어제
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-29T13:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('어제');
  });

  it('그저께 밤 발행(47시간 전)은 어제가 아니라 이번 주 — rolling 48h 윈도우 회귀 가드', () => {
    // KST 05-28 22:00 발행 — 47시간 전이지만 달력상 그저께
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-28T13:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('이번 주');
  });

  it('KST 달력 어제 → 어제', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-29T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('어제');
  });

  it('달력 2~6일 전 → 이번 주', () => {
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-26T00:00:00Z' })];
    const groups = groupByTime(list);
    expect(groups[0].label).toBe('이번 주');
  });

  it('달력 7일 이상 → 그 외', () => {
    const list = [
      makeArticle({ id: 'boundary', publishedAt: '2026-05-23T00:00:00Z' }), // 정확히 7일 전
      makeArticle({ id: 'old', publishedAt: '2026-05-01T00:00:00Z' }),
    ];
    const groups = groupByTime(list);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('그 외');
    expect(groups[0].articles.map((a) => a.id)).toEqual(['boundary', 'old']);
  });

  it('자정 걸친 3시간 이내는 달력상 어제라도 방금 유지 — 의도된 예외', () => {
    // 현재 KST 05-30 01:00, 발행 KST 05-29 23:30 (1.5시간 전)
    const now = new Date('2026-05-29T16:00:00Z').getTime();
    const list = [makeArticle({ id: '1', publishedAt: '2026-05-29T14:30:00Z' })];
    const groups = groupByTime(list, now);
    expect(groups[0].label).toBe('방금');
  });

  it('now 를 주입하면 시스템 시계와 무관하게 계산 — SSR/CSR 고정 기준용', () => {
    const now = new Date('2026-06-10T12:00:00Z').getTime();
    const list = [makeArticle({ id: '1', publishedAt: '2026-06-09T13:00:00Z' })];
    expect(groupByTime(list, now)[0].label).toBe('어제');
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
  function makeList(tagSets: string[][]): ArticleDto[] {
    return tagSets.map((tags, i) =>
      makeArticle({ id: `a${i}`, publishedAt: '2026-05-30T00:00:00Z', tags }),
    );
  }

  it('태그 빈도 내림차순 + 기본 limit 8', () => {
    const result = extractTopTags(
      makeList([
        ['AI', 'LLM'],
        ['AI', 'Anthropic'],
        ['AI', 'LLM', 'Claude'],
      ]),
    );
    expect(result[0]).toEqual({ tag: 'AI', count: 3 });
    expect(result[1]).toEqual({ tag: 'LLM', count: 2 });
    expect(result.map((r) => r.tag)).toEqual(['AI', 'LLM', 'Anthropic', 'Claude']);
  });

  it('대소문자만 다른 태그는 병합하고 최빈 원형을 라벨로 — categoryOptionsOf 와 동일 규칙', () => {
    const result = extractTopTags(makeList([['AI', 'LLM'], ['ai'], ['ai', 'LLM']]));
    expect(result[0]).toEqual({ tag: 'ai', count: 3 });
    expect(result[1]).toEqual({ tag: 'LLM', count: 2 });
  });

  it('limit 인자가 결과 길이를 제한', () => {
    expect(extractTopTags(makeList([['a', 'b', 'c', 'd', 'e']]), 2)).toHaveLength(2);
  });

  it('빈 배열 → []', () => {
    expect(extractTopTags([])).toEqual([]);
  });
});
