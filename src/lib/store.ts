import type { Card } from "../data/decks";

export type Mark = "known" | "learning";
export type State = {
  marks: Record<string, Mark>;
  streak: number;
  lastDay: string | null; // local YYYY-MM-DD of the last study session
  best: Record<string, number>; // best quiz percent per deck
  mine: Card[];
};

const KEY = "scrubdeck.v1";
export const empty: State = { marks: {}, streak: 0, lastDay: null, best: {}, mine: [] };

export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function dayBefore(d: Date): string {
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));
}

/** Count today as a study day. Same day twice changes nothing; a missed day restarts at 1. */
export function recordStudy(s: State, now: Date): State {
  const today = dayKey(now);
  if (s.lastDay === today) return s;
  const streak = s.lastDay === dayBefore(now) ? s.streak + 1 : 1;
  return { ...s, streak, lastDay: today };
}

/** The streak to show: it is only alive if she studied today or yesterday. */
export function liveStreak(s: State, now: Date): number {
  return s.lastDay === dayKey(now) || s.lastDay === dayBefore(now) ? s.streak : 0;
}

export function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

export function save(s: State): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked: the session still works, it just will not persist.
  }
}
