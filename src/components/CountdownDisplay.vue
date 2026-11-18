<template>
  <div class="countdown" :style="{ backgroundColor: background, '--countdown-text': textColor }">
    <div class="countdown__main">
      <div class="countdown__stage">
        <div
          class="countdown__value"
          :class="{ 'countdown__value--far': hidden, 'countdown__value--peek': peeking }"
          :style="{ color: numberColor, '--value-width': Math.max(3, value.length * 0.66), '--fitted-width': fittedWidth }"
        >
          {{ value }}
          <span class="countdown__width-probe" aria-hidden="true">
            <span ref="widthProbe">{{ valueShape }}</span>
          </span>
        </div>
      </div>
      <div class="countdown__caption">
        <div class="countdown__label">
          <template v-if="!label">{{ $t(late ? 'countdown.after' : 'countdown.until') }}</template>
          <i18n-t v-else :keypath="late ? 'steps.since' : 'steps.until'" tag="span" scope="global">
            <template #label><bdi dir="auto">{{ label }}</bdi></template>
          </i18n-t>
          <span v-if="isTomorrow">({{ $t('countdown.tomorrow') }})</span>
        </div>
        <div v-if="hebrewDate" class="countdown__hebrew" dir="rtl">{{ hebrewDate }}</div>
      </div>
      <slot name="nav" />
    </div>

    <div class="countdown__footer">
      <div class="countdown__times">
        <span v-if="label"><bdi dir="auto">{{ label }}</bdi> <b dir="ltr">{{ targetClock }}</b></span>
        <span v-else><span>{{ $t('countdown.target') }}</span> <b dir="ltr">{{ targetClock }}</b></span>
        <span><span>{{ $t('countdown.now') }}</span> <b dir="ltr">{{ nowClock }}</b></span>
        <span v-if="sunriseClock" class="countdown__extra">
          <bdi dir="auto">{{ sunriseLabel || $t('countdown.target') }}</bdi> <b dir="ltr">{{ sunriseClock }}</b>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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

const widthProbe = ref<HTMLElement>();
const fittedWidth = ref<number>();
// Tabular digits share a width; replacing them keeps the measurement stable between ticks.
const valueShape = computed(() => value.value.replace(/\d/g, '0'));
const measureValue = () => {
  if (widthProbe.value) fittedWidth.value = widthProbe.value.getBoundingClientRect().width / 100;
};
onMounted(measureValue);
watch(valueShape, measureValue, { flush: 'post' });

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
const textColor = computed(() => `rgba(255, 255, 255, ${props.dimmed ? 0.3 : 0.8})`);

const isTomorrow = computed(() => props.target.getDate() !== props.now.getDate());
const targetClock = computed(() => formatClock(props.target));
const nowClock = computed(() => formatClock(props.now, props.stepSeconds < 60));
const sunriseClock = computed(() =>
  props.sunrise && props.sunrise.getTime() !== props.target.getTime() ? formatClock(props.sunrise) : ''
);
</script>

<style scoped>
.countdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem calc(1rem + env(safe-area-inset-right)) calc(0.75rem + env(safe-area-inset-bottom))
    calc(1rem + env(safe-area-inset-left));
  touch-action: pan-y pinch-zoom;
  user-select: none;
  -webkit-user-select: none;
}

.countdown__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  container-type: inline-size;
}

.countdown__stage,
.countdown__caption {
  display: contents;
}

.countdown__value {
  position: relative;
  direction: ltr;
  font-size: min(calc((100vw - 2rem) / var(--value-width)), 16rem);
  font-size: min(calc(100cqi / var(--value-width)), 32dvh, 16rem);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.countdown__width-probe {
  position: absolute;
  inset: 0 auto auto 0;
  width: 0;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}

.countdown__width-probe > span {
  display: block;
  inline-size: max-content;
  /* Measure at a display size so fonts with optical sizing use their large glyphs. */
  font-size: 100px;
  letter-spacing: -0.03em;
}

.countdown__value--far {
  font-weight: 300;
}

.countdown__value--peek {
  opacity: 0.7;
}

.countdown__label {
  margin-top: 0.5rem;
  font-size: clamp(1rem, min(4.5vw, 5dvh), 1.8rem);
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
  gap: 0.25rem clamp(0.75rem, 3vw, 2rem);
  font-size: 1rem;
}

.countdown__label,
.countdown__hebrew,
.countdown__times > span {
  max-inline-size: 100%;
  overflow-wrap: anywhere;
}

.countdown__times b {
  white-space: nowrap;
}

.countdown__extra {
  font-size: 0.85rem;
}

@media (orientation: landscape) {
  .countdown {
    min-block-size: 0;
    gap: 0.375rem;
  }

  .countdown__main {
    min-block-size: 0;
    justify-content: flex-start;
  }

  .countdown__stage {
    display: grid;
    place-items: center;
    container-type: size;
    flex: 1;
    width: 100%;
  }

  .countdown__value {
    --digit-line-height: 0.85;
    font-size: min(calc(99cqi / var(--fitted-width, var(--value-width))), calc(100cqb / var(--digit-line-height)));
    line-height: var(--digit-line-height);
  }

  .countdown__caption {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    justify-content: center;
    align-items: baseline;
    gap: 0 0.75rem;
    width: 100%;
  }

  .countdown__label,
  .countdown__hebrew {
    margin-top: 0;
    font-size: 1rem;
  }

  .countdown__times {
    flex-wrap: nowrap;
    text-align: center;
  }

  .countdown__times > span {
    display: flex;
    align-items: baseline;
    gap: 0.25rem;
    min-inline-size: 0;
  }

  .countdown__times > span > :first-child {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .countdown__times b {
    flex: none;
  }
}
</style>
