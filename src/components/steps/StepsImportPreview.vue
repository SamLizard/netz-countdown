<template>
  <div>
    <v-table v-if="preview.rows.length" density="compact" class="preview__table mb-3">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ $t('steps.colLabel') }}</th>
          <th>{{ $t('steps.colOffset') }}</th>
          <th v-if="sunrise">{{ $t('steps.colTime') }}</th>
          <th>{{ $t('steps.colStatus') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in preview.rows" :key="row.lineNo">
          <td>{{ row.lineNo }}</td>
          <td><bdi dir="auto">{{ row.label }}</bdi></td>
          <td class="preview__num">{{ row.offsetSeconds !== undefined ? formatOffset(row.offsetSeconds) : '' }}</td>
          <td v-if="sunrise" class="preview__num">{{ clockFor(row.offsetSeconds) }}</td>
          <td :class="row.status === 'error' ? 'text-error' : 'text-medium-emphasis'">
            {{ row.error ? stepErrorText(row.error) : $t(STATUS_KEYS[row.status]) }}
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-radio-group v-model="mode" hide-details class="mb-2">
      <v-radio value="merge">
        <template #label>
          <div>
            <div>{{ $t('steps.modeMerge') }}</div>
            <div class="text-caption text-medium-emphasis">{{ $t('steps.modeMergeHint') }}</div>
          </div>
        </template>
      </v-radio>
      <v-radio value="replace">
        <template #label>
          <div>
            <div>{{ $t('steps.modeReplace') }}</div>
            <div class="text-caption text-medium-emphasis">{{ $t('steps.modeReplaceHint') }}</div>
          </div>
        </template>
      </v-radio>
    </v-radio-group>

    <p v-if="errorCount" class="text-caption text-error mb-2">{{ $t('steps.ignoredLines', errorCount) }}</p>
    <v-btn block color="primary" :disabled="preview.applicable === 0" @click="emit('apply', preview.result)">
      {{ $t('steps.apply', { count: preview.applicable }) }}
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { StepsList } from '@/types';
import { useStepsStore } from '@/stores/steps';
import { formatClock } from '@/services/countdown';
import { formatOffset, stepErrorText } from '@/services/steps';
import { previewMerge, type MergeMode, type ParsedLine, type PreviewStatus } from '@/services/stepsParser';

/** Preview table of pasted or imported steps, Merge / Replace choice, and Apply. Shared by paste and file import. */
const props = defineProps<{ items: ParsedLine[]; sunrise: Date | null; incomingName?: string }>();
const emit = defineEmits<{ apply: [result: StepsList] }>();

const STATUS_KEYS: Record<PreviewStatus, string> = {
  new: 'steps.statusNew',
  updated: 'steps.statusUpdated',
  unchanged: 'steps.statusUnchanged',
  error: 'steps.colStatus'
};

const steps = useStepsStore();
const mode = ref<MergeMode>('merge');

const preview = computed(() => previewMerge(steps.list, props.items, mode.value, props.incomingName));
const errorCount = computed(() => preview.value.rows.filter((r) => r.status === 'error').length);

function clockFor(offset?: number) {
  return props.sunrise && offset !== undefined ? formatClock(new Date(props.sunrise.getTime() + offset * 1000)) : '';
}
</script>

<style scoped>
.preview__table {
  max-height: 40vh;
  overflow-y: auto;
}

.preview__num {
  direction: ltr;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
