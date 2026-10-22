import { useState } from 'react';
import type { Course, CourseType } from '../types';

interface Props {
  initial?: Course;
  color: string;
  onSave: (course: Course) => void;
  onCancel?: () => void;
}

interface FormState {
  code: string;
  name: string;
  type: CourseType;
  dateTime: string;
  durationHours: string;
  estimatedHours: string;
  difficulty: number;
}

const toForm = (c?: Course): FormState => ({
  code: c?.code ?? '',
  name: c?.name ?? '',
  type: c?.type ?? 'exam',
  dateTime: c?.dateTime ?? '',
  durationHours: c?.durationHours != null ? String(c.durationHours) : '3',
  estimatedHours: c ? String(c.estimatedHours) : '20',
  difficulty: c?.difficulty ?? 3,
});

const num = (s: string) => Number(s.replace(',', '.'));

export function CourseForm({ initial, color, onSave, onCancel }: Props) {
  const [f, setF] = useState<FormState>(() => toForm(initial));
  const [errors, setErrors] = useState<string[]>([]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setF((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!f.code.trim()) errs.push('Emnekode må fylles ut.');
    if (!f.name.trim()) errs.push('Navn må fylles ut.');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(f.dateTime)) errs.push('Velg dato og klokkeslett.');
    if (f.type === 'exam' && !(num(f.durationHours) > 0)) errs.push('Varighet må være større enn 0.');
    if (!(num(f.estimatedHours) > 0)) errs.push('Estimert arbeid må være større enn 0 timer.');
    setErrors(errs);
    if (errs.length) return;

    onSave({
      id: initial?.id ?? `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      code: f.code.trim().toUpperCase(),
      name: f.name.trim(),
      type: f.type,
      dateTime: f.dateTime.slice(0, 16),
      durationHours: f.type === 'exam' ? num(f.durationHours) : undefined,
      estimatedHours: num(f.estimatedHours),
      difficulty: f.difficulty,
      color: initial?.color ?? color,
    });
    if (!initial) setF(toForm());
  };

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h2>{initial ? `Rediger ${initial.code}` : 'Legg til emne'}</h2>

      <div className="grid-2">
        <label>
          Emnekode
          <input value={f.code} onChange={(e) => set('code', e.target.value)} placeholder="f.eks. DAVE3625" />
        </label>
        <label>
          Navn
          <input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="f.eks. Kunstig intelligens" />
        </label>
      </div>

      <fieldset className="segmented">
        <legend>Type</legend>
        {(['exam', 'assignment'] as const).map((t) => (
          <label key={t} className={f.type === t ? 'seg active' : 'seg'}>
            <input type="radio" name="type" checked={f.type === t} onChange={() => set('type', t)} />
            {t === 'exam' ? 'Skoleeksamen' : 'Innlevering/prosjekt'}
          </label>
        ))}
      </fieldset>

      <div className="grid-2">
        <label>
          {f.type === 'exam' ? 'Dato og klokkeslett' : 'Frist (dato og klokkeslett)'}
          <input type="datetime-local" value={f.dateTime} onChange={(e) => set('dateTime', e.target.value)} />
        </label>
        {f.type === 'exam' && (
          <label>
            Varighet (timer)
            <input type="number" inputMode="decimal" min="0.5" step="0.5" value={f.durationHours} onChange={(e) => set('durationHours', e.target.value)} />
          </label>
        )}
      </div>

      <div className="grid-2">
        <label>
          Estimert arbeid (timer)
          <input type="number" inputMode="decimal" min="1" step="0.5" value={f.estimatedHours} onChange={(e) => set('estimatedHours', e.target.value)} />
        </label>
        <label>
          <span>
            Vanskelighetsgrad: <b>{f.difficulty}</b> / 5
          </span>
          <input type="range" min="1" max="5" step="1" value={f.difficulty} onChange={(e) => set('difficulty', Number(e.target.value))} />
          <span className="range-labels">
            <span>Lett</span>
            <span>Vanskelig</span>
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        <button type="submit" className="btn primary">
          {initial ? 'Lagre endringer' : 'Legg til emne'}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
