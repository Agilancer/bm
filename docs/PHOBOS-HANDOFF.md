# City State Phobos : Castle Velscour — handoff

Start here if you are picking up Phobos and the castle from another account or session. This page is the map. The plan is
in [PHOBOS.md](PHOBOS.md), the running to-do and every critic's leftovers are in [PHOBOS-TODO.md](PHOBOS-TODO.md), the
city's layout bible is [PHOBOS-LAYOUT.md](PHOBOS-LAYOUT.md), and the texture sets are in [PHOBOS-TEXTURES.md](PHOBOS-TEXTURES.md).
The tool scripts are described in [tools/phobos/README.md](../tools/phobos/README.md). Read all of these before you build anything.

Written 2026-11-17.

## Where it stands

| Part | State | Where |
|---|---|---|
| Chunk 0: Apricot, Martleboro, Louis G (Meshy models) | in the game; critics rejected the touch-up's 3 rounds | `tools/folk/models.json`, PHOBOS-TODO chunk 0 |
| Chunk 1: layout bible | approved by the owner (city size) | PHOBOS-LAYOUT.md, `tools/phobos/layout.json` |
| Chunk 2: textures (ph_* sets) | built and wired | PHOBOS-TEXTURES.md, `tools/phobos/textures/` |
| Chunk 3: the east (basin, path, the Sill) | built, waiting on the owner | `src/core/east.js`, `src/core/marches.js` |
| The block-out: wall, moat, ~10,000 houses, castle wards, Keep, spires, bridges | merged (PR 203 onwards) | `src/core/phobos-build.js`, `src/core/phobos-data.js` |
| Near/far city, street crowd, haunts, upper floors | merged (PR 203) | `src/gfx/phobos-near.js`, `src/folk` |
| Hubs, 14 quests, drawbridge, moat ditch | merged (PR 204) | `src/core/phobos-hubs.js`, `src/folk/phobos-quests.js` |
| Portals (6669 list, "- Phobos") | merged (PR 205) | `src/core/phobos-seals.js` |
| The Sewers: 4 delves, 9 quests, fights | merged (PR 206) | `src/core/delve-sewers.js`, `src/sim/sewer-fights.js` |
| Two improvement passes over city and castle | merged (PR 208) | PHOBOS-TODO "Two improvement passes" |
| Castle: the Lower Ward delve, the Gate Captain, Apricot's 2 quests | PR 209 | `src/core/delve-castle.js`, `src/sim/castle-fights.js` |
| PH2 texture pack (100 ChatGPT tiles) wired in | PR 214 | `src/core/phobos-p2.js`, `tools/phobos/textures/wire_ph2.py` |
| Every door opens; 116 towers can be entered and are furnished | PR 216 | `src/items/phobos-doors.js`, `src/core/phobos-towers.js` |
| Castle: the Middle Ward delve, the Feast That Walks, the Librarian's household and 7 quests; auto-play through the castle's gates and to people down delves | branch `claude/sharp-cori-de0kwb` | `src/core/delve-castle.js` (MIDDLE_WARD), `src/folk/lines/phobos-castle.js` |

PRs 209, 214 and 216 are stacked. 214 is built on 209, and 216 on 214. They were merged in that order on 2026-11-17, at the
owner's word.

**Done on branch `claude/sharp-cori-de0kwb` (2026-11-17/18), after the Middle Ward:** the city's water lies level
(reaches and weirs), house stairs widened, the camera kept under Phobos's roofs, every drum and cone lit from the right
side (a winding bug in `Kit.drum`), the castle's gate yard paved and furnished with his mark at its end (`castleNear`),
the Slough dressed from near with two footbridges. Critics: the Middle Ward 6.5/6.5 (not passed), the castle's exterior
7/6 (split), the Slough 6.5/7 (split). Their leftovers are in PHOBOS-TODO.md.

- Pictures of the city and castle on the land: `node tools/phobos/city_shots.mjs [names]` (WAIT=30000, HOUR=15 or 16
  for light on the west faces; two shots a run, and never alongside the test suite: this container restarts when both
  run at once).

**Next**, in the plan's order:

1. The castle's High Ward, as a delve next to the Middle Ward (`within`, like it). Both its ways in are keyed by chunk 9's
   dungeons (the Sanctuaries Stair in the Long Stacks; the Crypt door off the Oubliettes): build it shut behind them, or
   ask the owner for a third way in meanwhile. Then the Clock Tower and the Menagerie wings behind their shut doors.
2. More castle quests (the household has seven; dozens are planned), the Librarian's deception magic, the horns.
3. Chunk 7, the city's six dungeons.
4. Chunk 9 onwards: the castle's eight dungeons, the Keep, world bosses, Velscour, the ending, Hard/Mythic, Pinnacle.

