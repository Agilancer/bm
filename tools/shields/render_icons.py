"""Run inside Blender, through Blender MCP, after separate.py: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Renders the inventory icons of the shields to assets/game/items/icons on a clear background, in the Shields scene, face on.
"""
import math
import os
import runpy

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ICONS = os.path.join(ROOT, "assets", "game", "items", "icons")
setup = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))["setup"]
SIZE = (288, 432)      # two cells by three, at 3x


def main():
    sc = bpy.data.scenes["Shields"]
    keep = bpy.context.window.scene
    bpy.context.window.scene = sc
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
    shields = [o for o in sc.objects if o.type == "MESH"]
    for o in shields:
        o.hide_render = True
    for ob in shields:
        ob.hide_render = False
        at = ob.location.copy()
        ob.location = (0, 0, 0)
        bpy.context.view_layer.update()
        zs = [v.co.z for v in ob.data.vertices]
        xs = [v.co.x for v in ob.data.vertices]
        cam.data.ortho_scale = max((max(zs) - min(zs)) * 1.04, (max(xs) - min(xs)) * 1.04 * SIZE[1] / SIZE[0])
        # From +Y, the way the face looks.
        cam.location = ((max(xs) + min(xs)) / 2, 3, (max(zs) + min(zs)) / 2)
        cam.rotation_euler = (math.pi / 2, 0, math.pi)
        sc.render.filepath = os.path.join(ICONS, f"{ob.name}.webp")
        bpy.ops.render.render(write_still=True)
        ob.location = at
        ob.hide_render = True
    for o in shields:
        o.hide_render = False
    bpy.context.window.scene = keep
    print(len(shields), "icons")


if __name__ == "__main__":
    main()
