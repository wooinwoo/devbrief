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

// 어드민 UI 가 실제로 프록시를 통해 부르는 1차 세그먼트 화이트리스트.
// (sources-panel / proposed-list / videos-panel / inline-chat 의 adminFetch 경로)
// 새 어드민 기능이 다른 prefix 를 쓰면 여기에 추가한다.
const ALLOWED_PREFIXES = new Set(['sources', 'conferences', 'videos', 'chat']);

// 경로 세그먼트 검증 — '..' 등 dot-only 세그먼트가 URL 정규화로
// /api/v1 프리픽스를 탈출하는 것을 막는다.
const SEGMENT_RE = /^[\w.-]+$/;
function isValidPath(path: string[]): boolean {
  if (path.length === 0 || !ALLOWED_PREFIXES.has(path[0])) return false;
  return path.every((s) => SEGMENT_RE.test(s) && !/^\.+$/.test(s));
}

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
  if (!isValidPath(path)) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }
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
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-cache',
    },
  });
}

// 메서드 제한 — 어드민 UI 가 실제 쓰는 메서드만 노출한다 (그 외는 405).
// 현재 사용: POST(discover/register/approve/reject/add/chat), PATCH(toggle), DELETE(삭제).
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
