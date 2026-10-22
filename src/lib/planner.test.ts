import { describe, expect, it } from 'vitest';
import type { Course, Session, Settings } from '../types';
import { generatePlan, missedSessions, replan } from './planner';
import { DEMO_COURSES, DEFAULT_SETTINGS } from './demoData';
import { splitDateTime, timeToMin } from './dates';

const TODAY = '2026-10-22';

function course(partial: Partial<Course> & Pick<Course, 'id' | 'dateTime' | 'estimatedHours'>): Course {
  return {
    code: partial.id.toUpperCase(),
    name: partial.id,
    type: 'exam',
    durationHours: 3,
    difficulty: 3,
    color: '#000',
    ...partial,
  };
}

const minutesFor = (sessions: Session[], courseId: string) =>
  sessions.filter((s) => s.courseId === courseId).reduce((sum, s) => sum + s.minutes, 0);

describe('generatePlan', () => {
  const plan = generatePlan(DEMO_COURSES, DEFAULT_SETTINGS, TODAY);

  it('gir alle demo-emnene fulle timer uten advarsler', () => {
    expect(plan.warnings).toEqual([]);
    for (const c of DEMO_COURSES) expect(minutesFor(plan.sessions, c.id)).toBe(c.estimatedHours * 60);
  });

  it('starter tidligst i dag', () => {
    expect(plan.sessions.every((s) => s.date >= TODAY)).toBe(true);
  });

  it('legger ingen økter på eller etter eksamensdagen/fristen', () => {
    for (const c of DEMO_COURSES) {
      const deadline = splitDateTime(c.dateTime).date;
      const own = plan.sessions.filter((s) => s.courseId === c.id);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((s) => s.date < deadline)).toBe(true);
    }
  });

  it('gir innleveringer prosjektøkter med minst én dags buffer', () => {
    const own = plan.sessions.filter((s) => s.courseId === 'demo-itpe3200');
    expect(own.every((s) => s.kind === 'project')).toBe(true);
    const last = own[own.length - 1];
    expect(last.date <= '2026-11-29').toBe(true);
  });

  it('dagen før skoleeksamen er bare repetisjon av det emnet', () => {
    const dayBefore = plan.sessions.filter((s) => s.date === '2026-11-19');
    expect(dayBefore.length).toBeGreaterThan(0);
    expect(dayBefore.every((s) => s.courseId === 'demo-dave3625' && s.kind === 'review')).toBe(true);

    const dayBefore2 = plan.sessions.filter((s) => s.date === '2026-11-24');
    expect(dayBefore2.length).toBeGreaterThan(0);
    expect(dayBefore2.every((s) => s.courseId === 'demo-itpe3100' && s.kind === 'review')).toBe(true);

    // Repetisjon brukes bare dagen før eksamen.
    expect(plan.sessions.filter((s) => s.kind === 'review').every((s) => ['2026-11-19', '2026-11-24'].includes(s.date))).toBe(true);
  });

  it('har ingen økter på eksamensdagen før eksamen er ferdig', () => {
    // DAVE3625: kl 09:00 + 4 t = 13:00
    const examDay = plan.sessions.filter((s) => s.date === '2026-11-20');
    expect(examDay.every((s) => timeToMin(s.startTime) >= timeToMin('13:00'))).toBe(true);
    // ITPE3100: kl 15:00 + 3 t = 18:00
    const examDay2 = plan.sessions.filter((s) => s.date === '2026-11-25');
    expect(examDay2.every((s) => timeToMin(s.startTime) >= timeToMin('18:00'))).toBe(true);
  });

  it('økter overlapper ikke og slutter innen kl. 22', () => {
    const byDate = new Map<string, Session[]>();
    for (const s of plan.sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
    for (const list of byDate.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
      for (let i = 0; i < list.length; i++) {
        const end = timeToMin(list[i].startTime) + list[i].minutes;
        expect(end).toBeLessThanOrEqual(22 * 60);
        if (i > 0) expect(timeToMin(list[i].startTime)).toBeGreaterThanOrEqual(timeToMin(list[i - 1].startTime) + list[i - 1].minutes);
      }
    }
  });

  it('fordeler jevnt helt frem til hver frist i stedet for å bli ferdig tidlig', () => {
    // ITPE3100 skal ha leseøkter i dagene rett før repetisjonsdagen (21.–23.11).
    const late = plan.sessions.filter((s) => s.courseId === 'demo-itpe3100' && s.date >= '2026-11-21' && s.date <= '2026-11-23');
    expect(late.length).toBeGreaterThan(0);
    // ITPE3200 skal ha prosjektøkter den siste uken før fristen.
    const lastWeek = plan.sessions.filter((s) => s.courseId === 'demo-itpe3200' && s.date >= '2026-11-26');
    expect(lastWeek.length).toBeGreaterThan(0);
    // Første dag har økter for alle emnene som starter nå.
    expect(plan.sessions.filter((s) => s.date === TODAY).length).toBeGreaterThan(0);
  });

  it('respekterer timer per ukedag', () => {
    const perDay = new Map<string, number>();
    for (const s of plan.sessions) perDay.set(s.date, (perDay.get(s.date) ?? 0) + s.minutes);
    // 3 t hverdag => maks 2 × 90 min, 5 t helg => maks 3 × 90 min
    expect(perDay.get('2026-10-22')).toBeLessThanOrEqual(180); // torsdag
    expect(perDay.get('2026-10-24')).toBeLessThanOrEqual(300); // lørdag
  });

  it('bruker rest av dagens tid som en kortere økt', () => {
    // 1 t per dag med 90-minuttersøkter gir én økt på 60 min.
    const settings: Settings = { ...DEFAULT_SETTINGS, hoursPerWeekday: [1, 1, 1, 1, 1, 1, 1] };
    const c = course({ id: 'k', dateTime: '2026-10-25T09:00', estimatedHours: 10 });
    const p = generatePlan([c], settings, TODAY);
    expect(p.sessions.map((s) => s.minutes)).toEqual([60, 60, 60]); // 22., 23. og 24. (repetisjon)
    expect(p.sessions.filter((s) => s.date === '2026-10-24').map((s) => s.minutes)).toEqual([60]);
  });
});

