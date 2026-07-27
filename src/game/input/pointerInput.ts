export interface Point {
  x: number
  y: number
}

export interface PointerHandlers {
  onTap?(p: Point): void
  onDoubleTap?(p: Point): void
  onLongPress?(p: Point): void
  onDragStart?(p: Point): void
  onDragMove?(p: Point): void
  onDragEnd?(p: Point): void
  /** Camera pan, in screen pixels. */
  onPan?(dx: number, dy: number): void
  /** Multiplicative zoom around a screen point. */
  onZoom?(factor: number, at: Point): void
  /** Quarter-turns of the view, positive clockwise. */
  onRotate?(steps: number): void
  /** Mouse only; touch reports null on release. */
  onHover?(p: Point | null): void
}

interface TrackedPointer {
  id: number
  x: number
  y: number
  startX: number
  startY: number
  startTime: number
  moved: boolean
}

const DRAG_THRESHOLD = 8
const TAP_MAX_MS = 350
const DOUBLE_TAP_MS = 320
const DOUBLE_TAP_DIST = 36
const LONG_PRESS_MS = 480
/**
 * How far two fingers have to twist before the view turns a quarter.
 *
 * Generous on purpose: a pinch is never perfectly parallel, and a view that
 * spins because you zoomed in slightly crooked is worse than one that needs a
 * deliberate turn of the wrist.
 */
const TWIST_PER_STEP = Math.PI / 3
/** Shift-wheel notches to turn a quarter, for the same reason. */
const WHEEL_TWIST_PER_STEP = 2

/**
 * One pointer abstraction for touch, pen and mouse — built on day one, per the
 * brief, precisely so touch never becomes a special case bolted on later.
 *
 * Gesture rules:
 *  - one pointer, `paintMode` off → camera pan
 *  - one pointer, `paintMode` on  → drag paint (dig designation, room footprint)
 *  - two pointers                 → pinch zoom + two-finger pan, always
 *  - two pointers, twisted         → turn the view a quarter at a time
 *  - short press without movement  → tap; two in quick succession → double tap
 *  - press and hold                → long press (inspect)
 *  - wheel / trackpad              → zoom; with shift held, turn the view
 */
export class PointerInput {
  /** When true a single-pointer drag paints instead of panning the camera. */
  paintMode = false

  private readonly element: HTMLElement
  private readonly handlers: PointerHandlers
  private pointers = new Map<number, TrackedPointer>()
  private dragging = false
  private lastTapTime = 0
  private lastTapPoint: Point = { x: 0, y: 0 }
  private longPressTimer: number | null = null
  private pinchDistance = 0
  private pinchCenter: Point = { x: 0, y: 0 }
  private pinchAngle = 0
  /** Which two pointers the pinch reference values belong to. */
  private pinchPair = ''
  /** Twist banked since the last quarter-turn, in radians. */
  private twist = 0
  private wheelTwist = 0
  private suppressTapUntil = 0

  constructor(element: HTMLElement, handlers: PointerHandlers) {
    this.element = element
    this.handlers = handlers
    element.style.touchAction = 'none'
    element.addEventListener('pointerdown', this.onPointerDown)
    element.addEventListener('pointermove', this.onPointerMove)
    element.addEventListener('pointerup', this.onPointerUp)
    element.addEventListener('pointercancel', this.onPointerUp)
    element.addEventListener('pointerleave', this.onPointerLeave)
    element.addEventListener('wheel', this.onWheel, { passive: false })
    element.addEventListener('contextmenu', this.onContextMenu)
  }

  destroy(): void {
    const el = this.element
    el.removeEventListener('pointerdown', this.onPointerDown)
    el.removeEventListener('pointermove', this.onPointerMove)
    el.removeEventListener('pointerup', this.onPointerUp)
    el.removeEventListener('pointercancel', this.onPointerUp)
    el.removeEventListener('pointerleave', this.onPointerLeave)
    el.removeEventListener('wheel', this.onWheel)
    el.removeEventListener('contextmenu', this.onContextMenu)
    this.clearLongPress()
  }

  private local(e: PointerEvent | WheelEvent): Point {
    const rect = this.element.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
  }

  private onContextMenu = (e: Event) => e.preventDefault()

