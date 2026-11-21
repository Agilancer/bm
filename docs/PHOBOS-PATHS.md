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
and boxes at a point), `_layer.mjs`, `_cells.mjs`, `_tower.mjs`, `_walls.mjs`, `_house.mjs`.
