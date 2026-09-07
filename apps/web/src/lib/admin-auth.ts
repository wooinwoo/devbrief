// 1인 운영용 단순 비밀번호 인증.
// ADMIN_PASSWORD env 와 비교 → 쿠키에 HMAC 서명 세션 토큰.
// 토큰 = `exp.nonce.sig` (sig = HMAC-SHA256(secret, `exp.nonce`)).
// Web Crypto 만 사용해 proxy(edge) / server action(node) 둘 다 동일 동작.

export const ADMIN_COOKIE = 'pulse_admin';

/** 세션 유효기간 (7일, ms). 서버가 토큰의 exp 로 직접 강제한다. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  return bufToHex(digest);
}

/** Web Crypto HMAC-SHA256 (edge / node 양쪽 동작) */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bufToHex(sig);
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** crypto.getRandomValues 기반 랜덤 hex (edge / node 양쪽 동작) */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 세션 서명 시크릿.
 * - ADMIN_SESSION_SECRET 이 설정돼 있으면 그 값을 우선 사용한다.
 *   이 값만 교체하면 비밀번호 변경 없이 전 세션을 즉시 무효화(회전)할 수 있다.
 * - 미설정 시 sha256('devbrief-session:' + ADMIN_PASSWORD) 파생값을 쓴다.
 *   이 경우 ADMIN_PASSWORD 변경 = 전 세션 무효화. 단 시크릿이 비밀번호에
 *   종속되므로 별도의 랜덤 ADMIN_SESSION_SECRET 설정을 권장한다.
 */
async function getSessionSecret(): Promise<string> {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit) return explicit;
  return sha256Hex(`devbrief-session:${getPassword()}`);
}

/**
 * 로그인 성공 시 발급하는 세션 토큰: `exp.nonce.sig`
 * - exp: 만료 시각(ms epoch) — verifyToken 이 서버측에서 만료를 강제한다.
 * - nonce: 로그인마다 crypto.getRandomValues 랜덤 → 세션마다 고유 토큰.
 * - sig: HMAC-SHA256(secret, `exp.nonce`) → 위조 불가, 비밀번호와 등가가 아님.
 *
 * 서버측 세션 저장소가 없어 개별 토큰 폐기는 불가능하다. 대신
 * (1) 만료를 7일로 짧게 두고, (2) 유출 의심 시 ADMIN_SESSION_SECRET
 * (미설정 시 ADMIN_PASSWORD) 회전으로 전 세션을 일괄 무효화한다.
 */
export async function issueSessionToken(now = Date.now()): Promise<string> {
  const exp = now + SESSION_TTL_MS;
  const nonce = randomHex(16);
  const sig = await hmacSha256Hex(await getSessionSecret(), `${exp}.${nonce}`);
  return `${exp}.${nonce}.${sig}`;
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

/** 세션 토큰 검증: 서명(timing-safe) + 만료. */
export async function verifyToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  // 비번 미설정 시 어떤 토큰도 통과시키지 않는다.
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[admin-auth] ADMIN_PASSWORD 미설정 — 토큰 검증 거부.');
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp)) return false;
  const expected = await hmacSha256Hex(await getSessionSecret(), `${expStr}.${nonce}`);
  // 서명 검증을 항상 끝까지 수행한 뒤 만료를 본다 (분기 순서 고정).
  const sigOk = await timingSafeEqualStr(sig, expected);
  if (!sigOk) return false;
  return exp > now;
}

export async function checkPassword(input: string): Promise<boolean> {
  // 미설정이면 무조건 거부 (빈 비번 로그인 차단).
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('[admin-auth] ADMIN_PASSWORD 미설정 — 로그인 거부.');
    return false;
  }
  return timingSafeEqualStr(input, getPassword());
}
