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

## Still open (round 3)

1. **Every Phobos house has the same plan:** the stair always on the left wall, the hearth always on the right, the cross wall in the same place. Mirroring half the houses is the fix, but the exterior build ties the stack and stair to one side as well.
2. **The peg rail with a cloak and hood** on the partition reads as flat placeholder shapes (a dark wedge and a tan cup). It needs a real shape and texture, or should be removed.
3. **Rich homes (3513, 4185) read as empty halls:** long benches in a dim room. They want a parlour: rug, high-backed chair, plate dresser, warmer light.
4. **The sleep shots are too dark to see the sleepers,** and the shell (264) is almost black. A moonlight fill from the windows would help.
5. **The Bellmourn `gb` review camera in `shots.mjs` still starts inside walls** for vil2, 3, 7, 8, 11 and 12. This is only a problem with the review tool, not the game.
6. **Small defects:**
   - white chips on the coffin-maker's floor (the shavings);
   - a cone under the pot by the trestle;
   - the cradle's rockers can't be seen from the close-up angle;
   - the hides were never shown in a shot.

## Checks

- Tests: `node --test tests/*.test.mjs`.
  - The `spec.json` test was already failing before this pass.
  - `auto-roads` "a way is worked out in a few milliseconds" is a timing flake. It also fails on the base commit when the machine is busy.
- Auto-play: `node tools/autoplay/check.mjs` passes.
- Phone memory at Phobos wharf, 23h: page 848 MB, GPU buffers 417 MB, textures 303 MB. Round 2 measured the same.
- PC near-cell cost: about 317k vertices per cell. It was about 175k before the pass.
