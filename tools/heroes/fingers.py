"""Gives the heroes' hands fingers that can shut: binds each finger's vertices to that finger's own joints.

The armour tool bound every hand whole to its wrist, so a hand was always the open hand it was modelled as, whatever it
held: a knife lay along a flat palm, a shield's grip had four straight fingers past its rim. The skeleton has the finger
joints, and they lie along the modelled fingers. This rebinds only: no vertex moves, and a hand at rest is as it was.

For each hand: every vertex that follows the wrist and lies along a finger (past its knuckle, within a finger's
thickness of its bones) is given to that finger's three joints by how far along the finger it is, eased across each
joint. Then the thumb: what lies along its bones (nearer them than any finger's, or the index's own bone in the palm) goes
to its three joints the same way, the ball of the thumb only partly, so it swells and folds with the thumb as it crosses
the palm instead of the palm tearing. The palm, the back of the hand and the cuff stay on the wrist. A second run changes
nothing.

    python tools/heroes/fingers.py [ids...]      (after build.py, rebind.py and mail.py; all 44 with no ids)

The game shuts them (`shutHand` in src/sim/hero.js).
"""
import json
import os
import struct
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HEROES = os.path.join(ROOT, "assets", "game", "heroes")
FINGERS = ["index", "middle", "ring", "pinky"]
CT = {5121: "u1", 5123: "u2", 5126: "f4", 5125: "u4"}
NC = {"VEC4": 4, "VEC3": 3, "VEC2": 2, "SCALAR": 1, "MAT4": 16}
REACH = 0.034     # how far from a finger's bones a vertex may be and still be that finger's (a gauntlet's finger is thick)
EASE = 0.006      # half the length over which a vertex passes from one joint to the next
THUMB_REACH = 0.03    # the thumb past its knuckle; its ball, nearer the wrist, from 0.022 to this


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


class Glb:
    def __init__(self, path):
        self.path = path
        self.raw = bytearray(open(path, "rb").read())
        jl = struct.unpack("<I", self.raw[12:16])[0]
        self.json = json.loads(self.raw[20:20 + jl])
        self.bin0 = 20 + jl + 8

    def view(self, i):
        a = self.json["accessors"][i]
        bv = self.json["bufferViews"][a["bufferView"]]
        ct, n = CT[a["componentType"]], NC[a["type"]]
        size = np.dtype(ct).itemsize * n
        stride = bv.get("byteStride") or size
        off = self.bin0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        return a, ct, n, off, stride

    def read(self, i):
        a, ct, n, off, stride = self.view(i)
        out = np.empty((a["count"], n), dtype=ct)
        for k in range(a["count"]):
            out[k] = np.frombuffer(self.raw, ct, n, off + k * stride)
        return out, a

    def write(self, i, arr):
        a, ct, n, off, stride = self.view(i)
        arr = np.ascontiguousarray(arr.astype(ct))
        for k in range(a["count"]):
            self.raw[off + k * stride: off + k * stride + arr[k].nbytes] = arr[k].tobytes()

    def save(self):
        open(self.path, "wb").write(self.raw)


def polyline(V, pts):
    """Each vertex's distance to a polyline, and how far along it the nearest point is."""
    best = np.full(len(V), 1e9)
    along = np.zeros(len(V))
    s0 = 0.0
    for a, b in zip(pts[:-1], pts[1:]):
        ab = b - a
        L = np.linalg.norm(ab)
        t = np.clip(((V - a) @ ab) / (L * L), 0, 1)
        d = np.linalg.norm(V - (a + t[:, None] * ab), axis=1)
        m = d < best
        best[m] = d[m]
        along[m] = s0 + t[m] * L
        s0 += L
    # (Short of the knuckle: how far behind it, as a negative length.)
    a, b = pts[0], pts[1]
    back = ((V - a) @ (b - a)) / np.linalg.norm(b - a)
    along = np.where(back < 0, back, along)
    return best, along


