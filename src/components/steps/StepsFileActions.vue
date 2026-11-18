<template>
  <input ref="input" type="file" accept=".json,application/json" hidden @change="onFile" />
  <v-dialog v-model="previewOpen" max-width="560" scrollable>
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        <i18n-t keypath="steps.importTitle" tag="span" scope="global" class="text-truncate">
          <template #name><bdi dir="auto">{{ imported?.name || fileName }}</bdi></template>
        </i18n-t>
        <v-spacer />
        <v-btn :icon="mdiClose" variant="text" size="small" :aria-label="$t('settings.close')" @click="previewOpen = false" />
      </v-card-title>
      <v-card-text>
        <StepsImportPreview
          v-if="imported"
          :items="imported.items"
          :sunrise="sunrise"
          :incoming-name="imported.name"
          @apply="onApply"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { mdiClose } from '@mdi/js';
import type { StepsList } from '@/types';
import { useStepsStore } from '@/stores/steps';
import { parseStepsFile, serializeSteps, stepsToText, StepsError, type ParsedLine } from '@/services/stepsParser';
import { copyText, exportFileName, shareOrDownload } from '@/services/fileShare';
import StepsImportPreview from './StepsImportPreview.vue';

/** Import a steps file (with preview), export / share it, copy the list as text. Messages go to the parent snackbar. */
defineProps<{ sunrise: Date | null }>();
const emit = defineEmits<{ notify: [message: string, error?: boolean]; apply: [result: StepsList] }>();

const { t } = useI18n();
const steps = useStepsStore();
const input = ref<HTMLInputElement>();
const previewOpen = ref(false);
const fileName = ref('');
const imported = ref<{ name: string; items: ParsedLine[] } | null>(null);

async function onFile(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (!file) return;
  try {
    imported.value = parseStepsFile(await file.text());
    fileName.value = file.name;
    previewOpen.value = true;
  } catch (e) {
    emit('notify', t(`steps.errors.${e instanceof StepsError ? e.code : 'unknown'}`), true);
  }
}

function onApply(result: StepsList) {
  previewOpen.value = false;
  emit('apply', result);
}

async function exportFile() {
  const list = steps.list;
  const file = new File([serializeSteps(list, new Date())], exportFileName(list.name), { type: 'application/json' });
  const title = list.name ? t('steps.shareTitle', { name: list.name }) : t('steps.title');
  if ((await shareOrDownload(file, title)) === 'downloaded') emit('notify', t('steps.fileSaved'));
}

async function copyAsText() {
  const ok = await copyText(stepsToText(steps.list));
  emit('notify', t(ok ? 'steps.copied' : 'steps.copyFailed'), !ok);
}

defineExpose({ importFile: () => input.value?.click(), exportFile, copyAsText });
</script>
