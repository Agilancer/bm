# How bodies are drawn

Changes from branch `lisandra-look-engine` (2026-11-08): why Pretty Lisandra looked worse in the game than on Tripo's
site, what was changed, and what was kept the same for everyone else. Tests: `tests/render-models.test.mjs`.

## Why she looked worse than on Tripo's site

Tripo's viewer is three.js. It lights a model with a bright studio environment (light from every side, and reflections
of it), and reads the textures by the glTF rules. The game drew her with the knights' armour shader (`ARMOR` in
`src/gfx/materials.js`), which differs in four ways:

1. **Her normal map was read upside-down.** glTF's normal maps have green pointing up the picture. The engine builds
   its tangent frame from the UVs (`perturb` in `src/gfx/shaders.js`), and v runs down the picture, so green comes out
   reversed. three.js turns green over for exactly this case; the engine didn't. Every fold, lace and stitch was lit
   from the wrong side, so the surface detail looked muddy.
2. **She was shaded as blackened steel.** Her metal/roughness texture marks leather, hair and cloth as partly metal:
   the median is 0.29, and 14% of texels are above 0.5. ARMOR treats dark, partly-metal paint as blackened plate, so it
   greyed her colours toward neutral, darkened metal areas' paint and raised their roughness.
3. **The reflections were simpler.** ARMOR uses a rough Fresnel guess and greys the sky's colour for steel. A glTF viewer
   uses the split-sum approximation.
4. **The light is different.** This one is by design, and wasn't changed. The opening is a cave lit by candles, with a
   dim ambient and reflections cut to 6%. Outdoors the ambient is a two-colour sky and ground blend. She will never
   look like she does under a studio light in a dark cave. A soft "character light" for cinematics would close more of
   the gap; that's the owner's call.

## Model-true shading (Lisandra only)

`ARMOR_TRUE` in `src/gfx/materials.js` is `ARMOR` with three swaps (`TRUE_SWAPS`) and one added function, `shadeTrue`:

- the normal map's green is turned over (glTF convention);
- the knight's-steel block is removed, so paint, roughness and metal are used as the texture has them;
- the sky's reflection uses an analytic DFG term (Karis 2014), with multiple-scattering energy given back
  (Fdez-Agüera 2019). The diffuse keeps only what the reflection leaves, and the sky keeps its own colour.

Everything else matches `shadePBR` line for line: the sun, the scene's ambient, the indoor and cave rules, the lamps,
shadows, the rim light and fog. So she stands in the same light as the people around her.

