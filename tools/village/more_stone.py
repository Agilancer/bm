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

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "assets", "game", "interior")
OUT = os.path.join(ROOT, "assets", "game", "tex")
MORE = {"block": "cata_block", "flags": "cata_floor", "ashlar": "wall_ashlar", "course": "cata_wall3"}
ACROSS, UP = 3, 2
TARGET = 0.37   # (mean brightness: the land's stone is about 0.41, its rubble 0.38)


def evened(im):
    """The catacombs' paintings are darker than the land's stone and each has a light and a dark side, which shows as a
    grid once it's laid over a long wall: the broad light and dark taken out (wrapping, so it still repeats), and the
    whole brought up to the land's stone."""
    a = np.asarray(im, dtype=np.float32) / 255
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    h, w = lum.shape
    big = np.tile(lum, (3, 3))
    broad = np.asarray(Image.fromarray((big * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(w / 6)), dtype=np.float32)[h:2 * h, w:2 * w] / 255
    a = a * (lum.mean() / np.maximum(broad, 0.02))[..., None] ** 0.85
    a = a * (TARGET / max(lum.mean(), 0.02))
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def wrapped(im, trim=4, band=28):
    """The paintings stop at their edges (a dark joint, a pale line): the edge trimmed off, and each side faded into the
    far side's own, so one laid beside another runs on."""
    a = np.asarray(im, dtype=np.float32)[trim:-trim, trim:-trim]
    for axis in (0, 1):
        a = np.moveaxis(a, axis, 0)
        t = np.linspace(0, 1, band, dtype=np.float32).reshape((band,) + (1,) * (a.ndim - 1))
        head = a[:band] * t + a[-band:] * (1 - t)
        a = np.concatenate([head, a[band:-band]], 0)
        a = np.moveaxis(a, 0, axis)
    return Image.fromarray((a + 0.5).astype(np.uint8), im.mode)


def laid(path, size, mode):
    im = wrapped(Image.open(path).convert(mode))
    if mode == "RGB":
        im = evened(im)
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
