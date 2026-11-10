# How bodies are drawn

Changes from branch `lisandra-look-engine` (2026-11-08): why Pretty Lisandra looked worse in the game than on Tripo's
site, what was changed, and what was kept the same for everyone else. Tests: `tests/render-models.test.mjs`.

## Why she looked worse than on Tripo's site

Tripo's viewer is three.js. It lights a model with a bright studio environment (light from every side, and reflections
of it), and reads the textures by the glTF rules. The game drew her with the knights' armour shader (`ARMOR` in
`src/gfx/materials.js`), which differs in four ways:

1. **Her normal map was read the wrong way round.** (Corrected 2026-11-09, for every body: see "Normal maps" below.
   The first fix turned green over here, which was the half that had been right.)
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

`ARMOR_TRUE` in `src/gfx/materials.js` is `ARMOR` with two swaps (`TRUE_SWAPS`) and one added function, `shadeTrue`:

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

## The other Tessariels: their own paint, not a knight's steel

The heroes are drawn with `ARMOR`, but their metal and roughness were guessed from their paint when they were built
(`derive_pbr` in `tools/armor/rig_armor.py`): faces, hair, cloth and leather came out as polished metal, and `ARMOR`'s
knight's steel then turned their dark paint into blackened plate, so every hero who wasn't a lancer read as a dark chrome
statue. Each hero body sets `heroLook` in `renderer.js`, sent as `info.z`: `-2` for the classes in plate (lancers and
paladins), `-3` for those in armour that isn't all steel (dragoons and boomerang knights), `-1` for the rest. In `ARMOR`,
`heroLook` keeps metal only where the paint is steel-grey or gilt (on `-2`, anywhere but skin and the darkest cloth),
turns skin matte and skips the dark-paint block. A rebuild with Tripo's own metal and roughness maps (`compose` in
`tools/heroes/build.py`) would do this properly; this does it without one.

