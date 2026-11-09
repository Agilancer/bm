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
from PIL import Image

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
PALETTES = {
    "native": {"hue": 0, "sat": 1.0, "val": 1.0, "metal": None, "gold": 1},
    "crimson": {"hue": "to:355", "sat": 1.15, "val": 1.0, "metal": None, "gold": 1},
    "royal": {"hue": "to:225", "sat": 1.1, "val": 1.0, "metal": None, "gold": 1},
    "verdant": {"hue": "to:130", "sat": 0.95, "val": 0.95, "metal": None, "gold": 1},
    "violet": {"hue": "to:280", "sat": 1.05, "val": 1.0, "metal": None, "gold": 1},
    "ember": {"hue": "to:24", "sat": 1.2, "val": 1.05, "metal": None, "gold": 1},
    "frost": {"hue": "to:195", "sat": 0.8, "val": 1.1, "metal": (0.86, 0.92, 1.0), "gold": 0},
    "ash": {"hue": 0, "sat": 0.35, "val": 0.9, "metal": (0.95, 0.95, 0.95), "gold": 0},
    "bone": {"hue": "to:40", "sat": 0.45, "val": 1.25, "metal": (1.08, 1.04, 0.95), "gold": 1},
    "midnight": {"hue": "to:240", "sat": 0.8, "val": 0.75, "metal": (0.7, 0.74, 0.85), "gold": 1},
    "teal": {"hue": "to:178", "sat": 1.0, "val": 1.0, "metal": None, "gold": 1},
    "rose": {"hue": "to:330", "sat": 0.9, "val": 1.08, "metal": None, "gold": 1},
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


def recolour(img, pal):
    """Recolour a texture by a palette: dyed cloth and enamel turn, steel takes a tint, skin and leather stay."""
    if pal["hue"] == 0 and pal["sat"] == 1 and pal["val"] == 1 and pal["metal"] is None:
        return img
    a = np.asarray(img, dtype=np.float32) / 255
    mx, mn = a.max(2), a.min(2)
    v = mx
    s = np.where(mx > 1e-4, (mx - mn) / np.maximum(mx, 1e-4), 0)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-5)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    # Skin, leather and gold sit between about 15 and 55 degrees; leave them unless the palette says turn gold.
    warm = (h > 12) & (h < 55)
    dyed = (s > 0.28) & (v > 0.12) & ~warm
    if not pal["gold"]:
        dyed |= warm & (s > 0.45) & (v > 0.45)
    hue = pal["hue"]
    if isinstance(hue, str) and hue.startswith("to:"):
        # Turn the source's own dominant dyed hue to the target.
        if dyed.sum() > 50:
            hh = h[dyed]
            ang = np.deg2rad(hh)
            mean = np.rad2deg(np.arctan2(np.sin(ang).mean(), np.cos(ang).mean())) % 360
        else:
            mean = 0
        shift = float(hue[3:]) - mean
    else:
        shift = float(hue)
    h2 = np.where(dyed, (h + shift) % 360, h)
    s2 = np.where(dyed, np.clip(s * pal["sat"], 0, 1), s)
    v2 = np.where(dyed, np.clip(v * pal["val"], 0, 1), v)
    if pal["metal"] is not None:
        steel = (s < 0.2) & (v > 0.15)
        tint = np.array(pal["metal"], dtype=np.float32)
    # Back to RGB.
    c = v2 * s2
    x = c * (1 - np.abs((h2 / 60) % 2 - 1))
    m = v2 - c
    k = (h2 // 60).astype(int) % 6
    zeros = np.zeros_like(c)
    rgb = np.select([k[..., None] == i for i in range(6)], [
        np.stack([c, x, zeros], -1), np.stack([x, c, zeros], -1), np.stack([zeros, c, x], -1),
        np.stack([zeros, x, c], -1), np.stack([x, zeros, c], -1), np.stack([c, zeros, x], -1)]) + m[..., None]
    out = np.where(dyed[..., None], rgb, a)
    if pal["metal"] is not None:
        out = np.where(steel[..., None], np.clip(out * tint, 0, 1), out)
    return Image.fromarray((out * 255 + 0.5).astype(np.uint8))


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
    pal = PALETTES[spec["palette"]]
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
            key = (src.name, part["tex"])
            if key not in tex_cache:
                img = recolour(src.image(part["tex"]), pal)
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
    pals = [p for p in PALETTES if p != "native"]
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
            roster.append({"id": hid, "cls": cls, "sex": sex, "body": body, "groups": groups, "palette": palette,
                           "height": round(HEIGHT[sex] * CLASS_SCALE.get(cls, 1.0), 3)})
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
