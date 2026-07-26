import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

/** True once every asset is cached and the game will run with the radio off. */
export const offlineReady = ref(false)
/** True when a newer build is waiting; the game applies it on the next reload. */
export const updateReady = ref(false)

let applyUpdate: (() => Promise<void>) | null = null

export function setupPwa(): void {
  if (import.meta.env.DEV) return
  const update = registerSW({
    immediate: true,
    onOfflineReady() {
      offlineReady.value = true
    },
    onNeedRefresh() {
      updateReady.value = true
    },
  })
  applyUpdate = async () => {
    await update(true)
  }
}

export async function reloadForUpdate(): Promise<void> {
  await applyUpdate?.()
  updateReady.value = false
}

/** Deferred `beforeinstallprompt`, so the install button appears where we want it. */
export const installEvent = ref<Event | null>(null)
export const installed = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent.value = e
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    installEvent.value = null
  })
}

export async function promptInstall(): Promise<void> {
  const event = installEvent.value as (Event & { prompt?: () => Promise<void> }) | null
  if (!event?.prompt) return
  await event.prompt()
  installEvent.value = null
}
