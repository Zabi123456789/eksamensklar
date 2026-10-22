import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppState, Course, Session, Settings } from './types';
import { emptyState, loadFocusRun, loadState, saveFocusRun, saveState } from './lib/storage';
import { buildPhases, startRun, type FocusRun } from './lib/focus';
import { replan, missedSessions } from './lib/planner';
import { formatDate, todayStr } from './lib/dates';
import { DEMO_COURSES } from './lib/demoData';
import { CoursesPage } from './components/CoursesPage';
import { TodayView } from './components/TodayView';
import { CalendarView } from './components/CalendarView';
import { SettingsForm } from './components/SettingsForm';
import { FocusTimer } from './components/FocusTimer';
import { themeFor, type ThemeId } from './lib/themes';
import { loadThemeImage, saveThemeImage } from './lib/images';

type Tab = 'today' | 'calendar' | 'courses' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'I dag' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'courses', label: 'Emner' },
  { id: 'settings', label: 'Innstillinger' },
];

/** Lager ny plan fra i dag; fullførte økter beholdes. */
function planned(state: AppState, today: string): AppState {
  const result = replan(state.courses, state.settings, state.sessions, today);
  return { ...state, sessions: result.sessions, warnings: result.warnings };
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>(() => (loadState().courses.length ? 'today' : 'courses'));
  const [toast, setToast] = useState<string | null>(null);
  const [focusRun, setFocusRun] = useState<FocusRun | null>(loadFocusRun);

  useEffect(() => saveState(state), [state]);
  useEffect(() => saveFocusRun(focusRun), [focusRun]);

  const theme = themeFor(state.settings.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme.id;
    if (theme.fonts && !document.getElementById(`font-${theme.id}`)) {
      const link = document.createElement('link');
      link.id = `font-${theme.id}`;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${theme.fonts}&display=swap`;
      document.head.appendChild(link);
    }
  }, [theme]);
  const [heroImage, setHeroImage] = useState<string | null>(() => loadThemeImage(theme.id));
  useEffect(() => setHeroImage(loadThemeImage(theme.id)), [theme.id]);
  const changeHeroImage = (dataUrl: string | null) => {
    if (!saveThemeImage(theme.id, dataUrl)) {
      setToast('Bildet er for stort til å lagres. Prøv et mindre bilde.');
      return;
    }
    setHeroImage(dataUrl);
    setToast(dataUrl ? 'Bildet er lagt til' : 'Bildet er fjernet');
  };

  const setTheme = (id: ThemeId) => setState((s) => ({ ...s, settings: { ...s.settings, theme: id } }));
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const today = state.settings.simulatedToday || todayStr();
  const courseMap = useMemo(() => new Map(state.courses.map((c) => [c.id, c])), [state.courses]);
  const missed = missedSessions(state.sessions, today);

  const updateCourses = (courses: Course[]) => setState((s) => planned({ ...s, courses }, today));

  const saveCourse = (course: Course) =>
    updateCourses(
      state.courses.some((c) => c.id === course.id)
        ? state.courses.map((c) => (c.id === course.id ? course : c))
        : [...state.courses, course],
    );

  const deleteCourse = (id: string) =>
    setState((s) => planned({ ...s, courses: s.courses.filter((c) => c.id !== id), sessions: s.sessions.filter((x) => x.courseId !== id) }, today));

  const loadDemo = () => {
    setState((s) => planned({ ...s, courses: DEMO_COURSES, sessions: [] }, today));
    setToast('Eksempeldata lastet inn og leseplan laget');
    setTab('today');
  };

  const resetAll = () => {
    setState(emptyState());
    setToast('Alle data er slettet');
  };

  const saveSettings = (form: Settings) => {
    const settings = { ...form, theme: state.settings.theme };
    const dateChanged = settings.simulatedToday !== state.settings.simulatedToday;
    const planChanged =
      settings.sessionMinutes !== state.settings.sessionMinutes ||
      settings.dayStart !== state.settings.dayStart ||
      settings.hoursPerWeekday.join() !== state.settings.hoursPerWeekday.join() ||
      (settings.daysOff ?? []).join() !== (state.settings.daysOff ?? []).join();
    // Å endre demodato simulerer at tiden går; da lages ikke planen på nytt automatisk.
    setState((s) => (planChanged ? planned({ ...s, settings }, settings.simulatedToday || todayStr()) : { ...s, settings }));
    if (planChanged) setToast('Innstillinger lagret og plan oppdatert');
    else if (dateChanged) setToast('Dato endret');
    else setToast('Innstillinger lagret');
  };

  const toggleDayOff = (date: string) => {
    const off = state.settings.daysOff ?? [];
    const isOff = off.includes(date);
    const daysOff = isOff ? off.filter((d) => d !== date) : [...off, date].sort();
    setState((s) => planned({ ...s, settings: { ...s.settings, daysOff } }, today));
    setToast(isOff ? 'Fridagen er fjernet og planen oppdatert' : 'Fridag lagt til. Øktene er flyttet til andre dager');
  };

  const toggleSession = (id: string) =>
    setState((s) => ({ ...s, sessions: s.sessions.map((x: Session) => (x.id === id ? { ...x, completed: !x.completed } : x)) }));

  const startFocus = (id: string) => {
    const session = state.sessions.find((s) => s.id === id);
    if (!session) return;
    const phases = buildPhases(session.minutes, state.settings.focusMinutes, state.settings.breakMinutes);
    setFocusRun(startRun(id, phases, Date.now()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const updateFocus = useCallback((run: FocusRun) => setFocusRun(run), []);
  const completeSession = (id: string) =>
    setState((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === id ? { ...x, completed: true } : x)) }));
  const focusSession = focusRun ? state.sessions.find((s) => s.id === focusRun.sessionId) : undefined;

  const replanNow = () => {
    const count = missed.length;
    setState((s) => planned(s, today));
    setToast(count ? `${count} glemte økter er fordelt på nytt` : 'Planen er oppdatert');
  };

  return (
    <div className={heroImage || theme.id !== 'classic' ? 'app has-hero' : 'app'}>
      {heroImage ? (
        <div className="hero" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden />
      ) : (
        theme.id !== 'classic' && <div className="hero" aria-hidden />
      )}
      <header className="topbar">
        <div className="brand">
          <h1>Eksamensklar</h1>
          <p className="tagline">{theme.tagline}</p>
        </div>
        <div className="topbar-date">
          <span className="capitalize">{formatDate(today)}</span>
          {state.settings.simulatedToday && <span className="sim-badge">Demodato</span>}
        </div>
      </header>

      <div className="theme-band" aria-hidden />
      <nav className="tabs" aria-label="Hovedmeny">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'tab active' : 'tab'} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {focusRun && (
          <FocusTimer
            run={focusRun}
            session={focusSession}
            course={focusSession ? courseMap.get(focusSession.courseId) : undefined}
            theme={theme}
            onChange={updateFocus}
            onComplete={completeSession}
            onClose={() => setFocusRun(null)}
          />
        )}
        {tab === 'today' && (
          <TodayView
            today={today}
            courses={state.courses}
            courseMap={courseMap}
            sessions={state.sessions}
            warnings={state.warnings}
            missedCount={missed.length}
            onToggle={toggleSession}
            onStart={startFocus}
            activeSessionId={focusRun?.sessionId}
            onReplan={replanNow}
            onGoToCourses={() => setTab('courses')}
          />
        )}
        {tab === 'calendar' && (
          <CalendarView
            today={today}
            courses={state.courses}
            courseMap={courseMap}
            sessions={state.sessions}
            daysOff={state.settings.daysOff ?? []}
            onToggle={toggleSession}
            onToggleDayOff={toggleDayOff}
          />
        )}
        {tab === 'courses' && (
          <CoursesPage
            courses={state.courses}
            warnings={state.warnings}
            onSave={saveCourse}
            onDelete={deleteCourse}
            onLoadDemo={loadDemo}
            onResetAll={resetAll}
          />
        )}
        {tab === 'settings' && <SettingsForm
            settings={state.settings}
            onSave={saveSettings}
            onTheme={setTheme}
            themeName={theme.name}
            heroImage={heroImage}
            onHeroImage={changeHeroImage}
          />}
      </main>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
