import { onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

const REQUEST_TIMEOUT_MS = 2000;
const MAX_RETRIES = 3;

/**
 * Keeps the screen on while `enabled` is true and the page is visible.
 * iOS releases the lock when the app goes to the background, so it is requested again on return.
 */
export function useWakeLock(enabled: Ref<boolean>) {
  const supported = typeof navigator !== 'undefined' && typeof navigator.wakeLock?.request === 'function';
  const active = ref(false);
  let sentinel: WakeLockSentinel | null = null;
  let mounted = false;
  let generation = 0;
  let requestTimer: number | undefined;
  let retryTimer: number | undefined;
  let retries = 0;
  let lostFocus = false;

  const canAcquire = () => mounted && supported && enabled.value && document.visibilityState === 'visible';

  function retry(reason: unknown) {
    if (!canAcquire() || retryTimer !== undefined) return;
    if (retries >= MAX_RETRIES) {
      console.warn('Screen wake lock unavailable after retries', reason);
      return;
    }
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined;
      void acquire();
    }, 500 * 2 ** retries++);
  }

  function clearRequest() {
    window.clearTimeout(requestTimer);
    requestTimer = undefined;
  }

  function releaseLock(lock: WakeLockSentinel) {
    if (!lock.released) void lock.release().catch(error => console.warn('Screen wake lock release failed', error));
  }

  async function acquire() {
    if (!canAcquire() || requestTimer !== undefined || (sentinel && !sentinel.released)) return;
    sentinel = null;
    active.value = false;
    const request = ++generation;
    // A request interrupted by iOS suspension may never settle.
    requestTimer = window.setTimeout(() => {
      generation++;
      clearRequest();
      retry('Request timed out');
    }, REQUEST_TIMEOUT_MS);
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (request !== generation || !canAcquire()) {
        releaseLock(lock);
        return;
      }
      clearRequest();
      if (lock.released) {
        retry('Browser returned a released lock');
        return;
      }
      sentinel = lock;
      active.value = true;
      lock.addEventListener('release', () => {
        if (sentinel !== lock) return;
        sentinel = null;
        active.value = false;
        retry('Browser released the lock');
      }, { once: true });
    } catch (error) {
      if (request === generation) retry(error);
    } finally {
      if (request === generation) clearRequest();
    }
  }

  function cancelRetry() {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }

  function release() {
    generation++;
    clearRequest();
    cancelRetry();
    lostFocus = false;
    const lock = sentinel;
    sentinel = null;
    active.value = false;
    if (lock) releaseLock(lock);
  }

  function sync() {
    cancelRetry();
    retries = 0;
    if (canAcquire()) void acquire();
    else release();
  }

  function onBlur() {
    lostFocus = true;
  }

  function onFocus() {
    // A foreground return without a visibility event can leave a stale sentinel.
    if (lostFocus) release();
    sync();
  }

  watch(enabled, sync);
  onMounted(() => {
    mounted = true;
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('pointerdown', sync);
    window.addEventListener('pageshow', sync);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', release);
    sync();
  });

  onUnmounted(() => {
    mounted = false;
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('pointerdown', sync);
    window.removeEventListener('pageshow', sync);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pagehide', release);
    release();
  });

  return { supported, active };
}
