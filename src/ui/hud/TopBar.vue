<script setup lang="ts">
import { computed } from 'vue'
import type { HudSnapshot } from '../../game/core/game'

const props = defineProps<{ hud: HudSnapshot; showFps: boolean }>()
defineEmits<{ (e: 'menu'): void; (e: 'toggle-pause'): void; (e: 'speed', value: number): void }>()

const clock = computed(() => {
  const total = Math.floor(props.hud.elapsed)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
})

const vaultLabel = computed(() =>
  props.hud.vaultCapacity > 0 ? `/${props.hud.vaultCapacity}` : ' (no vault)',
)
</script>

<template>
  <div class="bar">
    <button class="tap menu" aria-label="Menu" @click="$emit('menu')">≡</button>

    <div class="stat">
      <span class="key mono">ROY</span>
      <span class="val mono">{{ hud.royalties }}<span class="cap">{{ vaultLabel }}</span></span>
    </div>
    <div class="stat">
      <span class="key mono">BUZZ</span>
      <span class="val mono">{{ hud.buzz }}</span>
    </div>
    <div class="stat">
      <span class="key mono">REP</span>
      <span class="val mono">{{ hud.reputation }}</span>
    </div>
    <div class="stat">
      <span class="key mono">CREW</span>
      <span class="val mono">{{ hud.population }}/{{ hud.capacity }}</span>
    </div>

    <span class="clock mono">{{ clock }}</span>

    <div class="speeds">
      <button
        class="tap sp"
        :class="{ on: hud.paused }"
        aria-label="Pause"
        @click="$emit('toggle-pause')"
      >
        {{ hud.paused ? '▶' : '❚❚' }}
      </button>
      <button
        v-for="s in [1, 2, 3]"
        :key="s"
        class="tap sp"
        :class="{ on: !hud.paused && hud.speed === s, 'wide-only': s === 3 }"
        @click="$emit('speed', s)"
      >
        {{ s }}×
      </button>
    </div>

    <span v-if="showFps" class="fps mono">{{ hud.fps }}fps</span>
  </div>
</template>

<style scoped>
.bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: calc(4px + var(--safe-t)) calc(8px + var(--safe-r)) 4px calc(8px + var(--safe-l));
  background: linear-gradient(180deg, rgba(13, 11, 16, 0.94), rgba(13, 11, 16, 0.55) 75%, transparent);
  pointer-events: none;
}
.bar > * {
  pointer-events: auto;
}
.menu {
  font-size: 22px;
  color: var(--paper);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 2px 8px;
  min-width: 56px;
}
.key {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--accent);
}
.val {
  font-size: 14px;
  line-height: 1.1;
}
.cap {
  font-size: 10px;
  color: rgba(239, 230, 212, 0.45);
}
.clock {
  margin-left: auto;
  font-size: 12px;
  color: var(--paper-dim);
  padding: 0 6px;
}
.speeds {
  display: flex;
  gap: 2px;
}
.sp {
  min-width: 40px;
  font-size: 12px;
  border: 1px solid transparent;
  color: var(--paper-dim);
}
.sp.on {
  border-color: var(--line);
  color: var(--accent-2);
  background: rgba(239, 230, 212, 0.07);
}
.fps {
  font-size: 10px;
  color: rgba(239, 230, 212, 0.4);
  padding-right: 4px;
}
/* Narrow phones in portrait: drop the decorations, never the numbers. */
@media (max-width: 560px) {
  .stat {
    min-width: 44px;
    padding: 2px 3px;
  }
  /* Drop 3× rather than shrink the buttons: touch targets stay at 44px. */
  .clock,
  .cap,
  .wide-only {
    display: none;
  }
  .val {
    font-size: 13px;
  }
}
</style>
