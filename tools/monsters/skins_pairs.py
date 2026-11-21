"""A/B sheets of the monsters' skins on a phone (tools/monsters/skins_ab.mjs): main's textures (A) left, the ones worn
now (B) beside them, and a third (C, a colours cap asked for in skins_ab.mjs's list) where there is one; a crop of the
middle (where the camera looks: the monster's chest) at 2x, about as an iPhone stretches its 1274x588 picture to its
2532x1170 screen; and how sharp each is, B (and C) over A:
- crop: the variance of the Laplacian over the whole middle crop, and the share of it that changed at all (> 6/255);
- monster (the white hall's shots only): the same over the monster alone, its pixels darker than the hall's in every
  frame, shrunk 4 px so its outline doesn't count. In the middle crop the bare hall is most of it, and it doesn't change,
  so the crop's figures show about half the change; these are the ones to go by. (In a delve the room is as dark as the
  monster, so there it's the crop's alone.)
    python tools/monsters/skins_pairs.py <dir of <tag>_*_A.png and _B.png> <the same dir> <out dir> [tag, S]
(Given two dirs, A_<name>.png in the first against B_<name>.png in the second: two separate runs, which aren't frozen
in the same pose.)
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

A, B, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
TAG = sys.argv[4] if len(sys.argv) > 4 else "S"
os.makedirs(OUT, exist_ok=True)
try:
    FONT = ImageFont.truetype("arial.ttf", 18)
    SMALL = ImageFont.truetype("arial.ttf", 14)
except OSError:
    FONT = SMALL = ImageFont.load_default()
LABEL = {"A": ("main's textures (A)", (255, 220, 90)), "B": ("branch's textures (B)", (140, 220, 255)), "C": ("colours to the cap asked (C)", (200, 170, 255))}


def gray(im):
    return np.asarray(im.convert("L"), dtype=np.float32)


def lap(g):
    return -4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]


def crop_box(im):
    w, h = im.size
    # (The middle 30% across and 80% down: the monster, as the camera looks at its chest.)
    cw = int(w * 0.30)
    ch = int(h * 0.80)
    return ((w - cw) // 2, (h - ch) // 2, (w + cw) // 2, (h + ch) // 2)


def changed(a, b, mask=None):
    d = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)).max(axis=2) > 6
    return float(d[mask].mean() if mask is not None else d.mean())


rows = []
SWAP = A == B  # the same body in one page: <tag>_<name>_A.png, _B.png (and _C.png)
for fa in sorted(glob.glob(os.path.join(A, f"{TAG}_*_A.png" if SWAP else "A_*.png"))):
    name = os.path.basename(fa)[len(TAG) + 1:-6] if SWAP else os.path.basename(fa)[2:-4]
    fb = os.path.join(B, f"{TAG}_{name}_B.png" if SWAP else f"B_{name}.png")
    fc = os.path.join(B, f"{TAG}_{name}_C.png")
    if not os.path.exists(fb):
        print("no B for", name)
        continue
    frames = {"A": Image.open(fa).convert("RGB"), "B": Image.open(fb).convert("RGB")}
    if SWAP and os.path.exists(fc):
        frames["C"] = Image.open(fc).convert("RGB")
    box = crop_box(frames["A"])
    crops = {k: v.crop(box) for k, v in frames.items()}
    g = {k: gray(v) for k, v in crops.items()}
    row = {"shot": name, "lapA": round(float(lap(g["A"]).var()), 1)}
    # The monster alone, in the white hall: darker than the hall in every frame, shrunk off its outline.
    mask = None
    if name.startswith("hall_"):
        dark = np.logical_and.reduce([x < 150 for x in g.values()])
        m = np.asarray(Image.fromarray((dark * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9))) > 0
        if m.mean() > 0.01:
            mask = m
            row["monsterShare"] = round(float(m.mean()), 3)
            row["monA"] = round(float(lap(g["A"])[m[1:-1, 1:-1]].var()), 1)
    for k in [x for x in ("B", "C") if x in crops]:
        lk = float(lap(g[k]).var())
        row[f"lap{k}"] = round(lk, 1)
        row[f"ratio{k}"] = round(lk / row["lapA"], 3) if row["lapA"] else None
        row[f"changed{k}"] = round(changed(crops["A"], crops[k]), 3)
        if mask is not None:
            mk = float(lap(g[k])[mask[1:-1, 1:-1]].var())
            row[f"mon{k}"] = round(mk, 1)
            row[f"monRatio{k}"] = round(mk / row["monA"], 3) if row["monA"] else None
            row[f"monChanged{k}"] = round(changed(crops["A"], crops[k], mask), 3)
    rows.append(row)
    # The frames, whole, side by side at half size; then the crops at 2x.
    keys = list(crops)
    W, H = frames["A"].size
    half = (W // 2, H // 2)
    top = Image.new("RGB", (half[0] * len(keys), H // 2 + 28), (16, 16, 16))
    d = ImageDraw.Draw(top)
    for i, k in enumerate(keys):
        top.paste(frames[k].resize(half, Image.LANCZOS), (half[0] * i, 28))
        d.text((half[0] * i + 8, 5), f"{LABEL[k][0]}: {name}", fill=LABEL[k][1], font=SMALL)
    cw, chh = crops["A"].size
    z = 2
    strip = Image.new("RGB", (cw * z * len(keys) + 12 * (len(keys) - 1), chh * z + 30), (16, 16, 16))
    d = ImageDraw.Draw(strip)
    for i, k in enumerate(keys):
        x = (cw * z + 12) * i
        strip.paste(crops[k].resize((cw * z, chh * z), Image.BILINEAR), (x, 30))
        d.text((x + 8, 6), f"{k}  2x middle  sharpness {row['lap' + k]:.0f}", fill=LABEL[k][1], font=FONT)
    sheet = Image.new("RGB", (max(top.width, strip.width), top.height + strip.height), (16, 16, 16))
    sheet.paste(top, (0, 0))
    sheet.paste(strip, ((sheet.width - strip.width) // 2, top.height))
    sheet.save(os.path.join(OUT, f"pair_{name}.png"))
    strip.save(os.path.join(OUT, f"crop_{name}.png"))

with open(os.path.join(OUT, "sharpness.json"), "w") as f:
    json.dump(rows, f, indent=1)
for r in rows:
    line = f"{r['shot']:26s} crop B/A {r['ratioB']:.3f} changed {r['changedB'] * 100:4.1f}%"
    if "monRatioB" in r:
        line += f"   monster ({r['monsterShare'] * 100:4.1f}% of the crop) B/A {r['monRatioB']:.3f} changed {r['monChangedB'] * 100:4.1f}%"
    if "ratioC" in r:
        line += f"   C/A crop {r['ratioC']:.3f}" + (f" monster {r['monRatioC']:.3f}" if "monRatioC" in r else "")
    print(line)
