# City State Phobos : Castle Velscour — things that need to be completed

The running list for the whole zone. The plan is [PHOBOS.md](PHOBOS.md). Update this file whenever a chunk moves. Each
chunk: build → critics (up to 3 rounds unless the owner says otherwise) → show the owner and wait → PR. Whatever doesn't pass
the critics' third round goes under "Did not pass the critics" with their notes in full, so it can be picked up later.

Status words: **not started**, **in progress**, **waiting on owner**, **built (unseen by owner)**, **approved**, **merged**.

## Waiting on the owner

- Chunk 3 (the east) to look at: `art/phobos/east/relief_way.jpg`, `shots_r2_a/b/c.jpg`, or in the game
  (`bm.cmd(19, 0, 8935, 0)` puts you on the Sill; `bm.firstSight()` plays the scene).
- The crag's height: the critics want the castle's rock at least 2.5 times taller than the layout's +70/+90/+115 m.
  Raise it (and the Keep with it), or leave it as approved?

- The open questions at the end of PHOBOS.md (Blackvigil Keep, the hidden loyalists and the V/T rule) and of
  PHOBOS-LAYOUT.md (the city's size, five clears, the scene's length, level bands, names).

## Chunk 0: Apricot, Martleboro and Louis G — in progress

Owner's rules for this chunk (2026-11-14): **no critics**; design pictures first; **no 3D until the owner approves the
pictures**; nothing else in the zone starts until the owner approves these three.

- [x] Apricot's source found: the `redhead` townswoman (Tamsin Reed), `F:/!    BM V2/! TRIPO GENERATED NPC/FEMALE VILLAGER - PETITE RED CURLY UNDERCUT.glb`, 1.57 m, T-pose. Renders in `art/phobos/ref/` (made by `tools/phobos/render_front.py`, background Blender: `blender -b --factory-startup -P tools/phobos/render_front.py -- <glb> <out.png>`).
- [x] Prompts written, word for word, in `tools/phobos/characters.json` (Apricot by image-to-image from the renders so she keeps that face and hair; the brothers by text-to-image, T-pose).
- [x] Ran the three pictures (27 credits) on 2026-11-14, straight through Meshy's API with a key the owner gave in chat,
  because the MCP connection's key is capped. Never write that key into a file. Saved in `art/phobos/pics/` (`sheet.jpg`
  side by side). Meshy task ids: martleboro `01a1ddb1-ffd2-73cb-878f-d0c6d4099a41`, louis_g
  `01a1ddb1-ffd6-71bd-aafb-4f16d0847934`, apricot (image-to-image) `01a1ddb1-ffd3-738f-9bd1-224b9e9a72a9`. The brothers came
  out with arms angled down (A-pose-ish) though T-pose was asked; fine for rigging.
- [x] Owner approved the pictures ("Approved, make 3D") on 2026-11-14. Owner then said: no more Meshy this session after
  these three; everything else is palette swaps, Blender work or velscourtactics assets; the critics judge these three.
- [x] 3D (meshy-t2.5, 30k, meshy-n1, T-pose) and Meshy rig + walk/run, via the REST API with the owner's chat key.
  image-to-3d ids: apricot `01a1ddb5-4d72-76cc-ba2c-31b8170810b3`, martleboro `01a1ddb5-4d77-71f3-95ca-680f75295045`,
  louis_g `01a1ddb5-4d79-71d8-9f59-898afcdc189b`. Rig ids: apricot `01a1ddb6-1002-72dc-bac8-cb4d511aee5d`, martleboro
  `01a1ddb6-1063-76e1-be5d-f5134ec527a1`, louis_g `01a1ddb5-f185-71e8-b08f-67584563a137`. Raw rigged files:
  `art/phobos/models/<id>_meshy.glb`.
- [x] Onto the townsfolk rig: `tools/phobos/meshy_to_folk.py` (spine named by the chain: Meshy counts Spine02 at the hips;
  fingers from a donor, refitted to the mesh's own fingers; sliver faces deleted; see its docstring). Donors: Apricot the
  redhead (Tamsin), the brothers `MALE VILLAGER - WORKER 2.glb`. Check fists with `tools/phobos/hand_check.py`.
- [x] Apricot's face mended from the approved picture: `tools/phobos/face_fix.py` (render, bake) + `face_patch.py` (patch,
  blemish, compose) + `glb_swap_texture.py`. The brothers keep their own faces (their pictures have arms down and don't line
  up); small marks painted with `face_patch.py blemish`.
- [x] Atlases padded (`tools/phobos/pad_texture.py`): Meshy's islands sit on pure black.
- [x] In `tools/folk/models.json` with `"repo": true` at **32000 tris (no cut)**: the builder's decimation tears Meshy's
  hundreds of tiny UV islands (Apricot's corset smeared at 12k). Built and painted (flat n/m maps); all bones match in
  `tools/folk/viewer.html?ids=martleboro,apricot,louis_g,redhead&clip=idle` (dev server `bm-phobos`, port 8720).
- [x] Touch-up (owner, 2026-11-15: "Do your absolute best to touch them up, especially the eyes on the princess"). The
  whole pipeline and its dead ends: `tools/phobos/README.md`. In short: inside-out scraps turned and painted, UV seams
  welded and holes filled, head lighting smoothed in the builder (`calm_head`), Apricot's eyes, lashes, brows, lips,
  blush and freckles painted (`paint_eyes.py`, `apricot_eyes.json`) and her skin warmed, the brothers' eyes painted,
  Martleboro's rest pose raised from arms-down to a T (his arms had folded behind his back in every clip), shoulder
  plates onto the collarbone, belt props rigid on the hips, a per-body loose fist on the run (`"fist": 0.45`, read by
  `src/folk/rig.js`). The earlier "grey skin" was pale paint under cool light plus the viewer's grey tint, not normals.
- [x] Two critics, three rounds (sheets in `art/phobos/review/`, `before_after.jpg` for the owner). All three REJECT:
  r1 Apricot 4-5, Martleboro 5-6, Louis G 6.5; r2 6, 6-7, 7; r3 6.5, 7-7.5, 7 (the young critic: both brothers pass,
  Apricot would be 7.5 and an APPROVE if her round-3 paint showed). It had not: the viewer served a stale cached
  texture for Apricot in round 3, so the critics never saw her final brows, lips, lashes and freckles. Always fetch
  `<id>_c.webp` with `cache: 'reload'` before shooting.
- [ ] Waiting on the owner's look at `art/phobos/review/before_after.jpg`.
- [x] Placed in the world (chunk 6): the brothers in the keepers' office in the West Drains, Apricot in the Sunk Garden. Seen in the game's own renderer.
- Design notes: the brothers nod at a famous pair of plumbers without copying them (no overalls, no brimmed caps, no letters,
  no white gloves; medieval leather jerkins, hoods, waders, tool belts). Apricot avoids the famous princess's look too (no
  pink gown, no gold crown): red curly hair and undercut, apricot and cream, copper tiara. No blue with gold anywhere (T's
  colours).

## Chunk 1: research and the layout bible — waiting on owner

- [x] Research (Castlevania, the Souls castles, Dunwall, sewer levels, real fortifications, awe reveals): ten rules
  and the sources, in [PHOBOS-LAYOUT.md](PHOBOS-LAYOUT.md).
- [x] The layout: `tools/phobos/layout.json` (the data; change this, never the pictures) and
  `python tools/phobos/draw_layout.py`, which draws `art/phobos/layout/{overview,city,sewers,castle,keep,section}.png`
  and checks the V and T rule, the castle's keys (no lock-out, from both the Gatehouse and the Aqueduct) and the
  sight lines to the Keep from nine spots.
- [x] Owner, 2026-11-15: **the Keep is on top of the castle.** Done: the spires stand on the High Ward's wings, the
  Throne Tower is one trunk from +115 to +330.
- [x] Progression: level bands 14 to 180, an itemised XP and hours budget (about 57 hours), drip visits at 12, 14, 16,
  18, the endgame arc, the keys, the idol, the spires' parts, a five-clears template for one castle dungeon and one
  spire.
- [x] Critics, three rounds: REJECT, REJECT (close), **both APPROVE** (scores 7 to 8). Their conditions are fixed in
  revision 4; what they left open is at the end of PHOBOS-LAYOUT.md and under "Did not pass the critics" below.
- [ ] Owner to look and decide: the city's size (1.4 by 1.6 km walled, the zone still the whole east side; the east
  edge at x 11,700), five clears kept as asked (both critics would rather three), the five-minute scene kept as asked,
  the level bands, every name.

## Chunk 2: textures — waiting on owner

Everything is in [PHOBOS-TEXTURES.md](PHOBOS-TEXTURES.md).

- [x] Sources surveyed: 126 photographs and 100 generated tiles in `assets/citystatephobos/`; none tiled as it was.
  `art/phobos/textures/raw_photos_index.jpg` numbers the photographs (p000 to p125, file order).
- [x] Seamless tool: `tools/phobos/textures/seamless.py`; `process_all.py` runs all 226 into `catalog.json` and
  `art/phobos/textures/sheet_01..12.jpg`.
- [x] Material sets, revision 4: `tools/phobos/textures/sets.json` (52 tiles, ten sets) and `build_sets.py` into
  `assets/game/phobos/tex/` (21 MB) with `set_<name>.jpg`, `sets_overview.jpg`, `ramp.jpg`. The build fails on a seam
  over 1.6 or a brightness under 0.10.
