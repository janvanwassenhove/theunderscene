import { afterEach, describe, expect, it } from 'vitest'
import {
  BLOCK_H,
  depth,
  getViewRotation,
  screenToTile,
  setViewGrid,
  setViewRotation,
  tileToScreen,
} from '../src/game/render/iso'

const W = 48
const H = 40

afterEach(() => {
  setViewRotation(0)
})

describe('isometric projection under view rotation', () => {
  it('round-trips every tile back to itself at all four orientations', () => {
    setViewGrid(W, H)
    for (let steps = 0; steps < 4; steps++) {
      setViewRotation(steps)
      for (let y = 0; y < H; y += 3) {
        for (let x = 0; x < W; x += 3) {
          const { sx, sy } = tileToScreen(x, y)
          const back = screenToTile(sx, sy)
          expect(Math.round(back.x), `x at rotation ${steps}`).toBe(x)
          expect(Math.round(back.y), `y at rotation ${steps}`).toBe(y)
        }
      }
    }
  })

  it('wraps rotation so the buttons can be pressed forever in one direction', () => {
    setViewRotation(-1)
    expect(getViewRotation()).toBe(3)
    setViewRotation(7)
    expect(getViewRotation()).toBe(3)
    setViewRotation(4)
    expect(getViewRotation()).toBe(0)
  })

  it('keeps the grid centre still through a turn', () => {
    setViewGrid(W, H)
    setViewRotation(0)
    const before = tileToScreen((W - 1) / 2, (H - 1) / 2)
    for (let steps = 1; steps < 4; steps++) {
      setViewRotation(steps)
      const after = tileToScreen((W - 1) / 2, (H - 1) / 2)
      expect(after.sx).toBeCloseTo(before.sx)
      expect(after.sy).toBeCloseTo(before.sy)
    }
  })

  it('sorts depth by screen row whichever way round you are looking', () => {
    setViewGrid(W, H)
    for (let steps = 0; steps < 4; steps++) {
      setViewRotation(steps)
      // Anything drawn lower on screen must draw in front, or blocks show
      // through each other after a turn.
      const samples = [
        [3, 3],
        [10, 4],
        [4, 10],
        [20, 20],
        [40, 30],
      ] as const
      for (const [ax, ay] of samples) {
        for (const [bx, by] of samples) {
          const lower = tileToScreen(ax, ay).sy - tileToScreen(bx, by).sy
          if (lower > 0.01) expect(depth(ax, ay)).toBeGreaterThan(depth(bx, by))
        }
      }
    }
  })

  it('needs the block-height correction to hit a raised tile at every orientation', () => {
    setViewGrid(W, H)
    for (let steps = 0; steps < 4; steps++) {
      setViewRotation(steps)
      const block = { x: 12, y: 9 }
      // A rock block's top face is drawn BLOCK_H above its own floor diamond,
      // so tapping the face you can see lands on a point that naively reads as
      // some tile further back.
      const floor = tileToScreen(block.x, block.y)
      const tapPoint = { sx: floor.sx, sy: floor.sy - BLOCK_H }
      const naive = screenToTile(tapPoint.sx, tapPoint.sy)
      expect(Math.round(naive.x) === block.x && Math.round(naive.y) === block.y).toBe(false)

      const corrected = screenToTile(tapPoint.sx, tapPoint.sy + BLOCK_H)
      expect(Math.round(corrected.x)).toBe(block.x)
      expect(Math.round(corrected.y)).toBe(block.y)
    }
  })
})
