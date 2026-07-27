<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import TopBar from '../hud/TopBar.vue'
import BottomDock from '../hud/BottomDock.vue'
import SideDrawer from '../hud/SideDrawer.vue'
import ViewControls from '../hud/ViewControls.vue'
import Sheet from '../hud/Sheet.vue'
import ToastHost from '../hud/ToastHost.vue'
import type { Toast } from '../hud/toast'
import { Game, type HudSnapshot, type Tool } from '../../game/core/game'
import type { LevelDef } from '../../game/data/types'
import type { SimSnapshot } from '../../game/core/simulation'
import { deleteSlot, loadSettings, saveSettings, type Settings } from '../../game/core/save'
import { audio } from '../../game/audio/audio'

const props = defineProps<{ level: LevelDef; snapshot: SimSnapshot | null }>()
const emit = defineEmits<{ (e: 'cleared', levelId: string): void; (e: 'exit'): void }>()

const canvas = ref<HTMLCanvasElement | null>(null)
const hud = shallowRef<HudSnapshot | null>(null)
const toasts = ref<Toast[]>([])
const menuOpen = ref(false)
const won = ref(false)
const lost = ref(false)
const booting = ref(true)
const settings = ref<Settings>({ sound: true, reducedMotion: false, showFps: false })

let game: Game | null = null
let toastId = 0

const selected = computed(() => {
  const snapshot = hud.value
  if (!snapshot?.selectedId) return null
  return snapshot.creatures.find((c) => c.id === snapshot.selectedId) ?? null
})

function pushToast(text: string, alert = false) {
  const id = ++toastId
  toasts.value = [...toasts.value, { id, text, alert }].slice(-3)
  window.setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, alert ? 8000 : 6000)
}

onMounted(async () => {
  settings.value = await loadSettings()
  audio.setEnabled(settings.value.sound)
  const instance = new Game()
  instance.onSnapshot = (s) => {
    hud.value = s
  }
  instance.onHint = (text) => pushToast(text)
  instance.onAlert = (text) => pushToast(text, true)
  instance.onWin = () => {
    won.value = true
  }
  instance.onLose = () => {
    lost.value = true
  }
  await instance.start(canvas.value!, props.level, props.snapshot ?? undefined)
  game = instance
  booting.value = false
  // Write a save the moment the level opens, so "Continue" is offered even if
  // the phone kills the tab thirty seconds in.
  void instance.save()
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('pagehide', onPageHide)
  void game?.save()
  game?.destroy()
  game = null
})

function onVisibility() {
  if (!document.hidden || !game) return
  // Backgrounding a phone game should pause it, not silently run the basement.
  // This is also the last reliable moment to persist before the tab is frozen.
  if (!game.paused) game.togglePause()
  void game.save()
}

function onPageHide() {
  void game?.save()
}

function setTool(tool: Tool) {
  game?.setTool(tool)
}

function castSpell(id: string) {
  game?.castUntargeted(id)
}

function selectCreature(id: number) {
  game?.selectCreature(id)
}

function togglePause() {
  game?.togglePause()
}

function setSpeed(speed: number) {
  if (game?.paused) game.togglePause()
  game?.setSpeed(speed)
}

async function toggleSound() {
  settings.value = { ...settings.value, sound: !settings.value.sound }
  audio.setEnabled(settings.value.sound)
  if (settings.value.sound) audio.startDrone(props.level.wing)
  await saveSettings(settings.value)
}

async function toggleFps() {
  settings.value = { ...settings.value, showFps: !settings.value.showFps }
  await saveSettings(settings.value)
}

async function saveAndExit() {
  await game?.save()
  emit('exit')
}

async function restart() {
  await deleteSlot('auto')
  window.location.reload()
}

function finishLevel() {
  emit('cleared', props.level.id)
}
</script>

