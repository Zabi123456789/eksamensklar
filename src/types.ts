import type { ThemeId } from './lib/themes';

export type CourseType = 'exam' | 'assignment';

export interface Course {
  id: string;
  code: string;
  name: string;
  type: CourseType;
  /** Lokal tid, "YYYY-MM-DDTHH:mm". For innlevering er dette fristen. */
  dateTime: string;
  /** Varighet i timer, bare for skoleeksamen. */
  durationHours?: number;
  estimatedHours: number;
  difficulty: number; // 1–5
  color: string;
}

export interface Settings {
  /** Timer per ukedag: [man, tir, ons, tor, fre, lør, søn]. */
  hoursPerWeekday: number[];
  sessionMinutes: number;
  /** Første mulige starttidspunkt på en dag, "HH:mm". */
  dayStart: string;
  /** Fridager uten økter, "YYYY-MM-DD". */
  daysOff?: string[];
  /** Lesestrategi i en økt: minutter fokus og pause. 0 = hele økta i ett strekk. */
  focusMinutes: number;
  breakMinutes: number;
  /** Visuelt tema, se lib/themes.ts. */
  theme?: ThemeId;
  /** Valgfri overstyring av dagens dato (for demo), "YYYY-MM-DD". */
  simulatedToday?: string;
}

/** study = leseøkt, project = prosjektøkt, review = repetisjon */
export type SessionKind = 'study' | 'project' | 'review';

export interface Session {
  id: string;
  courseId: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  minutes: number;
  kind: SessionKind;
  completed: boolean;
}

export interface PlanWarning {
  courseId: string;
  missingHours: number;
}

export interface PlanResult {
  sessions: Session[];
  warnings: PlanWarning[];
}

export interface AppState {
  version: 1;
  courses: Course[];
  settings: Settings;
  sessions: Session[];
  warnings: PlanWarning[];
}
