const KEY = 'devbrief.bookmarks.v1';

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
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
