"""A second opinion from Blender's own glTF importer: the armature and clips arrive whole, and the tip
is on the X at each hit. Blender's world is the eye's frame (x right, y ahead, z up), so "on the X" is
x and z both zero.

    blender -b --factory-startup --python tools/fp_arms/blender_check.py
"""
import json
import os
import struct

import bpy

GLB = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "assets", "fp", "arms_2h.glb")
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
    if ev.get("loop"):
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
    print(f"{name:14s} tip at the hit: x {tip.x:+.4f}  ahead {tip.y:.3f}  up {tip.z:+.4f}  (off the X by {miss:.5f} of its distance)")
print("BLENDER_CHECK", "OK" if worst < 0.003 else f"FAILED {worst}")
