import type { LevelDef } from '../types'

/**
 * Level authoring helper.
 *
 * A level is a big object and most of it is the same every time — grid size,
 * densities, where the chamber goes. This fills in those defaults so each level
 * file is only the parts that actually differ: the poster, what you can build,
 * what you have to achieve, and who comes down the stairs.
 *
 * Everything remains plain data — override any field and the override wins.
 */
type Defaulted =
  | 'width'
  | 'height'
  | 'heart'
  | 'veinDensity'
  | 'waterDensity'
  | 'cacheCount'
  | 'startBuzz'
  | 'traps'

export type LevelSpec = Omit<LevelDef, Defaulted> & Partial<Pick<LevelDef, Defaulted>>

export function defineLevel(spec: LevelSpec): LevelDef {
  const width = spec.width ?? 40
  const height = spec.height ?? 30
  return {
    width,
    height,
    // The chamber sits left-of-centre so there is always room to dig east
    // towards the door and beyond it.
    heart: spec.heart ?? { x: Math.round(width * 0.28), y: Math.round(height / 2) },
    veinDensity: spec.veinDensity ?? 0.075,
    waterDensity: spec.waterDensity ?? 0.03,
    cacheCount: spec.cacheCount ?? 5,
    startBuzz: spec.startBuzz ?? 20,
    traps: spec.traps ?? CORE_TRAPS,
    ...spec,
  }
}

/** Rooms every wing gets on top of its own. */
export const CORE_ROOMS = [
  'royalties-vault',
  'green-room',
  'merch-table',
  'practice-space',
  'merch-stand',
  'contract-office',
  'signing-room',
]

/** Traps any level with a raid on it can lay. Wings add their own on top. */
export const CORE_TRAPS = ['cable-snare', 'feedback-loop', 'door-buzzer']

/** The spell list a mid-campaign level would reasonably have unlocked. */
export const CORE_SPELLS = ['callback', 'backstage-pass', 'fast-forward', 'encore', 'sold-out']
