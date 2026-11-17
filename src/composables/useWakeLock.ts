import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

/**
 * Keeps the screen on while `enabled` is true and the page is visible.
 * iOS releases the lock when the app goes to the background, so it is requested again on return.
 */
export function useWakeLock(enabled: Ref<boolean>) {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const active = ref(false);
  let sentinel: WakeLockSentinel | null = null;

  async function acquire() {
    if (!supported || !enabled.value || sentinel || document.visibilityState !== 'visible') return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      active.value = true;
      sentinel.addEventListener('release', () => {
        sentinel = null;
        active.value = false;
      });
    } catch {
      active.value = false;
    }
  }

  async function release() {
    await sentinel?.release();
    sentinel = null;
    active.value = false;
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') acquire();
  };

  watch(enabled, (value) => (value ? acquire() : release()));

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility);
    // Some browsers only grant the lock after a user gesture.
    document.addEventListener('pointerdown', acquire);
    acquire();
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('pointerdown', acquire);
    release();
  });

  return { supported, active };
}
