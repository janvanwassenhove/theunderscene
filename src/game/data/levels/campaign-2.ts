import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, CORE_TRAPS, defineLevel } from './defineLevel'

const METAL_ROOMS = [...CORE_ROOMS, 'rehearsal-crypt', 'corpsepaint-vanity', 'moshpit-arena', 'basement-venue']

/**
 * Campaign 2 — The Rehearsal Crypt. Metal: bigger, meaner creatures, a slower
 * economy, and raids that hit like a kick drum. Veins are thinner here on
 * purpose — the wing is supposed to feel like hard going.
 */
export const CAMPAIGN_2_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c2-l1',
    campaignId: 'rehearsal-crypt',
    index: 1,
    name: 'Down Tuned',
    wing: 'metal',
    poster: {
      headline: 'EVERYTHING IS IN DROP A',
      lines: [
        'The basement under the basement. Colder, damper, considerably more serious.',
        'These ones hit harder, work slower, and will not do anything without a mirror.',
      ],
    },
    seed: 66601,
    startRoyalties: 900,
    capacity: 22,
    veinDensity: 0.055,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'doom-ogre', count: 1 },
    ],
    rooms: METAL_ROOMS,
    spells: CORE_SPELLS,
    traps: [...CORE_TRAPS, 'blast-beat'],
    objectives: [
      { kind: 'room', room: 'rehearsal-crypt', tiles: 4, label: 'Dig out a Rehearsal Crypt' },
      { kind: 'room', room: 'corpsepaint-vanity', tiles: 2, label: 'Build a Corpsepaint Vanity' },
      { kind: 'royalties', amount: 1800, label: 'Bank 1800 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'No Corpsepaint Vanity means the whole wing loses Loyalty twice as fast.' },
      { when: { kind: 'room', room: 'rehearsal-crypt' }, text: 'The Crypt pays more the longer somebody stays in it.' },
    ],
    raids: [
      { at: 160, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts, down here, in the wrong shoes.' },
      {
        at: 340,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }],
        announce: 'Radio would like to know if it could be a bit more "accessible".',
      },
    ],
  }),

  defineLevel({
    id: 'c2-l2',
    campaignId: 'rehearsal-crypt',
    index: 2,
    name: 'The Pit',
    wing: 'metal',
    poster: {
      headline: 'CIRCLE UP',
      lines: [
        'A Moshpit Arena grows stats faster than any practice room going.',
        'It also breaks people. Both of those things are the point.',
      ],
    },
    seed: 66602,
    startRoyalties: 1000,
    capacity: 26,
    veinDensity: 0.06,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'doom-ogre', count: 2 },
    ],
    rooms: METAL_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    traps: [...CORE_TRAPS, 'blast-beat'],
    objectives: [
      { kind: 'room', room: 'moshpit-arena', tiles: 5, label: 'Open a Moshpit Arena' },
      { kind: 'creatures', amount: 16, label: 'Get 16 creatures on the roster' },
      { kind: 'buzz', amount: 260, label: 'Reach 260 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Doom Ogres are slow and enormous. Let the raids come to them.' },
      { when: { kind: 'elapsed', seconds: 240 }, text: 'Encore heals. In this wing you will use it.' },
    ],
    raids: [
      { at: 140, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Two scouts and a lot of misplaced confidence.' },
      {
        at: 300,
        enemies: [{ enemy: 'critique-cleric', count: 2 }],
        announce: 'Two critics. They have opinions about "authenticity".',
      },
      {
        at: 470,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'noise-inspector', count: 1 }],
        announce: 'Radio and an inspector. The inspector looks frightened.',
      },
    ],
  }),

  defineLevel({
    id: 'c2-l3',
    campaignId: 'rehearsal-crypt',
    index: 3,
    name: 'Blast Beat',
    wing: 'metal',
    poster: {
      headline: 'FASTER. NO — FASTER.',
      lines: [
        'The economy down here is glacial and the raids are not.',
        'Build the Crypt early, keep it occupied, and let the echo do the earning.',
      ],
    },
    seed: 66603,
    startRoyalties: 1100,
    capacity: 28,
    width: 42,
    height: 32,
    veinDensity: 0.055,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'doom-ogre', count: 2 },
      { creature: 'corpsepaint-wraith', count: 1 },
    ],
    rooms: METAL_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    traps: [...CORE_TRAPS, 'blast-beat'],
    objectives: [
      { kind: 'royalties', amount: 3200, label: 'Bank 3200 Royalties' },
      { kind: 'creatures', amount: 20, label: 'Get 20 creatures on the roster' },
      { kind: 'survive', seconds: 660, label: 'Hold the Crypt for 11 minutes' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Corpsepaint Wraiths debuff intruders on sight — and need the Vanity badly.' },
      { when: { kind: 'elapsed', seconds: 420 }, text: 'Beaten intruders can be signed. A Doom Ogre makes a lot of prisoners.' },
    ],
    raids: [
      { at: 130, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts. Three of them. Nobody told them.' },
      {
        at: 290,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 1 }],
        announce: 'The aura is the problem. Kill the aura.',
      },
      {
        at: 450,
        enemies: [{ enemy: 'playlist-paladin', count: 2 }],
        announce: 'Two Paladins. Their auras stack. Ours does not.',
      },
      {
        at: 610,
        enemies: [{ enemy: 'algorithm-wraith', count: 2 }],
        announce: 'Something is draining the Buzz and it is not a person.',
      },
    ],
  }),

  defineLevel({
    id: 'c2-l4',
    campaignId: 'rehearsal-crypt',
    index: 4,
    name: 'Eviction, Doom Metal Version',
    wing: 'metal',
    poster: {
      headline: 'HE HAS BROUGHT THE COUNCIL',
      lines: [
        'Your landlord has escalated. There is a Paladin with him and a folder of photographs.',
        'Down here that means a very long, very slow fight, which is the local genre anyway.',
      ],
    },
    seed: 66604,
    startRoyalties: 1300,
    capacity: 32,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'doom-ogre', count: 3 },
      { creature: 'corpsepaint-wraith', count: 1 },
    ],
    rooms: METAL_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    traps: [...CORE_TRAPS, 'blast-beat'],
    objectives: [
      { kind: 'defeat', enemy: 'eviction-warlord', count: 1, label: 'See off the Eviction Warlord' },
      { kind: 'defeat', enemy: 'playlist-paladin', count: 2, label: 'Break two Playlist Paladins' },
      { kind: 'royalties', amount: 2600, label: 'Bank 2600 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Two objectives are kills. Build the Moshpit early and level everyone up.' },
      { when: { kind: 'elapsed', seconds: 400 }, text: 'Sold Out buys you a whole wave of preparation time.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'playlist-paladin', count: 1 }], announce: 'The first Paladin. Practice.' },
      {
        at: 300,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 2 }],
        announce: 'The second one, with a press pack.',
      },
      {
        at: 480,
        enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'noise-inspector', count: 1 }],
        announce: 'THE LANDLORD, WITH THE COUNCIL. He is reading out the photographs.',
      },
    ],
  }),

  defineLevel({
    id: 'c2-l5',
    campaignId: 'rehearsal-crypt',
    index: 5,
    name: 'Slow Movement',
    wing: 'metal',
    poster: {
      headline: 'FORTY MINUTES, FOUR RIFFS',
      lines: [
        'The crypt has stopped being a rehearsal room and started being a fortification.',
        'Nothing here is fast. Not the songs, not the economy, and not the thing coming down the corridor.',
      ],
    },
    seed: 66605,
    startRoyalties: 1400,
    capacity: 34,
    width: 46,
    height: 34,
    veinDensity: 0.055,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'doom-ogre', count: 4 },
      { creature: 'corpsepaint-wraith', count: 2 },
    ],
    rooms: METAL_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    traps: [...CORE_TRAPS, 'blast-beat'],
    objectives: [
      { kind: 'survive', seconds: 780, label: 'Hold the Crypt for 13 minutes' },
      { kind: 'defeat', enemy: 'eviction-warlord', count: 2, label: 'See off both Warlords' },
      { kind: 'room', room: 'rehearsal-crypt', tiles: 12, label: 'Run a 12-tile Rehearsal Crypt' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'The Crypt ramps the longer it stays occupied. Leaving it empty resets that.' },
      { when: { kind: 'start' }, text: 'Blast Beat Plates are one use and hit hard. Save them for the corridor that matters.' },
      { when: { kind: 'elapsed', seconds: 600 }, text: 'Both Warlords are still to come. Do not spend the roster on the escorts.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 1 }], announce: 'A warm-up act nobody asked for.' },
      { at: 300, enemies: [{ enemy: 'eviction-warlord', count: 1 }], announce: 'THE LANDLORD. Early, this time.' },
      { at: 450, enemies: [{ enemy: 'comment-sniper', count: 3 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'Snipers, guarded. Go and get them.' },
      { at: 600, enemies: [{ enemy: 'noise-inspector', count: 2 }, { enemy: 'critique-cleric', count: 2 }], announce: 'Paperwork, to slow the fight down.' },
      { at: 720, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'playlist-paladin', count: 2 }], announce: 'AND THE OTHER ONE. He brought the folder and the council.' },
    ],
  }),
]
