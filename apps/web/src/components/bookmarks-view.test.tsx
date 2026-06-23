import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarksView } from './bookmarks-view';

const BOOKMARK_KEY = 'devbrief.bookmarks.v1';

function dbArticle(id: string, publishedAt: string) {
  return {
    id,
    title: `Title ${id}`,
    titleKo: null,
    url: `https://example.com/${id}`,
    summaryOneLine: null,
    summaryThreeLine: null,
    publishedAt,
    tags: [],
    imageUrl: null,
    source: { name: 'Example', provider: 'rss_generic' },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('BookmarksView (배치 조회)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('북마크 id 를 배치 엔드포인트 1회 호출로 조회한다', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['a', 'b']));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [dbArticle('a', '2026-01-02'), dbArticle('b', '2026-01-01')],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { findByText } = render(<BookmarksView />);

    expect(await findByText('Title a')).toBeTruthy();
    expect(await findByText('Title b')).toBeTruthy();

    // 단건 N회가 아니라 배치 1회만 호출
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('/articles/batch?ids=');
    expect(url).toContain('a');
    expect(url).toContain('b');
  });

  it('조회 안 된 id 는 "해제만 가능" 으로 노출한다', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['a', 'ghost']));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [dbArticle('a', '2026-01-02')], // ghost 는 빠짐
    });
    vi.stubGlobal('fetch', fetchMock);

    const { findByText, getByText } = render(<BookmarksView />);

    expect(await findByText('Title a')).toBeTruthy();
    const missingRow = await findByText('더 이상 불러올 수 없는 글이에요.');
    expect(missingRow).toBeTruthy();
    // missing 행에는 해제 버튼이 함께 노출된다 (해당 li 안에서 조회)
    const li = missingRow.closest('li');
    expect(li).not.toBeNull();
    expect(getByText('해제', { selector: 'button' })).toBeTruthy();
  });

  it('배치 호출 실패 시 에러 상태를 표시한다', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['a']));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => [] }),
    );

    const { findByText } = render(<BookmarksView />);

    expect(await findByText(/글을 불러오지 못했어요/)).toBeTruthy();
  });

  it('북마크가 없으면 빈 상태를 보여주고 fetch 하지 않는다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { findByText } = render(<BookmarksView />);

    expect(await findByText('아직 저장한 글이 없어요.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('100개 초과 시 청크 단위로 여러 번 호출한다', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id${i}`);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(ids));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);

    render(<BookmarksView />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
