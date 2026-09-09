import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArticleDto } from './article-card';

// URL 쿼리를 제어하되, 같은 화면의 이동이 서버 라우터를 호출하지 않는지 확인한다.
const replace = vi.fn();
function setSearch(value: string) {
  window.history.replaceState(null, '', value ? `/?${value}` : '/');
}
let currentPath = '/';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => currentPath,
}));

import { ArticlesView } from './articles-view';
import { SiteNav } from './site-nav';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

beforeEach(() => {
  replace.mockClear();
  window.history.replaceState(null, '', '/');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  setSearch('');
  currentPath = '/';
});

describe('ArticlesView 탭 키보드 접근성', () => {
  it('탭은 role=tablist / role=tab 으로 노출되고 활성 탭만 aria-selected', () => {
    const { getByRole, getAllByRole } = render(<ArticlesView articles={[]} />);
    expect(getByRole('tablist')).toBeTruthy();
    const tabs = getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(1);
    const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe('오늘');
  });

  it('roving tabindex — 활성 탭만 tabIndex 0, 나머지는 -1', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    const inactive = tabs.filter((t) => t.getAttribute('aria-selected') !== 'true');
    expect(active?.getAttribute('tabindex')).toBe('0');
    expect(inactive.every((t) => t.getAttribute('tabindex') === '-1')).toBe(true);
  });

  it('ArrowRight 로 다음 탭의 URL을 갱신하고 서버 라우터는 호출하지 않는다', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    // 두 번째 탭은 'ai' → /?tab=ai
    expect(window.location.search).toBe('?tab=ai');
    expect(replace).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('ArrowLeft 는 첫 탭에서 마지막 탭으로 순환', () => {
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const tabs = getAllByRole('tab');
    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    // 마지막 탭은 'repos'
    expect(window.location.search).toBe('?tab=repos');
    expect(replace).not.toHaveBeenCalled();
  });

  it('콘텐츠 영역은 role=tabpanel 로 활성 탭과 연결된다', () => {
    const { getByRole, getAllByRole } = render(<ArticlesView articles={[]} />);
    const panel = getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe('tab-all');
    for (const tab of getAllByRole('tab')) {
      expect(document.getElementById(tab.getAttribute('aria-controls') ?? '')).toBe(panel);
    }
  });
});

describe('setTab 쿼리 보존', () => {
  it('화살표 키 탭 전환 시 기존 필터 쿼리(cat/unread)를 보존한다', () => {
    setSearch('tab=articles&cat=ai&unread=1');
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const active = getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true');
    expect(active?.textContent).toBe('개발 뉴스');

    fireEvent.keyDown(active as HTMLElement, { key: 'ArrowRight' });

    // 다음 탭은 conferences — tab 키만 바뀌고 cat/unread 는 남는다.
    expect(window.location.search).toBe('?tab=conferences&cat=ai&unread=1');
    expect(replace).not.toHaveBeenCalled();
  });

  it('현재 활성 탭을 재클릭해도 필터 쿼리가 초기화되지 않는다', () => {
    setSearch('tab=articles&q=react');
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const active = getAllByRole('tab').find((t) => t.getAttribute('aria-selected') === 'true');

    fireEvent.click(active as HTMLElement);

    expect(window.location.search).toBe('?tab=articles&q=react');
    expect(replace).not.toHaveBeenCalled();
  });

  it("'오늘' 탭 전환은 tab 키만 지우고 나머지 쿼리는 유지", () => {
    setSearch('tab=articles&q=react');
    const { getAllByRole } = render(<ArticlesView articles={[]} />);
    const today = getAllByRole('tab').find((t) => t.textContent === '오늘');

    fireEvent.click(today as HTMLElement);

    expect(window.location.search).toBe('?q=react');
    expect(replace).not.toHaveBeenCalled();
  });
});

