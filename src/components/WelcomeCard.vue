<template>
  <div class="welcome">
    <v-card max-width="440" class="w-100 pa-4 pa-sm-6" rounded="xl">
      <v-card-title class="text-h5 text-wrap px-0">{{ $t('calendar.welcomeTitle') }}</v-card-title>
      <v-card-text class="px-0">
        <StorageNotice class="mb-4" />
        <p class="mb-3">{{ $t('calendar.welcomeText') }}</p>
        <p class="text-medium-emphasis text-body-2 mb-6">
          <v-icon :icon="mdiShieldLockOutline" size="small" class="me-1" />{{ $t('calendar.privacy') }}
        </p>
        <CalendarImport :label="$t('calendar.import')" />
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { mdiShieldLockOutline } from '@mdi/js';
import CalendarImport from './CalendarImport.vue';
import StorageNotice from './StorageNotice.vue';
</script>

<style scoped>
.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem calc(1rem + env(safe-area-inset-right)) calc(0.75rem + env(safe-area-inset-bottom))
    calc(1rem + env(safe-area-inset-left));
}
</style>
