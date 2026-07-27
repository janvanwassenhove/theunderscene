import { describe, expect, it } from 'vitest'
import { Simulation } from '../src/game/core/simulation'
import { CAMPAIGN_0_LEVELS } from '../src/game/data/levels/campaign-0'
import type { LevelDef } from '../src/game/data/types'

const L1: LevelDef = CAMPAIGN_0_LEVELS[0]!
const L3: LevelDef = CAMPAIGN_0_LEVELS[2]!

function run(sim: Simulation, seconds: number, step = 1 / 15) {
  for (let t = 0; t < seconds; t += step) sim.tick(step)
}

function buildableTiles(sim: Simulation, defId: string, count: number) {
  const tiles: { x: number; y: number }[] = []
  for (let y = 0; y < sim.grid.height && tiles.length < count; y++) {
    for (let x = 0; x < sim.grid.width && tiles.length < count; x++) {
      if (sim.canBuildAt(defId, x, y)) tiles.push({ x, y })
    }
  }
  return tiles
}

function doorTile(sim: Simulation): { x: number; y: number } {
  for (let y = 0; y < sim.grid.height; y++) {
    for (let x = 0; x < sim.grid.width; x++) {
      const instance = sim.rooms.get(sim.grid.roomId[sim.grid.idx(x, y)]!)
      if (instance?.def === 'booking-door') return { x, y }
    }
  }
  throw new Error('no Booking Agent\'s Door on this level')
}

describe('Raids', () => {
  it('sends the scheduled wave in through the door', () => {
    const sim = new Simulation(L3)
    expect(sim.enemies.length).toBe(0)
    run(sim, 125)
    expect(sim.enemies.length).toBeGreaterThan(0)
    expect(sim.enemies.every((e) => e.def === 'ar-scout')).toBe(true)
  })

  it('holds the wave outside while every door is sealed', () => {
    const sim = new Simulation(L3)
    sim.buzz = 200
    run(sim, 110)
    expect(sim.castSpell('sold-out', doorTile(sim))).toBe(true)

    run(sim, 20)
    expect(sim.enemies.length).toBe(0)
    expect(sim.defeated['ar-scout'] ?? 0).toBe(0)

    // Sold Out lasts 45s; once it lapses they walk straight in. Sample as it
    // goes — the crew can now reach the door, so a wave can arrive and be seen
    // off between two fixed assertions.
    let arrived = false
    for (let t = 0; t < 60; t += 1) {
      run(sim, 1)
      arrived ||= sim.enemies.length > 0 || (sim.defeated['ar-scout'] ?? 0) > 0
    }
    expect(arrived).toBe(true)
  })
})

describe('Combat', () => {
  it('creatures defend themselves and see an intruder off', () => {
    const sim = new Simulation(L1)
    sim.spawnEnemy('ar-scout', { x: L1.heart.x, y: L1.heart.y })
    run(sim, 30)

    expect(sim.enemies.length).toBe(0)
    expect(sim.defeated['ar-scout']).toBe(1)
    expect(sim.creatures.length).toBe(3)
  })

  it('a scout signs a lone creature away rather than killing it', () => {
    const sim = new Simulation(L1)
    // Alone, with nobody close enough to interrupt the paperwork.
    sim.creatures = sim.creatures.slice(0, 1)
    const victim = sim.creatures[0]!
    victim.x = L1.heart.x
    victim.y = L1.heart.y
    sim.spawnEnemy('ar-scout', { x: L1.heart.x + 1, y: L1.heart.y })

    run(sim, 12)

    expect(sim.capturedCreatures).toEqual(['roadie-ogre'])
    expect(sim.creatures.length).toBe(0)
  })

  it('a signing is called off if the scout is driven away in time', () => {
    const sim = new Simulation(L1)
    // The whole crew is home, so the scout gets nowhere near six seconds.
    for (const c of sim.creatures) {
      c.x = L1.heart.x
      c.y = L1.heart.y
    }
    sim.spawnEnemy('ar-scout', { x: L1.heart.x + 1, y: L1.heart.y })

    run(sim, 20)

    expect(sim.capturedCreatures.length).toBe(0)
    expect(sim.defeated['ar-scout']).toBe(1)
    expect(sim.creatures.length).toBe(3)
  })

  it('an intruder that reaches the vault leaves with the takings', () => {
    const sim = new Simulation(L1)
    sim.creatures = [] // nobody home to stop it
    sim.build('royalties-vault', buildableTiles(sim, 'royalties-vault', 4))
    sim.royalties = 500
    sim.spawnEnemy('eviction-warlord', { x: L1.heart.x, y: L1.heart.y })

    run(sim, 20)

    expect(sim.royalties).toBeLessThan(500)
  })

  it('goes looking for the crew when what it came for does not exist', () => {
    // No vault has been built, so the Warlord's actual goal is unreachable. It
    // must still come and find somebody rather than idling in a corridor.
    const sim = new Simulation(L1)
    expect(sim.roomTileCount('royalties-vault')).toBe(0)
    const crewBefore = sim.creatures.length
    sim.spawnEnemy('eviction-warlord', { x: L1.heart.x + 6, y: L1.heart.y })

    run(sim, 40)

    const warlord = sim.enemies[0]
    expect(warlord).toBeDefined()
    // It either reached them and started swinging, or it took some hits itself.
    const engaged =
      sim.creatures.length < crewBefore ||
      sim.creatures.some((c) => c.hp < c.maxHp) ||
      warlord!.hp < warlord!.maxHp
    expect(engaged).toBe(true)
  })

  it('records a defeat against the matching objective', () => {
    const sim = new Simulation(L3)
    sim.spawnEnemy('ar-scout', { x: L3.heart.x, y: L3.heart.y })
    run(sim, 30)

    const objective = sim.objectiveStates.find(
      (s) => s.objective.kind === 'defeat' && s.objective.enemy === 'eviction-warlord',
    )
    expect(objective).toBeDefined()
    expect(objective!.done).toBe(false)
    expect(sim.defeated['ar-scout']).toBe(1)
  })
})

