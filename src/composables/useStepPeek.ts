import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';

/** Minimum horizontal travel for a swipe, in CSS pixels. */
const SWIPE_MIN_PX = 50;
/** Coming back to the app after this long in background returns to live. */
const BACKGROUND_RESET_MS = 5 * 60 * 1000;

/**
 * Looking at other steps than the live one ("peek").
 * Product rule: a peek stays until the user comes back to the live step himself (swipe, arrows, or the
 * "Back to live" chip). No timer. It also ends when the live step catches up with the peeked step, when the
 * list changes (`resetKey`), or after more than 5 min in background.
 *
 * Input: horizontal swipe starting on the countdown (≥ 50 px, more horizontal than vertical), ArrowLeft/ArrowRight.
 * In LTR swipe left = next; mirrored in RTL. No wrap at the ends.
 */
export function useStepPeek(options: {
  liveIndex: Ref<number>;
  count: Ref<number>;
  enabled: Ref<boolean>;
  rtl: Ref<boolean>;
  resetKey: Ref<unknown>;
}) {
  const { liveIndex, count, enabled, rtl, resetKey } = options;
  const peekIndex = ref<number | null>(null);

  const isPeeking = computed(() => peekIndex.value !== null);
  const shownIndex = computed(() => peekIndex.value ?? liveIndex.value);

  function goTo(index: number) {
    const clamped = Math.max(0, Math.min(count.value - 1, index));
    peekIndex.value = clamped === liveIndex.value ? null : clamped;
  }

  const next = () => goTo(shownIndex.value + 1);
  const prev = () => goTo(shownIndex.value - 1);
  const backToLive = () => (peekIndex.value = null);

  watch(liveIndex, (index) => {
    if (index === peekIndex.value) backToLive();
  });
  watch(resetKey, backToLive, { deep: true });

  let start: { id: number; x: number; y: number } | null = null;
  function startSwipe(e: PointerEvent) {
    if (!enabled.value || !e.isPrimary || e.button !== 0 || e.pointerType === 'mouse') return;
    if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
    start = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  const onUp = (e: PointerEvent) => {
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (!enabled.value || Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
    // LTR: finger to the left (dx < 0) shows the next step.
    if (dx < 0 !== rtl.value) next();
    else prev();
  };
  const onCancel = () => (start = null);

  const onKey = (e: KeyboardEvent) => {
    if (!enabled.value || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const el = e.target as HTMLElement | null;
    if (el && (el.isContentEditable || el.closest('input, textarea, select, [role="dialog"]'))) return;
    if (e.key === 'ArrowRight' !== rtl.value) next();
    else prev();
  };

  let hiddenAt = 0;
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > BACKGROUND_RESET_MS) backToLive();
  };

  onMounted(() => {
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisibility);
  });

  onUnmounted(() => {
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVisibility);
  });

  return { peekIndex, isPeeking, shownIndex, next, prev, goTo, backToLive, startSwipe };
}
