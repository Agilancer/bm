"""Finds each staff's power point: the orb, gem or heart its light lives in, as a sphere in the item's own frame (fist at the
origin, up +Y, the face toward -X). Writes src/items/staffcores.js, and a sheet to check them by eye.

    python tools/staffeffects/cores.py [sheet.png]

Every staff is set by hand in placed.py (from grid.py's sheets); depth comes from the mesh. The automatic search (find) is
kept for a staff not yet placed.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "staffs2"))
import cut  # noqa: E402

ITEMS = os.path.join(ROOT, "assets", "game", "items")
OVERRIDE = {}
sys.path.insert(0, HERE)
from placed import PLACED  # noqa: E402


def placed(g, sid):
    """A hand-set sphere from the front (across, up, radius); its depth is the middle of the mesh behind that disc."""
    z, y, r = PLACED[sid]
    P = g["P"]
    d = np.hypot(P[:, 2] - z, P[:, 1] - y)
    k = d < r * 0.7
    if k.sum() < 4:
        k = d < r * 1.5
    if not k.sum():
        return [0.0, y, z], r
    # The stone, not the cage round it: the brightest of what lies behind the disc.
    alb, UV = g["maps"][0].astype(np.float64) / 255, g["UV"]
    h, w = alb.shape[:2]
    c = alb[np.clip((UV[k, 1] * h).astype(int), 0, h - 1), np.clip((UV[k, 0] * w).astype(int), 0, w - 1)][:, :3]
    hi = c.max(1)
    top = hi >= np.percentile(hi, 60)
    xs = P[k, 0][top]
    # Half way through it, front to back (the paint is often as bright behind as in front).
    x = float((np.percentile(xs, 10) + np.percentile(xs, 90)) / 2)
    return [x, y, z], r


def staff_ids():
    m = json.load(open(os.path.join(ITEMS, "swords.json")))["swords"]
    return [k for k, v in m.items() if v.get("hands") == 3]


# (Only the automatic search wants each staff's glow colour, dumped from src/items/staffglow.js; every staff is placed by hand now.)
_g = os.path.join(ROOT, 'tools', 'build', 'staffglow.json')
GLOW = json.load(open(_g)) if os.path.exists(_g) else {}


def find(g, sid):
    P, UV, alb = g["P"], g["UV"], g["maps"][0].astype(np.float64) / 255
    h, w = alb.shape[:2]
    c = alb[np.clip((UV[:, 1] * h).astype(int), 0, h - 1), np.clip((UV[:, 0] * w).astype(int), 0, w - 1)]
    hi, lo = c.max(1), c.min(1)
    sat = (hi - lo) / np.maximum(hi, 1e-3)
    top = P[:, 1].max()
    t = np.array(GLOW[sid], float)
    t = t / (np.linalg.norm(t) + 1e-6)
    near = (c / (np.linalg.norm(c, axis=1, keepdims=True) + 1e-6)) @ t
    hue = np.clip((near - 0.82) / 0.13, 0, 1)
    head = P[:, 1] > top - 0.5
    # What glows in a painted stone: bright and strongly coloured, or near white and bright.
    score = head * np.clip((hi - 0.45) / 0.4, 0, 1) ** 2 * np.clip((sat - 0.25) / 0.4 + (hi > 0.9) * 0.5, 0, 1) * (0.25 + 0.75 * hue)
    idx = np.nonzero(score > 0.15)[0]
    if len(idx) < 30:
        idx = np.nonzero(head)[0]
        score = head * hi
    Q, S = P[idx], score[idx]
    # The densest lump of it: mean shift from the strongest few, kept where the most weight gathers.
    best, bestw = None, -1
    seeds = Q[np.argsort(-S)[:: max(1, len(Q) // 40)][:40]]
    for s in seeds:
        m = s.copy()
        for _ in range(12):
            d = np.linalg.norm(Q - m, axis=1)
            k = S * (d < 0.05)
            if k.sum() == 0:
                break
            m = (Q * k[:, None]).sum(0) / k.sum()
        wsum = (S * (np.linalg.norm(Q - m, axis=1) < 0.05)).sum()
        if wsum > bestw:
            best, bestw = m, wsum
    d = np.linalg.norm(Q - best, axis=1)
    near = d < 0.1
    r = np.percentile(d[near], 75) if near.sum() > 10 else 0.05
    return [float(v) for v in best], float(np.clip(r * 1.1, 0.03, 0.1))


def front(g, centre, radius, label):
    """The head from the front (-X), the found sphere drawn on it."""
    P, F, UV, alb = g["P"], g["F"], g["UV"], g["maps"][0]
    k = 900
    y0, y1 = P[:, 1].max() - 0.62, P[:, 1].max() + 0.04
    W, H = 300, int((y1 - y0) * k)
    img = Image.new("RGB", (W, H), (40, 40, 44))
    d = ImageDraw.Draw(img)
    X, Y = W / 2 + P[:, 2] * k, H - (P[:, 1] - y0) * k
    hh, ww = alb.shape[:2]
    cc = UV[F].mean(1)
    col = alb[np.clip((cc[:, 1] * hh).astype(int), 0, hh - 1), np.clip((cc[:, 0] * ww).astype(int), 0, ww - 1)]
    keep = P[F][:, :, 1].mean(1) > y0
    for t in np.nonzero(keep)[0][np.argsort(-P[F[keep]][:, :, 0].mean(1))]:
        d.polygon([(X[i], Y[i]) for i in F[t]], fill=tuple(int(v) for v in col[t]))
    cx, cy, r = W / 2 + centre[2] * k, H - (centre[1] - y0) * k, radius * k
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 0, 255), width=2)
    d.text((3, 3), label, fill=(255, 255, 0))
    return img


def main():
    out, cells = {}, []
    for sid in staff_ids():
        g = cut.read_glb(os.path.join(ITEMS, f"{sid}.glb"))
        centre, radius = OVERRIDE.get(sid, (None, None))
        if centre is None and sid in PLACED:
            centre, radius = placed(g, sid)
        if centre is None:
            print("NOT PLACED", sid)
            centre, radius = find(g, sid)
        out[sid] = [round(v, 4) for v in centre] + [round(radius, 4)]
        if len(sys.argv) > 1:
            cells.append(front(g, centre, radius, sid))
        print(sid, out[sid], flush=True)
    with open(os.path.join(ROOT, "src", "items", "staffcores.js"), "w", newline="\n") as f:
        f.write("// Each staff's power point, the orb or gem its light lives in: centre x, y, z and radius in the item's own frame (fist at the\n")
        f.write("// origin, up +Y, face toward -X), before the hand's turn. Made by tools/staffeffects/cores.py.\n")
        f.write("export const STAFF_CORES = {\n")
        for k, v in out.items():
            f.write(f"  {k}: [{', '.join(str(x) for x in v)}],\n")
        f.write("};\n")
    if cells:
        cols = 12
        H = max(c.height for c in cells)
        sheet = Image.new("RGB", (300 * cols, H * ((len(cells) + cols - 1) // cols)), (0, 0, 0))
        for i, c in enumerate(cells):
            sheet.paste(c, ((i % cols) * 300, (i // cols) * H))
        sheet.save(sys.argv[1])


if __name__ == "__main__":
    main()
