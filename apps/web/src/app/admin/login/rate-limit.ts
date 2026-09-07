// 로그인 시도 제한 (in-memory).
// 서버리스에서는 인스턴스별 메모리라 완전한 상한이 아니다(인스턴스 수만큼 늘어남).
// 그래도 단일 인스턴스 기준 무제한 온라인 사전공격을 저지하는 1차 방어선이며,
// 완전한 차단이 필요하면 Vercel WAF rate limit 룰(/admin/login)을 병행한다.

/** 윈도우 크기 (1분) */
const WINDOW_MS = 60_000;
/** IP 당 분당 실패 허용 횟수 */
const MAX_PER_IP = 5;
/** 전역(모든 IP 합산) 분당 실패 허용 횟수 — 분산 IP 공격 완화 */
const MAX_GLOBAL = 20;
/** 맵 무한 성장 방지용 상한 — 초과 시 만료 엔트리를 정리한다 */
const MAX_TRACKED_IPS = 1000;

interface Bucket {
  count: number;
  resetAt: number;
}

const ipBuckets = new Map<string, Bucket>();
let globalBucket: Bucket = { count: 0, resetAt: 0 };

function liveCount(bucket: Bucket | undefined, now: number): number {
  if (!bucket || bucket.resetAt <= now) return 0;
  return bucket.count;
}

/** 현재 이 IP(또는 전역)가 차단 상태인지. 차단이면 비밀번호 검증 자체를 건너뛴다. */
export function isLoginBlocked(ip: string, now = Date.now()): boolean {
  return (
    liveCount(ipBuckets.get(ip), now) >= MAX_PER_IP || liveCount(globalBucket, now) >= MAX_GLOBAL
  );
}

/** 로그인 실패를 기록한다 (성공 시에는 호출하지 않는다). */
export function recordLoginFailure(ip: string, now = Date.now()): void {
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    bucket.count += 1;
  }

  if (globalBucket.resetAt <= now) {
    globalBucket = { count: 1, resetAt: now + WINDOW_MS };
  } else {
    globalBucket.count += 1;
  }

  // 오래된 엔트리 정리 — 공격자가 IP 를 바꿔가며 맵을 부풀리는 것을 막는다.
  if (ipBuckets.size > MAX_TRACKED_IPS) {
    for (const [key, b] of ipBuckets) {
      if (b.resetAt <= now) ipBuckets.delete(key);
    }
  }
}

/** 테스트 전용: 카운터 초기화. */
export function resetLoginAttempts(): void {
  ipBuckets.clear();
  globalBucket = { count: 0, resetAt: 0 };
}
