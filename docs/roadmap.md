# Roadmap

The plan from the design brief, and where the code currently stands against it.
Each phase ends in something installable and testable on a phone — "can I put
this on my phone" is the bar for done, not "the code is merged".

## Phases

| Phase | Deliverable | Status |
|---|---|---|
| **0** | Engine skeleton: grid, camera, dig/build, PWA shell, IndexedDB save/load | **done** — see `CHANGELOG-phase-0.md` |
| **1** | Campaign 0 vertical slice: core rooms, core creatures, first enemy, spellcasting, Eviction Warlord mini-boss | **done** — see `CHANGELOG-phase-1.md` |
| **2** | Punk/Ska + Metal wings, expanded enemy roster, full spell list, Reputation and Loyalty systems | **done** — see `CHANGELOG-phase-2-5.md` |
| **3** | Shoegaze + Hip-Hop wings, Underscene Map meta-progression, Cypher and synergy sub-mechanics | **done** |
| **4** | Electronic + Folk wings, The Algorithm finale, Mixing Board mechanic | **done** |
| **5** | Performance pass, PWA install/offline hardening, audio, art to final fidelity | **audio and perf done; art is the remaining piece** |
| **6** | Traps, ranged intruders, view rotation and zoom, campaign length | **done** — see `CHANGELOG-phase-6.md` |

Phase 0 already ships a partial Phase 3 item — the Underscene Map hub exists so
all eight campaigns are visible from the start, with unbuilt wings shown as
locked pins carrying their design-doc tagline. Phase 1 shipped the whole enemy
roster rather than the one type the plan called for, so Phase 2's enemy work is
behaviour and balance rather than new content.

## Campaigns

| # | Campaign | Wing | Beat |
|---|---|---|---|
| 0 | The First Basement | Punk/DIY | Start a label out of spite and a leaky basement. Teaches the basics. |
| 1 | Basement DIY | Punk & Ska | Word gets out, first scouts arrive, ska horns unlock mid-campaign. |
| 2 | The Rehearsal Crypt | Metal | Bigger, meaner creatures; slower economy, harder raids. |
| 3 | Reverb Hollow | Shoegaze | Quiet, passive, slow — a deliberate change of pace and tone. |
| 4 | The Sample Vault | Hip-Hop | Economy wing: flipping resources, strongest merch economy, Cypher mini-game. |
| 5 | Analog Deep | Electronic/Rave | Fastest Buzz generation and fastest decay; glitch debuffs. |
| 6 | The Kindling Hall | Folk | Communal buffs; teaches synergy ahead of the finale. |
| 7 | The Algorithm | All | One basement housing every wing at once, against the Overlord. |

## Campaign length

The brief asks for 5–7 levels per campaign. Every genre wing runs five. Two
campaigns deliberately do not:

- **The First Basement (3).** It is the tutorial. Each level introduces one
  verb — dig and build, then spells and the first raid, then the Warlord.
  Padding it would mean teaching nothing for two levels.
- **The Algorithm (3).** One level per phase of the boss, which is the shape the
  design doc gives it. A fourth level would be a phase that does not exist.

## What is left

- **Art.** Every sprite is still a procedurally drawn placeholder at final size
  and proportion. This is the largest remaining piece of work and it is a
  production pipeline, not an engineering one — see below.
- **The Royalties economy.** Measured, not guessed: passive income runs
  20–50/min against a wage bill of 80–414/min at the rosters the levels
  themselves ask for, so every `Bank N Royalties` objective is funded only by
  the map's finite veins. Four honest directions out of it, and picking one is a
  design call — see `balance.md`, and `scripts/balance.ts` to check any answer.
- **Balance by a human.** A bot clears 10 of 36 levels unaided. Nothing has been
  played to completion by a person.
- **On-device testing.** Still the brief's own bar for done.

## Art pipeline

Placeholders first, on purpose. Phase 0 and 1 run on procedurally drawn flat
silhouettes at final size and proportion (`src/game/render/atlas.ts`); the
coding side never invents finished-looking art.

Per wing, in order:

1. Lock the style bible with **one** fully finished hero creature (Doom Ogre for
   Metal, Punk Imp for Punk/Ska) before generating anything else in that wing.
2. Generate the rest of the wing's roster against that reference, one image-gen
   prompt per asset, built from the role/silhouette/palette/quirk fields already
   in `creatures.ts` and `rooms.ts`.
3. One fixed isometric hero angle per creature — billboarded, not a 3D
   turnaround.
4. Five animations each — Idle, Walk, Work, Attack, Special — at 2–4 frames.
   Deliberately stiff. It reads as chunky stop-motion, not as a shortcut.
5. Script the background-key, palette-lock and atlas packing; 64px tiles, @2x for
   retina, one atlas per wing so unused wings never load.

## Legal guardrails

- No copied code, art, audio or level data from any existing game. Ever.
- No reuse of specific creature names or designs from any existing title. Genre
  archetypes — imp, ogre, wraith — are generic fantasy tropes and are fine.
- Spell names like Sold Out are original names for a genre-standard *concept*
  (seal a door). That is the line, and it is not one to push further.
