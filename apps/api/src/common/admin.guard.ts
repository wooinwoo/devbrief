import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/**
 * 어드민 쓰기(상태 변경) 엔드포인트 보호용 가드.
 * 공유 시크릿 헤더 `x-admin-token` 을 `process.env.ADMIN_API_TOKEN` 과 비교한다.
 *
 * 안전 기본값: ADMIN_API_TOKEN 미설정 시 모든 요청을 거부한다(오픈 X).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.ADMIN_API_TOKEN;
    if (!expected) {
      this.logger.warn('ADMIN_API_TOKEN 미설정 — 어드민 쓰기 엔드포인트를 모두 거부합니다.');
      throw new UnauthorizedException('Admin API token not configured');
    }

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-admin-token'];

    // 헤더가 여러 개(배열)면 공격 신호로 보고 거부 — 단일 문자열만 허용.
    if (Array.isArray(header)) {
      this.logger.warn('x-admin-token 헤더가 여러 개 — 거부합니다.');
      throw new UnauthorizedException('Invalid admin token');
    }

    if (!header || !timingSafeEqualStr(header, expected)) {
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
