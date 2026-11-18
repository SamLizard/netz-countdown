<template>
  <v-list-item @click="emit('edit')">
    <template #prepend>
      <v-icon v-if="isSunrise" :icon="mdiLockOutline" size="small" />
    </template>
    <v-list-item-title>
      <bdi dir="auto">{{ label }}</bdi>
    </v-list-item-title>
    <p v-if="isSunrise" class="text-caption text-medium-emphasis">{{ $t('steps.sunriseReference') }}</p>
    <div v-if="time || !isSunrise" class="step-row__times">
      <bdi dir="ltr">
        <template v-if="!isSunrise">{{ formatOffset(offsetSeconds) }}<template v-if="time"> → </template></template>{{ time ? formatClock(time) : '' }}
      </bdi>
    </div>
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
  font-variant-numeric: tabular-nums;
  font-size: 0.875rem;
}

.v-list-item-title {
  white-space: normal;
  overflow-wrap: anywhere;
}
</style>
