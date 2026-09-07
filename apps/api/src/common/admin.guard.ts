import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/** 실패 카운트 윈도우 (슬라이딩) */
const FAIL_WINDOW_MS = 60_000;
/** 윈도우 내 허용 실패 횟수 — 초과 시 429 */
const MAX_FAILURES_PER_WINDOW = 10;
/** 실패 기록 맵 상한 — 초과 시 전체 prune (메모리 바운딩) */
const MAX_TRACKED_IPS = 1000;

// 가드 인스턴스는 @UseGuards 위치마다 생기므로, 무차별 대입 카운터는
// 모듈 스코프로 공유한다 (프로세스 단위 인메모리 — 외부 의존성 없음).
const failuresByIp = new Map<string, number[]>();

/** 테스트/운영 리셋용 — 실패 기록 전체 초기화 */
export function resetAdminGuardRateLimit(): void {
  failuresByIp.clear();
}

function clientIp(req: Request): string {
  // Railway 프록시 뒤라 XFF 첫 값을 우선, 없으면 소켓 주소.
  const xff = req.headers['x-forwarded-for'];
  const first = (Array.isArray(xff) ? xff[0] : xff)?.split(',')[0]?.trim();
  return first || req.ip || req.socket?.remoteAddress || 'unknown';
}

function recentFailures(ip: string, now: number): number[] {
  const list = (failuresByIp.get(ip) ?? []).filter((t) => now - t < FAIL_WINDOW_MS);
  if (list.length === 0) {
    failuresByIp.delete(ip);
  } else {
    failuresByIp.set(ip, list);
  }
  return list;
}

function recordFailure(ip: string, now: number): void {
  // 맵 폭주 방어 — 대량 분산 IP 로 실패를 뿌려도 메모리가 바운딩되게.
  if (failuresByIp.size >= MAX_TRACKED_IPS && !failuresByIp.has(ip)) {
    for (const [key, list] of failuresByIp) {
      if (list.every((t) => now - t >= FAIL_WINDOW_MS)) failuresByIp.delete(key);
    }
    if (failuresByIp.size >= MAX_TRACKED_IPS) return; // 그래도 꽉 차면 신규 추적 포기(거부는 그대로 동작)
  }
  const list = recentFailures(ip, now);
  list.push(now);
  failuresByIp.set(ip, list);
}

/**
 * 어드민 쓰기(상태 변경) 엔드포인트 보호용 가드.
 * 공유 시크릿 헤더 `x-admin-token` 을 `process.env.ADMIN_API_TOKEN` 과 비교한다.
 *
 * 안전 기본값: ADMIN_API_TOKEN 미설정 시 모든 요청을 거부한다(오픈 X).
 * 무차별 대입 방어: IP 당 분당 실패 N 회 초과 시 429 (인메모리 슬라이딩 윈도우 —
 * 정상 트래픽은 실패를 내지 않으므로 Vercel SSR 이 같은 IP 로 뭉쳐도 영향 없다).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_TOKEN;
    if (!expected) {
      this.logger.warn('ADMIN_API_TOKEN 미설정 — 어드민 쓰기 엔드포인트를 모두 거부합니다.');
      // 서버 설정 문제라 클라이언트 실패 카운트에는 반영하지 않는다.
      throw new UnauthorizedException('Admin API token not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const ip = clientIp(req);

    if (recentFailures(ip, now).length >= MAX_FAILURES_PER_WINDOW) {
      this.logger.warn(`어드민 토큰 실패 과다 (ip=${ip}) — 429 로 차단합니다.`);
      throw new HttpException(
        '관리자 인증 실패가 잦습니다. 잠시 후 다시 시도하세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const header = req.headers['x-admin-token'];

    // 헤더가 여러 개(배열)면 공격 신호로 보고 거부 — 단일 문자열만 허용.
    if (Array.isArray(header)) {
      this.logger.warn('x-admin-token 헤더가 여러 개 — 거부합니다.');
      recordFailure(ip, now);
      throw new UnauthorizedException('Invalid admin token');
    }

    if (!header || !timingSafeEqualStr(header, expected)) {
      recordFailure(ip, now);
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}

/**
 * 타이밍 안전 문자열 비교. NestJS는 Node 전용이므로 `crypto.timingSafeEqual` 사용.
 * 길이가 다르면 길이 기반 단축(early-return)을 피하려 더미 비교를 한 번 수행한 뒤 false.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // 길이 정보 노출/단축 회피 — 같은 버퍼끼리 더미 비교 후 항상 false.
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ab, bb);
}
