"""Palette swaps: the same body in another person's clothes.  Run by paint.py (python tools/folk/paint.py --swaps [names]).

Each swap recolours its base's SOURCE base-colour map region by region and writes assets/game/folk/<swap>_c.webp, the
body (and its normal and metal-rough maps) staying the base's. The regions are in tools/folk/swaps.json. A region is a
soft mask made of two things:

  what the texel shows, by colour: how near it is (in CIELAB) to the reference colours the region names, which are
  the base's own colours read off with --probe; and, from the metal-rough map, how rough it is (cloth is rougher
  than leather, which tells a brown belt from brown breeches when their colours cannot);
  where it is on the body: the base's mesh drawn into its own UV layout, each texel knowing its height on the body,
  how far forward it faces, and which bones (head, neck, torso, shoulders, upper arms, forearms, hands, thighs,
  shins, feet) carry it.

So hair is "hair-coloured, on the head" and a shirt "linen-coloured, on the torso and arms", and skin, eyes, lips and
teeth are never in a mask: anything skin-coloured is taken out of every one, and a region marked "eyes" also keeps out
of the band of the face around the eye whites. Within a mask the colour moves in CIELAB: the region's mean lightness
and hue go to the target's while each texel keeps its difference from the mean (shading, weave, embroidery, dirt),
scaled by contrast and chroma factors, and the mask is feathered so no edge shows.

    python tools/folk/swaps.py --probe <base>               the colours each zone of the base wears, to pick refs from
    python tools/folk/swaps.py --overlays <swap> OUT_DIR    each region's mask tinted cyan, to paint on with look.py
    python tools/folk/swaps.py --debug OUT_DIR [swaps...]   the recoloured maps as PNGs, without touching the game
    python tools/folk/swaps.py --clusters <base> OUT_DIR    a picture of the base's clusters and their numbers
"""
import json
import os
import sys

import numpy as np
import scipy.cluster.vq as vq
import scipy.ndimage as ndi
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paint import CFG, OUT, Glb, log, save, source, update_manifest  # noqa: E402

WORK = 2048  # the size the recolouring is done at, before the 1024 the game gets
RASTER = 1024  # the size the body is drawn into its UVs at
GROUPS = {
    "head": ("Head", "HeadTop_End"), "neck": ("Neck",), "torso": ("Hips", "Spine"), "shoulder": ("Shoulder",),
    "upperarm": ("Arm",), "forearm": ("ForeArm",), "hand": ("Hand",), "thigh": ("UpLeg",), "shin": ("Leg",), "foot": ("Foot", "Toe"),
}
GROUP_NAMES = list(GROUPS)


# --- colour --------------------------------------------------------------------------------------------------------

