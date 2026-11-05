"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Separates the two sheets of twelve jawless skulls in F:/!    BM V2/! TRIPO MODELS/Objects for Scenes into one object each, in a scene of their own, and
writes assets/game/interior/skulls.json: for each of the 24, its triangles at two levels of detail (positions, normals, uvs on its sheet's map), in the frame
tools/interior/build_interior.py lays them down in: 0.21 m front to back at its largest, sitting on y = 0, looking along +z (metres, y up). Then the
sheets' maps for the atlas layers: run tools/skulls/maps.py.
"""
import json
import math
import os

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCENE = "Skulls"
SOURCE = r"F:\!    BM V2\! TRIPO MODELS\Objects for Scenes"
SHEETS = [("SKULLS - NO JAWS 1.glb", "skulls_a"), ("SKULLS - NO JAWS 2.glb", "skulls_b")]
# The sheets' four columns and three rows.
COLS, ROWS = (-0.26, 0.0, 0.26), (0.32, 0.65)
LENGTH = 0.205    # a real cranium, brow to back, jawless. (About 0.15 wide and 0.14 high.)
TRIS = (260, 90)  # near, and for the skulls packed into a wall that are never seen up close
ROUND = 4


def cell(c):
    col = sum(c.x > g for g in COLS)
    row = sum(c.z < g for g in ROWS[::-1])   # top row first
    return row * 4 + col


def separate_one(scene, source, keep, name):
    me = source.data.copy()
    me.name = name
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if cell(f.calc_center_median()) != keep], context="FACES")
    bm.to_mesh(me)
    bm.free()
    pts = [v.co.copy() for v in me.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    k = LENGTH / (hi.y - lo.y)
    mid = (lo + hi) / 2
    for v in me.vertices:
        v.co = Vector(((v.co.x - mid.x) * k, (v.co.y - mid.y) * k, (v.co.z - lo.z) * k))
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    print(f"{name}: {len(me.polygons)} faces, {(hi.x - lo.x) * k:.3f} wide, {(hi.y - lo.y) * k:.3f} long, {(hi.z - lo.z) * k:.3f} high")
    return ob


def tris_of(ob, target):
    """Its triangles cut down to target, in the game's axes: y up, the face looking along +z."""
    dg = None
    mod = ob.modifiers.new("cut", "DECIMATE")
    mod.ratio = min(1.0, target / len(ob.data.polygons))
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    me.calc_loop_triangles()
    uv = me.uv_layers.active.data
    me.corner_normals
    p, n, t = [], [], []
    for tri in me.loop_triangles:
        for l in tri.loops:
            v = me.vertices[me.loops[l].vertex_index].co
            nn = me.corner_normals[l].vector
            p += [round(v.x, ROUND), round(v.z, ROUND), round(-v.y, ROUND)]
            n += [round(nn.x, 3), round(nn.z, 3), round(-nn.y, 3)]
            t += [round(uv[l].uv.x, 4), round(1 - uv[l].uv.y, 4)]
    count = len(me.loop_triangles)
    ev.to_mesh_clear()
    ob.modifiers.remove(mod)
    return {"p": p, "n": n, "uv": t, "tris": count}


def separate():
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    out = []
    for s, (file, layer) in enumerate(SHEETS):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE, file))
        new = [o for o in bpy.data.objects if o not in before]
        source = next(o for o in new if o.type == "MESH")
        for k in range(12):
            ob = separate_one(scene, source, k, f"skull_{s + 1}_{k + 1:02d}")
            ob.location = ((k % 4) * 0.3 + s * 1.5, 0, (k // 4) * 0.25)
            ob.data.shade_smooth()
            out.append({"name": ob.name, "layer": layer, "lod": [tris_of(ob, t) for t in TRIS]})
        for o in new:
            bpy.data.objects.remove(o)
    path = os.path.join(ROOT, "tools", "build", "skulls.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(path, round(os.path.getsize(path) / 1048576, 2), "MB", [x["lod"][0]["tris"] for x in out][:4], [x["lod"][1]["tris"] for x in out][:4])


if __name__ == "__main__":
    separate()
