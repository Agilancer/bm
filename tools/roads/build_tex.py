"""The roads' grounds: seven of the desert tiles in assets/desert, palette-swapped from the desert's golds and ochres to this
country's greys and browns, and saved as ground layers (colour _c, detail _d) after the eighteen there were. The game picks
them by place: src/core/roads.js SURFACE_LAYERS, the ground's layers 18 to 24 (src/gfx/materials.js TERRAIN).

Each tile: its colour pulled toward its own grey by `keep` (how much of the desert's colour is kept), then shifted so its
average is `mean` (linear 0-1, about as bright as the land's own dirt and stone so a road reads lighter than the grass beside
it), its light flattened, and the detail map made from its own grain as tools/world/build_ground.py makes the rest.

Usage: python tools/roads/build_tex.py   (from the repository's top)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "world"))
from build_ground import flatten, save_pair, lum_of  # noqa: E402

D = "assets/desert"
TEX = "assets/game/tex"
# name: (source, how much colour kept, average colour, contrast)
ROADS = {
    "road_flag": ("Desert_Fantasy_Textures/12_ruined_flagstones.png", 0.32, (0.44, 0.42, 0.38), 1.15),
    "road_sett": ("Desert_Oasis_20_Textures/19_oasis_courtyard_pavers.png", 0.18, (0.41, 0.40, 0.38), 1.25),
    "road_gravel": ("Desert_Fantasy_Textures/05_desert_gravel.png", 0.38, (0.43, 0.40, 0.35), 1.1),
    "road_stones": ("Desert_Fantasy_Textures_Vol_2/04_dry_wadi_stones.png", 0.42, (0.40, 0.36, 0.31), 1.1),
    "road_dirt": ("Desert_Fantasy_Textures/04_pebbled_sand.png", 0.55, (0.37, 0.29, 0.21), 1.2),
    "road_ash": ("Desert_Fantasy_Textures_Vol_2/02_black_volcanic_sand.png", 0.6, (0.17, 0.155, 0.145), 1.3),
    "road_plank": ("Desert_Fantasy_Textures_Vol_2/14_weathered_palm_wood.png", 0.5, (0.33, 0.27, 0.21), 1.15),
}


def swap(a, keep, mean, contrast):
    grey = lum_of(a)[..., None]
    a = grey + (a - grey) * keep
    m = a.reshape(-1, 3).mean(0)
    a = (a - m) * contrast + m
    return np.clip(a * (np.array(mean) / np.maximum(a.reshape(-1, 3).mean(0), 1e-3)), 0, 1)


def main():
    for name, (src, keep, mean, contrast) in ROADS.items():
        a = np.asarray(Image.open(os.path.join(D, src)).convert("RGB").resize((1024, 1024), Image.LANCZOS), dtype=np.float32) / 255
        save_pair(swap(flatten(a), keep, mean, contrast), TEX, name)
        print(name)
    path = os.path.join(TEX, "manifest.json")
    with open(path) as f:
        man = json.load(f)
    man["ground"] = [g for g in man["ground"] if g not in ROADS] + list(ROADS)
    with open(path, "w") as f:
        json.dump(man, f, indent=1)


if __name__ == "__main__":
    main()
