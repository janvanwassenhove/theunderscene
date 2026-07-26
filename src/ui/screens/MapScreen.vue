<script setup lang="ts">
import { computed, ref } from 'vue'
import { CAMPAIGNS, levelsOf } from '../../game/data/campaigns'
import { wingTheme } from '../../game/data/wings'
import type { Progress } from '../../game/core/save'

const props = defineProps<{ progress: Progress; savedLevelId: string | null }>()
const emit = defineEmits<{
  (e: 'play', levelId: string): void
  (e: 'continue'): void
  (e: 'back'): void
}>()

const openCampaign = ref<string | null>('first-basement')

function unlocked(id: string): boolean {
  const def = CAMPAIGNS.find((c) => c.id === id)!
  if (def.status !== 'playable') return false
  if (!def.requires) return true
  return props.progress.clearedCampaigns.includes(def.requires)
}

function levelUnlocked(campaignId: string, index: number): boolean {
  if (index === 0) return true
  const levels = levelsOf(campaignId)
  const previous = levels[index - 1]
  return !!previous && props.progress.clearedLevels.includes(previous.id)
}

const detail = computed(() => {
  const def = CAMPAIGNS.find((c) => c.id === openCampaign.value)
  if (!def) return null
  return { def, levels: def.levels.length ? levelsOf(def.id) : [] }
})

function hex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`
}
</script>

<template>
  <div class="screen map">
    <header>
      <button class="tap back" @click="emit('back')">‹ Back</button>
      <h2 class="stencil">The Underscene Map</h2>
      <button v-if="savedLevelId" class="tap back" @click="emit('continue')">Resume ›</button>
      <span v-else class="spacer" />
    </header>

    <div class="board">
      <svg class="threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline
          :points="CAMPAIGNS.map((c) => `${c.mapPos.x * 100},${c.mapPos.y * 100}`).join(' ')"
          fill="none"
          stroke="rgba(255,77,90,0.35)"
          stroke-width="0.4"
          stroke-dasharray="2 1.5"
        />
      </svg>
      <button
        v-for="c in CAMPAIGNS"
        :key="c.id"
        class="pin tap"
        :class="{ locked: !unlocked(c.id), active: openCampaign === c.id }"
        :style="{
          left: `${c.mapPos.x * 100}%`,
          top: `${c.mapPos.y * 100}%`,
          '--pin': hex(wingTheme(c.wing).accent),
        }"
        @click="openCampaign = c.id"
      >
        <span class="dot" />
        <span class="label mono">{{ c.name }}</span>
      </button>
    </div>

    <section v-if="detail" class="detail zine zine--taped">
      <div class="detail-head">
        <h3 class="stencil">{{ detail.def.name }}</h3>
        <span class="wing mono">{{ wingTheme(detail.def.wing).name }}</span>
      </div>
      <p class="tagline">{{ detail.def.tagline }}</p>

      <div v-if="detail.def.status !== 'playable'" class="planned mono">
        Not built yet — designed, scheduled, and waiting for its phase.
      </div>
      <ul v-else class="levels scroll">
        <li v-for="(lvl, i) in detail.levels" :key="lvl.id">
          <button
            class="tap level"
            :disabled="!levelUnlocked(detail.def.id, i)"
            @click="emit('play', lvl.id)"
          >
            <span class="num mono">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="name">{{ lvl.name }}</span>
            <span v-if="progress.clearedLevels.includes(lvl.id)" class="cleared mono">cleared</span>
            <span v-else-if="!levelUnlocked(detail.def.id, i)" class="cleared mono">locked</span>
            <span v-else class="cleared mono go">play ›</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.map {
  gap: 12px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  margin: 0;
  font-size: clamp(16px, 4vw, 24px);
}
.back {
  padding: 0 12px;
  border: 1px solid var(--line);
  font-size: 13px;
  color: var(--paper-dim);
}
.spacer {
  width: 44px;
}
.board {
  position: relative;
  flex: 1 1 auto;
  min-height: 140px;
  border: 1px solid var(--line);
  background:
    repeating-linear-gradient(45deg, rgba(239, 230, 212, 0.03) 0 8px, transparent 8px 16px),
    var(--ink-2);
}
.threads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.pin {
  position: absolute;
  transform: translate(-50%, -50%);
  flex-direction: column;
  gap: 4px;
  padding: 4px 6px;
}
.dot {
  width: 14px;
  height: 14px;
  background: var(--pin);
  transform: rotate(45deg);
  box-shadow: 0 0 12px var(--pin);
}
.label {
  font-size: 10px;
  letter-spacing: 0.05em;
  color: var(--paper-dim);
  white-space: nowrap;
}
.pin.locked .dot {
  background: #4a4550;
  box-shadow: none;
}
.pin.locked .label {
  color: rgba(239, 230, 212, 0.35);
}
.pin.active .label {
  color: var(--paper);
}
.detail {
  position: relative;
  padding: 14px 16px;
  max-height: 44vh;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  justify-content: space-between;
}
h3 {
  margin: 0;
  font-size: 17px;
}
.wing {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--accent);
}
.tagline {
  margin: 0;
  color: var(--paper-dim);
  font-size: 13px;
  line-height: 1.5;
}
.planned {
  font-size: 11px;
  color: rgba(239, 230, 212, 0.5);
  border-left: 2px solid var(--line);
  padding-left: 10px;
}
.levels {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.level {
  width: 100%;
  justify-content: flex-start;
  gap: 12px;
  padding: 0 12px;
  border: 1px solid var(--line);
  text-align: left;
}
.level:disabled {
  opacity: 0.4;
}
.num {
  color: var(--accent);
  font-size: 12px;
}
.name {
  flex: 1;
  font-size: 14px;
}
.cleared {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--paper-dim);
}
.go {
  color: var(--accent-2);
}
</style>
