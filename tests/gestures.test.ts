import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PointerInput } from '../src/game/input/pointerInput'

/**
 * The camera has no buttons — pan, zoom and turn are all gestures — so the
 * gesture arithmetic is the only thing standing between the player and a view
 * they cannot move. These drive the DOM events directly.
 */

// PointerInput is DOM-facing on purpose; give it the two globals it reaches for.
const g = globalThis as unknown as { window?: unknown; performance?: unknown }
g.window ??= { setTimeout, clearTimeout }
g.performance ??= { now: () => Date.now() }

class FakeElement {
  style: Record<string, string> = {}
  listeners = new Map<string, ((e: never) => void)[]>()
  addEventListener(type: string, fn: (e: never) => void) {
    const list = this.listeners.get(type) ?? []
    list.push(fn)
    this.listeners.set(type, list)
  }
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0 }
  }
  setPointerCapture() {}
  releasePointerCapture() {}
  emit(type: string, event: Record<string, unknown>) {
    for (const fn of this.listeners.get(type) ?? []) fn({ preventDefault() {}, ...event } as never)
  }
}

function twoFingers(el: FakeElement, a: [number, number], b: [number, number]) {
  el.emit('pointerdown', { pointerId: 1, clientX: a[0], clientY: a[1], pointerType: 'touch' })
  el.emit('pointerdown', { pointerId: 2, clientX: b[0], clientY: b[1], pointerType: 'touch' })
}

/** Both fingers on a circle of `radius`, the line between them at `degrees`. */
function spin(el: FakeElement, degrees: number, radius = 100) {
  const r = (degrees * Math.PI) / 180
  const dx = Math.cos(r) * radius
  const dy = Math.sin(r) * radius
  el.emit('pointermove', { pointerId: 1, clientX: 200 - dx / 2, clientY: 200 - dy / 2, pointerType: 'touch' })
  el.emit('pointermove', { pointerId: 2, clientX: 200 + dx / 2, clientY: 200 + dy / 2, pointerType: 'touch' })
}

describe('Two-finger gestures', () => {
  let el: FakeElement
  let rotate: ReturnType<typeof vi.fn>
  let zoom: ReturnType<typeof vi.fn>
  let pan: ReturnType<typeof vi.fn>

  beforeEach(() => {
    el = new FakeElement()
    rotate = vi.fn()
    zoom = vi.fn()
    pan = vi.fn()
    new PointerInput(el as unknown as HTMLElement, { onRotate: rotate, onZoom: zoom, onPan: pan })
  })

  it('turns the view a quarter per twist, in the direction twisted', () => {
    twoFingers(el, [150, 200], [250, 200])
    // A full half-turn of the wrist, in small steps, both ways.
    for (let d = 0; d <= 180; d += 10) spin(el, d)
    const clockwise = rotate.mock.calls.map(([s]) => s)
    expect(clockwise.length).toBeGreaterThan(0)
    expect(clockwise.every((s) => s === 1)).toBe(true)

    rotate.mockClear()
    for (let d = 180; d >= 0; d -= 10) spin(el, d)
    const anticlockwise = rotate.mock.calls.map(([s]) => s)
    expect(anticlockwise.length).toBeGreaterThan(0)
    expect(anticlockwise.every((s) => s === -1)).toBe(true)
  })

  it('does not turn the view on a straight pinch', () => {
    twoFingers(el, [150, 200], [250, 200])
    // Pull apart and push together along the same axis, which is what a zoom
    // actually looks like. A view that spins while you zoom is unusable.
    for (const r of [120, 150, 190, 240, 190, 140, 100]) spin(el, 0, r)
    expect(zoom).toHaveBeenCalled()
    expect(rotate).not.toHaveBeenCalled()
  })

  it('tolerates a small crooked wobble without turning', () => {
    twoFingers(el, [150, 200], [250, 200])
    for (const d of [3, -4, 6, -2, 5, 0]) spin(el, d)
    expect(rotate).not.toHaveBeenCalled()
  })

  it('retakes its reference when a third finger joins, rather than snapping', () => {
    twoFingers(el, [150, 200], [250, 200])
    spin(el, 20)
    el.emit('pointerdown', { pointerId: 3, clientX: 400, clientY: 90, pointerType: 'touch' })
    el.emit('pointermove', { pointerId: 3, clientX: 401, clientY: 91, pointerType: 'touch' })
    expect(rotate).not.toHaveBeenCalled()
  })

  it('zooms on a plain wheel and turns on a shifted one', () => {
    el.emit('wheel', { deltaY: -100, clientX: 10, clientY: 10, shiftKey: false })
    expect(zoom).toHaveBeenCalledTimes(1)
    expect(rotate).not.toHaveBeenCalled()

    for (let i = 0; i < 2; i++) el.emit('wheel', { deltaY: 100, clientX: 10, clientY: 10, shiftKey: true })
    expect(rotate).toHaveBeenCalledWith(1)
    expect(zoom).toHaveBeenCalledTimes(1)
  })
})
