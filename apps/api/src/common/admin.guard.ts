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
    const provided = Array.isArray(header) ? header[0] : header;

    if (!provided || !timingSafeEqualStr(provided, expected)) {
      throw new UnauthorizedException('Invalid admin token');
    }
    return true;
  }
}

/** 타이밍 안전 문자열 비교 (길이 정보 노출 최소화). */
function timingSafeEqualStr(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
