const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function parts(iso: string): [year: number, month: number, day: number] {
  return [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];
}

function utcMillis(iso: string): number {
  const [year, month, day] = parts(iso);
  return Date.UTC(year, month - 1, day);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_DATE.test(value) &&
    isoDate(new Date(utcMillis(value))) === value
  );
}

/** Completed years; a 29 February birthday counts from 1 March in non-leap years. */
export function ageAt(dateOfBirth: string, today: string): number {
  const years = Number(today.slice(0, 4)) - Number(dateOfBirth.slice(0, 4));
  return today.slice(5) < dateOfBirth.slice(5) ? years - 1 : years;
}

export function addDays(iso: string, days: number): string {
  return isoDate(new Date(utcMillis(iso) + days * DAY_MS));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((utcMillis(to) - utcMillis(from)) / DAY_MS);
}

export function addYearsClamped(iso: string, years: number): string {
  const [year, month, day] = parts(iso);
  const lastDay = new Date(Date.UTC(year + years, month, 0)).getUTCDate();
  return isoDate(new Date(Date.UTC(year + years, month - 1, Math.min(day, lastDay))));
}

/** Inclusive range of birth dates for which `ageAt(dob, today) === age`. */
export function birthDateWindow(today: string, age: number): { earliest: string; latest: string } {
  return {
    earliest: addDays(addYearsClamped(today, -(age + 1)), 1),
    latest: addYearsClamped(today, -age),
  };
}
