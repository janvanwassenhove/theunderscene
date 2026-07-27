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
sizing each one from the actual arithmetic rather than a guess — and otherwise
leaves the crew alone. It never casts a spell, never lays a trap and never
manoeuvres in a fight.

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

## The finding that is a design decision, not a bug

**Every level with a `Bank N Royalties` objective is structurally short.**

| | |
|---|---|
| Passive income, best economy room at 10 tiles | **20–50 Royalties/min** |
| Wage bill at the roster the level's own objectives ask for | **80–414 Royalties/min** |
| Total Royalties buried in the map (veins + caches) | **3,900–9,650, one-off** |

A creature costs about 9 Royalties a minute (wage 6–22, payday every 90s). A
room tile earns 2–5 a minute and costs 50–95 to place. So the gap is bridged
only by digging up the map's finite wealth, which at a 200–400/min deficit runs
out in fifteen to thirty minutes and never comes back. `c4-l5` asks you to bank
9000 on a map that contains 9648 while wages eat 414 a minute.

The bot currently clears **10 of 36** levels inside a twenty-minute budget, and
almost every miss is a Royalties target.

This is not something to fix by guessing. There are four honest directions and
they produce genuinely different games:

1. **Raise passive room income** — the label becomes a business that grows.
2. **Cut wages or lengthen the payday** — margins stay tight but survivable.
3. **Lower the Royalties targets** — the levels stay lean and quick.
4. **Pay creatures for working** — digging and hauling earn, so a big roster
   pays for itself. The largest change, and the one that most makes a roster a
   decision rather than a tax.

Picking one is a design call about what the game *is*, so it is left to a human.
The harness is here so that whichever direction is chosen, one command says
whether the numbers now work.

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
