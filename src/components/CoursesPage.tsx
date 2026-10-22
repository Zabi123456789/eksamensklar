import { useState } from 'react';
import type { Course, PlanWarning } from '../types';
import { CourseForm } from './CourseForm';
import { COURSE_TYPE_LABEL } from '../lib/labels';
import { formatDateTime } from '../lib/dates';
import { nextColor } from '../lib/colors';

interface Props {
  courses: Course[];
  warnings: PlanWarning[];
  onSave: (course: Course) => void;
  onDelete: (id: string) => void;
  onLoadDemo: () => void;
  onResetAll: () => void;
}

export function CoursesPage({ courses, warnings, onSave, onDelete, onLoadDemo, onResetAll }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = courses.find((c) => c.id === editingId);
  const sorted = [...courses].sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  const color = nextColor(courses.map((c) => c.color));

  return (
    <div className="stack">
      {editing ? (
        <CourseForm
          key={editing.id}
          initial={editing}
          color={editing.color}
          onSave={(c) => {
            onSave(c);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <CourseForm key="new" color={color} onSave={onSave} />
      )}

      <section className="card">
        <div className="row-between">
          <h2>Mine emner ({courses.length})</h2>
          <button className="btn" onClick={onLoadDemo}>
            Last inn eksempeldata
          </button>
        </div>

        {courses.length === 0 ? (
          <p className="muted">Ingen emner ennå. Legg til et emne over, eller trykk «Last inn eksempeldata» for å prøve appen.</p>
        ) : (
          <ul className="course-list">
            {sorted.map((c) => {
              const warn = warnings.find((w) => w.courseId === c.id);
              return (
                <li key={c.id} className="course-item" style={{ '--c': c.color } as React.CSSProperties}>
                  <div className="course-info">
                    <div className="session-title">
                      <span className="code">{c.code}</span> {c.name}
                    </div>
                    <div className="session-meta">
                      {COURSE_TYPE_LABEL[c.type]} · {formatDateTime(c.dateTime)}
                      {c.type === 'exam' && ` · ${c.durationHours} t`}
                    </div>
                    <div className="session-meta">
                      Estimat {c.estimatedHours} t · Vanskelighetsgrad {'●'.repeat(c.difficulty)}
                      {'○'.repeat(5 - c.difficulty)}
                    </div>
                    {warn && <div className="tag warn">Mangler {String(warn.missingHours).replace('.', ',')} t</div>}
                  </div>
                  <div className="course-actions">
                    <button className="btn small" onClick={() => setEditingId(c.id)}>
                      Rediger
                    </button>
                    <button
                      className="btn small danger"
                      onClick={() => {
                        if (confirm(`Slette ${c.code} ${c.name}? Øktene for emnet slettes også.`)) onDelete(c.id);
                      }}
                    >
                      Slett
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {courses.length > 0 && (
          <div className="actions">
            <button
              className="btn small danger ghost"
              onClick={() => {
                if (confirm('Slette alle emner, økter og innstillinger?')) onResetAll();
              }}
            >
              Slett alle data
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
