# tools/phobos: the Phobos characters (Apricot, Martleboro, Louis G)

Three Meshy models (raw rigged files: `art/phobos/models/<id>_meshy.glb`) made into townsfolk. Everything runs in a
background Blender (`blender -b --factory-startup --python-exit-code 1 -P <script> -- ...`) or plain Python. The order:

1. `meshy_to_folk.py <meshy.glb> <donor.glb> <out.glb>`: Meshy's rig renamed to the townsfolk's (`mixamorig:`), finger
   bones from a donor townsperson fitted to the mesh's own fingers, stray sliver faces deleted. Donors: Apricot the
   redhead, the brothers `MALE VILLAGER - WORKER 2.glb` (both in models.json's `src`).
2. Apricot only: `face_fix.py render`, `face_patch.py patch <dir> art/phobos/pics/apricot.png`, `face_fix.py bake`,
   `face_patch.py compose`: her face from the approved picture. The brothers: `face_patch.py blemish` for small marks.
3. `fix_backfaces.py <in.glb> <out.glb> <out_tex.png>`: faces only ever seen from behind (through gaps) are turned and
   painted the colour beside them. Then `glb_swap_texture.py` puts the texture in.
4. `weld_fill.py <in.glb> <out.glb>`: UV seams welded (Meshy's "hundreds of pieces" are mostly seams cut open), all
   faces wound one way, small holes filled, smooth normals.
5. Apricot: `paint_eyes.py <dir> tools/phobos/apricot_eyes.json` after a `face_fix.py render`, then `face_fix.py bake`
   and `face_patch.py compose`: her eyes. `grade_skin.py`: her skin warmed toward Tamsin's.
6. `pad_texture.py`: the atlas's black background filled from its islands (mipmaps pulled black into every edge).
7. `fix_backfaces.py ... 1.5 flip`: a last pass that only turns faces (the weld rewinds some).
8. `glb_swap_texture.py` -> `art/phobos/models/<id>.glb`, which `tools/folk/models.json` names with `"repo": true`,
   `"keep_uv": true` (no UV re-lay: it lands on hidden dark layers), `"calm_head": 0.008` (head faces turned to agree
   with their neighbours, head normals averaged over 8 mm: Meshy's skin is crumpled) and 32000 tris (no cut: the
   decimation tears Meshy's tiny UV islands). Then `tools/folk/build_folk.py -- <ids>` and `tools/folk/paint.py <ids>`.

Checks: `hand_check.py` (fists), `render_front.py` (lit turnarounds), `tools/folk/viewer.html?ids=...` on the
`bm-phobos` dev server; `folkView.size/freeze/shot` there save frames to `tools/build/shots/`, and
`review_sheets.py <round>` lays them out in `art/phobos/review/`.

Dead ends, so nobody retries them: voxel remesh (the skin is open sheets, it collapses); deleting "flap" faces by
angle (opens new holes); judging in Blender's lit render alone (the game culls or dims backward faces, Blender doesn't).

## The east (chunk 3)

The ground is code, not a tool's output: `src/core/east.js` (heights), `src/core/marches.js` (what stands on it),
`src/ui/firstsight.js` (the first-sight scene). To look at it without the game:

    node tools/phobos/east_profile.mjs art/phobos/east/grid.bin    # heights along the Throne Road, and a grid
    python tools/phobos/east_map.py                                # -> art/phobos/east/relief.jpg, relief_way.jpg

In the game (the `bm-phobos` launch entry, `?auto&noopening`): `bm.cmd(19, 0, x, z)` puts you at (x, z);
`bm.setCam({x, y, z, fx, fy, fz, ux, uy, uz})` holds a camera; `bm.shot('e1_name')` saves
`tools/build/shots/e1_name.png`; `python tools/phobos/east_sheet.py r3` makes the sheets from every `e<N>_*.png`
there. Wait about 7 s after a move for the land to be laid. `bm.firstSight(t)` plays the scene from t seconds.

Traps: files here are a mix of LF and CRLF, so a patch script must match the file's own line ends; anything stood in
`K.spots` must be standable (tests/sites-clear); nothing with a collider on a road; lairs need `lvl` or
`tools/autoplay/check.mjs` fails; a new country needs `COUNTRY_FACTIONS` and `COUNTRY_TEARS`.

## Grim skins: a different man in a townsperson's body

`python tools/phobos/grim_skin.py [ids] [--look DIR]` makes Phobos people out of the townsfolk's Tripo bodies, by the
recipes in `grim_skins.json` (the first: `ph_tallow`, Mordo Grisk the tallow-boiler, on Wes's body). Plain Python
(NumPy, SciPy, Pillow); no Blender. Each texel of the base's colour map is given the point of the body it paints, so
everything is placed on the body, not in the atlas: what each texel is (skin, hair and beard, linen, apron, trousers,
boots, gloves), each kind's new value and colour, soot, tallow and mud in 3D noise, and the face's marks from the
body's landmarks (`faces`). A recipe with `sculpt` also writes `<id>.glb`: the base body with the face's points moved
(brow, cheekbones, cheeks, nose, jaw); one with `normals` its own `<id>_n.webp` with the folds cut in. The swap in
`assets/game/folk/folk.json` names them (`glb`, `n`), and `src/gfx/folk.js` draws them in place of the base's. The
town's thread still poses by the base's glb: the skeleton and weights are the same.

- Landmarks: `tools/folk/viewer.html?flat&normals=0` draws a body unlit and unfiltered, so a probe texture whose
  colours are its own texel coordinates tells you which texels lie under any pixel.
- A face here is about 2.6-3.3 mm of skin a texel, and about 340 vertices: marks under ~6 mm smear, and a narrow gate
  on depth or facing shows as a facet. Keep marks broad and gates soft.
- Tripo leaves the odd triangle folded over on a head; drawn two-sided it's a dark nick (Wes's forehead "scar" is one,
  and is still on Wes himself). The sculpt unfolds any on the head, and gives every copy of a split vertex the same
  move, so no seam opens: the glb has as many open edges as its base.
- Reviews: `art/phobos/review/ph_tallow_rounds.jpg` (the three critic rounds beside Wes) and `ph_tallow_final.jpg`.
