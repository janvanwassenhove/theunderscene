/**
 * Balance harness.
 *
 * Plays every level headlessly with a deliberately unclever bot and reports how
 * far it gets against each objective inside a time budget. It is a floor, not a
 * ceiling: the bot digs, builds the rooms the objectives name plus the obvious
 * economy, and otherwise leaves the crew to their own devices. It never casts a
 * spell, never lays a trap and never manoeuvres in a fight.
 *
 * So a level the bot clears is certainly clearable. A level it gets nowhere
 * near is a threshold worth a human look — which is the whole point, since
 * nobody has played these to completion yet.
 *
 *   npx vite-node scripts/balance.ts            # every level
 *   npx vite-node scripts/balance.ts c4         # ids containing "c4"
 *   npx vite-node scripts/balance.ts c4-l5 1800 # and a longer budget
 */

import { LEVELS } from '../src/game/data/campaigns'
import { room as roomDef, roomOrNull } from '../src/game/data/rooms'
import { creature as creatureDef } from '../src/game/data/creatures'
import { Simulation } from '../src/game/core/simulation'
import { TileKind, type LevelDef, type RoomEffects } from '../src/game/data/types'

const STEP = 1 / 15
/** Simulated seconds to give each level before calling it. */
const DEFAULT_BUDGET = 1200
/** How many rock tiles the bot keeps marked at once. */
const DIG_QUEUE = 14
/** Mirrors BUZZ_DECAY_PER_SECOND in the simulation. */
const BUZZ_DECAY = 0.002

interface Plan {
  room: string
  tiles: number
}

/** What the bot wants built, in the order it wants it. */
function plan(def: LevelDef): Plan[] {
  const available = def.rooms.filter((id) => roomOrNull(id))
  const withEffect = (key: keyof RoomEffects) =>
    available.filter((id) => roomDef(id).effects?.[key] !== undefined)

  const wants: Plan[] = []
  const push = (room: string | undefined, tiles: number) => {
    if (!room) return
    const existing = wants.find((w) => w.room === room)
    if (existing) existing.tiles = Math.max(existing.tiles, tiles)
    else wants.push({ room, tiles })
  }

  const treasury = withEffect('treasury')[0]
  const lair = withEffect('lair')[0]
  const buzzRoom = withEffect('buzz')[0]

  // Somewhere to put the money comes first: Royalties above the vault ceiling
  // simply evaporate, so no vault means no economy at all.
  push(treasury, 10)
  push(lair, 10)
  push(withEffect('food')[0], 5)

  for (const objective of def.objectives) {
    if (objective.kind === 'room') push(objective.room, objective.tiles)

    if (objective.kind === 'buzz' && buzzRoom) {
      // Buzz decays proportionally, so a room of a given size has a hard
      // equilibrium: gain per second ÷ decay per second. Size the room from the
      // target rather than guessing, or the bot reports "impossible" for a
      // number that was only ever under-built.
      const perTile = roomDef(buzzRoom).effects!.buzz!.perMinutePerTile
      push(buzzRoom, Math.ceil((objective.amount * BUZZ_DECAY * 60) / perTile) + 2)
    }

    if (objective.kind === 'royalties') {
      push(withEffect('royalties')[0], 10)
      // The vault ceiling has to clear the target or the money cannot be held.
      const perTile = treasury ? roomDef(treasury).effects!.treasury!.capacityPerTile : 1
      push(treasury, Math.ceil(objective.amount / perTile) + 2)
    }

    if (objective.kind === 'creatures' && lair) {
      // Beds are the roster ceiling, and only beds *above* the starting crew
      // buy you anybody new.
      const perTile = roomDef(lair).effects!.lair!.bedsPerTile
      push(lair, Math.ceil(objective.amount / perTile) + 2)
    }
  }

  // Anything else the wing offers, small, so the level's own rooms get used.
  for (const id of available) {
    if (roomDef(id).costPerTile === 0) continue
    push(id, 4)
  }
  return wants
}