def srgb_to_lab(rgb):
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    m = np.array([[0.4124564, 0.3575761, 0.1804375], [0.2126729, 0.7151522, 0.0721750], [0.0193339, 0.1191920, 0.9503041]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lab_to_srgb(lab):
    fy = (lab[..., 0] + 16) / 116
    fx = fy + lab[..., 1] / 500
    fz = fy - lab[..., 2] / 200
    f = np.stack([fx, fy, fz], -1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) / (24389 / 27)) * np.array([0.95047, 1.0, 1.08883])
    m = np.array([[3.2404542, -1.5371385, -0.4985314], [-0.9692660, 1.8760108, 0.0415560], [0.0556434, -0.2040259, 1.0572252]])
    c = np.clip(xyz @ m.T, 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * c ** (1 / 2.4) - 0.055)


def lch(L, C, h):
    """A target colour as lightness, chroma and hue angle in degrees (0 red, 70 orange-brown, 95 yellow, 140 green,
    250 blue, 330 purple)."""
    r = np.radians(h)
    return np.array([L, C * np.cos(r), C * np.sin(r)])


# --- the body in its own UVs ---------------------------------------------------------------------------------------

class Atlas:
    """A base model's source base-colour map at WORK size, in CIELAB, with the body drawn into its UV layout."""

    def __init__(self, mid):
        self.mid = mid
        g = Glb(source(mid))
        c, _, mr = g.maps()
        self.rgb = np.asarray(c.convert("RGB").resize((WORK, WORK), Image.LANCZOS)).astype(np.float32) / 255
        # Roughness (the metal-rough map's green): leather and metal are smoother than cloth, which tells a brown
        # belt from brown breeches when their colours cannot.
        self.rough = np.asarray(mr.convert("RGB").resize((WORK, WORK), Image.BILINEAR))[..., 1].astype(np.float32) / 255
        self.lab = srgb_to_lab(self.rgb).astype(np.float32)
        prim = g.doc["meshes"][0]["primitives"][0]
        a = prim["attributes"]
        pos = g.accessor(a["POSITION"]).astype(np.float64)
        uv = g.accessor(a["TEXCOORD_0"]).astype(np.float64)
        tri = g.accessor(prim["indices"]).reshape(-1, 3)
        names = [g.doc["nodes"][j]["name"].replace("mixamorig:", "") for j in g.doc["skins"][0]["joints"]]
        J = g.accessor(a["JOINTS_0"]).astype(int)
        W = g.accessor(a["WEIGHTS_0"]).astype(np.float64)
        # Tripo's mesh space: y up, +x forward, the person's left at -z, 0 to 1 tall.
        lo, hi = pos.min(0), pos.max(0)
        attrs = [(pos[:, 1] - lo[1]) / (hi[1] - lo[1]), pos[:, 0], -pos[:, 2]]
        group_of = np.array([next((k for k, g_ in enumerate(GROUP_NAMES) if n.replace("Left", "").replace("Right", "").startswith(GROUPS[g_])), 0)
                             for n in names])
        gw = np.zeros((len(pos), len(GROUP_NAMES)))
        for k in range(4):
            np.add.at(gw, (np.arange(len(pos)), group_of[J[:, k]]), W[:, k])
        vals = np.concatenate([np.stack(attrs, 1), gw], 1)
        self.fields = rasterize(uv * RASTER, tri, vals, RASTER)
        self.height, self.front, self.left = self.fields[..., 0], self.fields[..., 1], self.fields[..., 2]
        self.group = {n: self.fields[..., 3 + i] for i, n in enumerate(GROUP_NAMES)}

    def eyes(self):
        """Where the eyes are, to keep a hair recolour out of irises and lashes: the band of the head's front around
        the eye whites (pale, grey, forward-facing head texels), soft-edged."""
        if hasattr(self, "_eyes"):
            return self._eyes
        head = self.up(self.group["head"])
        h = self.up(self.height)
        fr = self.up(self.front)
        L, C = self.lab[..., 0], np.hypot(self.lab[..., 1], self.lab[..., 2])
        forward = fr > np.percentile(fr[head > 0.8], 85)
        for lmin, cmax in ((62, 9), (55, 11), (48, 13)):
            white = (head > 0.8) & (L > lmin) & (C < cmax) & forward
            if white.sum() > 50:
                break
        y = float(np.median(h[white])) if white.sum() > 50 else 0.93
        front = fr > np.percentile(fr[head > 0.8], 70)
        self._eyes = feather((front & (np.abs(h - y) < 0.012)).astype(np.float32), 3)
        log("eyes of", self.mid, "at height %.3f from %d white texels" % (y, white.sum()))
        return self._eyes

    def up(self, a):
        """A RASTER field brought up to WORK size."""
        return np.asarray(Image.fromarray(a.astype(np.float32)).resize((WORK, WORK), Image.BILINEAR))


def rasterize(uvp, tri, vals, size):
    """Each texel the barycentric mix of its triangle's vertex values; texels in no triangle (the gutters) take the
    nearest drawn texel's, as the paint there does."""
    out = np.zeros((size, size, vals.shape[1]), np.float32)
    hit = np.zeros((size, size), bool)
    P = uvp[tri]
    x0 = np.clip(np.floor(P[..., 0].min(1)).astype(int), 0, size - 1)
    x1 = np.clip(np.ceil(P[..., 0].max(1)).astype(int), 0, size - 1)
    y0 = np.clip(np.floor(P[..., 1].min(1)).astype(int), 0, size - 1)
    y1 = np.clip(np.ceil(P[..., 1].max(1)).astype(int), 0, size - 1)
    for t in range(len(tri)):
        xs = np.arange(x0[t], x1[t] + 1) + 0.5
        ys = np.arange(y0[t], y1[t] + 1) + 0.5
        X, Y = np.meshgrid(xs, ys)
        (ax, ay), (bx, by), (cx, cy) = P[t]
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        l0 = ((by - cy) * (X - cx) + (cx - bx) * (Y - cy)) / d
        l1 = ((cy - ay) * (X - cx) + (ax - cx) * (Y - cy)) / d
        l2 = 1 - l0 - l1
        inside = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not inside.any():
            continue
        v = vals[tri[t]]
        iy = (Y[inside] - 0.5).astype(int)
        ix = (X[inside] - 0.5).astype(int)
        out[iy, ix] = l0[inside, None] * v[0] + l1[inside, None] * v[1] + l2[inside, None] * v[2]
        hit[iy, ix] = True
    _, (ny, nx) = ndi.distance_transform_edt(~hit, return_indices=True)
    return out[ny, nx]


# --- masks ---------------------------------------------------------------------------------------------------------

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def clusters(lab, k, seed=7):
    """k-means on a sample of texels, lightness weighted down a little (shading should not split a cloth)."""
    rng = np.random.default_rng(seed)
    flat = lab.reshape(-1, 3)
    sample = flat[rng.choice(len(flat), 120000, replace=False)] * np.array([0.6, 1.0, 1.0])
    cent, _ = vq.kmeans2(sample, k, minit="++", seed=seed, iter=30)
    return cent / np.array([0.6, 1.0, 1.0])


def membership(lab, cent, sigma=6.0):
    """Soft membership of each texel in each cluster (sums to 1)."""
    w = np.array([0.6, 1.0, 1.0], np.float32)
    d2 = np.stack([(((lab - c) * w) ** 2).sum(-1) for c in cent.astype(np.float32)], -1).astype(np.float32)
    d2 -= d2.min(-1, keepdims=True)
    e = np.exp(-d2 / (2 * sigma ** 2))
    return e / e.sum(-1, keepdims=True)


def skin(lab):
    """How skin-like a texel's colour is: warm, moderately saturated, not dark. Kept out of every mask."""
    L, a, b = lab[..., 0], lab[..., 1], lab[..., 2]
    C = np.hypot(a, b)
    h = np.degrees(np.arctan2(b, a))
    return smooth(36, 46, L) * smooth(12, 17, C) * smooth(22, 34, h) * (1 - smooth(60, 68, h))


def feather(m, px=1.5):
    return ndi.gaussian_filter(m, px)


# --- recolouring ---------------------------------------------------------------------------------------------------

def recolour(lab, mask, target, contrast=1.0, chroma=0.7, light=1.0):
    """Move the masked region's mean colour to target (L, a, b), each texel keeping its own difference from the
    mean: lightness by contrast, colour by chroma. light: 1 moves the mean lightness all the way, 0 keeps it."""
    w = mask[..., None]
    total = mask.sum() + 1e-6
    mean = (lab * w).reshape(-1, 3).sum(0) / total
    out = lab.copy()
    L_t = mean[0] + (target[0] - mean[0]) * light
    out[..., 0] = L_t + (lab[..., 0] - mean[0]) * contrast
    out[..., 1:] = target[1:] + (lab[..., 1:] - mean[1:]) * chroma
    return lab + (out - lab) * w, mean


# --- the swaps -----------------------------------------------------------------------------------------------------

SWAPS = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "swaps.json")))["swaps"] \
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "swaps.json")) else {}


