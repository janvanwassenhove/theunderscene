import { Container, Graphics, Rectangle, RenderTexture, Texture, type Renderer } from 'pixi.js'
import { BLOCK_H, TILE_H, TILE_W } from './iso'

/**
 * Placeholder art.
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
  | 'bar'
  | 'threat'
  | 'trap'
  | 'trapArming'
  | 'roomEdge'
  | 'blockCrack'
  | 'propCoin'
  | 'propBed'
  | 'propTable'
  | 'propSpeaker'
  | 'propRing'
  | 'propDoor'
  | 'roleWorker'
  | 'roleFighter'
  | 'roleSupport'
  | 'roleEconomy'

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
  'bar',
  'threat',
  'trap',
  'trapArming',
  'roomEdge',
  'blockCrack',
  'propCoin',
  'propBed',
  'propTable',
  'propSpeaker',
  'propRing',
  'propDoor',
  'roleWorker',
  'roleFighter',
  'roleSupport',
  'roleEconomy',
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

    // Bodies are still flat silhouettes at final size and proportion, but they
    // now carry a head, shoulders and feet, so a crowd reads as individuals at
    // tile size instead of as a row of identical lozenges.
    case 'bodySquat':
      g.ellipse(cx - 6, floorY - 2, 5, 3).fill(0xd8d8d8)
      g.ellipse(cx + 6, floorY - 2, 5, 3).fill(0xd8d8d8)
      g.roundRect(cx - 13, floorY - 24, 26, 24, 7).fill(0xffffff)
      g.roundRect(cx - 17, floorY - 20, 34, 9, 4).fill(0xe4e4e4)
      g.circle(cx, floorY - 30, 9).fill(0xffffff)
      break

    case 'bodyTall':
      g.ellipse(cx - 5, floorY - 2, 4, 3).fill(0xd8d8d8)
      g.ellipse(cx + 5, floorY - 2, 4, 3).fill(0xd8d8d8)
      g.roundRect(cx - 9, floorY - 31, 18, 31, 5).fill(0xffffff)
      g.roundRect(cx - 15, floorY - 28, 30, 8, 4).fill(0xe4e4e4)
      g.circle(cx, floorY - 38, 8).fill(0xffffff)
      break

    case 'bodyWisp':
      // No feet and no shoulders: it does not walk so much as arrive.
      g.poly([cx - 9, floorY - 18, cx + 9, floorY - 18, cx + 4, floorY, cx - 4, floorY]).fill({
        color: 0xffffff,
        alpha: 0.55,
      })
      g.ellipse(cx, floorY - 22, 11, 13).fill({ color: 0xffffff, alpha: 0.9 })
      break

    case 'face':
      g.circle(cx - 4, floorY - 31, 2.6).fill(0xffffff)
      g.circle(cx + 4, floorY - 31, 2.6).fill(0xffffff)
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

    // A plain white bar, scaled and tinted per entity for health readouts.
    case 'bar':
      g.rect(cx - 16, floorY - 2, 32, 4).fill(0xffffff)
      break

    // Marks an intruder, so a raid reads at a glance on a small screen.
    case 'threat':
      g.poly([cx, floorY - 8, cx + 7, floorY + 4, cx - 7, floorY + 4]).fill(0xffffff)
      break

    // A laid trap: a plate flush with the floor, with its trigger picked out.
    case 'trap':
      diamond(g, cx, floorY, TILE_W - 14, TILE_H - 7).fill({ color: 0xffffff, alpha: 0.9 })
      diamond(g, cx, floorY, TILE_W - 30, TILE_H - 15).stroke({ width: 2, color: 0x000000, alpha: 0.45 })
      break

    // Same plate, still arming — dashed, so "not live yet" reads without text.
    case 'trapArming':
      for (let k = 0; k < 4; k++) {
        const w = TILE_W - 14
        const h = TILE_H - 7
        const a = (k * Math.PI) / 2 + Math.PI / 4
        g.circle(cx + (Math.cos(a) * w) / 4, floorY + (Math.sin(a) * h) / 4, 2.5).fill(0xffffff)
      }
      break

    // Drawn only on a room's boundary tiles, so a room reads as a room rather
    // than as floor somebody tinted.
    case 'roomEdge':
      diamond(g, cx, floorY, TILE_W - 3, TILE_H - 2).stroke({ width: 2, color: 0xffffff, alpha: 0.75 })
      break

    // Scattered over a third of the rock so a wall of blocks is not a wall of
    // one repeated block.
    case 'blockCrack': {
      const topY = floorY - BLOCK_H
      g.moveTo(cx - 12, topY - 3)
        .lineTo(cx - 4, topY + 2)
        .lineTo(cx + 3, topY - 2)
        .stroke({ width: 1.5, color: 0x000000, alpha: 0.35 })
      g.moveTo(cx + 8, topY + 4)
        .lineTo(cx + 15, topY + 8)
        .stroke({ width: 1.5, color: 0x000000, alpha: 0.3 })
      break
    }

    // Room fixtures. Chosen by which effect a room has, never by its id, so a
    // new room in the data gets furniture without touching the renderer.
    case 'propCoin':
      g.ellipse(cx, floorY - 1, 11, 5).fill({ color: 0x000000, alpha: 0.3 })
      g.ellipse(cx, floorY - 5, 9, 4).fill(0xffffff)
      g.ellipse(cx, floorY - 9, 7, 3.5).fill(0xf0f0f0)
      break

    case 'propBed':
      g.poly([cx, floorY - 10, cx + 16, floorY - 2, cx, floorY + 6, cx - 16, floorY - 2]).fill(0xffffff)
      g.poly([cx - 6, floorY - 9, cx + 3, floorY - 4, cx - 3, floorY - 1, cx - 12, floorY - 5]).fill(0xd0d0d0)
      break

    case 'propTable':
      g.poly([cx, floorY - 12, cx + 15, floorY - 4, cx, floorY + 4, cx - 15, floorY - 4]).fill(0xffffff)
      g.rect(cx - 12, floorY - 4, 3, 7).fill(0xd0d0d0)
      g.rect(cx + 9, floorY - 4, 3, 7).fill(0xd0d0d0)
      break

    case 'propSpeaker':
      g.rect(cx - 9, floorY - 22, 18, 22).fill(0xffffff)
      g.circle(cx, floorY - 14, 5.5).fill({ color: 0x000000, alpha: 0.45 })
      g.circle(cx, floorY - 5, 3).fill({ color: 0x000000, alpha: 0.35 })
      break

    case 'propRing':
      diamond(g, cx, floorY - 2, 26, 13).stroke({ width: 2.5, color: 0xffffff })
      g.circle(cx, floorY - 4, 3.5).fill(0xffffff)
      break

    case 'propDoor':
      g.poly([cx - 10, floorY, cx - 10, floorY - 22, cx, floorY - 27, cx + 10, floorY - 22, cx + 10, floorY]).fill({
        color: 0xffffff,
        alpha: 0.9,
      })
      g.circle(cx + 5, floorY - 12, 2).fill({ color: 0x000000, alpha: 0.5 })
      break

    // Role pips, so a crowded basement says who does what without a tap.
    case 'roleWorker':
      g.moveTo(cx - 4, floorY + 4).lineTo(cx + 3, floorY - 3).stroke({ width: 2.5, color: 0xffffff })
      g.moveTo(cx, floorY - 6).lineTo(cx + 6, floorY - 2).stroke({ width: 2.5, color: 0xffffff })
      break

    case 'roleFighter':
      g.moveTo(cx - 4, floorY + 3).lineTo(cx + 4, floorY - 5).stroke({ width: 2.5, color: 0xffffff })
      g.moveTo(cx - 5, floorY - 4).lineTo(cx - 1, floorY - 8).stroke({ width: 2.5, color: 0xffffff })
      break

    case 'roleSupport':
      g.circle(cx - 2, floorY, 3).fill(0xffffff)
      g.rect(cx, floorY - 9, 2, 9).fill(0xffffff)
      break

    case 'roleEconomy':
      g.circle(cx, floorY - 3, 4.5).fill(0xffffff)
      g.circle(cx, floorY - 3, 2).fill({ color: 0x000000, alpha: 0.5 })
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
