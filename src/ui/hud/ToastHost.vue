<script setup lang="ts">
import type { Toast } from './toast'

defineProps<{ toasts: Toast[] }>()
</script>

<template>
  <div class="host">
    <TransitionGroup name="fade">
      <p v-for="t in toasts" :key="t.id" class="toast zine" :class="{ alert: t.alert }">
        {{ t.text }}
      </p>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.host {
  position: absolute;
  left: 50%;
  top: calc(52px + var(--safe-t));
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  pointer-events: none;
  width: min(420px, 88vw);
}
.toast.alert {
  border-left-color: var(--accent);
  color: #ffd9dd;
}
.toast {
  margin: 0;
  padding: 9px 14px;
  font-size: 12px;
  line-height: 1.45;
  text-align: center;
  background: rgba(22, 19, 27, 0.96);
  border-left: 3px solid var(--accent-2);
}
</style>
