import type { CountdownTarget, ZmanimData } from '@/types';
import { hebrewDateFor, sunriseFor } from './calendarParser';

/** How long after sunrise the "late" display stays before switching to tomorrow. */
export const LATE_WINDOW_SECONDS = 2 * 60 * 60;

const pad = (value: number) => String(value).padStart(2, '0');

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.abs(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function formatClock(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Seconds left until the target, rounded up so "00:00" means "now". Negative when late. */
export function secondsUntil(target: Date, now: Date): number {
  return Math.ceil((target.getTime() - now.getTime()) / 1000);
}

/**
 * Green until the warning window, then a linear fade to red at the target.
 * Red after the target. Brighter colors when drawn on black (OLED style).
 */
export function colorFor(remainingSeconds: number, warningSeconds: number, onBlack: boolean): string {
  const lightness = onBlack ? 50 : 30;
  if (remainingSeconds <= 0) return `hsl(0, 75%, ${lightness + 2}%)`;

  const ratio = warningSeconds > 0 ? Math.min(1, remainingSeconds / warningSeconds) : 1;
  return `hsl(${Math.round(120 * ratio)}, 70%, ${lightness + 2 * (1 - ratio)}%)`;
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
