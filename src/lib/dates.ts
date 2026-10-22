// Datoer håndteres som lokale strenger ("YYYY-MM-DD" og "HH:mm") for å unngå
// tidssonefeil. Dato-aritmetikk gjøres i UTC, der det ikke finnes sommertid.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  const t = new Date(toUtc(date) + n * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Antall dager fra a til b (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** 0 = mandag … 6 = søndag */
export function weekdayIndex(date: string): number {
  return (new Date(toUtc(date)).getUTCDay() + 6) % 7;
}

export function timeToMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function splitDateTime(dateTime: string): { date: string; time: string } {
  const [date, time = '00:00'] = dateTime.split('T');
  return { date, time: time.slice(0, 5) };
}

/** Lokal Date for visning/nedtelling. */
export function toLocalDate(date: string, time = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return toLocalDate(date).toLocaleDateString('nb-NO', opts);
}

export function formatDateTime(dateTime: string): string {
  const { date, time } = splitDateTime(dateTime);
  return `${formatDate(date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} kl. ${time}`;
}

export function formatHours(hours: number): string {
  const r = Math.round(hours * 10) / 10;
  return `${String(r).replace('.', ',')} t`;
}
