import type { RoomDef } from './types'

/**
 * Room catalogue. Core rooms are available from Campaign 0; wing rooms are
 * listed per level in `levels/*`. Rooms not yet wired to an engine effect are
 * still declared here so the design doc and the data stay in one place — they
 * simply carry no `effects` until their phase lands.
 */
export const ROOMS: RoomDef[] = [
  // ── Core rooms ─────────────────────────────────────────────────────────────
  {
    id: 'royalties-vault',
    name: 'Royalties Vault',
    role: 'treasury',
    wing: 'core',
    costPerTile: 0,
    minTiles: 1,
    color: 0x6b5a2e,
    accent: 0xffd166,
    blurb: 'Stores mined Royalties. Overflow ends up in loose piles on the floor.',
    effects: { treasury: { capacityPerTile: 400 } },
  },
  {
    id: 'green-room',
    name: 'Green Room',
    role: 'lair',
    wing: 'core',
    costPerTile: 40,
    minTiles: 2,
    color: 0x2f5140,
    accent: 0x7fd6a2,
    blurb: 'One bed per creature. Beds set your population ceiling.',
    effects: { lair: { bedsPerTile: 1 }, morale: { loyaltyPerMinute: 1 } },
    attracts: [{ creature: 'roadie-ogre', minTiles: 4, weight: 3 }],
  },
  {
    id: 'merch-table',
    name: 'Merch Table',
    role: 'hatchery',
    wing: 'core',
    costPerTile: 50,
    minTiles: 3,
    color: 0x5b3b6b,
    accent: 0xd9a3ff,
    blurb: 'Feeds the roster. Understaffed means grumpy, slow creatures.',
    effects: {
      food: { mealsPerMinutePerTile: 1.2, royaltiesPerMeal: 6 },
      royalties: { perMinutePerTile: 2 },
    },
    attracts: [{ creature: 'merch-imp', minTiles: 4, weight: 2 }],
  },
  {
    id: 'practice-space',
    name: 'Practice Space',
    role: 'training room',
    wing: 'core',
    costPerTile: 75,
    minTiles: 4,
    color: 0x3a4a6b,
    accent: 0x8ab4ff,
    blurb: 'Levels creatures up over time. Charges Royalties per session.',
    effects: { training: { xpPerMinutePerTile: 4, royaltiesPerMinute: 4 } },
  },
  {
    id: 'contract-office',
    name: "Contract Office",
    role: 'prison',
    wing: 'core',
    costPerTile: 60,
    minTiles: 3,
    color: 0x4a4a52,
    accent: 0xb9bcc6,
    blurb: 'Holds captured intruders instead of killing them.',
    effects: { prison: { capacityPerTile: 1 } },
  },
  {
    id: 'signing-room',
    name: 'Signing Room',
    role: 'conversion',
    wing: 'core',
    costPerTile: 90,
    minTiles: 3,
    color: 0x6b2f3a,
    accent: 0xff8fa3,
    blurb: 'Convinces a captured intruder that your genre is, in fact, cooler.',
  },
  {
    id: 'booking-door',
    name: "Booking Agent's Door",
    role: 'portal',
    wing: 'core',
    costPerTile: 0,
    minTiles: 1,
    color: 0x4a3a6b,
    accent: 0xc0a3ff,
    blurb: 'Where wandering creatures wander in. Sealable with Sold Out.',
    effects: { portal: { spawnIntervalSeconds: 22 } },
  },
  {
    id: 'merch-stand',
    name: 'Merch Stand',
    role: 'bridge',
    wing: 'core',
    costPerTile: 25,
    minTiles: 1,
    color: 0x5a4a3a,
    accent: 0xd8b98a,
    blurb: 'A plank over the flooded bit. Structural, mostly.',
  },

  // ── Punk & Ska ─────────────────────────────────────────────────────────────
  {
    id: 'basement-venue',
    name: 'Basement Venue',
    role: 'venue',
    wing: 'punk',
    costPerTile: 80,
    minTiles: 6,
    color: 0x6b2e33,
    accent: 0xff4d5a,
    blurb: 'Pops Buzz on a timer. Also the first thing a raid heads for.',
    effects: { buzz: { perMinutePerTile: 3.5 } },
    attracts: [{ creature: 'punk-imp', minTiles: 6, weight: 4 }],
  },
  {
    id: 'screen-print-shack',
    name: 'Screen-Print Shack',
    role: 'merch production',
    wing: 'punk',
    costPerTile: 65,
    minTiles: 4,
    color: 0x53442e,
    accent: 0xffb35c,
    blurb: 'Prints shirts, prints money, prints ink onto arguments.',
    effects: { royalties: { perMinutePerTile: 5 } },
    attracts: [{ creature: 'merch-imp', minTiles: 4, weight: 2 }],
  },
  {
    id: 'horn-alcove',
    name: 'Horn Section Alcove',
    role: 'buff pulse',
    wing: 'punk',
    costPerTile: 70,
    minTiles: 3,
    color: 0x4a5a2e,
    accent: 0xd8e05c,
    blurb: 'Brass stabs buff adjacent rooms on a pulse. Requires patience.',
    effects: { buzz: { perMinutePerTile: 1.5 }, morale: { loyaltyPerMinute: 2 } },
    attracts: [{ creature: 'ska-hoorndemon', minTiles: 3, weight: 2 }],
  },
]

const BY_ID = new Map(ROOMS.map((r) => [r.id, r]))

export function room(id: string): RoomDef {
  const def = BY_ID.get(id)
  if (!def) throw new Error(`Unknown room: ${id}`)
  return def
}

export function roomOrNull(id: string): RoomDef | null {
  return BY_ID.get(id) ?? null
}
