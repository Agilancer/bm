"""Put a segmented Tripo plate-armour GLB on the UAL master skeleton.

Every segment is bound rigidly. A plate either follows one joint, or follows a constant mix of two
joints across its whole surface: all its vertices get the same skinning matrix, so it can never bend.
Shells that span a joint (forearm + gauntlet, shin + sabaton) are cut along their source weights and
each piece becomes its own plate. Only cloth and finger segments keep per-vertex weights.

Under the plates it adds short mail sleeves at each joint, softly weighted, so a bent elbow opens onto
mail and not onto the sky. Also merges the segments into one atlas and one draw call, and derives normal and metal/rough maps
from the painted colour. The piece table goes in scene.extras for the game's hit tests.

Usage: python rig_armor.py velscour|silver|knight|t_purple|t_white|t_silver|t_pale SOURCE.glb UAL_Master_Skeleton.glb OUT_FULL.glb OUT_GAME.glb

The first two suits are mapped by hand. The rest are read from their own skin weights (auto_parts).
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from rig_to_ual import AIM_CHILD, Packer, arc, load_glb, quat_matrix, read_accessor, top_four, ual_name, unit, world_matrices  # noqa: E402

FINGERS = {"Index": "index", "Middle": "middle", "Ring": "ring", "Pinky": "pinky", "Thumb": "thumb"}
ALBEDO_ATLAS = 4096
PBR_ATLAS = 2048
PAD = 6
GROUND_CLIP = "Idle_Loop"


def src_to_ual(name):
    """Mixamo joint to UAL joint, fingers included."""
    short = name.replace("mixamorig:", "")
    for side, s in (("Left", "l"), ("Right", "r")):
        if short.startswith(side + "Hand") and short != side + "Hand":
            rest = short[len(side) + 4:]
            finger, seg = rest[:-1], int(rest[-1])
            return f"{FINGERS[finger]}_{seg:02d}_{s}" if seg < 4 else f"{FINGERS[finger]}_04_leaf_{s}"
    return ual_name(name)


def mix(**w):
    """A constant-weight plate. Keyword names are UAL joints."""
    return {"plate": {k: float(v) for k, v in w.items()}}


CLOTH = {"cloth": True}
HAND_L, HAND_R = {"hand": "l"}, {"hand": "r"}


def by_weights(*classes):
    """Cut a shell into plates. Each class is (source joint name fragments, piece spec)."""
    return {"split": classes}


def waist(x_center=0.0):
    def label(c, w, names):
        lft = sum(w[i] for i, n in enumerate(names) if n == "LeftUpLeg" or n == "LeftLeg")
        rgt = sum(w[i] for i, n in enumerate(names) if n == "RightUpLeg" or n == "RightLeg")
        mid = 1 - lft - rgt
        if mid > 0.5:
            return 0
        return 1 if lft > rgt else 2
    return {"custom": label,
            "pieces": [mix(pelvis=1), mix(pelvis=0.55, thigh_l=0.45), mix(pelvis=0.55, thigh_r=0.45)]}


def skirt(belt_y, tab_x):
    """The silver knight's faulds: belt on the pelvis, a tabard down the middle, lames beside it."""
    def label(c, w, names):
        if c[1] > belt_y:
            return 0
        if abs(c[0]) < tab_x and c[2] > 0:
            return 3
        return 1 if c[0] > 0 else 2
    return {"custom": label,
            "pieces": [mix(pelvis=1), mix(pelvis=0.6, thigh_l=0.4), mix(pelvis=0.6, thigh_r=0.4), CLOTH]}


def arm_full(s):
    S = "Left" if s == "l" else "Right"
    return by_weights(((f"{S}Shoulder", f"{S}Arm"), mix(**{f"upperarm_{s}": 1})),
                      ((f"{S}ForeArm",), mix(**{f"lowerarm_{s}": 1})),
                      ((f"{S}Hand",), {"hand": s}))


def fore(s):
    S = "Left" if s == "l" else "Right"
    return by_weights(((f"{S}ForeArm", f"{S}Arm"), mix(**{f"lowerarm_{s}": 1})),
                      ((f"{S}Hand",), {"hand": s}))


def boot(s):
    S = "Left" if s == "l" else "Right"
    return by_weights(((f"{S}Foot", f"{S}Leg"), mix(**{f"foot_{s}": 1})),
                      ((f"{S}ToeBase", f"{S}Toe"), mix(**{f"ball_{s}": 1})))


def shin_full(s):
    S = "Left" if s == "l" else "Right"
    return by_weights(((f"{S}Leg", f"{S}UpLeg"), mix(**{f"calf_{s}": 1})),
                      ((f"{S}Foot",), mix(**{f"foot_{s}": 1})),
                      ((f"{S}ToeBase", f"{S}Toe"), mix(**{f"ball_{s}": 1})))


def shin_cop(s):
    """Shin with its knee cop, which rides at half the knee's angle like a real poleyn."""
    S = "Left" if s == "l" else "Right"
    return by_weights(((f"{S}Leg", f"{S}Foot"), mix(**{f"calf_{s}": 1})),
                      ((f"{S}UpLeg",), mix(**{f"calf_{s}": 0.5, f"thigh_{s}": 0.5})))


def thigh_cop(s):
    S = "Left" if s == "l" else "Right"
    O = "Right" if s == "l" else "Left"
    return by_weights(((f"{S}UpLeg", "Hips", f"{O}UpLeg", "Spine"), mix(**{f"thigh_{s}": 1})),
                      ((f"{S}Leg",), mix(**{f"calf_{s}": 0.5, f"thigh_{s}": 0.5})))


