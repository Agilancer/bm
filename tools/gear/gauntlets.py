"""Fits each suit's gauntlets and upper arms over the first-person arms, and writes assets/fp/gauntlets_<suit>.glb.

    python tools/gear/gauntlets.py [suit ...]

The rig that lets any gauntlet go on any hand. Armour is metal, and metal doesn't bend. So a suit's arm is cut up into plates, one to a bone: the
forearm, the back of the hand, and each joint of each finger, and the upper arm's a second forearm. Every bone gets a frame on both skeletons, built the same way from the
anatomy (along the bone; across the knuckles; out of the back of the hand), and each plate is carried from its bone's frame on the suit to the same
bone's on the rig, sized once to the arm under it, plus MARGIN. Then it's weighted wholly to that one joint, and rides it rigid: it moves with the
swings and casts with nothing else to do, the clips aren't touched, and it never warps. Where a joint bends the plates part, and overlap on the inside.
A finger is round metal lames on the suit's own steel, one to a joint, rigid the same way, and a palm is the arm's own skin. (A suit's own finger plates hardly reach
the first joint of a rig's long fingers, and leave it bare: see SUIT_FINGERS.)
In the gap is what real armour has under it: the arms' own skin, past `cut`, which the game draws dark, as leather.

A file holds one mesh per rig, sharing its texture coordinates, triangles and maps, and that cut.
To add a suit: its file, and which segments are its hands, in SUITS.
"""
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "swords"))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "armor"))
import atlas  # noqa: E402
from rig_armor import derive_pbr  # noqa: E402

SOURCE = r"F:\!    BM V2\! TRIPO MODELS\ARMOR"
# A suit: its file, and which segments are its gauntlets.
SUITS = {
    "knight": ("NORMAL KNIGHT - SEGMENTED + SKINNED + RIGGED + ANIMATED.glb", dict(R=[8], L=[7])),
    "t_purple": ("TESSARIELS KNIGHT - PURPLE - EVERYTHING.glb", dict(R=[12], L=[9])),
    "t_silver": ("TESSARIELS KNIGHT - SILVER + PURPLE - NO ANIMATIONS.glb", dict(R=[11], L=[9])),
    "t_pale": ("TESSARIELS KNIGHT - SILVER + PURPLE + LIGHTER - NO ANIMATIONS.glb", dict(R=[7], L=[10, 12])),
    "t_white": ("TESSARIELS KNIGHT - WHITE + PURPLE - EVERYTHING.glb", dict(R=[4], L=[6])),
}
RIGS = ["arms_1h", "arms_2h", "arms_staff", "spell_attack", "spell_raise"]
ARMS = dict(arms_1h="arms", arms_2h="arms", arms_staff="staff_arm", spell_attack="open", spell_raise="open")
FINGERS = ["thumb", "index", "middle", "ring", "pinky"]
MARGIN = 0.005      # metres the plate stands off the skin, each side
FORE_MARGIN = 0.005  # ...and on the arm
ROUND = 0.62        # a finger's plate is never thinner than this, of its width
OVERLAP = 0.007     # how far the cuff runs on over the back of the hand
TUCK = 0.002        # ...and how far under it the hand's plate sits
THICK = 0.0035      # a plate's thickness, at its edge
LAP = 1.25          # how much longer than its bone a finger's plate is
HAND_LAP = 1.08     # ...and the hand's
SHARD = 1e-4        # a piece of a plate smaller than this, in square metres, is debris
NEEDLE = 0.15       # ...and so is a long one with less area than this, of its length squared
NARROW = 0.0025     # ...and a strip with no point further than this from its edge, however it's joined on
WRAP = 0.97         # the underside of an arm's metal, how far inside its top
DARK = 0.16         # a sleeve's triangle painted darker than this is the inside of the suit's: it's dropped, and shows the metal behind it, or leather
FULL = 0.65         # a sleeve's metal stops where it goes less far round the arm than this, of its usual
CAP_ROOM = 0.002    # a finger's lame, in metres off the skin
STEP = 0.0015       # ...and how much further off than the next one along it, so they telescope
SUIT_FINGERS = False  # True: a suit's own plates on a finger's first two joints instead, as modelled; its tip's still a cap
COOL = dict(knight=0, t_purple=0.3, t_silver=0.7, t_pale=0.6, t_white=0.6)  # how much of a warm cast comes off a suit's metal, in the game's sun. Its gold's left.
GAIN = dict(knight=1.0, t_purple=1.15, t_silver=1.3, t_pale=1.2, t_white=1.5)  # how much brighter a suit's metal is painted
FINGER_GAIN = 1.25  # ...and its fingers', again: a suit paints them dark, as gloves
TINT = dict(t_purple=0.45)  # how much of a suit's own colour is in the steel of its fingers
RELIEF = dict(knight=1.6, t_purple=0.9, t_silver=1.2, t_pale=1.2, t_white=1.2)  # how strongly the paint stands out as relief
CALM = dict(t_purple=0.6)  # how far the paint on the back of a hand is smoothed: a suit's busiest reads as crumpled foil
SLACK = 0.12        # how far past the arm's own outline, of its half width, a forearm's plate may stand
FINGER_ROOM = 0.0025  # ...and a finger's, in metres, past its stand-off
HAND_ROOM = 0.004   # ...and the back of a hand's
REACH = 1.05        # how much of the upper arm's bone its metal runs up
SPELL_LONG = 1.6    # how far a spell rig's long arm bone may stretch its forearm's metal, against its hand's size
HAND_SHARD = 4e-4   # a piece of the back of a hand smaller than this is debris: the flakes that jut past it
METAL = dict(knight=0.55, t_purple=0.35, t_silver=0.3, t_pale=0.3, t_white=0.2)  # how metal the metal is: fully, it only shows what it reflects, and a suit's own colour is lost in a dark reflection
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)
GLOSS = 0.36        # ...and how shiny, at most
TILE = 1024
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load(p):
    with open(p, "rb") as f:
        f.read(12)
        n, _ = struct.unpack("<II", f.read(8))
        g = json.loads(f.read(n))
        m, _ = struct.unpack("<II", f.read(8))
        return g, f.read(m)


def acc(g, b, i):
    a = g["accessors"][i]
    v = g["bufferViews"][a["bufferView"]]
    t, c = CT[a["componentType"]], NC[a["type"]]
    sz = np.dtype(t).itemsize * c
    st = v.get("byteStride", 0) or sz
    off = v.get("byteOffset", 0) + a.get("byteOffset", 0)
    raw = np.frombuffer(b, np.uint8, a["count"] * st, off).reshape(a["count"], st)[:, :sz]
    return np.frombuffer(raw.tobytes(), t).reshape(a["count"], c).copy()


def weights(g, b, pr):
    W = acc(g, b, pr["attributes"]["WEIGHTS_0"])
    W = W.astype(np.float64) / (1 if W.dtype == np.float32 else float(np.iinfo(W.dtype).max))
    return acc(g, b, pr["attributes"]["JOINTS_0"]).astype(np.int64), W / np.maximum(W.sum(1, keepdims=True), 1e-9)


def rests(g, b):
    sk = g["skins"][0]
    ibm = acc(g, b, sk["inverseBindMatrices"]).reshape(-1, 4, 4)
    return [g["nodes"][j]["name"].replace("mixamorig:", "") for j in sk["joints"]], np.array([np.linalg.inv(m.T)[:3, 3] for m in ibm])


def unit(v):
    return v / max(np.linalg.norm(v), 1e-9)


def frame(along, across):
    x = unit(along)
    y = unit(across - x * (across @ x))
    return np.c_[x, y, np.cross(x, y)]


