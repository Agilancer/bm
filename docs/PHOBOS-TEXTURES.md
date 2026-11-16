# City State Phobos : Castle Velscour — textures (chunk 2)

What the zone is built from, how the sources were made to repeat, and which tile plays which part where. Status is in
[PHOBOS-TODO.md](PHOBOS-TODO.md); the plan is [PHOBOS.md](PHOBOS.md).

## The sources

`assets/citystatephobos/`: **126 photographs** from the owner (stone walls, brick, rubble, paving, plaster, gravel;
1,637 to 2,576 px) and **100 generated tiles** in five batches (1,254 px: castle and city masonry, interior walls,
panelling, damask, rugs). None repeats cleanly as it is: the photographs were never meant to, and the generated
batches' own notes say their edges do not meet.

## Making them repeat (`tools/phobos/textures/seamless.py`)

A cross-fade of the edges ghosts every stone it crosses. Instead, for each source:

1. **Light is evened**: the broad light and dark across the picture is divided out, or the repeat shows as a grid of
   light patches down a long wall.
2. **A span that repeats is found**: for many widths, the strip just past the window's right edge is compared with
   the strip at its left; where they agree best the courses and joints line up. The same for the height. The tile is
   the picture cropped to that span, so each has its own aspect.
3. **The ends are joined along a cut, not a fade**: the cheapest path down the overlap, which runs along joints and
   through stone where the two strips already agree, with two pixels of feather.
4. **Standout patches are calmed**: colour's drift at an eighth of the width is pulled toward the tile's mean (an odd
   orange stone, a pale stain: what the eye catches on the third repeat).
5. **It is measured**: `seam` is how much sharper the picture changes across the wrap than inside it (1.0 is no
   different; over about 1.6 is worth a look) and `patch` how uneven it still is at a quarter of its width.

`python tools/phobos/textures/process_all.py` runs all 226 (50 seconds) into `tools/phobos/textures/catalog.json` and
twelve contact sheets, `art/phobos/textures/sheet_01.jpg` to `sheet_12.jpg`, each tile laid 3 by 3 with its scores
(measured at 512; the sets' tiles are measured again at full size, and the build fails on any over 1.6).

## The sets (`tools/phobos/textures/sets.json`, revision 4)

Ten sets, 52 tiles. Each tile is a source laid a stated number of metres across, `course` (coursed stone, brick,
planks, big-stone rubble: plain repeat only) or `random` (plaster, gravel, cloth, iron: the shader may scatter
repeats), of a class (stone, brick, plaster, wood, cloth, wet, metal), and **graded**: brought to one mean brightness
(of the sRGB picture), its colour thinned and tinted, and its own light and dark kept or flattened.
`python tools/phobos/textures/build_sets.py` builds them into `assets/game/phobos/tex/` (`<tile>_c.webp` colour
1,024, `<tile>_d.webp` normal, roughness and height 512, `manifest.json`; 20 MB), **fails** if a used tile's seam is
over 1.6 or its brightness under 0.10, and draws:

- `art/phobos/textures/set_<name>.jpg`: every part of a set as a wall 8 m by 5 m with a 1.8 m figure;
- `sets_overview.jpg`: each set's main wall;
- `ramp.jpg`: the main walls in the order the player climbs, with their brightness and accent.

**Districts are told apart by hue and stone size, not brightness** (round 2 made six of them the same grey). Every
value sits between 0.10 and 0.36:

| Set | Where | Main wall | Accent | Brightness | Parts |
|---|---|---|---|---|---|
| marches | the Marches' keeps and towers | granite, graded pale | weathered lichen grey | 0.30 | 6 |
| wall | the city wall, the Barbican, the forts | bastion basalt | blue-black; bone joints on the upper courses | 0.16 | 5 |
| city_poor | the Rookeries, the Tanners' Steps, the Wharf | smoky brick | tannery ochre daub | 0.27 | 5 |
| city_burnt | the Cinder Quarter | sooted rough blocks | ash grey: ash in the brick's joints and the timber's grooves, an ash street | 0.14 | 5 |
| city_market | Chainmarket, the Barracks Ward, the King's Mile | small warm brown-grey blocks | clay-brick red | 0.27 | 7 |
| city_bones | the Bone Yards, the Ossuary | bone-grey ashlar | ivory | 0.36 | 4 |
| city_rich | the Mages' Rise, Dukes' Row, the Approach | the largest, tightest ashlar, cold violet-grey | wine damask | 0.25 | 8 |
| sewers | the four sectors | wet mossy undercroft blocks | rust on green-black; slime | 0.17 | 7 |
| castle | the three wards | curtain granite | cold steel-blue | 0.21 | 10 |
| keep | the Keep on top of the castle | bastion basalt, oxblood-black | **ivory joints**; plum cloth | 0.16 | 7 |

**The Keep's signature** is its joints: the basalt's joints, cracks and pits are painted bone (the `joints` field: a
mask of what is darker than its surroundings at joint width, filled after grading). The city wall's upper courses
carry a fainter version, so the bone grows up the zone and covers the Keep.

**Variants made from one source.** Soot, char, ash and slime are grades, not new pictures: sooted brick and charred
timber are the clay brick and oak boards graded dark with their contrast raised and pale ash painted into their
joints and grooves; slime is the mossy floor pushed green and wet. Iron is the dark smooth stone graded cold; rust
iron is the rust rock at half its colour, laid scattered, for grates and chains only, never a wall; the Ossuary's
wall is river cobbles graded ivory (stacked bone-ends at a distance: a true bone wall is modelling, chunk 4).

**Odd stones** (`despot` in `seamless.py`): on photographs with a white patch, a teal brick, a weed or a black hole,
patches at stone size whose colour stands more than about two standard deviations from the tile's own are pulled back
toward its mean, so no stone is found by the eye on every repeat.

**The detail maps** are read off the colour after a high-pass, the right way up for the mortar (pale mortar is still
low), with relief and roughness set by class, not by how bright the picture is: wet stone is glossy, cloth has almost
no relief, wood a little.

**Taken out after the critics' first two rounds**: the crazy-paving slate (p047), the green damask, the flat plum
fill, the terrazzo-like speckled ground (p087), the photographs with a shape that repeats (p024, p107, p095, p020),
and, from round 1, every tile that read as patio, bathroom or sunny stock (p105, p122,
p119, p113, p086, p115, p053, the custard and beige plasters), the blue stone with orange lichen (p052: blue with
gold in effect), the photographs with hard baked sun (p124, p096, p038, p045, p046, p044), the ones with a signature
stone that would not calm (p010, p101, p056, p110, p008, p021, p011), and the striped timber-and-plaster wallpapers.

**Already in the game and reused** (`assets/game/tex`): roofs, doors, timber, earth and mud, the road surfaces.
**Still missing altogether**, for chunk 4 (no Meshy; painted, or built from these): iron and rust for grates, chains
and bars; a bone wall for the Ossuary; copings and arch stones; and soot, damp, moss and blood as a world-space layer
over any wall.

## What chunk 4 must do with them

- **Hiding the repeat in the world.** A 3 m tile on a long wall still shows its odd stones every 3 m. For `random`
  tiles the shader scatters repeats (hex tiling with a histogram-preserving blend). For `course` tiles, which must
  keep their courses: each wall starts at its own offset (a whole number of courses), two tiles of a set alternate by
  wall section, and a slow tint and dirt variation is laid over in world space.
- **Memory.** 52 tiles at full size are about 360 MB uncompressed on the GPU, so they load **by set** (only the sets in
  view), at half size on Low (phones), with no more than about 24 resident; `tools/phone_memory.mjs` holds the budget.
- **Scale.** The metres in `sets.json` were set by eye and then corrected to the veteran critic's sizes (blocks,
  bricks and setts against the 1.8 m figure); check each against a door in the first blockout.