describe('fridager', () => {
  const daysOff = ['2026-10-24', '2026-10-25', '2026-10-31'];
  const plan = generatePlan(DEMO_COURSES, { ...DEFAULT_SETTINGS, daysOff }, TODAY);

  it('legger ingen økter på fridager', () => {
    expect(plan.sessions.filter((s) => daysOff.includes(s.date))).toEqual([]);
  });

  it('flytter timene til andre dager i stedet for å miste dem', () => {
    expect(plan.warnings).toEqual([]);
    for (const c of DEMO_COURSES) expect(minutesFor(plan.sessions, c.id)).toBe(c.estimatedHours * 60);
  });
});

describe('overlappende frister', () => {
  // Mandag 2. nov. 2 t per dag, 60-minutters økter => 2 økter per dag.
  const settings: Settings = { ...DEFAULT_SETTINGS, hoursPerWeekday: [2, 2, 2, 2, 2, 2, 2], sessionMinutes: 60, dayStart: '09:00' };
  const today = '2026-11-02';
  const examA = course({ id: 'a', dateTime: '2026-11-06T09:00', durationHours: 2, estimatedHours: 7, difficulty: 1 });
  const projB = course({ id: 'b', type: 'assignment', durationHours: undefined, dateTime: '2026-11-08T12:00', estimatedHours: 5, difficulty: 5 });

  it('fordeler tett kapasitet slik at begge rekker fristen', () => {
    const plan = generatePlan([examA, projB], settings, today);
    expect(plan.warnings).toEqual([]);
    expect(minutesFor(plan.sessions, 'a')).toBe(7 * 60);
    expect(minutesFor(plan.sessions, 'b')).toBe(5 * 60);
    expect(plan.sessions.filter((s) => s.courseId === 'a').every((s) => s.date < '2026-11-06')).toBe(true);
    expect(plan.sessions.filter((s) => s.courseId === 'b').every((s) => s.date <= '2026-11-07')).toBe(true);
  });

  it('to eksamener samme dag deler repetisjonsdagen', () => {
    const examC = course({ id: 'c', dateTime: '2026-11-06T14:00', durationHours: 2, estimatedHours: 3 });
    const plan = generatePlan([examA, examC], settings, today);
    const review = plan.sessions.filter((s) => s.date === '2026-11-05');
    expect(review.map((s) => s.courseId).sort()).toEqual(['a', 'c']);
    expect(review.every((s) => s.kind === 'review')).toBe(true);
    // Ingen økter på eksamensdagen før siste eksamen er ferdig (16:00).
    expect(plan.sessions.filter((s) => s.date === '2026-11-06')).toEqual([]);
  });
});

