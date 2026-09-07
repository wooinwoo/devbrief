import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminDashboard from './page';

const STATS = {
  articles: { total: 345, summarized: 300, unsummarized: 45, embedded: 200 },
  topSources: [],
  recentDaily: [
    { date: '2026-07-14', count: 0 },
    { date: '2026-07-15', count: 0 },
    { date: '2026-07-16', count: 0 },
    { date: '2026-07-17', count: 0 },
    { date: '2026-07-18', count: 0 },
    { date: '2026-07-19', count: 0 },
    { date: '2026-07-20', count: 3 },
  ],
  conferences: 4,
  videos: 57,
  repos: 12,
};

/** 요청 URL 별로 응답을 돌려주는 fetch 스텁 */
function stubApi(overrides: Record<string, unknown> = {}) {
  const routes: Record<string, unknown> = {
    '/stats/collection': STATS,
    '/conferences?status=PROPOSED': [{ id: 'p1' }],
    '/conferences?status=ACTIVE': [{ id: 'a1' }, { id: 'a2' }],
    '/sources': [{ active: true }, { active: true }, { active: false }],
    '/digest/today': { items: [{ id: 'd1' }] },
    ...overrides,
  };
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(async (url: string) => {
      const path = Object.keys(routes).find((p) => url.endsWith(p));
      if (!path) return { ok: false, status: 404, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => routes[path] };
    }),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AdminDashboard', () => {
  it('글/영상 카운트는 목록 length 가 아니라 /stats 의 실제 count 를 쓴다', async () => {
    stubApi();
    const { getByText, getAllByText } = render(await AdminDashboard());

    // 100 캡 목록이 아닌 stats.articles.total(345) 기반
    expect(getByText('345')).toBeTruthy();
    expect(getByText(/요약 300건/)).toBeTruthy();
    // 진행률 = 300/345 = 87%
    expect(getByText(/87%/)).toBeTruthy();
    // 발표 영상 = stats.videos(57) — 목록 API(/videos) 는 아예 부르지 않는다
    expect(getAllByText('57').length).toBeGreaterThan(0);
  });

  it("'활성 피드' 카드는 active=true 소스만 센다", async () => {
    stubApi();
    const { getByText } = render(await AdminDashboard());

    // 소스 3개 중 활성 2개
    expect(getByText(/활성 피드 · 전체 3개/)).toBeTruthy();
    const card = getByText('RSS 소스').parentElement;
    expect(card?.textContent).toContain('2');
  });

  it('stats 응답 실패 시 0 으로 폴백하고 렌더는 깨지지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.endsWith('/stats/collection')) {
          return { ok: false, status: 500, json: async () => ({}) };
        }
        return { ok: true, status: 200, json: async () => [] };
      }),
    );
    const { getByText } = render(await AdminDashboard());

    expect(getByText('대시보드')).toBeTruthy();
    expect(getByText(/요약 0건/)).toBeTruthy();
  });
});
