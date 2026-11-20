# Castle Velscour, grown: what was built, how it was judged, what's left (2026-11-19/20)

The owner's ask is quoted at the head of [PHOBOS-CASTLE.md](PHOBOS-CASTLE.md), which is also the contract every part was
built to (keys, gates, which delve sits where). The town's own notes are in [PHOBOS-TOWN.md](PHOBOS-TOWN.md); the critics'
first round in full in [PHOBOS-CRITICS-R1.md](PHOBOS-CRITICS-R1.md). Branch `phobos-castle-grand`.

## What there is now

| Part | What | Where |
|---|---|---|
| Keys, locks, shortcuts, finds | nine keys given by bosses; gates and dungeon doors that ask for them; four ways barred from one side; chests kept by id; lookouts found by standing on them | `src/core/castle-keys.js`, `castle-finds.js`, `src/sim/dungeon.js` (open, portals), `src/main.js` |
| The land castle | 37 lesser towers each with a stair turret, galleries where bridges meet them and a deck under the crown; 50 walked bridges; six Needles past the rim; five kinds of crown; his red in slits up every shaft; 44 lookouts and 23 chests up them; 16 wall towers gone into as the city's are | `src/core/phobos-build.js` (castleTowers, climb, castleWallTowers, castleFinds), `tests/castle-towers.test.mjs`, `node tools/phobos/towers.mjs` |
| The High Ward | ten rooms, the Star-Reader, the Sexton and his grave-lantern, the Reliquary and the Antechambers behind locks of the delve's own, the Gargoyles' Roost on no map | `src/core/delve-highward.js`, `src/sim/castle-fights-h.js` |
| The Deep Stacks and Pell's Holdout | behind the Librarian's bookcase: the Well of Books, the Holdout (ten people), the Censor who reads the Index; the Scriveners' Lift to the Roost | same files; people in `src/folk/people.js` (`ho_*`) |
| Seven dungeons | the Drowned Archive, the Thousand Portraits, the Alchemists' Undercroft (set A); the Clockworks, the Menagerie of Chains, the Ossuary Chapel, the Hall of Mirrors (set B): 19 bosses in all | `src/core/delve-castle-a.js`, `-b.js` and the files they take in; `src/sim/castle-fights-a.js`, `-b.js` |
| The castle's own ground | five haunts (the kitchens' yard, the drill yard, under the Crown Court, the Sally road, the Ash Terrace) | `src/core/tripo-monsters.js` (`castle_*`) |
| The town | houses styled by district (roofs, heights, jetties, galleries), 28 landmark houses and more tower-houses, 16 city lookouts, sewer finds | `src/core/phobos-houses.js`, `phobos-finds.js` |
| Quests | 27 in the streets and sewers; 21 + 22 through the dungeons; 28 of the castle's own (the Holdout's, the household's, the Librarian's Nine Keys, the roof-runners') | `src/folk/phobos-quests-town.js`, `-a.js`, `-b.js`, `-castle.js`; words in `src/folk/lines/phobos-more-*.js` |
| Speed | near cells behind the eye not drawn; lamps picked, not sorted; a bench at a phone's size | `src/gfx/phobos-near.js`, `src/gfx/renderer.js`; `node tools/phone_walk.mjs` |

Also found and fixed on the way: the Iron Barracks' way in stood in the rock; a prop set down without what it needs made
corners that weren't numbers (a test holds it now); a spike's collider stood from the ground to itself under every bridge.

## The critics (two, three rounds)

| Area | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| The castle outside | REJECT 5 / 5.5 | REJECT 6.5 / 6.5 | **APPROVE 7 / 7** (both "narrowly") |
| The High Ward and the Deep Stacks | REJECT 4.5 / 6 | APPROVE 7 / 7.5 | **APPROVE 7.5 / 8** |
| Dungeons A | REJECT 4 / 4.5 | REJECT 6.5, APPROVE 7 | **APPROVE 7.5 / 7.5** |
| Dungeons B | (not shown) | REJECT 5 / 5.5 | **REJECT 6 / 6.5** |
| The town | REJECT 5.5 / 6 | APPROVE 7 / 7 | **APPROVE 7.5 / 7** |
| The play | 7.5 | 8 | **8** |

(Veteran first, the young designer second.) Sheets: `art/phobos/east/grand/r1_*.jpg` to `r3_*.jpg`.

**Dungeons B did not pass.** What held it at round 3: the Weight Shaft's catwalks crossed the hanging weights' lines (a bar
across an upright); three rooms still too dark to judge (the Baiting Pit, the Ring of Chains, the Striking Floor); mirrors
that read as black slabs. Those were fixed after the round and not judged again (`r4_dungeons_b.jpg`): one catwalk with the
weights clear of it, every wheel three spokes none upright or level, a hard light on the stake, the ring, the blocks and
the shaft, mirrors pale with a streak, chains from the Cage Rows' roof.

## Left over (the critics', by area)

- **The castle outside**: the crag's bare grey ground is half of three pictures (the terrain shader's: not touched); the
  arrival view from the yard is still the weakest (the Keep a dark wall); the five tallest heads half again as big, so the
  skyline changes from the city; the ring of spire bridges that lies across the Needles' shafts; the basalt's vein size
  near; `kt_turret`'s flat backdrop planes.
- **The High Ward and the Deep Stacks**: the gates between delves are the engine's one blue ring in a slab everywhere (in
  the Holdout too, two side by side in the Roost): dress each as what it is; the Scriptorium and the Sleeping Shelves still
  wide plain floor; the nave dark past its first stalls; the Treasury's gold flat orange.
- **Dungeons A**: the Framers' Shop still mostly floor; the Retort Room and the Hall of Jars' floors; a few very large
  portraits to break the grid; coppers read brown (no coppery layer).
