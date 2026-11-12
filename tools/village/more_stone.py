"""More masonry for the places out in the land and the party dungeons, which had two paintings of stone between them
(stone and rubble): four of the catacombs' own, with no mark on them, laid three across and two up into the static
array's shape, and added to its manifest. Run once; safe to run again.

    python tools/village/more_stone.py

block: coursed blocks. flags: a flagged floor. ashlar: big dressed stone. course: rough coursed wall.
The layers go on the end of the manifest, so every layer before them keeps its number. src/core/sites.js TILE says how
many metres one repeat covers.
"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "assets", "game", "interior")
OUT = os.path.join(ROOT, "assets", "game", "tex")
MORE = {"block": "cata_block", "flags": "cata_floor", "ashlar": "wall_ashlar", "course": "cata_wall3"}
ACROSS, UP = 3, 2


def laid(path, size, mode):
    im = Image.open(path).convert(mode)
    w, h = im.size
    sheet = Image.new(mode, (w * ACROSS, h * UP))
    for i in range(ACROSS):
        for j in range(UP):
            sheet.paste(im, (i * w, j * h))
    return sheet.resize(size, Image.LANCZOS)


def main():
    path = os.path.join(OUT, "manifest.json")
    man = json.load(open(path))
    have = {l["name"] for l in man["layers"]}
    for name, src in MORE.items():
        laid(os.path.join(SRC, src + "_c.webp"), tuple(man["size"]), "RGB").save(os.path.join(OUT, name + "_c.webp"), quality=80, method=5)
        laid(os.path.join(SRC, src + "_d.webp"), tuple(man["detail"]), "RGBA").save(os.path.join(OUT, name + "_d.webp"), quality=60, method=5, alpha_quality=70, exact=True)
        if name not in have:
            man["layers"].append({"name": name, "kind": "stone", "cutout": False})
    json.dump(man, open(path, "w"), indent=1)
    print("layers:", len(man["layers"]))


if __name__ == "__main__":
    main()
