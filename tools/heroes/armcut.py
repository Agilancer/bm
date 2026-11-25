"""Where a trunk plate wraps or lies along an upper arm, that part cut off as a plate of its own on the arm. Runs in
Blender (the Blender MCP: import armcut; armcut.run(ids)) or plain Python: python tools/heroes/armcut.py [ids] [--dry]

Some breastplates come with the top of the sleeve on them (the lancers' rerebraces, paladin_m2's), or a strap end or a
flange lying out along the arm in the bind pose (archer_f6's). Bound to the trunk, with the arms down they stood out flat
at shoulder height as black fins either side of the neck. rebind.tabs() (2026-11-20) blended them over to the upper arm,
vertex by vertex; but a blend across a joint that turns 70 degrees draws the triangles between out into shards: the
lancers' grey flaps under the pauldron, a raised arm tearing the plate open, and (since the rule went by height alone)
the archers' quivers dragged up by the arm into a lump by the ear (the critics' second review, 2026-11-20; tools/build/h3
/stretch.py counted the torn edges in every pose).

So instead: the triangles of a trunk plate lying wholly past the shoulder joint (CUT_T of the way to the elbow) and
close round the arm's line (CUT_R) are cut away with their own copies of their vertices, a plate of their own bound
rigidly to the upper arm, as a pauldron is. Nothing is blended, so nothing tears; where the cut parts, it's under the
pauldron. The plate's shape, paint and bind pose are untouched: its triangles are only shared out between two pieces.
The new piece is named after its plate with " arm_l" / " arm_r" (its group, for herolook.js, is the plate's).

untab() first puts back the trunk plates' own weights from before tabs() (tools/build/h3/pretabs), and drops the
backings (tools/heroes/backing.py) so they can be made again round the cut.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
try:
    import PIL  # noqa: F401
except ImportError:
    import types
    _pil = types.ModuleType("PIL"); _pil.Image = types.ModuleType("PIL.Image")
    sys.modules["PIL"] = _pil; sys.modules["PIL.Image"] = _pil.Image
import rebind as R      # noqa: E402
import mail as M        # noqa: E402

CUT_T = 0.06       # of the way from the shoulder joint to the elbow: a triangle wholly past it may go with the arm
CUT_R = 0.10       # metres (for a 1.8 m hero) from the arm's line: a triangle wholly within it may go with the arm
CUT_WIDE = 0.17    # metres: out to here, a run of triangles that wraps round the arm goes with it
CUT_MID = 0.045    # metres: how near the arm's line the middle of such a run must be
MIN_TRIS = 12      # fewer than this past the shoulder is a stray corner, left on the plate
TRUNKISH = set(R._TRUNK) | {"clavicle_l", "clavicle_r", "neck_01"}
PRETABS = os.path.join(HERE, "..", "build", "h3", "pretabs")


class Parts:
    """A body's mesh as a list of pieces, each with its own vertex arrays and triangles, put back together by save()."""

    def __init__(self, body_id):
        self.id = body_id
        self.path, self.g, self.blob, A, idx, pieces, self.names, self.T = R._open(body_id)
        self.keys = list(A.keys())
        self.list = []
        for p in pieces:
            sl = slice(p["vstart"], p["vstart"] + p["vcount"])
            tri = idx[p["tstart"]:p["tstart"] + p["tcount"]].astype(np.int64) - p["vstart"]
            self.list.append({"meta": dict(p), "attrs": {k: np.array(A[k][sl]) for k in self.keys}, "tris": tri})

    def save(self, dry=False):
        attrs = {k: [] for k in self.keys}
        tris, pieces = [], []
        vn = tn = 0
        for k, part in enumerate(self.list):
            m = dict(part["meta"]); a = part["attrs"]; t = part["tris"]
            nv = len(a["POSITION"])
            m["vstart"], m["vcount"], m["tstart"], m["tcount"] = vn, nv, tn, len(t)
            pos = a["POSITION"].astype(np.float64)
            m["min"], m["max"] = pos.min(0).tolist(), pos.max(0).tolist()
            pid = np.full(nv, k | (M.CLOTH_BIT if m["kind"] == "cloth" else 0), np.float64)
            for key in self.keys:
                arr = pid.astype(a[key].dtype).reshape(a[key].shape) if key == "_PIECE" else a[key]
                attrs[key].append(arr)
            tris.append(t + vn); pieces.append(m)
            vn += nv; tn += len(t)
        if len(pieces) >= M.CLOTH_BIT:
            raise ValueError("too many pieces")
        A = {k: np.concatenate(v) for k, v in attrs.items()}
        if not dry:
            M.write(self.path, self.g, self.blob, A, np.concatenate(tris), pieces)
        return pieces


def untab(parts):
    """Trunk plates' weights as they were before rebind.tabs(); backings dropped. Returns what changed."""
    out = []
    n0 = len(parts.list)
    parts.list = [p for p in parts.list if not p["meta"].get("backing")]
    if len(parts.list) != n0:
        out.append(f"{n0 - len(parts.list)} backings dropped")
    src = os.path.join(PRETABS, parts.id + ".glb")
    if not os.path.exists(src):
        return out
    keep = R.HEROES
    R.HEROES = PRETABS
    try:
        _, _, _, A0, _, pieces0, _, _ = R._open(parts.id)
    finally:
        R.HEROES = keep
    by = {p["name"]: p for p in pieces0}
    for part in parts.list:
        m = part["meta"]; p0 = by.get(m["name"])
        if m["kind"] != "plate" or p0 is None or p0["vcount"] != len(part["attrs"]["POSITION"]):
            continue
        sl = slice(p0["vstart"], p0["vstart"] + p0["vcount"])
        if not np.allclose(A0["POSITION"][sl], part["attrs"]["POSITION"]):
            continue
        J0, W0 = A0["JOINTS_0"][sl], A0["WEIGHTS_0"][sl]
        if (J0 == part["attrs"]["JOINTS_0"]).all() and np.allclose(W0, part["attrs"]["WEIGHTS_0"]):
            continue
        part["attrs"]["JOINTS_0"] = np.array(J0); part["attrs"]["WEIGHTS_0"] = np.array(W0)
        out.append(f"{m['name']}: its own weights back")
    return out


