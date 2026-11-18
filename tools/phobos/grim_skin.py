"""Grim Phobos skins for the townsfolk's bodies: a different man in the same body. Darker, dirtier clothes, another
complexion and hair, a harder face painted on, and the face's own shape moved. Painted onto the body's own colour map by
where each texel lies on the body, not by where it lies in the atlas.

    python tools/phobos/grim_skin.py                 (every skin in tools/phobos/grim_skins.json)
    python tools/phobos/grim_skin.py ph_tallow       (just those named)
    python tools/phobos/grim_skin.py ph_tallow --look DIR   (also DIR/<id>_masks.png: what kind each texel was taken for)

A Tripo body's colour map is hundreds of little charts, so nothing here is drawn in the map's own space. Each texel is
given the bind-pose point of the body it paints (the triangles rasterised into the UV square, gutters taking their
nearest chart's point), and everything is a function of that point:

  - what the texel is (`kinds`): skin (by colour, as tools/phobos/crowd_swaps.py finds it), hair, beard and brows (on
    the head bone), pale linen, and the rest split by where it lies: the apron (over the torso, hanging in front of the
    thighs, and of its own redder hue), the trousers, the boots, the gloves;
  - each kind moved to its own lightness, saturation and hue, keeping each texel's own light and dark about the kind's
    mean, so they stand apart in value (the json's `clothes`); one complexion over face, neck, forearms and hands;
  - tallow smeared and dripped down the apron, grease soaked into the shirt; soot in a 3D noise (so it runs across the
    charts' seams unbroken), heavier toward the hems, the cuffs and the knees; pale dried mud up the boots and shins;
  - the face, from the body's landmarks (`faces` in the json: eyes, brows, nose, mouth, in metres seen from the front,
    his left +x): the base's own marks healed over (`heal`), heavy low brows painted as hair, hollows under the eyes,
    deep sockets, a frown, a few broken lines across the forehead, hollowed cheeks, deep folds from nose to mouth, the
    mouth's corners pulled down, stubble above the beard, broken veins, pale eyes, and a scar (one stroke through the
    brow that skips the lid). Each mark only takes texels that face forward and lie in the face's front.

`sculpt` in a skin moves the face itself: each move a soft blob in the front view (brow ridge forward and down,
cheekbones out, cheeks in, the nose broken to one side, the jaw longer and wider), on the head bone's own skin only.
It writes assets/game/folk/<id>.glb, the base body with those points moved and their normals turned to match (and
any triangle folded over on the head closed); the
skeleton, weights and UVs are the base's, so the rig, the clips, the normal and occlusion maps and the town's thread
(which poses by the base's glb) all still fit. The swap names it as `glb`, and src/gfx/folk.js draws it in place of the
base's mesh.

Writes assets/game/folk/<id>_c.webp (and <id>.glb) and the swap into assets/game/folk/folk.json (swaps), so
src/folk/people.js can put anyone in it by `body: '<id>'`. Nothing loads until someone wears it.
No letters or monograms, and nothing of Tessariel's blue or gold: Phobos is Velscour's city (CLAUDE.md).
"""
import json
import os
import struct
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
D = os.path.join(ROOT, "assets", "game", "folk")
CFG = json.load(open(os.path.join(ROOT, "tools", "phobos", "grim_skins.json")))
N = 1024


