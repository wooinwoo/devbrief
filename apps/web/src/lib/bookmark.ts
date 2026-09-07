const KEY = 'devbrief.bookmarks.v1';

/**
 * 글 배치 조회 API(/articles/batch)의 ids 상한 — 뷰의 청크 분할 기준.
 * 서버(apps/api/src/articles/articles.controller.ts)와 같은 @devbrief/shared 상수를
 * 재수출한다 — 값이 어긋나면 서버가 초과분을 에러 없이 잘라내 유효 북마크가
 * '삭제된 글'로 오분류되므로, 단일 소스로 고정 (감사 c58).
 */
export { BATCH_MAX_IDS } from '@devbrief/shared';

/** 오염된 키 리셋 — 다음 load 가 빈 Set 에서 깨끗하게 시작하게 한다. */
function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 접근 불가 환경 무시 */
  }
}

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    // 비배열 JSON 방어 — 문자열('"abc"')은 iterable 이라 글자 단위 쓰레기 Set 이 된다.
    if (!Array.isArray(parsed)) throw new Error('corrupt storage');
    // 배열이어도 string 원소만 채택 — 숫자 id 등은 has(string) 비교가 항상 false.
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    reset();
    return new Set();
  }
}

function persist(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* quota 무시 */
  }
}

export const bookmarks = {
  load,
  toggle(id: string): Set<string> {
    const set = load();
    if (set.has(id)) set.delete(id);
    else set.add(id);
    persist(set);
    return new Set(set);
  },
  has(id: string, set?: Set<string>) {
    return (set ?? load()).has(id);
  },
};
