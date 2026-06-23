import { describe, expect, it } from 'vitest';
import { formatViews } from './format-views';

describe('formatViews', () => {
  it('1,000 미만은 그대로 문자열', () => {
    expect(formatViews(0)).toBe('0');
    expect(formatViews(18)).toBe('18');
    expect(formatViews(999)).toBe('999');
  });

  it('1,000 경계 — 소수 1자리 K', () => {
    expect(formatViews(1_000)).toBe('1.0K');
    expect(formatViews(1_234)).toBe('1.2K');
    expect(formatViews(9_999)).toBe('10.0K');
  });

  it('10,000 경계 — 정수 K', () => {
    expect(formatViews(10_000)).toBe('10K');
    expect(formatViews(45_600)).toBe('46K');
    expect(formatViews(123_456)).toBe('123K');
  });

  it('반올림 처리 — toFixed(1) 규칙', () => {
    // 1,250 / 1000 = 1.25 → 부동소수점상 1.25는 미세하게 크므로 toFixed(1) = '1.3'
    expect(formatViews(1_250)).toBe('1.3K');
    // 1,240 / 1000 = 1.24 → '1.2'
    expect(formatViews(1_240)).toBe('1.2K');
    // 1,260 / 1000 = 1.26 → '1.3'
    expect(formatViews(1_260)).toBe('1.3K');
  });
});