describe('advarsel ved for lite tid', () => {
  it('viser hvilket emne som mangler timer og hvor mange', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, hoursPerWeekday: [1.5, 1.5, 1.5, 1.5, 1.5, 0, 0], sessionMinutes: 90, dayStart: '09:00' };
    // Fra torsdag 22.10 til og med onsdag 28.10 (dagen før eksamen): 5 hverdager × 1,5 t = 7,5 t
    const c = course({ id: 'x', dateTime: '2026-10-29T09:00', estimatedHours: 20 });
    const plan = generatePlan([c], settings, TODAY);
    expect(plan.warnings).toEqual([{ courseId: 'x', missingHours: 12.5 }]);
    expect(minutesFor(plan.sessions, 'x')).toBe(7.5 * 60);
  });

  it('gir ingen advarsel når det er nok tid', () => {
    const c = course({ id: 'y', dateTime: '2026-12-20T09:00', estimatedHours: 10 });
    expect(generatePlan([c], DEFAULT_SETTINGS, TODAY).warnings).toEqual([]);
  });

  it('planlegger ikke emner med frist som har passert', () => {
    const c = course({ id: 'old', dateTime: '2026-10-01T09:00', estimatedHours: 10 });
    const plan = generatePlan([c], DEFAULT_SETTINGS, TODAY);
    expect(plan.sessions).toEqual([]);
    expect(plan.warnings).toEqual([]);
  });
});

describe('replan (Planlegg på nytt)', () => {
  const original = generatePlan(DEMO_COURSES, DEFAULT_SETTINGS, TODAY);
  const later = '2026-10-26';

  // Brukeren krysset av den første økten, men glemte resten av dagene før `later`.
  const firstId = original.sessions[0].id;
  const tracked = original.sessions.map((s) => (s.id === firstId ? { ...s, completed: true } : s));

  it('finner glemte økter fra tidligere dager', () => {
    const missed = missedSessions(tracked, later);
    expect(missed.length).toBeGreaterThan(0);
    expect(missed.every((s) => s.date < later && !s.completed)).toBe(true);
  });

  it('beholder fullførte økter og fordeler glemte timer utover gjenværende dager', () => {
    const result = replan(DEMO_COURSES, DEFAULT_SETTINGS, tracked, later);
    // Fullført økt er beholdt uendret.
    expect(result.sessions.find((s) => s.id === firstId)?.completed).toBe(true);
    // Ingen uavkryssede økter ligger igjen i fortiden.
    expect(missedSessions(result.sessions, later)).toEqual([]);
    // Alle nye økter ligger fra og med i dag.
    expect(result.sessions.filter((s) => !s.completed).every((s) => s.date >= later)).toBe(true);
    // Fullført + planlagt = estimat for hvert emne (glemte timer er flyttet, ikke tapt).
    for (const c of DEMO_COURSES) expect(minutesFor(result.sessions, c.id)).toBe(c.estimatedHours * 60);
    expect(result.warnings).toEqual([]);
  });

  it('gir advarsel hvis glemte økter ikke får plass lenger', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, hoursPerWeekday: [3, 3, 3, 3, 3, 3, 3], sessionMinutes: 60, dayStart: '09:00' };
    const c = course({ id: 'z', dateTime: '2026-10-28T09:00', estimatedHours: 18 }); // 6 dager × 3 t = akkurat nok
    const first = generatePlan([c], settings, TODAY);
    expect(first.warnings).toEqual([]);
    // Ingen økter gjort de to første dagene => 6 t glemt, bare 4 dager igjen (12 t).
    const result = replan([c], settings, first.sessions, '2026-10-24');
    expect(result.warnings).toEqual([{ courseId: 'z', missingHours: 6 }]);
  });

  it('fullførte økter i dag tar plassen sin, nye økter legges etter', () => {
    const todays = original.sessions.filter((s) => s.date === TODAY);
    const done = original.sessions.map((s) => (s.id === todays[0].id ? { ...s, completed: true } : s));
    const result = replan(DEMO_COURSES, DEFAULT_SETTINGS, done, TODAY);
    const today = result.sessions.filter((s) => s.date === TODAY);
    expect(today.find((s) => s.id === todays[0].id)?.completed).toBe(true);
    // Ingen to økter på samme tidspunkt.
    expect(new Set(today.map((s) => s.startTime)).size).toBe(today.length);
  });
});