describe('저장 배지', () => {
  it('배지는 로드된 목록 교집합이 아닌 북마크 저장소 전체 크기를 표시한다', () => {
    // 목록(articles=[])에 없는 과거 글 2건 — 저장소 기준이면 2, 교집합 기준이면 배지 없음.
    localStorage.setItem('devbrief.bookmarks.v1', JSON.stringify(['old-1', 'old-2']));
    const { getByText, getByRole } = render(<ArticlesView articles={[]} />);
    const badge = getByText('2');
    expect(badge.closest('a')?.getAttribute('href')).toBe('/bookmarks');
    const saved = getByRole('link', { name: '저장' });
    expect(document.getElementById(saved.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      '저장한 글 2개',
    );
  });

  it('북마크가 없으면 배지를 그리지 않는다', () => {
    const { container } = render(<ArticlesView articles={[]} />);
    expect(container.querySelector('#header-saved-count')).toBeNull();
  });
});

describe('상세 페이지 내비게이션', () => {
  it.each([
    ['/articles/a1', '개발 뉴스', '/?tab=articles'],
    ['/videos/v1', '발표 영상', '/?tab=videos'],
    ['/conferences', '행사', '/?tab=conferences'],
    ['/bookmarks', '저장', '/bookmarks'],
  ])('%s에서 연결된 메뉴의 현재 위치를 표시한다', (path, label, href) => {
    currentPath = path;
    const { getByRole, container } = render(<SiteNav />);
    const current = getByRole('link', { name: label });
    expect(current.getAttribute('aria-current')).toBe('page');
    expect(current.getAttribute('href')).toBe(href);
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(getByRole('link', { name: '저장' }).getAttribute('href')).toBe('/bookmarks');
  });

  it('유사한 경로 이름을 상세 페이지로 오인하지 않는다', () => {
    currentPath = '/articles-other';
    const { container } = render(<SiteNav />);
    expect(container.querySelector('[aria-current="page"]')).toBeNull();
  });
});

describe("articles 탭 '전체' 통계 + 더 불러오기 (c62)", () => {
  it("'전체'는 로드된 개수가 아닌 X-Total-Count 의 서버 전체 건수를 표시한다", () => {
    setSearch('tab=articles');
    const { getByText } = render(
      <ArticlesView articles={[makeArticle({ id: 'a1' })]} total={250} />,
    );
    // 로드 1건이지만 '전체'는 서버 count 250
    expect(getByText('250')).toBeTruthy();
  });

  it('total 미상(null)이면 로드 수로 폴백하고 더 불러오기를 노출하지 않는다', () => {
    setSearch('tab=articles');
    const { queryByText } = render(
      <ArticlesView articles={[makeArticle({ id: 'a1' })]} total={null} />,
    );
    expect(queryByText('이전 글 더 불러오기')).toBeNull();
  });

  it('클릭 → offset 페치로 이전 글을 append 하고, 전부 로드되면 버튼을 접는다', async () => {
    setSearch('tab=articles');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [makeArticle({ id: 'a3', title: '아카이브 글' })],
    });
    vi.stubGlobal('fetch', fetchMock);

    const { getByText, queryByText, findByText } = render(
      <ArticlesView articles={[makeArticle({ id: 'a1' }), makeArticle({ id: 'a2' })]} total={3} />,
    );
    fireEvent.click(getByText('이전 글 더 불러오기'));

    // append 된 이전 글이 목록 풀에 합류해 렌더된다.
    await findByText('아카이브 글');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('offset=2');
    // 3/3 전부 로드 → hasMore false → 버튼 접힘.
    expect(queryByText('이전 글 더 불러오기')).toBeNull();
  });

  it('중복 id 가 내려와도(offset 드리프트) 목록에 두 번 넣지 않는다', async () => {
    setSearch('tab=articles');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        // a1 은 이미 로드된 글 — 첫 로드 뒤 새 글이 끼면 offset 페치에 겹쳐 내려올 수 있다.
        json: async () => [
          makeArticle({ id: 'a1' }),
          makeArticle({ id: 'a2', title: '새 이전 글' }),
        ],
      }),
    );

    const { getAllByText, getByText, findByText } = render(
      <ArticlesView articles={[makeArticle({ id: 'a1', title: '원본 글' })]} total={2} />,
    );
    fireEvent.click(getByText('이전 글 더 불러오기'));

    await findByText('새 이전 글');
    // 중복 병합이면 a1 이 두 번 렌더된다.
    expect(getAllByText('원본 글')).toHaveLength(1);
  });

  it('서버가 빈 응답을 주면(전체 count 와 드리프트) 버튼을 접는다', async () => {
    setSearch('tab=articles');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));

    const { getByText, queryByText } = render(
      <ArticlesView articles={[makeArticle({ id: 'a1' })]} total={5} />,
    );
    fireEvent.click(getByText('이전 글 더 불러오기'));

    await waitFor(() => expect(queryByText('이전 글 더 불러오기')).toBeNull());
  });
});

