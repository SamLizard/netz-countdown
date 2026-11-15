import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { RoundingMode, ZmanKey } from '@/types';

const STORAGE_KEY = 'zmanim_countdown_settings';

export const useSettingsStore = defineStore('settings', () => {
  const zmanKey = ref<ZmanKey>('sunrise');
  const offsetMinutes = ref(0);
  const rounding = ref<RoundingMode>('none');
  const latitude = ref(40.7128);
  const longitude = ref(-74.006);
  const theme = ref<'light' | 'dark'>('dark');
  const isKiosk = ref(false);
  const useCustomTime = ref(false);
  const customTime = ref('07:00');
  const stopAtZero = ref(false);

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        zmanKey.value = saved.zmanKey ?? zmanKey.value;
        offsetMinutes.value = saved.offsetMinutes ?? offsetMinutes.value;
        rounding.value = saved.rounding ?? rounding.value;
        latitude.value = saved.latitude ?? latitude.value;
        longitude.value = saved.longitude ?? longitude.value;
        theme.value = saved.theme ?? theme.value;
        useCustomTime.value = saved.useCustomTime ?? useCustomTime.value;
        customTime.value = saved.customTime ?? customTime.value;
        stopAtZero.value = saved.stopAtZero ?? stopAtZero.value;
      } catch {
        // Ignore malformed storage data
      }
    }
  }

  watch(
    [zmanKey, offsetMinutes, rounding, latitude, longitude, theme, useCustomTime, customTime, stopAtZero],
    () => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          zmanKey: zmanKey.value,
          offsetMinutes: offsetMinutes.value,
          rounding: rounding.value,
          latitude: latitude.value,
          longitude: longitude.value,
          theme: theme.value,
          useCustomTime: useCustomTime.value,
          customTime: customTime.value,
          stopAtZero: stopAtZero.value
        })
      );
    },
    { deep: true }
  );

  return {
    zmanKey,
    offsetMinutes,
    rounding,
    latitude,
    longitude,
    theme,
    isKiosk,
    useCustomTime,
    customTime,
    stopAtZero,
    setCoords(lat: number, lng: number) {
      latitude.value = lat;
      longitude.value = lng;
    },
    toggleKiosk() {
      isKiosk.value = !isKiosk.value;
    }
  };
});
