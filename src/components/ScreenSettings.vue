<template>
  <section class="settings-section">
    <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('settings.battery') }}</h3>
    <v-switch
      v-model="settings.keepAwake"
      :label="$t('settings.keepAwake')"
      :hint="wakeLockHint"
      :disabled="!wakeLockSupported"
      persistent-hint
      color="primary"
      class="mb-2"
    />
    <v-switch v-model="settings.dimWhenIdle" :label="$t('settings.dimWhenIdle')" hide-details color="primary" />
    <v-switch
      v-model="settings.autoSleep"
      :label="$t('settings.autoSleep')"
      :hint="$t('settings.autoSleepHint')"
      persistent-hint
      color="primary"
    />
    <details class="advanced mt-4">
      <summary>{{ $t('settings.advanced') }}</summary>
      <RefreshRateField class="mt-3" />
      <v-select
        v-model="settings.finalRefreshSeconds"
        :items="finalOptions"
        :label="$t('settings.finalRefresh')"
        :hint="$t('settings.finalRefreshHint')"
        persistent-hint
        variant="outlined"
        class="mt-3"
      />
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import RefreshRateField from './RefreshRateField.vue';

const props = defineProps<{ wakeLockSupported: boolean; wakeLockActive: boolean; hasCalendar: boolean }>();
const settings = useSettingsStore();
const { t } = useI18n();
const wakeLockHint = computed(() => {
  if (!props.wakeLockSupported) return t('settings.keepAwakeUnsupported');
  if (!settings.keepAwake) return t('settings.keepAwakeHint');
  if (!props.hasCalendar) return t('settings.wakeLockNeedsCalendar');
  return t(props.wakeLockActive ? 'settings.wakeLockActive' : 'settings.wakeLockInactive');
});

const finalOptions = computed(() => [5, 10, 20, 30, 60, 120, 300, 600, 900, 1800].map((value) => ({
  value,
  title: value < 60 ? t('settings.secondsOption', { seconds: value }) : t('settings.warningMinutesOption', { minutes: value / 60 })
})));
</script>

<style scoped>
.advanced {
  border-block-start: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.advanced > summary {
  cursor: pointer;
  padding-block: 0.75rem;
  min-block-size: 44px;
}
</style>
