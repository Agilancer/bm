"""Lines a sculpt up with the picture it was made from, and measures how far each of its fingers is off. The pictures stand on a
magenta screen, so their outlines can simply be read off them. Needs tools/build/spells/<model>_mesh.npz and _fingers.json,
which fingers.py writes through Blender MCP.

    python tools/fp_spells/match.py attack

Writes <model>_camera.json, the fitted camera, and <model>_match.png, the sculpt's outline over the picture, with a table.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "tools", "build", "spells")
ART = os.path.join(ROOT, "art", "fp_spells")
W, H = 1792, 1024
DOWN = 4
HAND_ROWS = 560     # the fit cares about the hands, so only the top of the picture counts


def picture(model):
    a = np.asarray(Image.open(os.path.join(ART, model + "_reference.png")).convert("RGB"), float)
    magenta = (a[..., 1] < 95) & (a[..., 0] > 170) & (a[..., 2] > 90)
    return ~ndimage.binary_opening(magenta, iterations=1)


def project(Q, c):
    eye, at, f = np.array(c["eye"]), np.array(c["at"]), c["f"]
    z = at - eye
    z = z / np.linalg.norm(z)
    x = np.cross(z, [0, 0, 1.0])
    x /= np.linalg.norm(x)
    y = np.cross(x, z)
    d = Q - eye
    zc = d @ z
    return np.stack([W / 2 + c.get("sx", 0) + f * (d @ x) / zc, H / 2 - c.get("sy", 0) - f * (d @ y) / zc], 1), zc


def silhouette(Q, tri, c, scale=DOWN):
    uv, _ = project(Q, c)
    im = Image.new("1", (W // scale, H // scale))
    dr = ImageDraw.Draw(im)
    pts = uv / scale
    for a, b, d in tri:
        dr.polygon([tuple(pts[a]), tuple(pts[b]), tuple(pts[d])], fill=1)
    return np.asarray(im, bool)


def fit(Q, tri, mask, start):
    small = np.asarray(Image.fromarray(mask).resize((W // DOWN, H // DOWN), Image.NEAREST), bool)
    rows = HAND_ROWS // DOWN
    keep = small[:rows]
    tri_s = tri[::3]

    def unpack(x):
        return dict(eye=[x[0], x[1], x[2]], at=[x[3], x[4], x[5]], f=x[6], sx=x[7], sy=x[8])

    def cost(x):
        s = silhouette(Q, tri_s, unpack(x))[:rows]
        return 1 - (s & keep).sum() / max((s | keep).sum(), 1)
    # the height of the eye first, since a wrong one can't be walked out of: palms up need looking down on
    x0 = np.array(start["eye"] + start["at"] + [start["f"], 0, 0], float)
    d = np.linalg.norm(np.array(start["eye"]) - start["at"])
    tries = []
    for elev in range(0, 75, 5):
        for f in (3400, 4000, 4600, 5200, 5800, 6400, 7000):
            for sy in (-240, -160, -80, 0, 80, 160, 240):
                x = x0.copy()
                x[1] = x[4] - d * np.cos(np.radians(elev))
                x[2] = x[5] + d * np.sin(np.radians(elev))
                x[6], x[8] = f, sy
                tries.append((cost(x), elev, x))
    x0 = min(tries, key=lambda r: r[0])[2]
    best = optimize.minimize(cost, x0, method="Powell", options=dict(maxiter=8, xtol=1e-3, ftol=1e-4,
        direc=np.diag([0.03, 0.3, 0.2, 0.02, 0.1, 0.05, 300, 15, 40])))
    return unpack(best.x), 1 - best.fun


def main(model):
    d = np.load(os.path.join(OUT, model + "_mesh.npz"))
    Q, tri = d["Q"], d["tri"]
    mask = picture(model)
    start = dict(eye=[0.0, -2.6, 1.05], at=[0.0, 0.02, 0.18], f=3900.0)
    path = os.path.join(OUT, model + "_camera.json")
    cam, iou = fit(Q, tri, mask, start)
    with open(path, "w") as fp:
        json.dump(cam, fp, indent=1)
    print("camera", {k: np.round(v, 3).tolist() for k, v in cam.items()}, "overlap of the hands %.3f" % iou)

    sil = silhouette(Q, tri, cam, 1)
    outside = ~mask
    dist_out = ndimage.distance_transform_edt(outside)     # how far a pixel is from the picture's skin
    fingers = json.load(open(os.path.join(OUT, model + "_fingers.json")))["hands"]
    rows = []
    uv, _ = project(Q, cam)
    for side, h in fingers.items():
        for b in h["fingers"]:
            ids = np.array(b["verts"])
            p = np.round(uv[ids]).astype(int)
            on = (p[:, 0] >= 0) & (p[:, 0] < W) & (p[:, 1] >= 0) & (p[:, 1] < H)
            off = dist_out[p[on, 1], p[on, 0]]
            tip = np.round(uv[b["tip"]]).astype(int)
            rows.append((side, b["name"], float(np.mean(off > 0)), float(off.max()) if len(off) else 0, float(np.percentile(off, 95)) if len(off) else 0, tuple(tip)))
    rows.sort(key=lambda r: -r[4])
    print("finger      outside the picture  worst px  95% px")
    for r in rows:
        print("%s %-6s   %5.1f%%             %5.1f   %5.1f   tip at %s" % (r[0], r[1], r[2] * 100, r[3], r[4], r[5]))
    # the sculpt's outline over the picture, cropped to the hands
    a = Image.open(os.path.join(ART, model + "_reference.png")).convert("RGB")
    ar = np.asarray(a).copy()
    edge = sil ^ ndimage.binary_erosion(sil, iterations=2)
    ar[edge] = (40, 255, 90)
    im = Image.fromarray(ar)
    dr = ImageDraw.Draw(im)
    for r in rows:
        dr.text((r[5][0] + 6, r[5][1] - 6), r[0] + " " + r[1], fill=(255, 255, 255))
    im.crop((380, 60, 1420, 560)).save(os.path.join(OUT, model + "_match.png"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "attack")
