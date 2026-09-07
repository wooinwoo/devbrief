import { beforeEach, describe, expect, it } from 'vitest';
import { BATCH_MAX_IDS, bookmarks } from './bookmark';

const KEY = 'devbrief.bookmarks.v1';

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

  it('손상된 localStorage는 빈 Set으로 복구 + 키 리셋', () => {
    localStorage.setItem(KEY, 'not-json');
    expect(bookmarks.load().size).toBe(0);
    // 오염 키는 리셋되어 다음 load 가 깨끗하게 시작한다
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('비배열 JSON(문자열)은 글자 단위 Set 이 되지 않고 빈 Set + 키 리셋', () => {
    // '"abc"' 는 JSON.parse 성공 + iterable 이라 검증 없으면 Set{'a','b','c'} 가 된다
    localStorage.setItem(KEY, JSON.stringify('abc'));
    const set = bookmarks.load();
    expect(set.size).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('비배열 JSON(객체·숫자)도 빈 Set + 키 리셋', () => {
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
    expect(bookmarks.load().size).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();

    localStorage.setItem(KEY, '42');
    expect(bookmarks.load().size).toBe(0);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('배열이어도 string 이 아닌 원소는 걸러낸다', () => {
    localStorage.setItem(KEY, JSON.stringify([1, 2, 'ok', null]));
    const set = bookmarks.load();
    expect(set.size).toBe(1);
    expect(set.has('ok')).toBe(true);
  });

  it('BATCH_MAX_IDS — 서버 배치 캡(100)과 일치해야 한다', () => {
    // apps/api/src/articles/articles.controller.ts 의 BATCH_MAX_IDS 와 동기
    expect(BATCH_MAX_IDS).toBe(100);
  });
});
