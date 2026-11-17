<template>
  <div>
    <input ref="input" type="file" accept=".json,application/json" hidden @change="onFile" />
    <v-btn
      :color="color"
      :variant="variant"
      :loading="busy"
      :prepend-icon="mdiCalendarImport"
      block
      @click="input?.click()"
    >
      {{ label }}
    </v-btn>
    <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-3">
      {{ error }}
    </v-alert>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { mdiCalendarImport } from '@mdi/js';
import { useCalendarStore } from '@/stores/calendar';
import { CalendarError } from '@/services/calendarParser';

withDefaults(defineProps<{ label: string; color?: string; variant?: 'flat' | 'tonal' | 'outlined' }>(), {
  color: 'primary',
  variant: 'flat'
});

const emit = defineEmits<{ imported: [] }>();

const { t } = useI18n();
const calendar = useCalendarStore();
const input = ref<HTMLInputElement>();
const busy = ref(false);
const error = ref('');

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;

  busy.value = true;
  error.value = '';
  try {
    await calendar.importFile(file);
    emit('imported');
  } catch (e) {
    error.value = e instanceof CalendarError ? t(`calendar.errors.${e.code}`) : t('calendar.errors.unknown');
  } finally {
    busy.value = false;
  }
}
</script>
