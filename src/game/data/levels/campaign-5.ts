import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, CORE_TRAPS, defineLevel } from './defineLevel'

const ELECTRONIC_ROOMS = [...CORE_ROOMS, 'synth-greenhouse', 'glowstick-hatchery', 'dj-throne']

/**
 * Campaign 5 — Analog Deep. Electronic: the fastest Buzz in the game and the
 * fastest to fall over. Recruitment is cheap and disloyal, the Synths drop out
 * on a timer, and the DJ Throne is the one seat worth fighting over.
 */
export const CAMPAIGN_5_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c5-l1',
    campaignId: 'analog-deep',
    index: 1,
    name: 'Patch Notes',
    wing: 'electronic',
    poster: {
      headline: 'IT WAS WORKING IN THE STUDIO',
      lines: [
        'The Greenhouse makes more Buzz than anything else in the game.',
        'The things that run it stop working every seventy-five seconds. Plan for it.',
      ],
    },
    seed: 3030001,
    startRoyalties: 950,
    startBuzz: 40,
    capacity: 26,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'synth-elemental', count: 1 },
    ],
    rooms: ELECTRONIC_ROOMS,
    spells: CORE_SPELLS,
    traps: [...CORE_TRAPS, 'strobe-pit'],
    objectives: [
      { kind: 'room', room: 'synth-greenhouse', tiles: 5, label: 'Grow an Analog Synth Greenhouse' },
      { kind: 'buzz', amount: 400, label: 'Reach 400 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Synth Elementals glitch out periodically. Keep more than one.' },
      { when: { kind: 'room', room: 'synth-greenhouse' }, text: 'Buzz decays. The bigger the number, the faster it drains.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'algorithm-wraith', count: 2 }], announce: 'Drains. In this wing they hurt.' },
      { at: 330, enemies: [{ enemy: 'ar-scout', count: 2 }, { enemy: 'algorithm-wraith', count: 1 }], announce: 'Scouts, with a drain in tow.' },
    ],
  }),

  defineLevel({
    id: 'c5-l2',
    campaignId: 'analog-deep',
    index: 2,
    name: 'Everyone Is Here',
    wing: 'electronic',
    poster: {
      headline: 'CAPACITY: YES',
      lines: [
        'A Glowstick Hatchery fills the room in half the usual time.',
        'Everyone arrives less committed than usual, which is a problem for later.',
      ],
    },
    seed: 3030002,
    startRoyalties: 1000,
    startBuzz: 60,
    capacity: 34,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'synth-elemental', count: 1 },
      { creature: 'glowstick-wisp', count: 3 },
    ],
    rooms: ELECTRONIC_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    traps: [...CORE_TRAPS, 'strobe-pit'],
    objectives: [
      { kind: 'room', room: 'glowstick-hatchery', tiles: 3, label: 'Open a Glowstick Hatchery' },
      { kind: 'creatures', amount: 26, label: 'Get 26 creatures on the roster' },
      { kind: 'buzz', amount: 500, label: 'Reach 500 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Hatchery recruits start on low Loyalty. Feed them or watch them leave.' },
      { when: { kind: 'creatures', atLeast: 20 }, text: 'Wisps are cheap and die instantly. That is a use, not a flaw.' },
    ],
    raids: [
      { at: 140, enemies: [{ enemy: 'algorithm-wraith', count: 2 }], announce: 'The drains are back.' },
      { at: 310, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'Radio, escorting the drains again.' },
      { at: 400, enemies: [{ enemy: 'comment-sniper', count: 2 }], announce: 'Two voices from the dark, both wrong.' },
      { at: 490, enemies: [{ enemy: 'critique-cleric', count: 2 }, { enemy: 'ar-scout', count: 2 }], announce: '"Is it even music" — them, again.' },
    ],
  }),

  defineLevel({
    id: 'c5-l3',
    campaignId: 'analog-deep',
    index: 3,
    name: 'The Throne',
    wing: 'electronic',
    poster: {
      headline: 'ONE SEAT. ONE.',
      lines: [
        'The DJ Throne lifts the Buzz of the entire basement, as long as somebody is on it.',
        'It is a single tile and it is worth more than most rooms.',
      ],
    },
    seed: 3030003,
    startRoyalties: 1300,
    startBuzz: 80,
    capacity: 36,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'synth-elemental', count: 2 },
      { creature: 'glowstick-wisp', count: 4 },
    ],
    rooms: ELECTRONIC_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    traps: [...CORE_TRAPS, 'strobe-pit'],
    objectives: [
      { kind: 'room', room: 'dj-throne', tiles: 1, label: 'Install the DJ Throne' },
      { kind: 'buzz', amount: 700, label: 'Reach 700 Buzz' },
      { kind: 'royalties', amount: 3500, label: 'Bank 3500 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'The Throne only works while somebody is actually sitting on it.' },
      { when: { kind: 'room', room: 'dj-throne' }, text: 'Viral Moment plus a manned Throne is the biggest number in the game.' },
    ],
    raids: [
      { at: 130, enemies: [{ enemy: 'algorithm-wraith', count: 3 }], announce: 'Three drains, straight for the Greenhouse.' },
      { at: 300, enemies: [{ enemy: 'playlist-paladin', count: 2 }], announce: 'They want the Throne.' },
      { at: 380, enemies: [{ enemy: 'comment-sniper', count: 3 }], announce: 'A wall of opinion at six tiles.' },
      { at: 470, enemies: [{ enemy: 'algorithm-wraith', count: 3 }, { enemy: 'critique-cleric', count: 1 }], announce: 'More drains. It is learning what hurts.' },
    ],
  }),

  defineLevel({
    id: 'c5-l4',
    campaignId: 'analog-deep',
    index: 4,
    name: 'Hard Shutdown',
    wing: 'electronic',
    poster: {
      headline: 'IT HAS FOUND THE POWER SUPPLY',
      lines: [
        'The Algorithm has stopped sending people and started sending equipment.',
        'Server Farms do not move and do not fight. They just take the Buzz until you break them.',
      ],
    },
    seed: 3030004,
    startRoyalties: 1500,
    startBuzz: 100,
    capacity: 38,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'synth-elemental', count: 2 },
      { creature: 'glowstick-wisp', count: 5 },
    ],
    rooms: ELECTRONIC_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    traps: [...CORE_TRAPS, 'strobe-pit'],
    objectives: [
      { kind: 'defeat', enemy: 'server-farm', count: 3, label: 'Smash three Server Farms' },
      { kind: 'buzz', amount: 600, label: 'Hold 600 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Server Farms sit still and drain. Send everyone; they cannot hit back.' },
      { when: { kind: 'elapsed', seconds: 300 }, text: 'They drain whether you are near them or not. Speed matters.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'server-farm', count: 1 }], announce: 'It has installed something in the corridor.' },
      { at: 280, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'Another one, with a guard.' },
      { at: 360, enemies: [{ enemy: 'comment-sniper', count: 3 }, { enemy: 'critique-cleric', count: 1 }], announce: 'The critics brought backup.' },
      { at: 450, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'A third. This is a rehearsal for something.' },
    ],
  }),

  defineLevel({
    id: 'c5-l5',
    campaignId: 'analog-deep',
    index: 5,
    name: 'Sunrise Set',
    wing: 'electronic',
    poster: {
      headline: 'STILL GOING AT SIX IN THE MORNING',
      lines: [
        'The room has not stopped in eleven hours and neither has the thing trying to switch it off.',
        'Everything you have is fast, loud, and one dropped patch away from silence.',
      ],
    },
    seed: 3030005,
    startRoyalties: 1600,
    startBuzz: 120,
    capacity: 42,
    width: 46,
    height: 34,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'synth-elemental', count: 3 },
      { creature: 'glowstick-wisp', count: 6 },
    ],
    rooms: ELECTRONIC_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    traps: [...CORE_TRAPS, 'strobe-pit'],
    objectives: [
      { kind: 'survive', seconds: 720, label: 'Keep the set going for 12 minutes' },
      { kind: 'buzz', amount: 900, label: 'Hold 900 Buzz' },
      { kind: 'defeat', enemy: 'server-farm', count: 4, label: 'Smash four Server Farms' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Buzz decays faster here than anywhere. Holding 900 is a rate problem, not a total.' },
      { when: { kind: 'start' }, text: 'A Strobe Pit stops a whole corridor without hurting anything. Use it on the escorts.' },
      { when: { kind: 'elapsed', seconds: 540 }, text: 'Synths drop out on a timer. Keep more of them than you think you need.' },
    ],
    raids: [
      { at: 110, enemies: [{ enemy: 'server-farm', count: 1 }], announce: 'It has plugged something in.' },
      { at: 250, enemies: [{ enemy: 'algorithm-wraith', count: 3 }], announce: 'Drains, in the wing that can least afford them.' },
      { at: 390, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'comment-sniper', count: 3 }], announce: 'Hardware, with covering fire.' },
      { at: 530, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'playlist-paladin', count: 2 }], announce: 'A third, well guarded.' },
      { at: 680, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'algorithm-wraith', count: 3 }], announce: 'The fourth. It is trying to pull the power before the sun comes up.' },
    ],
  }),
]
