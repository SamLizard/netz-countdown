<template>
  <div v-if="phase === 'warning'" class="sleep-warning" role="status">
    {{ $t('sleep.warning', { seconds: secondsLeft }) }}
  </div>
  <!-- Fully black: on OLED every pixel is off. Without the wake lock iOS Auto-Lock then locks the phone. -->
  <div v-else-if="phase === 'asleep'" class="sleep-black" :aria-label="$t('sleep.wake')" @click="emit('wake')" />
</template>

<script setup lang="ts">
import type { SleepPhase } from '@/types';

defineProps<{ phase: SleepPhase; secondsLeft: number }>();
const emit = defineEmits<{ wake: [] }>();
</script>

<style scoped>
.sleep-warning {
  position: absolute;
  top: calc(1rem + env(safe-area-inset-top));
  left: 1rem;
  right: 4rem;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  background: rgba(40, 40, 40, 0.9);
  color: #ccc;
  font-size: 0.95rem;
  text-align: center;
}

.sleep-black {
  position: fixed;
  inset: 0;
  z-index: 10;
  background: #000;
}
</style>
