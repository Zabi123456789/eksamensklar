// Ren planleggingslogikk: ingen React, ingen localStorage, ingen "new Date()".
// "today" sendes alltid inn, slik at funksjonene er deterministiske og testbare.

import type { Course, PlanResult, PlanWarning, Session, SessionKind, Settings } from '../types';
import { addDays, daysBetween, minToTime, splitDateTime, timeToMin, weekdayIndex } from './dates';

/** Siste mulige slutt-tid for en økt. */
export const DAY_END = '22:00';
/** Pause mellom økter, og etter en eksamen, i minutter. */
export const BREAK_MIN = 15;
export const AFTER_EXAM_BREAK_MIN = 30;
/** Hvor mye vanskelighetsgrad vekter hastegraden per nivå over 1. */
export const DIFFICULTY_WEIGHT = 0.2;
/** Rest av dagens lesetid som er kortere enn en økt, blir en kort økt hvis den er minst så lang. */
export const MIN_SHORT_SESSION = 30;

interface CourseInfo {
  course: Course;
  deadlineDate: string;
  /** Siste dag emnet kan få vanlige økter. */
  lastDay: string;
  /** Repetisjonsdagen (dagen før skoleeksamen). */
  reviewDay?: string;
  remaining: number; // minutter
  /** Minutter til vanlige økter (etter repetisjon), og hvor mange av dem som er lagt inn. */
  generalTotal: number;
  generalAssigned: number;
  /** Dager med ledig kapasitet i emnets periode (for jevn fordeling). */
  windowDays: string[];
}

interface Slot {
  start: number; // minutter etter midnatt
  minutes: number;
}

interface DayInfo {
  date: string;
  /** Ledige økter denne dagen. */
  slots: Slot[];
}

/** Siste dag et emne kan få økter: dagen før eksamen, eller dagen før fristen (buffer). */
export function lastSessionDay(course: Course): string {
  return addDays(splitDateTime(course.dateTime).date, -1);
}

export function examEndMin(course: Course): number {
  return timeToMin(splitDateTime(course.dateTime).time) + Math.round((course.durationHours ?? 0) * 60);
}

export function urgency(info: CourseInfo, date: string): number {
  const daysLeft = daysBetween(date, info.lastDay) + 1;
  const weight = 1 + DIFFICULTY_WEIGHT * (info.course.difficulty - 1);
  return (info.remaining / 60 / Math.max(1, daysLeft)) * weight;
}

function kindFor(course: Course, review: boolean): SessionKind {
  if (review) return 'review';
  return course.type === 'assignment' ? 'project' : 'study';
}

export function isDayOff(settings: Settings, date: string): boolean {
  return settings.daysOff?.includes(date) ?? false;
}

/** Ledige økter en gitt dag, etter eksamener og allerede fullførte økter. */
function buildDay(date: string, courses: Course[], settings: Settings, completedThatDay: number): DayInfo {
  const len = settings.sessionMinutes;
  let start = timeToMin(settings.dayStart);
  // På eksamensdagen: ingen økter før eksamen (alle eksamener den dagen) er ferdig.
  for (const c of courses) {
    if (c.type === 'exam' && splitDateTime(c.dateTime).date === date) {
      start = Math.max(start, examEndMin(c) + AFTER_EXAM_BREAK_MIN);
    }
  }
  // Dagens lesetid deles i hele økter; en rest på minst 30 min blir en kortere økt.
  // Fridager får ingen lesetid.
  const dayMinutes = isDayOff(settings, date) ? 0 : Math.round((settings.hoursPerWeekday[weekdayIndex(date)] ?? 0) * 60);
  const lengths: number[] = Array(Math.floor(dayMinutes / len)).fill(len);
  const rest = dayMinutes - lengths.length * len;
  if (rest >= MIN_SHORT_SESSION) lengths.push(rest);

  const all: Slot[] = [];
  let t = start;
  for (const minutes of lengths) {
    if (t + minutes > timeToMin(DAY_END)) break;
    all.push({ start: t, minutes });
    t += minutes + BREAK_MIN;
  }
  return { date, slots: all.slice(completedThatDay) };
}

/**
 * Lager en leseplan fra og med `today`.
 * `completedSessions` beholdes uendret, og timene deres trekkes fra estimatet.
 */
