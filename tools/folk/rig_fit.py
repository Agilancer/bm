"""Rig fit for Phobos's people: every body plays Lisandra's clips (src/folk/rig.js carries each bone's turn from rest across,
in the world), so a body whose arms or legs point another way at rest than hers plays every clip that far off: arms that
hang 40 degrees lower at rest swing 40 degrees into the body on the run. And Meshy's joints sit where its auto-rigger
guessed, not always in the middle of the limb, so an elbow or knee bends off-centre and the sleeve folds through itself.

Run inside Blender (the owner's rule: Blender MCP for everything):
    exec(open(r'<repo>/tools/folk/rig_fit.py').read()); measure(ids)  /  fit(ids)

measure(): per body, how far each limb bone points off hers at rest (degrees), and how far each limb joint sits off the
middle of its limb (as a fraction of the limb's thickness).
fit(): the body's mesh and skeleton put into her rest pose (the limbs swung to point her way, linear blend skinning with
its own weights, so it's the pose the game would have drawn anyway, made the rest), joints moved to their limb's middle,
and the skeleton's rest and inverse bind matrices made again; weights and textures untouched. What was done is kept in
asset.extras.rigfit so a second run only makes up the difference.
"""
import json
import os
import struct

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) if '__file__' in globals() else None
FOLK = None

# The limb bones swung to her rest direction, parents first (a bone's direction: its joint to its child's).
SWING = [("LeftArm", "LeftForeArm"), ("LeftForeArm", "LeftHand"), ("RightArm", "RightForeArm"), ("RightForeArm", "RightHand"),
         ("LeftUpLeg", "LeftLeg"), ("LeftLeg", "LeftFoot"), ("RightUpLeg", "RightLeg"), ("RightLeg", "RightFoot")]
# Joints centred in their limb (a slice of the mesh across the bone there, verts mostly on the bone or its parent).
CENTRE = ["LeftForeArm", "RightForeArm", "LeftLeg", "RightLeg", "LeftHand", "RightHand", "LeftFoot", "RightFoot"]
# How far a swing may go: past this it's no longer a skeleton off its body, it's a body in another pose (leave it).
MAX_SWING = 50.0
MIN_SWING = 4.0


def setroot(root):
    global ROOT, FOLK
    ROOT = root
    FOLK = os.path.join(ROOT, "assets", "game", "folk")


def read(path):
    data = bytearray(open(path, "rb").read())
    jl = struct.unpack_from("<I", data, 12)[0]
    js = json.loads(bytes(data[20:20 + jl]))
    return data, js, jl, 20 + jl + 8


def view(data, js, b0, ai):
    a = js["accessors"][ai]; bv = js["bufferViews"][a["bufferView"]]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
    dt = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a["componentType"]]
    off = b0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0)
    item = n * np.dtype(dt).itemsize
    if stride and stride != item:
        raise ValueError("interleaved")
    return np.frombuffer(data, dt, a["count"] * n, off).reshape(a["count"], n)


def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def mat_q(m):
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = np.sqrt(t + 1) * 2; return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4])
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]])); j, k = (i + 1) % 3, (i + 2) % 3
    s = np.sqrt(1 + m[i, i] - m[j, j] - m[k, k]) * 2
    q = np.zeros(4); q[i] = s / 4; q[j] = (m[j, i] + m[i, j]) / s; q[k] = (m[k, i] + m[i, k]) / s; q[3] = (m[k, j] - m[j, k]) / s
    return q


def rot_between(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b)
    v = np.cross(a, b); c = float(np.dot(a, b))
    if c < -0.9999:
        return -np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def body_frame(P, idx):
    """Right, up, forward of a body from its hips and up-legs, so hers and theirs compare whatever way each faces."""
    up = np.array([0.0, 1.0, 0.0])
    r = P[idx["LeftUpLeg"]] - P[idx["RightUpLeg"]]; r[1] = 0; r /= np.linalg.norm(r)
    f = np.cross(r, up)
    return np.stack([r, up, f])


def hers():
    meta = json.load(open(os.path.join(FOLK, "clips.json")))
    sk = meta["skeleton"]
    n = len(sk); R = [None] * n; P = np.zeros((n, 3))
    for i, j in enumerate(sk):
        lr = qmat(j["r"]); lt = np.array(j["t"])
        if j["parent"] < 0:
            R[i] = lr; P[i] = lt
        else:
            p = j["parent"]; R[i] = R[p] @ lr; P[i] = P[p] + R[p] @ lt
    idx = {j["name"].split(":")[-1]: i for i, j in enumerate(sk)}
    return P, idx