CONFIG = {
    "velscour": {
        "height": 2.12,
        "parts": {
            "tripo_part_0": waist(),
            "tripo_part_1": mix(thigh_r=1), "tripo_part_4": mix(thigh_l=1),
            "tripo_part_2": shin_cop("r"), "tripo_part_3": shin_cop("l"),
            "tripo_part_13": boot("l"), "tripo_part_14": boot("r"),
            "tripo_part_15": mix(upperarm_r=1), "tripo_part_16": mix(upperarm_l=1),
            "tripo_part_8": mix(upperarm_r=0.6, clavicle_r=0.4), "tripo_part_10": mix(upperarm_l=0.6, clavicle_l=0.4),
            "tripo_part_5": mix(spine_03=0.65, spine_02=0.35),
            "tripo_part_7": mix(Head=1),
            "tripo_part_6": fore("r"), "tripo_part_12": fore("l"),
            "tripo_part_9": CLOTH, "tripo_part_11": CLOTH,
            "tripo_part_17": mix(pelvis=0.55, thigh_l=0.45),
        },
    },
    "silver": {
        "height": 1.92,
        "parts": {
            "tripo_part_0": skirt(0.545 * 1.92 / 0.96, 0.05),
            "tripo_part_5": thigh_cop("l"), "tripo_part_6": thigh_cop("r"),
            "tripo_part_3": shin_full("l"), "tripo_part_10": shin_full("r"),
            "tripo_part_1": arm_full("r"), "tripo_part_2": arm_full("l"),
            "tripo_part_7": mix(upperarm_r=0.6, clavicle_r=0.4), "tripo_part_9": mix(upperarm_l=0.6, clavicle_l=0.4),
            "tripo_part_4": mix(spine_03=0.6, spine_02=0.4),
            "tripo_part_11": mix(spine_03=1), "tripo_part_12": mix(neck_01=1),
            "tripo_part_13": mix(spine_03=1), "tripo_part_14": mix(spine_03=1),
            "tripo_part_8": mix(Head=1),
        },
    },
}


# The suits worn by the knights added after the first two: no hand-made table, each segment is read from its weights.
AUTO = {"knight": 1.9, "t_purple": 1.94, "t_white": 1.94, "t_silver": 1.94, "t_pale": 1.94}
for _suit, _h in AUTO.items():
    CONFIG[_suit] = {"height": _h, "auto": True, "atlas": 2048, "pbr": 1024}

RIGID = {"Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03", "Neck": "neck_01", "Head": "Head"}
for _S, _s in (("Left", "l"), ("Right", "r")):
    RIGID.update({f"{_S}Shoulder": f"clavicle_{_s}", f"{_S}Arm": f"upperarm_{_s}", f"{_S}ForeArm": f"lowerarm_{_s}",
                  f"{_S}UpLeg": f"thigh_{_s}", f"{_S}Leg": f"calf_{_s}", f"{_S}Foot": f"foot_{_s}",
                  f"{_S}ToeBase": f"ball_{_s}", f"{_S}Toe_End": f"ball_{_s}"})


def group_of(name):
    """Source joint to the UAL joint a plate on it follows; a whole hand counts as one."""
    for S, s in (("Left", "l"), ("Right", "r")):
        if name.startswith(S + "Hand"):
            return f"hand_{s}"
    return RIGID.get(name)


def auto_part(share, names):
    """A segment's spec from where its weight sits (share: group -> fraction of the segment's weight)."""
    g = lambda *k: sum(share.get(x, 0) for x in k)
    for s in "lr":
        # Shoulder to calf on one side: half of a cape, cloth.
        if g(f"clavicle_{s}", f"upperarm_{s}") > 0.12 and g(f"thigh_{s}", f"calf_{s}", f"foot_{s}") > 0.3:
            return CLOTH
    if share.get("thigh_l", 0) > 0.2 and share.get("thigh_r", 0) > 0.2:
        # Across both legs: a skirt of plates on the belt, or cloth that hangs.
        return waist() if g("pelvis", "spine_01", "spine_02") > 0.25 else CLOTH
    torso = g("spine_01", "spine_02", "spine_03", "neck_01", "pelvis") + (g("clavicle_l", "clavicle_r") if min(share.get("clavicle_l", 0), share.get("clavicle_r", 0)) > 0.08 else 0)
    if share.get("Head", 0) > 0.4:
        return mix(Head=1)
    if torso > 0.5:
        if share.get("neck_01", 0) > 0.5:
            return mix(neck_01=1)
        return mix(pelvis=0.5, spine_01=0.5) if g("pelvis", "spine_01") > g("spine_02", "spine_03") else mix(spine_03=0.6, spine_02=0.4)
    for s in "lr":
        if g(f"upperarm_{s}", f"clavicle_{s}") > 0.7 and share.get(f"lowerarm_{s}", 0) < 0.15:
            return mix(**{f"upperarm_{s}": 0.6, f"clavicle_{s}": 0.4}) if share.get(f"clavicle_{s}", 0) >= 0.25 else mix(**{f"upperarm_{s}": 1})
    # A limb shell: cut along the weights, a plate per joint (shoulder into the upper arm, hip into the thigh).
    fold = {"clavicle_l": "upperarm_l", "clavicle_r": "upperarm_r", "pelvis": None, "spine_01": None, "spine_02": None, "spine_03": None, "neck_01": None}
    classes = {}
    for n in names:
        grp = group_of(n)
        if grp is None:
            continue
        grp = fold.get(grp, grp)
        if grp is None:
            continue
        classes.setdefault(grp, []).append(n)
    keep = [k for k in classes if share.get(k, 0) + sum(share.get(c, 0) for c, t in fold.items() if t == k) > 0.04]
    if len(keep) <= 1:
        k = keep[0] if keep else max(share, key=share.get)
        return {"hand": k[-1]} if k.startswith("hand_") else mix(**{k: 1})
    return by_weights(*[(tuple(classes[k]), {"hand": k[-1]} if k.startswith("hand_") else mix(**{k: 1})) for k in keep])