/** The N buildable tiles nearest the starting chamber. */
function nearestBuildable(sim: Simulation, room: string, count: number) {
  const tiles: { x: number; y: number; d: number }[] = []
  for (let y = 0; y < sim.grid.height; y++) {
    for (let x = 0; x < sim.grid.width; x++) {
      if (!sim.canBuildAt(room, x, y)) continue
      tiles.push({ x, y, d: Math.hypot(x - sim.def.heart.x, y - sim.def.heart.y) })
    }
  }
  tiles.sort((a, b) => a.d - b.d)
  return tiles.slice(0, count).map(({ x, y }) => ({ x, y }))
}

/** Marks rock next to ground you already hold, veins first. */
function topUpDigging(sim: Simulation): void {
  let queued = 0
  const candidates: { x: number; y: number; score: number }[] = []
  for (let y = 0; y < sim.grid.height; y++) {
    for (let x = 0; x < sim.grid.width; x++) {
      const i = sim.grid.idx(x, y)
      if (sim.grid.designated[i]) {
        queued++
        continue
      }
      if (!sim.grid.diggable(x, y)) continue
      const touchesOurs = sim.grid
        .neighbours(x, y)
        .some((n) => sim.grid.walkable(n.x, n.y) && sim.grid.claimed[sim.grid.idx(n.x, n.y)])
      if (!touchesOurs) continue
      const vein = sim.grid.kindAt(x, y) === TileKind.Vein ? 100 : 0
      candidates.push({ x, y, score: vein - Math.hypot(x - sim.def.heart.x, y - sim.def.heart.y) })
    }
  }
  if (queued >= DIG_QUEUE) return
  candidates.sort((a, b) => b.score - a.score)
  for (const c of candidates.slice(0, DIG_QUEUE - queued)) sim.designate(c.x, c.y, true)
}

function act(sim: Simulation, wants: Plan[]): void {
  topUpDigging(sim)
  for (const want of wants) {
    const have = sim.roomTileCount(want.room)
    if (have >= want.tiles) continue
    const perTile = roomDef(want.room).costPerTile
    // Never spend the last of it: an empty vault stalls hauling and wages.
    const affordable = perTile > 0 ? Math.floor((sim.royalties - 150) / perTile) : 99
    if (affordable <= 0) continue
    const tiles = nearestBuildable(sim, want.room, Math.min(want.tiles - have, affordable, 6))
    if (tiles.length > 0) sim.build(want.room, tiles)
    return
  }
}

interface Result {
  level: LevelDef
  status: string
  at: number
  objectives: { label: string; progress: number; target: number; done: boolean }[]
  /** End-state, so a stalled level says why rather than just how far. */
  state: string
}

function play(def: LevelDef, budget: number): Result {
  const sim = new Simulation(def)
  const wants = plan(def)
  let actIn = 0
  let t = 0
  for (; t < budget; t += STEP) {
    sim.tick(STEP)
    if (sim.status !== 'playing') break
    actIn -= STEP
    if (actIn <= 0) {
      actIn = 2
      act(sim, wants)
    }
  }
  const built = [...sim.rooms.values()].reduce((m, r) => {
    m.set(r.def, (m.get(r.def) ?? 0) + r.tiles)
    return m
  }, new Map<string, number>())
  const wages = sim.creatures.reduce(
    (sum, c) => sum + (creatureDef(c.def).worksForFree ? 0 : creatureDef(c.def).wage),
    0,
  )
  return {
    level: def,
    status: sim.status,
    at: t,
    state: [
      `roy ${Math.round(sim.royalties)}/${sim.vaultCapacity}`,
      `buzz ${Math.round(sim.buzz)}`,
      `crew ${sim.population}/${sim.capacity}`,
      `rep ${Math.round(sim.reputation)}`,
      `intruders ${sim.enemies.length}`,
      `wages ${wages}/payday`,
      `beds ${sim.beds}`,
      `rooms ${[...built].map(([id, n]) => `${id}:${n}`).join(' ')}`,
    ].join('  '),
    objectives: sim.objectiveStates.map((s) => ({
      label: s.objective.label,
      progress: Math.floor(s.progress),
      target: s.target,
      done: s.done,
    })),
  }
}

const [filter, budgetArg] = process.argv.slice(2)
const budget = Number(budgetArg) || DEFAULT_BUDGET
const levels = LEVELS.filter((l) => !filter || l.id.includes(filter))

