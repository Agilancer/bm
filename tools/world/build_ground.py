"""Turn the owner's Tripo ground and rock paintings into ground layers the game can tile.

The sources are 1024 px squares made in Tripo's image generator (see art/tripo-textures/README.md in the
old bm checkout; the raw PNGs are not kept in the repo). Each one is:
  1. flattened: its broad light (a painted vignette, a bright corner) is divided out, so a repeat can't be
     spotted from the light alone;
  2. made to tile, first across then down: the picture is blended with a copy of itself moved half a tile,
     and the blend follows the painting's own height (the higher stone wins), so the join runs round
     stones and cracks instead of fading one over the other;
  3. saved as the game's pair, colour (_c) and detail (_d: normal xy, roughness, height), and added to the
     manifest's ground list after the six that were there.

Usage: python build_ground.py RAW_DIR TEX_DIR
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

# Game name: source file. (The shader picks them by place in this list: src/gfx/materials.js GROUND_*.)
LAYERS = [
    ("road_1", "road_a"),
    ("snow_1", "snow_b"),
    ("snowrock_1", "snowrock_a"),
    ("granite_1", "granite_a"),
    ("frost_1", "frost_b"),
    ("basalt_1", "basalt_a"),
    ("limestone_1", "limestone_a"),
    ("moss_1", "moss_a"),
    ("pinefloor_1", "pinefloor_a"),
    ("fen_1", "fen_a"),
    ("ash_1", "ash_a"),
    ("rust_1", "rust_a"),
]
BASE = ["dirt_1", "dirt_2", "dirt_3", "grass_1", "grass_2", "grass_3"]


def lum_of(a):
    return a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def blur(x, r):
    """Gaussian blur that wraps round the edges (it's going to tile)."""
    sig = (r, r, 0) if x.ndim == 3 else (r, r)
    return gaussian_filter(x, sig, mode="wrap")


def flatten(a):
    """Divide out the broad light, keeping the mean brightness and colour."""
    low = blur(a, 90)
    mean = a.reshape(-1, 3).mean(0)
    k = np.clip(mean / np.maximum(low, 1e-3), 0.6, 1.7)
    return np.clip(a * k, 0, 1)


def height_of(a):
    lum = lum_of(a)
    return np.clip(0.5 + np.clip(lum - blur(lum, 22), -0.4, 0.4) * 1.2 + (lum - blur(lum, 5)) * 0.7, 0, 1)


def tile_x(a, band=0.3):
    """Seamless across: blend with a copy moved half a tile, the copy at the edges, the original in the middle."""
    h, w = a.shape[:2]
    moved = np.roll(a, w // 2, 1)
    x = (np.arange(w) + 0.5) / w
    edge = np.minimum(x, 1 - x)                 # 0 at the edges, 0.5 in the middle
    t = np.clip(edge / band, 0, 1)[None, :]     # 0 = copy, 1 = original
    # Where the two meet, the higher of them wins, so the join goes round things.
    dh = height_of(a) - height_of(moved)
    t = np.clip((t - 0.5) * 2.2 + dh * 3.0 + 0.5, 0, 1)
    t = blur(t, 2.0)
    t[:, 0] = 0
    t[:, -1] = 0
    t = t[..., None]
    return a * t + moved * (1 - t)


def make_tile(a):
    a = flatten(a)
    a = tile_x(a)
    a = np.transpose(tile_x(np.transpose(a, (1, 0, 2))), (1, 0, 2))
    return a


def normal_from(height, strength):
    dx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
    dy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
    nx, ny = -dx * strength, dy * strength
    ln = np.sqrt(nx * nx + ny * ny + 1)
    return nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5


def save_pair(rgb, out, name):
    lum = lum_of(rgb)
    fine = lum - blur(lum, 5)
    h = height_of(rgb)
    rough = np.clip(0.93 + fine * 0.5, 0.55, 1)
    nx, ny = normal_from(h, 8.0)
    d = np.stack([nx, ny, rough, h], -1)
    Image.fromarray((d * 255 + 0.5).astype(np.uint8), "RGBA").resize((512, 512), Image.LANCZOS).save(
        os.path.join(out, f"{name}_d.webp"), quality=60, method=5, alpha_quality=70, exact=True)
    Image.fromarray((rgb * 255 + 0.5).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS).save(
        os.path.join(out, f"{name}_c.webp"), quality=76, method=5)


def main():
    raw, out = sys.argv[1], sys.argv[2]
    for name, src in LAYERS:
        a = np.asarray(Image.open(os.path.join(raw, f"{src}.png")).convert("RGB"), dtype=np.float32) / 255
        save_pair(make_tile(a), out, name)
        print(name)
    path = os.path.join(out, "manifest.json")
    with open(path) as f:
        man = json.load(f)
    man["ground"] = BASE + [n for n, _ in LAYERS]
    with open(path, "w") as f:
        json.dump(man, f, indent=1)


if __name__ == "__main__":
    main()
