"""Finds the fingers of a Tripo spell-hands sculpt, as a Reeb graph of the geodesic distance from the elbow, and
writes what it finds to tools/build/spells/<model>_fingers.json. The sculpts are fused, unrigged single meshes with
their seams split, so this is what the repair and the rig both start from.

Run through Blender MCP, with the model imported as an object of that name:

    exec(compile(open(p, encoding="utf-8").read(), p, "exec"), dict(__file__=p, __name__="__main__", MODEL="attack"))
"""
import heapq
import json
import os

import bpy
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "tools", "build", "spells")
PERSIST = 0.03      # how long a bump has to be to count as a finger, in metres
MODEL_NOW = None


def weld(o):
    """World positions of the mesh's vertices, welded across its split seams: (positions, vertex -> welded index, edges)."""
    me = o.data
    n = len(me.vertices)
    P = np.empty(n * 3)
    me.vertices.foreach_get("co", P)
    P = P.reshape(-1, 3)
    M = np.array(o.matrix_world)
    P = P @ M[:3, :3].T + M[:3, 3]
    _, first, inv = np.unique(np.round(P, 5), axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    E = np.empty(len(me.edges) * 2, int)
    me.edges.foreach_get("vertices", E)
    E = inv[E].reshape(-1, 2)
    E = E[E[:, 0] != E[:, 1]]
    return P[first], inv, np.unique(np.sort(E, axis=1), axis=0)


def geodesic(Q, E, src):
    adj = [[] for _ in Q]
    for a, b in E:
        d = float(np.linalg.norm(Q[a] - Q[b]))
        adj[a].append((b, d))
        adj[b].append((a, d))
    f = np.full(len(Q), np.inf)
    h = [(0.0, int(s)) for s in src]
    f[src] = 0
    heapq.heapify(h)
    while h:
        d, a = heapq.heappop(h)
        if d > f[a]:
            continue
        for b, w in adj[a]:
            if d + w < f[b]:
                f[b] = d + w
                heapq.heappush(h, (d + w, b))
    return f, adj


def branches(f, adj):
    """Sweeps from the highest geodesic distance down: every component that meets a bigger one at a saddle, having
    stood at least PERSIST above it, is a finger. Returns [(tip, saddle f, its vertices)]."""
    parent = {}
    top = {}
    mem = {}
    closed = set()      # components already recorded as a finger, or holding one

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    out = []
    for v in np.argsort(-f):
        v = int(v)
        if f[v] < 0:
            break
        parent[v] = v
        top[v] = v
        mem[v] = [v]
        roots = {find(b) for b, _ in adj[v] if b in parent and b != v}
        for r in sorted(roots, key=lambda r: f[top[r]]):
            a = find(v)
            hi, lo = (a, r) if f[top[a]] >= f[top[r]] else (r, a)
            real = f[top[lo]] - f[v] >= PERSIST
            if real:
                for c in (lo, hi):
                    if c not in closed and f[top[c]] - f[v] >= PERSIST:
                        out.append((top[c], float(f[v]), list(mem[c])))
                        closed.add(c)
            parent[lo] = hi
            mem[hi] += mem[lo]
            del mem[lo]
            if lo in closed:
                closed.add(hi)
    return out


def name_fingers(fs, side):
    """Which finger is which: the thumb is the shortest, and the rest go round the palm from it, through the index."""
    if MODEL_NOW == "raise":        # palms up, the fingers lie in a row running in from the thumb, which is furthest out
        return dict(zip(("thumb", "index", "middle", "ring", "pinky"), sorted(fs, key=lambda b: -abs(b["tip_pos"][0]))))
    thumb = min(fs, key=lambda b: b["tip_f"] - b["saddle"])
    tips = np.array([b["tip_pos"] for b in fs])
    centre = tips.mean(0)
    t = (np.array(thumb["tip_pos"]) - centre)[[0, 2]]

    def round_from_thumb(b):
        d = (np.array(b["tip_pos"]) - centre)[[0, 2]]
        a = np.arctan2(t[0] * d[1] - t[1] * d[0], t @ d)
        return (-a if side == "R" else a) % (2 * np.pi)
    rest = sorted((b for b in fs if b is not thumb), key=round_from_thumb)
    return dict(zip(("thumb", "index", "middle", "ring", "pinky"), [thumb] + rest))


def find_fingers(name):
    global MODEL_NOW
    MODEL_NOW = name
    o = bpy.data.objects[name]
    Q, inv, E = weld(o)
    res = {"hands": {}}
    for side, sgn in (("R", 1), ("L", -1)):
        ids = np.where(Q[:, 0] * sgn > 0)[0]
        back = np.percentile(Q[ids, 1], 2)
        src = ids[Q[ids, 1] <= back]
        f, adj = geodesic(Q, E, src)
        f2 = f.copy()
        f2[~np.isfinite(f2)] = -1
        bs = [b for b in branches(np.where(np.isin(np.arange(len(Q)), ids), f2, -1.0), adj)]
        fingers = []
        for tip, saddle, verts in bs:
            verts = np.array(verts)
            fingers.append(dict(tip=int(tip), saddle=saddle, tip_f=float(f[tip]), verts=verts.tolist(),
                tip_pos=Q[tip].round(4).tolist(), n=len(verts)))
        for fname, b_ in name_fingers(fingers, side).items():
            b_["name"] = fname
        res["hands"][side] = dict(fingers=fingers, f=np.round(f2, 5).tolist())
    os.makedirs(OUT, exist_ok=True)
    o.data.calc_loop_triangles()
    tri = np.array([t.vertices for t in o.data.loop_triangles])
    np.savez(os.path.join(OUT, name + "_mesh.npz"), Q=Q, inv=inv, tri=inv[tri])
    with open(os.path.join(OUT, name + "_fingers.json"), "w") as fp:
        json.dump(res, fp)
    return res, Q


if __name__ == "__main__":
    res, Q = find_fingers(globals().get("MODEL", "attack"))
    for side, h in res["hands"].items():
        print(side, len(h["fingers"]))
        for b in h["fingers"]:
            print("  %-6s tip" % b["name"], b["tip_pos"], "len %.3f saddle %.3f n %d" % (b["tip_f"] - b["saddle"], b["saddle"], b["n"]))
