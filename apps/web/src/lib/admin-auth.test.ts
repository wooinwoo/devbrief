import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_COOKIE, checkPassword, sessionToken, verifyToken } from './admin-auth';

describe('admin-auth', () => {
  beforeEach(() => {
    // 기본값('pulse') 경로 검증 위해 env 미설정 상태로 (stubEnv(undefined)는 키 제거)
    vi.stubEnv('ADMIN_PASSWORD', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('쿠키 이름은 안정적', () => {
    expect(ADMIN_COOKIE).toBe('pulse_admin');
  });

  it('sessionToken은 sha256 hex (64자, 소문자 hex)', async () => {
    const token = await sessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('같은 입력은 항상 같은 토큰 (해시 결정성)', async () => {
    const a = await sessionToken('secret');
    const b = await sessionToken('secret');
    expect(a).toBe(b);
  });

  it('다른 비밀번호는 다른 토큰', async () => {
    const a = await sessionToken('one');
    const b = await sessionToken('two');
    expect(a).not.toBe(b);
  });

  it('verifyToken — 올바른 토큰만 통과', async () => {
    const valid = await sessionToken(); // 기본 'pulse'
    expect(await verifyToken(valid)).toBe(true);
  });

  it('verifyToken — 잘못된/빈 토큰 거부', async () => {
    expect(await verifyToken('wrong')).toBe(false);
    expect(await verifyToken('')).toBe(false);
    expect(await verifyToken(undefined)).toBe(false);
  });

  it('checkPassword — 평문 비밀번호 비교', async () => {
    expect(await checkPassword('pulse')).toBe(true);
    expect(await checkPassword('nope')).toBe(false);
  });

  it('ADMIN_PASSWORD env가 설정되면 그 값 기준', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'custom-pw');
    expect(await checkPassword('custom-pw')).toBe(true);
    expect(await checkPassword('pulse')).toBe(false);

    // verifyToken도 custom-pw 기반 토큰만 통과
    const token = await sessionToken('custom-pw');
    expect(await verifyToken(token)).toBe(true);
  });
});
