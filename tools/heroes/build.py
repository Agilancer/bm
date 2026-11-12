"""Compose the AI heroes from the owner's Tripo hero sets and put them on the UAL master skeleton.

Every source (F:/!    BM V2/! TRIPO GENERATED HEROES, "SEX - CLASS N.glb") is a full suit cut into parts. All of them
share one Mixamo rest pose (one Tripo template), with bone lengths a few centimetres apart. So a hero is composed:
one source gives the body (its bones), and each of six swap groups (helm, chest, shoulders, arms, legs, boots) comes
from any source of the same class and sex. Borrowed parts are refitted to the body's bones (each vertex moves with
the weighted difference between the two skeletons' joints), recoloured by the hero's palette, written out as a
Tripo-style segmented GLB, and handed to tools/armor/rig_armor.py, which makes plates rigid, adds mail at the joints,
builds the atlas and puts the suit on the UAL skeleton like the town knights.

Parts come pre-decimated from decimate.py (background Blender) in tools/build/heroes/dec/*.npz.

Usage:
  python build.py survey                 # print each source's parts and their groups
  python build.py roster [ids...]        # build assets/game/heroes/<id>.glb and roster.json (all, or only these ids)
"""
import colorsys
import io
import json
import os
import random
import struct
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = os.path.dirname(HERE)
ROOT = os.path.dirname(TOOLS)
sys.path.insert(0, TOOLS)
sys.path.insert(0, os.path.join(TOOLS, "armor"))
from rig_to_ual import load_glb, read_accessor, world_matrices  # noqa: E402

SRC = "F:/!    BM V2/! TRIPO GENERATED HEROES"
MASTER = "F:/!    BM V2/MASTER ANIMATION RIG FILES/UAL_Master_Skeleton.glb"
DEC = os.path.join(TOOLS, "build", "heroes", "dec")
MIX = os.path.join(TOOLS, "build", "heroes", "mixamo")
FULL = os.path.join(TOOLS, "build", "heroes", "full")
OUT = os.path.join(ROOT, "assets", "game", "heroes")

ATLAS = 1024  # albedo atlas per hero; normal and metal/rough at half
GROUPS = ("helm", "chest", "shoulders", "arms", "legs", "boots")
# Which source files make each class and sex. "ROGUE 1 - NO HELM.glb" is a copy of the male one; MALE - LANCER 2 is the
# same model as FEMALE - LANCER 3 (same mesh), so it's left out.
SOURCES = {
    ("archer", "f"): ["FEMALE - ARCHER 1", "FEMALE - ARCHER 2", "FEMALE - ARCHER 3", "FEMALE - ARCHER 4"],
    ("bard", "f"): ["FEMALE - BARD 1", "FEMALE - BARD 2"],
    ("bard", "m"): ["MALE - BARD 1", "MALE - BARD 2"],
    ("boomerang", "f"): [f"FEMALE - BOOMERANG KNIGHT {i}" for i in range(1, 5)],
    ("boomerang", "m"): [f"MALE - BOOMERANG KNIGHT {i}" for i in range(1, 4)],
    ("dragoon", "f"): ["FEMALE - DRAGOON 1 - PINK AND PURPLE"] + [f"FEMALE - DRAGOON {i}" for i in range(2, 6)],
    ("dragoon", "m"): [f"MALE - DRAGOON {i}" for i in range(1, 6)],
    ("lancer", "f"): [f"FEMALE - LANCER {i}" for i in range(1, 4)],
    ("lancer", "m"): ["MALE - LANCER 1", "MALE - LANCER 3", "MALE - LANCER 4"],
    ("paladin", "f"): [f"FEMALE - PALADIN {i}" for i in range(1, 4)],
    ("paladin", "m"): [f"MALE - PALADIN {i}" for i in range(1, 4)],
    ("rogue", "m"): ["MALE ROGUE 1 - NO HELM", "MALE - ROGUE - 2", "MALE - ROGUE - 3"],
    ("ninja", "m"): ["MALE - NINJA 1", "MALE - NINJA 2"],
}
# Groups a source doesn't have on their own: its helm is part of its chest, its arms part of its shoulders.
FUSED = {"MALE - DRAGOON 5": {"helm": "chest"}, "MALE - PALADIN 2": {"arms": "shoulders"}}
# Standing height in metres. Lancers are the big ones.
HEIGHT = {"f": 1.76, "m": 1.88}
CLASS_SCALE = {"lancer": 1.08, "paladin": 1.02, "ninja": 0.98, "rogue": 0.98}
# How many heroes of each class and sex the roster holds (Paladins are rare, by the lore bible).
COUNT = {("archer", "f"): 6, ("bard", "f"): 3, ("bard", "m"): 3, ("boomerang", "f"): 3, ("boomerang", "m"): 3,
         ("dragoon", "f"): 4, ("dragoon", "m"): 4, ("lancer", "f"): 3, ("lancer", "m"): 4, ("paladin", "f"): 2,
         ("paladin", "m"): 2, ("rogue", "m"): 4, ("ninja", "m"): 3}

