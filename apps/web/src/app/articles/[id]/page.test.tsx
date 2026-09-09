import { MOCK_ARTICLES } from '@/lib/mock-articles';
import { pickRelated } from '@/lib/related-articles';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/mocks-enabled', () => ({
  get MOCKS_ENABLED() {
    return mockState.enabled;
  },
}));
vi.mock('@/components/site-nav', () => ({ SiteNav: () => null }));
vi.mock('@/components/article-detail', () => ({
  ArticleDetail: ({ article, related }: { article: { id: string }; related: unknown[] }) => (
    <div data-testid="detail">
      {article.id}:{related.length}
    </div>
  ),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

import ArticleDetailPage, { generateMetadata } from './page';

const DB_ARTICLE = {
  id: 'a1',
  title: 'Real article',
  titleKo: '실제 글',
  url: 'https://example.com/a1',
  summaryOneLine: '한 줄 요약',
  summaryThreeLine: null,
  publishedAt: '2026-07-01T00:00:00Z',
  tags: ['AI'],
  imageUrl: null,
  source: { name: '출처', provider: 'rss_generic' },
};

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** getOne 은 성공, related 만 지정 응답을 주는 fetch 스텁 */
function fetchWithRelated(related: unknown) {
  return vi.fn(async (url: string) => {
    if (url.includes('/related')) {
      return { ok: true, json: async () => related };
    }
    return { ok: true, json: async () => DB_ARTICLE };
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  mockState.enabled = false;
});

describe('ArticleDetailPage mock 격리 (c13)', () => {
  it('프로덕션: mock id(m1) 는 가짜 글 대신 notFound 로 떨어진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(ArticleDetailPage(params('m1'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('프로덕션: generateMetadata 도 mock 제목 대신 기본 타이틀을 쓴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const meta = await generateMetadata(params('m1'));
    expect(meta.title).toBe('Devbrief');
  });

  it('개발(MOCKS_ENABLED): mock 글 상세는 유지된다', async () => {
    mockState.enabled = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { getByTestId } = render(await ArticleDetailPage(params('m1')));
    const mock = MOCK_ARTICLES.find((a) => a.id === 'm1');
    expect(mock).toBeTruthy();
    const expectedRelated = pickRelated(mock as (typeof MOCK_ARTICLES)[number], MOCK_ARTICLES, 5);
    expect(getByTestId('detail').textContent).toBe(`m1:${expectedRelated.length}`);
  });
});

describe('ArticleDetailPage 비슷한 글 mock 격리 (c12)', () => {
  it('프로덕션: related 빈 응답이면 mock 을 섞지 않고 섹션을 숨긴다(related=[])', async () => {
    vi.stubGlobal('fetch', fetchWithRelated([]));
    const { getByTestId } = render(await ArticleDetailPage(params('a1')));
    expect(getByTestId('detail').textContent).toBe('a1:0');
  });

  it('프로덕션: related API 부분 장애(5xx)에도 mock 을 섞지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/related')) return { ok: false, status: 500 };
        return { ok: true, json: async () => DB_ARTICLE };
      }),
    );
    const { getByTestId } = render(await ArticleDetailPage(params('a1')));
    expect(getByTestId('detail').textContent).toBe('a1:0');
  });

  it('related 실데이터가 있으면 그대로 쓴다', async () => {
    vi.stubGlobal('fetch', fetchWithRelated([{ ...DB_ARTICLE, id: 'a2' }]));
    const { getByTestId } = render(await ArticleDetailPage(params('a1')));
    expect(getByTestId('detail').textContent).toBe('a1:1');
  });
});

describe('ArticleDetailPage upstream resilience', () => {
  it('uses the real summary when detail fails but batch is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/batch?ids=a1')) return { ok: true, json: async () => [DB_ARTICLE] };
        if (url.includes('/related')) return { ok: true, json: async () => [] };
        return { ok: false, status: 500 };
      }),
    );
    const { getByTestId } = render(await ArticleDetailPage(params('a1')));
    expect(getByTestId('detail').textContent).toBe('a1:0');
    expect((await generateMetadata(params('a1'))).title).toBe('실제 글 · Devbrief');
  });

  it('does not mask a genuine 404 with a batch fallback', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal('fetch', fetcher);
    await expect(ArticleDetailPage(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('never substitutes a different article returned by batch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/batch'))
          return { ok: true, json: async () => [{ ...DB_ARTICLE, id: 'other' }] };
        return { ok: false, status: 500 };
      }),
    );
    await expect(ArticleDetailPage(params('missing'))).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('temporary upstream failures', () => {
  it.each([502, 429])('shows retry instead of a false 404 for HTTP %s', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
    const view = render(await ArticleDetailPage(params('real-existing')));
    expect(view.getByRole('alert').textContent).toContain('불러오지 못했어요');
    expect(view.getByRole('button', { name: '다시 시도' })).toBeTruthy();
    expect((await generateMetadata(params('real-existing'))).title).toBe('Devbrief');
  });
  it('reports malformed successful data as unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: 'invalid' }) }),
    );
    const view = render(await ArticleDetailPage(params('real-existing')));
    expect(view.getByRole('alert')).toBeTruthy();
  });
});
