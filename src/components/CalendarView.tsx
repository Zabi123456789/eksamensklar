import { useState } from 'react';
import type { Course, Session } from '../types';
import { addDays, formatHours, splitDateTime, weekdayIndex } from '../lib/dates';
import { SESSION_KIND_LABEL, WEEKDAYS_SHORT } from '../lib/labels';

interface Props {
  today: string;
  courses: Course[];
  courseMap: Map<string, Course>;
  sessions: Session[];
  daysOff: string[];
  onToggle: (id: string) => void;
  onToggleDayOff: (date: string) => void;
}

const shortDate = (date: string) => {
  const [, m, d] = date.split('-');
  return `${Number(d)}.${Number(m)}.`;
};

const sumHours = (list: Session[]) => list.reduce((sum, s) => sum + s.minutes, 0) / 60;

export function CalendarView({ today, courses, courseMap, sessions, daysOff, onToggle, onToggleDayOff }: Props) {
  const [showPast, setShowPast] = useState(false);

  if (courses.length === 0) {
    return <div className="card empty">Ingen emner ennå. Legg til emner for å se kalenderen.</div>;
  }

  const lastDeadline = courses.map((c) => splitDateTime(c.dateTime).date).sort().at(-1)!;
  const firstSession = sessions.map((s) => s.date).sort()[0];
  const startDay = showPast && firstSession && firstSession < today ? firstSession : today;
  const start = addDays(startDay, -weekdayIndex(startDay));
  const end = lastDeadline > today ? lastDeadline : today;
  const hasPastWeeks = !!firstSession && firstSession < addDays(today, -weekdayIndex(today));

  const weeks: string[][] = [];
  for (let d = start; d <= end || weekdayIndex(d) !== 0; d = addDays(d, 1)) {
    if (weekdayIndex(d) === 0) weeks.push([]);
    weeks[weeks.length - 1].push(d);
  }

  const byDate = new Map<string, Session[]>();
  for (const s of sessions) byDate.set(s.date, [...(byDate.get(s.date) ?? []), s]);
  const eventsByDate = new Map<string, Course[]>();
  for (const c of courses) {
    const d = splitDateTime(c.dateTime).date;
    eventsByDate.set(d, [...(eventsByDate.get(d) ?? []), c]);
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="row-between">
          <h2>Kalender</h2>
          {hasPastWeeks && (
            <button className="btn small ghost" onClick={() => setShowPast((v) => !v)}>
              {showPast ? 'Skjul tidligere uker' : 'Vis tidligere uker'}
            </button>
          )}
        </div>
        <div className="legend">
          {courses.map((c) => (
            <span key={c.id} className="legend-item" style={{ '--c': c.color } as React.CSSProperties}>
              <span className="dot" /> {c.code}
            </span>
          ))}
          <span className="legend-sep" aria-hidden />
          {(['study', 'project', 'review'] as const).map((k) => (
            <span key={k} className="legend-item muted">
              <span className="kind-badge">{SESSION_KIND_LABEL[k][0]}</span> {SESSION_KIND_LABEL[k]}
            </span>
          ))}
        </div>
        <p className="muted small">Trykk på en økt for å krysse den av, eller på «Fri» for å ta fri en dag.</p>
      </section>

      {weeks.map((week) => {
        const weekSessions = week.flatMap((d) => byDate.get(d) ?? []);
        return (
          <section key={week[0]} className="card week">
            <div className="week-head">
              <h3>
                Uke {isoWeek(week[0])} <span className="muted small">{shortDate(week[0])}–{shortDate(week[6])}</span>
              </h3>
              {weekSessions.length > 0 && (
                <div className="week-summary">
                  {courses.map((c) => {
                    const h = sumHours(weekSessions.filter((s) => s.courseId === c.id));
                    return h > 0 ? (
                      <span key={c.id} className="legend-item small" style={{ '--c': c.color } as React.CSSProperties}>
                        <span className="dot" /> {formatHours(h)}
                      </span>
                    ) : null;
                  })}
                  <span className="week-total-label">Totalt</span>
                  <span className="week-total">{formatHours(sumHours(weekSessions))}</span>
                </div>
              )}
            </div>
            <div className="week-grid">
              {week.map((d) => {
                const list = (byDate.get(d) ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime));
                const events = eventsByDate.get(d) ?? [];
                const off = daysOff.includes(d);
                const past = d < today;
                const cls = ['day', d === today ? 'today' : '', past ? 'past' : '', off ? 'off' : '', list.length === 0 && events.length === 0 && !off ? 'empty-day' : '']
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div key={d} className={cls} aria-current={d === today ? 'date' : undefined}>
                    <div className="day-head">
                      <span className="day-name">{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
                      <span className="day-date">{shortDate(d)}</span>
                      <span className="day-tools">
                        {list.length > 0 && <span className="day-hours">{formatHours(sumHours(list))}</span>}
                        {!past && (
                          <button
                            className={`dayoff-btn ${off ? 'on' : ''}`}
                            title={off ? 'Fjern fridag' : 'Gjør til fridag'}
                            aria-label={off ? `Fjern fridag ${shortDate(d)}` : `Gjør ${shortDate(d)} til fridag`}
                            aria-pressed={off}
                            onClick={() => onToggleDayOff(d)}
                          >
                            Fri
                          </button>
                        )}
                      </span>
                    </div>
                    {events.map((c) => (
                      <div key={c.id} className="event" style={{ '--c': c.color } as React.CSSProperties}>
                        <span className="event-kind">{c.type === 'exam' ? 'Eksamen' : 'Frist'}</span>
                        <span className="event-code">{c.code}</span>
                        <span className="event-time">{splitDateTime(c.dateTime).time}</span>
                      </div>
                    ))}
                    {off && <div className="off-label">Fridag</div>}
                    {list.map((s) => {
                      const c = courseMap.get(s.courseId);
                      return (
                        <button
                          key={s.id}
                          className={`chip ${s.completed ? 'done' : ''}`}
                          style={{ '--c': c?.color } as React.CSSProperties}
                          title={`${c?.code} ${c?.name} – ${SESSION_KIND_LABEL[s.kind]} kl. ${s.startTime}, ${s.minutes} min`}
                          onClick={() => onToggle(s.id)}
                        >
                          <span className="chip-code">{c?.code}</span>
                          <span className="chip-time">{s.startTime}</span>
                          <span className="kind-badge">{s.completed ? '✓' : SESSION_KIND_LABEL[s.kind][0]}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function isoWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}
