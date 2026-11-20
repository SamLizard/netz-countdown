<template>
  <section class="settings-section">
    <h3 class="text-subtitle-1 font-weight-bold mb-3">{{ $t('settings.display') }}</h3>
    <v-select
      v-model="settings.blackBackground"
      :items="backgroundOptions"
      :label="$t('settings.appearance')"
      variant="outlined"
      hide-details
      class="mb-2"
    />
    <v-switch
      v-model="settings.hideFarDigits"
      :label="$t('settings.hideFarDigits')"
      hide-details
      color="primary"
      class="mb-2"
    />

    <v-select
      v-model="settings.warningMinutes"
      :items="warningOptions"
      :label="$t('settings.warningMinutes')"
      :hint="$t('settings.warningMinutesHint')"
      persistent-hint
      variant="outlined"
      density="comfortable"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const { t } = useI18n();
const backgroundOptions = computed(() => [
  { value: true, title: t('settings.digitsOnBlack') },
  { value: false, title: t('settings.coloredBackground') }
]);
const warningOptions = computed(() =>
  Array.from({ length: 30 }, (_, i) => ({ value: i + 1, title: t('settings.warningMinutesOption', { minutes: i + 1 }) }))
);
</script>
