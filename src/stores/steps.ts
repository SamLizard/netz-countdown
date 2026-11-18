import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { RelativeStep, StepsList } from '@/types';
import {
  emptyList,
  LABEL_MAX,
  NAME_MAX,
  newStepId,
  OFFSET_MAX,
  OFFSET_MIN,
  validateStep,
  validateSunriseLabel,
  type StepError
} from '@/services/steps';

const STORAGE_KEY = 'netz.steps.v1';

type StepInput = Pick<RelativeStep, 'label' | 'offsetSeconds'>;

const isValidStored = (s: unknown): s is RelativeStep => {
  const step = s as Partial<RelativeStep> | null;
  return (
    !!step &&
    typeof step.id === 'string' &&
    typeof step.label === 'string' &&
    step.label.trim().length > 0 &&
    step.label.length <= LABEL_MAX &&
    Number.isInteger(step.offsetSeconds) &&
    step.offsetSeconds !== 0 &&
    (step.offsetSeconds as number) >= OFFSET_MIN &&
    (step.offsetSeconds as number) <= OFFSET_MAX
  );
};

/** Missing or invalid stored value = empty list (the app then behaves as without steps). */
function load(): StepsList {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<StepsList> | null;
    if (!raw || typeof raw !== 'object') return emptyList();
    return {
      name: typeof raw.name === 'string' ? raw.name.slice(0, NAME_MAX) : '',
      sunriseLabel: typeof raw.sunriseLabel === 'string' && raw.sunriseLabel.trim() ? raw.sunriseLabel : null,
      steps: Array.isArray(raw.steps) ? raw.steps.filter(isValidStored) : []
    };
  } catch {
    return emptyList();
  }
}

const clone = (list: StepsList): StepsList => ({ ...list, steps: list.steps.map((s) => ({ ...s })) });

export const useStepsStore = defineStore('steps', () => {
  const list = ref<StepsList>(load());
  /** Snapshot taken before the last remove / clear / apply, for Undo. Memory only. */
  const undoSnapshot = ref<StepsList | null>(null);

  const hasSteps = computed(() => list.value.steps.length > 0);
  const count = computed(() => list.value.steps.length);
  const sortedSteps = computed(() => [...list.value.steps].sort((a, b) => a.offsetSeconds - b.offsetSeconds));

  watch(
    list,
    (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, ...value })),
    { deep: true }
  );

  const remember = () => (undoSnapshot.value = clone(list.value));

  function addStep(input: StepInput): StepError[] {
    const errors = validateStep(input, list.value);
    if (!errors.length) list.value.steps.push({ id: newStepId(), label: input.label.trim(), offsetSeconds: input.offsetSeconds });
    return errors;
  }

  function updateStep(id: string, input: StepInput): StepError[] {
    const errors = validateStep(input, list.value, id);
    const step = list.value.steps.find((s) => s.id === id);
    if (!errors.length && step) {
      step.label = input.label.trim();
      step.offsetSeconds = input.offsetSeconds;
    }
    return errors;
  }

  function removeStep(id: string) {
    remember();
    list.value.steps = list.value.steps.filter((s) => s.id !== id);
  }

  /** Empty label = back to the localized default. */
  function setSunriseLabel(label: string): StepError[] {
    const errors = validateSunriseLabel(label, list.value);
    if (!errors.length) list.value.sunriseLabel = label.trim() || null;
    return errors;
  }

  function setName(name: string) {
    list.value.name = name.slice(0, NAME_MAX);
  }

  /** Result of a paste or file import (already validated by previewMerge). */
  function apply(result: StepsList) {
    remember();
    list.value = clone(result);
  }

  function clearSteps() {
    remember();
    list.value.steps = [];
  }

  function undo() {
    if (!undoSnapshot.value) return;
    list.value = undoSnapshot.value;
    undoSnapshot.value = null;
  }

  return { list, hasSteps, count, sortedSteps, addStep, updateStep, removeStep, setSunriseLabel, setName, apply, clearSteps, undo };
});
