import { TileKind, type LevelDef } from '../data/types'
import { room as roomDef } from '../data/rooms'
import { creature as creatureDef } from '../data/creatures'
import { enemy as enemyDef } from '../data/enemies'
import { spell as spellDef } from '../data/spells'
import { trap as trapDef } from '../data/traps'
import { PointerInput, type Point } from '../input/pointerInput'
import { WorldRenderer } from '../render/worldRenderer'
import { Simulation, type Creature, type SimEvent, type SimSnapshot } from './simulation'
import { saveSlot } from './save'
import { audio } from '../audio/audio'

export type Tool =
  | { kind: 'inspect' }
  | { kind: 'dig' }
  | { kind: 'build'; room: string }
  | { kind: 'demolish' }
  | { kind: 'trap'; trap: string }
  | { kind: 'spell'; spell: string }

export interface TileInfo {
  x: number
  y: number
  title: string
  detail: string
  canDig: boolean
  designated: boolean
  roomDefId: string | null
}

export interface HudCreature {
  id: number
  name: string
  defId: string
  state: string
  hp: number
  maxHp: number
  loyalty: number
  level: number
  wage: number
  quirk: string
  x: number
  y: number
}

export interface HudSnapshot {
  levelName: string
  royalties: number
  buzz: number
  reputation: number
  population: number
  capacity: number
  vaultCapacity: number
  elapsed: number
  status: 'playing' | 'won' | 'lost'
  paused: boolean
  speed: number
  fps: number
  tool: Tool
  objectives: { label: string; progress: number; target: number; done: boolean }[]
  events: SimEvent[]
  creatures: HudCreature[]
  /** Intruders currently in the basement, worst first. */
  enemies: { id: number; name: string; hp: number; maxHp: number; state: string }[]
  /** Beaten intruders held in the Contract Office. */
  captives: number
  /** Creatures signed away by scouts, returned if you clear the level. */
  captured: number
  selectedId: number | null
  inspect: TileInfo | null
  rooms: { id: string; name: string; blurb: string; costPerTile: number; color: number; affordable: boolean }[]
  traps: { id: string; name: string; glyph: string; blurb: string; cost: number; affordable: boolean }[]
  spells: { id: string; name: string; glyph: string; blurb: string; cost: number; ready: boolean; cooldown: number }[]
  /** Tiles currently under a build drag, and what they would cost. */
  pendingCost: number
}

const SIM_STEP = 1 / 15
const AUTOSAVE_SECONDS = 30

/**
 * Glue layer: owns the simulation, the renderer and the input abstraction, and
 * publishes a plain snapshot the Vue UI renders from. Keeping the snapshot a
 * dumb object means no reactivity ever reaches into the hot simulation loop.
 */
export class Game {
  sim!: Simulation
  renderer = new WorldRenderer()
  private input?: PointerInput
  private accumulator = 0
  private autosaveIn = AUTOSAVE_SECONDS
  private snapshotIn = 0
  private combatSoundIn = 0

  tool: Tool = { kind: 'inspect' }
  paused = false
  speed = 1
  selectedId: number | null = null
  inspect: TileInfo | null = null
  hints: string[] = []

  private dragTiles: { x: number; y: number; ok: boolean }[] = []
  private dragStartTile: { x: number; y: number } | null = null
  private digErasing = false

  onSnapshot: ((snapshot: HudSnapshot) => void) | null = null
  onHint: ((text: string) => void) | null = null
  onAlert: ((text: string) => void) | null = null
  onWin: (() => void) | null = null
  onLose: (() => void) | null = null

