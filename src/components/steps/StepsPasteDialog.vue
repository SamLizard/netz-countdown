<template>
  <v-dialog v-model="open" max-width="560" scrollable>
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        {{ $t('steps.pasteTitle') }}
        <v-spacer />
        <v-btn :icon="mdiClose" variant="text" size="small" :aria-label="$t('settings.close')" @click="open = false" />
      </v-card-title>
      <v-card-text>
        <p class="text-caption text-medium-emphasis mb-3">{{ $t('steps.pasteHint') }}</p>
        <v-textarea
          v-model="text"
          :label="$t('steps.pasteInput')"
          dir="auto"
          rows="3"
          max-rows="8"
          auto-grow
          :maxlength="MAX_STEPS_INPUT_LENGTH"
          variant="outlined"
          hide-details
          class="mb-3"
          spellcheck="false"
          autocapitalize="off"
        />
        <v-alert v-if="parsed.error" type="error" variant="tonal" density="compact">
          {{ $t(`steps.errors.${parsed.error}`) }}
        </v-alert>
        <StepsImportPreview
          v-else-if="parsed.result?.items.length"
          :items="parsed.result.items"
          :incoming-name="parsed.result.name"
          :sunrise="sunrise"
          @apply="onApply"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiClose } from '@mdi/js';
import type { StepsList } from '@/types';
import { MAX_STEPS_INPUT_LENGTH, parseStepsInput, StepsError } from '@/services/stepsParser';
import StepsImportPreview from './StepsImportPreview.vue';

defineProps<{ sunrise: Date | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ apply: [result: StepsList] }>();

const text = ref('');
const parsed = computed(() => {
  try {
    return { result: parseStepsInput(text.value) };
  } catch (error) {
    if (error instanceof StepsError) return { error: error.code };
    throw error;
  }
});

watch(open, (value) => {
  if (value) text.value = '';
});

function onApply(result: StepsList) {
  emit('apply', result);
  open.value = false;
}
</script>
