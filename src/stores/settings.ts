import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { AppLocale } from '@/types';

const STORAGE_KEY = 'netz.settings.v1';

interface SavedSettings {
  locale: AppLocale;
  blackBackground: boolean;
  keepAwake: boolean;
  warningMinutes: number;
}

function load(): Partial<SavedSettings> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedSettings>;
  } catch {
    return {};
  }
}

function defaultLocale(): AppLocale {
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = load();

  const locale = ref<AppLocale>(saved.locale === 'fr' || saved.locale === 'en' ? saved.locale : defaultLocale());
  const blackBackground = ref(saved.blackBackground ?? true);
  const keepAwake = ref(saved.keepAwake ?? true);
  const warningMinutes = ref(saved.warningMinutes ?? 8);

  watch([locale, blackBackground, keepAwake, warningMinutes], () => {
    const value: SavedSettings = {
      locale: locale.value,
      blackBackground: blackBackground.value,
      keepAwake: keepAwake.value,
      warningMinutes: warningMinutes.value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

  return { locale, blackBackground, keepAwake, warningMinutes };
});
