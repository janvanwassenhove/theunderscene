import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, defineLevel } from './defineLevel'

const FOLK_ROOMS = [...CORE_ROOMS, 'campfire-ring', 'banjo-repair-shed', 'craft-beer-cellar']

/**
 * Campaign 6 — The Kindling Hall. Folk: slow-burn and communal. Everything here
 * scales with how many creatures are stood together, which is the synergy lesson
 * the finale then demands you apply across six wings at once.
 */
export const CAMPAIGN_6_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c6-l1',
    campaignId: 'kindling-hall',
    index: 1,
    name: 'Budge Up',
    wing: 'folk',
    poster: {
      headline: 'EVERYONE ROUND THE FIRE',
      lines: [
        'A Campfire Ring pays out per creature stood in it. One creature is nothing.',
        'Eleven creatures is the best room in the game.',
      ],
    },
    seed: 6060001,
    startRoyalties: 900,
    capacity: 26,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'campfire-elder', count: 1 },
    ],
    rooms: FOLK_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'campfire-ring', tiles: 3, label: 'Build a Campfire Ring' },
      { kind: 'creatures', amount: 16, label: 'Get 16 creatures on the roster' },
      { kind: 'royalties', amount: 2000, label: 'Bank 2000 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Campfire Rings buff by headcount. Callback everyone into one and watch the work rate.' },
      { when: { kind: 'room', room: 'campfire-ring' }, text: 'Campfire Elders stack with the Ring. Crowds are the whole wing.' },
    ],
    raids: [
      { at: 170, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts. Somebody offered them a drink.' },
      { at: 350, enemies: [{ enemy: 'critique-cleric', count: 1 }, { enemy: 'ar-scout', count: 1 }], announce: 'A critic who uses the word "earnest" as an insult.' },
    ],
  }),

  defineLevel({
    id: 'c6-l2',
    campaignId: 'kindling-hall',
    index: 2,
    name: 'For The Love Of It',
    wing: 'folk',
    poster: {
      headline: 'NOBODY HERE WANTS PAYING',
      lines: [
        'Banjo Sprites never invoice. They also never hurry.',
        'A roster that costs nothing at payday changes what you can afford to build.',
      ],
    },
    seed: 6060002,
    startRoyalties: 1000,
    capacity: 30,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'campfire-elder', count: 1 },
      { creature: 'banjo-sprite', count: 2 },
    ],
    rooms: FOLK_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'banjo-repair-shed', tiles: 3, label: 'Open a Banjo Repair Shed' },
      { kind: 'room', room: 'craft-beer-cellar', tiles: 4, label: 'Stock a Craft Beer Cellar' },
      { kind: 'creatures', amount: 22, label: 'Get 22 creatures on the roster' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Banjo Sprites work for free. Wages are most of your outgoings.' },
      { when: { kind: 'elapsed', seconds: 300 }, text: 'The Cellar restores Loyalty slowly and permanently. It pays for itself.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts, in a folk wing, looking for "the next big earnest thing".' },
      { at: 320, enemies: [{ enemy: 'playlist-paladin', count: 1 }], announce: 'Radio wants one for an advert.' },
      { at: 500, enemies: [{ enemy: 'noise-inspector', count: 1 }, { enemy: 'critique-cleric', count: 1 }], announce: 'Somebody complained about a banjo. Fair, but still.' },
    ],
  }),

  defineLevel({
    id: 'c6-l3',
    campaignId: 'kindling-hall',
    index: 3,
    name: 'The Long Table',
    wing: 'folk',
    poster: {
      headline: 'SIT DOWN, IT IS ABOUT TO START',
      lines: [
        'Everything in this wing buffs everything else. That is the lesson.',
        'The finale is going to ask you to do it with six wings that hate each other.',
      ],
    },
    seed: 6060003,
    startRoyalties: 1200,
    capacity: 34,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'campfire-elder', count: 2 },
      { creature: 'banjo-sprite', count: 3 },
    ],
    rooms: FOLK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    objectives: [
      { kind: 'creatures', amount: 28, label: 'Get 28 creatures on the roster' },
      { kind: 'royalties', amount: 4000, label: 'Bank 4000 Royalties' },
      { kind: 'survive', seconds: 660, label: 'Keep the hall together for 11 minutes' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Two Elders and a full Ring is close to double work rate. Stack them.' },
      { when: { kind: 'elapsed', seconds: 420 }, text: 'A crowd buffs itself and also dies together. Watch the Paladin.' },
    ],
    raids: [
      { at: 140, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts.' },
      { at: 300, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 2 }], announce: 'Radio and two critics walk into a folk wing.' },
      { at: 380, enemies: [{ enemy: 'comment-sniper', count: 3 }], announce: 'Nobody here has ever been to a gig.' },
      { at: 460, enemies: [{ enemy: 'algorithm-wraith', count: 2 }, { enemy: 'ar-scout', count: 2 }], announce: 'Drains. It has been watching this wing especially closely.' },
      { at: 620, enemies: [{ enemy: 'playlist-paladin', count: 2 }], announce: 'Two Paladins, straight for the fire.' },
    ],
  }),

  defineLevel({
    id: 'c6-l4',
    campaignId: 'kindling-hall',
    index: 4,
    name: 'Kindling',
    wing: 'folk',
    poster: {
      headline: 'BEFORE THE LAST ONE',
      lines: [
        'The Algorithm sends everything it has learned so far, all at once, as a test.',
        'Whatever survives this is what you take down to the last basement.',
      ],
    },
    seed: 6060004,
    startRoyalties: 1500,
    capacity: 38,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'campfire-elder', count: 2 },
      { creature: 'banjo-sprite', count: 3 },
      { creature: 'session-player', count: 1 },
    ],
    rooms: FOLK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    objectives: [
      { kind: 'defeat', enemy: 'playlist-paladin', count: 3, label: 'Break three Playlist Paladins' },
      { kind: 'defeat', enemy: 'server-farm', count: 2, label: 'Smash two Server Farms' },
      { kind: 'royalties', amount: 3500, label: 'Bank 3500 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'This is a dress rehearsal. Everything it sends here, it sends again later.' },
      { when: { kind: 'elapsed', seconds: 450 }, text: 'Keep the crowd fed. A communal buff on a starving roster is worth nothing.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'ar-scout', count: 2 }], announce: 'It starts with radio, as it always does.' },
      { at: 280, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'Hardware.' },
      { at: 360, enemies: [{ enemy: 'comment-sniper', count: 4 }], announce: 'Four snipers. Send people, not patience.' },
      { at: 440, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 2 }], announce: 'And press.' },
      { at: 600, enemies: [{ enemy: 'server-farm', count: 1 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'All of it at once, now, to see what you do.' },
    ],
  }),

  defineLevel({
    id: 'c6-l5',
    campaignId: 'kindling-hall',
    index: 5,
    name: 'The Long Night',
    wing: 'folk',
    poster: {
      headline: 'NOBODY LEAVES BEFORE THE LAST SONG',
      lines: [
        'The hall has been full since teatime and the fire has not gone out once.',
        'Everything the Algorithm has left to try, it tries tonight, and it tries it all at once.',
      ],
    },
    seed: 6060005,
    startRoyalties: 1600,
    capacity: 42,
    width: 46,
    height: 34,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'campfire-elder', count: 3 },
      { creature: 'banjo-sprite', count: 4 },
      { creature: 'session-player', count: 2 },
    ],
    rooms: FOLK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    objectives: [
      { kind: 'survive', seconds: 780, label: 'Keep the fire lit for 13 minutes' },
      { kind: 'creatures', amount: 28, label: 'Have 28 creatures round the fire' },
      { kind: 'room', room: 'campfire-ring', tiles: 9, label: 'Build a 9-tile Campfire Ring' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'A Campfire Ring is worth more the more people stand in it. Build it big, keep them home.' },
      { when: { kind: 'creatures', atLeast: 20 }, text: 'A crowd this size eats. A Merch Table that cannot keep up costs you loyalty.' },
      { when: { kind: 'elapsed', seconds: 600 }, text: 'This is the last night before the last basement. Nothing you save carries over.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Somebody has been telling people about the fire.' },
      { at: 250, enemies: [{ enemy: 'playlist-paladin', count: 2 }], announce: 'Radio would like one for an advert. Again.' },
      { at: 390, enemies: [{ enemy: 'comment-sniper', count: 4 }, { enemy: 'critique-cleric', count: 1 }], announce: 'Four at the back, one with a byline.' },
      { at: 520, enemies: [{ enemy: 'server-farm', count: 2 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'It has started installing itself in the walls of a folk hall.' },
      { at: 660, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'playlist-paladin', count: 2 }], announce: 'And the landlord, who has heard there is a fire indoors.' },
    ],
  }),
]
