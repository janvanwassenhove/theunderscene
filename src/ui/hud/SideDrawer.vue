<script setup lang="ts">
import { ref } from 'vue'
import type { HudSnapshot } from '../../game/core/game'

defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ (e: 'select', id: number): void }>()

type Tab = 'goals' | 'crew' | 'raid' | 'log'
const open = ref(true)
const tab = ref<Tab>('goals')

function pct(progress: number, target: number): number {
  return Math.max(0, Math.min(100, (progress / target) * 100))
}

function stamp(at: number): string {
  const total = Math.floor(at)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
</script>

<template>
  <div class="drawer" :class="{ open }">
    <button class="tap handle" :aria-expanded="open" @click="open = !open">
      {{ open ? '›' : '‹' }}
    </button>

    <div v-if="open" class="panel zine">
      <div class="tabs">
        <button
          v-for="t in (['goals', 'crew', 'raid', 'log'] as Tab[])"
          :key="t"
          class="tap tab stencil"
          :class="{ on: tab === t }"
          @click="tab = t"
        >
          {{ t }}
        </button>
      </div>

      <div class="body scroll">
        <template v-if="tab === 'goals'">
          <div v-for="(o, i) in hud.objectives" :key="i" class="goal" :class="{ done: o.done }">
            <div class="goal-top">
              <span class="goal-label">{{ o.label }}</span>
              <span class="mono">{{ o.done ? '✓' : `${o.progress}/${o.target}` }}</span>
            </div>
            <div class="meter"><span :style="{ width: `${pct(o.progress, o.target)}%` }" /></div>
          </div>
        </template>

        <template v-else-if="tab === 'crew'">
          <p v-if="hud.creatures.length === 0" class="empty mono">
            Nobody yet. Build something worth turning up for.
          </p>
          <button
            v-for="c in hud.creatures"
            :key="c.id"
            class="tap crew"
            :class="{ on: hud.selectedId === c.id }"
            @click="emit('select', c.id)"
          >
            <span class="crew-name">{{ c.name }}</span>
            <span class="crew-state mono">{{ c.state }}</span>
            <span class="bars">
              <span class="bar hp"><i :style="{ width: `${(c.hp / c.maxHp) * 100}%` }" /></span>
              <span class="bar loy"><i :style="{ width: `${c.loyalty}%` }" /></span>
            </span>
          </button>
        </template>

        <template v-else-if="tab === 'raid'">
          <p v-if="hud.enemies.length === 0" class="empty mono">
            Nobody upstairs is interested in you yet. Enjoy it.
          </p>
          <div v-for="e in hud.enemies" :key="e.id" class="intruder">
            <div class="goal-top">
              <span>{{ e.name }}</span>
              <span class="mono">{{ e.state }}</span>
            </div>
            <div class="meter"><span class="bad-fill" :style="{ width: `${(e.hp / e.maxHp) * 100}%` }" /></div>
          </div>
          <p v-if="hud.captives > 0" class="empty mono">
            {{ hud.captives }} held in the Contract Office. A Signing Room turns them.
          </p>
          <p v-if="hud.captured > 0" class="empty mono">
            {{ hud.captured }} of yours signed away. Clear the level to get them back.
          </p>
        </template>

        <template v-else>
          <p v-for="(e, i) in hud.events" :key="i" class="event" :class="e.kind">
            <span class="mono time">{{ stamp(e.at) }}</span> {{ e.text }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer {
  position: absolute;
  top: calc(46px + var(--safe-t));
  right: calc(6px + var(--safe-r));
  bottom: calc(var(--dock-h) + var(--safe-b));
  z-index: 18;
  display: flex;
  align-items: flex-start;
  gap: 4px;
  pointer-events: none;
}
.drawer > * {
  pointer-events: auto;
}
.handle {
  width: 28px;
  min-width: 28px;
  height: 52px;
  min-height: 52px;
  border: 1px solid var(--line);
  background: rgba(22, 19, 27, 0.92);
  color: var(--paper-dim);
}
.panel {
  width: min(268px, 38vw);
  min-width: 210px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(22, 19, 27, 0.94);
}
.tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
}
.tab {
  flex: 1;
  min-height: 34px;
  font-size: 10px;
  color: rgba(239, 230, 212, 0.5);
}
.tab.on {
  color: var(--accent-2);
  background: rgba(239, 230, 212, 0.06);
}
.body {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.goal-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  line-height: 1.35;
}
.goal.done {
  color: var(--good);
}
.meter {
  height: 3px;
  background: rgba(239, 230, 212, 0.14);
  margin-top: 4px;
}
.meter span {
  display: block;
  height: 100%;
  background: var(--accent-2);
}
.bad-fill {
  background: var(--accent) !important;
}
.intruder {
  border-left: 2px solid var(--accent);
  padding-left: 8px;
}
.goal.done .meter span {
  background: var(--good);
}
.crew {
  width: 100%;
  min-height: 46px;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 5px 8px;
  border: 1px solid transparent;
  border-left: 2px solid var(--line);
}
.crew.on {
  border-color: var(--accent-2);
  background: rgba(255, 209, 102, 0.1);
}
.crew-name {
  font-size: 12px;
}
.crew-state {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--paper-dim);
}
.bars {
  display: flex;
  gap: 3px;
  width: 100%;
}
.bar {
  flex: 1;
  height: 3px;
  background: rgba(239, 230, 212, 0.14);
}
.bar i {
  display: block;
  height: 100%;
}
.hp i {
  background: var(--accent);
}
.loy i {
  background: var(--good);
}
.event {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--paper-dim);
}
.event.good {
  color: var(--good);
}
.event.bad {
  color: var(--bad);
}
.time {
  font-size: 9px;
  color: rgba(239, 230, 212, 0.4);
}
.empty {
  font-size: 11px;
  color: rgba(239, 230, 212, 0.45);
  line-height: 1.5;
}
</style>