def weld(pos, tol=2e-4):
    return np.unique(np.round(pos / tol).astype(np.int64), axis=0, return_inverse=True)[1].ravel()


def face_neighbours(tris, wid):
    """Edge-adjacent faces, through welded vertices."""
    edge = {}
    out = [[] for _ in range(len(tris))]
    for f, t in enumerate(wid[tris]):
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
            k = (a, b) if a < b else (b, a)
            if k in edge:
                g = edge[k]
                out[f].append(g)
                out[g].append(f)
            else:
                edge[k] = f
    return out


def smooth_labels(labels, nb, rounds=4):
    labels = labels.copy()
    n = labels.max() + 1
    for _ in range(rounds):
        nxt = labels.copy()
        for f, near in enumerate(nb):
            if near:
                counts = np.bincount(labels[near], minlength=n)
                counts[labels[f]] += 1
                nxt[f] = counts.argmax()
        labels = nxt
    return labels


def blur_weights(w, tris, wid, rounds):
    """Even out cloth weights across its surface so it can't crease on one vertex."""
    for _ in range(rounds):
        acc = np.zeros((wid.max() + 1, w.shape[1]))
        cnt = np.zeros(wid.max() + 1)
        for t in tris:
            ws = w[t].mean(0)
            for v in wid[t]:
                acc[v] += ws
                cnt[v] += 1
        cnt[cnt == 0] = 1
        w = acc[wid] / cnt[wid, None]
    return w


class Mesh:
    """Accumulates pieces into one vertex and index stream."""

    def __init__(self, njoints):
        self.pos, self.nrm, self.uv, self.w, self.flex, self.group, self.tris, self.pieces = [], [], [], [], [], [], [], []
        self.n = 0
        self.njoints = njoints

    def add_piece(self, name, kind, pos, nrm, uv, weights, flex, tris):
        used, inv = np.unique(tris.ravel(), return_inverse=True)
        idx = inv.reshape(-1, 3) + self.n
        gid = len(self.pieces)
        self.pos.append(pos[used])
        self.nrm.append(nrm[used])
        self.uv.append(uv[used])
        self.w.append(weights[used])
        self.flex.append(flex[used])
        self.group.append(np.full(len(used), gid))
        self.tris.append(idx)
        self.pieces.append({"name": name, "kind": kind, "vstart": self.n, "vcount": len(used),
                            "tstart": sum(len(t) for t in self.tris[:-1]), "tcount": len(idx)})
        self.n += len(used)


# Where plates part, the knight wears mail: (parent joint, joint, child joint). Fingers need none.
SLEEVES = [("pelvis", "spine_01", "spine_02"), ("spine_03", "neck_01", "Head")]
for _s in "lr":
    SLEEVES += [(f"clavicle_{_s}", f"upperarm_{_s}", f"lowerarm_{_s}"), (f"upperarm_{_s}", f"lowerarm_{_s}", f"hand_{_s}"),
                (f"lowerarm_{_s}", f"hand_{_s}", f"middle_01_{_s}"), (f"pelvis", f"thigh_{_s}", f"calf_{_s}"),
                (f"thigh_{_s}", f"calf_{_s}", f"foot_{_s}"), (f"calf_{_s}", f"foot_{_s}", f"ball_{_s}")]
MAIL_UV = 2.0  # a u past the atlas marks a surface for the shader's procedural rings


def add_sleeves(mesh, target, index, pos, height):
    """A short tube around each joint, inside the plate there, with weights easing from one bone to the next."""
    sides = 12
    unit_len = height / 1.9
    for parent_j, joint, child in SLEEVES:
        j = target[joint]
        into = unit(j - target[parent_j]) if np.linalg.norm(j - target[parent_j]) > 1e-4 else np.array([0, 1.0, 0])
        out = unit(target[child] - j)
        axis = unit(into + out)
        # The sleeve's radius comes from the plates around it, kept well inside them.
        rel = pos - j
        along = rel @ axis
        radial = np.linalg.norm(rel - np.outer(along, axis), axis=1)
        near = (np.abs(along) < 0.09 * unit_len) & (radial < 0.3 * unit_len)
        r = np.percentile(radial[near], 22) * 0.86 if near.sum() > 12 else 0.05 * unit_len
        r = float(np.clip(r, 0.03 * unit_len, 0.17 * unit_len))
        reach = 0.1 * unit_len
        rings = [(-reach, 1.0, 0.92), (-reach * 0.45, 0.85, 1.0), (0.0, 0.5, 1.0), (reach * 0.45, 0.15, 1.0), (reach, 0.0, 0.92)]
        side_a = unit(np.cross(axis, np.array([0.31, 0.87, 0.38])))
        side_b = np.cross(axis, side_a)
        n_ring = len(rings)
        vs, ns, ws = [], [], []
        ij, ic, ip = index[joint], index[child], index[parent_j]
        for offset, keep_parent, shrink in rings:
            centre = j + (into if offset < 0 else out) * offset
            for k in range(sides):
                a = k / sides * np.pi * 2
                d = side_a * np.cos(a) + side_b * np.sin(a)
                vs.append(centre + d * r * shrink)
                ns.append(d)
                w = np.zeros(mesh.njoints)
                # Upstream rings lean on the parent joint's motion, downstream on this joint's.
                w[ip] = keep_parent
                w[ij] = 1 - keep_parent
                ws.append(w)
        tris = []
        for ri in range(n_ring - 1):
            for k in range(sides):
                a, b = ri * sides + k, ri * sides + (k + 1) % sides
                c, d = a + sides, b + sides
                tris += [(a, b, d), (a, d, c)]
        vs, ns, ws = np.array(vs), np.array(ns), np.array(ws)
        uv = np.full((len(vs), 2), MAIL_UV)
        mesh.add_piece(f"mail_{joint}", "mail", vs, ns, uv, ws, np.zeros(len(vs)), np.array(tris))


