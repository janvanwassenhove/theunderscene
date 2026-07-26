import { TileKind, type LevelDef, type Objective, type SpellDef } from '../data/types'
import { room, roomOrNull } from '../data/rooms'
import { creature as creatureDef } from '../data/creatures'
import { spell } from '../data/spells'
import { Grid, type TileCoord } from './grid'
import { generateMap } from './mapgen'
import { findPathToNearest } from './pathfinding'
import { Rng } from './rng'

export type CreatureState = 'idle' | 'moving' | 'digging' | 'hauling' | 'eating' | 'resting' | 'training' | 'leaving'

export interface JobRef {
  kind: 'dig' | 'haul' | 'deposit' | 'eat' | 'rest' | 'train' | 'goto'
  /** Tile being worked on (the rock, the pile, the bed…). */
  tx: number
  ty: number
}

export interface Creature {
  id: number
  def: string
  x: number
  y: number
  hp: number
  maxHp: number
  loyalty: number
  xp: number
  level: number
  hunger: number
  fatigue: number
  carrying: number
  state: CreatureState
  path: TileCoord[]
  job: JobRef | null
  /** Seconds of work accumulated against the current job. */
  progress: number
  speedMul: number
  buffUntil: number
  bark: string | null
  barkUntil: number
  /** Seconds until this creature bothers to look for work again. */
  thinkIn: number
}

export interface RoomInstance {
  id: number
  def: string
  tiles: number
}

export interface SimEvent {
  at: number
  text: string
  kind: 'info' | 'good' | 'bad'
}

export interface ObjectiveState {
  objective: Objective
  progress: number
  target: number
  done: boolean
}

export type SimStatus = 'playing' | 'won'

const PAYDAY_SECONDS = 90
const HUNGER_PER_SECOND = 100 / 300
const FATIGUE_PER_SECOND = 100 / 420
const BUZZ_DECAY_PER_SECOND = 0.002

/**
 * The whole game state and its tick. Deliberately free of rendering, input and
 * Vue: the renderer reads from it, the UI reads a snapshot of it, and tests
 * drive it headlessly.
 */
export class Simulation {
  readonly def: LevelDef
  readonly grid: Grid
  readonly rng: Rng

  creatures: Creature[] = []
  rooms = new Map<number, RoomInstance>()
  events: SimEvent[] = []

  royalties = 0
  buzz = 0
  reputation = 20
  elapsed = 0
  status: SimStatus = 'playing'

  /** Tiles the renderer still needs to redraw. */
  readonly dirty = new Set<number>()

  private nextCreatureId = 1
  private nextRoomId = 1
  private reservedTiles = new Set<number>()
  private mealsReady = 0
  private paydayIn = PAYDAY_SECONDS
  private spawnIn = 8
  private roomTiles = new Map<string, TileCoord[]>()
  private bedOwners = new Map<number, number>()
  private sealedUntil = new Map<number, number>()
  private globalSpeedMul = 1
  private globalBuzzMul = 1
  private globalBuffUntil = 0
  private cooldowns = new Map<string, number>()
  objectiveStates: ObjectiveState[] = []
  firedHints = new Set<number>()
  pendingHints: string[] = []