class Skeleton:
    """The arm of one side, by anatomy: points[bone], and a frame per bone. bone: 'upper', 'fore', 'hand', 'index0'..'index2', and so on. A tube's frame
    starts at its hand end, and its x runs on toward the hand. No top, no 'upper': the raise's one arm bone has no upper arm to go on."""

    def __init__(self, joint, end_of, elbow, top=None, crease=None):
        self.at, self.R, self.len = {}, {}, {}
        wrist = joint("hand")
        k_i, k_m, k_p = joint("index", 0), joint("middle", 0), joint("pinky", 0)
        across = k_p - k_i
        H = frame(k_m - wrist, across)
        self.hand_frame = H
        self.at["hand"], self.R["hand"], self.len["hand"] = wrist, H, np.linalg.norm(k_m - wrist)
        along = wrist - elbow
        self.at["fore"], self.R["fore"], self.len["fore"] = wrist, frame(along, across), np.linalg.norm(along)
        if top is not None:
            self.at["upper"], self.R["upper"], self.len["upper"] = elbow, frame(elbow - top, crease), np.linalg.norm(elbow - top)
        for f in FINGERS:
            pts = [joint(f, k) for k in range(3)]
            pts.append(end_of(f, pts))
            for k in range(3):
                a = pts[k + 1] - pts[k]
                # The thumb's nail looks away from the palm, about at right angles to the fingers' own: across is out of the palm.
                self.at[f"{f}{k}"], self.R[f"{f}{k}"], self.len[f"{f}{k}"] = pts[k], frame(a, H[:, 2] if f == "thumb" else across), np.linalg.norm(a)


def mix_bone(name, side):
    """The Mixamo bone's place in the anatomy, or None."""
    pre = "Right" if side == "R" else "Left"
    if not name.startswith(pre):
        return None
    n = name[len(pre):]
    if n == "ForeArm":
        return "fore"
    if n == "Hand":
        return "hand"
    if n.startswith("Hand"):
        for f in FINGERS:
            if n[4:].lower().startswith(f):
                return f"{f}{min(int(n[-1]) - 1, 2)}"
    return None


def suit_skeleton(names, P, side):
    pre = "Right" if side == "R" else "Left"
    i = lambda n: names.index(pre + n)

    def joint(b, k=None):
        return P[i("Hand")] if b == "hand" else P[i(f"Hand{b.capitalize()}{k + 1}")]

    def end_of(f, pts):
        n = f"{pre}Hand{f.capitalize()}4"
        return P[names.index(n)] if n in names else pts[2] + (pts[2] - pts[1]) * 0.85
    # (A suit stands with its arms straight, and an elbow's crease faces the way the body does.)
    facing = np.cross(P[names.index("LeftArm")] - P[names.index("RightArm")], P[names.index("Head")] - P[names.index("Hips")])
    return Skeleton(joint, end_of, P[i("ForeArm")], P[i("Arm")], facing)


class Rig:
    def __init__(self, name):
        self.name = name
        g, b = load(os.path.join(ROOT, "assets", "fp", name + ".glb"))
        self.g, self.b = g, b
        self.names, self.P = rests(g, b)
        self.index = {n: i for i, n in enumerate(self.names)}
        self.parent = {}
        for i, n in enumerate(g["nodes"]):
            for c in n.get("children", []):
                self.parent[g["nodes"][c]["name"]] = n["name"]
        node = next(n for n in g["nodes"] if n.get("name") == ARMS[name])
        pr = g["meshes"][node["mesh"]]["primitives"][0]
        self.V = acc(g, b, pr["attributes"]["POSITION"]).astype(np.float64)
        self.N = acc(g, b, pr["attributes"]["NORMAL"]).astype(np.float64)
        self.F = acc(g, b, pr["indices"]).astype(np.int64).reshape(-1, 3)
        self.J, self.W = weights(g, b, pr)
        self.dom = self.J[np.arange(len(self.J)), self.W.argmax(1)]
        self.sides = [s for s in "RL" if "hand_" + s in self.index]
        self.fingers_old = "index_01_R" in self.index or "index_01_L" in self.index
        self.sk = {s: self.skeleton(s) for s in self.sides}

    def bone_name(self, b, s):
        """The rig's joint for a bone of the anatomy."""
        if b == "hand":
            return "hand_" + s
        if b == "fore":
            return None
        f, k = b[:-1], int(b[-1])
        return f"{f}_0{k + 1}_{s}" if self.fingers_old else f"{f}{k + 1}_{s}"

    def skin_of(self, b, s):
        return self.V[self.dom == self.index[self.bone_name(b, s)]]

    def skeleton(self, s):
        at = lambda n: self.P[self.index[n]]

        def joint(b, k=None):
            return at(self.bone_name(b if k is None else f"{b}{k}", s))

        def end_of(f, pts):
            if self.fingers_old:
                return at(f"{f}_end_{s}")
            # (These rigs' fingers stop at the last knuckle: as far as the skin it moves goes.)
            d = unit(pts[2] - pts[1])
            sk = self.V[self.dom == self.index[f"{f}3_{s}"]]
            return pts[2] + d * max(float(((sk - pts[2]) @ d).max()) if len(sk) else 0.0, 0.012)
        # The elbow: the first joint up the arm that isn't at the wrist, isn't a twist, and moves skin.
        moves = lambda n: n in self.index and (self.dom == self.index[n]).any()
        n = self.parent["hand_" + s]
        while np.linalg.norm(at(n) - at("hand_" + s)) < 0.1 or "twist" in n or not moves(n):
            n = self.parent[n]
        # The shoulder: the next one that does, if there is one.
        top = self.parent.get(n)
        while top and not (moves(top) and np.linalg.norm(at(top) - at(n)) > 0.1):
            top = self.parent.get(top)
        self.upper_joint = {**getattr(self, "upper_joint", {}), s: top}
        return Skeleton(joint, end_of, at(n), at(top) if top else None, at("hand_" + s) - at(n))

    def fore_joint(self, s):
        """The one joint a forearm's metal rides: of those that move its skin, the one a third of the way up from the wrist, so a turn of the wrist
        has the least to do at the cuff."""
        sk = self.sk[s]
        axis = sk.R["fore"][:, 0]
        best, score = None, 1e9
        for j in np.unique(self.dom[self.fore_mask(s)]):
            x = float((self.P[j] - sk.at["fore"]) @ axis)
            d = abs(x + sk.len["fore"] * 0.35)
            if -sk.len["fore"] * 1.02 <= x <= 0 and d < score:
                best, score = int(j), d
        return best

    def fore_mask(self, s):
        """The skin on this side above the hand: every vertex no hand or finger bone leads, on the side of this arm."""
        hand = {self.index["hand_" + s]}
        for f in FINGERS:
            for k in range(3):
                hand.add(self.index[self.bone_name(f"{f}{k}", s)])
        sk = self.sk[s]
        x = (self.V - sk.at["fore"]) @ sk.R["fore"][:, 0]
        r = np.linalg.norm((self.V - sk.at["fore"]) - np.outer(x, sk.R["fore"][:, 0]), axis=1)
        return ~np.isin(self.dom, list(hand)) & (x < 0) & (x > -sk.len["fore"] * 1.02) & (r < 0.09)


def extent(pts, R, at):
    """A bone's skin or plate, in its frame: the middle of it across the bone, and how wide each way."""
    q = (pts - at) @ R
    lo, hi = np.percentile(q, 3, axis=0), np.percentile(q, 97, axis=0)
    return (lo + hi) / 2, hi - lo


def place(src, tgt, b, plates, skin, margin):
    """The 4x3 that carries a point on the suit's bone to the rig's. plates, skin: what's on the bone, each side."""
    Rs, Rt = src.R[b], tgt.R[b]
    cs, es = extent(plates, Rs, src.at[b])
    ct, et = extent(skin, Rt, tgt.at[b]) if len(skin) > 8 else (cs * 0, es * 0 + 0.02)
    k = np.array([tgt.len[b] / src.len[b], 1.0, 1.0])
    k[1:] = (et[1:] + 2 * margin) / np.maximum(es[1:], 1e-4)
    # (A plate with little on its bone measures small, and mustn't balloon to fill the finger.)
    base = tgt.len["hand"] / src.len["hand"]
    k[1:] = np.clip(k[1:], base * 0.5, base * 2.2)
    # Round stays round: however the finger under it measures, a plate is never squeezed flat. See the owner's "WHY ARE HIS FINGERS FLAT".
    k[1:] = np.maximum(k[1:], k[1:].max() * 0.8)
    # ...and however the plate was modelled: only ever thicker, on its thin side.
    if b not in ("fore", "hand"):
        e = es[1:] * k[1:]
        k[1:] *= np.maximum(e.max() * ROUND / np.maximum(e, 1e-5), 1.0)
    # (Longer than its bone, each way: a finger's plates lap over each other at a joint. The hand's run on under the fingers'.)
    grow = LAP if b != "hand" else HAND_LAP
    k[0] *= grow
    D = np.diag(k)
    A = Rt @ D @ Rs.T
    offset = tgt.at[b] + Rt @ (ct * [0, 1, 1]) - A @ (src.at[b] + Rs @ (cs * [0, 1, 1]))
    if b != "hand":
        offset = offset - Rt[:, 0] * (tgt.len[b] * (grow - 1) / 2)
    return A, offset


