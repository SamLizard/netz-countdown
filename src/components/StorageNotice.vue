<template>
  <v-alert
    v-if="visible"
    type="warning"
    variant="tonal"
    density="comfortable"
    :icon="mdiCellphoneArrowDown"
    class="storage-notice"
  >
    <div class="text-body-2">{{ $t('install.storageWarning') }}</div>
    <div class="d-flex flex-wrap ga-2 mt-3">
      <v-btn size="small" color="warning" variant="flat" @click="guideOpen = true">
        {{ $t('install.howTo') }}
      </v-btn>
      <v-btn size="small" variant="text" @click="settings.storageNoticeDismissed = true">
        {{ $t('install.notNow') }}
      </v-btn>
    </div>
    <InstallGuideDialog v-model="guideOpen" />
  </v-alert>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { mdiCellphoneArrowDown } from '@mdi/js';
import { useSettingsStore } from '@/stores/settings';
import { useShowStorageNotice } from '@/composables/useStorageStatus';
import InstallGuideDialog from './InstallGuideDialog.vue';

const settings = useSettingsStore();
const guideOpen = ref(false);
const visible = useShowStorageNotice();
</script>
