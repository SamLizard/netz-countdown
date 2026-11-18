<template>
  <v-main class="home">
    <WelcomeCard v-if="!calendar.calendar" />

    <template v-else>
      <CountdownDisplay
        v-if="shown"
        :target="shown.time"
        :now="now"
        :hebrew-date="hebrewDate"
        :warning-seconds="shown.warningSeconds"
        :black-background="settings.blackBackground"
        :hide-far-digits="settings.hideFarDigits"
        :step-seconds="stepSeconds"
        :dimmed="dimmed"
        :label="shown.label"
        :sunrise="sunrise ?? undefined"
        :sunrise-label="steps.list.sunriseLabel"
        :peeking="peek.isPeeking.value"
      >
        <template v-if="steps.hasSteps" #nav>
          <StepNav
            :labels="navLabels"
            :shown-index="peek.shownIndex.value"
            :live-index="liveIndex"
            :peeking="peek.isPeeking.value"
            @prev="peek.prev"
            @next="peek.next"
            @live="peek.backToLive"
          />
        </template>
      </CountdownDisplay>
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
import { useI18n } from 'vue-i18n';
import { mdiCogOutline } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import { useSettingsStore } from '@/stores/settings';
import { useStepsStore } from '@/stores/steps';
import { useNow } from '@/composables/useNow';
import { useWakeLock } from '@/composables/useWakeLock';
import { useAutoSleep } from '@/composables/useAutoSleep';
import { useTouchActivity } from '@/composables/useTouchActivity';
import { useStepPlan } from '@/composables/useStepPlan';
import { useStepPeek } from '@/composables/useStepPeek';
import { DIM_OFF_LAST_SECONDS, refreshStepSeconds } from '@/services/countdown';
import { RTL_LOCALES } from '@/i18n';
import CountdownDisplay from '@/components/CountdownDisplay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import SleepOverlay from '@/components/SleepOverlay.vue';
import StorageNotice from '@/components/StorageNotice.vue';
import WelcomeCard from '@/components/WelcomeCard.vue';
import StepNav from '@/components/steps/StepNav.vue';

const { t } = useI18n();
const calendar = useCalendarStore();
const settings = useSettingsStore();
const steps = useStepsStore();
const settingsOpen = ref(false);
const activity = useTouchActivity();

// Refresh rate, near-target rules and tick alignment follow the live step (or sunrise without steps).
const now = useNow(() => ({
  targetMs: liveStep.value?.time.getTime() ?? null,
  warningSeconds: liveStep.value?.warningSeconds ?? settings.warningMinutes * 60,
  farStepSeconds: settings.farRefreshSeconds
}));

const { plan, liveIndex, liveStep, lastStep, sunrise, hebrewDate } = useStepPlan(now);

const peek = useStepPeek({
  liveIndex,
  count: computed(() => plan.value.length),
  enabled: computed(() => steps.hasSteps && !settingsOpen.value),
  rtl: computed(() => RTL_LOCALES[settings.locale]),
  resetKey: computed(() => steps.list)
});

const shown = computed(() => plan.value[peek.shownIndex.value] ?? liveStep.value);
const navLabels = computed(() => plan.value.map((s) => s.label ?? t('countdown.target')));

const liveRemaining = computed(() => (liveStep.value ? (liveStep.value.time.getTime() - now.value.getTime()) / 1000 : null));
const stepSeconds = computed(() =>
  refreshStepSeconds(liveRemaining.value, liveStep.value?.warningSeconds ?? 0, settings.farRefreshSeconds)
);

// Dim after 10 s without touch, except in the last minute before the live step.
const dimmed = computed(() => {
  if (!settings.dimWhenIdle || !activity.idle.value || settingsOpen.value) return false;
  const r = liveRemaining.value;
  return !(r !== null && r > 0 && r <= DIM_OFF_LAST_SECONDS);
});

// Auto-sleep after the last step of the plan (sunrise unless there are after-sunrise steps).
const sleep = useAutoSleep(
  now,
  computed(() => lastStep.value?.time.getTime() ?? null),
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
