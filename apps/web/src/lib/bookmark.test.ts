import { beforeEach, describe, expect, it } from 'vitest';
import { bookmarks } from './bookmark';

describe('bookmarks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('초기 상태는 빈 Set', () => {
    expect(bookmarks.load().size).toBe(0);
  });

  it('toggle — 없으면 추가, 있으면 제거', () => {
    let set = bookmarks.toggle('a1');
    expect(set.has('a1')).toBe(true);
    expect(set.size).toBe(1);

    set = bookmarks.toggle('a1');
    expect(set.has('a1')).toBe(false);
    expect(set.size).toBe(0);
  });

  it('toggle 결과는 localStorage에 persist', () => {
    bookmarks.toggle('a1');
    bookmarks.toggle('a2');
    const reloaded = bookmarks.load();
    expect(reloaded.size).toBe(2);
    expect(reloaded.has('a1')).toBe(true);
    expect(reloaded.has('a2')).toBe(true);
  });

  it('toggle은 매번 새 Set 인스턴스 반환 (불변)', () => {
    const first = bookmarks.toggle('x');
    const second = bookmarks.toggle('y');
    expect(first).not.toBe(second);
  });

  it('has — 인자 set 우선, 없으면 load', () => {
    bookmarks.toggle('saved');
    expect(bookmarks.has('saved')).toBe(true);
    expect(bookmarks.has('missing')).toBe(false);

    const cached = new Set(['cached']);
    expect(bookmarks.has('cached', cached)).toBe(true);
    expect(bookmarks.has('saved', cached)).toBe(false);
  });

  it('손상된 localStorage는 빈 Set으로 복구', () => {
    localStorage.setItem('devbrief.bookmarks.v1', 'not-json');
    expect(bookmarks.load().size).toBe(0);
  });
});
