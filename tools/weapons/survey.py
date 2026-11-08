"""A quick look at the owner's Tripo weapon sheets, no Blender: each sheet's front (from +Z), flat textured, with the empty columns
that split it marked in red and the loose parts' count. One picture per folder, into tools/build/weapons/survey.

    python tools/weapons/survey.py              every sheet in sheets.py
    python tools/weapons/survey.py Shields      one folder
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbio import read_glb  # noqa: E402
from sheets import SHEETS, sheet_path  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.dirname(HERE)), "tools", "build", "weapons", "survey")
PX = 700          # pixels across a sheet one unit wide


def samples(g, per=4):
    """Points over every triangle (its corners and a few inside), with their texture colours."""
    P, F, UV, alb = g["P"], g["F"], g["UV"], g["maps"][0]
    rng = np.random.default_rng(1)
    a, b = rng.random((2, per, 1, 1))
    flip = a + b > 1
    a, b = np.where(flip, 1 - a, a), np.where(flip, 1 - b, b)
    tri, tuv = P[F], UV[F]
    pts = np.concatenate([P] + [tri[:, 0] + a[k] * (tri[:, 1] - tri[:, 0]) + b[k] * (tri[:, 2] - tri[:, 0]) for k in range(per)])
    uvs = np.concatenate([UV] + [tuv[:, 0] + a[k] * (tuv[:, 1] - tuv[:, 0]) + b[k] * (tuv[:, 2] - tuv[:, 0]) for k in range(per)])
    h, w = alb.shape[:2]
    col = alb[np.clip((uvs[:, 1] * h).astype(int), 0, h - 1), np.clip((uvs[:, 0] * w).astype(int), 0, w - 1)]
    return pts, col


def front(pts, col, px=PX):
    x0, x1 = pts[:, 0].min(), pts[:, 0].max()
    y0, y1 = pts[:, 1].min(), pts[:, 1].max()
    W, H = int((x1 - x0) * px) + 2, int((y1 - y0) * px) + 2
    img = np.full((H, W, 3), 38, np.uint8)
    order = np.argsort(pts[:, 2])               # far first: the camera's at +Z
    X = ((pts[order, 0] - x0) * px).astype(int)
    Y = (H - 1 - (pts[order, 1] - y0) * px).astype(int)
    img[Y, X] = col[order]
    return img, x0


def gaps(pts, step=0.002):
    """The empty runs along X, as (start, end) in the sheet's units."""
    x0 = pts[:, 0].min()
    bins = ((pts[:, 0] - x0) / step).astype(int)
    hit = np.zeros(bins.max() + 1, bool)
    hit[bins] = True
    out, k = [], 0
    while k < len(hit):
        if not hit[k]:
            j = k
            while j < len(hit) and not hit[j]:
                j += 1
            out.append((x0 + k * step, x0 + j * step))
            k = j
        else:
            k += 1
    return out


def one(sheet):
    g = read_glb(sheet_path(sheet))
    pts, col = samples(g)
    img, x0 = front(pts, col)
    im = Image.fromarray(img)
    d = ImageDraw.Draw(im)
    gs = gaps(pts)
    for a, b in gs:
        m = ((a + b) / 2 - x0) * PX
        d.line([(m, 0), (m, im.height)], fill=(255, 40, 40), width=1)
    # tick marks every 0.1 along the bottom, to read positions off
    for t in np.arange(np.ceil(x0 * 10) / 10, pts[:, 0].max(), 0.1):
        x = (t - x0) * PX
        d.line([(x, im.height - 8), (x, im.height)], fill=(255, 255, 0))
        d.text((x + 2, im.height - 18), f"{t:+.1f}", fill=(255, 255, 0))
    label = f"{sheet['file']}  {len(g['F'])} tris  gaps at " + ", ".join(f"{(a + b) / 2:+.3f}" for a, b in gs)
    return label, im


def main():
    want = sys.argv[1:]
    os.makedirs(OUT, exist_ok=True)
    folders = {}
    for s in SHEETS:
        if want and s["folder"] not in want:
            continue
        folders.setdefault(s["folder"], []).append(s)
    with ProcessPoolExecutor(8) as ex:
        for folder, sheets in folders.items():
            got = list(ex.map(one, sheets))
            W = max(im.width for _, im in got)
            H = sum(im.height + 22 for _, im in got)
            out = Image.new("RGB", (W, H), (20, 20, 22))
            d = ImageDraw.Draw(out)
            y = 0
            for label, im in got:
                d.text((4, y + 4), label, fill=(255, 255, 255))
                out.paste(im, (0, y + 20))
                y += im.height + 22
                print(label)
            out.save(os.path.join(OUT, f"{folder}.png"))


if __name__ == "__main__":
    main()
