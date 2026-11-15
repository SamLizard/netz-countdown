<template>
  <v-dialog v-model:model-value="show" width="520">
    <template #activator="{ props }">
      <slot v-bind="props" />
    </template>

    <v-card>
      <v-card-title>{{ $t('controls.settings') }}</v-card-title>
      <v-card-text>
        <v-form>
          <v-select
            v-model="settings.zmanKey"
            :items="zmanItems"
            item-title="label"
            item-value="key"
            :label="$t('controls.targetZman')"
          />

          <v-switch
            v-model="settings.useCustomTime"
            :label="$t('controls.useCustomTime')"
          />

          <v-text-field
            v-if="settings.useCustomTime"
            v-model="settings.customTime"
            :label="$t('controls.customTime')"
            placeholder="07:00"
          />

          <v-text-field
            :label="$t('controls.offsetMinutes')"
            v-model.number="settings.offsetMinutes"
            type="number"
            min="-120"
            max="120"
          />

          <v-select
            v-model="settings.rounding"
            :items="roundingItems"
            item-title="label"
            item-value="value"
            :label="$t('controls.rounding')"
          />

          <v-row class="mt-4" align="center">
            <v-col cols="12" sm="6">
              <v-text-field
                :label="$t('controls.latitude')"
                v-model.number="settings.latitude"
                type="number"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-text-field
                :label="$t('controls.longitude')"
                v-model.number="settings.longitude"
                type="number"
              />
            </v-col>
          </v-row>

          <v-btn text color="primary" class="mb-4" @click="useGeolocation">
            {{ $t('controls.useGps') }}
          </v-btn>

          <v-switch
            v-model="settings.stopAtZero"
            :label="$t('controls.stopAtZero')"
          />
          <v-switch
            v-model="settings.isKiosk"
            :label="$t('controls.kioskMode')"
          />

          <v-select
            v-model="selectedMethod"
            :items="calculationMethods"
            item-title="label"
            item-value="value"
            :label="$t('controls.calculationMethod')"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="closeDialog">{{ $t('controls.close') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettingsStore } from '@/stores/settings';
import { ZMAN_OPTIONS } from '@/services/zmanimService';
import type { RoundingMode } from '@/types';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const settings = useSettingsStore();
const { t } = useI18n();

const show = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
});

const zmanItems = ZMAN_OPTIONS.map((item) => ({
  key: item.key,
  label: t(item.label)
}));
const roundingItems = [
  { value: 'none', label: t('controls.roundingOptions.none') },
  { value: '15s', label: t('controls.roundingOptions.15s') },
  { value: '1m', label: t('controls.roundingOptions.1m') }
];
const calculationMethods = [
  { value: 'gra', label: t('controls.gra') },
  { value: 'mga', label: t('controls.mga') }
];

const selectedMethod = ref('gra');

const useGeolocation = async () => {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((position) => {
    settings.setCoords(position.coords.latitude, position.coords.longitude);
  });
};

const closeDialog = () => {
  show.value = false;
};
</script>

<style scoped>
.v-card {
  border-radius: 24px;
}

.v-card-title {
  font-weight: 700;
}
</style>
