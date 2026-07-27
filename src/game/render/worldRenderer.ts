import { Application, Container, Sprite, Text, TextStyle, type Texture } from 'pixi.js'
import { TileKind } from '../data/types'
import { room as roomDef } from '../data/rooms'
import { creature as creatureDef } from '../data/creatures'
import { enemy as enemyDef } from '../data/enemies'
import { wingTheme } from '../data/wings'
import type { Creature, Simulation } from '../core/simulation'
import { buildAtlas, CELL_ANCHOR, type Atlas } from './atlas'
import {
  BLOCK_H,
  depth,
  getViewRotation,
  screenToTile,
  setViewGrid,
  setViewRotation,
  tileToScreen,
  TILE_H,
  TILE_W,
} from './iso'

interface TileSprites {
  floor?: Sprite
  claim?: Sprite
  block?: Sprite
  fleck?: Sprite
  designate?: Sprite
  pile?: Sprite
}

/** One on-screen body — creature or intruder, they render the same way. */
interface ActorView {
  root: Container
  body: Sprite
  face: Sprite
  shadow: Sprite
  carry: Sprite
  barBg: Sprite
  barFill: Sprite
  threat?: Sprite
  bark?: Text
}

const MIN_ZOOM = 0.45
const MAX_ZOOM = 2.4

/**
 * Pixi layer. Owns the camera, the tile sprite pool and the creature views;
 * knows nothing about input or UI. Tiles are only rebuilt when the simulation
 * marks them dirty, so a steady-state frame is a transform update and a
 * handful of sprite moves.
 */
export class WorldRenderer {
  app!: Application
  atlas!: Atlas

  private world = new Container()
  private groundLayer = new Container()
  private sortLayer = new Container()
  private ghostLayer = new Container()
  private tiles: TileSprites[] = []
  private creatureViews = new Map<number, ActorView>()
  private enemyViews = new Map<number, ActorView>()
  private selectionSprite?: Sprite
  private cursorSprite?: Sprite
  private sim!: Simulation
  private barkStyle!: TextStyle

  camera = { x: 0, y: 0, zoom: 1 }

  async init(canvas: HTMLCanvasElement, sim: Simulation): Promise<void> {
    this.sim = sim
    this.app = new Application()
    await this.app.init({
      canvas,
      antialias: false,
      backgroundColor: 0x0d0b10,
      // Cap device pixel ratio: a 3× phone screen triples fill cost for very
      // little visible gain on chunky sprite art.
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      resizeTo: canvas.parentElement ?? window,
      powerPreference: 'high-performance',
    })

    const built = buildAtlas(this.app.renderer)
    this.atlas = built.atlas

    this.sortLayer.sortableChildren = true
    this.world.addChild(this.groundLayer, this.ghostLayer, this.sortLayer)
    this.app.stage.addChild(this.world)

    this.barkStyle = new TextStyle({
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: 13,
      fill: 0xf2ead8,
      stroke: { color: 0x120f16, width: 4 },
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 190,
    })

    setViewGrid(sim.grid.width, sim.grid.height)
    this.tiles = new Array(sim.grid.width * sim.grid.height).fill(null).map(() => ({}))
    this.selectionSprite = this.makeSprite(this.atlas.select, this.sortLayer)
    this.selectionSprite.visible = false
    this.selectionSprite.tint = 0xffe27a
    this.cursorSprite = this.makeSprite(this.atlas.select, this.sortLayer)
    this.cursorSprite.visible = false
    this.cursorSprite.tint = 0x8fd6ff

    sim.markAllDirty()
    this.syncTiles()
    this.fitInitialZoom()
    this.centerOn(sim.def.heart.x, sim.def.heart.y)
  }

  destroy(): void {
    this.creatureViews.clear()
    this.enemyViews.clear()
    this.app?.destroy(false, { children: true, texture: true })
  }

