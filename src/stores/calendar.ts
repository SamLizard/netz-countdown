import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { StoredCalendar } from '@/types';
import { parseCalendar, toDateKey } from '@/services/calendarParser';

const STORAGE_KEY = 'netz.calendar.v1';
const EXPIRY_WARNING_DAYS = 30;

function load(): StoredCalendar | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredCalendar) : null;
  } catch {
    return null;
  }
}

export const useCalendarStore = defineStore('calendar', () => {
  const calendar = ref<StoredCalendar | null>(load());

  const hasData = computed(() => calendar.value !== null);

  /** Days left before the calendar runs out (negative when already expired). */
  const daysLeft = computed(() => {
    if (!calendar.value) return null;
    const [y, m, d] = calendar.value.lastDate.split('-').map(Number);
    const last = new Date(y, m - 1, d);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.round((last.getTime() - startOfToday.getTime()) / 86_400_000);
  });

  const expiresSoon = computed(() => daysLeft.value !== null && daysLeft.value <= EXPIRY_WARNING_DAYS);

  const coversToday = computed(() => {
    if (!calendar.value) return false;
    const today = toDateKey(new Date());
    return today >= calendar.value.firstDate && today <= calendar.value.lastDate;
  });

  /** Reads, validates and stores a calendar file. Throws CalendarError on bad input. */
  async function importFile(file: File) {
    const parsed = parseCalendar(await file.text(), file.name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    calendar.value = parsed;
    // Ask the browser not to evict our data (best effort; ignored where unsupported).
    await navigator.storage?.persist?.().catch(() => false);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    calendar.value = null;
  }

  return { calendar, hasData, daysLeft, expiresSoon, coversToday, importFile, clear };
});
