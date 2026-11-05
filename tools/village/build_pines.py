"""The pines' two paintings, added on to what tools/village/build_textures.py made: one bough for the near trees, one whole tree for the far.

Nothing to feed it: it paints them from nothing, and adds them to the end of assets/game/tex/manifest.json if they aren't there.
Usage: python tools/village/build_pines.py
"""
import json
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from build_textures import DETAIL, SIZE, save_pair

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "assets", "game", "tex")
K = 2                                    # painted at twice the size, and brought down
W, H = SIZE[0] * K, SIZE[1] * K
DARK = (20, 33, 24)


def needle_colour(rng, light=1.0):
    t = rng.random()
    return (int((20 + 20 * t) * light), int((33 + 28 * t) * light), int((27 + 19 * t) * light))


def finish(rgb_im, alpha_im, base=DARK):
    rgb = np.asarray(rgb_im.resize(SIZE, Image.LANCZOS), dtype=np.float32) / 255
    alpha = np.asarray(alpha_im.resize(SIZE, Image.LANCZOS), dtype=np.float32) / 255
    # Keep what shows, hard-edged, and the colour under the edge the same as next to it.
    alpha = np.clip((alpha - 0.3) * 4, 0, 1)
    return rgb, alpha


def sprig(d, a, rng, x, y, ang, length, light=1.0, thick=2):
    """A twig, its needles swept along it and out to both sides."""
    steps = max(4, int(length / 13))
    for i in range(steps):
        t = i / steps
        px, py = x + math.cos(ang) * length * t, y + math.sin(ang) * length * t
        for s in (-1, 1):
            for _ in range(2):
                sweep = ang + s * rng.uniform(0.42, 0.85)
                n = rng.uniform(26, 44) * (1 - 0.45 * t) * K / 2
                ex, ey = px + math.cos(sweep) * n, py + math.sin(sweep) * n
                c = needle_colour(rng, light)
                d.line([(px, py), (ex, ey)], fill=c, width=2 * K // 2 + 1)
                a.line([(px, py), (ex, ey)], fill=255, width=2 * K // 2 + 1)
    ex, ey = x + math.cos(ang) * length, y + math.sin(ang) * length
    d.line([(x, y), (ex, ey)], fill=(38, 28, 20), width=thick)
    a.line([(x, y), (ex, ey)], fill=255, width=thick)


def bough():
    """A bough lying along the card from the left, its stem down the middle, tapering to the tip at the right."""
    rng = np.random.default_rng(5)
    rgb = Image.new("RGB", (W, H), DARK)
    alpha = Image.new("L", (W, H), 0)
    d, a = ImageDraw.Draw(rgb), ImageDraw.Draw(alpha)
    cy = H / 2
    for i in range(150):
        t = (i + 0.5) / 150
        x = t * W * 0.97
        spread = (1 - t ** 1.4) * 0.47 * H + 40
        for s in (-1, 1):
            ang = s * rng.uniform(0.42, 1.0) * (1 - 0.2 * t)
            L = spread / abs(math.sin(ang)) * rng.uniform(0.55, 1.0)
            sprig(d, a, rng, x, cy + s * rng.uniform(0, 14), ang, L, rng.uniform(0.62, 1.1), thick=3 * K)
    d.line([(0, cy), (W, cy)], fill=(40, 30, 22), width=7 * K)
    a.line([(0, cy), (W, cy)], fill=255, width=7 * K)
    # Fill up the thin near the stem: no sky should show there.
    return finish(rgb, alpha)


def tree():
    """A whole pine, standing in the middle 2/7 of the card: bare trunk, then whorls of drooping boughs to a thin spire."""
    rng = np.random.default_rng(9)
    rgb = Image.new("RGB", (W, H), DARK)
    alpha = Image.new("L", (W, H), 0)
    d, a = ImageDraw.Draw(rgb), ImageDraw.Draw(alpha)
    cx = W / 2
    half = H / 2 * 0.5               # The widest it goes: a card as wide as half its height.
    # (Height runs up the card, from y = H at the foot.)
    trunk_w = 14 * K
    d.polygon([(cx - trunk_w, H), (cx + trunk_w, H), (cx + 2, 0), (cx - 2, 0)], fill=(34, 26, 20))
    a.polygon([(cx - trunk_w, H), (cx + trunk_w, H), (cx + 2, 0), (cx - 2, 0)], fill=255)
    for layer in range(3):
        n = 42
        for i in range(n):
            t = i / n
            y01 = 0.2 + 0.79 * t
            reach = half * ((1 - t) ** 0.85 * 0.97 + 0.03)
            y = H * (1 - y01)
            for s in (-1, 1):
                L = reach * rng.uniform(0.62, 1.0)
                droop = rng.uniform(0.18, 0.42) * L
                px, py = cx, y
                ex, ey = cx + s * L, y + droop
                light = (0.5 + 0.3 * t + 0.14 * layer) * rng.uniform(0.82, 1.12)
                fat = L * 0.26 + 6 * K
                c = needle_colour(rng, light)
                # A mass of needles round a curving bough.
                pts_top = [(px, py - fat * 0.35)]
                pts_low = [(px, py + fat * 0.25)]
                m = 8
                for k in range(1, m + 1):
                    u = k / m
                    bx = cx + s * L * u
                    by = y + droop * u * u
                    w = fat * (1 - u) ** 0.7 + 3
                    pts_top.append((bx + rng.uniform(-9, 9), by - w * rng.uniform(0.3, 0.6)))
                    pts_low.append((bx + rng.uniform(-9, 9), by + w * rng.uniform(0.5, 0.95)))
                poly = pts_top + pts_low[::-1]
                d.polygon(poly, fill=c)
                a.polygon(poly, fill=255)
                # Ragged lower edge: sprigs hanging from it.
                for k in range(int(L / (14 * K))):
                    u = rng.random()
                    bx, by = cx + s * L * u, y + droop * u * u + fat * (1 - u) * 0.5
                    ln = rng.uniform(12, 40) * K
                    ang = math.pi / 2 + s * rng.uniform(-0.2, 0.9)
                    ex2, ey2 = bx + math.cos(ang) * ln, by + math.sin(ang) * ln
                    d.line([(bx, by), (ex2, ey2)], fill=needle_colour(rng, light * 0.9), width=3 * K)
                    a.line([(bx, by), (ex2, ey2)], fill=255, width=3 * K)
    return finish(rgb, alpha)


def main():
    for name, paint in (("pine", bough), ("pine_far", tree)):
        rgb, alpha = paint()
        save_pair(np.clip(rgb, 0, 1), alpha, "other", OUT, name, 6.0, SIZE, DETAIL)
    path = os.path.join(OUT, "manifest.json")
    with open(path) as f:
        man = json.load(f)
    have = {l["name"] for l in man["layers"]}
    for name in ("pine", "pine_far"):
        if name not in have:
            man["layers"].append({"name": name, "kind": "other", "cutout": True})
    with open(path, "w") as f:
        json.dump(man, f, indent=1)
    print(len(man["layers"]), "layers")


if __name__ == "__main__":
    main()
