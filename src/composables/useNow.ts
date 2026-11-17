import { onMounted, onUnmounted, ref } from 'vue';

/** Reactive current time, refreshed every `intervalMs`. */
export function useNow(intervalMs = 250) {
  const now = ref(new Date());
  let timer: number | undefined;

  onMounted(() => {
    timer = window.setInterval(() => {
      now.value = new Date();
    }, intervalMs);
  });

  onUnmounted(() => window.clearInterval(timer));

  return now;
}