The first-sight scene is to be done **last** (owner).

## Owner rules (all still standing)

- **The V and T rule.** Nothing of Tessariel's goes in Velscour's city:
  - no T marks
  - no crosses or cross shapes, including a crossbar on bars, crossed beams, a four-panel door frame, or a chain that
    crosses a ring when seen from below (that last one was caught in the towers' round 2)
  - no bells
  - no holy seals

  Velscour's liveries are **blood red**. In particular castle and Keep wings his troops are palette swaps: royal blue;
  white with extra skulls; forest green; grey with gold. Royal blue and grey-with-gold are never side by side. The hidden
  T loyalists show no T marks at all.
- **No letters or monograms** on anything: banners, Velscour's mark (an iron ring with two red flame horns), doors.
- **Never the village half-timber `wall_NN` layers on big walls.** Phobos uses its own `ph_*` and `p2_*` layers.
- **The names.** The game is "Bellmourn : Velscour's Throne". The town is Bellmourn. The zone is
  "City State Phobos : Castle Velscour".
- **Work without waiting for approval** ("keep going without needing my approval"), but **watch compute**: "DONT FIRE UP A
  MILLION AGENTS… DON'T GO DOWN DETAIL RABBIT HOLES." Don't run broad, slow disk searches; the owner stopped one with
  "STOP".
- **Progress pictures about every 45 minutes** while working.
- **No more Meshy.** The owner gave a Meshy API key in chat once. Never write it to a file and never repeat it.
- **The critics' loop for art.** Two subagents: a 30-year industry veteran (3D, textures, game design) and a young
  designer with immaculate taste. They get up to 3 rounds. Leftovers go in PHOBOS-TODO, with their notes. A critics' pass
  is not the owner's pass: tell the owner what was rejected.
- **The owner merges**, unless they say to merge in so many words.
- Leave `art/ui/bellmourn_ui_kit.zip` out of commits. It always shows as modified.
- Treat `sources/` in the project mirror as read-only.

## How the code fits together

**The land and the city**
- `src/core/east.js`: the east's ground (`eastHeight`), the basin, the moat ditch, the Chasm.
- `src/core/marches.js`: the march places on the way in.
- `src/core/phobos-data.js`: the city's data, exported from `tools/phobos/layout.json` by `tools/phobos/export_data.py`.
  It holds `CITY` (centre and axes; the wall is a dodecagon on an ellipse), the districts, streets, castle wards, the Keep,
  spires and bridges.
- `src/core/phobos-build.js` (the big one):
  - `phobosHouses()`: the city's houses, with overlaps dropped. A door apron and the sewer-mouth lanes are kept clear.
  - `houseNear` / `houseFar`: a house's insides from near; its cheap shell from far.
  - `doorLeaf` / `houseDoor`: a house's door.
  - `tower()`, `spiral()` (stairs: `o.wedge` steps with a sloped underside, `o.reach`), `walk()` (what you stand on).
  - `fire()`: moving flames, delve 'phobos'.
  - `moatAt` / `moatLevel`: the moat's water.
  - `leafU0`: cuts the hinge plates off the plank door's painting.
- `src/core/phobos-towers.js`: the city's 116 towers.
  - `cityTowers()`, `towerByKey()`.
  - `plan()`: floors, flights, door gap and the moat floor.
  - `towerFar`: shell and colliders, plus `towerFires`.
  - `towerNear`: insides.
  - Furniture: `ROOMS`, `ITEMS`, `MIDS`, `INSIDE`.
  - `lamp()` (the bowl on one chain), `chestDais()`, `doorFire()` (the brazier outside), `cityDoors()` (every door, with
    its id).
- `src/core/phobos-hubs.js` (the three hubs), `phobos-seals.js` (portals), `phobos-tiles.js` / `phobos-p2.js` (texture
  layer tables: `ph_*` from tools/phobos/textures, `p2_*` from 200 for the PH2 pack).
- `src/core/sites.js` (shared with the whole game):
  - `Kit`: `quad` winds a face to agree with the normal you give it. `tri`'s texture runs by x + z.
  - `buildPhobosCell(cell)`: one near cell.

**Rendering and play**
- `src/gfx/phobos-near.js`: streams near cells around the player. `hideDoor(id)` folds a shut door away when it's opened.
- `src/gfx/renderer.js`:
  - `phLeaf`: a swung door leaf.
  - `doorItems`.
  - `delveFires`: flames only from the land's build.
  - Lights: only 12 a frame; a lamp may carry `prio`.
- `src/items/phobos-doors.js`: the render thread's doors. E toggles a door. The sim is told through `{type:'phDoor'}`.
  Open doors go in the save.
- `src/sim/world.js`: `setPhobosDoor`, so a shut door stops you. `src/sim/sim.worker.js` passes the messages on.
  `src/items/chests.js`: `towerChests` (79 tower chests, tier set by tower kind).
- `src/folk`:
  - the street crowd (`CROWD`, `lines/phobos.js`, sidewalk lanes)
  - hub givers `ph_penny`, `ph_watch`, `ph_ash`
  - quests in `phobos-quests.js`, words in `lines/phobos-hubs.js` and `lines/phobos-sewers.js`

**Delves**
- `src/core/delve-sewers.js`: four solo delves (westdrains, sloughmains, charnelruns, highconduits).
- `src/core/delve-castle.js` (`CASTLE`): the castle's wards as delves in the sewers' row: the Lower Ward at x 10760 and
  the Middle Ward at x 11180, z -5700, y -60. Roofs must stay under y -20 for `tools/dungeon/check.mjs`.
  `src/sim/castle-fights.js`: the Gate Captain and the Feast That Walks.
  - A ward gone into only from another has `within` (no arch on the land; its `portal` is the other's). A link with
    `shut: '<boss>'` stays shut till that boss has ever died (`Warrens.open`; main.js sends `bossesDown`; the renderer's
    `gateOpen` darkens the arch). Auto-play routes through them with `delveWay` (src/ui/autowarrens.js).
  - Quest places can be a delve's room, `room:<id>` (src/folk/quests.js AREAS).
  - People stood down a delve have `delve` (or the sewers' `sewer`) and, in the castle, `late` (loaded on the way to
    Phobos, as the crowd is). Auto-play reaches them by `delveTalk` (src/ui/autobrain.js).
- `src/ui/firstsight.js`: the first-sight scene (to be finished last).

**Tests**
- `tests/phobos-way.test.mjs`: walking the streets, stairs and bridges.
- `tests/phobos-crowd.test.mjs`
- `tests/phobos-quests.test.mjs`
- `tests/sewers.test.mjs`
- `tests/castle.test.mjs` (both wards, the shut gate, the Feast, the household, auto-play's way up)
- `tests/phobos-towers.test.mjs`: doors and towers.

## Running and testing

- Tests: `node --test "tests/*.test.mjs"`. Quote the glob; a bare folder runs nothing, and `npm test` doesn't work. On
  2026-11-17 the suite was 488 tests: 487 pass, 1 skipped (after the Middle Ward). The ninja test in tests/hero-skills is flaky and passes on a
  rerun.
- The game is served at `http://localhost:8720/?noopening`. To start it:
  1. Click once to skip the credits card.
  2. Click **New Game**.
  3. Click the second **New Game**, which confirms.
- Test hooks on `window.bm`:
  - `bm.cmd(19, 0, x, z)` teleports onto the ground, under any deck.
  - `bm.setCam({x,y,z, fx,fy,fz, ux,uy,uz})` takes a forward **vector** and an up vector, not a target point.
  - `bm.shot(name)` saves the canvas without the HUD to `tools/build/shots/name.png`.
  - `bm.setTime(h)` sets the hour.
  - `bm.look(yaw, pitch)` turns the view. Forward is (sin yaw, cos yaw).
  - `bm.shared.input[14] = 0` unpauses.
  - In the snap, indices 2, 3 and 4 are x, y and z.
  - `bm.view` is the game object: `phDoors`, `renderer`, `takeNearest`.
  - Never return `bm.snap()` from a page script.
- When the pane is hidden its frames are throttled. Press Escape to close the pause menu, and take a screenshot to wake
  it. Before shooting, wait until the near cell is in: `bm.view.renderer.phobosNear.cells.has(cell)`. This helper was
  used for every tower shot:
  ```js
  window.__go = async (px, pz, cell, cam, name) => { const g = bm; g.shared.input[14] = 0; g.cmd(19, 0, px, pz); g.setCam(cam);
    const t0 = performance.now(); while (performance.now() - t0 < 25000 && !g.view.renderer.phobosNear?.cells?.has(cell)) { g.shared.input[14] = 0; await new Promise(r => setTimeout(r, 500)); }
    await new Promise(r => setTimeout(r, 2500)); return g.shot(name); };
  ```
  Page scripts over 45 s time out, so split them.
- Shot spots used for the towers:

  | Spot | Teleport | Cell | Camera |
  |---|---|---|---|
  | A spire, door 20010 | 10373.3, -414.2 | `10_4` | outside at (10380.4, 97.6, -418.4) facing (-0.868, -0.08, 0.496); ground floor at y 96.6, stillroom y 101.2, top y 105.8 |
  | The barbican | 9316, -26 | `0_8` | at (9316, 16.6, -22.8) facing -z |
  | The hospice | 9632, 422 | `3_12` | |
  | A wall corner tower | 10750, 214 | `14_10` | |
  | A house door | 9542.8, 334.9 | `2_11` | |

  To open a door from a script: `bm.view.phDoors.toggle({ ph: true, id })`.
- Castle pictures without a person at the pane: `node tools/phobos/castle_shots.mjs [names]` (server on 8481, headless
  Chromium; the no-damage cheat, noon, a held camera per room) saves `tools/build/shots/<name>.png`.
- Other checks:
  - `node tools/lands/check-vt.mjs`: the V and T rule. `tools/lands/check.mjs` does not exist.
  - `node tools/dungeon/check.mjs`: delves.
  - `node tools/autoplay/check.mjs`: auto-play must learn every new quest, foe, place, spell and item (CLAUDE.md
    checklist).
  - `node tools/dungeon/fight.mjs <boss>`: fights a boss.
- In the sewers and the castle:
  - `bm.warrens('enter'|'room'|'boss', {delve|room|boss})` jumps into a delve.
  - `bm.cmd(26, i)` goes to delve i's portal.
  - A level-1 character dies to packs at once, so shoot empty rooms.
  - Entering a boss room starts the fight.

## Budgets and traps

- **The land budget is full.** It stands at 1,582,157 of 1,600,000 corners (it was 1,594,437 before the doors branch).
  Put everything new in near cells (`phobosCell`, `castleNear`, `wallNear`) or in Phobos's own build, never in the land.
  Fires add no corners. A near cell takes about 29 ms to build in Node (84 ms at worst). The phone is unmeasured.
- **Flames only come from the far build.** A `fire()` in a near cell is thrown away. That's why `towerFires` furnishes
  each tower again with `new Kit(false)` (which draws nothing) just to collect its flames.
- **Close lights wash colour out.** A lamp within about half a metre of a drum lights it pale, whichever way its faces
  look. Keep a light a metre or more from dark iron.
- **Use `soot:` or `char:` on big round things.** The `dark:` tint is glossy, and sunlit drums in it go silver.
  `char` (13) is near black and matte. `eve` (12) is a window lit from dusk.
- **`Kit.tri`'s texture runs by x + z**, so it smears on a face turned 45°. Use a quad with its last corner doubled.
- **Give `Kit.quad` faces the winding of the normal you pass**, or it turns them round and the texture shears.
- **The moat's water sheet** sits at `Y + 2.4` over a ring at k 1.016–1.08 of the dodecagon ellipse. Anything on the
  bank must be floored over it (`moatLevel`).
- **Delve rooms:**
  - A room's `fires` is the spacing of its wall torches in metres (default 10), not a count.
  - Overlap joined rooms by about 4 m, or the field pinches.
  - A line mark's `w` is its half-width, and its colour is its elem (DRAIN = blood red, STONE renders white).
  - Never put two exits straight across a room from each other.
- **`takeNearest` priority.** Drops, lands seals, stations, chests, folk, heroes and rope all come before a door. So E
  on a door loses to a hero standing next to you.
- **Crowd shots.** Put the camera in the street's middle (lane + (uz, -ux) * 4). A teleported player has yaw 0.
- **Line endings.** The files mix LF and CRLF, and git warns when it converts them. That's harmless.
- **Owner-call risks among the PH2 textures:**
  - wrought bars: a square grid
  - drain cover: cross braces
  - rich door: a four-panel frame reads as a cross
  - leaded glass: the diamond lines cross
  - shutters: Z braces
  - the banners' crown of thorns

  Banners, stained glass and decals need alpha first, because they come on white or black backgrounds.
- **Textures in the repo.** Texture pack 01 is the PH2 batch from ChatGPT (`assets/phobos/textures`, sheets in
  `assets/phobos/batch_0N`). The older owner packs are in `assets/citystatephobos`. ChatGPT's tiles come back at 1254 px
  and not seamless: run them through `tools/phobos/textures/seamless.py`. The request zips and their builder are in
  `art/phobos/texture-requests` and `tools/phobos/texture_requests`.
- **Assets outside the repo:**
  - Velscour's models: `F:\!    BM V2\DEMON LORD VELSCOUR - HUMAN FORM.glb` and `- DEMON MODE.glb`, for chunk 12.
  - Apricot's references: `art/phobos/ref/`.

## Untested by a human

Nobody has played any of Phobos by hand:
- the city
- the crowd
- the hubs and quests
- the sewers
- the Lower Ward and the Gate Captain's kill
- the doors and towers
- the Middle Ward, the Feast That Walks, the shut gate opening on the Captain's death, the household's quests, and
  auto-play walking up to them (all checked headless and by tests only)

The phone has never been run on a real phone, and the street braziers have not been seen at night. The full list is under
"Untested" in PHOBOS-TODO.md.
