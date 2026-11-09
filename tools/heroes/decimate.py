"""Decimate every armour part of the Tripo hero GLBs (run inside background Blender).

The hero sources are about 95k triangles each, cut into 10-157 parts (helm, torso, pauldrons, forearms, thighs, skirt,
boots, cape) with a texture per part. Each part is collapsed to a share of a per-hero triangle budget and written to
an .npz in glTF space: positions, normals, uvs, triangles, and its four strongest joint weights by Mixamo name.
build.py then rebuilds a GLB around them with the source's own skeleton and textures.

Usage: blender -b --factory-startup -P decimate.py -- SRC_DIR OUT_DIR [TRIS] [name filter, comma separated]
"""
import glob
import os
import re
import sys

import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src_dir, out_dir = argv[0], argv[1]
budget = int(argv[2]) if len(argv) > 2 else 22000
only = argv[3].split(",") if len(argv) > 3 else None
os.makedirs(out_dir, exist_ok=True)

for path in sorted(glob.glob(os.path.join(src_dir, "*.glb"))):
    name = os.path.splitext(os.path.basename(path))[0]
    if only and not any(k in name for k in only):
        continue
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes):
        bpy.data.meshes.remove(m)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.data.objects if o.type == "MESH"]
    total = sum(len(o.data.polygons) for o in meshes)
    ratio = min(1.0, budget / max(total, 1))
    out = {}
    for o in meshes:
        mat = o.active_material.name if o.active_material else ""
        mi = re.search(r"part_(\d+)_", mat)
        if not mi:
            continue  # the importer's stray sphere
        part = int(mi.group(1))
        # Small parts keep more of their shape: a buckle collapsed to a quarter is a blob.
        n0 = len(o.data.polygons)
        r = ratio if n0 * ratio > 400 else min(1.0, max(ratio, 400 / max(n0, 1)))
        if r < 0.999:
            mod = o.modifiers.new("dec", "DECIMATE")
            mod.decimate_type = "COLLAPSE"
            mod.ratio = r
            mod.use_collapse_triangulate = True
        dg = bpy.context.evaluated_depsgraph_get()
        ev = o.evaluated_get(dg)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = np.array(o.matrix_world)
        nv = len(me.vertices)
        co = np.empty(nv * 3)
        me.vertices.foreach_get("co", co)
        co = co.reshape(-1, 3) @ mw[:3, :3].T + mw[:3, 3]
        # Weights by group name, from the original object's groups (the decimated mesh keeps them per vertex).
        gnames = [g.name for g in o.vertex_groups]
        J = np.zeros((nv, 4), np.int32)
        Wt = np.zeros((nv, 4), np.float32)
        for vi, v in enumerate(me.vertices):
            gs = sorted(((g.weight, g.group) for g in v.groups if g.weight > 0), reverse=True)[:4]
            s = sum(w for w, _ in gs) or 1
            for k, (w, gi) in enumerate(gs):
                J[vi, k] = gi
                Wt[vi, k] = w / s
        uvl = me.uv_layers.active.data
        nl = len(me.loops)
        luv = np.empty(nl * 2)
        uvl.foreach_get("uv", luv)
        luv = luv.reshape(-1, 2)
        lvi = np.empty(nl, np.int64)
        me.loops.foreach_get("vertex_index", lvi)
        lnr = np.empty(nl * 3)
        try:
            me.corner_normals.foreach_get("vector", lnr)
        except AttributeError:
            me.loops.foreach_get("normal", lnr)
        lnr = lnr.reshape(-1, 3) @ mw[:3, :3].T
        # One output vertex per (vertex, uv): split along uv seams only.
        key = np.c_[lvi, np.round(luv * 8192).astype(np.int64)]
        uniq, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        inv = inv.ravel()
        tri_loops = np.empty(len(me.loop_triangles) * 3, np.int64)
        me.loop_triangles.foreach_get("loops", tri_loops)
        tris = inv[tri_loops].reshape(-1, 3)
        vsrc = lvi[first]
        nrm = np.zeros((len(uniq), 3))
        np.add.at(nrm, inv, lnr)
        nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
        b = co[vsrc]
        # Blender is z-up and its importer also turned the rig a quarter about the vertical: back to the source's own
        # mesh space (checked against every part's accessor bounds, within a millimetre).
        to_gl = lambda a: np.c_[-a[:, 1], a[:, 2], -a[:, 0]]
        out[f"p{part}"] = dict(pos=to_gl(b).astype(np.float32), nrm=to_gl(nrm).astype(np.float32),
                               uv=np.c_[luv[first, 0], 1 - luv[first, 1]].astype(np.float32),
                               tris=tris.astype(np.int32), joints=J[vsrc], weights=Wt[vsrc])
        out[f"p{part}"]["groups"] = np.array(gnames)
        ev.to_mesh_clear()
    flat = {}
    for k, d in out.items():
        for f, v in d.items():
            flat[f"{k}.{f}"] = v
    np.savez_compressed(os.path.join(out_dir, name + ".npz"), **flat)
    print(f"DONE {name}: {total} -> {sum(len(d['tris']) for d in out.values())} tris, {len(out)} parts")