- [x] Critics, three rounds: REJECT, REJECT (close), **both APPROVE** as the base to build from (6 to 8). What they
  left is at the end of PHOBOS-TEXTURES.md and under "Did not pass the critics".
- [ ] Owner to look at `sets_overview.jpg`, `ramp.jpg` and the ten set sheets.
- [ ] Not wired into the game (chunk 4): loading by set, half size on Low, scattered tiling, course offsets, the
  grime layer.
- [x] **The PH2 pack** (`assets/phobos/textures`, 100 tiles plus `banner_skull`, dyed oxblood from the skull field) is
  wired in as a second texture array: `tools/phobos/textures/wire_ph2.py` writes `assets/game/tex/p2/` and the
  manifest's `ph2` block; layers `p2_<id>` from 200 (src/core/phobos-p2.js, src/gfx/materials.js). On the city's walls,
  roofs, walks and doors, the castle's curtains and towers, the Keep, the Lower Ward and the banners. Both critics
  passed round 3 (8.5 each).

## Chunk 3: the east — waiting on owner

The ground and the way there, in the game (uncommitted, branch `phobos`, fast-forwarded to main at PR 198 first).
Critics: REJECT, then **both APPROVE** round 2, narrowly, as ground to build on (veteran: journey 7, terrain 6, places 7,
scene 6.5, orders 8; young: mood 5.5, the way 7, places 6, scene 6, orders 8.5). Pictures: `art/phobos/east/`
(`relief.jpg`, `relief_way.jpg`, `shots_r2_a/b/c.jpg`).

**The owner's orders this chunk (2026-11-15), all in:** the basin is not round and its cliffs stand about 40 m outside
the north and south gates, and hard against the castle's crag; the way there meanders (the Chasm snakes, the causeway
sweeps down in an S); the city wall is a dodecagon (in the layout data, the plans and the ground under it; the wall
itself is chunk 4).

- [x] The east edge moved to x = 11,700 (`WORLD_EAST`, `LAND`, `inLand` in `src/core/lands.js`; `LAND_EAST` in
  terrain.js; the player's clamp). North, south and west are still 5,600.
- [x] The far-land textures are a rectangle now (`FAR_WIDE`, `farWide` = 1.5 x `farSize`; shaders take `FAR_ORG` and
  `FAR_SPAN` as vec2); the road grid is `RD_NX` by `RD_N`; the map's paper and fog are wider (`EAST`, `WPXW`, `FOGW` in
  `src/ui/map.js`), and a save's old square fog is read into the wider one (`FOG_OLD`).
- [x] The Hollowfang Warrens' hidden box moved from past the east edge (x 5760, where the Marches now are) to past the
  north edge (x 4760, z -5740). `tools/dungeon/check.mjs` and `tools/testhall/check.mjs` test against the `LAND` box.
- [x] Two countries, `marches` and `phobos` (`east: true`: they hold no ground west of the old edge and the old ones none
  east of it), with their factions, tears, stone and far-map kind.
- [x] The ground: `src/core/east.js` (the ridge and the Notch's two horns, the Chasm's line `CHASM` with its ledged
  walls, slot and chambers, the Broken Span's cleft, the Sill's shelf, the causeway, the basin `basinIn` with its talus,
  the city's rise inside the dodecagon `cityIn`/`CITY_WALL`, the crag and its three wards). To look at it:
  `node tools/phobos/east_profile.mjs art/phobos/east/grid.bin && python tools/phobos/east_map.py`.
- [x] The five places and the way's own (`src/core/marches.js`): Greywarden Keep (pale stone, the beacon), the Lantern
  (blue-grey, lit head, on a knoll), Gatewatch Keep and its toll gate across the Throne Road with the chain, the Needle
  (black, 76 m, on a knoll), Marshal's Hold (black, twice the height, a 78 m tower); the Notch's gate towers, the Span's
  abutments and fallen blocks, the Sill's kerb, braziers down the causeway. Sites, three hand-laid roads (the March Road,
  the Marshal's Road, the Throne Road) and the Sill's seal are in lands.js and sites.js.
- [x] Garrisons (`LAIRS` in tripo-monsters.js), a different palette at each keep as the owner asked, and two named
  bosses: Old Marshal Brannoch (`ma_brannoch`) and the Toll-Giant (`ma_tollgiant`).
- [x] First sight (`src/ui/firstsight.js`): the first time you step onto the Sill, in auto-play, the hero stops and the
  camera goes out in five beats (30, 70, 60, 70, 70 s: five minutes) and comes back; any key, click or tap rides on;
  Settings has "Pause auto-play at first sight of Phobos". By hand you get the view and a line. `bm.firstSight(t)` plays
  it from t seconds for looking at.
- [x] Checks run and passing: all 415 tests, `tools/lands/check-vt.mjs` (V and T over 1.5 km apart),
  `check-sites.mjs`, `tools/dungeon/check.mjs`, `tools/testhall/check.mjs`, `tools/autoplay/check.mjs`.

Not done in this chunk (each is somebody's next job):
- [ ] **The jobs themselves.** The beacon, the Lantern's safe line, the toll chain (lower it or pay), the Needle's map
  and the patrols are places and garrisons only; nothing can be put out, lit, lowered or climbed yet.
- [ ] **World bosses** are two big named lair bosses; there is no world-boss system (chunk 11). Lairs carry no real
  level: `lvl` on the Marches' lairs is only what auto-play takes them for, so they are as tough as the Waste's.
- [ ] **The scene shows bare ground** until chunks 4, 8 and 10 build the city, castle and Keep it flies over. It has no
  sound (the bell, Lisandra's line, strings, drums, choir are in PHOBOS-LAYOUT.md), no replay control, and "seen" is
  kept on the device (`velscour.phobosSeen`), not in the save. Monsters are not held off while it plays.
- [ ] **Lesser roads.** `tools/roads/lay.mjs` and `tools/wilds/place.mjs` still work on the old square only: the east has
  its three hand-laid roads, no outposts, tears or laid lanes. (Running lay.mjs again re-lays every road in the land.)
- [ ] **Phone memory is unmeasured.** `tools/phone_memory.mjs` crashes its page on this machine, on main as well as
  here. By sum the wider land costs a phone about 6 MB more of far textures, 4 MB of map paper and 23,000 corners.
- [ ] A save made inside the Warrens before this change loads at the old place, which is now in the Marches.
- [ ] The land's corner budget in `tests/sites-lean.test.mjs` went from 900,000 to 1,000,000 (it stood at 892,896
  before the Marches' 23,000).

## The block-out (owner, 2026-11-15) — in progress

**The owner changed the order of work (2026-11-15):** build the basic layout of everything first, then quick carve-outs
for all the portions, then iterate section by section until the whole region is finished; two critic rounds per area
before moving on; progress updates with a few pictures every 45 minutes; watch compute (few agents, no detail rabbit
holes). **First sight is left to the very end.** His reference is `art/phobos/owner_reference_section.webp` (an idea,
not a blueprint): he wants it even taller, with more towers and more bridges between towers, the satellites included.
The chunks below (4 to 10) still say what each part needs; this block-out is their first pass, all at once.

Done, in the game (uncommitted), all in `src/core/phobos-build.js` (`phobosCity`, `phobosCastle`, `phobosKeep`), on the
ground in `src/core/east.js`, from `tools/phobos/layout.json` by way of `python tools/phobos/export_data.py` ->
`src/core/phobos-data.js`:
- [x] The rock raised: wards at +120, +175, +235 m (`WARDS`); the Keep to 680 m (`KEEP`); the high ground behind the
  basin's head held low so the Keep stands against the sky; the city ground climbing 96 m toward the castle in ten
  terraces (`cityRise`); the moat cut as a dry ditch 40 m wide (left whole at the four gates); the Slough cut; the
  Castle Approach as a ramp.
- [x] The wall: the dodecagon, 50 m high, 12 m thick, corner drums of 92 m, a tower of 74 m every 100 m, twin-tower
  gatehouses of 122 m at the four gates.
- [x] The city: about 10,000 houses as terraced rows in back-to-back blocks, alleys 2.4 to 3 m, each district's grid
  turned its own way (`LOOK` says what each district is built of); a landmark in each (`landmarks`).
- [x] The castle: outer curtain and towers, ward walls, gatehouse, the Lower Ward's working buildings, the Middle
  Ward's halls (Great Hall, Library, Gallery, Map Room, Alchemists, Conservatory, Menagerie, Clock Tower, campanile),
  the High Ward's halls up on the Keep's steps.
- [x] The Keep: a four-step body (`STEPS`), the Throne Tower in four stages, the Grand Patio, five spires (`SPIRES`),
  16 satellites, a dozen lesser towers, bridges between all of them.
- [x] First carve-out: the King's Mile and the four named streets are real roads (`ROUTES` in lands.js, from
  phobos-data.js): paved, on the map, kept clear; the landmarks and forts stand back off them. (Not yet seen in the game.)
- [x] Pictures: `art/phobos/east/shots_p_c2_a.jpg`, `_b.jpg`, and after round 2 `shots_q_final_a.jpg`. How to take them: tools/phobos/README.md, "The east".

Critics on the block-out: round 1 both REJECT (city a scatter, wall a kerb, Keep pencils on a thin body, wire bridges).
Round 2:
**both APPROVE, with conditions** (veteran: silhouette 7, Keep 7.5, wards 6, city 7, wall 7, brief 7; young: awe 7, Keep
7.5, wards 6, city 6.5, wall 7, brief 7). Sound to start detailing the wall, gates and city districts; the veteran wants
his first three points settled before the Keep and wards are detailed. Done since, unjudged by them: the rim cut down
either side of the Sill; the King's Mile 16 m wide with continuous four- and five-storey frontage (and 6 m frontage down
the other named streets); one block in eight half as tall again; ward walls 48 m with 96 m gate towers; the Grand
Patio carried 148 m out on arcaded piers with a tower at each end; six hanging turrets on the trunk and a second, higher
tier of bridges from the three highest spires (`shots_q_final_a.jpg`).

Left from round 2, for the sections:
- **Arrival view**: from the Sill the Keep must fill a third of the frame's height; the west gatehouse's 122 m towers
  stand on the sight line and hide its lower third.
- **Ward tiers**: the climb should read city, bastion, castle, Keep: two or three curtain rings at clearly different
  heights with faces of 40 m or more (the reference's Knight Bastion shelf); a gatehouse per ring; the route up.
- **Terraces**: the city's 96 m climb does not read. Retaining walls of 8 to 12 m at each step with houses on their lips.
- **Rows**: eye-level enclosure everywhere, not only on the named streets: no gaps inside a block, eaves nearly meeting
  over the alleys. The outer low districts (Cinder, the Barbican) still read as boxes with gaps.
- **Landmarks**: only the Ninefold Eye and the Ossuary carry from the air; each district needs one silhouette three
  times its roofs' height.
- **Bridges** at mid-height between the satellites and the wall's towers; a barbican thrust forward at the gate; the
  ditch deep enough to shadow.
- **Unjudged by anyone**: the alleys on foot, the moat and drawbridge, the route up, frame rate with 10,000 houses.


**Carve-outs, first pass (2026-11-16), done and walked by `tests/phobos-way.test.mjs`:**
- The named streets are roads (above). The four gates are open ways through the wall.
- The wall-walk: each side of the wall has a level top that is stood on, with a stair up inside the wall beside the
  Drawbridge Gate and beside the Castle Gate. It stops at every tower (no doors through them yet).
- The Castle Approach ramp to the Lower Ward's gate; the ramp from the Lower Ward up through the Middle Ward's gate
  (`WARD_RAMP` in east.js).
- The four great stairs (`stairs`, `STAIR_Z`) up the west face of each of the Keep's steps, from the Middle Ward to the
  fourth step at +506 m; the steps' tops and the Grand Patio are stood on.
- The engine rule that makes this possible: a platform marked `over` (src/sim/world.js `platformAt`) is stood on only by
  feet that are up at it, and of several such decks one over another the highest within a step of the feet is taken.
  Everyone but the player stays on the ground under them.

**Carve-outs, second pass (2026-11-16), done and walked by the same test:** the wall-walk goes through every tower
(`pass` in `tower()`), over each gate's head, and up a stair inside each corner drum from one side's height to the
next; a winding stair up the outside of each of the five spires from the Keep's steps, by two galleries, to the gallery
under its crown (`spiral`, `ring`); each spire's bridge to the next is walked, tread by tread, the last to the trunk
at 560 m; a winding stair round the trunk from the top step to the gallery at 580 m and on to the crown's floor at
630 m; the Slough left whole where the King's Mile and the Low Road cross it.
**Phobos's own textures are wired in** (`python tools/phobos/textures/wire_layers.py`: ten `ph_*` layers at the end of
the static array, 62 layers now, about 9 MB each on the GPU; metres a repeat in `src/core/phobos-tiles.js`), and
every house, the wall, the castle and the Keep use them. Roofs are still the village's four.

Carve-outs still to do: every inside (all still solid boxes: see "Enterable city" below); stairs on the wall's north and
south sides; the satellite towers' ways up (their bridges are level but nothing reaches them); the lesser bridges; the
drawbridge and the moat's water; a way for anyone but the player to use any of it (heroes, the party and foes stay on
the ground, and nothing finds a path up a stair). The trunk has no collider above 400 m, so on the upper steps it is
walked through.

