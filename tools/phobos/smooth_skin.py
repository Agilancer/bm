"""Calm the crumpled shading on a Meshy face: drop the little flaps that stick out of it, and give the skin smooth normals.

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/smooth_skin.py -- <in.glb> <out.glb> [radius_mm]

After tools/phobos/weld_fill.py. Meshy's skin is still a little crumpled: facets a few millimetres across tilted off
the surface, which catch the light as pale flakes and dark slivers (round Apricot's nose and mouth, on Louis G's cheek,
the flap on Martleboro's hood). On the head only (vertices the Head or Neck bone carries):
  1. each face gets the area-weighted average normal of the faces within `radius_mm` (default 7) of it;
  2. where its neighbours agree with each other (a flat, calm patch) but the face itself is turned more than 70 degrees
     from them, and there is other surface within 5 mm behind it, it is a flap: deleted;
  3. skin-coloured vertices take that averaged normal as their own (custom normals), so the face shades as one
     surface. Hair, cloth and everything below the neck keep their own shading. No vertex moves.
"""
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[:2]
RAD = (float(argv[2]) if len(argv) > 2 else 7.0) / 1000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and not o.find_armature():
        bpy.data.objects.remove(o)
mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = mesh.find_armature()
me = mesh.data
mw = mesh.matrix_world; m3 = mw.to_3x3()

gi = {g.index for g in mesh.vertex_groups if g.name in ("mixamorig:Head", "mixamorig:Neck")}
headw = np.array([sum(e.weight for e in v.groups if e.group in gi) for v in me.vertices])
img = next(n for n in me.materials[0].node_tree.nodes if n.type == "TEX_IMAGE").image
TW, TH = img.size
px = np.empty(TW * TH * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(TH, TW, 4)[..., :3]
# sRGB-ish values (the image's pixels are as stored): skin is red over green over blue, not too red.
vcol = np.zeros((len(me.vertices), 3), np.float32)
for lp in me.loops:
    u = me.uv_layers[0].data[lp.index].uv
    vcol[lp.vertex_index] = px[min(int(u.y * TH), TH - 1) % TH, min(int(u.x * TW), TW - 1) % TW]
r, g, b = vcol[:, 0], vcol[:, 1], vcol[:, 2]
skin = (r > 0.42) & (g > 0.25) & (r / np.maximum(g, 1e-3) > 1.08) & (r / np.maximum(g, 1e-3) < 1.62) & (g >= b * 0.98)


def survey():
    """Face centres, normals, areas (world) and each face's neighbourhood normal and how well the neighbours agree."""
    C = [mw @ p.center for p in me.polygons]
    N = np.array([tuple((m3 @ p.normal).normalized()) for p in me.polygons])
    A = np.array([p.area for p in me.polygons])
    onhead = np.array([min(headw[i] for i in p.vertices) > 0.5 for p in me.polygons])
    kd = KDTree(len(C))
    for i, c in enumerate(C):
        kd.insert(c, i)
    kd.balance()
    blur = np.zeros_like(N); agree = np.zeros(len(C))
    for i in np.where(onhead)[0]:
        ids = [k for _, k, _ in kd.find_range(C[i], RAD)]
        s = (N[ids] * A[ids, None]).sum(0); a = A[ids].sum()
        ln = np.linalg.norm(s)
        blur[i] = s / ln if ln > 1e-12 else N[i]
        agree[i] = ln / max(a, 1e-12)
    return C, N, blur, agree, onhead


C, N, blur, agree, onhead = survey()
bvh = BVHTree.FromPolygons([mw @ v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
flaps = []
for i in np.where(onhead & (agree > 0.8))[0]:
    if float(N[i] @ blur[i]) < 0.34:
        loc, nor, k, d = bvh.ray_cast(C[i] - Vector(blur[i]) * 0.0004, -Vector(blur[i]), 0.005)
        if k is not None and k != i:
            flaps.append(int(i))
print("SMOOTH flaps deleted", len(flaps))
if flaps:
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in flaps], context="FACES")
    bm.to_mesh(me); bm.free()
    gi = {g.index for g in mesh.vertex_groups if g.name in ("mixamorig:Head", "mixamorig:Neck")}
    headw = np.array([sum(e.weight for e in v.groups if e.group in gi) for v in me.vertices])
    vcol2 = np.zeros((len(me.vertices), 3), np.float32)
    for lp in me.loops:
        u = me.uv_layers[0].data[lp.index].uv
        vcol2[lp.vertex_index] = px[min(int(u.y * TH), TH - 1) % TH, min(int(u.x * TW), TW - 1) % TW]
    r, g, b = vcol2[:, 0], vcol2[:, 1], vcol2[:, 2]
    skin = (r > 0.42) & (g > 0.25) & (r / np.maximum(g, 1e-3) > 1.08) & (r / np.maximum(g, 1e-3) < 1.62) & (g >= b * 0.98)
    C, N, blur, agree, onhead = survey()

# Smooth normals for the head's skin: each vertex the average of its faces' neighbourhood normals.
for p in me.polygons:
    p.use_smooth = True
vn = np.array([tuple((m3 @ v.normal).normalized()) for v in me.vertices])
acc = np.zeros_like(vn); cnt = np.zeros(len(vn))
for i, p in enumerate(me.polygons):
    if onhead[i]:
        for v in p.vertices:
            acc[v] += blur[i]; cnt[v] += 1
use = skin & (headw > 0.5) & (cnt > 0)
ln = np.linalg.norm(acc, axis=1)
use &= ln > 1e-9
vn[use] = acc[use] / ln[use, None]
inv = m3.inverted()
me.normals_split_custom_set_from_vertices([tuple((inv @ Vector(n)).normalized()) for n in vn])
print("SMOOTH skin vertices given smooth normals", int(use.sum()), "of", len(vn))

for o in sc.objects:
    o.select_set(o in (mesh, arm))
bpy.context.view_layer.objects.active = arm
kw = dict(filepath=OUT, export_format="GLB", use_selection=True, export_skins=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animations=False)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("SMOOTH wrote", OUT)
