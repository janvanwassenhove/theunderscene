import { TileKind, type LevelDef, type Objective, type SpellDef } from '../data/types'
import { room, roomOrNull } from '../data/rooms'
import { creature as creatureDef } from '../data/creatures'
import { enemy as enemyDef } from '../data/enemies'
import { spell } from '../data/spells'
import { Grid, type TileCoord } from './grid'
import { generateMap } from './mapgen'
import { findPathToNearest } from './pathfinding'
import { Rng } from './rng'

export type CreatureState =
  | 'idle'
  | 'moving'
  | 'digging'
  | 'hauling'
  | 'eating'
  | 'resting'
  | 'training'
  | 'fighting'
  | 'leaving'

export interface JobRef {
  kind: 'dig' | 'haul' | 'deposit' | 'eat' | 'rest' | 'train' | 'goto' | 'escort'
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
  /** Work-rate multiplier, dropped by a Bad Review. */
  workMul: number
  workMulUntil: number
  /** Seconds until the next swing. */
  attackIn: number
  /** Enemy this creature is currently arguing with. */
  targetEnemy: number | null
  /** Work bonus from Campfire Rings and communal creatures nearby. */
  communalMul: number
  /** Seconds left of a glitch, during which this one does nothing at all. */
  glitchedFor: number
  glitchIn: number
  bark: string | null
  barkUntil: number
  /** Seconds until this creature bothers to look for work again. */
  thinkIn: number
}

export type EnemyState = 'hunting' | 'fighting' | 'stealing' | 'fleeing' | 'downed' | 'captive'

export interface Enemy {
  id: number
  def: string
  x: number
  y: number
  hp: number
  maxHp: number
  path: TileCoord[]
  state: EnemyState
  /** Creature currently being fought, if any. */
  targetCreature: number | null
  attackIn: number
  /** Behaviour clock — the Inspector's countdown, mostly. */
  timer: number
  /** Royalties lifted from the vault, lost for good if it gets back out. */
  carrying: number
  /** Progress towards being talked round in a Signing Room. */
  convert: number
  /** Seconds until this one re-thinks where it is going. */
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

export type SimStatus = 'playing' | 'won' | 'lost'

const PAYDAY_SECONDS = 90
const HUNGER_PER_SECOND = 100 / 300
const FATIGUE_PER_SECOND = 100 / 420
const BUZZ_DECAY_PER_SECOND = 0.002
/** How close an intruder has to get before a creature downs tools and fights. */
const DEFEND_RADIUS = 3.5
/** Reach of a swing, in tiles. */
const STRIKE_RANGE = 1.4
/** Royalties an intruder can carry out of the vault in one trip. */
const HEIST_AMOUNT = 80
/** Seconds with an empty roster before the level is lost. */
const WIPEOUT_SECONDS = 25

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
  enemies: Enemy[] = []
  rooms = new Map<number, RoomInstance>()
  events: SimEvent[] = []
  /** Intruders seen off, by enemy id. Drives `defeat` objectives. */
  defeated: Record<string, number> = {}
  /** Creatures signed away by scouts. They come back if you clear the level. */
  capturedCreatures: string[] = []
  /** Raid announcements, shown louder than hints. */
  pendingAlerts: string[] = []

  royalties = 0
  buzz = 0
  reputation = 20
  elapsed = 0
  status: SimStatus = 'playing'

  /** Tiles the renderer still needs to redraw. */
  readonly dirty = new Set<number>()

  private nextCreatureId = 1
  private nextEnemyId = 1
  private nextRoomId = 1
  private firedRaids = new Set<number>()
  private venueDebuffUntil = 0
  private emptyRosterFor = 0
  /** The Algorithm has flattened every wing until this time. */
  private flattenUntil = 0
  private flattenIn = 0
  /** How long each room type has been continuously occupied, for echo ramps. */
  private echoTime = new Map<string, number>()
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
    const def = roomOrNull(defId)
    if (!def) return false
    const i = this.grid.idx(x, y)

    // A Merch Stand is the one thing that goes over water — laid from ground
    // you already hold, so you plank your way across rather than teleporting a
    // room into the middle of a flooded section.
    if (def.effects?.bridge && this.grid.kindAt(x, y) === TileKind.Water) {
      if (!this.grid.seen[i]) return false
      return this.grid
        .neighbours(x, y)
        .some((n) => this.grid.walkable(n.x, n.y) && this.grid.claimed[this.grid.idx(n.x, n.y)])
    }

