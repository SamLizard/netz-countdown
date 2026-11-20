import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

/**
 * Keeps the screen on while `enabled` is true and the page is visible.
 * iOS releases the lock when the app goes to the background, so it is requested again on return.
 */
export function useWakeLock(enabled: Ref<boolean>) {
  const supported = typeof navigator !== 'undefined' && typeof navigator.wakeLock?.request === 'function';
  const active = ref(false);
  let sentinel: WakeLockSentinel | null = null;
  let mounted = false;
  let pageHidden = false;
  let pending = false;
  let retryTimer: number | undefined;
  let retries = 0;

  const canAcquire = () => mounted && !pageHidden && supported && enabled.value && document.visibilityState === 'visible';

  function retry() {
    if (!canAcquire() || retryTimer !== undefined || retries >= 3) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined;
      void acquire();
    }, 500 * 2 ** retries++);
  }

  async function acquire() {
    if (!canAcquire() || pending || (sentinel && !sentinel.released)) return;
    sentinel = null;
    active.value = false;
    pending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!canAcquire()) {
        await lock.release();
        return;
      }
      if (lock.released) {
        retry();
        return;
      }
      sentinel = lock;
      active.value = true;
      lock.addEventListener('release', () => {
        if (sentinel !== lock) return;
        sentinel = null;
        active.value = false;
        retry();
      }, { once: true });
    } catch {
      // iOS can reject a request while the app is returning to the foreground.
      retry();
    } finally {
      pending = false;
    }
  }

  function cancelRetry() {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function release() {
    cancelRetry();
    const lock = sentinel;
    sentinel = null;
    active.value = false;
    if (lock && !lock.released) void lock.release().catch(error => console.warn('Screen wake lock release failed', error));
  }

  function sync() {
    cancelRetry();
    retries = 0;
    if (canAcquire()) void acquire();
    else release();
  }

  function onPageShow() {
    pageHidden = false;
    sync();
  }

  function onPageHide() {
    pageHidden = true;
    release();
  }

  watch(enabled, sync);
  onMounted(() => {
    mounted = true;
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('pointerdown', sync);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('focus', sync);
    window.addEventListener('pagehide', onPageHide);
    sync();
  });

  onUnmounted(() => {
    mounted = false;
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('pointerdown', sync);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('focus', sync);
    window.removeEventListener('pagehide', onPageHide);
    release();
  });

  return { supported, active };
}
