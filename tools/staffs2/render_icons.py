"""Renders the 83 painted staffs' inventory icons into assets/game/items/icons, the swords' way (tools/swords/render_icons.py).
Runs in background Blender, so nothing lands in a live scene:

    blender -b --factory-startup -P tools/staffs2/render_icons.py -- [id ...]
"""
import json
import os
import runpy
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SWORDS = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))
sys.path.insert(0, HERE)
from staffs import STAFFS  # noqa: E402


def main():
    want = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    sc = bpy.context.scene
    for o in list(sc.objects):
        bpy.data.objects.remove(o)
    cam, lights = SWORDS["setup"](sc)
    sc.cycles.samples = 24
    with open(SWORDS["MANIFEST"]) as f:
        manifest = json.load(f)["swords"]
    for s in STAFFS:
        name = s["id"]
        if want and name not in want:
            continue
        before = set(sc.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "assets", "game", "items", f"{name}.glb"))
        meshes = [o for o in sc.objects if o not in before and o.type == "MESH"]
        ob = meshes[0]
        out = os.path.join(SWORDS["ICONS"], f"{name}.webp")
        # The painted face is the item's -X: shoot it from there.
        SWORDS["shoot"](sc, cam, lights, ob, manifest[name]["frame"]["y"], out, SWORDS["SIZE"], "WEBP", view="back")
        for o in [o for o in sc.objects if o not in before]:
            bpy.data.objects.remove(o)
        print(name, round(os.path.getsize(out) / 1000), "KB", flush=True)


main()
