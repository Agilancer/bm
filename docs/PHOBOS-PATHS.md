# Paths in City State Phobos and Castle Velscour

How auto-play walks the east: City State Phobos, its wall-walk, its houses, the sewer grates, and Castle
Velscour's Keep, spires, rim towers, Needles, turrets and the bridges between them. The tools also check that
every one of those places can be walked to from the road before the Drawbridge Gate, and walked back from.

## The walking map

The east has places stacked one over another: a bridge over a street, a gallery over a stair, a house's upstairs
over its downstairs, 20 turns of a tower stair over the same spot. A flat grid can't hold that, so the map is
layered:

- **tools/paths/bake.mjs** (on 14 threads, about 10 minutes for the whole east) checks every half-metre cell
  from x 9000 to 11720 and z -860 to 860. For each cell it records every height a body stays at once it's stood
  there, whether a body fits, and where one step in each direction takes it. It uses the sim's own rules:
  `World.heightFor` / `topUnder` / `resolve`, the 0.36 m body, steps up to 3 m (the land has no slope limit),
  drops down to 1.1 m, and every Phobos door open. A box: `node tools/paths/bake.mjs 14 x0 z0 x1 z1` re-bakes
  just that area into the existing map. Output: `tools/build/paths/fine.bin` (not committed, ~0.5 GB).
- **tools/paths/map.mjs** floods the map forward from the gate road and back to it, then writes `report.json`
  and `reach.bin`. It lists:
  - every target (tools/paths/targets.mjs) that isn't walked to and back from;
  - every deck and upstairs floor that isn't;
  - every "trap" (a place you can get into but not back out of);
  - every "unguarded edge" (more than 1.1 m straight down, by 8 m square).
- **tools/paths/graph.mjs** shrinks the map to what auto-play carries: `assets/game/nav/east.bin`. Each 4 m
  tile is split into the pieces a body moves around in without leaving the tile, with the steps between them.
- **tools/paths/trips.mjs** walks a body to every target, the way the sim moves the player and the way
  auto-play asks for its route, plus 40 fixed random trips between targets.

## In the game

- `src/sim/east-nav.js` (in the nav worker, `'east'` ask): coarse A\* over east.bin's pieces. It then plans the
  next ~48 m of the route on half-metre cells, using the live world, so it never cuts through a wall or walks
  off a ledge.
- `src/ui/autobrain.js` `eastWalk`:
  - asks again every 7 s, when the planned part runs short, or when the goal moves;
  - opens shut Phobos doors on the way (`phDoor`);
  - counts progress along the route, not as the crow flies, so a stair winding up under its own deck isn't
    taken for "stuck";
  - gives up (`lost`) only after 30 s with no progress, or three asks in a row with no route.
- `planWay`: in and out of the east hands over between the roads and the east's map where the road crosses into its box,
  not at the Drawbridge Gate road (`EAST_DOOR`): the plain under the Sill (the Gibbet Field, the carrion) is in the box
  this side of the city, and by the gate it walked down the road past them to the gate and back, to and fro.

## What the map found, and what was fixed

| Found | Fix |
|---|---|
| Grand Patio deck over great stair 0's head: stepped up onto, never down off | stairwell cut (`patioWell`) |
| The Steward's Tower's stair turret stood in that stairwell, with no floor | turret placement keeps clear of it |
| High things (corbels under a deck, turret drums on decks) blocked from the ground up | in the east, a thing over 2.5 m above the land blocks only from its own base up (`Kit.collide` base) |
| Every tower's top deck covered its stair's head: a trap at the top of each tower | gallery rings laid in pieces around the stair turret's well (`ringRects` hole) |
| A tower reached only by bridges had no lowest gallery; the bridge ended at nothing | it's laid (`climb`) |
| Corner drums: the higher wall's body stood in the room, so no walk side joined the next | wall ends at the drum's room (`wall` trim) |
| House stairs were 0.4 m tightropes (tread half-sizes swapped) | full-width treads (`upstairs`) |
| Bridges had no parapet colliders | a waist-high stop along each side of every walked span |
| The bake kept only 12 heights per cell: tall stairs lost their bottom turns | 64 |
| Switchback stairs: a slot between the flights a body fell down | a spine wall between the lanes (`stairs`) |
| Floors stepped onto 3 m up, as the land's rise is: the map led up walls | on floors a step is at most 1 m (`FLOOR_RISE`) |
| Routes to pieces that can't be got to from the gate: long asks that came to nothing | only pieces the gate's flood reaches are a way's start or end |
| Asks up to 35 s on long castle routes | budgets shared out over the ask: the worst ~7 s |
| A stair's first tread ticked off from the ground under it: turned in under the stair | a point is passed only at its height (within 0.6 m once stood on it) |
| Straight cuts across a spiral's well: the walker, half a metre off its line, fell to the foot | over floors a line must hold a hand (`SLOP`) to either side too |
| A bridge-only tower's lowest gallery was cut open over its stair's well: a 400 m drop | the well is floored there (`gallery` floored) |
| Down steep land held to 1.1 m: ways along the castle's crag were one-way, auto-play walked to and fro | from land onto land a drop is as far as a climb (`dropOf`) |
| The bank under the drawbridge's edge, a metre under its deck: the sim lifts feet onto the deck | 1.2 m of head room to stand anywhere (`headroom`) |
| A low wall stepped over from the high side, walked into from the low | a step up must be clear at the height it's stepped from |
| Gallery pieces only just meeting: pinholes | overlapped by 0.2 m |
| The city wall's corner drums: the gallery out to the higher walk laid over the stair's last treads, the top one left showing 1.5 m under it. The walks past four corners were walked onto, never back off | the gallery starts at the stair's middle line; the treads' inner halves are the way up (`towerFar`) |
| A house's floor is at its highest corner's ground: on a hill 2,061 doors stood a metre to twelve over the street, and no one got into those houses | a flight of steps down from each such threshold, none over 0.42 m: straight out, or along the front either way where straight out would end in the house across the street (`doorFlight`) |
| Door flights crowding a narrow alley: stone blocks across it | a flight that leaves 1.5 m of the street clear past it is taken first; one that only just fits only where none does |
| Each spire's bridge to the next laid from its wall, under its viewing deck: it came out past the parapet a metre and more under the deck. The decks (410-640 m) were stepped up onto, never back off | the bridge leaves from the deck's rim at its height, through a gap in the parapet; trap cells 57k → 24k |

