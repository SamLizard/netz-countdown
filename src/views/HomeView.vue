<template>
  <v-main class="home">
    <WelcomeCard v-if="!calendar.calendar" />

    <template v-else>
      <CountdownDisplay
        v-if="target"
        :target="target.date"
        :now="now"
        :hebrew-date="target.hebrewDate"
        :warning-seconds="warningSeconds"
        :black-background="settings.blackBackground"
        :hide-far-digits="settings.hideFarDigits"
        :step-seconds="stepSeconds"
        :dimmed="dimmed"
      />
      <div v-else class="home__empty">{{ $t('countdown.noTime') }}</div>

      <div class="home__notices">
        <StorageNotice />
        <v-alert
          v-if="calendar.expiresSoon"
          :type="calendar.coversToday ? 'warning' : 'error'"
          variant="tonal"
          density="compact"
        >
          {{ calendar.coversToday ? $t('calendar.expiresSoon', { days: calendar.daysLeft }) : $t('calendar.expired') }}
        </v-alert>
      </div>

      <SleepOverlay :phase="sleep.phase.value" :seconds-left="sleep.warningSecondsLeft.value" @wake="activity.touch" />
    </template>

    <v-btn
      class="home__settings"
      :class="{ 'home__settings--dim': dimmed }"
      :icon="mdiCogOutline"
      variant="text"
      :aria-label="$t('settings.open')"
      @click="settingsOpen = true"
    />

    <SettingsDialog v-model="settingsOpen" :wake-lock-supported="wakeLock.supported" />
  </v-main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { mdiCogOutline } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import { useSettingsStore } from '@/stores/settings';
import { useNow } from '@/composables/useNow';
import { useWakeLock } from '@/composables/useWakeLock';
import { useAutoSleep } from '@/composables/useAutoSleep';
import { useTouchActivity } from '@/composables/useTouchActivity';
import { DIM_OFF_LAST_SECONDS, refreshStepSeconds, resolveTarget } from '@/services/countdown';
import CountdownDisplay from '@/components/CountdownDisplay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import SleepOverlay from '@/components/SleepOverlay.vue';
import StorageNotice from '@/components/StorageNotice.vue';
import WelcomeCard from '@/components/WelcomeCard.vue';

const calendar = useCalendarStore();
const settings = useSettingsStore();
const settingsOpen = ref(false);
const activity = useTouchActivity();

const warningSeconds = computed(() => settings.warningMinutes * 60);

const now = useNow(() => ({
  targetMs: target.value?.date.getTime() ?? null,
  warningSeconds: warningSeconds.value,
  farStepSeconds: settings.farRefreshSeconds
}));

const target = computed(() => (calendar.calendar ? resolveTarget(calendar.calendar.data, now.value) : null));
const remaining = computed(() => (target.value ? (target.value.date.getTime() - now.value.getTime()) / 1000 : null));

const stepSeconds = computed(() => refreshStepSeconds(remaining.value, warningSeconds.value, settings.farRefreshSeconds));

// Dim after 10 s without touch, except in the last minute before sunrise.
const dimmed = computed(() => {
  if (!settings.dimWhenIdle || !activity.idle.value || settingsOpen.value) return false;
  const r = remaining.value;
  return !(r !== null && r > 0 && r <= DIM_OFF_LAST_SECONDS);
});

const sleep = useAutoSleep(
  now,
  computed(() => target.value?.date.getTime() ?? null),
  computed(() => settings.autoSleep),
  activity.lastTouchMs
);

const keepAwake = computed(() => settings.keepAwake && calendar.hasData && sleep.phase.value !== 'asleep');
const wakeLock = useWakeLock(keepAwake);
</script>

<style scoped>
.home {
  position: fixed;
  inset: 0;
  background: #000;
}

.home__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  font-size: 1.4rem;
  background: #333;
}

.home__settings {
  position: absolute;
  top: calc(0.5rem + env(safe-area-inset-top));
  right: calc(0.5rem + env(safe-area-inset-right));
  opacity: 0.6;
}

.home__settings--dim {
  opacity: 0.25;
}

.home__notices {
  position: absolute;
  top: calc(0.75rem + env(safe-area-inset-top));
  left: 0.75rem;
  right: 3.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.home__notices:empty {
  display: none;
}
</style>
