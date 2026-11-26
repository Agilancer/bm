# Phobos's Outwall

The basin floor outside City State Phobos's moat, between the wall and the cliffs. It used to be a flat grey plain with
the Ditch Road on it and nothing else. The owner's words: "not just flat garbage areas … places for the character to
get down off the main road … paths, proper areas … a cool, fleshed out part of the overall region", and auto-play that
"DOESNT DO THE STUPID BACK AND FORTH" when questing there.

## Where it is

| File | What |
| --- | --- |
| `src/core/outskirts.js` | The twelve places (`OUT`), the shape of the ground (`outskirtsLift`, called from `src/core/east.js` after the moat), the ways (`OUT_ROUTES`, appended last to `ROUTES` in `src/core/lands.js`), the far map's ground (`outskirtsGround`, used by `src/sim/job.worker.js`), the dead pines (`outskirtsTrees`, via `lands.js outwallTrees` and `forest.js`), and the yards no boulder lies in (`outskirtsYard`, `rocks.js barred`). |
| `src/core/outskirts-build.js` | What stands there. The far build groups everything by Phobos's 100 m near cells (`ph:<cell>`), so it is folded away when the near cell comes up. On a phone the far build lays colliders only. Its cells are added to `phobosCells()` and the sites worker's `phCells`. |
| `src/core/tripo-monsters.js` | Eight lairs, `out_*`, levels 23 to 26, `roadside` (no lane laid) and `placed` (no lair dress on a phone: the place dresses them). |
| `src/folk/regions/east.js`, `src/folk/lines/regions/east.js` | Four people and eleven quests; `tools/folk/cast.md` has their paragraphs. |
| `src/core/lands.js SITES` | `ashfold` and `hithe`, so the map, quest log and quest checks know them. |

## The places

- **Ashfold** (9555, -880), under the north gate: the ash-gatherers' yard. It has eight shanties, a lean-to, a broken dry wall, carts, ash heaps and sacks, and a hearth. Hode Callow (ash-reeve, sutler) and Nell Sallow (ash-carter) are posted there.
- **The Old Delf** (9350, -770): the stone-cutting the city was built from. Three benches and a ramp are cut 8 m into the plain, with spoil heaps, two shear-legs, cut blocks, a sled, ladders and a tool hut. Lair `out_delf` (kobolds).
- **The Pauper Mounds** (9195, -395): three rows of long mounds, each a rounded earth ridge (three stacked gables) with a leaning grey board at its head (one plank, never a crosspiece). There are stakes and stones, darker earth on the fresh row, an open grave with its spoil, a spade handle and a bier, a hand-cart, and a sexton's lean-to, ringed by dead pines. The Mound Path stops at their edge, because a way's bed flattens 15 m round it.
- **The Pyre Ground** (9712, -858): a raised, flagged burning floor with four pyres (one lit), the keepers' shed, a bone cart and ash heaps. Lair `out_pyre` (ash-walkers).
- **The Middens** (10330, -1045), under the north cliff east of the gate: fourteen heaps of the city's rubbish, 4 to 10 m high, each with three big things on it (a fallen hut roof, a barrel stack, a wrecked cart, a pair of ribs). Two of the heaps smoke. There are also the rag-pickers' three shelters and fire, and bone heaps. Lair `out_middens` (spiders, red mother).
- **The Strip Fields** (9300, 470): ridge-and-furrow strips with broken dry walls, stooks and a roofless barn.
- **The Leat and the Sump** (9425, 735): the old mill-race comes out under the south wall and runs to a reed-ringed pond in dead pines. It has plank bridges, a punt and eel-traps. Lair `out_sump` (worm, spiders).
- **Tanners' Hithe** (9560, 858): five shanties on both banks of the Leat. Joss Harrow (master tanner, sutler) and Agna Ruddock (eel-wife) are posted there.
- **The Tan Pits** (9668, 868): twelve vats sunk into the ground with thick wooden kerbs, the liquor in three colours (tannin brown, lime white, dung green) a hand below the lip, a beam-house, hide frames, and the far row past the yard. Lair `out_tanpits` (drowned tanners).
- **The Limekilns** (10430, 1085): a 7.5 m bank whose face toward the city is walled in dressed stone, with buttresses. Three kilns stand out of the wall, all lit: a fire in each mouth, a lamp by it, lime stains down the face. The yard in front has lime heaps, a cart and a shed; there are woodpiles on top. Lair `out_kilns` (plague giant, goat-men).
- **The Lazar House** (10665, -718), where the north arm of the Ditch Road ends: the stone hall the city put its lepers in, with a walled yard and one gate (the Lazar Walk), two cells, a well with no frame, the graves outside the east wall, and a cart of wraps. Lair `out_lazar` (plague knights, a necromancer).
- **The Knackers' Yard** (10670, 790), where the south arm ends (the Knackers' Lane): the boiling-house and its cauldron, wattle pens, bone heaps and hide frames, on mired ground. Lair `out_knackers` (goblins, a werewolf).

