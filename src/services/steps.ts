import type { PlannedStep, RelativeStep, StepsList, ZmanimData } from '@/types';
import { t } from '@/i18n';
import { resolveTarget, secondsUntil } from './countdown';

/** Offsets in seconds from sunrise: up to 120 min before, 60 min after. */
export const OFFSET_MIN = -7200;
export const OFFSET_MAX = 3600;
/** Steps per list, sunrise included. */
export const MAX_STEPS = 20;
export const LABEL_MAX = 40;
export const NAME_MAX = 60;
/** Default warning window (color fade) of a non-sunrise step, before clamping to the gap. */
export const DEFAULT_STEP_WARNING = 120;
export const SUNRISE_ID = 'sunrise';

export type StepErrorCode =
  | 'labelRequired'
  | 'labelTooLong'
  | 'labelDuplicate'
  | 'offsetRange'
  | 'offsetZero'
  | 'offsetDuplicate'
  | 'secondsRange'
  | 'tooMany'
  | 'noOffset'
  | 'noLabel'
  | 'conflictSign';

export interface StepError {
  code: StepErrorCode;
  params?: Record<string, string | number>;
}

export const emptyList = (): StepsList => ({ name: '', sunriseLabel: null, steps: [] });

/** Comparison key for labels: trimmed, NFC, case-insensitive. */
export function normalizeLabel(label: string): string {
  return label.trim().normalize('NFC').toLocaleLowerCase();
}

/** "−21:00", "+5:00", "0:00". Minutes are not wrapped at 60. Minus is U+2212. */
export function formatOffset(seconds: number, minus = '\u2212'): string {
  const abs = Math.abs(seconds);
  const sign = seconds < 0 ? minus : seconds > 0 ? '+' : '';
  return `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
}

/** Translated message for a validation error. */
export function stepErrorText(error: StepError): string {
  return t(`steps.errors.${error.code}`, error.params ?? {});
}

/** Label shown for the sunrise step in lists (editor, preview). */
export function sunriseDisplayLabel(list: StepsList): string {
  return list.sunriseLabel ?? t('steps.sunriseDefaultLabel');
}

export function newStepId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Errors on the label itself (required, length). */
export function labelErrors(label: string): StepError[] {
  const trimmed = label.trim();
  if (!trimmed) return [{ code: 'labelRequired' }];
  if (trimmed.length > LABEL_MAX) return [{ code: 'labelTooLong', params: { max: LABEL_MAX } }];
  return [];
}

export function offsetRangeError(offsetSeconds: number): StepError | null {
  if (!Number.isInteger(offsetSeconds) || offsetSeconds < OFFSET_MIN || offsetSeconds > OFFSET_MAX) {
    return { code: 'offsetRange', params: { min: -OFFSET_MIN / 60, max: OFFSET_MAX / 60 } };
  }
  return null;
}

/**
 * Validates a non-sunrise step against the list (`editingId` = the step being edited, excluded from duplicates).
 * Returns an empty array when the step can be saved.
 */
export function validateStep(input: Pick<RelativeStep, 'label' | 'offsetSeconds'>, list: StepsList, editingId?: string): StepError[] {
  const errors = labelErrors(input.label);
  const others = list.steps.filter((s) => s.id !== editingId);
  const key = normalizeLabel(input.label);
  if (!errors.length && (others.some((s) => normalizeLabel(s.label) === key) || normalizeLabel(sunriseDisplayLabel(list)) === key)) {
    errors.push({ code: 'labelDuplicate' });
  }
  const range = offsetRangeError(input.offsetSeconds);
  if (range) errors.push(range);
  else if (input.offsetSeconds === 0) errors.push({ code: 'offsetZero' });
  else {
    const clash = others.find((s) => s.offsetSeconds === input.offsetSeconds);
    if (clash) errors.push({ code: 'offsetDuplicate', params: { label: clash.label } });
  }
  // MAX_STEPS counts sunrise too.
  if (!editingId && list.steps.length + 1 >= MAX_STEPS) errors.push({ code: 'tooMany', params: { max: MAX_STEPS } });
  return errors;
}

/** Sunrise can only be renamed; an empty name restores the default label. */
export function validateSunriseLabel(label: string, list: StepsList): StepError[] {
  const trimmed = label.trim();
  if (!trimmed) return [];
  if (trimmed.length > LABEL_MAX) return [{ code: 'labelTooLong', params: { max: LABEL_MAX } }];
  const key = normalizeLabel(trimmed);
  return list.steps.some((s) => normalizeLabel(s.label) === key) ? [{ code: 'labelDuplicate' }] : [];
}

/**
 * The day's steps with absolute times, sorted by time, sunrise included.
 * Warning windows: 2 min for steps, `sunriseWarningSeconds` for sunrise, each clamped to the gap since the
 * previous step so every step starts green right after the previous one. The first step is not clamped.
 * With no extra steps this is exactly the single sunrise countdown.
 */
export function buildPlan(list: StepsList, sunrise: Date, sunriseWarningSeconds: number): PlannedStep[] {
  const entries = [
    ...list.steps.map((s) => ({ id: s.id, label: s.label as string | null, offsetSeconds: s.offsetSeconds, isSunrise: false })),
    { id: SUNRISE_ID, label: list.sunriseLabel, offsetSeconds: 0, isSunrise: true }
  ].sort((a, b) => a.offsetSeconds - b.offsetSeconds);

  return entries.map((entry, index) => {
    const base = entry.isSunrise ? sunriseWarningSeconds : DEFAULT_STEP_WARNING;
    const gap = index > 0 ? entry.offsetSeconds - entries[index - 1].offsetSeconds : Infinity;
    return {
      ...entry,
      time: new Date(sunrise.getTime() + entry.offsetSeconds * 1000),
      warningSeconds: Math.min(base, gap)
    };
  });
}

/** Index of the first step still in the future; plan.length when all have passed. */
export function currentIndex(plan: PlannedStep[], now: Date): number {
  const index = plan.findIndex((step) => secondsUntil(step.time, now) > 0);
  return index === -1 ? plan.length : index;
}

/** Plan for the day `resolveTarget` picks (today until sunrise + 2 h, then tomorrow). */
export function resolvePlan(
  data: ZmanimData,
  list: StepsList,
  now: Date,
  sunriseWarningSeconds: number
): { plan: PlannedStep[]; sunrise: Date; hebrewDate?: string } | null {
  const target = resolveTarget(data, now);
  if (!target) return null;
  return { plan: buildPlan(list, target.date, sunriseWarningSeconds), sunrise: target.date, hebrewDate: target.hebrewDate };
}
