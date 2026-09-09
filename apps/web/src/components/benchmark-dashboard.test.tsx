import { BENCHMARK_SNAPSHOT } from '@/lib/benchmark-data';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BenchmarkDashboard } from './benchmark-dashboard';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(Date.parse(BENCHMARK_SNAPSHOT.checkedAt) + 60_000));
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('BenchmarkDashboard', () => {
  it('keeps dated fallback data when the feed is unavailable', async () => {
    render(<BenchmarkDashboard />);
    expect(screen.getByText('Intelligence Index v4.3', { exact: false })).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('list', { name: '종합 지능 순위' }).children.length).toBe(10);
    expect(screen.queryByText(/추정치/)).toBeNull();
  });
  it('searches, sorts, expands and handles no matches', async () => {
    render(<BenchmarkDashboard />);
    fireEvent.click(screen.getByRole('button', { name: '10개 더 보기' }));
    expect(screen.getByRole('list', { name: '종합 지능 순위' }).children.length).toBe(20);
    fireEvent.change(screen.getByRole('searchbox', { name: '벤치마크 모델 검색' }), {
      target: { value: 'Google' },
    });
    expect(screen.getAllByText(/Gemini/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '작업당 비용' }));
    expect(screen.getByText('< $0.01')).toBeTruthy();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    const prices = rows.map((row) =>
      Number(
        within(row)
          .getAllByRole('cell')[0]
          .textContent?.replace(/[^0-9.]/g, ''),
      ),
    );
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    fireEvent.change(screen.getByRole('searchbox', { name: '벤치마크 모델 검색' }), {
      target: { value: 'no-such-model' },
    });
    expect(screen.getByRole('status').textContent).toContain('검색 결과가 없어요');
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
  it('accepts a newer valid snapshot and displays its actual collection date', async () => {
    const checkedAt = new Date(Date.parse(BENCHMARK_SNAPSHOT.checkedAt) + 1000).toISOString();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ...BENCHMARK_SNAPSHOT,
          checkedAt,
          models: BENCHMARK_SNAPSHOT.models.map((model, index) =>
            index === 0 ? { ...model, name: 'New measured model', intelligence: 99 } : model,
          ),
        }),
      ),
    );
    render(<BenchmarkDashboard />);
    await screen.findByText('New measured model');
    expect(document.querySelector('time')?.dateTime).toBe(checkedAt);
  });
  it.each(['invalid', 'older'])('retains fallback on an %s feed', async (kind) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify(
          kind === 'invalid' ? {} : { ...BENCHMARK_SNAPSHOT, checkedAt: '2026-01-01T00:00:00Z' },
        ),
      ),
    );
    render(<BenchmarkDashboard />);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(document.querySelector('time')?.dateTime).toBe(BENCHMARK_SNAPSHOT.checkedAt);
  });
  it('warns when the last successful check is more than three days old', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.parse(BENCHMARK_SNAPSHOT.checkedAt) + 4 * 86_400_000));
    render(<BenchmarkDashboard />);
    expect(screen.getByRole('status').textContent).toContain('갱신이 지연');
    expect(document.querySelector('time')?.dateTime).toBe(BENCHMARK_SNAPSHOT.checkedAt);
    await Promise.resolve();
  });
  it('aborts the feed request when unmounted', () => {
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<BenchmarkDashboard />);
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
