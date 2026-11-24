"""The cloth under a hero's back shield, pinned to it: python tools/heroes/backpin.py [ids...] [--dry] (in Blender, or anywhere).

A shield on the back rides the chest (Hero.propMatrices, slot 2: rigid on spine_03), but a cloak or a skirt under it
follows the hips and the thighs: every stride, every blow, the cloth swung out through the shield (paladin_m1: up to 30
centimetres through it running, 15 standing armed). Strapped on over a cloak, a shield presses it flat and carries it.
So here, for every body that carries a shield on its back (kit.json), from the game's own placing of it (a frame of
tools/heroes/posedump.mjs, any one: the shield is rigid on the chest):

  - each cloth vertex of the back (its piece's kind cloth) under the shield's face is given to spine_03 as the shield is,
    fully under the face and less toward its rim (EDGE past it, nothing);
  - what lies through the shield's inner face at rest is pressed back just inside it (PRESS behind the face), along the
    shield's own thickness: no more than it lies through, and nothing anywhere else.

Plates, mail, skin and the skeleton are untouched; a second run changes nothing.

And with --probes (python tools/heroes/backpin.py --probes [ids...]): the cloth that still comes through it as he moves,
the hem of a cloak swung by the thighs past the pin's reach, a dozen of its vertices at most, written into the body's
scene extras as `backProbes` (bind place, joints and weights as the GPU skins them, and the shield's inner face behind
each). Hero.poseBack skins those few each frame and swings the shield out from its top strap as far as they need, so
nothing of the cloak is ever seen through it. Picked from posedump frames of everything that swings the cloak (PROBE_MOVES).
"""
import json
import os
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)
from fingers import Glb, HEROES, ROOT  # noqa: E402

EDGE = 0.07       # past the shield's rim, how far the pin fades out
PRESS = 0.012     # how far behind the inner face cloth is pressed
DEEP = 0.16       # how far in from the inner face cloth still counts as under it (the back's cloth, not the chest's)
CELL = 0.015
SHOWS = 0.04      # past the shield's outer face, how far cloth over it still reads as through it
PROBES = 32       # cloth vertices at most that swing the shield (backProbes)
PROBE_GAP = 0.06  # and no two nearer than this at rest
PROBE_KEEP = 0.02   # how near its outer (painted) face a probe may come before the shield swings: inside the board it's hidden
PROBE_LEVER = 0.3   # and none nearer its top strap than this: a swing there moves its face too little to help
PROBE_RIM = 0.035   # nor within this of its rim: the cloak tucked round a thin rim is a seam, not a swing's work
PROBE_MOVES = "armed,run,sprint,blow,blow1,blow2,guard"


def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def shield_points(path):
    g = Glb(path)
    out = []
    for m in g.json["meshes"]:
        for pr in m["primitives"]:
            P, _ = g.read(pr["attributes"]["POSITION"])
            out.append(P.astype(np.float64))
    return np.concatenate(out)


