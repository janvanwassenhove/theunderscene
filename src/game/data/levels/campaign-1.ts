import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, defineLevel } from './defineLevel'

const PUNK_ROOMS = [...CORE_ROOMS, 'basement-venue', 'screen-print-shack', 'horn-alcove']

/** Campaign 1 — Basement DIY. Punk & Ska. Word gets out; brass arrives. */
export const CAMPAIGN_1_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c1-l1',
    campaignId: 'basement-diy',
    index: 1,
    name: 'Two Bands, One Van',
    wing: 'punk',
    poster: {
      headline: 'SPLIT BILL / SPLIT PETROL',
      lines: [
        'Two bands, one van, one basement, and an argument about the running order.',
        'You need a room loud enough to be a venue and a shirt press to pay for it.',
      ],
    },
    seed: 5150011,
    startRoyalties: 700,
    capacity: 20,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'punk-imp', count: 1 },
    ],
    rooms: PUNK_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'basement-venue', tiles: 6, label: 'Open a Basement Venue (6 tiles)' },
      { kind: 'room', room: 'screen-print-shack', tiles: 4, label: 'Get a Screen-Print Shack running' },
      { kind: 'buzz', amount: 200, label: 'Reach 200 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Screen-Print Shacks pay the rent. Venues make the noise.' },
      { when: { kind: 'elapsed', seconds: 180 }, text: 'Scouts sign whoever is on their own. Keep the crew together.' },
    ],
    raids: [
      { at: 140, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts. They read the flyer.' },
      {
        at: 320,
        enemies: [{ enemy: 'critique-cleric', count: 1 }, { enemy: 'ar-scout', count: 1 }],
        announce: 'A critic is here, and has already decided.',
      },
    ],
  }),

  defineLevel({
    id: 'c1-l2',
    campaignId: 'basement-diy',
    index: 2,
    name: 'Pick It Up',
    wing: 'punk',
    poster: {
      headline: 'THERE ARE NINE OF THEM',
      lines: [
        'A ska band has moved in. There are nine of them and they all brought a horn.',
        'Give the brass somewhere to stand and they will buff the entire basement.',
      ],
    },
    seed: 2001199,
    startRoyalties: 800,
    capacity: 24,
    veinDensity: 0.08,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'punk-imp', count: 2 },
    ],
    rooms: PUNK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    objectives: [
      { kind: 'room', room: 'horn-alcove', tiles: 3, label: 'Build a Horn Section Alcove' },
      { kind: 'creatures', amount: 14, label: 'Get 14 creatures on the roster' },
      { kind: 'royalties', amount: 2200, label: 'Bank 2200 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Horn Section Alcoves draw Hoorndemons. Hoorndemons buff whoever is near.' },
      { when: { kind: 'room', room: 'horn-alcove' }, text: 'Applause is not optional. They will sulk.' },
    ],
    raids: [
      { at: 130, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts, again, in better coats.' },
      {
        at: 300,
        enemies: [{ enemy: 'noise-inspector', count: 1 }, { enemy: 'ar-scout', count: 2 }],
        announce: 'Somebody complained about the horns. Somebody always complains about the horns.',
      },
      {
        at: 470,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }],
        announce: 'Corporate radio wants to know if you have anything "playlist-ready".',
      },
    ],
  }),

  defineLevel({
    id: 'c1-l3',
    campaignId: 'basement-diy',
    index: 3,
    name: 'All Ages',
    wing: 'punk',
    poster: {
      headline: 'ALL AGES / NO BAR / NO EXCUSES',
      lines: [
        'Word has gone past the neighbourhood. That is good and it is also the problem.',
        'The more people know, the more of them arrive with clipboards.',
      ],
    },
    seed: 771177,
    startRoyalties: 900,
    capacity: 28,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'punk-imp', count: 2 },
      { creature: 'merch-imp', count: 1 },
    ],
    rooms: PUNK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    objectives: [
      { kind: 'buzz', amount: 320, label: 'Reach 320 Buzz' },
      { kind: 'creatures', amount: 18, label: 'Get 18 creatures on the roster' },
      { kind: 'survive', seconds: 600, label: 'Keep the doors open for 10 minutes' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Reputation speeds recruitment — and brings bigger raids. That is the trade.' },
      { when: { kind: 'elapsed', seconds: 400 }, text: 'A Contract Office plus a Signing Room turns raiders into staff.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Three scouts. It is a scene now, apparently.' },
      {
        at: 280,
        enemies: [{ enemy: 'critique-cleric', count: 1 }, { enemy: 'noise-inspector', count: 1 }],
        announce: 'A critic and an inspector, arriving together, which cannot be a coincidence.',
      },
      {
        at: 440,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'ar-scout', count: 2 }],
        announce: 'Radio brought friends.',
      },
    ],
  }),

  defineLevel({
    id: 'c1-l4',
    campaignId: 'basement-diy',
    index: 4,
    name: 'The Landlord Returns',
    wing: 'punk',
    poster: {
      headline: 'RE: RE: RE: THE HOLE',
      lines: [
        'He has been to a seminar. He has a folder now, and a lanyard.',
        'Same man, more paperwork, considerably more health.',
      ],
    },
    seed: 4041986,
    startRoyalties: 1000,
    capacity: 30,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'punk-imp', count: 2 },
      { creature: 'ska-hoorndemon', count: 1 },
    ],
    rooms: PUNK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    objectives: [
      { kind: 'defeat', enemy: 'eviction-warlord', count: 1, label: 'See off the Eviction Warlord again' },
      { kind: 'royalties', amount: 3000, label: 'Bank 3000 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Viral Moment is expensive and briefly makes everything go extremely well.' },
      { when: { kind: 'elapsed', seconds: 380 }, text: 'He is on his way. Callback the whole crew to one corridor.' },
    ],
    raids: [
      { at: 110, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Advance party.' },
      {
        at: 260,
        enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 1 }],
        announce: 'Radio and press, together, like a threat.',
      },
      {
        at: 430,
        enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'ar-scout', count: 2 }],
        announce: 'THE LANDLORD IS BACK. He has a folder. He has a LANYARD.',
      },
    ],
  }),

  defineLevel({
    id: 'c1-l5',
    campaignId: 'basement-diy',
    index: 5,
    name: 'The Second Van',
    wing: 'punk',
    poster: {
      headline: 'ONE VAN DIED SO THIS ONE COULD LIVE',
      lines: [
        'The scene is big enough to tour now, which mostly means it is big enough to be noticed.',
        'Everyone who has ever wanted a piece of it turns up at once, and none of them knock.',
      ],
    },
    seed: 5150015,
    startRoyalties: 1200,
    capacity: 34,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'punk-imp', count: 3 },
      { creature: 'ska-hoorndemon', count: 2 },
    ],
    rooms: PUNK_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    objectives: [
      { kind: 'survive', seconds: 720, label: 'Keep the doors open for 12 minutes' },
      { kind: 'creatures', amount: 22, label: 'Get 22 creatures on the roster' },
      { kind: 'royalties', amount: 3200, label: 'Bank 3200 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Traps pay for themselves in a corridor everything has to walk down.' },
      { when: { kind: 'creatures', atLeast: 16 }, text: 'Beds cap the roster before the lease does. Dig the Green Room out wider.' },
      { when: { kind: 'elapsed', seconds: 500 }, text: 'Nothing here is a boss. It is just relentless, which is worse.' },
    ],
    raids: [
      { at: 100, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts, before the van has even unloaded.' },
      { at: 230, enemies: [{ enemy: 'critique-cleric', count: 2 }, { enemy: 'ar-scout', count: 2 }], announce: 'Press, with opinions already written.' },
      { at: 360, enemies: [{ enemy: 'comment-sniper', count: 3 }], announce: 'The comments came in person again.' },
      { at: 480, enemies: [{ enemy: 'playlist-paladin', count: 2 }], announce: 'Two Paladins. Radio has decided you are a format.' },
      { at: 620, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'noise-inspector', count: 1 }], announce: 'The landlord, and someone with a decibel meter.' },
    ],
  }),
]
