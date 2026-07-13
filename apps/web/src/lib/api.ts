// API 베이스 URL — 배포 시 NEXT_PUBLIC_API_BASE 로 교체. 로컬 기본값 fallback.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1';

/**
 * 어드민 쓰기 엔드포인트 호출용 fetch 래퍼.
 * same-origin 서버 프록시(/api/admin/*)를 경유한다. 프록시가 어드민 세션을
 * 검증하고 서버 전용 토큰으로 x-admin-token 을 붙이므로, 어드민 토큰이
 * 클라이언트 번들에 노출되지 않는다. (경로 앞의 '/' 는 그대로 유지)
 */
export function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`/api/admin${path}`, init);
}
