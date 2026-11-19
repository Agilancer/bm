"""Phobos's palette swaps: five of each of the city's Meshy-made people (src/folk/people.js swapsOf), the same body in other
clothes, recoloured in the shader rather than painted (src/gfx/folk.js swapCode, src/gfx/materials.js ARMOR): no texture
of their own, so two hundred and sixty of them cost the GPU nothing but their bodies' bones.

    python tools/phobos/crowd_tints.py

Writes each swap into assets/game/folk/folk.json swaps as { base, tint: [hue shift (turns), saturation, value] }. The
shifts are small and kept off blue (the shader greys anything a shift would turn blue: no blue beside gold); the five of a
body differ by a step of hue and of how faded and how dark they are, so no two look alike across a street.
"""
import json
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "assets", "game", "folk")
sys.path.insert(0, os.path.join(ROOT, "tools", "folk"))
import manifest  # noqa: E402  (folk.json, one line a body, as the folk tools write it)
PER = 5
# [hue shift, saturation, value]: five looks, each a different way off the one they're made on.
LOOKS = [[-0.07, 0.85, 0.82], [0.05, 0.6, 0.95], [0.11, 0.95, 0.7], [-0.03, 0.45, 0.62], [0.82, 0.75, 0.88]]


def main():
    res = json.load(open(os.path.join(ROOT, "tools", "phobos", "residents.json")))["people"]
    count = [0]

    def change(doc):
        for i, body in enumerate(k for k, v in res.items() if v.get("area") != "castle"):
            if body not in doc["models"]:
                continue
            for k in range(PER):
                dh, s, v = LOOKS[(k + i) % PER]
                doc["swaps"][f"{body}_s{k + 1}"] = {"base": body, "tint": [round(dh + (i % 3 - 1) * 0.015, 3), s, v]}
                count[0] += 1
    manifest.update(OUT, change)
    print(count[0], "swaps")

if __name__ == "__main__":
    main()
