<template>
  <v-dialog v-model="open" fullscreen scrollable transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar density="comfortable" color="surface">
        <v-btn :icon="mdiClose" :aria-label="$t('settings.close')" @click="open = false" />
        <v-toolbar-title>{{ $t('steps.title') }}</v-toolbar-title>
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" :icon="mdiDotsVertical" :aria-label="$t('steps.moreActions')" />
          </template>
          <v-list density="compact">
            <v-list-item :prepend-icon="mdiFileImportOutline" :title="$t('steps.importFile')" @click="files?.importFile()" />
            <v-list-item :prepend-icon="mdiClipboardTextOutline" :title="$t('steps.paste')" @click="pasteOpen = true" />
            <v-list-item :prepend-icon="mdiShareVariantOutline" :title="$t('steps.exportFile')" @click="files?.exportFile()" />
            <v-list-item :prepend-icon="mdiContentCopy" :title="$t('steps.copyText')" @click="files?.copyAsText()" />
            <v-list-item
              v-if="steps.hasSteps"
              :prepend-icon="mdiDeleteSweepOutline"
              :title="$t('steps.deleteAll')"
              base-color="error"
              @click="deleteAll"
            />
          </v-list>
        </v-menu>
      </v-toolbar>

      <v-card-text class="editor">
        <v-text-field
          :model-value="steps.list.name"
          :label="$t('steps.listName')"
          :hint="$t('steps.listNameHint')"
          :maxlength="NAME_MAX"
          dir="auto"
          variant="outlined"
          density="comfortable"
          @update:model-value="steps.setName"
        />

        <p class="text-caption text-medium-emphasis mt-2 mb-1">
          {{ sunrise ? $t('steps.previewFor', { date: dayLabel }) : $t('steps.noPreview') }}
        </p>

        <v-list lines="two" class="mb-2">
          <StepRow
            v-for="row in rows"
            :key="row.id"
            :label="row.label"
            :offset-seconds="row.offsetSeconds"
            :time="sunrise ? new Date(sunrise.getTime() + row.offsetSeconds * 1000) : null"
            :is-sunrise="row.isSunrise"
            @edit="edit(row.id)"
          />
        </v-list>

        <p v-if="!steps.hasSteps" class="text-body-2 text-medium-emphasis mb-3">{{ $t('steps.empty') }}</p>
        <v-btn block color="primary" :prepend-icon="mdiPlus" :disabled="steps.count + 1 >= MAX_STEPS" @click="edit(null)">
          {{ $t('steps.addStep') }}
        </v-btn>
      </v-card-text>
    </v-card>

    <StepEditSheet v-model="sheetOpen" :step="editing" :is-sunrise="editingSunrise" :sunrise="sunrise" @delete="remove" />
    <StepsPasteDialog v-model="pasteOpen" :sunrise="sunrise" @apply="apply" />
    <StepsFileActions ref="files" :sunrise="sunrise" @apply="apply" @notify="notify" />

    <v-snackbar v-model="snackbar.show" :timeout="5000" :color="snackbar.error ? 'error' : undefined">
      {{ snackbar.message }}
      <template v-if="snackbar.undo" #actions>
        <v-btn variant="text" @click="undo">{{ $t('steps.undo') }}</v-btn>
      </template>
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  mdiClipboardTextOutline,
  mdiClose,
  mdiContentCopy,
  mdiDeleteSweepOutline,
  mdiDotsVertical,
  mdiFileImportOutline,
  mdiPlus,
  mdiShareVariantOutline
} from '@mdi/js';
import type { RelativeStep, StepsList } from '@/types';
import { useCalendarStore } from '@/stores/calendar';
import { useStepsStore } from '@/stores/steps';
import { resolveTarget } from '@/services/countdown';
import { MAX_STEPS, NAME_MAX, SUNRISE_ID, sunriseDisplayLabel } from '@/services/steps';
import StepRow from './StepRow.vue';
import StepEditSheet from './StepEditSheet.vue';
import StepsPasteDialog from './StepsPasteDialog.vue';
import StepsFileActions from './StepsFileActions.vue';

/** Full-screen list of prayer steps. Every change is saved at once (store persistence). */
const open = defineModel<boolean>({ required: true });

const { t, locale } = useI18n();
const calendar = useCalendarStore();
const steps = useStepsStore();
const files = ref<InstanceType<typeof StepsFileActions>>();

// The day the home screen uses (today, or tomorrow after the late window), fixed while the dialog is open.
const openedAt = ref(new Date());
watch(open, (value) => value && (openedAt.value = new Date()));
const sunrise = computed(() => (calendar.calendar ? resolveTarget(calendar.calendar.data, openedAt.value)?.date ?? null : null));
const dayLabel = computed(() => sunrise.value?.toLocaleDateString(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }) ?? '');

const rows = computed(() =>
  [
    ...steps.list.steps.map((s) => ({ id: s.id, label: s.label, offsetSeconds: s.offsetSeconds, isSunrise: false })),
    { id: SUNRISE_ID, label: sunriseDisplayLabel(steps.list), offsetSeconds: 0, isSunrise: true }
  ].sort((a, b) => a.offsetSeconds - b.offsetSeconds)
);

const sheetOpen = ref(false);
const editing = ref<RelativeStep | null>(null);
const editingSunrise = ref(false);

function edit(id: string | null) {
  editingSunrise.value = id === SUNRISE_ID;
  editing.value = id && id !== SUNRISE_ID ? steps.list.steps.find((s) => s.id === id) ?? null : null;
  sheetOpen.value = true;
}

const snackbar = reactive({ show: false, message: '', undo: false, error: false });
function notify(message: string, error = false, undo = false) {
  Object.assign(snackbar, { show: true, message, error, undo });
}

function remove(id: string) {
  steps.removeStep(id);
  sheetOpen.value = false;
  notify(t('steps.deleted'), false, true);
}

function deleteAll() {
  if (!window.confirm(t('steps.deleteAllConfirm'))) return;
  steps.clearSteps();
  notify(t('steps.deleted'), false, true);
}

const pasteOpen = ref(false);
function apply(result: StepsList) {
  steps.apply(result);
  notify(t('steps.applied'), false, true);
}

function undo() {
  steps.undo();
  snackbar.show = false;
}
</script>

<style scoped>
.editor {
  max-width: 640px;
  margin: 0 auto;
  width: 100%;
}
</style>
