"""Render static item GLBs from the side and front (background Blender), for checking.

Usage: blender -b --factory-startup -P render_items.py -- OUT_DIR GLB [GLB...]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
out, files = argv[0], argv[1:]
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "TEXTURE"
sc.render.resolution_x, sc.render.resolution_y = 256, 384
for f in files:
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=f)
    ms = [o for o in bpy.data.objects if o.type == "MESH" and len(o.data.vertices) > 50]
    pts = [o.matrix_world @ Vector(c) for o in ms for c in o.bound_box]
    mn = Vector([min(p[i] for p in pts) for i in range(3)])
    mx = Vector([max(p[i] for p in pts) for i in range(3)])
    c = (mn + mx) / 2
    cam_d = bpy.data.cameras.new("c")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = max(mx - mn) * 1.1
    cam = bpy.data.objects.new("cam", cam_d)
    sc.collection.objects.link(cam)
    sc.camera = cam
    name = os.path.splitext(os.path.basename(f))[0]
    for tag, d in (("side", Vector((0, -1, 0))), ("edge", Vector((1, 0, 0)))):
        cam.location = c + d * 5
        cam.rotation_euler = (math.pi / 2, 0, math.atan2(d.x, -d.y))
        sc.render.filepath = os.path.join(out, f"{name}__{tag}.png")
        bpy.ops.render.render(write_still=True)
