import type { StoredCalendar, ZmanimData } from '@/types';

export const SUNRISE_KEY = 'visible_sunrise';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SUNRISE_RE = /^(\d{1,2}):(\d{2}):(\d{2})$/;

export type CalendarErrorCode = 'invalidJson' | 'invalidFormat' | 'noSunrise' | 'isStepsFile';

export class CalendarError extends Error {
  constructor(public readonly code: CalendarErrorCode) {
    super(code);
  }
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Local (device) date as "YYYY-MM-DD". Never use UTC here. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Validates an imported calendar file and returns it ready to store.
 * Throws CalendarError with a code that maps to an i18n key.
 */
export function parseCalendar(text: string, fileName: string): StoredCalendar {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new CalendarError('invalidJson');
  }

  if (raw && typeof raw === 'object' && (raw as { kind?: unknown }).kind === 'netz.steps') {
    throw new CalendarError('isStepsFile');
  }

  const data = raw as Partial<ZmanimData> | null;
  if (!data || typeof data !== 'object' || typeof data.days !== 'object' || data.days === null) {
    throw new CalendarError('invalidFormat');
  }

  const dateKeys = Object.keys(data.days).filter((key) => DATE_KEY_RE.test(key)).sort();
  const withSunrise = dateKeys.filter((key) => SUNRISE_RE.test(data.days?.[key]?.times?.[SUNRISE_KEY] ?? ''));
  if (withSunrise.length === 0) {
    throw new CalendarError('noSunrise');
  }

  return {
    fileName,
    importedAt: new Date().toISOString(),
    firstDate: withSunrise[0],
    lastDate: withSunrise[withSunrise.length - 1],
    data: data as ZmanimData
  };
}

/**
 * Visible sunrise for the given local date, or null if the calendar has no value.
 * Values are "H:MM:SS", 12-hour without AM/PM; sunrise is always in the morning.
 */
export function sunriseFor(data: ZmanimData, date: Date): Date | null {
  const value = data.days[toDateKey(date)]?.times?.[SUNRISE_KEY];
  const match = SUNRISE_RE.exec(value ?? '');
  if (!match) return null;

  const [, hours, minutes, seconds] = match.map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, seconds);
}

export function hebrewDateFor(data: ZmanimData, date: Date): string | undefined {
  return data.days[toDateKey(date)]?.hebrewDate;
}
