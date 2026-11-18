<template>
  <div class="welcome">
    <v-card max-width="440" class="pa-6" rounded="xl">
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
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  overflow-y: auto;
}
</style>
