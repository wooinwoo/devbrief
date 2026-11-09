// Collection runs once a day, so serving a public read up to an hour old is not visible to readers.
export const EDGE_CACHE_TTL_SECONDS = 3600;

interface EdgeCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

/**
 * Keeps public API responses in Cloudflare's data-center cache so repeat visits skip the
 * API Worker and the database. Outside the Workers runtime (browser, Node dev, tests)
 * there is no `caches.default`, and this simply calls `load`.
 */
export async function edgeCached(key: string, load: () => Promise<Response>): Promise<Response> {
  const cache = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
  if (!cache) return load();

  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return hit;

  const response = await load();
  if (response.status === 200) {
    const stored = new Response(response.clone().body, response);
    stored.headers.set('cache-control', `public, max-age=${EDGE_CACHE_TTL_SECONDS}`);
    stored.headers.delete('set-cookie');
    await cache.put(key, stored).catch(() => undefined);
  }
  return response;
}
