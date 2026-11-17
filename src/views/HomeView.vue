<template>
  <v-main class="home">
    <WelcomeCard v-if="!calendar.calendar" />

    <template v-else>
      <CountdownDisplay
        v-if="target"
        :target="target.date"
        :now="now"
        :hebrew-date="target.hebrewDate"
        :warning-seconds="settings.warningMinutes * 60"
        :black-background="settings.blackBackground"
      />
      <div v-else class="home__empty">{{ $t('countdown.noTime') }}</div>

      <v-alert
        v-if="calendar.expiresSoon"
        :type="calendar.coversToday ? 'warning' : 'error'"
        variant="tonal"
        density="compact"
        class="home__alert"
      >
        {{ calendar.coversToday ? $t('calendar.expiresSoon', { days: calendar.daysLeft }) : $t('calendar.expired') }}
      </v-alert>
    </template>

    <v-btn
      class="home__settings"
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
import { resolveTarget } from '@/services/countdown';
import CountdownDisplay from '@/components/CountdownDisplay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import WelcomeCard from '@/components/WelcomeCard.vue';

const calendar = useCalendarStore();
const settings = useSettingsStore();
const now = useNow();
const settingsOpen = ref(false);

const keepAwake = computed(() => settings.keepAwake && calendar.hasData);
const wakeLock = useWakeLock(keepAwake);

const target = computed(() => (calendar.calendar ? resolveTarget(calendar.calendar.data, now.value) : null));
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

.home__alert {
  position: absolute;
  top: calc(0.75rem + env(safe-area-inset-top));
  left: 0.75rem;
  right: 3.5rem;
}
</style>
