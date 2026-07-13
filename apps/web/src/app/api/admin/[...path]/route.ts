// 어드민 쓰기 API 서버 프록시.
// 클라이언트는 이 same-origin 라우트를 호출하고, 여기서 어드민 세션 쿠키를
// 검증한 뒤 서버 전용 ADMIN_API_TOKEN 으로 x-admin-token 을 붙여 백엔드에 전달한다.
// → 어드민 토큰이 클라이언트 번들에 절대 노출되지 않는다.
import { ADMIN_COOKIE, verifyToken } from '@/lib/admin-auth';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';
// 서버 전용(NEXT_PUBLIC 아님) — 백엔드 AdminGuard 의 값과 일치해야 한다.
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN ?? '';

async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifyToken(store.get(ADMIN_COOKIE)?.value);
}

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { path } = await ctx.params;
  const target = `${API_BASE}/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (ADMIN_API_TOKEN) headers.set('x-admin-token', ADMIN_API_TOKEN);

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);

  // SSE(챗 스트림) 포함 — 업스트림 body 를 그대로 통과시킨다.
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-cache',
    },
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
