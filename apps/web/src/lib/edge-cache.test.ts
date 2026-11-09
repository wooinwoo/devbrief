import { afterEach, describe, expect, it, vi } from 'vitest';
import { EDGE_CACHE_TTL_SECONDS, edgeCached } from './edge-cache';

function fakeEdgeCache() {
  const store = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (key: string) => store.get(key)?.clone()),
    put: vi.fn(async (key: string, response: Response) => {
      store.set(key, new Response(await response.text(), response));
    }),
  };
  vi.stubGlobal('caches', { default: cache });
  return { cache, store };
}

afterEach(() => vi.unstubAllGlobals());

describe('edgeCached', () => {
  it('calls the loader directly when there is no edge cache', async () => {
    const load = vi.fn().mockResolvedValue(new Response('[]'));
    await edgeCached('https://api.test/articles', load);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('serves the second read from the edge cache with headers intact', async () => {
    const { store } = fakeEdgeCache();
    const load = vi
      .fn()
      .mockResolvedValue(
        new Response('[1]', { headers: { 'x-total-count': '7', 'set-cookie': 'a=b' } }),
      );

    const first = await edgeCached('https://api.test/articles', load);
    expect(await first.text()).toBe('[1]');
    const second = await edgeCached('https://api.test/articles', load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(await second.text()).toBe('[1]');
    expect(second.headers.get('x-total-count')).toBe('7');
    const stored = store.get('https://api.test/articles');
    expect(stored?.headers.get('cache-control')).toBe(`public, max-age=${EDGE_CACHE_TTL_SECONDS}`);
    expect(stored?.headers.get('set-cookie')).toBeNull();
  });

  it('does not keep failed reads', async () => {
    const { cache } = fakeEdgeCache();
    const load = vi.fn().mockResolvedValue(new Response('down', { status: 502 }));
    await edgeCached('https://api.test/articles', load);
    await edgeCached('https://api.test/articles', load);
    expect(cache.put).not.toHaveBeenCalled();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