def body(k):
    path = os.path.join(FOLK, f"{k}.glb")
    data, js, jl, b0 = read(path)
    skin = js["skins"][0]; J = skin["joints"]; nodes = js["nodes"]
    names = [nodes[j].get("name", "").split(":")[-1] for j in J]
    ibm = view(data, js, b0, skin["inverseBindMatrices"])
    W = np.array([np.linalg.inv(ibm[i].reshape(4, 4).T.astype(np.float64)) for i in range(len(J))])
    pr = js["meshes"][0]["primitives"][0]
    at = pr["attributes"]
    pos = view(data, js, b0, at["POSITION"])
    jo = view(data, js, b0, at["JOINTS_0"]).astype(int)
    we = view(data, js, b0, at["WEIGHTS_0"]).astype(np.float64)
    if we.max() > 1.5:
        we = we / (255.0 if we.max() <= 255 else 65535.0)
    return dict(path=path, data=data, js=js, jl=jl, b0=b0, J=J, names=names, idx={n: i for i, n in enumerate(names)},
                ibm=ibm, W=W, P=W[:, :3, 3].copy(), pos=pos, jo=jo, we=we, prim=pr)


def bone_dirs(P, idx, F):
    out = {}
    for a, b in SWING:
        if a in idx and b in idx:
            d = P[idx[b]] - P[idx[a]]; out[a] = F @ (d / np.linalg.norm(d))
    return out


def centre_off(B, joint):
    """How far a joint sits off the middle of its limb: the slice of verts within 1.5 cm of the plane across the bone at
    the joint, weighted to the joint or its parent; returns (offset vector, its size over the slice's radius)."""
    idx = B["idx"]; P = B["P"]; names = B["names"]
    j = idx[joint]
    par = [i for i, n in enumerate(names) if n == {"LeftForeArm": "LeftArm", "RightForeArm": "RightArm", "LeftLeg": "LeftUpLeg",
           "RightLeg": "RightUpLeg", "LeftHand": "LeftForeArm", "RightHand": "RightForeArm", "LeftFoot": "LeftLeg",
           "RightFoot": "RightLeg"}[joint]][0]
    d = P[j] - P[par]; d /= np.linalg.norm(d)
    if joint.endswith("Foot"):
        d = np.array([0.0, 1.0, 0.0]) if abs(d[1]) > 0.5 else d
    v = B["pos"].astype(np.float64)
    own = np.isin(B["jo"], [j, par]) & (B["we"] > 0.25)
    m = own.any(1) & (np.abs((v - P[j]) @ d) < 0.015)
    if m.sum() < 12:
        return None, None
    s = v[m]
    c = s.mean(0); c -= d * ((c - P[j]) @ d)
    off = c - P[j]
    rad = np.median(np.linalg.norm((s - c) - np.outer((s - c) @ d, d), axis=1))
    return off, float(np.linalg.norm(off) / max(rad, 1e-3))


def measure(ids, verbose=True):
    HP, Hidx = hers()
    HF = body_frame(HP, Hidx)
    Hd = bone_dirs(HP, Hidx, HF)
    rows = {}
    for k in ids:
        B = body(k)
        F = body_frame(B["P"], B["idx"])
        d = bone_dirs(B["P"], B["idx"], F)
        ang = {a: float(np.degrees(np.arccos(np.clip(d[a] @ Hd[a], -1, 1)))) for a in d if a in Hd}
        cen = {}
        for c in CENTRE:
            if c in B["idx"]:
                o, f = centre_off(B, c)
                if f is not None:
                    cen[c] = round(f, 2)
        rows[k] = dict(ang={a: round(v, 1) for a, v in ang.items()}, cen=cen)
        if verbose:
            print(k, "arm", rows[k]["ang"].get("LeftArm"), rows[k]["ang"].get("RightArm"), "fore", rows[k]["ang"].get("LeftForeArm"),
                  rows[k]["ang"].get("RightForeArm"), "leg", rows[k]["ang"].get("LeftUpLeg"), rows[k]["ang"].get("LeftLeg"),
                  "| off", max(cen.values()) if cen else None)
    return rows


# ---- Her clips, played on a body the way src/folk/rig.js plays them (FolkRig + FolkPose.fk, no look or arm-out) ----

_CLIPS = {}