describe('event catalog loading', () => {
  const events = [
    {
      id: 'catalog-event',
      name: 'Future Community',
      url: 'https://example.com',
      startDate: '2099-01-01',
      location: 'Seoul',
      topics: [],
    },
  ];
  it('clears the initial event failure after recovery while retaining other failed feeds', async () => {
    setSearch('tab=conferences');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => events }));
    const view = render(
      <ArticlesView
        articles={[]}
        loadConferenceCatalog
        initialLoadErrors={['행사', '개발 뉴스']}
      />,
    );
    await view.findByRole('link', { name: 'Future Community' });
    expect(view.getByRole('alert').textContent).toContain('개발 뉴스');
    expect(view.getByRole('alert').textContent).not.toContain('행사');
  });
  it('only downloads the full catalog when the event tab is opened', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => events });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<ArticlesView articles={[]} loadConferenceCatalog />);
    expect(fetchMock).not.toHaveBeenCalled();
    setSearch('tab=conferences');
    view.rerender(<ArticlesView articles={[]} loadConferenceCatalog />);
    expect(await view.findByRole('link', { name: 'Future Community' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    setSearch('tab=all');
    view.rerender(<ArticlesView articles={[]} loadConferenceCatalog />);
    setSearch('tab=conferences');
    view.rerender(<ArticlesView articles={[]} loadConferenceCatalog />);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('automatically recovers a transient catalog failure while keeping the loading state', async () => {
    setSearch('tab=conferences');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true, json: async () => events });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<ArticlesView articles={[]} loadConferenceCatalog />);
    expect(view.getByText('전체 일정을 불러오는 중이에요…')).toBeTruthy();
    expect(await view.findByRole('link', { name: 'Future Community' })).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('exposes failures and lets the visitor retry', async () => {
    setSearch('tab=conferences');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 400 })
      .mockResolvedValueOnce({ ok: true, json: async () => events });
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<ArticlesView articles={[]} loadConferenceCatalog />);
    expect(await view.findByRole('alert')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: '다시 시도' }));
    expect(await view.findByRole('link', { name: 'Future Community' })).toBeTruthy();
    expect(view.queryByRole('alert')).toBeNull();
  });
});

it('이전 글 조회 실패를 알리고 재시도할 때 현재 목록을 보존한다', async () => {
  setSearch('tab=articles');
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [makeArticle({ id: 'a2', title: '다음 글' })],
    });
  vi.stubGlobal('fetch', fetchMock);
  const view = render(
    <ArticlesView articles={[makeArticle({ id: 'a1', title: '현재 글' })]} total={2} />,
  );
  fireEvent.click(view.getByText('이전 글 더 불러오기'));
  await view.findByRole('alert');
  expect(view.getByText('현재 글')).toBeTruthy();
  fireEvent.click(view.getByText('이전 글 다시 불러오기'));
  await view.findByText('다음 글');
  expect(view.getByText('현재 글')).toBeTruthy();
  expect(view.queryByRole('alert')).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it.each([null, { error: 'bad response' }, [null]])(
  'keeps the current articles when more returns %j',
  async (payload) => {
    setSearch('tab=articles');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const view = render(
      <ArticlesView articles={[makeArticle({ id: 'a1', title: '현재 글' })]} total={2} />,
    );
    fireEvent.click(view.getByText('이전 글 더 불러오기'));
    await view.findByRole('alert');
    expect(view.getByText('현재 글')).toBeTruthy();
    expect(view.getByText('이전 글 다시 불러오기')).toBeTruthy();
  },
);
it('shows failed feed names with a retry control on the home view', () => {
  const view = render(
    <ArticlesView articles={[]} initialLoadErrors={['개발 뉴스', '발표 영상']} />,
  );
  expect(view.getByRole('alert').textContent).toContain('개발 뉴스 · 발표 영상');
  expect(view.getByRole('button', { name: '다시 시도' })).toBeTruthy();
});

it('advances past overlapping rows and retries the same failed page', async () => {
  setSearch('tab=articles');
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [makeArticle({ id: 'a1' }), makeArticle({ id: 'a2', title: '두 번째 글' })],
    })
    .mockResolvedValueOnce({ ok: false, status: 503 })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [makeArticle({ id: 'a3', title: '세 번째 글' })],
    });
  vi.stubGlobal('fetch', fetcher);
  const view = render(<ArticlesView articles={[makeArticle({ id: 'a1' })]} total={4} />);
  fireEvent.click(view.getByText('이전 글 더 불러오기'));
  await view.findByText('두 번째 글');
  fireEvent.click(view.getByText('이전 글 더 불러오기'));
  await view.findByRole('alert');
  fireEvent.click(view.getByText('이전 글 다시 불러오기'));
  await view.findByText('세 번째 글');
  expect(
    fetcher.mock.calls.map((call) =>
      new URL(call[0], 'https://devbrief.test').searchParams.get('offset'),
    ),
  ).toEqual(['1', '3', '3']);
});

it('aborts an unfinished older-article request when leaving the page', async () => {
  setSearch('tab=articles');
  let signal: AbortSignal | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn((_url, options) => {
      signal = options.signal;
      return new Promise((_resolve, reject) =>
        signal?.addEventListener('abort', () => reject(new Error('cancelled'))),
      );
    }),
  );
  const view = render(<ArticlesView articles={[makeArticle({ id: 'a1' })]} total={2} />);
  fireEvent.click(view.getByText('이전 글 더 불러오기'));
  expect(signal).toBeDefined();
  view.unmount();
  expect(signal?.aborted).toBe(true);
});
