"""Quick look at cut staffs, no Blender: each item's front (from -X) and side (from +Z), flat textured, hanging parts tinted.

    python tools/staffs2/preview.py out.png s01a s01b ...      (or a sheet number: all of that sheet's)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cut  # noqa: E402
from staffs import STAFFS  # noqa: E402

H = 520


def load(name):
    import json, struct
    path = os.path.join(cut.OUT, f"{name}.glb")
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    g = cut.read_glb(path)
    a = j["meshes"][0]["primitives"][0]["attributes"]
    D = None
    if "_DANGLE" in a:
        sb = raw[20 + jl + 8:]
        acc = j["accessors"][a["_DANGLE"]]
        bv = j["bufferViews"][acc["bufferView"]]
        D = np.frombuffer(sb, np.float32, acc["count"] * 2, bv["byteOffset"]).reshape(-1, 2)
    g["D"] = D
    return g


def view(g, axis):
    P, F, UV, alb = g["P"], g["F"], g["UV"], g["maps"][0]
    if axis == "front":
        sx, sy, depth = P[:, 2], P[:, 1], -P[:, 0]
    else:
        sx, sy, depth = -P[:, 0], P[:, 1], -P[:, 2]
    y0, y1 = -1.25, 0.75
    k = H / (y1 - y0)
    w = int(max(0.5, np.abs(sx).max() * 2 + 0.06) * k)
    img = Image.new("RGB", (w, H), (40, 40, 44))
    d = ImageDraw.Draw(img)
    X = w / 2 + sx * k
    Y = H - (sy - y0) * k
    order = np.argsort(depth[F].mean(1))   # far first
    h, ww = alb.shape[:2]
    c = UV[F].mean(1)
    col = alb[np.clip((c[:, 1] * h).astype(int), 0, h - 1), np.clip((c[:, 0] * ww).astype(int), 0, ww - 1)].astype(float)
    if g["D"] is not None:
        dd = g["D"][F, 1].mean(1)
        col = col * (1 - 0.6 * dd[:, None]) + np.array([255, 40, 200]) * 0.6 * dd[:, None]
    for t in order:
        f = F[t]
        d.polygon([(X[i], Y[i]) for i in f], fill=tuple(int(v) for v in col[t]))
    # the fist
    d.ellipse([w / 2 - 3, H - (0 - y0) * k - 3, w / 2 + 3, H - (0 - y0) * k + 3], outline=(255, 255, 0))
    return img


def main():
    out = sys.argv[1]
    names = []
    for a in sys.argv[2:]:
        names += [s["id"] for s in STAFFS if str(s["sheet"]) == a] if a.isdigit() else [a]
    tiles = []
    for n in names:
        g = load(n)
        a, b = view(g, "front"), view(g, "side")
        t = Image.new("RGB", (a.width + b.width + 4, H + 16), (20, 20, 20))
        t.paste(a, (0, 16)); t.paste(b, (a.width + 4, 16))
        ImageDraw.Draw(t).text((3, 2), n, fill=(255, 255, 255))
        tiles.append(t)
    W = sum(t.width + 6 for t in tiles)
    sheet = Image.new("RGB", (W, H + 16), (0, 0, 0))
    x = 0
    for t in tiles:
        sheet.paste(t, (x, 0)); x += t.width + 6
    sheet.save(out)


if __name__ == "__main__":
    main()
