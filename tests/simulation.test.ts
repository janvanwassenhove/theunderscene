import { beforeEach, describe, expect, it } from 'vitest'
import { Simulation } from '../src/game/core/simulation'
import { findPath } from '../src/game/core/pathfinding'
import { CAMPAIGN_0_LEVELS } from '../src/game/data/levels/campaign-0'
import { CAMPAIGN_3_LEVELS } from '../src/game/data/levels/campaign-3'
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

/** As above, but for a named room on any level. */
function findBuildableTilesOn(sim: Simulation, defId: string, count: number) {
  const tiles: { x: number; y: number }[] = []
  for (let y = 0; y < sim.grid.height && tiles.length < count; y++) {
    for (let x = 0; x < sim.grid.width && tiles.length < count; x++) {
      if (sim.canBuildAt(defId, x, y)) tiles.push({ x, y })
    }
  }
  return tiles
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
  it('accepts a designation on any diggable rock', () => {
    const sim = new Simulation(LEVEL)
    const rock = findFrontierRock(sim)
    expect(sim.designate(rock.x, rock.y, true)).toBe(true)
    expect(sim.grid.designated[sim.grid.idx(rock.x, rock.y)]).toBe(1)

    // Floor is not diggable, and neither is the level border.
    expect(sim.designate(LEVEL.heart.x, LEVEL.heart.y, true)).toBe(false)
    expect(sim.designate(0, 0, true)).toBe(false)
  })

  it('lets you plan a tunnel out into the dark, revealing just that tile', () => {
    const sim = new Simulation(LEVEL)

    // Somewhere well beyond anything explored.
    let far: { x: number; y: number } | null = null
    for (let y = 1; y < sim.grid.height - 1 && !far; y++) {
      for (let x = 1; x < sim.grid.width - 1 && !far; x++) {
        if (sim.grid.diggable(x, y) && !sim.grid.seen[sim.grid.idx(x, y)]) far = { x, y }
      }
    }
    expect(far, 'level is fully explored at start').not.toBeNull()

    expect(sim.designate(far!.x, far!.y, true)).toBe(true)
    expect(sim.grid.designated[sim.grid.idx(far!.x, far!.y)]).toBe(1)
    // The marked tile becomes visible; the dark around it stays dark.
    expect(sim.grid.seen[sim.grid.idx(far!.x, far!.y)]).toBe(1)
    const neighbours = sim.grid.neighbours(far!.x, far!.y)
    expect(neighbours.every((n) => sim.grid.seen[sim.grid.idx(n.x, n.y)] === 1)).toBe(false)
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

  it('claims corridors the crew walks, not just the rock they break', () => {
    const sim = new Simulation(LEVEL)
    const crew = sim.creatures[0]!

    // Levels ship with corridors nobody dug, and pulling up a bridge leaves
    // floor behind that is nobody's. Stand in for both by disowning a tile the
    // crew can reach.
    let target: { x: number; y: number } | null = null
    let path: ReturnType<typeof findPath> = null
    for (let y = 0; y < sim.grid.height && !path; y++) {
      for (let x = 0; x < sim.grid.width && !path; x++) {
        if (sim.grid.kindAt(x, y) !== TileKind.Floor) continue
        if (Math.hypot(x - crew.x, y - crew.y) < 2) continue
        path = findPath(sim.grid, crew, { x, y })
        if (path) target = { x, y }
      }
    }
    expect(target, 'no reachable floor to disown').not.toBeNull()
    const i = sim.grid.idx(target!.x, target!.y)
    sim.grid.claimed[i] = 0

    crew.path = path!
    crew.job = { kind: 'goto', tx: target!.x, ty: target!.y }
    crew.state = 'moving'
    run(sim, 120)

    expect(sim.grid.claimed[i]).toBe(1)
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

describe('Level connectivity', () => {
  it("joins the Booking Agent's Door to the starting chamber", () => {
    // Everyone arrives through that door — recruits and intruders both — so a
    // door with no route into the basement strands them where they spawn.
    for (const def of CAMPAIGN_0_LEVELS) {
      const sim = new Simulation(def)
      let door: { x: number; y: number } | null = null
      for (let y = 0; y < sim.grid.height && !door; y++) {
        for (let x = 0; x < sim.grid.width && !door; x++) {
          const instance = sim.rooms.get(sim.grid.roomId[sim.grid.idx(x, y)]!)
          if (instance?.def === 'booking-door') door = { x, y }
        }
      }
      expect(door, `${def.id} has no door`).not.toBeNull()

      const route = findPath(sim.grid, door!, def.heart)
      expect(route, `${def.id}: no route from the door to the heart`).not.toBeNull()
    }
  })
})

describe('Bridging flooded sections', () => {
  it('lays a Merch Stand over water and takes it back up again', () => {
    const sim = new Simulation(LEVEL)
    // Flood a tile right next to the starting chamber.
    const wet = { x: LEVEL.heart.x + 4, y: LEVEL.heart.y }
    sim.grid.setKind(wet.x, wet.y, TileKind.Water)
    sim.grid.seen[sim.grid.idx(wet.x, wet.y)] = 1
    expect(sim.grid.walkable(wet.x, wet.y)).toBe(false)

    // Only a bridging room may go there, and only from ground you hold.
    expect(sim.canBuildAt('green-room', wet.x, wet.y)).toBe(false)
    expect(sim.canBuildAt('merch-stand', wet.x, wet.y)).toBe(true)

    expect(sim.build('merch-stand', [wet]).placed).toBe(1)
    expect(sim.grid.walkable(wet.x, wet.y)).toBe(true)

    sim.demolish(wet.x, wet.y)
    expect(sim.grid.kindAt(wet.x, wet.y)).toBe(TileKind.Water)
    expect(sim.grid.walkable(wet.x, wet.y)).toBe(false)
  })

  it('refuses a bridge that does not start from ground you hold', () => {
    const sim = new Simulation(LEVEL)
    const wet = { x: 2, y: 2 }
    sim.grid.setKind(wet.x, wet.y, TileKind.Water)
    sim.grid.seen[sim.grid.idx(wet.x, wet.y)] = 1
    expect(sim.canBuildAt('merch-stand', wet.x, wet.y)).toBe(false)
  })

  it('keeps bridges across a save and reload', () => {
    const sim = new Simulation(LEVEL)
    const wet = { x: LEVEL.heart.x + 4, y: LEVEL.heart.y }
    sim.grid.setKind(wet.x, wet.y, TileKind.Water)
    sim.grid.seen[sim.grid.idx(wet.x, wet.y)] = 1
    sim.build('merch-stand', [wet])

    const restored = Simulation.deserialize(LEVEL, sim.serialize())
    expect(restored.grid.bridged[restored.grid.idx(wet.x, wet.y)]).toBe(1)
    restored.demolish(wet.x, wet.y)
    expect(restored.grid.kindAt(wet.x, wet.y)).toBe(TileKind.Water)
  })
})

describe('Reputation', () => {
  // Reputation also drifts towards how loud and staffed the basement is, so
  // each of these compares against an otherwise identical run — that isolates
  // what the event itself did rather than measuring the drift.
  it('rises when an intruder is seen off', () => {
    const control = new Simulation(LEVEL)
    run(control, 30)

    const defended = new Simulation(LEVEL)
    defended.spawnEnemy('ar-scout', { x: LEVEL.heart.x, y: LEVEL.heart.y })
    run(defended, 30)

    expect(defended.defeated['ar-scout']).toBe(1)
    expect(defended.reputation).toBeGreaterThan(control.reputation)
  })

  it('falls when a creature is signed away', () => {
    const lone = () => {
      const sim = new Simulation(LEVEL)
      sim.creatures = sim.creatures.slice(0, 1)
      sim.creatures[0]!.x = LEVEL.heart.x
      sim.creatures[0]!.y = LEVEL.heart.y
      return sim
    }

    const control = lone()
    run(control, 12)

    const raided = lone()
    raided.spawnEnemy('ar-scout', { x: LEVEL.heart.x + 1, y: LEVEL.heart.y })
    run(raided, 12)

    expect(raided.capturedCreatures.length).toBe(1)
    expect(raided.reputation).toBeLessThan(control.reputation)
  })

  it('stays inside 0..100 however badly it goes', () => {
    const sim = new Simulation(LEVEL)
    sim.reputation = 2
    sim.creatures = sim.creatures.slice(0, 1)
    sim.creatures[0]!.x = LEVEL.heart.x
    sim.creatures[0]!.y = LEVEL.heart.y
    sim.spawnEnemy('ar-scout', { x: LEVEL.heart.x + 1, y: LEVEL.heart.y })
    run(sim, 12)
    expect(sim.reputation).toBeGreaterThanOrEqual(0)
    expect(sim.reputation).toBeLessThanOrEqual(100)
  })
})

describe('Economy rules the data already promised', () => {
  it('scales a short payday\'s loyalty hit by how short it was', () => {
    // Ten Royalties short used to cost exactly as much loyalty as paying
    // nobody anything at all.
    const nearlyPaid = new Simulation(LEVEL)
    const brokeFlat = new Simulation(LEVEL)
    const owed = nearlyPaid.creatures.length * 14
    nearlyPaid.royalties = owed - 5
    brokeFlat.royalties = 0

    run(nearlyPaid, 95)
    run(brokeFlat, 95)

    const loyaltyOf = (sim: Simulation) =>
      sim.creatures.reduce((sum, c) => sum + c.loyalty, 0) / sim.creatures.length
    expect(loyaltyOf(nearlyPaid)).toBeGreaterThan(loyaltyOf(brokeFlat))
  })

  it('pays the crew for working, and pays them nothing for standing about', () => {
    // Two identical basements. In one the crew has rock to break; in the other
    // nothing is marked, so nobody is producing anything.
    const busy = new Simulation(LEVEL)
    const idle = new Simulation(LEVEL)
    for (const sim of [busy, idle]) {
      sim.royalties = 0
      // A vault ceiling, or earnings evaporate the moment they land.
      sim.royalties = 4000
      sim.build('royalties-vault', findBuildableTilesOn(sim, 'royalties-vault', 8))
      sim.royalties = 0
    }
    // Mark rock the crew can actually reach in the busy one only. Marking
    // unreachable rock would leave them idle and prove nothing.
    let marked = 0
    for (let y = 0; y < busy.grid.height; y++) {
      for (let x = 0; x < busy.grid.width; x++) {
        if (!busy.grid.diggable(x, y)) continue
        const reachable = busy.grid
          .neighbours(x, y)
          .some((n) => busy.grid.walkable(n.x, n.y) && busy.grid.claimed[busy.grid.idx(n.x, n.y)])
        if (reachable && busy.designate(x, y, true)) marked++
      }
    }
    expect(marked).toBeGreaterThan(0)

    run(busy, 120)
    run(idle, 120)
    expect(busy.royalties).toBeGreaterThan(idle.royalties)
  })

  it('lets a stable Buzz room bank a floor that ambient decay cannot eat', () => {
    // The Reverb Chamber says it never decays. Buzz decays proportionally, so
    // without a floor its output has a hard equilibrium far below what the
    // Shoegaze levels ask for.
    const shoegaze = CAMPAIGN_3_LEVELS[0]!
    const sim = new Simulation(shoegaze)
    const tiles = findBuildableTilesOn(sim, 'reverb-chamber', 6)
    expect(tiles.length).toBe(6)
    sim.royalties = 5000
    sim.build('reverb-chamber', tiles)

    run(sim, 300)
    const peak = sim.buzz
    expect(peak).toBeGreaterThan(0)

    // Tear the room down and the banked Buzz stays banked.
    for (const t of tiles) sim.demolish(t.x, t.y)
    run(sim, 300)
    // Plain decay over five minutes would leave about 55% of it. What the
    // Chamber banked is still there; only the level's starting Buzz drains.
    expect(sim.buzz).toBeGreaterThan(peak * 0.9)
  })
})
