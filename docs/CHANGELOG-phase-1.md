# Phase 1 — combat, raids and the Eviction Warlord

Internal technical changelog. Factual, not for publication: any public-facing
release notes are a separate manual step in Jan's own voice, using this as input.

Date: 2026-07-26

## What shipped

**Raids**
- Levels carry a `raids` schedule in data: a wave is a time, a list of enemy
  counts, and an announcement line.
- Intruders come in through the Booking Agent's Door — the same door recruits
  use. Sealing every door with Sold Out holds a wave outside until the seal
  lapses rather than skipping it, which is what finally makes that spell worth
  its Buzz.
- Campaign 0 level 2 gets three waves (scouts, then scouts, then an Inspector);
  level 3 gets four, ending with the Eviction Warlord.

**Combat**
- Creatures defend the basement themselves: anything within 3.5 tiles makes them
  down tools and engage. That is the correct behaviour for an indirect-control
  game — Callback is how you concentrate them somewhere specific.
- Intruders head for what their data says they want (`vault`, `venue` or
  `creatures`), pick fights with anything within their aggro radius on the way,
  and fall back to hunting the crew when their goal does not exist yet.
- Enemies reaching the vault take Royalties and run for the door; if they get
  out, the money is gone. Beat them first and they drop it on the floor.
- Melee intruders tear down a room tile at a time when they reach one.
- The Paladin's aura buffs nearby intruders' damage. The Wraith drains Buzz. The
  Critique Cleric halves a creature's work rate with Bad Review. The Noise
  Inspector runs a countdown and, if not intercepted, halves Venue output for 90
  seconds and then leaves.

**Capture, in both directions**
- The A&R Scout does not kill. It stands next to a creature and signs them —
  six seconds of contact, announced when it starts, cancelled if it is driven
  off. Signed-away creatures come back if you clear the level.
- Beaten intruders are knocked down rather than killed when a Contract Office
  has a free cell. A creature drags them there; a Signing Room then talks them
  round over time and they join as a Session Player. With no cell free they are
  simply seen off the premises.
- Contract Office and Signing Room are therefore no longer inert.

**Losing**
- A level is lost if the roster is empty for 25 continuous seconds. Losing costs
  nothing but the time, per the brief — the defeat sheet offers a straight
  re-run.

**UI**
- Pulsing threat counter in the top bar, a Raid tab in the side drawer listing
  intruders with health, captives held and creatures signed away, red alert
  toasts for wave announcements, and a defeat sheet.
- Health bars over anything that has been hit, a red threat marker over
  intruders, and beaten intruders lying down.

**Content**
- `defeat` objective kind, used for the Warlord.
- Level 3 now unlocks the Contract Office, Signing Room, Encore and Sold Out,
  and its objectives are Royalties, roster size and seeing off the Warlord.

## Bugs found and fixed during verification

- **The Booking Agent's Door was carved as an isolated pocket.** Anything that
  spawned there — recruits included — was stranded until the player happened to
  dig to it, and the first raid just stood at the door. Map generation now cuts
  a corridor from the chamber to the door, with a regression test asserting a
  route exists on every level.
- **Intruders whose goal did not exist stood still forever** (a Warlord looking
  for a vault on a level where none had been built). They now fall back to
  hunting the crew.
- **Capture could never fire.** It originally required reducing a creature to
  zero HP, which a 55 HP scout never survived long enough to do. Rewritten as
  the timed contact the data always described.

## What is not in yet

- **No traps.** Still Phase 2 or later.
- **No audio.** Phase 5.
- **Ranged behaviour is declared but unused** — every intruder currently closes
  to melee. The Wraith drains from wherever it stands, which is close enough for
  now but is not the ranged attack the data allows for.
- **Reputation still has no consequences.** It moves and is displayed; nothing
  reads it.
- **Water still cannot be bridged**; Merch Stand remains inert.
- Placeholder art and placeholder flavour text throughout.

## Known rough edges

- Balance is tuned against an idle basement, not a played one. A run with no
  player input at all loses level 3 at about 7:30, to the Paladin wave rather
  than to the Warlord. Whether an actively-played run finds the Warlord fair is
  the open question, and it needs a human on a real device.
- Escorting a downed intruder teleports them to the cell on arrival rather than
  animating the drag. Reads fine at speed; would look better as a carry.
- Creatures engage the nearest threat with no target priority, so a Paladin's
  aura can go unpunished while everyone swings at the thing next to them.

## Verified on

38 unit tests, all passing, covering raid scheduling, sealed doors, both
outcomes of a signing, vault theft, capture-to-conversion, the goal fallback and
snapshot round-trips with a raid in progress.

Driven in headless Chromium at phone landscape: watched a wave arrive, engage
and be seen off; ran level 3 unattended at 3× to a genuine wipeout and the
defeat sheet. No console errors. Still not tested on physical hardware.