def near(lab, refs, sigma, sigma_l):
    """How close a texel's colour is to the nearest of refs: a Gaussian in CIELAB, hue and chroma (a, b) within
    sigma, lightness within sigma_l (shading moves lightness a long way; it barely moves a and b)."""
    best = None
    for r in refs:
        r = np.array(r, np.float32)
        d2 = ((lab[..., 0] - r[0]) / sigma_l) ** 2 + ((lab[..., 1] - r[1]) ** 2 + (lab[..., 2] - r[2]) ** 2) / sigma ** 2
        e = np.exp(-d2 / 2)
        best = e if best is None else np.maximum(best, e)
    return best


def masks_of(atlas, spec):
    """Every region's mask from the base's own colours (so the order they are listed in does not matter), where two
    claim the same texel shared out so they add to at most 1."""
    h = atlas.up(atlas.height)
    fr = atlas.up(atlas.front)
    sk = skin(atlas.lab)
    out = []
    for r in spec["regions"]:
        m = near(atlas.lab, r["refs"], r.get("sigma", 3.0), r.get("sigma_l", 12.0))
        if "not" in r:
            m = m * (1 - near(atlas.lab, r["not"], r.get("not_sigma", 2.5), r.get("not_sigma_l", 10.0)))
        if "parts" in r:
            m = m * atlas.up(np.clip(sum(atlas.group[p] for p in r["parts"]), 0, 1))
        if "not_parts" in r:
            m = m * (1 - atlas.up(np.clip(sum(atlas.group[p] for p in r["not_parts"]), 0, 1)))
        if "height" in r:
            lo, hi = r["height"]
            m = m * smooth(lo - 0.015, lo + 0.015, h) * (1 - smooth(hi - 0.015, hi + 0.015, h))
        if "rough" in r:
            lo, hi = r["rough"]
            m = m * smooth(lo - 0.05, lo + 0.05, atlas.rough) * (1 - smooth(hi - 0.05, hi + 0.05, atlas.rough))
        if "front" in r:
            m = m * smooth(r["front"][0], r["front"][1], fr)
        if r.get("eyes"):
            m = m * (1 - atlas.eyes())
        if not r.get("skin_ok"):
            m = m * (1 - smooth(0.15, 0.5, sk))
        out.append(np.clip(feather(m, r.get("feather", 1.2)), 0, 1))
    total = np.maximum(1.0, sum(out))
    return [m / total for m in out]


