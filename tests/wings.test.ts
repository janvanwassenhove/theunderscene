import { describe, expect, it } from 'vitest'
import { Simulation } from '../src/game/core/simulation'
import { level } from '../src/game/data/campaigns'
import type { LevelDef } from '../src/game/data/types'

const METAL: LevelDef = level('c2-l1')
const HIPHOP: LevelDef = level('c4-l1')
const ELECTRONIC: LevelDef = level('c5-l3')
const FOLK: LevelDef = level('c6-l1')
const SHOEGAZE: LevelDef = level('c3-l1')
const FINALE: LevelDef = level('c7-l3')

function run(sim: Simulation, seconds: number, step = 1 / 15) {
  for (let t = 0; t < seconds; t += step) sim.tick(step)
}

function tilesFor(sim: Simulation, defId: string, count: number) {
  const tiles: { x: number; y: number }[] = []
  for (let y = 0; y < sim.grid.height && tiles.length < count; y++) {
    for (let x = 0; x < sim.grid.width && tiles.length < count; x++) {
      if (sim.canBuildAt(defId, x, y)) tiles.push({ x, y })
    }
  }
  return tiles
}

/** Builds a room and puts the whole crew inside it. */
function buildAndOccupy(sim: Simulation, defId: string, count: number) {
  const tiles = tilesFor(sim, defId, count)
  sim.royalties = 9000
  sim.build(defId, tiles)
  for (const c of sim.creatures) {
    c.x = tiles[0]!.x
    c.y = tiles[0]!.y
  }
  return tiles
}

describe('Folk — communal buffs', () => {
  it('lifts work rate the more creatures gather at a Campfire Ring', () => {
    const sim = new Simulation(FOLK)
    buildAndOccupy(sim, 'campfire-ring', 4)
    run(sim, 2)

    const buffed = sim.creatures[0]!.communalMul
    expect(buffed).toBeGreaterThan(1)

    // Scatter them and the bonus goes with the crowd.
    sim.creatures.forEach((c, i) => {
      c.x = 2 + i * 3
      c.y = 2
    })
    run(sim, 2)
    expect(sim.creatures[0]!.communalMul).toBeLessThan(buffed)
  })

  it('never charges a Banjo Sprite at payday', () => {
    const sim = new Simulation(FOLK)
    sim.creatures = []
    sim.spawnCreature('banjo-sprite', { x: FOLK.heart.x, y: FOLK.heart.y })
    sim.royalties = 500
    run(sim, 95)
    expect(sim.royalties).toBeGreaterThanOrEqual(500)
  })
})

describe('Metal — rooms the wing cannot do without', () => {
  it('drains a Doom Ogre faster while there is no Corpsepaint Vanity', () => {
    const withoutVanity = new Simulation(METAL)
    withoutVanity.creatures = []
    const a = withoutVanity.spawnCreature('doom-ogre', METAL.heart)
    run(withoutVanity, 90)

    const withVanity = new Simulation(METAL)
    withVanity.creatures = []
    const b = withVanity.spawnCreature('doom-ogre', METAL.heart)
    withVanity.royalties = 9000
    withVanity.build('corpsepaint-vanity', tilesFor(withVanity, 'corpsepaint-vanity', 2))
    run(withVanity, 90)

    expect(a.loyalty).toBeLessThan(b.loyalty)
  })
})

describe('Hip-Hop — the Sample Vault needs a float', () => {
  it('pays out while you hold stock and stops when you do not', () => {
    // A vault first: without one you cannot hold more than you started with,
    // so there would be nowhere for the Vault's yield to go.
    const rich = new Simulation(HIPHOP)
    rich.creatures = []
    rich.royalties = 9000
    rich.build('royalties-vault', tilesFor(rich, 'royalties-vault', 8))
    rich.build('sample-vault', tilesFor(rich, 'sample-vault', 4))
    rich.royalties = 2000
    const richBefore = rich.royalties
    run(rich, 60)
    expect(rich.royalties).toBeGreaterThan(richBefore)

    const broke = new Simulation(HIPHOP)
    broke.creatures = []
    broke.royalties = 9000
    broke.build('royalties-vault', tilesFor(broke, 'royalties-vault', 8))
    broke.build('sample-vault', tilesFor(broke, 'sample-vault', 4))
    broke.royalties = 10
    run(broke, 60)
    expect(broke.royalties).toBeLessThan(60)
  })
})

describe('Electronic', () => {
  it('lifts Buzz only while somebody is on the DJ Throne', () => {
    const manned = new Simulation(ELECTRONIC)
    manned.royalties = 9000
    const seat = tilesFor(manned, 'dj-throne', 1)
    manned.build('dj-throne', seat)
    manned.build('synth-greenhouse', tilesFor(manned, 'synth-greenhouse', 5))
    for (const c of manned.creatures) {
      c.x = seat[0]!.x
      c.y = seat[0]!.y
    }
    manned.buzz = 0
    run(manned, 30)

    const empty = new Simulation(ELECTRONIC)
    empty.royalties = 9000
    empty.build('dj-throne', tilesFor(empty, 'dj-throne', 1))
    empty.build('synth-greenhouse', tilesFor(empty, 'synth-greenhouse', 5))
    empty.creatures = []
    empty.buzz = 0
    run(empty, 30)

    expect(manned.buzz).toBeGreaterThan(empty.buzz)
  })

  it('stops a Synth Elemental dead while it is glitched', () => {
    const sim = new Simulation(ELECTRONIC)
    sim.creatures = []
    const synth = sim.spawnCreature('synth-elemental', ELECTRONIC.heart)
    let sawGlitch = false
    for (let t = 0; t < 120; t += 1) {
      run(sim, 1)
      if (synth.glitchedFor > 0) sawGlitch = true
    }
    expect(sawGlitch).toBe(true)
  })
})

describe('Shoegaze — not being noticed', () => {
  it('is skipped by intruders looking for someone to sign', () => {
    const sim = new Simulation(SHOEGAZE)
    sim.creatures = []
    sim.spawnCreature('shoegaze-wraith', SHOEGAZE.heart)
    expect(sim.nearestCreature(SHOEGAZE.heart.x, SHOEGAZE.heart.y, 6)).toBeNull()

    sim.spawnCreature('roadie-ogre', SHOEGAZE.heart)
    expect(sim.nearestCreature(SHOEGAZE.heart.x, SHOEGAZE.heart.y, 6)?.def).toBe('roadie-ogre')
  })
})

describe('The finale — flattening and the Mixing Board', () => {
  it('halves output on a timer, and a big enough Board clears it', () => {
    const sim = new Simulation(FINALE)
    expect(FINALE.flatten).toBeDefined()

    let flattened = false
    for (let t = 0; t < FINALE.flatten!.everySeconds + 10; t += 1) {
      run(sim, 1)
      if (sim.events.some((e) => e.text.includes('flattened your wings'))) flattened = true
      if (flattened) break
    }
    expect(flattened).toBe(true)

    sim.royalties = 20000
    sim.build('mixing-board', tilesFor(sim, 'mixing-board', FINALE.flatten!.counterTiles))
    run(sim, 2)
    expect(sim.events.some((e) => e.text.includes('re-cut the wings apart'))).toBe(true)
  })

  it('sends Server Farms that sit still and drain', () => {
    const sim = new Simulation(FINALE)
    sim.creatures = []
    const farm = sim.spawnEnemy('server-farm', { x: FINALE.heart.x + 2, y: FINALE.heart.y })
    sim.buzz = 200
    const startX = farm.x
    run(sim, 20)

    expect(farm.x).toBe(startX)
    expect(sim.buzz).toBeLessThan(200)
  })
})
