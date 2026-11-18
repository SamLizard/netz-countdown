import { onMounted, onUnmounted, ref, type Ref } from 'vue';
import { DIM_AFTER_SECONDS } from '@/services/countdown';

/**
 * Last time the user touched the screen (or came back to the app), plus an `idle` flag that turns
 * true DIM_AFTER_SECONDS later. The flag has its own timer, so it is on time even with slow clock ticks.
 */
export function useTouchActivity(): { lastTouchMs: Ref<number>; idle: Ref<boolean>; touch: () => void } {
  const lastTouchMs = ref(Date.now());
  const idle = ref(false);
  let timer: number | undefined;

  function touch() {
    lastTouchMs.value = Date.now();
    idle.value = false;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => (idle.value = true), DIM_AFTER_SECONDS * 1000);
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') touch();
  };

  onMounted(() => {
    document.addEventListener('pointerdown', touch, { capture: true });
    document.addEventListener('visibilitychange', onVisibility);
    touch();
  });

  onUnmounted(() => {
    document.removeEventListener('pointerdown', touch, { capture: true });
    document.removeEventListener('visibilitychange', onVisibility);
    window.clearTimeout(timer);
  });

  return { lastTouchMs, idle, touch };
}
