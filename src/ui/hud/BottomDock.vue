<script setup lang="ts">
import { computed, ref } from 'vue'
import type { HudSnapshot, Tool } from '../../game/core/game'

const props = defineProps<{ hud: HudSnapshot }>()
const emit = defineEmits<{ (e: 'tool', tool: Tool): void; (e: 'spell', id: string): void }>()

type Tab = 'tools' | 'build' | 'traps' | 'spells'
const tab = ref<Tab>('tools')

// A level with no traps unlocked should not show an empty tray.
const tabs = computed<Tab[]>(() =>
  props.hud.traps.length > 0 ? ['tools', 'build', 'traps', 'spells'] : ['tools', 'build', 'spells'],
)

function isTool(kind: Tool['kind'], id?: string): boolean {
  const tool = props.hud.tool
  if (tool.kind !== kind) return false
  if (kind === 'build' && tool.kind === 'build') return tool.room === id
  if (kind === 'trap' && tool.kind === 'trap') return tool.trap === id
  if (kind === 'spell' && tool.kind === 'spell') return tool.spell === id
  return true
}

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`
}
</script>

<template>
  <div class="dock">
    <div v-if="hud.tool.kind === 'build' && hud.pendingCost > 0" class="cost mono">
      {{ hud.pendingCost }} Royalties · release to build
    </div>
    <div v-else-if="hud.tool.kind === 'trap'" class="cost mono">Tap owned floor to lay it</div>
    <div v-else-if="hud.tool.kind === 'spell'" class="cost mono">Tap a target to cast</div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t"
        class="tap tab stencil"
        :class="{ on: tab === t }"
        @click="tab = t"
      >
        {{ t }}
      </button>
    </div>

    <div class="tray scroll-x">
      <template v-if="tab === 'tools'">
        <button
          class="tap chip"
          :class="{ on: isTool('inspect') }"
          @click="emit('tool', { kind: 'inspect' })"
        >
          <span class="glyph">✋</span>
          <span class="label">Look / Move</span>
        </button>
        <button class="tap chip" :class="{ on: isTool('dig') }" @click="emit('tool', { kind: 'dig' })">
          <span class="glyph">⛏</span>
          <span class="label">Dig</span>
        </button>
        <button
          class="tap chip"
          :class="{ on: isTool('demolish') }"
          @click="emit('tool', { kind: 'demolish' })"
        >
          <span class="glyph">✖</span>
          <span class="label">Tear down</span>
        </button>
      </template>

      <template v-else-if="tab === 'build'">
        <button
          v-for="room in hud.rooms"
          :key="room.id"
          class="tap chip room"
          :class="{ on: isTool('build', room.id), poor: !room.affordable }"
          :style="{ '--room': hex(room.color) }"
          @click="emit('tool', { kind: 'build', room: room.id })"
        >
          <span class="swatch" />
          <span class="label">{{ room.name }}</span>
          <span class="meta mono">{{ room.costPerTile }}/tile</span>
        </button>
      </template>

      <template v-else-if="tab === 'traps'">
        <button
          v-for="t in hud.traps"
          :key="t.id"
          class="tap chip"
          :class="{ on: isTool('trap', t.id), poor: !t.affordable }"
          @click="emit('tool', { kind: 'trap', trap: t.id })"
        >
          <span class="glyph">{{ t.glyph }}</span>
          <span class="label">{{ t.name }}</span>
          <span class="meta mono">{{ t.cost }} each</span>
        </button>
      </template>

      <template v-else>
        <button
          v-for="s in hud.spells"
          :key="s.id"
          class="tap chip"
          :class="{ on: isTool('spell', s.id), poor: !s.ready }"
          @click="emit('spell', s.id)"
        >
          <span class="glyph">{{ s.glyph }}</span>
          <span class="label">{{ s.name }}</span>
          <span class="meta mono">{{ s.cooldown > 0 ? `${s.cooldown}s` : `${s.cost} buzz` }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  padding: 0 calc(6px + var(--safe-r)) calc(6px + var(--safe-b)) calc(6px + var(--safe-l));
  background: linear-gradient(0deg, rgba(13, 11, 16, 0.96), rgba(13, 11, 16, 0.6) 70%, transparent);
}
.cost {
  position: absolute;
  top: -26px;
  left: 12px;
  font-size: 11px;
  padding: 4px 10px;
  background: var(--accent-2);
  color: var(--ink);
}
.tabs {
  display: flex;
  gap: 4px;
  padding: 2px 0;
}
.tab {
  min-height: 30px;
  padding: 0 12px;
  font-size: 10px;
  color: rgba(239, 230, 212, 0.5);
  border-bottom: 2px solid transparent;
}
.tab.on {
  color: var(--paper);
  border-bottom-color: var(--accent);
}
.tray {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.tray::-webkit-scrollbar {
  display: none;
}
.chip {
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  min-width: 104px;
  height: 56px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  background: rgba(22, 19, 27, 0.9);
  text-align: left;
}
.chip.on {
  border-color: var(--accent-2);
  background: rgba(255, 209, 102, 0.14);
}
.chip.poor {
  opacity: 0.45;
}
.glyph {
  font-size: 16px;
  line-height: 1;
}
.label {
  font-size: 12px;
}
.meta {
  font-size: 10px;
  color: var(--paper-dim);
}
.room .swatch {
  width: 100%;
  height: 4px;
  background: var(--room);
}
</style>
