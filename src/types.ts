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

/** A named time relative to the day's visible sunrise (docs/specs/RELATIVE_TIMES.md). */
export interface RelativeStep {
  /** Local id, never exported. */
  id: string;
  /** Trimmed, 1..LABEL_MAX characters. */
  label: string;
  /** Integer seconds, OFFSET_MIN..OFFSET_MAX, never 0 (0 is sunrise). Negative = before sunrise. */
  offsetSeconds: number;
}

export interface StepsList {
  /** Optional list name, used for export file name and share title. */
  name: string;
  /** Custom label of the sunrise step; null = localized default. */
  sunriseLabel: string | null;
  /** Non-sunrise steps, any order. */
  steps: RelativeStep[];
}

/** One step of the day with its absolute time. The plan is sorted by time. */
export interface PlannedStep {
  id: string;
  /** null = sunrise step with the default label. */
  label: string | null;
  offsetSeconds: number;
  time: Date;
  /** Warning window used for the color fade of this step. */
  warningSeconds: number;
  isSunrise: boolean;
}
