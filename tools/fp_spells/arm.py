"""The sculpts' arms stop at a rough cut about at the elbow, on the screen, where the pictures' run on out of the frame. This lays
the forearm's outline onto the picture's, and works out a sleeve to carry on from the cut: a strip of the picture itself,
curved round, and running on past the edge of the frame so that no shape of screen and no move of the arm can show where it ends.

    python tools/fp_spells/arm.py attack

Writes <model>_arm.npz, which fix.py applies, and <model>_sleeve.npz.
"""
import json
import os
import sys

import numpy as np
from scipy import ndimage

import cast
import match

OUT = cast.BUILD
STEP = 16           # pixels between the stations along an arm
FADE = (0.10, 0.34) # how far down the arm, of its length, its outline starts being moved
ACROSS = 14         # points across the sleeve
PAST_FRAME = 1.0    # how far the sleeve carries on, past the frame's corner, of the picture's height
OVERLAP = 90        # how far up the arm the sleeve starts, behind the sculpt, pixels from where the cut begins


def march(mask, c, p):
    """From c along p, how far the skin goes, and whether the frame stopped it."""
    h, w = mask.shape
    o = 0.0
    while True:
        o += 2.0
        x, y = c + p * o
        if not (0 <= x < w and 0 <= y < h):
            return o, True
        if not mask[int(y), int(x)]:
            return o, False


def extents(mask, wrist, a, p, stations):
    lo, hi, lo_cut, hi_cut = [], [], [], []
    for s in stations:
        c = wrist + a * s
        if not (0 <= c[0] < mask.shape[1] and 0 <= c[1] < mask.shape[0]) or not mask[int(c[1]), int(c[0])]:
            lo.append(np.nan); hi.append(np.nan); lo_cut.append(True); hi_cut.append(True)
            continue
        o1, c1 = march(mask, c, -p)
        o2, c2 = march(mask, c, p)
        lo.append(-o1); hi.append(o2); lo_cut.append(c1); hi_cut.append(c2)
    return np.array(lo), np.array(hi), np.array(lo_cut), np.array(hi_cut)


def carry_on(v, cut, x):
    """Where the frame cut an edge off, it carries on the way it was going."""
    v = v.copy()
    good = np.where(~cut & np.isfinite(v))[0]
    last = good[-1]
    tail = good[max(0, len(good) - 10):]
    slope = np.polyfit(x[tail], v[tail], 1)[0]
    v[last + 1:] = v[last] + slope * (x[last + 1:] - x[last])
    bad = ~np.isfinite(v)
    v[bad] = np.interp(x[bad], x[~bad], v[~bad])
    return v


