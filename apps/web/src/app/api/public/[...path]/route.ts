import type { NextRequest } from 'next/server';

// Only existing read endpoints are exposed. Credentials and arbitrary targets never pass through.
const READ_PATH =
  /^(?:articles(?:\/(?:batch|[\w-]+(?:\/related)?))?|conferences|digest\/today|repos|videos(?:\/[\w-]+)?|sources|stats\/collection)$/;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const joined = path.join('/');
  if (!READ_PATH.test(joined) || path.some((segment) => !/^[\w-]+$/.test(segment))) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }
  const base = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
  try {
    const upstream = await fetch(`${base}/${joined}${req.nextUrl.search}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      return Response.json({ error: 'unexpected upstream redirect' }, { status: 502 });
    }
    const headers = new Headers({ 'cache-control': 'no-store' });
    for (const name of ['content-type', 'x-total-count']) {
      const value = upstream.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error(
      'Public API upstream request failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return Response.json({ error: 'upstream unavailable' }, { status: 502 });
  }
}
