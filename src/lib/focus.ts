// Lesestrategier: deler en økt i fokusrunder og pauser. Ren logikk, ingen React.

import type { SessionKind } from '../types';

export type PhaseKind = 'focus' | 'break';

export interface Phase {
  kind: PhaseKind;
  minutes: number;
}

export interface StudyMethod {
  id: string;
  label: string;
  focus: number;
  /** 0 = ingen pauser, hele økta er én fokusrunde. */
  break: number;
  description: string;
}

export const STUDY_METHODS: StudyMethod[] = [
  { id: 'pomodoro', label: 'Pomodoro', focus: 25, break: 5, description: '25 min fokus og 5 min pause. Bra når det er tungt å komme i gang.' },
  { id: '50-10', label: '50/10', focus: 50, break: 10, description: '50 min fokus og 10 min pause. Bra for lesing og oppgaveløsning.' },
  { id: 'deep', label: 'Dypt arbeid', focus: 0, break: 0, description: 'Hele økta i ett strekk. Bra for prosjektarbeid når du først er i flyt.' },
];

export function methodFor(focus: number, brk: number): StudyMethod | undefined {
  return STUDY_METHODS.find((m) => m.focus === focus && m.break === brk);
}

/**
 * Deler en økt i fokusrunder og pauser. Økta starter og slutter alltid med fokus.
 * En rest som er for kort til både pause og ny runde, legges til siste fokusrunde.
 */
export function buildPhases(totalMinutes: number, focus: number, brk: number): Phase[] {
  if (totalMinutes <= 0) return [];
  if (focus <= 0 || brk <= 0 || focus >= totalMinutes) return [{ kind: 'focus', minutes: totalMinutes }];

  const phases: Phase[] = [];
  let left = totalMinutes;
  while (left > 0) {
    const f = Math.min(focus, left);
    phases.push({ kind: 'focus', minutes: f });
    left -= f;
    if (left <= brk) {
      phases[phases.length - 1].minutes += left;
      break;
    }
    phases.push({ kind: 'break', minutes: brk });
    left -= brk;
  }
  return phases;
}

/** Kort beskrivelse, f.eks. «3 × fokus · 2 pauser». */
export function describePhases(phases: Phase[]): string {
  const focus = phases.filter((p) => p.kind === 'focus').length;
  const breaks = phases.length - focus;
  if (breaks === 0) return 'Ett fokusstrekk';
  return `${focus} fokusrunder · ${breaks} ${breaks === 1 ? 'pause' : 'pauser'}`;
}

const FOCUS_TIPS: Record<SessionKind, string[]> = {
  study: [
    'Skriv ned tre spørsmål før du leser, og svar på dem når runden er over.',
    'Les et avsnitt, lukk boka, og forklar det med egne ord.',
    'Lag et lite tankekart over det du nettopp har lest.',
  ],
  project: [
    'Velg én konkret oppgave for denne runden, og jobb bare med den.',
    'Skriv ned hvor du slapp, så er det lett å fortsette etter pausen.',
    'Gjør det minste steget som får prosjektet videre.',
  ],
  review: [
    'Test deg selv uten å se i notatene. Det du ikke husker, skal du repetere.',
    'Løs en gammel eksamensoppgave på tid.',
    'Forklar de viktigste begrepene høyt, som om du underviser noen.',
  ],
};

const BREAK_TIPS = [
  'Reis deg, strekk deg og drikk litt vann.',
  'Se ut av vinduet eller gå en liten tur. La mobilen ligge.',
  'Pust rolig noen ganger, og hent deg en matbit.',
];

export function tipFor(phase: Phase, index: number, kind: SessionKind): string {
  const list = phase.kind === 'focus' ? FOCUS_TIPS[kind] : BREAK_TIPS;
  return list[Math.floor(index / 2) % list.length];
}

/** En pågående økt med tidtaker. Tiden lagres som tidspunkt, så den overlever omlasting og faner i bakgrunnen. */
export interface FocusRun {
  sessionId: string;
  phases: Phase[];
  index: number;
  /** Når gjeldende fase slutter (ms). null = pauset eller ferdig. */
  endsAt: number | null;
  /** Gjenstående tid i fasen mens tidtakeren står på pause. */
  remainingMs: number;
}

const ms = (p: Phase) => p.minutes * 60_000;

export function startRun(sessionId: string, phases: Phase[], now: number): FocusRun {
  return { sessionId, phases, index: 0, endsAt: phases.length ? now + ms(phases[0]) : null, remainingMs: 0 };
}

export const isFinished = (run: FocusRun) => run.index >= run.phases.length;

/** Går videre til riktig fase hvis tiden har løpt ut (også flere faser, f.eks. etter at fanen har vært lukket). */
export function catchUp(run: FocusRun, now: number): FocusRun {
  let { index, endsAt } = run;
  while (endsAt !== null && now >= endsAt) {
    index++;
    endsAt = index < run.phases.length ? endsAt + ms(run.phases[index]) : null;
  }
  return index === run.index ? run : { ...run, index, endsAt, remainingMs: 0 };
}

export function pauseRun(run: FocusRun, now: number): FocusRun {
  return run.endsAt === null ? run : { ...run, endsAt: null, remainingMs: Math.max(0, run.endsAt - now) };
}

export function resumeRun(run: FocusRun, now: number): FocusRun {
  return run.endsAt !== null || isFinished(run) ? run : { ...run, endsAt: now + run.remainingMs };
}

export function skipPhase(run: FocusRun, now: number): FocusRun {
  const index = run.index + 1;
  return { ...run, index, endsAt: index < run.phases.length ? now + ms(run.phases[index]) : null, remainingMs: 0 };
}

export function remainingMs(run: FocusRun, now: number): number {
  return run.endsAt === null ? run.remainingMs : Math.max(0, run.endsAt - now);
}
