"""Finds how far each finger of a sculpt has to move to sit on the picture, against the outline read off the picture. A finger
that's already close is left alone. Run after match.py:

    python tools/fp_spells/fit_fingers.py attack

Writes <model>_nudges.json, which fix.py applies through Blender MCP.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize

import match
import morph

OUT = match.OUT
# Fingers side by side can sit inside the picture's outline, on each other's place in it, and an outline can't tell them apart. They
# need moving all the same, or the picture's paint lands on them in stripes. So these are set by hand, as morph.nudge takes them,
# from where their tips are measured to be in the picture.
BY_HAND = dict(raise_=dict(
    R_middle=[8, -8, 12, -12, 15, -14, 0.95, 0.95, 0.95],
    R_ring=[4, -9, 6, -13, 8, -17, 0.92, 0.92, 0.92],
))
CROSSING = 6.0      # what a pixel of a finger lying over one of its neighbours costs, on top of what it covered at the start
LEAVE = 8.0         # a finger within this many pixels of the picture, at the worst 5%, stays exactly as it is
# A finger's own vertices stop where it parts from its neighbours, but a thumb and a pinky carry on down the hand, and what's wrong
# with them can lie there. So theirs reach this much further back, metres, within a soft tube round the finger's line.
REACH_BACK = dict(thumb=0.06, pinky=0.035)
TUBE = (1.5, 2.6)   # (the tube's radius, full and faded out, against the finger's own)
GAIN = 40           # (what a finger has to win, in pixels of outline, for the move to be worth it)


def fill(mask, pts, tris, ox, oy, w, h):
    im = Image.new("1", (w, h))
    dr = ImageDraw.Draw(im)
    q = pts - [ox, oy]
    for a, b, c in tris:
        dr.polygon([tuple(q[a]), tuple(q[b]), tuple(q[c])], fill=1)
    return np.asarray(im, bool)


def main(model):
    d = np.load(os.path.join(OUT, model + "_mesh.npz"))
    Q, tri = d["Q"].copy(), d["tri"]
    cam = json.load(open(os.path.join(OUT, model + "_camera.json")))
    mask = match.picture(model)
    dist = ndimage.distance_transform_edt(~mask)
    hands = json.load(open(os.path.join(OUT, model + "_fingers.json")))["hands"]
    uv0, _ = match.project(Q, cam)
    res = {}
    for side, h in hands.items():
        f = np.array(h["f"])
        for b in h["fingers"]:
            ids = np.array(b["verts"])
            t = np.clip((f[ids] - b["saddle"]) / (b["tip_f"] - b["saddle"]), 0, 1)
            wts = np.ones(len(ids))
            back = REACH_BACK.get(b["name"], 0)
            if back:
                line = morph.axis_of(Q[ids], t)
                far, near = line[np.argmax(t)], line[np.argmin(t)]
                u_ = (far - near) / np.linalg.norm(far - near)
                r_ = float(np.median(np.linalg.norm(Q[ids] - line, axis=1)))
                rest = np.where((f >= b["saddle"] - back) & (f < b["saddle"]) & (np.sign(Q[:, 0]) == np.sign(Q[ids[0], 0])))[0]
                rest = np.setdiff1d(rest, ids)
                dv = Q[rest] - near
                off = np.linalg.norm(dv - (dv @ u_)[:, None] * u_, axis=1)
                w_ = np.clip((TUBE[1] * r_ - off) / ((TUBE[1] - TUBE[0]) * r_), 0, 1)
                keep = w_ > 0
                ids = np.r_[ids, rest[keep]]
                wts = np.r_[wts, w_[keep]]
                low = b["saddle"] - back
                t = np.clip((f[ids] - low) / (b["tip_f"] - low), 0, 1)
            inside = np.zeros(len(Q), bool)
            inside[ids] = True
            mine = inside[tri].any(1)
            local = -np.ones(len(Q), int)
            local[ids] = np.arange(len(ids))
            outer = np.setdiff1d(np.unique(tri[mine]), ids)     # (triangles that only touch the finger stay with it, their far corners still)
            local[outer] = len(ids) + np.arange(len(outer))
            ftri = local[tri[mine]]
            p0 = Q[ids]
            still = Q[outer]
            u = uv0[ids]
            ox, oy = (u.min(0) - 60).astype(int)
            x1, y1 = (u.max(0) + 60).astype(int)
            ox, oy = max(ox, 0), max(oy, 0)
            w, h_ = min(x1, match.W) - ox, min(y1, match.H) - oy
            near = (uv0[tri[~mine]].max(1) > [ox, oy]).all(1) & (uv0[tri[~mine]].min(1) < [ox + w, oy + h_]).all(1)
            bg = fill(None, uv0 - 0, tri[~mine][near], ox, oy, w, h_)
            want = mask[oy:oy + h_, ox:ox + w]
            nb = np.zeros(len(Q), bool)
            for o in h["fingers"]:
                if o is not b:
                    nb[o["verts"]] = True
            nb[ids] = False
            nbt = tri[nb[tri].all(1)]
            neighbours = fill(None, uv0, nbt, ox, oy, w, h_)

            def cost(x, pure=False):
                p = p0 + wts[:, None] * (morph.nudge(p0, t, x, cam) - p0)
                pts, _ = match.project(np.vstack([p, still]), cam)
                s = bg | fill(None, pts, ftri, ox, oy, w, h_)
                c = float((s ^ want).sum())
                if pure:
                    return c
                c += CROSSING * max(float((fill(None, pts, ftri, ox, oy, w, h_) & neighbours).sum()) - crossed0, 0)
                # stay close to the sculpt: nudges cost a little, and so does thickness
                wild = np.maximum(np.abs(np.asarray(x[:6])) - 40, 0)      # (a finger can't land on the next finger's place in the picture)
                return c + 0.06 * float(np.sum(np.square(x[:6]))) + 500 * float(np.sum(np.square(np.asarray(x[6:]) - 1))) + 50 * float(np.sum(wild * wild))

            crossed0 = float((fill(None, match.project(np.vstack([p0, still]), cam)[0], ftri, ox, oy, w, h_) & neighbours).sum())
            start = np.array([0, 0, 0, 0, 0, 0, 1.0, 1.0, 1.0])
            before = cost(start, True)
            off0 = dist[np.clip(np.round(u[:, 1]).astype(int), 0, match.H - 1), np.clip(np.round(u[:, 0]).astype(int), 0, match.W - 1)]
            worst0 = float(np.percentile(off0, 95))
            fixed = BY_HAND.get(model + "_", {}).get(side + "_" + b["name"])
            if fixed:
                x = np.array(fixed, float)
            else:
                r = optimize.minimize(cost, start, method="Powell", options=dict(maxiter=10, xtol=0.05, ftol=1e-3,
                    direc=np.diag([4, 4, 4, 4, 4, 4, 0.05, 0.05, 0.05])))
                x = r.x
            x[6:] = np.clip(x[6:], 0.65, 1.12)
            p1 = p0 + wts[:, None] * (morph.nudge(p0, t, x, cam) - p0)
            u1, _ = match.project(p1, cam)
            off1 = dist[np.clip(np.round(u1[:, 1]).astype(int), 0, match.H - 1), np.clip(np.round(u1[:, 0]).astype(int), 0, match.W - 1)]
            worst1 = float(np.percentile(off1, 95))
            after = cost(x, True)
            use = bool(fixed) or (worst0 > LEAVE and before - after > GAIN)
            moved = float(np.linalg.norm(p1 - p0, axis=1).max()) * 1000
            print("%s %-6s outline wrong %5d -> %5d px, worst 5%%: %4.1f -> %4.1f px, thickness %.2f %.2f %.2f, up to %4.1f mm: %s" % (
                side, b["name"], before, after, worst0, worst1, x[6], x[7], x[8], moved, "MOVE" if use else "leave"))
            if use:
                res[side + "_" + b["name"]] = dict(x=x.tolist(), ids=ids.tolist(), t=t.tolist(), w=wts.tolist(), before=before, after=after, moved_mm=moved)
                Q[ids] = p1
                uv0[ids] = u1
    with open(os.path.join(OUT, model + "_nudges.json"), "w") as fp:
        json.dump(res, fp, indent=1)
    print(len(res), "fingers move")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "attack")