def clips():
    if "meta" not in _CLIPS:
        meta = json.load(open(os.path.join(FOLK, "clips.json")))
        bin_ = open(os.path.join(FOLK, "clips.bin"), "rb").read()
        _CLIPS["meta"] = meta
        _CLIPS["rot"] = np.frombuffer(bin_, np.int16, meta["hipsByteOffset"] // 2)
        _CLIPS["hips"] = np.frombuffer(bin_, np.float32, offset=meta["hipsByteOffset"])
    return _CLIPS


def qmul(a, b):
    x1, y1, z1, w1 = a; x2, y2, z2, w2 = b
    return np.array([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
                     w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2])


def qconj(q):
    return np.array([-q[0], -q[1], -q[2], q[3]])


def sample(name, t):
    C = clips(); meta = C["meta"]; c = meta["clips"][name]
    rot = np.array([j["r"] for j in meta["skeleton"]], np.float64)
    last = c["frames"] - 1
    f = ((t % c["dur"]) / c["dur"]) * last if c["loop"] else min(max(t, 0) / c["dur"], 1) * last
    i = min(int(f), last - 1); a = f - i
    for j, off, still in c["tracks"]:
        if still:
            q = C["rot"][off:off + 4] / 32767.0
        else:
            q0 = C["rot"][off + i * 4: off + i * 4 + 4] / 32767.0; q1 = C["rot"][off + i * 4 + 4: off + i * 4 + 8] / 32767.0
            if q0 @ q1 < 0: q1 = -q1
            q = q0 * (1 - a) + q1 * a
        rot[j] = q / np.linalg.norm(q)
    h = C["hips"][c["hips"]:c["hips"] + c["frames"] * 3].reshape(-1, 3)
    hips = h[i] * (1 - a) + h[i + 1] * a
    return rot, hips


def skeleton(js):
    skin = js["skins"][0]; J = skin["joints"]; nodes = js["nodes"]
    ix = {n: i for i, n in enumerate(J)}
    parent = [-1] * len(J)
    for i, n in enumerate(nodes):
        if i in ix:
            for c in n.get("children", []):
                if c in ix: parent[ix[c]] = ix[i]
    names = [nodes[j]["name"] for j in J]
    T = np.array([nodes[j].get("translation", [0, 0, 0]) for j in J], np.float64)
    R = np.array([nodes[j].get("rotation", [0, 0, 0, 1]) for j in J], np.float64)
    return names, parent, T, R


def fk_rest(parent, T, R):
    n = len(parent); WR = np.zeros((n, 4)); WT = np.zeros((n, 3))
    for j in range(n):
        p = parent[j]
        if p < 0: WR[j] = R[j]; WT[j] = T[j]; continue
        WR[j] = qmul(WR[p], R[j]); WT[j] = WT[p] + qmat(WR[p]) @ T[j]
    return WR, WT


I4 = np.array([0, 0, 0, 1.0])


class Rig:
    def __init__(self, B):
        meta = clips()["meta"]; sk = meta["skeleton"]
        self.B = B
        self.names, self.parent, self.T, self.R = skeleton(B["js"])
        hname = [j["name"] for j in sk]; hidx = {n: i for i, n in enumerate(hname)}
        hpar = [j["parent"] for j in sk]
        HT = np.array([j["t"] for j in sk]); HR = np.array([j["r"] for j in sk])
        self.HWR, self.HWT = fk_rest(hpar, HT, HR); self.HT = HT
        self.hhips = hidx["mixamorig:Hips"]
        WR, WT = fk_rest(self.parent, self.T, self.R)
        self.WR, self.WT = WR, WT
        n = len(self.names); self.src = [-1] * n; self.A = np.zeros((n, 4)); self.Bq = np.zeros((n, 4))
        for j in range(n):
            s = hidx.get(self.names[j])
            if s is None: continue
            p = self.parent[j]; sp = hpar[s]
            if p >= 0 and self.src[p] != sp: continue
            self.src[j] = s
            self.A[j] = qmul(qconj(WR[p]) if p >= 0 else I4, self.HWR[sp] if sp >= 0 else I4)
            self.Bq[j] = qmul(qconj(self.HWR[s]), WR[j])
        self.hips = self.names.index("mixamorig:Hips")
        self.scale = WT[self.hips, 1] / self.HWT[self.hhips, 1]
        self.ibm = B["ibm"].reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64)
        self.chest = self.names.index("mixamorig:Spine2")
        self.arms = [self.names.index("mixamorig:LeftArm"), self.names.index("mixamorig:RightArm")]

    def pose(self, clip, t, arm_out=0.0, arm_fwd=0.0):
        rot, hips = sample(clip, t)
        n = len(self.names); WR = np.zeros((n, 4)); WT = np.zeros((n, 3))
        for j in range(n):
            p = self.parent[j]; s = self.src[j]
            q = qmul(qmul(self.A[j], rot[s]), self.Bq[j]) if s >= 0 else self.R[j]
            tr = self.T[j]
            if j == self.hips:
                tr = self.T[j] + (hips - self.HT[self.hhips]) * self.scale
            if p < 0: WR[j] = q; WT[j] = tr; continue
            WT[j] = WT[p] + qmat(WR[p]) @ tr; WR[j] = qmul(WR[p], q)
            if arm_out and j in self.arms:
                # FolkPose.armOut: the upper arm drawn out about the chest's forward.
                c = self.chest
                fwd = qmat(qmul(WR[c], qconj(self.WR[c]))) @ np.array([0, 0, 1.0])
                a = (1 if j == self.arms[0] else -1) * arm_out / 2
                WR[j] = qmul(np.array([*(fwd * np.sin(a)), np.cos(a)]), WR[j])
            if arm_fwd and j in self.arms:
                # FolkPose.armOut's fold: both upper arms brought forward about the chest's left-to-right.
                c = self.chest
                rt = qmat(qmul(WR[c], qconj(self.WR[c]))) @ np.array([1.0, 0, 0])
                b = -arm_fwd / 2
                WR[j] = qmul(np.array([*(rt * np.sin(b)), np.cos(b)]), WR[j])
        M = np.zeros((n, 4, 4))
        for j in range(n):
            W = np.eye(4); W[:3, :3] = qmat(WR[j]); W[:3, 3] = WT[j]; M[j] = W @ self.ibm[j]
        return M, WT

    def skin(self, M):
        B = self.B; v = np.hstack([B["pos"].astype(np.float64), np.ones((len(B["pos"]), 1))])
        out = np.zeros((len(v), 3))
        for k in range(4):
            out += B["we"][:, k:k + 1] * np.einsum("nij,nj->ni", M[B["jo"][:, k]], v)[:, :3]
        return out


