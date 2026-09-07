import type { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// next/headers 의 cookies 를 모킹 — 세션 쿠키 값을 테스트에서 주입한다.
let cookieValue: string | undefined;
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (cookieValue === undefined ? undefined : { name, value: cookieValue }),
  }),
}));

import { issueSessionToken } from '@/lib/admin-auth';

/** env 스텁을 모듈 로드 상수(API_BASE 등)에 반영하기 위한 동적 로더 */
async function loadRoute() {
  vi.resetModules();
  return await import('./route');
}

function makeReq(method: string, search = '', contentType?: string): NextRequest {
  return {
    method,
    nextUrl: { search },
    headers: new Headers(contentType ? { 'content-type': contentType } : {}),
    text: async () => '{}',
  } as unknown as NextRequest;
}

function makeCtx(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function stubUpstream() {
  const fetchMock = vi.fn().mockResolvedValue({
    body: null,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('admin proxy route', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_PASSWORD', 'pw');
    cookieValue = undefined;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('세션 쿠키가 없으면 401, 백엔드 호출 없음', async () => {
    const fetchMock = stubUpstream();
    const { POST } = await loadRoute();
    const res = await POST(makeReq('POST'), makeCtx(['sources', 'discover']));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('유효 세션 + 허용 경로면 백엔드로 포워딩 (쿼리 유지, x-admin-token 부착)', async () => {
    vi.stubEnv('ADMIN_API_TOKEN', 'srv-token');
    const fetchMock = stubUpstream();
    cookieValue = await issueSessionToken();
    const { PATCH } = await loadRoute();

    const res = await PATCH(makeReq('PATCH', '?a=1'), makeCtx(['sources', 's1', 'toggle']));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0];
    expect(target).toBe('http://localhost:4000/api/v1/sources/s1/toggle?a=1');
    expect((init.headers as Headers).get('x-admin-token')).toBe('srv-token');
  });

  it("'..' 세그먼트는 404 — /api/v1 프리픽스 탈출 차단", async () => {
    const fetchMock = stubUpstream();
    cookieValue = await issueSessionToken();
    const { POST } = await loadRoute();

    const res = await POST(makeReq('POST'), makeCtx(['sources', '..', 'health']));

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('화이트리스트 밖 prefix 는 404 (ingestion 등 UI 미사용 경로)', async () => {
    const fetchMock = stubUpstream();
    cookieValue = await issueSessionToken();
    const { POST } = await loadRoute();

    for (const path of [['ingestion', 'run-sync'], ['digest'], []]) {
      const res = await POST(makeReq('POST'), makeCtx(path));
      expect(res.status).toBe(404);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('허용 외 문자가 든 세그먼트는 404', async () => {
    const fetchMock = stubUpstream();
    cookieValue = await issueSessionToken();
    const { POST } = await loadRoute();

    const res = await POST(makeReq('POST'), makeCtx(['sources', 'a b?c']));

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('UI 가 쓰는 메서드(POST/PATCH/DELETE)만 노출한다', async () => {
    const mod = (await loadRoute()) as Record<string, unknown>;
    expect(mod.POST).toBeTypeOf('function');
    expect(mod.PATCH).toBeTypeOf('function');
    expect(mod.DELETE).toBeTypeOf('function');
    expect(mod.GET).toBeUndefined();
    expect(mod.PUT).toBeUndefined();
  });

  it('chat 스트림 경로는 허용된다', async () => {
    const fetchMock = stubUpstream();
    cookieValue = await issueSessionToken();
    const { POST } = await loadRoute();

    const res = await POST(makeReq('POST', '', 'application/json'), makeCtx(['chat', 'stream']));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
