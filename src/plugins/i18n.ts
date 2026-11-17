import { createI18n } from 'vue-i18n';
import { en as vuetifyEn, fr as vuetifyFr } from 'vuetify/locale';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';

// Vuetify's own strings live under `$vuetify` so the vue-i18n adapter can find them.
const messages = {
  en: { ...en, $vuetify: vuetifyEn },
  fr: { ...fr, $vuetify: vuetifyFr }
};

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  globalInjection: true,
  messages
});

export default i18n;