`renderer.js` builds `pArmorTrue` from it. Bodies marked `trueLook` (only Lisandra's two forms, in the forms loop) are
drawn with it first. Then `pArmor` goes back on, and every other body is drawn in the same order as before. **Keep it
that way:** the townsfolk (`folk.js draw`) and their blankets draw with whatever pipeline is bound, and that must stay
`pArmor`.

To give another model the same treatment, set `trueLook = true` on its body in `renderer.js`. This changes how that
model looks, so only do it with the owner's say-so. The other Tripo bodies (heroes, undead, field creatures) have the
same normal-map problem.

## The witch's gown: no cloth bones, no ripple

On the owner's word ("so her cloth doesn't dance at the beginning when she talks to you"):

- `assets/game/lisandra/witch.glb` is the owner's new witch (`LISANDRA - UGLY OLD WITCH NEW.glb`, 2026-11-09): her
  mesh, skin weights, bind pose and textures byte for byte, with her own `walk` and `run` (Tripo named them `walk.001`
  and `run.001`) as the walk and run the game plays. The other 174 clips came across from the old witch with
  `tools/lisandra/transfer_clips.py` (the old walk kept as `walk_gown`, 176 clips in all), and the `_SKIRT` mask from
  `tools/lisandra_skirt.py witch`, and a jaw from `tools/lisandra/jaw_rig.py` (below). It has 66 joints (Tripo's 65 and
  `Jaw`) and no `cloth_*` bones. Rebuild:

      python tools/lisandra/transfer_clips.py <old witch.glb> "LISANDRA - UGLY OLD WITCH NEW.glb" clips.glb
      python tools/lisandra_skirt.py witch clips.glb skirt.glb
      python tools/lisandra/jaw_rig.py skirt.glb assets/game/lisandra/witch.glb

  (The old witch's clips are in git: `git show f7ad16b:assets/game/lisandra/witch.glb`.) She has fitted sleeves, so her
  arms are turned out from the gown by 0.1 rad (`armClearance`), not the old ragged sleeves' 0.19.
- Her form in `src/core/lisandra.js` has no `cloth` entry, so `village-walker.js` makes no `Cloth`. `src/sim/cloth.js`
  and `tools/lisandra/cloth_rig.py` are kept but unused.
- The skinning shader's 9 mm skirt ripple is turned off for her alone. `renderer.js` writes `skinParams[7] = 1` for
  bodies with `stillSkirt` (Lisandra's forms) and 0 for everyone else, and sets it back to 0 before the townsfolk and
  the arms. In `SKIN` the ripple is multiplied by `(1.0 - P.wind.w)`, which is exactly 1 for everyone else, so the
  townsfolk's skirts come out the same to the bit.
- The `_SKIRT` leg-clearance push stays. It only moves the gown when a leg would cut through it, as when she walks.

## The witch's mouth

She speaks in the opening, so her jaw moves with her voice. Her face is the owner's sculpt with the lips painted on: no
inside to the mouth, and none is added (her mesh, weights and textures are as supplied, but for the jaw's share below).

- `tools/lisandra/jaw_rig.py` adds one bone, `Jaw`, the last joint, a child of her head at the hinge of the jaw, which no
  clip moves. It takes everything below the painted line between her lips (measured off her texture), cut sharp
  between the corners, with the cheeks and the skin under the chin going part of the way. Only weight her head held is
  handed over, so her neck blends as before. The scene's extras carry `jaw: {joint, axis, open, lip}`: the axis she
  opens about, the most she opens (0.12 rad, about a centimetre between her lips), and her lip line for the shader.
- When the jaw turns down, the few triangles across the lip line stretch. Stretched, they would only show taller lips,
  so `ARMOR_TRUE` darkens the part of them that's new: in bind space, a lens round the lip line as tall as the gap she's
  opened, scaled by how much those triangles have grown (`MOUTH_WGSL` in `src/gfx/materials.js`, two more swaps in
  `TRUE_SWAPS`). `renderer.js` writes `mouth` and `lip` after `info` in her uniforms (`CHAR_UBO`); for everyone else
  `mouth` stays 0 and nothing changes.
- Her voice drives it. `src/ui/opening-sound.js` measures each witch line said from her mouth (not the summons in your
  head) as it starts: loudness every 10 ms over 30 ms, opening evenly from 30 dB under the line's loudest to 2 dB under
  it, opening in 30 ms and shutting in 70 ms, read 40 ms ahead of the sound. `src/main.js` puts it in `INPUT.MOUTH`;
  the worker hands it to her (`VillageWalker.mouth`), whose `poseModifier` turns the jaw after the story's pose, and
  she writes it to her free prop slot (`C_PROPS + 15`) for the renderer.
- Checked headless: the jaw and dark gap at four openings, close and at 1.3 m, and the opening's first 45 s of her
  lines (shut between lines, about half open on average while she speaks). Not checked: a human watching it, the
  phone, and her in town at night (her lines there are in your head, so her mouth stays shut).

## Shadow culling (all bodies, identical pictures)

Profiling every GPU pass (Ultra, 1280×720) showed the three 4096² shadow cascades were about 60% of the frame. Before
this change, every body that could cast was drawn into every cascade. `src/gfx/shadowcull.js` tests a body's bounding
sphere against each cascade's square. A body wholly outside a cascade can't darken any of its texels, so it isn't drawn
there, and neither are the weapons it holds. Townsfolk get the same test. The shadow maps come out the same.

- The sphere is `bodyRadius(cullR, bindR)`: the larger of the camera's cull radius and 1.25 × the bind pose's reach plus
  1 m, plus 1 m. `bindR` is measured in `makeSkinned`.
- Only the square is tested, never depth: the box is 520 m deep, and anything outside that is clipped anyway.

Measured (GPU ms per frame, main → branch): cave 2.83 → 2.84, ledge 3.28 → 3.06, town 4.24 → 4.17, woods 4.12 → 4.04.
The nearest cascade halves (0.17–0.19 → 0.08 ms in the cave and on the ledge). The game was already at 144 fps here.

### Pine shadows: tried culling, it doesn't help (2026-11-09)

The pines are most of the shadows' cost. With pine shadows switched off, the shadow passes take 0.2–0.8 ms per frame
instead of 1.4–3.2 ms (Ultra, 1280×720). So I tried leaving out, per cascade, the trees that can't reach its square.
The maps would be identical. Both versions were measured with culling switched on and off every 2 s in one run, so
other load on the PC cancels out. Neither was kept:

- **By 32 m chunk** (`firstInstance` runs). A chunk's sphere is about 40 m across, so little was left out (the woods'
  smallest cascade still drew 65 of 91 full trees). No measurable change.
- **By tree** (an exact sphere per tree, each cascade its own instance list). This leaves out a lot: the woods'
  smallest cascade drew 19 full trees instead of 91, the cave's 1 instead of 43. GPU time still didn't move
  (0.49 → 0.48 ms, and ±1% everywhere else).

**Why:** the GPU already throws away triangles outside a cascade almost for free. The cost is filling the alpha-cut
boughs of the trees that do land in a cascade: every texel runs the cut-out test, which also turns off early depth
testing. Nothing that keeps the maps identical can remove that.

**What would help, but changes the picture slightly** (the owner's call):

- draw the far cascade's pines with the lighter "big cards" mesh;
- redraw the far cascade less often, or cache the world's part of it;
- give the far cascade a smaller map.

The far cascade is redrawn every other frame at 1.3–3.2 ms, so frame times alternate between cheap and expensive.
Spreading that work evenly would smooth the frame rate even where the average doesn't change.

(The second of those is now done: see "Kept shadows" below.)

## Kept shadows (2026-11-09)

At 3440×1440 on Ultra the shadow passes took about 4.6 ms of a 13–15 ms frame, nearly all of it redrawing things that
never move: the ground, buildings, pines and rocks, into the middle and far cascades, frame after frame.
`src/gfx/shadowcache.js` keeps those two cascades' still part from frame to frame instead.

- **The box sits on you, not on where you look.** A cascade's box used to wrap the slice of view in front of the camera,
  so it changed every time you turned. A kept box is centred on the camera, wide enough for that slice in any direction
  (`need` = the slice's far corner distance), and snapped to a grid (4 m for the middle cascade, 12 m for the far one) and
  to the map's texels. Turning costs nothing; walking a few metres starts a new map.
- **A new map is drawn over 10 frames** into a second layer while the old one is still used, then they swap. Pines are
  split into pieces so no frame takes the whole forest. Only a teleport (or the first frame) draws a whole map at once.
- **Each frame:** the kept layer is copied into the cascade (`copyTextureToTexture`), then what moves is drawn over it with
  `depthLoadOp: 'load'`: bodies, townsfolk, what they hold, ground items, slimes, rolling tumbleweeds. The far cascade is
  still refreshed every other frame, as before, unless its map just swapped.
- **The sun.** A map is redrawn once the sun has moved 0.12° (about 10 game seconds of a day hour). The near cascade
  uses the same sun as the middle map, so the cascades agree where they meet.
- **What else redraws a map:** a new set of statics (`buildStatics`), the land following you (`followLand`), new pines
  or rocks (`shadowEpoch`), going underground, the rocks switched off.
- The near cascade (0–12 m) is drawn live every frame, as before.
- Not on the phone tier (`tier.lean`) or with two cascades. `renderer.keepShadows = false` before the shadows are made
  turns it off.

The cascades are a little wider than before (the box must hold any turn), so a texel covers somewhat more ground in the
middle and far cascades. Side-by-side shots in the woods, town, meadow and at evening looked the same.

Measured (3440×1440, Ultra, RX 9070 XT, on and off in turn in one run): shadow passes 4.6 → 1.2 ms;
woods 80 → 102 fps, town 93 → 134, meadow 78 → 108, evening 96 → 121. A map is redrawn about 1.4 times a second by day.

## The forest's depth pass (2026-11-09)

The pines' boughs are alpha-cut, and a shader that can `discard` loses early depth testing: every bough behind every
other bough was shaded in full. On desktop the pines are now drawn twice:

1. `fsDepth`: the cut-out test only, depth written, no colour (`writeMask: 0`).
2. The full shader with `depthCompare: 'equal'`, no depth writes and no `discard`, so only the bough you see is shaded.

The position is `@invariant` so both passes put each pixel at exactly the same depth. The phone tier keeps the single
pass (one more pass costs a tiled GPU more than it saves). `renderer.pines.once = true` switches back, for comparison.

Measured (3440×1440, Ultra, on and off in turn): world pass 5.51 → 4.34 ms in the woods, 6.26 → 4.99 in the meadow,
4.54 → 4.05 at evening, town unchanged; woods 111 → 128 fps, meadow 107 → 119.

## Resolution that comes back (2026-11-09)

On a PC, `src/gfx/deskscale.js` picks the resolution step (1, 0.88, 0.76, 0.66, 0.55) every 1.5 s from the GPU timer, to
hold the screen's refresh rate. It used to sink and stay down: on main, auto-play at 3440×1440 Ultra on a 144 Hz screen
dropped to 0.76 after 78 s and never came back. Two causes:

- **It stepped down on a single slow window** (a load, a teleport, the first frames at a new size), sometimes twice in a
  row before the timer's average had caught up. Now it takes two slow windows in a row.
- **It only stepped up below 55% of the budget** (3.8 ms at 144 Hz), and a lightly loaded GPU clocks itself down, so its
  frames *look* as slow at 0.66 as at full size (4.1 ms vs 4.2 ms, measured). It never got there. Now it steps up when the
  frame would still fit (under 85% of the budget) even if all of it grew with the pixels. Not all of it does, so a step up
  can't overshoot into a step down, and there's no flapping (`tests/deskscale.test.mjs`).

Effects (shafts, AO, grass, far-shadow rate) still only go when 60 fps itself is out of reach, after the resolution has
already dropped to 0.76; that's unchanged. Forced to 0.66 in the middle of auto-play, it was back at 1 in about 9 s.

## Measured, all together (2026-11-09, RX 9070 XT, 3440×1440)

Kept shadows and the forest's depth pass on and off in turn in one run, so other load on the PC cancels out:

| Ultra, GPU ms per frame | woods | town | night | meadow | evening | far land |
|---|---|---|---|---|---|---|
| off (as main) | 6.66 | 6.94 | 6.28 | 7.38 | 6.54 | 5.54 |
| on | 5.10 | 5.14 | 5.18 | 5.04 | 5.09 | 4.09 |

High: 0.1–1.1 ms less in each place (its shadow maps are a quarter the size, so there was less to save).

On a 144 Hz screen with vsync (as a player has it), the branch holds 144 fps everywhere with even frames (99th percentile
7.4–7.7 ms). With the two changes off, the woods drop a frame in every hundred (14 ms) and the town at night once fell to
106 fps with a 63 ms hitch. Left to run auto-play with nothing pinned, main sank to 0.76 resolution; the branch stayed at
full resolution and 144 fps throughout (GPU timer 4.2–5.5 ms).

What's left is mostly the browser's: putting a 3440×1440 frame on screen costs about 2 ms that no timer in the page sees.

### Measuring traps

- Runs on this PC differ by up to 2× from other load on the GPU (the woods' world pass read 8.6 ms in one run and 2.5 ms
  in the next, same view). Compare by switching a change on and off in one run.
- After a teleport, wait 7 s or more before measuring: the land streams in and the first seconds run slow.
- A profiler that adds `timestampWrites` to every pass takes over the renderer's own timer, so `stats.gpuMs` reads 0 and
  the resolution governor falls back to submit-to-done time, which under vsync is about the frame interval: it then
  drops the resolution on its own. Pin the scale (`bm.fixScale(1)`) when profiling, or don't profile when watching the
  governor.
- With `--disable-frame-rate-limit`, frames come in bursts of three (the game lets three queue, and the browser reports
  them done in batches), so fps stops tracking GPU time. Measure frame pacing with vsync on.

## How "nothing else changed" was checked

- Every WGSL module the game compiles was fingerprinted on main and on the branch, using a test harness that wraps
  `createShaderModule`. Main compiles 30 modules; 29 are byte-identical on the branch. The skinning shader changed
  only by the `(1.0 - P.wind.w)` factor, which is exactly 1 for everyone but Lisandra. The only new module is
  `ARMOR_TRUE`.
- `tests/render-models.test.mjs`:
  - takes the swaps (and the witch's mouth) back out of `ARMOR_TRUE` and gets `ARMOR` character for character;
  - checks that `ARMOR` has none of the new code;
  - checks the cascade test never drops a sphere that touches the square;
  - checks the witch file has no cloth bones and has 176 clips, with her own walk and run, and her jaw: 66 joints,
    `Jaw` last under her head, moved by no clip, and the lip line in the scene's extras.
- All test files pass. Run each on its own: `node --test tests/<file>`.

Still to do: a human look in the game. The cave and ledge shots with the new shading haven't been compared side by side
with Tripo's viewer yet, and the phone (Mobile tier) is untested.
