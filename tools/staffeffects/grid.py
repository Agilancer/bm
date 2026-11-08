"""Gridded front views of the staffs' heads, to set each one's power point by eye: python tools/staffeffects/grid.py out_prefix"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cores  # noqa: E402

K = 1000


def cell(g, sid):
    P, F, UV, alb = g["P"], g["F"], g["UV"], g["maps"][0]
    top = P[:, 1].max()
    y0 = np.floor((top - 0.5) * 20) / 20
    y1 = y0 + 0.55
    W, H = 300, int(0.55 * K)
    img = Image.new("RGB", (W, H), (40, 40, 44))
    d = ImageDraw.Draw(img)
    X, Y = W / 2 + P[:, 2] * K, H - (P[:, 1] - y0) * K
    hh, ww = alb.shape[:2]
    cc = UV[F].mean(1)
    col = alb[np.clip((cc[:, 1] * hh).astype(int), 0, hh - 1), np.clip((cc[:, 0] * ww).astype(int), 0, ww - 1)]
    keep = P[F][:, :, 1].mean(1) > y0
    for t in np.nonzero(keep)[0][np.argsort(-P[F[keep]][:, :, 0].mean(1))]:
        d.polygon([(X[i], Y[i]) for i in F[t]], fill=tuple(int(v) for v in col[t]))
    for i in range(12):
        y = y0 + i * 0.05
        py = H - (y - y0) * K
        d.line([(0, py), (W, py)], fill=(0, 255, 255) if i % 2 == 0 else (0, 120, 120), width=1)
        d.text((2, py - 11), f"{y:.2f}", fill=(0, 255, 255))
    for z in (-0.1, -0.05, 0, 0.05, 0.1):
        px = W / 2 + z * K
        d.line([(px, 0), (px, H)], fill=(255, 140, 0) if z == 0 else (130, 70, 0), width=1)
        d.text((px + 2, H - 12), f"{z:+.2f}", fill=(255, 140, 0))
    d.rectangle([0, 0, W, 14], fill=(0, 0, 0))
    d.text((3, 1), sid, fill=(255, 255, 0))
    return img


ids = cores.staff_ids()
for b in range(0, len(ids), 12):
    cells = [cell(cores.cut.read_glb(os.path.join(cores.ITEMS, f"{s}.glb")), s) for s in ids[b:b + 12]]
    sheet = Image.new("RGB", (300 * 6, cells[0].height * 2), (0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % 6) * 300, (i // 6) * c.height))
    sheet.save(f"{sys.argv[1]}{b // 12}.png")
    print(b // 12, ids[b:b + 12])
