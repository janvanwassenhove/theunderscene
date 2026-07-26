import { beforeEach, describe, expect, it } from 'vitest'
import { Simulation } from '../src/game/core/simulation'
import { CAMPAIGN_0_LEVELS } from '../src/game/data/levels/campaign-0'
import { TileKind } from '../src/game/data/types'
import type { LevelDef } from '../src/game/data/types'

const LEVEL: LevelDef = CAMPAIGN_0_LEVELS[0]!

function run(sim: Simulation, seconds: number, step = 1 / 15) {
  for (let t = 0; t < seconds; t += step) sim.tick(step)
}

/** First diggable rock touching the starting chamber. */
function findFrontierRock(sim: Simulation): { x: number; y: number } {
  for (let y = 0; y < sim.grid.height; y++) {
    for (let x = 0; x < sim.grid.width; x++) {
      if (!sim.grid.diggable(x, y)) continue
      if (!sim.grid.seen[sim.grid.idx(x, y)]) continue
      for (const n of sim.grid.neighbours(x, y)) {
        if (sim.grid.walkable(n.x, n.y) && sim.grid.claimed[sim.grid.idx(n.x, n.y)]) return { x, y }
      }
    }
  }
  throw new Error('no frontier rock — the starting chamber is not carved')
}

/** A claimed, empty floor tile that a room can go on. */
function findBuildableTiles(sim: Simulation, count: number): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = []
  for (let y = 0; y < sim.grid.height && tiles.length < count; y++) {
    for (let x = 0; x < sim.grid.width && tiles.length < count; x++) {
      if (sim.canBuildAt('green-room', x, y)) tiles.push({ x, y })
    }
  }
  return tiles
}

describe('Simulation setup', () => {
  let sim: Simulation

  beforeEach(() => {
    sim = new Simulation(LEVEL)
  })

  it('carves a starting chamber, a door and the starting crew', () => {
    expect(sim.grid.walkable(LEVEL.heart.x, LEVEL.heart.y)).toBe(true)
    expect(sim.grid.claimed[sim.grid.idx(LEVEL.heart.x, LEVEL.heart.y)]).toBe(1)
    expect(sim.roomTileCount('booking-door')).toBe(1)
    expect(sim.population).toBe(3)
    expect(sim.royalties).toBe(LEVEL.startRoyalties)
  })

  it('is deterministic for a given seed', () => {
    const other = new Simulation(LEVEL)
    expect([...other.grid.kind]).toEqual([...sim.grid.kind])
    expect([...other.grid.vein]).toEqual([...sim.grid.vein])
  })
})

describe('Digging', () => {
  it('only accepts designations on reachable, seen rock', () => {
    const sim = new Simulation(LEVEL)
    const rock = findFrontierRock(sim)
    expect(sim.designate(rock.x, rock.y, true)).toBe(true)
    expect(sim.grid.designated[sim.grid.idx(rock.x, rock.y)]).toBe(1)

    // Floor is not diggable, and neither is the level border.
    expect(sim.designate(LEVEL.heart.x, LEVEL.heart.y, true)).toBe(false)
    expect(sim.designate(0, 0, true)).toBe(false)
  })

  it('clears a designated tile and claims the ground behind it', () => {
    const sim = new Simulation(LEVEL)
    const rock = findFrontierRock(sim)
    const wasVein = sim.grid.kindAt(rock.x, rock.y) === TileKind.Vein
    sim.designate(rock.x, rock.y, true)

    run(sim, 60)

    const i = sim.grid.idx(rock.x, rock.y)
    expect(sim.grid.kindAt(rock.x, rock.y)).toBe(TileKind.Floor)
    expect(sim.grid.claimed[i]).toBe(1)
    expect(sim.grid.designated[i]).toBe(0)
    if (wasVein) expect(sim.grid.pile[i]).toBeGreaterThan(0)
  })
})

