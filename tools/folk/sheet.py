"""A sheet of bodies (or hands) as the game poses them, to a PNG, for tools/folk/bg.py:

    blender --background --factory-startup --python tools/folk/bg.py -- tools/folk/sheet.py SPEC.json

SPEC: {"out": png, "cols": 12, "dx": 1.0, "dz": 2.1, "size": [w, h], "scale": metres across (or fitted),
       "items": [[body, clip, share of the clip, yaw in degrees], ...], "hands": false, "root": other repo root or null}
With "hands": true the items are [body, side, clip, share] and the sheet is hands.posed_sheet's.
Each body wears its own arm-out (src/folk/people.js) and, in a folded-arms clip, its own fold (folk.json).
"""
import json
import math
import re

spec = json.load(open(ARGS[0]))
if spec.get("root"): h["setroot"](spec["root"]); RF = h["RF"]
src = open(ROOT + "/src/folk/people.js", encoding="utf-8").read()
AO = json.loads(re.search(r"const ARM_OUT = (\{.*?\});", src).group(1).replace("'", '"'))
models = json.load(open((spec.get("root") or ROOT) + "/assets/game/folk/folk.json"))["models"]
cols = spec.get("cols", 12); dx = spec.get("dx", 1.0); dz = spec.get("dz", 2.1)
items = spec["items"]; rows = (len(items) + cols - 1) // cols
if spec.get("hands"):
    cw, ch = spec.get("dx", 0.5), spec.get("dz", 0.3)
    h["posed_sheet"]([tuple(i) for i in items], "hands", cols=cols, cw=cw, ch=ch)
    width = cols * cw; x = width / 2 - cw / 2 + 0.11; z = -(rows - 1) * ch / 2 + 0.07; scale = spec.get("scale", width + 0.1)
else:
    for n, it in enumerate(items):
        k, clip, tt, yaw = it[:4]
        dur = RF["clips"]()["meta"]["clips"][clip]["dur"]
        fwd = models[k].get("fold", 0) if clip.startswith("fold_arms") else 0
        if len(it) > 4: fwd = it[4]
        ob = RF["show"](k, clip, dur * tt, f"b{n}", 0, None, AO.get(k, 0), fwd)
        ob.location = ((n % cols) * dx, 0, -(n // cols) * dz); ob.rotation_euler.z = math.radians(yaw)
    width = cols * dx; x = width / 2 - dx / 2; z = -(rows - 1) * dz / 2 + 0.9; scale = spec.get("scale", width + 0.3)
w, hgt = spec.get("size", [1600, 600])
shot(spec["out"], x, z, scale, w, hgt, y=-12.0 if not spec.get("hands") else -5.0)
print("SHEET", spec["out"])
