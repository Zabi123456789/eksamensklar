import type { Course, Session } from '../types';
import { minToTime, timeToMin } from '../lib/dates';
import { SESSION_KIND_LABEL } from '../lib/labels';

interface Props {
  session: Session;
  course?: Course;
  onToggle: (id: string) => void;
  onStart?: (id: string) => void;
  active?: boolean;
}

export function SessionItem({ session, course, onToggle, onStart, active }: Props) {
  const end = minToTime(timeToMin(session.startTime) + session.minutes);
  return (
    <label className={`session ${session.completed ? 'done' : ''}`} style={{ '--c': course?.color } as React.CSSProperties}>
      <input type="checkbox" checked={session.completed} onChange={() => onToggle(session.id)} aria-label="Fullført" />
      <div className="session-body">
        <div className="session-title">
          <span className="dot" /> <span className="code">{course?.code}</span> {course?.name}
        </div>
        <div className="session-meta">
          {session.startTime}–{end} · {session.minutes} min ·{' '}
          <span className={`kind kind-${session.kind}`}>{SESSION_KIND_LABEL[session.kind]}</span>
        </div>
      </div>
      {active ? (
        <span className="session-live">Pågår</span>
      ) : (
        onStart &&
        !session.completed && (
          <button
            type="button"
            className="btn small"
            onClick={(e) => {
              e.preventDefault();
              onStart(session.id);
            }}
          >
            Start økt
          </button>
        )
      )}
    </label>
  );
}
