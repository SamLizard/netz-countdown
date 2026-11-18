<template>
  <v-list-item :subtitle="isSunrise ? $t('steps.sunriseLocked') : undefined" @click="emit('edit')">
    <template #prepend>
      <v-icon v-if="isSunrise" :icon="mdiLockOutline" size="small" />
    </template>
    <v-list-item-title>
      <bdi dir="auto">{{ label }}</bdi>
    </v-list-item-title>
    <template #append>
      <span class="step-row__times">
        {{ formatOffset(offsetSeconds) }}<template v-if="time"> → {{ formatClock(time) }}</template>
      </span>
    </template>
  </v-list-item>
</template>

<script setup lang="ts">
import { mdiLockOutline } from '@mdi/js';
import { formatClock } from '@/services/countdown';
import { formatOffset } from '@/services/steps';

/** One editor row: "Kaddish   −21:00 → 05:55:45". */
defineProps<{ label: string; offsetSeconds: number; time: Date | null; isSunrise: boolean }>();
const emit = defineEmits<{ edit: [] }>();
</script>

<style scoped>
.step-row__times {
  direction: ltr;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  margin-inline-start: 0.75rem;
}
</style>
