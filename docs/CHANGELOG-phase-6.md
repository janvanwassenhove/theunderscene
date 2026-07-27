# Phase 6 — the rest of the brief

Internal technical changelog. Not release notes: nothing here is public-facing,
and nothing here has been through the voice guide. Any announcement is a
separate, manual step.

## Camera

The world view turns and zooms.

- `iso.ts` gained a view rotation in 90° steps, applied about the grid centre.
  It is a projection-only transform: the grid, pathfinding, digging and saves
  never rotate, so only the mapping from tile to screen changes. `screenToTile`
  inverts the same transform, so a tap lands on the tile under the finger at
  every orientation, and `depth` stays keyed to the rotated screen row so blocks
  cannot draw through each other after a turn.
- `WorldRenderer.rotateView(steps)` keeps whatever was in the middle of the
  screen in the middle of the screen through a turn. `zoomBy(factor)` is the
  stepped version of the pinch that was already there.
- It is all gesture, no chrome. A button pad shipped first and was cut: on a
  landscape phone the viewport is under 400px tall and a column of 44px buttons
  ate the left edge of a screen that has very little of it. Two fingers pan and
  pinch as before, and **twisting them turns the basement** — 60° of wrist per
  quarter-turn, generous on purpose so a slightly crooked pinch never spins the
  view. Double-tap recentres. On a desktop the wheel zooms, shift and wheel
  turns, and Q / E / + / − / 0 do the same from the keyboard.
- `tests/gestures.test.ts` drives the DOM events directly: a twist turns the
  right way, a straight pinch never turns at all, a small crooked wobble is
  tolerated, and adding a third finger retakes the reference rather than
  snapping the view round.
- `tests/iso.test.ts` round-trips every third tile at all four orientations,
  asserts depth still sorts by screen row, and asserts the block-height
  correction is still needed and still correct after a turn.

## Digging in the dark

`designate()` no longer requires that a tile has been seen or is reachable.
Anything diggable can be marked, so you can plan a tunnel out into black map and
the crew work towards it as the rock opens up. Marking an unexplored tile
reveals that one tile only — the plan is legible, the map around it is not.

## Ownership

Dug floor was already claimed. Floor your crew walks over now is too, so
corridors a level ships pre-carved stop reading as somebody else's ground.
Claimed floor carries the wing's mark and unclaimed floor is darker, so what you
hold reads apart from what you have merely tunnelled through.

## Traps

New content catalogue, `src/game/data/traps.ts`, and a new dock tab.

- One trap per tile, on plain ground you own. Costs Royalties up front, arms
  after `armSeconds`, fires on the first intruder within `trigger` tiles, and
  spends a charge each time. At zero charges it is gone.
- Three effects, all data: `damage`, `slow` (which is why `Enemy` gained a speed
  multiplier), and `alarm`, which hurts nobody and pulls every free creature to
  the tile instead.
- Tear down lifts a trap and refunds half, the same deal as a room.
- Which traps a level offers is a level-design lever. `traps: []` hides the tab
  entirely, which is how the first basement stays a one-verb-at-a-time tutorial.
  Metal adds the Blast Beat Plate, Electronic the Strobe Pit, the finale both.

## Ranged intruders

`ranged` had been on the enemy schema since Phase 1 and was never implemented.
It now works, and the **Comment Section Sniper** uses it: 45 HP, six tiles of
range, never closes.

- Line of sight is sampled along the straight line and blocked by anything
  solid, so a wall stops a Sniper dead and digging round the side is the answer.
- Creatures answer whoever is shooting at them regardless of distance —
  otherwise a Sniper sat outside `DEFEND_RADIUS` and plinked forever while the
  crew carried on digging.
- It joins the later waves of every campaign from Reverb Hollow onwards.

## Campaign length

Every genre wing now runs five levels, which is the low end of the brief's 5–7.
The new levels are `c1-l5` … `c6-l5`, each the hardest expression of its wing's
mechanic rather than a longer version of the level before it.

The First Basement stays at three (it is the tutorial, one verb per level) and
The Algorithm stays at three (one level per boss phase). Both are recorded as
deliberate in `roadmap.md`.

## Saves

`SNAPSHOT_VERSION` is 4. Snapshots carry traps and the enemy speed multiplier;
a version 3 save loads with neither, which is exactly right.

## Tests

85 passing across 9 files. New: `tests/iso.test.ts` (5), `tests/traps.test.ts`
(8), `tests/gestures.test.ts` (5), three ranged-intruder cases in
`tests/combat.test.ts`, and three in `tests/simulation.test.ts` for claiming
ground underfoot and the two economy rules. `tests/content.test.ts` now also
walks every level's trap list.

## Balance harness

`scripts/balance.ts` plays every level headlessly with an unclever bot and
reports how far it gets, plus two static checks that need no play at all. It
found three bugs, all now fixed, each one a case of the data promising something
the engine did not do: `drain` took Buzz level-wide while its own blurb said
"nearby rooms", the Reverb Chamber's stated "it never decays" was never
implemented, and the Sample Vault's yield ignored its own tile count even though
a level objective asks you to run a ten-tile one. A missed payday also now
scales its loyalty hit by the shortfall instead of charging a flat 18 whether
you were ten Royalties short or paid nobody at all.

It also measured the thing the roadmap had only ever asserted: the Royalties
economy is short by 130–390/min on every level that asks you to bank any. That
is a design decision rather than a bug, and `docs/balance.md` lays out the
numbers and the four ways out without picking one.

## Still outstanding

- **Art.** Still procedural placeholders at final size and proportion. This is a
  production pipeline, not an engineering task.
- **Balance by a human.** All 36 levels generate, connect and run; none has been
  played to completion by a person.
- **On-device testing.** The brief's own bar for done, and not something that
  can be signed off from here.
