<template>
  <v-dialog v-model="open" max-width="480" scrollable>
    <v-card rounded="xl">
      <v-card-title class="settings-header d-flex align-center justify-space-between">
        <div>
          <h2 class="text-h6">{{ $t('settings.title') }}</h2>
          <p class="text-caption text-medium-emphasis">{{ $t('settings.savedAutomatically') }}</p>
        </div>
        <v-btn :icon="mdiClose" variant="text" :aria-label="$t('settings.close')" @click="open = false" />
      </v-card-title>

      <v-card-text class="settings-body">
        <LanguageSelection />
        <CalendarSection :now="now" class="settings-section" />
        <StepsSettingsSection class="settings-section" />
        <DisplaySettings />
        <ScreenSettings :wake-lock-supported="wakeLockSupported" :wake-lock-active="wakeLockActive" :has-calendar="calendar.hasData" />

        <template v-if="!isStandalone">
          <v-btn block color="primary" variant="tonal" :prepend-icon="mdiCellphoneArrowDown" @click="guideOpen = true">
            {{ $t('install.open') }}
          </v-btn>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
  <InstallGuideDialog v-model="guideOpen" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { mdiCellphoneArrowDown, mdiClose } from '@mdi/js';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import { useCalendarStore } from '@/stores/calendar';
import CalendarSection from './CalendarSection.vue';
import DisplaySettings from './DisplaySettings.vue';
import InstallGuideDialog from './InstallGuideDialog.vue';
import LanguageSelection from './LanguageSelection.vue';
import ScreenSettings from './ScreenSettings.vue';
import StepsSettingsSection from './steps/StepsSettingsSection.vue';

defineProps<{ now: Date; wakeLockSupported: boolean; wakeLockActive: boolean }>();
const open = defineModel<boolean>({ required: true });

const calendar = useCalendarStore();
const { isStandalone } = useInstallPrompt();
const guideOpen = ref(false);
</script>

<style scoped>
.settings-header {
  border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.settings-header > .v-btn {
  flex: none;
}

.settings-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
}

.settings-section {
  padding: clamp(0.75rem, 3vw, 1rem);
  border-radius: 0.75rem;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}

.settings-body :deep(.v-btn:not(.v-btn--icon)) {
  min-block-size: 44px;
  height: auto;
  padding-block: 0.5rem;
  white-space: normal;
}

.settings-body :deep(.v-btn__content) {
  min-inline-size: 0;
  text-align: center;
  overflow-wrap: anywhere;
}
</style>
