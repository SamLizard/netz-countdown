<template>
  <div>
    <div class="text-subtitle-2 mb-2">{{ $t('settings.calendar') }}</div>

    <div v-if="calendar.calendar" class="text-body-2 mb-3">
      <div class="font-weight-medium text-break">{{ calendar.calendar.fileName }}</div>
      <div class="text-medium-emphasis">
        {{ $t('calendar.range', { from: formatDate(calendar.calendar.firstDate), to: formatDate(calendar.calendar.lastDate) }) }}
      </div>
    </div>

    <CalendarImport :label="$t('calendar.replace')" variant="tonal" @imported="snackbar = true" />

    <v-btn
      v-if="calendar.hasData"
      variant="text"
      color="error"
      block
      class="mt-2"
      :prepend-icon="mdiDeleteOutline"
      @click="remove"
    >
      {{ $t('calendar.remove') }}
    </v-btn>

    <v-snackbar v-model="snackbar" :timeout="2500" color="success">{{ $t('calendar.imported') }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { mdiDeleteOutline } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import CalendarImport from './CalendarImport.vue';

const { t, locale } = useI18n();
const calendar = useCalendarStore();
const snackbar = ref(false);

function formatDate(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' });
}

function remove() {
  if (window.confirm(t('calendar.removeConfirm'))) calendar.clear();
}
</script>
