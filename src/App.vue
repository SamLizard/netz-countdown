<template>
  <v-app :theme="theme">
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const theme = settings.theme;
</script>
