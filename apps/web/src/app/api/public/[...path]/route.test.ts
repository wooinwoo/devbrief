import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

function request(path: string[], query = '') {
  return GET(
    new NextRequest(`https://devbrief.test/api/public/${path.join('/')}${query}`, {
      headers: {
        cookie: 'pulse_admin=private',
        'x-admin-token': 'private',
        authorization: 'private',
      },
    }),
    { params: Promise.resolve({ path }) },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('public read proxy', () => {
  it('preserves pagination and total count without forwarding credentials', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE', 'https://api.test/api/v1');
    const fetcher = vi.fn().mockResolvedValue(
      new Response('[]', {
        headers: {
          'content-type': 'application/json',
          'x-total-count': '7053',
          'set-cookie': 'private',
        },
      }),
    );
    vi.stubGlobal('fetch', fetcher);
    const response = await request(['articles'], '?limit=100&offset=100');
    expect(fetcher.mock.calls[0][0]).toBe('https://api.test/api/v1/articles?limit=100&offset=100');
    expect(fetcher.mock.calls[0][1].headers).toEqual({ accept: 'application/json' });
    expect(fetcher.mock.calls[0][1].redirect).toBe('manual');
    expect(response.headers.get('x-total-count')).toBe('7053');
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toEqual([]);
  });

  it.each([
    ['admin'],
    ['chat'],
    ['sources', 'discover'],
    ['articles', '..'],
    ['articles', 'a/b'],
    ['https:', 'evil.test'],
  ])('rejects unsafe or nonpublic path %j', async (...path) => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    expect((await request(path)).status).toBe(404);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not follow or forward upstream redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 302, headers: { location: 'https://other.test' } }),
        ),
    );
    const response = await request(['articles']);
    expect(response.status).toBe(502);
    expect(response.headers.get('location')).toBeNull();
  });

  it('preserves upstream error status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })));
    expect((await request(['articles', 'missing'])).status).toBe(404);
  });

  it('handles upstream failures without returning internal errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private infrastructure detail')));
    const response = await request(['articles']);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'upstream unavailable' });
  });
});
