"""Makes the aquamarine's five icons (assets/ui/kit/goods/gem_aquamarine_0..4.webp) out of the painted emerald's, turned sea-green.

    python tools/ui/aquamarine_gems.py

The aquamarine (the gem of reach, src/items/items.js GEMS) came after the gem sheets were painted. Until the owner paints its
sheet (aquamarine_gems in tools/ui/pieces.mjs, brought in like any other with tools/ui/import_kit.py, which replaces these),
each cut is that cut's emerald with its hues brought round from green to sea-green, a little lighter and a little less deep, as an
aquamarine is beside an emerald. The shape, light and glints are the painted stone's own. Adds them to the kit's manifest.
Needs numpy and Pillow."""
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KIT = os.path.join(ROOT, "assets", "ui", "kit")
HUE_TO = 176 / 360          # sea-green (#35d0c4 is about 175 degrees)
SAT, LIFT = 0.8, 1.08       # less deep than an emerald, and a little lighter
SPREAD = 0.35               # how much of the painted stone's own spread of hues is kept


def turn(im):
    rgba = np.asarray(im.convert("RGBA")).astype(np.float32) / 255
    a = rgba[..., 3:]
    hsv = np.asarray(Image.fromarray((rgba[..., :3] * 255).astype(np.uint8), "RGB").convert("HSV")).astype(np.float32) / 255
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # Every hue in the stone is brought round to sea-green, keeping a little of how far it was from the stone's middle hue, so
    # the painted shading (lights a touch warmer, shadows a touch bluer) is still there but no part of it is left emerald.
    body = (a[..., 0] > 0.5) & (s > 0.25)
    green = np.median(h[body]) if np.any(body) else 0.36
    off = (h - green + 0.5) % 1.0 - 0.5
    h = (HUE_TO + off * SPREAD) % 1.0
    s = s * SAT
    v = np.clip(v * LIFT, 0, 1)
    out = Image.merge("HSV", [Image.fromarray((c * 255).round().astype(np.uint8), "L") for c in (h, s, v)]).convert("RGB")
    out = np.concatenate([np.asarray(out), (a * 255).round().astype(np.uint8)], axis=2)
    return Image.fromarray(out, "RGBA")


def main():
    with open(os.path.join(KIT, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    for g in range(5):
        src = os.path.join(KIT, manifest["goods"][f"gem_emerald_{g}"])
        name = f"goods/gem_aquamarine_{g}.webp"
        turn(Image.open(src)).save(os.path.join(KIT, name), "WEBP", quality=90, method=6)
        manifest["goods"][f"gem_aquamarine_{g}"] = name
        print(name)
    manifest["goods"] = dict(sorted(manifest["goods"].items()))
    with open(os.path.join(KIT, "manifest.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
