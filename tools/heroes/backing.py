"""Backings for shattered plates. Runs inside Blender (bmesh does the welding):
    blender --background --python tools/heroes/backing.py -- [ids...] [--dry]
or from the Blender MCP: import backing; backing.run(ids).

Tripo left some plates in hundreds of loose shells with cracks between them: paladin_m2's breastplate (the star on it is
294 holes), lancer_f1's and lancer_f3's whole suits, bard_m2's coat, paladin_f2's helm. Through every crack showed the
plate's dark inside, or the mail under it, so the star on paladin_m2's chest read as black shards (the critics' joint
review, 2026-11-20). The plate itself is left as it is (its shape is the owner's): under it goes a copy of it, welded shut
(shells closer than WELD are one), set DEPTH in along its own normals, with the plate's UVs, skin and flex. A crack then
shows the plate's own colours a few millimetres down, a hairline in shadow, not a hole.

A plate gets one when it has MIN_HOLES or more small holes (boundary loops shorter than HOLE_MAX round, as
tools/build/h3/holescan.py counts them); an ordinary plate has a handful (rivet holes, a visor). Each backing is a piece
of its own, named after its plate with " backing" (so herolook.js puts it in the plate's group: it goes with the plate
when party gear swaps the group), kind "plate", marked "backing". A plate that has one is left alone the next time.
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
try:
    import PIL          # noqa: F401
except ImportError:
    # (Blender's Python has no Pillow. gaps.py, under rebind and mail, wants it for pictures only; nothing here reads one.)
    import types
    _pil = types.ModuleType("PIL"); _pil.Image = types.ModuleType("PIL.Image")
    sys.modules["PIL"] = _pil; sys.modules["PIL.Image"] = _pil.Image
import rebind as R      # noqa: E402
import mail as M        # noqa: E402

WELD = 0.004       # metres: shells closer than this are welded into one surface
DEPTH = 0.003      # metres in from the plate, along the welded surface's normals
HOLE_MAX = 0.25    # a boundary loop shorter than this round is a hole, not a plate's rim
MIN_HOLES = 40     # small holes before a plate is shattered


def _holes(P, tri):
    import importlib.util
    spec = importlib.util.spec_from_file_location("holescan", os.path.join(HERE, "..", "build", "h3", "holescan.py"))
    if spec and os.path.exists(spec.origin):
        hs = importlib.util.module_from_spec(spec); spec.loader.exec_module(hs)
        loops, _ = hs.loops_of(P, tri)
        return sum(1 for c, per in loops if per < HOLE_MAX and len(c) >= 3)
    return 0


def _weld(P, N, UV, tri):
    """The plate as one surface: (positions, normals, per-corner UVs, triangles, source vertex of each), in the glTF frame."""
    import bmesh
    bm = bmesh.new()
    src = bm.verts.layers.int.new("src")
    vs = []
    for i, c in enumerate(P):
        v = bm.verts.new(tuple(float(x) for x in c))
        v[src] = i
        vs.append(v)
    uvl = bm.loops.layers.uv.new("uv")
    for t in tri:
        try:
            f = bm.faces.new([vs[k] for k in t])
        except ValueError:
            continue    # (the same triangle twice)
        for lp, k in zip(f.loops, t):
            lp[uvl].uv = (float(UV[k][0]), float(UV[k][1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=WELD)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=1e-7)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) != 3])
    bm.normal_update()
    # (Each vertex's normal from its source's: a welded star point's own normal can face anywhere; the plate's say where
    # out is. The welded one where it agrees, else the source's.)
    for v in bm.verts:
        n0 = N[v[src]]
        nv = np.array(v.normal)
        n = nv if np.dot(nv, n0) > 0.3 else n0
        v.co -= type(v.co)(tuple(float(x) * DEPTH for x in n / max(np.linalg.norm(n), 1e-9)))
    bm.normal_update()
    out_v = {}
    pos, nrm, uv, srcs, tris = [], [], [], [], []
    for f in bm.faces:
        if len(f.verts) != 3:
            continue
        t = []
        for lp in f.loops:
            key = (lp.vert.index, round(lp[uvl].uv[0], 5), round(lp[uvl].uv[1], 5))
            k = out_v.get(key)
            if k is None:
                k = out_v[key] = len(pos)
                pos.append(tuple(lp.vert.co)); nrm.append(tuple(lp.vert.normal)); uv.append(tuple(lp[uvl].uv))
                srcs.append(int(lp.vert[src]))
            t.append(k)
        tris.append(t)
    bm.free()
    return (np.array(pos, np.float64), np.array(nrm, np.float64), np.array(uv, np.float64),
            np.array(tris, np.int64).reshape(-1, 3), np.array(srcs, np.int64))


def backings(body_id, dry=False):
    path, g, blob, A, idx, pieces, names, T = R._open(body_id)
    have = {p["name"][:-len(" backing")] for p in pieces if p.get("backing")}
    A = {k: np.array(v) for k, v in A.items()}
    tris = idx.astype(np.int64)
    done = []
    for p in list(pieces):
        if p["kind"] not in ("plate", "flex") or p.get("backing") or p["name"] in have:
            continue
        v0, vn = p["vstart"], p["vcount"]
        sl = slice(v0, v0 + vn)
        P = A["POSITION"][sl].astype(np.float64)
        tri = idx[p["tstart"]:p["tstart"] + p["tcount"]].astype(np.int64) - v0
        n_holes = _holes(P, tri)
        if n_holes < MIN_HOLES:
            continue
        pos, nrm, uv, tr, src = _weld(P, A["NORMAL"][sl].astype(np.float64), A["TEXCOORD_0"][sl].astype(np.float64), tri)
        s = src + v0
        k = len(pieces)
        vstart, tstart = len(A["POSITION"]), len(tris)
        pieces.append({"name": p["name"] + " backing", "kind": "plate", "backing": 1, "vstart": vstart, "vcount": len(pos),
                       "tstart": tstart, "tcount": len(tr), "joints": p["joints"], "min": pos.min(0).tolist(),
                       "max": pos.max(0).tolist()})
        add = {"POSITION": pos, "NORMAL": nrm, "TEXCOORD_0": uv}
        for key in list(A):
            arr = A[key]
            if key == "_PIECE":     # (its own piece; a plate, so no cloth mark)
                flat = arr.reshape(-1)
                A[key] = np.concatenate([flat, np.full(len(pos), k, flat.dtype)])
                continue
            new = add[key] if key in add else arr[s]     # (skin, flex: the source vertex's)
            A[key] = np.concatenate([arr, np.asarray(new).astype(arr.dtype).reshape((len(pos),) + arr.shape[1:])])
        tris = np.concatenate([tris, tr + vstart])
        done.append((p["name"], n_holes, len(pos), len(tr)))
    if done and not dry:
        M.write(path, g, blob, A, tris, pieces)
    return done


def run(ids=None, dry=False):
    import json
    ids = ids or [h["id"] for h in json.load(open(os.path.join(R.HEROES, "roster.json")))]
    for b in ids:
        for name, n, nv, nt in backings(b, dry):
            print(f"{b}: {name}: {n} small holes; a backing of {nv} vertices, {nt} triangles{' (dry)' if dry else ''}")


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    run([a for a in argv if not a.startswith("--")] or None, "--dry" in argv)
