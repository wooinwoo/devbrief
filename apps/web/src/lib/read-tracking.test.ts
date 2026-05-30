import { describe, it, expect, beforeEach } from 'vitest';
import { readTracking } from './read-tracking';

describe('readTracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('초기 상태는 빈 Set', () => {
    expect(readTracking.load().size).toBe(0);
  });

  it('add 호출 시 localStorage에 persist', () => {
    readTracking.add('art-1');
    readTracking.add('art-2');

    const reloaded = readTracking.load();
    expect(reloaded.size).toBe(2);
    expect(reloaded.has('art-1')).toBe(true);
    expect(reloaded.has('art-2')).toBe(true);
  });

  it('중복 add 시 Set이라 1번만 저장', () => {
    readTracking.add('art-1');
    readTracking.add('art-1');
    expect(readTracking.load().size).toBe(1);
  });

  it('has는 id 존재 여부 반환', () => {
    readTracking.add('art-x');
    expect(readTracking.has('art-x')).toBe(true);
    expect(readTracking.has('art-y')).toBe(false);
  });

  it('has(id, set) 인자 — load 호출 안 하고 받은 set 사용', () => {
    const set = new Set(['cached-1']);
    expect(readTracking.has('cached-1', set)).toBe(true);
    expect(readTracking.has('other', set)).toBe(false);
  });

  it('localStorage 손상 시 빈 Set', () => {
    localStorage.setItem('pulse.read.v1', 'invalid-json');
    expect(readTracking.load().size).toBe(0);
  });
});
