import { computed, ref } from 'vue';
import { useInstallPrompt } from './useInstallPrompt';

const persisted = ref<boolean | null>(null);
let checked = false;

async function check() {
  try {
    persisted.value = (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    persisted.value = false;
  }
}

/**
 * Whether the imported calendar is safe from automatic deletion.
 * Safari deletes site data after about 7 days without a visit, except for Home Screen apps
 * and storage the browser marked as persistent.
 */
export function useStorageStatus() {
  const { isStandalone } = useInstallPrompt();
  if (!checked) {
    checked = true;
    check();
  }

  const isSafe = computed(() => isStandalone.value || persisted.value === true);
  /** False until the browser answered, to avoid flashing a warning. */
  const isKnown = computed(() => isStandalone.value || persisted.value !== null);

  return { isSafe, isKnown, isStandalone, recheck: check };
}