- **Dungeons B**: see above; the Glass Maze a wall of panes; bosses small in their halls.
- **The town**: the Mages' Rise the weakest street (white ground patches either side of its foot in `sv_mages`: seen in a
  picture, not traced); striped far blocks by the toll-house; tower-houses don't yet break the roofs from above; lit
  windows bright.
- **The play**: the Holdout should change as keys are won (its people speak of each key now; nothing is seen to change);
  nothing is fought on the bridges and the Needles themselves; no window from a delve onto the land castle, no door on a
  tower's deck into a delve; the Clockmaker's winders, the Painter's canvas and the Sexton's lantern are one lesson.

## Not tried by a human, not watched

Nobody has played any of this by hand, and auto-play has not been watched walking it: the towers and bridges (walked by a
test a stride at a time, not by a player), the seven dungeons (fights played out headless: all 22 new bosses win with a
hired party and kill a player who stands still, on their last runs), the keys and gates end to end, the shortcuts, the
lookouts' toasts and the chests on decks, the Holdout, the wall towers' doors on sloping ground, the haunts on the castle's
ground. A phone has not run it: the phone-sized run on this machine's GPU shows no stall while moving through Phobos, which
proves the stall is gone and nothing about a phone's speed. Corners: see the end of this page (nothing more fits
on a phone's land without taking something off).

## Recipes

- Tests: `node --test "tests/*.test.mjs"` (587; the one failure, `spec.json`, is old). The new ones: `castle-towers`,
  `castle-high`, `castle-a`, `castle-b`, `phobos-town`.
- Checks: `node tools/dungeon/check.mjs`, `node tools/autoplay/check.mjs`, `node tools/lands/check-vt.mjs`,
  `node tools/lands/check-sites.mjs`, `node tools/phobos/corners.mjs`, `node tools/phobos/towers.mjs`.
- Fights: `node tools/dungeon/fight.mjs <boss>` (and `--still`, which should die).
- Pictures: `python tools/serve.py 8481 --no-open`, then `node tools/phobos/city_shots.mjs <names>` (the land: `kt_*` the
  castle's towers, `wd_*` the rest of the world) and `node tools/phobos/castle_shots.mjs <names>` (each delve's own `shots`);
  `python tools/phobos/sheet.py <out.jpg> <cols> <names>` makes a sheet. On Windows the tools use the machine's GPU
  (`--use-angle=d3d11 --disable-dawn-features=use_dxc`); the software flags give no adapter there.
- Traps: a `solid` prop is left out of the wall, floor and roof as rock is, so one against a wall leaves a hole; a spike
  wider than 0.6 collides from the ground up unless `K.soft` is set; `K.drum`'s `tile` scales its stone; a bridge's hump
  must be under 0.07 of its length or its deck can't be stepped onto; the load's pool threads become the planners and
  never answer a job once the game is up (use `renderer.landPool`).

## The world once-over (three critics, one round, 2026-11-20)

The two art critics and a third, a performance engineer who looks at phones first, each went over the whole world once
(`art/world/pass_before.jpg`, `pass_after.jpg`). Both art critics also took a last look at dungeons B's fixes
(`r4_dungeons_b.jpg`) and said it **would now pass, narrowly, about 7/10**: a look at stills after the three rounds, not a
fourth round. Their one note, mirrors gone to white cards, was answered after (a mid cold grey; nobody has judged that).

Done:

- Open grass broken up: dry and damp stretches three hundred metres across (not on a phone: one more sample).
- A road's verge trodden brown, on a phone too.
- The air between: what's far loses colour and goes a little blue before the haze has it (`applyFog`, every tier).
- Every tree on Blackvigil's hill dead (`treeCode`).
- A phone's Phobos: main got there first while this was built (PR 232: near cells on a thread of their own, a phone's
  built within 105 m, fourteen kept). The merge takes main's; this branch's own version of both is gone. The critic's
  measure stands as a warning: a cell from near is 220,000 to 430,000 corners, and he'd have a phone's nearer still
  (45 m, seven kept) and built lean.
- Near cells wholly behind the eye are not drawn in the eye's pass.
- Lamps: the nearest few picked out, not five thousand put in order every frame to choose two.

Not done, from their lists (cheapest first): chimney smoke over the small towns; a lit thing on each town's skyline (a
watch-fire, a forge glow, a beacon, a red eye on Blackvigil); cairns, dead camps and carts within sight of the roads;
crows over the barrows, fen and Keep; a mist and colour of its own for the fen and the Sill; trodden earth inside each
palisade; the fen stall's plain box and green cobbles; the snow's weave on Frostwatch's slope; rocks sunk and tinted at
their feet; stones and dead trees round the barrows' gate; washing, lanterns and a notice post in Bellmourn.

Not done, the performance critic's (in his order): a lean build of a near cell (no furniture on a phone); near cells
culled in the shadow passes; **the land's one index buffer sorted by cell and only what's seen drawn** (1.36 million
indices are drawn whole twice a frame: his biggest gain after the phone's Phobos, a day's careful work); cells packed on
the worker; a phone ticking at 60, not 90; the corner map at 10 Hz on touch; idle pool threads let go on a phone; bloom at
two levels on Mobile. `tools/phone_memory.mjs` and `phone_bench.mjs` still never go to Phobos.

After, with main (ac25d115) merged in: 593 tests, 590 pass, the one old failure; corners a PC's 1,728,240 of 1,800,000,
a phone's 946,691 of 950,000 (a phone's towers have four merlons, not eight, to fit under it beside main's new dungeon
doors); the phone-sized run holds 16.7 ms everywhere with 10 cells up down the King's Mile (this machine's GPU: nothing about a phone's speed, and no phone has run it).
