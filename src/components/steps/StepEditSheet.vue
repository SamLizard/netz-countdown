<template>
  <v-bottom-sheet v-model="open" content-class="step-sheet" max-width="560" scrollable>
    <v-card class="step-sheet__card" rounded="t-xl">
      <v-card-title>{{ $t(isSunrise || step ? 'steps.editTitle' : 'steps.newTitle') }}</v-card-title>
      <v-card-text>
        <p v-if="isSunrise" class="mb-3">{{ $t('steps.sunriseLocked') }}</p>
        <v-text-field
          v-model="label"
          :label="$t('steps.label')"
          :hint="$t('steps.labelHint')"
          :placeholder="isSunrise ? $t('steps.sunriseDefaultLabel') : undefined"
          :persistent-placeholder="isSunrise"
          :error-messages="touched ? labelMessages : []"
          :maxlength="LABEL_MAX + 10"
          dir="auto"
          variant="outlined"
          class="mb-2"
          @update:model-value="touched = true"
        />

        <template v-if="!isSunrise">
          <v-radio-group v-model="after" hide-details color="primary" class="mb-3">
            <v-radio :value="false" :label="$t('steps.before')" />
            <v-radio :value="true" :label="$t('steps.after')" />
          </v-radio-group>

          <div class="d-flex ga-3">
            <v-text-field
              v-model.number="minutes"
              type="number"
              inputmode="numeric"
              min="0"
              :max="after ? OFFSET_MAX / 60 : -OFFSET_MIN / 60"
              :label="$t('steps.minutes')"
              variant="outlined"
              hide-details="auto"
              @update:model-value="touched = true"
            />
            <v-text-field
              v-model.number="seconds"
              type="number"
              inputmode="numeric"
              min="0"
              max="59"
              :label="$t('steps.seconds')"
              :error-messages="touched && secondsBad ? [$t('steps.errors.secondsRange')] : []"
              variant="outlined"
              hide-details="auto"
              @update:model-value="touched = true"
            />
          </div>
          <div v-if="touched && offsetMessages.length" class="text-caption text-error mt-1">{{ offsetMessages.join(' · ') }}</div>
          <i18n-t v-if="previewClock" keypath="steps.todayAt" tag="p" scope="global" class="text-body-2 text-medium-emphasis mt-2">
            <template #time><bdi dir="ltr">{{ previewClock }}</bdi></template>
          </i18n-t>
        </template>
      </v-card-text>

      <v-card-actions class="px-4 flex-wrap">
        <v-btn v-if="step && !isSunrise" color="error" variant="text" :prepend-icon="mdiDeleteOutline" @click="emit('delete', step.id)">
          {{ $t('steps.delete') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ $t('steps.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" :disabled="errors.length > 0" @click="save">{{ $t('steps.save') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-bottom-sheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { mdiDeleteOutline } from '@mdi/js';
import type { RelativeStep } from '@/types';
import { useStepsStore } from '@/stores/steps';
import { formatClock } from '@/services/countdown';
import { LABEL_MAX, OFFSET_MAX, OFFSET_MIN, stepErrorText, validateStep, validateSunriseLabel, type StepError } from '@/services/steps';

/**
 * Edit form for one step: name, minutes + seconds, before/after sunrise.
 * `step` null = new step; `isSunrise` = rename the sunrise step only (empty name restores the default).
 */
const props = defineProps<{ step: RelativeStep | null; isSunrise: boolean; sunrise: Date | null }>();
const open = defineModel<boolean>({ required: true });
const emit = defineEmits<{ delete: [id: string] }>();

const steps = useStepsStore();
const label = ref('');
const minutes = ref<number | string>(0);
const seconds = ref<number | string>(0);
const after = ref(false);
const touched = ref(false);

watch(open, (value) => {
  if (!value) return;
  touched.value = false;
  const offset = props.step?.offsetSeconds ?? 0;
  label.value = props.isSunrise ? steps.list.sunriseLabel ?? '' : props.step?.label ?? '';
  after.value = offset > 0;
  minutes.value = props.step ? Math.floor(Math.abs(offset) / 60) : '';
  seconds.value = props.step ? Math.abs(offset) % 60 : 0;
});

const toInt = (v: number | string) => (v === '' || v === null ? 0 : Number(v));
const secondsBad = computed(() => !Number.isInteger(toInt(seconds.value)) || toInt(seconds.value) < 0 || toInt(seconds.value) > 59);
const offsetSeconds = computed(() => {
  const total = toInt(minutes.value) * 60 + toInt(seconds.value);
  return after.value ? total : -total;
});

const errors = computed<StepError[]>(() => {
  if (props.isSunrise) return validateSunriseLabel(label.value, steps.list);
  const list = validateStep({ label: label.value, offsetSeconds: offsetSeconds.value }, steps.list, props.step?.id);
  if (secondsBad.value || !Number.isInteger(toInt(minutes.value)) || toInt(minutes.value) < 0) list.push({ code: 'secondsRange' });
  return list;
});

const isLabelError = (e: StepError) => e.code.startsWith('label');
const labelMessages = computed(() => errors.value.filter(isLabelError).map(stepErrorText));
const offsetMessages = computed(() =>
  errors.value.filter((e) => !isLabelError(e) && e.code !== 'secondsRange').map(stepErrorText)
);

const previewClock = computed(() =>
  props.sunrise ? formatClock(new Date(props.sunrise.getTime() + offsetSeconds.value * 1000)) : ''
);

function save() {
  const result = props.isSunrise
    ? steps.setSunriseLabel(label.value)
    : props.step
      ? steps.updateStep(props.step.id, { label: label.value, offsetSeconds: offsetSeconds.value })
      : steps.addStep({ label: label.value, offsetSeconds: offsetSeconds.value });
  if (result.length === 0) open.value = false;
  else touched.value = true;
}
</script>

<style scoped>
:global(.v-bottom-sheet > .v-overlay__content.v-bottom-sheet__content.step-sheet) {
  left: env(safe-area-inset-left);
  right: env(safe-area-inset-right);
  width: calc(100% - env(safe-area-inset-left) - env(safe-area-inset-right));
  max-height: calc(100% - env(safe-area-inset-top) - 0.5rem);
}

.step-sheet__card > .v-card-actions {
  flex: none;
  row-gap: 0.25rem;
  padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
}
</style>