describe('Ranged intruders', () => {
  /** A tile `dx` east of the chamber, if it is dug out and in line of sight. */
  function openLine(sim: Simulation, from: { x: number; y: number }, dx: number) {
    for (let step = 1; step <= dx; step++) {
      if (!sim.grid.walkable(from.x + step, from.y)) return null
    }
    return { x: from.x + dx, y: from.y }
  }

  it('shoots from where it stands instead of closing to melee', () => {
    const sim = new Simulation(L1)
    sim.creatures = sim.creatures.slice(0, 1)
    const victim = sim.creatures[0]!
    victim.x = L1.heart.x
    victim.y = L1.heart.y

    const spot = openLine(sim, L1.heart, 4)
    expect(spot, 'the starting chamber is not wide enough for this test').not.toBeNull()
    const sniper = sim.spawnEnemy('comment-sniper', spot!)
    const hp = victim.hp

    // Two seconds is not long enough to walk four tiles and swing, but it is
    // long enough to shoot. The sniper should not have taken a step: the crew
    // closing the gap is the crew's doing, not its own.
    run(sim, 2)
    expect(victim.hp).toBeLessThan(hp)
    expect(Math.hypot(sniper.x - spot!.x, sniper.y - spot!.y)).toBeLessThan(0.01)
  })

  it('cannot shoot through rock', () => {
    const sim = new Simulation(L1)
    sim.creatures = sim.creatures.slice(0, 1)
    const victim = sim.creatures[0]!
    victim.x = L1.heart.x
    victim.y = L1.heart.y

    // Drop the sniper in solid rock well away from the chamber: it has the
    // range, but nothing to shoot down.
    let buried: { x: number; y: number } | null = null
    for (let y = 0; y < sim.grid.height && !buried; y++) {
      for (let x = 0; x < sim.grid.width && !buried; x++) {
        if (sim.grid.walkable(x, y)) continue
        const d = Math.hypot(x - victim.x, y - victim.y)
        if (d > 2 && d < 5) buried = { x, y }
      }
    }
    expect(buried).not.toBeNull()
    sim.spawnEnemy('comment-sniper', buried!)
    const hp = victim.hp

    sim.tick(1 / 15)
    sim.tick(1 / 15)
    expect(victim.hp).toBe(hp)
  })

  it('makes the crew come to it, since it will never come to them', () => {
    const sim = new Simulation(L1)
    sim.creatures = sim.creatures.slice(0, 1)
    const victim = sim.creatures[0]!
    victim.x = L1.heart.x
    victim.y = L1.heart.y

    const spot = openLine(sim, L1.heart, 4)
    expect(spot).not.toBeNull()
    const before = Math.hypot(spot!.x - victim.x, spot!.y - victim.y)
    sim.spawnEnemy('comment-sniper', spot!)

    run(sim, 4)
    const after = Math.hypot(spot!.x - victim.x, spot!.y - victim.y)
    expect(after).toBeLessThan(before)
  })
})

describe('Capture and conversion', () => {
  it('holds a beaten intruder and talks them round in a Signing Room', () => {
    const sim = new Simulation(L1)
    sim.royalties = 3000
    sim.build('contract-office', buildableTiles(sim, 'contract-office', 3))
    sim.build('signing-room', buildableTiles(sim, 'signing-room', 3))
    sim.spawnEnemy('ar-scout', { x: L1.heart.x, y: L1.heart.y })

    // Sample as it goes: down → hauled to a cell → signed can run through in
    // well under a minute, so a single mid-run assertion would be a coin flip.
    let sawDowned = false
    let sawCaptive = false
    for (let t = 0; t < 110; t += 1) {
      run(sim, 1)
      sawDowned ||= sim.enemies.some((e) => e.state === 'downed')
      sawCaptive ||= sim.enemies.some((e) => e.state === 'captive')
    }

    expect(sawDowned).toBe(true)
    expect(sawCaptive).toBe(true)
    expect(sim.enemies.length).toBe(0)
    expect(sim.creatures.some((c) => c.def === 'session-player')).toBe(true)
  })

  it('shows intruders out when there is nowhere to hold them', () => {
    const sim = new Simulation(L1)
    sim.spawnEnemy('ar-scout', { x: L1.heart.x, y: L1.heart.y })
    run(sim, 30)
    expect(sim.enemies.length).toBe(0)
    expect(sim.defeated['ar-scout']).toBe(1)
  })
})

describe('Losing', () => {
  it('is lost once the roster has been empty long enough', () => {
    const sim = new Simulation(L1)
    sim.creatures = []
    run(sim, 20)
    expect(sim.status).toBe('playing')
    run(sim, 10)
    expect(sim.status).toBe('lost')
  })
})

describe('Persistence with a raid in progress', () => {
  it('round-trips intruders, defeats and fired waves', () => {
    const sim = new Simulation(L3)
    run(sim, 125)
    expect(sim.enemies.length).toBeGreaterThan(0)

    const restored = Simulation.deserialize(L3, sim.serialize())
    expect(restored.enemies.length).toBe(sim.enemies.length)
    expect(restored.enemies[0]!.def).toBe(sim.enemies[0]!.def)
    expect(restored.defeated).toEqual(sim.defeated)

    // The wave that already fired must not fire again after a reload.
    const before = restored.enemies.length
    run(restored, 5)
    expect(restored.enemies.length).toBeLessThanOrEqual(before)
  })
})
