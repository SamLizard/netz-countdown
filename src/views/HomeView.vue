<template>
  <v-main class="home">
    <div class="home__screen" :class="{ 'home__screen--countdown': shown }" :inert="asleep">
      <header class="home__header">
        <div v-if="calendar.hasData" class="home__notices">
          <SleepOverlay v-if="sleep.phase.value === 'warning'" :seconds-left="sleep.warningSecondsLeft.value" />
          <CountdownNotices v-if="hasNotices && !compactNotices" />
        </div>

        <v-dialog v-if="compactNotices && hasNotices" v-model="noticesOpen" max-width="480" scrollable>
          <template #activator="{ props: activatorProps }">
            <v-btn v-bind="activatorProps" :icon="mdiAlertOutline" :aria-label="$t('countdown.notices')" color="warning" variant="text" />
          </template>
          <v-card rounded="xl">
            <v-card-title class="d-flex align-center justify-space-between">
              {{ $t('countdown.notices') }}
              <v-btn :icon="mdiClose" :aria-label="$t('settings.close')" variant="text" @click="noticesOpen = false" />
            </v-card-title>
            <v-card-text><CountdownNotices /></v-card-text>
          </v-card>
        </v-dialog>

        <v-btn
          class="home__settings"
          :class="{ 'home__settings--dim': dimmed }"
          :icon="mdiCogOutline"
          variant="text"
          :aria-label="$t('settings.open')"
          @click="settingsOpen = true"
        />
      </header>

      <WelcomeCard v-if="!calendar.calendar" />
      <CountdownDisplay
        v-else-if="shown"
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
        @pointerdown="peek.startSwipe"
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
    </div>

    <SleepOverlay v-if="asleep" @wake="activity.touch" />

    <SettingsDialog v-model="settingsOpen" :now="now" :wake-lock-supported="wakeLock.supported" :wake-lock-active="wakeLock.active.value" />
  </v-main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useDisplay } from 'vuetify';
import { mdiAlertOutline, mdiClose, mdiCogOutline } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import { useSettingsStore } from '@/stores/settings';
import { useStepsStore } from '@/stores/steps';
import { useNow } from '@/composables/useNow';
import { useWakeLock } from '@/composables/useWakeLock';
import { useAutoSleep } from '@/composables/useAutoSleep';
import { useTouchActivity } from '@/composables/useTouchActivity';
import { useStepPlan } from '@/composables/useStepPlan';
import { useStepPeek } from '@/composables/useStepPeek';
import { useShowStorageNotice } from '@/composables/useStorageStatus';
import { DIM_OFF_LAST_SECONDS, refreshStepSeconds } from '@/services/countdown';
import { RTL_LOCALES } from '@/i18n';
import CountdownDisplay from '@/components/CountdownDisplay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import SleepOverlay from '@/components/SleepOverlay.vue';
import CountdownNotices from '@/components/CountdownNotices.vue';
import WelcomeCard from '@/components/WelcomeCard.vue';
import StepNav from '@/components/steps/StepNav.vue';

const { t } = useI18n();
const calendar = useCalendarStore();
const settings = useSettingsStore();
const steps = useStepsStore();
const settingsOpen = ref(false);
const noticesOpen = ref(false);
const activity = useTouchActivity();
const { width, height } = useDisplay();
const showStorageNotice = useShowStorageNotice();
const hasNotices = computed(() => calendar.hasData && (showStorageNotice.value || calendar.expiresSoon));

// Refresh rate, near-target rules and tick alignment follow the live step (or sunrise without steps).
const now = useNow(() => ({
  targetMs: liveStep.value?.time.getTime() ?? null,
  warningSeconds: liveStep.value?.warningSeconds ?? settings.warningMinutes * 60,
  farStepSeconds: settings.farRefreshSeconds,
  finalSeconds: settings.finalRefreshSeconds
}));

const { plan, liveIndex, liveStep, lastStep, sunrise, hebrewDate } = useStepPlan(now);

const peek = useStepPeek({
  liveIndex,
  count: computed(() => plan.value.length),
  enabled: computed(() => steps.hasSteps && !settingsOpen.value && !noticesOpen.value && !asleep.value),
  rtl: computed(() => RTL_LOCALES[settings.locale]),
  resetKey: computed(() => steps.list)
});

const shown = computed(() => plan.value[peek.shownIndex.value] ?? liveStep.value);
const compactNotices = computed(() => !!shown.value && width.value > height.value && height.value <= 512);
watch([compactNotices, hasNotices], ([compact, available]) => {
  if (!compact || !available) noticesOpen.value = false;
});
const navLabels = computed(() => plan.value.map((s) => s.label ?? t('countdown.target')));

const liveRemaining = computed(() => (liveStep.value ? (liveStep.value.time.getTime() - now.value.getTime()) / 1000 : null));
const stepSeconds = computed(() =>
  refreshStepSeconds(liveRemaining.value, liveStep.value?.warningSeconds ?? 0, settings.farRefreshSeconds, settings.finalRefreshSeconds)
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
  computed(() => settings.autoSleep && !settingsOpen.value && !noticesOpen.value),
  activity.lastAwakeMs
);

const asleep = computed(() => sleep.phase.value === 'asleep');
const keepAwake = computed(() => settings.keepAwake && calendar.hasData && !asleep.value);
const wakeLock = useWakeLock(keepAwake);
</script>

<style scoped>
.home {
  background: #000;
}

.home__screen {
  display: flex;
  flex-direction: column;
  min-block-size: 100vh;
  min-block-size: 100dvh;
}

.home__header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: calc(0.25rem + env(safe-area-inset-top)) calc(0.5rem + env(safe-area-inset-right))
    0.25rem calc(0.5rem + env(safe-area-inset-left));
}

.home__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem calc(1rem + env(safe-area-inset-right)) calc(2rem + env(safe-area-inset-bottom))
    calc(1rem + env(safe-area-inset-left));
  text-align: center;
  font-size: 1.4rem;
  background: #333;
}

.home__settings {
  flex: none;
  opacity: 0.8;
}

.home__settings--dim:not(:focus-visible) {
  opacity: 0.25;
}

.home__notices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-inline-size: 0;
  max-inline-size: 36rem;
  margin-inline-end: auto;
}

.home__notices:empty {
  display: none;
}

@media (orientation: landscape) {
  .home__screen--countdown {
    block-size: 100dvh;
  }
}
</style>
