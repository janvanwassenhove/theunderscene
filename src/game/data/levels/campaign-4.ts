import type { LevelDef } from '../types'
import { CORE_ROOMS, CORE_SPELLS, defineLevel } from './defineLevel'

const HIPHOP_ROOMS = [...CORE_ROOMS, 'sample-vault', 'cypher-corner', 'sneaker-vault', 'basement-venue']

/**
 * Campaign 4 — The Sample Vault. Hip-Hop: the economy wing. The Sample Vault
 * turns banked Royalties into more of them, which inverts the usual pressure —
 * here, spending everything is the mistake.
 */
export const CAMPAIGN_4_LEVELS: LevelDef[] = [
  defineLevel({
    id: 'c4-l1',
    campaignId: 'sample-vault',
    index: 1,
    name: 'Crate Digging',
    wing: 'hiphop',
    poster: {
      headline: 'IT IS ALL IN THERE SOMEWHERE',
      lines: [
        'The Sample Vault does not mine anything. It flips what you already have.',
        'Which means: keep a float. A Vault with nothing to work on works on nothing.',
      ],
    },
    seed: 808001,
    startRoyalties: 900,
    capacity: 24,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'beatsmith-sprite', count: 1 },
    ],
    rooms: HIPHOP_ROOMS,
    spells: CORE_SPELLS,
    objectives: [
      { kind: 'room', room: 'sample-vault', tiles: 4, label: 'Build a Sample Vault' },
      { kind: 'royalties', amount: 2400, label: 'Bank 2400 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'The Sample Vault only pays out while you are holding at least 250 Royalties.' },
      { when: { kind: 'room', room: 'sample-vault' }, text: 'Do not spend down to nothing. The float is the engine.' },
    ],
    raids: [
      { at: 160, enemies: [{ enemy: 'ar-scout', count: 2 }], announce: 'Scouts, asking who produced it.' },
      { at: 340, enemies: [{ enemy: 'eviction-warlord', count: 1 }], announce: 'Somebody heard there was money down here.' },
    ],
  }),

  defineLevel({
    id: 'c4-l2',
    campaignId: 'sample-vault',
    index: 2,
    name: 'Cypher',
    wing: 'hiphop',
    poster: {
      headline: 'STEP UP OR STEP BACK',
      lines: [
        'A Cypher Corner levels people up and pays Buzz for everyone stood watching.',
        'It is the only room in the game that rewards a crowd doing nothing.',
      ],
    },
    seed: 808002,
    startRoyalties: 1000,
    capacity: 28,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'rapper-golem', count: 1 },
      { creature: 'beatsmith-sprite', count: 1 },
    ],
    rooms: HIPHOP_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    objectives: [
      { kind: 'room', room: 'cypher-corner', tiles: 4, label: 'Open a Cypher Corner' },
      { kind: 'buzz', amount: 280, label: 'Reach 280 Buzz' },
      { kind: 'creatures', amount: 18, label: 'Get 18 creatures on the roster' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Rapper Golems are the best passive earners on the roster. Get more of them.' },
      { when: { kind: 'elapsed', seconds: 300 }, text: 'Thieves target the vault. A big float is a big target.' },
    ],
    raids: [
      { at: 150, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts. They want the Beatsmith specifically.' },
      { at: 320, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'ar-scout', count: 1 }], announce: 'The landlord smells a float.' },
      { at: 500, enemies: [{ enemy: 'playlist-paladin', count: 1 }, { enemy: 'critique-cleric', count: 1 }], announce: 'Radio wants a clean version.' },
    ],
  }),

  defineLevel({
    id: 'c4-l3',
    campaignId: 'sample-vault',
    index: 3,
    name: 'Prestige',
    wing: 'hiphop',
    poster: {
      headline: 'THE SHOES ARE AN INVESTMENT',
      lines: [
        'A Sneaker Vault does nothing except make the basement look like somewhere worth being.',
        'That turns out to be worth a great deal.',
      ],
    },
    seed: 808003,
    startRoyalties: 1200,
    capacity: 32,
    width: 42,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 3 },
      { creature: 'rapper-golem', count: 2 },
      { creature: 'beatsmith-sprite', count: 1 },
    ],
    rooms: HIPHOP_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit'],
    objectives: [
      { kind: 'room', room: 'sneaker-vault', tiles: 3, label: 'Build a Sneaker Vault' },
      { kind: 'creatures', amount: 24, label: 'Get 24 creatures on the roster' },
      { kind: 'royalties', amount: 4000, label: 'Bank 4000 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'A Sneaker Vault makes the door swing faster and everyone stay happier.' },
      { when: { kind: 'elapsed', seconds: 400 }, text: 'High Reputation brings an extra intruder per wave. Earn it anyway.' },
    ],
    raids: [
      { at: 140, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Scouts. They have a budget this time.' },
      { at: 300, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'critique-cleric', count: 1 }], announce: 'The landlord brought a valuer.' },
      { at: 470, enemies: [{ enemy: 'playlist-paladin', count: 2 }], announce: 'Two Paladins. They want the whole catalogue.' },
    ],
  }),

  defineLevel({
    id: 'c4-l4',
    campaignId: 'sample-vault',
    index: 4,
    name: 'Clearance',
    wing: 'hiphop',
    poster: {
      headline: 'THEY WOULD LIKE TO DISCUSS THE SAMPLES',
      lines: [
        'Legal has found the Vault. Legal has brought muscle.',
        'They are not here to talk about the music, they are here to talk about the money.',
      ],
    },
    seed: 808004,
    startRoyalties: 1400,
    capacity: 34,
    width: 44,
    height: 32,
    startingCreatures: [
      { creature: 'roadie-ogre', count: 4 },
      { creature: 'rapper-golem', count: 2 },
      { creature: 'beatsmith-sprite', count: 2 },
    ],
    rooms: HIPHOP_ROOMS,
    spells: [...CORE_SPELLS, 'mosh-pit', 'viral-moment'],
    objectives: [
      { kind: 'defeat', enemy: 'eviction-warlord', count: 2, label: 'See off both enforcers' },
      { kind: 'royalties', amount: 5000, label: 'Bank 5000 Royalties' },
    ],
    hints: [
      { when: { kind: 'start' }, text: 'Two Warlords this time. Level people up in the Cypher before they arrive.' },
      { when: { kind: 'elapsed', seconds: 420 }, text: 'Anything that reaches the vault leaves with 80 Royalties a trip.' },
    ],
    raids: [
      { at: 120, enemies: [{ enemy: 'ar-scout', count: 3 }], announce: 'Process servers, technically.' },
      { at: 280, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'playlist-paladin', count: 1 }], announce: 'The first enforcer.' },
      { at: 460, enemies: [{ enemy: 'eviction-warlord', count: 1 }, { enemy: 'critique-cleric', count: 2 }], announce: 'And the second, with commentary.' },
    ],
  }),
]
