// import { createVuetify } from 'vuetify';
// import { useI18n } from 'vue-i18n';
// import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
// import i18n from './i18n';

// const lightTheme = {
//   dark: false,
//   colors: {
//     background: '#f7f7f7',
//     surface: '#ffffff',
//     primary: '#1e88e5',
//     secondary: '#8c9eff',
//     error: '#e53935',
//     info: '#039be5',
//     success: '#43a047',
//     warning: '#fb8c00'
//   }
// };

// const darkTheme = {
//   dark: true,
//   colors: {
//     background: '#0d1117',
//     surface: '#161b22',
//     primary: '#82b1ff',
//     secondary: '#8c9eff',
//     error: '#ff747b',
//     info: '#64b5f6',
//     success: '#81c784',
//     warning: '#ffb74d'
//   }
// };

// export default createVuetify({
//   locale: {
//     adapter: createVueI18nAdapter({ i18n, useI18n })
//   },
//   icons: {
//     defaultSet: 'mdi'
//   },
//   theme: {
//     defaultTheme: 'dark',
//     themes: {
//       light: lightTheme,
//       dark: darkTheme
//     }
//   }
// });


// import 'vuetify/styles';
import {createVuetify } from 'vuetify';
import { useI18n } from 'vue-i18n';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import i18n from './i18n';

const myCustomLightTheme = {
  dark: false,
  colors: {
    primary: '#1976d2',
  },
}

const vuetify = createVuetify({
  locale: {
    rtl: {
      en: false,
    },
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  icons: {
    defaultSet: 'mdi',
  },
  theme: {
    defaultTheme: 'myCustomLightTheme',
    themes: {
      myCustomLightTheme,
    },
  },
});

export default vuetify;