def tube(src_at, Rs, tgt_at, Rt, ratio, plates, skin, margin, stations=2):
    """A forearm's or upper arm's metal on a rig. Sized to the skin at stations along it, so it follows the arm at an even stand-off: the size is settled
    here, once, and in play it's one rigid thing on one bone. Hands back what carries points, and normals, what brings in a point past the arm's outline, and what doubles the metal round the arm."""
    q = (plates - src_at) @ Rs
    along = lambda v: v * ratio
    x = along(q[:, 0])
    lo, hi = np.percentile(x, 2), np.percentile(x, 98)
    sk = (skin - tgt_at) @ Rt
    at_x = np.linspace(lo, hi, stations)
    reach = (hi - lo) * 0.5 / max(stations - 1, 1)
    ends = []
    for near in at_x:
        band = np.abs(x - near) < reach
        skb = np.abs(sk[:, 0] - near) < reach
        q_b = q[band] if band.sum() > 8 else q
        pl_lo, pl_hi = np.percentile(q_b[:, 1:], 3, axis=0), np.percentile(q_b[:, 1:], 97, axis=0)
        s_ = sk[skb] if skb.sum() > 8 else sk
        sk_lo, sk_hi = np.percentile(s_[:, 1:], 3, axis=0), np.percentile(s_[:, 1:], 97, axis=0)
        k = (sk_hi - sk_lo + 2 * margin) / np.maximum(pl_hi - pl_lo, 1e-4)
        ends.append(((pl_lo + pl_hi) / 2, (sk_lo + sk_hi) / 2, np.maximum(k, k.max() * 0.8)))
    C, T, K = (np.array(e_) for e_ in zip(*ends))
    # (A station where the suit's metal happens to be narrow mustn't balloon.)
    K = np.clip(K, np.median(K, axis=0) * 0.7, np.median(K, axis=0) * 1.4)
    # The arm's outline, for what the suit modelled out past it: fins and flakes.
    at_o = np.linspace(lo, hi, 6)
    outline = []
    for near in at_o:
        skb = np.abs(sk[:, 0] - near) < (hi - lo) * 0.12
        s_ = sk[skb] if skb.sum() > 8 else sk
        sk_lo, sk_hi = np.percentile(s_[:, 1:], 2, axis=0), np.percentile(s_[:, 1:], 98, axis=0)
        outline.append(((sk_lo + sk_hi) / 2, (sk_hi - sk_lo) / 2 + margin))
    OC, OH = (np.array(e_) for e_ in zip(*outline))

    def size_at(xs):
        return [np.stack([np.interp(xs, at_x, A[:, i]) for i in (0, 1)], 1) for A in (C, T, K)]

    def carry(P):
        q_ = (P - src_at) @ Rs
        xs = along(q_[:, 0])
        c, t, k = size_at(xs)
        return tgt_at + np.c_[xs, t + k * (q_[:, 1:] - c)] @ Rt.T

    def turn(P, N):
        q_ = (P - src_at) @ Rs
        xs = along(q_[:, 0])
        k = size_at(xs)[2]
        n = N @ Rs
        n = np.c_[n[:, 0] / ratio, n[:, 1:] / k] @ Rt.T
        return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)

    def inside(Q):
        l = (Q - tgt_at) @ Rt
        c = np.stack([np.interp(l[:, 0], at_o, OC[:, i]) for i in (0, 1)], 1)
        h = np.stack([np.interp(l[:, 0], at_o, OH[:, i]) for i in (0, 1)], 1)
        d = l[:, 1:] - c
        e = np.sqrt(((d / h) ** 2).sum(1))
        l[:, 1:] = c + d * np.minimum(1, (1 + SLACK) / np.maximum(e, 1e-6))[:, None]
        return tgt_at + l @ Rt.T

    def doubled(Q, Nn, F, clear):
        """The same metal again, half a turn round the arm and just inside itself: it only shows where the first is open. The player looks at the underside
        of an arm in half of the casts, and a suit's is open or dark. It stops short of the joint by clear, where the next plate would run into it."""
        l = (Q - tgt_at) @ Rt
        c = np.stack([np.interp(l[:, 0], at_o, OC[:, i]) for i in (0, 1)], 1)
        back = np.c_[l[:, 0], c - (l[:, 1:] - c) * WRAP]
        n_ = Nn @ Rt
        keep = (l[F][:, :, 0] < -clear).all(1)
        return np.r_[Q, tgt_at + back @ Rt.T], np.r_[Nn, np.c_[n_[:, 0], -n_[:, 1:]] @ Rt.T], np.r_[F, F[keep] + len(Q)]
    return carry, turn, inside, doubled


def capsule(q, tgt, b, skin, margin):
    """Nothing of a finger's plate past a capsule round its bone: no thorn, no flake off to the side. Only what stands out is brought
    in, to a round end: what's inside isn't touched, so round stays round."""
    L = tgt.len[b]
    l = (q - tgt.at[b]) @ tgt.R[b]
    if len(skin) > 8:
        c, e = extent(skin, tgt.R[b], tgt.at[b])
    else:
        c, e = np.zeros(3), np.array([L, 0.02, 0.02])
    R = e[1:].max() / 2 + margin + FINGER_ROOM
    grow = L * (LAP - 1) / 2
    x0, x1 = -grow + R, L + grow - R
    if x0 > x1:
        x0 = x1 = (x0 + x1) / 2
    spine = np.c_[np.clip(l[:, 0], x0, x1), np.full(len(l), c[1]), np.full(len(l), c[2])]
    d = l - spine
    away = np.linalg.norm(d, axis=1)
    l = spine + d * np.minimum(1, R / np.maximum(away, 1e-9))[:, None]
    return tgt.at[b] + l @ tgt.R[b].T


def cap(tgt, b, skin, patch, widest=None):
    """A joint of a finger, as a round lame of metal over it, on the suit's own steel, with a round end if it's the last. Every suit's tips come to points, and whatever's done to a
    point it reads as a claw. widest: how far it may go off its bone. Hands back points, normals, texture coordinates and triangles."""
    L = tgt.len[b]
    last = b.endswith("2")
    if len(skin) > 8:
        c, e = extent(skin, tgt.R[b], tgt.at[b])
        tip = max(L, float(((skin - tgt.at[b]) @ tgt.R[b][:, 0]).max()))
    else:
        c, e, tip = np.zeros(3), np.array([L, 0.02, 0.02]), L
    h = e[1:] / 2 + CAP_ROOM + STEP * (2 - int(b[-1]))
    if widest is not None:
        h = np.minimum(h, widest)
    # (Round stays round: however the finger under it measures.)
    h = np.maximum(h, h.max() * 0.85)
    # (A thumb's first bone runs back through the pad of the hand, which is leather.)
    base, end = (L * 0.35 if b == "thumb0" else -L * (LAP - 1) / 2), (tip + CAP_ROOM if last else L * (1 + (LAP - 1) / 2))
    x1 = max(end - float(h.min()), base + 0.002) if last else end
    rings = [(base, 1.0, 0.0), ((base + x1) / 2, 0.97, 0.0), (x1, 0.94, 0.0)]
    for a in np.radians([30, 60, 82]) if last else []:
        rings.append((x1 + (end - x1) * np.sin(a), 0.94 * np.cos(a), np.sin(a)))
    SEG = 10
    th = np.linspace(-np.pi, np.pi, SEG, endpoint=False)
    l, n, uv = [], [], []
    x0_, y0_, size, W, H = patch
    m = size * 0.1
    for x, k, tilt in rings + ([(end, 0.0, 1.0)] if last else []):
        for t in th if k else th[:1]:
            l.append((x, c[1] + h[0] * k * np.cos(t), c[2] + h[1] * k * np.sin(t)))
            n.append((tilt, np.sqrt(1 - tilt * tilt) * np.cos(t), np.sqrt(1 - tilt * tilt) * np.sin(t)))
            uv.append(((x0_ + m + (size - 2 * m) * abs(t) / np.pi) / W, (y0_ + m + (size - 2 * m) * (x - base) / (end - base)) / H))
    F = []
    for i in range(len(rings) - 1):
        for j in range(SEG):
            a_, b_, c_, d_ = i * SEG + j, i * SEG + (j + 1) % SEG, (i + 1) * SEG + j, (i + 1) * SEG + (j + 1) % SEG
            F += [(a_, b_, d_), (a_, d_, c_)]
    if last:
        pole = len(rings) * SEG
        for j in range(SEG):
            F.append(((len(rings) - 1) * SEG + j, (len(rings) - 1) * SEG + (j + 1) % SEG, pole))
    l, n, uv, F = np.array(l), np.array(n), np.array(uv), np.array(F, np.int64)
    # (The way a triangle winds is the way it faces.)
    wrong = (np.cross(l[F[:, 1]] - l[F[:, 0]], l[F[:, 2]] - l[F[:, 0]]) * n[F[:, 0]]).sum(1) < 0
    F[wrong] = F[wrong][:, [0, 2, 1]]
    return tgt.at[b] + l @ tgt.R[b].T, n @ tgt.R[b].T, uv, F


