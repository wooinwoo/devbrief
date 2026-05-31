// 1인 운영용 단순 비밀번호 인증.
// ADMIN_PASSWORD env (없으면 'pulse') 와 비교 → 쿠키에 세션 토큰.
// 토큰 = sha256(password) hex. middleware / server action 둘 다 동일 계산.

export const ADMIN_COOKIE = 'pulse_admin';

function getPassword(): string {
  return process.env.ADMIN_PASSWORD ?? 'pulse';
}

/** Web Crypto SHA-256 (edge / node 양쪽 동작) */
export async function sessionToken(password = getPassword()): Promise<string> {
  const data = new TextEncoder().encode(`pulse-admin:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await sessionToken();
  // 타이밍 안전 비교까진 1인 운영에 과함 — 단순 비교
  return token === expected;
}

export async function checkPassword(input: string): Promise<boolean> {
  return input === getPassword();
}