    if (this.grid.kindAt(x, y) !== TileKind.Floor) return false
    if (!this.grid.claimed[i]) return false
    if (this.grid.pile[i] > 0) return false
    return true
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
    const def = room(instance.def)
    this.royalties += Math.floor(def.costPerTile / 2)
    // Pull up a bridge and the water is back where it was.
    const bridged = this.grid.bridged[i] === 1
    this.grid.setKind(x, y, bridged ? TileKind.Water : TileKind.Floor)
    this.grid.bridged[i] = 0
    this.grid.roomId[i] = 0
    this.grid.claimed[i] = bridged ? 0 : 1
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
    this.tickCommunal()
    for (const c of this.creatures) this.tickCreature(c, dt)
    this.creatures = this.creatures.filter((c) => c.hp > 0 && c.state !== 'leaving')
    this.tickRaids(dt)
    for (const e of this.enemies) this.tickEnemy(e, dt)
    this.tickAttraction(dt)
    this.tickObjectives()
    this.tickHints()
    this.tickDefeat(dt)
  }

  private tickDefeat(dt: number): void {
    if (this.creatures.length === 0) {
      this.emptyRosterFor += dt
      if (this.emptyRosterFor > WIPEOUT_SECONDS) {
        this.status = 'lost'
        this.log('Nobody left in the basement. The lease wins this round.', 'bad')
      }
    } else {
      this.emptyRosterFor = 0
    }
  }

  private tickEconomy(dt: number): void {
    const perMinute = dt / 60

    let buzzGain = 0
    let royaltyGain = 0
    let mealGain = 0
    let moraleGain = 0

    // The Algorithm's flattening halves everything a wing produces until the
    // Mixing Board re-cuts it apart again.
    const flattened = this.elapsed < this.flattenUntil
    const outputMul = flattened ? 0.5 : 1

    for (const [defId, tiles] of this.roomTiles) {
      const def = room(defId)
      if (tiles.length < def.minTiles) continue
      const e = def.effects
      if (!e) continue

      // Echo rooms ramp the longer somebody is actually in them.
      let roomMul = 1
      if (e.echo) {
        const occupied = this.creatures.some((c) => this.isRoomTile(Math.round(c.x), Math.round(c.y), defId))
        const held = Math.max(0, (this.echoTime.get(defId) ?? 0) + (occupied ? dt : -dt * 2))
        this.echoTime.set(defId, held)
        roomMul = Math.min(e.echo.maxMul, 1 + (held / 60) * e.echo.rampPerMinute * 10)
      }

      // Sample Vault: flips banked Royalties into more of them, given stock.
      if (e.refine && this.royalties >= e.refine.requiresStock) {
        royaltyGain += e.refine.royaltiesPerMinute * perMinute * roomMul
      }

      // Cypher Corner: duels for stats, and Buzz off everyone watching.
      if (e.cypher) {
        const crowd = this.creatures.filter((c) => this.isRoomTile(Math.round(c.x), Math.round(c.y), defId))
        if (crowd.length > 0) {
          buzzGain += e.cypher.buzzPerMinute * perMinute * crowd.length
          for (const c of crowd) c.xp += e.cypher.xpPerMinute * perMinute
        }
      }

      if (e.buzz) {
        // A upheld noise complaint halves everything loud for its duration.
        const quiet = this.elapsed < this.venueDebuffUntil ? 0.5 : 1
        buzzGain += e.buzz.perMinutePerTile * tiles.length * perMinute * quiet * roomMul
      }
      if (e.royalties) royaltyGain += e.royalties.perMinutePerTile * tiles.length * perMinute * roomMul
      if (e.food) mealGain += e.food.mealsPerMinutePerTile * tiles.length * perMinute
      if (e.morale) moraleGain += e.morale.loyaltyPerMinute * perMinute
    }

    // A DJ Throne with somebody actually sitting on it lifts the whole basement.
    const throne = this.roomTiles.get('dj-throne')
    const eliteMul =
      throne && this.creatures.some((c) => this.isRoomTile(Math.round(c.x), Math.round(c.y), 'dj-throne'))
        ? room('dj-throne').effects?.elite?.buzzMul ?? 1
        : 1

    this.buzz = Math.max(
      0,
      this.buzz + buzzGain * this.globalBuzzMul * eliteMul * outputMul - this.buzz * BUZZ_DECAY_PER_SECOND * dt,
    )
    this.addRoyalties(royaltyGain * outputMul)
    this.tickFlatten(dt)
    this.mealsReady = Math.min(20, this.mealsReady + mealGain)

    if (moraleGain > 0) {
      for (const c of this.creatures) c.loyalty = Math.min(100, c.loyalty + moraleGain)
    }

    // Ambient drift towards how loud and how staffed you are. Discrete events —
    // raids repelled, creatures signed away, rooms torn down — move it faster.
    const target = Math.min(100, this.buzz / 4 + this.population * 2)
    this.reputation += (target - this.reputation) * Math.min(1, dt * 0.05)
    this.reputation = Math.max(0, Math.min(100, this.reputation))

    this.paydayIn -= dt
    if (this.paydayIn <= 0) {
      this.paydayIn = PAYDAY_SECONDS
      this.runPayday()
    }
  }

  /**
   * Finale mechanic. The Algorithm periodically flattens every wing's output
   * into one generic debuff; a Mixing Board of the right size cuts it back out.
   */
  private tickFlatten(dt: number): void {
    const cfg = this.def.flatten
    if (!cfg) return

    if (this.elapsed < this.flattenUntil) {
      const board = this.roomTileCount('mixing-board')
      if (board >= cfg.counterTiles) {
        this.flattenUntil = 0
        this.log('The Mixing Board re-cut the wings apart. Everything sounds like itself again.', 'good')
      }
      return
    }

    this.flattenIn -= dt
    if (this.flattenIn > 0) return
    this.flattenIn = cfg.everySeconds
    this.flattenUntil = this.elapsed + cfg.seconds
    this.pendingAlerts.push('Everything is being flattened into lo-fi beats. Get to the Mixing Board.')
    this.log('The Algorithm flattened your wings. Output halved.', 'bad')
  }

  /**
   * Folk's whole idea: a crowd is worth more than the sum of it. Campfire Rings
   * and communal creatures both feed the same per-creature work multiplier, so
   * the wings stack rather than competing.
   */
  private tickCommunal(): void {
    const rings: { x: number; y: number; def: string }[] = []
    for (const [defId, tiles] of this.roomTiles) {
      if (!room(defId).effects?.communal) continue
      if (tiles.length < room(defId).minTiles) continue
      for (const t of tiles) rings.push({ ...t, def: defId })
    }

    const buffers = this.creatures.filter((c) => creatureDef(c.def).communalBuff)

    for (const c of this.creatures) {
      let bonus = 0

      for (const ring of rings) {
        const cfg = room(ring.def).effects!.communal!
        if (Math.hypot(c.x - ring.x, c.y - ring.y) > cfg.radius) continue
        const gathered = this.creatures.filter(
          (other) => Math.hypot(other.x - ring.x, other.y - ring.y) <= cfg.radius,
        ).length
        bonus = Math.max(bonus, Math.min(cfg.maxBonus, gathered * cfg.bonusPerCreature))
        break
      }

      for (const buffer of buffers) {
        if (buffer.id === c.id) continue
        const cfg = creatureDef(buffer.def).communalBuff!
        if (Math.hypot(c.x - buffer.x, c.y - buffer.y) > cfg.radius) continue
        const nearby = this.creatures.filter(
          (other) => Math.hypot(other.x - buffer.x, other.y - buffer.y) <= cfg.radius,
        ).length
        bonus += Math.min(cfg.max, nearby * cfg.perNearby)
      }

      c.communalMul = 1 + Math.min(1.5, bonus)
    }
  }

  private runPayday(): void {
    if (this.creatures.length === 0) return
    const owed = this.creatures.reduce(
      (sum, c) => sum + (creatureDef(c.def).worksForFree ? 0 : creatureDef(c.def).wage),
      0,
    )
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
    // Reputation is what makes people turn up faster: at 100 the door swings
    // at roughly half the interval it does at 0.
    const base = room('booking-door').effects?.portal?.spawnIntervalSeconds ?? 20
    // Glowstick Hatcheries and Sneaker Vaults shorten the wait on top of Reputation.
    let recruitMul = 1
    for (const [defId, tiles] of this.roomTiles) {
      const recruit = room(defId).effects?.recruit
      if (recruit && tiles.length >= room(defId).minTiles) recruitMul *= recruit.intervalMul
    }
    this.spawnIn = base * (1 - Math.min(100, Math.max(0, this.reputation)) / 200) * Math.max(0.3, recruitMul)

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
    // Cheap, fast recruitment brings people in less committed than usual.
    for (const [defId, tiles] of this.roomTiles) {
      const recruit = room(defId).effects?.recruit
      if (recruit?.startingLoyalty !== undefined && tiles.length >= room(defId).minTiles) {
        spawned.loyalty = Math.min(spawned.loyalty, recruit.startingLoyalty)
      }
    }
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
      if (this.capturedCreatures.length > 0) {
        this.log(
          `${this.capturedCreatures.length} signed-away creature(s) tore up the contract and came back.`,
          'good',
        )
      }
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
      case 'defeat':
        return this.defeated[objective.enemy] ?? 0
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

  // ── Raids and intruders ───────────────────────────────────────────────────

  private openDoors(): TileCoord[] {
    return (this.roomTiles.get('booking-door') ?? []).filter(
      (t) => !this.sealedUntil.has(this.grid.idx(t.x, t.y)),
    )
  }

  private tickRaids(dt: number): void {
    void dt
    this.def.raids.forEach((wave, index) => {
      if (this.firedRaids.has(index)) return
      if (this.elapsed < wave.at) return

      const doors = this.openDoors()
      if (doors.length === 0) {
        // Every door sealed: they wait outside rather than skipping the wave.
        // This is the whole point of Sold Out costing what it costs.
        return
      }

      this.firedRaids.add(index)
      // A basement nobody has heard of gets the wave as written. A famous one
      // gets extra attention, which is the cost of doing well.
      const extra = this.reputation >= 60 ? 1 : 0
      for (const entry of wave.enemies) {
        for (let i = 0; i < entry.count; i++) {
          this.spawnEnemy(entry.enemy, this.rng.pick(doors))
        }
      }
      if (extra > 0 && wave.enemies[0]) {
        this.spawnEnemy(wave.enemies[0].enemy, this.rng.pick(doors))
      }
      this.pendingAlerts.push(wave.announce)
      this.log(wave.announce, 'bad')
    })
  }

  spawnEnemy(defId: string, at: TileCoord): Enemy {
    const def = enemyDef(defId)
    const e: Enemy = {
      id: this.nextEnemyId++,
      def: defId,
      x: at.x,
      y: at.y,
      hp: def.hp,
      maxHp: def.hp,
      path: [],
      state: 'hunting',
      targetCreature: null,
      attackIn: 1,
      timer: def.behaviour.kind === 'timer' ? def.behaviour.seconds : 0,
      carrying: 0,
      convert: 0,
      thinkIn: 0,
    }
    this.enemies.push(e)
    this.grid.reveal(Math.round(at.x), Math.round(at.y), 1)
    return e
  }

  private tickEnemy(e: Enemy, dt: number): void {
    const def = enemyDef(e.def)

    if (e.state === 'captive') {
      this.tickCaptive(e, dt)
      return
    }
    if (e.state === 'downed') return

    e.attackIn -= dt
    e.thinkIn -= dt
    this.applyPassiveBehaviour(e, def, dt)

    // A Server Farm is furniture with an opinion: it never moves or chases.
    if (def.structure) return

    // Anything close enough gets dealt with first, whatever the plan was.
    const nearby = this.nearestCreature(e.x, e.y, def.aggro)
    if (nearby && e.state !== 'fleeing') {
      e.targetCreature = nearby.id
      e.state = 'fighting'
    } else if (e.state === 'fighting' && !nearby) {
      e.targetCreature = null
      e.state = 'hunting'
      e.path = []
    }

    if (e.state === 'fighting') {
      const target = this.creatures.find((c) => c.id === e.targetCreature)
      if (!target) {
        e.state = 'hunting'
        e.path = []
        return
      }
      if (Math.hypot(target.x - e.x, target.y - e.y) <= STRIKE_RANGE) {
        e.path = []
        // Scouts do not fight, they sign. Contact time is the threat, so you
        // have `captureSeconds` to get someone over there and interrupt it.
        if (def.behaviour.kind === 'capture') {
          if (e.timer === 0) {
            this.log(`${def.name} is signing ${creatureDef(target.def).name}. Interrupt it.`, 'bad')
            this.pendingAlerts.push(`${creatureDef(target.def).name} is being signed. Get someone over there.`)
          }
          e.timer += dt
          if (e.timer >= def.behaviour.captureSeconds) this.captureCreature(e, target)
        }
        if (e.attackIn <= 0) {
          e.attackIn = def.attackCooldown
          this.enemyStrike(e, def, target)
        }
        return
      }
      // Break the contact and the paperwork starts over.
      if (def.behaviour.kind === 'capture') e.timer = 0
      if (e.path.length === 0 && e.thinkIn <= 0) {
        e.thinkIn = 0.5
        const found = findPathToNearest(
          this.grid,
          e,
          (x, y) => Math.abs(x - Math.round(target.x)) <= 1 && Math.abs(y - Math.round(target.y)) <= 1,
        )
        if (found) {
          e.path = found.path
        } else {
          // Can't get to them — stop staring and go back to the original plan.
          e.targetCreature = null
          e.state = 'hunting'
        }
      }
      this.moveEnemy(e, def.speed * dt)
      return
    }

    if (e.state === 'fleeing') {
      if (e.path.length === 0 && e.thinkIn <= 0) {
        e.thinkIn = 1
        const found = findPathToNearest(this.grid, e, (x, y) => this.isRoomTile(x, y, 'booking-door'))
        if (found) {
          e.path = found.path
          if (found.path.length === 0) this.escapeEnemy(e)
        } else {
          // No way out: it gives up and stands there, which is a fair outcome.
          e.state = 'hunting'
        }
      }
      this.moveEnemy(e, def.speed * dt)
      if (e.path.length === 0 && this.isRoomTile(Math.round(e.x), Math.round(e.y), 'booking-door')) {
        this.escapeEnemy(e)
      }
      return
    }

    // Hunting: walk towards whatever this one actually came for. If that does
    // not exist — no vault built, no venue yet — go and find the staff instead,
    // rather than standing in the corridor for the rest of the level.
    if (e.path.length === 0 && e.thinkIn <= 0) {
      e.thinkIn = 1.2
      const goal = this.enemyGoal(def)
      const found =
        (goal ? findPathToNearest(this.grid, e, goal) : null) ??
        findPathToNearest(this.grid, e, (x, y) =>
          this.creatures.some((c) => Math.round(c.x) === x && Math.round(c.y) === y),
        )
      if (found) e.path = found.path
    }
    this.moveEnemy(e, def.speed * dt)

    if (e.path.length === 0) this.enemyActOnGoal(e, def)
  }

  private enemyGoal(def: { target: string }): ((x: number, y: number) => boolean) | null {
    if (def.target === 'vault') return (x, y) => this.isRoomTile(x, y, 'royalties-vault')
    if (def.target === 'venue') {
      return (x, y) => this.isRoomTile(x, y, 'basement-venue') || this.isRoomTile(x, y, 'royalties-vault')
    }
    return (x, y) => this.creatures.some((c) => Math.round(c.x) === x && Math.round(c.y) === y)
  }

  /** Reached whatever it wanted: rob it, or start pulling it apart. */
  private enemyActOnGoal(e: Enemy, def: ReturnType<typeof enemyDef>): void {
    if (e.attackIn > 0) return
    const x = Math.round(e.x)
    const y = Math.round(e.y)

    if (this.isRoomTile(x, y, 'royalties-vault') && this.royalties > 0) {
      e.attackIn = def.attackCooldown
      const taken = Math.min(HEIST_AMOUNT, this.royalties)
      this.royalties -= taken
      e.carrying += taken
      e.state = 'fleeing'
      e.path = []
      e.thinkIn = 0
      this.log(`${def.name} helped itself to ${Math.round(taken)} Royalties.`, 'bad')
      return
    }

    if (def.attack > 0 && this.grid.kindAt(x, y) === TileKind.Room) {
      const instance = this.rooms.get(this.grid.roomId[this.grid.idx(x, y)]!)
      if (instance && instance.def !== 'booking-door') {
        e.attackIn = def.attackCooldown * 2
        this.grid.setKind(x, y, TileKind.Floor)
        this.grid.roomId[this.grid.idx(x, y)] = 0
        this.dirty.add(this.grid.idx(x, y))
        this.reindexRooms()
        this.adjustReputation(-3)
        this.log(`${def.name} took a tile of your ${room(instance.def).name} apart.`, 'bad')
      }
    }
  }

  private applyPassiveBehaviour(e: Enemy, def: ReturnType<typeof enemyDef>, dt: number): void {
    const behaviour = def.behaviour
    if (behaviour.kind === 'drain') {
      this.buzz = Math.max(0, this.buzz - behaviour.buzzPerSecond * dt)
    } else if (behaviour.kind === 'timer') {
      e.timer -= dt
      if (e.timer <= 0) {
        e.timer = behaviour.seconds
        this.venueDebuffUntil = this.elapsed + behaviour.debuffSeconds
        this.pendingAlerts.push('Noise complaint upheld. The Venue is quiet for a while.')
        this.log('Noise complaint upheld. Venue output halved.', 'bad')
        e.state = 'fleeing'
        e.path = []
      }
    }
  }

  private enemyStrike(e: Enemy, def: ReturnType<typeof enemyDef>, target: Creature): void {
    const behaviour = def.behaviour
    const aura = this.enemies.some(
      (other) =>
        other.id !== e.id &&
        enemyDef(other.def).aura &&
        Math.hypot(other.x - e.x, other.y - e.y) <= enemyDef(other.def).aura!.radius,
    )
    const attackMul = aura ? 1.35 : 1

    if (behaviour.kind === 'curse') {
      target.workMul = behaviour.workRateMul
      target.workMulUntil = this.elapsed + behaviour.seconds
      target.bark = 'Two stars. TWO.'
      target.barkUntil = this.elapsed + 3
      this.log(`${creatureDef(target.def).name} got a bad review. Work rate halved.`, 'bad')
    }

    target.hp -= def.attack * attackMul
    target.loyalty = Math.max(0, target.loyalty - 2)

    // A scout is here to sign people, not hurt them; it can never land the
    // finishing blow, only run out the clock on the contract.
    if (behaviour.kind === 'capture') {
      target.hp = Math.max(1, target.hp)
      return
    }

    if (target.hp <= 0) {
      target.hp = 0
      this.log(`${creatureDef(target.def).name} is out of the fight.`, 'bad')
      this.releaseJob(target)
      target.state = 'leaving'
    }
  }

  /**
   * Signed away. You get them back by clearing the level, which is the whole
   * joke — the contract is only binding while you are losing.
   */
  private captureCreature(e: Enemy, target: Creature): void {
    this.capturedCreatures.push(target.def)
    this.adjustReputation(-8)
    this.log(`${creatureDef(target.def).name} got signed. Clear the level to get them back.`, 'bad')
    this.releaseJob(target)
    target.state = 'leaving'
    target.hp = 0
    e.timer = 0
    e.state = 'fleeing'
    e.path = []
    e.thinkIn = 0
  }

  private moveEnemy(e: Enemy, distance: number): void {
    let remaining = distance
    while (remaining > 0 && e.path.length > 0) {
      const next = e.path[0]!
      const dx = next.x - e.x
      const dy = next.y - e.y
      const d = Math.hypot(dx, dy)
      if (d <= remaining) {
        e.x = next.x
        e.y = next.y
        remaining -= d
        e.path.shift()
      } else {
        e.x += (dx / d) * remaining
        e.y += (dy / d) * remaining
        remaining = 0
      }
    }
  }

  private escapeEnemy(e: Enemy): void {
    if (e.carrying > 0) {
      this.log(`${enemyDef(e.def).name} left with ${Math.round(e.carrying)} Royalties. Rude.`, 'bad')
      this.adjustReputation(-6)
    }
    this.enemies = this.enemies.filter((other) => other.id !== e.id)
  }

  /** An intruder is beaten: held for signing if there is room, else shown out. */
  private downEnemy(e: Enemy): void {
    const def = enemyDef(e.def)
    this.defeated[e.def] = (this.defeated[e.def] ?? 0) + 1
    // Seeing off something big is worth more than swatting a scout.
    this.adjustReputation(Math.min(10, 2 + def.hp / 100))
    if (e.carrying > 0) {
      const i = this.grid.idx(Math.round(e.x), Math.round(e.y))
      this.grid.pile[i] += Math.round(e.carrying)
      this.dirty.add(i)
      e.carrying = 0
    }
    if (this.freePrisonSlots() > 0) {
      e.state = 'downed'
      e.path = []
      this.log(`${def.name} is down. Someone drag them to the Contract Office.`, 'good')
    } else {
      this.enemies = this.enemies.filter((other) => other.id !== e.id)
      this.log(`${def.name} was seen off the premises.`, 'good')
    }
  }

  /** Reputation is clamped to 0..100 and logged when it moves sharply. */
  private adjustReputation(delta: number): void {
    this.reputation = Math.max(0, Math.min(100, this.reputation + delta))
  }

  private freePrisonSlots(): number {
    const tiles = this.roomTiles.get('contract-office')?.length ?? 0
    const capacity = tiles * (room('contract-office').effects?.prison?.capacityPerTile ?? 0)
    const held = this.enemies.filter((e) => e.state === 'captive').length
    return Math.max(0, capacity - held)
  }

  private tickCaptive(e: Enemy, dt: number): void {
    const signingTiles = this.roomTileCount('signing-room')
    if (signingTiles < room('signing-room').minTiles) return
    const def = enemyDef(e.def)
    e.convert += dt * (1 + signingTiles * 0.1)
    if (e.convert < def.convertSeconds) return

    this.enemies = this.enemies.filter((other) => other.id !== e.id)
    const spot = this.roomTiles.get('signing-room')?.[0] ?? { x: Math.round(e.x), y: Math.round(e.y) }
    const recruit = this.spawnCreature('session-player', spot)
    recruit.loyalty = 55
    this.log(`${def.name} signed with you instead. Turns out your genre is cooler.`, 'good')
  }

  nearestCreature(x: number, y: number, radius: number): Creature | null {
    let best: Creature | null = null
    let bestDist = radius
    for (const c of this.creatures) {
      if (c.state === 'leaving') continue
      // Shoegaze creatures are simply not noticed, which is how they like it.
      if (creatureDef(c.def).stealth) continue
      const d = Math.hypot(c.x - x, c.y - y)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
    }
    return best
  }

  private nearestEnemy(x: number, y: number, radius: number): Enemy | null {
    let best: Enemy | null = null
    let bestDist = radius
    for (const e of this.enemies) {
      if (e.state === 'downed' || e.state === 'captive') continue
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < bestDist) {
        bestDist = d
        best = e
      }
    }
    return best
  }

  // ── Creature behaviour ────────────────────────────────────────────────────

  private tickCreature(c: Creature, dt: number): void {
    const def = creatureDef(c.def)

    c.hunger = Math.min(100, c.hunger + HUNGER_PER_SECOND * dt)
    c.fatigue = Math.min(100, c.fatigue + FATIGUE_PER_SECOND * dt)
    // Some wings need a specific room to stay tolerable. Metal needs a mirror.
    const missingRoom =
      def.needsRoom && this.roomTileCount(def.needsRoom.room) < room(def.needsRoom.room).minTiles
    const decayMul = missingRoom ? def.needsRoom!.decayMul : 1
    if (c.hunger > 80 || c.fatigue > 92 || missingRoom) {
      c.loyalty = Math.max(0, c.loyalty - ((def.loyaltyDecay * decayMul) / 60) * dt)
    }

    // Synths drop out periodically unless the wing keeps them patched.
    if (def.glitches) {
      if (c.glitchedFor > 0) {
        c.glitchedFor -= dt
        if (c.glitchedFor <= 0) c.bark = null
        return
      }
      c.glitchIn -= dt
      if (c.glitchIn <= 0) {
        c.glitchIn = def.glitches.everySeconds
        c.glitchedFor = def.glitches.forSeconds
        c.bark = 'Reboot. Rebooting. Rebo—'
        c.barkUntil = this.elapsed + def.glitches.forSeconds
        this.releaseJob(c)
        return
      }
    }
    if (this.elapsed > c.buffUntil) c.speedMul = 1
    if (this.elapsed > c.workMulUntil) c.workMul = 1
    if (this.elapsed > c.barkUntil) c.bark = null
    c.attackIn -= dt

    if (c.loyalty <= 0 && c.state !== 'leaving') {
      this.startLeaving(c)
    }

    if (c.state !== 'leaving' && this.fightIfThreatened(c, def, dt)) return

    c.thinkIn -= dt
    if (!c.job && c.thinkIn <= 0) {
      c.thinkIn = 0.4 + this.rng.next() * 0.5
      this.assignJob(c)
      // One bark per huddle: stacked speech over a crowd is unreadable.
      const someoneElseTalking = this.creatures.some(
        (other) => other.id !== c.id && other.bark && Math.hypot(other.x - c.x, other.y - c.y) < 4,
      )
      if (!c.job && !someoneElseTalking && this.rng.chance(0.05)) {
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

    this.workJob(c, def.workRate * c.speedMul * c.workMul * c.communalMul * this.globalSpeedMul, dt)
  }

  /**
   * Creatures defend the basement on their own — this is an indirect-control
   * game, so anything within `DEFEND_RADIUS` gets dealt with without being told.
   * Callback is how you concentrate them somewhere specific.
   */
  private fightIfThreatened(c: Creature, def: ReturnType<typeof creatureDef>, dt: number): boolean {
    if (def.refusesCombat) {
      // Will not fight. Backs away from anything close and gets on with its day.
      const near = this.nearestEnemy(c.x, c.y, DEFEND_RADIUS)
      if (near && c.state !== 'moving' && c.path.length === 0) {
        const away = findPathToNearest(
          this.grid,
          c,
          (x, y) => Math.hypot(x - near.x, y - near.y) > DEFEND_RADIUS + 2 && this.grid.walkable(x, y),
        )
        if (away) {
          this.releaseJob(c)
          c.path = away.path
          c.state = 'moving'
        }
      }
      return false
    }

    const threat = this.nearestEnemy(c.x, c.y, DEFEND_RADIUS)
    if (!threat) {
      if (c.state === 'fighting') {
        c.state = 'idle'
        c.targetEnemy = null
        c.path = []
        c.thinkIn = 0
      }
      return false
    }

    if (c.job) this.releaseJob(c)
    c.state = 'fighting'
    c.targetEnemy = threat.id

    const distance = Math.hypot(threat.x - c.x, threat.y - c.y)
    if (distance <= STRIKE_RANGE) {
      c.path = []
      if (c.attackIn <= 0) {
        c.attackIn = 1.3
        threat.hp -= def.attack * (1 + (c.level - 1) * 0.15)
        if (threat.hp <= 0) {
          threat.hp = 0
          c.xp += 40
          this.downEnemy(threat)
        }
      }
      return true
    }

    if (c.path.length === 0) {
      const found = findPathToNearest(
        this.grid,
        c,
        (x, y) => Math.abs(x - Math.round(threat.x)) <= 1 && Math.abs(y - Math.round(threat.y)) <= 1,
      )
      if (found) c.path = found.path
    }
    this.advanceAlongPath(c, def.speed * c.speedMul * this.globalSpeedMul * dt)
    return true
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
      case 'escort': {
        const downed = this.enemies.find(
          (e) => e.state === 'downed' && Math.round(e.x) === job.tx && Math.round(e.y) === job.ty,
        )
        const cell = this.roomTiles.get('contract-office')?.find((t) => this.freeCell(t))
        if (!downed || !cell) {
          this.releaseJob(c)
          return
        }
        downed.x = cell.x
        downed.y = cell.y
        downed.state = 'captive'
        downed.convert = 0
        this.log(`${enemyDef(downed.def).name} is in the Contract Office now. Paperwork pending.`, 'good')
        this.releaseJob(c)
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
    if (def.canHaul && this.tryEscortJob(c)) return
    if (def.canHaul && this.tryHaulJob(c)) return
    if (def.canDig && this.tryDigJob(c)) return
    if (c.fatigue > 45 && this.roomTileCount('green-room') > 0) {
      if (this.sendTo(c, 'rest', (x, y) => this.isFreeBed(x, y, c.id))) return
    }
    if (this.roomTileCount('practice-space') >= room('practice-space').minTiles && this.royalties > 200) {
      if (this.sendTo(c, 'train', (x, y) => this.isRoomTile(x, y, 'practice-space'))) return
    }
  }

  /** Drag a downed intruder to the Contract Office, if one has a free slot. */
  private tryEscortJob(c: Creature): boolean {
    if (this.freePrisonSlots() <= 0) return false
    const downed = this.enemies.filter(
      (e) => e.state === 'downed' && !this.reservedTiles.has(this.grid.idx(Math.round(e.x), Math.round(e.y))),
    )
    if (downed.length === 0) return false

    const found = findPathToNearest(this.grid, c, (x, y) =>
      downed.some((e) => Math.round(e.x) === x && Math.round(e.y) === y),
    )
    if (!found) return false
    this.reservedTiles.add(this.grid.idx(found.target.x, found.target.y))
    c.path = found.path
    c.job = { kind: 'escort', tx: found.target.x, ty: found.target.y }
    c.state = found.path.length > 0 ? 'moving' : 'hauling'
    return true
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

  /** A prison tile with nobody already sitting on it. */
  private freeCell(tile: TileCoord): boolean {
    return !this.enemies.some(
      (e) => e.state === 'captive' && Math.round(e.x) === tile.x && Math.round(e.y) === tile.y,
    )
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
      if (this.grid.kindAt(t.x, t.y) === TileKind.Water) this.grid.bridged[i] = 1
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
      workMul: 1,
      workMulUntil: 0,
      attackIn: 0,
      targetEnemy: null,
      communalMul: 1,
      glitchedFor: 0,
      glitchIn: creatureDef(defId).glitches?.everySeconds ?? 0,
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
      bridged: new Uint8Array(this.grid.bridged),
      rooms: [...this.rooms.values()].map((r) => ({ ...r })),
      creatures: this.creatures.map((c) => ({ ...c, path: c.path.map((p) => ({ ...p })), job: c.job ? { ...c.job } : null })),
      enemies: this.enemies.map((e) => ({ ...e, path: e.path.map((p) => ({ ...p })) })),
      defeated: { ...this.defeated },
      capturedCreatures: [...this.capturedCreatures],
      firedRaids: [...this.firedRaids],
      venueDebuffUntil: this.venueDebuffUntil,
      nextCreatureId: this.nextCreatureId,
      nextEnemyId: this.nextEnemyId,
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
    if (snapshot.bridged) sim.grid.bridged.set(snapshot.bridged)

    sim.rooms = new Map(snapshot.rooms.map((r) => [r.id, { ...r }]))
    sim.creatures = snapshot.creatures.map((c) => ({ ...c }))
    sim.enemies = (snapshot.enemies ?? []).map((e) => ({ ...e }))
    sim.defeated = { ...(snapshot.defeated ?? {}) }
    sim.capturedCreatures = [...(snapshot.capturedCreatures ?? [])]
    sim.firedRaids = new Set(snapshot.firedRaids ?? [])
    sim.venueDebuffUntil = snapshot.venueDebuffUntil ?? 0
    sim.nextEnemyId = snapshot.nextEnemyId ?? 1
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

export const SNAPSHOT_VERSION = 3

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
  bridged: Uint8Array
  rooms: RoomInstance[]
  creatures: Creature[]
  enemies: Enemy[]
  defeated: Record<string, number>
  capturedCreatures: string[]
  firedRaids: number[]
  venueDebuffUntil: number
  nextCreatureId: number
  nextEnemyId: number
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
    case 'defeat':
      return objective.count
  }
}
