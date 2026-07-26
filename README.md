# The Underscene

A dungeon-management game about running an underground record label out of a
damp basement. You dig, you build rooms, creatures wander in and immediately
develop opinions, and the industry keeps sending people down the stairs.

Mobile-first installable PWA. Vue 3 + Vite for the chrome, PixiJS for the
isometric world, IndexedDB for saves. No account, no server, no network needed
after the first load.

**Status: Phase 0 complete** — engine skeleton with a playable first level of
Campaign 0. See `docs/CHANGELOG-phase-0.md` for exactly what does and does not
work yet.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173/theunderscene/
npm test           # simulation, grid and pathfinding unit tests
npm run typecheck
npm run build      # regenerates icons, typechecks, builds to dist/
npm run preview    # serves dist/ exactly as GitHub Pages will
```

The service worker is only active in production builds, so PWA install and
offline behaviour must be tested against `npm run preview` (or the deployed
URL), never `npm run dev`.

## Deploying

GitHub Pages serves this repo from a subpath, so `vite.config.ts` sets
`base: '/theunderscene/'` and the PWA manifest's `scope` and `start_url` are
derived from it. Get that wrong and everything works locally while the deployed
build silently fails to install or cache.

`.github/workflows/deploy.yml` builds and publishes `dist/` on every push to
`main`. Enable it once under **Settings → Pages → Source: GitHub Actions**.

Hosting at a domain root instead: build with `VITE_BASE=/`.

## Architecture

```
src/
  game/
    data/          all content: rooms, creatures, spells, wings, levels
    core/          grid, map generation, pathfinding, simulation, save, game loop
    input/         one pointer abstraction for touch, pen and mouse
    render/        Pixi renderer, isometric projection, placeholder atlas
  ui/              Vue screens and HUD — the zine/gig-poster layer
```

Three rules the code sticks to:

1. **Content is data.** Rooms, creatures, spells and levels are declared in
   `src/game/data/*` and read generically by the engine. Rebalancing, or adding
   a whole genre wing, is a data edit. See `docs/content-authoring.md`.
2. **The simulation knows nothing about rendering, input or Vue.** It is a plain
   class driven by `tick(dt)`, which is why the tests can run a whole level
   headlessly in milliseconds.
3. **Touch is not a special case.** Every pointer — finger, pen or mouse — goes
   through `src/game/input/pointerInput.ts`.

## Controls

| Input | Does |
|---|---|
| Tap (Look/Move tool) | Inspect a tile, or select a creature |
| Drag (Look/Move tool) | Pan the camera |
| Drag (Dig tool) | Mark rock for digging; starting on a marked tile erases instead |
| Drag (Build tool) | Drag out a room footprint; releasing pays for it |
| Two fingers | Pan and pinch-zoom, always, whatever tool is active |
| Double tap | Recentre on the selection |
| Long press | Inspect whatever is under your finger |
| Spell then tap | Targeted spells use tap-to-confirm, not drag-to-aim |

## Performance budget

Targets 30fps on a three-year-old mid-range Android, 60fps on current hardware.
What keeps it there: one texture atlas so the world batches into few draw calls,
tile sprites rebuilt only when the simulation marks them dirty, a fixed 15Hz
simulation step decoupled from rendering, device pixel ratio capped at 2, and a
level cap of roughly 40×30 tiles with a per-level creature cap ("Basement
Capacity").

## Legal

Original IP. Inspired by the dungeon-management genre as a genre — no code, art,
audio, level data, creature names or designs are taken from any existing game,
and none ever will be. Genre archetypes (imp, ogre, wraith) are generic fantasy
tropes and are fine; specific designs from specific titles are not.