What shows where a hero's plates part (the gap covers, `tools/heroes/mail.py`: anything with u past the atlas) is drawn
by the same code. The covers carry their own coordinates (u: metres round the tube, plus 2 on a blackened suit; v: metres
along it, plus 100 up inside a helm). On `-2` and `-3` it's ring mail, rings 15 mm across in rows 7.5 mm apart: crowns
0.40 on a bright suit and 0.14 on a blackened one, 0.015 between them; a few strides off the rings melt to bands by row
(0.30 or 0.06, metal 0.25 or 0.4, roughness 0.6) and then to an even tone, with the sky's reflection cut to about half so
it doesn't go blue. On `-1` it's a padded coat, dark linen (0.07, 0.05, 0.035) quilted in 30 mm diamonds. Inside a helm
it's shadow; the inside of a cover is its own stuff at 40%. The inside of a plate (a back face that isn't cloth: cloth is
marked in the piece number, `CLOTH_BIT`) is dark iron on `-2` and `-3` and a dark lining on `-1`. Until 2026-11-10 the
covers were short flat near-black tubes, which read as grey rubber, and plate insides wore their outer paint.

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
      python tools/lisandra/jaw_rig.py skirt.glb jaw.glb
      python tools/lisandra/hat_tassel.py jaw.glb assets/game/lisandra/witch.glb

  (The old witch's clips are in git: `git show f7ad16b:assets/game/lisandra/witch.glb`.) She has fitted sleeves, so her
  arms are turned out from the gown by 0.1 rad (`armClearance`), not the old ragged sleeves' 0.19.
- **No tassel on her hat** (the owner's word, 2026-11-10). The model came with a thin tassel hanging from the brim
  over her left shoulder, one piece with the hat. Tripo's rig hung its top on her head and its bottom on her left arm,
  so in the game it stretched from the brim to wherever her arm was. `tools/lisandra/hat_tassel.py` leaves its 312
  triangles out of the index list and draws the ring it grew from in to a point on the brim, so there's no hole.
  Every vertex is still in the file, and only the index list and those eight points differ from the file before
  (checked byte by byte). Pretty has no hat. `tests/render-models.test.mjs` pins it.
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

## Far bodies, and a once-over of the frame (2026-11-10)

Looked for what a frame does that it needn't, on the render thread, the simulation's and the GPU. All of it was found
and measured in headless Chromium on a software GPU (SwiftShader), **not on a graphics card**: counts of triangles,
draws and vertices are exact, CPU times are a profiler's, and the gain in GPU milliseconds on a real card isn't
measured. Tests: `tests/far-bodies.test.mjs`.

### What was found

On a PC there was no coarse mesh at all (`addLod` returned early unless `tier.lean`), and every body in view was
skinned every frame at any distance. In the town at noon: 58 bodies, 780,000 vertices skinned a frame, some of them
knights 200 m off and ten pixels tall, each drawn with all 25,000 of its triangles into the view and every shadow
cascade it reached.

### What changed

- **A coarse mesh for far bodies.** `addLod` now makes one on a PC too, by welding vertices in 4.5 cm cells
  (`LOD_CELL`): about a fifth of the triangles. A body is drawn with it once a cell is 0.8 of a pixel or less
  (`bodyDetail`: past 65 m at 1440p, 49 m at 1080p, 97 m at 4K; it follows the resolution step and a narrowed lens),
  with 6% of give either way so one at the line doesn't flicker. The far shadow cascade, whose texels (6 cm or more)
  are wider than the cells, always draws it. The near and middle cascades and everything nearer are as they were.
  Lisandra keeps her whole mesh. The phone's rule (its own cell, past 16 m, every shadow) is untouched.
- **Why one mesh and not two.** A second, of 11 cm cells, was tried for the farthest. Measured against the whole mesh
  in the bind pose, front and side, 4.5 cm keeps 95 to 98% of the outline (a knight side on, 91%); 7.5 cm 83 to 97%;
  11 cm 70 to 93%: arms and shins weld to a line and vanish. In a frame it showed as thinner figures. So it's the one.
- **Far poses less often.** A skinned mesh is in world space and kept from frame to frame, so a body not skinned this
  frame holds the pose it had. Past 40 m a pose is made at most 65 times a second, past 90 m 33 (`skinEvery`): at
  60 fps that's every frame and every other; at 144, every other and every fourth. They're spread over the frames by
  slot, so no frame takes them all. A body is always skinned the frame it comes back into view. What it holds still
  moves every frame, so a far sword can lead its hand by a frame or two; at 90 m that's under a pixel. This one is on
  every tier, the phone's too (where at 60 fps it's only the bodies past 90 m, every other frame).
- **Swords, shields, doors and stalls.** The eight knights' swords and shields have no owner, and were drawn into
  the view and all three cascades wherever in the land they were (86,000 triangles a pass); so were the town's 37
  doors and stalls. Each prop and ground item now has a bounding sphere (`placeSphere`), tested against the view
  and each cascade's square, as bodies are (`shadowcull.js`). The maps and the picture are the same.
- `renderer.fullDetail = true` turns the coarse mesh and the slower poses off, for comparing.

### Measured

Town at noon, same view, `fullDetail` on and then off in one run (2560x1440, High):

| a frame | before | after |
|---|---|---|
| triangles into the shadow maps | 1.37 M (main) | 0.94 M |
| triangles into the view | 2.35 M | 1.87 M |
| draws | 420 (main) | 340 |
| vertices skinned, at 60 fps | 782,000 | 572,000 |
| vertices skinned, at 144 fps | 782,000 | 300,000 |

Two real frames of a paused world, one whole and one with the changes, at 640x360 (where the coarse mesh starts at
16 m, so nearly every body has it): 141 of 230,400 pixels differ by more than 2 levels, all of them on the far
figures (two frames of the same thing differ in 3 to 34). The software GPU drew the frame 14% faster (16.6 s to
14.3 s). That says the work is less; it doesn't say how much a card gains.

### The render thread

A frame's script was about 1.7 ms of a 2.2 ms task (the town, 60 fps), with style and layout at 0.016 ms: the HUD
doesn't cost. Three things did:

- `renderer.frame` copied the whole snapshot (483 KB) out of shared memory first thing every frame, the slowest line
  in it (0.18 ms). It now takes what every frame reads (the header, each live body's head, props and card), and a
  body's pose and wounds only when they're uploaded. The snapshot is the frame's own while the frame lasts, so the
  parts taken later are of the same tick.
- `audio.play` made three audio nodes, an HRTF panner among them, for every footfall of every knight in the land:
  50 a second, most from hundreds of metres off. A sound that would reach the ear 50 dB down or lower isn't played
  (`UNHEARD`), and no longer takes its bank's turn from one that can be heard.
- The map's two papers (3 s of terrain sums) were made on the render thread in 4 ms slices during the first half
  minute of play. They're made on the land pool's thread (`maprows` in `job.worker.js`), the same sums in the same order.

### The simulation

2 ms a tick of its 8.3. A patrolling knight walked the whole line to his next post in 20 cm steps every tick to see
if it was clear (a tenth of the tick); he looks five times a second now.

### Not done, and why

- **The kept shadows' copies.** Each frame copies a whole kept map into its cascade (two 4096² depth maps on Ultra),
  and WebGPU won't copy part of a depth texture. Restoring only the texels the moving things touched last frame, with
  a small depth-writing pass, would save most of that. It needs a tight bound on everything that moves, and a wrong
  one leaves shadow trails: not one to do without a card to look at.
- **The grass's culling pass** runs over the whole lattice (3.5 M cells on Ultra) though the view takes a third of
  it. Cheap per cell; would need the lattice dispatched by the view's footprint.
- **A proper simplified mesh** (edge collapses, built by the tools) would keep outlines far better than welding, and
  could come in nearer. The owner's call: it's a rebuild of every body.

## The look: leaves, flames, feet (2026-11-10)

Looked at real frames for what's wrong or could be better: the town at noon, dusk and night, a villager and a knight
up close, a room, the woods, the church, the far countries, the Warrens, Lisandra's cave, the phone tier. About fifty
frames, drawn by the game's own loop on a software GPU (SwiftShader, 960x540, High; a minute a frame), **not on a
graphics card and not in motion**. Nothing was found broken. Three things were made better and one put right.
Tests: `tests/soft-cut.test.mjs`, `tests/far-bodies.test.mjs`.

### Leaves and needles, smoothed by the sample

A leaf or a needle is a painting's alpha tested once a pixel: in or out. Multisampling only smooths a triangle's
edge, so a cut-out's edge was a stair of whole pixels at any sample count: the oaks' leaves blocky against the sky,
the pines' needles a pepper of single pixels up close (and in motion, the shimmer of a forest).

`cutMaskWGSL` (`materials.js`) gives each pixel a share instead: how far the alpha is past the cut, over how fast it
changes across the pixel, as that many of the pixel's samples (`@builtin(sample_mask)`). Alpha-to-coverage would do
the same, but WebGPU won't have it on a target with no alpha, and the HDR target is `rg11b10ufloat`.

- **The town's leaves** (`pStaticCut`, `staticSoftCut`): the slope from two more reads of the painting, half a pixel
  along and down. (Where the test is, the shader has branched on the layer, and a derivative can't be asked for.)
- **The pines**: in their depth pass (`softDepth` in `pines.js`), with `fwidth`. The colour pass's `equal` test then
  follows the depth sample by sample, so it needed no change.
- With one sample the test is the old one exactly, and the phone's shaders and the `once` pipeline are untouched.
  The shadow maps still cut the old way. `renderer.hardCut = true` before the pipelines are made keeps the old test.
- The same view cut both ways in one run: the frame's mean level moved by under 2 of 255 either way, so leaves are
  neither thinned nor thickened.

### Flames

A flame is a flat material (`lay == 101` in `STATIC`), and was one colour so bright it came out white: a torch's cone
a paper hat, a candle's a yellow diamond. It's now white-hot where it faces you and deepens to the orange of its own
light toward its rim, with a lick running up it. A lantern's pane seen square on is as bright as before.

### The dark under whoever stands on the ground

Where the sun casts no shadow (Lisandra's cave, a room, the night, the shade of a wood) nothing tied a body to the
floor. `underfoot` in `shaders.js` keeps the sky's light, and three quarters of a lamp's, off the ground under the
twelve bodies nearest you (`writeFeet` in `renderer.js`): a soft round dark as wide as the body stands, from half a
metre under its soles to a hand's breadth over them. The sun's light is left alone: it has a shadow.

- Not under you, nor the dead, nor on a phone. It fades out by 30 m, or by the thirteenth body if more stand near.
- It's in `shadePBR`, so everything lit that way takes it (ground, floors, the bottom of a boot or a hem). Lisandra's
  own `shadeTrue` doesn't: the floor under her does.
- A pixel outside the square that holds all twelve pays six comparisons; inside it, a short loop.
- `renderer.noFeet = true` turns it off.

### The grass bends for whoever's nearest

The grass shader bends for six bodies. They were you and the first five in the world (the duel's two knights and
the crabs), wherever those were: a villager or a hero crossed a field without stirring it. They're now you and the
five nearest that are drawn, the townsfolk among them. (A phone's shader reads the first three.)

### Traps, taking pictures without a graphics card

- A harness that drops a frame's `queue.submit` to save time must drop only that: a texture's mips are made with a
  submit too. Dropped, every model that came in during play had only its first mip, and from any way off was a pale
  mirror. Two "bugs" (white doors at night, a blank doorway) were that.
- The kept shadow maps are "drawn" by dropped frames into nothing, and stay that way: before a real frame, set each
  kept cascade's `front` and `back` to null so it's made again, whole.
- A frame drawn by hand must do all the loop does: the doors near you are listed by the HUD's part of the frame.
- The phone tier's far cascade is drawn on alternate frames: take a picture after several real frames, not two.

### Seen and left

- The far countries' places (the abbey, the keep, the falls) are boxes and drums with a stone painting that repeats
  as a pattern across a tall wall. That's their modelling, not the engine.
- The pines far off are a brighter, more saturated green than the same trees near to, under the same light.

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

## Normal maps

Every normal map is read by `perturbD` in `src/gfx/shaders.js`, the glTF way: red along u, green up the picture (v runs
down it). The tangent frame is built from screen derivatives (no tangents in the meshes), and it comes out scaled by the
screen's handedness. WebGPU's window y runs down, so for a face toward the eye the raw frame points along -u and -v;
`sign(det)` turns it right. Until 2026-11-09 red was read backwards on every model, so folds, seams and bumps were lit
from the wrong side left to right; green happened to be right. Checked on a GPU with a camera-facing quad and a (1, .5)
and a (.5, 1) texel. `tests/render-models.test.mjs` pins it.

## Metal maps from the armour tool

`tools/armor/rig_armor.py` makes a metal/roughness map from the paint alone (`derive_pbr`). Until 2026-11-09 it marked
every non-cloth texel 96% metal unless it was dark saturated leather, so skin, hair, leather and coloured cloth on the
43 heroes, Paladin Bellwright and the town knights were drawn as steel. ARMOR greys dark paint that's metal into
blackened plate, and metal takes no diffuse light, so faces came out nearly black. `paint_metal` now keeps metal for
greys (steel) and gold, and nothing else; `tools/armor/fix_metal.py` rewrote the shipped models' maps with it (the
paint and normal maps untouched). Townsfolk have their own maps and were fine.

## One sample a pixel on a full tier (2026-11-10)

`buildTargetSet` in `renderer.js` gave the linear-depth target a resolve target whatever the sample count, so a full tier
(not `lean`) drawn with one sample a pixel, as after `dropMSAA`, failed every frame ("cannot set a resolve target when the
color attachment has a sample count of 1"). Only phones have a governor that drops MSAA, and they're lean, so no player
met it; a review on a software GPU did. With one sample the depth is now drawn straight into its texture.
