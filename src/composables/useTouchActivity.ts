import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { DIM_AFTER_SECONDS } from '@/services/countdown';

/**
 * A foreground return gives auto-sleep a fresh grace period, but only a touch brightens the display.
 * Dimming has its own timer so it still works with slow countdown ticks.
 */
export function useTouchActivity(): { lastAwakeMs: Ref<number>; idle: Ref<boolean>; touch: () => void } {
  const lastAwakeMs = ref(Date.now());
  let brightenUntil = lastAwakeMs.value + DIM_AFTER_SECONDS * 1000;
  const idle = ref(false);
  let timer: number | undefined;

  function syncIdle() {
    window.clearTimeout(timer);
    const remaining = brightenUntil - Date.now();
    idle.value = remaining <= 0;
    if (!idle.value) timer = window.setTimeout(syncIdle, remaining);
  }

  function touch() {
    lastAwakeMs.value = Date.now();
    brightenUntil = lastAwakeMs.value + DIM_AFTER_SECONDS * 1000;
    syncIdle();
  }

  function onForeground() {
    if (document.visibilityState !== 'visible') return;
    lastAwakeMs.value = Date.now();
    syncIdle();
  }

  onMounted(() => {
    document.addEventListener('pointerdown', touch, { capture: true });
    document.addEventListener('visibilitychange', onForeground);
    window.addEventListener('pageshow', onForeground);
    touch();
  });

  onUnmounted(() => {
    document.removeEventListener('pointerdown', touch, { capture: true });
    document.removeEventListener('visibilitychange', onForeground);
    window.removeEventListener('pageshow', onForeground);
    window.clearTimeout(timer);
  });

  return { lastAwakeMs, idle, touch };
}
