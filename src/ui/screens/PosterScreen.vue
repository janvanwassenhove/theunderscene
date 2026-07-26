<script setup lang="ts">
import type { LevelDef } from '../../game/data/types'
import { wingTheme } from '../../game/data/wings'

const props = defineProps<{ level: LevelDef }>()
defineEmits<{ (e: 'start'): void; (e: 'back'): void }>()

const theme = wingTheme(props.level.wing)
</script>

<template>
  <div class="screen poster" :style="{ '--wing': `#${theme.accent.toString(16).padStart(6, '0')}` }">
    <button class="tap back" @click="$emit('back')">‹ Map</button>

    <article class="sheet paper scroll">
      <p class="bill mono">{{ theme.name }} · Level {{ level.index }}</p>
      <h1 class="stencil">{{ level.poster.headline }}</h1>
      <div class="rule" />
      <p v-for="(line, i) in level.poster.lines" :key="i" class="line">{{ line }}</p>

      <ul class="objectives">
        <li v-for="(objective, i) in level.objectives" :key="i" class="mono">— {{ objective.label }}</li>
      </ul>

      <p class="smallprint mono">
        Basement Capacity {{ level.capacity }}. Doors open when you dig them. No refunds, no guest list.
      </p>
    </article>

    <button class="tap go stencil" @click="$emit('start')">Load in ›</button>
  </div>
</template>

<style scoped>
.poster {
  align-items: center;
  gap: 12px;
  background:
    radial-gradient(90% 60% at 50% 0%, color-mix(in srgb, var(--wing) 22%, transparent), transparent 70%),
    var(--ink);
}
.back {
  align-self: flex-start;
  padding: 0 12px;
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--paper-dim);
}
.sheet {
  width: min(560px, 100%);
  flex: 1 1 auto;
  padding: 22px 24px;
  transform: rotate(-0.5deg);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.6);
  background-image: repeating-linear-gradient(
    0deg,
    rgba(13, 11, 16, 0.035) 0 2px,
    transparent 2px 4px
  );
}
.bill {
  margin: 0 0 8px;
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--wing) 65%, #4a4550);
}
h1 {
  margin: 0;
  font-size: clamp(24px, 6.2vw, 42px);
  line-height: 0.95;
  color: var(--ink);
}
.rule {
  height: 3px;
  background: var(--ink);
  margin: 14px 0;
}
.line {
  margin: 0 0 10px;
  line-height: 1.55;
  font-size: 15px;
}
.objectives {
  margin: 18px 0 0;
  padding: 12px 0 0;
  border-top: 1px dashed rgba(13, 11, 16, 0.35);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.smallprint {
  margin: 16px 0 0;
  font-size: 10px;
  line-height: 1.6;
  color: rgba(13, 11, 16, 0.6);
}
.go {
  padding: 0 26px;
  background: var(--accent-2);
  color: var(--ink);
  font-size: 16px;
}
</style>
