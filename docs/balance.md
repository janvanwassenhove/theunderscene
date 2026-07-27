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

**Result: the bot clears 17 of 36**, and the misses have changed character. What
is left flagged is bosses the bot cannot kill because it never casts Callback or
concentrates the crew — a limitation of the bot, not of the level — plus two
Buzz targets. The banking objectives have largely stopped being the problem.

These values are a first pass, not a balance pass. `npx vite-node
scripts/balance.ts` prints the per-level arithmetic — room income, crew earnings
at a conservative 50% duty cycle, and the wage bill — so any further tuning can
be checked in one command.

### Where it is still tight

The Metal wing is the outlier, 88–152/min short on `c2-l1`, `c2-l3` and `c2-l4`.
That wing is *meant* to be hard going — thinner veins, higher wages, a roster of
fighters who by design do not earn — so some of that is the design working. How
much of it is too much is a play question.

## Other things worth a human eye

- **`c3-l4 Feedback`** is the one level the fixes did not move: Buzz still sits
  at 0. Seven Wraiths arrive over the level and the Shoegaze roster is poor at
  fighting, so they park on the Chamber and hold it down. That may be the
  intended shape of the level — it is a wing that cannot punch — but it needs
  playing to know.
- **`c7-l3` Phase 3** is never reached inside the budget. The Warlord lands at
  720s and the bot is spent by then. The wave exists and is correct; whether the
  window is fair is a play question.
- **Boss kills** (`c0-l3`, `c1-l4`, `c4-l4`) fail for the bot because it never
  concentrates the crew. Callback exists precisely for that, and the bot does not
  cast. These are the least reliable numbers in the report.
