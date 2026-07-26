<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Landscape is the primary orientation (more usable grid width), but portrait is
 * never hard-blocked — this only shows when the viewport is genuinely too narrow
 * and short to lay the HUD out, and it dismisses itself the moment you rotate.
 */
const cramped = ref(false)

function check() {
  const w = window.innerWidth
  const h = window.innerHeight
  cramped.value = h > w && w < 620
}

onMounted(() => {
  check()
  window.addEventListener('resize', check)
  window.addEventListener('orientationchange', check)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', check)
  window.removeEventListener('orientationchange', check)
})
</script>

<template>
  <div v-if="cramped" class="hint">
    <div class="card zine">
      <p class="stencil">Turn the phone</p>
      <p>The basement is wider than it is tall. So is this game.</p>
      <button class="tap dismiss" @click="cramped = false">Play in portrait anyway</button>
    </div>
  </div>
</template>

<style scoped>
.hint {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  background: rgba(13, 11, 16, 0.92);
  padding: 24px;
}
.card {
  position: relative;
  max-width: 320px;
  padding: 20px;
  text-align: center;
}
.stencil {
  font-size: 20px;
  margin: 0 0 10px;
}
p {
  margin: 0 0 14px;
  color: var(--paper-dim);
  line-height: 1.5;
}
.dismiss {
  border: 1px solid var(--line);
  padding: 0 16px;
  color: var(--accent-2);
}
</style>
