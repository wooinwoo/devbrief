import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { MOCK_VIDEOS } from '@/lib/mock-videos';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/mocks-enabled', () => ({
  get MOCKS_ENABLED() {
    return mockState.enabled;
  },
}));
vi.mock('@/components/articles-view', () => ({
  ArticlesView: (props: {
    articles: unknown[];
    total?: number | null;
    videos?: unknown[];
    conferences?: unknown[];
    repos?: unknown[];
    initialLoadErrors?: string[];
  }) => (
    <>
      <div data-testid="counts">
        {props.articles.length}-{props.videos?.length ?? 0}-{props.conferences?.length ?? 0}-
        {props.repos?.length ?? 0}
      </div>
      <div data-testid="errors">{props.initialLoadErrors?.join(',')}</div>
      <div data-testid="total">{String(props.total ?? null)}</div>
    </>
  ),
}));

import Home from './page';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mockState.enabled = false;
});

describe('Home mock 격리 (c46, c75)', () => {
  it('프로덕션: API 전면 장애 시 mock 대신 전부 빈 배열을 내린다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { getByTestId } = render(await Home());
    expect(getByTestId('counts').textContent).toBe('0-0-0-0');
  });

  it('프로덕션: 정상 빈 응답에도 mock 수치(조작된 D-day/조회수/star)를 노출하지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const { getByTestId } = render(await Home());
    expect(getByTestId('counts').textContent).toBe('0-0-0-0');
  });

  it('개발(MOCKS_ENABLED): API 장애 시 mock 폴백을 유지한다', async () => {
    mockState.enabled = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { getByTestId } = render(await Home());
    const [articles, videos, conferences] = (getByTestId('counts').textContent ?? '').split('-');
    expect(articles).toBe(String(MOCK_ARTICLES.length));
    expect(videos).toBe(String(MOCK_VIDEOS.length));
    expect(conferences).toBe(String(MOCK_CONFERENCES.length));
  });
});

// GET /articles 와이어(ArticleListItem) 형태의 실데이터 1건
const WIRE_ARTICLE = {
  id: 'a1',
  title: 'Real article',
  titleKo: null,
  url: 'https://example.com/a1',
  summaryOneLine: null,
  summaryThreeLine: null,
  publishedAt: '2026-07-01T00:00:00Z',
  tags: ['AI'],
  imageUrl: null,
  language: 'ko',
  source: { name: '출처', provider: 'rss_generic' },
};

/** articles 만 지정 헤더로 성공 응답, 나머지 엔드포인트는 빈 응답을 주는 fetch 스텁 */
function fetchWithArticleHeaders(headers?: Record<string, string>) {
  return vi.fn(async (url: string) => {
    if (url.includes('/articles')) {
      return { ok: true, headers: new Headers(headers), json: async () => [WIRE_ARTICLE] };
    }
    if (url.includes('/digest')) return { ok: true, json: async () => null };
    return { ok: true, json: async () => [] };
  });
}

describe('Home X-Total-Count → total 전달 (c62)', () => {
  it('articles 응답의 X-Total-Count 를 total 로 ArticlesView 에 넘긴다', async () => {
    vi.stubGlobal('fetch', fetchWithArticleHeaders({ 'X-Total-Count': '345' }));
    const { getByTestId } = render(await Home());
    expect(getByTestId('total').textContent).toBe('345');
    expect(getByTestId('counts').textContent).toBe('1-0-0-0');
  });

  it('헤더가 없으면 total 은 null (전체 미상)', async () => {
    vi.stubGlobal('fetch', fetchWithArticleHeaders());
    const { getByTestId } = render(await Home());
    expect(getByTestId('total').textContent).toBe('null');
  });

  it('숫자가 아니거나 음수인 헤더 값은 null 로 방어한다', async () => {
    vi.stubGlobal('fetch', fetchWithArticleHeaders({ 'X-Total-Count': 'abc' }));
    const { getByTestId } = render(await Home());
    expect(getByTestId('total').textContent).toBe('null');
  });
});

describe('Home partial outages', () => {
  it('labels failed feeds without presenting them as empty content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const view = render(await Home());
    expect(view.getByTestId('errors').textContent).toContain('개발 뉴스');
    expect(view.getByTestId('errors').textContent).toContain('발표 영상');
  });
  it('keeps weekly repos when the daily request rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('period=daily')) throw new Error('offline');
        return {
          ok: true,
          json: async () => (url.includes('period=weekly') ? [{ id: 'repo1', name: 'repo' }] : []),
        };
      }),
    );
    const view = render(await Home());
    expect(view.getByTestId('counts').textContent).toBe('0-0-0-1');
    expect(view.getByTestId('errors').textContent).toContain('오픈소스');
  });
  it('does not flag valid empty feeds as outages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => (url.includes('/digest') ? null : []),
      })),
    );
    const view = render(await Home());
    expect(view.getByTestId('errors').textContent).toBe('');
  });
});
