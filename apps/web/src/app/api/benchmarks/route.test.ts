import { BENCHMARK_FEED_URL, BENCHMARK_SNAPSHOT } from '@/lib/benchmark-data';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(Date.parse(BENCHMARK_SNAPSHOT.checkedAt) + 60_000));
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('same-origin benchmark feed', () => {
  it('serves the newer validated feed with a bounded public cache', async () => {
    const updated = {
      ...BENCHMARK_SNAPSHOT,
      checkedAt: new Date(Date.parse(BENCHMARK_SNAPSHOT.checkedAt) + 1000).toISOString(),
    };
    vi.mocked(fetch).mockResolvedValue(Response.json(updated));
    const response = await GET();
    expect(await response.json()).toEqual(updated);
    expect(response.headers.get('cache-control')).toContain('max-age=300');
    expect(fetch).toHaveBeenCalledWith(
      BENCHMARK_FEED_URL,
      expect.objectContaining({
        redirect: 'manual',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it.each(['http', 'redirect', 'network', 'invalid', 'oversize', 'older'])(
    'keeps the original snapshot and date on %s failure',
    async (kind) => {
      if (kind === 'network') vi.mocked(fetch).mockRejectedValue(new Error('timeout'));
      else
        vi.mocked(fetch).mockResolvedValue(
          kind === 'redirect'
            ? new Response(null, { status: 302, headers: { location: 'https://example.com' } })
            : kind === 'http'
              ? new Response('no', { status: 503 })
              : kind === 'invalid'
                ? Response.json({ models: [] })
                : kind === 'oversize'
                  ? new Response(' '.repeat(512_001))
                  : Response.json({ ...BENCHMARK_SNAPSHOT, checkedAt: '2026-01-01T00:00:00Z' }),
        );
      const response = await GET();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(BENCHMARK_SNAPSHOT);
      expect(response.headers.get('cache-control')).toContain('max-age=30');
    },
  );
});
