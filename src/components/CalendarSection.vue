<template>
  <section>
    <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ $t('settings.calendar') }}</h3>

    <div v-if="calendar.calendar" class="text-body-2 mb-3">
      <div class="font-weight-medium text-break">{{ calendar.calendar.fileName }}</div>
      <div class="text-medium-emphasis">
        {{ $t('calendar.range', { from: formatDate(calendar.calendar.firstDate), to: formatDate(calendar.calendar.lastDate) }) }}
      </div>
    </div>
    <p v-else class="text-body-2 text-medium-emphasis mb-3">{{ $t('calendar.privacy') }}</p>

    <v-alert v-if="calendar.hasData && (!hasSunriseToday || calendar.expiresSoon)"
      :type="hasSunriseToday ? 'warning' : 'error'" variant="tonal" density="compact" class="mb-3">
      {{ $t(hasSunriseToday ? 'calendar.expiresSoon' : calendar.daysLeft !== null && calendar.daysLeft < 0 ? 'calendar.expired' : 'settings.noSunriseToday', { days: calendar.daysLeft }) }}
    </v-alert>
    <CalendarImport :label="$t(calendar.hasData ? 'calendar.replace' : 'calendar.import')" @imported="snackbar = true" />

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
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { mdiDeleteOutline } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import { sunriseFor } from '@/services/calendarParser';
import CalendarImport from './CalendarImport.vue';

const { t, locale } = useI18n();
const calendar = useCalendarStore();
const snackbar = ref(false);
const props = defineProps<{ now: Date }>();
const hasSunriseToday = computed(() => !!calendar.calendar && !!sunriseFor(calendar.calendar.data, props.now));

function formatDate(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' });
}

function remove() {
  if (window.confirm(t('calendar.removeConfirm'))) calendar.clear();
}
</script>
