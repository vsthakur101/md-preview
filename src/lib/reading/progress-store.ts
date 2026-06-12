/**
 * Lightweight reading identity stored in localStorage: which articles you've
 * finished, and a day-streak. (Anonymous-friendly; a DB-backed version can
 * replace this later for cross-device.)
 */

const KEY = 'reading:stats:v1';
const RECENT_KEY = 'reading:recent:v1';
const POS_PREFIX = 'reading:pos:';
const DAILY_KEY = 'reading:daily:v1';
const GOAL_KEY = 'reading:goal';
const RECENT_MAX = 20;

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

export function isFinished(fileId: string): boolean {
  return read().finishedIds.includes(fileId);
}

/* ---- Scroll position + recency (powers resume and "Jump back in") ------- */

export function getPosition(fileId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = window.localStorage.getItem(POS_PREFIX + fileId);
    return v ? Math.min(1, Math.max(0, parseFloat(v))) : 0;
  } catch {
    return 0;
  }
}

function readRecency(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** Persist scroll fraction and bump the article in the recency map. */
export function savePosition(fileId: string, fraction: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(POS_PREFIX + fileId, fraction.toFixed(4));

    const recent = readRecency();
    recent[fileId] = Date.now();
    const trimmed = Object.fromEntries(
      Object.entries(recent)
        .sort(([, a], [, b]) => b - a)
        .slice(0, RECENT_MAX)
    );
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

/* ---- Daily reading minutes + goal (device-local, like the streak) ------- */

interface DailyReading {
  date: string; // YYYY-MM-DD
  minutes: number;
}

function readDaily(): DailyReading {
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    const parsed = raw ? (JSON.parse(raw) as DailyReading) : null;
    if (parsed && parsed.date === todayStr() && typeof parsed.minutes === 'number') {
      return parsed;
    }
  } catch {
    /* fall through */
  }
  return { date: todayStr(), minutes: 0 };
}

/** Credit (fractional) minutes of reading to today's bucket. */
export function addReadingMinutes(minutes: number): void {
  if (typeof window === 'undefined' || minutes <= 0) return;
  const d = readDaily();
  d.minutes += minutes;
  try {
    window.localStorage.setItem(DAILY_KEY, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export function getTodayReadingMinutes(): number {
  if (typeof window === 'undefined') return 0;
  return Math.round(readDaily().minutes);
}

/** Daily goal in minutes; 0 = no goal set. */
export function getDailyGoal(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const v = parseInt(window.localStorage.getItem(GOAL_KEY) ?? '0', 10);
    return Number.isFinite(v) && v > 0 ? Math.min(v, 600) : 0;
  } catch {
    return 0;
  }
}

export function setDailyGoal(minutes: number): void {
  try {
    window.localStorage.setItem(GOAL_KEY, String(Math.max(0, Math.min(600, Math.round(minutes)))));
  } catch {
    /* ignore */
  }
}

export interface InProgressRead {
  id: string;
  fraction: number; // 0..1 scroll progress
  at: number; // last-read timestamp (ms)
}

/**
 * Articles with meaningful unfinished progress, most recently read first.
 * Drives the library's "Jump back in" surface.
 */
export function getInProgressReads(): InProgressRead[] {
  if (typeof window === 'undefined') return [];
  const finished = new Set(read().finishedIds);
  return Object.entries(readRecency())
    .map(([id, at]) => ({ id, at, fraction: getPosition(id) }))
    .filter((r) => !finished.has(r.id) && r.fraction > 0.03 && r.fraction < 0.97)
    .sort((a, b) => b.at - a.at);
}