console.log(`Playing ${levels.length} level(s), ${budget}s budget each.\n`)

let cleared = 0
const flagged: string[] = []

for (const def of levels) {
  const result = play(def, budget)
  const mark = result.status === 'won' ? 'WON ' : result.status === 'lost' ? 'LOST' : 'open'
  if (result.status === 'won') cleared++
  console.log(`${mark}  ${def.id.padEnd(6)} ${def.name}  (${Math.round(result.at)}s)`)
  console.log(`        ${result.state}`)
  for (const o of result.objectives) {
    const pct = o.target > 0 ? Math.round((o.progress / o.target) * 100) : 100
    const tick = o.done ? '✓' : pct >= 60 ? '·' : '✗'
    console.log(`        ${tick} ${o.label.padEnd(44)} ${o.progress}/${o.target} (${pct}%)`)
    // Under a third of the way in twenty minutes is not a difficulty curve,
    // it is a number nobody checked.
    if (!o.done && pct < 34) flagged.push(`${def.id}: ${o.label} — ${o.progress}/${o.target}`)
  }
  console.log()
}

// ── Static arithmetic ───────────────────────────────────────────────────────
// Some objectives are not "hard", they are impossible, and playing them out
// only ever tells you that slowly. These two checks say so in one line.

const PAYDAY = 90

console.log('\nBuzz objectives — tiles of the level\'s best Buzz room needed to sustain the target:')
for (const l of levels) {
  for (const o of l.objectives) {
    if (o.kind !== 'buzz') continue
    const rooms = l.rooms
      .map(roomDef)
      .filter((r) => r.effects?.buzz)
      .sort((a, b) => b.effects!.buzz!.perMinutePerTile - a.effects!.buzz!.perMinutePerTile)
    const best = rooms[0]
    if (!best) {
      console.log(`  ${l.id}  ${o.amount} Buzz — the level offers no Buzz room at all`)
      continue
    }
    const e = best.effects!.buzz!
    // A stable room banks a floor decay cannot touch, so it only needs time.
    const line = e.stable
      ? `${Math.ceil(o.amount / e.perMinutePerTile)} tile-minutes of ${best.id} (stable, so time not size)`
      : `${Math.ceil((o.amount * BUZZ_DECAY * 60) / e.perMinutePerTile)} tiles of ${best.id}`
    console.log(`  ${l.id.padEnd(6)} ${String(o.amount).padStart(4)} Buzz  ${line}`)
  }
}

console.log('\nRoyalties objectives — passive income against the wage bill at the roster the level asks for:')
for (const l of levels) {
  const target = l.objectives.find((o) => o.kind === 'royalties')
  if (!target || target.kind !== 'royalties') continue
  let passive = 0
  for (const id of l.rooms) {
    const e = roomDef(id).effects
    if (e?.royalties) passive = Math.max(passive, e.royalties.perMinutePerTile * 10)
    if (e?.refine) passive = Math.max(passive, e.refine.royaltiesPerMinutePerTile * 10)
  }
  const rosterObj = l.objectives.find((o) => o.kind === 'creatures')
  const roster = rosterObj && rosterObj.kind === 'creatures' ? rosterObj.amount : l.capacity
  const wages = l.startingCreatures.map((s) => creatureDef(s.creature).wage)
  const avg = wages.reduce((a, b) => a + b, 0) / Math.max(1, wages.length)
  const bill = (roster * avg * 60) / PAYDAY
  const net = passive - bill
  const verdict = net >= 0 ? 'sustainable' : `short ${Math.round(-net)}/min — funded only by finite veins`
  console.log(
    `  ${l.id.padEnd(6)} ${String(target.amount).padStart(5)} Royalties  passive ${Math.round(passive)}/min  wages ${Math.round(bill)}/min  ${verdict}`,
  )
}

console.log()
console.log(`Cleared ${cleared}/${levels.length} inside the budget.`)
if (flagged.length > 0) {
  console.log(`\n${flagged.length} objective(s) barely moved — worth a human look:`)
  for (const line of flagged) console.log(`  ${line}`)
}