def frame_of(hid, frames_dir):
    """The body at ease with its arms in hand (posedump 'armed'): the shield as near the back as it ever rides (a stowed
    weapon pushes it out from there, Hero.stowPush), so cloth inside it here is inside it always."""
    p = os.path.join(frames_dir, hid + ".json")
    if not os.path.exists(p):
        raw = subprocess.run(["node", os.path.join(HERE, "posedump.mjs"), hid, "armed", "--frames=1"], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout
        open(p, "w").write(raw)
    return json.load(open(p))["frames"][0]


def qmul(a, b):
    x1, y1, z1, w1 = np.moveaxis(a, -1, 0)
    x2, y2, z2, w2 = np.moveaxis(b, -1, 0)
    return np.stack([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
                     w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2], -1)


def qrot(q, v):
    u = q[..., :3]
    w = q[..., 3:4]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


def mat_to_quat(m):
    tr = m[0, 0] + m[1, 1] + m[2, 2]
    if tr > 0:
        s = np.sqrt(tr + 1) * 2
        return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s])
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]]))
    if i == 0:
        s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2
        return np.array([0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s])
    if i == 1:
        s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2
        return np.array([(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s])
    s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2
    return np.array([(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s])


CONJ = np.array([-1.0, -1.0, -1.0, 1.0])


class Body:
    """A hero's mesh as the game skins it (dual quaternions, src/gfx/shaders.js), for posing at a frame of posedump."""

    def __init__(self, hid, path=None):
        self.g = g = Glb(path or os.path.join(HEROES, hid + ".glb"))
        j = g.json
        skin = j["skins"][0]
        self.names = [j["nodes"][n]["name"] for n in skin["joints"]]
        ibm, _ = g.read(skin["inverseBindMatrices"])
        self.ibm = ibm.reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64)
        self.ibq = np.array([mat_to_quat(m[:3, :3]) for m in self.ibm])
        self.ibt = self.ibm[:, :3, 3].copy()
        self.prims = []
        pieces = j["scenes"][0].get("extras", {}).get("pieces", [])
        for mi, mesh in enumerate(j["meshes"]):
            for pi, prim in enumerate(mesh["primitives"]):
                at = prim["attributes"]
                P, _ = g.read(at["POSITION"])
                J, _ = g.read(at["JOINTS_0"])
                Wr, wa = g.read(at["WEIGHTS_0"])
                unit = {5121: 255.0, 5123: 65535.0}.get(wa["componentType"], 1.0)
                cloth = np.zeros(len(P), bool)
                for pc in pieces:
                    if pc.get("kind") == "cloth" and pc.get("mesh", 0) == mi and pc.get("prim", 0) == pi:
                        cloth[pc["vstart"]:pc["vstart"] + pc["vcount"]] = True
                self.prims.append(dict(at=at, P=P.astype(np.float64), J=J.astype(np.int64), W=Wr.astype(np.float64) / unit,
                                       unit=unit, cloth=cloth))

    def joints_at(self, fr):
        """Each joint's dual quaternion (world x inverse bind) at a frame."""
        at = {n: i for i, n in enumerate(fr["names"])}
        FQ = np.asarray(fr["wq"], np.float64).reshape(-1, 4)
        FT = np.asarray(fr["wt"], np.float64).reshape(-1, 3)
        wq = np.array([FQ[at[n]] for n in self.names])
        wt = np.array([FT[at[n]] for n in self.names])
        sq = qmul(wq, self.ibq)
        st = qrot(wq, self.ibt) + wt
        dq = 0.5 * qmul(np.concatenate([st, np.zeros((len(st), 1))], 1), sq)
        return sq, dq

    @staticmethod
    def blend(J, W, sq, dq):
        r = sq[J]
        d = dq[J]
        sign = np.sign(np.einsum("vk,vjk->vj", r[:, 0], r))
        sign[sign == 0] = 1
        w = W * sign
        br = np.einsum("vj,vjk->vk", w, r)
        bd = np.einsum("vj,vjk->vk", w, d)
        L = np.linalg.norm(br, axis=1, keepdims=True)
        return br / L, bd / L

    @staticmethod
    def apply(br, bd, P):
        return qrot(br, P) + 2 * qmul(bd, br * CONJ)[:, :3]

    @staticmethod
    def unapply(br, bd, X):
        return qrot(br * CONJ, X - 2 * qmul(bd, br * CONJ)[:, :3])


def shield_space(fr, kit):
    """The back shield as the game hangs it in a frame (world): its own space, and its inner face as a grid."""
    M = np.asarray(fr["props"][2]["m"], np.float64).reshape(4, 4).T
    if not np.any(M[:3, :3]):
        return None
    SP = shield_points(os.path.join(HEROES, "kit", kit["back"] + ".glb"))
    c0 = SP.mean(0)
    ev, U = np.linalg.eigh(np.cov((SP - c0).T))
    ax = np.stack([U[:, 2], U[:, 1], U[:, 0]])        # along, across, thickness (the shield's own model space)
    scale = np.linalg.norm(M[:3, 0])
    toShield = np.linalg.inv(M)
    # The body's side of the shield: where the chest's joint is.
    k = fr["names"].index("spine_03")
    sb = toShield @ np.r_[fr["wt"][k * 3:k * 3 + 3], 1]
    if (sb[:3] - c0) @ ax[2] < 0:
        ax[2] = -ax[2]                                 # thickness axis now points toward the body
    loc = (SP - c0) @ ax.T * scale                     # metres; loc[:, 2] grows toward the body
    gi = np.floor(loc[:, :2] / CELL).astype(int)
    lo = gi.min(0) - 8
    dims = gi.max(0) - lo + 9
    face = np.full(dims, -np.inf)                      # the inner face: the shield's point nearest the body, per cell
    back = np.full(dims, np.inf)                       # and the outer: its point farthest out
    for (a, b), d in zip(gi - lo, loc[:, 2]):
        face[a, b] = max(face[a, b], d)
        back[a, b] = min(back[a, b], d)
    cov = np.isfinite(face)
    # Each cell's nearest covered cell (no scipy in Blender): its face, beyond the rim, and how far off the rim it is
    # (a sparse sculpt's cells with no vertex of their own, a cell and a half from one, count as covered).
    cells = np.stack(np.meshgrid(np.arange(dims[0]), np.arange(dims[1]), indexing="ij"), -1).reshape(-1, 2)
    have = np.argwhere(cov)
    d2 = ((cells[:, None, :] - have[None, :, :]) ** 2).sum(-1)
    near = have[d2.argmin(1)]
    dist = np.sqrt(d2.min(1)).reshape(dims)
    face = face[near[:, 0], near[:, 1]].reshape(dims)
    thick = (face - back)[near[:, 0], near[:, 1]].reshape(dims)
    rim = np.maximum(dist - 1.5, 0) * CELL
    return dict(M=M, toShield=toShield, c0=c0, ax=ax, scale=scale, lo=lo, dims=dims, face=face, thick=thick, rim=rim)


def measure(Z, X, want_thick=False):
    """For world points X: how far past the shield's rim (0 under it), and how far through its inner face (> 0: through,
    toward the outside)."""
    S = (np.c_[X, np.ones(len(X))] @ Z["toShield"].T)[:, :3]
    L = (S - Z["c0"]) @ Z["ax"].T * Z["scale"]
    ii = np.floor(L[:, :2] / CELL).astype(int) - Z["lo"]
    inb = (ii[:, 0] >= 0) & (ii[:, 1] >= 0) & (ii[:, 0] < Z["dims"][0]) & (ii[:, 1] < Z["dims"][1])
    iic = np.clip(ii, 0, np.array(Z["dims"]) - 1)
    rim = np.where(inb, Z["rim"][iic[:, 0], iic[:, 1]], 1e9)
    through = Z["face"][iic[:, 0], iic[:, 1]] - L[:, 2]
    if want_thick:
        return rim, through, Z["thick"][iic[:, 0], iic[:, 1]]
    return rim, through


def through_report(hid, frames, path=None):
    """Cloth through the back shield, frame by frame: (cloth vertices under its face more than a centimetre through its
    inner face, the most any is through in cm)."""
    kit = json.load(open(os.path.join(HEROES, "kit.json")))["heroes"].get(hid, {})
    B = Body(hid, path)
    out = []
    for fr in frames:
        Z = shield_space(fr, kit)
        if Z is None or fr["props"][2]["id"] != kit.get("back"):
            out.append(None)
            continue
        sq, dq = B.joints_at(fr)
        n, worst = 0, 0.0
        for pr in B.prims:
            c = pr["cloth"]
            if not c.any():
                continue
            br, bd = Body.blend(pr["J"][c], pr["W"][c], sq, dq)
            X = Body.apply(br, bd, pr["P"][c])
            rim, th, tk = measure(Z, X, True)
            # (Through it: in the shield, or out past it by no more than SHOWS. Cloth farther out than that is hanging
            # clear of it, as a cloak's hem does below a shield tipped back.)
            m = (rim <= 0) & (th > 0.01) & (th < tk + SHOWS)
            n += int(m.sum())
            if m.any():
                worst = max(worst, float(th[m].max()) * 100)
        out.append((n, round(worst, 1)))
    return out


def pin_strength(hid, frames_dir=None):
    """How firmly pin() holds each vertex of the body to the chest (0 to 1, the first primitive's vertices), as it
    would now: tools/heroes/relax.py holds those still while it eases the cloth round them."""
    kit = json.load(open(os.path.join(HEROES, "kit.json")))["heroes"].get(hid, {})
    if not kit.get("back"):
        return None
    fr = frame_of(hid, frames_dir or os.path.join(ROOT, "tools", "build", "h3", "pose", "armed"))
    Z = shield_space(fr, kit)
    if Z is None:
        return None
    B = Body(hid)
    sq, dq = B.joints_at(fr)
    pr = B.prims[0]
    br, bd = Body.blend(pr["J"], pr["W"], sq, dq)
    rim, through = measure(Z, Body.apply(br, bd, pr["P"]))
    t = np.clip(1 - rim / EDGE, 0, 1)
    return np.where(pr["cloth"] & (rim < EDGE) & (through > -DEEP), t * t * (3 - 2 * t), 0.0)


def pin(hid, frames_dir, dry=False):
    """Pins the cloth under the back shield to the chest, at the game's own standing pose (frame_of): the cloth
    stands where it stood (pressed inside the shield where it lay through), each vertex's rest worked back through its
    new weights, so from there on it rides with the shield."""
    kit = json.load(open(os.path.join(HEROES, "kit.json")))["heroes"].get(hid, {})
    if not kit.get("back"):
        return None
    fr = frame_of(hid, frames_dir)
    Z = shield_space(fr, kit)
    if Z is None:
        return None
    B = Body(hid)
    g, j = B.g, B.g.json
    s3 = B.names.index("spine_03")
    sq, dq = B.joints_at(fr)
    took = pressed = 0
    worst = 0.0
    changed = False
    for pr in B.prims:
        if not pr["cloth"].any():
            continue
        P, J, Wt, cloth = pr["P"], pr["J"], pr["W"], pr["cloth"]
        br, bd = Body.blend(J, Wt, sq, dq)
        X = Body.apply(br, bd, P)
        rim, through = measure(Z, X)
        under = cloth & (rim < EDGE) & (through > -DEEP)
        t = np.clip(1 - rim / EDGE, 0, 1)
        p = np.where(under, t * t * (3 - 2 * t), 0.0)
        # (A second run: what's already given to the chest as much as this would give it is left as it is.)
        s3w = np.where(J == s3, Wt, 0).sum(1)
        p = np.where(s3w >= p - 0.01, 0.0, p)
        push = (p > 0) & (rim <= 0) & (through > -PRESS)
        Xn = X.copy()
        if push.any():
            worst = max(worst, float(through[push].max()))
            Mw = Z["M"][:3, :3] @ Z["ax"][2]
            Mw /= np.linalg.norm(Mw)                   # toward the body, in the world
            Xn[push] += ((through[push] + PRESS))[:, None] * Mw[None, :]
            pressed += int(push.sum())
        Jn, Wn = J.copy(), Wt.copy()
        idx = np.nonzero(p > 1e-3)[0]
        for v in idx:
            w = {}
            for q in range(4):
                if Wt[v, q] > 0:
                    w[int(J[v, q])] = w.get(int(J[v, q]), 0) + Wt[v, q] * (1 - p[v])
            w[s3] = w.get(s3, 0) + p[v]
            top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
            tot = sum(x for _, x in top) or 1
            Jn[v], Wn[v] = 0, 0
            for q, (jj, x) in enumerate(top):
                Jn[v, q], Wn[v, q] = jj, x / tot
        took += len(idx)
        if not len(idx):
            continue
        # The weights as they'll be stored, then each moved vertex's rest worked back from where it stands.
        if pr["unit"] != 1.0:
            Q = np.floor(Wn * pr["unit"] + 0.5)
            Q[np.arange(len(Q)), Q.argmax(axis=1)] += pr["unit"] - Q.sum(axis=1)
            Wn = Q / pr["unit"]
        nb, nd = Body.blend(Jn[idx], Wn[idx], sq, dq)
        Pn = P.copy()
        Pn[idx] = Body.unapply(nb, nd, Xn[idx])
        pr.update(Pn=Pn, Jn=Jn, Wn=Wn)
        changed = True
    if dry or not changed:
        return dict(pinned=took, pressed=pressed, worst_cm=round(worst * 100, 1))
    for pr in B.prims:
        if "Pn" not in pr:
            continue
        at = pr["at"]
        a = j["accessors"][at["POSITION"]]
        a["min"] = [float(x) for x in np.minimum(np.array(a["min"]), pr["Pn"].min(0))]
        a["max"] = [float(x) for x in np.maximum(np.array(a["max"]), pr["Pn"].max(0))]
        g.write(at["POSITION"], pr["Pn"].astype(np.float32))
        g.write(at["JOINTS_0"], pr["Jn"])
        g.write(at["WEIGHTS_0"], pr["Wn"] * pr["unit"] if pr["unit"] != 1.0 else pr["Wn"])
    save_with_json(g)
    return dict(pinned=took, pressed=pressed, worst_cm=round(worst * 100, 1))


def probes(hid, frames, dry=False):
    """The cloth vertices that come nearest through the shield's outer face over these frames (each scored by the most
    it comes past PROBE_KEEP inside it; cloth inside the board is hidden by it), PROBES of them at most, PROBE_GAP apart
    at rest, none within PROBE_LEVER of the top strap; written to the scene extras as backProbes: {p: bind places,
    j: skin joints (4 each), w: weights, face: the depth (in the shield's own frame, metres, +z toward him) each must
    stay behind}. None if it carries no shield on its back; nothing written if none come near it."""
    kit = json.load(open(os.path.join(HEROES, "kit.json")))["heroes"].get(hid, {})
    if not kit.get("back"):
        return None
    B = Body(hid)
    SP = shield_points(os.path.join(HEROES, "kit", kit["back"] + ".glb"))
    use = [f for f in frames if f["props"][2]["id"] == kit["back"] and np.any(np.asarray(f["props"][2]["m"][:12]))]
    if not use:
        return None
    M0 = np.asarray(use[0]["props"][2]["m"], np.float64).reshape(4, 4).T
    scale = np.linalg.norm(M0[:3, 0])
    S = SP * scale                                    # the shield in its own frame, metres
    gi = np.floor(S[:, :2] / CELL).astype(int)
    lo = gi.min(0) - 2
    dims = gi.max(0) - lo + 3
    face = np.full(dims, np.inf)                      # the outer face: the shield's point farthest from him, per cell
    for (a, b), z in zip(gi - lo, S[:, 2]):
        face[a, b] = min(face[a, b], z)
    cov = np.isfinite(face)
    cells = np.stack(np.meshgrid(np.arange(dims[0]), np.arange(dims[1]), indexing="ij"), -1).reshape(-1, 2)
    have = np.argwhere(cov)
    d2 = ((cells[:, None, :] - have[None, :, :]) ** 2).sum(-1)
    near = have[d2.argmin(1)]
    under = (np.sqrt(d2.min(1)) <= 1.5).reshape(dims)
    face = face[near[:, 0], near[:, 1]].reshape(dims)
    hy0 = float(S[:, 1].min()); hdy = 0.03
    hhalf = np.zeros(int(np.ceil((S[:, 1].max() - hy0) / hdy)) + 1)
    for (x, y) in S[:, :2]:
        b = int((y - hy0) / hdy)
        hhalf[b] = max(hhalf[b], abs(x))
    best = []                                         # per prim: each cloth vertex's worst (most past the face), and the face there
    for pr in B.prims:
        n = int(pr["cloth"].sum())
        best.append([np.full(n, -np.inf), np.full(n, -np.inf)])
    for f in use:
        M = np.asarray(f["props"][2]["m"], np.float64).reshape(4, 4).T
        R = M[:3, :3] / scale
        T = M[:3, 3]
        # (The swing the frame was drawn with is taken back out, about its top strap: the probes are what drives it.)
        if f.get("bs"):
            x = R[:, 0]
            a = -f["bs"]
            K = np.array([[0, -x[2], x[1]], [x[2], 0, -x[0]], [-x[1], x[0], 0]])
            Q = np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * K @ K
            O = T + R[:, 1] * f["bt"]
            R = Q @ R
            T = O + Q @ (T - O)
        sq, dq = B.joints_at(f)
        for k, pr in enumerate(B.prims):
            c = pr["cloth"]
            if not c.any():
                continue
            br, bd = Body.blend(pr["J"][c], pr["W"][c], sq, dq)
            X = Body.apply(br, bd, pr["P"][c])
            L = (X - T) @ R
            ii = np.floor(L[:, :2] / CELL).astype(int) - lo
            inb = (ii[:, 0] >= 0) & (ii[:, 1] >= 0) & (ii[:, 0] < dims[0]) & (ii[:, 1] < dims[1])
            ii = np.clip(ii, 0, dims - 1)
            hb = np.clip(((L[:, 1] - hy0) / hdy).astype(int), 0, len(hhalf) - 1)
            ok = inb & under[ii[:, 0], ii[:, 1]] & (L[:, 2] > face[ii[:, 0], ii[:, 1]] - 0.12) & (f.get("bt", 0.5) - L[:, 1] >= PROBE_LEVER) & (np.abs(L[:, 0]) < hhalf[hb] - PROBE_RIM)
            fz = face[ii[:, 0], ii[:, 1]] + PROBE_KEEP
            past = np.where(ok, fz - L[:, 2], -np.inf)
            b = best[k]
            up = past > b[0]
            b[0][up] = past[up]
            b[1] = np.where(ok, np.maximum(b[1], fz), b[1])
    cand = []
    for k, pr in enumerate(B.prims):
        idx = np.flatnonzero(pr["cloth"])
        for v, sc, fz in zip(idx, best[k][0], best[k][1]):
            if sc > 0:
                cand.append((float(sc), k, int(v), float(fz)))
    cand.sort(reverse=True)
    pick = []
    for sc, k, v, fz in cand:
        p = B.prims[k]["P"][v]
        if all(np.linalg.norm(p - B.prims[k2]["P"][v2]) >= PROBE_GAP for _, k2, v2, _ in pick):
            pick.append((sc, k, v, fz))
        if len(pick) >= PROBES:
            break
    # (And the shield's outline, as its half width at each height of it in its own frame: a probe counts only while it's
    # under the shield, not hanging beside it or below its point.)
    out = dict(p=[], j=[], w=[], face=[], y0=round(hy0, 4), dy=hdy, half=[round(float(h) - PROBE_RIM, 4) for h in hhalf])
    for sc, k, v, fz in pick:
        pr = B.prims[k]
        out["p"] += [round(float(x), 5) for x in pr["P"][v]]
        out["j"] += [int(x) for x in pr["J"][v]]
        out["w"] += [round(float(x), 4) for x in pr["W"][v]]
        out["face"].append(round(fz, 4))
    if not dry:
        ex = B.g.json["scenes"][0].setdefault("extras", {})
        if pick:
            ex["backProbes"] = out
        else:
            ex.pop("backProbes", None)
        save_with_json(B.g)
    return dict(probes=len(pick), worst_cm=round(pick[0][0] * 100, 1) if pick else 0)


def save_with_json(g):
    """The GLB written again with its JSON as it now is (bounds changed), the binary chunk as it was."""
    import struct
    raw = bytes(g.raw)
    jl = struct.unpack("<I", raw[12:16])[0]
    rest = raw[20 + jl:]                               # the BIN chunk, header and all
    js = json.dumps(g.json, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + len(rest)) + struct.pack("<II", len(js), 0x4E4F534A) + js + rest
    open(g.path, "wb").write(out)


if __name__ == "__main__":
    fd = os.path.join(ROOT, "tools", "build", "h3", "pose", "armed")
    os.makedirs(fd, exist_ok=True)
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    if "--probes" in sys.argv:
        md = os.path.join(ROOT, "tools", "build", "h3", "pose", "probe")
        os.makedirs(md, exist_ok=True)
        kits = json.load(open(os.path.join(HEROES, "kit.json")))["heroes"]
        for i in ids:
            if not kits.get(i, {}).get("back"):
                continue
            p = os.path.join(md, i + ".json")
            if not os.path.exists(p):
                raw = subprocess.run(["node", os.path.join(HERE, "posedump.mjs"), i, PROBE_MOVES, "--frames=10"], cwd=ROOT,
                                     capture_output=True, text=True, check=True).stdout
                open(p, "w").write(raw)
            print(i, probes(i, json.load(open(p))["frames"], dry="--dry" in sys.argv), flush=True)
        sys.exit(0)
    for i in ids:
        print(i, pin(i, fd, dry="--dry" in sys.argv))