  private makeSprite(texture: Texture, parent: Container): Sprite {
    const sprite = new Sprite(texture)
    sprite.anchor.set(CELL_ANCHOR.x, CELL_ANCHOR.y)
    parent.addChild(sprite)
    return sprite
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  /**
   * Picks an opening zoom that shows roughly a 12-tile-tall slice of basement.
   * Phone landscape viewports are short, and a fixed 1× either crops the
   * starting chamber or leaves a tablet looking at postage stamps.
   */
  private fitInitialZoom(): void {
    const usableHeight = Math.max(160, this.app.screen.height - 150)
    const desiredTiles = 12
    this.camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, usableHeight / (desiredTiles * TILE_H)))
  }

  /** Turns the view 90°. The grid is untouched; only the projection changes. */
  rotateView(steps: number): void {
    // Keep whatever is in the middle of the screen in the middle of the screen.
    const centre = this.screenToTileFloat(this.app.screen.width / 2, this.app.screen.height / 2)
    setViewRotation(getViewRotation() + steps)
    this.sim.markAllDirty()
    this.syncTiles()
    this.centerOn(centre.x, centre.y)
  }

  get rotation(): number {
    return getViewRotation()
  }

  /** Stepped zoom for the on-screen buttons; pinch uses zoomAt directly. */
  zoomBy(factor: number): void {
    this.zoomAt(this.app.screen.width / 2, this.app.screen.height / 2, factor)
  }

  centerOn(tileX: number, tileY: number): void {
    const { sx, sy } = tileToScreen(tileX, tileY)
    this.camera.x = this.app.screen.width / 2 - sx * this.camera.zoom
    this.camera.y = this.app.screen.height / 2 - sy * this.camera.zoom
    this.applyCamera()
  }

  panBy(dx: number, dy: number): void {
    this.camera.x += dx
    this.camera.y += dy
    this.applyCamera()
  }

  zoomAt(screenX: number, screenY: number, factor: number): void {
    const before = this.screenToWorld(screenX, screenY)
    this.camera.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.camera.zoom * factor))
    const after = this.screenToWorld(screenX, screenY)
    this.camera.x += (after.x - before.x) * this.camera.zoom
    this.camera.y += (after.y - before.y) * this.camera.zoom
    this.applyCamera()
  }

  private applyCamera(): void {
    // Keep at least a corner of the level on screen no matter how far you fling.
    const halfW = (this.sim.grid.width + this.sim.grid.height) * (TILE_W / 4) * this.camera.zoom
    const spanH = (this.sim.grid.width + this.sim.grid.height) * (TILE_H / 2) * this.camera.zoom
    const margin = 120
    this.camera.x = Math.min(halfW + margin, Math.max(this.app.screen.width - halfW - margin, this.camera.x))
    this.camera.y = Math.min(margin + spanH * 0.15, Math.max(this.app.screen.height - spanH - margin, this.camera.y))

    this.world.position.set(this.camera.x, this.camera.y)
    this.world.scale.set(this.camera.zoom)
  }

  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.camera.x) / this.camera.zoom,
      y: (screenY - this.camera.y) / this.camera.zoom,
    }
  }

  /** Screen pixel → fractional tile coordinate. */
  screenToTileFloat(screenX: number, screenY: number): { x: number; y: number } {
    const world = this.screenToWorld(screenX, screenY)
    return screenToTile(world.x, world.y)
  }

  /**
   * Screen pixel → the tile you visually tapped.
   *
   * Solid tiles are drawn as blocks standing `BLOCK_H` above their own floor
   * diamond, so a finger on a wall's top face is geometrically over the tile
   * *behind* it. Test the raised interpretation first and prefer it when it
   * lands on something solid; otherwise fall back to the ground plane.
   */
  screenToTileCoord(screenX: number, screenY: number): { x: number; y: number } {
    const world = this.screenToWorld(screenX, screenY)
    const raised = screenToTile(world.x, world.y + BLOCK_H)
    const rx = Math.round(raised.x)
    const ry = Math.round(raised.y)
    if (this.sim.grid.solid(rx, ry) && this.sim.grid.seen[this.sim.grid.idx(rx, ry)]) {
      return { x: rx, y: ry }
    }
    const ground = screenToTile(world.x, world.y)
    return { x: Math.round(ground.x), y: Math.round(ground.y) }
  }

  // ── Per-frame sync ────────────────────────────────────────────────────────

  render(): void {
    this.syncTiles()
    this.syncCreatures()
  }

  private syncTiles(): void {
    if (this.sim.dirty.size === 0) return
    for (const index of this.sim.dirty) this.updateTile(index)
    this.sim.dirty.clear()
  }

  private updateTile(index: number): void {
    const grid = this.sim.grid
    const x = index % grid.width
    const y = Math.floor(index / grid.width)
    const slot = this.tiles[index]!
    const theme = wingTheme(this.sim.def.wing)
    const seen = grid.seen[index] === 1
    const kind = grid.kindAt(x, y)
    const { sx, sy } = tileToScreen(x, y)

    const setSprite = (
      key: keyof TileSprites,
      texture: Texture | null,
      parent: Container,
      tint: number,
      z: number,
      alpha = 1,
    ) => {
      if (!texture || !seen) {
        if (slot[key]) {
          slot[key]!.destroy()
          slot[key] = undefined
        }
        return
      }
      let sprite = slot[key]
      if (!sprite) {
        sprite = this.makeSprite(texture, parent)
        slot[key] = sprite
      }
      sprite.texture = texture
      sprite.position.set(sx, sy)
      sprite.tint = tint
      sprite.alpha = alpha
      sprite.zIndex = z
      sprite.visible = true
    }

    const isSolid = kind === TileKind.Rock || kind === TileKind.Vein || kind === TileKind.Bedrock
    const room = grid.roomId[index] ? this.sim.rooms.get(grid.roomId[index]!) : undefined

    // Ground: every non-solid tile gets a floor diamond.
    if (isSolid) {
      setSprite('floor', null, this.groundLayer, 0, 0)
    } else if (kind === TileKind.Water) {
      setSprite('floor', this.atlas.water, this.groundLayer, 0x2b4a6b, 0)
    } else if (room) {
      const def = roomDef(room.def)
      setSprite('floor', this.atlas.floorRoom, this.groundLayer, def.color, 0)
    } else {
      const claimed = grid.claimed[index] === 1
      setSprite('floor', this.atlas.floor, this.groundLayer, claimed ? theme.floor : 0x241f1d, 0)
    }

    // Owned ground carries your mark, so the basement you actually hold reads at
    // a glance from the ground you have merely dug through.
    const owned = !isSolid && kind !== TileKind.Water && grid.claimed[index] === 1 && !room
    setSprite('claim', owned ? this.atlas.claim : null, this.groundLayer, theme.light, 1, 0.75)

    // Solids: a raised block, plus gold flecks for veins.
    if (isSolid) {
      const tint = kind === TileKind.Bedrock ? 0x191519 : theme.rock
      setSprite('block', this.atlas.block, this.sortLayer, tint, depth(x, y))
      setSprite(
        'fleck',
        kind === TileKind.Vein ? this.atlas.blockFleck : null,
        this.sortLayer,
        0xffd166,
        depth(x, y) + 1,
      )
    } else {
      setSprite('block', null, this.sortLayer, 0, 0)
      setSprite('fleck', null, this.sortLayer, 0, 0)
    }

    setSprite(
      'designate',
      grid.designated[index] ? this.atlas.designate : null,
      this.sortLayer,
      theme.light,
      depth(x, y) + 2,
      0.9,
    )

    setSprite('pile', grid.pile[index]! > 0 ? this.atlas.pile : null, this.sortLayer, 0xffd166, depth(x, y) + 1)
  }

  private syncCreatures(): void {
    const alive = new Set<number>()
    for (const c of this.sim.creatures) {
      alive.add(c.id)
      let view = this.creatureViews.get(c.id)
      if (!view) {
        const def = creatureDef(c.def)
        view = this.createActorView(def.build, def.color, def.accent, false)
        this.creatureViews.set(c.id, view)
      }
      const { sx, sy } = tileToScreen(c.x, c.y)
      view.root.position.set(sx, sy)
      view.root.zIndex = depth(c.x, c.y) + 4
      view.carry.visible = c.carrying > 0
      const working = c.state === 'digging' || c.state === 'hauling' || c.state === 'training'
      const fighting = c.state === 'fighting'
      // A tiny bob while working: cheap, and it stops the basement looking dead.
      view.body.y = working || fighting ? Math.sin(this.sim.elapsed * (fighting ? 14 : 9) + c.id) * 2 : 0
      view.face.y = view.body.y
      this.setBar(view, c.hp / c.maxHp, 0x7fd6a2)
      this.syncBark(c, view)
    }

    for (const [id, view] of this.creatureViews) {
      if (alive.has(id)) continue
      view.root.destroy({ children: true })
      this.creatureViews.delete(id)
    }

    this.syncEnemies()
  }

  private syncEnemies(): void {
    const alive = new Set<number>()
    for (const e of this.sim.enemies) {
      alive.add(e.id)
      let view = this.enemyViews.get(e.id)
      if (!view) {
        const def = enemyDef(e.def)
        view = this.createActorView(def.build, def.color, def.accent, true)
        this.enemyViews.set(e.id, view)
      }
      const { sx, sy } = tileToScreen(e.x, e.y)
      view.root.position.set(sx, sy)
      view.root.zIndex = depth(e.x, e.y) + 4
      view.carry.visible = e.carrying > 0
      // Beaten intruders lie down; captives sit quietly in the Contract Office.
      const down = e.state === 'downed'
      view.body.rotation = down ? 1.3 : 0
      view.face.visible = !down
      view.root.alpha = e.state === 'captive' ? 0.65 : 1
      if (view.threat) view.threat.visible = !down && e.state !== 'captive'
      this.setBar(view, e.hp / e.maxHp, 0xff4d5a)
    }

    for (const [id, view] of this.enemyViews) {
      if (alive.has(id)) continue
      view.root.destroy({ children: true })
      this.enemyViews.delete(id)
    }
  }

  /** Health bars only appear once something has actually been hit. */
  private setBar(view: ActorView, ratio: number, tint: number): void {
    const show = ratio < 0.999
    view.barBg.visible = show
    view.barFill.visible = show
    if (!show) return
    view.barFill.scale.x = Math.max(0, Math.min(1, ratio))
    view.barFill.tint = tint
  }

  private createActorView(
    build: 'squat' | 'tall' | 'wisp',
    color: number,
    accent: number,
    isEnemy: boolean,
  ): ActorView {
    const root = new Container()
    const shadow = new Sprite(this.atlas.shadow)
    const bodyTexture =
      build === 'tall' ? this.atlas.bodyTall : build === 'wisp' ? this.atlas.bodyWisp : this.atlas.bodySquat
    const body = new Sprite(bodyTexture)
    const face = new Sprite(this.atlas.face)
    const carry = new Sprite(this.atlas.coin)
    const barBg = new Sprite(this.atlas.bar)
    const barFill = new Sprite(this.atlas.bar)

    for (const sprite of [shadow, body, face, carry, barBg, barFill]) {
      sprite.anchor.set(CELL_ANCHOR.x, CELL_ANCHOR.y)
      root.addChild(sprite)
    }
    body.tint = color
    face.tint = accent
    carry.tint = 0xffd166
    carry.y = -BLOCK_H - 12
    carry.visible = false

    barBg.y = -BLOCK_H - 22
    barBg.tint = 0x1a1720
    barBg.visible = false
    barFill.y = barBg.y
    // Anchored at the bar's left edge so it drains sideways, not inwards.
    barFill.anchor.set(CELL_ANCHOR.x - 0.25, CELL_ANCHOR.y)
    barFill.visible = false

    let threat: Sprite | undefined
    if (isEnemy) {
      threat = new Sprite(this.atlas.threat)
      threat.anchor.set(CELL_ANCHOR.x, CELL_ANCHOR.y)
      threat.tint = 0xff4d5a
      threat.y = -BLOCK_H - 30
      root.addChild(threat)
    }

    this.sortLayer.addChild(root)
    return { root, body, face, shadow, carry, barBg, barFill, threat }
  }

  private syncBark(c: Creature, view: ActorView): void {
    if (c.bark) {
      if (!view.bark) {
        view.bark = new Text({ text: c.bark, style: this.barkStyle })
        view.bark.anchor.set(0.5, 1)
        view.bark.y = -46
        view.bark.resolution = 2
        view.root.addChild(view.bark)
      } else if (view.bark.text !== c.bark) {
        view.bark.text = c.bark
      }
    } else if (view.bark) {
      view.bark.destroy()
      view.bark = undefined
    }
  }

  // ── Cursors and previews ──────────────────────────────────────────────────

  /** Rings sit on the block top for solid tiles and on the floor otherwise. */
  private placeRing(sprite: Sprite | undefined, target: { x: number; y: number } | null): void {
    if (!sprite) return
    if (!target) {
      sprite.visible = false
      return
    }
    const { sx, sy } = tileToScreen(target.x, target.y)
    const raised = this.sim.grid.solid(Math.round(target.x), Math.round(target.y)) ? BLOCK_H : 0
    sprite.position.set(sx, sy - raised)
    sprite.zIndex = depth(target.x, target.y) + 3
    sprite.visible = true
  }

  setSelection(target: { x: number; y: number } | null): void {
    this.placeRing(this.selectionSprite, target)
  }

  setCursor(target: { x: number; y: number } | null): void {
    this.placeRing(this.cursorSprite, target)
  }

  /** Translucent preview of the tiles a build/dig drag currently covers. */
  setGhost(tiles: { x: number; y: number; ok: boolean }[], tint: number): void {
    while (this.ghostLayer.children.length < tiles.length) {
      this.makeSprite(this.atlas.floorRoom, this.ghostLayer)
    }
    this.ghostLayer.children.forEach((child, i) => {
      const sprite = child as Sprite
      const tile = tiles[i]
      if (!tile) {
        sprite.visible = false
        return
      }
      const { sx, sy } = tileToScreen(tile.x, tile.y)
      sprite.position.set(sx, sy)
      sprite.tint = tile.ok ? tint : 0xff4d5a
      sprite.alpha = 0.55
      sprite.visible = true
    })
  }
}
