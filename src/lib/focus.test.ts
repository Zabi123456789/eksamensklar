import { describe, expect, it } from 'vitest';
import { buildPhases, catchUp, describePhases, isFinished, pauseRun, remainingMs, resumeRun, skipPhase, startRun } from './focus';

const minutes = (phases: ReturnType<typeof buildPhases>) => phases.map((p) => `${p.kind[0]}${p.minutes}`).join(' ');
const total = (phases: ReturnType<typeof buildPhases>) => phases.reduce((sum, p) => sum + p.minutes, 0);

describe('buildPhases', () => {
  it('deler 90 min med Pomodoro i fokus og pauser, og slutter med fokus', () => {
    const p = buildPhases(90, 25, 5);
    expect(minutes(p)).toBe('f25 b5 f25 b5 f30');
    expect(total(p)).toBe(90);
  });

  it('50/10 i en 90-minutters økt', () => {
    expect(minutes(buildPhases(90, 50, 10))).toBe('f50 b10 f30');
  });

  it('kortere økt enn en fokusrunde blir ett strekk', () => {
    expect(minutes(buildPhases(20, 25, 5))).toBe('f20');
  });

  it('dypt arbeid (ingen pause) gir hele økta som én runde', () => {
    expect(minutes(buildPhases(120, 0, 0))).toBe('f120');
  });

  it('bruker alltid nøyaktig hele økta', () => {
    for (const len of [30, 45, 60, 75, 90, 120]) {
      for (const [f, b] of [[25, 5], [50, 10], [52, 17]]) expect(total(buildPhases(len, f, b))).toBe(len);
    }
  });

  it('beskriver rundene', () => {
    expect(describePhases(buildPhases(90, 25, 5))).toBe('3 fokusrunder · 2 pauser');
    expect(describePhases(buildPhases(90, 0, 0))).toBe('Ett fokusstrekk');
  });
});

describe('tidtaker', () => {
  const MIN = 60_000;
  const phases = buildPhases(60, 25, 5); // f25 b5 f30
  const run = startRun('s1', phases, 0);

  it('går til pause når fokusrunden er over', () => {
    expect(catchUp(run, 24 * MIN).index).toBe(0);
    const next = catchUp(run, 25 * MIN);
    expect(next.index).toBe(1);
    expect(remainingMs(next, 25 * MIN)).toBe(5 * MIN);
  });

  it('tar igjen flere faser etter at fanen har vært lukket', () => {
    expect(catchUp(run, 31 * MIN).index).toBe(2);
    expect(isFinished(catchUp(run, 60 * MIN))).toBe(true);
  });

  it('pause og fortsett beholder gjenstående tid', () => {
    const paused = pauseRun(run, 10 * MIN);
    expect(catchUp(paused, 100 * MIN).index).toBe(0);
    const resumed = resumeRun(paused, 100 * MIN);
    expect(remainingMs(resumed, 100 * MIN)).toBe(15 * MIN);
  });

  it('hopp over starter neste fase med full tid', () => {
    const skipped = skipPhase(run, 3 * MIN);
    expect(skipped.index).toBe(1);
    expect(remainingMs(skipped, 3 * MIN)).toBe(5 * MIN);
  });
});
