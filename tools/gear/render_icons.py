"""Run inside Blender, through Blender MCP, after tools/gear/atlas.py: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Renders the inventory icons of the suits' pieces to assets/game/items/icons on a clear background, from the front, as they hang on the
ground: a pair of gauntlets side by side, fingers down.
"""
import contextlib
import io
import math
import os
import runpy

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ITEMS = os.path.join(ROOT, "assets", "game", "items")
setup = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))["setup"]
SCENE = "GearIcons"
TALL = {"chest", "legs", "feet"}     # two cells by three; the rest are two by two
IDS = [f"{s}_{p}" for s in ("knight", "t_purple", "t_silver", "t_pale", "t_white") for p in ("head", "chest", "shoulders", "hands", "legs", "feet")]


def main(only=None):
    sc = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    keep = bpy.context.window.scene
    bpy.context.window.scene = sc
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        cam, lights = setup(sc)
        sc.cycles.samples = 24
        sc.render.resolution_percentage = 100
        sc.render.image_settings.file_format = "WEBP"
        sc.render.image_settings.color_mode = "RGBA"
        sc.render.image_settings.quality = 90
        sc.render.use_file_extension = False
        for so, base in zip(lights, (150, 215)):
            so.rotation_euler = (so.rotation_euler[0], 0, math.radians(base))
        for name in (only or IDS):
            before = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=os.path.join(ITEMS, f"{name}.glb"))
            new = [o for o in bpy.data.objects if o not in before]
            ob = next(o for o in new if o.type == "MESH")
            for mat in ob.data.materials:
                bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
                # (No sky in the icon's world to reflect: a little metal, or it renders black.)
                for link in list(bsdf.inputs["Metallic"].links):
                    mat.node_tree.links.remove(link)
                bsdf.inputs["Metallic"].default_value = 0.3
            xs, zs = [v.co.x for v in ob.data.vertices], [v.co.z for v in ob.data.vertices]
            w, h = max(xs) - min(xs), max(zs) - min(zs)
            tall = name.rsplit("_", 1)[1] in TALL
            sc.render.resolution_x, sc.render.resolution_y = (288, 432) if tall else (288, 288)
            cam.data.ortho_scale = max(h, w * sc.render.resolution_y / sc.render.resolution_x) * 1.06 if tall else max(w, h) * 1.06
            # From the front, a little to one side, so it has some depth to it.
            cam.location = ((max(xs) + min(xs)) / 2 + 0.6, -3, (max(zs) + min(zs)) / 2 + 0.4)
            cam.rotation_euler = (math.radians(82), 0, math.radians(11))
            sc.render.filepath = os.path.join(ITEMS, "icons", f"{name}.webp")
            bpy.ops.render.render(write_still=True)
            for o in new:
                bpy.data.objects.remove(o)
    bpy.context.window.scene = keep
    print(len(only or IDS), "icons")


if __name__ == "__main__":
    main()
