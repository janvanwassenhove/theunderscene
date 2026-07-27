/** Isometric projection constants. Tiles are authored at 64px per §3. */
export const TILE_W = 64
export const TILE_H = 32
/** How tall a solid rock block stands above its floor diamond. */
export const BLOCK_H = 26

export interface ScreenPoint {
  sx: number
  sy: number
}

/**
 * View rotation, in 90° steps.
 *
 * The grid itself never rotates — only the mapping from tile to screen does, so
 * digging, pathfinding and saves are all untouched by which way round you are
 * looking at the basement. Tiles are rotated about the grid centre, which keeps
 * the same chunk of basement roughly under the camera through a turn.
 */
let rotation = 0
let gridW = 1
let gridH = 1

export function setViewGrid(width: number, height: number): void {
  gridW = width
  gridH = height
}

export function setViewRotation(steps: number): void {
  rotation = ((steps % 4) + 4) % 4
}

export function getViewRotation(): number {
  return rotation
}

function rotate(x: number, y: number, steps: number): { x: number; y: number } {
  const cx = (gridW - 1) / 2
  const cy = (gridH - 1) / 2
  const dx = x - cx
  const dy = y - cy
  switch (((steps % 4) + 4) % 4) {
    case 1:
      return { x: -dy + cx, y: dx + cy }
    case 2:
      return { x: -dx + cx, y: -dy + cy }
    case 3:
      return { x: dy + cx, y: -dx + cy }
    default:
      return { x: dx + cx, y: dy + cy }
  }
}

/** Tile centre → world-space screen point (before the camera transform). */
export function tileToScreen(x: number, y: number): ScreenPoint {
  const r = rotate(x, y, rotation)
  return {
    sx: (r.x - r.y) * (TILE_W / 2),
    sy: (r.x + r.y) * (TILE_H / 2),
  }
}

/** World-space screen point → fractional tile coordinates. */
export function screenToTile(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2)
  const b = sy / (TILE_H / 2)
  // Un-project to rotated tile space, then un-rotate back to grid space.
  return rotate((a + b) / 2, (b - a) / 2, -rotation)
}

/** Painter's-algorithm depth. Higher draws in front. */
export function depth(x: number, y: number): number {
  const r = rotate(x, y, rotation)
  return (r.x + r.y) * 16
}
