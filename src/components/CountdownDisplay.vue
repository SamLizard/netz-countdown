<template>
  <div class="countdown" :style="{ backgroundColor: background }">
    <div class="countdown__value" :style="{ color: numberColor }">{{ value }}</div>
    <div class="countdown__label">
      {{ $t(late ? 'countdown.after' : 'countdown.until') }}
      <span v-if="isTomorrow">({{ $t('countdown.tomorrow') }})</span>
    </div>
    <div v-if="hebrewDate" class="countdown__hebrew" dir="rtl">{{ hebrewDate }}</div>

    <div class="countdown__times">
      <span>{{ $t('countdown.target') }} <b>{{ targetClock }}</b></span>
      <span>{{ $t('countdown.now') }} <b>{{ nowClock }}</b></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { colorFor, formatClock, formatDuration, secondsUntil } from '@/services/countdown';

const props = defineProps<{
  target: Date;
  now: Date;
  hebrewDate?: string;
  warningSeconds: number;
  blackBackground: boolean;
}>();

const remaining = computed(() => secondsUntil(props.target, props.now));
const late = computed(() => remaining.value <= 0);
const value = computed(() => (late.value ? '+' : '') + formatDuration(remaining.value));

const color = computed(() => colorFor(remaining.value, props.warningSeconds, props.blackBackground));
const background = computed(() => (props.blackBackground ? '#000' : color.value));
const numberColor = computed(() => (props.blackBackground ? color.value : '#fff'));

const isTomorrow = computed(() => props.target.getDate() !== props.now.getDate());
const targetClock = computed(() => formatClock(props.target));
const nowClock = computed(() => formatClock(props.now));
</script>

<style scoped>
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom)
    env(safe-area-inset-left);
  transition: background-color 1s linear;
  user-select: none;
  -webkit-user-select: none;
}

.countdown__value {
  direction: ltr;
  font-size: clamp(5rem, 27vw, 16rem);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
  transition: color 1s linear;
}

.countdown__label {
  margin-top: 0.75rem;
  font-size: clamp(1.1rem, 4.5vw, 1.8rem);
  font-weight: 600;
  opacity: 0.85;
}

.countdown__hebrew {
  margin-top: 0.25rem;
  font-size: 1rem;
  opacity: 0.6;
}

.countdown__times {
  position: absolute;
  bottom: calc(1.25rem + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 2rem;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
</style>
