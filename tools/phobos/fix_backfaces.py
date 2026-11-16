"""Mend the inside-out scraps a Meshy body shows through the gaps between its pieces.  Background Blender:

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/fix_backfaces.py -- <in.glb> <out.glb> <out_texture.png> [step_mm] [flip]

Meshy's meshes are hundreds of overlapping pieces. Where two don't quite meet, the eye lands on the inside of a piece
a few millimetres deeper: a face seen from its back, painted the dark colour Meshy gives insides (the specks by
Apricot's nose and eyes, the slivers on Louis G's cheek). Here the body is looked at from 26 directions, a ray every
`step_mm` (default 1.5). A face that is only ever seen from its back is turned to face out and painted the colour of
the right-way-round faces seen next to it at the same depth. Nothing else changes: no vertex moves, no other texel.
Writes the body (same rig and weights) and its whole base-colour texture; put the texture in with glb_swap_texture.py.
"""
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT, TEX = argv[:3]
STEP = float(argv[3]) / 1000 if len(argv) > 3 else 0.0015
FLIP_ONLY = "flip" in argv[4:]  # only turn the faces; leave the paint (a second pass, after weld_fill.py rewound some)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and not o.find_armature():
        bpy.data.objects.remove(o)
mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = mesh.find_armature()
me = mesh.data
mw = mesh.matrix_world
V = [mw @ v.co for v in me.vertices]
polys = [tuple(p.vertices) for p in me.polygons]
N = np.array([tuple((mw.to_3x3() @ p.normal).normalized()) for p in me.polygons], np.float32)
bvh = BVHTree.FromPolygons(V, polys)
P = np.array([tuple(v) for v in V], np.float32)

# Each face's colour: the texture at the middle of its UVs.
img = next(n for n in me.materials[0].node_tree.nodes if n.type == "TEX_IMAGE").image
TW, TH = img.size
px = np.empty(TW * TH * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(TH, TW, 4)
uvl = me.uv_layers[0].data
UV = np.array([[tuple(uvl[li].uv) for li in p.loop_indices][:3] for p in me.polygons], np.float32)  # (F, 3, 2)
uc = UV.mean(1)
FC = px[np.clip((uc[:, 1] * TH).astype(int), 0, TH - 1), np.clip((uc[:, 0] * TW).astype(int), 0, TW - 1), :3]

dirs = [Vector((x, y, z)).normalized() for x in (-1, 0, 1) for y in (-1, 0, 1) for z in (-1, 0, 1) if (x, y, z) != (0, 0, 0)]
front = np.zeros(len(polys), np.int32); back = np.zeros(len(polys), np.int32)
views = []
for f in dirs:
    r = f.cross(Vector((0, 0, 1)))
    r = r.normalized() if r.length > 1e-6 else Vector((1, 0, 0))
    u = r.cross(f).normalized()
    a = P @ np.array(r, np.float32); b = P @ np.array(u, np.float32); c = P @ np.array(f, np.float32)
    a0, b0, c0 = a.min(), b.min(), c.min() - 0.5
    na, nb = int((a.max() - a0) / STEP) + 1, int((b.max() - b0) / STEP) + 1
    idx = np.full((nb, na), -1, np.int32); dep = np.zeros((nb, na), np.float32)
    cast = bvh.ray_cast
    for j in range(nb):
        o = r * float(a0) + u * float(b0 + (j + 0.5) * STEP) + f * float(c0)
        st = r * STEP
        o = o + st * 0.5
        for i in range(na):
            loc, nor, k, d = cast(o, f)
            if k is not None:
                idx[j, i] = k; dep[j, i] = d
            o = o + st
    hit = idx >= 0
    isback = np.zeros_like(hit); isback[hit] = (N[idx[hit]] @ np.array(f, np.float32)) > 0
    np.add.at(back, idx[hit & isback], 1); np.add.at(front, idx[hit & ~isback], 1)
    views.append((idx, dep, isback))
    print("BACKFIX view", tuple(round(x, 2) for x in f), "rays hit", int(hit.sum()), "from the back", int(isback.sum()), flush=True)

bad = (back > 0) & (front == 0)
print("BACKFIX faces only ever seen from the back:", int(bad.sum()), "of", len(polys))
# Their colour: the right-way-round faces seen within 5 rays of them, at most 2 cm nearer or deeper.
col = np.zeros((len(polys), 3), np.float64); cnt = np.zeros(len(polys))
K = 5
for idx, dep, isback in views:
    ys, xs = np.where((idx >= 0) & bad[np.maximum(idx, 0)])
    for y, x in zip(ys, xs):
        y0, y1, x0, x1 = max(y - K, 0), y + K + 1, max(x - K, 0), x + K + 1
        ni = idx[y0:y1, x0:x1]; nd = dep[y0:y1, x0:x1]
        ok = (ni >= 0) & ~isback[y0:y1, x0:x1] & (np.abs(nd - dep[y, x]) < 0.02)
        ok &= ~bad[np.maximum(ni, 0)]
        if ok.any():
            col[idx[y, x]] += FC[ni[ok]].mean(0); cnt[idx[y, x]] += 1
have = bad & (cnt > 0) & (not FLIP_ONLY)
col[have] /= cnt[have][:, None]
print("BACKFIX painted", int(have.sum()), "left as they are (nothing right-way-round beside them)", int((bad & ~have).sum()))

# Paint each one's UV triangle (and a texel around it) its colour.
for k in np.where(have)[0]:
    t = UV[k] * (TW, TH)
    x0, y0 = np.floor(t.min(0) - 1.5).astype(int); x1, y1 = np.ceil(t.max(0) + 1.5).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, TW - 1), min(y1, TH - 1)
    if x1 < x0 or y1 < y0:
        continue
    gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    q = np.stack([gx + 0.5, gy + 0.5], -1).astype(np.float32)
    A, B_, C = t
    den = (B_[1] - C[1]) * (A[0] - C[0]) + (C[0] - B_[0]) * (A[1] - C[1])
    if abs(den) < 1e-9:
        px[y0:y1 + 1, x0:x1 + 1, :3] = col[k]
        continue
    l1 = ((B_[1] - C[1]) * (q[..., 0] - C[0]) + (C[0] - B_[0]) * (q[..., 1] - C[1])) / den
    l2 = ((C[1] - A[1]) * (q[..., 0] - C[0]) + (A[0] - C[0]) * (q[..., 1] - C[1])) / den
    l3 = 1 - l1 - l2
    # (Inside, or within about a texel and a half of an edge.)
    e = 1.5 / max(np.sqrt(abs(den)), 1.0)
    inside = (l1 > -e) & (l2 > -e) & (l3 > -e)
    px[y0:y1 + 1, x0:x1 + 1, :3][inside] = col[k]
out = bpy.data.images.new("fixed", TW, TH, alpha=False)
out.pixels.foreach_set(px.ravel()); out.filepath_raw = TEX; out.file_format = "PNG"; out.save()

# Turn them to face out.
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
bmesh.ops.reverse_faces(bm, faces=[bm.faces[int(k)] for k in np.where(bad)[0]])
bm.to_mesh(me); bm.free()
for o in sc.objects:
    o.select_set(o in (mesh, arm))
bpy.context.view_layer.objects.active = arm
kw = dict(filepath=OUT, export_format="GLB", use_selection=True, export_skins=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animations=False)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("BACKFIX wrote", OUT, TEX)
