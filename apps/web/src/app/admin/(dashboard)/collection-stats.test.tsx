import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CollectionStats } from './collection-stats';

const STATS = {
  articles: { total: 200, summarized: 150, unsummarized: 50, embedded: 120 },
  topSources: [
    { sourceId: 's1', name: 'Hacker News', count: 80 },
    { sourceId: 's2', name: 'Lobsters', count: 40 },
  ],
  recentDaily: [
    { date: '2026-06-18', count: 0 },
    { date: '2026-06-19', count: 4 },
    { date: '2026-06-20', count: 7 },
    { date: '2026-06-21', count: 2 },
    { date: '2026-06-22', count: 0 },
    { date: '2026-06-23', count: 12 },
    { date: '2026-06-24', count: 8 },
  ],
  conferences: 7,
  videos: 33,
  repos: 50,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CollectionStats', () => {
  it('성공 응답을 받아 소스별/가공 현황을 렌더한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => STATS }),
    );
    const { getByText } = render(<CollectionStats />);

    await waitFor(() => {
      expect(getByText('Hacker News')).toBeTruthy();
    });
    expect(getByText('Lobsters')).toBeTruthy();
    // 가공 현황 메트릭
    expect(getByText('임베딩 완료')).toBeTruthy();
    expect(getByText(/60%/)).toBeTruthy(); // 120/200 = 60%
    // 7일 합계 = 33
    expect(getByText('33건')).toBeTruthy();
  });

  it('응답 실패 시 에러 상태와 재시도 버튼을 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );
    const { getByRole, getByText } = render(<CollectionStats />);

    await waitFor(() => {
      expect(getByRole('alert')).toBeTruthy();
    });
    expect(getByText('다시 시도')).toBeTruthy();
  });

  it('네트워크 예외도 에러 상태로 처리한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const { getByRole } = render(<CollectionStats />);

    await waitFor(() => {
      expect(getByRole('alert')).toBeTruthy();
    });
  });

  it('수집 0건이면 빈 상태 문구를 보여준다', async () => {
    const empty = {
      ...STATS,
      topSources: [],
      recentDaily: STATS.recentDaily.map((d) => ({ ...d, count: 0 })),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => empty }),
    );
    const { getByText } = render(<CollectionStats />);

    await waitFor(() => {
      expect(getByText(/최근 7일간 수집된 글이 없어요/)).toBeTruthy();
    });
    expect(getByText(/아직 수집된 글이 없어요/)).toBeTruthy();
  });
});
