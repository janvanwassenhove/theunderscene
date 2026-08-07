# Balance

The roadmap has said since Phase 2 that no level has been played to completion
by a person and that every objective threshold is an educated guess. This is
what those guesses actually amount to, measured rather than estimated.

## The harness

```
npx vite-node scripts/balance.ts             # every level
npx vite-node scripts/balance.ts c4          # ids containing "c4"
npx vite-node scripts/balance.ts c4-l5 1800  # and a longer budget
```

It plays each level headlessly with a deliberately unclever bot: it keeps a dig
queue topped up, builds the rooms the objectives name plus the obvious economy —
sizing each one from the actual arithmetic rather than a guess — treats
everything else the wing offers as optional and refuses to spend the money a
level is asking it to bank, and otherwise leaves the crew alone. It never casts
a spell, never lays a trap and never manoeuvres in a fight.

So it is a floor, not a ceiling. **A level the bot clears is certainly
clearable.** A level it gets nowhere near is a threshold worth a human look.

It then prints two static checks that need no play at all, because some
objectives are not hard, they are impossible, and playing them out only tells
you that slowly.

## Bugs it found, now fixed

**Drains ignored where they were.** `drain` took Buzz level-wide while the
Wraith's own blurb said it drained "nearby rooms". You could kill every Wraith
on the map and the Buzz still went, so a "hold N Buzz" objective on a level that
sends them was arithmetic you could not win. Drain now needs to be within a
`radius` of a Buzz-producing room, which is what makes intercepting it the play.

**"It never decays" was not implemented.** The Reverb Chamber — the Shoegaze
wing's stated stability anchor — decayed like everything else. Because Buzz
decays proportionally, a room of a given size has a hard equilibrium at
`gain per second ÷ decay per second`, and the Chamber's equilibrium was far
below what the wing's own levels asked for: holding 700 Buzz on `c3-l5` needed
**47 tiles**, costing 3290 Royalties on a level that starts with 1400. Buzz from
a `stable` room now banks a floor ambient decay cannot eat into, so the room is
slow rather than impossible. Draining still takes the floor with it. `c3-l5`
went from 0/700 to 761/700.

**The Sample Vault ignored its own size.** `refine` paid a flat 14/min however
big the room was, while `c4-l5`'s objective is literally "Run a 10-tile Sample
Vault" and the whole Hip-Hop wing is billed as the economy wing. It is now per
tile. `c4-l5` went from 8/9000 banked to 3033/9000.

## Not a bug, but changed anyway

A payday you could not cover set Royalties to `0` and took a flat 18 loyalty off
everybody. Setting the bank to zero reads alarming but is arithmetically the
same as paying out everything you have, so it was never the economy problem it
looked like. The flat loyalty hit was the real crudeness: coming up ten
Royalties short cost exactly as much as paying nobody anything. The hit now
scales with the shortfall, 4 to 20.

## The economy, and what was done about it

The harness first measured what the roadmap had only ever asserted. Passive room
income ran **20–50 Royalties/min** against a wage bill of **80–414/min** at the
rosters the levels themselves demand, bridged only by the map's finite veins
(3,900–9,650, one-off). At a 200–400/min deficit that runs out in fifteen to
thirty minutes and never comes back. `c4-l5` asked you to bank 9000 on a map
containing 9648 while wages ate 414 a minute. The bot cleared **10 of 36**
levels, and almost every miss was a Royalties target.

Four directions were on the table — raise room income, cut wages, lower the
targets, or pay creatures for working. **The roster now earns.**

`CreatureDef.earnsPerMinute` is Royalties brought in per minute while a creature
is actually working — digging, hauling or rehearsing — scaled by level the same
way its attack is, and cut by a Bad Review the same way its work rate is. Idle
creatures earn nothing, which is the point: an idle basement is one that is
costing you money, so keeping everybody busy is the economic loop rather than
hiring as many as the beds allow.

The first-pass numbers are scaled off the wage each creature already charges, so
the ratios stay recognisable: an earner more than covers itself (economy ×1.5,
worker ×1.15), a support roughly breaks even (×0.8), and a fighter does not and
is carried by the rest (×0.45). The Banjo Sprite works for free and earns like
it — a loss leader who is still worth having.

**Result: the bot clears 16 of 36**, up from 10, and the misses have changed
character entirely. The banking objectives have largely stopped being the
problem; what is left is mostly the Eviction Warlord.

These values are a first pass, not a balance pass. `npx vite-node
scripts/balance.ts` prints the per-level arithmetic — room income, crew earnings
at a conservative 50% duty cycle, and the wage bill — so any further tuning can
be checked in one command.

### Where it is still tight

The Metal wing is the outlier, 88–152/min short on `c2-l1`, `c2-l3` and `c2-l4`.
That wing is *meant* to be hard going — thinner veins, higher wages, a roster of
fighters who by design do not earn — so some of that is the design working. How
much of it is too much is a play question.

## The Eviction Warlord

The bot now fights: when something serious is in the basement it Callbacks the
crew onto the biggest thing in the room and buffs them. That was added
specifically so the boss numbers would mean something, and they now do — **it
still cannot kill a Warlord**, on `c0-l3`, `c1-l4`, `c2-l4` or `c4-l5`.

The arithmetic: 600 HP, 26 damage a swing every 1.6s. Only three or four
creatures can reach it at once on an isometric grid, at roughly 7 attack each on
a 1.3s swing — call it 20 damage a second, so thirty seconds of unbroken contact.
In thirty seconds it kills five creatures outright. A player can win that with
kiting, Encore and terrain; a bot that walks straight at it cannot.

So the honest reading is: **the Warlord is a skill check, and nobody has yet
confirmed a human passes it.** That is the single most important thing to play.

Two things were tried on the bot and left out, because they made it worse rather
than better and tuning a bot until it agrees with you is not a balance pass:

- **Healing in a fight.** Encore costs Buzz the crew needed more, and it kept
  bodies in a losing fight rather than losing it faster. 16 cleared → 14.
- **Callback on every intruder.** Rallying for each passing scout drained the
  Buzz pool that levels ask you to hold. 16 cleared → 13. It is now gated to
  threats over 150 HP or crowds of three or more.

## Other things worth a human eye

- **`c6-l4 Kindling`** misses both a boss count and its banking target, the only
  level still failing on two fronts at once.
- **`c7-l2` Buzz under flattening** sits at 19/600. The Algorithm halves output
  every two minutes and the Mixing Board clears it, so this is a question of
  whether the counter-play window is wide enough — a play question.
- **`c7-l3` Phase 3** is never reached inside the budget. The Warlord lands at
  720s and the bot is spent by then. The wave exists and is correct.
- **Objectives latch.** Once met they stay met, so the report can show a done
  objective sitting below its target — `c0-l3` banks 1800 and then spends it.
  The harness marks those "met earlier" rather than looking like a bug.
