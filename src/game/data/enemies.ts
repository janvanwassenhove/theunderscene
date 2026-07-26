import type { WingId } from './types'

/**
 * Intruder roster.
 *
 * Declared now, consumed from Phase 1 — raids, capture and the mid-boss are not
 * wired into the simulation yet. Keeping the roster here rather than in prose
 * means Phase 1 is an engine change against a fixed data shape, not a design
 * conversation restarted from a document.
 */

export type EnemyBehaviour =
  | { kind: 'capture'; captureSeconds: number }
  | { kind: 'melee' }
  | { kind: 'ranged'; range: number }
  | { kind: 'drain'; buzzPerSecond: number; range: number }
  | { kind: 'timer'; seconds: number; debuffRoom: string; debuffSeconds: number }
  | { kind: 'curse'; workRateMul: number; seconds: number }

export interface EnemyDef {
  id: string
  name: string
  hp: number
  speed: number
  attack: number
  /** Buff granted to other intruders standing nearby, if any. */
  aura?: { attackMul: number; radius: number }
  behaviour: EnemyBehaviour
  color: number
  accent: number
  build: 'squat' | 'tall' | 'wisp'
  blurb: string
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'ar-scout',
    name: 'A&R Scout',
    hp: 55,
    speed: 3.2,
    attack: 5,
    behaviour: { kind: 'capture', captureSeconds: 6 },
    color: 0x8a8f9c,
    accent: 0xdfe4ef,
    build: 'tall',
    blurb: 'Signs your creatures rather than killing them. Clear the level to win them back.',
  },
  {
    id: 'playlist-paladin',
    name: 'Corporate Playlist Paladin',
    hp: 220,
    speed: 1.7,
    attack: 14,
    aura: { attackMul: 1.35, radius: 4 },
    behaviour: { kind: 'melee' },
    color: 0xb9a05a,
    accent: 0xffe9a8,
    build: 'tall',
    blurb: 'Buffs everything around it. Kill it first, obviously.',
  },
  {
    id: 'algorithm-wraith',
    name: 'Streaming Algorithm Wraith',
    hp: 90,
    speed: 2.4,
    attack: 0,
    behaviour: { kind: 'drain', buzzPerSecond: 1.5, range: 3 },
    color: 0x5ad6c0,
    accent: 0xa8fff0,
    build: 'wisp',
    blurb: 'Does no damage. Drains Buzz straight out of nearby rooms instead.',
  },
  {
    id: 'noise-inspector',
    name: 'Noise Complaint Inspector',
    hp: 70,
    speed: 2.2,
    attack: 0,
    behaviour: {
      kind: 'timer',
      seconds: 60,
      debuffRoom: 'basement-venue',
      debuffSeconds: 90,
    },
    color: 0x7d8a6b,
    accent: 0xd6e2bd,
    build: 'squat',
    blurb: 'Non-combat. Intercept before the clipboard runs out or your Venue goes quiet.',
  },
  {
    id: 'critique-cleric',
    name: 'Critique Cleric',
    hp: 80,
    speed: 2.3,
    attack: 4,
    behaviour: { kind: 'curse', workRateMul: 0.5, seconds: 30 },
    color: 0x6b5f8a,
    accent: 0xc2b3ef,
    build: 'tall',
    blurb: 'Casts Bad Review. The target works at half speed and knows why.',
  },
  {
    id: 'eviction-warlord',
    name: 'Eviction Warlord',
    hp: 600,
    speed: 1.9,
    attack: 26,
    behaviour: { kind: 'melee' },
    color: 0x9b3a2e,
    accent: 0xff8f6b,
    build: 'tall',
    blurb: 'Your landlord. Recurring, escalating, and never once in a good mood.',
  },
]

/** Final boss structure, for the finale campaign. Not implemented yet. */
export interface BossPhase {
  id: string
  name: string
  summary: string
}

export const ALGORITHM_OVERLORD: {
  id: string
  name: string
  wing: WingId
  phases: BossPhase[]
} = {
  id: 'algorithm-overlord',
  name: 'The Streaming Algorithm Overlord',
  wing: 'finale',
  phases: [
    {
      id: 'server-farms',
      name: 'Server Farms',
      summary: 'Spawns Server Farm structures that drain Buzz level-wide until destroyed.',
    },
    {
      id: 'flatten',
      name: 'Flatten',
      summary:
        'Periodically converts every creature\'s genre buff into one generic debuff. The Mixing Board is the counterplay.',
    },
    {
      id: 'learned-assault',
      name: 'Learned Assault',
      summary: 'A combined wave drawn from every prior enemy roster.',
    },
  ],
}

const BY_ID = new Map(ENEMIES.map((e) => [e.id, e]))

export function enemy(id: string): EnemyDef {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`Unknown enemy: ${id}`)
  return def
}