def image_bytes(g, blob, tex_index):
    img = g["images"][g["textures"][tex_index]["source"]]
    bv = g["bufferViews"][img["bufferView"]]
    off = bv.get("byteOffset", 0)
    return Image.open(io.BytesIO(blob[off:off + bv["byteLength"]])).convert("RGB")


def pack_atlas(sizes, size):
    """Tallest-first shelf packing. Returns a rect per image, or None if it overflows."""
    order = sorted(range(len(sizes)), key=lambda i: -sizes[i][1])
    rects = [None] * len(sizes)
    x = y = shelf = 0
    for i in order:
        w, h = sizes[i]
        w2, h2 = w + PAD * 2, h + PAD * 2
        if x + w2 > size:
            x, y, shelf = 0, y + shelf, 0
        if y + h2 > size:
            return None
        rects[i] = (x + PAD, y + PAD, w, h)
        x += w2
        shelf = max(shelf, h2)
    return rects


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def paint_metal(a):
    """How much of a texel is metal, from its paint alone (0-1 floats, HxWx3). Steel, silver and iron are grey; Tripo's
    gold is a strongly saturated orange-yellow (hue 25-45, saturation 0.5-0.75). Skin is the same hue but paler
    (saturation 0.12-0.45 on the townsfolk), and so are ivory and cream plate, which can't be told from pale skin by
    colour: those go to paint, not steel, since steel skin is what drew faces nearly black. Leather, wood and coloured
    cloth are none of these."""
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # Hue in degrees for the warm half of the wheel (red 0, yellow 60); cool colours land outside both bands below.
    hue = np.where(r >= g, 60 * (g - b) / np.maximum(mx - mn, 1e-3), 60 * (2 + (b - r) / np.maximum(mx - mn, 1e-3)))
    warm = (r >= b) & (g >= b)
    grey = 1 - smooth(0.16, 0.30, sat)
    skin = warm * (1 - smooth(40, 46, hue)) * smooth(0.10, 0.16, sat) * (1 - smooth(0.42, 0.55, sat)) * smooth(0.28, 0.42, mx)
    gold = warm * smooth(22, 28, hue) * (1 - smooth(55, 65, hue)) * smooth(0.40, 0.60, sat) * smooth(0.35, 0.50, mx)
    return np.maximum(grey * (1 - skin), gold)


