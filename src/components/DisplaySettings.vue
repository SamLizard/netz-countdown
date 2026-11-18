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
      :hint="$t('settings.hideFarDigitsHint')"
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

    <div class="text-subtitle-2 mt-2 mb-3">{{ $t('settings.battery') }}</div>
    <RefreshRateField class="mb-2" />
    <v-switch
      v-model="settings.dimWhenIdle"
      :label="$t('settings.dimWhenIdle')"
      :hint="$t('settings.dimWhenIdleHint')"
      persistent-hint
      color="primary"
      class="mb-2"
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
import { useSettingsStore } from '@/stores/settings';
import RefreshRateField from './RefreshRateField.vue';

defineProps<{ wakeLockSupported: boolean }>();

const settings = useSettingsStore();
</script>
