"""Phobos's own stone, brick and plaster as layers of the game's static texture array, so the block-out stops borrowing
the village's house walls (the owner, 2026-11-16: the half-timbered wall is for small parts of village homes, never
for big walls).

    python tools/phobos/textures/wire_layers.py

For each tile named in WIRE (from assets/game/phobos/tex, built by build_sets.py): two of it across and one up, drawn
into the array's shape (assets/game/tex manifest's size and detail), saved as ph_<tile>_c.webp and ph_<tile>_d.webp,
and added to the END of assets/game/tex/manifest.json so every layer before keeps its number. Then
src/core/phobos-tiles.js is written: how many metres one repeat of each covers (src/core/sites.js tileOf reads it).
Safe to run again. As tools/village/more_stone.py did for the catacombs' four. Each layer is about 9 MB on the GPU.
"""
import json, os
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SRC = os.path.join(ROOT, "assets", "game", "phobos", "tex")
OUT = os.path.join(ROOT, "assets", "game", "tex")
# What each is for (src/core/phobos-build.js): the poor districts' brick, the burnt quarter's two, the market's wall, the
# rich districts' brick and dressed stone, ochre daub, the city wall's basalt, the castle's granite, the Keep's wall, and
# for the insides of houses their plaster and their floor boards. (The array's per-layer table holds 64: this is all of it.)
WIRE = ["poor_brick", "soot_brick", "burnt_wall", "market_wall", "rich_brick", "dressed", "daub", "basalt", "granite", "keep_wall", "grey_plaster", "boards"]
ACROSS = 2


def laid(path, size, mode):
    im = Image.open(path).convert(mode)
    w, h = im.size
    sheet = Image.new(mode, (w * ACROSS, h))
    for i in range(ACROSS):
        sheet.paste(im, (i * w, 0))
    return sheet.resize(size, Image.LANCZOS)


def main():
    src = json.load(open(os.path.join(SRC, "manifest.json")))
    path = os.path.join(OUT, "manifest.json")
    man = json.load(open(path))
    have = {l["name"] for l in man["layers"]}
    tiles = {}
    for t in WIRE:
        name = "ph_" + t
        laid(os.path.join(SRC, t + "_c.webp"), tuple(man["size"]), "RGB").save(os.path.join(OUT, name + "_c.webp"), quality=82, method=5)
        laid(os.path.join(SRC, t + "_d.webp"), tuple(man["detail"]), "RGBA").save(os.path.join(OUT, name + "_d.webp"), quality=62, method=5, alpha_quality=72, exact=True)
        if name not in have:
            man["layers"].append({"name": name, "kind": "stone", "cutout": False})
        mw, mh = src["tiles"][t]["m"]
        tiles[name] = [round(mw * ACROSS, 2), mh, mh]
    json.dump(man, open(path, "w"), indent=1)
    js = ("// Made by tools/phobos/textures/wire_layers.py. Not edited by hand. Metres one repeat of each of Phobos's layers covers:\n"
          "// [across, up, a floor's other way] (src/core/sites.js tileOf).\nexport const PH_TILE = " + json.dumps(tiles, indent=1) + ";\n")
    open(os.path.join(ROOT, "src", "core", "phobos-tiles.js"), "w", encoding="utf-8", newline="\n").write(js)
    print("layers:", len(man["layers"]), "| wired:", ", ".join(tiles))


if __name__ == "__main__":
    main()
