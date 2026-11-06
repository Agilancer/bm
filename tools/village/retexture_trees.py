"""The owner's tree tiles (art/trees/) into the game's texture layers: oak bark and leaves, pine bark and needles.

Run after build_textures.py and build_pines.py, which would paint over these. Each tile is made to repeat by cutting its
overlapping edges together along the path where they differ least. A leaf or needle card keeps the outline of the old
painting (saved in art/trees/ the first time this runs), with its holes cut from the tile's own dark gaps.
"""
import json
import os
import shutil

import numpy as np
from PIL import Image, ImageFilter

from build_textures import DETAIL, SIZE, save_pair

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "assets", "game", "tex")
ART = os.path.join(ROOT, "art", "trees")
OVERLAP = 96
OAK_LEAF_BRIGHTNESS = 0.6


def cut_rows(a, band):
    """Make the rows repeat: the bottom band over the top one, cut where they differ least, the path ending where it began."""
    h, w = a.shape[:2]
    top, low = a[:band], a[-band:]
    err = ((top - low) ** 2).sum(-1)
    start = int(np.argmin(err[:, 0] + err[:, -1]))
    cost = np.full((band, w), 1e9, dtype=np.float32)
    cost[start, 0] = 0
    back = np.zeros((band, w), dtype=np.int32)
    for x in range(1, w):
        for off in (-1, 0, 1):
            prev = np.roll(cost[:, x - 1], off)
            if off == 1:
                prev[0] = 1e9
            if off == -1:
                prev[-1] = 1e9
            better = prev < cost[:, x]
            cost[better, x] = prev[better]
            back[better, x] = (np.arange(band) - off)[better]
        cost[:, x] += err[:, x]
    y = start
    mask = np.zeros((band, w), dtype=np.float32)
    for x in range(w - 1, -1, -1):
        mask[y:, x] = 1   # Below the cut, the top band carries on into the rest of the tile.
        y = back[y, x]
    soft = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.5)), dtype=np.float32)[..., None] / 255
    out = a[:h - band].copy()
    out[:band] = low * (1 - soft) + top * soft
    return out


def seamless(path):
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255
    a = cut_rows(a, OVERLAP)
    return np.transpose(cut_rows(np.transpose(a, (1, 0, 2)), OVERLAP), (1, 0, 2))


def wrapped_resize(a, size):
    """Resized as the tile it is, so the edge pixels are filtered with what lies across the join."""
    h, w = a.shape[:2]
    pad = 32
    p = np.pad(a, ((pad, pad), (pad, pad), (0, 0)), mode="wrap")
    sx, sy = size[0] / w, size[1] / h
    big = Image.fromarray((p * 255 + 0.5).astype(np.uint8)).resize((round(p.shape[1] * sx), round(p.shape[0] * sy)), Image.LANCZOS)
    x, y = round(pad * sx), round(pad * sy)
    return np.asarray(big.crop((x, y, x + size[0], y + size[1])), dtype=np.float32) / 255


def old_painting(name):
    keep = os.path.join(ART, f"old_{name}_c.webp")
    if not os.path.exists(keep):
        shutil.copy(os.path.join(OUT, f"{name}_c.webp"), keep)
    return np.asarray(Image.open(keep).convert("RGBA"), dtype=np.float32) / 255


def card(tile, name, spread, gaps):
    """The tile, cut out to the old painting's outline, spread to close up its gaps, and holed where the tile goes dark."""
    old = (old_painting(name)[..., 3] * 255).astype(np.uint8)
    blob = Image.fromarray(old).filter(ImageFilter.GaussianBlur(spread))
    blob = np.clip((np.asarray(blob, dtype=np.float32) / 255 - 0.16) * 9, 0, 1)
    lum = tile.mean(-1)
    lum = lum / np.percentile(lum, 90)
    return blob * np.clip((lum - gaps) * 14, 0, 1)


def main():
    def tiles(name, count):
        return [seamless(os.path.join(ART, f"{name}_{i + 1}.webp")) for i in range(count)]

    def named(base, i):
        return base if i == 0 else f"{base}_{i + 1}"

    pine_barks = tiles("pine_bark", 5)
    needle_tiles = [wrapped_resize(t, SIZE) for t in tiles("pine_needles", 5)]
    new = []
    for base, sheet in (("bark", tiles("oak_bark", 4)), ("pine_bark", pine_barks)):
        for i, t in enumerate(sheet):
            save_pair(wrapped_resize(t, SIZE), None, "wood", OUT, named(base, i), 14.0, SIZE, DETAIL)
            new.append({"name": named(base, i), "kind": "wood", "cutout": False})
    for i, t in enumerate(tiles("oak_leaves", 4)):
        t = wrapped_resize(t, SIZE)
        # (The foliage shader lights leaves from both sides: at the tile's full brightness they go neon in the sun.)
        save_pair(t * OAK_LEAF_BRIGHTNESS, card(t, "leaves", 26, 0.34), "other", OUT, named("leaves", i), 6.0, SIZE, DETAIL)
        new.append({"name": named("leaves", i), "kind": "other", "cutout": True})
    for i, t in enumerate(needle_tiles):
        save_pair(t, card(t, "pine", 7, 0.30), "other", OUT, named("pine", i), 6.0, SIZE, DETAIL)
        new.append({"name": named("pine", i), "kind": "other", "cutout": True})
    needles = np.mean(needle_tiles, axis=0)
    pine_bark = np.mean([t.reshape(-1, 3).mean(0) for t in pine_barks], axis=0)
    # The far tree stays a painting, in the near needles' colour so it doesn't change as it comes close.
    far = old_painting("pine_far")
    rgb, lum = far[..., :3], far[..., :3].mean(-1)
    solid = far[..., 3] > 0.5
    leafy = (rgb[..., 1] >= rgb[..., 0]) & solid
    shade = lum / max(1e-3, lum[leafy].mean())
    out = rgb.copy()
    out[leafy] = (needles.reshape(-1, 3).mean(0)[None, None] * shade[..., None])[leafy]
    bare = solid & ~leafy
    out[bare] = (pine_bark[None, None] * np.clip(shade, 0.4, 1.2)[..., None])[bare]
    save_pair(np.clip(out, 0, 1), far[..., 3], "other", OUT, "pine_far", 6.0, SIZE, DETAIL)
    path = os.path.join(OUT, "manifest.json")
    with open(path) as f:
        man = json.load(f)
    have = {l["name"] for l in man["layers"]}
    man["layers"] += [l for l in new if l["name"] not in have]
    with open(path, "w") as f:
        json.dump(man, f, indent=1)
    print(len(man["layers"]), "layers")


if __name__ == "__main__":
    main()
