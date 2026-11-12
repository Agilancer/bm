# Places: handoff

The part of the world build-out that covers what stands out in the land: every place in `SITES` (`src/core/lands.js`).
Read `docs/handoff/BRIEF.md` first for the owner's request and the rules (V and T never together; no letters; no commits by agents).

## Where the code is

- `src/core/sites.js`: the `Kit` (boxes, drums, walls, towers, houses...) and one function per country: `downs`, `belltower`,
  `fen`, `rustwood`, `ashen`, `keep`, `barrow`, `rimeholt`, `gallows`, `deepwood`, `sorrowhorn`. `SEALS` and `buildSites()` at the end.
  The cave/portal code in this file belongs to the dungeons work: not touched here.
- `src/core/places.js` (new): `PIECES`, mixed into the Kit (`Object.assign(Kit.prototype, PIECES)` in sites.js), the helper
  `street()`, and the new places: `thornwick(K)`, `cinderford(K)`, `lesser(K)` (the Moor Wayhouse, the Old Toll, Ossery Quarry,
  the Howling Mouth, Ravens' Tor). The Cairnfield is in `downs`, the Sunken Mile in `fen`, the Charred Mill in `ashen`.
- `src/core/lands.js`: three sites added (`wayhouse`, `oldtoll`, `quarry`); `ROUTES`: the Frost Road now ends at Frostwatch's
  north gate (712, 3872), the Knoll Path at the Bell Tower's gate (2440, -521); new paths: the Tor Path, the Sunken Mile, the
  Cairn Path, the Mill Track.
- `src/core/knights.js`: only the Bellwright's route numbers changed (z -530.3 / -530.5).
- `tools/lands/check-sites.mjs` (new) and `tests/sites-clear.test.mjs` (new): fail if a collider stands on a road, a seal, a
  spot, or the ground kept for a dungeon's portal (before Blackvigil's gate; 7 m round the Howling Mouth's middle). `--spots`
  and `--seals` list them. It also prints the triangle count.
- README: "The places in the land". `tools/folk/cast.md`: the gazetteer names the new places.

## New Kit pieces (`PIECES` in places.js)

`frame`, `deck` (a floor you walk on, like the portals' terraces), `beam`, `paving`, `ringPaving`, `crate`, `barrel`, `sack`,
`goods`, `lantern`, `wallLamp`, `steps` (walkable unless `walk: false`), `arch` (free ring, `top`: in a wall, `broken`: part
fallen), `pierced` (a wall with windows/doors, `ruin`), `tent`, `pavilion`, `leanTo`, `wheel`, `cart` (`load`, `wreck`),
`stall`, `gravestone`, `graves`, `boat`, `banner`, `hanging`, `well`, `palisade`, `ring`, `bridge` (walkable), `rock`, `cairn`
(`open`), `woodpile`, `hayrick`, `trough`, `bench`, `table`, `campfire`, `rack`, `washing`, `ladder`, `signpost`, `stump`,
`heap`, `windowAt`. `Kit.house` now stands on a rubble footing where the land falls away, with a step at its door, and takes
`lamp` and `foot: false`. No piece makes a cross or a T.

Layers that exist: the town's paintings (`wall_07`..`wall_20`, `roof_1`..`4`, `door_1`..`5`, `stone`, `rubble`, `wood`, `bark`,
`cloth_oat`, `cloth_red`), flats (`iron`, `flame`, `water`, `fruit`, `fruit2` (gilt), `white`, `lake`, `ice`, `obsidian`), and
tints `dark:`, `pale:`, `frost:`. Found by looking: `stone` is a tan brick, so it reads brown beside pale stone; `pale:stone`
is mid grey, not white; `cloth_oat` is olive-brown; `water`/`obsidian` quads reflect the sky and read pale (slits in the keep
are `iron` for that reason). There is no blue and no green layer.

## The Bell Tower of the Four Watches (`belltower(K)`)

Pass one (built, seen in pictures): battered plinth, shaft with paired buttresses stepping in at two string courses, slits
with hoods and sills, belfry of paired arches with louvres and four bronze bells in a timber frame, parapet with merlons and
corner pinnacles, spire with gilt finial and sunburst, forebuilding with the door, porch with arch and gable, five walkable
steps, sunburst over the porch; walled yard with gate piers and lanterns, flagged court, the Bellwright's house, woodpile and
block, oil store lean-to, roofed well, bench, ladder up the west face, the old cracked bell on baulks; twelve watch-stones and
post stumps on the knoll at 36 m; lanterns on the path; the Knoll Path extended to the gate.

Pass two (done after looking at pass one's pictures): plinth and steps changed from `stone` (read brown) to `pale:rubble`;
string courses and hoods in the shaft's stone and prouder; side cheeks on the buttress heads; spire in two pitches
(`frost:roof_2`) with a gilt band and four lucarnes; a watch lamp hung in the belfry; three lit stair slits; banners with
small sunbursts on the two buttresses by the door; a dial; the old bellwrights' slabs; rails down the steps; a lit window in
the house; the ladder shortened and widened.

Still to do or check on the tower:
- **White broken ground on the knoll in front of the yard wall** (pictures/places_bell_near.jpg, bottom): the drawn ground is
  missing or torn there. Not diagnosed. It may be the land's mesh not yet laid when the picture was taken (pictures are taken
  seconds after a teleport), or the land's coarse grid on the knoll's slope against the levelled pad (`pad: 12`) and the
  lengthened Knoll Path. Look again after a long settle (SETTLE=20000); if it stays, suspect the path's new last point
  (2440, -521) or the pad edge, and look at `src/core/ground-patches.js`.
- The banners were changed from `cloth_oat` (dark olive) to `white` after the last picture: not seen.
- The spire still reads dark slate rather than copper; the lower pitch barely shows.
- At night the tower is dark but for the lit slits; the lanterns are tiny.
- Ser Hale's stand: `K.spots.hale` = (2436, -530.4). The Bellwright's route was moved to z -530.3..-530.5. Both stand clear of
  the steps (their foot is at z -531.3). If Hale's route in knights.js uses another z, set it to -530.4.

## Every site and its state

"Passed" = rebuilt or dressed in this pass and seen in at least one picture. "Built, not seen" = code in, checks pass, no
picture looked at.

| Site | State | Notes |
| --- | --- | --- |
| farm (Millhaven Farm) | built, picture taken but not looked at | farmhouse and barn moved off the Hill Road and Mill Lane (they stood on them); cart shed, ricks, stooks, sty, well |
| mill | built, not looked at | door now on the north (the lane's side); gallery, tail pole, miller's house |
| hamlet (Millhaven) | passed | nine homes along the road, green with well, pillar, stalls, smithy, tithe barn, graveyard, fold. No pad: it's on a slope |
| falls | built, not looked at | fisher's hut, boats, racks, plank landing, more rocks |
| belltower | passed twice | see above |
| cairnfield | built, not looked at | 40 cairns, a great one, some opened |
| sallow | partly seen | stilt huts, walkable landing, boats, racks; the one picture was taken from inside a lean-to with no ground drawn |
| chapel | passed | lancet walls, chancel arch, graves; from the west it reads as low blocky ruin, the lancets don't show |
| causeway (the Sunken Mile) | passed | slabs, piers, an arch, fallen waymark |
| abbey | passed | windows, buttresses, cloister arcade, graves, precinct wall and gate |
| fungus | built, not looked at | |
| cutters | built, not looked at | |
| quarry (new) | passed | benches of the face read as grey masonry walls rather than rock |
| khel | passed | awnings, stalls, well, gate arch, outside camp |
| bones | built, not looked at | ribs now beams, spine, skull, red on poles |
| obelisks | built, not looked at | |
| charmill | passed | reads well |
| keep (outside) | passed | towers, galleries, slits, portcullis, ditch-line, bridge, barbican. The "dry moat" is a walled bed of stakes at grade: the land can't be dug from sites.js |
| barrows | built, not looked at | |
| stones (Nine Maidens) | seen once, then changed | the stones were tan brick (`stone`); changed to `rubble`, not seen since |
| wayhouse (new) | built, not looked at | |
| frostwatch | passed (from outside) | north and south gates, corner turrets, beacon, stable, smithy, well; the yard itself not looked at |
| shrine | built, not looked at | |
| deepsmouth | passed | rocks behind the dungeon's portal; boulders were crude frusta, `rock()` was made lumpier after, not seen since |
| tor | passed, then changed | same `rock()` change; the core is drums of `frost:rubble` and reads as built masonry; the stair is walkable (not walked) |
| crossroads, witch, grove, oldtoll (new), hermit | built, not looked at | |
| stair, greywatch, crown | built, not looked at | light changes at the crown |
| thornwick (new) | passed | palisade, two gates, inn, nine homes, market square, shrine, watch platform, fields, fold |
| cinderford (new) | passed | the stream bed reads as a wide chequered strip; ground was not drawn in the air picture |

A last picture run (tor, deepsmouth, bell_near, stones, cairnfield, oldtoll into `tools/build/shots/places_*`) was started
when this was written; look at those files' times.

## Spots (`buildSites().spots`, `[x, y, z, yaw]`; a body faces (sin yaw, cos yaw))

```
farm_yard          1726, 26.26, 168, 3.14
millhaven_green    2041.35, 21.57, -7.5, 0.23
falls_hut          2574.2, 18.96, -90.4, 0.7
bellwright         2442.8, 49.24, -530.4, 3.14
hale               2436, 49.24, -530.4, 3.14
sallow_landing     -253.6, 4.08, -3271, 3.14
chapel_door        -917, 0.49, -4296.5, -1.57
causeway_mark      -403.5, 2.1, -2705, 0
abbey_door         3922, 26.97, -2883, -1.57
fungus_camp        2893, 119.44, -4304, 0.8
cutters_fire       4699.5, 44.65, -1303.4, -0.9
khel_court         -3695, 54.19, -694, 3.14
charmill_well      -3143.5, 51.36, -990.5, -2.2
keepGate           -4922, 58.59, 200, 1.57
barrows_camp       -2830.5, 52, 3460, 2.4
stones_ring        -1896, 38.77, 4395, 0.6
frostwatch_yard    690, 108.39, 3899, 1.57
crossroads_post    4093.5, 50.1, 3201.5, 1.2
witch_door         4801.34, 49.18, 1605.79, 0.5
grove_table        3098.5, 46.46, 4504, 2.9
hermit_fire        -1302.8, 25.31, -1496.4, -0.6
stair_gate         -1639.68, 140.33, -1895.7, 0.71
greywatch          -1773.5, 223.36, -2251.26, 2.62
thornwick_inn      2393.7, 26.11, 1806.3, 2.36
thornwick_cross    2408, 26.11, 1791, -0.79
thornwick_gate     2369.6, 26.11, 1776.6, 0.79
cinderford_watch   -2129, 62.04, -201.5, 1.57
cinderford_kiln    -2098, 62.04, -229, 0
cinderford_camp    -2067, 62.04, -180, 3.14
wayhouse_door      -1715.8, 16.53, 2383.63, 0.73
oldtoll_bar        3300.35, 41.56, 2594.04, -0.64
quarry_hut         2924.14, 36.81, -1666.52, -1.96
deepsmouth_camp    867, 92.55, 4001, -0.4
tor_foot           1485.5, 91.14, 4602.5, -1.57
```
Seals set by hand: Thornwick (2396, 1833), Cinderford (-2088, -162), both inside the walls.

## Triangles

`buildSites()` before any of this work: 48,505 in all, of which 14,877 out in the land (the rest the Warrens and the Test
Dungeon). Now: 75,546 out in the land (that includes two more dungeon portal terraces that aren't this work), 228,716 in all
with the new dungeons. So the places are about five times what they were, and about 2.2 times the old whole; the brief asked
for "about three times". The biggest: keep 8.6k, thornwick 7.7k, khel 4.9k, cinderford 4.6k, belltower 4.5k+. Frame time not measured.

## Checks at handoff

- `node --test tests/*.test.mjs`: 168 pass, 2 fail (both about Lisandra's recorded voice files; they failed before this work).
- `node tools/lands/check-vt.mjs`: V and T kept apart.
- `node tools/lands/check-sites.mjs`: roads, seals and spots are clear.
- `node tools/dungeon/check.mjs`: passes. `node tools/autoplay/check.mjs`: fails only on the new dungeons' bosses (not places).

## Not done

- No place was walked by a person; colliders and the walkable pieces (tower steps, keep's bridge, Sallowmere's landing,
  Cinderford's bridge, the tor's stair, the shrine's dais) are unverified in play.
- No smoke from Cinderford's clamps (a small flame at each vent only).
- Pictures at two hours of the day were taken only for the Bell Tower.
- Auto-play has not been taught the new places, paths or seals (thornwick, cinderford, wayhouse, oldtoll, quarry, deepsmouth,
  cairnfield, causeway, tor, charmill; the four new paths).
