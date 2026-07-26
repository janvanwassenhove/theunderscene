import { TileKind } from '../data/types'

export interface TileCoord {
  x: number
  y: number
}

/** How much work a tile of each kind takes to dig out. */
const DIG_WORK: Record<number, number> = {
  [TileKind.Rock]: 100,
  [TileKind.Vein]: 160,
}

/**
 * The basement itself. Everything is held in typed arrays: a 40×30 level is
 * 1200 tiles and gets walked several times per simulation tick, so this stays
 * allocation-free on purpose.
 */
export class Grid {
  readonly width: number
  readonly height: number

  /** TileKind per tile. */
  readonly kind: Uint8Array
  /** Remaining dig work; only meaningful for Rock/Vein. */
  readonly work: Uint16Array
  /** 1 when the tile belongs to the player (walkable floor they own). */
  readonly claimed: Uint8Array
  /** Room instance id per tile, 0 = none. */
  readonly roomId: Uint16Array
  /** 1 when the player has marked this rock for digging. */
  readonly designated: Uint8Array
  /** Royalties still inside an undug vein. */
  readonly vein: Uint16Array
  /** Loose Royalties sitting on a floor tile, waiting to be hauled. */
  readonly pile: Uint16Array
  /** 1 once the tile has ever been visible to the player. */
  readonly seen: Uint8Array

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    const n = width * height
    this.kind = new Uint8Array(n)
    this.work = new Uint16Array(n)
    this.claimed = new Uint8Array(n)
    this.roomId = new Uint16Array(n)
    this.designated = new Uint8Array(n)
    this.vein = new Uint16Array(n)
    this.pile = new Uint16Array(n)
    this.seen = new Uint8Array(n)
  }

  idx(x: number, y: number): number {
    return y * this.width + x
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  kindAt(x: number, y: number): TileKind {
    if (!this.inBounds(x, y)) return TileKind.Bedrock
    return this.kind[this.idx(x, y)] as TileKind
  }

  /** Can a creature stand here? */
  walkable(x: number, y: number): boolean {
    const k = this.kindAt(x, y)
    return k === TileKind.Floor || k === TileKind.Room
  }

  /** Can this tile be marked for digging? */
  diggable(x: number, y: number): boolean {
    const k = this.kindAt(x, y)
    return k === TileKind.Rock || k === TileKind.Vein
  }

  /** Solid tiles get drawn as a raised block. */
  solid(x: number, y: number): boolean {
    const k = this.kindAt(x, y)
    return k === TileKind.Bedrock || k === TileKind.Rock || k === TileKind.Vein
  }

  setKind(x: number, y: number, k: TileKind): void {
    const i = this.idx(x, y)
    this.kind[i] = k
    this.work[i] = DIG_WORK[k] ?? 0
    if (k !== TileKind.Rock && k !== TileKind.Vein) this.designated[i] = 0
  }

  digWorkFor(kind: TileKind): number {
    return DIG_WORK[kind] ?? 0
  }

  /** Orthogonal neighbours, clipped to the level. */
  neighbours(x: number, y: number, out: TileCoord[] = []): TileCoord[] {
    out.length = 0
    if (x > 0) out.push({ x: x - 1, y })
    if (x < this.width - 1) out.push({ x: x + 1, y })
    if (y > 0) out.push({ x, y: y - 1 })
    if (y < this.height - 1) out.push({ x, y: y + 1 })
    return out
  }

  /** A dug tile next to an owned tile becomes owned — no separate claim chore. */
  autoClaim(x: number, y: number): void {
    const i = this.idx(x, y)
    if (!this.walkable(x, y)) return
    for (const n of this.neighbours(x, y)) {
      if (this.claimed[this.idx(n.x, n.y)]) {
        this.claimed[i] = 1
        return
      }
    }
  }

  /** Reveals a tile and its immediate ring, as digging or a spell would. */
  reveal(x: number, y: number, radius = 1): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (this.inBounds(nx, ny)) this.seen[this.idx(nx, ny)] = 1
      }
    }
  }
}
