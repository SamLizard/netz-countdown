import { onMounted, onUnmounted, ref, watch } from 'vue';
import { nextTickDelay } from '@/services/countdown';

export interface TickPolicy {
  /** Countdown target, or null when there is none. */
  targetMs: number | null;
  /** Inside this window before the target (and after it) the clock ticks every second. */
  warningSeconds: number;
  /** Tick step in seconds while the target is further away. */
  farStepSeconds: number;
}

/**
 * Reactive current time with an adaptive refresh rate, to save battery:
 * slow ticks while sunrise is far, one per second when close. Ticks stop while the page is hidden.
 * Time is always read from the clock, so late timers (Low Power Mode) only delay the display.
 *
 * `policy` is read lazily (from onMounted on), so it may depend on values computed from `now`.
 */
export function useNow(policy: () => TickPolicy) {
  const now = ref(new Date());
  let timer: number | undefined;

  function schedule() {
    window.clearTimeout(timer);
    if (document.visibilityState !== 'visible') return;
    const { targetMs, warningSeconds, farStepSeconds } = policy();
    timer = window.setTimeout(tick, nextTickDelay(Date.now(), targetMs, warningSeconds, farStepSeconds));
  }

  function tick() {
    now.value = new Date();
    schedule();
  }

  const onVisibility = () => (document.visibilityState === 'visible' ? tick() : window.clearTimeout(timer));

  onMounted(() => {
    // Primitive key: re-schedule only when the target or a setting really changes, not on every tick.
    watch(() => {
      const p = policy();
      return `${p.targetMs}|${p.warningSeconds}|${p.farStepSeconds}`;
    }, schedule);
    document.addEventListener('visibilitychange', onVisibility);
    tick();
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearTimeout(timer);
  });

  return now;
}
