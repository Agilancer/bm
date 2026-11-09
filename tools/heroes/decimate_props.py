"""Decimate kit.py's prepared props (run inside background Blender).

Reads SRC/<id>.npz (P, F, UV in glTF axes) and SRC/../plan.json (triangles per prop), welds the seams so the collapse
doesn't tear them open, collapses to the budget and writes DEC/<id>.npz: P, N, UV, F, one vertex per corner that
differs in position, uv or crease. No axis change: the mesh never leaves glTF space.

Usage: blender -b --factory-startup -P decimate_props.py -- SRC DEC
"""
import json
import os
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, dec = argv[0], argv[1]
plan = json.load(open(os.path.join(os.path.dirname(src.rstrip("/\\")), "plan.json")))
os.makedirs(dec, exist_ok=True)
for item, p in plan.items():
    d = np.load(os.path.join(src, item + ".npz"))
    P, F, UV = d["P"], d["F"], d["UV"]
    me = bpy.data.meshes.new(item)
    me.from_pydata(P.tolist(), [], F.tolist())
    uvl = me.uv_layers.new()
    uvl.data.foreach_set("uv", np.c_[UV[F.ravel(), 0], 1 - UV[F.ravel(), 1]].ravel())
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-5)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(item, me)
    bpy.context.scene.collection.objects.link(ob)
    n0 = len(me.polygons)
    if n0 > p["tris"]:
        m = ob.modifiers.new("dec", "DECIMATE")
        m.decimate_type = "COLLAPSE"
        m.ratio = p["tris"] / n0
        m.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    m2 = ev.to_mesh()
    m2.calc_loop_triangles()
    nv, nl = len(m2.vertices), len(m2.loops)
    co = np.empty(nv * 3)
    m2.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    luv = np.empty(nl * 2)
    m2.uv_layers.active.data.foreach_get("uv", luv)
    luv = luv.reshape(-1, 2)
    lvi = np.empty(nl, np.int64)
    m2.loops.foreach_get("vertex_index", lvi)
    lnr = np.empty(nl * 3)
    try:
        m2.corner_normals.foreach_get("vector", lnr)
    except AttributeError:
        m2.loops.foreach_get("normal", lnr)
    lnr = lnr.reshape(-1, 3)
    # Faces' own normals for the corners: a crease stays a crease where the faces meet at a sharp angle.
    fn = np.empty(len(m2.polygons) * 3)
    m2.polygons.foreach_get("normal", fn)
    fn = fn.reshape(-1, 3)
    lpoly = np.empty(nl, np.int64)
    ls = np.empty(len(m2.polygons), np.int64)
    m2.polygons.foreach_get("loop_start", ls)
    lt = np.empty(len(m2.polygons), np.int64)
    m2.polygons.foreach_get("loop_total", lt)
    lpoly = np.repeat(np.arange(len(m2.polygons)), lt)
    # Smooth by vertex, unless the face turns more than ~40 degrees from the vertex's mean.
    vn = np.zeros((nv, 3))
    np.add.at(vn, lvi, fn[lpoly])
    vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-9)
    sharp = (vn[lvi] * fn[lpoly]).sum(1) < 0.77
    cn = np.where(sharp[:, None], fn[lpoly], vn[lvi])
    key = np.c_[lvi, np.round(luv * 8192).astype(np.int64), np.round(cn * 8).astype(np.int64)]
    uniq, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    tl = np.empty(len(m2.loop_triangles) * 3, np.int64)
    m2.loop_triangles.foreach_get("loops", tl)
    nrm = np.zeros((len(uniq), 3))
    np.add.at(nrm, inv, cn)
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    np.savez(os.path.join(dec, item + ".npz"), P=co[lvi[first]].astype(np.float32), N=nrm.astype(np.float32),
             UV=np.c_[luv[first, 0], 1 - luv[first, 1]].astype(np.float32), F=inv[tl].reshape(-1, 3).astype(np.int32))
    print(f"DONE {item}: {n0} -> {len(m2.loop_triangles)}")
    ev.to_mesh_clear()
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.meshes.remove(me)