  private onPointerDown = (e: PointerEvent) => {
    const p = this.local(e)
    this.element.setPointerCapture?.(e.pointerId)
    this.pointers.set(e.pointerId, {
      id: e.pointerId,
      x: p.x,
      y: p.y,
      startX: p.x,
      startY: p.y,
      startTime: performance.now(),
      moved: false,
    })

    if (this.pointers.size === 1) {
      this.clearLongPress()
      this.longPressTimer = window.setTimeout(() => {
        const tracked = this.pointers.get(e.pointerId)
        if (tracked && !tracked.moved) {
          this.suppressTapUntil = performance.now() + 400
          this.handlers.onLongPress?.({ x: tracked.x, y: tracked.y })
        }
      }, LONG_PRESS_MS)
    } else if (this.pointers.size === 2) {
      this.clearLongPress()
      this.endDrag(p)
      const [a, b] = [...this.pointers.values()]
      this.pinchDistance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      this.pinchCenter = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }
      this.pinchAngle = Math.atan2(b!.y - a!.y, b!.x - a!.x)
      this.pinchPair = `${a!.id}-${b!.id}`
      this.twist = 0
    }
    e.preventDefault()
  }

  private onPointerMove = (e: PointerEvent) => {
    const p = this.local(e)
    const tracked = this.pointers.get(e.pointerId)

    if (!tracked) {
      if (e.pointerType === 'mouse') this.handlers.onHover?.(p)
      return
    }

    const prevX = tracked.x
    const prevY = tracked.y
    tracked.x = p.x
    tracked.y = p.y
    if (!tracked.moved && Math.hypot(p.x - tracked.startX, p.y - tracked.startY) > DRAG_THRESHOLD) {
      tracked.moved = true
      this.clearLongPress()
    }

    if (this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()]
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
      const center = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }
      const angle = Math.atan2(b!.y - a!.y, b!.x - a!.x)
      const pair = `${a!.id}-${b!.id}`

      // A finger added or lifted changes which two we are measuring, so the
      // reference has to be retaken or the view snaps.
      if (pair !== this.pinchPair) {
        this.pinchPair = pair
        this.pinchDistance = distance
        this.pinchCenter = center
        this.pinchAngle = angle
        this.twist = 0
        e.preventDefault()
        return
      }

      if (this.pinchDistance > 0 && distance > 0) {
        const factor = distance / this.pinchDistance
        if (Math.abs(factor - 1) > 0.002) this.handlers.onZoom?.(factor, center)
      }
      this.handlers.onPan?.(center.x - this.pinchCenter.x, center.y - this.pinchCenter.y)

      this.twist += shortestAngle(angle - this.pinchAngle)
      while (Math.abs(this.twist) >= TWIST_PER_STEP) {
        const step = this.twist > 0 ? 1 : -1
        this.twist -= step * TWIST_PER_STEP
        this.handlers.onRotate?.(step)
      }

      this.pinchDistance = distance
      this.pinchCenter = center
      this.pinchAngle = angle
      e.preventDefault()
      return
    }

    if (!tracked.moved) return

    if (this.paintMode) {
      if (!this.dragging) {
        this.dragging = true
        this.handlers.onDragStart?.({ x: tracked.startX, y: tracked.startY })
      }
      this.handlers.onDragMove?.(p)
    } else {
      this.handlers.onPan?.(p.x - prevX, p.y - prevY)
    }
    e.preventDefault()
  }

  private onPointerUp = (e: PointerEvent) => {
    const tracked = this.pointers.get(e.pointerId)
    this.pointers.delete(e.pointerId)
    this.element.releasePointerCapture?.(e.pointerId)
    this.clearLongPress()
    if (!tracked) return

    const p = { x: tracked.x, y: tracked.y }
    if (this.pointers.size >= 1) {
      // Lifting one finger of a pinch: re-anchor so the remaining one does not jump.
      const remaining = [...this.pointers.values()]
      this.pinchCenter = { x: remaining[0]!.x, y: remaining[0]!.y }
      this.pinchDistance = 0
      this.pinchPair = ''
      this.twist = 0
      this.suppressTapUntil = performance.now() + 250
      return
    }

    if (this.dragging) {
      this.endDrag(p)
      return
    }

    const elapsed = performance.now() - tracked.startTime
    if (tracked.moved || elapsed > TAP_MAX_MS || performance.now() < this.suppressTapUntil) return

    const now = performance.now()
    const isDouble =
      now - this.lastTapTime < DOUBLE_TAP_MS &&
      Math.hypot(p.x - this.lastTapPoint.x, p.y - this.lastTapPoint.y) < DOUBLE_TAP_DIST
    this.lastTapTime = now
    this.lastTapPoint = p
    if (isDouble) {
      this.lastTapTime = 0
      this.handlers.onDoubleTap?.(p)
    } else {
      this.handlers.onTap?.(p)
    }
  }

  private onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') this.handlers.onHover?.(null)
  }

  private endDrag(p: Point): void {
    if (!this.dragging) return
    this.dragging = false
    this.handlers.onDragEnd?.(p)
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    // Shift is the desktop stand-in for a twist: nobody rotates a map with a
    // mouse wheel by accident, and there is no second finger to twist with.
    if (e.shiftKey) {
      this.wheelTwist += e.deltaY < 0 ? -1 : 1
      while (Math.abs(this.wheelTwist) >= WHEEL_TWIST_PER_STEP) {
        const step = this.wheelTwist > 0 ? 1 : -1
        this.wheelTwist -= step * WHEEL_TWIST_PER_STEP
        this.handlers.onRotate?.(step)
      }
      return
    }
    this.wheelTwist = 0
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    this.handlers.onZoom?.(factor, this.local(e))
  }
}

/** Wraps an angle difference to −π…π so a twist past due-south is not a spin. */
function shortestAngle(radians: number): number {
  let a = radians
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}