**Enterable, lived-in city (the owner, 2026-11-16) — built; critics: REJECT, then both APPROVE round 2, narrowly** (veteran:
exteriors 5, streets 6.5, night 5.5, interiors 4.5, roofs and detail 5, brief 5; young: explore by day 5.5, streets 6,
night 5.5, interiors 4, roofs and detail 6, brief 5), as a base to keep building on, "not shippable yet". Pictures:
`art/phobos/east/shots_m_live2_a.jpg`, `_b.jpg`. Left by them, for the next passes on the city:
- The King's Mile's upper storeys still read as sheer wall: jetties, string courses, gables to the street, a broken
  roofline, bigger and more windows; quoins or downpipes at the party lines.
- Interiors are a bare hall: partition or shrink the room; beams; windows seen from inside with daylight; shelves, a
  bed, a rug; a fire that is not a flat triangle (the `flame` layer is one flat colour).
- Night: every stall lantern casting light, lit streets as ribbons from the castle, warm bounce on walls. (The renderer
  lights only the nearest few lamps: `tier.lights`.) Lit windows glow by day too: not tied to the clock.
- Chainmarket's ground paved, a well, drains; the gibbet tower and the big halls need bases, openings and banding.
- Signs are blank boards; shop doorways are bare holes until doors come; kerbs and steps tilt on the terraces' banks.
- **People, doors, upper floors** are the next jobs (both called the missing people fatal to the brief).

Round 2's state:
- [x] **Near and far.** The city's houses are laid out once as a list (`phobosHouses()` in phobos-build.js: 10,254 of
  them) and drawn two ways. Far: a block and a roof each (`houseFar`), in the land's buffer, a group to each 100 m cell
  (`ph:<cell>`). Near: `src/gfx/phobos-near.js` builds one cell a frame within 150 m of the eye as hollow houses
  (`houseNear`, by way of `buildPhobosCell` in sites.js), folds that cell's blocks away (`renderer.foldLand`), and
  lets it go past 230 m. A cell is 14,000 to 62,000 corners and 13 to 43 ms to build.
- [x] **Gone into.** Every house's walls are colliders from the start with the doorway left open (`houseWalls`): 56,000
  colliders in the land now (it was 15,000), and the sites' build is 3.6 s a thread (it was 2.2 s).
- [x] **Lived in.** Inside: plaster, board floor, ceiling, a hearth with a fire, some furniture. Outside: windows with
  sills and shutters, door lamps, chimneys, dormers, washing lines, barrels and woodpiles; street lanterns every 22 m
  (`phobosLamps`); the King's Mile's flagged sidewalks and Chainmarket's stalls (`streets`). Ruins have no roof.
- [x] **Night.** Hearths, door lamps and lanterns are real lights while their cell is up (pushed into `renderer.lights`,
  `litOrder` cleared); the far view has a lit window on one house in three.
- [x] **People** (the owner, 2026-11-16: "Add the people, then the doors and upper rooms"): a street crowd of 24
  (`CROWD` in src/folk/people.js; 8 on a phone): cutpurses, sellswords, drunks, beggars, dicers, a fence, delvers, demon
  hunters, a fortune-teller, tavern girls, a rat-catcher, urchins, ruffians, in the townsfolk's bodies recoloured
  (`tools/phobos/crowd_swaps.py`, 18 swaps) and six of the posted people's. Lines: `src/folk/lines/phobos.js` (13 kinds,
  12 street exchanges). They walk the named streets' sidewalk lanes (`phobosLanes`), stand about, cross over and stop in
  knots to talk (`roam` in src/folk/brain.js); parked outside the city; set down 22-48 m off (10 behind), mostly on the
  street you're in; anyone past 60 m is set down again. Bodies load only once you're near the east.
- [x] **Haunts**: six lairs inside the wall where the dead and the Loyal keep and the crowd doesn't (`HAUNTS` in
  src/core/east.js; Bone Yards, Cinder, Barracks, Approach, Wharf, Mages' Rise). Not yet seen in the game.
- [x] **Doors**: a hinged plank door with iron straps on every house, stood open inward; 1 in 16 barred shut.
- [x] **Upstairs**: every house of two storeys with room for it (about 9,700): a stair up the left wall (riser blocks,
  proud treads, boarded side with a cupboard door, handrail on a newel), a railed hole, joists, an upper room with a bed
  and headboard, banded chest, candle, stool, rug, crates, a pallet in the bigger ones; skirting and corner posts.
  One stacked deck per house: ground floor, threshold, treads, upper floor (tested climbing 40 houses).
- [x] Houses no longer stand in each other (397 overlapping pairs where districts met: the layout drops the second).
- [x] Faces given a normal are wound to agree with it (`Kit.quad` in sites.js): mirrored houses' ceilings were lit from
  above and black from below.
- Critics, people/doors/upstairs: round 1 both REJECT 6; round 2 veteran APPROVE 7, young REJECT 7 (wants the crowd
  nearer still, per-kind props). Fixes after round 2 not re-judged. Pictures: `art/phobos/east/shots_z_people2_*.jpg`,
  `shots_z_people3_*.jpg`.
- [ ] Per-kind props on the crowd (hoods, sheaths, a drunk's mug, a beggar's bowl, sitting/slumped poses).
- [ ] The crowd over the crest of a hill is out of sight: 24 bodies spread round you thin out on slopes.
- [ ] Upper rooms deeper than 8 m want a partition (it would need colliders that stop only upstairs).
- [ ] The chimney breast is a plain stone box (no opening upstairs, no mantel); door lanterns aren't lit by the clock.
- [ ] Alleys have no lanes (the crowd walks only the named streets); the mages' towers and landmarks are still solid.
- [ ] Nobody but the player goes indoors; a phone builds the same near cells as a PC (untested there).
- [ ] The floor is drawn at the house's highest ground; on a slope the feet are on the ground under it.

