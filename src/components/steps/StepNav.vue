<template>
  <div class="step-nav" :style="{ color: 'var(--countdown-text)' }">
    <v-chip
      v-if="peeking"
      class="step-nav__live"
      color="white"
      variant="outlined"
      size="small"
      :prepend-icon="mdiArrowULeftTop"
      @click="emit('live')"
    >
      {{ $t('steps.preview') }} · {{ $t('steps.backToLive') }}
    </v-chip>

    <div class="step-nav__dots" role="img" :aria-label="$t('steps.position', { index: shownIndex + 1, total: labels.length })">
      <span
        v-for="(_, i) in labels"
        :key="i"
        class="step-nav__dot"
        :class="{ 'step-nav__dot--shown': i === shownIndex, 'step-nav__dot--live': peeking && i === liveIndex }"
      />
    </div>

    <div class="step-nav__sides">
      <button v-if="prevLabel !== null" type="button" class="step-nav__side" :aria-label="$t('steps.prevStep')" @click="emit('prev')">
        ‹ <bdi dir="auto">{{ prevLabel }}</bdi>
      </button>
      <span v-else />
      <button v-if="nextLabel !== null" type="button" class="step-nav__side" :aria-label="$t('steps.nextStep')" @click="emit('next')">
        <bdi dir="auto">{{ nextLabel }}</bdi> ›
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
  margin-top: 1rem;
}

.step-nav__live {
  position: absolute;
  top: calc(0.9rem + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  opacity: 0.8;
}

.step-nav__dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
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

.step-nav__sides {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.95rem;
}

.step-nav__side {
  color: inherit;
  padding: 0.5rem 0.25rem;
  max-width: 48%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
