import { computed, type Ref } from 'vue';
import { useCalendarStore } from '@/stores/calendar';
import { useSettingsStore } from '@/stores/settings';
import { useStepsStore } from '@/stores/steps';
import { currentIndex, resolvePlan } from '@/services/steps';

/**
 * The day's plan (prayer steps + sunrise) and the live step, all derived from the clock on each tick.
 * Nothing about the current step is stored, so coming back from background always shows the right step.
 * With no extra steps the plan is the single sunrise step, i.e. the original countdown.
 */
export function useStepPlan(now: Ref<Date>) {
  const calendar = useCalendarStore();
  const settings = useSettingsStore();
  const steps = useStepsStore();

  const resolved = computed(() =>
    calendar.calendar ? resolvePlan(calendar.calendar.data, steps.list, now.value, settings.warningMinutes * 60) : null
  );
  const plan = computed(() => resolved.value?.plan ?? []);

  /** First step still in the future; plan.length once all have passed (late display). */
  const rawIndex = computed(() => currentIndex(plan.value, now.value));
  /** Live step shown on screen: after the last step, the last one stays (with "+MM:SS"). */
  const liveIndex = computed(() => Math.min(rawIndex.value, plan.value.length - 1));
  const liveStep = computed(() => plan.value[liveIndex.value] ?? null);
  const lastStep = computed(() => plan.value[plan.value.length - 1] ?? null);

  return {
    plan,
    liveIndex,
    liveStep,
    lastStep,
    sunrise: computed(() => resolved.value?.sunrise ?? null),
    hebrewDate: computed(() => resolved.value?.hebrewDate)
  };
}
