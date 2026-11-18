import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { i18n, isLocale, RTL_LOCALES, type LocaleCode } from '@/i18n';
import type { FarRefreshSeconds } from '@/types';

const STORAGE_KEY = 'netz.settings.v1';
const REFRESH_CHOICES: readonly FarRefreshSeconds[] = [1, 10, 60];

interface SavedSettings {
  locale: LocaleCode;
  blackBackground: boolean;
  keepAwake: boolean;
  warningMinutes: number;
  hideFarDigits: boolean;
  farRefreshSeconds: FarRefreshSeconds;
  autoSleep: boolean;
  storageNoticeDismissed: boolean;
}

function load(): Partial<SavedSettings> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<SavedSettings>;
  } catch {
    return {};
  }
}

function defaultLocale(): LocaleCode {
  return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const useSettingsStore = defineStore('settings', () => {
  const saved = load();

  const locale = ref<LocaleCode>(isLocale(saved.locale) ? saved.locale : defaultLocale());
  const blackBackground = ref(saved.blackBackground ?? true);
  const keepAwake = ref(saved.keepAwake ?? true);
  const warningMinutes = ref(saved.warningMinutes ?? 8);
  const hideFarDigits = ref(saved.hideFarDigits ?? true);
  const farRefreshSeconds = ref<FarRefreshSeconds>(
    saved.farRefreshSeconds && REFRESH_CHOICES.includes(saved.farRefreshSeconds) ? saved.farRefreshSeconds : 60
  );
  const autoSleep = ref(saved.autoSleep ?? true);
  const storageNoticeDismissed = ref(saved.storageNoticeDismissed ?? false);

  watch(
    [locale, blackBackground, keepAwake, warningMinutes, hideFarDigits, farRefreshSeconds, autoSleep, storageNoticeDismissed],
    () => {
      const value: SavedSettings = {
        locale: locale.value,
        blackBackground: blackBackground.value,
        keepAwake: keepAwake.value,
        warningMinutes: warningMinutes.value,
        hideFarDigits: hideFarDigits.value,
        farRefreshSeconds: farRefreshSeconds.value,
        autoSleep: autoSleep.value,
        storageNoticeDismissed: storageNoticeDismissed.value
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    }
  );

  // Apply the language to vue-i18n (and so to Vuetify through its adapter) and to the document.
  watch(
    locale,
    (code) => {
      i18n.global.locale.value = code;
      document.documentElement.lang = code;
      document.documentElement.dir = RTL_LOCALES[code] ? 'rtl' : 'ltr';
      document.title = i18n.global.t('app.title');
    },
    { immediate: true }
  );

  return {
    locale,
    blackBackground,
    keepAwake,
    warningMinutes,
    hideFarDigits,
    farRefreshSeconds,
    autoSleep,
    storageNoticeDismissed
  };
});
