<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TitleScreen from './ui/screens/TitleScreen.vue'
import MapScreen from './ui/screens/MapScreen.vue'
import PosterScreen from './ui/screens/PosterScreen.vue'
import GameScreen from './ui/screens/GameScreen.vue'
import OrientationHint from './ui/OrientationHint.vue'
import { level, levelOrNull } from './game/data/campaigns'
import { DEFAULT_PROGRESS, loadProgress, loadSlot, saveProgress, type Progress } from './game/core/save'
import type { SimSnapshot } from './game/core/simulation'
import { campaign, levelsOf } from './game/data/campaigns'

type Screen = 'title' | 'map' | 'poster' | 'game'

const screen = ref<Screen>('title')
const progress = ref<Progress>({ ...DEFAULT_PROGRESS })
const levelId = ref<string | null>(null)
const resumeSnapshot = ref<SimSnapshot | null>(null)
const savedLevelId = ref<string | null>(null)
const ready = ref(false)

const currentLevel = computed(() => (levelId.value ? levelOrNull(levelId.value) : null))

onMounted(async () => {
  progress.value = await loadProgress()
  const slot = await loadSlot('auto')
  if (slot && levelOrNull(slot.levelId)) savedLevelId.value = slot.levelId
  ready.value = true
})

function goMap() {
  screen.value = 'map'
}

function startLevel(id: string) {
  resumeSnapshot.value = null
  levelId.value = id
  screen.value = 'poster'
}

async function continueSaved() {
  const slot = await loadSlot('auto')
  if (!slot || !levelOrNull(slot.levelId)) return
  levelId.value = slot.levelId
  resumeSnapshot.value = slot.snapshot
  screen.value = 'game'
}

function beginPlay() {
  screen.value = 'game'
}

async function levelCleared(id: string) {
  const cleared = new Set(progress.value.clearedLevels)
  cleared.add(id)
  const def = level(id)
  const campaignLevels = levelsOf(def.campaignId)
  const campaignDone = campaignLevels.every((l) => cleared.has(l.id))
  const clearedCampaigns = new Set(progress.value.clearedCampaigns)
  if (campaignDone) clearedCampaigns.add(campaign(def.campaignId).id)

  progress.value = {
    clearedLevels: [...cleared],
    clearedCampaigns: [...clearedCampaigns],
    lastLevelId: id,
  }
  await saveProgress(progress.value)
  savedLevelId.value = null
  screen.value = 'map'
}

function exitToMap() {
  savedLevelId.value = levelId.value
  screen.value = 'map'
}
</script>

<template>
  <OrientationHint />
  <template v-if="ready">
    <TitleScreen
      v-if="screen === 'title'"
      :saved-level-id="savedLevelId"
      @new-game="goMap"
      @continue="continueSaved"
    />
    <MapScreen
      v-else-if="screen === 'map'"
      :progress="progress"
      :saved-level-id="savedLevelId"
      @play="startLevel"
      @continue="continueSaved"
      @back="screen = 'title'"
    />
    <PosterScreen
      v-else-if="screen === 'poster' && currentLevel"
      :level="currentLevel"
      @start="beginPlay"
      @back="goMap"
    />
    <GameScreen
      v-else-if="screen === 'game' && currentLevel"
      :key="currentLevel.id + (resumeSnapshot ? '-resume' : '-new')"
      :level="currentLevel"
      :snapshot="resumeSnapshot"
      @cleared="levelCleared"
      @exit="exitToMap"
    />
  </template>
</template>