def repaint_metal(a, metal, rough):
    """The metal a painted map should have (never more than it had), and what stopped being metal no glossier than
    satin (0.55: skin, enamel, oiled leather). Where the metal is unchanged, so is the roughness."""
    # (Softened by a texel: decided texel by texel, Tripo's speckled paint flips between steel and paint, which shimmers.)
    soft = np.asarray(Image.fromarray((paint_metal(a) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
    new = np.minimum(metal, soft)
    gone = np.clip(metal - new, 0, 1)
    return new, rough + (np.maximum(rough, 0.55) - rough) * gone


def derive_pbr(rgb, is_cloth, strength):
    """Normal and metal/rough from a painted colour map (0-255 floats, HxWx3)."""
    a = rgb / 255.0
    lum = a @ np.array([0.2126, 0.7152, 0.0722])
    img = Image.fromarray((lum * 255).astype(np.uint8))
    fine = np.asarray(img.filter(ImageFilter.GaussianBlur(0.8)), dtype=np.float32) / 255
    broad = np.asarray(img.filter(ImageFilter.GaussianBlur(7)), dtype=np.float32) / 255
    height = fine * 0.75 + broad * 0.25
    dx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
    dy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
    nx, ny = -dx * strength, dy * strength
    nz = np.ones_like(nx)
    ln = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.stack([nx / ln, ny / ln, nz / ln], -1) * 0.5 + 0.5

    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    warm = np.clip((a[..., 0] - a[..., 2]) * 4, 0, 1)
    gold = np.clip((sat - 0.22) * 5, 0, 1) * warm * np.clip((lum - 0.14) * 6, 0, 1)
    speck = np.abs(fine - broad)
    if is_cloth:
        metal = np.zeros_like(lum)
        rough = np.clip(0.85 + speck, 0, 1)
    else:
        leather = np.clip((sat - 0.3) * 4, 0, 1) * np.clip((0.3 - lum) * 6, 0, 1)
        metal = np.clip(0.96 - leather, 0, 1)
        rough = np.clip(0.36 - gold * 0.12 + speck * 2.2 + leather * 0.4 + (1 - np.clip(lum * 3, 0, 1)) * 0.12, 0.12, 1)
        # Only steel and gold stay metal (fix_metal.py did the same to the models already shipped).
        metal, rough = repaint_metal(a, metal, rough)
    mr = np.stack([np.ones_like(lum), rough, metal], -1)
    return normal, mr


def jpeg(arr, quality):
    buf = io.BytesIO()
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)).save(buf, "JPEG", quality=quality, subsampling=0)
    return buf.getvalue()


def main():
    global ALBEDO_ATLAS, PBR_ATLAS
    model, source, master, out_full, out_game = sys.argv[1:6]
    cfg = CONFIG[model]
    ALBEDO_ATLAS, PBR_ATLAS = cfg.get("atlas", ALBEDO_ATLAS), cfg.get("pbr", PBR_ATLAS)
    src, src_blob = load_glb(source)
    ual, ual_blob = load_glb(master)
    src_nodes, ual_nodes = src["nodes"], ual["nodes"]
    W = world_matrices(src)
    skin = src["skins"][0]
    ibm = read_accessor(src, src_blob, skin["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1)
    m = W[skin["joints"][0]] @ ibm[0]
    src_names = [src_nodes[j]["name"].replace("mixamorig:", "") for j in skin["joints"]]
    ual_joints = [ual_nodes[j]["name"] for j in ual["skins"][0]["joints"]]
    index = {n: i for i, n in enumerate(ual_joints)}
    ual_id = {n["name"]: i for i, n in enumerate(ual_nodes)}
    ual_worlds = world_matrices(ual)
    parent = {}
    for n in ual_nodes:
        for c in n.get("children", []):
            parent[ual_nodes[c]["name"]] = n["name"]
    src_lookup = np.array([index[src_to_ual(n)] if src_to_ual(n) else 0 for n in src_names])

    # Bake parts to bind space, find floor and scale.
    parts = []
    allpos = []
    for node in src_nodes:
        if "mesh" not in node:
            continue
        prim = src["meshes"][node["mesh"]]["primitives"][0]
        pos = read_accessor(src, src_blob, prim["attributes"]["POSITION"]) @ m[:3, :3].T + m[:3, 3]
        nrm = read_accessor(src, src_blob, prim["attributes"]["NORMAL"]) @ np.linalg.inv(m[:3, :3])
        parts.append({"name": node["name"], "pos": pos, "nrm": nrm / np.linalg.norm(nrm, axis=1, keepdims=True),
                      "uv": read_accessor(src, src_blob, prim["attributes"]["TEXCOORD_0"]).copy(),
                      "tris": read_accessor(src, src_blob, prim["indices"]).astype(np.int64).reshape(-1, 3),
                      "joints": read_accessor(src, src_blob, prim["attributes"]["JOINTS_0"]),
                      "weights": read_accessor(src, src_blob, prim["attributes"]["WEIGHTS_0"]),
                      "tex": src["materials"][prim["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]})
        allpos.append(pos)
    allpos = np.concatenate(allpos)
    if cfg.get("auto"):
        cfg["parts"] = {}
        for part in parts:
            acc = {}
            for j, w in zip(part["joints"].ravel(), part["weights"].ravel()):
                grp = group_of(src_names[int(j)])
                if grp:
                    acc[grp] = acc.get(grp, 0) + float(w)
            tot = sum(acc.values()) or 1
            share = {k: v / tot for k, v in acc.items()}
            cfg["parts"][part["name"]] = auto_part(share, src_names)
            spec = cfg["parts"][part["name"]]
            kind = "cloth" if spec is CLOTH else "split " + "/".join(str(c[1]) for c in spec["split"]) if "split" in spec else "waist" if "custom" in spec else str(spec)
            print(f"  {part['name']}: {kind}")
    floor = allpos[:, 1].min()
    scale = cfg["height"] / (allpos[:, 1].max() - floor)
    origin = np.array([0, floor, 0])
    # Centre the model over the origin in x and z, from the hips.
    hip_world = next(W[i] for i, n in enumerate(src_nodes) if n.get("name", "").endswith("Hips"))
    origin[0], origin[2] = hip_world[0, 3], hip_world[2, 3]

    target = {}
    for i, n in enumerate(src_nodes):
        name = src_to_ual(n.get("name", "")) if n.get("name", "").startswith("mixamorig:") else None
        if name and i in W:
            target[name] = (W[i][:3, 3] - origin) * scale
    target["root"] = np.zeros(3)
    for s in "lr":
        for f in FINGERS.values():
            if f"{f}_04_leaf_{s}" not in target:
                target[f"{f}_04_leaf_{s}"] = target[f"{f}_03_{s}"] + (target[f"{f}_03_{s}"] - target[f"{f}_02_{s}"]) * 0.8
    missing = [j for j in ual_joints if j not in target]
    if missing:
        raise ValueError(f"no target for {missing}")

    # Split parts into plates.
    mesh = Mesh(len(ual_joints))
    njoints = len(ual_joints)
    for part in parts:
        pos = (part["pos"] - origin) * scale
        nv = len(pos)
        full = np.zeros((nv, len(src_names)))
        rows = np.repeat(np.arange(nv), part["joints"].shape[1])
        np.add.at(full, (rows, part["joints"].ravel()), part["weights"].ravel())
        tris = part["tris"]
        spec = cfg["parts"][part["name"]]
        wid = weld(pos)
        nb = face_neighbours(tris, wid)
        if "split" in spec:
            classes = spec["split"]
            scores = np.zeros((len(tris), len(classes)))
            for c, (frags, _) in enumerate(classes):
                cols = [i for i, n in enumerate(src_names) if any(n.startswith(f) for f in frags)]
                scores[:, c] = full[tris][:, :, cols].sum(2).mean(1)
            labels = smooth_labels(scores.argmax(1), nb)
            pieces = [c[1] for c in classes]
        elif "custom" in spec:
            cent = pos[tris].mean(1)
            avg = full[tris].mean(1)
            labels = np.array([spec["custom"](cent[i], avg[i], src_names) for i in range(len(tris))])
            labels = smooth_labels(labels, nb, 2)
            pieces = spec["pieces"]
        else:
            labels = np.zeros(len(tris), dtype=int)
            pieces = [spec]
        ual_w = np.zeros((nv, njoints))
        np.add.at(ual_w, (np.arange(nv)[:, None].repeat(len(src_names), 1).ravel(),
                          np.tile(src_lookup, nv)), full.ravel())
        for li, piece in enumerate(pieces):
            sel = tris[labels == li]
            if len(sel) == 0:
                continue
            w = np.zeros((nv, njoints))
            flex = np.zeros(nv)
            if "plate" in piece:
                kind = "plate"
                for joint, val in piece["plate"].items():
                    w[:, index[joint]] = val
            elif "hand" in piece and cfg.get("rigid_hands"):
                # Tripo's finger weights on a closed gauntlet are unreliable: the whole gauntlet rides the hand.
                kind = "plate"
                w[:, index[f"hand_{piece['hand']}"]] = 1
            elif "hand" in piece:
                # Fingers keep their joints. Anything else on the gauntlet rides the hand.
                kind = "flex"
                s = piece["hand"]
                hand = index[f"hand_{s}"]
                keep = [index[j] for j in ual_joints if j.endswith(f"_{s}") and j.split("_")[0] in FINGERS.values()]
                w[:, keep] = ual_w[:, keep]
                w[:, hand] = 1 - w[:, keep].sum(1)
            else:
                kind = "cloth"
                keep = [index["pelvis"], index["thigh_l"], index["thigh_r"]]
                w[:, keep] = ual_w[:, keep]
                w[:, index["pelvis"]] += ual_w[:, [i for i in range(njoints) if i not in keep]].sum(1)
                w = blur_weights(w, sel, wid, 3)
                # The legs swing the cloth less than a plate, and the hem is free to sway.
                soft = np.clip((target["pelvis"][1] + 0.06 - pos[:, 1]) / (target["pelvis"][1] * 0.8), 0, 1)
                flex = soft
                w[:, keep[1:]] *= (0.55 + 0.3 * soft)[:, None]
                w[:, index["pelvis"]] = 1 - w[:, keep[1:]].sum(1)
                # Cloth that reaches up the back (a cape, a long coat) follows the spine above the waist, not the hips.
                top = np.clip((pos[:, 1] - target["pelvis"][1] - 0.04 * cfg["height"]) / max(target["spine_03"][1] - target["pelvis"][1], 1e-3), 0, 1)
                top = top * top * (3 - 2 * top)
                if top.max() > 0:
                    w *= (1 - top)[:, None]
                    w[:, index["spine_03"]] += top * 0.7
                    w[:, index["spine_02"]] += top * 0.3
                # Whatever of it the source hung on an arm (a sleeve or strap cut with a cape) stays on that arm.
                arms = [index[j] for j in ual_joints if j.split("_")[0] in ("clavicle", "upperarm", "lowerarm", "hand")]
                on_arm = ual_w[:, arms].sum(1)
                if on_arm.max() > 0.05:
                    w *= (1 - on_arm)[:, None]
                    w[:, arms] += ual_w[:, arms]
            mesh.add_piece(f"{part['name']}#{li}", kind, pos, part["nrm"], part["uv"], w, flex, sel)
        part["first_piece"] = len(mesh.pieces)

    plate_count = len(mesh.pieces)
    add_sleeves(mesh, target, index, np.concatenate([(p["pos"] - origin) * scale for p in parts]), cfg["height"])

    # Atlas.
    images = {p["tex"]: image_bytes(src, src_blob, p["tex"]) for p in parts}
    texs = list(images)
    sizes = [images[t].size for t in texs]
    fit = 1.0
    while True:
        scaled = [(max(16, int(w * fit)), max(16, int(h * fit))) for w, h in sizes]
        rects = pack_atlas(scaled, ALBEDO_ATLAS)
        if rects:
            break
        fit *= 0.9
    albedo = np.zeros((ALBEDO_ATLAS, ALBEDO_ATLAS, 3), dtype=np.float32)
    normal_big = np.zeros((ALBEDO_ATLAS, ALBEDO_ATLAS, 3), dtype=np.float32) + np.array([0.5, 0.5, 1.0], dtype=np.float32)
    mr_big = np.zeros((ALBEDO_ATLAS, ALBEDO_ATLAS, 3), dtype=np.float32) + np.array([1, 0.5, 0.9], dtype=np.float32)
    cloth_tex = {p["tex"] for p in parts if cfg["parts"][p["name"]] is CLOTH}
    rect_of = {}
    for t, r in zip(texs, rects):
        rect_of[t] = r
        x, y, w, h = r
        rgb = np.asarray(images[t].resize((w, h), Image.LANCZOS), dtype=np.float32)
        nmap, mr = derive_pbr(rgb, t in cloth_tex, 5.0 * w / 1024 + 1.5)
        for dst, src_arr in ((albedo, rgb / 255), (normal_big, nmap), (mr_big, mr)):
            padded = np.pad(src_arr, ((PAD, PAD), (PAD, PAD), (0, 0)), mode="edge")
            dst[y - PAD:y + h + PAD, x - PAD:x + w + PAD] = padded

    # Remap UVs per part, in piece order.
    start = 0
    uv_all = np.concatenate(mesh.uv)
    piece_tex = []
    i = 0
    for part in parts:
        while i < part["first_piece"]:
            piece_tex.append(part["tex"])
            i += 1
    for pi, piece in enumerate(mesh.pieces[:plate_count]):
        x, y, w, h = rect_of[piece_tex[pi]]
        s, e = piece["vstart"], piece["vstart"] + piece["vcount"]
        uv_all[s:e, 0] = (x + uv_all[s:e, 0] * w) / ALBEDO_ATLAS
        uv_all[s:e, 1] = (y + uv_all[s:e, 1] * h) / ALBEDO_ATLAS
    start = 0

    pos = np.concatenate(mesh.pos)
    nrm = np.concatenate(mesh.nrm)
    weights_full = np.concatenate(mesh.w)
    flex = np.concatenate(mesh.flex)
    group = np.concatenate(mesh.group)
    tris = np.concatenate(mesh.tris)
    order, weights = top_four(weights_full)

    # Fit the skeleton: same maths as tools/rig_to_ual.py.
    rest_rot = {n: ual_worlds[ual_id[n]][:3, :3] for n in ual_joints}
    rest_pos = {n: ual_worlds[ual_id[n]][:3, 3] for n in ual_joints}
    align = {"root": np.eye(3), "Head": np.eye(3)}
    chain = dict(AIM_CHILD)
    for s in "lr":
        chain[f"hand_{s}"] = f"middle_01_{s}"
        for f in FINGERS.values():
            chain[f"{f}_01_{s}"] = f"{f}_02_{s}"
            chain[f"{f}_02_{s}"] = f"{f}_03_{s}"
            chain[f"{f}_03_{s}"] = f"{f}_04_leaf_{s}"
    for name, child in chain.items():
        align[name] = arc(rest_pos[child] - rest_pos[name], target[child] - target[name])
    for joint in ual_joints:
        if joint not in align:
            align[joint] = align[parent[joint]]
    bind_rot = {n: align[n] @ rest_rot[n] for n in ual_joints}

    rest_t = {}
    for name in ual_joints:
        p = parent.get(name)
        if name == "root" or p not in index:
            rest_t[name] = np.array(ual_nodes[ual_id[name]].get("translation", (0, 0, 0)), dtype=float)
        else:
            rest_t[name] = bind_rot[p].T @ (target[name] - target[p])

    def fk_position(joint):
        path = []
        while joint in index:
            path.append(joint)
            joint = parent.get(joint)
        mt = np.eye(4)
        for j in reversed(path):
            local = np.eye(4)
            local[:3, :3] = quat_matrix(ual_nodes[ual_id[j]].get("rotation", (0, 0, 0, 1)))
            local[:3, 3] = rest_t[j]
            mt = mt @ local
        return mt[:3, 3]

    root_rot = rest_rot["root"]
    drop = np.mean([target[f"ball_{s}"][1] - fk_position(f"ball_{s}")[1] for s in "lr"])
    rest_t["pelvis"] = rest_t["pelvis"] + root_rot.T @ np.array([0, drop, 0])
    pelvis_height = fk_position("pelvis")[1]
    motion_scale = pelvis_height / rest_pos["pelvis"][1]

    ibm_out = []
    for name in ual_joints:
        mt = np.eye(4)
        mt[:3, :3] = bind_rot[name]
        mt[:3, 3] = target[name]
        ibm_out.append(np.linalg.inv(mt))

    pelvis_rest = np.array(ual_nodes[ual_id["pelvis"]]["translation"])
    idle = next(a for a in ual["animations"] if a["name"] == GROUND_CLIP)
    pose = {}
    for c in idle["channels"]:
        pose[(ual_nodes[c["target"]["node"]]["name"], c["target"]["path"])] = \
            read_accessor(ual, ual_blob, idle["samplers"][c["sampler"]]["output"])[0]
    posed = {}
    skin_mats = np.zeros((len(ual_joints), 4, 4))
    for i, name in enumerate(ual_joints):
        local = np.eye(4)
        local[:3, :3] = quat_matrix(pose.get((name, "rotation"), ual_nodes[ual_id[name]].get("rotation", (0, 0, 0, 1))))
        local[:3, 3] = rest_t[name]
        if name == "pelvis":
            local[:3, 3] = rest_t[name] + (pose[(name, "translation")] - pelvis_rest) * motion_scale
        posed[name] = (posed[parent[name]] if parent.get(name) in posed else np.eye(4)) @ local
        skin_mats[i] = posed[name] @ ibm_out[i]
    skinned = np.einsum("vi,vijk,vk->vj", weights, skin_mats[order], np.c_[pos, np.ones(len(pos))])
    rest_t["pelvis"] = rest_t["pelvis"] + root_rot.T @ np.array([0, -skinned[:, 1].min(), 0])

    # Piece table for the game: which joints each rigid piece follows.
    for pi, piece in enumerate(mesh.pieces):
        v = piece["vstart"]
        if piece["kind"] == "plate":
            piece["joints"] = [[int(order[v, k]), float(weights[v, k])] for k in range(4) if weights[v, k] > 0]
        else:
            s, e = v, v + piece["vcount"]
            piece["joints"] = [[int(weights_full[s:e].sum(0).argmax()), 1.0]]
        ppos = pos[v:v + piece["vcount"]]
        piece["min"] = [float(x) for x in ppos.min(0)]
        piece["max"] = [float(x) for x in ppos.max(0)]

    # Textures.
    alb_jpg = jpeg(albedo, 88)
    n_jpg = jpeg(np.asarray(Image.fromarray((normal_big * 255).astype(np.uint8)).resize((PBR_ATLAS, PBR_ATLAS), Image.BILINEAR), dtype=np.float32) / 255, 86)
    mr_jpg = jpeg(np.asarray(Image.fromarray((mr_big * 255).astype(np.uint8)).resize((PBR_ATLAS, PBR_ATLAS), Image.BILINEAR), dtype=np.float32) / 255, 86)

    def write(path, with_clips):
        pk = Packer()
        out_nodes = []
        new_id = {}
        for n in ual_nodes:
            new_id[n["name"]] = len(out_nodes)
            node = dict(n)
            if n["name"] in rest_t:
                node["translation"] = [float(x) for x in rest_t[n["name"]]]
            node.pop("scale", None)
            out_nodes.append(node)
        armature = next(i for i, n in enumerate(out_nodes) if n["name"] == "Armature")
        mesh_node = len(out_nodes)
        out_nodes.append({"name": model, "mesh": 0, "skin": 0})
        out_nodes[armature]["children"] = list(out_nodes[armature].get("children", [])) + [mesh_node]
        ibm_acc = pk.add(np.array([mt.T.ravel() for mt in ibm_out]), 5126, "MAT4")
        attrs = {
            "POSITION": pk.add(pos, 5126, "VEC3", 34962, bounds=True),
            "NORMAL": pk.add(nrm, 5126, "VEC3", 34962),
            "TEXCOORD_0": pk.add(uv_all, 5126, "VEC2", 34962),
            "JOINTS_0": pk.add(order, 5123, "VEC4", 34962),
            "WEIGHTS_0": pk.add(weights, 5126, "VEC4", 34962),
            "_FLEX": pk.add(flex, 5126, "SCALAR", 34962),
            "_PIECE": pk.add(group, 5123, "SCALAR", 34962),
        }
        indices = pk.add(tris.ravel(), 5125, "SCALAR", 34963)
        images_out = [{"name": nm, "mimeType": "image/jpeg", "bufferView": pk.add_image(raw)}
                      for nm, raw in (("albedo", alb_jpg), ("normal", n_jpg), ("metal_rough", mr_jpg))]
        animations = []
        if with_clips:
            for anim in ual["animations"]:
                channels, samplers = [], []
                for c in anim["channels"]:
                    s = anim["samplers"][c["sampler"]]
                    name = ual_nodes[c["target"]["node"]]["name"]
                    tpath = c["target"]["path"]
                    values = read_accessor(ual, ual_blob, s["output"])
                    if tpath == "scale":
                        continue
                    if tpath == "translation":
                        if name != "pelvis":
                            continue
                        values = rest_t["pelvis"] + (values - pelvis_rest) * motion_scale
                    samplers.append({
                        "input": pk.add(read_accessor(ual, ual_blob, s["input"]), 5126, "SCALAR", bounds=True),
                        "interpolation": s.get("interpolation", "LINEAR"),
                        "output": pk.add(values, 5126, "VEC4" if tpath == "rotation" else "VEC3"),
                    })
                    channels.append({"sampler": len(samplers) - 1, "target": {"node": new_id[name], "path": tpath}})
                animations.append({"name": anim["name"], "channels": channels, "samplers": samplers})
        extras = {"pieces": mesh.pieces, "height": cfg["height"], "pelvisRest": pelvis_rest.tolist(),
                  "pelvisBase": rest_t["pelvis"].tolist(), "motionScale": float(motion_scale)}
        out = {
            "asset": {"version": "2.0", "generator": "bm/tools/armor/rig_armor.py"},
            "scene": 0,
            "scenes": [{"name": "Scene", "nodes": ual["scenes"][ual.get("scene", 0)]["nodes"], "extras": extras}],
            "nodes": out_nodes,
            "meshes": [{"name": model, "primitives": [{"attributes": attrs, "indices": indices, "material": 0, "mode": 4}]}],
            "skins": [{"name": "Armature", "joints": [new_id[n] for n in ual_joints], "inverseBindMatrices": ibm_acc}],
            "materials": [{"name": model, "doubleSided": True,
                           "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicRoughnessTexture": {"index": 2}},
                           "normalTexture": {"index": 1}}],
            "textures": [{"sampler": 0, "source": 0}, {"sampler": 0, "source": 1}, {"sampler": 0, "source": 2}],
            "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
            "images": images_out,
            "accessors": pk.accessors,
            "bufferViews": pk.views,
            "buffers": [{"byteLength": len(pk.blob)}],
        }
        if animations:
            out["animations"] = animations
        js = json.dumps(out, separators=(",", ":")).encode()
        js += b" " * (-len(js) % 4)
        body = bytes(pk.blob) + b"\0" * (-len(pk.blob) % 4)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            f.write(struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(body)))
            f.write(struct.pack("<I4s", len(js), b"JSON") + js)
            f.write(struct.pack("<I4s", len(body), b"BIN\0") + body)
        print(f"{path}: {(28 + len(js) + len(body)) / 1048576:.2f} MB")

    write(out_full, True)
    write(out_game, False)
    kinds = [p["kind"] for p in mesh.pieces]
    print(f"{model}: scale {scale:.3f}, {len(pos)} verts, {len(tris)} tris, atlas fit {fit:.2f}, "
          f"{kinds.count('plate')} plates, {kinds.count('flex')} gauntlets, {kinds.count('cloth')} cloth, {kinds.count('mail')} mail sleeves; "
          f"pelvis {pelvis_height:.3f}, motion scale {motion_scale:.3f}")


if __name__ == "__main__":
    main()