# ---------------------------------------------------------------- the body: each texel's point, normal and head share
def read_glb(path):
    b = open(path, "rb").read()
    jl = struct.unpack_from("<I", b, 12)[0]
    J = json.loads(b[20:20 + jl])
    b0 = 20 + jl + 8
    CT = {5126: "f4", 5125: "u4", 5123: "u2", 5121: "u1"}
    NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

    def acc(i):
        a = J["accessors"][i]
        bv = J["bufferViews"][a["bufferView"]]
        dt = CT[a["componentType"]]
        arr = np.frombuffer(b, dtype=dt, count=a["count"] * NC[a["type"]], offset=b0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        arr = arr.reshape(a["count"], NC[a["type"]])
        if a.get("normalized") and dt != "f4":
            return arr / {"u1": 255.0, "u2": 65535.0}[dt]
        return arr

    pr = J["meshes"][0]["primitives"][0]
    A = pr["attributes"]
    names = [J["nodes"][j]["name"] for j in J["skins"][0]["joints"]]
    head = [k for k, n in enumerate(names) if n.lower().endswith("head")]
    jo, w = acc(A["JOINTS_0"]).astype(int), acc(A["WEIGHTS_0"]).astype(np.float64)
    hw = sum((w * (jo == k)).sum(1) for k in head)
    return (acc(A["POSITION"]).astype(np.float64), acc(A["NORMAL"]).astype(np.float64), acc(A["TEXCOORD_0"]).astype(np.float64),
            acc(pr["indices"]).reshape(-1, 3).astype(int), hw)


def texel_points(glb):
    """Per texel of an N square map: the bind-pose point, normal and head weight it paints (gutters: their nearest)."""
    P, Nn, UV, I, hw = read_glb(glb)
    pos = np.zeros((N, N, 3)); nrm = np.zeros((N, N, 3)); hd = np.zeros((N, N)); cov = np.zeros((N, N), bool)
    uvp = UV * N - 0.5
    for t in I:
        u = uvp[t]
        x0, y0 = np.maximum(np.floor(u.min(0)).astype(int), 0)
        x1, y1 = np.minimum(np.ceil(u.max(0)).astype(int), N - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        (ax, ay), (bx, by), (cx, cy) = u
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        l0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        l1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -0.03) & (l1 >= -0.03) & (l2 >= -0.03)
        if not m.any():
            continue
        L = np.stack([l0[m], l1[m], l2[m]], 1)
        yy, xx = ys[m], xs[m]
        pos[yy, xx] = L @ P[t]; nrm[yy, xx] = L @ Nn[t]; hd[yy, xx] = L @ hw[t]; cov[yy, xx] = True
    _, (iy, ix) = ndi.distance_transform_edt(~cov, return_indices=True)
    pos, nrm, hd = pos[iy, ix], nrm[iy, ix], hd[iy, ix]
    nrm /= np.maximum(np.linalg.norm(nrm, axis=-1, keepdims=True), 1e-9)
    return pos, nrm, hd, cov


def fill_gutters(img, cov):
    """Every texel outside the charts takes its nearest chart texel's value, so what the GPU's filtering reads past a
    chart's edge is the chart's own new colour, not the base's old padding."""
    _, (iy, ix) = ndi.distance_transform_edt(~cov, return_indices=True)
    return img[iy, ix]


def noise3(p, cell, seed):
    """Value noise in 3D (smooth, 0..1) at the given cell size in metres: the same on both sides of any UV seam."""
    rng = np.random.default_rng(seed)
    g = rng.random((64, 64, 64))
    q = p / cell + 17.0
    i = np.floor(q).astype(int); f = q - i
    f = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * (f[..., 2] if dz else 1 - f[..., 2])
                out = out + w * g[(i[..., 0] + dx) % 64, (i[..., 1] + dy) % 64, (i[..., 2] + dz) % 64]
    return out


def fbm(p, cell, seed, octaves=4):
    s, a, t = 0, 1, 0
    for o in range(octaves):
        s = s + a * noise3(p, cell / 2 ** o, seed + o); t += a; a *= 0.5
    return s / t


# ---------------------------------------------------------------- colour
def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn; m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)); h = np.where(m, (h / 6) % 1, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return h, s, mx


def hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    return np.stack([np.choose(i, [v, q, p, p, t, v]), np.choose(i, [t, v, v, q, p, p]), np.choose(i, [p, p, t, v, v, q])], -1)


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def restyle(a, m, to, keep=1.0):
    """Texels under mask m moved to the kind's target [value, saturation, hue turns] (hue None: keep their own), each
    keeping `keep` of its own lightness about the kind's mean, and its saturation in proportion to the kind's; returns
    the new colours (blend them in by m)."""
    h, s, v = rgb2hsv(a)
    w = m / max(m.sum(), 1e-6)
    vm, sm = (v * w).sum(), (s * w).sum()
    tv, ts, th = to
    nv = np.clip(tv + (v - vm) * keep * tv / max(vm, 1e-3), 0, 1)
    ns = np.clip(ts * np.sqrt(s / max(sm, 1e-3)), 0, 1)
    nh = h if th is None else np.full(h.shape, th % 1.0)
    return hsv2rgb(nh, ns, nv)


# ---------------------------------------------------------------- the face's marks, in the front view (metres)
def seg_dist(x, y, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    t = np.clip(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(x - ax - t * dx, y - ay - t * dy), t


def poly_dist(x, y, pts):
    best = np.full(x.shape, 9.0); along = np.zeros(x.shape); tot = 0
    L = [np.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1)]
    for k in range(len(pts) - 1):
        d, t = seg_dist(x, y, pts[k], pts[k + 1])
        sel = d < best
        best = np.where(sel, d, best); along = np.where(sel, (tot + t * L[k]) / sum(L), along)
        tot += L[k]
    return best, along


def line(x, y, pts, width, taper=True):
    """A soft stroke along pts, `width` metres across at its middle, thinning to its ends."""
    d, t = poly_dist(x, y, pts)
    wdt = width * (np.sin(np.clip(t, 0, 1) * np.pi) ** 0.5 * 0.8 + 0.2 if taper else 1)
    return np.exp(-(d / np.maximum(wdt * 0.5, 1e-5)) ** 2)


def blob(x, y, c, r, power=2):
    return np.exp(-(((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2) ** (power / 2))


def eye_gate(x, y, F, rx=0.0135, ry=0.0062):
    """1 everywhere but on the eyes themselves (the lids and the eyeball), where marks must not go."""
    return (1 - blob(x, y, F["eye_r"], (rx, ry), 4)) * (1 - blob(x, y, F["eye_l"], (rx, ry), 4))


def face_marks(pos, nrm, hd, F, k):
    """Each mark as a field over the map: (darken, lighten, scar core, brow hair, crease), all 0..1 (crease: how deep a
    fold the normal map is to be cut with, for the lines that are folds rather than shading)."""
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    cx = F["mid"]
    front = smooth(nrm[..., 2], 0.05, 0.45) * smooth(hd, 0.3, 0.7) * smooth(z, F["front_z"] - 0.02, F["front_z"])
    dark = np.zeros(x.shape); light = np.zeros(x.shape); brows = np.zeros(x.shape); crease = np.zeros(x.shape)
    for ex, ey in (F["eye_r"], F["eye_l"]):
        out = 1 if ex > cx else -1                       # +1: this eye's outer side is +x
        # Hollows under the eye: a wide crescent hung below the lower lid, and the tear trough under it.
        bag = blob(x, y, (ex + out * 0.002, ey - 0.0095), (0.0165, 0.0072)) * (1 - blob(x, y, (ex, ey - 0.0015), (0.013, 0.0042)))
        dark += bag * k["bags"]
        trough = line(x, y, [(ex - out * 0.010, ey - 0.007), (ex + out * 0.001, ey - 0.0145), (ex + out * 0.013, ey - 0.0125)], 0.0032)
        dark += trough * k["bags"] * 0.7
        crease = np.maximum(crease, trough * 0.6)
        # Deep sockets: the shadow between the brow and the eye, heaviest at the nose's side.
        dark += blob(x, y, (ex - out * 0.005, ey + 0.0055), (0.013, 0.006)) * k["socket"]
        # Heavy, low brows, their inner ends pulled down into the frown: painted as hair (brows) and shadowed under.
        bx0, bx1 = F["brow_in"] * out + cx, F["brow_out"] * out + cx
        bp = [(bx0, F["brow_y"] - 0.0035), (bx0 + out * 0.012, F["brow_y"] - 0.0005), ((bx0 + bx1) / 2 + out * 0.004, F["brow_y"] + 0.0012), (bx1, F["brow_y"] - 0.003)]
        brows += line(x, y, bp, 0.0068, taper=True)
        dark += line(x, y, [(px, py - 0.004) for px, py in bp], 0.005) * k["brow"]
        # Hollowed cheeks under the cheekbone, toward the side of the face; the bone itself caught by the light.
        dark += blob(x, y, (ex + out * 0.009, F["cheek_y"] - 0.004), (0.012, 0.017)) * k["cheek"]
        light += blob(x, y, (ex + out * 0.008, ey - 0.021), (0.013, 0.005)) * k["cheekbone"]
        # The folds from the nose's wing down past the mouth's corner, lit on the cheek's side.
        nx, ny = cx + out * F["nose_w"], F["nose_y"]
        mx, my = cx + out * F["mouth_w"], F["mouth_y"]
        fold = [(nx, ny + 0.002), (nx + out * 0.006, ny - 0.012), (mx + out * 0.006, my - 0.006), (mx + out * 0.004, my - 0.018)]
        fl = line(x, y, fold, 0.0036)
        dark += fl * k["fold"]
        crease = np.maximum(crease, fl)
        light += line(x, y, [(px + out * 0.004, py) for px, py in fold], 0.003) * k["fold"] * 0.35
        # The mouth's corners pulled down, well into the moustache and beard so they show through.
        dark += line(x, y, [(mx - out * 0.003, my + 0.001), (mx + out * 0.002, my - 0.004), (mx + out * 0.003, my - 0.014)], 0.0034) * k["mouth"]
    # A frown: two hard creases between the brows, lit beside, and the shadow between them pulled down.
    for o in (-1, 1):
        fr = line(x, y, [(cx + o * 0.0038, F["brow_y"] - 0.007), (cx + o * 0.0034, F["brow_y"] + 0.002), (cx + o * 0.0052, F["brow_y"] + 0.010)], 0.0026, taper=True)
        dark += fr * k["frown"]
        crease = np.maximum(crease, fr)
        light += line(x, y, [(cx + o * 0.0068, F["brow_y"] - 0.005), (cx + o * 0.0066, F["brow_y"] + 0.008)], 0.0024) * k["frown"] * 0.3
    dark += blob(x, y, (cx, F["brow_y"] - 0.001), (0.007, 0.007)) * k["frown"] * 0.4
    # Lines across the forehead: few, curved, unequal, soft, and none of them across the middle, over the frown (a line
    # over the creases would make a letter of them).
    for fy, x0, x1 in F["forehead"]:
        f = line(x, y, [(cx + x0, fy - 0.0015), (cx + (x0 * 0.5 + x1 * 0.5), fy + 0.001), (cx + x1, fy - 0.0015)], 0.0034)
        f = f * smooth(np.abs(x - cx), 0.008, 0.012)
        for piece in F.get("scar") or []:
            f = f * smooth(poly_dist(x, y, piece)[0], 0.008, 0.012)
        dark += f * k["forehead"]
        crease = np.maximum(crease, f * 0.5)
    # Hooded upper lids: the fold of skin over each eye in shadow, heaviest at the outer corner.
    for ex, ey in (F["eye_r"], F["eye_l"]):
        out = 1 if ex > cx else -1
        dark += line(x, y, [(ex - out * 0.011, ey + 0.004), (ex, ey + 0.0058), (ex + out * 0.013, ey + 0.0035)], 0.0045) * k["lids"]
    # The broken nose: a shadowed plane down one side of the bridge, the light caught on the other (to the side its
    # mesh was knocked).
    side = F.get("nose_break", 1)
    dark += blob(x, y, (cx - side * 0.0055, 1.646), (0.003, 0.012)) * k["nose"]
    light += blob(x, y, (cx + side * 0.004, 1.648), (0.0028, 0.011)) * k["nose"] * 0.8
    # The mouth: the lips taken nearly to the beard's dark, the upper lip shadowed, a little light on the lower; the
    # corners a dark wedge into the moustache.
    mx0, my = F["mouth_w"], F["mouth_y"]
    dark += blob(x, y, (cx, my + 0.0022), (mx0 * 0.85, 0.0026), 4) * k["lips"]
    dark += blob(x, y, (cx, my - 0.0025), (mx0 * 0.75, 0.003), 4) * k["lips"] * 0.55
    light += blob(x, y, (cx, my - 0.0032), (mx0 * 0.35, 0.0015)) * k["lips"] * 0.5
    for o in (-1, 1):
        dark += line(x, y, [(cx + o * (mx0 - 0.003), my + 0.0005), (cx + o * (mx0 + 0.002), my - 0.002), (cx + o * (mx0 + 0.004), my + 0.004)], 0.004) * k["lips"]
    # The scar: one stroke from the forehead down through the brow, over the lid (which it skips), onto the cheekbone.
    scar = np.zeros(x.shape)
    eg = eye_gate(x, y, F)
    for piece in F.get("scar") or []:
        sw = F.get("scar_w", 0.003)
        core = line(x, y, piece, sw) * eg
        scar = np.maximum(scar, core)
        rim = np.clip(line(x, y, piece, sw * 1.7) * eg - core, 0, 1)
        dark += rim * k["scar_rim"]
        # Where it crosses the brow it is a gap in the hair, wider than the scar, and the scar itself faint there, so
        # brow and scar never make a cross.
        band = np.exp(-((y - F["brow_y"]) / 0.005) ** 2)
        gap = line(x, y, piece, sw * 2.6, taper=False) * band
        brows = brows * (1 - np.clip(gap * 1.5, 0, 1))
        scar = np.maximum(scar * (1 - 0.6 * band), core * (1 - 0.6 * band))
    dark *= eg ** 0.5
    return (np.clip(dark, 0, 1) * front, np.clip(light, 0, 1) * front, np.clip(scar, 0, 1) * front, np.clip(brows, 0, 1) * front * eg,
            np.clip(crease, -1, 1) * front * eg)


# ---------------------------------------------------------------- the head reshaped: a copy of the body's glb
def sculpt(src, dst, F, moves, tex):
    """Moves the face's vertices by `moves` (each a centre in the front view, its radii and a shift, all metres, the x
    of centre and shift mirrored for "both" sides) and writes the body with new positions and mended normals to dst.
    Only the head and the face (not the collar), only the front of the face, and nothing the map paints as
    linen. The skeleton, the weights and the UVs are the base's, so its rig, clips and maps all still fit."""
    b = bytearray(open(src, "rb").read())
    jl = struct.unpack_from("<I", b, 12)[0]
    J = json.loads(bytes(b[20:20 + jl]))
    b0 = 20 + jl + 8
    P, Nn, UV, I, hw = read_glb(src)
    pr = J["meshes"][0]["primitives"][0]
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    ti = np.clip((UV * N).astype(int), 0, N - 1)
    th, ts, tv = rgb2hsv(tex[ti[:, 1], ti[:, 0]])
    cloth = smooth(tv, 0.5, 0.62) * smooth(-ts, -0.24, -0.14) * (1 - smooth(hw, 0.85, 0.95))
    gate = smooth(hw, 0.15, 0.35) * smooth(y, 1.50, 1.53) * smooth(z, F["front_z"] - 0.05, F["front_z"] - 0.02) * smooth(Nn[:, 2], -0.25, 0.25) * (1 - cloth)
    d = np.zeros_like(P)
    cx = F["mid"]
    for mv in moves:
        sides = (-1, 1) if mv.get("both") else (1,)
        for o in sides:
            c = (cx + o * mv["at"][0], mv["at"][1]); r = mv["r"]
            w = np.exp(-(((x - c[0]) / r[0]) ** 2 + ((y - c[1]) / r[1]) ** 2)) * gate
            if "z" in mv:                                # only the surface near this depth (a nose, not the cheek behind it)
                w = w * np.exp(-((z - mv["z"]) / mv.get("zr", 0.02)) ** 2)
            d += w[:, None] * np.array([o * mv["d"][0], mv["d"][1], mv["d"][2]])
    Q = P + d
    # Normals: each vertex's own, turned by however much its welded neighbourhood's area-weighted normal turned.
    key = np.unique(np.round(P / 1e-5).astype(np.int64), axis=0, return_inverse=True)[1].ravel()

    def welded(V):
        fn = np.cross(V[I[:, 1]] - V[I[:, 0]], V[I[:, 2]] - V[I[:, 0]])
        acc = np.zeros((key.max() + 1, 3))
        for k in range(3):
            np.add.at(acc, key[I[:, k]], fn)
        return acc[key] / np.maximum(np.linalg.norm(acc[key], axis=1, keepdims=True), 1e-12)

    n0, n1 = welded(P), welded(Q)
    moved = np.linalg.norm(d, axis=1) > 1e-5
    N2 = Nn.copy()
    N2[moved] = Nn[moved] + (n1[moved] - n0[moved])
    # (Across the face's front, where the mesh is coarsest, the welded smooth normal itself: the base's per-corner
    # normals shade its few big triangles in hard planes, more so once moved.)
    sm = (gate * smooth(y, 1.53, 1.56))[:, None]
    N2 = N2 * (1 - sm) + n1 * sm
    N2 /= np.maximum(np.linalg.norm(N2, axis=1, keepdims=True), 1e-9)
    # Flaps: a triangle on the face turned against the surface round it (Tripo leaves the odd one folded over, and as
    # the game draws people two-sided it shows as a dark nick: Wes's "scar" on his right brow was one). Each is made
    # degenerate, all three corners its first, so it draws nothing; the surface under it is whole.
    fc = Q[I].mean(1)
    fn = np.cross(Q[I[:, 1]] - Q[I[:, 0]], Q[I[:, 2]] - Q[I[:, 0]])
    on = (hw[I].mean(1) > 0.5) & (fc[:, 1] > 1.5)
    idx = np.nonzero(on)[0]
    from scipy.spatial import cKDTree
    tree = cKDTree(fc[idx])
    flaps = []
    for j, t in enumerate(idx):
        near = idx[tree.query_ball_point(fc[t], 0.012)]
        avg = fn[near].sum(0)
        if np.dot(fn[t], avg) < -0.3 * np.linalg.norm(fn[t]) * np.linalg.norm(avg):
            flaps.append(t)
    I2 = I.copy()
    I2[flaps] = I2[flaps, :1]
    ia = J["accessors"][pr["indices"]]
    ibv = J["bufferViews"][ia["bufferView"]]
    ioff = b0 + ibv.get("byteOffset", 0) + ia.get("byteOffset", 0)
    idt = {5125: "<u4", 5123: "<u2"}[ia["componentType"]]
    b[ioff:ioff + I2.size * np.dtype(idt).itemsize] = I2.astype(idt).tobytes()
    for attr, arr in (("POSITION", Q), ("NORMAL", N2)):
        a = J["accessors"][pr["attributes"][attr]]
        bv = J["bufferViews"][a["bufferView"]]
        assert a["componentType"] == 5126 and bv.get("byteStride", 12) == 12
        off = b0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        b[off:off + arr.size * 4] = arr.astype("<f4").tobytes()
        if attr == "POSITION":
            a["min"] = [float(v) for v in Q.min(0)]; a["max"] = [float(v) for v in Q.max(0)]
    js = json.dumps(J, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    out = bytearray(b[:12]) + struct.pack("<II", len(js), 0x4E4F534A) + js + b[20 + jl:]
    struct.pack_into("<I", out, 8, len(out))
    open(dst, "wb").write(out)
    print(f"  sculpt: {moved.sum()} vertices moved, at most {np.linalg.norm(d, axis=1).max() * 1000:.1f} mm; {len(flaps)} flaps closed")


def normals(src, dst, pos, depth, heal, cov):
    """The base's normal map with the face's folds cut into it: `depth` (metres, + a ridge, - a fold) is a height
    over the map, turned to the slope it makes on the body (so a fold is as steep in a small chart as in a big one)
    and added to the base's normals, read the glTF way as src/gfx/shaders.js does (red along u, green up the
    picture). Where the base's own marks were healed, its normals are smoothed flat too."""
    nb = np.asarray(Image.open(src).convert("RGB").resize((N, N), Image.BICUBIC)).astype(np.float64) / 127.5 - 1
    h = -depth
    dcol = np.linalg.norm(np.roll(pos, -1, 1) - np.roll(pos, 1, 1), axis=-1) / 2
    drow = np.linalg.norm(np.roll(pos, -1, 0) - np.roll(pos, 1, 0), axis=-1) / 2
    gu = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) / 2 / np.maximum(dcol, 2e-4)
    gv = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) / 2 / np.maximum(drow, 2e-4)
    # (A fold's slope, not the jump across a chart's edge: where neighbouring texels lie far apart on the body, none.)
    gu *= dcol < 0.004; gv *= drow < 0.004
    nx, ny = -gu, gv
    flat = np.stack([ndi.gaussian_filter(nb[..., c], 2.5) for c in range(3)], -1)
    nb = nb * (1 - heal[..., None]) + flat * heal[..., None]
    n = np.stack([nb[..., 0] + nx * nb[..., 2], nb[..., 1] + ny * nb[..., 2], nb[..., 2]], -1)
    n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9)
    n = fill_gutters(n, cov)
    img = Image.fromarray(np.clip((n + 1) * 127.5 + 0.5, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS)
    img.save(dst, lossless=True, method=6)


# ---------------------------------------------------------------- one skin
def kinds(a, pos, nrm, hd, H, F):
    """How much each texel is of each kind (soft masks that sum to at most 1). A beard (F's `beard`) is hair by where it
    grows, whatever its colour: grey hairs over skin-toned texels otherwise come through as pale patches."""
    h, s, v = rgb2hsv(a)
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    hdist = np.minimum(np.abs(h - 0.055), 1 - np.abs(h - 0.055))
    skin = np.clip(1 - hdist / 0.05, 0, 1) * smooth(s, 0.14, 0.24) * smooth(-s, -0.66, -0.56) * smooth(v, 0.36, 0.5)
    skin = np.clip(ndi.gaussian_filter(skin, 1.5) * 1.7, 0, 1)
    on_head = smooth(hd, 0.35, 0.75) * smooth(y, H * 0.80, H * 0.84)
    hair = smooth(hd, 0.15, 0.4) * smooth(y, H * 0.80, H * 0.84) * (1 - skin) * smooth(-s, -0.26, -0.16)
    if F.get("beard"):
        B = F["beard"]
        # The beard's top follows its growth line (B["line"]: its height against the distance from mid), feathered over
        # about a centimetre with a ragged edge.
        ln = np.array(B["line"])
        top = np.interp(np.abs(x - F["mid"]), ln[:, 0], ln[:, 1]) + (fbm(pos, 0.006, 21, 2) - 0.5) * 0.008
        grows = smooth(-y, -top - B.get("feather", 0.005), -top + B.get("feather", 0.005)) * smooth(y, B["bottom"], B["bottom"] + 0.004) \
            * smooth(-np.abs(x - F["mid"]), -B["half"] - 0.004, -B["half"]) * smooth(nrm[..., 2], -0.4, 0.0) * smooth(z, 0.02, 0.04) * smooth(hd, 0.15, 0.35)
        lips = blob(x, y, (F["mid"] + B["lips"][0], B["lips"][1]), B["lips"][2:], 4)
        beard = grows * (1 - lips) * smooth(-v, -0.75, -0.6)
        hair = np.maximum(hair, beard)
        skin = skin * (1 - beard)
    linen = (1 - skin) * (1 - on_head) * smooth(v, 0.5, 0.62) * smooth(-s, -0.24, -0.14)
    rest = np.clip(1 - skin - hair - linen, 0, 1) * (1 - on_head * smooth(s, 0.12, 0.2))
    ax = np.abs(x)
    boots = rest * smooth(-y, -H * 0.2, -H * 0.17)
    gloves = (rest - boots) * smooth(ax, 0.62, 0.66)
    torso = smooth(y, 0.58, 0.64) * smooth(-ax, -0.34, -0.28)
    hanging = smooth(y, 0.98, 1.03) + (1 - smooth(y, 0.98, 1.03)) * smooth(z, 0.10, 0.12) * smooth(-h, -0.095, -0.08)
    apron = np.clip(rest - boots - gloves, 0, 1) * np.maximum(torso * hanging, smooth(y, 1.0, 1.05) * (1 - smooth(ax, 0.62, 0.66)))
    legs = np.clip(rest - boots - gloves - apron, 0, 1)
    return dict(skin=skin, hair=hair, linen=linen, apron=apron, legs=legs, boots=boots, gloves=gloves)


def make(sid, spec, look_dir=None):
    body = spec["base"]
    folk = json.load(open(os.path.join(D, "folk.json")))
    a = np.asarray(Image.open(os.path.join(D, folk["models"][body]["c"])).convert("RGB").resize((N, N), Image.LANCZOS)).astype(np.float64) / 255
    pos, nrm, hd, cov = texel_points(os.path.join(D, folk["models"][body]["glb"]))
    F = CFG["faces"][body]
    H = folk["models"][body]["height"]
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    K = kinds(a, pos, nrm, hd, H, F)
    C = spec["clothes"]
    out = a.copy()
    for kind in ("linen", "apron", "legs", "boots", "gloves", "hair"):
        m = K[kind]
        out = out * (1 - m[..., None]) + restyle(a, m, C[kind][:3], C[kind][3] if len(C[kind]) > 3 else 1.0) * m[..., None]
    # Hair and beard aren't one flat black: broad lighter clumps along them, grease catching the light, and a few
    # grey threads at the chin.
    Hh = spec.get("hair", {})
    if Hh:
        clump = smooth(fbm(pos * np.array([1, 2.5, 1]), 0.012, 101, 3), 0.45, 0.7)
        out = out * (1 + (clump * Hh["clumps"] * K["hair"])[..., None])
        grey = smooth(noise3(pos * np.array([3, 0.4, 3]), 0.002, 103), 0.72, 0.8) * smooth(-y, -(F["mouth_y"] - 0.012), -(F["mouth_y"] - 0.02)) * K["hair"]
        out = out * (1 - (grey * Hh["grey"])[..., None]) + np.array([0.42, 0.41, 0.4]) * (grey * Hh["grey"])[..., None]
    # Skin: one complexion over face, neck, forearms and hands.
    S = spec["skin"]
    sk = restyle(a, K["skin"], S["to"], S.get("keep", 1.0))
    out = out * (1 - K["skin"][..., None]) + sk * K["skin"][..., None]
    face = smooth(nrm[..., 2], 0.05, 0.45) * smooth(hd, 0.3, 0.7) * smooth(z, F["front_z"] - 0.02, F["front_z"])
    # The base's own marks healed: over each patch (any way the skin faces), whatever is darker than the skin's mean
    # there is lifted to it, so a scar's line goes and the skin's own lighter grain stays.
    heal = np.zeros(x.shape)
    for c, r in F.get("heal", []):
        # (Not kept off the hair: a scar's dark line is taken for hair by its colour. A patch is all forehead or cheek.)
        m = blob(x, y, c, r, 4) * smooth(hd, 0.6, 0.8) * smooth(z, 0.05, 0.07)
        heal = np.maximum(heal, m)
        ref = m * K["skin"]
        mean = (out * ref[..., None]).sum((0, 1)) / max(ref.sum(), 1e-6)
        lum, ml = out.mean(-1, keepdims=True), mean.mean()
        # (Darker than the skin there: lifted to it, in the skin's own colour. Lighter: brought most of the way down.)
        even = mean * (1 + (lum - ml) / max(ml, 1e-3) * np.where(lum > ml, 0.3, 0.0))
        out = out * (1 - m[..., None]) + even * m[..., None]
    G = spec["grime"]
    # Grease on the apron: waxy, pale tallow smears across the belly and the bib's foot, drips running down from them.
    if G.get("tallow"):
        smear = smooth(fbm(pos * np.array([0.35, 3.0, 1]), 0.05, 41, 2), 0.58, 0.68) * np.exp(-((y - 0.98) / 0.09) ** 2)
        drip = smooth(noise3(pos * np.array([1, 0.08, 1]), 0.006, 53), 0.78, 0.84) * smooth(-y, -1.0, -0.9) * smooth(y, 0.7, 0.86)
        tal = np.clip(smear + drip * 0.8, 0, 1) * K["apron"] * smooth(z, 0.1, 0.13) * G["tallow"]
        tcol = np.array(G["tallow_col"])
        out = out * (1 - tal[..., None]) + (tcol * (0.85 + 0.3 * fbm(pos, 0.01, 61, 2))[..., None]) * tal[..., None]
        # Grease soaked dark into the shirt at the cuffs and down the chest.
        gr = smooth(fbm(pos, 0.05, 71, 3), 0.55, 0.68) * (smooth(np.abs(x), 0.4, 0.5) + np.exp(-((y - 1.32) / 0.08) ** 2) * smooth(z, 0.08, 0.12)) * K["linen"]
        out = out * (1 - np.clip(gr, 0, 1)[..., None] * G["grease"])
    # Soot over everything in 3D noise, heavier at the hems, cuffs and knees.
    n = fbm(pos, G["cell"], 7)
    ext = np.abs(x) / 0.9
    hem = np.exp(-((y - H * 0.47) / 0.06) ** 2) + np.exp(-((y - H * 0.29) / 0.05) ** 2) * 0.8 + np.exp(-((y - 0.62) / 0.03) ** 2) * K["apron"] \
        + smooth(ext, 0.5, 0.62) * smooth(-ext, -0.72, -0.66)
    soot = np.clip(smooth(n, G["thresh"], G["thresh"] + 0.25) * G["soot"] + hem * G["hems"], 0, 0.9)
    soot = soot * (1 - K["skin"] * (1 - G["on_skin"])) * (1 - K["hair"] * 0.6)
    out = out * (1 - soot[..., None] * (1 - np.array(G["soot_col"])))
    # Dried mud, paler than the leather, splashed up the boots and the shins to mid-calf.
    mud = smooth(-y, -H * 0.22, -H * 0.12) * smooth(fbm(pos, 0.04, 31, 4), 0.42, 0.58) * G["mud"] * (1 - K["skin"])
    out = out * (1 - mud[..., None]) + np.array(G["mud_col"]) * (0.8 + 0.4 * fbm(pos, 0.008, 33, 2))[..., None] * mud[..., None]
    # The face.
    k = spec["face"]
    dk, lt, sc, br, cr = face_marks(pos, nrm, hd, F, k)
    out = out * (1 - br[..., None] * k["brows"]) + np.array(k["brow_col"]) * (0.7 + 0.6 * fbm(pos, 0.0015, 81, 2))[..., None] * br[..., None] * k["brows"]
    out = out * (1 - dk[..., None] * (1 - np.array(k["shadow_col"])))
    out = out + (1 - out) * lt[..., None] * 0.3
    # Stubble on the cheeks above the beard: fine dark grain, thinning upward.
    stub = smooth(-y, -(F["nose_y"] + 0.004), -(F["nose_y"] - 0.008)) * smooth(np.abs(x - F["mid"]), 0.022, 0.032) * face * K["skin"]
    grain = 0.35 + 0.65 * smooth(noise3(pos, 0.0007, 91), 0.45, 0.65)
    out = out * (1 - (stub * grain * k["stubble"])[..., None] * 0.55)
    # Broken veins on the nose and the cheekbones' tops: a faint mottled red.
    vein = (blob(x, y, (F["mid"], F["nose_y"] + 0.002), (0.009, 0.006)) + sum(blob(x, y, (e[0], e[1] - 0.02), (0.01, 0.005)) for e in (F["eye_r"], F["eye_l"]))) * face
    vein = vein * smooth(fbm(pos, 0.003, 97, 2), 0.5, 0.62) * k["veins"]
    out = out * (1 - vein[..., None]) + out * np.array([1.18, 0.86, 0.86]) * vein[..., None]
    if sc.any():
        lum = out.mean(-1, keepdims=True)
        scol = np.clip(np.maximum(lum, 0.42) * np.array(k["scar_col"]), 0, 1)
        out = out * (1 - sc[..., None] * 0.9) + scol * sc[..., None] * 0.9
    # Pale, washed-out eyes: the irises' dark taken toward a cold grey.
    for e in (F["eye_r"], F["eye_l"]):
        ir = blob(x, y, (e[0] + F.get("iris_dx", 0), e[1]), (0.0055, 0.0045), 4) * face * (1 - K["skin"]) * smooth(-out.mean(-1), -0.42, -0.2)
        out = out * (1 - ir[..., None] * k["iris"]) + np.array(k["iris_col"]) * (0.6 + 0.8 * out.mean(-1, keepdims=True)) * ir[..., None] * k["iris"]
    res = fill_gutters(np.clip(out, 0, 1), cov)
    Image.fromarray((res * 255 + 0.5).astype(np.uint8)).save(os.path.join(D, sid + "_c.webp"), quality=90, method=4)
    sw = {"base": body, "c": sid + "_c.webp", "note": "Phobos's crowd: " + spec["note"]}
    if spec.get("normals"):
        normals(os.path.join(D, folk["models"][body]["n"]), os.path.join(D, sid + "_n.webp"), pos, cr * spec["normals"]["depth"], heal, cov)
        sw["n"] = sid + "_n.webp"
    if spec.get("sculpt"):
        sculpt(os.path.join(D, folk["models"][body]["glb"]), os.path.join(D, sid + ".glb"), F, spec["sculpt"], a)
        sw["glb"] = sid + ".glb"
    if look_dir:
        os.makedirs(look_dir, exist_ok=True)
        Image.fromarray((np.stack([K["skin"] + sc, K["linen"] + K["legs"] * 0.5 + dk, K["hair"] + K["apron"] * 0.7 + K["boots"] * 0.4], -1).clip(0, 1) * 255).astype(np.uint8)).save(os.path.join(look_dir, sid + "_masks.png"))
    return sw


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    look = sys.argv[sys.argv.index("--look") + 1] if "--look" in sys.argv else None
    if look in args:
        args.remove(look)
    path = os.path.join(D, "folk.json")
    for sid, spec in CFG["skins"].items():
        if args and sid not in args:
            continue
        sw = make(sid, spec, look)
        folk = json.load(open(path))
        folk["swaps"][sid] = sw
        secs = []
        for sec in ("models", "swaps"):
            rows = ",\n".join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in folk[sec].items())
            secs.append(f'  "{sec}": {{\n{rows}\n  }}')
        open(path, "w", encoding="utf-8", newline="\n").write("{\n" + ",\n".join(secs) + "\n}\n")
        print(sid, "<", spec["base"], "(own head)" if sw.get("glb") else "")


if __name__ == "__main__":
    main()
