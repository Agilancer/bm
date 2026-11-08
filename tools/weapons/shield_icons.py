"""Renders the new shields' inventory icons into assets/game/items/icons, face on, as tools/shields/render_icons.py does the old
kites. Runs in background Blender, so nothing lands in a live scene:

    blender -b --factory-startup -P tools/weapons/shield_icons.py -- [id ...]      (no ids: every shield in sheets.py)
"""
import math
import os
import runpy
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from sheets import SHEETS  # noqa: E402

ICONS = os.path.join(ROOT, "assets", "game", "items", "icons")
setup = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))["setup"]
SIZE = (288, 432)      # two cells by three, at 3x


def main():
    want = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ids = [i for s in SHEETS if s["kind"] in ("kite", "tower") for i, _ in s["items"] if not want or i in want]
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o)
    cam, lights = setup(sc)
    sc.cycles.samples = 24
    sc.render.resolution_x, sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "WEBP"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = 92
    sc.render.use_file_extension = False
    for so, base in zip(lights, (150, 215)):
        so.rotation_euler = (so.rotation_euler[0], 0, math.radians(base))
    for name in ids:
        before = set(sc.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "assets", "game", "items", f"{name}.glb"))
        new = [o for o in sc.objects if o not in before]
        ob = next(o for o in new if o.type == "MESH")
        pts = [ob.matrix_world @ Vector(v.co) for v in ob.data.vertices]
        xs, zs = [p.x for p in pts], [p.z for p in pts]
        cam.data.ortho_scale = max((max(zs) - min(zs)) * 1.04, (max(xs) - min(xs)) * 1.04 * SIZE[1] / SIZE[0])
        # From +Y, the way the face looks (glTF's -Z).
        cam.location = ((max(xs) + min(xs)) / 2, 3, (max(zs) + min(zs)) / 2)
        cam.rotation_euler = (math.pi / 2, 0, math.pi)
        sc.render.filepath = os.path.join(ICONS, f"{name}.webp")
        bpy.ops.render.render(write_still=True)
        for o in new:
            bpy.data.objects.remove(o)
        print("icon", name, flush=True)


if __name__ == "__main__":
    main()
