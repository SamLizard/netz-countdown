<template>
  <div>
    <v-select
      v-model="choice"
      :items="items"
      :label="$t('settings.farRefresh')"
      :hint="$t('settings.farRefreshHint')"
      persistent-hint
      variant="outlined"
      density="comfortable"
    />
    <v-text-field
      v-if="choice === CUSTOM"
      v-model.number="custom"
      type="number"
      inputmode="numeric"
      :min="FAR_REFRESH_MIN"
      :max="FAR_REFRESH_MAX"
      :label="$t('settings.refresh.customSeconds')"
      :suffix="$t('settings.refresh.secondsSuffix')"
      :rules="[inRange]"
      variant="outlined"
      density="comfortable"
      class="mt-3"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { FAR_REFRESH_MAX, FAR_REFRESH_MIN, clampFarRefresh, useSettingsStore } from '@/stores/settings';

const PRESETS = [1, 10, 60] as const;
const CUSTOM = 'custom';

const { t } = useI18n();
const settings = useSettingsStore();

const isPreset = (value: number) => (PRESETS as readonly number[]).includes(value);
const choice = ref<number | typeof CUSTOM>(isPreset(settings.farRefreshSeconds) ? settings.farRefreshSeconds : CUSTOM);
const custom = ref<number>(settings.farRefreshSeconds);

const items = computed(() => [
  { title: t('settings.refresh.every1'), value: 1 },
  { title: t('settings.refresh.every10'), value: 10 },
  { title: t('settings.refresh.every60'), value: 60 },
  { title: t('settings.refresh.custom'), value: CUSTOM }
]);

const inRange = (value: number) =>
  (Number.isInteger(value) && value >= FAR_REFRESH_MIN && value <= FAR_REFRESH_MAX) ||
  t('settings.refresh.range', { min: FAR_REFRESH_MIN, max: FAR_REFRESH_MAX });

watch(choice, (value) => {
  if (value !== CUSTOM) settings.farRefreshSeconds = value;
  else settings.farRefreshSeconds = clampFarRefresh(custom.value);
});

watch(custom, (value) => {
  if (choice.value === CUSTOM && inRange(value) === true) settings.farRefreshSeconds = value;
});
</script>
