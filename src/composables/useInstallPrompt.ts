// Adapted from torah_roll_helper src/composables/installPrompt.ts.
import { computed, ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isStandalone = ref(false);
let initialized = false;

function readStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
}

function onBeforeInstallPrompt(event: Event) {
  event.preventDefault();
  isStandalone.value = readStandalone();
  if (!isStandalone.value) deferredPrompt.value = event as BeforeInstallPromptEvent;
}

function onAppInstalled() {
  deferredPrompt.value = null;
  isStandalone.value = true;
}

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  isStandalone.value = readStandalone();
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
}

/** Android/Chrome only: the native install prompt. iOS needs the manual steps in InstallGuideDialog. */
const canInstall = computed(() => deferredPrompt.value !== null && !isStandalone.value);

async function installApp() {
  const promptEvent = deferredPrompt.value;
  if (!promptEvent) return;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  deferredPrompt.value = null;
  if (outcome === 'accepted') isStandalone.value = readStandalone();
}

export function useInstallPrompt() {
  init();
  return { canInstall, installApp, isStandalone };
}
