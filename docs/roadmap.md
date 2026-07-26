# Roadmap

The plan from the design brief, and where the code currently stands against it.
Each phase ends in something installable and testable on a phone — "can I put
this on my phone" is the bar for done, not "the code is merged".

## Phases

| Phase | Deliverable | Status |
|---|---|---|
| **0** | Engine skeleton: grid, camera, dig/build, PWA shell, IndexedDB save/load | **done** — see `CHANGELOG-phase-0.md` |
| **1** | Campaign 0 vertical slice: core rooms, core creatures, first enemy, spellcasting, Eviction Warlord mini-boss | next |
| **2** | Punk/Ska + Metal wings, expanded enemy roster, full spell list, Reputation and Loyalty systems | planned |
| **3** | Shoegaze + Hip-Hop wings, Underscene Map meta-progression, Cypher and synergy sub-mechanics | planned |
| **4** | Electronic + Folk wings, The Algorithm finale, Mixing Board mechanic | planned |
| **5** | Performance pass, PWA install/offline hardening, audio (Howler + wing music), art to final fidelity | planned |

Phase 0 already ships a partial Phase 3 item — the Underscene Map hub exists so
all eight campaigns are visible from the start, with unbuilt wings shown as
locked pins carrying their design-doc tagline.

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

## Content already declared but not yet wired

These exist as data (`src/game/data/`) and need engine work, not design work:

- **Enemies** — full roster plus the three-phase final boss in `enemies.ts`.
  Nothing spawns them yet.
- **Rooms** — Contract Office, Signing Room and Merch Stand are declared with no
  engine behaviour until captives and water bridging exist.
- **Spells** — Sold Out seals a door but nothing walks through doors yet; Viral
  Moment works but is not granted in Campaign 0.

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
