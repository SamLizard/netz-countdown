<template>
  <div class="countdown-display user-select-none">
    <div class="countdown-value">{{ formattedTime }}</div>
    <div class="countdown-label text-h5 text-secondary mt-2">
      {{ $t('until') }} {{ $t(label) }}
    </div>
    <div v-if="offset !== 0" class="countdown-offset text-caption text-primary">
      {{ offset > 0 ? '+' : '' }}{{ offset }} {{ $t('controls.offset') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RoundingMode } from '@/types';

const props = defineProps({
  diffSeconds: {
    type: Number,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  isKiosk: {
    type: Boolean,
    default: false
  },
  offset: {
    type: Number,
    default: 0
  },
  rounding: {
    type: String as () => RoundingMode,
    default: 'none'
  }
});

const formattedTime = computed(() => {
  let seconds = props.diffSeconds;

  if (props.rounding === '1m') {
    seconds = Math.ceil(seconds / 60) * 60;
  } else if (props.rounding === '15s') {
    seconds = Math.ceil(seconds / 15) * 15;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  if (props.rounding === '1m') {
    return hours > 0 ? `${hours}:${pad(minutes)}` : `${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  return `${pad(minutes)}:${pad(remainingSeconds)}`;
});
</script>

<style scoped>
.countdown-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
}

.countdown-value {
  font-size: clamp(4rem, 22vw, 12rem);
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 0.9;
}

.countdown-label {
  margin-top: 1rem;
}

.countdown-offset {
  margin-top: 0.75rem;
  opacity: 0.8;
}

.user-select-none {
  user-select: none;
}
</style>