def painted(U, F, shade):
    """How bright the paint under a triangle is."""
    h, w = shade.shape
    uv = np.concatenate([U[F], U[F].mean(1, keepdims=True)], 1)
    px = np.clip((uv * (w, h)).astype(int), 0, (w - 1, h - 1))
    return shade[px[..., 1], px[..., 0]].mean(1)


def trim(Q, Nn, U, F, at, R):
    """A sleeve's metal, cut square across the arm at each end, at the last place it goes most of the way round. A suit's cuffs run out to points past that,
    which on a rig's arm are fins. The cut's through the triangles, for a clean edge. Never more than a third of a sleeve, from the elbow, or a sixth from the wrist."""
    l = (Q - at) @ R
    tri = l[F]
    c = np.median(tri.reshape(-1, 3)[:, 1:], axis=0)
    xs = np.linspace(tri[..., 0].min(), tri[..., 0].max(), 26)[1:-1]
    cover = []
    for x in xs:
        a, b = tri, tri[:, [1, 2, 0]]
        hit = (a[..., 0] - x) * (b[..., 0] - x) < 0
        t = (x - a[..., 0][hit]) / (b[..., 0][hit] - a[..., 0][hit])
        p = a[hit] + (b[hit] - a[hit]) * t[:, None]
        cover.append(len(np.unique(((np.arctan2(p[:, 2] - c[1], p[:, 1] - c[0]) + np.pi) / (2 * np.pi) * 12).astype(int))))
    cover = np.array(cover)
    ok = cover >= FULL * np.median(cover)
    # (A slit in a plate isn't its end.)
    ok[1:-1] |= ok[:-2] & ok[2:]
    n = len(xs)
    lo = hi = next(i for i in sorted(range(n), key=lambda i: abs(i - n // 2)) if ok[i])
    while lo > 0 and ok[lo - 1]:
        lo -= 1
    while hi < n - 1 and ok[hi + 1]:
        hi += 1
    lo, hi = min(lo, n // 3), max(hi, n - 1 - n // 6)
    Q, Nn, U = list(Q), list(Nn), list(U)
    for sign, x0 in ((1, xs[lo]), (-1, xs[hi])):
        side = [sign * (float(p_ @ R[:, 0] - at @ R[:, 0]) - x0) for p_ in Q]
        cuts, out = {}, []

        def mid(i, j):
            key = (min(i, j), max(i, j))
            if key not in cuts:
                t = side[i] / (side[i] - side[j])
                Q.append(Q[i] + (Q[j] - Q[i]) * t); Nn.append(Nn[i] + (Nn[j] - Nn[i]) * t); U.append(U[i] + (U[j] - U[i]) * t)
                side.append(0.0)
                cuts[key] = len(Q) - 1
            return cuts[key]
        for tri_ in F:
            a, b, c_ = (int(v) for v in tri_)
            ins = [side[a] >= 0, side[b] >= 0, side[c_] >= 0]
            if all(ins):
                out.append((a, b, c_))
            elif any(ins):
                # Round to one corner apart from the other two.
                while ins[0] == ins[1]:
                    a, b, c_ = b, c_, a
                    ins = ins[1:] + ins[:1]
                if ins[1] == ins[2]:
                    p_, q_ = mid(a, b), mid(a, c_)
                    if ins[0]:
                        out.append((a, p_, q_))
                    else:
                        out += [(p_, b, c_), (p_, c_, q_)]
                else:
                    # (ins[0] differs from ins[1], and ins[2] goes with ins[0]: c_ is the same side as a.)
                    a, b, c_ = c_, a, b
                    ins = [ins[2], ins[0], ins[1]]
                    p_, q_ = mid(b, c_), mid(b, a)
                    if ins[1]:
                        out.append((b, p_, q_))
                    else:
                        out += [(p_, c_, a), (p_, a, q_)]
        F = np.array(out, np.int64)
    Q, Nn, U = np.array(Q), np.array(Nn), np.array(U)
    Nn = Nn / np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)
    return Q, Nn, U, F


def boxed(q, tgt, skin, margin):
    """The back of a hand, inside the hand's own outline. What the suit modelled out past it reads as flakes."""
    R = tgt.R["hand"]
    l = (q - tgt.at["hand"]) @ R
    c, e = extent(skin, R, tgt.at["hand"])
    half = e[1:] / 2 + margin + HAND_ROOM
    l[:, 1:] = np.clip(l[:, 1:], c[1:] - half, c[1:] + half)
    return tgt.at["hand"] + l @ R.T


def segment_of(g, b, part):
    for n in g["nodes"]:
        if "mesh" in n and int(n["name"].split("_")[-1]) == part:
            return g["meshes"][n["mesh"]]["primitives"][0]
    raise KeyError(part)


def to_segment(P, at, R, length):
    """How far along a bone (0 to 1 on it) and how far off it."""
    d = (P - at) @ R[:, 0]
    t = d / length
    return t, np.linalg.norm(P - at - np.outer(np.clip(t, 0, 1) * length, R[:, 0]), axis=1)


def plates_of(src, P, N, U, F, on_hand):
    """Cuts a segment up into plates, one to a bone. Which finger is by where a point is on the suit's skeleton, not Tripo's weights, which wander. Hand
    or finger is by its weight on the hand, smoothed: Tripo's knuckle joints sit too far back to go by. And the cuts run through the triangles, along
    the line between two plates: an edge that's clean, not the mesh's zigzag. Hands back {bone: (P, N, U, F)}."""
    bones = [f"{f}{k}" for f in FINGERS for k in range(3)]
    ts, ds = zip(*(to_segment(P, src.at[b], src.R[b], src.len[b]) for b in bones))
    D = np.stack(ds, 1)
    near = D.argmin(1)
    xf = (P - src.at["fore"]) @ src.R["fore"][:, 0]
    label = np.array([bones[i] for i in near], dtype=object)
    # (Welded, so a seam in the texture isn't a seam in this.)
    weld = np.unique(np.round(P, 5), axis=0, return_inverse=True)[1].ravel()
    e = np.unique(np.sort(weld[np.r_[F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]], axis=1), axis=0)
    hw = np.zeros(weld.max() + 1)
    np.add.at(hw, weld, on_hand)
    hw /= np.maximum(np.bincount(weld, minlength=len(hw)), 1)
    for _ in range(2):
        total, count = np.zeros(len(hw)), np.zeros(len(hw))
        np.add.at(total, e[:, 0], hw[e[:, 1]])
        np.add.at(total, e[:, 1], hw[e[:, 0]])
        np.add.at(count, e, 1)
        hw = hw * 0.5 + 0.5 * total / np.maximum(count, 1)
    on_hand = hw[weld]
    label[on_hand > 0.5] = "hand"
    label[xf < 0] = "fore"
    # A lone point in a neighbour's plate takes the neighbour's side.
    around = {}
    first = {}
    for i, w_ in enumerate(weld):
        first.setdefault(int(w_), i)
    for a_, b_ in e:
        around.setdefault(int(a_), []).append(int(b_))
        around.setdefault(int(b_), []).append(int(a_))
    for _ in range(2):
        of = {w_: label[i] for w_, i in first.items()}
        new = dict(of)
        for w_, ns in around.items():
            names = [of[n] for n in ns]
            if of[w_] not in names:
                new[w_] = max(set(names), key=names.count)
        label = np.array([new[int(w_)] for w_ in weld], dtype=object)

    def side(a, b, i):
        """Over nought on a's side of the line between plates a and b, at point i."""
        pair = {a, b}
        if "fore" in pair:
            return xf[i] if b == "fore" else -xf[i]
        if "hand" in pair:
            v = on_hand[i] - 0.5
            return v if a == "hand" else -v
        return D[i, bones.index(b)] - D[i, bones.index(a)]

    Pn, Nn, Un = [p_ for p_ in P], [p_ for p_ in N], [p_ for p_ in U]
    cuts = {}

    def add(pp, nn, uu):
        Pn.append(pp); Nn.append(nn); Un.append(uu)
        return len(Pn) - 1

    def cut(i, j):
        key = (min(i, j), max(i, j))
        if key not in cuts:
            u, v = key
            gu, gv = side(label[u], label[v], u), side(label[u], label[v], v)
            t = 0.5 if gu is None or gu <= 0 or gv >= 0 else float(np.clip(gu / (gu - gv), 0.04, 0.96))
            cuts[key] = add(P[u] + (P[v] - P[u]) * t, N[u] + (N[v] - N[u]) * t, U[u] + (U[v] - U[u]) * t)
        return cuts[key]

    faces = {}

    def put(b, *tris):
        faces.setdefault(b, []).extend(tris)

    whole = {"hand", "fore"}
    for a, b, c in F:
        la, lb, lc = label[a], label[b], label[c]
        # A triangle webbing two fingers, where Tripo fused them, goes: cut along a finger's length, it leaves two needles.
        if len({l_[:-1] for l_ in (la, lb, lc) if l_ not in whole}) > 1:
            continue
        if la == lb == lc:
            put(la, (a, b, c))
        elif lb == lc or la == lb or la == lc:
            # One corner apart from the other two.
            if la == lb:
                a, b, c = c, a, b
            elif la == lc:
                a, b, c = b, c, a
            p, q = cut(a, b), cut(a, c)
            put(label[a], (a, p, q))
            put(label[b], (p, b, c), (p, c, q))
        else:
            p, q, r = cut(a, b), cut(b, c), cut(c, a)
            m = add((P[a] + P[b] + P[c]) / 3, (N[a] + N[b] + N[c]) / 3, (U[a] + U[b] + U[c]) / 3)
            put(la, (a, p, m), (a, m, r))
            put(lb, (b, q, m), (b, m, p))
            put(lc, (c, r, m), (c, m, q))
    Pn, Nn, Un = np.array(Pn), np.array(Nn), np.array(Un)
    out = {}
    for b, tris in faces.items():
        T = np.array(tris, dtype=np.int64)
        use = np.unique(T)
        remap = np.full(len(Pn), -1)
        remap[use] = np.arange(len(use))
        out[b] = (Pn[use], Nn[use] / np.maximum(np.linalg.norm(Nn[use], axis=1, keepdims=True), 1e-9), Un[use], remap[T])
    return out


def welded(Q):
    return np.unique(np.round(Q, 5), axis=0, return_inverse=True)[1].ravel()


def peel(Q, F, shard=SHARD):
    """Takes the debris off a plate: a triangle hanging by one edge, a needle along its rim, a shard not joined to the rest. The inside of a plate is left."""
    weld = welded(Q)
    for _ in range(4):
        if not len(F):
            break
        w = weld[F]
        edges = np.sort(np.stack([w[:, [0, 1]], w[:, [1, 2]], w[:, [2, 0]]], 1), axis=2)
        _, inverse, count = np.unique(edges.reshape(-1, 2), axis=0, return_inverse=True, return_counts=True)
        rim = (count[inverse.ravel()] == 1).reshape(-1, 3).sum(1)
        side = np.stack([Q[F[:, 1]] - Q[F[:, 0]], Q[F[:, 2]] - Q[F[:, 1]], Q[F[:, 0]] - Q[F[:, 2]]], 1)
        longest = np.linalg.norm(side, axis=2).max(1)
        area = np.linalg.norm(np.cross(side[:, 0], side[:, 1]), axis=1) / 2
        height = 2 * area / np.maximum(longest, 1e-9)
        F = F[~((rim >= 2) | ((rim >= 1) & (longest > 0.006) & (height < longest / 5)))]
    # A strip, joined to something bigger: nothing's far from an edge in it.
    from scipy.sparse import csr_matrix
    from scipy.sparse.csgraph import dijkstra
    for _ in range(2):
        if not len(F):
            break
        w = weld[F]
        pairs = np.sort(w[:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2), axis=1)
        uniq, count = np.unique(pairs, axis=0, return_counts=True)
        rim = np.unique(uniq[count == 1])
        if not len(rim):
            break
        pos = np.zeros((weld.max() + 1, 3))
        pos[weld] = Q
        length = np.linalg.norm(pos[uniq[:, 0]] - pos[uniq[:, 1]], axis=1)
        graph = csr_matrix((np.r_[length, length], (np.r_[uniq[:, 0], uniq[:, 1]], np.r_[uniq[:, 1], uniq[:, 0]])), shape=(len(pos), len(pos)))
        far = dijkstra(graph, indices=rim, min_only=True)
        side = np.stack([Q[F[:, 1]] - Q[F[:, 0]], Q[F[:, 2]] - Q[F[:, 1]], Q[F[:, 0]] - Q[F[:, 2]]], 1)
        longest = np.linalg.norm(side, axis=2).max(1)
        area = np.linalg.norm(np.cross(side[:, 0], side[:, 1]), axis=1) / 2
        # (A big triangle with its corners on the edge is a plate, in low poly. It's a strip only if it's thin too.)
        F = F[~((far[w].max(1) < NARROW) & (2 * area / np.maximum(longest, 1e-9) < NARROW * 2))]
    if not len(F):
        return F
    # Joined pieces, by their area.
    root = np.arange(weld.max() + 1)

    def find(i):
        while root[i] != i:
            root[i] = root[root[i]]
            i = root[i]
        return i
    for a, b, c in weld[F]:
        ra, rb, rc = find(a), find(b), find(c)
        root[rb] = ra
        root[rc] = ra
    piece = np.array([find(i) for i in weld[F[:, 0]]])
    area = np.linalg.norm(np.cross(Q[F[:, 1]] - Q[F[:, 0]], Q[F[:, 2]] - Q[F[:, 0]]), axis=1) / 2
    ids, inverse = np.unique(piece, return_inverse=True)
    total = np.zeros(len(ids))
    np.add.at(total, inverse, area)
    ok = total >= shard
    for i in np.flatnonzero(ok):
        pts = Q[F[inverse == i]].reshape(-1, 3)
        long = np.ptp((pts - pts.mean(0)) @ np.linalg.svd(pts - pts.mean(0), full_matrices=False)[2][0])
        if long > 0.012 and total[i] < NEEDLE * long ** 2:
            ok[i] = False
    return F[ok[inverse]]


def rim_walls(Q, Nq, U, F):
    """A plate's open edge, given its thickness: a bevel, down and out from the rim, and mostly out, so it shows from the plate's own side. From behind it's culled, as the plate is.
    (A wall, or a steep bevel, seen from behind or inside a curved plate outlines it in wire, in front of the arm.)
    An edge with a triangle only on one side is a plate's edge."""
    weld = welded(Q)
    directed = np.r_[F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]
    seen = {(int(a), int(b)) for a, b in weld[directed]}
    is_rim = np.array([(int(weld[b]), int(weld[a])) not in seen for a, b in directed])
    if not is_rim.any():
        return Q, Nq, U, F
    rim = directed[is_rim]
    # (Off the triangles, not the file's normals: Tripo's can lie flat along a thin edge.)
    face = np.cross(Q[F[:, 1]] - Q[F[:, 0]], Q[F[:, 2]] - Q[F[:, 0]])
    n = np.zeros((weld.max() + 1, 3))
    for k in range(3):
        np.add.at(n, weld[F[:, k]], face)
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    # Out of the plate, along it: an edge's triangle lies to its left, seen from outside.
    out = np.zeros_like(n)
    e = Q[rim[:, 1]] - Q[rim[:, 0]]
    away = np.cross(e, np.r_[face, face, face][is_rim])
    away /= np.maximum(np.linalg.norm(away, axis=1, keepdims=True), 1e-12)
    np.add.at(out, weld[rim[:, 0]], away)
    np.add.at(out, weld[rim[:, 1]], away)
    out /= np.maximum(np.linalg.norm(out, axis=1, keepdims=True), 1e-12)
    use = np.unique(rim)
    back = np.full(len(Q), -1)
    back[use] = np.arange(len(use)) + len(Q)
    tris = np.r_[np.c_[rim[:, 0], back[rim[:, 0]], rim[:, 1]], np.c_[rim[:, 1], back[rim[:, 0]], back[rim[:, 1]]]]
    w = weld[use]
    Nb = Nq[use] + out[w] * 0.35
    Nb /= np.maximum(np.linalg.norm(Nb, axis=1, keepdims=True), 1e-9)
    return np.r_[Q, Q[use] + (out[w] - n[w] * 0.35) * THICK * 0.7], np.r_[Nq, Nb], np.r_[U, U[use]], np.r_[F, tris]


def fit_side(d, rig, s):
    """The gauntlet and upper arm of one side, on one rig: each plate rigid, on the one joint of its bone. Hands back points, normals, joints, weights,
    what's under the plates, texture coordinates, triangles, and how many of the points and triangles come before the upper arm's."""
    src, plates = d["src"], d["plates"]
    tgt = rig.sk[s]
    axis = tgt.R["fore"][:, 0]
    fore_skin = rig.V[rig.fore_mask(s)]
    Q, Nq, tj, Uv, Fa, base = [], [], [], [], [], 0
    has_upper = "upper" in tgt.R and "fore" in plates
    n_low, f_low = 0, 0
    lames = [f"{f}{k}" for f in FINGERS for k in ((2,) if SUIT_FINGERS else (0, 1, 2))]
    for b in [b for b in sorted(plates, key=lambda b: b != "fore") if b not in lames] + lames + (["upper"] if has_upper else []):
        if b in lames:
            # (A first joint's skin runs on into the palm, and mustn't balloon: it's measured by the next.)
            next_skin = rig.skin_of(f"{b[:-1]}1", s) if b.endswith("0") else []
            widest = extent(next_skin, tgt.R[f"{b[:-1]}1"], tgt.at[f"{b[:-1]}1"])[1][1:].max() / 2 * (1.05 if b == "thumb0" else 1.35) + CAP_ROOM + 2 * STEP if len(next_skin) > 8 else None
            q, n, U, f = cap(tgt, b, rig.skin_of(b, s), d["patch"], widest)
            joint = rig.index[rig.bone_name(b, s)]
            q, n, u, f = rim_walls(q, n, U, f)
            j = np.zeros((len(q), 4), np.uint16)
            j[:, 0] = joint
            Q.append(q); Nq.append(n); tj.append(j); Uv.append(u); Fa.append(f + base)
            base += len(q)
            continue
        # (The upper arm's metal is the suit's forearm's over again: a suit's own is modelled over mail, torn open, and wouldn't reach round a rig's arm.)
        P, N, U, F = plates["fore" if b == "upper" else b]
        if b == "upper":
            n_low, f_low = base, sum(map(len, Fa))
        if b in ("fore", "upper"):
            F = F[painted(U, F, d["shade"]) >= DARK]
            top = rig.index[rig.upper_joint[s]] if b == "upper" else rig.fore_joint(s)
            skin = rig.V[rig.dom == top] if b == "upper" else fore_skin
            # (A spell rig's arm bones run long, and metal doesn't stretch to fit them: what it doesn't reach is leather.)
            ratio = tgt.len[b] / src.len["fore"] * (REACH if b == "upper" else 1)
            if rig.name.startswith("spell") and b == "fore":
                ratio = min(ratio, tgt.len["hand"] / src.len["hand"] * SPELL_LONG)
            carry, turn, inside, doubled = tube(src.at["fore"], src.R["fore"], tgt.at[b], tgt.R[b], ratio, P, skin, FORE_MARGIN, 5 if b == "upper" else 2)
            q, n, U, F = trim(inside(carry(P)), turn(P, N), U, F, tgt.at[b], tgt.R[b])
            joint = top
            if b == "fore":
                # The cuff runs on a little over the back of the hand.
                x = (q - tgt.at["fore"]) @ axis
                q = q + np.outer(OVERLAP * np.clip((x + 0.02) / 0.02, 0, 1), axis)
            q, n, F = doubled(q, n, F, tgt.len[b] * 0.15)
            U = np.r_[U, U]
        else:
            # (A palm is the arm's own skin, as leather: what a suit modelled there is a rag of dark flaps in a rig's hand.)
            fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
            F = F[fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12) @ (src.hand_frame[:, 2] * (1 if s == "R" else -1)) <= 0.2]
            margin = MARGIN + (0.002 if rig.name.startswith("spell") and b != "hand" else 0)
            A, t = place(src, tgt, b, P, rig.skin_of(b, s), margin)
            q, n = P @ A.T + t, N @ np.linalg.inv(A)
            n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
            joint = rig.index[rig.bone_name(b, s)]
            # ...and the hand tucks in under it.
            x = (q - tgt.at["fore"]) @ axis
            q = q - n * (TUCK * np.clip((0.012 - x) / 0.012, 0, 1))[:, None]
            skin = rig.skin_of(b, s)
            q = boxed(q, tgt, skin, margin) if b == "hand" else capsule(q, tgt, b, skin, margin)
        f = peel(q, F, HAND_SHARD if b == "hand" else SHARD)
        q, n, u, f = rim_walls(q, n, U, f)
        j = np.zeros((len(q), 4), np.uint16)
        j[:, 0] = joint
        Q.append(q); Nq.append(n); tj.append(j); Uv.append(u); Fa.append(f + base)
        base += len(q)
    if not has_upper:
        n_low, f_low = base, sum(map(len, Fa))
    Q, Nq, tj, Uv, Fa = map(np.concatenate, (Q, Nq, tj, Uv, Fa))
    tw = np.zeros((len(Q), 4), np.float32)
    tw[:, 0] = 1
    # The cut: skin past here is under the armour, and is drawn as the leather under it. That's all of the arm: no bare skin at the top of a plate.
    if "upper" in tgt.R:
        along = tgt.R["upper"][:, 0]
        point = tgt.at["upper"] - along * tgt.len["upper"] * 1.5
    else:
        along = axis
        point = tgt.at["fore"] - axis * tgt.len["fore"] * 1.5
    return Q, Nq, tj, tw, [*(float(v) for v in point), *(float(v) for v in along)], Uv, Fa, n_low, f_low


def fist_upper(d, rig, s):
    """The upper arm's metal on a spell rig's fist, whose arm has bones of its own. None if its arm is one bone."""
    jo = rig.index.get("gfore_" + s)
    if jo is None or "fore" not in d["plates"]:
        return None
    src = d["src"]
    ju, jf = rig.index["garm_" + s], rig.index["gfist_" + s]
    elbow, top, wrist = rig.P[jo], rig.P[ju], rig.P[jf]
    g, b = rig.g, rig.b
    node = next(n for n in g["nodes"] if n.get("name") == "fist")
    pr = g["meshes"][node["mesh"]]["primitives"][0]
    V = acc(g, b, pr["attributes"]["POSITION"]).astype(np.float64)
    J, W = weights(g, b, pr)
    skin = V[J[np.arange(len(J)), W.argmax(1)] == ju]
    # (A fist that stops at the elbow has no upper arm to cover.)
    if len(skin) < 8:
        return None
    R = frame(elbow - top, wrist - elbow)
    length = np.linalg.norm(elbow - top)
    P, N, U, F = d["plates"]["fore"]
    F = F[painted(U, F, d["shade"]) >= DARK]
    carry, turn, inside, doubled = tube(src.at["fore"], src.R["fore"], elbow, R, length / src.len["fore"] * REACH, P, skin, FORE_MARGIN, 5)
    q, n, U, F = trim(inside(carry(P)), turn(P, N), U, F, elbow, R)
    q, n, f = doubled(q, n, F, length * 0.15)
    q, n, u, f = rim_walls(q, n, np.r_[U, U], peel(q, f))
    j = np.zeros((len(q), 4), np.uint16)
    j[:, 0] = ju
    w = np.zeros((len(q), 4), np.float32)
    w[:, 0] = 1
    point = elbow - R[:, 0] * length * 1.5
    return q, n, j, w, [*(float(v) for v in point), *(float(v) for v in R[:, 0])], u, f


def fist_side(rig, ref, s, Q, Nq, tj, tw):
    """The gauntlet on a spell rig's closed fist: a mesh of its own on its own bones, with no finger bones, whose fingers can't open. So the
    gauntlet as it grips a sword (arms_1h: Q, Nq on `ref`) goes over it whole, turned about the hand's line to where its skin lies closest."""
    from scipy.spatial import cKDTree
    g, b = rig.g, rig.b
    node = next(n for n in g["nodes"] if n.get("name") == "fist")
    pr = g["meshes"][node["mesh"]]["primitives"][0]
    V = acc(g, b, pr["attributes"]["POSITION"]).astype(np.float64)
    J, W = weights(g, b, pr)
    dom = J[np.arange(len(J)), W.argmax(1)]
    # (The raise's fist has one bone for all of its forearm.)
    jf, jo = rig.index["gfist_" + s], rig.index.get("gfore_" + s, rig.index["garm_" + s])
    wrist, elbow = rig.P[jf], rig.P[jo]
    hand = V[dom == jf]
    sk = ref.sk[s]
    fam = [ref.index["hand_" + s]] + [ref.index[ref.bone_name(f"{f}{k}", s)] for f in FINGERS for k in range(3)]
    skin = ref.V[np.isin(ref.dom, fam)]
    o_s = sk.at["hand"]
    c_s, c_t = skin.mean(0), hand.mean(0)
    k = np.linalg.norm(hand - c_t, axis=1).mean() / np.linalg.norm(skin - c_s, axis=1).mean()
    S = frame(c_s - o_s, sk.hand_frame[:, 1])
    tree = cKDTree(hand)
    t_x = unit(c_t - wrist)
    side = unit(np.cross(t_x, [0.3, 0.9, 0.2]))
    best, best_R = 1e9, None
    tiny = skin[::4]
    for a in np.radians(np.arange(0, 360, 5)):
        y = side * np.cos(a) + np.cross(t_x, side) * np.sin(a)
        R = frame(t_x, y) @ S.T
        mapped = (tiny - c_s) @ R.T * k + c_t
        d = tree.query(mapped)[0].mean() + cKDTree(mapped).query(hand[::4])[0].mean()
        if d < best:
            best, best_R = d, R
    R = best_R
    # The bracer: from the same wrist down the fist's own forearm.
    ax_s, ax_t = sk.R["fore"][:, 0], unit(wrist - elbow)
    v = np.cross(R @ ax_s, ax_t)
    c, sn = float((R @ ax_s) @ ax_t), np.linalg.norm(v)
    if sn > 1e-6:
        n = v / sn
        K = np.array([[0, -n[2], n[1]], [n[2], 0, -n[0]], [-n[1], n[0], 0]])
        R_f = (np.eye(3) + sn * K + (1 - c) * K @ K) @ R
    else:
        R_f = R
    o_map = (o_s - c_s) @ R.T * k + c_t
    fw = np.zeros(len(Q))
    forearm_ids = set(range(len(ref.names))) - set(fam)
    for c_ in range(4):
        fw += tw[:, c_] * np.isin(tj[:, c_], list(forearm_ids))
    Qh = (Q - c_s) @ R.T * k + c_t
    Qf = (Q - o_s) @ R_f.T * k + o_map
    out = Qh * (1 - fw)[:, None] + Qf * fw[:, None]
    Nh, Nf = Nq @ R.T, Nq @ R_f.T
    N = Nh * (1 - fw)[:, None] + Nf * fw[:, None]
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    j = np.zeros((len(Q), 4), np.uint16)
    w = np.zeros((len(Q), 4), np.float32)
    j[:, 0], j[:, 1], w[:, 0], w[:, 1] = jf, jo, 1 - fw, fw
    # (All of its arm's under: bare, its sleeve showed glossy black over the metal of the open hand's arm.)
    point = elbow - ax_t * np.linalg.norm(wrist - elbow)
    return out, N, j, w, [*(float(v_) for v_ in point), *(float(v_) for v_ in ax_t)]



def part_mask(data, size, wanted, backs_only=False):
    """Where on the atlas some of a suit's plates are. wanted: which bones. backs_only: leaving out what faces out of the palm."""
    from PIL import ImageDraw
    W, H = size
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for s, d in data.items():
        # (Along the fingers, then across from index to pinky: that makes a right hand's third axis point out of its palm, and a left's out of its back.)
        out = d["src"].hand_frame[:, 2] * (1 if s == "R" else -1)
        for b, (P, N, U, F) in d["plates"].items():
            if not wanted(b):
                continue
            if backs_only:
                n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
                F = F[n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12) @ out <= 0.2]
            for tri in F:
                draw.polygon([(float(U[i, 0] * W), float(U[i, 1] * H)) for i in tri], fill=255)
    return np.asarray(mask, np.float32) / 255


def paint(suit, a, data):
    """The atlas for the game's light, from a suit's own (a: 0 to 1). Rust goes, and the warm cast; the metal's brightened; fingers, which a suit paints dark as gloves, come up to its
    steel; the busiest back of a hand is calmed. And in a clear corner, a patch of the plain steel, for the fingertips' caps. Hands back the colours, how bright each texel
    was to begin with, and where the patch is."""
    from scipy import ndimage
    H, W = a.shape[:2]
    shade = a @ LUMA
    sat = lambda c: (c.max(-1) - c.min(-1)) / np.maximum(c.max(-1), 1e-3)
    warm = np.clip((a[..., 0] - a[..., 2]) * 6, 0, 1)
    off = COOL[suit] * warm * np.clip((0.55 - sat(a)) / 0.2, 0, 1)
    if COOL[suit]:
        # Rust's warm and dark, where gold's warm and bright.
        off = np.maximum(off, warm * np.clip((0.42 - shade) / 0.15, 0, 1))
    a = a * (1 - off[..., None]) + shade[..., None] * off[..., None]
    a = np.clip(a * (1 + (GAIN[suit] - 1) * np.clip((shade - 0.12) / 0.2, 0, 1))[..., None], 0, 1)
    fore = part_mask(data, (W, H), lambda b: b == "fore") > 0.5
    l, s_ = a @ LUMA, sat(a)
    steel = np.median(a[fore & (l > np.percentile(l[fore], 60)) & (s_ < 0.35)], axis=0)
    if suit in TINT:
        hue = fore & (a[..., 2] > a[..., 0]) & (a[..., 0] > a[..., 1]) & (s_ > 0.2)
        steel = steel * (1 - TINT[suit]) + np.median(a[hue], axis=0) * TINT[suit]
    if suit in CALM:
        k = ndimage.gaussian_filter(part_mask(data, (W, H), lambda b: b == "hand", True), 2.0)[..., None] * CALM[suit]
        a = a * (1 - k) + ndimage.gaussian_filter(a, (5, 5, 0)) * k
    k = ndimage.gaussian_filter(part_mask(data, (W, H), lambda b: b not in ("fore", "hand"), True), 1.5)[..., None]
    dark = np.clip((0.34 - l) / 0.15, 0, 1)[..., None]
    a = a * (1 - k) + np.clip(a * FINGER_GAIN * (1 - dark) + steel * (0.55 + l[..., None]) * dark, 0, 1) * k
    used = part_mask(data, (W, H), lambda b: True)
    for size in (96, 64, 48):
        free = np.argwhere(ndimage.uniform_filter(used, size + 16) < 1e-4)
        free = free[(free.min(1) >= size) & (free[:, 0] < H - size) & (free[:, 1] < W - size)]
        if len(free):
            break
    y0, x0 = free[0] - size // 2
    # (Cool, as metal: a suit's paint is warm from its gold.)
    steel = steel * (1 - 0.8 * COOL[suit]) + (steel @ LUMA) * 0.8 * COOL[suit]
    rows = steel * (0.58 + 0.22 * np.clip(np.linspace(0, 6, size), 0, 1))[:, None]
    # A line of a suit's gold across the base of each, or of darker steel on a suit with none.
    l, s_, warm = a @ LUMA, sat(a), a[..., 0] - a[..., 2]
    gold = fore & (warm > 0.15) & (l > 0.35) & (s_ > 0.35)
    rows[: max(size // 6, 2)] = np.median(a[gold], axis=0) * 0.9 if COOL[suit] and gold.sum() > 200 else steel * 0.42
    a[y0:y0 + size, x0:x0 + size] = rows[:, None]
    return np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8), shade, (int(x0), int(y0), size, W, H)


def build(suit):
    file, hands = SUITS[suit]
    g, b = load(os.path.join(SOURCE, file))
    names, Pj = rests(g, b)

    def tex_of(pr):
        return g["materials"][pr["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]

    def image_of(t):
        bv = g["bufferViews"][g["images"][g["textures"][t]["source"]]["bufferView"]]
        o = bv.get("byteOffset", 0)
        import io
        return Image.open(io.BytesIO(b[o:o + bv["byteLength"]])).convert("RGB")

    # The atlas: the hands' maps, side by side.
    big = list(dict.fromkeys(tex_of(segment_of(g, b, p)) for s in "RL" for p in hands[s]))
    W, H = len(big) * TILE, TILE
    canvas = Image.new("RGB", (W, H))
    place_of = {}
    for i, t in enumerate(big):
        place_of[t] = (i * TILE, 0, TILE)
        canvas.paste(image_of(t).resize((TILE, TILE), Image.LANCZOS), (i * TILE, 0))

    data = {}
    for s in "RL":
        src = suit_skeleton(names, Pj, s)
        plates = {}
        for part in hands[s]:
            pr = segment_of(g, b, part)
            P = acc(g, b, pr["attributes"]["POSITION"]).astype(np.float64)
            N = acc(g, b, pr["attributes"]["NORMAL"]).astype(np.float64)
            U = acc(g, b, pr["attributes"]["TEXCOORD_0"]).astype(np.float64)
            F = acc(g, b, pr["indices"]).astype(np.int64).reshape(-1, 3)
            x, y, size = place_of[tex_of(pr)]
            U = (U * size + (x, y)) / (W, H)
            J, W_ = weights(g, b, pr)
            hand_joint = names.index(("Right" if s == "R" else "Left") + "Hand")
            on_hand = (W_ * (J == hand_joint)).sum(1)
            for bone, piece in plates_of(src, P, N, U, F, on_hand).items():
                plates.setdefault(bone, []).append(piece)
        for bone, pieces in plates.items():
            base, Fs = 0, []
            for piece in pieces:
                Fs.append(piece[3] + base)
                base += len(piece[0])
            plates[bone] = tuple(np.concatenate([piece[i] for piece in pieces]) for i in range(3)) + (np.concatenate(Fs),)
        data[s] = dict(src=src, plates=plates)

    color, shade, patch = paint(suit, np.array(canvas).astype(np.float32) / 255, data)
    for d in data.values():
        d["shade"], d["patch"] = shade, patch
    # (Gently on the normals: at full strength the maps' paint and noise read as a glittery mosaic.)
    normal, mr = derive_pbr(color.astype(np.float32), False, RELIEF[suit])
    x0, y0, size = patch[:3]
    mr[y0:y0 + size, x0:x0 + size, 1] = GLOSS + 0.06
    mr[..., 1] = np.maximum(mr[..., 1], GLOSS)
    mr[..., 2] = mr[..., 2] * METAL[suit]
    # (The fingers' steel is metal on every suit: at a suit's own, a plain surface reads as painted plastic.)
    mr[y0:y0 + size, x0:x0 + size, 2] = 0.6
    G = atlas.Glb()
    images = [dict(bufferView=G.view(atlas.encode(color, "jpg")), mimeType="image/jpeg", name="color"),
              dict(bufferView=G.view(atlas.encode(np.clip(mr * 255 + 0.5, 0, 255).astype(np.uint8), "jpg")), mimeType="image/jpeg", name="rm"),
              dict(bufferView=G.view(atlas.encode(np.clip(normal * 255 + 0.5, 0, 255).astype(np.uint8), "jpg")), mimeType="image/jpeg", name="normal")]
    meshes = []
    nodes = []
    grip = {}
    ref = None
    for rig_name in RIGS:
        rig = Rig(rig_name)
        if rig_name == "arms_1h":
            ref = rig
        Q, Nq, tj, tw, Uv, Fa, cuts, base = [], [], [], [], [], [], {}, 0
        for s in rig.sides:
            q, nq, j, w, cut, uv, fa, n_low, f_low = fit_side(data[s], rig, s)
            if rig_name == "arms_1h":
                grip[s] = (q[:n_low], nq[:n_low], j[:n_low], w[:n_low], uv[:n_low], fa[:f_low])
            Q.append(q); Nq.append(nq); tj.append(j); tw.append(w); Uv.append(uv); Fa.append(fa + base)
            cuts[s] = cut
            base += len(q)
        if rig_name.startswith("spell"):
            cuts["fist"] = {}
            for s in rig.sides:
                q, nq, j, w, cut = fist_side(rig, ref, s, *grip[s][:4])
                Q.append(q); Nq.append(nq); tj.append(j); tw.append(w); Uv.append(grip[s][4]); Fa.append(grip[s][5] + base)
                cuts["fist"][s] = cut
                base += len(q)
                up = fist_upper(data[s], rig, s)
                if up:
                    q, nq, j, w, cut, uv, fa = up
                    Q.append(q); Nq.append(nq); tj.append(j); tw.append(w); Uv.append(uv); Fa.append(fa + base)
                    cuts["fist"][s] = cut
                    base += len(q)
        prim = dict(attributes=dict(POSITION=G.accessor(np.concatenate(Q).astype(np.float32), "VEC3", 5126, 34962, minmax=True),
                                    NORMAL=G.accessor(np.concatenate(Nq).astype(np.float32), "VEC3", 5126, 34962),
                                    TEXCOORD_0=G.accessor(np.concatenate(Uv).astype(np.float32), "VEC2", 5126, 34962),
                                    JOINTS_0=G.accessor(np.concatenate(tj).astype(np.uint16), "VEC4", 5123, 34962),
                                    WEIGHTS_0=G.accessor(np.concatenate(tw).astype(np.float32), "VEC4", 5126, 34962)),
                    indices=G.accessor(np.concatenate(Fa).astype(np.uint32).ravel(), "SCALAR", 5125, 34963), material=0)
        meshes.append(dict(name=rig_name, primitives=[prim], extras=dict(cut=cuts)))
        nodes.append(dict(name=rig_name, mesh=len(meshes) - 1))
    gltf = dict(asset=dict(version="2.0", generator="bm tools/gear/gauntlets.py"), scene=0, scenes=[dict(name=suit, nodes=list(range(len(nodes))))], nodes=nodes, meshes=meshes,
                materials=[dict(name=suit, pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicRoughnessTexture=dict(index=1)), normalTexture=dict(index=2))],
                textures=[dict(source=i, sampler=0) for i in range(3)], samplers=[dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)],
                images=images, accessors=G.accessors, bufferViews=G.views, buffers=[dict(byteLength=0)])
    while len(G.bin) % 4:
        G.bin.append(0)
    gltf["buffers"][0]["byteLength"] = len(G.bin)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    path = os.path.join(ROOT, "assets", "fp", f"gauntlets_{suit}.glb")
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(G.bin)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(G.bin), 0x004E4942) + bytes(G.bin))
    print(f"{suit}: {os.path.getsize(path) / 1e6:.2f} MB, {sum(len(p[0]) for d in data.values() for p in d['plates'].values())} verts, atlas {W}x{H}")


if __name__ == "__main__":
    for suit in sys.argv[1:] or SUITS:
        build(suit)
