import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { useI18n } from 'vue-i18n';
import i18n from './i18n';

export default createVuetify({
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n })
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#000000',
          surface: '#16181d',
          primary: '#4caf50',
          error: '#ef5350',
          warning: '#ffa726'
        }
      }
    }
  }
});
