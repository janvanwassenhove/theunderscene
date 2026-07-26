# Phase 0 — engine skeleton

Internal technical changelog. Factual, not for publication: any public-facing
release notes are a separate manual step in Jan's own voice, using this as input.

Date: 2026-07-26

## What shipped

**Project**
- Vue 3 + Vite + TypeScript, PixiJS v8 for the world layer.
- `base: '/theunderscene/'`, with PWA `scope`/`start_url` derived from it so the
  deployed subpath build behaves the same as localhost.
- GitHub Actions: `deploy.yml` (build + publish `dist/` to Pages on push to
  `main`), `ci.yml` (typecheck, test, build on PRs).
- 25 unit tests over grid, pathfinding and simulation. Verified end to end in
  headless Chromium at phone-landscape viewport: boots, digs, builds, saves,
  survives reload, and loads with the network switched off.

**PWA shell**
- `vite-plugin-pwa` (Workbox), precaches the full app shell — 18 entries, ~673 KiB.
- Manifest, icon set (192, 512, maskable 512, apple-touch 180) generated from
  `scripts/generate-icons.mjs` — raw PNG encoding via `node:zlib`, no image
  dependency, icons reproducible from source.
- Install prompt captured and surfaced on the title screen; update-available
  path wired.

**Engine**
- `Grid`: typed-array tile map (kind, dig work, claim, room id, designation,
  vein, loose piles, seen).
- `mapgen`: seeded and deterministic — bedrock border, carved starting chamber,
  veins biased away from the start, flooded pockets, hidden caches, one Booking
  Agent's Door placed a short dig away.
- `pathfinding`: A* with a binary heap and a node cap, plus a BFS
  "nearest tile matching a predicate" used by every job search.
- `Simulation`: fixed 15Hz tick. Dig designation and completion, auto-claim,
  hauling loose Royalties to a vault with a real capacity ceiling, instant paid
  room building with merge-on-adjacency, demolition at half refund, room
  production (Buzz, Royalties, meals, morale), Buzz decay, Reputation drift,
  payday every 90s, hunger/fatigue/loyalty needs, creatures quitting at zero
  loyalty, creature attraction through doors, training and levelling, objectives,
  one-shot hints.
- Save/load: full snapshot to IndexedDB via `idb-keyval` (typed arrays stored
  natively through structured clone), localStorage fallback, autosave every 30s
  plus on level open, on tab hide and on page hide.

**Input**
- One pointer abstraction for touch, pen and mouse. One finger pans or paints
  depending on the active tool; two fingers always pan and pinch-zoom; tap,
  double tap and long press all supported; wheel zoom for desktop testing.
- Isometric hit-testing accounts for block height, so tapping the visible top
  face of a wall selects that wall rather than the tile behind it.

**Renderer**
- Isometric sprite renderer, 64px tiles, single generated texture atlas so the
  world batches. Tile sprites rebuilt only from the simulation's dirty set.
- Placeholder art only: flat silhouettes at final size and proportion, drawn
  procedurally. No invented "final-looking" art.
- Camera pan/zoom with bounds clamping and an opening zoom fitted to viewport
  height. Device pixel ratio capped at 2.

**UI**
- Title, Underscene Map hub (all eight campaigns visible; planned ones locked
  with their tagline), gig-poster level intro, and the game HUD.
- HUD: top counter bar with pause and 1×/2×/3× speed, bottom dock (tools /
  build / spells) with ≥44px targets, right drawer (goals / crew / log), inspect
  card, hint toasts, pause and victory sheets.
- Landscape-first; portrait shows a dismissible rotate prompt rather than a block.

**Content (data-driven, per §14)**
- 11 rooms, 5 creatures, 7 spells, 8 campaigns declared, 3 playable levels in
  Campaign 0.

## What is not in yet

- **No enemies and no combat.** The intruder roster, raids and the Eviction
  Warlord are Phase 1. Level 3's "hold the basement" objective is currently just
  a timer.
- **No audio.** Howler and the genre-wing stems land in Phase 5.
- **Spells partially wired.** Encore, Callback, Backstage Pass, Fast Forward and
  Mosh Pit work. Sold Out seals a door but nothing yet tries to walk through
  one. Viral Moment is implemented but not granted in Campaign 0.
- **Rooms declared but inert:** Contract Office, Signing Room and Merch Stand
  have no engine behaviour until captives (Phase 2) and water bridging exist.
- **No Reputation consequences.** The number moves and is displayed; nothing
  reads it yet.
- **Water is impassable and permanent.** The Merch Stand cannot bridge it yet.
- **Placeholder art and placeholder flavour text throughout.** Bark lines and
  level intros are drafts, pending the voice pass.

## Known rough edges

- Creatures path only orthogonally, so they visibly corner around rock rather
  than cutting diagonally. Intentional for now — diagonal moves through a rock
  corner read badly in isometric.
- Job assignment picks the nearest reachable target by BFS with no smoothing, so
  a crowd will sometimes converge on the same corridor and shuffle.
- Rock you cannot see cannot be marked. That is deliberate, but it means a
  drag across unexplored black does nothing and gives no feedback.
- Level 3 is beatable but long; its 8-minute survive objective is untuned
  without raids to push against.

## Verified on

Headless Chromium at 802×293 CSS px (phone landscape). Not yet tested on
physical hardware — that is the outstanding item before Phase 0 is signed off.
