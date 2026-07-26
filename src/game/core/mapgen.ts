import { TileKind, type LevelDef } from '../data/types'
import { Grid } from './grid'
import { Rng } from './rng'

export interface GeneratedMap {
  grid: Grid
  /** Where the starting chamber sits — camera and spawns centre on this. */
  heart: { x: number; y: number }
  /** Tiles a Booking Agent's Door should be placed on. */
  doorTiles: { x: number; y: number }[]
}

function carveRect(grid: Grid, cx: number, cy: number, w: number, h: number, claimed: boolean) {
  const x0 = Math.max(1, cx - (w >> 1))
  const y0 = Math.max(1, cy - (h >> 1))
  const x1 = Math.min(grid.width - 2, x0 + w - 1)
  const y1 = Math.min(grid.height - 2, y0 + h - 1)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      grid.setKind(x, y, TileKind.Floor)
      grid.vein[grid.idx(x, y)] = 0
      if (claimed) grid.claimed[grid.idx(x, y)] = 1
      grid.reveal(x, y, 1)
    }
  }
}

/**
 * Builds a level from its seed: solid rock with a bedrock border, a carved
 * starting chamber, scattered Royalty Veins, a few flooded pockets, and some
 * pre-dug caches so exploring pays for itself.
 */
export function generateMap(def: LevelDef): GeneratedMap {
  const rng = new Rng(def.seed)
  const grid = new Grid(def.width, def.height)

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const border = x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1
      grid.setKind(x, y, border ? TileKind.Bedrock : TileKind.Rock)
    }
  }

  // Royalty veins, biased away from the starting chamber so the first minute
  // is about digging outward rather than standing still.
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      const dist = Math.hypot(x - def.heart.x, y - def.heart.y)
      const falloff = Math.min(1, dist / 10)
      if (rng.chance(def.veinDensity * falloff)) {
        grid.setKind(x, y, TileKind.Vein)
        grid.vein[grid.idx(x, y)] = rng.int(45, 110)
      }
    }
  }

  // Flooded pockets — impassable, and a reason for the Merch Stand bridge later.
  const waterBlobs = Math.round(def.waterDensity * 100)
  for (let b = 0; b < waterBlobs; b++) {
    const cx = rng.int(3, grid.width - 4)
    const cy = rng.int(3, grid.height - 4)
    if (Math.hypot(cx - def.heart.x, cy - def.heart.y) < 7) continue
    const r = rng.int(1, 2)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (!grid.inBounds(x, y)) continue
        if (grid.kindAt(x, y) === TileKind.Bedrock) continue
        if (Math.hypot(dx, dy) <= r) {
          grid.setKind(x, y, TileKind.Water)
          grid.vein[grid.idx(x, y)] = 0
        }
      }
    }
  }

  // Pre-dug caches with loose Royalties on the floor.
  for (let c = 0; c < def.cacheCount; c++) {
    const cx = rng.int(4, grid.width - 5)
    const cy = rng.int(4, grid.height - 5)
    if (Math.hypot(cx - def.heart.x, cy - def.heart.y) < 8) continue
    const w = rng.int(2, 4)
    const h = rng.int(2, 3)
    carveRect(grid, cx, cy, w, h, false)
    for (let i = 0; i < rng.int(2, 4); i++) {
      const px = cx + rng.int(-1, 1)
      const py = cy + rng.int(-1, 1)
      if (grid.walkable(px, py)) grid.pile[grid.idx(px, py)] = rng.int(40, 90)
    }
    // Caches start hidden; you only find them by digging in.
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        if (grid.inBounds(x, y)) grid.seen[grid.idx(x, y)] = 0
      }
    }
  }

  // The starting chamber, owned from the off.
  carveRect(grid, def.heart.x, def.heart.y, 7, 5, true)

  // A Booking Agent's Door, off to one side, joined to the chamber by a short
  // corridor. The corridor is not optional: everyone uses this door — your
  // recruits and the industry alike — and a door nothing can walk out of is
  // just a decorated dead end.
  const doorTiles: { x: number; y: number }[] = []
  const doorX = Math.min(grid.width - 3, def.heart.x + 6)
  const doorY = def.heart.y
  for (let x = def.heart.x; x <= doorX; x++) {
    carveRect(grid, x, doorY, 1, 1, true)
  }
  doorTiles.push({ x: doorX, y: doorY })
  grid.reveal(doorX, doorY, 1)

  return { grid, heart: { ...def.heart }, doorTiles }
}
