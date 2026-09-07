// 구 앱명(Pulse) 시절 키 — load 시 발견되면 새 키로 병합 이관 후 삭제한다.
const LEGACY_KEY = 'pulse.read.v1';
// 북마크('devbrief.bookmarks.v1')·언어('devbrief.lang')와 같은 devbrief 네임스페이스.
const KEY = 'devbrief.read.v1';

/** 키 하나를 검증 파싱해 string Set 으로. 오염(비배열 JSON 등)이면 키 리셋 + 빈 Set. */
function readKey(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    // 비배열 JSON 방어 — 문자열('"abc"')은 iterable 이라 글자 단위 쓰레기 Set 이 된다.
    if (!Array.isArray(parsed)) throw new Error('corrupt storage');
    // 배열이어도 string 원소만 채택 — 숫자 id 등은 has(string) 비교가 항상 false.
    return new Set(parsed.filter((x): x is string => typeof x === 'string'));
  } catch {
    removeKey(key);
    return new Set();
  }
}

function removeKey(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* 접근 불가 환경 무시 */
  }
}

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const set = readKey(KEY);

  // 구 키가 남아 있으면 최초 1회 새 키로 병합 이관 (기존 사용자 읽음 기록 보존).
  let legacyRaw: string | null = null;
  try {
    legacyRaw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return set;
  }
  if (legacyRaw === null) return set;

  for (const id of readKey(LEGACY_KEY)) set.add(id);
  persist(set);
  removeKey(LEGACY_KEY);
  return set;
}

function persist(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // quota / storage 에러 무시
  }
}

export const readTracking = {
  load,
  add(id: string): Set<string> {
    const set = load();
    set.add(id);
    persist(set);
    return new Set(set);
  },
  remove(id: string): Set<string> {
    const set = load();
    set.delete(id);
    persist(set);
    return new Set(set);
  },
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
