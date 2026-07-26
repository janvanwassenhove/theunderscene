import { describe, expect, it } from 'vitest'
import { Grid } from '../src/game/core/grid'
import { TileKind } from '../src/game/data/types'

describe('Grid', () => {
  it('reports walkability and diggability per tile kind', () => {
    const grid = new Grid(5, 5)
    grid.setKind(1, 1, TileKind.Rock)
    grid.setKind(2, 1, TileKind.Floor)
    grid.setKind(3, 1, TileKind.Water)
    grid.setKind(4, 1, TileKind.Vein)

    expect(grid.walkable(2, 1)).toBe(true)
    expect(grid.walkable(1, 1)).toBe(false)
    expect(grid.walkable(3, 1)).toBe(false)
    expect(grid.diggable(1, 1)).toBe(true)
    expect(grid.diggable(4, 1)).toBe(true)
    expect(grid.diggable(2, 1)).toBe(false)
  })

  it('treats out-of-bounds as bedrock rather than throwing', () => {
    const grid = new Grid(3, 3)
    expect(grid.kindAt(-1, 0)).toBe(TileKind.Bedrock)
    expect(grid.walkable(99, 99)).toBe(false)
  })

  it('claims a dug tile when it touches owned ground', () => {
    const grid = new Grid(4, 4)
    grid.setKind(1, 1, TileKind.Floor)
    grid.claimed[grid.idx(1, 1)] = 1
    grid.setKind(2, 1, TileKind.Floor)

    grid.autoClaim(2, 1)
    expect(grid.claimed[grid.idx(2, 1)]).toBe(1)

    grid.setKind(3, 3, TileKind.Floor)
    grid.autoClaim(3, 3)
    expect(grid.claimed[grid.idx(3, 3)]).toBe(0)
  })

  it('reveals a square ring around a tile, clipped to bounds', () => {
    const grid = new Grid(4, 4)
    grid.reveal(0, 0, 1)
    expect(grid.seen[grid.idx(0, 0)]).toBe(1)
    expect(grid.seen[grid.idx(1, 1)]).toBe(1)
    expect(grid.seen[grid.idx(2, 2)]).toBe(0)
  })
})
