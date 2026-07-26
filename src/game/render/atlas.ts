import { Container, Graphics, Rectangle, RenderTexture, Texture, type Renderer } from 'pixi.js'
import { BLOCK_H, TILE_H, TILE_W } from './iso'

/**
 * Phase 0 placeholder art.
 *
 * Everything is drawn once into a single 512×128 render texture and handed out
 * as sub-textures, so the whole world renders from one base texture and Pixi can
 * batch it — the same reason the real art ships as per-wing atlases later.
 *
 * Shapes are deliberately flat silhouettes at final size and proportion. No
 * "final-looking" art is invented here: the real sprites replace these frames
 * one wing at a time once each wing's style bible is locked.
 */

export type AtlasKey =
  | 'floor'
  | 'floorRoom'
  | 'block'
  | 'blockFleck'
  | 'water'
  | 'designate'
  | 'select'
  | 'pile'
  | 'bodySquat'
  | 'bodyTall'
  | 'bodyWisp'
  | 'face'
  | 'shadow'
  | 'claim'
  | 'coin'

const CELL = 64
const COLS = 8

const KEYS: AtlasKey[] = [
  'floor',
  'floorRoom',
  'block',
  'blockFleck',
  'water',
  'designate',
  'select',
  'pile',
  'bodySquat',
  'bodyTall',
  'bodyWisp',
  'face',
  'shadow',
  'claim',
  'coin',
]

function cellOrigin(index: number): { x: number; y: number } {
  return { x: (index % COLS) * CELL, y: Math.floor(index / COLS) * CELL }
}

function diamond(g: Graphics, cx: number, cy: number, w: number, h: number): Graphics {
  return g.poly([cx, cy - h / 2, cx + w / 2, cy, cx, cy + h / 2, cx - w / 2, cy])
}

function drawCell(g: Graphics, key: AtlasKey, ox: number, oy: number): void {
  // Cell layout: the tile diamond sits at the bottom of the cell so blocks have
  // headroom above it, matching how the sprites are anchored at render time.
  const cx = ox + CELL / 2
  const floorY = oy + CELL - TILE_H / 2 - 1

  switch (key) {
    case 'floor':
      diamond(g, cx, floorY, TILE_W - 2, TILE_H - 2).fill(0xffffff)
      diamond(g, cx, floorY, TILE_W - 2, TILE_H - 2).stroke({ width: 1, color: 0x000000, alpha: 0.25 })
      break

    case 'floorRoom':
      diamond(g, cx, floorY, TILE_W - 2, TILE_H - 2).fill(0xffffff)
      diamond(g, cx, floorY, TILE_W - 16, TILE_H - 8).stroke({ width: 2, color: 0x000000, alpha: 0.3 })
      break

    case 'block': {
      const topY = floorY - BLOCK_H
      // Left face, right face and top, each a different value so a single tint
      // still reads as a lit solid.
      g.poly([
        cx - TILE_W / 2,
        topY,
        cx,
        topY + TILE_H / 2,
        cx,
        floorY + TILE_H / 2,
        cx - TILE_W / 2,
        floorY,
      ]).fill(0x8a8a8a)
      g.poly([
        cx + TILE_W / 2,
        topY,
        cx,
        topY + TILE_H / 2,
        cx,
        floorY + TILE_H / 2,
        cx + TILE_W / 2,
        floorY,
      ]).fill(0x5e5e5e)
      diamond(g, cx, topY, TILE_W, TILE_H).fill(0xffffff)
      diamond(g, cx, topY, TILE_W, TILE_H).stroke({ width: 1, color: 0x000000, alpha: 0.2 })
      break
    }

    case 'blockFleck': {
      const topY = floorY - BLOCK_H
      const specks: [number, number, number][] = [
        [-14, 2, 3],
        [6, -4, 2.5],
        [16, 6, 2],
        [-4, 8, 2.5],
        [-20, 16, 2],
        [18, 18, 2.5],
      ]
      for (const [dx, dy, r] of specks) g.circle(cx + dx, topY + dy, r).fill(0xffffff)
      break
    }

    case 'water':
      diamond(g, cx, floorY, TILE_W - 2, TILE_H - 2).fill(0xffffff)
      diamond(g, cx, floorY, TILE_W - 24, TILE_H - 12).fill({ color: 0x000000, alpha: 0.18 })
      break

    case 'designate': {
      const topY = floorY - BLOCK_H
      diamond(g, cx, topY, TILE_W - 6, TILE_H - 3).stroke({ width: 3, color: 0xffffff })
      g.moveTo(cx - 10, topY).lineTo(cx + 10, topY).stroke({ width: 3, color: 0xffffff })
      g.moveTo(cx, topY - 6).lineTo(cx, topY + 6).stroke({ width: 3, color: 0xffffff })
      break
    }

    case 'select':
      diamond(g, cx, floorY, TILE_W - 4, TILE_H - 3).stroke({ width: 3, color: 0xffffff })
      break

    case 'pile':
      g.ellipse(cx, floorY + 2, 15, 7).fill({ color: 0x000000, alpha: 0.25 })
      g.circle(cx - 6, floorY - 2, 6).fill(0xffffff)
      g.circle(cx + 6, floorY - 1, 6).fill(0xf0f0f0)
      g.circle(cx, floorY - 8, 6).fill(0xffffff)
      break

    case 'bodySquat':
      g.roundRect(cx - 13, floorY - 30, 26, 30, 8).fill(0xffffff)
      g.roundRect(cx - 16, floorY - 18, 32, 12, 6).fill(0xf2f2f2)
      break

    case 'bodyTall':
      g.roundRect(cx - 10, floorY - 40, 20, 40, 7).fill(0xffffff)
      g.roundRect(cx - 14, floorY - 26, 28, 10, 5).fill(0xf2f2f2)
      break

    case 'bodyWisp':
      g.ellipse(cx, floorY - 20, 12, 20).fill({ color: 0xffffff, alpha: 0.85 })
      break

    case 'face':
      g.circle(cx - 5, floorY - 26, 3).fill(0xffffff)
      g.circle(cx + 5, floorY - 26, 3).fill(0xffffff)
      break

    case 'shadow':
      g.ellipse(cx, floorY, 18, 8).fill({ color: 0x000000, alpha: 0.35 })
      break

    case 'claim':
      diamond(g, cx, floorY, 10, 5).fill(0xffffff)
      break

    case 'coin':
      g.circle(cx, floorY - 4, 7).fill(0xffffff)
      break
  }
}

export type Atlas = Record<AtlasKey, Texture>

export function buildAtlas(renderer: Renderer): { atlas: Atlas; texture: RenderTexture } {
  const rows = Math.ceil(KEYS.length / COLS)
  const width = COLS * CELL
  const height = rows * CELL

  const stage = new Container()
  const g = new Graphics()
  stage.addChild(g)

  KEYS.forEach((key, index) => {
    const { x, y } = cellOrigin(index)
    drawCell(g, key, x, y)
  })

  const target = RenderTexture.create({ width, height, resolution: 2, antialias: true })
  renderer.render({ container: stage, target })
  g.destroy()
  stage.destroy()

  const atlas = {} as Atlas
  KEYS.forEach((key, index) => {
    const { x, y } = cellOrigin(index)
    atlas[key] = new Texture({
      source: target.source,
      frame: new Rectangle(x, y, CELL, CELL),
    })
  })

  return { atlas, texture: target }
}

/** Cell-space anchor: sprites are positioned by tile centre, not by cell corner. */
export const CELL_ANCHOR = { x: 0.5, y: (CELL - TILE_H / 2 - 1) / CELL }
