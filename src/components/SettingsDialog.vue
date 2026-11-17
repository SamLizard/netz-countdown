<template>
  <v-dialog v-model="open" max-width="480" scrollable>
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        {{ $t('settings.title') }}
        <v-spacer />
        <v-btn :icon="mdiClose" variant="text" size="small" :aria-label="$t('settings.close')" @click="open = false" />
      </v-card-title>

      <v-card-text>
        <div class="text-subtitle-2 mb-2">{{ $t('settings.language') }}</div>
        <v-btn-toggle v-model="settings.locale" mandatory divided variant="outlined" class="mb-6">
          <v-btn value="en">English</v-btn>
          <v-btn value="fr">Français</v-btn>
        </v-btn-toggle>

        <div class="text-subtitle-2">{{ $t('settings.display') }}</div>
        <v-switch
          v-model="settings.blackBackground"
          :label="$t('settings.blackBackground')"
          :hint="$t('settings.blackBackgroundHint')"
          persistent-hint
          color="primary"
          class="mb-2"
        />
        <v-switch
          v-model="settings.keepAwake"
          :label="$t('settings.keepAwake')"
          :hint="$t(wakeLockSupported ? 'settings.keepAwakeHint' : 'settings.keepAwakeUnsupported')"
          :disabled="!wakeLockSupported"
          persistent-hint
          color="primary"
          class="mb-4"
        />

        <v-slider
          v-model="settings.warningMinutes"
          :label="$t('settings.warningMinutes')"
          :min="1"
          :max="30"
          :step="1"
          thumb-label
          color="primary"
          class="mb-6"
        />

        <v-divider class="mb-4" />
        <CalendarSection />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiClose } from '@mdi/js';
import { useSettingsStore } from '@/stores/settings';
import CalendarSection from './CalendarSection.vue';

defineProps<{ wakeLockSupported: boolean }>();
const open = defineModel<boolean>({ required: true });

const settings = useSettingsStore();
</script>
