// API 베이스 URL — 배포 시 NEXT_PUBLIC_API_BASE 로 교체. 로컬 기본값 fallback.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

// 어드민 쓰기 API 공유 시크릿 — 백엔드 AdminGuard 의 x-admin-token 과 일치해야 한다.
// 어드민 대시보드(/admin)는 이미 비밀번호 프록시 뒤에 있으므로 클라이언트 노출을 허용한다.
const ADMIN_API_TOKEN = process.env.NEXT_PUBLIC_ADMIN_API_TOKEN ?? '';

/**
 * 어드민 쓰기 엔드포인트 호출용 fetch 래퍼.
 * x-admin-token 헤더를 자동으로 주입한다.
 */
export function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (ADMIN_API_TOKEN) headers.set('x-admin-token', ADMIN_API_TOKEN);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