<template>
  <div class="screen game">
    <div class="stage"><canvas ref="canvas" /></div>

    <template v-if="hud">
      <TopBar
        :hud="hud"
        :show-fps="settings.showFps"
        @menu="menuOpen = true"
        @toggle-pause="togglePause"
        @speed="setSpeed"
      />
      <SideDrawer :hud="hud" @select="selectCreature" />
      <ViewControls
        @zoom="(f: number) => game?.zoomBy(f)"
        @rotate="(s: number) => game?.rotateView(s)"
        @recentre="() => game?.recentre()"
      />
      <BottomDock :hud="hud" @tool="setTool" @spell="castSpell" />

      <div v-if="selected" class="inspect zine">
        <p class="title stencil">{{ selected.name }} · lvl {{ selected.level }}</p>
        <p class="detail">{{ selected.quirk }}</p>
        <p class="stats mono">
          HP {{ selected.hp }}/{{ selected.maxHp }} · Loyalty {{ selected.loyalty }} · Wage
          {{ selected.wage }} · {{ selected.state }}
        </p>
      </div>
      <div v-else-if="hud.inspect" class="inspect zine">
        <p class="title stencil">{{ hud.inspect.title }}</p>
        <p class="detail">{{ hud.inspect.detail }}</p>
      </div>
    </template>

    <p v-if="booting" class="booting mono">Opening the basement…</p>

    <ToastHost :toasts="toasts" />

    <Sheet v-if="menuOpen" title="Pause" @close="menuOpen = false">
      <p>{{ level.name }} — everything is saved automatically, including when you leave.</p>
      <p class="mono small">
        Dig marks rock — including rock you have not reached yet, so you can plan a tunnel out
        into the dark. Build drags out a room. Traps go one per tile on ground you own, and Tear
        down lifts them again. Two fingers pan and pinch; the buttons on the left zoom, turn the
        view and recentre. Long-press inspects anything.
      </p>
      <template #actions>
        <button class="primary" @click="menuOpen = false">Back to it</button>
        <button @click="toggleSound">Sound: {{ settings.sound ? 'on' : 'off' }}</button>
        <button @click="toggleFps">{{ settings.showFps ? 'Hide' : 'Show' }} FPS</button>
        <button @click="saveAndExit">Save &amp; leave</button>
        <button @click="restart">Restart level</button>
      </template>
    </Sheet>

    <Sheet v-if="won" title="That is the level" @close="finishLevel">
      <p>Every objective cleared. The landlord remains unhappy, which is the natural order.</p>
      <p v-if="hud && hud.captured > 0" class="mono small">
        {{ hud.captured }} signed-away creature(s) tore up the contract and came back.
      </p>
      <template #actions>
        <button class="primary" @click="finishLevel">Back to the map</button>
      </template>
    </Sheet>

    <Sheet v-if="lost && !won" title="Nobody left" @close="restart">
      <p>
        The basement is empty. No roster, no show, no argument about who is the most punk. Losing a
        level costs you nothing but the time — run it again.
      </p>
      <template #actions>
        <button class="primary" @click="restart">Run it again</button>
        <button @click="emit('exit')">Back to the map</button>
      </template>
    </Sheet>
  </div>
</template>

<style scoped>
.game {
  padding: 0;
}
.stage {
  position: absolute;
  inset: 0;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
.inspect {
  position: absolute;
  left: calc(8px + var(--safe-l));
  bottom: calc(var(--dock-h) + 6px + var(--safe-b));
  z-index: 19;
  width: min(300px, 58vw);
  padding: 9px 12px;
  background: rgba(22, 19, 27, 0.94);
  border-left: 3px solid var(--accent);
}
.title {
  margin: 0 0 3px;
  font-size: 12px;
}
.detail {
  margin: 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--paper-dim);
}
.stats {
  margin: 5px 0 0;
  font-size: 10px;
  color: rgba(239, 230, 212, 0.55);
}
.booting {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--paper-dim);
}
.small {
  font-size: 11px;
  color: rgba(239, 230, 212, 0.5);
}
</style>