# ---- Self-clipping: how much of a limb is inside the trunk or the other leg, over a clip ----

GROUPS = {"trunk": ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "RightShoulder"),
          "larm": ("LeftArm", "LeftForeArm", "LeftHand"), "rarm": ("RightArm", "RightForeArm", "RightHand"),
          "lleg": ("LeftUpLeg", "LeftLeg"), "rleg": ("RightUpLeg", "RightLeg")}


def groups(B):
    names = [n.split(":")[-1] for n in B["names"]]
    keys = list(GROUPS)
    jg = np.full(len(names), -1)
    for i, n in enumerate(names):
        for gi, g in enumerate(keys):
            if n in GROUPS[g]: jg[i] = gi
        if n.startswith("LeftHand"): jg[i] = keys.index("larm")
        if n.startswith("RightHand"): jg[i] = keys.index("rarm")
    w = np.zeros((len(B["pos"]), len(keys)))
    for k in range(4):
        g = jg[B["jo"][:, k]]
        for gi in range(len(keys)):
            w[:, gi] += np.where(g == gi, B["we"][:, k], 0)
    vg = np.full(len(B["pos"]), -1)
    sure = w.max(1) > 0.85
    vg[sure] = w.argmax(1)[sure]
    return keys, vg


def faces(B):
    return view(B["data"], B["js"], B["b0"], B["prim"]["indices"]).reshape(-1, 3).astype(np.int64)


TESTS = [("larm", "trunk"), ("rarm", "trunk"), ("larm", "lleg"), ("rarm", "rleg"), ("lleg", "rleg")]