Then, in this order (the owner's): **section by section** with two critic rounds each: the wall and gates; the city by
district; the sewers; the castle by ward; the Keep by spire.

Known and not done in the block-out:
- Nothing above the ground is walked on: bridges, patio, steps and halls have no decks or doors (`collide: false`).
- The moat has no water; the drawbridge is a plank; no bridges over the Slough.
- Everything is in the game's old stones. The Phobos texture sets (chunk 2) are not wired in.
- **Weight.** The land's corners went from 0.92 to 1.36 million (a phone: 0.81 million with flat-lidded houses) and its
  colliders from 3,700 to 15,200, all built at load and all held on the GPU. Phobos wants a build of its own that
  comes and goes with distance, as the delves have, before detail is added. The guards in
  `tests/sites-lean.test.mjs` were raised to 1.5 million and 850,000. Frame rate and phone memory are unmeasured.
- `src/ui/firstsight.js` still flies the old, lower castle's path: to be redone at the very end.
- The layout bible's castle and Keep sections (PHOBOS-LAYOUT.md) give the old heights; layout.json has the new ones.

## Chunk 4: wall, moat, drawbridge, the city's bones — under way

- [~] Wall with guard towers, the moat, the giant drawbridge, the barbican. Done 2026-11-16 (branch phobos-hubs): water
  in the moat (`waters()` in src/core/phobos-build.js: a ring of quads 3.4 m over the ditch's middle, left out at the four
  causeways) and in the Slough canal (left out at the street bridges); a portcullis wound up into each gate's head, teeth
  showing; the Drawbridge Gate's bridge, a walked deck from the far bank to the gate over open water (the leaf near the
  gate lighter, two iron straps, chains up to the head; dressed-stone abutments and a pier; a post-and-rail fence down the
  fixed span that stops you). The moat had never been a ditch: two `Math.max(floor, PLAIN + ...)` lines in
  src/core/east.js eastHeight (the crag, the basin's head) held every floor at PLAIN and filled it back in; they now only
  lift where they have something to lift, and the Chasm's causeway stops at the moat's far bank. Still to do: the barbican's yard wall and winch-house, gate leaves, the
  drawbridge really lifting, causeway sides dressed in stone, water that moves.
- [ ] Street labyrinth generator (main streets, alleys, courtyards, roof-walks, short cuts).
- [ ] House kit: modular pieces, burnt / ruined / poor / rich, 2–4 storeys, enterable interiors, furniture.
- [ ] Streaming, instancing and culling so it runs; phone memory budget.

## Chunk 5: the city's people and hubs — under way

- [ ] Factions and foes (thieves, evil mages, necromancers, undead, Velscour's knights, generals, dukes, sergeants, wizards,
  sorcerers, liches), respawn timers.
- [x] The Pennyless' hideout, the Quiet Watch's hidden compound, the Ashwardens' hold (2026-11-16): src/core/phobos-hubs.js.
  Each a walled yard 30 x 24 m off a street, a gate with piers and a beam and lanterns, a two-storey hall at its back (a
  house of phobosHouses with a `hub` flag: never barred, upstairs like any other), and its own dressing (the Pennyless:
  the burnt chandlery out front, roofless; tables, crates, a cookfire, washing. The Watch: six open dye vats, cloth on
  poles, a rack. The Ashwardens: bones stacked in pale stone, ash heaps, a pyre, four braziers). No city house stands in
  a yard (the overlap grid is seeded with them). Their givers are POSTED people with `hub` (src/folk/people.js), at
  hubPost: Fennick Lowe (ph_penny), Captain Maud Treller (ph_watch), Edda Grail (ph_ash); bodies are recoloured
  townsfolk (tools/phobos/crowd_swaps.py). FOLK_MAX is 75 now.
- [x] Drip quests and the first hub quests (2026-11-16): 14 in src/folk/phobos-quests.js (words in
  src/folk/lines/phobos-hubs.js), levels 20-28 in src/ui/autobrain.js PLAN. Three from the land send you in: Hasket
  (smoke_in_the_east), Hale (quiet_men), Garrick (wardens_of_ash). Each hub gives four or three: kills at the city's six
  lairs, bread carried to the Rookeries and the Barbican, bone from the Bone Yards' north rows, a walk round three
  districts with something overheard in each (`heard` in a quest's words, toasted by src/folk/quests.js), the Castle
  Approach by night, and a word carried from hub to hub. New quest places: 'phobos' and 'ph:<district>' (src/folk/quests.js AREAS, placeSpot). Walked through
  in tests/phobos-quests.test.mjs. Not yet: the Watch found by invitation only (anyone can walk in now), the endgame arc,
  quest marks checked in the game, auto-play run through them.
- Critics on the hubs, the moat and drawbridge and the 14 quests: round 1 veteran 7 REJECT, young 6.5 REJECT; round 2
  veteran 8 APPROVE, young 7.5 APPROVE. Done after round 2: ragged chandlery tops with a soot band, ash drifts round the
  pyre, a higher bone heap, taller smoke and steam, no grass on the moat's lip, a hand-out line in each place for Loaves,
  the levels in chain order; the Throne Road's line now meets the drawbridge head-on (src/core/east.js WAY). Then: Lamps
  on the Rise pays a named staff, the Warden's Ember (RULES `named` + `seed`: the same staff for everyone, its name in
  items.js nameOf); the fire in tongues; the dye vats sunk in stone collars. (The Approach by Night already has its way
  shown: the quest trail leads to every 'ph:' place.) Leftovers: the moat's water darker, with a wet band on the banks
  and pier; the bone heap warmer (ivory); the Watch found by invitation only; quest marks and auto-play not yet run
  through the quests in the game.

### Textures asked of ChatGPT (2026-11-16)

100 more textures in five zips of twenty, `art/phobos/texture-requests/PH2_BATCH_01..05_*.zip`, built by
`tools/phobos/texture_requests/build_zips.py` from `request_list.py` (what, where, metres, palette, the game tile to
match, the prompt). Each zip carries README_FOR_CHATGPT.md, STYLE_GUIDE.md, REQUEST.json/.md, refs, shape guides and
three scripts ChatGPT runs itself (check_textures.py: seams, even light, brightness, mask rules; make_tileable.py: roll
by half and mask the band for a masked repaint; pack_return.py: RETURN_PH2_BATCH_<nn>.zip with CATALOG.json and a
contact sheet). The owner feeds them in (HOW_TO_USE.md). When they come back: through tools/phobos/textures
(seamless.py, grading into sets), then onto the city: iron, bone wall, copings and arch stones, Phobos's own roofs,
doors, windows lit at night, Velscour's liveries and banners, interiors, the castle's and Keep's walls, cliffs, and the
world-space grime layer (soot, damp, moss, rust, cracks) that chunk 2 asked for.
- [ ] Portals (seals) through the city.
- [ ] Drip quests from elsewhere in the world by level band; the endgame arc after all other quests.
- [ ] Auto-play taught all of it.

## Chunk 6: the Sewers — under way

- [x] Four sectors, built by hand rather than generated (src/core/delve-sewers.js), west to east under the city: the West
  Drains (level 30, the Spider Queen), the Slough Mains (38, the Great Worm), the Charnel Runs (45, the Drowned Abbot) and the
  High Conduits (53, the Lamplighter). Each has two mouths in the city's streets (its portal, and a second way that comes out
  in another street), and gates at each end into the next sector. They're solo (no party) and count as Phobos for the seals.
  New props: water channels with kerbs, a weir wheel, a spout.
- [x] Monsters: spiders, worms, drowned folk, wick-men, rats and slimes in packs, from the existing monster library and palette
  swaps. Four boss fights in src/sim/sewer-fights.js.
- [x] The keepers' office in the West Drains with Martleboro and Louis G; Princess Apricot in the Sunk Garden at the far end
  of the High Conduits. Nine quests (src/folk/phobos-quests.js, words in src/folk/lines/phobos-sewers.js): down_the_drains,
  two drain-cap gathering quests, a clear-out, letters to the princess across all four sectors, and one for each boss.
- [x] Drain Caps: a material that drops only from what dies down the sewers. Auto-play farms them in the sector the quest names.
- [ ] Outfalls to the moat/outside.
- [ ] Sewer seals that know which sector they're in (the seals count the mouths' squares only, for now).
- [ ] World bosses.
- [x] Critics: round 1 both REJECT 6.5 (boss halls on the routes, fights that didn't do what their calls said, a bare
  Sunk Garden, empty long runs, every gate the same). Fixed: bypass culverts round three boss halls (Silt Bypass, Gate Cut,
  Lamp Cut); scripted adds (brood to the cocoons, brothers to the Abbot, wick-men to the lamps), webs that hold, the
  Worm that really goes under; daylight shaft and caps in the Garden; dim-lit ambient; mid-run packs; gate lamps in the
  next sector's colour; named rewards; letters gated on the Worm, not the caps. Round 2: young APPROVE 8, veteran
  APPROVE 7.5, both on the condition that the letters and Abbot directions go by the street stairs, not through the
  level-53 Conduits (done).