export function generatePlan(
  courses: Course[],
  settings: Settings,
  today: string,
  completedSessions: Session[] = [],
): PlanResult {
  const len = settings.sessionMinutes;
  const courseIds = new Set(courses.map((c) => c.id));
  const kept = completedSessions.filter((s) => s.completed && courseIds.has(s.courseId));

  const doneMin = new Map<string, number>();
  for (const s of kept) doneMin.set(s.courseId, (doneMin.get(s.courseId) ?? 0) + s.minutes);

  // Emner som fortsatt kan få økter (fristen er etter i dag).
  const infos: CourseInfo[] = courses
    .filter((c) => splitDateTime(c.dateTime).date > today)
    .map((c) => ({
      course: c,
      deadlineDate: splitDateTime(c.dateTime).date,
      lastDay: lastSessionDay(c),
      reviewDay: c.type === 'exam' ? lastSessionDay(c) : undefined,
      remaining: Math.max(0, Math.round(c.estimatedHours * 60) - (doneMin.get(c.id) ?? 0)),
      generalTotal: 0,
      generalAssigned: 0,
      windowDays: [],
    }));

  const sessions: Session[] = [];
  if (infos.length === 0 || len <= 0) return { sessions: [...kept], warnings: [] };

  const lastPlanDay = infos.reduce((max, i) => (i.lastDay > max ? i.lastDay : max), today);
  const days: DayInfo[] = [];
  for (let d = today; d <= lastPlanDay; d = addDays(d, 1)) {
    days.push(buildDay(d, courses, settings, kept.filter((s) => s.date === d).length));
  }

  const add = (info: CourseInfo, date: string, { start, minutes: slotMinutes }: Slot, review: boolean) => {
    const minutes = Math.min(slotMinutes, info.remaining);
    info.remaining -= minutes;
    sessions.push({
      id: `${info.course.id}_${date}_${minToTime(start).replace(':', '')}`,
      courseId: info.course.id,
      date,
      startTime: minToTime(start),
      minutes,
      kind: kindFor(info.course, review),
      completed: false,
    });
  };

  // 1) Repetisjonsdager: dagen før en skoleeksamen går alle økter til det emnet.
  //    Har flere eksamener samme repetisjonsdag, deles øktene på omgang.
  const reviewDays = new Set<string>();
  for (const day of days) {
    const exams = infos
      .filter((i) => i.reviewDay === day.date)
      .sort((a, b) => a.course.dateTime.localeCompare(b.course.dateTime));
    if (exams.length === 0) continue;
    reviewDays.add(day.date);
    let k = 0;
    for (const slot of day.slots) {
      const withTime = exams.filter((e) => e.remaining > 0);
      if (withTime.length === 0) break;
      add(withTime[k % withTime.length], day.date, slot, true);
      k++;
    }
  }

  // 2) Vanlige dager. Hvert emne fordeles jevnt over sin egen periode, regnet
  //    bakover fra fristen: et emne er bare aktuelt når det ligger bak sitt tempo.
  //    Blant aktuelle emner vinner høyest hastegrad. En frist-sjekk (tidligste
  //    frist først) overstyrer når et emne ellers ikke rekker fristen
  //    (overlappende frister / for lite tid). Ubrukte økter blir fritid.
  const generalDays = days.filter((d) => !reviewDays.has(d.date));
  for (const info of infos) {
    info.generalTotal = info.remaining;
    info.windowDays = generalDays.filter((d) => d.date <= info.lastDay && d.slots.length > 0).map((d) => d.date);
  }
  const onPace = (info: CourseInfo, date: string): boolean => {
    const dayNo = info.windowDays.filter((d) => d <= date).length;
    const target = (info.generalTotal * dayNo) / Math.max(1, info.windowDays.length);
    return info.generalAssigned >= target;
  };
  // Ledige økter fra og med denne økten til og med en gitt dato.
  const slotsThrough = (fromIdx: number, slotIdx: number, until: string): Slot[] => {
    const slots = generalDays[fromIdx].slots.slice(slotIdx);
    for (let j = fromIdx + 1; j < generalDays.length && generalDays[j].date <= until; j++) {
      slots.push(...generalDays[j].slots);
    }
    return slots;
  };

  generalDays.forEach((day, idx) => {
    day.slots.forEach((slot, slotIdx) => {
      const candidates = infos.filter((i) => i.remaining > 0 && day.date <= i.lastDay);
      if (candidates.length === 0) return;

      const lastDays = [...new Set(candidates.map((c) => c.lastDay))].sort();
      let pool = candidates.filter((c) => !onPace(c, day.date));
      for (const L of lastDays) {
        const due = candidates.filter((c) => c.lastDay <= L);
        // Kritisk hvis behovet fyller resten av kapasiteten, målt både i minutter
        // og i antall økter (en rest på 30 min trenger også en egen økt).
        const free = slotsThrough(idx, slotIdx, L);
        const demandMin = due.reduce((sum, c) => sum + c.remaining, 0);
        const demandSlots = due.reduce((sum, c) => sum + Math.ceil(c.remaining / len), 0);
        if (demandMin >= free.reduce((sum, x) => sum + x.minutes, 0) || demandSlots >= free.length) {
          pool = due;
          break;
        }
      }

      if (pool.length === 0) return; // alle emner er i rute: fritid
      const best = [...pool].sort(
        (a, b) =>
          urgency(b, day.date) - urgency(a, day.date) ||
          a.lastDay.localeCompare(b.lastDay) ||
          a.course.code.localeCompare(b.course.code),
      )[0];
      best.generalAssigned += Math.min(slot.minutes, best.remaining);
      add(best, day.date, slot, false);
    });
  });

  // 3) Advarsler for emner som ikke fikk nok tid.
  const warnings: PlanWarning[] = infos
    .filter((i) => i.remaining > 0)
    .map((i) => ({ courseId: i.course.id, missingHours: Math.round((i.remaining / 60) * 10) / 10 }));

  const all = [...kept, ...sessions].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  return { sessions: all, warnings };
}

/**
 * «Planlegg på nytt»: beholder fullførte økter. Økter fra tidligere dager som ikke
 * ble krysset av, forkastes, og timene fordeles på nytt fra og med i dag.
 */
export function replan(courses: Course[], settings: Settings, sessions: Session[], today: string): PlanResult {
  return generatePlan(courses, settings, today, sessions.filter((s) => s.completed));
}

/** Økter fra tidligere dager som ikke er krysset av. */
export function missedSessions(sessions: Session[], today: string): Session[] {
  return sessions.filter((s) => !s.completed && s.date < today);
}