## The ways (`OUT_ROUTES`)

- **The Ditch Road** (lane, 2.2 m) runs north and south from the causeway's foot, round the moat's outer bank, over both gate fronts (on a widened shelf: `gateShelf`, and `BASIN_N`/`BASIN_S` pushed out at the gates) and on to the Middens and the Limekilns. It goes round the Middens and the Mounds, not through them.
- **Yard paths** (1.1 m), for walking inside a place, not round it: the Ash Yard (Ashfold, gate to Hode's door), the Hithe Landing, the Pits Walk. `white_ash`'s gather `spots` lie at the pyres' ends, on the Pyre Ground's floor.
- **Paths** (1 to 1.6 m) lead off it: the Carrion Steps and the Gibbet Steps down off the causeway, then the Delf Way, Mound Path, Pyre Path, Headland, Leat Path, Kiln Track, Masons' Path, Lazar Walk and Knackers' Lane. Steep grades are cut into steps by `tools/roads/bed.mjs`.

## The quests (levels 23 to 26)

| Quest | Steps |
| --- | --- |
| Wenna Coyle's `the_ash_road` | The Delf, then Hode |
| Hode's `the_pyre_ground` | Kill at the Pyre Ground |
| Nell's `white_ash` | Gather at the Pyre Ground |
| Hode's `the_middens` | The red mother, gem |
| Hode's `round_to_the_hithe` | The Sump, then Joss |
| Joss's `the_far_row` | Kill at the Tan Pits |
| Agna's `agnas_traps` | Gather at the Sump |
| Hode's `the_lazar_house` | Kill at the Lazar House |
| Joss's `the_lime_burnt` | Kill at the Kilns, staff |
| Joss's `the_knackers` | Kill at the Knackers' Yard |
| Joss's `cured_hides` | Maud Treller at the Quiet Watch |

## Trees and ground

- **Trees:** every tree on the Outwall is a snag. `lands.js treeCode` gives 4 there; `src/gfx/pines.js` folds a code-4 tree's needles below its top fifth away (in its shadow too) and colours it grey.
- **Snags:** `snagAt` in `src/gfx/pines.js` (the tree and its shadow) snaps each code-4 tree at its own height, between half and four-fifths up. It thins the trunk by 25 to 50%, tapers it to a third over the stretch below the break, ends it in a jagged stub, and leans it a little.
  - The boughs are scaled smoothly to nubs, left longer in a few whorls and three sectors. Never cull a bough's corners one at a time: a half-culled card stretches to the tree's foot as a long panel (round 4).
  - The field-edge snag lines stand at 0.2, a third fewer than at first (`outskirtsTrees`).
- **Ground:** `outskirtsGround` gives heath patches between the places, and nothing green in a yard. `job.worker.js` darkens ash, whitens chalk, and browns mud and the trodden yards.
  - Each Middens heap is rotten brown-black, with a wet toe, on a paler trodden-ash floor. The top fifth of each heap's height is pale fresh ash.
  - The fresh mounds are darker earth, the Tan Pits' vats have sludge round them, and the Kilns have a chalk apron.
  - Each part of `g` is raised with `Math.max`, never set outright: setting the Sump's wet outright once wiped the Knackers' mire.
- **The terrain shader on the Outwall's places** (`outwallK` in `src/gfx/materials.js`, each `OUT` place out to r × 1.25 + 12 m):
  - none of the walls' cliff rock, the steeps' rock or the talus scree;
  - none of the low "fen mist" over wet ground.
  - All four painted the heaps and banks one pale grey, and from the air the mist read as a white fog bowl (round 2's critics).
- **Water:** the Sump is fan quads of `soot:p2_moat_water` (matte: `dark:` went pale at a grazing look), laid by world x and z. The game's glassy water, plain or `mire:`, took the sky and read as snow. A fan of `K.tri` has no texture coordinates, so the moat picture smeared into spokes.
- **The V/T rule here:**
  - The old wreck cart's spoked `K.wheel` is replaced by the board `disc` (`wreck()`).
  - The open grave's spade is a handle only, no blade.
  - The Middens' ribs have no spine.
  - The mounds' boards are single planks.

## Auto-play fixes made here (`src/ui/autobrain.js`)

- **The walking map's edge:** `inEast` keeps 12 m in from the map's box, so z 848 in the south. The Tan Pits' yard lies on that line. Inside it the east walker steered the hero south to the road; outside it the walker across country steered it north at the wall. They took a frame each, and the hero stood "pressed, going nowhere". Now a walker with an east way in hand keeps using it while inside the box itself (`east-nav.js onEast`, 3 m).
- **Trimming a way on a slope:** `trimWay` dropped a way's first points only where both ends of the next stretch were within 0.8 m of the hero's height. On a slope the far end of a 12 m stretch is more than a metre lower, so every new way kept its first point (where the hero had asked from) a few metres back. The hero turned, walked back to it and on again, every six seconds all the way down off the Sill. Now the height is taken along the stretch, beside the hero.

- **The north and south edges (run 4):** Ashfold (z −880) and the Hithe (858) stood just outside the walking map, which ran z −860 to 860, and the Ditch Road ran outside it too (z ±893). Two things went wrong:
  - Walking east from Ashfold, the hero stood on the `onEast` line at z −857 and flipped between the two walkers, 26 reversals in one run.
  - Inside the map the road could not be seen, so auto-play crossed open ground 40 m off it.
  - Fixed by widening the map to z −920..920 (`src/sim/east-nav.js`, a full bake). A way in hand is now kept 12 m past the map's edge (`onEast`), and a way asked for from just outside is asked from the nearest point on the map (`intoEast`).
- **Over the basin rim:** with two lairs kept off at level 20, the cheapest way from the Needle to the Hithe went over the basin's cliff. `overRoads` now charges heavily for crossing x 9050 more than 150 m from the causeway (`BASIN_RIM`).
- **Chests on the moat towers (round 3, run 1):** the two chests on the decks of the towers at the causeway's outer end (y 20.2, over a moat floor at y 12) were within auto-play's 2.5 m height band from the bank. The way to them went down into the moat, out of the band, so the hero went back to its hunt, climbed out and saw them again: a minute of to-and-fro. A chest more than 2 m above the ground under it now counts only from within 1 m of its height (`level` in the chest code).
- **Steps back at the city gates (round 3, run A):** `trimWay` keeps a way's first points unless the hero stands within a set height of the way along that stretch. In the Charnel Gate and the Tanners' gate the ground dips nearly 2 m below the way's smoothed heights, so each fresh way kept a point 4 m back and the hero stepped back to it. The test is now 2.2 m, not 0.8; a bridge over a street is 3 m or more above it. `trips.mjs` gives the same 6 castle-side failures as before (335 of 341).
- **Steps back after a pick-up or a new errand (round 3, run B):** on a new leg with no way yet, `eastWalk` used to set off straight across country. A second later the way came in round the other side of a yard or down a gate's flight, and the hero turned back 3 to 6 m. It now stands for up to 1.5 s for the first way of a leg.
- **Counting reversals** (`/.trace-read.mjs`, sorted in the page): **fight** if a fight word is said within 4 s (not "put down", which is a hunt's tally, and not picking up); **job change** if the job differs 3 s before and 3 s after; otherwise **walk**.

## After a change

- **Ground:**
  1. Run `node tools/roads/bed.mjs` (the beds, about 10 to 30 s).
  2. Rebake the east walking map for the box you changed: `node tools/paths/bake.mjs 14 x0 z0 x1 z1`.
  3. Then run `map.mjs`, `graph.mjs` and `trips.mjs`.
  - The walking map's box is z -920 to 920, so the Middens (z -1045) and the Kilns (1085) lie outside it. Auto-play reaches them by the road graph and plain walking.
- **Routes:** keep `OUT_ROUTES` last in `ROUTES`. `roadside.js` throws each way's dice by its index, and putting them earlier changed fences and phone corners all over the land.
- **Budget:** `tests/sites-lean` holds a phone under 989,000 corners. The Outwall's far build is colliders only on a phone, and its lairs are not dressed there.
- **Line endings:** `east.js` and `lands.js` are CRLF.