# Palettes. hue: turn of the dyed cloth and enamel (degrees, applied only where the colour is strong and not skin or
# gold); sat/val: their strength; metal: a tint over the grey steel; gold: keep gilding (1) or turn it to steel (0).
# white (top, gamma): whites and bright steel brought down to an off-white with their shading drawn out.
# enamel (hue, sat, val): bare steel and ivory plate lacquered in that colour, for a part that has to join a suit.
PALETTES = {
    "native": {"hue": 0, "sat": 1.0, "val": 1.0, "metal": None, "gold": 1},
    "crimson": {"hue": "to:355", "sat": 1.15, "val": 1.0, "metal": None, "gold": 1},
    "royal": {"hue": "to:225", "sat": 1.1, "val": 1.0, "metal": None, "gold": 1},
    "verdant": {"hue": "to:130", "sat": 0.95, "val": 0.95, "metal": None, "gold": 1},
    "violet": {"hue": "to:280", "sat": 1.05, "val": 1.0, "metal": None, "gold": 1},
    "ember": {"hue": "to:24", "sat": 1.2, "val": 1.05, "metal": None, "gold": 1},
    "frost": {"hue": "to:195", "sat": 0.8, "val": 1.1, "metal": (0.86, 0.92, 1.0), "gold": 0},
    "ash": {"hue": 0, "sat": 0.35, "val": 0.9, "metal": (0.95, 0.95, 0.95), "gold": 0, "white": (0.9, 1.7)},
    "bone": {"hue": "to:40", "sat": 0.45, "val": 1.25, "metal": (1.08, 1.04, 0.95), "gold": 1},
    "midnight": {"hue": "to:240", "sat": 0.8, "val": 0.75, "metal": (0.7, 0.74, 0.85), "gold": 1},
    "teal": {"hue": "to:178", "sat": 1.0, "val": 1.0, "metal": None, "gold": 1},
    "rose": {"hue": "to:330", "sat": 0.9, "val": 1.08, "metal": None, "gold": 1},
    # (After make_roster's own: it draws from the palettes above by their order, so new ones go below this line.)
    "moss": {"hue": "to:95", "sat": 0.9, "val": 1.0, "metal": None, "gold": 1, "enamel": (100, 0.42, 0.8)},
    "plum": {"hue": "to:290", "sat": 1.0, "val": 1.0, "metal": None, "gold": 1, "enamel": (288, 0.4, 0.85)},
    "garnet": {"hue": "to:355", "sat": 1.15, "val": 1.0, "metal": None, "gold": 1, "enamel": (356, 0.62, 0.7)},
}
ROLLED = 11  # how many palettes (after "native") make_roster draws from: the roster's rolls must not move when one is added

# The roster, where the dice were unkind (2026-11-11, after two critics went over all 44 in the game). A mix of parts
# from four or five suits in four or five colours doesn't read as one harness whatever its palette, and two bodies of a
# class with the same suit and nearly the same paint can't be told apart. Each entry replaces what make_roster rolled:
# "groups" (the body is the chest's source), "palette", and "palettes" for a group with a palette of its own.
_FD, _MD, _FB = "FEMALE - DRAGOON ", "MALE - DRAGOON ", "FEMALE - BOOMERANG KNIGHT "
ROSTER_FIX = {
    # Was a lilac helm, an ivory torso, red pauldrons, black arms and a pink skirt. Now the black suit, with the red
    # suit's helm and pauldrons, and its own magenta trim turned to their red.
    "dragoon_f4": {"groups": {"helm": _FD + "2", "chest": _FD + "5", "shoulders": _FD + "2", "arms": _FD + "5", "legs": _FD + "5", "boots": _FD + "5"}},
    # Was green and black with the blue suit's two white tassets. The legs now come with the arms and pauldrons.
    "dragoon_m4": {"groups": {"helm": _MD + "1", "chest": _MD + "2", "shoulders": _MD + "4", "arms": _MD + "4", "legs": _MD + "4", "boots": _MD + "4"}},
    # Was a black torso between gold shoulders. The black suit's whole top now, over the gold one's legs.
    "bard_m2": {"groups": {"helm": "MALE - BARD 2", "chest": "MALE - BARD 2", "shoulders": "MALE - BARD 2", "arms": "MALE - BARD 2", "legs": "MALE - BARD 1", "boots": "MALE - BARD 1"}},
    # Was a pink helm on a black torso with teal plates. The dark suit now, with the red suit's pauldrons and arms, in blue.
    "boomerang_f2": {"groups": {"helm": _FB + "3", "chest": _FB + "3", "shoulders": _FB + "1", "arms": _FB + "1", "legs": _FB + "3", "boots": _FB + "3"}, "palette": "royal"},
    # Was a lilac-white chest against teal arms and legs under a dark helm. The pale suit whole, turned to ice.
    "boomerang_f3": {"groups": {g: _FB + "4" for g in GROUPS}},
    # Near twins of another of their class: a colour of their own.
    "rogue_m3": {"palette": "moss"},
    "ninja_m3": {"palette": "plum"},
    "lancer_f3": {"palette": "verdant"},
    "boomerang_m3": {"palette": "garnet"},
}


