import type { WingId } from './types'

/**
 * Traps.
 *
 * Rooms are what you make; traps are what you leave lying around. One is laid
 * per tile on ground you already own, costs Royalties up front, arms after a
 * moment and then fires on the first intruder to come within `trigger` tiles.
 * Charges are finite, which keeps a corridor of traps a decision about where a
 * raid is going rather than a wall you build once and forget.
 *
 * Everything here is data. The simulation branches on `effect.kind` and nothing
 * else, so a new trap is a new entry, not a code change.
 */

export type TrapEffect =
  /** Straight damage to everything hostile in the blast. */
  | { kind: 'damage'; amount: number; radius: number }
  /** Cuts intruder speed for a while. Buys the crew time to get there. */
  | { kind: 'slow'; speedMul: number; seconds: number; radius: number }
  /** Hurts nobody. Pulls every free creature to the spot instead. */
  | { kind: 'alarm'; radius: number }

export interface TrapDef {
  id: string
  name: string
  wing: WingId
  /** Royalties charged when it is laid. */
  cost: number
  /** Seconds after placement before it will fire. */
  armSeconds: number
  /** Tiles from the trap at which an intruder sets it off. */
  trigger: number
  /** Times it fires before it is spent and gone. */
  charges: number
  effect: TrapEffect
  color: number
  accent: number
  /** Single glyph for the placeholder dock art. */
  glyph: string
  blurb: string
}

export const TRAPS: TrapDef[] = [
  {
    id: 'cable-snare',
    name: 'Cable Snare',
    wing: 'core',
    cost: 45,
    armSeconds: 2,
    trigger: 1.2,
    charges: 3,
    effect: { kind: 'slow', speedMul: 0.4, seconds: 6, radius: 1.6 },
    color: 0x3c3a44,
    accent: 0x8f8aa8,
    glyph: '➰',
    blurb: 'A coil of unlabelled cable. Cheap, reusable, and nobody gets through it quickly.',
  },
  {
    id: 'feedback-loop',
    name: 'Feedback Loop',
    wing: 'core',
    cost: 90,
    armSeconds: 3,
    trigger: 1.4,
    charges: 2,
    effect: { kind: 'damage', amount: 45, radius: 1.8 },
    color: 0x6b2f3a,
    accent: 0xff6b8a,
    glyph: '🔊',
    blurb: 'An open mic pointed at its own monitor. Hurts everything standing near it.',
  },
  {
    id: 'door-buzzer',
    name: 'Door Buzzer',
    wing: 'core',
    cost: 30,
    armSeconds: 1,
    trigger: 2.4,
    charges: 4,
    effect: { kind: 'alarm', radius: 12 },
    color: 0x2f4438,
    accent: 0x8ce0a8,
    glyph: '🔔',
    blurb: 'Does no damage. Everyone who is free downs tools and comes running.',
  },
  {
    id: 'blast-beat',
    name: 'Blast Beat Plate',
    wing: 'metal',
    cost: 170,
    armSeconds: 5,
    trigger: 1.2,
    charges: 1,
    effect: { kind: 'damage', amount: 120, radius: 2.2 },
    color: 0x4a2a20,
    accent: 0xff9a5b,
    glyph: '💥',
    blurb: 'A kick drum triggered by a floor plate. One use, and everyone hears it.',
  },
  {
    id: 'strobe-pit',
    name: 'Strobe Pit',
    wing: 'electronic',
    cost: 120,
    armSeconds: 3,
    trigger: 2,
    charges: 2,
    effect: { kind: 'slow', speedMul: 0.15, seconds: 9, radius: 2.6 },
    color: 0x2a3a5c,
    accent: 0x8fd0ff,
    glyph: '✳',
    blurb: 'Nobody walks anywhere in a straight line through this. Wide, long, no damage.',
  },
]

const BY_ID = new Map(TRAPS.map((t) => [t.id, t]))

export function trap(id: string): TrapDef {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`Unknown trap: ${id}`)
  return def
}

export function trapOrNull(id: string): TrapDef | null {
  return BY_ID.get(id) ?? null
}
