import { useEffect, useState } from 'react';
import type { Course, Session } from '../types';
import { catchUp, isFinished, pauseRun, remainingMs, resumeRun, skipPhase, tipFor, type FocusRun } from '../lib/focus';
import { SESSION_KIND_LABEL } from '../lib/labels';
import type { Theme } from '../lib/themes';

interface Props {
  run: FocusRun;
  session?: Session;
  course?: Course;
  theme: Theme;
  onChange: (run: FocusRun) => void;
  onComplete: (sessionId: string) => void;
  onClose: () => void;
}

const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Et rolig to-tone-signal når en fase er over. */
function chime() {
  try {
    const ctx = new AudioContext();
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Lyd er ikke tilgjengelig; tidtakeren fungerer likevel.
  }
}

export function FocusTimer({ run, session, course, theme, onChange, onComplete, onClose }: Props) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);

  // Når tiden for en fase er ute, går vi videre (og varsler med lyd).
  useEffect(() => {
    const next = catchUp(run, now);
    if (next !== run) {
      chime();
      onChange(next);
    }
  }, [now, run, onChange]);

  const finished = isFinished(run);
  const phase = run.phases[Math.min(run.index, run.phases.length - 1)];
  const left = remainingMs(run, now);
  const paused = run.endsAt === null && !finished;
  const focusRounds = run.phases.filter((p) => p.kind === 'focus').length;
  const round = run.phases.slice(0, run.index + 1).filter((p) => p.kind === 'focus').length;

  useEffect(() => {
    const base = 'Eksamensklar';
    document.title = finished ? base : `${clock(left)} ${phase.kind === 'focus' ? 'Fokus' : 'Pause'} · ${base}`;
  }, [finished, left, phase.kind]);
  useEffect(() => () => void (document.title = 'Eksamensklar'), []);

  const style = { '--c': course?.color ?? 'var(--ink)' } as React.CSSProperties;

  if (finished) {
    return (
      <section className="card focus-timer done" style={style} aria-live="polite">
        <div className="focus-main">
          <div>
            <p className="focus-label">Økta er ferdig</p>
            <h2>
              {theme.doneTitle}
              {course ? ` · ${course.code}` : ''}
            </h2>
            <p className="muted">Ta en skikkelig pause før neste økt.</p>
          </div>
          <div className="focus-actions">
            {session && !session.completed && (
              <button
                className="btn primary"
                onClick={() => {
                  onComplete(session.id);
                  onClose();
                }}
              >
                Kryss av økta
              </button>
            )}
            <button className="btn" onClick={onClose}>
              Lukk
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`card focus-timer ${phase.kind}`} style={style} aria-live="polite">
      <div className="focus-main">
        <div className="focus-info">
          <p className="focus-label">
            {phase.kind === 'focus' ? `${theme.focusLabel} · runde ${round} av ${focusRounds}` : theme.breakLabel}
            {paused && ' · satt på pause'}
          </p>
          <p className="focus-course">
            <span className="dot" /> <span className="code">{course?.code}</span> {course?.name}
            {session && <span className="muted"> · {SESSION_KIND_LABEL[session.kind]}</span>}
          </p>
          <p className="focus-tip">{session ? tipFor(phase, run.index, session.kind) : ''}</p>
        </div>
        <div className={`focus-clock ${paused ? 'paused' : ''}`} role="timer">
          {clock(left)}
        </div>
      </div>

      <div className="focus-track" aria-hidden>
        {run.phases.map((p, i) => {
          const fill = i < run.index ? 1 : i > run.index ? 0 : 1 - left / (p.minutes * 60_000);
          return (
            <span key={i} className={`focus-seg ${p.kind}`} style={{ flexGrow: p.minutes }}>
              <span style={{ width: `${fill * 100}%` }} />
            </span>
          );
        })}
      </div>

      <div className="focus-actions">
        {paused ? (
          <button className="btn primary" onClick={() => onChange(resumeRun(run, Date.now()))}>
            Fortsett
          </button>
        ) : (
          <button className="btn primary" onClick={() => onChange(pauseRun(run, Date.now()))}>
            Pause
          </button>
        )}
        <button className="btn" onClick={() => onChange(skipPhase(run, Date.now()))}>
          {run.index === run.phases.length - 1 ? 'Ferdig med økta' : phase.kind === 'focus' ? 'Hopp til pause' : 'Hopp over pausen'}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            if (confirm('Avslutte tidtakeren for denne økta?')) onClose();
          }}
        >
          Avslutt
        </button>
      </div>
    </section>
  );
}
