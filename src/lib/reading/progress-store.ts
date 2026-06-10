/**
 * Lightweight reading identity stored in localStorage: which articles you've
 * finished, and a day-streak. (Anonymous-friendly; a DB-backed version can
 * replace this later for cross-device.)
 */

const KEY = 'reading:stats:v1';

export interface ReadingStats {
  finishedIds: string[];
  streak: number;
  lastDate: string; // YYYY-MM-DD
}

const todayStr = () => new Date().toISOString().slice(0, 10);

function read(): ReadingStats {
  if (typeof window === 'undefined') return { finishedIds: [], streak: 0, lastDate: '' };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { finishedIds: [], streak: 0, lastDate: '' };
    const parsed = JSON.parse(raw) as ReadingStats;
    return {
      finishedIds: Array.isArray(parsed.finishedIds) ? parsed.finishedIds : [],
      streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
      lastDate: typeof parsed.lastDate === 'string' ? parsed.lastDate : '',
    };
  } catch {
    return { finishedIds: [], streak: 0, lastDate: '' };
  }
}

export function getStats(): { count: number; streak: number } {
  const s = read();
  return { count: s.finishedIds.length, streak: s.streak };
}

/** Mark an article finished; updates the day-streak. Returns fresh stats. */
export function markFinished(fileId: string): { count: number; streak: number } {
  const s = read();
  const today = todayStr();

  if (s.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    s.streak = s.lastDate === yesterday ? s.streak + 1 : 1;
    s.lastDate = today;
  } else if (s.streak === 0) {
    s.streak = 1;
  }

  if (!s.finishedIds.includes(fileId)) s.finishedIds.push(fileId);

  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  return { count: s.finishedIds.length, streak: s.streak };
}