## Not used, and why

About 180 sources are left in the catalog for later: the fine gravels and concretes (p062 to p091, more than the zone
needs), the big-stone rubbles whose stones are too few to repeat well, the one-off pieces (p043 carved reliefs, p092
circular paving: for a single face, not for tiling), the tiles listed above as taken out, and the generated
variants B and D of each family.

## The critics (three rounds, 2026-11-15)

Round 1: both REJECT (a stock collage: off-palette tiles, baked sun, wrong scales, repeats; best score 6). Round 2:
both REJECT, close (graded too grey and samey, a Keep with no identity, a burnt set with no detail). Round 3: **both
APPROVE** as the base to block out and build from, not as finished art (veteran: seams 8, repeats 6.5, scale 7.5, art
direction 7, completeness 6; young: mood 8, quality 7, cohesion 8, repeats 7, completeness 6). Done after round 3
(revision 4): p022 dropped, the burnt wall laid at 2.2 m, the market wall at 3 m, setts at 2 m, boards wider, the
marches pulled to a lichen grey away from the castle's blue, the castle darker and bluer, the Keep's and the wall's
joints a true ivory, the daub toned down, the Ossuary's wall graded ivory, and iron, rust iron and the Ossuary's wall
flagged `placeholder` in the manifest (nothing larger than a prop until real ones are painted).

Left for chunk 4, from both critics:
- **Reuse**: the gravel serves five sets, the flagstones four, the plinth four; each needs its district's dirt or
  tint layer, and scattered tiling.
- **The burnt wall and the market wall** still have a shape that repeats (a lump, a zigzag): never more than two
  repeats in a row; alternate with the set's other wall by section.
- **Real iron, a real bone wall, copings**, and the world-space grime, moss, blood and rust-streak layer, which
  carries much of the mood.
- **Not judged by anyone**: the normal, roughness and height maps; anything lit, in perspective, at distance or with
  mips; the scattered tiling; phones at half size; scale against a real door; the full-size tiles by eye (the
  critics read the small sheets).