## Inside the sewers and the castle's delves

The four sewers (the West Drains, the Slough Mains, the Charnel Runs, the High Conduits) and the castle's delves are delves:
levels of their own, walked by the delves' own map (`CaveNav`, src/core/dungeon.js). This map takes auto-play to their
grates and portals (tests/east-paths.test.mjs: a way to every portal and way in); `node tools/dungeon/check.mjs` walks
every room of each from its way in ("The delves hold together").

## What's still not right

trips.mjs, on main with the Phobos cliffs: 333 of 340 walks get there. The seven that don't (all in tools/paths/baseline.json, so
a new one fails the run): the Sally Tower's deck (465 m), still climbing when the run's 900 s ran out (auto-play itself has
no limit, only 30 s without getting nearer); three from or to the Shrike Turret, stalled 30 s at its stair head (311 m)
and on its stair (259 m); one from the Blood Spire's deck, "no way there" (below); and 30 s stalls by the Charnel Gate's
spire (105 m) and on the way to the Cistern Turret (265 m).

- **The Blood Spire's deck (640 m)** is got to but not got back from: its stair's head is under the deck (the corner
  drums' fault, above, not yet fixed on the spires: the others get away with it, as their bridge on to the next spire is a
  way back), and its bridge goes on down to the Keep with no way back up. tests/east-paths.test.mjs lists it in `ONE_WAY`,
  and fails once it has a way back so it can be taken off.
- **The Shrike Turret's stair head** (311 m): the map walks it both ways; the walker stalls there for 30 s. Not traced yet.
- 3,726 of the 75,956 floors and decks big enough to count aren't got to (8,706 before the door flights). In the first
  400 the map lists (160 houses): 65 ruins with no doorway, upstairs floors whose stair head the map can't climb onto, and
  doorways with a shop's goods or a post on the threshold beside the steps' top.
- 24,040 cells are got into and not out of (169k before), the Blood Spire's deck the most of them.
- A player who stands somewhere not on the map makes auto-play's ask search the whole of it for nothing (12.6 s, the
  slowest on the last run, with twelve walks at once; from the gate road the slowest is 1.2 s). A phone's worker is slower.
- Not yet watched in the game itself: tools/paths/ingame.mjs is written for it (auto-play's jobs replaced by a list of
  places, nothing able to hurt the player) but hasn't been run.

## Running it after a change

```
node tools/paths/bake.mjs 14                 # or a box round what changed
node tools/paths/map.mjs                     # fails if anything's worse than tools/paths/baseline.json
node tools/paths/graph.mjs                   # assets/game/nav/east.bin
node tools/paths/trips.mjs                   # fails on a walk failing that the baseline doesn't list
node tools/paths/ingame.mjs                  # auto-play in the game itself, to a list of places
node --test tests/east-paths.test.mjs
```

`--baseline` on map.mjs or trips.mjs writes that run's numbers as the new baseline: only after looking them over.

east.bin must be rebuilt after any change to what's stood on in the east, or auto-play's long route will lead
through places that aren't there any more. The fine stretches it walks out use the live world, so it won't walk
into a new wall; it just takes the long way round.

Scratch probes (not part of the run): `probe.mjs x0 z0 x1 z1 step` (places along a line), `_what.mjs x z` (floors
and boxes at a point), `_layer.mjs`, `_cells.mjs`, `_tower.mjs`, `_walls.mjs`, `_house.mjs`, `_at.mjs x y z target` (the route from a spot),
`_cpath.mjs` (its long way), `_edges.mjs` (east.bin's steps at a spot), `_holes.mjs` (holes in a deck), `_walk.mjs` / `_wk.mjs`, `_fine.mjs`, `_spiral.mjs`, `_tread.mjs` (a stair's treads), `_border.mjs` (where a trap meets the rest), `_asks.mjs` (how long each ask takes)
(the sim's body and `walkable` along a line).
