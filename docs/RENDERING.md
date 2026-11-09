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

- `assets/game/lisandra/witch.glb` is back to the file from commit d6a0f3d (2026-11-06). That is the owner's
  `LISANDRA - UGLY OLD WITCH.glb` mesh, skin weights, bind pose and textures, byte for byte. It has the same 175 clips
  (checked against the cloth version, which only added cloth-bone channels) and the `_SKIRT` mask. It has 65 joints
  and no `cloth_*` bones.
- Her form in `src/core/lisandra.js` has no `cloth` entry, so `village-walker.js` makes no `Cloth`. `src/sim/cloth.js`
  and `tools/lisandra/cloth_rig.py` are kept but unused.
- The skinning shader's 9 mm skirt ripple is turned off for her alone. `renderer.js` writes `skinParams[7] = 1` for
  bodies with `stillSkirt` (Lisandra's forms) and 0 for everyone else, and sets it back to 0 before the townsfolk and
  the arms. In `SKIN` the ripple is multiplied by `(1.0 - P.wind.w)`, which is exactly 1 for everyone else, so the
  townsfolk's skirts come out the same to the bit.
- The `_SKIRT` leg-clearance push stays. It only moves the gown when a leg would cut through it, as when she walks.

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

## How "nothing else changed" was checked

- Every WGSL module the game compiles was fingerprinted on main and on the branch, using a test harness that wraps
  `createShaderModule`. Main compiles 30 modules; 29 are byte-identical on the branch. The skinning shader changed
  only by the `(1.0 - P.wind.w)` factor, which is exactly 1 for everyone but Lisandra. The only new module is
  `ARMOR_TRUE`.
- `tests/render-models.test.mjs`:
  - takes the three swaps back out of `ARMOR_TRUE` and gets `ARMOR` character for character;
  - checks that `ARMOR` has none of the new code;
  - checks the cascade test never drops a sphere that touches the square;
  - checks the witch file has no cloth bones and still has 175 clips.
- All test files pass. Run each on its own: `node --test tests/<file>`.

Still to do: a human look in the game. The cave and ledge shots with the new shading haven't been compared side by side
with Tripo's viewer yet, and the phone (Mobile tier) is untested.
