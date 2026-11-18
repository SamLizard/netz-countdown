<template>
  <div class="step-nav">
    <div class="step-nav__dots" role="img" :aria-label="$t('steps.position', { index: shownIndex + 1, total: labels.length })">
      <span
        v-for="(_, i) in labels"
        :key="i"
        class="step-nav__dot"
        :class="{ 'step-nav__dot--shown': i === shownIndex, 'step-nav__dot--live': peeking && i === liveIndex }"
      />
    </div>

    <div class="step-nav__actions">
      <button v-if="prevLabel !== null" type="button" class="step-nav__side step-nav__prev" :aria-label="$t('steps.prevStep')" @click="emit('prev')">
        <span class="step-nav__arrow" aria-hidden="true">‹</span> <bdi dir="auto">{{ prevLabel }}</bdi>
      </button>
      <v-btn
        v-if="peeking"
        class="step-nav__live"
        variant="outlined"
        :prepend-icon="mdiArrowULeftTop"
        @click="emit('live')"
      >
        {{ $t('steps.backToLive') }}
      </v-btn>
      <button v-if="nextLabel !== null" type="button" class="step-nav__side step-nav__next" :aria-label="$t('steps.nextStep')" @click="emit('next')">
        <bdi dir="auto">{{ nextLabel }}</bdi> <span class="step-nav__arrow" aria-hidden="true">›</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { mdiArrowULeftTop } from '@mdi/js';

/** Dots, previous/next step labels and the "Back to live" chip. Arrows follow the reading direction. */
const props = defineProps<{ labels: string[]; shownIndex: number; liveIndex: number; peeking: boolean }>();
const emit = defineEmits<{ prev: []; next: []; live: [] }>();

const prevLabel = computed(() => (props.shownIndex > 0 ? props.labels[props.shownIndex - 1] : null));
const nextLabel = computed(() => (props.shownIndex < props.labels.length - 1 ? props.labels[props.shownIndex + 1] : null));
</script>

<style scoped>
.step-nav {
  width: 100%;
  max-width: 32rem;
  margin-top: 0.5rem;
  color: var(--countdown-text);
}

.step-nav__live {
  grid-column: 2;
  min-block-size: 44px;
  padding-inline: 0.5rem;
}

.step-nav__dots {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: clamp(0.25rem, 1vw, 0.5rem);
}

.step-nav__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  border: 1px solid currentColor;
}

.step-nav__dot--shown {
  background: currentColor;
}

.step-nav__dot--live {
  outline: 1px solid currentColor;
  outline-offset: 2px;
}

.step-nav__actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  font-size: 0.95rem;
}

.step-nav__side {
  min-block-size: 44px;
  color: inherit;
  padding-inline: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: start;
}

.step-nav__next {
  grid-column: 3;
  text-align: end;
}

.step-nav__prev {
  grid-column: 1;
}

.step-nav__side:only-child {
  grid-column: 1 / -1;
}

.step-nav__arrow {
  display: inline-block;
  direction: ltr;
}

.step-nav:dir(rtl) .step-nav__arrow {
  transform: scaleX(-1);
}
</style>
