const KEY = 'pulse.read.v1';

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
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
  add(id: string) {
    const set = load();
    set.add(id);
    persist(set);
  },
  remove(id: string) {
    const set = load();
    set.delete(id);
    persist(set);
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
