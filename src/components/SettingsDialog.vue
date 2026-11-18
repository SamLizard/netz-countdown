<template>
  <v-dialog v-model="open" max-width="480" scrollable>
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        {{ $t('settings.title') }}
        <v-spacer />
        <v-btn :icon="mdiClose" variant="text" size="small" :aria-label="$t('settings.close')" @click="open = false" />
      </v-card-title>

      <v-card-text>
        <LanguageSelection class="mb-4" />
        <DisplaySettings :wake-lock-supported="wakeLockSupported" />

        <v-divider class="my-4" />
        <CalendarSection />

        <template v-if="!isStandalone">
          <v-divider class="my-4" />
          <v-btn block color="primary" variant="tonal" :prepend-icon="mdiCellphoneArrowDown" @click="guideOpen = true">
            {{ $t('install.open') }}
          </v-btn>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>
  <InstallGuideDialog v-model="guideOpen" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { mdiCellphoneArrowDown, mdiClose } from '@mdi/js';
import { useInstallPrompt } from '@/composables/useInstallPrompt';
import CalendarSection from './CalendarSection.vue';
import DisplaySettings from './DisplaySettings.vue';
import InstallGuideDialog from './InstallGuideDialog.vue';
import LanguageSelection from './LanguageSelection.vue';

defineProps<{ wakeLockSupported: boolean }>();
const open = defineModel<boolean>({ required: true });

const { isStandalone } = useInstallPrompt();
const guideOpen = ref(false);
</script>