  constructor(def: LevelDef) {
    this.def = def
    const generated = generateMap(def)
    this.grid = generated.grid
    this.rng = new Rng(def.seed ^ 0x5f3759df)
    this.royalties = def.startRoyalties
    this.buzz = def.startBuzz

    // A Booking Agent's Door is placed for you — it is where the roster arrives.
    for (const tile of generated.doorTiles) {
      this.placeRoomTiles('booking-door', [tile], { free: true })
    }

    for (const entry of def.startingCreatures) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnCreature(entry.creature, this.scatterNear(def.heart))
      }
    }

    this.objectiveStates = def.objectives.map((objective) => ({
      objective,
      progress: 0,
      target: objectiveTarget(objective),
      done: false,
    }))

    this.markAllDirty()
    this.log('The basement is yours. It smells like it.', 'info')
  }

  // ── Queries used by the UI and renderer ───────────────────────────────────

  get population(): number {
    return this.creatures.length
  }

  get beds(): number {
    return this.countEffectTiles('lair') * (room('green-room').effects?.lair?.bedsPerTile ?? 1)
  }

  get capacity(): number {
    // Basement Capacity is the hard ceiling; beds are the soft one. The crew you
    // start with always counts, so a level never opens over its own limit.
    const starting = this.def.startingCreatures.reduce((sum, e) => sum + e.count, 0)
    return Math.min(this.def.capacity, Math.max(starting, this.beds))
  }

  get vaultCapacity(): number {
    const tiles = this.roomTiles.get('royalties-vault')?.length ?? 0
    return tiles * (room('royalties-vault').effects?.treasury?.capacityPerTile ?? 0)
  }

  roomTileCount(defId: string): number {
    return this.roomTiles.get(defId)?.length ?? 0
  }

  creatureAt(x: number, y: number, radius = 0.7): Creature | null {
    let best: Creature | null = null
    let bestDist = radius
    for (const c of this.creatures) {
      const d = Math.hypot(c.x - x, c.y - y)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best
  }

  spellReady(id: string): boolean {
    return (this.cooldowns.get(id) ?? 0) <= 0 && this.buzz >= spell(id).cost
  }

  cooldownLeft(id: string): number {
    return Math.max(0, this.cooldowns.get(id) ?? 0)
  }

  // ── Player actions ────────────────────────────────────────────────────────

  /**
   * Marks or unmarks a rock tile for digging. Any rock you can see can be
   * marked, reachable or not — an unreachable mark simply sits there as a plan
   * until a tunnel gets to it, which is far less confusing than a tap that
   * silently does nothing.
   */
  designate(x: number, y: number, on: boolean): boolean {
    if (!this.grid.inBounds(x, y)) return false
    const i = this.grid.idx(x, y)
    if (!this.grid.diggable(x, y)) return false
    if (!this.grid.seen[i]) return false
    const next = on ? 1 : 0
    if (this.grid.designated[i] === next) return false
    this.grid.designated[i] = next
    if (!on) this.reservedTiles.delete(i)
    this.dirty.add(i)
    return true
  }

  canBuildAt(defId: string, x: number, y: number): boolean {
    if (!this.grid.inBounds(x, y)) return false
    const i = this.grid.idx(x, y)
    if (this.grid.kindAt(x, y) !== TileKind.Floor) return false
    if (!this.grid.claimed[i]) return false
    if (this.grid.pile[i] > 0) return false
    return roomOrNull(defId) !== null
  }

  buildCost(defId: string, tiles: number): number {
    return room(defId).costPerTile * tiles
  }

  /**
   * Places room tiles, merging with any adjacent room of the same type. Rooms
   * finish instantly once paid for — a build queue reads as lag on a phone.
   */
  build(defId: string, tiles: TileCoord[]): { placed: number; spent: number } {
    const valid = tiles.filter((t) => this.canBuildAt(defId, t.x, t.y))
    if (valid.length === 0) return { placed: 0, spent: 0 }
    const perTile = room(defId).costPerTile
    const affordable = perTile > 0 ? Math.min(valid.length, Math.floor(this.royalties / perTile)) : valid.length
    if (affordable === 0) {
      this.log('Not enough Royalties. The rock is unmoved by your ambition.', 'bad')
      return { placed: 0, spent: 0 }
    }
    const chosen = valid.slice(0, affordable)
    const spent = perTile * chosen.length
    this.royalties -= spent
    this.placeRoomTiles(defId, chosen, { free: true })
    return { placed: chosen.length, spent }
  }

  /** Tears a room tile back down to plain floor, refunding half. */
  demolish(x: number, y: number): boolean {
    if (this.grid.kindAt(x, y) !== TileKind.Room) return false
    const i = this.grid.idx(x, y)
    const instance = this.rooms.get(this.grid.roomId[i]!)
    if (!instance) return false
    if (instance.def === 'booking-door') return false
    this.royalties += Math.floor(room(instance.def).costPerTile / 2)
    this.grid.setKind(x, y, TileKind.Floor)
    this.grid.roomId[i] = 0
    this.grid.claimed[i] = 1
    this.dirty.add(i)
    this.reindexRooms()
    return true
  }

  castSpell(id: string, target?: { x: number; y: number } | Creature): boolean {
    const def: SpellDef = spell(id)
    if (!this.def.spells.includes(id)) return false
    if (!this.spellReady(id)) return false
    this.buzz -= def.cost
    this.cooldowns.set(id, def.cooldownSeconds)

    const effect = def.effect
    switch (effect.kind) {
      case 'heal': {
        const c = target as Creature | undefined
        if (!c || !('id' in c)) return false
        c.hp = Math.min(c.maxHp, c.hp + effect.amount)
        c.loyalty = Math.min(100, c.loyalty + 5)
        break
      }
      case 'buff': {
        const t = target as TileCoord | undefined
        if (!t) return false
        for (const c of this.creatures) {
          if (Math.hypot(c.x - t.x, c.y - t.y) <= effect.radius) {
            c.speedMul = effect.speedMul
            c.buffUntil = this.elapsed + effect.seconds
          }
        }
        break
      }
      case 'reveal': {
        const t = target as TileCoord | undefined
        if (!t) return false
        this.grid.reveal(t.x, t.y, effect.radius)
        this.markAreaDirty(t.x, t.y, effect.radius + 1)
        break
      }
      case 'rally': {
        const t = target as TileCoord | undefined
        if (!t) return false
        for (const c of this.creatures) {
          if (c.state === 'leaving') continue
          this.releaseJob(c)
          const found = findPathToNearest(
            this.grid,
            c,
            (x, y) => Math.abs(x - t.x) <= 1 && Math.abs(y - t.y) <= 1 && this.grid.walkable(x, y),
          )
          if (found) {
            c.path = found.path
            c.job = { kind: 'goto', tx: found.target.x, ty: found.target.y }
            c.state = 'moving'
            c.thinkIn = 1.5
          }
        }
        break
      }
      case 'haste-room': {
        break
      }
      case 'seal': {
        const t = target as TileCoord | undefined
        if (!t) return false
        const i = this.grid.idx(t.x, t.y)
        const instance = this.rooms.get(this.grid.roomId[i]!)
        if (!instance || instance.def !== 'booking-door') {
          this.log('Sold Out only works on a door. This is a wall.', 'bad')
          return false
        }
        this.sealedUntil.set(i, this.elapsed + effect.seconds)
        break
      }
      case 'global-buff': {
        this.globalSpeedMul = effect.speedMul
        this.globalBuzzMul = effect.buzzMul
        this.globalBuffUntil = this.elapsed + effect.seconds
        break
      }
    }

    this.log(`${def.name}.`, 'good')
    return true
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(dt: number): void {
    if (this.status !== 'playing') return
    this.elapsed += dt

    for (const [id, left] of this.cooldowns) {
      if (left > 0) this.cooldowns.set(id, left - dt)
    }
    if (this.elapsed > this.globalBuffUntil) {
      this.globalSpeedMul = 1
      this.globalBuzzMul = 1
    }
    for (const [tile, until] of this.sealedUntil) {
      if (until <= this.elapsed) this.sealedUntil.delete(tile)
    }

    this.tickEconomy(dt)
    for (const c of this.creatures) this.tickCreature(c, dt)
    this.creatures = this.creatures.filter((c) => c.hp > 0 && c.state !== 'leaving')
    this.tickAttraction(dt)
    this.tickObjectives()
    this.tickHints()
  }

  private tickEconomy(dt: number): void {
    const perMinute = dt / 60

    let buzzGain = 0
    let royaltyGain = 0
    let mealGain = 0
    let moraleGain = 0

    for (const [defId, tiles] of this.roomTiles) {
      const def = room(defId)
      if (tiles.length < def.minTiles) continue
      const e = def.effects
      if (!e) continue
      if (e.buzz) buzzGain += e.buzz.perMinutePerTile * tiles.length * perMinute
      if (e.royalties) royaltyGain += e.royalties.perMinutePerTile * tiles.length * perMinute
      if (e.food) mealGain += e.food.mealsPerMinutePerTile * tiles.length * perMinute
      if (e.morale) moraleGain += e.morale.loyaltyPerMinute * perMinute
    }

    this.buzz = Math.max(0, this.buzz + buzzGain * this.globalBuzzMul - this.buzz * BUZZ_DECAY_PER_SECOND * dt)
    this.addRoyalties(royaltyGain)
    this.mealsReady = Math.min(20, this.mealsReady + mealGain)

    if (moraleGain > 0) {
      for (const c of this.creatures) c.loyalty = Math.min(100, c.loyalty + moraleGain)
    }

    // Reputation drifts toward how loud and how staffed you actually are.
    const target = Math.min(100, this.buzz / 4 + this.population * 2)
    this.reputation += (target - this.reputation) * Math.min(1, dt * 0.05)

    this.paydayIn -= dt
    if (this.paydayIn <= 0) {
      this.paydayIn = PAYDAY_SECONDS
      this.runPayday()
    }
  }

  private runPayday(): void {
    if (this.creatures.length === 0) return
    const owed = this.creatures.reduce((sum, c) => sum + creatureDef(c.def).wage, 0)
    if (this.royalties >= owed) {
      this.royalties -= owed
      for (const c of this.creatures) c.loyalty = Math.min(100, c.loyalty + 8)
      this.log(`Payday: ${owed} Royalties out. Nobody says thank you.`, 'info')
    } else {
      this.royalties = 0
      for (const c of this.creatures) c.loyalty = Math.max(0, c.loyalty - 18)
      this.log('Payday missed. Loyalty takes the hit, as ever.', 'bad')
    }
  }

  private tickAttraction(dt: number): void {
    this.spawnIn -= dt
    if (this.spawnIn > 0) return
    const doors = (this.roomTiles.get('booking-door') ?? []).filter(
      (t) => !this.sealedUntil.has(this.grid.idx(t.x, t.y)),
    )
    if (doors.length === 0) {
      this.spawnIn = 5
      return
    }
    this.spawnIn = room('booking-door').effects?.portal?.spawnIntervalSeconds ?? 20

    if (this.population >= this.capacity) return

    const pool: { creature: string; weight: number }[] = []
    for (const [defId, tiles] of this.roomTiles) {
      const def = room(defId)
      for (const attract of def.attracts ?? []) {
        if (tiles.length >= attract.minTiles) pool.push({ creature: attract.creature, weight: attract.weight })
      }
    }
    if (pool.length === 0) return

    const totalWeight = pool.reduce((s, p) => s + p.weight, 0)
    let roll = this.rng.next() * totalWeight
    let chosen = pool[0]!.creature
    for (const entry of pool) {
      roll -= entry.weight
      if (roll <= 0) {
        chosen = entry.creature
        break
      }
    }

    const door = this.rng.pick(doors)
    const spawned = this.spawnCreature(chosen, door)
    this.log(`${creatureDef(spawned.def).name} wandered in. Nobody checked a list.`, 'good')
  }

  private tickObjectives(): void {
    for (const state of this.objectiveStates) {
      state.progress = this.objectiveProgress(state.objective)
      if (!state.done && state.progress >= state.target) {
        state.done = true
        this.log(`Objective cleared: ${state.objective.label}`, 'good')
      }
    }
    if (this.objectiveStates.length > 0 && this.objectiveStates.every((s) => s.done)) {
      this.status = 'won'
      this.log('That is the level. Somehow.', 'good')
    }
  }

  private objectiveProgress(objective: Objective): number {
    switch (objective.kind) {
      case 'royalties':
        return this.royalties
      case 'buzz':
        return this.buzz
      case 'creatures':
        return this.population
      case 'room':
        return this.roomTileCount(objective.room)
      case 'survive':
        return this.elapsed
    }
  }

  private tickHints(): void {
    this.def.hints.forEach((hint, index) => {
      if (this.firedHints.has(index)) return
      const w = hint.when
      const fired =
        (w.kind === 'start' && this.elapsed > 0.5) ||
        (w.kind === 'royalties' && this.royalties >= w.atLeast) ||
        (w.kind === 'creatures' && this.population >= w.atLeast) ||
        (w.kind === 'room' && this.roomTileCount(w.room) > 0) ||
        (w.kind === 'elapsed' && this.elapsed >= w.seconds)
      if (fired) {
        this.firedHints.add(index)
        this.pendingHints.push(hint.text)
      }
    })
  }

  // ── Creature behaviour ────────────────────────────────────────────────────

  private tickCreature(c: Creature, dt: number): void {
    const def = creatureDef(c.def)

    c.hunger = Math.min(100, c.hunger + HUNGER_PER_SECOND * dt)
    c.fatigue = Math.min(100, c.fatigue + FATIGUE_PER_SECOND * dt)
    if (c.hunger > 80 || c.fatigue > 92) {
      c.loyalty = Math.max(0, c.loyalty - (def.loyaltyDecay / 60) * dt)
    }
    if (this.elapsed > c.buffUntil) c.speedMul = 1
    if (this.elapsed > c.barkUntil) c.bark = null

    if (c.loyalty <= 0 && c.state !== 'leaving') {
      this.startLeaving(c)
    }

    c.thinkIn -= dt
    if (!c.job && c.thinkIn <= 0) {
      c.thinkIn = 0.4 + this.rng.next() * 0.5
      this.assignJob(c)
      if (!c.job && this.rng.chance(0.05)) {
        c.bark = this.rng.pick(def.barks)
        c.barkUntil = this.elapsed + 3.5
      }
    }

    if (c.path.length > 0) {
      this.advanceAlongPath(c, def.speed * c.speedMul * this.globalSpeedMul * dt)
      return
    }

    if (!c.job) {
      c.state = 'idle'
      return
    }

    this.workJob(c, def.workRate * c.speedMul * this.globalSpeedMul, dt)
  }

  private advanceAlongPath(c: Creature, distance: number): void {
    let remaining = distance
    while (remaining > 0 && c.path.length > 0) {
      const next = c.path[0]!
      const dx = next.x - c.x
      const dy = next.y - c.y
      const d = Math.hypot(dx, dy)
      if (d <= remaining) {
        c.x = next.x
        c.y = next.y
        remaining -= d
        c.path.shift()
      } else {
        c.x += (dx / d) * remaining
        c.y += (dy / d) * remaining
        remaining = 0
      }
    }
    if (c.path.length === 0 && c.state === 'moving') {
      c.state = c.job ? stateForJob(c.job.kind) : 'idle'
    }
  }

  private workJob(c: Creature, workRate: number, dt: number): void {
    const job = c.job!
    switch (job.kind) {
      case 'dig': {
        const i = this.grid.idx(job.tx, job.ty)
        if (!this.grid.diggable(job.tx, job.ty) || !this.grid.designated[i]) {
          this.releaseJob(c)
          return
        }
        const before = this.grid.work[i]!
        const applied = Math.min(before, workRate * dt)
        this.grid.work[i] = before - applied
        if (this.grid.work[i]! <= 0) this.completeDig(c, job.tx, job.ty)
        break
      }
      case 'haul': {
        const i = this.grid.idx(job.tx, job.ty)
        const amount = this.grid.pile[i]!
        if (amount <= 0) {
          this.releaseJob(c)
          return
        }
        c.carrying = amount
        this.grid.pile[i] = 0
        this.dirty.add(i)
        this.reservedTiles.delete(i)
        const vault = findPathToNearest(this.grid, c, (x, y) => this.isVaultTile(x, y))
        if (vault) {
          c.path = vault.path
          c.job = { kind: 'deposit', tx: vault.target.x, ty: vault.target.y }
          c.state = 'moving'
        } else {
          // No vault, or no route to one: drop it where you stand.
          this.grid.pile[this.grid.idx(Math.round(c.x), Math.round(c.y))] += c.carrying
          this.dirty.add(this.grid.idx(Math.round(c.x), Math.round(c.y)))
          c.carrying = 0
          this.releaseJob(c)
        }
        break
      }
      case 'deposit': {
        const overflow = this.addRoyalties(c.carrying)
        if (overflow > 0) {
          const i = this.grid.idx(Math.round(c.x), Math.round(c.y))
          this.grid.pile[i] += overflow
          this.dirty.add(i)
        }
        c.carrying = 0
        this.releaseJob(c)
        break
      }
      case 'eat': {
        c.progress += dt
        if (c.progress >= 2.5) {
          const cost = room('merch-table').effects?.food?.royaltiesPerMeal ?? 0
          if (this.mealsReady >= 1 && this.royalties >= cost) {
            this.mealsReady -= 1
            this.royalties -= cost
            c.hunger = 0
            c.loyalty = Math.min(100, c.loyalty + 12)
          }
          this.releaseJob(c)
        }
        break
      }
      case 'rest': {
        c.fatigue = Math.max(0, c.fatigue - 14 * dt)
        c.hp = Math.min(c.maxHp, c.hp + 3 * dt)
        c.loyalty = Math.min(100, c.loyalty + 1.2 * dt)
        c.state = 'resting'
        if (c.fatigue <= 2) this.releaseJob(c)
        break
      }
      case 'train': {
        const def = room('practice-space').effects?.training
        if (!def) {
          this.releaseJob(c)
          return
        }
        const cost = (def.royaltiesPerMinute / 60) * dt
        if (this.royalties < cost) {
          this.releaseJob(c)
          return
        }
        this.royalties -= cost
        c.xp += (def.xpPerMinutePerTile / 60) * dt * Math.min(6, this.roomTileCount('practice-space'))
        c.state = 'training'
        if (c.xp >= c.level * 100) {
          c.xp = 0
          c.level += 1
          c.maxHp = Math.round(c.maxHp * 1.12)
          c.hp = c.maxHp
          this.log(`${creatureDef(c.def).name} reached level ${c.level}. Insufferable now.`, 'good')
          this.releaseJob(c)
        }
        break
      }
      case 'goto': {
        this.releaseJob(c)
        break
      }
    }
  }

  private completeDig(c: Creature, x: number, y: number): void {
    const i = this.grid.idx(x, y)
    const wasVein = this.grid.kindAt(x, y) === TileKind.Vein
    const veinAmount = this.grid.vein[i]!
    this.grid.setKind(x, y, TileKind.Floor)
    this.grid.vein[i] = 0
    this.grid.designated[i] = 0
    this.grid.claimed[i] = 1
    this.grid.reveal(x, y, 1)
    if (wasVein && veinAmount > 0) this.grid.pile[i] += veinAmount

    for (const n of this.grid.neighbours(x, y)) {
      this.grid.autoClaim(n.x, n.y)
      this.dirty.add(this.grid.idx(n.x, n.y))
    }
    this.markAreaDirty(x, y, 2)
    this.releaseJob(c)
  }

  private assignJob(c: Creature): void {
    const def = creatureDef(c.def)

    if (c.hunger > 70 && this.mealsReady >= 1 && this.roomTileCount('merch-table') > 0) {
      if (this.sendTo(c, 'eat', (x, y) => this.isRoomTile(x, y, 'merch-table'))) return
    }
    if (c.fatigue > 80 && this.roomTileCount('green-room') > 0) {
      if (this.sendTo(c, 'rest', (x, y) => this.isFreeBed(x, y, c.id))) return
    }
    if (def.canHaul && this.tryHaulJob(c)) return
    if (def.canDig && this.tryDigJob(c)) return
    if (c.fatigue > 45 && this.roomTileCount('green-room') > 0) {
      if (this.sendTo(c, 'rest', (x, y) => this.isFreeBed(x, y, c.id))) return
    }
    if (this.roomTileCount('practice-space') >= room('practice-space').minTiles && this.royalties > 200) {
      if (this.sendTo(c, 'train', (x, y) => this.isRoomTile(x, y, 'practice-space'))) return
    }
  }

  private tryHaulJob(c: Creature): boolean {
    if (this.royalties >= this.vaultCapacity) return false
    const found = findPathToNearest(
      this.grid,
      c,
      (x, y) => this.grid.pile[this.grid.idx(x, y)]! > 0 && !this.reservedTiles.has(this.grid.idx(x, y)),
    )
    if (!found) return false
    const i = this.grid.idx(found.target.x, found.target.y)
    this.reservedTiles.add(i)
    c.path = found.path
    c.job = { kind: 'haul', tx: found.target.x, ty: found.target.y }
    c.state = found.path.length > 0 ? 'moving' : 'hauling'
    return true
  }

  private tryDigJob(c: Creature): boolean {
    let chosen: TileCoord | null = null
    const found = findPathToNearest(this.grid, c, (x, y) => {
      if (!this.grid.walkable(x, y)) return false
      for (const n of this.grid.neighbours(x, y)) {
        const ni = this.grid.idx(n.x, n.y)
        if (this.grid.designated[ni] && !this.reservedTiles.has(ni)) return true
      }
      return false
    })
    if (!found) return false
    for (const n of this.grid.neighbours(found.target.x, found.target.y)) {
      const ni = this.grid.idx(n.x, n.y)
      if (this.grid.designated[ni] && !this.reservedTiles.has(ni)) {
        chosen = n
        break
      }
    }
    if (!chosen) return false
    this.reservedTiles.add(this.grid.idx(chosen.x, chosen.y))
    c.path = found.path
    c.job = { kind: 'dig', tx: chosen.x, ty: chosen.y }
    c.state = found.path.length > 0 ? 'moving' : 'digging'
    return true
  }

  private sendTo(c: Creature, kind: JobRef['kind'], accept: (x: number, y: number) => boolean): boolean {
    const found = findPathToNearest(this.grid, c, accept)
    if (!found) return false
    const i = this.grid.idx(found.target.x, found.target.y)
    if (kind === 'rest') this.bedOwners.set(i, c.id)
    c.path = found.path
    c.job = { kind, tx: found.target.x, ty: found.target.y }
    c.progress = 0
    c.state = found.path.length > 0 ? 'moving' : stateForJob(kind)
    return true
  }

  private releaseJob(c: Creature): void {
    if (c.job) {
      const i = this.grid.idx(c.job.tx, c.job.ty)
      this.reservedTiles.delete(i)
      if (c.job.kind === 'rest' && this.bedOwners.get(i) === c.id) this.bedOwners.delete(i)
    }
    c.job = null
    c.path = []
    c.progress = 0
    c.state = 'idle'
    c.thinkIn = 0.2
  }

  private startLeaving(c: Creature): void {
    this.releaseJob(c)
    c.state = 'leaving'
    this.log(`${creatureDef(c.def).name} quit the band. Cites "creative differences".`, 'bad')
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isRoomTile(x: number, y: number, defId: string): boolean {
    const instance = this.rooms.get(this.grid.roomId[this.grid.idx(x, y)]!)
    return instance?.def === defId
  }

  private isVaultTile(x: number, y: number): boolean {
    return this.isRoomTile(x, y, 'royalties-vault')
  }

  private isFreeBed(x: number, y: number, creatureId: number): boolean {
    if (!this.isRoomTile(x, y, 'green-room')) return false
    const owner = this.bedOwners.get(this.grid.idx(x, y))
    return owner === undefined || owner === creatureId
  }

  private countEffectTiles(effect: 'lair'): number {
    let total = 0
    for (const [defId, tiles] of this.roomTiles) {
      if (room(defId).effects?.[effect]) total += tiles.length
    }
    return total
  }

  /** Adds Royalties up to the vault ceiling; returns whatever would not fit. */
  private addRoyalties(amount: number): number {
    const cap = Math.max(this.vaultCapacity, this.def.startRoyalties)
    const space = Math.max(0, cap - this.royalties)
    const stored = Math.min(space, amount)
    this.royalties += stored
    return amount - stored
  }

  private placeRoomTiles(defId: string, tiles: TileCoord[], _opts: { free: boolean }): void {
    let instanceId = 0
    for (const t of tiles) {
      for (const n of this.grid.neighbours(t.x, t.y)) {
        const other = this.rooms.get(this.grid.roomId[this.grid.idx(n.x, n.y)]!)
        if (other?.def === defId) {
          instanceId = other.id
          break
        }
      }
      if (instanceId) break
    }
    if (!instanceId) {
      instanceId = this.nextRoomId++
      this.rooms.set(instanceId, { id: instanceId, def: defId, tiles: 0 })
    }
    for (const t of tiles) {
      const i = this.grid.idx(t.x, t.y)
      this.grid.setKind(t.x, t.y, TileKind.Room)
      this.grid.roomId[i] = instanceId
      this.grid.claimed[i] = 1
      this.grid.reveal(t.x, t.y, 1)
      this.dirty.add(i)
    }
    this.reindexRooms()
  }

  /** Rebuilds the room-tile index. Only runs when rooms actually change. */
  private reindexRooms(): void {
    this.roomTiles.clear()
    const counts = new Map<number, number>()
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const i = this.grid.idx(x, y)
        const instance = this.rooms.get(this.grid.roomId[i]!)
        if (!instance || this.grid.kindAt(x, y) !== TileKind.Room) continue
        let list = this.roomTiles.get(instance.def)
        if (!list) {
          list = []
          this.roomTiles.set(instance.def, list)
        }
        list.push({ x, y })
        counts.set(instance.id, (counts.get(instance.id) ?? 0) + 1)
      }
    }
    for (const [id, instance] of this.rooms) {
      const count = counts.get(id) ?? 0
      if (count === 0) this.rooms.delete(id)
      else instance.tiles = count
    }
  }

  spawnCreature(defId: string, at: TileCoord): Creature {
    const def = creatureDef(defId)
    const c: Creature = {
      id: this.nextCreatureId++,
      def: defId,
      x: at.x,
      y: at.y,
      hp: def.hp,
      maxHp: def.hp,
      loyalty: 70,
      xp: 0,
      level: 1,
      hunger: 10,
      fatigue: 0,
      carrying: 0,
      state: 'idle',
      path: [],
      job: null,
      progress: 0,
      speedMul: 1,
      buffUntil: 0,
      bark: null,
      barkUntil: 0,
      thinkIn: this.rng.range(0, 1),
    }
    this.creatures.push(c)
    return c
  }

  private scatterNear(at: TileCoord): TileCoord {
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = at.x + this.rng.int(-2, 2)
      const y = at.y + this.rng.int(-1, 1)
      if (this.grid.walkable(x, y)) return { x, y }
    }
    return { ...at }
  }

  log(text: string, kind: SimEvent['kind']): void {
    this.events.push({ at: this.elapsed, text, kind })
    if (this.events.length > 40) this.events.shift()
  }

  markAllDirty(): void {
    for (let i = 0; i < this.grid.width * this.grid.height; i++) this.dirty.add(i)
  }

  private markAreaDirty(x: number, y: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (this.grid.inBounds(nx, ny)) this.dirty.add(this.grid.idx(nx, ny))
      }
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Snapshot of everything that cannot be re-derived. Typed arrays are kept as
   * typed arrays: IndexedDB stores them through structured clone, so there is
   * no JSON round-trip and no per-tile string cost.
   */
  serialize(): SimSnapshot {
    return {
      version: SNAPSHOT_VERSION,
      levelId: this.def.id,
      elapsed: this.elapsed,
      royalties: this.royalties,
      buzz: this.buzz,
      reputation: this.reputation,
      status: this.status,
      width: this.grid.width,
      height: this.grid.height,
      kind: new Uint8Array(this.grid.kind),
      work: new Uint16Array(this.grid.work),
      claimed: new Uint8Array(this.grid.claimed),
      roomId: new Uint16Array(this.grid.roomId),
      designated: new Uint8Array(this.grid.designated),
      vein: new Uint16Array(this.grid.vein),
      pile: new Uint16Array(this.grid.pile),
      seen: new Uint8Array(this.grid.seen),
      rooms: [...this.rooms.values()].map((r) => ({ ...r })),
      creatures: this.creatures.map((c) => ({ ...c, path: c.path.map((p) => ({ ...p })), job: c.job ? { ...c.job } : null })),
      nextCreatureId: this.nextCreatureId,
      nextRoomId: this.nextRoomId,
      mealsReady: this.mealsReady,
      paydayIn: this.paydayIn,
      spawnIn: this.spawnIn,
      bedOwners: [...this.bedOwners.entries()],
      cooldowns: [...this.cooldowns.entries()],
      firedHints: [...this.firedHints],
      events: this.events.map((e) => ({ ...e })),
    }
  }

  static deserialize(def: LevelDef, snapshot: SimSnapshot): Simulation {
    const sim = new Simulation(def)
    if (snapshot.width !== sim.grid.width || snapshot.height !== sim.grid.height) {
      throw new Error('Save does not match this level layout')
    }
    sim.grid.kind.set(snapshot.kind)
    sim.grid.work.set(snapshot.work)
    sim.grid.claimed.set(snapshot.claimed)
    sim.grid.roomId.set(snapshot.roomId)
    sim.grid.designated.set(snapshot.designated)
    sim.grid.vein.set(snapshot.vein)
    sim.grid.pile.set(snapshot.pile)
    sim.grid.seen.set(snapshot.seen)

    sim.rooms = new Map(snapshot.rooms.map((r) => [r.id, { ...r }]))
    sim.creatures = snapshot.creatures.map((c) => ({ ...c }))
    sim.elapsed = snapshot.elapsed
    sim.royalties = snapshot.royalties
    sim.buzz = snapshot.buzz
    sim.reputation = snapshot.reputation
    sim.status = snapshot.status
    sim.nextCreatureId = snapshot.nextCreatureId
    sim.nextRoomId = snapshot.nextRoomId
    sim.mealsReady = snapshot.mealsReady
    sim.paydayIn = snapshot.paydayIn
    sim.spawnIn = snapshot.spawnIn
    sim.bedOwners = new Map(snapshot.bedOwners)
    sim.cooldowns = new Map(snapshot.cooldowns)
    sim.firedHints = new Set(snapshot.firedHints)
    sim.events = snapshot.events.map((e) => ({ ...e }))
    sim.pendingHints = []
    sim.reservedTiles.clear()
    sim.reindexRooms()
    sim.objectiveStates = def.objectives.map((objective) => ({
      objective,
      progress: 0,
      target: objectiveTarget(objective),
      done: false,
    }))
    sim.tickObjectives()
    sim.markAllDirty()
    return sim
  }
}

