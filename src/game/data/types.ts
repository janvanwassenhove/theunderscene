/**
 * Content schema for The Underscene.
 *
 * Everything the engine can build, hire, cast or play is described by these
 * types and lives in `src/game/data/*`. Engine code reads the fields generically
 * — it never branches on a specific room or creature id — so balance passes and
 * whole new genre wings are a data edit, not a code change.
 */

export type WingId =
  | 'core'
  | 'punk'
  | 'metal'
  | 'shoegaze'
  | 'hiphop'
  | 'electronic'
  | 'folk'
  | 'finale'

/** Tile kinds the grid can hold. Numeric so the grid can live in typed arrays. */
export enum TileKind {
  /** Level border. Never diggable. */
  Bedrock = 0,
  /** Plain diggable rock. */
  Rock = 1,
  /** Diggable rock that pays out Royalties. */
  Vein = 2,
  /** Flooded section — impassable until bridged by a Merch Stand. */
  Water = 3,
  /** Dug-out, walkable ground. */
  Floor = 4,
  /** Floor that belongs to a room. */
  Room = 5,
}

export interface RoomEffects {
  /** Royalties Vault: how much stored Royalties each tile holds. */
  treasury?: { capacityPerTile: number }
  /** Green Room: sleeping slots, which also raise the population ceiling. */
  lair?: { bedsPerTile: number }
  /** Merch Table: meals produced per minute per tile, and what a meal costs. */
  food?: { mealsPerMinutePerTile: number; royaltiesPerMeal: number }
  /** Practice Space / Moshpit Arena: experience granted per minute per tile. */
  training?: { xpPerMinutePerTile: number; royaltiesPerMinute: number; injuryChance?: number }
  /**
   * Any Venue-type room: Buzz generated per minute per tile.
   *
   * `stable` Buzz does not decay. It raises a floor the ambient decay cannot
   * pull you below, so a slow room becomes an anchor rather than a trickle that
   * evaporates as fast as it arrives. Draining still takes it — the floor comes
   * down with the total — so it is protection from time, not from intruders.
   */
  buzz?: { perMinutePerTile: number; stable?: boolean }
  /** Merch/economy rooms: passive Royalties per minute per tile. */
  royalties?: { perMinutePerTile: number }
  /** Booking Agent's Door: creatures walk in here. */
  portal?: { spawnIntervalSeconds: number }
  /** Contract Office: captured intruders held per tile. */
  prison?: { capacityPerTile: number }
  /** Flat morale/loyalty regeneration for creatures of matching wing. */
  morale?: { loyaltyPerMinute: number }
  /** Can be laid over flooded tiles, turning them into walkable ground. */
  bridge?: { over: 'water' }
  /** Campfire Ring: the more creatures gathered, the bigger the shared buff. */
  communal?: { bonusPerCreature: number; maxBonus: number; radius: number }
  /** Rehearsal Crypt: output ramps the longer the room stays occupied. */
  echo?: { rampPerMinute: number; maxMul: number }
  /**
   * Sample Vault: turns banked Royalties into more of them, if you have stock.
   * Yield is per tile — a bigger vault flips more, which is what makes "run a
   * ten-tile Sample Vault" an objective rather than a formality.
   */
  refine?: { royaltiesPerMinutePerTile: number; requiresStock: number }
  /** DJ Throne: one creature stationed here lifts the whole wing's Buzz. */
  elite?: { buzzMul: number }
  /** Glowstick Hatchery, Sneaker Vault: multiplies how fast the door swings. */
  recruit?: { intervalMul: number; startingLoyalty?: number }
  /** Cypher Corner: creatures duel for stats, onlookers generate Buzz. */
  cypher?: { xpPerMinute: number; buzzPerMinute: number }
  /** The Mixing Board: the counterplay to the Algorithm flattening your wings. */
  counter?: 'flatten'
}

export interface RoomDef {
  id: string
  name: string
  /** DK-lineage note kept in data for designers, never shown in-game. */
  role: string
  wing: WingId
  /** Royalties charged per tile at placement. Rooms build instantly once paid. */
  costPerTile: number
  /** Below this many tiles the room exists but produces nothing. */
  minTiles: number
  /** Placeholder-art colours; replaced by wing atlases from Phase 2 onwards. */
  color: number
  accent: number
  /** One-line description shown in the build dock. */
  blurb: string
  effects?: RoomEffects
  /** Creature types this room draws in through a Booking Agent's Door. */
  attracts?: { creature: string; minTiles: number; weight: number }[]
}

export type CreatureRole = 'worker' | 'fighter' | 'support' | 'economy'

