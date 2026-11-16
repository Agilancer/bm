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
