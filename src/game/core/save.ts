import { get, set, del, keys } from 'idb-keyval'
import type { SimSnapshot } from './simulation'

/**
 * Save data is local and offline-only — IndexedDB via idb-keyval, with a
 * localStorage fallback for the rare browser (or private-mode quirk) where
 * IndexedDB is unavailable. There is no account, no server, no sync.
 */

const SLOT_PREFIX = 'underscene:slot:'
const PROGRESS_KEY = 'underscene:progress'
const SETTINGS_KEY = 'underscene:settings'

export interface SaveSlot {
  id: string
  levelId: string
  savedAt: number
  snapshot: SimSnapshot
}

export interface Progress {
  clearedLevels: string[]
  clearedCampaigns: string[]
  lastLevelId: string | null
}

export interface Settings {
  sound: boolean
  reducedMotion: boolean
  showFps: boolean
}

export const DEFAULT_PROGRESS: Progress = {
  clearedLevels: [],
  clearedCampaigns: [],
  lastLevelId: null,
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  reducedMotion: false,
  showFps: false,
}

let idbUsable: boolean | null = null

async function idbAvailable(): Promise<boolean> {
  if (idbUsable !== null) return idbUsable
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB')
    await get('underscene:probe')
    idbUsable = true
  } catch {
    idbUsable = false
  }
  return idbUsable
}

async function read<T>(key: string): Promise<T | undefined> {
  if (await idbAvailable()) {
    try {
      return (await get(key)) as T | undefined
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  if (await idbAvailable()) {
    try {
      await set(key, value)
      return
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    // The localStorage path cannot hold typed arrays; snapshots that land here
    // are converted by the caller. Anything else is small enough for JSON.
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* out of quota, private mode, etc. — saving is best-effort */
  }
}

export async function saveSlot(slotId: string, snapshot: SimSnapshot): Promise<void> {
  const slot: SaveSlot = {
    id: slotId,
    levelId: snapshot.levelId,
    savedAt: Date.now(),
    snapshot,
  }
  await write(SLOT_PREFIX + slotId, slot)
}

export async function loadSlot(slotId: string): Promise<SaveSlot | undefined> {
  const slot = await read<SaveSlot>(SLOT_PREFIX + slotId)
  if (!slot?.snapshot) return undefined
  // A snapshot from an older schema is discarded rather than half-migrated.
  if (!(slot.snapshot.kind instanceof Uint8Array)) return undefined
  return slot
}

export async function deleteSlot(slotId: string): Promise<void> {
  try {
    await del(SLOT_PREFIX + slotId)
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(SLOT_PREFIX + slotId)
  } catch {
    /* ignore */
  }
}

export async function listSlots(): Promise<string[]> {
  if (!(await idbAvailable())) return []
  try {
    const all = await keys()
    return all
      .map(String)
      .filter((k) => k.startsWith(SLOT_PREFIX))
      .map((k) => k.slice(SLOT_PREFIX.length))
  } catch {
    return []
  }
}

export async function loadProgress(): Promise<Progress> {
  return { ...DEFAULT_PROGRESS, ...((await read<Progress>(PROGRESS_KEY)) ?? {}) }
}

export async function saveProgress(progress: Progress): Promise<void> {
  await write(PROGRESS_KEY, progress)
}

export async function loadSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await read<Settings>(SETTINGS_KEY)) ?? {}) }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await write(SETTINGS_KEY, settings)
}
