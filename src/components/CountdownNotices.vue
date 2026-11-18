<template>
  <div class="d-flex flex-column ga-2">
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
</template>

<script setup lang="ts">
import { useCalendarStore } from '@/stores/calendar';
import StorageNotice from './StorageNotice.vue';

const calendar = useCalendarStore();
</script>
