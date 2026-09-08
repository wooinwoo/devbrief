import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
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

  it('번역 제목·요약·태그 검색과 초기화는 북마크를 변경하거나 재조회하지 않는다', async () => {
    const stored = JSON.stringify(['a', 'b', 'c']);
    localStorage.setItem(BOOKMARK_KEY, stored);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { ...dbArticle('a', '2026-01-03'), titleKo: '리액트 설계' },
        { ...dbArticle('b', '2026-01-02'), summaryOneLine: '접근성 개선 기록' },
        { ...dbArticle('c', '2026-01-01'), tags: ['TypeScript'] },
      ],
    });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<BookmarksView />);
    await view.findByText('Title c');
    const input = view.getByRole('searchbox', { name: '저장한 글 검색' });
    const rows = () =>
      within(view.getByRole('list', { name: '저장한 글 목록' })).queryAllByRole('listitem');
    for (const query of ['리액트', '접근성', 'typescript']) {
      fireEvent.change(input, { target: { value: query } });
      expect(rows()).toHaveLength(1);
    }
    fireEvent.change(input, { target: { value: '없는검색어' } });
    expect(view.getByText('조건에 맞는 저장 글이 없어요.')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '검색·필터 초기화' }));
    expect(rows()).toHaveLength(3);
    fireEvent.click(view.getByRole('button', { name: '#TypeScript' }));
    expect(rows()).toHaveLength(1);
    expect((input as HTMLInputElement).value).toBe('TypeScript');
    expect(localStorage.getItem(BOOKMARK_KEY)).toBe(stored);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('안 읽은 글 필터는 읽음 변경을 반영하고 결과가 없어도 초기화할 수 있다', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['a', 'b']));
    localStorage.setItem('devbrief.read.v1', JSON.stringify(['a']));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [dbArticle('a', '2026-01-02'), dbArticle('b', '2026-01-01')],
      }),
    );
    const view = render(<BookmarksView />);
    await view.findByText('Title b');
    fireEvent.click(view.getByRole('button', { name: '안 읽은 글만' }));
    expect(view.queryByText('Title a')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: '읽음으로 표시' }));
    expect(view.getByText('조건에 맞는 저장 글이 없어요.')).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('devbrief.read.v1')!)).toEqual(['a', 'b']);
    fireEvent.click(view.getByRole('button', { name: '검색·필터 초기화' }));
    expect(view.getByText('Title a')).toBeTruthy();
    expect(view.getByText('Title b')).toBeTruthy();
    expect(view.getAllByRole('button', { name: '안 읽음으로 표시' })).toHaveLength(2);
  });

  it('발행순과 저장순을 구분하며 API 반환 순서에 의존하지 않는다', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['c', 'a', 'b']));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          dbArticle('a', '2026-01-01'),
          dbArticle('b', '2026-01-03'),
          dbArticle('c', '2026-01-02'),
        ],
      }),
    );
    const view = render(<BookmarksView />);
    await view.findByText('Title a');
    const titles = () =>
      within(view.getByRole('list', { name: '저장한 글 목록' }))
        .getAllByRole('link')
        .map((e) => e.textContent);
    expect(titles()).toEqual(['Title b', 'Title a', 'Title c']);
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'newest' } });
    expect(titles()).toEqual(['Title b', 'Title c', 'Title a']);
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'oldest' } });
    expect(titles()).toEqual(['Title a', 'Title c', 'Title b']);
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'saved' } });
    expect(titles()).toEqual(['Title b', 'Title a', 'Title c']);
  });

  it('20개씩 페이지 이동하며 검색·정렬 변경과 마지막 행 해제 후 유효한 페이지를 보여준다', async () => {
    const data = Array.from({ length: 21 }, (_, i) =>
      dbArticle(`a${i}`, `2026-01-${String(21 - i).padStart(2, '0')}`),
    );
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(data.map((a) => a.id).reverse()));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => data }));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const view = render(<BookmarksView />);
    await view.findByText('Title a0');
    expect(view.queryByText('Title a20')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: '다음 페이지' }));
    expect(view.getByText('Title a20')).toBeTruthy();
    fireEvent.change(view.getByRole('searchbox'), { target: { value: 'Title a0' } });
    expect(view.getByText('Title a0')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '검색어 지우기' }));
    fireEvent.click(view.getByRole('button', { name: '다음 페이지' }));
    fireEvent.change(view.getByRole('combobox'), { target: { value: 'oldest' } });
    expect(view.getByText('Title a20')).toBeTruthy();
    expect(view.queryByText('Title a0')).toBeNull();
    fireEvent.click(view.getByRole('button', { name: '다음 페이지' }));
    fireEvent.click(view.getByRole('button', { name: '저장 해제' }));
    expect(view.getByText('Title a20')).toBeTruthy();
    expect(view.queryByRole('navigation', { name: '페이지' })).toBeNull();
    expect(JSON.parse(localStorage.getItem(BOOKMARK_KEY)!)).toHaveLength(20);
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

  it('일부 청크 실패 시 실패분은 missing(해제 유도)이 아니라 재시도 배너로 노출', async () => {
    // 2개 청크 → 첫 청크 성공(ok0 만 존재, 나머지 99개는 서버가 없음 확인), 둘째 청크 실패
    const first = Array.from({ length: 100 }, (_, i) => `ok${i}`);
    const ids = [...first, 'fail0'];
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(ids));

    const fetchMock = vi
      .fn()
      // 첫 호출: 성공 (ok0 만 본문 반환)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [dbArticle('ok0', '2026-01-02')],
      })
      // 둘째 호출: 네트워크 실패
      .mockRejectedValueOnce(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const { findByText, getAllByText } = render(<BookmarksView />);

    // 성공한 청크의 글은 렌더된다
    expect(await findByText('Title ok0')).toBeTruthy();
    // 성공 청크에서 서버가 "없다"고 확인한 99개만 missing (해제 버튼)
    expect(getAllByText('더 이상 불러올 수 없는 글이에요.').length).toBe(99);
    expect(getAllByText('해제', { selector: 'button' }).length).toBe(99);
    // 실패 청크(fail0)는 삭제로 오분류하지 않고 재시도 배너로만 안내
    expect(await findByText(/북마크 1개를 불러오지 못했어요/)).toBeTruthy();
    expect(await findByText('다시 시도', { selector: 'button' })).toBeTruthy();
  });

  it('다시 시도 클릭 시 실패 청크를 재조회해 배너가 사라진다', async () => {
    const first = Array.from({ length: 100 }, (_, i) => `ok${i}`);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify([...first, 'late0']));

    const chunk1Resp = {
      ok: true,
      json: async () => first.map((id) => dbArticle(id, '2026-01-02')),
    };
    const fetchMock = vi
      .fn()
      // 최초 로드: 첫 청크 성공, 둘째 청크 실패
      .mockResolvedValueOnce(chunk1Resp)
      .mockRejectedValueOnce(new Error('network down'))
      // 재시도: 두 청크 모두 성공
      .mockResolvedValueOnce(chunk1Resp)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [dbArticle('late0', '2026-01-03')],
      });
    vi.stubGlobal('fetch', fetchMock);

    const { findByText, queryByText } = render(<BookmarksView />);

    const retry = await findByText('다시 시도', { selector: 'button' });
    fireEvent.click(retry);

    // 실패했던 청크의 글이 복구되고 배너는 사라진다
    expect(await findByText('Title late0')).toBeTruthy();
    expect(queryByText(/불러오지 못했어요/)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('모든 청크가 실패하면 에러 상태', async () => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(['a']));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    const { findByText } = render(<BookmarksView />);

    expect(await findByText(/글을 불러오지 못했어요/)).toBeTruthy();
  });
});
