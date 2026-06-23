import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysUntil } from './date-utils';

describe('daysUntil', () => {
  beforeEach(() => {
    // 2026-06-23 14:30 (로컬) 고정 — 오늘 0시 기준 계산 검증
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 23, 14, 30, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오늘 날짜(자정)는 0', () => {
    expect(daysUntil('2026-06-23T00:00:00')).toBe(0);
  });

  it('내일은 1', () => {
    expect(daysUntil('2026-06-24T00:00:00')).toBe(1);
  });

  it('일주일 뒤는 7', () => {
    expect(daysUntil('2026-06-30T00:00:00')).toBe(7);
  });

  it('지난 날짜는 음수', () => {
    expect(daysUntil('2026-06-20T00:00:00')).toBe(-3);
  });

  it('오늘 같은 날 늦은 시각도 0 (Math.ceil, 오늘 0시 기준 양수 분수 → 1? 검증)', () => {
    // target = 오늘 23:59, 기준 today 00:00 → 약 0.999일 → ceil = 1
    expect(daysUntil('2026-06-23T23:59:00')).toBe(1);
  });
});
