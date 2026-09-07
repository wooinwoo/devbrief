import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  checkPassword,
  issueSessionToken,
  verifyToken,
} from './admin-auth';

describe('admin-auth', () => {
  beforeEach(() => {
    // 기본은 비밀번호 설정 상태로 검증 (미설정 거부는 별도 describe).
    vi.stubEnv('ADMIN_PASSWORD', 'pulse');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('쿠키 이름은 안정적', () => {
    expect(ADMIN_COOKIE).toBe('pulse_admin');
  });

  it('토큰 형식은 exp.nonce.sig (sig 는 64자 hex HMAC)', async () => {
    const now = Date.now();
    const token = await issueSessionToken(now);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(Number(parts[0])).toBe(now + SESSION_TTL_MS);
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // 16바이트 랜덤 nonce
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/); // HMAC-SHA256 hex
  });

  it('로그인마다 고유 토큰 발급 (랜덤 nonce)', async () => {
    const a = await issueSessionToken();
    const b = await issueSessionToken();
    expect(a).not.toBe(b);
  });

  it('verifyToken — 발급한 토큰만 통과', async () => {
    const valid = await issueSessionToken();
    expect(await verifyToken(valid)).toBe(true);
  });

  it('verifyToken — 잘못된/빈 토큰 거부', async () => {
    expect(await verifyToken('wrong')).toBe(false);
    expect(await verifyToken('')).toBe(false);
    expect(await verifyToken(undefined)).toBe(false);
    // 형식만 맞는 위조 토큰도 거부
    expect(await verifyToken(`${Date.now() + 1000}.deadbeef.${'0'.repeat(64)}`)).toBe(false);
  });

  it('verifyToken — 서명 훼손 시 거부', async () => {
    const valid = await issueSessionToken();
    const [exp, nonce, sig] = valid.split('.');
    const flipped = sig.endsWith('0') ? `${sig.slice(0, -1)}1` : `${sig.slice(0, -1)}0`;
    expect(await verifyToken(`${exp}.${nonce}.${flipped}`)).toBe(false);
  });

  it('verifyToken — exp 변조 시 거부 (서명 불일치)', async () => {
    const valid = await issueSessionToken();
    const [, nonce, sig] = valid.split('.');
    const farFuture = Date.now() + 1000 * SESSION_TTL_MS;
    expect(await verifyToken(`${farFuture}.${nonce}.${sig}`)).toBe(false);
  });

  it('verifyToken — 만료된 토큰 거부 (서버측 만료 강제)', async () => {
    const now = Date.now();
    const token = await issueSessionToken(now);
    // TTL 이내는 통과
    expect(await verifyToken(token, now + SESSION_TTL_MS - 1)).toBe(true);
    // TTL 경과 후 거부
    expect(await verifyToken(token, now + SESSION_TTL_MS + 1)).toBe(false);
  });

  it('ADMIN_SESSION_SECRET 회전 시 기존 토큰 전부 무효화', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'secret-v1');
    const token = await issueSessionToken();
    expect(await verifyToken(token)).toBe(true);

    vi.stubEnv('ADMIN_SESSION_SECRET', 'secret-v2');
    expect(await verifyToken(token)).toBe(false);
  });

  it('ADMIN_SESSION_SECRET 미설정 시 비밀번호 파생 시크릿 — 비밀번호 변경 = 전 세션 무효화', async () => {
    const token = await issueSessionToken(); // 'pulse' 파생 시크릿
    expect(await verifyToken(token)).toBe(true);

    vi.stubEnv('ADMIN_PASSWORD', 'changed-pw');
    expect(await verifyToken(token)).toBe(false);
  });

  it('checkPassword — 평문 비밀번호 비교', async () => {
    expect(await checkPassword('pulse')).toBe(true);
    expect(await checkPassword('nope')).toBe(false);
  });

  it('ADMIN_PASSWORD env가 설정되면 그 값 기준', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'custom-pw');
    expect(await checkPassword('custom-pw')).toBe(true);
    expect(await checkPassword('pulse')).toBe(false);
  });

  describe('ADMIN_PASSWORD 미설정 — 폴백 없이 모두 거부', () => {
    beforeEach(() => {
      vi.stubEnv('ADMIN_PASSWORD', undefined);
    });

    it('checkPassword 는 어떤 입력도 거부 (빈 비번 포함)', async () => {
      expect(await checkPassword('pulse')).toBe(false);
      expect(await checkPassword('')).toBe(false);
      expect(await checkPassword('anything')).toBe(false);
    });

    it('verifyToken 은 어떤 토큰도 거부', async () => {
      vi.stubEnv('ADMIN_PASSWORD', 'pulse');
      const token = await issueSessionToken();
      vi.stubEnv('ADMIN_PASSWORD', undefined);
      expect(await verifyToken(token)).toBe(false);
    });
  });
});
