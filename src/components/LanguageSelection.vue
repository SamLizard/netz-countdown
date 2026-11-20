<template>
  <v-select
    v-model="settings.locale"
    :items="otherLocales"
    item-title="text"
    item-value="lang"
    :aria-label="$t('settings.languageLabel')"
    hide-details
    flat
    density="compact"
    variant="solo"
    bg-color="transparent"
    class="language-selection"
  >
    <template #selection>
      <v-img :src="flag(settings.locale)" width="28" max-width="28" alt="" class="me-2" />
      <bdi>{{ $t('language') }}</bdi>
    </template>
    <template #item="{ item, props: itemProps }">
      <v-list-item v-bind="itemProps">
        <template #prepend>
          <v-img :src="flag(item.raw.lang)" width="28" max-width="28" alt="" class="me-3" />
        </template>
        <template #title>
          <bdi :lang="item.raw.lang">{{ item.title }}</bdi>
        </template>
      </v-list-item>
    </template>
  </v-select>
</template>

<script setup lang="ts">
// Adapted from gemara-daf-counter (SamLizard/vue3-ts) LanguageSelection.vue.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LOCALES, type LocaleCode } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

interface LocaleItem {
  lang: LocaleCode;
  text: string;
}

const { t } = useI18n();
const settings = useSettingsStore();

const flag = (code: LocaleCode) => `${import.meta.env.BASE_URL}flags/${code}.svg`;

// Each language is listed in its own name.
const otherLocales = computed<LocaleItem[]>(() =>
  LOCALES.filter((code) => code !== settings.locale).map((lang) => ({ lang, text: t('language', 1, { locale: lang }) }))
);
</script>

<style scoped>
.language-selection {
  max-width: 200px;
}
.language-selection :deep(.v-field__input) {
  padding-inline: 4px;
  min-block-size: 44px;
}
</style>
