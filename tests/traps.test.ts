import { describe, expect, it } from 'vitest'
import { Simulation } from '../src/game/core/simulation'
import { CAMPAIGN_0_LEVELS } from '../src/game/data/levels/campaign-0'
import { TileKind, type LevelDef } from '../src/game/data/types'
import { trap } from '../src/game/data/traps'

const L1: LevelDef = CAMPAIGN_0_LEVELS[0]!
const L3: LevelDef = CAMPAIGN_0_LEVELS[2]!

function run(sim: Simulation, seconds: number, step = 1 / 15) {
  for (let t = 0; t < seconds; t += step) sim.tick(step)
}

/** A claimed, empty floor tile a trap can be laid on. */
function trapTile(sim: Simulation, defId: string): { x: number; y: number } {
  for (let y = 0; y < sim.grid.height; y++) {
    for (let x = 0; x < sim.grid.width; x++) {
      if (sim.canPlaceTrap(defId, x, y)) return { x, y }
    }
  }
  throw new Error(`nowhere to lay a ${defId}`)
}

describe('Laying traps', () => {
  it('charges for it, arms it, and refuses a second one on the same tile', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'feedback-loop')
    const def = trap('feedback-loop')
    const before = sim.royalties

    expect(sim.placeTrap('feedback-loop', tile.x, tile.y)).toBe(true)
    expect(sim.royalties).toBe(before - def.cost)
    expect(sim.trapAt(tile.x, tile.y)?.armIn).toBe(def.armSeconds)
    expect(sim.placeTrap('cable-snare', tile.x, tile.y)).toBe(false)
  })

  it('refuses tiles that are not plain ground you own', () => {
    const sim = new Simulation(L3)
    // Rock, water and the edge of the lease are all obviously out.
    for (let y = 0; y < sim.grid.height; y++) {
      for (let x = 0; x < sim.grid.width; x++) {
        if (sim.grid.kindAt(x, y) === TileKind.Floor) continue
        expect(sim.canPlaceTrap('feedback-loop', x, y)).toBe(false)
      }
    }
  })

  it('refuses a trap the level has not unlocked', () => {
    const sim = new Simulation(L1)
    expect(L1.traps).toEqual([])
    let anywhere = false
    for (let y = 0; y < sim.grid.height && !anywhere; y++) {
      for (let x = 0; x < sim.grid.width && !anywhere; x++) {
        if (sim.canPlaceTrap('cable-snare', x, y)) anywhere = true
      }
    }
    expect(anywhere).toBe(false)
  })

  it('refunds half when it is lifted again', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'cable-snare')
    const def = trap('cable-snare')
    const before = sim.royalties
    sim.placeTrap('cable-snare', tile.x, tile.y)
    expect(sim.removeTrap(tile.x, tile.y)).toBe(true)
    expect(sim.royalties).toBe(before - def.cost + Math.floor(def.cost / 2))
    expect(sim.trapAt(tile.x, tile.y)).toBeNull()
  })
})

describe('Traps firing', () => {
  it('does nothing until it has armed', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'feedback-loop')
    sim.placeTrap('feedback-loop', tile.x, tile.y)
    const intruder = sim.spawnEnemy('ar-scout', tile)
    const hp = intruder.hp

    sim.tick(1 / 15)
    expect(intruder.hp).toBe(hp)

    run(sim, trap('feedback-loop').armSeconds + 1)
    expect(intruder.hp).toBeLessThan(hp)
  })

  it('spends a charge per firing and is gone once they run out', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'feedback-loop')
    const def = trap('feedback-loop')
    sim.placeTrap('feedback-loop', tile.x, tile.y)
    run(sim, def.armSeconds + 0.2)

    // A fresh intruder standing on it each time, so the trap is what runs out
    // rather than the target.
    for (let fired = 1; fired <= def.charges; fired++) {
      sim.spawnEnemy('playlist-paladin', tile)
      run(sim, def.armSeconds + 0.5)
    }
    expect(sim.trapAt(tile.x, tile.y)).toBeNull()
  })

  it('slows what it catches instead of hurting it', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'cable-snare')
    sim.placeTrap('cable-snare', tile.x, tile.y)
    // Arm it first: an intruder that walks off before it is live is not the
    // thing being tested here.
    run(sim, trap('cable-snare').armSeconds + 0.2)
    const intruder = sim.spawnEnemy('playlist-paladin', tile)
    const hp = intruder.hp

    run(sim, 0.5)
    expect(intruder.speedMul).toBeLessThan(1)
    expect(intruder.hp).toBe(hp)
  })

  it('survives a save and reload with its charges and arming intact', () => {
    const sim = new Simulation(L3)
    const tile = trapTile(sim, 'feedback-loop')
    sim.placeTrap('feedback-loop', tile.x, tile.y)
    run(sim, 1)

    const reloaded = Simulation.deserialize(L3, sim.serialize())
    const laid = reloaded.trapAt(tile.x, tile.y)
    expect(laid).not.toBeNull()
    expect(laid!.def).toBe('feedback-loop')
    expect(laid!.charges).toBe(trap('feedback-loop').charges)
    expect(laid!.armIn).toBeCloseTo(sim.trapAt(tile.x, tile.y)!.armIn, 5)
  })
})
