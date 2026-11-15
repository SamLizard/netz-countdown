<template>
  <v-main class="background-surface fill-height pa-0" @click="toggleKiosk">
    <v-sheet height="100vh" class="timer-root" elevation="0">
      <CountdownDisplay
        :diff-seconds="displaySeconds"
        :label="currentLabel"
        :offset="settings.offsetMinutes"
        :rounding="settings.rounding"
        :is-kiosk="settings.isKiosk"
      />

      <div v-if="!settings.isKiosk" class="control-bar">
        <div class="control-summary">
          <div>{{ formattedTarget }}</div>
          <div>{{ locationLabel }}</div>
        </div>

        <v-btn icon color="primary" large @click.stop="settingsOpen = true">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </div>
    </v-sheet>

    <SettingsDialog v-model:model-value="settingsOpen" />
  </v-main>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import CountdownDisplay from '@/components/CountdownDisplay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { getNextZmanDate, ZMAN_OPTIONS } from '@/services/zmanimService';

const settings = useSettingsStore();
const settingsOpen = ref(false);
const now = ref(new Date());
const hasGeo = ref(false);

const currentZman = computed(() => {
  return ZMAN_OPTIONS.find((item) => item.key === settings.zmanKey);
});

const currentLabel = computed(() => {
  if (settings.useCustomTime) {
    return 'zmanim.custom';
  }
  return currentZman.value?.label ?? 'zmanim.sunrise';
});

const targetDate = computed(() => {
  return getNextZmanDate(
    { lat: settings.latitude, lng: settings.longitude },
    settings.zmanKey,
    settings.offsetMinutes,
    now.value,
    settings.useCustomTime,
    settings.customTime,
    settings.stopAtZero
  );
});

const displaySeconds = computed(() => {
  const diff = Math.max(0, Math.round((targetDate.value.getTime() - now.value.getTime()) / 1000));
  if (settings.stopAtZero) {
    return diff;
  }
  return diff;
});

const formattedTarget = computed(() => {
  return targetDate.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
});

const locationLabel = computed(() => {
  if (hasGeo.value) {
    return 'GPS';
  }
  return `${settings.latitude.toFixed(2)}, ${settings.longitude.toFixed(2)}`;
});

const toggleKiosk = () => {
  settings.toggleKiosk();
};

onMounted(() => {
  window.setInterval(() => {
    now.value = new Date();
  }, 1000);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        settings.setCoords(position.coords.latitude, position.coords.longitude);
        hasGeo.value = true;
      },
      () => {
        hasGeo.value = false;
      }
    );
  }
});
</script>

<style scoped>
.timer-root {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(circle at top, rgba(40, 98, 255, 0.12), transparent 40%),
    linear-gradient(180deg, #090b10 0%, #12171f 100%);
}

.control-bar {
  position: absolute;
  left: 1rem;
  bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 2rem);
  gap: 1rem;
}

.control-summary {
  color: #ffffffcc;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
}

.control-summary div:first-child {
  font-size: 1rem;
  font-weight: 600;
}

.control-summary div:last-child {
  font-size: 0.9rem;
}
</style>
