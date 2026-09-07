import { beforeEach, describe, expect, it } from 'vitest';
import { isLoginBlocked, recordLoginFailure, resetLoginAttempts } from './rate-limit';

describe('login rate-limit', () => {
  const T0 = 1_000_000;

  beforeEach(() => {
    resetLoginAttempts();
  });

  it('실패 5회 미만이면 차단하지 않는다', () => {
    for (let i = 0; i < 4; i++) recordLoginFailure('1.2.3.4', T0);
    expect(isLoginBlocked('1.2.3.4', T0)).toBe(false);
  });

  it('같은 IP 가 1분 내 5회 실패하면 차단한다', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('1.2.3.4', T0);
    expect(isLoginBlocked('1.2.3.4', T0)).toBe(true);
    // 다른 IP 는 전역 상한 전까지 영향 없음
    expect(isLoginBlocked('5.6.7.8', T0)).toBe(false);
  });

  it('윈도우(1분)가 지나면 차단이 풀린다', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('1.2.3.4', T0);
    expect(isLoginBlocked('1.2.3.4', T0 + 59_999)).toBe(true);
    expect(isLoginBlocked('1.2.3.4', T0 + 60_001)).toBe(false);
  });

  it('IP 를 바꿔가며 시도해도 전역 상한(20회/분)에 걸린다', () => {
    for (let i = 0; i < 20; i++) recordLoginFailure(`10.0.0.${i}`, T0);
    // 한 번도 실패한 적 없는 IP 도 전역 상한으로 차단
    expect(isLoginBlocked('99.99.99.99', T0)).toBe(true);
    expect(isLoginBlocked('99.99.99.99', T0 + 60_001)).toBe(false);
  });

  it('윈도우가 지난 뒤의 실패는 카운터를 새로 시작한다', () => {
    for (let i = 0; i < 5; i++) recordLoginFailure('1.2.3.4', T0);
    const later = T0 + 120_000;
    recordLoginFailure('1.2.3.4', later);
    expect(isLoginBlocked('1.2.3.4', later)).toBe(false);
  });
});
