import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, defineLevel } from './defineLevel'

const SHOEGAZE_ROOMS = [...CORE_ROOMS, 'reverb-chamber', 'cardigan-closet', 'tote-bag-boutique']

/**
 * Campaign 3 — Reverb Hollow. Shoegaze: quiet, passive, slow, on purpose. The
 * pacing change is the content. Buzz here comes from a room that never decays
 * rather than from shows, and the wing's creature simply is not noticed.
 */
export const CAMPAIGN_3_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c3-l1',
    campaignId: 'reverb-hollow',
    index: 1,
    name: 'Wash',
    wing: 'shoegaze',
    poster: {
      headline: 'PLEASE DO NOT LOOK DIRECTLY AT THE BAND',
      lines: [
        'Everything down here is slower, softer and slightly out of focus.',
        'Nobody will fight for you. They will, however, quietly never be seen.',
      ],
    },
    seed: 199101,
    startRoyalties: 850,
    capacity: 22,
    veinDensity: 0.07,
    waterDensity: 0.05,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'shoegaze-wraith', count: 2 },
    ],
    rooms: SHOEGAZE_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'reverb-chamber', tiles: 4, label: 'Open a Reverb Chamber' },
      { kind: 'buzz', amount: 180, label: 'Reach 180 Buzz' },
      { kind: 'royalties', amount: 1600, label: 'Bank 1600 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Shoegaze Wraiths are invisible to intruders — and refuse to fight. Plan around it.' },
      { when: { kind: 'room', room: 'reverb-chamber' }, text: 'Reverb Buzz is slow and never decays. It is the floor you build on.' },
    ],
    raids: [
      { at: 200, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts, squinting.' },
      { at: 400, enemies: [{ enemy: 'algorithm-wraith', count: 1 }], announce: 'Something is drinking the Buzz.' },
    ],
  }),

  defineLevel({
    id: 'c3-l2',
    campaignId: 'reverb-hollow',
    index: 2,
    name: 'Comfort',
    wing: 'shoegaze',
    poster: {
      headline: 'THERE IS A CARDIGAN FOR EVERY OCCASION',
      lines: [
        'They will not go anywhere near a raid without visiting the closet first.',
        'Build it. It is cheaper than the argument.',
      ],
    },
    seed: 199102,
    startRoyalties: 950,
    capacity: 26,
    waterDensity: 0.06,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'shoegaze-wraith', count: 3 },
    ],
    rooms: SHOEGAZE_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'cardigan-closet', tiles: 2, label: 'Build a Cardigan Closet' },
      { kind: 'room', room: 'tote-bag-boutique', tiles: 3, label: 'Open a Tote Bag Boutique' },
      { kind: 'creatures', amount: 16, label: 'Get 16 creatures on the roster' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Flooded sections are everywhere here. Merch Stands plank straight over them.' },
      { when: { kind: 'elapsed', seconds: 300 }, text: 'Keep some non-shoegaze muscle on the roster. Somebody has to swing.' },
    ],
    raids: [
      { at: 170, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts. They cannot find anybody.' },
      {
        at: 340,
        enemies: [{ enemy: 'critique-cleric', count: 2 }],
        announce: 'Critics. They have used the word "gauzy" twice already.',
      },
      { at: 520, enemies: [{ enemy: 'algorithm-wraith', count: 2 }], announce: 'Two drains. The Buzz is going somewhere.' },
    ],
  }),

  defineLevel({
    id: 'c3-l3',
    campaignId: 'reverb-hollow',
    index: 3,
    name: 'Nobody Saw Anything',
    wing: 'shoegaze',
    poster: {
      headline: 'THE QUIETEST POSSIBLE HEIST',
      lines: [
        'A whole wing that intruders cannot target is a strategy, not a weakness.',
        'Let them wander. Let them find nothing. Keep the vault behind the water.',
      ],
    },
    seed: 199103,
    startRoyalties: 1000,
    capacity: 28,
    width: 42,
    height: 32,
    waterDensity: 0.07,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'shoegaze-wraith', count: 4 },
    ],
    rooms: SHOEGAZE_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'buzz', amount: 340, label: 'Reach 340 Buzz' },
      { kind: 'royalties', amount: 3000, label: 'Bank 3000 Royalties' },
      { kind: 'survive', seconds: 600, label: 'Stay unnoticed for 10 minutes' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Thieves head for the vault. A vault behind unbridged water is a long walk.' },
      { when: { kind: 'elapsed', seconds: 420 }, text: 'Reverb never decays. Turtling actually works in this one wing.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts. Plural. Still squinting.' },
      { at: 330, enemies: [{ enemy: 'algorithm-wraith', count: 2 }, { enemy: 'critique-cleric', count: 1 }], announce: 'Drains and a critic.' },
      { at: 400, enemies: [{ enemy: 'comment-sniper', count: 2 }], announce: 'Somebody is reviewing you from the back of the room.' },
      { at: 500, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'algorithm-wraith', count: 2 }], announce: 'Radio, escorting the drains.' },
    ],
  }),

  defineLevel({
    id: 'c3-l4',
    campaignId: 'reverb-hollow',
    index: 4,
    name: 'Feedback',
    wing: 'shoegaze',
    poster: {
      headline: 'ONE CHORD, ELEVEN MINUTES',
      lines: [
        'The Algorithm has noticed the quiet wing and does not like that it cannot categorise it.',
        'It sends something that drains rather than fights, which is very nearly a compliment.',
      ],
    },
    seed: 199104,
    startRoyalties: 1200,
    capacity: 30,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'shoegaze-wraith', count: 4 },
      { creature: 'session-player', count: 1 },
    ],
    rooms: SHOEGAZE_ROOMS,
    spells: [...CORE_SPELLS, 'viral-moment'],
    objectives: [
      { kind: 'defeat', enemy: 'algorithm-wraith', count: 4, label: 'Break four Algorithm Wraiths' },
      { kind: 'buzz', amount: 400, label: 'Hold 400 Buzz' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Wraiths do no damage. They just make the Buzz go away. Chase them down.' },
      { when: { kind: 'elapsed', seconds: 360 }, text: 'Session Players have no genre loyalty and will fight for anyone.' },
    ],
    raids: [
      { at: 130, enemies: [{ enemy: 'algorithm-wraith', count: 2 }], announce: 'It has sent two.' },
      { at: 300, enemies: [{ enemy: 'algorithm-wraith', count: 2 }, { enemy: 'ar-scout', count: 2 }], announce: 'Two more, with an escort.' },
      { at: 380, enemies: [{ enemy: 'comment-sniper', count: 3 }], announce: 'Three of them, all anonymous, all at the back.' },
      { at: 470, enemies: [{ enemy: 'algorithm-wraith', count: 3 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'It is not going to stop sending them.' },
    ],
  }),
]
