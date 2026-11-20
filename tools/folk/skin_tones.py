"""Each folk body's face, its skin's mean colour (linear), for matching heads to necks (tools/phobos/crowd_tints.py: a swap
wears another's head only if their skins are near enough the same that the neck doesn't show it). Read off the body's own
colour map where its face's front-facing vertices fall, what of that is skin (the same test the shader makes, src/gfx/
materials.js).

    python tools/folk/skin_tones.py        writes tools/folk/skin_tones.json
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from head_scale import read, view  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
FOLK = os.path.join(ROOT, "assets", "game", "folk")


def ss(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def tone(k, m):
    data, js, jl, b0 = read(os.path.join(FOLK, m["glb"]))
    skin = js["skins"][0]
    names = [js["nodes"][j].get("name", "") for j in skin["joints"]]
    hj = [i for i, n in enumerate(names) if n.lower().split(":")[-1] in ("head", "headtop_end")]
    if not hj: return None
    M = view(data, js, b0, skin["inverseBindMatrices"]).astype(np.float64)[hj[0]].reshape(4, 4).T
    J = np.linalg.inv(M)[:3, 3]
    pr = js["meshes"][0]["primitives"][0]["attributes"]
    pos = view(data, js, b0, pr["POSITION"]); nrm = view(data, js, b0, pr["NORMAL"]); uv = view(data, js, b0, pr["TEXCOORD_0"])
    jo = view(data, js, b0, pr["JOINTS_0"]).astype(int); we = view(data, js, b0, pr["WEIGHTS_0"]).astype(np.float64)
    if we.max() > 1.5: we = we / (255.0 if we.max() <= 255 else 65535.0)
    w = (np.isin(jo, hj) * we).sum(1)
    sel = (w > 0.9) & (nrm[:, 2] > 0.5) & (pos[:, 1] > J[1] + 0.02) & (pos[:, 1] < J[1] + 0.13)
    if sel.sum() < 20: return None
    img = np.asarray(Image.open(os.path.join(FOLK, m["c"])).convert("RGB")).astype(np.float64) / 255
    H, W = img.shape[:2]
    px = img[np.clip((uv[sel, 1] * H).astype(int), 0, H - 1), np.clip((uv[sel, 0] * W).astype(int), 0, W - 1)]
    lin = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)
    mx = lin.max(1); dl = mx - lin.min(1); r, g, b = lin.T
    with np.errstate(all="ignore"): h = np.where(mx == r, (g - b) / dl, np.where(mx == g, 2 + (b - r) / dl, 4 + (r - g) / dl))
    h = np.where(dl > 1e-4, np.mod(h / 6 + 1, 1), 0); s = np.where(mx > 1e-4, dl / np.maximum(mx, 1e-6), 0)
    sk = (1 - ss(0.055, 0.07, h)) * ss(0.3, 0.42, s) * (1 - ss(0.8, 0.88, s)) * ss(0.02, 0.07, mx)
    if (sk > 0.5).sum() < 10: return None
    c = lin[sk > 0.5].mean(0)
    return [round(float(v), 4) for v in c]


if __name__ == "__main__":
    f = json.load(open(os.path.join(FOLK, "folk.json")))
    out = {k: t for k, m in f["models"].items() if (t := tone(k, m))}
    json.dump(out, open(os.path.join(HERE, "skin_tones.json"), "w"), indent=0)
    print(len(out), "of", len(f["models"]), "faces read")
