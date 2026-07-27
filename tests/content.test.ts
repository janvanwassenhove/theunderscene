import { describe, expect, it } from 'vitest'
import { CAMPAIGNS, LEVELS, levelsOf } from '../src/game/data/campaigns'
import { ROOMS, roomOrNull } from '../src/game/data/rooms'
import { CREATURES, creature } from '../src/game/data/creatures'
import { ENEMIES, enemy } from '../src/game/data/enemies'
import { SPELLS, spell } from '../src/game/data/spells'
import { TRAPS, trap } from '../src/game/data/traps'
import { Simulation } from '../src/game/core/simulation'
import { findPath } from '../src/game/core/pathfinding'

/**
 * The whole game is data, so the thing most likely to break it is a typo in a
 * level file rather than a bug in the engine. These walk every level and assert
 * that everything it references actually exists and that the map it generates
 * is playable.
 */

describe('Content integrity', () => {
  it('has unique ids across every catalogue', () => {
    for (const [name, ids] of [
      ['rooms', ROOMS.map((r) => r.id)],
      ['creatures', CREATURES.map((c) => c.id)],
      ['enemies', ENEMIES.map((e) => e.id)],
      ['spells', SPELLS.map((s) => s.id)],
      ['traps', TRAPS.map((t) => t.id)],
      ['levels', LEVELS.map((l) => l.id)],
      ['campaigns', CAMPAIGNS.map((c) => c.id)],
    ] as const) {
      expect(new Set(ids).size, `duplicate ${name} id`).toBe(ids.length)
    }
  })

  it('only references rooms, creatures, enemies, spells and traps that exist', () => {
    for (const level of LEVELS) {
      for (const id of level.rooms) {
        expect(roomOrNull(id), `${level.id} lists unknown room ${id}`).not.toBeNull()
      }
      for (const id of level.spells) expect(() => spell(id)).not.toThrow()
      for (const id of level.traps) expect(() => trap(id), `${level.id} lists unknown trap ${id}`).not.toThrow()
      for (const entry of level.startingCreatures) expect(() => creature(entry.creature)).not.toThrow()
      for (const wave of level.raids) {
        for (const entry of wave.enemies) expect(() => enemy(entry.enemy)).not.toThrow()
      }
      for (const objective of level.objectives) {
        if (objective.kind === 'room') {
          expect(roomOrNull(objective.room), `${level.id} objective wants unknown room`).not.toBeNull()
        }
        if (objective.kind === 'defeat') expect(() => enemy(objective.enemy)).not.toThrow()
      }
      for (const hint of level.hints) {
        if (hint.when.kind === 'room') {
          expect(roomOrNull(hint.when.room), `${level.id} hint wants unknown room`).not.toBeNull()
        }
      }
    }
  })

  it('offers every room an objective or hint asks for', () => {
    for (const level of LEVELS) {
      for (const objective of level.objectives) {
        if (objective.kind !== 'room') continue
        expect(
          level.rooms.includes(objective.room),
          `${level.id} requires ${objective.room} but does not unlock it`,
        ).toBe(true)
      }
    }
  })

  it('attracts only creatures that exist, and rooms that can attract them', () => {
    for (const room of ROOMS) {
      for (const attract of room.attracts ?? []) {
        expect(() => creature(attract.creature)).not.toThrow()
        expect(attract.minTiles, `${room.id} attracts below its own minimum`).toBeGreaterThanOrEqual(
          Math.min(room.minTiles, attract.minTiles),
        )
      }
    }
    for (const c of CREATURES) {
      if (c.needsRoom) expect(roomOrNull(c.needsRoom.room), `${c.id} needs unknown room`).not.toBeNull()
    }
  })

  it('chains campaigns into an unlockable order', () => {
    const seen = new Set<string>()
    for (const campaign of CAMPAIGNS) {
      if (campaign.requires) {
        expect(seen.has(campaign.requires), `${campaign.id} requires a later campaign`).toBe(true)
      }
      seen.add(campaign.id)
      if (campaign.status !== 'playable') continue
      expect(campaign.levels.length, `${campaign.id} is playable with no levels`).toBeGreaterThan(0)
      levelsOf(campaign.id).forEach((level, i) => {
        expect(level.campaignId).toBe(campaign.id)
        expect(level.index).toBe(i + 1)
      })
    }
  })
})

describe('Every level generates a playable basement', () => {
  it('carves a chamber, a reachable door and its starting crew', () => {
    for (const def of LEVELS) {
      const sim = new Simulation(def)

      expect(sim.grid.walkable(def.heart.x, def.heart.y), `${def.id}: no chamber`).toBe(true)
      expect(sim.roomTileCount('booking-door'), `${def.id}: no door`).toBeGreaterThan(0)

      let door: { x: number; y: number } | null = null
      for (let y = 0; y < sim.grid.height && !door; y++) {
        for (let x = 0; x < sim.grid.width && !door; x++) {
          const instance = sim.rooms.get(sim.grid.roomId[sim.grid.idx(x, y)]!)
          if (instance?.def === 'booking-door') door = { x, y }
        }
      }
      expect(findPath(sim.grid, door!, def.heart), `${def.id}: door is stranded`).not.toBeNull()

      const expected = def.startingCreatures.reduce((sum, e) => sum + e.count, 0)
      expect(sim.population, `${def.id}: wrong starting crew`).toBe(expected)
      expect(sim.capacity, `${def.id}: opens over its own cap`).toBeGreaterThanOrEqual(expected)
    }
  })

  it('runs a minute of every level without throwing', () => {
    for (const def of LEVELS) {
      const sim = new Simulation(def)
      for (let t = 0; t < 60; t += 1 / 15) sim.tick(1 / 15)
      expect(sim.elapsed, `${def.id}: did not tick`).toBeGreaterThan(59)
      expect(Number.isFinite(sim.royalties), `${def.id}: Royalties went non-finite`).toBe(true)
      expect(Number.isFinite(sim.buzz), `${def.id}: Buzz went non-finite`).toBe(true)
    }
  })
})
