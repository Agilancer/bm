"""The party's looks, out of your own gear's: each of the wizard's gear sets (assets/game/player/skins, sets.json), read part
by part through parts.png, as a ramp of colours from its darkest to its lightest. A piece of party gear wears one set's
ramp on its own part of a hero's body (src/gfx/herolook.js maps each texel's brightness onto it), so the hat of the Ember
Warden's set can become a lancer's helm in the Ember Warden's colours.

Usage: python tools/heroes/looks.py      # writes assets/game/heroes/looks.json
"""
import json
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKINS = os.path.join(ROOT, "assets", "game", "player", "skins")
PARTS = ["head", "shoulders", "chest", "legs", "feet"]   # parts.png: 40 a step, from 1
STOPS = (0.06, 0.3, 0.55, 0.8, 0.96)                     # where on the part's own brightness each stop of the ramp is read


def srgb_to_lin(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255


def main():
    sets = json.load(open(os.path.join(SKINS, "sets.json"), encoding="utf-8"))["sets"]
    parts = None
    out = []
    for s in sets:
        p = os.path.join(SKINS, f"{s['id']}.webp")
        if not os.path.exists(p):
            continue
        img = Image.open(p).convert("RGB")
        if parts is None or parts.shape[:2] != img.size[::-1]:
            parts = np.round(np.asarray(Image.open(os.path.join(ROOT, "assets", "game", "player", "parts.png")).convert("L").resize(img.size, Image.NEAREST)) / 40).astype(int)
        px = srgb_to_lin(np.asarray(img).astype(np.float32))
        ramps = {}
        for k, part in enumerate(PARTS, 1):
            if part not in s["pieces"]:
                continue
            sel = px[parts == k]
            if len(sel) < 200:
                continue
            lum = sel @ np.array([0.2126, 0.7152, 0.0722])
            order = np.argsort(lum)
            n = len(order)
            stops = []
            for t in STOPS:
                a, b = int(max(0, t - 0.06) * n), int(min(1, t + 0.06) * n)
                stops.append([int(round(v)) for v in lin_to_srgb(sel[order[a:b]].mean(0))])
            ramps[part] = stops
        if ramps:
            out.append({"id": s["id"], "name": s["name"], "rarity": s.get("rarity"), "ramps": ramps})
    json.dump({"note": "made by tools/heroes/looks.py from assets/game/player/skins", "sets": out}, open(os.path.join(ROOT, "assets", "game", "heroes", "looks.json"), "w"), separators=(",", ":"))
    print(len(out), "sets")


if __name__ == "__main__":
    main()
