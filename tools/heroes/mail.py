"""The mail under a hero's plates, made again to cover the gaps: python tools/heroes/mail.py [ids...] [--dry] [--out DIR]

tools/armor/rig_armor.py (add_sleeves) gave every body a short round tube at each joint, a fifth of a metre long and well
inside the plates, with open ends and five rings. Drawn on the heroes as matte cloth they read as grey rubber hoses; where
a body made of parts from several suits had no plate (lancer_f2's chest, paladin_f2's arms) they were the body, or there
was nothing at all and you saw the sky through it. Two reviewers with thirty years of character work each (pass 1,
2026-11-10) asked for what this makes instead, from the body's own plates in its bind pose:

  - A mail liner under the torso's plates, pelvis to the neck, so a chest and back that don't meet show mail, never the
    road behind. Its bottom rides as the belt does, its top as the cuirass does.
  - One mail sleeve shoulder to wrist and one hip to ankle, in place of a tube at each joint: where a bone has plate the
    sleeve sits just inside it (five millimetres in), where it has none the sleeve is sized to an arm or a leg and is a
    mail sleeve you see. Its rings are bunched at the elbow and the knee and a little recessed there, so the bend reads as
    a seam; each stretch rides as the plate over it does.
  - A coif at the neck, narrow at the throat and flared under the gorget and inside the helm, closed at the top; its rings
    inside the helm are marked deep, and the shader draws them as shadow, so an open helm shows a dark opening rather
    than a grey egg for a face.
  - Gussets in the armpits, and a mail skirt from the waist to the thighs under the tassets.
  - Every tube's ends closed, a few centimetres in.

The covers' UVs carry what the shader needs (src/gfx/materials.js, heroLook): u is MAIL_UV plus how far round the tube
(metres; plus 2 for a blackened suit), v how far along it (metres; plus 100 for the deep rings), so the rings are laid
out round each tube at their own size. Cloth pieces are marked in their _PIECE (CLOTH_BIT), so the shader can shade the inside
of a plate as dark iron without darkening a cape's lining. The plates, cloth, paint and skeleton are untouched.
`python tools/heroes/gaps.py` measures what shows through.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
HEROES = os.path.join(ROOT, "assets", "game", "heroes")
sys.path.insert(0, HERE)
from gaps import accessor, load_glb  # noqa: E402

MAIL_UV = 2.0          # u at or past this is a cover (rig_armor.py's own marker)
DARK_UV = 2.0          # ...plus this for a blackened suit
DEEP_V = 100.0         # v plus this for the rings inside a helm, drawn as shadow (it blends across the quad below them)
CLOTH_BIT = 0x4000     # set in _PIECE on cloth (a body has up to a couple of hundred pieces; _PIECE is 16 bits)
SIDES = 16
INSET = 0.005          # how far inside the plates a cover sits
SHRINK = 0.9           # ...and a tenth besides: a plate's flat faces dip inside its corners
# An arm's and a leg's own size where there's no plate on it (a 1.9 m body; women's are this, men's 15% more).
ARM = {"upper": 0.055, "fore": 0.045, "wrist": 0.035}
LEG = {"thigh": 0.075, "knee": 0.06, "calf": 0.055, "ankle": 0.04}


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-9 else v


def frame(axis):
    a = np.array([0.31, 0.87, 0.38])
    side_a = unit(np.cross(axis, a))
    return side_a, np.cross(axis, side_a)


def section(pts, centre, axis, r_min, r_max, keep=0.1, band=0.04):
    """The inside of the plates round `centre` across `axis`, a radius for each of SIDES sectors (the low end of what's
    there), NaN where a sector has nothing. Also how many sectors had something: how far round the plates go."""
    out = np.full(SIDES, np.nan)
    if not len(pts):
        return out, 0
    rel = pts - centre
    along = rel @ axis
    near = np.abs(along) < band
    sa, sb = frame(axis)
    rel = rel[near]
    x, y = rel @ sa, rel @ sb
    rad = np.hypot(x, y)
    ok = (rad < r_max * 1.4) & (rad > r_min * 0.5)
    ang = np.arctan2(y[ok], x[ok]); rad = rad[ok]
    for k in range(SIDES):
        a0 = k / SIDES * 2 * np.pi - np.pi
        d = np.abs(((ang - a0) + np.pi) % (2 * np.pi) - np.pi)
        sel = rad[d < np.pi / SIDES * 1.6]
        if len(sel) >= 4:
            out[k] = np.percentile(sel, keep * 100)
    return out, int((~np.isnan(out)).sum())


def fill(r, default):
    """A section's gaps filled round the ring from its neighbours (or the default where there's nothing), and smoothed."""
    if np.all(np.isnan(r)):
        return np.full(SIDES, default)
    good = ~np.isnan(r)
    idx = np.arange(SIDES)
    r = np.interp(idx, idx[good], r[good], period=SIDES)
    return (np.roll(r, 1) + r * 2 + np.roll(r, -1)) / 4


def tube(rings, njoints, tone, caps=(True, True), cap_in=0.03):
    """Rings (centre, axis, SIDES radii, weights {joint: w}, deep) as a tube with a seam column (so u can run round it),
    and each end closed by a fan to a point cap_in along the tube from it. Returns positions, normals, uvs, weights, tris."""
    vs, ns, uvs, ws = [], [], [], []
    along = 0.0
    prev = None
    for ring in rings:
        c, ax, r, w, deep = ring["c"], ring["ax"], ring["r"], ring["w"], ring.get("deep", False)
        if prev is not None:
            along += np.linalg.norm(c - prev)
        prev = c
        sa, sb = frame(ax)
        base = MAIL_UV + (DARK_UV if tone else 0)
        arc = 0.0
        pts = []
        for k in range(SIDES + 1):
            a = (k % SIDES) / SIDES * 2 * np.pi - np.pi
            d = sa * np.cos(a) + sb * np.sin(a)
            pts.append((c + d * r[k % SIDES], d))
        for k, (p, d) in enumerate(pts):
            if k:
                arc += np.linalg.norm(p - pts[k - 1][0])
            vs.append(p); ns.append(d); uvs.append((base + min(arc, 1.9), along + (DEEP_V if deep else 0)))
            wv = np.zeros(njoints)
            for j, x in w.items():
                wv[j] += x
            ws.append(wv)
    per = SIDES + 1
    tris = []
    for ri in range(len(rings) - 1):
        for k in range(SIDES):
            a, b = ri * per + k, ri * per + k + 1
            c, d = a + per, b + per
            tris += [(a, b, d), (a, d, c)]
    # The ends, closed.
    for end, ri, sign in ((0, 0, -1), (1, len(rings) - 1, 1)):
        if not caps[end]:
            continue
        ring = rings[ri]
        apex = len(vs)
        # (A point a little way in along the tube from its end: a shallow cone into it.)
        vs.append(ring["c"] - ring["ax"] * sign * cap_in); ns.append(ring["ax"] * sign)
        uvs.append((MAIL_UV + (DARK_UV if tone else 0), uvs[ri * per][1]))
        wv = np.zeros(njoints)
        for j, x in ring["w"].items():
            wv[j] += x
        ws.append(wv)
        for k in range(SIDES):
            a, b = ri * per + k, ri * per + k + 1
            tris.append((apex, b, a) if end == 0 else (apex, a, b))
    return np.array(vs), np.array(ns), np.array(uvs), np.array(ws), np.array(tris)


def lerp_w(a, b, t):
    out = {}
    for j, x in a.items():
        out[j] = out.get(j, 0) + x * (1 - t)
    for j, x in b.items():
        out[j] = out.get(j, 0) + x * t
    return out


class Body:
    """What a cover is made from: the joints in the bind pose, each piece's points and binding, and the suit's size."""

    def __init__(self, names, target, pieces, pos, weights, joints, height):
        self.names, self.target, self.height = names, target, height
        self.index = {n: i for i, n in enumerate(names)}
        self.u = height / 1.9
        self.male = height > 1.82
        self.plates = []          # (points, binding {joint index: w}, kind)
        for p in pieces:
            seg = pos[p["vstart"]:p["vstart"] + p["vcount"]]
            if p["kind"] == "cloth" or not p.get("joints"):
                w = weights[p["vstart"]:p["vstart"] + p["vcount"]]; jn = joints[p["vstart"]:p["vstart"] + p["vcount"]]
                tot = {}
                for i in range(0, len(seg), max(1, len(seg) // 60)):
                    for q in range(4):
                        tot[int(jn[i, q])] = tot.get(int(jn[i, q]), 0) + float(w[i, q])
                s = sum(tot.values()) or 1
                bind = {j: x / s for j, x in tot.items() if x / s > 0.15}
            else:
                bind = {int(j): float(x) for j, x in p.get("joints", [])}
            self.plates.append((seg, bind, p["kind"]))
        self.all = pos

    def j(self, n):
        return self.index[n]

    def P(self, n):
        return self.target[n]

    def pts_on(self, names, kinds=("plate", "flex", "cloth")):
        ids = {self.index[n] for n in names if n in self.index}
        sel = [seg for seg, bind, kind in self.plates if kind in kinds and any(j in ids and w > 0.2 for j, w in bind.items())]
        return np.concatenate(sel) if sel else np.zeros((0, 3))

    def binding_near(self, c, r, fallback):
        """The binding of the plate a ring tucks under: the piece with the most points just outside it."""
        best, bn = None, 0
        for seg, bind, kind in self.plates:
            if kind == "cloth" or not bind:
                continue
            d = np.linalg.norm(seg - c, axis=1)
            n = int(((d > r * 0.8) & (d < r + 0.06 * self.u)).sum())
            if n > bn:
                bn, best = n, bind
        return dict(best) if best and bn >= 12 else dict(fallback)


def limb(B, chain, sizes, starts, name):
    """One sleeve down a limb: chain is the joints from the root (shoulder or hip) to the end (wrist or ankle) and the one
    past it (which gives the last stretch its direction); sizes its own radius at root, middle and end where there's no
    plate; starts how far before the root it begins. Rings every few centimetres, bunched round the middle joint."""
    u = B.u
    scale = 1.15 if B.male else 1.0
    a, m, e, tip = (B.P(n) for n in chain)
    ax1, ax2, ax3 = unit(m - a), unit(e - m), unit(tip - e)
    L1, L2 = np.linalg.norm(m - a), np.linalg.norm(e - m)
    W_root, W_mid, W_end = {B.j(chain[0]): 1.0}, {B.j(chain[1]): 1.0}, {B.j(chain[2]): 1.0}
    stations = []        # (point, axis, weights, default radius, recessed, which stretch)
    for s in np.arange(-starts * u, L1 - 0.07 * u, 0.05 * u):
        stations.append((a + ax1 * s, ax1, W_root, (sizes[0] + (sizes[1] - sizes[0]) * max(s, 0) / L1) * u * scale, False, 0))
    # Round the middle joint: rings two centimetres apart, the weights easing over twelve.
    for s, t in ((-0.06, 0.0), (-0.04, 0.12), (-0.02, 0.35), (0.0, 0.5), (0.02, 0.65), (0.04, 0.88), (0.06, 1.0)):
        ax = unit(ax1 * (1 - t) + ax2 * t)
        p = m + (ax1 if s < 0 else ax2) * s * u
        stations.append((p, ax, lerp_w(W_root, W_mid, smooth(t)), sizes[1] * u * scale, abs(s) < 0.03, 0 if s < 0 else 1))
    for s in np.arange(0.1 * u, L2 - 0.05 * u, 0.05 * u):
        stations.append((m + ax2 * s, ax2, W_mid, (sizes[1] + (sizes[2] - sizes[1]) * s / L2) * u * scale, False, 1))
    # Round the end joint (wrist, ankle), a little way past it.
    for s, t in ((-0.03, 0.0), (0.0, 0.5), (0.03, 1.0)):
        ax = unit(ax2 * (1 - t) + ax3 * t)
        stations.append((e + (ax2 if s < 0 else ax3) * s * u, ax, lerp_w(W_mid, W_end, smooth(t)), sizes[2] * u * scale, False, 1 if s < 0 else 2))
    pts = {k: B.pts_on(chain[k:k + 1]) for k in range(3)}
    rings = []
    for p, ax, w, default, recessed, k in stations:
        sec, n = section(pts[k], p, ax, 0.025 * u, 0.2 * u)
        # (Where its own bone has nothing on a side, whatever else is close there: trousers bound to the hips, a coat.)
        near, _ = section(B.all, p, ax, 0.025 * u, default * 1.3)
        sec = np.where(np.isnan(sec), near, sec)
        n = int((~np.isnan(sec)).sum())
        if n >= SIDES * 0.6:
            # Under plate: just inside it, the bend a centimetre further in. Never fatter than twice a limb's own size.
            r = np.minimum(fill(sec * SHRINK - INSET * u, default), default * 2.0) * (0.85 if recessed else 1) - (0.015 * u if recessed else 0)
            r = np.maximum(r, default * 0.6)
        else:
            # Bare: an arm's own size, inside the plate where there's some of it.
            r = np.full(SIDES, default)
            have = ~np.isnan(sec)
            r[have] = np.minimum(r[have], np.maximum(sec[have] * SHRINK - INSET * u, default * 0.6))
            r = fill(r, default) * (0.85 if recessed else 1) - (0.006 * u if recessed else 0)
        rings.append({"c": p, "ax": ax, "r": np.clip(r, 0.02 * u, 0.2 * u), "w": w})
    for i in range(1, len(rings)):
        rings[i]["r"] = np.minimum(rings[i]["r"], rings[i - 1]["r"] * 1.25 + 0.004)
    for i in range(len(rings) - 2, -1, -1):
        rings[i]["r"] = np.minimum(rings[i]["r"], rings[i + 1]["r"] * 1.25 + 0.004)
    return name, rings, chain[1]


def liner(B):
    """The mail under the torso's plates, from the hips to the neck: its bottom bound as the belt is, its top as the
    cuirass is, easing between."""
    u = B.u
    pel, s1, s2, s3, nk = (B.P(n) for n in ("pelvis", "spine_01", "spine_02", "spine_03", "neck_01"))
    pts = B.pts_on(("pelvis", "spine_01", "spine_02", "spine_03"), kinds=("plate", "flex", "cloth"))
    path = [pel + (s1 - pel) * 0.4, s1, s1 + (s2 - s1) * 0.5, s2, s2 + (s3 - s2) * 0.5, s3, s3 + (nk - s3) * 0.35, s3 + (nk - s3) * 0.65]
    rings = []
    for i, c in enumerate(path):
        ax = unit(path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)])
        sec, n = section(pts, c, ax, 0.05 * u, 0.22 * u)
        # (No bigger than a body is, whatever's draped over it: an oval, wider than it's deep.)
        sa, sb = frame(ax)
        ang = np.arange(SIDES) / SIDES * 2 * np.pi - np.pi
        d = np.outer(np.cos(ang), sa) + np.outer(np.sin(ang), sb)
        wide, deep = (0.165 if B.male else 0.15) * u, (0.125 if B.male else 0.115) * u
        cap = 1 / np.sqrt((d[:, 0] / wide) ** 2 + (d[:, 2] / deep) ** 2 + 1e-9)
        cap = np.minimum(cap, wide) * (0.8 if i >= len(path) - 2 else 0.82 if i in (1, 2) else 0.92)
        r = np.minimum(fill(sec * SHRINK - INSET * u, 0.11 * u), cap)
        rings.append({"c": c, "ax": ax, "r": np.clip(r, 0.05 * u, 0.2 * u)})
    bottom = B.binding_near(rings[0]["c"], float(np.mean(rings[0]["r"])), {B.j("pelvis"): 0.5, B.j("spine_01"): 0.5})
    top = B.binding_near(rings[-2]["c"], float(np.mean(rings[-2]["r"])), {B.j("spine_03"): 0.6, B.j("spine_02"): 0.4})
    for i, ring in enumerate(rings):
        ring["w"] = lerp_w(bottom, top, smooth((i - 0.5) / (len(rings) - 2.5)))
    for i in range(1, len(rings)):
        rings[i]["r"] = np.minimum(rings[i]["r"], rings[i - 1]["r"] * 1.2 + 0.004)
    return "mail_liner", rings, "spine_02"


def coif(B):
    """The neck: flared under the gorget, narrow at the throat, flared again up inside the helm and closed at the top. The
    rings above the jaw are deep: drawn as the shadow inside the helm."""
    u = B.u
    s3, nk, hd = B.P("spine_03"), B.P("neck_01"), B.P("Head")
    up = unit(hd - nk)
    pts = B.pts_on(("spine_03", "neck_01", "Head"), kinds=("plate", "flex"))
    stops = [(s3 + (nk - s3) * 0.45, 0.11, {B.j("spine_03"): 1.0}, False),
             (s3 + (nk - s3) * 0.8, 0.09, {B.j("spine_03"): 0.5, B.j("neck_01"): 0.5}, False),
             (nk + up * 0.03 * u, 0.068, {B.j("neck_01"): 1.0}, False),
             (nk + (hd - nk) * 0.7, 0.07, {B.j("neck_01"): 0.4, B.j("Head"): 0.6}, False),
             (hd + up * 0.01 * u, 0.066, {B.j("Head"): 1.0}, True),
             (hd + up * 0.05 * u, 0.05, {B.j("Head"): 1.0}, True)]
    rings = []
    for c, r0, w, deep in stops:
        sec, n = section(pts, c, up, 0.03 * u, 0.16 * u)
        r = np.full(SIDES, r0 * u)
        have = ~np.isnan(sec)
        # (Well inside a helm: its shell is thin and close, and the dark of the coif must never come through it.)
        r[have] = np.minimum(r[have], np.maximum(sec[have] * (0.78 if deep else SHRINK) - INSET * u, r0 * u * 0.5))
        r = fill(r, r0 * u)
        # (Inside a helm, no wider anywhere than three quarters of its narrowest: a closed visor has few points to go by.)
        if deep and have.any():
            r = np.minimum(r, np.nanmin(sec) * 0.75)
        rings.append({"c": c, "ax": up, "r": np.clip(r, 0.025 * u, 0.16 * u), "w": w, "deep": deep})
    return "mail_coif", rings, "neck_01"


def skirt(B, tone):
    """The hauberk's skirt, from the waist to the thighs, under the tassets: its top rides the pelvis, and lower down its
    sides go part with the thigh on that side, so it opens as a skirt does when a knee comes up."""
    u = B.u
    pel, tl, tr_ = B.P("pelvis"), B.P("thigh_l"), B.P("thigh_r")
    down = unit(((B.P("calf_l") + B.P("calf_r")) / 2) - (tl + tr_) / 2)
    side = unit(tl - tr_)
    pts = B.pts_on(("pelvis", "spine_01", "thigh_l", "thigh_r"), kinds=("plate", "flex", "cloth"))
    top_c = pel + (B.P("spine_01") - pel) * 0.3
    rings = []
    for k in range(6):
        t = k / 5
        c = top_c + down * (0.02 + 0.28 * t) * u
        sec, n = section(pts, c, down, 0.08 * u, 0.24 * u)
        r = fill(sec * SHRINK - INSET * u, 0.15 * u)
        rings.append({"c": c, "ax": down, "r": np.clip(r, 0.06 * u, (0.16 if B.male else 0.15) * u), "t": t, "w": {B.j("pelvis"): 1.0}})
    # (Inside whatever's worn over it, never forced out past it; no ring much wider than the one above.)
    for i in range(1, len(rings)):
        rings[i]["r"] = np.minimum(rings[i]["r"], rings[i - 1]["r"] * 1.12 + 0.004)
    njoints = len(B.names)
    vs, ns, uvs, ws, tris = tube(rings, njoints, tone, caps=(False, False))
    per = SIDES + 1
    for ri, ring in enumerate(rings):
        for k in range(per):
            v = ri * per + k
            sx = float(np.dot(unit(vs[v] - ring["c"]), side))
            a = smooth(ring["t"] * 1.25) * 0.5 * (0.35 + 0.65 * abs(sx))
            w = np.zeros(njoints)
            w[B.j("pelvis")] = 1 - a
            w[B.j("thigh_l") if sx > 0 else B.j("thigh_r")] += a
            ws[v] = w
    return vs, ns, uvs, ws, tris


def gusset(B, s, tone):
    """A patch of mail in the armpit, from the side of the chest to the inside of the upper arm, so a raised arm opens onto
    mail. Folded away out of sight with the arm down."""
    u = B.u
    sh, el, s3 = B.P(f"upperarm_{s}"), B.P(f"lowerarm_{s}"), B.P("spine_03")
    arm = unit(el - sh)
    inward = unit((s3 - sh) * np.array([1, 0, 1]))
    downv = np.array([0, -1.0, 0])
    njoints = len(B.names)
    vs, ns, uvs, ws = [], [], [], []
    N = 4
    for i in range(N):          # across: chest side to arm side
        f = i / (N - 1)
        for k in range(N):      # along: from the shoulder down
            g = k / (N - 1)
            chest = sh + inward * 0.05 * u + downv * (0.03 + 0.12 * g) * u
            armside = sh + arm * (0.04 + 0.12 * g) * u + inward * 0.03 * u
            p = chest * (1 - f) + armside * f
            vs.append(p)
            ns.append(unit(np.cross(armside - chest + 1e-6, arm)))
            uvs.append((MAIL_UV + (DARK_UV if tone else 0) + f * 0.14 * u, g * 0.12 * u))
            w = np.zeros(njoints)
            w[B.j("spine_03")] += 1 - f
            w[B.j(f"upperarm_{s}")] += f
            ws.append(w)
    tris = []
    for i in range(N - 1):
        for k in range(N - 1):
            a, b, c, d = i * N + k, i * N + k + 1, (i + 1) * N + k, (i + 1) * N + k + 1
            tris += [(a, b, d), (a, d, c)]
    return np.array(vs), np.array(ns), np.array(uvs), np.array(ws), np.array(tris)


def suit_tone(g, blob, uv, pieces):
    """1 for a blackened suit (its plates' paint dark), 0 for a bright one: so its mail is a step brighter than the plate
    either way, never the lightest thing on it."""
    img = g["images"][g["textures"][g["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]]
    bv = g["bufferViews"][img["bufferView"]]
    a = np.asarray(Image.open(io.BytesIO(blob[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB"), np.float32) / 255
    H, W = a.shape[:2]
    lum = []
    for p in pieces:
        if p["kind"] != "plate":
            continue
        q = uv[p["vstart"]:p["vstart"] + p["vcount"]:7]
        q = q[(q[:, 0] >= 0) & (q[:, 0] <= 1)]
        px = a[np.clip((q[:, 1] * H).astype(int), 0, H - 1), np.clip((q[:, 0] * W).astype(int), 0, W - 1)]
        lum.extend((px @ np.array([0.2126, 0.7152, 0.0722])).tolist())
    return 1 if lum and float(np.median(lum)) < 0.2 else 0


def rebuild(body_id, dry=False, out_dir=None):
    path = os.path.join(HEROES, f"{body_id}.glb")
    g, blob = load_glb(path)
    prim = g["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    A = {k: np.array(accessor(g, blob, v)) for k, v in at.items()}
    idx = np.array(accessor(g, blob, prim["indices"])).reshape(-1, 3).astype(np.int64)
    pieces = g["scenes"][0]["extras"]["pieces"]
    height = g["scenes"][0]["extras"].get("height", 1.8)
    skin = g["skins"][0]
    names = [g["nodes"][n]["name"] for n in skin["joints"]]
    ibm = np.array(accessor(g, blob, skin["inverseBindMatrices"])).reshape(-1, 4, 4).transpose(0, 2, 1)
    target = {n: np.linalg.inv(ibm[i])[:3, 3] for i, n in enumerate(names)}
    # Keep everything that isn't mail, in order.
    keep_p = [k for k, p in enumerate(pieces) if p["kind"] != "mail"]
    vkeep = np.zeros(len(A["POSITION"]), bool)
    tkeep = np.zeros(len(idx), bool)
    new_pieces = []
    for k in keep_p:
        p = pieces[k]
        vkeep[p["vstart"]:p["vstart"] + p["vcount"]] = True
        tkeep[p["tstart"]:p["tstart"] + p["tcount"]] = True
    remap = np.cumsum(vkeep) - 1
    out = {k: v[vkeep] for k, v in A.items()}
    tris = remap[idx[tkeep]]
    vn, tn = 0, 0
    old_to_new = {}
    for k in keep_p:
        p = dict(pieces[k])
        old_to_new[k] = len(new_pieces)
        p["vstart"], p["tstart"] = vn, tn
        vn += p["vcount"]; tn += p["tcount"]
        new_pieces.append(p)
    # (The piece each vertex is on, renumbered; cloth marked for the shader. A body done before has the mark already.)
    pv = np.array(out["_PIECE"]).reshape(-1).astype(np.int64) & (CLOTH_BIT - 1)
    pid = np.array([old_to_new[int(x)] for x in pv], dtype=np.int64)
    kinds = np.array([p["kind"] == "cloth" for p in new_pieces])
    out["_PIECE"] = (pid | np.where(kinds[pid], CLOTH_BIT, 0)).astype(np.float64)
    pos = out["POSITION"].astype(np.float64)
    B = Body(names, target, new_pieces, pos, out["WEIGHTS_0"], out["JOINTS_0"], height)
    tone = suit_tone(g, blob, out["TEXCOORD_0"], new_pieces)
    njoints = len(names)
    adds = []   # (name, (vs, ns, uvs, ws, tris), joint for the piece table)

    def add_rings(name, rings, joint, caps=(True, True)):
        adds.append((name, tube(rings, njoints, tone, caps), joint))

    # (The liner's top is inside the coif's foot, and the coif's foot inside the liner: neither needs closing, and a lit
    # cap there showed as a pale disc down an open helm.)
    add_rings(*liner(B), caps=(True, False))
    add_rings(*coif(B), caps=(False, True))
    for s in "lr":
        add_rings(*limb(B, [f"upperarm_{s}", f"lowerarm_{s}", f"hand_{s}", f"middle_01_{s}"], (ARM["upper"], ARM["fore"], ARM["wrist"]), 0.04, f"mail_arm_{s}"))
        add_rings(*limb(B, [f"thigh_{s}", f"calf_{s}", f"foot_{s}", f"ball_{s}"], (LEG["thigh"], LEG["knee"], LEG["ankle"]), 0.05, f"mail_leg_{s}"))
        adds.append((f"mail_gusset_{s}", gusset(B, s, tone), f"upperarm_{s}"))
    adds.append(("mail_skirt", skirt(B, tone), "pelvis"))
    jt_dtype = out["JOINTS_0"].dtype
    for name, (vs, ns, uvs, ws, tr), joint in adds:
        pidx = len(new_pieces)
        # Up to four joints a vertex, heaviest first (the game reads JOINTS_0/WEIGHTS_0 as four).
        order = np.argsort(-ws, axis=1)[:, :4]
        wsel = np.take_along_axis(ws, order, 1)
        wsel /= np.maximum(wsel.sum(1, keepdims=True), 1e-9)
        lo, hi = vs.min(0), vs.max(0)
        new_pieces.append({"name": name, "kind": "mail", "vstart": vn, "vcount": len(vs), "tstart": tn, "tcount": len(tr),
                           "joints": [[B.j(joint), 1.0]], "min": lo.tolist(), "max": hi.tolist()})
        out["POSITION"] = np.concatenate([out["POSITION"], vs.astype(np.float32)])
        out["NORMAL"] = np.concatenate([out["NORMAL"], ns.astype(np.float32)])
        out["TEXCOORD_0"] = np.concatenate([out["TEXCOORD_0"], uvs.astype(np.float32)])
        out["JOINTS_0"] = np.concatenate([out["JOINTS_0"], order.astype(jt_dtype)])
        out["WEIGHTS_0"] = np.concatenate([out["WEIGHTS_0"], wsel.astype(np.float32)])
        if "_FLEX" in out:
            out["_FLEX"] = np.concatenate([np.array(out["_FLEX"]).reshape(-1), np.zeros(len(vs), np.float32)])
        out["_PIECE"] = np.concatenate([out["_PIECE"], np.full(len(vs), pidx, np.float64)])
        tris = np.concatenate([tris, tr + vn])
        vn += len(vs); tn += len(tr)
    if len(new_pieces) >= CLOTH_BIT:
        raise ValueError(f"{body_id}: {len(new_pieces)} pieces, too many for the cloth mark")
    if dry:
        return new_pieces, out, tris, tone
    write(os.path.join(out_dir, f"{body_id}.glb") if out_dir else path, g, blob, out, tris, new_pieces)
    return new_pieces, out, tris, tone


def write(path, g, blob, attrs, tris, pieces):
    """The same file with the mesh's attributes and indices replaced; every other buffer view (the images, the IBMs) kept."""
    prim = g["meshes"][0]["primitives"][0]
    comp_of = {k: g["accessors"][v]["componentType"] for k, v in prim["attributes"].items()}
    np_of = {5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "u1"}
    kind_of = {k: g["accessors"][v]["type"] for k, v in prim["attributes"].items()}
    mesh_acc = set(prim["attributes"].values()) | {prim["indices"]}
    mesh_views = {g["accessors"][a]["bufferView"] for a in mesh_acc}
    other_views = set(range(len(g["bufferViews"]))) - mesh_views
    # Views something else still uses (the IBM accessor, images) are copied over in order.
    new_blob = bytearray()
    view_map = {}
    views = []
    for vi in sorted(other_views):
        bv = g["bufferViews"][vi]
        off = bv.get("byteOffset", 0)
        new_blob.extend(b"\0" * (-len(new_blob) % 4))
        nv = dict(bv); nv["byteOffset"] = len(new_blob)
        new_blob.extend(blob[off:off + bv["byteLength"]])
        view_map[vi] = len(views); views.append(nv)
    accessors = []
    acc_map = {}
    for ai, a in enumerate(g["accessors"]):
        if ai in mesh_acc:
            continue
        na = dict(a); na["bufferView"] = view_map[a["bufferView"]]
        acc_map[ai] = len(accessors); accessors.append(na)

    def add(data, comp, kind, target, bounds=False):
        raw = np.ascontiguousarray(data).astype(np_of[comp]).tobytes()
        new_blob.extend(b"\0" * (-len(new_blob) % 4))
        views.append({"buffer": 0, "byteOffset": len(new_blob), "byteLength": len(raw), "target": target})
        new_blob.extend(raw)
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[kind]
        acc = {"bufferView": len(views) - 1, "componentType": comp, "count": len(raw) // (width * np.dtype(np_of[comp]).itemsize), "type": kind}
        if bounds:
            flat = np.asarray(data).reshape(-1, width)
            acc["min"] = [float(x) for x in flat.min(0)]; acc["max"] = [float(x) for x in flat.max(0)]
        accessors.append(acc)
        return len(accessors) - 1

    new_attrs = {}
    for k in prim["attributes"]:
        new_attrs[k] = add(attrs[k], comp_of[k], kind_of[k], 34962, bounds=(k == "POSITION"))
    new_idx = add(np.asarray(tris).reshape(-1), 5125, "SCALAR", 34963)
    g2 = dict(g)
    g2["accessors"] = accessors
    g2["bufferViews"] = views
    g2["buffers"] = [{"byteLength": len(new_blob)}]
    g2["meshes"] = [dict(g["meshes"][0], primitives=[dict(prim, attributes=new_attrs, indices=new_idx)])]
    g2["skins"] = [dict(s, inverseBindMatrices=acc_map[s["inverseBindMatrices"]]) for s in g["skins"]]
    for img in g2.get("images", []):
        img["bufferView"] = view_map[img["bufferView"]]
    scenes = [dict(s) for s in g["scenes"]]
    scenes[0]["extras"] = dict(scenes[0]["extras"], pieces=pieces)
    g2["scenes"] = scenes
    js = json.dumps(g2, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    new_blob.extend(b"\0" * (-len(new_blob) % 4))
    total = 12 + 8 + len(js) + 8 + len(new_blob)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(new_blob), 0x004E4942)); f.write(bytes(new_blob))


def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    args = [a for a in args if a != "--dry"]
    out_dir = None
    if "--out" in args:
        k = args.index("--out"); out_dir = args[k + 1]; del args[k:k + 2]
        os.makedirs(out_dir, exist_ok=True)
    ids = args or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    for b in ids:
        pieces, out, tris, tone = rebuild(b, dry, out_dir)
        n = sum(1 for p in pieces if p["kind"] == "mail")
        print(f"{b}: {n} covers, {'blackened' if tone else 'bright'} mail, {len(out['POSITION'])} vertices, {len(tris)} triangles{' (dry)' if dry else ''}")


if __name__ == "__main__":
    main()
