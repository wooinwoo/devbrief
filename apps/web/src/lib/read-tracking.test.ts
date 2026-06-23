import { beforeEach, describe, expect, it } from 'vitest';
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

  it('remove — 읽음 표시 해제 후 persist', () => {
    readTracking.add('art-1');
    readTracking.add('art-2');
    readTracking.remove('art-1');

    const reloaded = readTracking.load();
    expect(reloaded.has('art-1')).toBe(false);
    expect(reloaded.has('art-2')).toBe(true);
    expect(reloaded.size).toBe(1);
  });

  it('remove — 없는 id 제거해도 오류 없음', () => {
    readTracking.add('art-1');
    readTracking.remove('missing');
    expect(readTracking.load().size).toBe(1);
  });

  it('toggle — 없으면 추가, 있으면 제거', () => {
    let set = readTracking.toggle('art-x');
    expect(set.has('art-x')).toBe(true);
    expect(readTracking.has('art-x')).toBe(true);

    set = readTracking.toggle('art-x');
    expect(set.has('art-x')).toBe(false);
    expect(readTracking.has('art-x')).toBe(false);
  });

  it('toggle은 매번 새 Set 인스턴스 반환 (불변)', () => {
    const first = readTracking.toggle('a');
    const second = readTracking.toggle('b');
    expect(first).not.toBe(second);
  });

  it('add는 갱신된 Set 을 반환 (toggle 과 일관)', () => {
    const set = readTracking.add('art-1');
    expect(set.has('art-1')).toBe(true);
    // 반환된 Set 변형이 저장소에 새지 않도록 새 인스턴스여야 한다
    const next = readTracking.add('art-2');
    expect(next).not.toBe(set);
    expect(next.has('art-1')).toBe(true);
    expect(next.has('art-2')).toBe(true);
  });

  it('remove는 갱신된 Set 을 반환 (toggle 과 일관)', () => {
    readTracking.add('art-1');
    readTracking.add('art-2');
    const set = readTracking.remove('art-1');
    expect(set.has('art-1')).toBe(false);
    expect(set.has('art-2')).toBe(true);
  });
});
