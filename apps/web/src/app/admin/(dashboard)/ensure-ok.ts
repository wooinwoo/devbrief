// 어드민 fetch 공통 실패 처리.
// adminFetch(lib/api.ts)는 단순 fetch 래퍼라 401/500 에서도 resolve 하므로,
// 각 핸들러가 res.ok 를 직접 검사해야 한다. 이 헬퍼로 검사와 메시지 추출을 통일한다.
// - 프록시 세션 만료: 401 { error: 'unauthorized' }
// - Nest 에러: { statusCode, message } (ValidationPipe 는 message 가 string[])

export async function ensureOk(res: Response, action = '요청'): Promise<Response> {
  if (res.ok) return res;
  if (res.status === 401) {
    throw new Error('어드민 세션이 만료되었어요. 새로고침 후 다시 로그인해주세요.');
  }
  const j = (await res.json().catch(() => ({}))) as {
    message?: string | string[];
    error?: string;
  };
  const msg = Array.isArray(j.message) ? j.message.join(', ') : j.message;
  throw new Error(msg ?? j.error ?? `${action} 실패 (${res.status})`);
}
