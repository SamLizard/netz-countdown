<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';

// Creating the store applies the saved language before the first render.
useSettingsStore();
</script>