def segdist(V, a, b):
    ab = b - a
    t = np.clip(((V - a) @ ab) / max(1e-12, ab @ ab), 0, 1)
    return np.linalg.norm(V - (a + t[:, None] * ab), axis=1)


def thumb(P, Jn, Wn, names, pos, sd, hand, chains):
    """The thumb of one hand (after its fingers): Jn, Wn changed in place. Returns how many vertices it took."""
    try:
        tch = [names.index(f"thumb_0{n}_{sd}") for n in (1, 2, 3)]
    except ValueError:
        return 0
    t1, t2, t3 = (pos[names[x]] for x in tch)
    leaf = pos.get(f"thumb_04_leaf_{sd}")
    if leaf is None:
        leaf = t3 + (t3 - t2)
    tip = leaf + (leaf - t3) / max(1e-6, np.linalg.norm(leaf - t3)) * 0.012
    fset = [x for c in chains.values() for x in c]
    allj = set([hand] + fset + tch)
    share = np.where(np.isin(Jn, list(allj)), Wn, 0).sum(axis=1)
    onf = np.where(np.isin(Jn, fset), Wn, 0).sum(axis=1)
    cand = np.nonzero((share >= 0.5) & (onf < 0.3))[0]
    if not len(cand):
        return 0
    V = P[cand]
    dt, st = polyline(V, [t1, t2, t3, leaf, tip])
    # (Nearer the thumb than anything else of the hand's that bends: each finger past its knuckle, and the index's bone
    # across the palm, so the palm's middle stays the palm's.)
    other = np.full(len(V), 1e9)
    for c in chains.values():
        p1, p2, p3 = (pos[names[x]] for x in c)
        d, s = polyline(V, [p1, p2, p3, p3 + (p3 - p2)])
        other = np.minimum(other, np.where(s < -EASE, 1e9, d))
    if "index" in chains:
        other = np.minimum(other, segdist(V, pos[names[hand]], pos[names[chains["index"][0]]]))
    L1, L2 = np.linalg.norm(t2 - t1), np.linalg.norm(t3 - t2)
    reach = np.where(st < L1, 0.022 + 0.008 * np.clip(st / L1, 0, 1), THUMB_REACH)
    take = np.nonzero((dt < reach) & (dt < other) & (st > -EASE))[0]
    for n in take:
        v, s = cand[n], st[n]
        a1 = smooth(0.15 * L1, 0.85 * L1, s)           # the ball of the thumb, off the wrist bit by bit
        a2 = smooth(L1 - EASE, L1 + EASE, s)
        a3 = smooth(L1 + L2 - EASE, L1 + L2 + EASE, s)
        w = {hand: 1 - a1, tch[0]: a1 * (1 - a2), tch[1]: a2 * (1 - a3), tch[2]: a3}
        w = {k: x * share[v] for k, x in w.items() if x > 1e-4}
        for q in range(4):
            if Wn[v, q] > 0 and int(Jn[v, q]) not in allj:
                w[int(Jn[v, q])] = w.get(int(Jn[v, q]), 0) + Wn[v, q]
        top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(x for _, x in top) or 1
        Jn[v], Wn[v] = 0, 0
        for q, (jj, x) in enumerate(top):
            Jn[v, q], Wn[v, q] = jj, x / tot
    return len(take)