describe('Building', () => {
  it('charges per tile and refuses tiles it cannot use', () => {
    const sim = new Simulation(LEVEL)
    const tiles = findBuildableTiles(sim, 4)
    expect(tiles.length).toBe(4)

    const before = sim.royalties
    const result = sim.build('green-room', tiles)
    expect(result.placed).toBe(4)
    expect(sim.royalties).toBe(before - result.spent)
    expect(sim.roomTileCount('green-room')).toBe(4)
    expect(sim.grid.kindAt(tiles[0]!.x, tiles[0]!.y)).toBe(TileKind.Room)

    // Rock is not buildable, so nothing is charged for it.
    const rock = findFrontierRock(sim)
    const spentBefore = sim.royalties
    expect(sim.build('green-room', [rock]).placed).toBe(0)
    expect(sim.royalties).toBe(spentBefore)
  })

  it('will not spend Royalties it does not have', () => {
    const sim = new Simulation(LEVEL)
    sim.royalties = 40
    const tiles = findBuildableTiles(sim, 4)
    const result = sim.build('green-room', tiles)
    expect(result.placed).toBe(1)
    expect(sim.royalties).toBe(0)
  })

  it('raises the population ceiling once beds exist', () => {
    const sim = new Simulation(LEVEL)
    const before = sim.capacity
    sim.build('green-room', findBuildableTiles(sim, 6))
    expect(sim.capacity).toBeGreaterThan(before)
  })

  it('refunds half when a room tile is torn down', () => {
    const sim = new Simulation(LEVEL)
    const tiles = findBuildableTiles(sim, 2)
    sim.build('green-room', tiles)
    const before = sim.royalties
    expect(sim.demolish(tiles[0]!.x, tiles[0]!.y)).toBe(true)
    expect(sim.royalties).toBeGreaterThan(before)
    expect(sim.roomTileCount('green-room')).toBe(1)
  })
})

describe('Objectives and economy', () => {
  it('marks an objective done once its target is met', () => {
    const sim = new Simulation(LEVEL)
    sim.build('royalties-vault', findBuildableTiles(sim, 4))
    run(sim, 1)
    const vaultObjective = sim.objectiveStates.find(
      (s) => s.objective.kind === 'room' && s.objective.room === 'royalties-vault',
    )
    expect(vaultObjective?.done).toBe(true)
  })

  it('caps stored Royalties at the vault capacity', () => {
    const sim = new Simulation(LEVEL)
    sim.royalties = 0
    sim.build('royalties-vault', findBuildableTiles(sim, 1))
    const cap = sim.vaultCapacity
    expect(cap).toBeGreaterThan(0)
    sim.royalties = cap
    run(sim, 5)
    expect(sim.royalties).toBeLessThanOrEqual(Math.max(cap, LEVEL.startRoyalties))
  })

  it('fires a start hint on the first tick', () => {
    const sim = new Simulation(LEVEL)
    run(sim, 1)
    expect(sim.pendingHints.length).toBeGreaterThan(0)
  })
})

describe('Persistence', () => {
  it('round-trips the whole basement through a snapshot', () => {
    const sim = new Simulation(LEVEL)
    const rock = findFrontierRock(sim)
    sim.designate(rock.x, rock.y, true)
    sim.build('green-room', findBuildableTiles(sim, 3))
    run(sim, 25)

    const restored = Simulation.deserialize(LEVEL, sim.serialize())

    expect(restored.royalties).toBeCloseTo(sim.royalties, 5)
    expect(restored.buzz).toBeCloseTo(sim.buzz, 5)
    expect(restored.elapsed).toBeCloseTo(sim.elapsed, 5)
    expect(restored.population).toBe(sim.population)
    expect(restored.roomTileCount('green-room')).toBe(sim.roomTileCount('green-room'))
    expect([...restored.grid.kind]).toEqual([...sim.grid.kind])
    expect([...restored.grid.pile]).toEqual([...sim.grid.pile])
    expect(restored.creatures.map((c) => c.id)).toEqual(sim.creatures.map((c) => c.id))
  })

  it('keeps ticking after a restore', () => {
    const sim = new Simulation(LEVEL)
    const restored = Simulation.deserialize(LEVEL, sim.serialize())
    run(restored, 10)
    expect(restored.elapsed).toBeGreaterThan(9)
  })
})

describe('Spells', () => {
  it('spends Buzz, sets a cooldown, and reveals map with Backstage Pass', () => {
    const sim = new Simulation(LEVEL)
    sim.buzz = 100
    const target = { x: LEVEL.heart.x + 9, y: LEVEL.heart.y + 6 }
    expect(sim.grid.seen[sim.grid.idx(target.x, target.y)]).toBe(0)

    expect(sim.castSpell('backstage-pass', target)).toBe(true)
    expect(sim.grid.seen[sim.grid.idx(target.x, target.y)]).toBe(1)
    expect(sim.buzz).toBeLessThan(100)
    expect(sim.spellReady('backstage-pass')).toBe(false)
  })

  it('refuses spells that are not in this level list', () => {
    const sim = new Simulation(LEVEL)
    sim.buzz = 500
    expect(sim.castSpell('viral-moment')).toBe(false)
  })
})
