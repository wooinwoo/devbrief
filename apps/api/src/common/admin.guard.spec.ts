import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

function ctx(headers: Record<string, string | string[]>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();
  const original = process.env.ADMIN_API_TOKEN;

  afterEach(() => {
    process.env.ADMIN_API_TOKEN = original ?? '';
  });

  it('ADMIN_API_TOKEN 미설정 시 거부 (안전 기본값)', () => {
    process.env.ADMIN_API_TOKEN = '';
    expect(() => guard.canActivate(ctx({ 'x-admin-token': 'anything' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('토큰 일치 시 통과', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    expect(guard.canActivate(ctx({ 'x-admin-token': 'secret-token' }))).toBe(true);
  });

  it('토큰 불일치 시 거부', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    expect(() => guard.canActivate(ctx({ 'x-admin-token': 'wrong' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('헤더 누락 시 거부', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    expect(() => guard.canActivate(ctx({}))).toThrow(UnauthorizedException);
  });

  it('배열 헤더는 첫 값 사용', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    expect(guard.canActivate(ctx({ 'x-admin-token': ['secret-token', 'x'] }))).toBe(true);
  });
});
