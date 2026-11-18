import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import { SLEEP_GRACE_SECONDS, SLEEP_WARNING_SECONDS, sleepPhase } from '@/services/countdown';
import type { SleepPhase } from '@/types';

/**
 * After the target, turns the screen black and lets the phone lock when nobody touches it.
 * A web app cannot lock the phone itself: releasing the wake lock lets iOS Auto-Lock do it.
 */
export function useAutoSleep(now: Ref<Date>, targetMs: Ref<number | null>, enabled: Ref<boolean>) {
  const lastTouchMs = ref(Date.now());

  const touch = () => {
    lastTouchMs.value = Date.now();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') touch();
  };

  onMounted(() => {
    document.addEventListener('pointerdown', touch, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
  });
  onUnmounted(() => {
    document.removeEventListener('pointerdown', touch, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
  });

  const phase = computed<SleepPhase>(() => {
    if (!enabled.value || targetMs.value === null) return 'awake';
    return sleepPhase(now.value.getTime(), targetMs.value, lastTouchMs.value);
  });

  /** Seconds left in the warning before the screen goes black. */
  const warningSecondsLeft = computed(() => {
    if (phase.value !== 'warning' || targetMs.value === null) return 0;
    const start = Math.max(targetMs.value, lastTouchMs.value) + SLEEP_GRACE_SECONDS * 1000;
    return Math.max(0, Math.ceil((start + SLEEP_WARNING_SECONDS * 1000 - now.value.getTime()) / 1000));
  });

  return { phase, warningSecondsLeft, wake: touch };
}