export interface CreatureDef {
  id: string
  name: string
  wing: WingId
  role: CreatureRole
  hp: number
  /** Tiles per second. */
  speed: number
  attack: number
  /** Work applied per second to digs, hauls and builds. */
  workRate: number
  /** Royalties owed at each payday. */
  wage: number
  /** Loyalty lost per minute when needs go unmet. */
  loyaltyDecay: number
  color: number
  accent: number
  /** Silhouette hint for the placeholder renderer and, later, the art brief. */
  build: 'squat' | 'tall' | 'wisp'
  quirk: string
  canDig: boolean
  canHaul: boolean
  /** Without this room, loyalty drains faster. Metal creatures care a lot. */
  needsRoom?: { room: string; decayMul: number }
  /** Intruders do not pick this one out of a crowd. */
  stealth?: boolean
  /** Will not fight; withdraws instead of engaging. */
  refusesCombat?: boolean
  /** Buffs nearby creatures, scaled by how many are around. */
  communalBuff?: { perNearby: number; radius: number; max: number }
  /** Stops working periodically unless the wing keeps it patched. */
  glitches?: { everySeconds: number; forSeconds: number }
  /** Works for the love of the craft: never invoiced at payday. */
  worksForFree?: boolean
  /** Idle chatter. Placeholder copy — final pass goes through the voice guide. */
  barks: string[]
}

export type SpellTargeting = 'none' | 'tile' | 'creature'

export type SpellEffect =
  | { kind: 'heal'; amount: number }
  | { kind: 'buff'; speedMul: number; seconds: number; radius: number }
  | { kind: 'reveal'; radius: number }
  | { kind: 'rally'; radius: number }
  | { kind: 'haste-room'; speedMul: number; seconds: number }
  | { kind: 'seal'; seconds: number }
  | { kind: 'global-buff'; speedMul: number; buzzMul: number; seconds: number }

export interface SpellDef {
  id: string
  name: string
  /** Buzz spent per cast. */
  cost: number
  cooldownSeconds: number
  targeting: SpellTargeting
  effect: SpellEffect
  blurb: string
  /** Single glyph used by the placeholder dock art. */
  glyph: string
}

export type Objective =
  | { kind: 'royalties'; amount: number; label: string }
  | { kind: 'buzz'; amount: number; label: string }
  | { kind: 'creatures'; amount: number; label: string }
  | { kind: 'room'; room: string; tiles: number; label: string }
  | { kind: 'survive'; seconds: number; label: string }
  | { kind: 'defeat'; enemy: string; count: number; label: string }

/**
 * A scheduled incursion. Intruders come in through the Booking Agent's Door —
 * the same door everyone else uses — which is what makes sealing it with Sold
 * Out an actual decision rather than a novelty.
 */
export interface RaidWave {
  /** Seconds into the level. */
  at: number
  enemies: { enemy: string; count: number }[]
  /** Shown as an alert when the wave arrives. */
  announce: string
}

export interface LevelHint {
  /** Fires once when the condition first becomes true. */
  when:
    | { kind: 'start' }
    | { kind: 'royalties'; atLeast: number }
    | { kind: 'creatures'; atLeast: number }
    | { kind: 'room'; room: string }
    | { kind: 'elapsed'; seconds: number }
  text: string
}

export interface LevelDef {
  id: string
  campaignId: string
  index: number
  name: string
  wing: WingId
  /** Gig-poster level intro. Placeholder voice; final pass is a separate step. */
  poster: { headline: string; lines: string[] }
  width: number
  height: number
  seed: number
  /** Where the starting chamber is carved. */
  heart: { x: number; y: number }
  startRoyalties: number
  startBuzz: number
  /** Basement Capacity — the in-fiction name for the creature cap. */
  capacity: number
  /** 0..1 chance weights used by the map generator. */
  veinDensity: number
  waterDensity: number
  /** Pre-dug pockets of loose Royalties, as a reward for exploring. */
  cacheCount: number
  startingCreatures: { creature: string; count: number }[]
  rooms: string[]
  spells: string[]
  /** Traps that can be laid on this level. */
  traps: string[]
  objectives: Objective[]
  hints: LevelHint[]
  raids: RaidWave[]
  /**
   * Finale only. The Algorithm periodically flattens every wing's output into
   * one generic debuff; a Mixing Board of at least `counterTiles` clears it.
   */
  flatten?: { everySeconds: number; seconds: number; counterTiles: number }
}

export interface CampaignDef {
  id: string
  index: number
  name: string
  wing: WingId
  tagline: string
  /** Position on the Underscene Map hub, in 0..1 of the map area. */
  mapPos: { x: number; y: number }
  levels: string[]
  /** Campaign that must be cleared first. `null` means available from the start. */
  requires: string | null
  /** Content that exists in the design docs but is not built yet. */
  status: 'playable' | 'planned'
}
