import type { Course, PlanWarning } from '../types';
import { formatHours } from '../lib/dates';

interface Props {
  warnings: PlanWarning[];
  courseMap: Map<string, Course>;
}

export function Warnings({ warnings, courseMap }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className="warning-box" role="alert">
      <strong>Ikke nok tid til alt</strong>
      <ul>
        {warnings.map((w) => {
          const c = courseMap.get(w.courseId);
          return (
            <li key={w.courseId}>
              <b>{c?.code}</b> {c?.name} mangler <b>{formatHours(w.missingHours)}</b> før {c?.type === 'exam' ? 'eksamen' : 'fristen'}.
            </li>
          );
        })}
      </ul>
      <p className="muted small">Tips: øk antall lesetimer per dag under Innstillinger, eller juster estimatet.</p>
    </div>
  );
}
