import { MOCK_CONFERENCES } from '@/lib/mock-conferences';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// MOCKS_ENABLED 를 케이스별로 제어 — getter 라 페이지가 호출 시점마다 다시 읽는다.
const mockState = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/mocks-enabled', () => ({
  get MOCKS_ENABLED() {
    return mockState.enabled;
  },
}));
vi.mock('@/components/site-nav', () => ({ SiteNav: () => null }));
vi.mock('@/components/tabs/conferences-tab', () => ({
  ConferencesTab: ({ conferences }: { conferences: unknown[] }) => (
    <div data-testid="conf-view">{conferences.length}</div>
  ),
}));

import ConferencesPage from './page';

const DB_CONF = {
  id: 'db-1',
  name: 'REAL CONF',
  url: 'https://example.com',
  startDate: '2026-08-01',
  endDate: null,
  location: '서울',
  topics: [],
  description: null,
  imageUrl: null,
  brandColor: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

beforeEach(() => {
  mockState.enabled = false;
});

describe('ConferencesPage mock 격리 (c10)', () => {
  it('프로덕션: API 실패 시 mock 대신 재시도 안내를 렌더한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { queryByTestId, getByText } = render(await ConferencesPage());
    expect(queryByTestId('conf-view')).toBeNull();
    expect(getByText(/불러오지 못했어요/)).toBeTruthy();
  });

  it('프로덕션: 정상 빈 응답에도 mock 을 노출하지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
    const { queryByTestId, getByText } = render(await ConferencesPage());
    expect(queryByTestId('conf-view')).toBeNull();
    expect(getByText('아직 보여드릴 행사 일정이 없어요.')).toBeTruthy();
  });

  it('개발(MOCKS_ENABLED): API 실패 시 mock 폴백을 유지한다', async () => {
    mockState.enabled = true;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')));
    const { getByTestId } = render(await ConferencesPage());
    expect(getByTestId('conf-view').textContent).toBe(String(MOCK_CONFERENCES.length));
  });

  it('실데이터가 있으면 그대로 렌더한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [DB_CONF] }));
    const { getByTestId } = render(await ConferencesPage());
    expect(getByTestId('conf-view').textContent).toBe('1');
  });
});

describe('ConferencesPage 오늘 라벨 KST 고정 (c19)', () => {
  it('서버가 UTC 여도 KST 기준 날짜를 표시한다 (UTC 7/15 23:00 = KST 7/16)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T23:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => [DB_CONF] }));
    const { container } = render(await ConferencesPage());
    expect(container.textContent).toContain('7월 16일');
    expect(container.textContent).not.toContain('7월 15일');
  });
});

it('shows retry rather than an empty calendar on API failure', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502 }));
  const view = render(await ConferencesPage());
  expect(view.getByRole('alert').textContent).toContain('불러오지 못했어요');
  expect(view.queryByText('아직 보여드릴 행사 일정이 없어요.')).toBeNull();
});
