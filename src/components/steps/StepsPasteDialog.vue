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
          dir="auto"
          rows="5"
          auto-grow
          :maxlength="PASTE_MAX_CHARS"
          variant="outlined"
          hide-details
          class="mb-3"
          spellcheck="false"
          autocapitalize="off"
        />
        <StepsImportPreview v-if="items.length" :items="items" :sunrise="sunrise" @apply="onApply" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiClose } from '@mdi/js';
import type { StepsList } from '@/types';
import { PASTE_MAX_CHARS, parsePastedText } from '@/services/stepsParser';
import StepsImportPreview from './StepsImportPreview.vue';

defineProps<{ sunrise: Date | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ apply: [result: StepsList] }>();

const text = ref('');
const items = computed(() => parsePastedText(text.value));

watch(open, (value) => {
  if (value) text.value = '';
});

function onApply(result: StepsList) {
  emit('apply', result);
  open.value = false;
}
</script>