def make(name, debug=None):
    spec = SWAPS[name]
    atlas = Atlas(spec["base"])
    masks = masks_of(atlas, spec)
    lab = atlas.lab.copy()
    for r, m in zip(spec["regions"], masks):
        new, mean = recolour(atlas.lab, m, lch(*r["to"]), r.get("contrast", 1.0), r.get("chroma", 0.7), r.get("light", 1.0))
        lab += new - atlas.lab
        log("swap", name, r["name"], "from L%.0f C%.0f h%.0f" % (mean[0], np.hypot(*mean[1:]), np.degrees(np.arctan2(mean[2], mean[1]))),
            "to", r["to"], "share %.3f" % (m.mean()))
    if "age" in spec:
        # Older than the base: on the face's skin, its own lines deepened (whatever's darker than the skin round it, the folds
        # by the nose and mouth, under the eyes, across the brow, by `lines` again), and the colour a little faded.
        g = spec["age"]
        h = atlas.up(atlas.height)
        lo, hi = g.get("height", [0.86, 0.97])
        face = skin(atlas.lab) * atlas.up(np.clip(atlas.group["head"], 0, 1)) * smooth(lo - 0.01, lo + 0.01, h) * (1 - smooth(hi - 0.01, hi + 0.01, h))
        face = np.clip(feather(face, 2.0), 0, 1)
        L = lab[..., 0]
        px = lab.shape[0] / 1024.0
        Lb = ndi.gaussian_filter(L, 6 * px)
        L2 = L + np.minimum(L - Lb, 0) * g.get("lines", 1.0) - g.get("darken", 0.0)
        lab[..., 0] = L * (1 - face) + L2 * face
        lab[..., 1:] = lab[..., 1:] * (1 - face[..., None] * g.get("fade", 0.15))
        log("swap", name, "aged", "face share %.3f" % face.mean())
    rgb = lab_to_srgb(lab)
    img = Image.fromarray(np.clip(np.rint(rgb * 255), 0, 255).astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
    if debug:
        img.save(os.path.join(debug, name + "_c.png"))
        return
    kb = save(img, name + "_c.webp", quality=90)
    log("swap", name, "kb", kb // 1024)
    def entry(doc):
        # A swap wears its base's body, so it carries the base's skirt too (the game can read either).
        e = {"base": spec["base"], "c": name + "_c.webp", "note": spec["note"]}
        if doc["models"].get(spec["base"], {}).get("skirt"):
            e["skirt"] = doc["models"][spec["base"]]["skirt"]
        doc["swaps"][name] = e
    update_manifest(entry)


def cluster_picture(mid, k, out):
    """The base's clusters: a texture of flat cluster colours (to paint on the body with look.py --paint) and a table."""
    atlas = Atlas(mid)
    cent = clusters(atlas.lab, k)
    order = np.argsort(cent[:, 0])
    cent = cent[order]
    memb = membership(atlas.lab, cent)
    lab_id = memb.argmax(-1)
    rng = np.random.default_rng(3)
    pal = (rng.random((k, 3)) * 0.8 + 0.2)
    flat = pal[lab_id]
    shade = (atlas.lab[..., 0:1] / 100) * 0.5 + 0.5
    Image.fromarray((flat * shade * 255).astype(np.uint8)).save(os.path.join(out, f"{mid}_clusters.png"))
    sk = skin(atlas.lab)
    rows = []
    for i, c in enumerate(cent):
        sel = lab_id == i
        share = sel.mean()
        parts = {n: float(atlas.up(atlas.group[n])[sel].mean()) for n in GROUP_NAMES} if sel.any() else {}
        top = sorted(parts.items(), key=lambda x: -x[1])[:3]
        rows.append(f"{i:2d} L{c[0]:5.1f} a{c[1]:6.1f} b{c[2]:6.1f} C{np.hypot(c[1], c[2]):5.1f} h{np.degrees(np.arctan2(c[2], c[1])):5.0f} "
                    f"share {share:.3f} skin {sk[sel].mean() if sel.any() else 0:.2f} pal {tuple(int(x * 255) for x in pal[i])} "
                    + " ".join(f"{n}:{v:.2f}" for n, v in top))
    print("\n".join(rows))
    json.dump([[round(float(x), 2) for x in c] for c in cent], open(os.path.join(out, f"{mid}_centroids.json"), "w"))


ZONES = {
    "hair": (["head"], (0.86, 1.0), None), "face": (["head"], (0.80, 0.93), 1), "neck": (["neck"], (0, 1), None),
    "chest": (["torso", "shoulder"], (0.62, 0.85), 1), "back": (["torso", "shoulder"], (0.62, 0.85), -1),
    "waist": (["torso"], (0.5, 0.62), None), "upperarm": (["upperarm"], (0, 1), None),
    "forearm": (["forearm"], (0, 1), None), "hand": (["hand"], (0, 1), None),
    "thigh": (["thigh"], (0, 1), None), "shin": (["shin"], (0.12, 1), None), "foot": (["foot", "shin"], (0, 0.12), None),
}


def probe(mid, k=4):
    """What colours each zone of the body wears: k-means within it, biggest first."""
    atlas = Atlas(mid)
    h = atlas.up(atlas.height)
    fr = atlas.up(atlas.front)
    for zone, (parts, (lo, hi), side) in ZONES.items():
        w = atlas.up(np.clip(sum(atlas.group[p] for p in parts), 0, 1))
        sel = (w > 0.6) & (h >= lo) & (h <= hi)
        if side:
            sel &= (fr * side) > 0.01
        px = atlas.lab[sel]
        if len(px) < 500:
            continue
        idx = np.random.default_rng(1).choice(len(px), min(30000, len(px)), replace=False)
        smp, rs = px[idx], atlas.rough[sel][idx]
        cent, lab = vq.kmeans2(smp * np.array([0.6, 1, 1]), k, minit="++", seed=2)
        cent = cent / np.array([0.6, 1, 1])
        share = np.bincount(lab, minlength=k) / len(lab)
        out = []
        for i in np.argsort(-share):
            c = cent[i]
            out.append(f"[{c[0]:.0f},{c[1]:.1f},{c[2]:.1f}] C{np.hypot(c[1], c[2]):.0f} h{np.degrees(np.arctan2(c[2], c[1])):.0f} r{rs[lab == i].mean():.2f} {share[i]:.2f}")
        print(f"{zone:9s}", " | ".join(out))


def overlays(name, out):
    """Each region of a swap tinted cyan over the base's map, to paint on the body with look.py --paint."""
    spec = SWAPS[name]
    atlas = Atlas(spec["base"])
    masks = masks_of(atlas, spec)
    paths = []
    for r, m in zip(spec["regions"], masks):
        rgb = atlas.rgb * (1 - 0.7 * m[..., None]) + np.array([0.0, 1.0, 0.9]) * 0.7 * m[..., None]
        p = os.path.join(out, f"{name}-{r['name']}.png")
        Image.fromarray((rgb * 255).astype(np.uint8)).resize((1024, 1024)).save(p)
        paths.append(p)
    print(" ".join(paths))


def run(names):
    for n in names or list(SWAPS):
        make(n)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--probe":
        probe(a[1])
    elif a and a[0] == "--overlays":
        overlays(a[1], a[2])
    elif a and a[0] == "--clusters":
        cluster_picture(a[1], int(a[3]) if len(a) > 3 else 12, a[2])
    elif a and a[0] == "--debug":
        for n in a[2:] or list(SWAPS):
            make(n, a[1])
    else:
        run(a)
