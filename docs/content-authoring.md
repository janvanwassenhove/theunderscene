# Adding and rebalancing content

Everything the game can build, hire, cast or play is declared in
`src/game/data/`. The engine reads the fields generically and never branches on
a specific id, so all of the below is a data edit — no engine changes, no code
review cycle for a balance pass.

```
src/game/data/
  types.ts              the schema every content file is checked against
  wings.ts              per-genre palette, lighting and set-dressing notes
  rooms.ts              room catalogue
  creatures.ts          creature roster
  spells.ts             spell catalogue
  campaigns.ts          the Underscene Map and the level index
  levels/campaign-0.ts  level scripts for The First Basement
```

## Rebalancing

Change the number, run `npm test`. Typical knobs:

- **Room output** — `effects.buzz.perMinutePerTile`, `effects.royalties.perMinutePerTile`
- **Room cost** — `costPerTile`, and `minTiles` for the size below which a room does nothing
- **Creature economics** — `wage`, `workRate`, `loyaltyDecay`, `speed`
- **Level pacing** — `startRoyalties`, `capacity`, `veinDensity`, `cacheCount`, `objectives`

## Adding a room

Append to `ROOMS` in `rooms.ts` and list its id in a level's `rooms` array.

```ts
{
  id: 'reverb-chamber',
  name: 'Reverb Chamber',
  role: 'passive buzz',          // designer note, never shown in game
  wing: 'shoegaze',
  costPerTile: 70,
  minTiles: 4,                    // below this the room exists but produces nothing
  color: 0x3a3644,                // placeholder tint until the wing atlas lands
  accent: 0xb7a4e8,
  blurb: 'Very slow. Never decays. The wing’s stability anchor.',
  effects: { buzz: { perMinutePerTile: 1.2 } },
  attracts: [{ creature: 'shoegaze-wraith', minTiles: 4, weight: 2 }],
}
```

`effects` is the whole contract with the engine. Supported today: `treasury`,
`lair`, `food`, `training`, `buzz`, `royalties`, `portal`, `prison`, `morale`
and `bridge`. A room with no `effects` is decorative and costs Royalties, which
is a legitimate design choice, not a bug.

`bridge` lets a room be laid over water, and only from ground the player already
holds; removing it puts the water back.

`attracts` is what makes creatures walk in through a Booking Agent's Door, once
the room is at least `minTiles` big and the basement is under its cap.

## Adding a creature

Append to `CREATURES` in `creatures.ts`. `canDig` and `canHaul` decide which
jobs it will take; `build` (`squat` / `tall` / `wisp`) picks the placeholder
silhouette and is also the shape note for the eventual art brief. `barks` are
placeholder copy — final lines go through the voice guide in a separate pass.

## Adding an enemy

Append to `ENEMIES` in `enemies.ts`, then list it in a level's `raids`.
`target` decides what it walks towards when nothing is in its face (`vault`,
`venue` or `creatures`), `aggro` is how close a creature has to get before it
breaks off to fight, and `behaviour` is its gimmick:

| behaviour | does |
|---|---|
| `melee` | fights, and pulls down a room tile at a time when it reaches one |
| `capture` | stands next to a creature and signs them after `captureSeconds` of contact |
| `drain` | siphons Buzz continuously while it is in the basement |
| `timer` | counts down and applies a room debuff if not intercepted, then leaves |
| `curse` | halves a creature's work rate for a duration |
| `ranged` | declared, not yet implemented |

`convertSeconds` is how long a Signing Room needs to talk that intruder round
once it has been beaten and dragged to a Contract Office.

## Adding a level

Add a `LevelDef` to a file in `levels/`, then list its id in the campaign's
`levels` array in `campaigns.ts`. Levels are generated from `seed`, so the same
seed always digs the same basement — change the seed to reroll the layout.

`objectives` support `royalties`, `buzz`, `creatures`, `room` (N tiles of a given
room), `survive` (N seconds) and `defeat` (N of a given enemy seen off). All of
them must be met to clear the level.

`raids` is the incursion schedule. Each wave is a time in seconds, the intruders
it brings, and the line announced when it lands:

```ts
raids: [
  {
    at: 150,
    enemies: [{ enemy: 'ar-scout', count: 1 }],
    announce: 'An A&R Scout is downstairs. They are here to sign someone.',
  },
]
```

Waves arrive through the Booking Agent's Door. If every door is sealed when a
wave is due, it waits outside rather than being skipped.

`hints` fire once each, as a toast, when their `when` condition first becomes
true. Campaign 0 doubles as the tutorial, so this is where the teaching lives —
there is no separate tutorial mode.

## Adding a campaign

Add a `CampaignDef` to `CAMPAIGNS`. Campaigns with `status: 'planned'` appear on
the Underscene Map as locked pins with their tagline, which is how every wing
from the design doc is already visible without being playable. `requires` points
at the campaign that must be cleared first.

## Art

Placeholder sprites are generated procedurally in `src/game/render/atlas.ts` at
final size and proportion — flat silhouettes, deliberately not
finished-looking. Real art replaces them one wing at a time, and only after that
wing's style bible is locked. The colours in `wings.ts` and each room's
`color`/`accent` are the palette that art is authored against.
