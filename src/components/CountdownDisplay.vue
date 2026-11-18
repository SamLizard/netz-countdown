<template>
  <div class="countdown" :style="{ backgroundColor: background, '--countdown-text': textColor }">
    <div class="countdown__main">
      <div
        class="countdown__value"
        :class="{ 'countdown__value--far': hidden, 'countdown__value--peek': peeking }"
        :style="{ color: numberColor }"
      >
        {{ value }}
      </div>
      <div class="countdown__label">
        <template v-if="!label">{{ $t(late ? 'countdown.after' : 'countdown.until') }}</template>
        <i18n-t v-else :keypath="late ? 'steps.since' : 'steps.until'" tag="span" scope="global">
          <template #label><bdi dir="auto">{{ label }}</bdi></template>
        </i18n-t>
        <span v-if="isTomorrow">({{ $t('countdown.tomorrow') }})</span>
      </div>
      <div v-if="hebrewDate" class="countdown__hebrew" dir="rtl">{{ hebrewDate }}</div>
      <slot name="nav" />
    </div>

    <div class="countdown__footer">
      <div class="countdown__times">
        <span v-if="label"><bdi dir="auto">{{ label }}</bdi> <b>{{ targetClock }}</b></span>
        <span v-else>{{ $t('countdown.target') }} <b>{{ targetClock }}</b></span>
        <span>{{ $t('countdown.now') }} <b>{{ nowClock }}</b></span>
        <span v-if="sunriseClock" class="countdown__extra">
          <bdi dir="auto">{{ sunriseLabel || $t('countdown.target') }}</bdi> <b>{{ sunriseClock }}</b>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { colorFor, digitsHidden, formatClock, formatDuration, secondsUntil } from '@/services/countdown';

const props = defineProps<{
  target: Date;
  now: Date;
  hebrewDate?: string;
  warningSeconds: number;
  blackBackground: boolean;
  /** Show a grey placeholder instead of digits while sunrise is far. */
  hideFarDigits: boolean;
  /** Current refresh step in seconds; the display never shows more precision than this. */
  stepSeconds: number;
  /** Lower lightness for the number and secondary text (idle). */
  dimmed?: boolean;
  /** Prayer step label; empty = the sunrise step with its default texts. */
  label?: string | null;
  /** The day's sunrise when the target is another step: drives the "__:__" rule and adds a sunrise clock. */
  sunrise?: Date;
  /** Custom sunrise label for that clock. */
  sunriseLabel?: string | null;
  /** The user is looking at another step than the live one: digits always shown, number at 70 %. */
  peeking?: boolean;
}>();

const remaining = computed(() => secondsUntil(props.target, props.now));
const late = computed(() => remaining.value <= 0);
/** The placeholder follows sunrise, not the step, so digits appear 2 h before sunrise and stay for all steps. */
const hidden = computed(
  () => !props.peeking && digitsHidden(secondsUntil(props.sunrise ?? props.target, props.now), props.hideFarDigits)
);

const farGrey = computed(() => (props.dimmed ? '#262626' : '#3a3a3a'));
const FAR_BACKGROUND = '#1c1c1c';

const value = computed(() => {
  if (hidden.value) return '__:__';
  return (late.value ? '+' : '') + formatDuration(remaining.value, props.stepSeconds);
});

const color = computed(() => colorFor(remaining.value, props.warningSeconds, props.blackBackground, props.dimmed));
const background = computed(() => {
  if (props.blackBackground) return '#000';
  return hidden.value ? FAR_BACKGROUND : color.value;
});
const numberColor = computed(() => {
  if (hidden.value) return farGrey.value;
  if (props.blackBackground) return color.value;
  return props.dimmed ? 'rgba(255, 255, 255, 0.55)' : '#fff';
});
/** Labels and small times: dimmer grey when idle. */
const textColor = computed(() => `rgba(255, 255, 255, ${props.dimmed ? 0.3 : 0.55})`);

const isTomorrow = computed(() => props.target.getDate() !== props.now.getDate());
const targetClock = computed(() => formatClock(props.target));
const nowClock = computed(() => formatClock(props.now, props.stepSeconds < 60));
const sunriseClock = computed(() =>
  props.sunrise && props.sunrise.getTime() !== props.target.getTime() ? formatClock(props.sunrise) : ''
);
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
  width: 100%;
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

.countdown__value--peek {
  opacity: 0.7;
}

.countdown__label {
  margin-top: 0.75rem;
  font-size: clamp(1.1rem, 4.5vw, 1.8rem);
  font-weight: 500;
  text-align: center;
  color: var(--countdown-text);
}

.countdown__hebrew {
  margin-top: 0.5rem;
  font-size: 1.05rem;
  text-align: center;
  color: var(--countdown-text);
}

.countdown__footer {
  width: 100%;
  color: var(--countdown-text);
  font-variant-numeric: tabular-nums;
}

.countdown__times {
  display: flex;
  justify-content: center;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem 2rem;
  font-size: 1rem;
}

.countdown__extra {
  font-size: 0.85rem;
}
</style>
