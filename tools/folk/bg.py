"""Run a snippet against the folk tools in a Blender of its own, with no window, so a Blender someone has a file open in
is left alone.

    blender --background --factory-startup --python tools/folk/bg.py -- SNIPPET.py [args...]

The snippet runs with `h` (tools/folk/hands.py), `RF` (tools/folk/rig_fit.py), `ROOT`, `ARGS`, and `shot(path, x, z, scale,
w, hgt, turn=0)`: the sheet's camera (straight on from -Y, or swung round by `turn`), drawn plain and lit as the viewport
draws solid, into a PNG.
"""
import math
import os
import sys

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

h = {"__file__": os.path.join(ROOT, "tools", "folk", "hands.py")}
exec(open(h["__file__"]).read(), h)
h["setroot"](ROOT)
RF = h["RF"]

for o in list(bpy.data.objects): bpy.data.objects.remove(o)
sc = bpy.context.scene
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"
sc.display.shading.color_type = "SINGLE"
sc.display.shading.single_color = (0.62, 0.62, 0.62)
sc.display.shading.show_cavity = True
sc.display.shading.show_shadows = False
if sc.world is None: sc.world = bpy.data.worlds.new("w")
sc.world.color = (0.05, 0.05, 0.05)
sc.render.film_transparent = False
sc.render.image_settings.file_format = "PNG"
sc.view_settings.view_transform = "Standard"


def shot(path, x, z, scale, w, hgt, turn=0.0, y=-12.0):
    cam = h["camera"](x, z, scale, w, hgt, y=y)
    if turn:
        cam.rotation_euler = (math.pi / 2, 0, turn)
        cam.location = (x + y * -math.sin(turn), y * math.cos(turn), z)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


if ARGS:
    exec(compile(open(ARGS[0]).read(), ARGS[0], "exec"), {"h": h, "RF": RF, "ROOT": ROOT, "ARGS": ARGS[1:], "shot": shot, "bpy": bpy, "__name__": "__main__"})
