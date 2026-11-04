"""Run inside Blender, through Blender MCP, after separate.py: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Renders the inventory icons in assets/game/items/icons on a clear background, in the Swords scene: each sword tip up, in the
frame swords.json (atlas.py) gives it, so that frame puts its sockets where the art has them. With review=True also writes
larger stills to tools/build/swords/review, front and back.
"""
import json
import math
import os

import bpy

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ICONS = os.path.join(ROOT, "assets", "game", "items", "icons")
REVIEW = os.path.join(ROOT, "tools", "build", "swords", "review")
GREATSWORD = os.path.join(ROOT, "art", "fp_arms", "greatsword.glb")
MANIFEST = os.path.join(ROOT, "assets", "game", "items", "swords.json")
SIZE = (192, 768)                          # 48 CSS pixels a cell, at 4x


def setup(sc):
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 96
    sc.cycles.device = "CPU"
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    for o in [o for o in sc.objects if o.name.startswith("sword_icons")]:
        bpy.data.objects.remove(o)
    w = bpy.data.worlds.get("sword_icons") or bpy.data.worlds.new("sword_icons")
    sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.36, 0.36, 0.38, 1)
    bg.inputs[1].default_value = 1.0
    cam = bpy.data.cameras.new("sword_icons")
    cam.type = "ORTHO"
    co = bpy.data.objects.new("sword_icons", cam)
    sc.collection.objects.link(co)
    sc.camera = co
    lights = []
    for rot, e in (((math.radians(55), 0, math.radians(60)), 2.6), ((math.radians(75), 0, math.radians(130)), 1.1)):
        s = bpy.data.lights.new("sword_icons", "SUN")
        s.energy = e
        so = bpy.data.objects.new("sword_icons", s)
        sc.collection.objects.link(so)
        so.rotation_euler = rot
        lights.append(so)
    return co, lights


def shoot(sc, cam, lights, ob, y, path, size, fmt, view="front"):
    """One still of one object, moved to the origin for it: from +X in Blender's axes (the item's front), or from -X."""
    keep = ob.location.copy()
    ob.location = (0, 0, 0)
    hidden = [(o, o.hide_render) for o in sc.objects]
    for o in sc.objects:
        o.hide_render = o.type == "MESH" and o is not ob
    side = 1 if view == "front" else -1
    cam.data.ortho_scale = y[1] - y[0]
    cam.location = (3 * side, 0, (y[0] + y[1]) / 2)
    cam.rotation_euler = (math.pi / 2, 0, math.pi / 2 * side)
    for so, base in zip(lights, (60, 130)):
        so.rotation_euler = (so.rotation_euler[0], 0, math.radians(base if view == "front" else base + 180))
    sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = fmt
    sc.render.image_settings.color_mode = "RGBA"
    if fmt == "WEBP":
        sc.render.image_settings.quality = 92
    sc.render.use_file_extension = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o, h in hidden:
        o.hide_render = h
    ob.location = keep


def main(review=False):
    sc = bpy.data.scenes["Swords"]
    os.makedirs(ICONS, exist_ok=True)
    cam, lights = setup(sc)
    if "greatsword" not in sc.objects:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=GREATSWORD)
        new = next(o for o in bpy.data.objects if o not in before and o.type == "MESH")
        new.name = "greatsword"
    with open(MANIFEST) as f:
        swords = json.load(f)["swords"]
    for name, sword in swords.items():
        y = sword["frame"]["y"]
        shoot(sc, cam, lights, sc.objects[name], y, os.path.join(ICONS, f"{name}.webp"), SIZE, "WEBP")
        if review:
            os.makedirs(REVIEW, exist_ok=True)
            for view in ("front", "back"):
                shoot(sc, cam, lights, sc.objects[name], y, os.path.join(REVIEW, f"{name}_{view}.png"), (400, 1600), "PNG", view)
    sc.objects["greatsword"].location.y = -0.5
    for f in sorted(os.listdir(ICONS)):
        print(f, round(os.path.getsize(os.path.join(ICONS, f)) / 1000), "KB")


if __name__ == "__main__":
    main(review=True)
