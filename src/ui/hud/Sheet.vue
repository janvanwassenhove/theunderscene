<script setup lang="ts">
defineProps<{ title: string }>()
defineEmits<{ (e: 'close'): void }>()
</script>

<template>
  <div class="backdrop" @click.self="$emit('close')">
    <div class="sheet zine zine--taped">
      <h2 class="stencil">{{ title }}</h2>
      <div class="content scroll"><slot /></div>
      <div class="actions"><slot name="actions" /></div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(13, 11, 16, 0.82);
}
.sheet {
  position: relative;
  width: min(440px, 100%);
  max-height: 84%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  transform: rotate(-0.4deg);
}
h2 {
  margin: 0;
  font-size: 20px;
}
.content {
  font-size: 13px;
  line-height: 1.55;
  color: var(--paper-dim);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions :deep(button) {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--line);
  font-size: 13px;
}
.actions :deep(button.primary) {
  background: var(--accent-2);
  color: var(--ink);
  border-color: var(--accent-2);
}
</style>
