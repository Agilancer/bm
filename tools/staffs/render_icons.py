"""Run inside Blender, through Blender MCP, after separate.py and atlas.py: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Renders the staffs' inventory icons into assets/game/items/icons, the same way as the swords' (tools/swords/render_icons.py), at few samples.
"""
import json
import os
import runpy

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SWORDS = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))
IDS = ("greenwood_staff", "crystal_staff", "skullhorn_staff", "gnarled_crook")


def main():
    sc = bpy.data.scenes["Staffs"]
    bpy.context.window.scene = sc
    cam, lights = SWORDS["setup"](sc)
    sc.cycles.samples = 24
    with open(SWORDS["MANIFEST"]) as f:
        manifest = json.load(f)["swords"]
    for name in IDS:
        SWORDS["shoot"](sc, cam, lights, sc.objects[name], manifest[name]["frame"]["y"], os.path.join(SWORDS["ICONS"], f"{name}.webp"), SWORDS["SIZE"], "WEBP")
        print(name, round(os.path.getsize(os.path.join(SWORDS["ICONS"], f"{name}.webp")) / 1000), "KB")


if __name__ == "__main__":
    main()
