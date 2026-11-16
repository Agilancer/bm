"""Paint out dark chips on a face's skin: small faces much darker than the skin all round them.  Background Blender:

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/despeckle.py -- <in.glb> <out_texture.png> [top_m] [radius_mm]

What a camera-projected patch misses: scraps turned edge-on to the front (by a nostril, at a mouth corner, along a jaw
where a hood's green pokes through). On the head, below `top_m` metres above the Head joint (default 0.085: under the
eyes, so lashes, pupils and brows are safe): a face whose paint is under 62% as bright as the area-weighted median of
the faces within `radius_mm` (default 7), where at least 75% of that neighbourhood is light skin, has its UV triangle
painted that median. A moustache or a hood is dark with dark neighbours and is left alone. Writes the whole texture.
"""
import sys

import bpy
import numpy as np
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, TEX = argv[:2]
TOP = float(argv[2]) if len(argv) > 2 else 0.085
RAD = (float(argv[3]) if len(argv) > 3 else 7.0) / 1000

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
mesh = max((o for o in sc.objects if o.type == "MESH" and o.find_armature()), key=lambda o: len(o.data.vertices))
arm = mesh.find_armature(); me = mesh.data; mw = mesh.matrix_world
headz = (arm.matrix_world @ arm.data.bones["mixamorig:Head"].head_local).z
gi = {g.index for g in mesh.vertex_groups if g.name in ("mixamorig:Head", "mixamorig:Neck")}
hw = [sum(e.weight for e in v.groups if e.group in gi) for v in me.vertices]
img = next(n for n in me.materials[0].node_tree.nodes if n.type == "TEX_IMAGE").image
TW, TH = img.size
px = np.empty(TW * TH * 4, np.float32); img.pixels.foreach_get(px); px = px.reshape(TH, TW, 4)
uvl = me.uv_layers[0].data
ids = [p.index for p in me.polygons if min(hw[i] for i in p.vertices) > 0.5 and (mw @ p.center).z < headz + TOP]
UV = np.array([[tuple(uvl[li].uv) for li in me.polygons[i].loop_indices][:3] for i in ids], np.float32)
uc = UV.mean(1)
col = px[np.clip((uc[:, 1] * TH).astype(int), 0, TH - 1), np.clip((uc[:, 0] * TW).astype(int), 0, TW - 1), :3]
lum = col @ np.array([0.3, 0.59, 0.11], np.float32)
r, g, b = col[:, 0], col[:, 1], col[:, 2]
skin = (r > 0.5) & (r / np.maximum(g, 1e-3) > 1.1) & (r / np.maximum(g, 1e-3) < 1.6) & (g >= b * 0.98)
area = np.array([me.polygons[i].area for i in ids])
kd = KDTree(len(ids))
C = [mw @ me.polygons[i].center for i in ids]
for k, c in enumerate(C):
    kd.insert(c, k)
kd.balance()
fixed = 0
for k in range(len(ids)):
    near = [j for _, j, _ in kd.find_range(C[k], RAD) if j != k]
    if len(near) < 6:
        continue
    a = area[near]
    if (a * skin[near]).sum() < 0.75 * a.sum():
        continue
    sk = [j for j in near if skin[j]]
    med = np.median(col[sk], 0); ml = float(med @ np.array([0.3, 0.59, 0.11]))
    if lum[k] > 0.62 * ml:
        continue
    t = UV[k] * (TW, TH)
    x0, y0 = np.floor(t.min(0) - 1.5).astype(int); x1, y1 = np.ceil(t.max(0) + 1.5).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, TW - 1), min(y1, TH - 1)
    gy, gx = np.mgrid[y0:y1 + 1, x0:x1 + 1]
    A, B_, Cc = t
    den = (B_[1] - Cc[1]) * (A[0] - Cc[0]) + (Cc[0] - B_[0]) * (A[1] - Cc[1])
    if abs(den) < 1e-9:
        px[y0:y1 + 1, x0:x1 + 1, :3] = med
    else:
        qx, qy = gx + 0.5, gy + 0.5
        l1 = ((B_[1] - Cc[1]) * (qx - Cc[0]) + (Cc[0] - B_[0]) * (qy - Cc[1])) / den
        l2 = ((Cc[1] - A[1]) * (qx - Cc[0]) + (A[0] - Cc[0]) * (qy - Cc[1])) / den
        e = 1.5 / max(np.sqrt(abs(den)), 1.0)
        px[y0:y1 + 1, x0:x1 + 1, :3][(l1 > -e) & (l2 > -e) & (1 - l1 - l2 > -e)] = med
    fixed += 1
out = bpy.data.images.new("fixed", TW, TH, alpha=False)
out.pixels.foreach_set(px.ravel()); out.filepath_raw = TEX; out.file_format = "PNG"; out.save()
print("DESPECKLE faces painted", fixed, "of", len(ids), "head faces below the eyes")
