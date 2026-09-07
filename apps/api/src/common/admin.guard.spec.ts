import { type ExecutionContext, HttpException, UnauthorizedException } from '@nestjs/common';
import { AdminGuard, resetAdminGuardRateLimit } from './admin.guard';

function ctx(headers: Record<string, string | string[]>, ip = '203.0.113.1'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers, ip, socket: { remoteAddress: ip } }),
    }),
  } as unknown as ExecutionContext;
}

describe('AdminGuard', () => {
  const guard = new AdminGuard();
  const original = process.env.ADMIN_API_TOKEN;

  afterEach(() => {
    process.env.ADMIN_API_TOKEN = original ?? '';
    resetAdminGuardRateLimit();
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

  it('헤더가 여러 개(배열)면 공격 신호로 보고 거부', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    // 첫 값이 정답이어도 배열 자체를 거부한다.
    expect(() => guard.canActivate(ctx({ 'x-admin-token': ['secret-token', 'x'] }))).toThrow(
      UnauthorizedException,
    );
  });

  it('길이 다른 토큰도 timingSafeEqual 단축 없이 거부', () => {
    process.env.ADMIN_API_TOKEN = 'secret-token';
    expect(() => guard.canActivate(ctx({ 'x-admin-token': 'short' }))).toThrow(
      UnauthorizedException,
    );
    // 토큰보다 긴 입력도 거부
    expect(() => guard.canActivate(ctx({ 'x-admin-token': `${'secret-token'}-extra` }))).toThrow(
      UnauthorizedException,
    );
  });

  describe('무차별 대입 방어 (IP 당 분당 실패 제한)', () => {
    const attempt = (token: string, ip: string) => () =>
      guard.canActivate(ctx({ 'x-admin-token': token }, ip));

    it('같은 IP 에서 실패가 임계를 넘으면 정답 토큰이라도 429', () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      for (let i = 0; i < 10; i++) {
        expect(attempt('wrong', '198.51.100.9')).toThrow(UnauthorizedException);
      }
      // 임계 초과 후에는 정답도 잠시 차단 (429)
      let caught: unknown;
      try {
        attempt('secret-token', '198.51.100.9')();
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(HttpException);
      expect((caught as HttpException).getStatus()).toBe(429);
    });

    it('다른 IP 는 영향받지 않는다', () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      for (let i = 0; i < 10; i++) {
        expect(attempt('wrong', '198.51.100.9')).toThrow(UnauthorizedException);
      }
      expect(guard.canActivate(ctx({ 'x-admin-token': 'secret-token' }, '203.0.113.7'))).toBe(true);
    });

    it('성공 요청은 실패 카운트에 쌓이지 않는다', () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      for (let i = 0; i < 30; i++) {
        expect(guard.canActivate(ctx({ 'x-admin-token': 'secret-token' }, '203.0.113.8'))).toBe(
          true,
        );
      }
      // 성공만 반복해도 429 가 나지 않는다
      expect(guard.canActivate(ctx({ 'x-admin-token': 'secret-token' }, '203.0.113.8'))).toBe(true);
    });

    it('윈도우(60초)가 지나면 실패 기록이 소멸한다', () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      const nowSpy = jest.spyOn(Date, 'now');
      const base = 1_800_000_000_000;
      nowSpy.mockReturnValue(base);
      for (let i = 0; i < 10; i++) {
        expect(attempt('wrong', '198.51.100.10')).toThrow(UnauthorizedException);
      }
      // 61초 뒤 — 윈도우 밖이라 다시 시도 가능
      nowSpy.mockReturnValue(base + 61_000);
      expect(guard.canActivate(ctx({ 'x-admin-token': 'secret-token' }, '198.51.100.10'))).toBe(
        true,
      );
      nowSpy.mockRestore();
    });

    it('x-forwarded-for 첫 값을 IP 로 사용한다 (프록시 뒤)', () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      const withXff = (token: string) =>
        guard.canActivate(
          ctx(
            {
              'x-admin-token': token,
              'x-forwarded-for': '192.0.2.1, 10.0.0.1',
            },
            '10.0.0.1',
          ),
        );
      for (let i = 0; i < 10; i++) {
        expect(() => withXff('wrong')).toThrow(UnauthorizedException);
      }
      expect(() => withXff('secret-token')).toThrow(HttpException);
      // XFF 가 다른(=다른 클라이언트) 요청은 통과
      expect(
        guard.canActivate(
          ctx({ 'x-admin-token': 'secret-token', 'x-forwarded-for': '192.0.2.2' }, '10.0.0.1'),
        ),
      ).toBe(true);
    });
  });
});
