"""Grim Phobos skins for the townsfolk's bodies: darker, dirtier clothes and a harder face, painted onto the body's own
colour map by where each texel lies on the body, not by where it lies in the atlas.

    python tools/phobos/grim_skin.py                 (every skin in tools/phobos/grim_skins.json)
    python tools/phobos/grim_skin.py ph_tallow       (just those named)
    python tools/phobos/grim_skin.py ph_tallow --look DIR   (also writes DIR/<id>_front.png, the face seen from the
                                                    front through the map, and DIR/<id>_masks.png, what took what)

A Tripo body's colour map is hundreds of little charts, so nothing here is drawn in the map's own space. Each texel is
given the bind-pose point of the body it paints (the triangles rasterised into the UV square, gutters taking their
nearest chart's point), and everything is a function of that point:

  - what the texel is: skin (by colour, as tools/phobos/crowd_swaps.py finds it), hair and beard (grey or dark, on the
    head bone), pale linen, or the rest (leather, wool, the boots);
  - the clothes: each kind moved to its own lightness, hue and saturation, keeping each texel's own light and dark
    about the kind's mean; soot laid over everything in a 3D noise (so it runs across the charts' seams unbroken),
    heavier toward the hems, the cuffs and the knees, and mud up the boots and the shins;
  - the skin: sallow and sunless (less red, less bright), the same over face and hands;
  - the face: from the body's landmarks (`faces` in the json: eyes, brows, nose, mouth, in metres seen from the front,
    his left +x), hollows under the eyes, deep sockets, a heavier brow, two creases of a frown between the brows, lines
    across the forehead, hollowed cheeks, deep folds from nose to mouth, the mouth's corners pulled down, and a scar
    where the skin says. Each mark only takes texels that face forward and lie in the face's front.

Writes assets/game/folk/<id>_c.webp and the swap into assets/game/folk/folk.json (swaps), as crowd_swaps.py does, so
src/folk/people.js can put anyone in it by `body: '<id>'`. The normal and occlusion maps stay the base body's.
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


def spec_scar(F):
    return F.get("scar") or []


def face_marks(pos, nrm, hd, F, look):
    """Each mark as a field over the map: (darken amounts, lighten amounts, scar), all 0..1."""
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    cx = F["mid"]
    front = smooth(nrm[..., 2], 0.05, 0.45) * smooth(hd, 0.3, 0.7) * smooth(z, F["front_z"] - 0.02, F["front_z"])
    dark = np.zeros(x.shape); light = np.zeros(x.shape)
    k = look
    for side, (ex, ey) in (("r", F["eye_r"]), ("l", F["eye_l"])):
        out = 1 if ex > cx else -1                       # +1: this eye's outer side is +x
        # Hollows under the eye: a crescent hung below the lower lid, deepest under its middle.
        bag = blob(x, y, (ex + out * 0.002, ey - 0.0085), (0.0135, 0.0058)) * (1 - blob(x, y, (ex, ey - 0.002), (0.012, 0.004)))
        dark += bag * k["bags"]
        # A second, fainter fold under that: the tear trough running down and in toward the nose.
        dark += line(x, y, [(ex - out * 0.009, ey - 0.007), (ex + out * 0.001, ey - 0.0125), (ex + out * 0.011, ey - 0.011)], 0.0028) * k["bags"] * 0.6
        # Deep sockets: the shadow between the brow and the eye, heaviest at the nose's side.
        dark += blob(x, y, (ex - out * 0.005, ey + 0.0055), (0.012, 0.0055)) * k["socket"]
        # A heavier, lower brow: the brow hair and the ridge over it darkened.
        bx0, bx1 = F["brow_in"] * out + cx, F["brow_out"] * out + cx
        dark += line(x, y, [(bx0, F["brow_y"] - 0.001), ((bx0 + bx1) / 2, F["brow_y"] + 0.0015), (bx1, F["brow_y"] - 0.002)], 0.0055, taper=False) * k["brow"]
        # Hollowed cheeks under the cheekbone, toward the side of the face.
        dark += blob(x, y, (ex + out * 0.008, F["cheek_y"]), (0.011, 0.016)) * k["cheek"]
        light += blob(x, y, (ex + out * 0.008, ey - 0.020), (0.012, 0.005)) * k["cheekbone"]
        # The folds from the nose's wing down past the mouth's corner, lit on the cheek's side.
        nx, ny = cx + out * F["nose_w"], F["nose_y"]
        mx, my = cx + out * F["mouth_w"], F["mouth_y"]
        fold = [(nx, ny + 0.002), (nx + out * 0.006, ny - 0.012), (mx + out * 0.006, my - 0.006), (mx + out * 0.004, my - 0.016)]
        dark += line(x, y, fold, 0.0034) * k["fold"]
        light += line(x, y, [(px + out * 0.0035, py) for px, py in fold], 0.003) * k["fold"] * 0.35
        # The mouth's corners pulled down.
        dark += line(x, y, [(mx - out * 0.002, my + 0.0005), (mx + out * 0.002, my - 0.004), (mx + out * 0.003, my - 0.010)], 0.003) * k["mouth"]
    # A frown: two creases between the brows, and the brows' inner ends drawn down toward them.
    for o in (-1, 1):
        dark += line(x, y, [(cx + o * 0.0042, F["brow_y"] - 0.006), (cx + o * 0.0034, F["brow_y"] + 0.004), (cx + o * 0.0048, F["brow_y"] + 0.012)], 0.0026) * k["frown"]
        light += line(x, y, [(cx + o * 0.0072, F["brow_y"] - 0.004), (cx + o * 0.0066, F["brow_y"] + 0.010)], 0.0026) * k["frown"] * 0.3
    dark += blob(x, y, (cx, F["brow_y"] + 0.001), (0.008, 0.006)) * k["frown"] * 0.35
    # Lines across the forehead.
    for j, fy in enumerate(F["forehead"]):
        dark += line(x, y, [(cx - 0.032, fy - 0.002), (cx - 0.012, fy + 0.0012), (cx + 0.012, fy + 0.0012), (cx + 0.032, fy - 0.002)], 0.0022) * k["forehead"] * (1 - 0.3 * j)
    scar = np.zeros(x.shape)
    for piece in spec_scar(F):
        sw = F.get("scar_w", 0.003)
        s1 = line(x, y, piece, sw)
        scar = np.maximum(scar, s1)
        dark += np.clip(line(x, y, piece, sw * 2.4) - s1, 0, 1) * 0.45
    return np.clip(dark, 0, 1) * front, np.clip(light, 0, 1) * front, np.clip(scar, 0, 1) * front


# ---------------------------------------------------------------- one skin
def make(sid, spec, look_dir=None):
    body = spec["base"]
    folk = json.load(open(os.path.join(D, "folk.json")))
    a = np.asarray(Image.open(os.path.join(D, folk["models"][body]["c"])).convert("RGB").resize((N, N), Image.LANCZOS)).astype(np.float64) / 255
    pos, nrm, hd, cov = texel_points(os.path.join(D, folk["models"][body]["glb"]))
    F = CFG["faces"][body]
    h, s, v = rgb2hsv(a)
    y = pos[..., 1]
    H = folk["models"][body]["height"]
    # What each texel is.
    hdist = np.minimum(np.abs(h - 0.055), 1 - np.abs(h - 0.055))
    skin = np.clip(1 - hdist / 0.05, 0, 1) * smooth(s, 0.14, 0.24) * smooth(-s, -0.66, -0.56) * smooth(v, 0.36, 0.5)
    skin = np.clip(ndi.gaussian_filter(skin, 1.5) * 1.7, 0, 1)
    on_head = smooth(hd, 0.35, 0.75) * smooth(y, H * 0.80, H * 0.84)
    hair = on_head * (1 - skin) * smooth(-s, -0.26, -0.16)
    linen = (1 - skin) * (1 - on_head) * smooth(v, 0.5, 0.62) * smooth(-s, -0.24, -0.14)
    rest = np.clip(1 - skin - hair - linen, 0, 1) * (1 - on_head * smooth(s, 0.12, 0.2))
    C = spec["clothes"]
    out = a.copy()
    for m, key in ((linen, "linen"), (rest, "leather")):
        out = out * (1 - m[..., None]) + restyle(a, m, C[key], C.get("keep", 1.0)) * m[..., None]
    hh = restyle(a, hair, C["hair"], 1.25)
    out = out * (1 - hair[..., None]) + hh * hair[..., None]
    # Skin: sallow, sunless.
    S = spec["skin"]
    sh, ss, sv = rgb2hsv(a)
    sk = hsv2rgb((sh + S["hue"]) % 1, np.clip(ss * S["sat"], 0, 1), np.clip(sv * S["val"], 0, 1))
    grey = sk.mean(-1, keepdims=True)
    sk = sk * (1 - S["grey"]) + grey * np.array(S["grey_tint"]) * S["grey"]
    out = out * (1 - skin[..., None]) + sk * skin[..., None]
    # Soot over the clothes (and a little on the skin), in 3D noise; heavier at hems, cuffs and knees; mud below.
    G = spec["grime"]
    n = fbm(pos, G["cell"], 7)
    ext = np.abs(pos[..., 0]) / 0.9                                   # out along the arms (T pose): the cuffs
    hem = np.exp(-((y - H * 0.47) / 0.06) ** 2) + np.exp(-((y - H * 0.29) / 0.05) ** 2) * 0.8 + smooth(ext, 0.5, 0.62) * smooth(-ext, -0.72, -0.66)
    soot = np.clip(smooth(n, G["thresh"], G["thresh"] + 0.25) * G["soot"] + hem * G["hems"], 0, 0.9)
    soot = soot * (1 - skin * (1 - G["on_skin"])) * (1 - hair * 0.5)
    out = out * (1 - soot[..., None] * (1 - np.array(G["soot_col"])))
    mud = smooth(-y, -H * 0.26, -H * 0.16) * (0.55 + 0.45 * fbm(pos, 0.05, 31, 3)) * G["mud"] * (1 - skin)
    out = out * (1 - mud[..., None]) + out * np.array(G["mud_col"]) * mud[..., None]
    # The face.
    dk, lt, sc = face_marks(pos, nrm, hd, F, spec["face"])
    tint = np.array(spec["face"]["shadow_col"])
    out = out * (1 - dk[..., None] * (1 - tint))
    out = out + (1 - out) * lt[..., None] * 0.35
    if sc.any():
        scol = np.clip(out.mean(-1, keepdims=True) * np.array(spec["face"]["scar_col"]), 0, 1)
        out = out * (1 - sc[..., None] * 0.8) + scol * sc[..., None] * 0.8
    res = np.clip(out, 0, 1)
    img = Image.fromarray((res * 255 + 0.5).astype(np.uint8))
    img.save(os.path.join(D, sid + "_c.webp"), quality=88, method=4)
    if look_dir:
        os.makedirs(look_dir, exist_ok=True)
        masks = np.stack([np.clip(skin + sc, 0, 1), np.clip(linen + dk, 0, 1), np.clip(hair + rest * 0.4, 0, 1)], -1)
        Image.fromarray((masks * 255).astype(np.uint8)).save(os.path.join(look_dir, sid + "_masks.png"))
        front_view(pos, nrm, cov, res, F, os.path.join(look_dir, sid + "_front.png"))
        front_view(pos, nrm, cov, a, F, os.path.join(look_dir, body + "_front.png"))
    return {"base": body, "c": sid + "_c.webp", "note": "Phobos's crowd: " + spec["note"]}


def front_view(pos, nrm, cov, col, F, path, S=3000):
    """The face from the front through the map (z-buffered points): for judging the marks' places without a renderer."""
    x0, x1, y0, y1 = F["mid"] - 0.08, F["mid"] + 0.08, 1.51, 1.75
    W, Hh = int((x1 - x0) * S), int((y1 - y0) * S)
    img = np.full((Hh, W, 3), 40, np.uint8)
    ys, xs = np.nonzero(cov & (nrm[..., 2] > -0.3))
    p = pos[ys, xs]
    px = ((p[:, 0] - x0) * S).astype(int); py = ((y1 - p[:, 1]) * S).astype(int)
    ok = (px >= 2) & (px < W - 3) & (py >= 2) & (py < Hh - 3)
    o = np.argsort(p[ok, 2])
    c = (col[ys[ok], xs[ok]][o] * 255).astype(np.uint8)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            img[py[ok][o] + dy, px[ok][o] + dx] = c
    Image.fromarray(img).save(path)


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
        print(sid, "<", spec["base"])


if __name__ == "__main__":
    main()
