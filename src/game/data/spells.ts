import type { SpellDef } from './types'

/**
 * Spell catalogue. Names and implementations are original; a couple of the
 * *concepts* (seal a door, call to arms) are deliberate genre nods.
 */
export const SPELLS: SpellDef[] = [
  {
    id: 'encore',
    name: 'Encore',
    cost: 15,
    cooldownSeconds: 6,
    targeting: 'creature',
    effect: { kind: 'heal', amount: 45 },
    blurb: 'One more song. Heals a creature.',
    glyph: '✚',
  },
  {
    id: 'callback',
    name: 'Callback',
    cost: 20,
    cooldownSeconds: 12,
    targeting: 'tile',
    effect: { kind: 'rally', radius: 999 },
    blurb: 'Calls every idle creature to a spot. Nobody is pleased about it.',
    glyph: '⌖',
  },
  {
    id: 'backstage-pass',
    name: 'Backstage Pass',
    cost: 25,
    cooldownSeconds: 15,
    targeting: 'tile',
    effect: { kind: 'reveal', radius: 7 },
    blurb: 'Reveals a patch of unexplored basement. No, you cannot meet the band.',
    glyph: '◎',
  },
  {
    id: 'fast-forward',
    name: 'Fast Forward',
    cost: 30,
    cooldownSeconds: 25,
    targeting: 'tile',
    effect: { kind: 'buff', speedMul: 1.8, seconds: 20, radius: 5 },
    blurb: 'Everyone nearby works faster for a bit. Nobody discusses why.',
    glyph: '»',
  },
  {
    id: 'mosh-pit',
    name: 'Mosh Pit',
    cost: 35,
    cooldownSeconds: 30,
    targeting: 'tile',
    effect: { kind: 'buff', speedMul: 2.2, seconds: 12, radius: 3 },
    blurb: 'A tight, enthusiastic circle of violence. Buffs whoever is in it.',
    glyph: '✷',
  },
  {
    id: 'sold-out',
    name: 'Sold Out',
    cost: 40,
    cooldownSeconds: 45,
    targeting: 'tile',
    effect: { kind: 'seal', seconds: 45 },
    blurb: 'Seals a door. The sign is not a lie, exactly.',
    glyph: '⊘',
  },
  {
    id: 'viral-moment',
    name: 'Viral Moment',
    cost: 90,
    cooldownSeconds: 120,
    targeting: 'none',
    effect: { kind: 'global-buff', speedMul: 1.5, buzzMul: 2, seconds: 30 },
    blurb: 'Everything, everywhere, briefly going extremely well. Expensive.',
    glyph: '★',
  },
]

const BY_ID = new Map(SPELLS.map((s) => [s.id, s]))

export function spell(id: string): SpellDef {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`Unknown spell: ${id}`)
  return def
}
