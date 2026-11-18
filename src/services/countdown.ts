import type { CountdownTarget, SleepPhase, ZmanimData } from '@/types';
import { t } from '@/i18n';
import { hebrewDateFor, sunriseFor } from './calendarParser';

/** How long after sunrise the "late" display stays before switching to tomorrow. */
export const LATE_WINDOW_SECONDS = 2 * 60 * 60;

/** Auto-sleep: seconds without touch after sunrise before the warning, then length of the warning. */
export const SLEEP_GRACE_SECONDS = 60;
export const SLEEP_WARNING_SECONDS = 20;

/** Ticks fire slightly after the boundary so rounded values have already changed. */
const TICK_SLACK_MS = 20;

/** Number of color steps in the green-to-red fade (fewer repaints than a continuous fade). */
const COLOR_STEPS = 16;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * "MM:SS" or "H:MM:SS". With a refresh step above 1 s the value is rounded up to the step,
 * and with a 60 s step only minutes are shown, so the screen never shows seconds that are not live.
 */
export function formatDuration(totalSeconds: number, stepSeconds = 1): string {
  const seconds = Math.ceil(Math.abs(totalSeconds) / stepSeconds) * stepSeconds;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (stepSeconds >= 60) {
    return h > 0 ? t('countdown.hoursMinutes', { h, mm: pad(m) }) : t('countdown.minutes', { m });
  }
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatClock(date: Date, withSeconds = true): string {
  const base = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return withSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

/** Seconds left until the target, rounded up so "00:00" means "now". Negative when late. */
export function secondsUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / 1000);
}

/**
 * Green until the warning window, then a stepped fade to red at the target. Red after the target.
 * On black (OLED style) colors are kept fairly dark: lit pixels and brightness cost battery.
 */
export function colorFor(remainingSeconds: number, warningSeconds: number, onBlack: boolean): string {
  const lightness = onBlack ? 42 : 30;
  if (remainingSeconds <= 0) return `hsl(0, 75%, ${lightness}%)`;

  const ratio = warningSeconds > 0 ? Math.min(1, remainingSeconds / warningSeconds) : 1;
  const stepped = Math.ceil(ratio * COLOR_STEPS) / COLOR_STEPS;
  return `hsl(${Math.round(120 * stepped)}, 70%, ${lightness}%)`;
}

/** Refresh step (seconds) for the current moment: every second near or after the target, `farStep` before. */
export function refreshStepSeconds(remainingSeconds: number | null, warningSeconds: number, farStep: number): number {
  if (remainingSeconds === null || remainingSeconds <= warningSeconds) return 1;
  return farStep;
}

/**
 * Delay until the next tick: the first of the next wall-clock step boundary (the "now" clock changes)
 * and the next countdown step boundary (the remaining value changes). A slow tick never sleeps past
 * the start of the warning window, so the switch to one tick per second is on time.
 */
export function nextTickDelay(nowMs: number, targetMs: number | null, warningSeconds: number, farStep: number): number {
  const remainingMs = targetMs === null ? null : targetMs - nowMs;
  const stepMs = refreshStepSeconds(remainingMs === null ? null : remainingMs / 1000, warningSeconds, farStep) * 1000;
  let delay = stepMs - (nowMs % stepMs);
  if (remainingMs !== null) {
    const toCountdownBoundary = ((remainingMs % stepMs) + stepMs) % stepMs || stepMs;
    delay = Math.min(delay, toCountdownBoundary);
    if (stepMs > 1000) delay = Math.min(delay, remainingMs - warningSeconds * 1000);
  }
  return Math.max(delay, 0) + TICK_SLACK_MS;
}

/**
 * Auto-sleep phase after the target. The idle time counts from the later of the target and the last touch,
 * so opening the app late, or touching the screen, always gives a full grace period.
 */
export function sleepPhase(nowMs: number, targetMs: number, lastTouchMs: number): SleepPhase {
  if (nowMs < targetMs) return 'awake';
  const idle = (nowMs - Math.max(targetMs, lastTouchMs)) / 1000;
  if (idle < SLEEP_GRACE_SECONDS) return 'awake';
  if (idle < SLEEP_GRACE_SECONDS + SLEEP_WARNING_SECONDS) return 'warning';
  return 'asleep';
}

/**
 * Today's sunrise, kept for LATE_WINDOW_SECONDS after it passes; then tomorrow's.
 * Returns null when there is nothing left to count down to.
 */
export function resolveTarget(data: ZmanimData, now: Date): CountdownTarget | null {
  const today = sunriseFor(data, now);
  if (today && secondsUntil(today, now) > -LATE_WINDOW_SECONDS) {
    return { date: today, hebrewDate: hebrewDateFor(data, now) };
  }

  const tomorrowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = sunriseFor(data, tomorrowDay);
  return tomorrow ? { date: tomorrow, hebrewDate: hebrewDateFor(data, tomorrowDay) } : null;
}
