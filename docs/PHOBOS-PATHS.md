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
- `planWay`: in and out of the east goes through the Drawbridge Gate road (`EAST_DOOR`).

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

## Inside the sewers and the castle's delves

The four sewers (the West Drains, the Slough Mains, the Charnel Runs, the High Conduits) and the castle's delves are delves:
levels of their own, walked by the delves' own map (`CaveNav`, src/core/dungeon.js). This map takes auto-play to their
grates and portals (tests/east-paths.test.mjs: a way to every portal and way in); `node tools/dungeon/check.mjs` walks
every room of each from its way in ("The delves hold together").

## What trips.mjs still doesn't get to

Seven of the 340 walks, on the last run before this was merged (333 got there):

- the Sally Tower's deck, 465 m up: still climbing when the run's 900 s ran out (auto-play itself has no limit, only 30 s
  without getting nearer);
- two from the Shrike Turret's stair head, 311 m, where the turret's top tread is 1.1 m under the wide flight over it;
- one from the Blood Spire's crown (490 m), which nothing from the gate gets to: "no way there";
- three that stall for 30 s: by the Charnel Gate's spire (105 m), on the Bone Spire's bridge to its step (392 m), and on
  the way to the Cistern Turret (265 m).

The map's other known gap: the four spires' crowns (410-640 m) are a metre over the sloped roof round them. A body
steps up onto a crown but not back down off it, a 1.5 m drop. No target is on a crown, and the long way never goes
through a dead end, so auto-play doesn't take anyone there. A player who climbs up there is stuck, and auto-play's ask
from there searches the whole map for nothing (the slowest ask on the run, 26 s with twelve walks at once; from the gate
road the slowest is 1.2 s). See the run's output before calling it done.

## Running it after a change

```
node tools/paths/bake.mjs 14                 # or a box round what changed
node tools/paths/map.mjs                     # "not got to" should be empty but for decks
node tools/paths/graph.mjs                   # assets/game/nav/east.bin
node tools/paths/trips.mjs                   # every walk should get there
node --test tests/east-paths.test.mjs
```

east.bin must be rebuilt after any change to what's stood on in the east, or auto-play's long route will lead
through places that aren't there any more. The fine stretches it walks out use the live world, so it won't walk
into a new wall; it just takes the long way round.

Scratch probes (not part of the run): `probe.mjs x0 z0 x1 z1 step` (places along a line), `_what.mjs x z` (floors
and boxes at a point), `_layer.mjs`, `_cells.mjs`, `_tower.mjs`, `_walls.mjs`, `_house.mjs`, `_at.mjs x y z target` (the route from a spot),
`_cpath.mjs` (its long way), `_edges.mjs` (east.bin's steps at a spot), `_holes.mjs` (holes in a deck), `_walk.mjs` / `_wk.mjs`, `_fine.mjs`, `_spiral.mjs`, `_tread.mjs` (a stair's treads), `_border.mjs` (where a trap meets the rest), `_asks.mjs` (how long each ask takes)
(the sim's body and `walkable` along a line).
