<template>
  <div>
    <div class="text-subtitle-2">{{ $t('settings.display') }}</div>
    <v-switch
      v-model="settings.blackBackground"
      :label="$t('settings.blackBackground')"
      :hint="$t('settings.blackBackgroundHint')"
      persistent-hint
      color="primary"
      class="mb-2"
    />
    <v-switch
      v-model="settings.hideFarDigits"
      :label="$t('settings.hideFarDigits')"
      :hint="$t('settings.hideFarDigitsHint', { minutes: settings.warningMinutes })"
      persistent-hint
      color="primary"
      class="mb-4"
    />

    <v-slider
      v-model="settings.warningMinutes"
      :label="$t('settings.warningMinutes')"
      :min="1"
      :max="30"
      :step="1"
      thumb-label
      color="primary"
      class="mb-2"
    />

    <div class="text-subtitle-2 mt-2">{{ $t('settings.battery') }}</div>
    <v-select
      v-model="settings.farRefreshSeconds"
      :items="refreshItems"
      :label="$t('settings.farRefresh')"
      :hint="$t('settings.farRefreshHint')"
      persistent-hint
      variant="outlined"
      density="comfortable"
      class="mt-3 mb-2"
    />
    <v-switch
      v-model="settings.keepAwake"
      :label="$t('settings.keepAwake')"
      :hint="$t(wakeLockSupported ? 'settings.keepAwakeHint' : 'settings.keepAwakeUnsupported')"
      :disabled="!wakeLockSupported"
      persistent-hint
      color="primary"
      class="mb-2"
    />
    <v-switch
      v-model="settings.autoSleep"
      :label="$t('settings.autoSleep')"
      :hint="$t('settings.autoSleepHint')"
      persistent-hint
      color="primary"
      class="mb-2"
    />
    <p class="text-caption text-medium-emphasis mt-2">{{ $t('settings.brightnessTip') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import type { FarRefreshSeconds } from '@/types';

defineProps<{ wakeLockSupported: boolean }>();

const { t } = useI18n();
const settings = useSettingsStore();

const refreshItems = computed<{ title: string; value: FarRefreshSeconds }[]>(() => [
  { title: t('settings.refresh.every1'), value: 1 },
  { title: t('settings.refresh.every10'), value: 10 },
  { title: t('settings.refresh.every60'), value: 60 }
]);
</script>