def clipping(k, clip="run", n=6, arm_out=0.0, B=None, step=4, arm_fwd=0.0):
    """Over n frames of the clip: the share of arm and leg verts more than 1 cm inside another part (per cent, the
    worst frame), and the deepest (m). Inside: behind the nearest face of that part, and a ray out along that face's
    normal crosses the part an odd number of times."""
    from mathutils.bvhtree import BVHTree
    B = B or body(k)
    rig = Rig(B); keys, vg = groups(B); F = faces(B)
    dur = clips()["meta"]["clips"][clip]["dur"]
    worst = {}; deep = 0.0
    for f in range(n):
        M, _ = rig.pose(clip, dur * f / n, arm_out, arm_fwd)
        V = rig.skin(M)
        Vt = [tuple(p) for p in V]
        for a, b in TESTS:
            ia, ib = keys.index(a), keys.index(b)
            fb = F[(vg[F] == ib).all(1)]
            if len(fb) < 10: continue
            tree = BVHTree.FromPolygons(Vt, fb.tolist(), all_triangles=True)
            va = np.nonzero(vg == ia)[0][::step]
            cnt = 0
            for vi in va:
                hit = tree.find_nearest(Vt[vi], 0.1)
                if hit[0] is None: continue
                d = np.array(hit[0]) - V[vi]; nrm = np.array(hit[1])
                if np.dot(-d, nrm) > -0.01: continue
                ins = 0; o = Vt[vi]
                for _ in range(8):
                    h = tree.ray_cast(o, tuple(nrm), 2.0)
                    if h[0] is None: break
                    ins += 1; o = tuple(np.array(h[0]) + nrm * 1e-4)
                if ins % 2 == 1:
                    cnt += 1; deep = max(deep, float(np.linalg.norm(d)))
            key = a + ">" + b
            worst[key] = max(worst.get(key, 0), cnt / max(len(va), 1))
    return {kk: round(v * 100, 1) for kk, v in worst.items()}, round(deep, 3)


# ---- The fit ----

CHAINS = [("LeftArm", "LeftForeArm", "LeftHand"), ("RightArm", "RightForeArm", "RightHand"),
          ("LeftUpLeg", "LeftLeg", "LeftFoot"), ("RightUpLeg", "RightLeg", "RightFoot")]


def _under(parent, c, j):
    while c >= 0:
        c = parent[c]
        if c == j: return True
    return False


def fit(k, write=True, swing=True, B=None):
    B = B or body(k); js = B["js"]
    if js.get("asset", {}).get("extras", {}).get("rigfit"):
        return None
    names, parent, T, R = skeleton(js)
    base = [n.split(":")[-1] for n in names]; idx = {n: i for i, n in enumerate(base)}
    W = B["W"]; P = W[:, :3, 3].copy(); RB = W[:, :3, :3].copy()
    WR0, WT0 = fk_rest(parent, T, R)
    drift = float(np.abs(WT0 - P).max())
    HP, Hi = hers(); HF = body_frame(HP, Hi); F = body_frame(P, idx)
    rec = {"moved": {}, "swing": {}}
    # 1. Each elbow and knee into the middle of its limb: the verts bound to the bone above or below it, in a slice across
    # the limb (shoulder to wrist, hip to ankle) where the joint is, within 14 cm of that line (not a coat's hem or the
    # other leg). Meshy left knees up to 16 cm in front of straight legs, so every clip walked them crouched. Where there
    # are too few verts to trust, the joint goes onto the line, bent the way and as much as hers.
    v = B["pos"].astype(np.float64)
    for a, m, e in CHAINS:
        pa, pm, pe = P[idx[a]], P[idx[m]], P[idx[e]]
        l1, l2 = np.linalg.norm(pm - pa), np.linalg.norm(pe - pm)
        line = pa + (pe - pa) * l1 / (l1 + l2)
        d = (pe - pa) / np.linalg.norm(pe - pa)
        own = ((B["jo"] == idx[m]) | (B["jo"] == idx[a])) & (B["we"] > 0.5)
        s = v[own.any(1) & (np.abs((v - line) @ d) < 0.012) & (np.linalg.norm(v - line, axis=1) < 0.14)]
        if len(s) >= 10:
            c = s.mean(0); c -= d * ((c - line) @ d)
            new = c + d * ((pm - line) @ d)
            how = "centre"
        else:
            ha, hm, he = HP[Hi[a]], HP[Hi[m]], HP[Hi[e]]
            hl1, hl2 = np.linalg.norm(hm - ha), np.linalg.norm(he - hm)
            hoff = HF @ (hm - (ha + (he - ha) * hl1 / (hl1 + hl2))) / np.linalg.norm(he - ha)
            new = line + F.T @ hoff * np.linalg.norm(pe - pa)
            how = "line"
        mv = np.linalg.norm(new - pm)
        if 0.005 < mv < 0.6 * l1:
            P[idx[m]] = new; rec["moved"][m] = [round(mv * 100, 1), how]
    # 2. The rest: the skeleton as bound, joints at their new places; then each limb bone turned to point as hers does
    # (rest only: the mesh stays bound as it was, so the game draws it turned, as it would have on her first frame).
    RW = RB.copy(); PW = P.copy()
    kids = {j: [c for c in range(len(names)) if _under(parent, c, j)] for j in range(len(names))}
    Hd = bone_dirs(HP, Hi, HF)
    feet = [idx[f] for f in ("LeftToeBase", "RightToeBase", "LeftFoot", "RightFoot") if f in idx]
    foot0 = min(PW[f, 1] for f in feet)
    if swing:
        for a, b in SWING:
            j, c = idx[a], idx[b]
            cur = PW[c] - PW[j]; cur /= np.linalg.norm(cur)
            tgt = F.T @ Hd[a]
            ang = float(np.degrees(np.arccos(np.clip(cur @ tgt, -1, 1))))
            if ang < MIN_SWING: continue
            ax = np.cross(cur, tgt); ax /= np.linalg.norm(ax)
            th = np.radians(min(ang, MAX_SWING))
            K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
            S = np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K
            RW[j] = S @ RW[j]
            for d in kids[j]:
                RW[d] = S @ RW[d]; PW[d] = PW[j] + S @ (PW[d] - PW[j])
            rec["swing"][a] = round(min(ang, MAX_SWING), 1)
    # Feet back on the ground: the whole rest lifted or dropped by what the legs' turn did to the lowest foot joint.
    foot1 = min(PW[f, 1] for f in feet)
    PW[:, 1] += foot0 - foot1
    rec["lift"] = round(float(foot0 - foot1) * 100, 1)
    rec["drift"] = round(drift, 4)
    # 3. Written into the GLB: inverse binds (same turns, new places), rests (each joint from its parent).
    ibm = B["ibm"]
    for i in range(len(names)):
        M = np.eye(4); M[:3, :3] = RB[i]; M[:3, 3] = P[i]
        ibm[i] = np.linalg.inv(M).T.reshape(16).astype(np.float32)
    nodes = js["nodes"]; J = js["skins"][0]["joints"]
    for i in range(len(names)):
        p = parent[i]
        if p < 0:
            Rl, Tl = RW[i], PW[i]
        else:
            Rl = RW[p].T @ RW[i]; Tl = RW[p].T @ (PW[i] - PW[p])
        q = mat_q(Rl); q /= np.linalg.norm(q)
        nd = nodes[J[i]]
        nd["rotation"] = [float(v) for v in q]
        nd["translation"] = [float(v) for v in Tl]
        nd.pop("scale", None)
    js.setdefault("asset", {}).setdefault("extras", {})["rigfit"] = rec
    if write:
        save(B)
    return rec