def fingers(path):
    g = Glb(path)
    j = g.json
    skin = j["skins"][0]
    names = [j["nodes"][n]["name"] for n in skin["joints"]]
    ibm, _ = g.read(skin["inverseBindMatrices"])
    bind = np.linalg.inv(ibm.reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64))
    pos = {n: bind[i][:3, 3] for i, n in enumerate(names)}
    moved = 0
    for mesh in j["meshes"]:
        for prim in mesh["primitives"]:
            at = prim["attributes"]
            P, _ = g.read(at["POSITION"])
            J, _ = g.read(at["JOINTS_0"])
            Wraw, wa = g.read(at["WEIGHTS_0"])
            unit = {5121: 255.0, 5123: 65535.0}.get(wa["componentType"], 1.0)
            W = Wraw.astype(np.float64) / unit
            P = P.astype(np.float64)
            Jn, Wn = J.astype(np.int64).copy(), W.copy()
            for sd in "lr":
                if f"hand_{sd}" not in names:
                    continue
                hand = names.index(f"hand_{sd}")
                chains = {}
                for f in FINGERS:
                    try:
                        chains[f] = [names.index(f"{f}_0{n}_{sd}") for n in (1, 2, 3)]
                    except ValueError:
                        pass
                mine = set([hand] + [x for c in chains.values() for x in c])
                for n in (1, 2, 3):
                    if f"thumb_0{n}_{sd}" in names:
                        mine.add(names.index(f"thumb_0{n}_{sd}"))
                # What of each vertex is the hand's (the wrist's and, after a first run, its fingers').
                share = np.where(np.isin(J, list(mine)), W, 0).sum(axis=1)
                cand = np.nonzero(share >= 0.5)[0]
                if not len(cand) or not chains:
                    continue
                V = P[cand]
                best = np.full(len(V), 1e9)
                which = np.full(len(V), -1)
                alongs = np.zeros(len(V))
                keys = list(chains)
                for k, f in enumerate(keys):
                    p1, p2, p3 = (pos[names[x]] for x in chains[f])
                    tip = p3 + (p3 - p2) / max(1e-6, np.linalg.norm(p3 - p2)) * max(0.02, np.linalg.norm(p3 - p2))
                    d, s = polyline(V, [p1, p2, p3, tip])
                    m = d < best
                    best[m], which[m], alongs[m] = d[m], k, s[m]
                for n, v in enumerate(cand):
                    if which[n] < 0 or best[n] > REACH or alongs[n] < -EASE:
                        w = {hand: share[v]}
                    else:
                        c = chains[keys[which[n]]]
                        p1, p2, p3 = (pos[names[x]] for x in c)
                        L1, L2 = np.linalg.norm(p2 - p1), np.linalg.norm(p3 - p2)
                        s = alongs[n]
                        a1 = smooth(-EASE, EASE, s)                # off the wrist, onto the first joint
                        a2 = smooth(L1 - EASE, L1 + EASE, s)       # onto the second
                        a3 = smooth(L1 + L2 - EASE, L1 + L2 + EASE, s)
                        w = {hand: 1 - a1, c[0]: a1 * (1 - a2), c[1]: a2 * (1 - a3), c[2]: a3}
                        w = {k2: x * share[v] for k2, x in w.items() if x > 1e-4}
                        moved += 1
                    # Whatever else the vertex followed, it still does.
                    for q in range(4):
                        if W[v, q] > 0 and int(J[v, q]) not in mine:
                            w[int(J[v, q])] = w.get(int(J[v, q]), 0) + W[v, q]
                    top = sorted(w.items(), key=lambda kv: -kv[1])[:4]
                    tot = sum(x for _, x in top) or 1
                    Jn[v], Wn[v] = 0, 0
                    for q, (jj, x) in enumerate(top):
                        Jn[v, q], Wn[v, q] = jj, x / tot
                moved += thumb(P, Jn, Wn, names, pos, sd, hand, chains)
            g.write(at["JOINTS_0"], Jn)
            if unit == 1.0:
                g.write(at["WEIGHTS_0"], Wn)
            else:
                # (Whole numbers that still add up to one.)
                Q = np.floor(Wn * unit + 0.5)
                Q[np.arange(len(Q)), Q.argmax(axis=1)] += unit - Q.sum(axis=1)
                g.write(at["WEIGHTS_0"], Q)
    g.save()
    return moved


if __name__ == "__main__":
    ids = sys.argv[1:] or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    for i in ids:
        print(i, fingers(os.path.join(HEROES, i + ".glb")), "finger vertices")