def mix_names(names):
    return [n.replace("mixamorig:", "") for n in names]


def group_of(share):
    """A part's swap group from where its weight sits (share: Mixamo joint -> fraction)."""
    g = lambda *ks: sum(v for k, v in share.items() if any(k.startswith(x) for x in ks))
    head = g("Head", "Neck")
    torso = g("Spine")
    hips = g("Hips")
    sh = {s: g(f"{s}Shoulder", f"{s}Arm") - g(f"{s}ArmTwist") for s in ("Left", "Right")}
    fa = {s: g(f"{s}ForeArm", f"{s}Hand") for s in ("Left", "Right")}
    th = {s: g(f"{s}UpLeg") for s in ("Left", "Right")}
    lg = {s: g(f"{s}Leg", f"{s}Foot", f"{s}Toe") for s in ("Left", "Right")}
    if head > 0.45:
        return "helm"
    # Shoulder to calf on one side: half of a cape. It goes with the chest.
    for s in ("Left", "Right"):
        if sh[s] > 0.12 and th[s] + lg[s] > 0.3:
            return "chest"
    both_legs = min(th["Left"] + lg["Left"], th["Right"] + lg["Right"]) > 0.12
    if both_legs:
        # From the shoulders down past the hips is a cape or a tabard: it goes with the chest.
        return "chest" if sh["Left"] + sh["Right"] + torso > 0.25 else "legs"
    if torso + hips + min(sh.values()) * 2 > 0.5:
        return "chest"
    s = max(("Left", "Right"), key=lambda k: sh[k] + fa[k])
    if sh[s] + fa[s] > 0.5:
        return "arms" if fa[s] > sh[s] * 0.8 else "shoulders"
    s = max(("Left", "Right"), key=lambda k: th[k] + lg[k])
    if th[s] + lg[s] > 0.5:
        return "legs" if th[s] > lg[s] else "boots"
    return "chest"


