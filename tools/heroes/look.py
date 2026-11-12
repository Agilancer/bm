"""A body looked at in a pose, in its own paint, with no game and no GPU: python tools/heroes/look.py ID --out PIC.png

gaps.py's pictures are for counting holes (one colour a triangle). This is for looking: the body posed with one of the
game's clips and skinned as the GPU skins it (gaps.Body), every sample painted from the albedo at its own UV and lit a
little from the camera's side, seen from any bearing (0: from before it, 90: from its left, as the review sheets count).

  python tools/heroes/look.py paladin_m2 --pose cheer --yaw 20,180 --out tools/build/fix/x.png
  python tools/heroes/look.py paladin_m2 --pose cheer --yaw 20 --dir tools/build/fix/before --dir2 assets/game/heroes --out x.png

  --pose   idle, crouch, attack, run, cheer, kick (gaps.POSES), or CLIP@FRACTION (LP_cheer@0.5); several, comma-separated
  --yaw    bearings in degrees, comma-separated
  --dir    where the bodies are (default assets/game/heroes); --dir2: a second place, drawn beside the first
           (before | after), each pair under the other
  --res    a tile's height in pixels (default 640)
  --only   draw only the pieces whose names hold this text (the rest in grey), to see what a piece is
  --zoom   x0,y0,x1,y1 as fractions of the tile, to crop every tile to
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from gaps import HEROES, POSES, Bank, Body  # noqa: E402

LIGHT = np.array([0.35, 0.55, 0.75]) / np.linalg.norm([0.35, 0.55, 0.75])   # in the camera's own frame (right, up, to it)


def posed(B, bank, pose):
    clip, frac = POSES[pose] if pose in POSES else (pose.split("@")[0], float(pose.split("@")[1]) if "@" in pose else 0.5)
    rots = bank.sample(clip, frac) if clip in bank.meta["clips"] else {}
    wq, wt = B.pose(rots)
    return B.skin(wq, wt)


def draw(B, P, N, yaw, res, only=None, frame=None):
    """One tile: the posed body from one bearing. frame: (centre, height) to hold the camera still between two bodies."""
    c, s = np.cos(yaw), np.sin(yaw)
    dirv = np.array([s, 0, c]); right = np.array([c, 0, -s]); up = np.array([0, 1, 0])
    if frame is None:
        lo, hi = P.min(0), P.max(0)
        frame = ((lo + hi) / 2, hi[1] - lo[1])
    cx, height = frame
    px = height * 1.12 / res
    W = int(res * 0.8)
    tris = B.idx
    a, b, cc = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    area = np.linalg.norm(np.cross(b - a, cc - a), axis=1) / 2
    n_per = np.clip(np.ceil(area / (px * px) * 5), 1, 1500).astype(np.int64)
    tid = np.repeat(np.arange(len(tris)), n_per)
    u = np.random.rand(len(tid)); v = np.random.rand(len(tid))
    f = u + v > 1
    u[f] = 1 - u[f]; v[f] = 1 - v[f]
    w0 = 1 - u - v
    t = tris[tid]
    pts = P[t[:, 0]] * w0[:, None] + P[t[:, 1]] * u[:, None] + P[t[:, 2]] * v[:, None]
    uv = B.uv[t[:, 0]] * w0[:, None] + B.uv[t[:, 1]] * u[:, None] + B.uv[t[:, 2]] * v[:, None]
    nn = N[t[:, 0]] * w0[:, None] + N[t[:, 1]] * u[:, None] + N[t[:, 2]] * v[:, None]
    rel = pts - cx
    sx = (rel @ right) / px + W / 2
    sy = res / 2 - (rel @ up) / px
    depth = -(rel @ dirv)
    ix = np.floor(sx).astype(np.int64); iy = np.floor(sy).astype(np.int64)
    ok = (ix >= 0) & (ix < W) & (iy >= 0) & (iy < res)
    ix, iy, depth, tid, uv, nn = ix[ok], iy[ok], depth[ok], tid[ok], uv[ok], nn[ok]
    key = iy * W + ix
    order = np.lexsort((depth, key))
    key = key[order]
    first = np.ones(len(key), bool)
    first[1:] = key[1:] != key[:-1]
    sel = order[first]
    Ht, Wt = B.albedo.shape[:2]
    mail = uv[sel, 0] >= 1.5
    tx = np.clip(uv[sel, 0] * Wt, 0, Wt - 1).astype(int); ty = np.clip(uv[sel, 1] * Ht, 0, Ht - 1).astype(int)
    col = B.albedo[ty, tx].copy()
    col[mail] = (0.30, 0.31, 0.34)
    if only is not None:
        names = [p["name"] for p in B.pieces]
        hit = np.array([only in n for n in names] or [False])
        on = hit[np.clip(B.piece[tris[tid[sel], 0]], 0, len(hit) - 1)]
        col[~on] = col[~on].mean(1, keepdims=True) * 0.25 + 0.35
        col[on] = col[on] * 0.5 + np.array([0.5, 0.0, 0.5])
    n = nn[sel]
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    ncam = np.stack([n @ right, n @ up, n @ dirv], 1)
    ncam[ncam[:, 2] < 0] *= -1          # two-sided, as the game draws it
    lit = 0.45 + 0.75 * np.clip(ncam @ LIGHT, 0, 1)
    img = np.zeros((res * W, 3), np.float32) + np.array([0.36, 0.42, 0.36], np.float32)
    img[key[first]] = np.clip(col * lit[:, None] * 1.25, 0, 1)
    return (img.reshape(res, W, 3) * 255).astype(np.uint8), frame


def main():
    args = sys.argv[1:]

    def opt(name, default=None):
        if name in args:
            k = args.index(name); v = args[k + 1]; del args[k:k + 2]
            return v
        return default

    out = opt("--out", os.path.join(ROOT, "tools", "build", "fix", "look.png"))
    poses = opt("--pose", "idle").split(",")
    yaws = [float(x) for x in opt("--yaw", "0,90,180,270").split(",")]
    d1 = opt("--dir", HEROES); d2 = opt("--dir2")
    res = int(opt("--res", "640"))
    only = opt("--only")
    zoom = opt("--zoom")
    zoom = [float(x) for x in zoom.split(",")] if zoom else None
    bank = Bank()
    rows = []
    for body_id in args:
        for pose in poses:
            for d in ([d1, d2] if d2 else [d1]):
                np.random.seed(1)
                B = Body(os.path.join(d, f"{body_id}.glb"))
                P, N = posed(B, bank, pose)
                tiles = []
                if d is d1:
                    frames = {}
                for yaw in yaws:
                    im, frames[yaw] = draw(B, P, N, np.deg2rad(yaw), res, only, frames.get(yaw) if d is not d1 else None)
                    if zoom:
                        h, w = im.shape[:2]
                        im = im[int(zoom[1] * h):int(zoom[3] * h), int(zoom[0] * w):int(zoom[2] * w)]
                    pic = Image.fromarray(im)
                    tag = f"{body_id} {pose} {yaw:g}" + (("  BEFORE" if d is d1 else "  AFTER") if d2 else "")
                    ImageDraw.Draw(pic).text((6, 4), tag, fill=(255, 255, 160))
                    tiles.append(pic)
                rows.append(tiles)
    tw, th = rows[0][0].size
    if d2:
        # before | after pairs, side by side, a bearing each pair.
        sheet = Image.new("RGB", (tw * 2 * len(yaws), th * (len(rows) // 2)), (20, 20, 20))
        for r in range(0, len(rows), 2):
            for k in range(len(yaws)):
                sheet.paste(rows[r][k], (k * 2 * tw, (r // 2) * th))
                sheet.paste(rows[r + 1][k], (k * 2 * tw + tw, (r // 2) * th))
    else:
        sheet = Image.new("RGB", (tw * len(yaws), th * len(rows)), (20, 20, 20))
        for r, tiles in enumerate(rows):
            for k, pic in enumerate(tiles):
                sheet.paste(pic, (k * tw, r * th))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    sheet.save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
