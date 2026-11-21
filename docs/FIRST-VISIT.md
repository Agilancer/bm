# The first visit to Phobos

The owner's ask (2026-11-20): within the first fifteen minutes of the game, Lisandra sends you to City State Phobos for the
first time. Out there you run a few quests, including monster hunting and a small overworld dungeon, still fairly big and
full of Velscour's Knights and other things worth seeing early. Then you go back to Bellmourn and carry on.

## How it runs

| Quest | Giver | What | Level | Pays |
|---|---|---|---|---|
| A Door in the East (`the_door_east`) | Lisandra | Once Bram's first errand (`bed_and_bell`) is done, she opens a **door of candles** (violet fade, `src/ui/folk.js lisDoor`) and you, with your party, are set down on the Sill above Phobos. The Sill's seal wakes, so you can travel back. Talk to Wenna. | 2 | 30 g, 100 xp |
| The Way Down (`fv_the_way_down`) | Wenna Coyle | Walk in through the Drawbridge Gate and the Barbican to the Chainmarket (overheard lines on the way), then find Fennick Lowe of the Pennyless. | 3 | 40 g, 150 xp |
| The Gibbet Field (`fv_gibbet_field`) | Wenna | Put down the five hanged debtors walking under the gibbets on the plain (lair `sill_gibbets`, level 3, new `gibbets` lair dress). | 3 | 45 g, 180 xp |
| Carrion on the Sill (`fv_carrion`) | Wenna | Kill three carrion birds (lair `sill_carrion`, now level 4, was 20). | 3 | 45 g, 150 xp |
| The Redoubt under the Sill (`fv_the_redoubt`) | Wenna (after the Gibbet Field) | Go into **the Redoubt under the Sill** and kill Knight-Commander Rothgar. | 4 | 120 g, 300 xp, staff "Wenna's Lamp-Iron" |
| The Candle Door (`fv_home`) | Wenna | She opens Lisandra's door back; you're set down a stride from Lisandra in Bellmourn and tell her what you saw. | 4 | 60 g, 120 xp, a scroll |

Rules are in `src/folk/first-visit.js` and the words in `src/folk/lines/first-visit.js`. Wenna is `fv_wenna`, a posted
person on the Sill with `firstVisit: true`, a recoloured chandler body made by `tools/firstvisit/wenna_swap.py`.

If you end up on the wrong side of the door, Lisandra and Wenna each offer it again while their quest is open (`root()`).

## The Redoubt under the Sill

`src/core/delve-redoubt.js` (fights in `src/sim/redoubt-fights.js`) is a level-5 castle delve, gone into alone or not (`party: false`: no party needed, though a hired one comes along). Its
portal is at the foot of the Sill's north cliff (9038, 262), facing the city; the delve box is at x 8620–8782, z
-5926 to -5680. It has nine rooms:

- the Cliff Gate (portcullis, plate on stands)
- the Toll Hall (toll bar, counter, coin, ledgers)
- the Debtors' Pens (cages, chains, trough)
- the Hall of Harness (empty plate on stands)
- the Cut Court (34 m high, daylight shafts)
- the Red Forge
- the Red Chapel (his, not hers: no crosses or bells)
- the Watch Stair
- the Commander's Hall

Packs: eight, of Velscour's knights in Oxblood and Sable, clerks and priests who cast, bellows-kobolds in the forge, and a
patrol walking the court.

Bosses:

- **The Pen-Warden** swings a ring of keys, slams his club and drags his chain. Twice he opens the cages and his debtors
  come out; the fight's order then sends you off the cage wall.
- **Sir Oswin Carrow** charges, cleaves and stamps (jump the ring). Twice the empty harness walks, and the order is to cut
  it down.
- **Knight-Commander Rothgar, the Red Hand** fights with his blade, a charge, a quake, and fire branded under you and round
  the hall. His guard comes at 75%. At half life he sets up his banner, which mends him while it stands: cut it down.
  He waits on the other two (`needs`).

`node tools/dungeon/fight.mjs redoubt` now fights a `party: false` delve alone, the hard case (it used to hire a party for every delve; SOLO=1 does it for any).
At level 5, alone, all eight packs and all three bosses are won; Rothgar leaves you at 24–42% life, and is lost if you
react half a second late (`--slow`), as a last boss should be.

## Experience

The first auto-played run went from level 3 to 13 over the first visit, 8 to 13 inside the Redoubt alone. That would
leave Bellmourn's quests (levels 4 to 9) far behind. Three things brought it down:

- **The Redoubt.** Its knights are the castle's, and a kill is worth what its kind is worth. So the delve has
  `xpScale: 0.15`, read by `src/main.js` gainXp for any delve that sets it. Its pay is 150 xp, not 900.
- **Far kills.** Every death in the simulation paid the player, wherever it was. A Knight of Velscour put down by
  Bellmourn's guard, two minutes after each load, paid 600 to a player standing in Phobos. Now a death more than
  `KILL_REACH` (90 m) from the player pays nothing. That is game-wide: your spells, your party and your summoned dead all
  fight well inside 90 m.
- **The quests' rewards.** 1,000 xp for the six, not 1,710. That is about two thirds of what the game's other quests at
  those levels pay, because the kills out there are worth more.

## Checks

- `node --test tests/first-visit.test.mjs`
- `node tools/dungeon/check.mjs redoubt`: walkable, 69,669 triangles
- `node tools/autoplay/check.mjs`
- `node tools/lands/check-vt.mjs`
- `node tools/roads/lay.mjs`, then `node tools/roads/bed.mjs`, then `node tools/lands/check-sites.mjs`
- `node tools/firstvisit/play.mjs <save.json> [port] [minutes] [name]` plays it with auto-play in a real Chrome off
  screen, from a save, logging every quest's state and taking a picture a minute.

Auto-play: `FIRST_VISIT_LEVELS` is in its plan. Within 1.5 km of the Sill it does Wenna's work first, before anything a
country away, and hires nobody (the only hiring is in Bellmourn). Back through the door, it tells Lisandra before it takes
the town's own errands and offers. It says "Step through." at the door.

The way home sets you down 2.2 m from Lisandra, facing her. Nine kilometres off she isn't in the snapshot, so the door
uses where she waits: the Long Road's end, `routeAt(ESCORT_LEN)` from `src/core/escort.js`.

## Known

- Dying out there sends you back to Bellmourn, as dying anywhere does. The Sill's seal is awake, so it's one seal-travel
  back.
- `tools/dungeon/check.mjs` fails on the Iron Barracks, on main too, so the failure isn't from this work.
- In a git worktree, `tests/touch-hud.test.mjs`'s spec.json check fails on CRLF line endings. That's an old trap.