def _along(P, tri, S, ax, t, d, u):
    """The triangles that go with the arm: wholly past the shoulder and within CUT_R of the arm's line; or, out to
    CUT_WIDE, a run of them that wraps round the arm (its middle on the arm's line: a sleeve, not a quiver beside it)."""
    past = (t > CUT_T)[tri].all(1)
    sel = past & (d < CUT_R * u)[tri].all(1)
    wide = past & (d < CUT_WIDE * u)[tri].all(1) & ~sel
    if wide.sum() >= MIN_TRIS:
        # (Runs of the wide ones, joined where they share a place.)
        _, w = np.unique(np.round(P * 2e4).astype(np.int64), axis=0, return_inverse=True); w = w.ravel()
        cand = np.flatnonzero(wide | sel)
        par = {}
        def find(a):
            while par.get(a, a) != a:
                par[a] = par.get(par[a], par[a]); a = par[a]
            return a
        for ti in cand:
            a, b, c = (find(x) for x in w[tri[ti]])
            par[b] = a; par[find(c)] = a
        roots = np.array([find(w[tri[ti][0]]) for ti in cand])
        ax_u = ax / np.linalg.norm(ax)
        for r in np.unique(roots):
            run = cand[roots == r]
            vs = np.unique(tri[run])
            rel = P[vs] - S
            perp = rel - np.outer(rel @ ax_u, ax_u)
            if np.linalg.norm(perp.mean(0)) < CUT_MID * u:
                sel[run] = True
            elif not (d[vs] < CUT_R * u).all():
                sel[run] = False     # (a quiver's run, or a strap's, beside the arm: it stays on the back)
    return sel


def cut(parts, height=1.8):
    """Each trunk plate's triangles out along an arm, as a plate of their own on it. Returns what was cut."""
    names, T = parts.names, parts.T
    u = height / 1.8
    out = []
    new = []
    for part in parts.list:
        m = part["meta"]
        if m["kind"] != "plate" or m.get("backing") or not m.get("joints"):
            continue
        if not all(names[j] in TRUNKISH for j, _ in m["joints"]):
            continue
        P = part["attrs"]["POSITION"].astype(np.float64)
        tri = part["tris"]
        for s in "lr":
            S, E = T[f"upperarm_{s}"], T[f"lowerarm_{s}"]
            ax = E - S; L2 = float(ax @ ax)
            t = ((P - S) @ ax) / L2
            d = np.linalg.norm(P - (S + np.outer(t, ax)), axis=1)
            sel = _along(P, tri, S, ax, t, d, u)
            if sel.sum() < MIN_TRIS:
                continue
            ct = tri[sel]
            used = np.unique(ct)
            remap = -np.ones(len(P), np.int64); remap[used] = np.arange(len(used))
            a = {k: np.array(v[used]) for k, v in part["attrs"].items()}
            ui = names.index(f"upperarm_{s}")
            a["JOINTS_0"][:] = 0; a["JOINTS_0"][:, 0] = ui
            a["WEIGHTS_0"][:] = 0; a["WEIGHTS_0"][:, 0] = 1
            meta = {k: v for k, v in m.items() if k not in ("vstart", "vcount", "tstart", "tcount")}
            meta.update({"name": f"{m['name']} arm_{s}", "joints": [[ui, 1.0]], "armcut": 1})
            new.append({"meta": meta, "attrs": a, "tris": remap[ct]})
            tri = tri[~sel]
            out.append(f"{m['name']}: {int(sel.sum())} triangles ({len(used)} vertices) along the {s} arm cut off onto it")
        if len(tri) != len(part["tris"]):
            # (The plate keeps the vertices its own triangles use.)
            used = np.unique(tri)
            remap = -np.ones(len(P), np.int64); remap[used] = np.arange(len(used))
            part["attrs"] = {k: np.array(v[used]) for k, v in part["attrs"].items()}
            part["tris"] = remap[tri]
    parts.list += new
    return out


def run(ids=None, dry=False, only_cut=False):
    roster = json.load(open(os.path.join(R.HEROES, "roster.json")))
    hts = {h["id"]: h.get("height", 1.8) for h in roster}
    ids = ids or [h["id"] for h in roster]
    for b in ids:
        parts = Parts(b)
        if any(p["meta"].get("armcut") for p in parts.list):
            print(f"{b}: cut before, left alone")
            continue
        msgs = ([] if only_cut else untab(parts)) + cut(parts, parts.g["scenes"][0]["extras"].get("height", hts.get(b, 1.8)))
        if msgs:
            parts.save(dry)
            for s in msgs:
                print(f"{b}: {s}{' (dry)' if dry else ''}")


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    run([a for a in argv if not a.startswith("--")] or None, "--dry" in argv)
