"""A second opinion from Blender's own glTF importer: the armature and clips arrive whole, and the tip
is on the X at each hit. Blender's world is the eye's frame (x right, y ahead, z up), so "on the X" is
x and z both zero. On a one-hander it also tests the skinned mesh itself, frame by frame, for the pommel showing
through the skin: mostly inside the arm, with the rest in sight from the eye.

    blender -b --factory-startup --python tools/fp_arms/blender_check.py -- [2h|1h]
"""
import json
import math
import os
import struct
import sys

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

MODEL = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "2h"
GLB = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "assets", "fp", f"arms_{MODEL}.glb")
raw = open(GLB, "rb").read()
meta = json.loads(raw[20:20 + struct.unpack("<I", raw[12:16])[0]])["scenes"][0]["extras"]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB, bone_heuristic="BLENDER")
scene = bpy.context.scene
arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.vertex_groups)
print(f"armature {arm.name}: {len(arm.data.bones)} bones; mesh {mesh.name}: {len(mesh.data.vertices)} verts, "
      f"{len(mesh.vertex_groups)} vertex groups, {len(mesh.data.materials)} material(s), {len(bpy.data.actions)} actions")
fps = scene.render.fps / scene.render.fps_base
if arm.animation_data is None:
    arm.animation_data_create()
for tr in list(arm.animation_data.nla_tracks):
    arm.animation_data.nla_tracks.remove(tr)
worst = 0.0
for name, ev in meta["clips"].items():
    if ev.get("loop") or ev.get("hit") is None:
        continue
    act = next(a for a in bpy.data.actions if a.name.startswith(name))
    arm.animation_data.action = act
    if hasattr(arm.animation_data, "action_suitable_slots") and arm.animation_data.action_suitable_slots:
        arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
    f = ev["hit"] * fps
    scene.frame_set(int(f), subframe=f - int(f))
    bpy.context.view_layer.update()
    tip = arm.matrix_world @ arm.pose.bones["weapon_tip"].head
    miss = max(abs(tip.x), abs(tip.z)) / max(tip.y, 1e-6)
    worst = max(worst, miss)
    print(f"{name:17s} tip at the hit: x {tip.x:+.4f}  ahead {tip.y:.3f}  up {tip.z:+.4f}  (off the X by {miss:.5f} of its distance)")
POKE_MAX = 3      # of the frames sampled below (one in two): this many at most, a speck's too brief to catch
failed = worst >= 0.003
if meta["sword"].get("pommel") is not None:
    sword = bpy.data.objects[meta["sword"]["id"]]
    pommel = [v.co.copy() for v in sword.data.vertices if v.co.z < meta["sword"]["pommel"] + 0.04]
    ray = Vector((0.31, 0.27, 0.91)).normalized()
    fy = 1 / math.tan(math.radians(meta["view"]["fov"]) / 2)
    fx = fy / (16 / 9)

    def inside(bvh, p):
        crossed, o = 0, p.copy()
        for _ in range(14):
            hit = bvh.ray_cast(o, ray)
            if hit[0] is None:
                return crossed % 2 == 1
            crossed += 1
            o = hit[0] + ray * 1e-4
        return crossed % 2 == 1

    def in_sight(bvh, p):
        if p.y < 0.05 or abs(fx * p.x / p.y) > 1 or abs(fy * p.z / p.y) > 1:
            return False
        hit = bvh.ray_cast(Vector((0, 0, 0)), p.normalized(), p.length - 2e-3)
        return hit[0] is None

    for name, ev in meta["clips"].items():
        act = next(a for a in bpy.data.actions if a.name == name)
        arm.animation_data.action = act
        if hasattr(arm.animation_data, "action_suitable_slots") and arm.animation_data.action_suitable_slots:
            arm.animation_data.action_slot = arm.animation_data.action_suitable_slots[0]
        pokes = []
        for k in range(int(ev["duration"] * 30) + 1):
            f = k / 30 * fps
            scene.frame_set(int(f), subframe=f - int(f))
            dg = bpy.context.evaluated_depsgraph_get()
            me = mesh.evaluated_get(dg)
            bm = bmesh.new()
            bm.from_object(me, dg)
            bm.transform(me.matrix_world)
            bvh = BVHTree.FromBMesh(bm)
            M = sword.evaluated_get(dg).matrix_world
            pts = [M @ c for c in pommel]
            ins = [inside(bvh, q) for q in pts]
            if sum(ins) >= 0.5 * len(pts) and any(in_sight(bvh, q) for q, i in zip(pts, ins) if not i):
                pokes.append(k / 30)
            bm.free()
        if pokes:
            print(f"{name:17s} pommel through the skin, in sight, on {len(pokes)} frames: {', '.join(f'{t:.2f}' for t in pokes)} s")
        if len(pokes) > POKE_MAX:
            failed = True
print("BLENDER_CHECK", "FAILED" if failed else "OK")
