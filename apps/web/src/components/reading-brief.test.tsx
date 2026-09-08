import { selectReadingBrief } from '@/lib/reading-brief';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDto } from './article-card';
import { ReadingBrief } from './reading-brief';

const NOW = Date.parse('2026-09-07T12:00:00Z');
const DAY = 86_400_000;
function article(id: string, age = 0, provider = 'geeknews', tags = ['React']): ArticleDto {
  return {
    id,
    title: `글 ${id}`,
    titleKo: null,
    url: `https://example.com/${id}`,
    summaryOneLine: '핵심 요약',
    summaryThreeLine: '첫 번째 근거\n두 번째 근거',
    publishedAt: new Date(NOW - age * DAY).toISOString(),
    tags,
    imageUrl: null,
    language: 'ko',
    source: { name: provider, provider },
  };
}
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('읽을 글 선정', () => {
  it('미열람·관심 분야·최근 7일을 함께 적용하며 미래·잘못된 날짜를 제외한다', () => {
    const rows = [
      article('read'),
      article('match', 1),
      article('boundary', 7),
      article('old', 8),
      article('future', -1),
      article('ai', 0, 'another', ['LLM']),
      { ...article('invalid'), publishedAt: 'invalid' },
    ];
    const result = selectReadingBrief(rows, ['frontend'], new Set(['read']), NOW);
    expect(result.items.map((a) => a.id)).toEqual(['match', 'boundary']);
    expect(result.candidateCount).toBe(2);
    expect(rows[0].id).toBe('read');
  });
  it('서로 다른 출처를 먼저 고르고 최대 3편만 제공한다', () => {
    const rows = [article('a'), article('b', 1), article('c', 2, 'toss'), article('d', 3, 'kakao')];
    expect(selectReadingBrief(rows, [], new Set(), NOW).items.map((a) => a.id)).toEqual([
      'a',
      'c',
      'd',
    ]);
  });
  it('일반 RSS의 서로 다른 블로그를 한 출처로 묶지 않는다', () => {
    const rows = [
      article('a'),
      { ...article('b', 1, 'rss_generic'), source: { provider: 'rss_generic', name: '블로그 A' } },
      { ...article('c', 2, 'rss_generic'), source: { provider: 'rss_generic', name: '블로그 B' } },
    ];
    expect(selectReadingBrief(rows, [], new Set(), NOW).items).toHaveLength(3);
  });
  it('출처가 하나뿐이면 나머지 글로 채우고 중복 ID는 제거한다', () => {
    const rows = [article('a'), article('a'), article('b', 1), article('c', 2), article('d', 3)];
    const result = selectReadingBrief(rows, [], new Set(), NOW);
    expect(result.items.map((a) => a.id)).toEqual(['a', 'b', 'c']);
    expect(result.candidateCount).toBe(4);
  });
  it('관심 분야는 OR로 적용하고 빈 목록·전부 읽음도 처리한다', () => {
    const rows = [article('web'), article('ai', 0, 'another', ['LLM'])];
    expect(selectReadingBrief(rows, ['frontend', 'ai'], new Set(), NOW).items).toHaveLength(2);
    expect(selectReadingBrief(rows, [], new Set(['web', 'ai']), NOW).items).toEqual([]);
    expect(selectReadingBrief([], [], new Set(), NOW).items).toEqual([]);
  });
});

describe('ReadingBrief', () => {
  const renderBrief = (rows = [article('web'), article('ai', 0, 'another', ['LLM'])]) => {
    vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const onOpen = vi.fn();
    const onBookmark = vi.fn();
    const onBrowse = vi.fn();
    return {
      ...render(
        <ReadingBrief
          articles={rows}
          readSet={new Set()}
          onOpen={onOpen}
          onBookmark={onBookmark}
          onBrowse={onBrowse}
        />,
      ),
      onOpen,
      onBookmark,
      onBrowse,
    };
  };
  it('저장된 관심 분야를 복원하고 토글·전체 선택을 저장한다', () => {
    localStorage.setItem(
      'devbrief.interests.v1',
      JSON.stringify(['frontend', '__proto__', 12, 'frontend']),
    );
    const view = renderBrief();
    fireEvent.click(view.getByText('관심 분야'));
    expect(view.getByRole('button', { name: 'Frontend' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(view.queryByRole('article', { name: '글 ai' })).toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'AI' }));
    expect(JSON.parse(localStorage.getItem('devbrief.interests.v1')!)).toEqual(['frontend', 'ai']);
    expect(view.getByRole('article', { name: '글 ai' })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '전체' }));
    expect(localStorage.getItem('devbrief.interests.v1')).toBe('[]');
  });
  it('요약은 읽음 표시 없이 확인하고 저장·읽음 버튼은 해당 글 ID로 동작한다', () => {
    const view = renderBrief();
    fireEvent.click(view.getByText('관심 분야'));
    const story = within(view.getByRole('article', { name: '글 web' }));
    fireEvent.click(story.getByText('요약 더 읽기'));
    expect(story.getByText(/첫 번째 근거/).hidden).toBe(false);
    expect(story.getByRole('button', { name: '요약 접기' }).getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(view.onOpen).not.toHaveBeenCalled();
    fireEvent.click(story.getByRole('button', { name: '저장' }));
    expect(view.onBookmark).toHaveBeenCalledWith('web');
    fireEvent.click(story.getByRole('button', { name: '읽음으로 표시' }));
    expect(view.onOpen).toHaveBeenCalledWith('web');
  });
  it('수집 메타데이터를 기사 요약처럼 노출하지 않는다', () => {
    const view = renderBrief([
      {
        ...article('metadata'),
        summaryOneLine: '기사 URL: 댓글 URL: 포인트: 53 # 댓글: 5',
        summaryThreeLine: 'Article URL: https://example.com Comments URL: https://example.com',
      },
    ]);
    expect(view.getByRole('link', { name: '글 metadata' })).toBeTruthy();
    expect(view.queryByText(/댓글 URL/)).toBeNull();
    expect(view.queryByRole('button', { name: '요약 더 읽기' })).toBeNull();
  });
  it('추천 결과가 없으면 관심 분야 초기화와 전체 탐색으로 복구한다', () => {
    localStorage.setItem('devbrief.interests.v1', JSON.stringify(['mobile']));
    const view = renderBrief();
    fireEvent.click(view.getByText('관심 분야'));
    expect(view.getByText('이 분야에서 새로 읽을 글이 없어요.')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '모든 분야 보기' }));
    expect(view.getByRole('article', { name: '글 web' })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '개발 뉴스 모두 보기' }));
    expect(view.onBrowse).toHaveBeenCalledTimes(1);
  });
  it('오염된 설정이나 저장 실패가 글 탐색을 막지 않는다', () => {
    localStorage.setItem('devbrief.interests.v1', '{invalid');
    const view = renderBrief();
    fireEvent.click(view.getByText('관심 분야'));
    expect(view.getByRole('article', { name: '글 web' })).toBeTruthy();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    fireEvent.click(view.getByRole('button', { name: 'AI' }));
    expect(view.getByRole('article', { name: '글 ai' })).toBeTruthy();
    expect(view.getByText(/설정을 저장하지 못했어요/)).toBeTruthy();
  });
});