def save(B):
    js, data, jl = B["js"], B["data"], B["jl"]
    txt = json.dumps(js, separators=(",", ":")).encode(); txt += b" " * (-len(txt) % 4)
    rest = bytes(data[20 + jl:])
    open(B["path"], "wb").write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(txt) + len(rest)) + struct.pack("<II", len(txt), 0x4E4F534A) + txt + rest)


# ---- Seeing it in Blender: a body posed by a clip as a plain mesh (Y up to Z up), for look() ----

def show(k, clip="run", t=0.3, name=None, x=0.0, B=None, arm_out=0.0, arm_fwd=0.0):
    import bpy
    B = B or body(k); rig = Rig(B)
    M, _ = rig.pose(clip, t, arm_out, arm_fwd)
    V = rig.skin(M)
    V = np.stack([V[:, 0] + x, -V[:, 2], V[:, 1]], 1)
    Fc = faces(B)
    me = bpy.data.meshes.new(name or f"{k}_{clip}")
    me.from_pydata(V.tolist(), [], Fc.tolist())
    ob = bpy.data.objects.new(me.name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


# ---- An upright run, baked from her jog ----
# Her jog (UAL's Jog_Fwd_Loop laid on her) drops the hips a fifth of their height and leans the trunk well forward, and her
# run is her own hunched old-witch scuttle: carried onto a grown body, either reads as a crouching dash. This makes a run
# that stands up: the hips' dip cut to DIP of hers, the legs solved again (two bones, each knee in its own plane) so the
# feet land where hers did, and the trunk's forward lean cut to LEAN of hers, the arms riding on the chest as they were.

def _rot_axis(ax, th):
    ax = ax / np.linalg.norm(ax)
    K = np.array([[0, -ax[2], ax[1]], [ax[2], 0, -ax[0]], [-ax[1], ax[0], 0]])
    return np.eye(3) + np.sin(th) * K + (1 - np.cos(th)) * K @ K


def upright(src="jog", dip=0.35, lean=0.45, plant=0.8, narrow=(1.0, 1.0)):
    """narrow: the feet brought in under the hips, (across, fore and aft) as shares of where the clip has them: the
    library's standing clips stand like a brawler, feet 30 cm apart and one 24 cm ahead of the other."""
    C = clips(); meta = C["meta"]; sk = meta["skeleton"]; c = meta["clips"][src]
    par = [j["parent"] for j in sk]; T = np.array([j["t"] for j in sk], np.float64)
    HP, Hi = hers(); HF = body_frame(HP, Hi); right, up, fwd = HF
    hip = Hi["Hips"]; rest_y = T[hip, 1]
    n = c["frames"]; out_r = np.zeros((n, len(sk), 4)); out_h = np.zeros((n, 3))
    for f in range(n):
        rot, h = sample(src, c["dur"] * min(f / (n - 1), 1 - 1e-6))
        rot = rot.copy()
        T0 = T.copy(); T0[hip] = h
        WR0, WT0 = fk_rest(par, T0, rot)
        # The hips up.
        h2 = h.copy(); h2[1] = rest_y - (rest_y - h[1]) * dip
        # The trunk back: the chest's lean forward (in her sagittal plane) cut to `lean` of itself, turned at the Spine.
        sp, ch = Hi["Spine"], Hi["Spine2"]
        tr = WT0[ch] - WT0[hip]
        pitch = np.arctan2(tr @ fwd, tr @ up)
        if pitch > 0:
            S = _rot_axis(right, -pitch * (1 - lean))
            # The head keeps looking ahead: what the trunk gave back is handed on to the neck the other way.
            Wp = qmat(WR0[par[sp]]); Ws = qmat(WR0[sp])
            rot[sp] = mat_q(Wp.T @ S @ Ws)
            nk = Hi["Neck"]
            if nk is not None:
                Wn_new = S @ qmat(WR0[nk])
                Wnp_new = S @ qmat(WR0[par[nk]])
                rot[nk] = mat_q(Wnp_new.T @ _rot_axis(right, pitch * (1 - lean) * 0.6) @ Wn_new)
        T1 = T.copy(); T1[hip] = h2
        WR1, WT1 = fk_rest(par, T1, rot)
        # Her jog spends most of its stride with both feet up and the knees tucked: the lower foot is brought down to the
        # ground (`plant` of the way), the other with it, and the legs reach for them.
        feet = [WT0[Hi["LeftFoot"]], WT0[Hi["RightFoot"]]]
        drop = max(0.0, min(f_[1] for f_ in feet) - HP[Hi["LeftFoot"]][1]) * plant
        # Each leg solved again for the foot where it was.
        for side in ("Left", "Right"):
            a, k_, ft = Hi[side + "UpLeg"], Hi[side + "Leg"], Hi[side + "Foot"]
            L1 = np.linalg.norm(T[k_]); L2 = np.linalg.norm(T[ft])
            Hp = WT1[a]; Ft = WT0[ft] - up * drop
            off = Ft - WT0[hip]
            Ft = Ft - right * (off @ right) * (1 - narrow[0]) - fwd * (off @ fwd) * (1 - narrow[1])
            d = Ft - Hp; dl = np.linalg.norm(d)
            dl2 = min(dl, (L1 + L2) * 0.999); dn = d / dl
            Ft2 = Hp + dn * dl2
            # The knee's side: where her knee was off the hip-foot line.
            K0 = WT0[k_] - WT0[a]
            pole = K0 - dn * (K0 @ dn)
            pole = pole / np.linalg.norm(pole) if np.linalg.norm(pole) > 1e-5 else fwd
            x = (L1 * L1 - L2 * L2 + dl2 * dl2) / (2 * dl2)
            y = np.sqrt(max(L1 * L1 - x * x, 0))
            K = Hp + dn * x + pole * y
            # Upper leg: its bone (to the knee) turned onto the new knee.
            Wa = qmat(WR1[a]); cur = Wa @ T[k_]
            Wa2 = rot_between(cur, K - Hp) @ Wa
            rot[a] = mat_q(qmat(WR1[par[a]]).T @ Wa2)
            Wk = Wa2 @ qmat(rot[k_]); cur = Wk @ T[ft]
            Wk2 = rot_between(cur, Ft2 - K) @ Wk
            rot[k_] = mat_q(Wa2.T @ Wk2)
            # The foot keeps its turn in the world.
            rot[ft] = mat_q(Wk2.T @ qmat(WR0[ft]))
        for j in range(len(sk)):
            q = rot[j] / np.linalg.norm(rot[j])
            if f and q @ out_r[f - 1, j] < 0: q = -q
            out_r[f, j] = q
        out_h[f] = h2
    return out_r, out_h


def add_clip(name, R, H, like="jog"):
    """Packs (or packs again) a clip into clips.json / clips.bin: rotations appended to the int16 part, the hips' path to the
    float part; everything already there keeps its offsets."""
    C = clips(); meta = C["meta"]
    rot = C["rot"].copy(); hips = C["hips"].copy()
    n, J = R.shape[0], R.shape[1]
    tracks = []; extra = []
    base = len(rot)
    for j in range(J):
        q = R[:, j, :]
        if np.abs(q - q[0]).max() < 1e-4:
            tracks.append([j, base + sum(len(e) for e in extra), 1]); extra.append(np.round(q[0] * 32767).astype(np.int16))
        else:
            tracks.append([j, base + sum(len(e) for e in extra), 0]); extra.append(np.round(q.reshape(-1) * 32767).astype(np.int16))
    rot = np.concatenate([rot] + extra)
    hoff = len(hips); hips = np.concatenate([hips, H.reshape(-1).astype(np.float32)])
    src = meta["clips"][like]
    meta["clips"][name] = {"frames": n, "dur": src["dur"], "loop": src["loop"], "hips": hoff, "travel": src["travel"], "src": f"{src['src']} upright (tools/folk/rig_fit.py)", "tracks": tracks}
    if len(rot) % 2: rot = np.concatenate([rot, np.zeros(1, np.int16)])
    meta["hipsByteOffset"] = len(rot) * 2
    open(os.path.join(FOLK, "clips.bin"), "wb").write(rot.tobytes() + hips.tobytes())
    _CLIPS.clear()
    js = json.dumps(meta, separators=(",", ":"))
    open(os.path.join(FOLK, "clips.json"), "w").write(js)


# ---- A body's skin and feet in her clips ----

def stretch(k, clip_names=("walk", "run_up", "idle", "fold_arms"), n=3, arm_out=0.0, B=None, over=1.8):
    """How far a body's skin is pulled about in the clips: the share of its edges more than `over` times their bind length
    (per cent), the longest pull, and which joints those edges mostly follow. A joint put in the wrong place, or verts
    that follow the wrong joint, show up here as a web of long edges."""
    B = B or body(k); rig = Rig(B); F = faces(B)
    E = np.unique(np.sort(np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]]), axis=1), axis=0)
    v0 = B["pos"].astype(np.float64); l0 = np.linalg.norm(v0[E[:, 0]] - v0[E[:, 1]], axis=1)
    ok = l0 > 0.004
    worst = 0.0; share = 0.0; who = {}
    names = [x.split(":")[-1] for x in rig.names]
    for c in clip_names:
        dur = clips()["meta"]["clips"][c]["dur"]
        for f in range(n):
            M, _ = rig.pose(c, dur * (f + 0.5) / n, arm_out); V = rig.skin(M)
            r = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1) / np.maximum(l0, 1e-9)
            bad = ok & (r > over)
            share = max(share, float(bad.mean()) * 100); worst = max(worst, float(r[ok].max()))
            for e in E[bad][:400]:
                j = names[int(B["jo"][e[0], int(np.argmax(B["we"][e[0]]))])]
                who[j] = who.get(j, 0) + 1
    top = sorted(who.items(), key=lambda x: -x[1])[:3]
    return round(share, 2), round(worst, 1), top


def ground(k, clip_names=("idle", "walk", "idle_ual_up"), n=4, B=None):
    """Where a body's lowest point comes in the clips, against where it is at rest (cm; + floats, - sinks): the game sets
    a body on the ground by its rest, and scales the hips' travel by its hips' height."""
    B = B or body(k); rig = Rig(B)
    names, parent, T, R = skeleton(B["js"])
    # (At rest: every joint by its rest, the skin as bound.)
    WR, WT = fk_rest(parent, T, R)
    M = np.zeros((len(names), 4, 4))
    for j in range(len(names)):
        W = np.eye(4); W[:3, :3] = qmat(WR[j]); W[:3, 3] = WT[j]; M[j] = W @ rig.ibm[j]
    y0 = float(rig.skin(M)[:, 1].min())
    out = {}
    for c in clip_names:
        dur = clips()["meta"]["clips"][c]["dur"]
        lo = min(float(rig.skin(rig.pose(c, dur * f / n)[0])[:, 1].min()) for f in range(n))
        out[c] = round((lo - y0) * 100, 1)
    return round(y0 * 100, 1), out
