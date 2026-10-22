import type { AppState } from '../types';
import type { FocusRun } from './focus';
import { DEFAULT_SETTINGS } from './demoData';
import { migrateColor } from './colors';

const KEY = 'eksamensklar:v1';

export function emptyState(): AppState {
  return { version: 1, courses: [], settings: { ...DEFAULT_SETTINGS }, sessions: [], warnings: [] };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.version !== 1) return emptyState();
    const courses = (parsed.courses ?? []).map((c) => ({ ...c, color: migrateColor(c.color) }));
    return { ...emptyState(), ...parsed, courses, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
  } catch {
    return emptyState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Full eller blokkert lagring: appen fungerer fortsatt i denne økten.
  }
}

const FOCUS_KEY = 'eksamensklar:focus';

/** Pågående tidtaker, så den overlever at siden lastes på nytt. */
export function loadFocusRun(): FocusRun | null {
  try {
    const raw = localStorage.getItem(FOCUS_KEY);
    return raw ? (JSON.parse(raw) as FocusRun) : null;
  } catch {
    return null;
  }
}

export function saveFocusRun(run: FocusRun | null): void {
  try {
    if (run) localStorage.setItem(FOCUS_KEY, JSON.stringify(run));
    else localStorage.removeItem(FOCUS_KEY);
  } catch {
    // Lagring er blokkert: tidtakeren virker til siden lukkes.
  }
}
