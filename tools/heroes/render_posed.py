"""Render built heroes posed in a few clips, for checking (background Blender).

Usage: blender -b --factory-startup -P render_posed.py -- OUT_DIR CLIPS(comma) FRAME_FRAC GLB [GLB...]
Writes OUT_DIR/<name>__<clip>__<view>.png
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
out, clips, frac, files = argv[0], argv[1].split(","), float(argv[2]), argv[3:]
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x, sc.render.resolution_y = 360, 480
for f in files:
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    bpy.ops.import_scene.gltf(filepath=f)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    name = os.path.splitext(os.path.basename(f))[0]
    cam_d = bpy.data.cameras.new("c")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = 2.5
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    for clip in clips:
        act = bpy.data.actions.get(clip)
        if act is None:
            act = next((a for a in bpy.data.actions if a.name.startswith(clip)), None)
        if act is not None:
            arm.animation_data_create()
            arm.animation_data.action = act
            try:
                slot = act.slots[0]
                arm.animation_data.action_slot = slot
            except Exception:
                pass
            r = act.frame_range
            sc.frame_set(int(r[0] + (r[1] - r[0]) * frac))
        c = Vector((0, 0, 1.0))
        for tag, d in (("front", Vector((0, -1, 0))), ("side", Vector((1, 0, 0))), ("back", Vector((0, 1, 0)))):
            cam.location = c + d * 6
            cam.rotation_euler = (math.pi / 2, 0, math.atan2(d.x, -d.y))
            sc.render.filepath = os.path.join(out, f"{name}__{clip}__{tag}.png")
            bpy.ops.render.render(write_still=True)
