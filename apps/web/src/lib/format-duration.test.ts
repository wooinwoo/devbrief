import { describe, it, expect } from 'vitest';
import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('0초 → 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('45초 → 0:45', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('1분 → 1:00', () => {
    expect(formatDuration(60)).toBe('1:00');
  });

  it('42:18 (2538초)', () => {
    expect(formatDuration(2538)).toBe('42:18');
  });

  it('59:59 (3599초)', () => {
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('1:00:00 (3600초)', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('1:23:45 (5025초)', () => {
    expect(formatDuration(5025)).toBe('1:23:45');
  });

  it('2:05:09 — 분 padding 처리', () => {
    expect(formatDuration(7509)).toBe('2:05:09');
  });

  it('초 소수점은 버림', () => {
    expect(formatDuration(42.9)).toBe('0:42');
  });

  it('음수 / NaN / Infinity → 0:00', () => {
    expect(formatDuration(-1)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(Infinity)).toBe('0:00');
  });
});
