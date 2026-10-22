import type { Course, Session } from '../types';
import { formatDateTime, formatHours, splitDateTime, toLocalDate } from '../lib/dates';
import { COURSE_TYPE_LABEL } from '../lib/labels';

interface Props {
  courses: Course[];
  sessions: Session[];
  now: Date;
}

function countdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime();
  if (ms <= 0) return 'Passert';
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days >= 2) return `${days} dager`;
  if (days === 1) return `1 dag ${hours} t`;
  return `${hours} t ${mins} min`;
}

export function CountdownList({ courses, sessions, now }: Props) {
  const sorted = [...courses].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  return (
    <section className="card">
      <h2>Nedtelling og fremdrift</h2>
      <ul className="countdown-list">
        {sorted.map((c) => {
          const { date, time } = splitDateTime(c.dateTime);
          const own = sessions.filter((s) => s.courseId === c.id);
          const doneH = own.filter((s) => s.completed).reduce((a, s) => a + s.minutes, 0) / 60;
          const plannedH = own.reduce((a, s) => a + s.minutes, 0) / 60;
          const pct = Math.min(100, Math.round((doneH / c.estimatedHours) * 100));
          const left = countdown(toLocalDate(date, time), now);
          return (
            <li key={c.id} style={{ '--c': c.color } as React.CSSProperties}>
              <div className="row-between">
                <div>
                  <span className="dot" /> <span className="code">{c.code}</span> {c.name}
                  <div className="session-meta">
                    {COURSE_TYPE_LABEL[c.type]} · {formatDateTime(c.dateTime)}
                  </div>
                </div>
                <div className={`countdown ${left === 'Passert' ? 'past' : ''}`}>
                  {left === 'Passert' ? (c.type === 'exam' ? 'Gjennomført' : 'Levert') : `om ${left}`}
                </div>
              </div>
              <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="session-meta">
                {formatHours(doneH)} av {formatHours(c.estimatedHours)} fullført ({pct} %) · {formatHours(plannedH)} i planen
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
