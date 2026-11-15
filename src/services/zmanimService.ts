import { GeoLocation, Zmanim } from '@hebcal/core';
import type { LocationCoords, ZmanKey } from '@/types';

export const ZMAN_OPTIONS = [
  { key: 'sunrise', label: 'zmanim.sunrise' },
  { key: 'sunset', label: 'zmanim.sunset' },
  { key: 'chatzot', label: 'zmanim.chatzot' },
  { key: 'sofZmanShma', label: 'zmanim.shma' },
  { key: 'sofZmanTfilla', label: 'zmanim.tfilla' }
] as const;

export function parseManualTime(value: string, now: Date): Date | null {
  const parts = value.split(':').map((part) => Number(part.trim()));
  if (parts.length < 2 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }

  const [hours, minutes, seconds = 0] = parts;
  const target = new Date(now);
  target.setHours(hours, minutes, seconds, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

function calculateZmanForDate(coords: LocationCoords, key: ZmanKey, date: Date, offsetMinutes: number): Date | null {
  const location = new GeoLocation(null, coords.lat, coords.lng, 0, 'UTC');
  const zmanim = new Zmanim(location, date);

  let result: Date | null = null;

  switch (key) {
    case 'sunrise':
      result = zmanim.sunrise();
      break;
    case 'sunset':
      result = zmanim.sunset();
      break;
    case 'chatzot':
      result = zmanim.chatzot();
      break;
    case 'sofZmanShma':
      result = zmanim.sofZmanShma();
      break;
    case 'sofZmanTfilla':
      result = zmanim.sofZmanTfilla();
      break;
  }

  if (!result) {
    return null;
  }

  const adjusted = new Date(result.getTime() + offsetMinutes * 60_000);
  return adjusted;
}

export function getNextZmanDate(
  coords: LocationCoords,
  key: ZmanKey,
  offsetMinutes: number,
  now: Date,
  useCustomTime: boolean,
  customTime: string,
  stopAtZero: boolean
): Date {
  if (useCustomTime) {
    const manual = parseManualTime(customTime, now);
    if (manual) {
      return manual;
    }
  }

  const today = calculateZmanForDate(coords, key, now, offsetMinutes);
  if (today && today > now) {
    return today;
  }

  if (stopAtZero && today) {
    return today;
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDay = calculateZmanForDate(coords, key, tomorrow, offsetMinutes);

  return nextDay || new Date(now.getTime() + 60_000);
}