class Source:
    """A hero source: its skeleton (bind-space joint positions), textures, and decimated parts with groups."""

    def __init__(self, name):
        self.name = name
        self.g, self.blob = load_glb(os.path.join(SRC, name + ".glb"))
        g = self.g
        skin = g["skins"][0]
        self.joint_nodes = skin["joints"]
        self.joints = [g["nodes"][j]["name"] for j in skin["joints"]]
        ibm = read_accessor(g, self.blob, skin["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1)
        self.ibm = ibm
        self.bind = {n: np.linalg.inv(m)[:3, 3] for n, m in zip(self.joints, ibm)}
        # Each joint's bone, to its first child joint (a leaf is a point).
        child = {}
        for j in skin["joints"]:
            kids = [c for c in g["nodes"][j].get("children", []) if c in skin["joints"]]
            if kids:
                child[g["nodes"][j]["name"]] = g["nodes"][kids[0]]["name"]
        self.bone = {n: (self.bind[n], self.bind[child.get(n, n)]) for n in self.joints}
        z = np.load(os.path.join(DEC, name + ".npz"))
        keys = sorted({k.split(".")[0] for k in z.files}, key=lambda s: int(s[1:]))
        mat_tex = {}
        for mesh in g["meshes"]:
            pr = mesh["primitives"][0]
            mat = g["materials"][pr["material"]]
            num = int(mat["name"].split("_")[2])
            mat_tex[num] = mat.get("pbrMetallicRoughness", {}).get("baseColorTexture", {}).get("index")
        self.parts = []
        self._bare = {}
        for k in keys:
            num = int(k[1:])
            groups = [str(x) for x in z[k + ".groups"]]
            J = z[k + ".joints"]
            Wt = z[k + ".weights"]
            names = np.array(groups + ["?"])
            acc = {}
            for jn, w in zip(names[J.ravel()], Wt.ravel()):
                if w > 0:
                    acc[jn] = acc.get(jn, 0) + float(w)
            tot = sum(acc.values()) or 1
            share = {kk.replace("mixamorig:", ""): v / tot for kk, v in acc.items()}
            self.parts.append({"num": num, "pos": z[k + ".pos"], "nrm": z[k + ".nrm"], "uv": z[k + ".uv"],
                               "tris": z[k + ".tris"], "joints": J, "weights": Wt, "groups": groups,
                               "tex": mat_tex.get(num), "group": group_of(share), "share": share})

    def image(self, tex):
        g = self.g
        im = g["images"][g["textures"][tex]["source"]]
        bv = g["bufferViews"][im["bufferView"]]
        o = bv.get("byteOffset", 0)
        return Image.open(io.BytesIO(self.blob[o:o + bv["byteLength"]])).convert("RGB")

    def islands(self, tex):
        """The UV islands painted from one texture: a picture of which island each texel is in (0: none), a picture of
        which are on the head (1) or a hand (2) by their triangles' weights, and for each island its number and its
        median hue, saturation and value."""
        img = self.image(tex)
        h, s, v = hsv(np.asarray(img, dtype=np.float32) / 255)
        # (Hue counted round the wheel from red, so pinks just under 360 sit beside those just over 0.)
        h = (h + 180) % 360 - 180
        lab = Image.new("I", img.size, 0)
        zone = Image.new("L", img.size, 0)
        d, dz = ImageDraw.Draw(lab), ImageDraw.Draw(zone)
        n0 = 1
        for part in self.parts:
            if part["tex"] != tex:
                continue
            tris, uv = part["tris"].reshape(-1, 3), part["uv"]
            n = len(uv)
            link = coo_matrix((np.ones(len(tris) * 2), (np.r_[tris[:, 0], tris[:, 1]], np.r_[tris[:, 1], tris[:, 2]])), shape=(n, n))
            count, label = connected_components(link, directed=False)
            px = uv * np.array(img.size)
            names = [x.replace("mixamorig:", "") for x in part["groups"]] + ["?"]
            on = lambda *keys: (np.array([any(k in x for k in keys) for x in names])[part["joints"]] * part["weights"]).sum(1)
            head, hand = on("Head", "Neck")[tris].mean(1), on("Hand")[tris].mean(1)
            for i, t in enumerate(tris):
                k = n0 + int(label[t[0]])
                poly = [tuple(px[t[0]]), tuple(px[t[1]]), tuple(px[t[2]])]
                d.polygon(poly, fill=k, outline=k)
                z = 1 if head[i] > 0.5 else 2 if hand[i] > 0.5 else 0
                if z:
                    dz.polygon(poly, fill=z, outline=z)
            n0 += count
        lab, zone = np.asarray(lab), np.asarray(zone)
        flat = lab.ravel()
        order = np.argsort(flat, kind="stable")
        ids, starts = np.unique(flat[order], return_index=True)
        out = []
        for k, a, b in zip(ids, starts, list(starts[1:]) + [len(order)]):
            if k == 0 or b - a < 12:
                continue
            sel = order[a:b]
            out.append((int(k), float(np.median(h.ravel()[sel])), float(np.median(s.ravel()[sel])), float(np.median(v.ravel()[sel])),
                        float((zone.ravel()[sel] == 1).mean())))
        return lab, zone, out, (h, s, v)

    def bare(self, tex):
        """Where a texture is skin or hair, which no palette dyes or tints (rogue_m4's blue fingertips and blue-smeared
        cheeks, 2026-11-11: a cheek's blush and a fingertip are redder than any band of hue that leaves a red scarf
        dyed). Only on a head and on hands, by the triangles' own weights:
          - a head's UV islands whose paint is flesh by its median (a face: its lips, blush, brows and eyes with it), or
            dark brown (hair, a beard);
          - a hand's flesh-coloured texels (fingers out of a fingerless glove share their islands with the glove, so
            there it's texel by texel, small gaps closed).
        Asked only of the sources that show skin (BARE): by paint alone a tan glove, a bronze vambrace and a pink hat
        all pass for flesh, and every other suit is helmed and gloved."""
        if self.name not in BARE:
            return None
        if tex not in self._bare:
            lab, zone, isl, (h, s, v) = self.islands(tex)
            ids = [k for k, mh, ms, mv, head in isl if head > 0.5 and (is_skin(mh, ms, mv) or is_hair(mh, ms, mv))]
            keep = np.isin(lab, ids) if ids else np.zeros(lab.shape, bool)
            flesh = (zone == 2) & (h >= FLESH_HUE[0]) & (h <= FLESH_HUE[1]) & (s >= FLESH_SAT[0]) & (s <= FLESH_SAT[1]) & (v >= FLESH_VAL)
            if flesh.sum() > 40:
                pic = Image.fromarray((flesh * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
                keep |= (np.asarray(pic) > 0) & (zone == 2)
            if keep.any():
                # A few texels out past the edges, for the filtering at the seams and the smaller mips.
                keep = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * max(2, lab.shape[0] // 170) + 1))) > 0
            self._bare[tex] = keep if keep.any() else None
        return self._bare[tex]


def hsv(a):
    """Hue (degrees), saturation and value of an HxWx3 array of 0-1 floats."""
    mx, mn = a.max(2), a.min(2)
    s = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-5)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, s, mx


def is_skin(h, s, v):
    """An island's median paint is flesh: pink to tan, neither grey nor strongly dyed, and lit."""
    return SKIN_HUE[0] <= h <= SKIN_HUE[1] and SKIN_SAT[0] <= s <= SKIN_SAT[1] and v >= SKIN_VAL


def is_hair(h, s, v):
    """An island's median paint is dark brown or black hair (asked only of islands on a head)."""
    return -5 <= h <= 50 and v < 0.42 and s < 0.5


def blur(x, r):
    """A float picture blurred (Gaussian, radius r texels)."""
    return gaussian_filter(x.astype(np.float32), r, mode="nearest")


def hsv_rgb(h, s, v):
    c = v * s
    x = c * (1 - np.abs((h / 60) % 2 - 1))
    m = v - c
    k = (h // 60).astype(int) % 6
    zeros = np.zeros_like(c)
    return np.select([k[..., None] == i for i in range(6)], [
        np.stack([c, x, zeros], -1), np.stack([x, c, zeros], -1), np.stack([zeros, c, x], -1),
        np.stack([zeros, x, c], -1), np.stack([x, zeros, c], -1), np.stack([c, zeros, x], -1)]) + m[..., None]


LUMA = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
LUMA_KEEP = 0.6   # how far a turned colour is held to the brightness it had (1: wholly; 0: only its HSV value kept)
SAT_KNEE = 0.72   # saturation past this is eased toward 1, never clipped at it


def recolour(img, pal, bare=None):
    """Recolour a texture by a palette: dyed cloth and enamel turn, steel takes a tint, skin and leather stay.
    bare: where the texture is skin or hair (Source.bare), which nothing turns or tints.

    What's dyed is decided by the texel (strong colour, not in the warm band of leather and gold) and then put to its
    neighbours where it's a near thing: a red cloth's shadows run to orange-brown, into the warm band, and were left as
    rust patches in a cloak turned teal (bard_m3); a brown glove's redder texels were turned, and left it speckled
    blue. A doubtful texel goes with what's round it.

    A turned colour keeps most of the brightness it had (LUMA_KEEP), not its HSV value: navy turned to orange or teal
    at the same value is three times as bright, and what was a dark panel with its detail in it became one flat loud
    block (the lancers' back plates). Saturation is eased toward 1 and never clipped there, for the same reason."""
    if pal["hue"] == 0 and pal["sat"] == 1 and pal["val"] == 1 and pal["metal"] is None and not pal.get("white") and not pal.get("enamel"):
        return img
    a = np.asarray(img, dtype=np.float32) / 255
    h, s, v = hsv(a)
    hr = (h + 180) % 360 - 180
    # Leather and gold sit between about 15 and 55 degrees; leave them unless the palette says turn gold.
    warm = (h > 12) & (h < 55)
    dyed = (s > 0.28) & (v > 0.12) & ~warm
    if not pal["gold"]:
        # (Gilding in shadow is still gilding: bright gold turned and dark gold left was half of bard_m3's rust.)
        dyed |= warm & (s > 0.45) & (v > 0.18)
    # The near things, by their neighbours (of the painted texels only: the black between the islands has no say).
    inside = v > 0.04
    r = max(2.0, img.size[0] / 170)
    near = blur(dyed & inside, r) / np.maximum(blur(inside, r), 1e-3)
    maybe = ~dyed & inside & (((hr > 12) & (hr < 30) & (s > 0.2) & (v > 0.06)) | (~warm & (s > 0.15) & (v > 0.05)))
    doubt = dyed & (((hr > -8) & (hr <= 12) & (s < 0.5)) | (s < 0.36) | (v < 0.16) | (warm & (v < 0.45)))
    if not pal["gold"]:
        maybe |= ~dyed & inside & warm & (s > 0.3) & (v > 0.1)
    dyed = (dyed | (maybe & (near > 0.6))) & ~(doubt & (near < 0.25))
    if bare is not None:
        dyed &= ~bare
    hue = pal["hue"]
    if isinstance(hue, str) and hue.startswith("to:"):
        # Turn the source's own dominant dyed hue to the target.
        if dyed.sum() > 50:
            ang = np.deg2rad(h[dyed])
            mean = np.rad2deg(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())) % 360
        else:
            mean = 0
        shift = float(hue[3:]) - mean
    else:
        shift = float(hue)
    x = s * pal["sat"]
    s2 = np.where(x <= SAT_KNEE, x, SAT_KNEE + (1 - SAT_KNEE) * (1 - np.exp(-(x - SAT_KNEE) / (1 - SAT_KNEE))))
    rgb = hsv_rgb((h + shift) % 360, s2, v * pal["val"])
    if shift:
        y0, y1 = (a @ LUMA) * pal["val"], rgb @ LUMA
        rgb = rgb * ((np.maximum(y0, 1e-4) / np.maximum(y1, 1e-4)) ** LUMA_KEEP)[..., None]
    out = np.where(dyed[..., None], rgb, a)
    plain = ~dyed & (s < 0.2) & (v > 0.15)
    if bare is not None:
        plain &= ~bare
    if pal.get("enamel"):
        # Bare steel and ivory plate lacquered: the palette's own colour at the plate's own shading.
        eh, es, ev = pal["enamel"]
        lac = hsv_rgb(np.full_like(v, eh), np.full_like(v, es), np.clip(v, 0, 1) ** 1.25 * ev)
        w = np.clip((v - 0.15) / 0.2, 0, 1) * np.clip((0.27 - s) / 0.12, 0, 1) * ~dyed
        if bare is not None:
            w = w * ~bare
        out = out + (lac - out) * w[..., None]
    elif pal["metal"] is not None:
        out = np.where(plain[..., None], out * np.array(pal["metal"], dtype=np.float32), out)
    if pal.get("white"):
        # White cloth and plate brought down to an off-white, its shading drawn out: a white near 1 has no room for its
        # folds (paladin_m2's cloak read as flat sheets).
        top, gamma = pal["white"]
        w = np.clip((v - 0.35) / 0.35, 0, 1) * (plain if not pal.get("enamel") else 0)
        out = out * (1 + (top * np.clip(v, 1e-3, 1) ** (gamma - 1) - 1) * w)[..., None]
    # Too bright for the screen: toward grey at its own brightness, not clipped a channel at a time.
    y = np.clip(out @ LUMA, 0, 1)[..., None]
    over = np.maximum(out.max(-1, keepdims=True), 1.0)
    t = np.where(over > 1, (1 - y) / np.maximum(over - y, 1e-4), 1.0)
    out = y + (out - y) * t
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))


# The sources that show skin: a face or the eyes on the head, fingers out of the gloves. Every other suit is closed.
BARE = {"MALE ROGUE 1 - NO HELM", "MALE - NINJA 1", "MALE - NINJA 2"}
# What paint counts as skin, by an island's median (Source.bare): hue in degrees round from red, saturation, value.
SKIN_HUE, SKIN_SAT, SKIN_VAL = (2, 32), (0.18, 0.62), 0.36
# ...and by the texel, on a hand.
FLESH_HUE, FLESH_SAT, FLESH_VAL = (3, 40), (0.2, 0.62), 0.18

STRAY = 0.14  # a weight on a bone further than this from the vertex (model heights) is a Tripo rigging slip


def clean_weights(pos, J, W, names, bone):
    """Drop weights to bones a vertex isn't near (a boot riding the upper arm), keeping at least the nearest."""
    W = W.copy()
    d = np.full(J.shape, 9.0)
    for k in range(J.shape[1]):
        for gi in np.unique(J[:, k]):
            n = names[gi] if gi < len(names) else None
            if n not in bone:
                continue
            a, b = bone[n]
            ab = b - a
            sel = J[:, k] == gi
            p = pos[sel]
            t = np.clip(((p - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
            d[sel, k] = np.linalg.norm(p - (a + t[:, None] * ab), axis=1)
    far = d > STRAY
    near = np.argmin(np.where(W > 0, d, 9), 1)
    keep = ~far
    keep[np.arange(len(W)), near] = True
    W = np.where(keep, W, 0)
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    return W


class Packer:
    def __init__(self):
        self.blob = bytearray()
        self.views, self.accessors = [], []

    def view(self, raw, target=None):
        self.blob += b"\0" * (-len(self.blob) % 4)
        v = {"buffer": 0, "byteOffset": len(self.blob), "byteLength": len(raw)}
        if target:
            v["target"] = target
        self.blob += raw
        self.views.append(v)
        return len(self.views) - 1

    def add(self, arr, ctype, typ, target=None, bounds=False):
        dt = {5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "u1"}[ctype]
        arr = np.ascontiguousarray(arr, dtype=dt)
        count = arr.shape[0] if arr.ndim > 1 or typ == "SCALAR" else 1
        a = {"bufferView": self.view(arr.tobytes(), target), "componentType": ctype, "count": int(count), "type": typ}
        if bounds:
            a["min"] = np.atleast_1d(arr.reshape(count, -1).min(0)).tolist()
            a["max"] = np.atleast_1d(arr.reshape(count, -1).max(0)).tolist()
        self.accessors.append(a)
        return len(self.accessors) - 1


def compose(spec, sources, path):
    """Write the composed hero as a segmented Mixamo GLB (Tripo layout) for rig_armor.py."""
    body = sources[spec["body"]]
    g = body.g
    pk = Packer()
    nodes = [dict(n) for n in g["nodes"] if "mesh" not in n]
    # Keep the skeleton's node indices: rebuild the node list with meshes dropped, then remap children.
    keep = [i for i, n in enumerate(g["nodes"]) if "mesh" not in n]
    remap = {old: new for new, old in enumerate(keep)}
    for n in nodes:
        if "children" in n:
            n["children"] = [remap[c] for c in n["children"] if c in remap]
        n.pop("skin", None)
    skin_joints = [remap[j] for j in body.joint_nodes]
    jindex = {n: i for i, n in enumerate(body.joints)}
    meshes, materials, textures, images = [], [], [], []
    tex_cache = {}
    scene_nodes = list(g["scenes"][g.get("scene", 0)]["nodes"])
    scene_nodes = [remap[i] for i in scene_nodes if i in remap]
    for grp in GROUPS:
        src = sources[spec["groups"][grp]]
        # A group can have a palette of its own (spec "palettes"), to bring an odd part into the body's colours.
        pname = spec.get("palettes", {}).get(grp, spec["palette"])
        pal = PALETTES[pname]
        for part in src.parts:
            if part["group"] != grp:
                continue
            names = part["groups"]
            J = part["joints"]
            W = part["weights"].astype(np.float64)
            # Refit to the body's bones.
            delta = np.zeros((len(names), 3))
            for i, n in enumerate(names):
                if n in body.bind and n in src.bind:
                    delta[i] = body.bind[n] - src.bind[n]
            pos = part["pos"] + np.einsum("vk,vkc->vc", W, delta[J])
            W = clean_weights(part["pos"], J, W, names, src.bone)
            jj = np.array([jindex.get(n, 0) for n in names])[J]
            key = (src.name, part["tex"], pname)
            if key not in tex_cache:
                img = recolour(src.image(part["tex"]), pal, src.bare(part["tex"]))
                buf = io.BytesIO()
                img.save(buf, "PNG")
                images.append({"mimeType": "image/png", "bufferView": pk.view(buf.getvalue())})
                textures.append({"source": len(images) - 1})
                tex_cache[key] = len(textures) - 1
            materials.append({"name": f"tripo_part_{len(materials)}_material",
                              "pbrMetallicRoughness": {"baseColorTexture": {"index": tex_cache[key]}}})
            attrs = {"POSITION": pk.add(pos, 5126, "VEC3", 34962, True), "NORMAL": pk.add(part["nrm"], 5126, "VEC3", 34962),
                     "TEXCOORD_0": pk.add(part["uv"], 5126, "VEC2", 34962), "JOINTS_0": pk.add(jj, 5123, "VEC4", 34962),
                     "WEIGHTS_0": pk.add(W, 5126, "VEC4", 34962)}
            meshes.append({"primitives": [{"attributes": attrs, "indices": pk.add(part["tris"].ravel(), 5125, "SCALAR", 34963),
                                           "material": len(materials) - 1}]})
            nodes.append({"name": f"{grp}_{src.name[-12:]}_{part['num']}", "mesh": len(meshes) - 1, "skin": 0})
            scene_nodes.append(len(nodes) - 1)
    ibm = pk.add(body.ibm.transpose(0, 2, 1).reshape(-1, 16), 5126, "MAT4")
    out = {"asset": {"version": "2.0", "generator": "bm/tools/heroes/build.py"}, "scene": 0,
           "scenes": [{"nodes": scene_nodes}], "nodes": nodes, "meshes": meshes, "materials": materials,
           "textures": textures, "images": images, "skins": [{"joints": skin_joints, "inverseBindMatrices": ibm}],
           "accessors": pk.accessors, "bufferViews": pk.views, "buffers": [{"byteLength": len(pk.blob)}]}
    js = json.dumps(out, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    body_bin = bytes(pk.blob) + b"\0" * (-len(pk.blob) % 4)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(body_bin)))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(body_bin), b"BIN\0") + body_bin)


def make_roster(seed=7):
    """The roster: for each class and sex, the sources as they are first, then mixes, each in its own palette."""
    rng = random.Random(seed)
    roster = []
    pals = [p for p in PALETTES if p != "native"][:ROLLED]
    for (cls, sex), n in COUNT.items():
        srcs = SOURCES[(cls, sex)]
        used = set()
        for k in range(n):
            body = srcs[k % len(srcs)]
            if k < len(srcs) and k < max(1, n // 2):
                groups = {g: body for g in GROUPS}
                palette = "native"
            else:
                for _ in range(40):
                    groups = {g: rng.choice(srcs) for g in GROUPS}
                    # The legs and boots come as a pair, and the helm stays with the chest half the time.
                    groups["boots"] = groups["legs"]
                    sig = tuple(groups[g] for g in GROUPS)
                    if sig not in used and len(set(sig)) > 1 or len(srcs) == 1:
                        break
                palette = rng.choice(pals)
                body = groups["chest"]
            # A source with a group fused into another gives both or neither.
            for src, fused in FUSED.items():
                for empty, carrier in fused.items():
                    if groups[carrier] == src:
                        groups[empty] = src
                    elif groups[empty] == src:
                        groups[empty] = groups[carrier]
            used.add(tuple(groups[g] for g in GROUPS))
            hid = f"{cls}_{sex}{k + 1}"
            spec = {"id": hid, "cls": cls, "sex": sex, "body": body, "groups": groups, "palette": palette,
                    "height": round(HEIGHT[sex] * CLASS_SCALE.get(cls, 1.0), 3)}
            fix = ROSTER_FIX.get(hid, {})
            if "groups" in fix:
                spec["groups"] = dict(fix["groups"])
                spec["body"] = spec["groups"]["chest"]
            for key in ("palette", "palettes"):
                if key in fix:
                    spec[key] = fix[key]
            roster.append(spec)
    return roster


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "survey"
    if cmd == "survey":
        names = sys.argv[2:] or [n for v in SOURCES.values() for n in v]
        for n in names:
            s = Source(n)
            counts = {g: 0 for g in GROUPS}
            for p in s.parts:
                counts[p["group"]] += len(p["tris"])
            print(f"{n:42s}", " ".join(f"{g}:{counts[g]:5d}" for g in GROUPS))
        return
    if cmd == "roster":
        import rig_armor
        roster = make_roster()
        only = set(sys.argv[2:])
        cache = {}
        os.makedirs(OUT, exist_ok=True)
        for spec in roster:
            if only and spec["id"] not in only:
                continue
            need = {spec["body"], *spec["groups"].values()}
            for n in need:
                if n not in cache:
                    cache[n] = Source(n)
            mix_path = os.path.join(MIX, spec["id"] + ".glb")
            compose(spec, cache, mix_path)
            rig_armor.CONFIG[spec["id"]] = {"height": spec["height"], "auto": True, "atlas": ATLAS, "pbr": ATLAS // 2,
                                             "rigid_hands": True}
            sys.argv = ["rig_armor.py", spec["id"], mix_path, MASTER, os.path.join(FULL, spec["id"] + ".glb"),
                        os.path.join(OUT, spec["id"] + ".glb")]
            rig_armor.main()
        meta = [{k: v for k, v in s.items()} for s in roster]
        with open(os.path.join(OUT, "roster.json"), "w") as f:
            json.dump(meta, f, indent=1)
        print(f"{len(roster)} heroes in the roster")


if __name__ == "__main__":
    main()
