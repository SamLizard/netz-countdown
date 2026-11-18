import { createI18n } from 'vue-i18n';
import { en as vuetifyEn, fr as vuetifyFr, he as vuetifyHe } from 'vuetify/locale';
import en from './locales/en.json';
import fr from './locales/fr.json';
import he from './locales/he.json';

/** To add a language: create locales/<code>.json, add a flag in public/flags, and register it here. */
export const LOCALES = ['en', 'fr', 'he'] as const;
export type LocaleCode = (typeof LOCALES)[number];

export const RTL_LOCALES: Record<LocaleCode, boolean> = { en: false, fr: false, he: true };

// Vuetify's own strings live under `$vuetify` so the vue-i18n adapter can find them.
const messages = {
  en: { ...en, $vuetify: vuetifyEn },
  fr: { ...fr, $vuetify: vuetifyFr },
  he: { ...he, $vuetify: vuetifyHe }
};

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
});

/** Translation for code outside components (services, composables). */
export const t = i18n.global.t;

export function isLocale(value: unknown): value is LocaleCode {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
