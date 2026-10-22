import type { Course, PlanWarning, Session } from '../types';
import { examEndMin } from '../lib/planner';
import { formatDate, minToTime, splitDateTime, toLocalDate, todayStr } from '../lib/dates';
import { SessionItem } from './SessionItem';
import { Warnings } from './Warnings';
import { CountdownList } from './CountdownList';

interface Props {
  today: string;
  courses: Course[];
  courseMap: Map<string, Course>;
  sessions: Session[];
  warnings: PlanWarning[];
  missedCount: number;
  onToggle: (id: string) => void;
  onStart: (id: string) => void;
  activeSessionId?: string;
  onReplan: () => void;
  onGoToCourses: () => void;
}

export function TodayView({ today, courses, courseMap, sessions, warnings, missedCount, onToggle, onStart, activeSessionId, onReplan, onGoToCourses }: Props) {
  if (courses.length === 0) {
    return (
      <div className="card empty">
        <h2>Velkommen til Eksamensklar</h2>
        <p>Legg inn eksamener og innleveringer, så lager appen en personlig leseplan for deg.</p>
        <button className="btn primary" onClick={onGoToCourses}>
          Legg til emner
        </button>
      </div>
    );
  }

  const todays = sessions.filter((s) => s.date === today);
  const done = todays.filter((s) => s.completed).length;
  const eventsToday = courses.filter((c) => splitDateTime(c.dateTime).date === today);
  const reviewCourse = todays.length > 0 && todays.every((s) => s.kind === 'review') ? courseMap.get(todays[0].courseId) : undefined;

  const now = new Date();
  // Med demodato teller vi ned fra demodatoen, men med dagens klokkeslett.
  const nowForCountdown = today === todayStr() ? now : toLocalDate(today, `${now.getHours()}:${now.getMinutes()}`);

  return (
    <div className="stack">
      <section className="card">
        <div className="row-between">
          <div>
            <h2 className="capitalize">{formatDate(today)}</h2>
            <p className="muted">{todays.length ? `${done} av ${todays.length} økter fullført` : 'Ingen økter planlagt i dag'}</p>
          </div>
          {todays.length > 0 && <div className="big-number">{Math.round((done / todays.length) * 100)} %</div>}
        </div>

        {eventsToday.map((c) => (
          <div key={c.id} className="banner" style={{ '--c': c.color } as React.CSSProperties}>
            {c.type === 'exam' ? (
              <>
                <b>Eksamen i dag:</b> {c.code} {c.name}, kl. {splitDateTime(c.dateTime).time}–{minToTime(examEndMin(c))}. Lykke til!
              </>
            ) : (
              <>
                <b>Frist i dag:</b> {c.code} {c.name} kl. {splitDateTime(c.dateTime).time}
              </>
            )}
          </div>
        ))}
        {reviewCourse && (
          <div className="banner" style={{ '--c': reviewCourse.color } as React.CSSProperties}>
            <b>Repetisjonsdag:</b> i dag repeterer du bare {reviewCourse.code} før eksamen i morgen.
          </div>
        )}

        <div className="session-list">
          {todays.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              course={courseMap.get(s.courseId)}
              onToggle={onToggle}
              onStart={onStart}
              active={s.id === activeSessionId}
            />
          ))}
        </div>
      </section>

      <section className={`card replan ${missedCount ? 'attention' : ''}`}>
        <div className="row-between">
          <div>
            <h2>Planlegg på nytt</h2>
            <p className="muted">
              {missedCount
                ? `Du har ${missedCount} ${missedCount === 1 ? 'økt' : 'økter'} fra tidligere dager som ikke er krysset av. De kan fordeles utover de gjenværende dagene.`
                : 'Alle tidligere økter er krysset av. Bra jobba!'}
            </p>
          </div>
          <button className="btn primary" onClick={onReplan}>
            Planlegg på nytt
          </button>
        </div>
      </section>

      <Warnings warnings={warnings} courseMap={courseMap} />
      <CountdownList courses={courses} sessions={sessions} now={nowForCountdown} />
    </div>
  );
}
