<template>
  <v-dialog v-model="open" max-width="520" scrollable>
    <v-card rounded="xl">
      <v-card-title class="text-h6 font-weight-bold text-wrap">{{ $t('install.title') }}</v-card-title>

      <v-card-text>
        <p class="text-body-2 mb-4">{{ $t('install.subtitle') }}</p>

        <div class="d-flex align-center mb-2">
          <v-icon :icon="mdiAppleSafari" class="me-2" color="primary" />
          <h3 class="text-subtitle-1 font-weight-bold">{{ $t('install.ios.title') }}</h3>
        </div>
        <ol class="install-steps">
          <li v-for="step in 4" :key="step">{{ $t(`install.ios.step${step}`) }}</li>
        </ol>

        <v-divider class="my-4" />

        <div class="d-flex align-center mb-2">
          <v-icon :icon="mdiAndroid" class="me-2" color="primary" />
          <h3 class="text-subtitle-1 font-weight-bold">{{ $t('install.android.title') }}</h3>
        </div>
        <ol class="install-steps">
          <li v-for="step in 3" :key="step">{{ $t(`install.android.step${step}`) }}</li>
        </ol>

        <v-btn v-if="canInstall" class="mt-3" color="primary" :prepend-icon="mdiCellphoneArrowDown" @click="install">
          {{ $t('install.installNow') }}
        </v-btn>

        <p class="text-body-2 text-medium-emphasis mt-4">{{ $t('install.afterInstall') }}</p>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">{{ $t('settings.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// Adapted from torah_roll_helper src/components/InstallGuideDialog.vue.
import { mdiAndroid, mdiAppleSafari, mdiCellphoneArrowDown } from '@mdi/js';
import { useInstallPrompt } from '@/composables/useInstallPrompt';

const open = defineModel<boolean>({ required: true });
const { canInstall, installApp } = useInstallPrompt();

async function install() {
  await installApp();
  open.value = false;
}
</script>

<style scoped>
.install-steps {
  padding-inline-start: 24px;
}

.install-steps li + li {
  margin-top: 6px;
}
</style>
