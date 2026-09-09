import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchConferenceCatalog } from './conference-catalog';

const rows = [{ id: 'event', name: 'Community Day', brandColor: '#123456' }];

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('conference catalog recovery', () => {
  it.each([502, 503, 504, 429])(
    'recovers HTTP %s without losing the full catalog',
    async (status) => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(new Response('temporary failure', { status }))
        .mockResolvedValueOnce(Response.json(rows));
      vi.stubGlobal('fetch', fetcher);
      const result = fetchConferenceCatalog(new AbortController().signal);
      await vi.advanceTimersByTimeAsync(500);
      expect(await result).toEqual([{ ...rows[0], brand: '#123456' }]);
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('retries interrupted network requests but stops after three attempts', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetcher);
    const result = expect(fetchConferenceCatalog(new AbortController().signal)).rejects.toThrow(
      'Failed to fetch',
    );
    await vi.advanceTimersByTimeAsync(2000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each([400, 401, 403, 404])('does not repeat permanent HTTP %s errors', async (status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response('unavailable', { status }));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchConferenceCatalog(new AbortController().signal)).rejects.toThrow(
      'Event collection unavailable',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not silently accept an invalid catalog or retry its contract error', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ error: 'invalid' }));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchConferenceCatalog(new AbortController().signal)).rejects.toThrow(
      'Invalid event collection',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cancels delayed retries when the visitor leaves the tab', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'));
    vi.stubGlobal('fetch', fetcher);
    const controller = new AbortController();
    const result = expect(fetchConferenceCatalog(controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(2000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('never requests an already-aborted catalog', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchConferenceCatalog(AbortSignal.abort())).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