def main(model):
    d = np.load(os.path.join(OUT, model + "_mesh.npz"))
    Q = d["Q"]
    cam = json.load(open(os.path.join(OUT, model + "_camera.json")))
    hands = json.load(open(os.path.join(OUT, model + "_fingers.json")))["hands"]
    mask = ndimage.binary_fill_holes(match.picture(model))
    eye, cx, cy, cz = cast.morph.camera_axes(cam)
    uv, z = match.project(Q, cam)
    ids_all, delta_all = [], []
    sleeves = {}
    for side in "RL":
        h = cast.hand_of(Q, hands[side], side, eye, model)
        ids = h["on"][h["f"][h["on"]] < h["f_wrist"]]
        wrist = match.project(h["wrist"][None], cam)[0][0]
        end = uv[h["stump"]].mean(0)
        a = (end - wrist) / np.linalg.norm(end - wrist)
        p = np.array([-a[1], a[0]])
        s = (uv[ids] - wrist) @ a
        o = (uv[ids] - wrist) @ p
        length = s.max()
        stations = np.arange(0, length + STEP, STEP)
        lo_s, hi_s, count = [], [], []
        for st in stations:
            m = np.abs(s - st) < STEP
            count.append(m.sum())
            lo_s.append(np.percentile(o[m], 1) if m.sum() > 3 else np.nan)
            hi_s.append(np.percentile(o[m], 99) if m.sum() > 3 else np.nan)
        lo_s, hi_s = np.array(lo_s), np.array(hi_s)
        # past where the cut starts to take bites out of it, the sculpt's arm goes on as it was
        width = hi_s - lo_s
        keep = np.isfinite(width)
        whole = np.where(keep & (width >= np.maximum.accumulate(np.nan_to_num(width)) * 0.92))[0][-1]
        tr = max(whole - 3, 2)
        st_tail = stations[tr - 2:tr + 1]
        for v in (lo_s, hi_s):
            slope = np.polyfit(st_tail, v[tr - 2:tr + 1], 1)[0]
            v[tr + 1:] = v[tr] + slope * (stations[tr + 1:] - stations[tr])
        lo_p, hi_p, lc, hc = extents(mask, wrist, a, p, stations)
        lo_p, hi_p = carry_on(lo_p, lc, stations), carry_on(hi_p, hc, stations)
        lo_p, hi_p = ndimage.gaussian_filter1d(lo_p, 1.5), ndimage.gaussian_filter1d(hi_p, 1.5)
        w = np.clip((s / length - FADE[0]) / (FADE[1] - FADE[0]), 0, 1)
        w = w * w * (3 - 2 * w)
        ls, hs = np.interp(s, stations, lo_s), np.interp(s, stations, hi_s)
        lp, hp = np.interp(s, stations, lo_p), np.interp(s, stations, hi_p)
        new = lp + (o - ls) / np.maximum(hs - ls, 1) * (hp - lp)
        dv = p[None] * ((new - o) * w)[:, None]
        delta = (dv[:, 0, None] * cx - dv[:, 1, None] * cy) * (z[ids] / cam["f"])[:, None]
        ids_all.append(ids)
        delta_all.append(delta)
        print("%s arm: %d points, outline was up to %.0f px off the picture, cut starts %.0f px down it of %.0f" % (
            side, len(ids), float(np.abs((new - o) * w).max()), stations[tr], length))
        # --- the sleeve: from a bit above the cut, on past the corner of the frame
        start = stations[tr] - OVERLAP
        corners = np.array([[0, 0], [match.W, 0], [0, match.H], [match.W, match.H]], float)
        finish = max(((corners - wrist) @ a).max(), 0) + PAST_FRAME * match.H
        far = np.arange(start, finish + STEP * 2, STEP * 2)
        lo_f, hi_f, lc, hc = extents(mask, wrist, a, p, far)
        lo_f, hi_f = carry_on(lo_f, lc, far), carry_on(hi_f, hc, far)
        lo_f, hi_f = ndimage.gaussian_filter1d(lo_f, 2.0), ndimage.gaussian_filter1d(hi_f, 2.0)
        # how deep the arm is along its length, on from the sculpt's, and never too near the eye
        m = (s > 0.3 * length) & (s < stations[tr])
        depth = np.polyfit(s[m], z[ids][m], 1)
        zc = np.maximum(np.polyval(depth, far) + 0.02, 2.1)
        # the sculpt gives way to the sleeve a little above where it's cut, so that the cut itself is never drawn
        sleeves[side] = dict(far=far, lo=lo_f, hi=hi_f, z=zc, wrist=wrist, a=a, p=p, drop=ids[s > stations[tr] - 10],
                             seam=ids[(s > stations[tr] - 80) & (s <= stations[tr] - 10)])
    np.savez(os.path.join(OUT, model + "_arm.npz"), ids=np.concatenate(ids_all), delta=np.vstack(delta_all))
    np.savez(os.path.join(OUT, model + "_sleeve.npz"), **{"%s_%s" % (k, s): v for s, g in sleeves.items() for k, v in g.items()})
    # the picture, for the sleeve: the skin spread out over the screen behind it, so its edge can't show
    from PIL import Image
    pic = np.asarray(Image.open(os.path.join(cast.ROOT, "art", "fp_spells", model + "_reference.png")).convert("RGB"))
    inner = ndimage.binary_erosion(mask, iterations=3)
    near = ndimage.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    filled = pic[near[0], near[1]]
    Image.fromarray(filled[cast.SLEEVE_TOP:]).resize((1024, int(1024 * (match.H - cast.SLEEVE_TOP) / match.W)), Image.LANCZOS).save(os.path.join(OUT, model + "_sleeve.png"))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "attack")
