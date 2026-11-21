# The first visit to Phobos

The owner's ask (2026-11-20): within the first fifteen minutes of the game, Lisandra sends you to City State Phobos for the
first time. Out there you run a few quests, including monster hunting and a small overworld dungeon, still fairly big and
full of Velscour's Knights and other things worth seeing early. Then you go back to Bellmourn and carry on.

## How it runs

| Quest | Giver | What | Level | Pays |
|---|---|---|---|---|
| A Door in the East (`the_door_east`) | Lisandra | Once Bram's first errand (`bed_and_bell`) is done, she opens a **door of candles** (violet fade, `src/ui/folk.js lisDoor`) and you, with your party, are set down on the Sill above Phobos, in the morning (out of the dark or the evening, the candles burn all night). The Sill's seal wakes, so you can travel back. Talk to Wenna. | 1 | 30 g, 60 xp |
| The Gibbet Field (`fv_gibbet_field`) | Wenna | Put down the five hanged debtors walking under the gibbets on the plain (lair `sill_gibbets`, level 3, new `gibbets` lair dress: the hanged in the cages, the fallen ones' dead beside them). | 3 | 45 g, 110 xp |
| Carrion on the Sill (`fv_carrion`) | Wenna | Kill three carrion birds (lair `sill_carrion`, now level 4, was 20; nests in the perches, a picked body under them). | 3 | 45 g, 80 xp |
| The Way Down (`fv_the_way_down`) | Wenna Coyle | Walk in through the Drawbridge Gate and the Barbican to the Chainmarket (overheard lines on the way), then find Fennick Lowe of the Pennyless. | 3 | 40 g, 100 xp |
| The Redoubt under the Sill (`fv_the_redoubt`) | Wenna (after the Gibbet Field and the carrion: the last of hers) | Go into **the Redoubt under the Sill**, past his two gate-wards (lair `redoubt_gate`), and kill Knight-Commander Rothgar. | 4 | 120 g, 200 xp, staff "Wenna's Lamp-Iron" |
| The Candle Door (`fv_home`) | Wenna | She opens Lisandra's door back; you're set down a stride from Lisandra in Bellmourn and tell her what you saw. | 4 | 60 g, 80 xp, a scroll |

Wenna gives the hunts on the plain first, straight after the long look at the city, then the walk down into it, and the
Redoubt last. The Redoubt is offered once the two hunts are done, so a player can go down it before the walk into the
city. Auto-play has done it both ways.

Rules are in `src/folk/first-visit.js` and the words in `src/folk/lines/first-visit.js`. Wenna is `fv_wenna`, a posted
person on the Sill with `firstVisit: true`, a recoloured chandler body made by `tools/firstvisit/wenna_swap.py`.

If you end up on the wrong side of the door, Lisandra and Wenna each offer it again while their quest is open (`root()`).

**Within the first fifteen minutes.** Bram's errand ends with a night at the Tolling Bell. Then everything sends you to
Lisandra:

- Bram's last line says she was in asking after you.
- You wake to "Lisandra has a door to show you".
- The gold trail goes to her (`follow: 'door'` in `src/folk/quests.js`, set when `bed_and_bell` is done, until the door is taken).
- (Her own lines are recorded in her voice, `assets/voice`, so they're left as they are.)

If Bram's errand still isn't done twelve minutes into the game (`DOOR_DUE` in `src/folk/first-visit.js`, 720 s of
play time, counted by `played` in `src/main.js`), the flag `door_due` is set. Lisandra then offers the door anyway, the
note "Lisandra has a door to show you" comes up, and the gold trail turns to her. The rule's `due` reads that flag
(`needsMet()` in `src/folk/quests.js`). A run whose Silas was out of auto-play's reach in the evening, up in the inn,
only came to the door at eighteen minutes.

Auto-play takes the door straight after Bram's errand: it's level 1 in its plan, next after `bed_and_bell`. In the town it
takes Lisandra's work, then Bram's errand, before any other offer in the square (`offerJob` in `src/ui/autobrain.js`), and
her round of the givers starts at Bram (`questJob`; `src/ui/trail.js` leads a player the same way). A run that took every
other offer first came to the door at a quarter past.

On the visit, auto-play goes home to sell only when the pack is all but full (three slots or fewer free), and there it
only sells. It used to go home with the Redoubt in hand and take the square's offers. Time spent talking counts as getting
nearer, so Wenna's long talk (her door and three offers in a row) no longer runs past the 75 s after which auto-play
gives someone up for four minutes (`converse` in `src/ui/autobrain.js`).

Through the door the first time, auto-play stops for the city's first-sight fly-by (`src/ui/firstsight.js`): five
minutes, the owner's length. Its cameras keep outside the castle and above the spires now. The castle grew after they
were laid out, and three of the five beats were looking at the inside of a wall. "Any key rides on" shows large for its
first seconds, then settles into the corner.

When the door opens, Lisandra's talk closes (`lisDoor` in `src/ui/folk.js`). Auto-play used to open it again during the
fade, and it stayed up over the whole fly-by. Her list doesn't show the door twice (`root()`).

While the visit is under way, the city's own (Fennick and the rest, `PHOBOS_RULES`) offer nothing. Their work is for level
20 and up.

Wenna's corner of the Sill (`src/core/sites.js sillCorner`) has:

- her lean-to and oil casks
- her lantern
- the door's candles, a ring of stubs where you're set down

## The Redoubt under the Sill

`src/core/delve-redoubt.js` (fights in `src/sim/redoubt-fights.js`) is a level-5 castle delve, gone into alone or not (`party: false`: no party needed, though a hired one comes along). Its
portal is at the foot of the Sill's north cliff (9038, 262), facing the city; the delve box is at x 8620–8782, z
-5926 to -5680. It has nine rooms:

- the Cliff Gate (portcullis, plate on stands)
- the Toll Hall (toll bar, counter, coin, ledgers)
- the Debtors' Pens (nine man-high iron cells along each long wall, their doors open, whoever couldn't pay slumped in
  some; chains down from the roof; 12 m high)
- the Hall of Harness (empty plate on stands)
- the Cut Court (34 m high; three shafts of daylight down from slots in the roof, the sky in each slot a steady pale
  overcast, `slate:flame`, set in a stone reveal so it reads as a hole and not a lamp; wall-walks with fire baskets)
- the Red Forge (casting pit, anvils, the quench trough, his plate on two racks half made; the bellows-kobolds at the
  pit's edge, not in it)
- the Red Chapel (his, not hers: no crosses or bells)
- the Watch Stair
- the Commander's Hall (his war table off to the side, the light down a shaft before his seat, the way out beside the
  dais). His seat is the stone throne at twice the size, on a plinth (`stonethrone`, `s: 2, plinth: true` in
  `src/core/delve-build.js`), so it holds its own against a 3.5 m man.

His mark down there is his skull banner, hung flat on the wall with a basket of red fire either side (`skullmark`,
`src/core/delve-props-rd.js`). It used to be an iron ring with flames, which read as a cog, or her sun.

Outside on the Sill, the gibbets are black-tarred posts with a brace under the arm, not lamp-posts, and the carrion
perches are forked, with a nest of drums in every other fork (a ring of sticks round a perch read as a crossbar: a T).

Outside, the gatehouse is set into the cliff, with rough cheeks of rock and a brow over it. Two of his knights stand at its
foot (lair `redoubt_gate`). They're a step over the delve's own knights (`tough: { hp: 1, damage: 0.6 }` on the lair,
against the delve's 0.9 and 0.45). By the land's level 4 alone they hit two and a half times as hard as any knight
inside, and a level-5 run alone came away from them on a sliver of life.

Auto-play fights them: a Tripo kind in one of the Sill's low lairs counts as fightable at the lair's level (`inLowLair` in
`src/ui/autobrain.js`), though Velscour's knights are level 15+ anywhere else. It comes at the gate square between the
rock cheeks (the delve's `approach`, read by `src/ui/autowarrens.js`), not into them. The boulders that lay before its steps are rolled aside (`src/core/rocks.js offGate`), never
taken away. Its portal burns his red, not the stock blue: `portalHue: 'ember'` on the delve, drawn by
`src/gfx/renderer.js` (`EMBER`) with the whirl's and runes' blues turned to embers in `src/gfx/materials.js`.

Packs: nine, of Velscour's knights in Oxblood and Sable:

- gaolers in the pens
- clerks and priests who cast
- bellows-kobolds in the forge, with two overseers who come to them
- a patrol walking the court
- the stair's guard, with the pair from the Commander's door coming down to it

That makes 18 knights, and 26 foes before the bosses.

Bosses:

- **The Pen-Warden** swings a ring of keys, slams his club and drags his chain. Twice he opens the cages and his debtors
  come out; the fight's order then sends you off the cage wall.
- **Sir Oswin Carrow** charges, cleaves and stamps (jump the ring). Twice the empty harness walks, and the order is to cut
  it down.
- **Knight-Commander Rothgar, the Red Hand** (3.5 m) fights with his blade, a charge, a quake, and fire branded under
  you and round the hall. His guard comes at 75%. At half life an empty harness plants his banner before his seat, and
  while it stands, he mends: cut it down. He waits on the other two (`needs`).

`node tools/dungeon/fight.mjs redoubt` now fights a `party: false` delve alone, the hard case (it used to hire a party for every delve; SOLO=1 does it for any).
At levels 4 and 5, alone, all nine packs and all three bosses are won (`LEVEL=4` / `LEVEL=5`). Rothgar leaves you at
about 55–60% life.

In a fight down a delve, the third-person camera keeps inside the rooms: walls and roof (`src/sim/sim.worker.js`, from
the delve's own shape). It used to look out through the rock when a boss had you against a wall.

A boss's opening lesson is read by itself. Level-ups, finds and quest toasts wait till it's gone (`src/ui/hush.js`).

## Experience

The first auto-played run went from level 3 to 13 over the first visit, 8 to 13 inside the Redoubt alone. Four things
brought it down. The goal: home at five or six, to Bellmourn's own quests, which run from level 1 (the ones skipped to
go through the door) to 9.

- **The Redoubt.** Its knights are the castle's, and a kill is worth what its kind is worth. So the delve has
  `xpScale: 0.1`, read by `src/main.js` gainXp for any delve that sets it. Its pay is 100 xp, not 900.
- **The Sill's lairs.** Their kinds are the city's, made low for a new player, so a kill there pays a share too: the
  lair's `xpScale` in `src/core/tripo-monsters.js` (gibbets 0.5, carrion 0.4, gate-wards 0.25).
- **Far kills.** Every death in the simulation paid the player, wherever it was. A Knight of Velscour put down by
  Bellmourn's guard, two minutes after each load, paid 600 to a player standing in Phobos. Now a death more than
  `KILL_REACH` (90 m) from the player pays nothing. That is game-wide: your spells, your party and your summoned dead all
  fight well inside 90 m.
- **The quests' rewards.** 630 xp for the six, not 1,710. That is under half of what the game's other quests at those
  levels pay, because the kills out there are worth more.

For pictures of the rooms, `bm.warrens('calm', { delve: 'redoubt' })` puts the delve's packs to sleep and counts them
cleared (`src/sim/dungeon.js debug`), so the hurt-red of a fight isn't over every shot.

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
