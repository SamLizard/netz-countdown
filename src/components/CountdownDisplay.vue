<template>
  <div class="countdown" :style="{ backgroundColor: background }">
    <div class="countdown__main">
      <div class="countdown__value" :class="{ 'countdown__value--far': hidden }" :style="{ color: numberColor }">
        {{ value }}
      </div>
      <div class="countdown__label">
        {{ $t(late ? 'countdown.after' : 'countdown.until') }}
        <span v-if="isTomorrow">({{ $t('countdown.tomorrow') }})</span>
      </div>
      <div v-if="hebrewDate" class="countdown__hebrew" dir="rtl">{{ hebrewDate }}</div>
    </div>

    <div class="countdown__footer">
      <div class="countdown__times">
        <span>{{ $t('countdown.target') }} <b>{{ targetClock }}</b></span>
        <span>{{ $t('countdown.now') }} <b>{{ nowClock }}</b></span>
      </div>
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
  /** Show a grey placeholder instead of digits while outside the warning window. */
  hideFarDigits: boolean;
  /** Current refresh step in seconds; the display never shows more precision than this. */
  stepSeconds: number;
}>();

const FAR_GREY = '#3a3a3a';
const FAR_BACKGROUND = '#1c1c1c';

const remaining = computed(() => secondsUntil(props.target, props.now));
const late = computed(() => remaining.value <= 0);
const far = computed(() => remaining.value > props.warningSeconds);
const hidden = computed(() => far.value && props.hideFarDigits);

const value = computed(() => {
  if (hidden.value) return '__:__';
  return (late.value ? '+' : '') + formatDuration(remaining.value, props.stepSeconds);
});

const color = computed(() => colorFor(remaining.value, props.warningSeconds, props.blackBackground));
const background = computed(() => {
  if (props.blackBackground) return '#000';
  return hidden.value ? FAR_BACKGROUND : color.value;
});
const numberColor = computed(() => {
  if (hidden.value) return FAR_GREY;
  return props.blackBackground ? color.value : '#fff';
});

const isTomorrow = computed(() => props.target.getDate() !== props.now.getDate());
const targetClock = computed(() => formatClock(props.target));
const nowClock = computed(() => formatClock(props.now, props.stepSeconds < 60));
</script>

<style scoped>
/* Column layout: the footer is in the flow, so it can never overlap the number on short (landscape) screens. */
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(3.5rem + env(safe-area-inset-top)) calc(1rem + env(safe-area-inset-right))
    calc(1.25rem + env(safe-area-inset-bottom)) calc(1rem + env(safe-area-inset-left));
  user-select: none;
  -webkit-user-select: none;
}

.countdown__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.countdown__value {
  direction: ltr;
  font-size: clamp(4rem, min(27vw, 38vh), 16rem);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
}

.countdown__value--far {
  font-weight: 300;
}

.countdown__label {
  margin-top: 0.75rem;
  font-size: clamp(1.1rem, 4.5vw, 1.8rem);
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.countdown__hebrew {
  margin-top: 0.5rem;
  font-size: 1.05rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
}

.countdown__footer {
  width: 100%;
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
}

.countdown__times {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  font-size: 1rem;
}
</style>
