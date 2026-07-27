import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, defineLevel } from './defineLevel'

/**
 * Campaign 7 — The Algorithm. Every wing at once, in one basement, against the
 * thing that wants all of them to sound the same.
 *
 * The finale's own mechanic is `flatten`: on a timer the Algorithm halves every
 * wing's output until a Mixing Board of the right size cuts it back apart. That
 * is the whole fight — you cannot out-earn it, you have to answer it.
 */
const ALL_WINGS = [
  ...CORE_ROOMS,
  'basement-venue',
  'screen-print-shack',
  'horn-alcove',
  'rehearsal-crypt',
  'corpsepaint-vanity',
  'moshpit-arena',
  'reverb-chamber',
  'cardigan-closet',
  'sample-vault',
  'cypher-corner',
  'synth-greenhouse',
  'glowstick-hatchery',
  'dj-throne',
  'campfire-ring',
  'craft-beer-cellar',
  'mixing-board',
]

const ALL_SPELLS = [...CORE_SPELLS, 'mosh-pit', 'viral-moment']

export const CAMPAIGN_7_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c7-l1',
    campaignId: 'the-algorithm',
    index: 1,
    name: 'Convergence',
    wing: 'finale',
    poster: {
      headline: 'EVERYONE, IN ONE BASEMENT, SOMEHOW',
      lines: [
        'Six wings who have spent the entire game not speaking are now sharing a corridor.',
        'They do not have to like each other. They have to work in the same room.',
      ],
    },
    seed: 9990001,
    startRoyalties: 1600,
    startBuzz: 80,
    capacity: 36,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'punk-imp', count: 1 },
      { creature: 'doom-ogre', count: 1 },
      { creature: 'rapper-golem', count: 1 },
      { creature: 'campfire-elder', count: 1 },
    ],
    rooms: ALL_WINGS,
    spells: ALL_SPELLS,
    objectives: [
      { kind: 'creatures', amount: 24, label: 'Get 24 creatures under one roof' },
      { kind: 'buzz', amount: 450, label: 'Reach 450 Buzz' },
      { kind: 'royalties', amount: 3000, label: 'Bank 3000 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Every wing is buildable now. The Campfire Ring buffs all of them equally.' },
      { when: { kind: 'elapsed', seconds: 300 }, text: 'Metal still needs its Vanity. Shoegaze still needs its Closet. Nobody has changed.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'It opens with scouts. It always opens with scouts.' },
      { at: 320, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'Radio, drains, the usual arrangement.' },
      { at: 500, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'critique-cleric', count: 2 }], announce: 'And hardware.' },
    ],
  }),

  defineLevel({
    id: 'c7-l2',
    campaignId: 'the-algorithm',
    index: 2,
    name: 'Flattened',
    wing: 'finale',
    poster: {
      headline: 'LO-FI BEATS TO DUNGEON-KEEP TO',
      lines: [
        'It has stopped trying to sign your bands and started trying to make them identical.',
        'Every wing, every room, one sound. The Mixing Board is the only answer.',
      ],
    },
    seed: 9990002,
    startRoyalties: 1800,
    startBuzz: 120,
    capacity: 40,
    width: 44,
    height: 34,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'doom-ogre', count: 1 },
      { creature: 'synth-elemental', count: 1 },
      { creature: 'rapper-golem', count: 1 },
      { creature: 'campfire-elder', count: 1 },
    ],
    rooms: ALL_WINGS,
    spells: ALL_SPELLS,
    flatten: { everySeconds: 150, seconds: 45, counterTiles: 4 },
    objectives: [
      { kind: 'room', room: 'mixing-board', tiles: 4, label: 'Build The Mixing Board (4 tiles)' },
      { kind: 'buzz', amount: 600, label: 'Reach 600 Buzz despite the flattening' },
      { kind: 'survive', seconds: 600, label: 'Hold out for 10 minutes' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Build the Mixing Board first. Everything else is downstream of it.' },
      { when: { kind: 'elapsed', seconds: 160 }, text: 'While flattened, every room produces half. The Board clears it instantly.' },
    ],
    raids: [
      { at: 130, enemies: [{ enemy: 'algorithm-wraith', count: 2 }, { enemy: 'ar-scout', count: 2 }], announce: 'Softening you up.' },
      { at: 300, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'Hardware and radio.' },
      { at: 470, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'algorithm-wraith', count: 3 }], announce: 'It is draining faster than you are earning.' },
    ],
  }),

  defineLevel({
    id: 'c7-l3',
    campaignId: 'the-algorithm',
    index: 3,
    name: 'The Streaming Algorithm Overlord',
    wing: 'finale',
    poster: {
      headline: 'IT HAS LEARNED FROM ALL YOUR PREVIOUS FIGHTS',
      lines: [
        'Server farms in the walls. Everything flattened on a timer. And then, at the end,',
        'every single thing it has ever sent at you, all together, because it took notes.',
        'You have six wings and one basement. That is the whole answer.',
      ],
    },
    seed: 9990003,
    startRoyalties: 2200,
    startBuzz: 160,
    capacity: 44,
    width: 46,
    height: 34,
    veinDensity: 0.085,
    cacheCount: 7,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'punk-imp', count: 2 },
      { creature: 'doom-ogre', count: 2 },
      { creature: 'rapper-golem', count: 1 },
      { creature: 'synth-elemental', count: 1 },
      { creature: 'campfire-elder', count: 1 },
      { creature: 'session-player', count: 1 },
    ],
    rooms: ALL_WINGS,
    spells: ALL_SPELLS,
    flatten: { everySeconds: 120, seconds: 50, counterTiles: 5 },
    objectives: [
      { kind: 'defeat', enemy: 'server-farm', count: 5, label: 'Phase 1 — smash five Server Farms' },
      { kind: 'room', room: 'mixing-board', tiles: 5, label: 'Phase 2 — hold a five-tile Mixing Board' },
      { kind: 'defeat', enemy: 'eviction-warlord', count: 1, label: 'Phase 3 — survive what it sends last' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Three phases: break the farms, hold the Board, then survive everything at once.' },
      { when: { kind: 'elapsed', seconds: 240 }, text: 'It flattens every two minutes. A five-tile Board answers it every time.' },
      { when: { kind: 'elapsed', seconds: 600 }, text: 'The last wave is every enemy in the game. Callback everyone. Now.' },
    ],
    raids: [
      { at: 90, enemies: [{ enemy: 'server-farm', count: 2 }], announce: 'PHASE ONE. It is installing itself in your walls.' },
      { at: 240, enemies: [{ enemy: 'server-farm', count: 2 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'More hardware, and drains to guard it.' },
      { at: 400, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'playlist-paladin', count: 2 }], announce: 'PHASE TWO. It is flattening everything you have built.' },
      { at: 560, enemies: [{ enemy: 'critique-cleric', count: 3 }, { enemy: 'noise-inspector', count: 2 }], announce: 'Press and paperwork, to slow you down.' },
      {
        at: 720,
        enemies: [
          { enemy: 'eviction-warlord', count: 1 },
          { enemy: 'playlist-paladin', count: 2 },
          { enemy: 'critique-cleric', count: 2 },
          { enemy: 'ar-scout', count: 3 },
          { enemy: 'algorithm-wraith', count: 2 },
        ],
        announce: 'PHASE THREE. Everything it has ever sent, at once. It took notes.',
      },
    ],
  }),
]
