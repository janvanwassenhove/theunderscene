import { describe, expect, it } from 'vitest'
import { Grid } from '../src/game/core/grid'
import { findPath, findPathToNearest } from '../src/game/core/pathfinding'
import { TileKind } from '../src/game/data/types'

function openGrid(w: number, h: number): Grid {
  const grid = new Grid(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) grid.setKind(x, y, TileKind.Floor)
  }
  return grid
}

describe('findPath', () => {
  it('walks a straight corridor', () => {
    const grid = openGrid(6, 1)
    const path = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 0 })
    expect(path).not.toBeNull()
    expect(path!.length).toBe(5)
    expect(path!.at(-1)).toEqual({ x: 5, y: 0 })
  })

  it('routes around a wall instead of through it', () => {
    const grid = openGrid(5, 5)
    for (let y = 0; y < 4; y++) grid.setKind(2, y, TileKind.Rock)

    const path = findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })
    expect(path).not.toBeNull()
    expect(path!.some((p) => p.x === 2 && p.y === 4)).toBe(true)
  })

  it('returns null when the target is sealed off', () => {
    const grid = openGrid(5, 5)
    for (let y = 0; y < 5; y++) grid.setKind(2, y, TileKind.Rock)
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 4 })).toBeNull()
  })

  it('returns an empty path when already there', () => {
    const grid = openGrid(3, 3)
    expect(findPath(grid, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([])
  })
})

describe('findPathToNearest', () => {
  it('finds the closest accepted tile', () => {
    const grid = openGrid(9, 1)
    const found = findPathToNearest(grid, { x: 4, y: 0 }, (x) => x === 1 || x === 6)
    expect(found).not.toBeNull()
    expect(found!.target).toEqual({ x: 6, y: 0 })
  })

  it('gives up cleanly when nothing matches', () => {
    const grid = openGrid(4, 4)
    expect(findPathToNearest(grid, { x: 0, y: 0 }, () => false)).toBeNull()
  })
})
