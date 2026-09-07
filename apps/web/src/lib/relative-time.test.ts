import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { relativeTime } from './relative-time';

describe('relativeTime', () => {
  const FIXED = new Date('2026-05-30T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('60초 미만 → "방금"', () => {
    expect(relativeTime('2026-05-30T11:59:30Z')).toBe('방금');
  });

  it('5분 전', () => {
    expect(relativeTime('2026-05-30T11:55:00Z')).toBe('5분 전');
  });

  it('3시간 전', () => {
    expect(relativeTime('2026-05-30T09:00:00Z')).toBe('3시간 전');
  });

  it('2일 전', () => {
    expect(relativeTime('2026-05-28T12:00:00Z')).toBe('2일 전');
  });

  it('5일 전', () => {
    expect(relativeTime('2026-05-25T12:00:00Z')).toBe('5일 전');
  });

  it('15일 전 → 2주 전', () => {
    expect(relativeTime('2026-05-15T12:00:00Z')).toBe('2주 전');
  });

  it('60일 전 → locale 날짜 표시 (ko-KR)', () => {
    const result = relativeTime('2026-03-31T12:00:00Z');
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/3월/);
  });

  it('30일 초과 폴백은 KST 날짜 — UTC 저녁 발행(=KST 다음날)이 서버/클라 동일하게 나온다', () => {
    // 2026-03-31 16:00 UTC = KST 4월 1일 01:00 — UTC 기준으로 렌더하면 3월 31일이 되는 함정 케이스
    const result = relativeTime('2026-03-31T16:00:00Z');
    expect(result).toMatch(/4월/);
    expect(result).not.toMatch(/3월/);
  });

  it('now 를 주입하면 시스템 시계와 무관하게 계산 — 고정 기준 시각용', () => {
    const now = new Date('2026-07-01T12:00:00Z').getTime();
    expect(relativeTime('2026-07-01T11:55:00Z', now)).toBe('5분 전');
  });
});
