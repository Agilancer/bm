# Houses pass (2026-11-20)

The owner asked for every house to look nice, with small details that make each one a little different, layouts and stairs that make sense, and everyone in Phobos sleeping in a bed.

## What's where

- `src/core/phobos-rooms.js`: plans and furnishes each Phobos house from its footprint.
  - A cross wall splits deep houses into a street room and a hall.
  - Trade pieces go in the street room first.
  - Beds for every sleeper in the household.
  - The iron lantern in the street room, the dressed partitions, and the burnt shell.
- `src/core/phobos-build.js`: the house shell.
  - `upstairs()` builds the stair. It has 17 risers of 0.194 m on treads of 0.27 m, 1.25 m wide. The foot starts 1.05 m in from the front wall (`STEP_IN`), so there's floor to step onto it. Before, it was 0.45 m and the stair couldn't be climbed. That was the owner's complaint.
  - It also builds the closet under the landing, the wall bands and skirting, and the charred shell.
- `src/folk/phobos-homes.js` and `src/folk/phobos-beds.js` (baked) hold each street person's bed. Re-bake after any change to rooms or beds with `node tools/homes/bake-beds.mjs`. Running it with `--check` says whether the bake is current.
- `src/gfx/blankets.js`: the blanket over a sleeper is sized to the Phobos beds (`len`, `pallet`) and matches the bed's own cover.
- `tools/interior/build_interior.py`: the Bellmourn homes' details.
  - Hides hang above the wainscot rail.
  - The cradle has bowed rockers.
  - Plates are pale.
- Tools in `tools/homes/`:
  - `shots.mjs` takes in-game shots. Phobos views are g, h, u, uf, st, tr and `at...`; Bellmourn views are g, gb, u, ub and `at...`; there are also bed shots.
  - `audit.mjs` counts beds and per-cell cost.

## Critics (three rounds, all rejected)

| Round | Veteran (3D, textures, design) | Young designer |
|---|---|---|
| 1 | 6 | 6 |
| 2 | 7 | 6.5 |
| 3 | 7.5 | 7 |

Both critics said these must stay:
- the fixed light placement (forge, oven, candles);
- each trade reading from the door (the `tr` views);
- the 1.05 m stair foot and the dark joinery;
- a hearth on each storey;
- every street person with a bed.

## After round 3 (2026-11-21)

The owner asked to continue. Done since round 3:
- **Peg rail:** a woollen cloak, gathered at its peg, with folds and its hood down its back, and a felt hat on the other peg. They replace the flat wedge and cup.
- **Rich halls:** one dining table with high-backed chairs, carver chairs at the ends, plates, a runner and armless candle clusters. It replaces two long tables with benches and papers. The guildhall keeps its long tables.
- **Lights:**
  - each house keeps its strongest lights, not its first ones;
  - the biggest 5% of houses get a fourth;
  - one slot is saved for an upstairs light when there is one.
- **Small defects:**
  - the coffin-maker's chips are now curled shavings;
  - the pot's trivet is three legs;
  - the blanket tents over the toes.
- **Review tool:** the Bellmourn `gb` view now stands mid back-half. vil2 and vil7 use hand-placed views. Bed shots need `WAIT=40000`, so sleepers have walked home.

No critic round was run on these.

## Still open

1. **Every Phobos house has the same plan:** the stair always on the left wall, the hearth always on the right, the cross wall in the same place. Mirroring half the houses is the fix, but the exterior build ties the stack and stair to one side as well.
2. **Upstairs bedrooms are still dark at night** (the lady's, the maid's, the keys'). Their only lights are small candles. A moonlight fill from the windows would help. The burnt shell (264) is almost black.
3. **The cradle (vil3) still reads mostly as a box from above.** Its rockers sit right under it.

## Checks

- Tests: `node --test tests/*.test.mjs`.
  - The `spec.json` test was already failing before this pass.
  - `auto-roads` "a way is worked out in a few milliseconds" is a timing flake. It also fails on the base commit when the machine is busy.
- Auto-play: `node tools/autoplay/check.mjs` passes.
- Phone memory at Phobos wharf, 23h: page 841 MB, GPU buffers 415 MB, textures 303 MB. Rounds 2 and 3 measured the same.
- PC near-cell cost (`node tools/homes/audit.mjs`, 40 cells): 373k vertices and 261 lamps per cell. That's 363k and 258 at the round 3 commit, and about 175k before the pass. Round 3's write-up said 317k, which was an out-of-date figure.