export const SNAPSHOT_VERSION = 2

export interface SimSnapshot {
  version: number
  levelId: string
  elapsed: number
  royalties: number
  buzz: number
  reputation: number
  status: SimStatus
  width: number
  height: number
  kind: Uint8Array
  work: Uint16Array
  claimed: Uint8Array
  roomId: Uint16Array
  designated: Uint8Array
  vein: Uint16Array
  pile: Uint16Array
  seen: Uint8Array
  rooms: RoomInstance[]
  creatures: Creature[]
  nextCreatureId: number
  nextRoomId: number
  mealsReady: number
  paydayIn: number
  spawnIn: number
  bedOwners: [number, number][]
  cooldowns: [string, number][]
  firedHints: number[]
  events: SimEvent[]
}

function stateForJob(kind: JobRef['kind']): CreatureState {
  switch (kind) {
    case 'dig':
      return 'digging'
    case 'haul':
    case 'deposit':
      return 'hauling'
    case 'eat':
      return 'eating'
    case 'rest':
      return 'resting'
    case 'train':
      return 'training'
    default:
      return 'idle'
  }
}

export function objectiveTarget(objective: Objective): number {
  switch (objective.kind) {
    case 'royalties':
      return objective.amount
    case 'buzz':
      return objective.amount
    case 'creatures':
      return objective.amount
    case 'room':
      return objective.tiles
    case 'survive':
      return objective.seconds
  }
}
