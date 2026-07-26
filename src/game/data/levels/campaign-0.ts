import type { LevelDef } from '../types'

const CORE_ROOMS = [
  'royalties-vault',
  'green-room',
  'merch-table',
  'practice-space',
  'basement-venue',
  'screen-print-shack',
  'merch-stand',
]

/**
 * Campaign 0 — The First Basement. Doubles as the tutorial: there is no
 * separate tutorial mode, the level design and the hint lines do the teaching.
 */
export const CAMPAIGN_0_LEVELS: LevelDef[] = [
  {
    id: 'c0-l1',
    campaignId: 'first-basement',
    index: 1,
    name: 'Damp Beginnings',
    wing: 'punk',
    poster: {
      headline: 'ONE (1) BASEMENT. NO (0) PLAN.',
      lines: [
        'The lease says "storage". The lease is doing a lot of work there.',
        'You have a shovel, a roadie who works for sandwiches, and a rock wall with money behind it.',
        'Dig out a vault, put a roof over somebody, and see what wanders in.',
      ],
    },
    width: 32,
    height: 26,
    seed: 20260726,
    heart: { x: 9, y: 13 },
    startRoyalties: 350,
    startBuzz: 0,
    capacity: 12,
    veinDensity: 0.06,
    waterDensity: 0.01,
    cacheCount: 3,
    startingCreatures: [{ creature: 'roadie-ogre', count: 3 }],
    rooms: ['royalties-vault', 'green-room', 'merch-table'],
    spells: ['callback', 'backstage-pass'],
    objectives: [
      { kind: 'room', room: 'royalties-vault', tiles: 4, label: 'Dig out a Royalties Vault (4 tiles)' },
      { kind: 'room', room: 'green-room', tiles: 4, label: 'Give somebody a Green Room (4 tiles)' },
      { kind: 'royalties', amount: 900, label: 'Bank 900 Royalties' },
    ],
    hints: [
      {
        when: { kind: 'start' },
        text: 'Tap DIG, then drag across rock to mark it. Your roadies do the rest.',
      },
      {
        when: { kind: 'royalties', atLeast: 500 },
        text: 'Gold-flecked rock is a Royalty Vein. Loose piles need a Vault to go into.',
      },
      {
        when: { kind: 'room', room: 'green-room' },
        text: 'Beds set your population cap. A Booking Agent\'s Door brings the population.',
      },
    ],
    // Level 1 teaches the loop unmolested — nobody has heard of you yet.
    raids: [],
  },
  {
    id: 'c0-l2',
    campaignId: 'first-basement',
    index: 2,
    name: 'Word Gets Out',
    wing: 'punk',
    poster: {
      headline: 'SOMEBODY POSTED ABOUT IT',
      lines: [
        'Four people came to the last one and one of them was your landlord, so: growth.',
        'A door has appeared in the east wall. Doors bring people. People want beds and food.',
        'Feed them, house them, and get a room loud enough to count as a venue.',
      ],
    },
    width: 38,
    height: 28,
    seed: 771103,
    heart: { x: 10, y: 14 },
    startRoyalties: 500,
    startBuzz: 10,
    capacity: 18,
    veinDensity: 0.07,
    waterDensity: 0.025,
    cacheCount: 4,
    startingCreatures: [{ creature: 'roadie-ogre', count: 3 }],
    rooms: CORE_ROOMS,
    spells: ['callback', 'backstage-pass', 'fast-forward'],
    objectives: [
      { kind: 'creatures', amount: 8, label: 'Get 8 creatures on the roster' },
      { kind: 'room', room: 'basement-venue', tiles: 6, label: 'Open a Basement Venue (6 tiles)' },
      { kind: 'buzz', amount: 120, label: 'Reach 120 Buzz' },
    ],
    hints: [
      {
        when: { kind: 'start' },
        text: 'Creatures walk in through a Booking Agent\'s Door once you build what they want.',
      },
      {
        when: { kind: 'creatures', atLeast: 5 },
        text: 'Unfed creatures lose Loyalty, then slack off, then quit the band.',
      },
      {
        when: { kind: 'elapsed', seconds: 240 },
        text: 'Buzz decays. Turtling is not a strategy, it is just a slower loss.',
      },
      {
        when: { kind: 'elapsed', seconds: 100 },
        text: 'Intruders come in through your door. Sold Out seals it — while it lasts.',
      },
      {
        when: { kind: 'elapsed', seconds: 200 },
        text: 'Flooded section in the way? A Merch Stand planks straight over it.',
      },
    ],
    raids: [
      {
        at: 150,
        enemies: [{ enemy: 'ar-scout', count: 1 }],
        announce: 'An A&R Scout is downstairs. They are here to sign someone, not to listen.',
      },
      {
        at: 330,
        enemies: [{ enemy: 'ar-scout', count: 2 }],
        announce: 'Two more scouts. Word really did get out.',
      },
      {
        at: 500,
        enemies: [
          { enemy: 'noise-inspector', count: 1 },
          { enemy: 'ar-scout', count: 1 },
        ],
        announce: 'Noise Complaint Inspector on site, clipboard already out.',
      },
    ],
  },
  {
    id: 'c0-l3',
    campaignId: 'first-basement',
    index: 3,
    name: 'The Landlord Cometh',
    wing: 'punk',
    poster: {
      headline: 'RE: NOISE / RE: RENT / RE: THE HOLE',
      lines: [
        'Your landlord has questions about the hole. Several questions. In writing.',
        'He is coming down here personally, which is the first time he has done anything personally.',
        'Bank enough Royalties that the conversation goes your way.',
      ],
    },
    width: 40,
    height: 30,
    seed: 4041985,
    heart: { x: 11, y: 15 },
    startRoyalties: 600,
    startBuzz: 20,
    capacity: 24,
    veinDensity: 0.075,
    waterDensity: 0.03,
    cacheCount: 5,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'merch-imp', count: 1 },
    ],
    rooms: [...CORE_ROOMS, 'horn-alcove', 'contract-office', 'signing-room'],
    spells: ['callback', 'backstage-pass', 'fast-forward', 'mosh-pit', 'encore', 'sold-out'],
    objectives: [
      { kind: 'royalties', amount: 1800, label: 'Bank 1800 Royalties' },
      { kind: 'creatures', amount: 10, label: 'Get 10 creatures on the roster' },
      { kind: 'defeat', enemy: 'eviction-warlord', count: 1, label: 'See off the Eviction Warlord' },
    ],
    hints: [
      {
        when: { kind: 'start' },
        text: 'Practice Space raises stats over time — it costs Royalties per session.',
      },
      {
        when: { kind: 'elapsed', seconds: 120 },
        text: 'A Contract Office holds beaten intruders. A Signing Room talks them round.',
      },
      {
        when: { kind: 'elapsed', seconds: 330 },
        text: 'Your landlord is on his way down. Get everyone in one place — Callback helps.',
      },
    ],
    raids: [
      {
        at: 120,
        enemies: [{ enemy: 'ar-scout', count: 2 }],
        announce: 'Scouts again. They have your address now.',
      },
      {
        at: 260,
        enemies: [
          { enemy: 'critique-cleric', count: 1 },
          { enemy: 'ar-scout', count: 1 },
        ],
        announce: 'A critic came down. Unpaid, unasked, unbearable.',
      },
      {
        at: 400,
        enemies: [
          { enemy: 'noise-inspector', count: 1 },
          { enemy: 'playlist-paladin', count: 1 },
        ],
        announce: 'Corporate radio is in the building. Kill the aura first.',
      },
      {
        at: 480,
        enemies: [{ enemy: 'eviction-warlord', count: 1 }],
        announce: 'THE LANDLORD IS HERE. He has questions about the hole.',
      },
    ],
  },
]
