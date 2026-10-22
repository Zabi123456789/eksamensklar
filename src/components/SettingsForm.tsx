import { useState } from 'react';
import type { Settings } from '../types';
import { WEEKDAYS } from '../lib/labels';
import { formatDate } from '../lib/dates';
import { THEMES, type ThemeId } from '../lib/themes';
import { resizeImage } from '../lib/images';
import { STUDY_METHODS, buildPhases, describePhases, methodFor } from '../lib/focus';

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
  onTheme: (id: ThemeId) => void;
  themeName: string;
  heroImage: string | null;
  onHeroImage: (dataUrl: string | null) => void;
}

export function SettingsForm({ settings, onSave, onTheme, themeName, heroImage, onHeroImage }: Props) {
  const [hours, setHours] = useState(settings.hoursPerWeekday.map(String));
  const [sessionMinutes, setSessionMinutes] = useState(settings.sessionMinutes);
  const [dayStart, setDayStart] = useState(settings.dayStart);
  const [simulated, setSimulated] = useState(settings.simulatedToday ?? '');
  const [daysOff, setDaysOff] = useState(settings.daysOff ?? []);
  const [newDayOff, setNewDayOff] = useState('');
  const [focus, setFocus] = useState(String(settings.focusMinutes));
  const [brk, setBrk] = useState(String(settings.breakMinutes));
  const focusMin = Math.max(0, Math.min(180, Math.round(Number(focus) || 0)));
  const breakMin = focusMin > 0 ? Math.max(0, Math.min(60, Math.round(Number(brk) || 0))) : 0;
  const method = methodFor(focusMin, breakMin);

  const addDayOff = () => {
    if (newDayOff && !daysOff.includes(newDayOff)) setDaysOff([...daysOff, newDayOff].sort());
    setNewDayOff('');
  };

  const parsed = hours.map((h) => Math.max(0, Math.min(14, Number(h.replace(',', '.')) || 0)));
  const weekly = parsed.reduce((a, b) => a + b, 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ hoursPerWeekday: parsed, sessionMinutes, dayStart: dayStart || '09:00', simulatedToday: simulated || undefined, daysOff, focusMinutes: focusMin, breakMinutes: breakMin });
  };

  return (
    <form className="stack" onSubmit={save}>
      <section className="card">
        <h2>Tema</h2>
        <p className="muted">Velg utseende. Temaet byttes med en gang.</p>
        <div className="theme-grid" role="radiogroup" aria-label="Tema">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={(settings.theme ?? 'classic') === t.id}
              className={`theme-option ${(settings.theme ?? 'classic') === t.id ? 'active' : ''}`}
              onClick={() => onTheme(t.id)}
            >
              <span className="theme-swatch" style={{ background: t.swatch[0] }}>
                <span style={{ background: t.swatch[1] }} />
                <span style={{ background: t.swatch[2] }} />
              </span>
              <span className="theme-name">{t.name}</span>
            </button>
          ))}
        </div>

        <div className="hero-picker">
          {heroImage && <img src={heroImage} alt="" className="hero-preview" />}
          <div>
            <h3>Bilde for {themeName}</h3>
            <p className="muted small">
              Vises øverst i appen når dette temaet er valgt. Hvert tema kan ha sitt eget bilde. Bildet lagres bare i denne nettleseren.
            </p>
            <div className="actions">
              <label className="btn small file-btn">
                {heroImage ? 'Bytt bilde' : 'Velg bilde'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    const url = file ? await resizeImage(file).catch(() => null) : null;
                    if (url) onHeroImage(url);
                  }}
                />
              </label>
              {heroImage && (
                <button type="button" className="btn small ghost danger" onClick={() => onHeroImage(null)}>
                  Fjern bilde
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card form">
        <h2>Lesetid</h2>
        <p className="muted">Hvor mange timer kan du lese hver ukedag?</p>
        <div className="weekday-grid">
          {WEEKDAYS.map((day, i) => (
            <label key={day}>
              {day}
              <input
                type="number"
                inputMode="decimal"
                min="0"
                max="14"
                step="0.5"
                value={hours[i]}
                onChange={(e) => setHours((h) => h.map((v, j) => (j === i ? e.target.value : v)))}
              />
            </label>
          ))}
        </div>
        <div className="actions">
          <button type="button" className="btn small" onClick={() => setHours(['3', '3', '3', '3', '3', '5', '5'])}>
            3 t hverdager / 5 t helg
          </button>
        </div>
        <p className="muted small">Totalt {String(weekly).replace('.', ',')} timer per uke.</p>

        <div className="grid-2">
          <label>
            Øktlengde
            <select value={sessionMinutes} onChange={(e) => setSessionMinutes(Number(e.target.value))}>
              {[45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m} min{m === 90 ? ' (standard)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tidligste start på dagen
            <input type="time" value={dayStart} onChange={(e) => setDayStart(e.target.value)} />
          </label>
        </div>
        <p className="muted small">Økter legges med 15 min pause mellom, og slutter senest kl. 22:00. Antall økter per dag rundes ned (3 t med 90 min = 2 økter).</p>
      </section>

      <section className="card form">
        <h2>Lesestrategi</h2>
        <p className="muted">Hvordan vil du jobbe inne i en økt? Under «I dag» kan du starte en økt med tidtaker.</p>
        <fieldset className="segmented">
          <legend>Strategi</legend>
          {STUDY_METHODS.map((m) => (
            <label key={m.id} className={method?.id === m.id ? 'seg active' : 'seg'}>
              <input
                type="radio"
                name="method"
                checked={method?.id === m.id}
                onChange={() => {
                  setFocus(String(m.focus));
                  setBrk(String(m.break));
                }}
              />
              {m.label}
            </label>
          ))}
          <label className={method ? 'seg' : 'seg active'}>
            <input
              type="radio"
              name="method"
              checked={!method}
              onChange={() => {
                setFocus('40');
                setBrk('8');
              }}
            />
            Egendefinert
          </label>
        </fieldset>
        <p className="muted small">{method ? method.description : 'Velg selv hvor lenge du vil fokusere og ta pause.'}</p>
        {!method && (
          <div className="grid-2">
            <label>
              Fokus (min)
              <input type="number" inputMode="numeric" min="5" max="180" step="5" value={focus} onChange={(e) => setFocus(e.target.value)} />
            </label>
            <label>
              Pause (min)
              <input type="number" inputMode="numeric" min="0" max="60" step="1" value={brk} onChange={(e) => setBrk(e.target.value)} />
            </label>
          </div>
        )}
        <p className="muted small">
          En økt på {sessionMinutes} min blir: {describePhases(buildPhases(sessionMinutes, focusMin, breakMin)).toLowerCase()}.
        </p>
      </section>

      <section className="card form">
        <h2>Fridager</h2>
        <p className="muted">Dager du ikke vil lese i det hele tatt. Timene flyttes til andre dager. Du kan også trykke «Fri» på en dag i kalenderen.</p>
        <div className="grid-2">
          <label>
            Velg dato
            <input type="date" value={newDayOff} onChange={(e) => setNewDayOff(e.target.value)} />
          </label>
          <div className="actions end">
            <button type="button" className="btn small" onClick={addDayOff} disabled={!newDayOff}>
              Legg til fridag
            </button>
          </div>
        </div>
        {daysOff.length > 0 ? (
          <ul className="dayoff-list">
            {daysOff.map((d) => (
              <li key={d} className="dayoff-tag">
                <span className="capitalize">{formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                <button type="button" aria-label={`Fjern fridag ${d}`} onClick={() => setDaysOff(daysOff.filter((x) => x !== d))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Ingen fridager lagt til.</p>
        )}
      </section>

      <section className="card form">
        <h2>Demodato</h2>
        <p className="muted">
          For å vise appen kan du late som om det er en annen dag. Kryss av noen økter, flytt datoen frem, og trykk «Planlegg på nytt» for å se at glemte økter fordeles på nytt.
        </p>
        <div className="grid-2">
          <label>
            Simulert dato
            <input type="date" value={simulated} onChange={(e) => setSimulated(e.target.value)} />
          </label>
          <div className="actions end">
            <button type="button" className="btn small" onClick={() => setSimulated('')}>
              Bruk dagens dato
            </button>
          </div>
        </div>
      </section>

      <div className="actions sticky-save">
        <button type="submit" className="btn primary">
          Lagre innstillinger
        </button>
      </div>
    </form>
  );
}
