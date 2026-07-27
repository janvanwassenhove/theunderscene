# Phases 2–5 — every wing, the finale, and audio

Internal technical changelog. Factual, not for publication: any public-facing
release notes are a separate manual step in Jan's own voice, using this as input.

Date: 2026-07-27

This lands the rest of the roadmap in one pass: all six remaining genre wings,
all seven remaining campaigns, the Algorithm finale, and audio.

## Content

**27 levels across 8 campaigns**, every one reachable by clearing the one before
it. Campaign 0 keeps its three tutorial levels; campaigns 1–6 have four each;
the finale has three.

**29 rooms** and **14 creatures**, each wing carrying at least one mechanic that
is only true of that wing:

| Wing | What is actually different about it |
|---|---|
| Punk & Ska | Venue Buzz spikes, merch income, brass buff pulses |
| Metal | Echo rooms that ramp while occupied; the wing loses Loyalty twice as fast without a Corpsepaint Vanity; Moshpit trains faster and injures |
| Shoegaze | Buzz that never decays; a creature intruders cannot see and that refuses to fight |
| Hip-Hop | The Sample Vault flips banked Royalties into more of them — but only while you hold a float, which inverts the usual "spend it all" pressure |
| Electronic | The most Buzz in the game and the fastest decay; recruits arrive cheap and disloyal; Synths drop out on a timer; the DJ Throne is one tile worth more than most rooms |
| Folk | Everything scales with headcount — Campfire Rings and Elders both feed one work multiplier — and Banjo Sprites never appear on the payroll |
| Finale | Every wing buildable at once, against an enemy that halves all output on a timer |

**The finale mechanic** is `flatten`: on a schedule the Algorithm halves every
room's output until a Mixing Board of the level's `counterTiles` size clears it.
You cannot out-earn it; you have to answer it. Phase 1 is Server Farms —
structures that never move, never fight and drain Buzz until smashed. Phase 3 is
one wave containing every enemy in the game.

## Engine

New room effects, all read generically: `communal`, `echo`, `refine`, `elite`,
`recruit`, `cypher`, `counter`. New creature fields: `needsRoom`, `stealth`,
`refusesCombat`, `communalBuff`, `glitches`, `worksForFree`. New enemy field:
`structure`.

`defineLevel()` fills in the parts of a level that are the same every time —
grid size, densities, where the chamber goes — so a level file is only the parts
that differ. Overriding any field still wins.

## Audio

Generated, not downloaded. The brief specifies Howler plus per-wing stems; the
stems do not exist, and a PWA that must run with the radio off cannot fetch them
later. So `src/game/audio/audio.ts` is a small WebAudio synth: a per-wing drone
(detuned oscillators through a low filter, tuned per wing) and seven one-shots
for digging, building, combat, alerts and outcomes. Nothing to precache, nothing
to load, and it swaps out for real stems when there are any. Off/on is a stored
setting, and no AudioContext exists until the player has interacted, because
browsers do not allow one before that.

The simulation deliberately does **not** import it — combat sounds are triggered
from `Game`, for the same reason the simulation knows nothing about rendering.
The first attempt did import it and broke 13 tests in Node; that was the wrong
shape and got reverted rather than patched.

## Verification

**60 unit tests**, all passing. The new ones:

- `content.test.ts` walks all 27 levels and asserts every room, creature, enemy
  and spell they name exists, every room an objective demands is actually
  unlocked on that level, campaigns chain into an unlockable order, every level
  generates a chamber with a reachable door and its stated crew, and a full
  minute of every level runs without throwing or going non-finite.
- `wings.test.ts` covers one distinctive mechanic per wing: communal buffs
  rising and falling with the crowd, Banjo Sprites never billed, Metal draining
  faster without its Vanity, the Sample Vault paying only against a float, the
  DJ Throne only counting while occupied, Synths actually glitching, Shoegaze
  being invisible to intruder targeting, flattening firing and being cleared by
  the Board, and Server Farms sitting still while they drain.

**Headless Chromium**, phone landscape: the full map with all eight campaigns,
the finale's 23-room dock, and the finale run at 3× through two raid waves with
Server Farms on the field and three-phase objectives tracking. No console errors.

## Scope notes and what is still open

- **Four levels per campaign, not the five to seven in the brief.** A deliberate
  cut: the wings are all mechanically distinct and each has a full arc, but a
  longer campaign is more of the same authoring rather than more engine. Adding
  levels is now a data edit against `defineLevel`.
- **Balance is untuned by a human.** Every level is verified to run, be
  connected and be internally consistent; none has been played to completion by
  a person. Objective thresholds are educated guesses.
- **Still no traps**, and `ranged` enemy behaviour is still declared but unused —
  every intruder closes to melee.
- **Still placeholder art**, and flavour text throughout is a draft pending the
  voice pass.
- **Still not tested on physical hardware.** That remains the brief's own bar for
  done, and it remains the outstanding item.
