<template>
  <div>
    <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ $t('steps.title') }}</h3>
    <p class="text-caption text-medium-emphasis mb-2">{{ $t('steps.sectionHint') }}</p>
    <div class="text-body-2 mb-3">
      {{ steps.hasSteps ? $t('steps.summaryCount', steps.count) : $t('steps.summaryNone') }}
    </div>
    <v-btn block variant="tonal" color="primary" :prepend-icon="mdiFormatListNumbered" @click="editorOpen = true">
      {{ $t(steps.hasSteps ? 'steps.editSteps' : 'steps.addSteps') }}
    </v-btn>
    <StepsEditorDialog v-model="editorOpen" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { mdiFormatListNumbered } from '@mdi/js';
import { useStepsStore } from '@/stores/steps';
import StepsEditorDialog from './StepsEditorDialog.vue';

const steps = useStepsStore();
const editorOpen = ref(false);
</script>
