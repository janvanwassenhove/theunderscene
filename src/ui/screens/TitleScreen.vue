<script setup lang="ts">
import { computed } from 'vue'
import { installEvent, installed, offlineReady, promptInstall, reloadForUpdate, updateReady } from '../../pwa'
import { levelOrNull } from '../../game/data/campaigns'

const props = defineProps<{ savedLevelId: string | null }>()
defineEmits<{ (e: 'new-game'): void; (e: 'continue'): void }>()

const savedName = computed(() => (props.savedLevelId ? levelOrNull(props.savedLevelId)?.name ?? null : null))
const canInstall = computed(() => installEvent.value !== null && !installed.value)
</script>

<template>
  <div class="screen title">
    <div class="masthead">
      <p class="kicker mono">a completely serious basement simulator</p>
      <h1 class="stencil">
        The<br /><span class="big">Underscene</span>
      </h1>
      <p class="sub">
        Dig out a record label. Staff it with people who will absolutely quit.
        Keep the industry upstairs where it belongs.
      </p>
    </div>

    <div class="actions">
      <button v-if="savedName" class="tap primary stencil" @click="$emit('continue')">
        Continue — {{ savedName }}
      </button>
      <button class="tap primary stencil" @click="$emit('new-game')">The Underscene Map</button>
      <button v-if="canInstall" class="tap ghost" @click="promptInstall">Install to home screen</button>
      <button v-if="updateReady" class="tap ghost" @click="reloadForUpdate">Update available — reload</button>
    </div>

    <footer class="mono">
      <span v-if="offlineReady">◆ cached — plays with the radio off</span>
      <span v-else>◆ first load caches the whole game</span>
      <span class="ver">phase 0 · engine skeleton</span>
    </footer>
  </div>
</template>

<style scoped>
.title {
  justify-content: space-between;
  background:
    radial-gradient(120% 80% at 20% 0%, rgba(255, 77, 90, 0.16), transparent 60%),
    radial-gradient(100% 90% at 90% 100%, rgba(255, 209, 102, 0.1), transparent 60%),
    var(--ink);
}
.masthead {
  padding-top: 6vh;
  max-width: 620px;
}
.kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 10px;
}
h1 {
  margin: 0;
  font-size: clamp(38px, 9vw, 76px);
  line-height: 0.86;
  color: var(--paper);
}
.big {
  color: var(--accent-2);
  -webkit-text-stroke: 1px rgba(13, 11, 16, 0.35);
}
.sub {
  margin: 16px 0 0;
  max-width: 34ch;
  color: var(--paper-dim);
  line-height: 1.55;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
  padding: 20px 0;
}
.primary {
  padding: 0 22px;
  background: var(--paper);
  color: var(--ink);
  font-size: 15px;
  transform: rotate(-0.6deg);
}
.primary:active {
  transform: rotate(-0.6deg) translateY(1px);
}
.ghost {
  padding: 0 18px;
  border: 1px solid var(--line);
  color: var(--paper-dim);
  font-size: 13px;
}
footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  color: rgba(239, 230, 212, 0.45);
  flex-wrap: wrap;
}
</style>
