/** Isometric projection constants. Tiles are authored at 64px per §3. */
export const TILE_W = 64
export const TILE_H = 32
/** How tall a solid rock block stands above its floor diamond. */
export const BLOCK_H = 26

export interface ScreenPoint {
  sx: number
  sy: number
}

/** Tile centre → world-space screen point (before the camera transform). */
export function tileToScreen(x: number, y: number): ScreenPoint {
  return {
    sx: (x - y) * (TILE_W / 2),
    sy: (x + y) * (TILE_H / 2),
  }
}

/** World-space screen point → fractional tile coordinates. */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2)
  const b = sy / (TILE_H / 2)
  return { x: (a + b) / 2, y: (b - a) / 2 }
}

/** Painter's-algorithm depth. Higher draws in front. */
export function depth(x: number, y: number): number {
  return (x + y) * 16
}
