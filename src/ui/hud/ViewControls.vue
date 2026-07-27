<script setup lang="ts">
/**
 * Camera controls for the world view.
 *
 * Pinch and two-finger drag still do everything these do, but a pinch is
 * awkward one-handed on a phone and there is no gesture for "turn the basement
 * round", so both get a button.
 */
defineEmits<{
  (e: 'zoom', factor: number): void
  (e: 'rotate', steps: number): void
  (e: 'recentre'): void
}>()
</script>

<template>
  <div class="controls">
    <button class="tap btn" aria-label="Zoom in" @click="$emit('zoom', 1.25)">+</button>
    <button class="tap btn" aria-label="Zoom out" @click="$emit('zoom', 0.8)">−</button>
    <button class="tap btn" aria-label="Turn view left" @click="$emit('rotate', -1)">↺</button>
    <button class="tap btn" aria-label="Turn view right" @click="$emit('rotate', 1)">↻</button>
    <button class="tap btn wide" aria-label="Recentre" @click="$emit('recentre')">⌖</button>
  </div>
</template>

<style scoped>
/*
 * Two columns, not one. A single column of five 44px buttons is 236px tall and
 * runs straight into the dock on a landscape phone, where the whole viewport is
 * under 400px — the bottom buttons end up unpressable.
 */
.controls {
  position: absolute;
  left: calc(6px + var(--safe-l));
  top: calc(52px + var(--safe-t));
  z-index: 19;
  display: grid;
  grid-template-columns: repeat(2, 44px);
  gap: 4px;
}
.btn {
  width: 44px;
  height: 44px;
  font-size: 18px;
  line-height: 1;
  border: 1px solid var(--line);
  background: rgba(22, 19, 27, 0.9);
  color: var(--paper-dim);
}
.btn.wide {
  grid-column: span 2;
  width: 92px;
}
.btn:active {
  background: rgba(255, 209, 102, 0.18);
  color: var(--accent-2);
}
/* Very short landscape phones: shave the buttons but keep them thumb-sized. */
@media (max-height: 360px) {
  .controls {
    grid-template-columns: repeat(2, 40px);
    gap: 2px;
  }
  .btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  .btn.wide {
    width: 82px;
  }
}
</style>