- [ ] Critics' leftovers: a cocoon should burst when a brood-spider feeds the Queen; the Lamplighter's ring should start
  unlit and flare as each lamp is lit (now the candles burn from the start); something at the end of each spur tunnel
  (a lone elite, gold, caps); Apricot's first line assumes "all the way across"; the Garden's light reads as a flat disc,
  not a beam; log lamps lit / cocoons fed / brothers arrived per wave from tools/dungeon/fight.mjs (aim 1-2 per wave);
  in-game shots of the Worm, Abbot (black circles over his black pool) and Lamplighter fights.
- [ ] Untested: the sectors walked end to end by a human; the four fights fought at level by a human (the headless sim
  wins all four with a hired party); cap drop rates in play; the phone.

## Two improvement passes over the city and the castle (owner, 2026-11-16) — done, both critics approved

- [x] **Pass 1**: varied roofs and pitches, gables to the King's Mile, big shop windows, red liveries, string courses;
  windows dark glass by day ('slate:iron', pane to pane), amber from dusk ('eve:flame'), near black at night; indoor
  lights give way to street lamps; the castle gate's vault, portcullis, machicolations and braziers up a paved Approach;
  the tower kit (plinth, courses, corbels, slits, fire bowls); his fire blood red ('blood:flame') behind stone arcades;
  value steps city, castle ('soot:'), Keep ('char:', new, near black and matte); umber for ochre, no moss roofs, the
  lilac 'ph_dressed' slated; the Mages' spires halved and slated; bells made horns (V/T). Critics: veteran APPROVE 7/6.5,
  young APPROVE 7.5/7.
