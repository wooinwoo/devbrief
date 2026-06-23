// 1인 운영용 단순 비밀번호 인증.
// ADMIN_PASSWORD env 와 비교 → 쿠키에 세션 토큰.
// 토큰 = sha256(password) hex. proxy(edge) / server action(node) 둘 다 동일 계산.

export const ADMIN_COOKIE = 'pulse_admin';

/**
 * 어드민 비밀번호. 하드코딩 폴백 없음.
 * 미설정 시 빈 문자열을 반환하고, 호출부에서 모든 로그인을 거부한다.
 */
function getPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    // 빌드는 깨지 않되, 런타임에 미설정을 명확히 경고.
    console.warn('[admin-auth] ADMIN_PASSWORD 미설정 — 모든 어드민 로그인이 거부됩니다.');
    return '';
  }
  return pw;
}

/** Web Crypto SHA-256 (edge / node 양쪽 동작) */
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function sessionToken(password = getPassword()): Promise<string> {
  return sha256Hex(`pulse-admin:${password}`);
}

/**
 * 타이밍 안전 문자열 비교 (edge / node 양쪽 동작).
 * crypto.timingSafeEqual 은 Node 전용이라 Edge 에서 못 쓴다.
 * 두 입력을 각각 SHA-256 해시한 뒤 고정 길이(64 hex) 바이트를 XOR 누적 비교한다.
 * 해시로 길이가 동일해지므로 길이 정보가 새지 않고, 비교 시간이 입력에 의존하지 않는다.
 */
async function timingSafeEqualStr(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256Hex(a), sha256Hex(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) {
    diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  // 비번 미설정 시 어떤 토큰도 통과시키지 않는다.
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[admin-auth] ADMIN_PASSWORD 미설정 — 토큰 검증 거부.');
    return false;
  }
  const expected = await sessionToken();
  return timingSafeEqualStr(token, expected);
}

export async function checkPassword(input: string): Promise<boolean> {
  // 미설정이면 무조건 거부 (빈 비번 로그인 차단).
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[admin-auth] ADMIN_PASSWORD 미설정 — 로그인 거부.');
    return false;
  }
  return timingSafeEqualStr(input, getPassword());
}
