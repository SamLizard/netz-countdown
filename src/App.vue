<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const { locale, t } = useI18n();

watch(
  () => settings.locale,
  (value) => {
    locale.value = value;
    document.documentElement.lang = value;
    document.title = t('app.title');
  },
  { immediate: true }
);
</script>
