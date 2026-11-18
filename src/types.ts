export type AppLocale = 'en' | 'fr';

export interface ZmanimDay {
  hebrewDate?: string;
  times: Record<string, string>;
}

export interface ZmanimSource {
  firstDate?: string;
  lastDate?: string;
  days?: number;
  generatedAt?: string;
}

/** Shape of the calendar JSON produced by the Apple Shortcut from the PDF. */
export interface ZmanimData {
  schemaVersion: number;
  source?: ZmanimSource;
  days: Record<string, ZmanimDay>;
}

export interface StoredCalendar {
  fileName: string;
  importedAt: string;
  firstDate: string;
  lastDate: string;
  data: ZmanimData;
}

/** Screen state after sunrise when auto-sleep is on. */
export type SleepPhase = 'awake' | 'warning' | 'asleep';

export interface CountdownTarget {
  date: Date;
  hebrewDate?: string;
}