  async start(canvas: HTMLCanvasElement, def: LevelDef, snapshot?: SimSnapshot): Promise<void> {
    this.sim = snapshot ? Simulation.deserialize(def, snapshot) : new Simulation(def)
    await this.renderer.init(canvas, this.sim)
    this.input = new PointerInput(canvas, {
      onTap: (p) => this.handleTap(p),
      onDoubleTap: (p) => this.handleDoubleTap(p),
      onLongPress: (p) => this.handleLongPress(p),
      onDragStart: (p) => this.handleDragStart(p),
      onDragMove: (p) => this.handleDragMove(p),
      onDragEnd: () => this.handleDragEnd(),
      onPan: (dx, dy) => this.renderer.panBy(dx, dy),
      onZoom: (factor, at) => this.renderer.zoomAt(at.x, at.y, factor),
      onRotate: (steps) => this.renderer.rotateView(steps),
      onHover: (p) => this.renderer.setCursor(p ? this.renderer.screenToTileCoord(p.x, p.y) : null),
    })
    this.applyToolMode()
    window.addEventListener('keydown', this.onKeyDown)
    audio.startDrone(def.wing)
    this.renderer.app.ticker.add(() => this.frame())
    this.publish()
  }

  /**
   * Keyboard is a desktop convenience, not a supported control scheme — the
   * brief is mobile-first and every one of these has a gesture behind it.
   */
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target as HTMLElement | null
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
    switch (e.key) {
      case 'q':
      case 'Q':
        this.rotateView(-1)
        break
      case 'e':
      case 'E':
        this.rotateView(1)
        break
      case '+':
      case '=':
        this.zoomBy(1.25)
        break
      case '-':
      case '_':
        this.zoomBy(0.8)
        break
      case '0':
        this.recentre()
        break
      default:
        return
    }
    e.preventDefault()
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    audio.stopDrone()
    this.input?.destroy()
    this.renderer.destroy()
  }

  // ── Frame loop ────────────────────────────────────────────────────────────

  private frame(): void {
    const dtMs = this.renderer.app.ticker.deltaMS
    const dt = Math.min(0.25, dtMs / 1000)

    if (!this.paused && this.sim.status === 'playing') {
      this.accumulator += dt * this.speed
      // Fixed simulation step, capped so a backgrounded tab does not fast-forward.
      let steps = 0
      while (this.accumulator >= SIM_STEP && steps < 6) {
        this.sim.tick(SIM_STEP)
        this.accumulator -= SIM_STEP
        steps++
      }
      if (steps === 6) this.accumulator = 0

      this.autosaveIn -= dt
      if (this.autosaveIn <= 0) {
        this.autosaveIn = AUTOSAVE_SECONDS
        void this.save()
      }
    }

    this.renderer.render()
    this.syncSelection()

    // Swing sounds are driven from here rather than the simulation, which stays
    // free of audio for the same reason it stays free of rendering.
    this.combatSoundIn -= dt
    if (this.combatSoundIn <= 0 && this.sim.creatures.some((c) => c.state === 'fighting')) {
      this.combatSoundIn = 0.55
      audio.play('hit')
    }

    if (this.sim.pendingHints.length > 0) {
      for (const hint of this.sim.pendingHints) this.onHint?.(hint)
      this.sim.pendingHints.length = 0
    }
    if (this.sim.pendingAlerts.length > 0) {
      audio.play('alert')
      for (const alert of this.sim.pendingAlerts) this.onAlert?.(alert)
      this.sim.pendingAlerts.length = 0
    }

    if (this.sim.status !== 'playing' && !this.paused) {
      this.paused = true
      void this.save()
      audio.play(this.sim.status === 'won' ? 'win' : 'lose')
      if (this.sim.status === 'won') this.onWin?.()
      else this.onLose?.()
      this.publish()
    }

    this.snapshotIn -= dt
    if (this.snapshotIn <= 0) {
      this.snapshotIn = 0.12
      this.publish()
    }
  }

  private syncSelection(): void {
    const selected = this.selectedCreature()
    if (selected) this.renderer.setSelection({ x: selected.x, y: selected.y })
    else if (this.inspect) this.renderer.setSelection({ x: this.inspect.x, y: this.inspect.y })
    else this.renderer.setSelection(null)
  }

  // ── Player intent ─────────────────────────────────────────────────────────

  setTool(tool: Tool): void {
    this.tool = tool
    this.applyToolMode()
    this.publish()
  }

  private applyToolMode(): void {
    if (!this.input) return
    // Only painting tools take over single-finger drag; everything else pans.
    this.input.paintMode = this.tool.kind === 'dig' || this.tool.kind === 'build' || this.tool.kind === 'demolish'
    this.dragTiles = []
    this.renderer.setGhost([], 0xffffff)
  }

  selectCreature(id: number | null): void {
    this.selectedId = id
    if (id !== null) {
      const c = this.sim.creatures.find((x) => x.id === id)
      if (c) this.renderer.centerOn(c.x, c.y)
    }
    this.publish()
  }

  selectedCreature(): Creature | null {
    if (this.selectedId === null) return null
    return this.sim.creatures.find((c) => c.id === this.selectedId) ?? null
  }

  zoomBy(factor: number): void {
    this.renderer.zoomBy(factor)
  }

  rotateView(steps: number): void {
    this.renderer.rotateView(steps)
  }

  /** Back to the selected creature, or to the starting chamber. */
  recentre(): void {
    const selected = this.selectedCreature()
    if (selected) this.renderer.centerOn(selected.x, selected.y)
    else this.renderer.centerOn(this.sim.def.heart.x, this.sim.def.heart.y)
  }

  togglePause(): void {
    this.paused = !this.paused
    this.publish()
  }

  setSpeed(speed: number): void {
    this.speed = speed
    this.publish()
  }

  async save(slotId = 'auto'): Promise<void> {
    if (!this.sim) return
    await saveSlot(slotId, this.sim.serialize())
  }

  // ── Pointer handling ──────────────────────────────────────────────────────

  private tileAt(p: Point): { x: number; y: number } {
    return this.renderer.screenToTileCoord(p.x, p.y)
  }

  private handleTap(p: Point): void {
    const tile = this.tileAt(p)
    switch (this.tool.kind) {
      case 'inspect': {
        const hit = this.creatureNear(p)
        if (hit) {
          this.selectedId = hit.id
          this.inspect = null
          audio.play('select')
        } else {
          this.selectedId = null
          this.inspect = this.describeTile(tile.x, tile.y)
        }
        break
      }
      case 'dig': {
        const i = this.sim.grid.idx(tile.x, tile.y)
        const on = this.sim.grid.inBounds(tile.x, tile.y) ? !this.sim.grid.designated[i] : true
        if (this.sim.designate(tile.x, tile.y, on)) audio.play('dig')
        break
      }
      case 'build': {
        this.commitBuild([tile])
        break
      }
      case 'demolish': {
        // Tear down lifts whatever is on the tile, trap or room.
        if (!this.sim.removeTrap(tile.x, tile.y)) this.sim.demolish(tile.x, tile.y)
        break
      }
      case 'trap': {
        if (this.sim.placeTrap(this.tool.trap, tile.x, tile.y)) audio.play('build')
        break
      }
      case 'spell': {
        this.castAt(this.tool.spell, tile, p)
        break
      }
    }
    this.publish()
  }

  private handleDoubleTap(p: Point): void {
    const selected = this.selectedCreature()
    if (selected) this.renderer.centerOn(selected.x, selected.y)
    else {
      const tile = this.tileAt(p)
      this.renderer.centerOn(tile.x, tile.y)
    }
  }

  private handleLongPress(p: Point): void {
    const tile = this.tileAt(p)
    const hit = this.creatureNear(p)
    if (hit) {
      this.selectedId = hit.id
      this.inspect = null
    } else {
      this.selectedId = null
      this.inspect = this.describeTile(tile.x, tile.y)
    }
    this.publish()
  }

  private handleDragStart(p: Point): void {
    const tile = this.tileAt(p)
    this.dragStartTile = tile
    if (this.tool.kind === 'dig') {
      const i = this.sim.grid.idx(tile.x, tile.y)
      this.digErasing = this.sim.grid.inBounds(tile.x, tile.y) && this.sim.grid.designated[i] === 1
      this.sim.designate(tile.x, tile.y, !this.digErasing)
    }
    this.handleDragMove(p)
  }

  private handleDragMove(p: Point): void {
    const tile = this.tileAt(p)
    if (this.tool.kind === 'dig') {
      this.sim.designate(tile.x, tile.y, !this.digErasing)
      return
    }
    if (this.tool.kind === 'demolish') {
      if (!this.sim.removeTrap(tile.x, tile.y)) this.sim.demolish(tile.x, tile.y)
      return
    }
    if (this.tool.kind === 'build' && this.dragStartTile) {
      // Rooms drag out as a rectangle: predictable on a small screen, and it
      // matches how people think about rooms.
      const x0 = Math.min(this.dragStartTile.x, tile.x)
      const x1 = Math.max(this.dragStartTile.x, tile.x)
      const y0 = Math.min(this.dragStartTile.y, tile.y)
      const y1 = Math.max(this.dragStartTile.y, tile.y)
      const tiles: { x: number; y: number; ok: boolean }[] = []
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          tiles.push({ x, y, ok: this.sim.canBuildAt(this.tool.room, x, y) })
        }
      }
      this.dragTiles = tiles
      this.renderer.setGhost(tiles, roomDef(this.tool.room).accent)
      this.publish()
    }
  }

  private handleDragEnd(): void {
    if (this.tool.kind === 'build' && this.dragTiles.length > 0) {
      this.commitBuild(this.dragTiles.filter((t) => t.ok))
    }
    this.dragTiles = []
    this.dragStartTile = null
    this.renderer.setGhost([], 0xffffff)
    this.publish()
  }

  private commitBuild(tiles: { x: number; y: number }[]): void {
    if (this.tool.kind !== 'build') return
    const result = this.sim.build(this.tool.room, tiles)
    if (result.placed > 0) {
      audio.play('build')
      this.sim.log(`${roomDef(this.tool.room).name}: ${result.placed} tiles, ${result.spent} Royalties.`, 'info')
    }
  }

  private castAt(spellId: string, tile: { x: number; y: number }, p: Point): void {
    const def = spellDef(spellId)
    let ok = false
    if (def.targeting === 'creature') {
      const hit = this.creatureNear(p)
      if (hit) ok = this.sim.castSpell(spellId, hit)
    } else if (def.targeting === 'tile') {
      ok = this.sim.castSpell(spellId, tile)
    } else {
      ok = this.sim.castSpell(spellId)
    }
    if (ok) this.setTool({ kind: 'inspect' })
  }

  /** Cast a no-target spell straight from the dock. */
  castUntargeted(spellId: string): void {
    if (spellDef(spellId).targeting === 'none') {
      this.sim.castSpell(spellId)
      this.publish()
    } else {
      this.setTool({ kind: 'spell', spell: spellId })
    }
  }

  /** Hit-test with a generous radius: fingers are not precise instruments. */
  private creatureNear(p: Point): Creature | null {
    const tile = this.renderer.screenToTileFloat(p.x, p.y)
    return this.sim.creatureAt(tile.x, tile.y, 1.1)
  }

  private describeTile(x: number, y: number): TileInfo | null {
    const grid = this.sim.grid
    if (!grid.inBounds(x, y)) return null
    const i = grid.idx(x, y)
    if (!grid.seen[i]) {
      return { x, y, title: 'Unexplored', detail: 'You have not dug this far.', canDig: false, designated: false, roomDefId: null }
    }
    const kind = grid.kindAt(x, y)
    const instance = grid.roomId[i] ? this.sim.rooms.get(grid.roomId[i]!) : undefined
    const pile = grid.pile[i]!

    const laid = this.sim.trapAt(x, y)
    if (laid) {
      const def = trapDef(laid.def)
      return {
        x,
        y,
        title: def.name,
        detail:
          laid.armIn > 0
            ? `Arming — ${Math.ceil(laid.armIn)}s. ${def.blurb}`
            : `Live, ${laid.charges} charge(s) left. ${def.blurb}`,
        canDig: false,
        designated: false,
        roomDefId: null,
      }
    }

    if (instance) {
      const def = roomDef(instance.def)
      const undersized = instance.tiles < def.minTiles
      return {
        x,
        y,
        title: def.name,
        detail: `${instance.tiles} tiles${undersized ? ` — needs ${def.minTiles} to work` : ''}. ${def.blurb}`,
        canDig: false,
        designated: false,
        roomDefId: instance.def,
      }
    }

    switch (kind) {
      case TileKind.Vein:
        return {
          x,
          y,
          title: 'Royalty Vein',
          detail: `About ${grid.vein[i]} Royalties in there. Someone has to dig it out.`,
          canDig: true,
          designated: grid.designated[i] === 1,
          roomDefId: null,
        }
      case TileKind.Rock:
        return {
          x,
          y,
          title: 'Rock',
          detail: 'Damp, structural, in the way.',
          canDig: true,
          designated: grid.designated[i] === 1,
          roomDefId: null,
        }
      case TileKind.Bedrock:
        return { x, y, title: 'Bedrock', detail: 'The edge of the lease.', canDig: false, designated: false, roomDefId: null }
      case TileKind.Water:
        return { x, y, title: 'Flooded', detail: 'Impassable. A Merch Stand would bridge it.', canDig: false, designated: false, roomDefId: null }
      default:
        return {
          x,
          y,
          title: grid.claimed[i] ? 'Basement Floor' : 'Unclaimed Floor',
          detail: pile > 0 ? `${pile} loose Royalties on the ground.` : 'Dug out. Build something here.',
          canDig: false,
          designated: false,
          roomDefId: null,
        }
    }
  }

  // ── Snapshot for the UI ───────────────────────────────────────────────────

  publish(): void {
    if (!this.onSnapshot || !this.sim) return
    const sim = this.sim
    const pendingCost =
      this.tool.kind === 'build'
        ? this.dragTiles.filter((t) => t.ok).length * roomDef(this.tool.room).costPerTile
        : 0

    this.onSnapshot({
      levelName: sim.def.name,
      royalties: Math.floor(sim.royalties),
      buzz: Math.floor(sim.buzz),
      reputation: Math.round(sim.reputation),
      population: sim.population,
      capacity: sim.capacity,
      vaultCapacity: sim.vaultCapacity,
      elapsed: sim.elapsed,
      status: sim.status,
      paused: this.paused,
      speed: this.speed,
      fps: Math.round(this.renderer.app?.ticker.FPS ?? 0),
      tool: this.tool,
      objectives: sim.objectiveStates.map((s) => ({
        label: s.objective.label,
        progress: Math.floor(s.progress),
        target: s.target,
        done: s.done,
      })),
      events: [...sim.events].slice(-8).reverse(),
      creatures: sim.creatures.map((c) => {
        const def = creatureDef(c.def)
        return {
          id: c.id,
          name: def.name,
          defId: c.def,
          state: c.state,
          hp: Math.round(c.hp),
          maxHp: c.maxHp,
          loyalty: Math.round(c.loyalty),
          level: c.level,
          wage: def.wage,
          quirk: def.quirk,
          x: c.x,
          y: c.y,
        }
      }),
      enemies: sim.enemies
        .filter((e) => e.state !== 'captive')
        .map((e) => ({
          id: e.id,
          name: enemyDef(e.def).name,
          hp: Math.max(0, Math.round(e.hp)),
          maxHp: e.maxHp,
          state: e.state,
        }))
        .sort((a, b) => b.maxHp - a.maxHp),
      captives: sim.enemies.filter((e) => e.state === 'captive').length,
      captured: sim.capturedCreatures.length,
      selectedId: this.selectedId,
      inspect: this.inspect,
      rooms: sim.def.rooms.map((id) => {
        const def = roomDef(id)
        return {
          id,
          name: def.name,
          blurb: def.blurb,
          costPerTile: def.costPerTile,
          color: def.color,
          affordable: sim.royalties >= def.costPerTile,
        }
      }),
      traps: sim.def.traps.map((id) => {
        const def = trapDef(id)
        return {
          id,
          name: def.name,
          glyph: def.glyph,
          blurb: def.blurb,
          cost: def.cost,
          affordable: sim.royalties >= def.cost,
        }
      }),
      spells: sim.def.spells.map((id) => {
        const def = spellDef(id)
        return {
          id,
          name: def.name,
          glyph: def.glyph,
          blurb: def.blurb,
          cost: def.cost,
          ready: sim.spellReady(id),
          cooldown: Math.ceil(sim.cooldownLeft(id)),
        }
      }),
      pendingCost,
    })
  }
}