- [x] **Pass 2**: moving flames on braziers, fire bowls and the rookery beacon (the delves' flame, `fire()`, drawn near
  Phobos); braziers and the gate lit, the gate drums uplit (`prio` in the renderer's light sort); the Keep's window grid
  broken (blind bays, slit pairs, tall windows, balconies); `curtain()` relief on the castle's walls; the city wall's
  buttresses, foot course and slits in the near cells (`wallNear`); the wall stairs in the wall's basalt; shader
  weathering on Phobos's walls; jettied fronts and pent roofs on the Mile; lean-tos behind one house in five; the
  barracks' tan stone sooted. Critics: veteran APPROVE 7.5/7, young APPROVE 8/7.
- **Budget**: the land is at 1,594,437 corners of 1,600,000 (tests/sites-lean.test.mjs). **Everything from here goes in
  streamed cells** (phobosCell / castleNear) or Phobos's own build, from the first box. Near cells: 240 + 56 wall cells,
  29 ms a cell on average, 84 ms at worst on the PC in Node; a phone maybe 400 ms in its worker. Unmeasured on a phone.
- [ ] **Blocker on the first-sight pass** (the owner's rule: last): from the Sill the Drawbridge Gate hides the Keep and
  the basin's haze turns the city into a white smear.
- [ ] **Terraces**: the city's ten terraces are 44 m banks with houses and streets on them; they want stepping, with
  retaining walls and ramps or stairs where the streets cross, and ward floors paved. Ships with Phobos's streamed build,
  not freestanding walls. Still the city's biggest shape problem (young critic).
- [ ] Critics' leftovers: the mass by the castle gate (the wall's east stair) still a blank wedge, give it treads when the
  gate is carved; the Keep's body reads as slats at 300 m (a few deep dark arcades per step); the brazier bowl wants a
  thick rim and three legs; the castle's cones all one witch hat (vary them per wing); weathering unjudged at 20-60 m.

## Doors and towers (owner, 2026-11-16) — PR 216, both critics approved

The owner: "Make sure all the doors on all the houses open and close. Also make sure you can go in all the towers and
spires and they have decor and purpose!"

- [x] **Doors**: every roofed house and every free-standing tower has a real door, 9,593 in all (house `door` = its
  index in phobosHouses; towers 20000+). E opens and shuts (src/items/phobos-doors.js, the render thread's, as
  Bellmourn's doors are); the sim gets `phDoor`/`phDoors` and World.setPhobosDoor moves that door's collider out of the
  way. The shut leaf is drawn with its house in the near cell (doorLeaf in phobos-build.js, group `door:<id>`); opened,
  the near view folds that group away (PhobosNear.hideDoor) and the leaf is drawn swung on its hinge as a thing of its
  own (renderer.phLeaf, its own p2 texture). Iron doors on dressed stone, plank doors on the rest. Open doors go in the
  save. The `barred` houses are gone: every door opens.
- [x] **Every door walked**: a scratch test opens each one in the physics world and walks straight in and back: 9,592 of
  9,593 pass (door 3286: a 0.9 m post in the street grazes its path; you get in at a slant). Houses now keep the step
  before their door clear (phobosHouses: a door apron, so no house opens on to a neighbour's wall), and the sewer mouths
  keep a lane out the way they face (a row of houses stood 20 m before the Slough Mains and the Charnel Runs, and with
  the doors shut the portal test's start was shut in a house).
- [x] **Towers** (src/core/phobos-towers.js): 116 towers. The 65 free-standing ones (40 mage spires counting the
  Eye's two, the Ninefold Eye, gaol ×5, guard ×9 incl. the barbican and the Marshal's, counting houses ×4, ossuaries ×2, the gibbet,
  the sluice, the burnt minster, the hospice) have an iron door at the foot, a floor every 4.6 m up a stair round the
  inside of the wall, rooms furnished by kind and floor (study / stillroom / scrying pool; guardroom / bunks; cells;
  bone shelves; ledgers; cots; ...), a lamp and candles per floor, beamed ceilings (beams side by side, never crossed),
  and a chest on the top floor (79 tower chests, tier by kind, src/items/chests.js towerChests). The 51 wall towers are
  guard posts at the wall-walk's height (spears, brazier, barrels, bunk, crates, table), walked through by the walk;
  the corners have a stair between their two walk heights and a gallery out. Houses, the parade tower in the gaol and a
  gate tower in a corner drum that overlapped them were moved out (towerYards, the minster's nave kept clear).
- [x] **Tests**: tests/phobos-towers.test.mjs (ids, shut stops / open passes, every free tower climbed door to chest,
  wall towers walked, near cells sound). Suite 480, 479 pass, 1 skipped. Land 1,582,157 corners of 1,600,000 (towers'
  insides are all near-cell; the far keeps tower() as it was).
- [x] **Critics round 1**: veteran REJECT 5.5, young REJECT 6.5. Fixed: T shapes (the candle stand's flat dish on a pole
  → three prickets; the pedestal table → three splayed legs; the plank door's painted hinge plates, an upright plate
  with the strap out of it, cut off the painting: `leafU0`); the barbican's ground floor stood under the moat's water
  sheet (the "roofless" room): towers on the moat's bank now floor over it (`moatLevel`); rooms filled (two or three
  things to a long wall, liveries, bunks, strongboxes), guard and wall towers plastered inside, a candle ring on three
  chains hung in each room and the lamp lifted to light ceilings; bookcases given sides, top and plinth; the braziers'
  and cauldron's flames are the game's moving fires (far build only: `towerFires` furnishes the rooms again with
  nothing drawn); the towers' stairs are wedge steps (`spiral` o.wedge, o.thick) in the rooms' plaster; the chest on a
  dais with prickets and a light; doors swing to 93°; grey sills. Pictures art/phobos/east/doors_towers_progress.jpg
  (round 1) and doors_towers_r2.jpg.
- [x] **Critics round 2**: veteran REJECT 7, young REJECT 7.5, both on one rule break: seen from under it, the candle
  ring's far chain crossed its near rim, a cross in a ring. Fixed: the ring is gone; each room has one deep iron fire
  bowl, shut under, on a single chain, its flame the moving fire, its light a metre and more below it (hung close, the
  light lit the iron pale as a paper shade whatever way its faces looked); the wall towers have no hanging fixture,
  their fire on the floor (braziers on the walls and in the middle). A lit brazier by every free tower's door outside
  (`doorFire`; not where the moat is), so a tower that opens is known from the street. The tower's outer faces were
  wound the wrong way (ringFaces), so Kit.quad turned them round and their stone ran in diagonal smears; the battered
  foot's ends by a doorway were tris (a tri's painting runs by x + z: nothing along a face at 45°), now quads. Stairs:
  one sloped soffit under each flight (spiral o.wedge), drawn out to the wall (o.reach). The PH2 sooty plaster (stain
  bands a metre apart, a hard seam each) is off the guard, wall, sluice and hospice rooms: ph_grey_plaster. Beds on
  legs with a headboard; the cauldron rust, lit warm, no green light. Picture art/phobos/east/doors_towers_r3.jpg.
- [x] **Critics round 3: both APPROVE 8/10**, no rule break. Their leftovers, in their order:
  1. A corner tower's stair is near black, and its upper walls too. Light the stair's foot and its top landing (a
     brazier or a pricket at each).
  2. The fire bowl reads as a modern pendant shade: pale grey, a white puck under it. It wants near-black rough iron,
     a rolled lip, and a dark knob or short spike under it.
  3. The cauldron still reads beige, not rusted iron.
  4. Rooms' middles are bare, the corner tower's and the hospice's most: a weapon rack, a table with stools, a table of
     basins.
  5. The bookcases are flat cases against round walls: give them depth.
  6. The scrying pool's water is a matte disc.
- [ ] **Not done**: nobody lives in the towers yet (no keepers or monsters inside); the Castle's and the Keep's towers
  wait for their wards' chunks; doors elsewhere in the world (Bellmourn's own, the lands' places) are as they were.
  E on a door loses to a party hero or a person standing next to you (takeNearest's order). Light through a doorway to
  outside blows out. Door 3286 is grazed by a street post. The street braziers unseen at night; the doors' swing and
  sound and the moving flames unjudged (stills only); the phone unmeasured.

## The city's once-over (owner, 2026-11-17) — under way

The owner: "do a once over of the entire city adding detail, fixing things, making sure there's enough room to walk up
stairs in the houses, make sure the clipping plane is correct, fixing the water, etc. then start working on the Castle.
It really needs work."

- [x] **The water.** The moat's and the Slough's sheets followed the ground: the moat's climbed 130 m up the crag and
  the Slough's ran over a 20 m rise. Each is now level reaches with a weir of dark stone at every step (`reaches`,
  `weir`, `waters` in src/core/phobos-build.js); the moat is dry where no ditch holds water (the crag's side, about a
  third of the ring is wet: the west, and up the north and south as far as there's a ditch). The Slough's ditch is cut
  from the lower of its two banks (src/core/east.js), so it holds water end to end; none under the streets' causeways.
- [x] **House stairs**: 1.25 m wide (0.95), treads 0.36 deep (0.27), a landing of 1.1 m at the head; all 9,348 keep
  their upstairs.
- [x] **The camera indoors**: the third-person camera is kept low and close inside Phobos's houses and towers
  (`World.indoors`), as in Bellmourn's: it lifted through their ceilings and upper floors.
- [ ] **The clipping plane**: the near plane is 0.08 m and the far is infinite (src/core/math.js); nothing wrong found
  there. If the owner means something else (things cut off at a distance, near cells popping at 150 m, the camera in
  walls somewhere), it wants a word from him or a picture.
- [x] **The Slough from near** (`sloughNear` in src/core/phobos-build.js, streamed cells): quay walls on both banks with
  a pale coping and a slime line, a flagged towpath, mooring posts, stepped landings with laden barges (gunwales, a
  tiller, a green lantern), outfalls, casks and crates, scum on the water; weirs with a dressed crest, wing walls and a
  falling sheet; and **two plank footbridges** on stone piers where no street crosses (far build, walked).
  Critics: round 1 REJECT 5 and 4 (`art/phobos/east/city_r1.jpg`); round 2 REJECT 6 and 6 (`city_r2.jpg`); **round 3
  veteran REJECT 6.5, young APPROVE 7** (`city_r3.jpg`), no rule break. Not passed by both. Leftovers: the weir still
  doesn't read from downstream (a white-water face, a churn apron, a visible lip); scum darker, ragged, against the
  walls and hulls (darkened after the round, unjudged); the gravel berm between street and canal (setts or a stepped
  revetment); the quay wall one dark tile (buttresses, drain mouths, ladders); the footbridges want a paler deck and a
  lamp at each end; the east bank's blank shells (lit windows, a hoist, a warehouse door); nobody on the water; the
  water a flat mirror (a moving normal map, darker under bridges and along walls: a shader job).
- [ ] **Detail elsewhere**: not begun. Seen in pictures: far houses are plain boxes beside the near ones; the basin's cliffs are
  streaked; bare ground between houses and the Slough's banks (a quay wall, mooring posts, steps down); weirs want a
  sluice or a footbridge; the dry moat round the crag wants a bed of stones or stakes.
- [x] **Every drum and cone lit from the right side** (src/core/sites.js Kit.drum): its sides were wound against their
  normals, so the shader turned each normal round and every round tower, cone, column and barrel in the game was lit
  from its far side. This is what "sunlit drums go silver" was, and why towers never matched walls. (The Keep's `char:`
  and the notes about tints on round things were workarounds for it: they can be looked at again.)
- [ ] **The castle on the land** — under way (`castleNear` in src/core/phobos-build.js, the crag's streamed cells; shots
  `node tools/phobos/city_shots.mjs castle_gate castle_yard castle_mark castle_yard_n city_castle`, HOUR=16 for west light):
  - Done: the crag kept clear of the wilds' rocks and tufts (src/core/rocks.js); the Lower Ward's yard flagged, a kerbed
    way from the gate to **his mark** (a 6.4 m ring of black iron before a round of his red on a three-step plinth, two
    horns of fire; far build, it stops you); fire bowls in pairs, close by the gate and wider toward the mark, their
    flames the far build's; red pennants on poles (the arm from the pole's head: no cross); a well, a stable, racks,
    stores, carts; a door, steps and fires to each Lower Ward hall; a low wall and two guard posts across the yard; the
    castle's door lit; murder holes and chains in the gate's vault, no beam across its bars; the rim's bridges humped
    and at two heights; towers in the walls' stone.
  - Critics: round 1 both REJECT 4 (`castle_r1.jpg`); round 2 both REJECT 6 (`castle_r2.jpg`); **round 3: veteran
    APPROVE 7, young REJECT 6** (`castle_r3.jpg`), no rule break. Not passed by both. Added for rounds 2 and 3: a neck of
    two crenellated walls out of the gate, a crenellated wall and two guard posts across the yard, fewer bowls, a drill
    ground, porches on the hall doors, the curtain's plinth, string course and loops from near, the ring in black glass.
    After round 3, unjudged: the pennants moved against the cross-wall, the way a step lighter.
  - Leftovers: (1) white stair-stepped slabs either side of the Approach in every picture (the ground there, or its
    parapets: find which); (2) the gate passage still has no moment: teeth overhead, chains seen against the lit mouth,
    a glow from above; (3) each half of the yard wants one hero thing three metres and more with its own warm light (a
    drill frame with straw targets, a loaded wagon under a canopy); fewer, bigger clusters of stores against the walls;
    (4) porches with a bigger warm pool and steps, to pull from across the yard; (5) the outer curtain half a stop off
    the towers; (6) to check close: the arrow loops are plain slits; the Keep's pale window grid away from warm light.
  - Not begun: the Middle Ward's and the High Ward's ground on the land, the ramp, anything past the yard's cross-wall.
- Pictures: `node tools/phobos/city_shots.mjs [names]` (give it WAIT=30000: on a software GPU the ground comes late and
  shows white till it does).

## Chunk 7: the city's six dungeons — not started

The Cistern Maze, the Undercroft, the Tower of the Ninefold Eye, Ironmercy Gaol, the Rotting Hospice, the Gilded Vault
(drafts). Each with raid-style boss mechanics.

## Chunk 8: Castle Velscour — under way

The castle is carved as three wards, each a delve of its own (src/core/delve-castle.js), in the sewers' row past the
world's north edge, east of them. Gone in alone (party: false), as the sewers are.

- [x] **The Lower Ward** (`lowerward`, level 58, 19 rooms): the Gate Passage, the Captain's Yard, the West and East Ranges,
  the Kitchens and Cellars, the Drill Floor and Bunk Rooms, the Armoury Stair, the Armoury, the Coal Way and the Forge,
  the Pit Stair and the Oubliettes, the Aqueduct and its Head, the Servants' Hall and the servants' ways behind six
  wings, the Middle Ward Stair and the shut Middle Ward Gate. 14 packs and two patrols on the servants' ways.
  - Ways in: the world portal against the north drum's yard face (10805, 22), and the Aqueduct Head's gate down to the
    Aqueduct Foot off the Sunk Garden in the High Conduits (both ways linked).
  - The Gate Captain (level 66 by his quest) in the yard (src/sim/castle-fights.js): cleave, charge, shield bash, the
    gate's teeth dropped from three roof slots right across the yard, crossbow volleys; two garrison waves whose
    shields cover him (he takes a third) while any stand. Each wing you empty first leaves him less: the Bunk Rooms,
    fewer garrison; the Armoury, no volleys; the Oubliettes (their Gaoler keeps the gate's winch), no gate.
  - Princess Apricot's two quests: Up the Aqueduct (58) and The Gate Captain (66), with her lines.
  - New props for it (src/core/delve-build.js): a great hearth (hood, corbels, ember bed), a casting pit, a stone-ringed
    pit, his mark (an iron ring with two red flame horns; no letter), a wall-walk with merlons; racks take a height
    and a count; a seat can face south; a lintel can be dressed stone.
  - Not done: chests in the wings (the chest list is fixed for saves: room chests need a new kind of chest kept by
    place); a cold or blue light per room (the engine has none).
- [x] **The Middle Ward** (`middleward`, level 75, 12 rooms; 2026-11-17): the Middle Gate, the Middle Court (a wall-walk on
  two sides, a dead tree in a planter), the Screens Passage and the Great Hall (two long tables and their benches, the
  high table on its dais, his chair and mark, two great hearths, the hunt in tapestry), the Portrait Gallery (his house's
  faces in two rows, a painting that's a door: a way on no map to the Alchemists' Wing), the Map Room (the map table,
  cases, charts with no letters), the Horn Galleries (great horns on brackets at two heights, a wall-walk), the Ancient
  Library (book-spine walls to its 16 m roof, bays of bookcases, reading tables, lecterns, hung chandeliers), the Long
  Stacks, the Librarian's Rooms, the Alchemists' Wing (jar-shelf walls, two stills, a working circle), the Conservatory
  (glass over it, dead trees in planters, roots, a black basin). 8 packs and a patrol on the Horn Walk; liveries as the
  layout bible says (Abyssal for royal blue, Mossback for forest green, his red, the Hall mixed red and white).
  - **Gone into only from the Lower Ward** (`within: 'lowerward'`): no arch of its own on the land (the land's budget),
    its portal the Lower Ward's (the castle gate), where its Postern and the Hall's north door let you out. The Lower
    Ward's Middle Ward Gate is an arch up to it, **shut till the Gate Captain has died**, now or ever (a link's `shut`;
    the render thread's quests tell the sim every boss that's ever died, `bossesDown`; the arch is dark till then).
  - **The Feast That Walks** (88, src/sim/castle-fights.js): his servers bring courses through the doors by the screens,
    and each that reaches him feeds him (life back, harder blows); he heaves the long tables down their rows (the aisle
    is clear) or sweeps the aisle (the benches are clear); his maw, his belly, the plate, the bile. Headless: a hired
    party wins in about three minutes; `--slow` wins at 7%; `--still` dies.
  - **The keyed doors, shut for now**: the Clock Tower's (end of the Horn Galleries; the Gallery of a Thousand Portraits'
    key), the Menagerie's (the Conservatory's far wall; the Iron Barracks' key), the Sanctuaries Stair (the Long Stacks'
    far wall; the Drowned Archive's key, up to the High Ward). Plain portcullises (bars from a beam, none across), his
    mark over each. They open with chunk 9's dungeons.
  - New props: bookcase (book-spine faces, a frame), bench, horn, alembic, map table, dead tree in a planter; a portcullis
    can be plain, a portrait hung higher, a seat face any way, and a chandelier can light the floor as a hung fire (`hang`).
- [x] **The Librarian's household** in his rooms off the Library (src/folk/people.js, delve 'middleward'): Master Aldric
  Pell, the Librarian; Wynn Pell, his ward, the map-maker; Ondine, once a sister of his Sanctuaries; Jory Tallis, once
  quartermaster of the Armoury; Pip Carrow, the horn-blower. All loyal to Tessariel and showing nothing of it: recoloured
  townsfolk bodies (tools/phobos/crowd_swaps.py: ink-black, umber, ash-grey, buff, his red), no name of hers, no oath,
  no bells. Loaded late, as the crowd is (`late`), so a phone carries them only once it's on its way to Phobos. FOLK_MAX 84.
- [x] **Seven quests** (src/folk/phobos-quests.js, words in src/folk/lines/phobos-castle.js): A Letter Down the
  Aqueduct (Apricot, 75), The Household (75), Dust in the Stacks (76), Wynn's Map (78, walk four wings), The Quiet
  Watch's Steel (80, the Armoury and Forge, then the dye works), The Hornwings (82), The Feast That Walks (88). Quest
  places can now be a delve's room (`room:<id>`).
- [x] **Auto-play** goes up to the Middle Ward through the Lower Ward's gate (`delveWay`), walks it (WAYS: the Feast last),
  and now talks to anyone standing down a delve (`delveTalk`): the sewer-keepers, the princess and the household, by
  the delve's portal or the gates between delves. (Before this it couldn't reach the people down the sewers at all.)
- [x] **Critics, round 1** (2026-11-17, `art/phobos/east/middleward_r1.jpg`): veteran REJECT 5.5, young REJECT 5.5. Both:
  the spear racks' rails crossed the shafts (crosses), the chandeliers' four chains (a cross in a ring from below), the
  stills read as bells; no royal blue or forest green but on the monsters; the Court, Hall, Library and Gallery dark or
  blank; portraits empty; the book spines a grille; the Hall's tables lost in the floor and its hearths' ember beds read
  as lava; the oculus and the Conservatory's glass missing. Fixed: racks have no rails anywhere (a backboard and a
  trough, the Lower Ward's too), chandeliers hang on three chains everywhere, the still is a brick furnace with a pot and
  a swan neck; `royal` and `forest` tints (src/gfx/materials.js) for blue brocade, runners, hangings and table cloths in
  the Gallery, Map Room, Library and Stacks, green hangings and glass in the Alchemists' Wing and Conservatory; painted
  sitters in dark iron frames, three sizes, two rows, the secret door bigger, ajar, its swing scored in the boards;
  spines at twice the size with shelf lips; cloths and plates on the Hall's tables, his red runner down the safe aisle, the
  dais lit; hearths without the ember bed; the oculus and the glass as cold daylight (daylight props now give a light of
  their own); the castle carved on the map table; jar shelves of green glass; horns smaller and strapped to a plate.
  And the Plague Knights' cross on the floor (src/sim/moves.js, everywhere they stand: the Lower Ward's gate wardens, the
  High Conduits' wardens, the Alchemists' Wing) is a ring now: three arms still read as a cross where two overlapped.
- [ ] **Critics, round 2** (`art/phobos/east/middleward_r2.jpg`): veteran REJECT 6.5, young REJECT 6. Still to fix, for
  round 3 (with the owner's castle pass): the still still reads as a hand-bell (make it a squat pot, wider than tall, a
  long level swan neck into a coil); the oculus and the glass roof's glazing bars meet at a centre (parallel ribs, or
  an odd number of spokes stopped at a hub ring) and light nothing (a real shaft and a pool on the floor); the portraits'
  frames read pale beside the blue (blacken them) and the brocade reads purple (truer blue); the sitters are blocks
  (a head-and-shoulders of five or six pieces, varied); liveries don't survive a thumbnail outside the Gallery (big lit
  hangings, table and bench cloths, a sconce on each); the Court is still dark and the tree lost in it; the Hall's
  table cloths read as a painted road line (a deep cloth with a border, candle clusters, the dais rim-lit); the Stacks'
  spines still a grille (runs of varied height and colour, gaps, leaning books); monsters' line telegraphs that meet at a
  right angle read as crosses (Inkshades' threads); the portal's cyan beside flame in the Court's shot.
- [x] **Critics, round 3** (`art/phobos/east/middleward_r3.jpg`): **both REJECT, 6.5 each. Not passed.** No rule break
  confirmed. Landed: the Gallery's royal blue and dark frames, the Map Room's blue rug and hangings, the still no longer
  a bell. Their leftovers (the first two made after the round, unjudged: cloths the tables' full width in his dark
  red, a pale round under the oculus and by the Conservatory's basin):
  1. The Hall's table cloths read as a road's centre line; light the dais as the room's focus.
  2. The oculus and the Conservatory's glass light nothing: a cool pool and a faint shaft under each.
  3. The Court is a black void and its tree lost: moonlight, a rim on the tree, a readable sky.
  4. Green livery too dark in the Alchemists' Wing; a sconce on each hanging; the still wants its coil and green glass seen.
  5. The Library, the Stacks and the Alchemists' Wing are alike at a glance: one lit hero prop each.
  6. Sitters still flat blocks: a shoulder silhouette, a dark ground, a vignette.
  7. To check close: the Conservatory's glazing against the tree's limbs (spokes), a chequered hanging by the blue in
     the Court, the Map Room's rug under the table from above.
- [ ] **Not done in the Middle Ward**: the Clock Tower and the Menagerie wings themselves (chunk 9, with their keys);
  the Librarian's deception magic; the horns sounded to change the patrols; Wynn's two other painted doors; a word when
  you walk up to a shut keyed door; the Great Hall as a rest point once the Feast is dead (it respawns with the ward).
- [ ] **The High Ward** (+115 m, 95–112): the Sanctuaries, the Ossuary Chapel, the Generals' Crypt, the Hall of Mirrors,
  the Treasury, the Observatory, the Throne Antechambers; the Sexton of the High Ward (105). Its two ways in are both
  keyed (the Sanctuaries Stair, the Drowned Archive's key; the Crypt door from the Oubliettes, the Alchemists'
  Undercroft's), so it waits for chunk 9's first dungeons, or a third way in for now (the owner's call).
- [ ] Dozens more castle quests.

- [x] **The city and the castle, twice over (2026-11-19), branch `claude/sharp-cori-de0kwb`.** Two passes, the critics
  three rounds each; **both approved pass 2** (pass 1: the veteran approved, the young one held out on the Keep and the
  Slough, which pass 2 took up). Shots: `node tools/phobos/city_shots.mjs` (new street-level `p2_*`, `castle_up_*`;
  `EVAL=<js>` logs a value off the page, `CONSOLE=1` the console's errors and shader messages).
  - The Approach a walled causeway from `APPROACH_WALL` (src/core/east.js): its sides sheer, buttressed retaining walls
    and a parapet, rubble down the banks below. The gate passage lit: fire baskets down both walls, the lanterns stronger.
  - The Keep's bridges (`bridge()`, phobos-build.js) drawn as faces along their fall and arch, not stepped boxes; piers
    only where they come down on the rock (one hung in the air under a deck was a T from the yard). Its fins half as deep.
  - Curtains buttressed in their own stone (pale, they were seams) with a corbelled shelf under the merlons. Towers'
    bands half a step up from soot (`dark:`), no longer blue rings.
  - Life: chimney smoke from the near houses (`smokes`, src/gfx/phobos-near.js), crows over the Keep's crown, the yard,
    the Bone Yards and the gibbet (particle kind 12), ash falling round you in the Cinder quarter (kind 13). Neither
    shows in the stills: the software renderer gets a frame every ten seconds or so.
  - The Slough 'mire:water' in the ground shader: murky green-brown, dull, a slow drift; its scum dark round blots.
  - Window glass: `slate:iron` and `eve:flame` by day darker and duller. (Flat layers like iron take no tint:
    `char:iron` is bare iron, a mirror, and was paler.)
  - Kerbs `char:stone`; crates, barrels and sacks in the city's box sooted (src/core/places.js `inPhobos`); awnings
    hessian; lamp posts dark wood; street lamps first for the frame's twelve lights (`prio: 8`).
  - The castle crag's ground near half as dark in the terrain shader (src/gfx/materials.js, CRAG from east.js).
  - **Left open:** the crag's sheer faces stretch the ground texture into streaks, a white zig-zag on their tops (the
    terrain shader's, the whole land's, so not touched); the Keep's faces show a grid of dark bays in the afternoon
    sun (shadows off the fins and cornices: gone by morning); some slabs that stand up out of the High Loop's walks near
    (10480, -250), not traced; the King's Mile's roadway dark at dusk (its lamps on the walks); sacks still cones; the
    castle yard wants a reason to cross it (a cart, people at work); boats on the quay low on detail. Corners: PC
    1,595,937 of 1,600,000, phone 899,228 of 950,000, so anything more on the land wants something taken off first.

## Chunk 9: the castle's eight dungeons and the idol — not started

The Drowned Archive, the Iron Barracks, the Gallery of a Thousand Portraits, the Clockworks, the Alchemists' Undercroft, the
Menagerie of Chains, the Ossuary Chapel, the Hall of Mirrors (drafts). Boss keys; idol materials (each run at least 5
times); crafting the sacrificial idol with the Librarian.

## Chunk 10: Velscour's Keep — not started

- [ ] Thick towers floor by floor, bridges, balconies, outside stairs; boss fights on bridges, balconies and stairs.
- [ ] Five keep dungeons (each run at least 5 times), materials and section unlocks.

## Chunk 11: world bosses — not started

Respawning, slow to kill, not too hard, better gear chance, quest targets; in important spots in all four parts.

## Chunk 12: Velscour — not started

- [ ] The final dungeon, the Throne Above.
- [ ] Rig the human form (`F:\!    BM V2\DEMON LORD VELSCOUR - HUMAN FORM.glb`) and the demon form
  (`F:\!    BM V2\DEMON LORD VELSCOUR - DEMON MODE.glb`), the demon's wings above all; a bank of new fight clips.
- [ ] The human (mage/paladin) fight, several phases; the burning; the demon fight, harder, more phases. Research from
  `work/bm-dragons/docs/ELDER-DRAGONS.md`; framework `src/sim/delve-fights.js`.

## Chunk 13: the ending — not started

The balcony cinematic, the shaking castle, the beam of light, waking in Bellmourn with Lisandra, Hard and Mythic unlocked.

## Chunk 14: Hard and Mythic, and run records — not started

Every dungeon in the game, level 200; top 10 times per dungeon per mode, with average DPS and gear score.

## Chunk 15: Pinnacle levels — not started

XP past 200 gives Pinnacle Points and Levels; the Pinnacle menu and its nodes (see PHOBOS.md).

## Chunk 16: velscourtactics imports — not started

Models, monsters, textures, houses, furniture, terrain, trees; Blender MCP passes for clips, polygons and texture
resolution; tell the owner which aren't good enough.

## Did not pass the critics

The Lower Ward (2026-11-16): young APPROVE 8/10 at round 2; veteran 5, 6.5, then REJECT 7/10 at round 3 ("close, the
three fixes are small"). His three round-3 fixes were made after it and checked in shots, not judged again: the
oubliette pits a kerb of 22 touching blocks round black water; the Aqueduct Head's spout in dark water, not a white sheet;
the Captain's mark on the front of his chair, disc, ring and horns as one (and the chair moved east, off the way out).
Leftovers, the young critic's, not blocking:
- A call when each key wing is cleared ("The bunks are empty: fewer will come down to the Captain"), before the fight.
- The three portcullises really drop to the floor when the gate move goes off, and wind back up.
- A few EMPTY HARNESS crossbowmen on the yard's wall-walk, gone once the Armoury is cleared.
- (The "four-footed lamp stand" the young critic saw in the Kitchens is the spit seen end on: five stones and two posts.)
Sheets: art/phobos/east/lowerward_r1.jpg, _r2.jpg, _r3.jpg.

Chunk 0, after round 3 (2026-11-15), both critics' remaining notes:
- **Apricot, beside the nostril:** two or three dark triangle specks that read as torn mesh; paint them out and paint a
  soft dark nostril. A dark notch at the mouth corner.
- **Apricot, choker:** a white chalk smear ("a scar or neck brace"); paint separate pearls with shadow gaps, or one
  clean band.
- **Apricot, chest and skirt:** a dark smudge at the cleavage in every body shot; dark triangles in the skirt ruffles
  on the run; the skirt slit opens to the hip when she runs (weight it more to the pelvis).
- **Apricot, hair:** a pale chip in the fringe; the undercut's edge is a jagged stair-step (the undercut itself is the
  owner's design); arm ribbons and lace cuffs from the picture are bunched or stretch into a sheet on a raised arm.
- **Apricot, face (judged on the stale texture):** brows, lips, blush and freckles "too timid", catchlights too
  small past 2 m. Recheck on the real round-3 texture before repainting.
- **Martleboro:** eye whites and catchlight one step brighter; torn hood fragments by the ear at three-quarter view;
  pointed glove fingertips.
- **Louis G:** the forehead lock is a flat hard-edged triangle; the jaw-to-hood edge is ragged; a few shards at his
  right glove's fingertips on the run.
- **Not judged by anyone:** motion between frames, the game's lighting, the sit clip (the frame shown was not
  seated), talking mouths, Apricot's back under the hair.

Chunk 1 (the layout), left open after both critics approved round 3 (2026-11-15):
- **Reward cadence**: about 20 held rewards over 162 levels; set a floor of one per three levels and define each.
- **Castle and Keep plans to scale** before blockout; `castle.png` and `keep.png` are diagrams.
- **The other eighteen dungeons' clear tables**: only the Iron Barracks and the Ember Spire are written out.
- **Unjudged**: whether the Keep at 5.5 degrees from the Sill reads as awe; whether clears 2 to 5 feel different in
  play; phone cost of a 215 m Keep in view from everywhere; all names.

Chunk 3 (the east), left open after both critics approved round 2 (2026-11-15):
- **The crag is too low**: a "pancake" a quarter of the cliffs' height. Both want it at least 2.5 times taller, or the
  floor dropped round it, with unequal tiers, before chunk 4. Its heights (+70, +90, +115 m) are the layout bible's, so
  this is the owner's call (see "Waiting on the owner").
- **Cliffs**: stretched, pleated texture (the ground shader needs triplanar rock: chunk 4); spikes along the rim; the
  talus apron does not read. Ledges in the Chasm read as contour bands from above: vary their heights along the run.
- **Fog** whites out the basin floor from the Sill (the game has one fog for everywhere): a local thinning is needed.
- **The Broken Span** still does not read as a bridge: arch springers reaching toward each other against the sky, and
  angular, tilted blocks instead of rounded ones. **The Notch gate**: square towers bonded into the cliffs, an arch and
  portcullis between. **Gatewatch**: darker stone, its gatehouse astride the road. **Causeway braziers** are specks.
- **Mood**: the Marches still read as a sunny starter zone (one weather, one sky); the massif and the Marches' ground
  are one noise; the ridge's west face is a straight line.
- **Unjudged by anyone**: the scene in motion, sound, the Chasm's rhythm on foot, the garrisons and both bosses, frame
  rate, phones.

Chunk 2 (textures), left open after both critics approved round 3 (2026-11-15):
- **Placeholders**: iron (reads as dark stucco), rust iron (cracked mud), the Ossuary's wall (river cobbles). Real
  ones to be painted; nothing larger than a prop until then.
- **Reuse and repeats**: gravel in five sets, flagstones and plinth in four; the burnt wall's lump and the market
  wall's zigzag; per-district dirt and scattered tiling in chunk 4.
- **Unjudged**: the detail maps, anything lit or at distance, phones, scale against a door.

The PH2 pack, left open after both critics passed round 3 (2026-11-16):
- **A pale bar by the gate's right tower** (seen from the gate, camAt 10650,150,0 to 10760,205,0): a raycast says it's
  a Keep bridge's parapet (11057, 338, 181), drawn `dark:p2_bridge_ashlar`, yet in the game it still shows pale,
  crenellated, across the Keep's black face, a little like a cross. Soot, char and dark all left it the same: find
  what really draws it (a far draw? its shading?) before tinting anything else. The V/T rule.
- **Distance**: the castle reads flat a long way off (no grime or AO layer yet); the towers' cones plain grey far off;
  the Keep's crown has a lit band with a beam in front of it.
- **The Mile**: a pale patch and strips on the road props; the kerbs' ends; the districts not told apart by their
  stone.
- **Up close**: the granite's "fur" only checked at mid range; the Lower Ward not reshot since the banner.
- **Unused**: the soft masks (wired, nothing asks for them); leaded_glass, leaded_lit, wrought_bars and railing_mask
  (crossbars, the V/T rule), door_rich (a cross), banner_blood and war_banner (a crown of thorns on the skull).

## Untested

- The two passes: never played by a human; the phone (Low tier, lean build) never run on a real phone: on this PC the
  Mobile tier's GPU time is 1.3-2.1 ms, Ultra's 3.6-4.8 ms, both at the 144 fps cap. Near cells popping in on the Mile
  when running or surfing. The moving flames and the gate's uplights from a long way off; the weathering up close.
- The Lower Ward: never played by a human, by hand or by auto-play end to end; the Gate Captain seen fighting (his calls,
  volleys, the gate's teeth) but never killed; the weakening for emptied wings never seen in a fight; the two patrols
  never seen walking; the phone never run in it.
