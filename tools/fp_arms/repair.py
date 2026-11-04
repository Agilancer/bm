"""Step 1 of the first-person arms: the Tripo model without its sword, hands made whole.

art/fp_arms/arms_longsword_source.glb is one fused surface: both arms and a longsword, joined at
the fists. This takes the sword off (by texture colour and distance from its axis), parts the two
arms with a minimum cut on the mesh, closes every hole the sword leaves in the hands with a faired
patch, and repaints: steel left on the skin is inpainted from the skin around it, each patch gets
its own chart in the atlas (in the room the sword's islands leave) coloured from the skin at its
rim, darkening toward its middle like the hollow of a closed fist.

Model frame throughout: x right, y ahead, z up (metres).

    python tools/fp_arms/repair.py            # writes build/repaired.npz and build/*.png, *.jpg
"""
import collections
import io
import json
import os
import struct

import numpy as np
import scipy.sparse as sp
from PIL import Image
from scipy.sparse.csgraph import connected_components, dijkstra, maximum_flow
from scipy.sparse.linalg import spsolve

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = os.path.join(ROOT, "art", "fp_arms", "arms_longsword_source.glb")
BUILD = os.path.join(HERE, "build")

PATCH_EDGE = 0.009      # target edge of a patch's triangles (m)
HOLLOW = 0.55           # how much darker a patch's middle is than its rim
PAD = 6                 # texels kept clear round a chart
CHART_MAX = 72          # a chart's largest radius (texels)


def read_glb(path):
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    b = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a["componentType"]]
        arr = np.frombuffer(b, dt, a["count"] * n, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n).copy() if n > 1 else arr.copy()

    pr = j["meshes"][0]["primitives"][0]
    images = []
    for im in j["images"]:
        bv = j["bufferViews"][im["bufferView"]]
        o = bv.get("byteOffset", 0)
        images.append(Image.open(io.BytesIO(b[o:o + bv["byteLength"]])).convert("RGB"))
    return dict(P=acc(pr["attributes"]["POSITION"]), N=acc(pr["attributes"]["NORMAL"]),
                UV=acc(pr["attributes"]["TEXCOORD_0"]), F=acc(pr["indices"]).reshape(-1, 3).astype(np.int64),
                base=images[0], rm=images[1], normal=images[2])


to_model = lambda v: np.stack([-v[..., 2], -v[..., 0], v[..., 1]], -1)    # glTF raw -> x right, y ahead, z up


def texel(img, uv):
    H, W, _ = img.shape
    return img[np.clip((uv[:, 1] * H).astype(int), 0, H - 1), np.clip((uv[:, 0] * W).astype(int), 0, W - 1)]


def skin_mask(c):
    """Warm, saturated, not too dark: the sculpt's skin (the sword is grey, black and purple)."""
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    mx = c.max(-1)
    sat = (mx - c.min(-1)) / np.maximum(mx, 1e-3)
    return (r > g) & (g >= b * 0.95) & (sat > 0.22) & (mx > 0.18)


def sword_axis(W, skin):
    """A point and direction (toward the tip) along the blade, from its cross-sections' middles."""
    q = W[(~skin) & (W[:, 2] > 0.42)]
    c = q.mean(0)
    ax = np.linalg.svd(q - c, full_matrices=False)[2][0]
    ax = ax * np.sign(ax[2])
    t = (W - c) @ ax
    r = np.linalg.norm((W - c) - np.outer(t, ax), axis=1)
    cs = []
    for lo in np.arange(-0.2, 0.17, 0.03):
        m = (t >= lo) & (t < lo + 0.03) & (r < 0.05)
        cs.append((W[m].min(0) + W[m].max(0)) / 2)
    cs = np.array(cs)
    c2 = cs.mean(0)
    v = np.linalg.svd(cs - c2)[2][0]
    return c2, v * np.sign(v @ ax)


def sword_faces(W, F, skin, ce, ax):
    """Faces of the sword: blade, guard, pommel by colour and radius; the handle also by facing
    away from the axis (fingers round it face toward it)."""
    t = (W - ce) @ ax
    rad = np.linalg.norm((W - ce) - np.outer(t, ax), axis=1)
    sw = (t > -0.215) & (rad < 0.06)
    sw |= (t > -0.275) & (t <= -0.215) & (~skin) & (rad < 0.15)
    sw |= (t > -0.48) & (t <= -0.26) & (~skin) & (rad < 0.04)
    sw |= (t > -0.48) & (t <= -0.215) & (rad < 0.012)
    sw |= (t > -0.58) & (t <= -0.46) & (~skin) & (rad < 0.078)
    A, B, C = W[F[:, 0]], W[F[:, 1]], W[F[:, 2]]
    fn = np.cross(B - A, C - A)
    fn /= np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-12)
    fc = (A + B + C) / 3
    ft = (fc - ce) @ ax
    fr = (fc - ce) - np.outer(ft, ax)
    frl = np.linalg.norm(fr, axis=1, keepdims=True)
    out = (fn * fr / np.maximum(frl, 1e-9)).sum(1)
    return (sw[F].sum(1) >= 2) | ((ft > -0.60) & (ft < -0.215) & (frl[:, 0] < 0.03) & (out > 0.2))


def steely(c):
    """Texture colours of the sword: greys, blacks and its purple sheen."""
    mx = c.max(-1)
    sat = (mx - c.min(-1)) / np.maximum(mx, 1e-3)
    return (((sat < 0.27) | (c[..., 2] > c[..., 1] * 1.0)) & (mx > 0.08)) | ((mx < 0.12) & (sat < 0.5))


def steel_faces(W, F, UV, base, ce, ax):
    """Faces close round the grip whose texture is mostly the sword's: what the vertex colours
    missed (a face can be steel across its middle with skin at its corners)."""
    fc = W[F].mean(1) - ce
    ft = fc @ ax
    fr = np.linalg.norm(fc - np.outer(ft, ax), axis=1)
    near = (ft > -0.62) & (ft < -0.20) & (fr < 0.045)
    out = np.zeros(len(F), bool)
    bary = np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1], [.5, .5, 0], [0, .5, .5], [.5, 0, .5], [1 / 3, 1 / 3, 1 / 3],
                     [.7, .15, .15], [.15, .7, .15], [.15, .15, .7]])
    for i in np.where(near)[0]:
        out[i] = steely(texel(base, bary @ UV[F[i]])).mean() > 0.35
    return out


def peel_slivers(Fw, idx, Wel, ce, ax, rounds=4, min_angle=20.0):
    """Long thin faces on an open rim near the grip come off, so the rim the patch meets is clean."""
    idx = np.array(idx)
    for _ in range(rounds):
        cnt = collections.Counter()
        for a, b, c in Fw[idx]:
            for u, v in ((a, b), (b, c), (c, a)):
                cnt[(min(u, v), max(u, v))] += 1
        keep = np.ones(len(idx), bool)
        for j, i in enumerate(idx):
            a, b, c = Fw[i]
            if not any(cnt[(min(u, v), max(u, v))] == 1 for u, v in ((a, b), (b, c), (c, a))):
                continue
            q = Wel[[a, b, c]]
            m = q.mean(0) - ce
            if np.linalg.norm(m - ax * (m @ ax)) > 0.09 or not -0.62 < m @ ax < -0.20:
                continue
            e0, e1, e2 = q[1] - q[0], q[2] - q[1], q[0] - q[2]
            cosines = [-(e0 @ e2), -(e1 @ e0), -(e2 @ e1)]
            lens = [np.linalg.norm(e0) * np.linalg.norm(e2), np.linalg.norm(e1) * np.linalg.norm(e0), np.linalg.norm(e2) * np.linalg.norm(e1)]
            if min(np.degrees(np.arccos(np.clip(x / max(y, 1e-12), -1, 1))) for x, y in zip(cosines, lens)) < min_angle:
                keep[j] = False
        if keep.all():
            break
        idx = idx[keep]
    return idx


def relax_rims(Wel, loops, ce, ax, iters=8):
    """Straighten open rims near the grip along themselves: the jag of the old colour boundary goes."""
    for lp in loops:
        if len(lp) < 8:
            continue
        m = Wel[lp].mean(0) - ce
        if np.linalg.norm(m - ax * (m @ ax)) > 0.09:
            continue
        p = Wel[lp].copy()
        for _ in range(iters):
            p = 0.5 * p + 0.25 * (np.roll(p, 1, 0) + np.roll(p, -1, 0))
        # (a vert a walk meets twice just takes the last place: the walk stays closed)
        Wel[lp] = p


def edges_of(Fw):
    e = np.vstack([Fw[:, [0, 1]], Fw[:, [1, 2]], Fw[:, [2, 0]]])
    return np.unique(np.sort(e, axis=1), axis=0)


def split_arms(Wel, Fw):
    """The minimum cut between the two shoulders: where one hand touches the other. True = right."""
    n = len(Wel)
    e = edges_of(Fw)
    used = np.unique(Fw)
    R = used[(Wel[used, 0] > 0.3) & (Wel[used, 1] < -0.25)]
    L = used[(Wel[used, 0] < -0.3) & (Wel[used, 1] < -0.25)]
    S, T, big = n, n + 1, 10 ** 6
    r = np.concatenate([e[:, 0], e[:, 1], np.full(len(R), S), L])
    c = np.concatenate([e[:, 1], e[:, 0], R, np.full(len(L), T)])
    cap = np.concatenate([np.ones(len(e) * 2, np.int32), np.full(len(R) + len(L), big, np.int32)])
    G = sp.csr_matrix((cap, (r, c)), shape=(n + 2, n + 2), dtype=np.int32)
    res = (G - maximum_flow(G, S, T).flow).tocsr()
    res.data = (res.data > 0).astype(np.int32)
    res.eliminate_zeros()
    return np.isfinite(dijkstra(res, indices=S, unweighted=True))[:n]


def make_manifold(Fw, keep_idx, Wel, ce, ax):
    """Drop faces (nearest the sword's axis first) from edges with more than two, and ears (faces
    with two open edges), until neither is left."""
    idx = np.array(keep_idx)
    while True:
        cnt = collections.defaultdict(list)
        for i, (a, b, c) in zip(idx, Fw[idx]):
            for u, v in ((a, b), (b, c), (c, a)):
                cnt[(min(u, v), max(u, v))].append(i)
        drop = set()
        for fs in cnt.values():
            if len(fs) > 2:
                def rad(i):
                    c = Wel[Fw[i]].mean(0) - ce
                    return np.linalg.norm(c - ax * (c @ ax))
                drop.update(sorted(fs, key=rad)[:len(fs) - 2])
        for i, (a, b, c) in zip(idx, Fw[idx]):
            if sum(len(cnt[(min(u, v), max(u, v))]) == 1 for u, v in ((a, b), (b, c), (c, a))) >= 2:
                drop.add(i)
        if not drop:
            return idx
        idx = np.array([i for i in idx if i not in drop])


def boundary_loops(tris):
    """Closed walks of open half-edges, each directed so a patch following it faces the same way as
    the surface round it."""
    he = {}
    for a, b, c in tris:
        for u, v in ((a, b), (b, c), (c, a)):
            he[(u, v)] = True
    nxt = collections.defaultdict(list)
    for (u, v) in he:
        if (v, u) not in he:
            nxt[v].append(u)        # (the twin's direction: v -> u)
    loops = []
    while any(nxt.values()):
        s = next(k for k, v in nxt.items() if v)
        lp = [s]
        cur = nxt[s].pop()
        while cur != s:
            lp.append(cur)
            cur = nxt[cur].pop()
        loops.append(lp)
    return loops


def fill_min_area(q):
    """Liepa's triangulation of a closed polygon by least total area: triangles as loop indices."""
    n = len(q)
    if n == 3:
        return [(0, 1, 2)]
    area = lambda i, j, k: 0.5 * np.linalg.norm(np.cross(q[j] - q[i], q[k] - q[i]))
    W = np.zeros((n, n))
    O = np.zeros((n, n), int)
    for L in range(2, n):
        for i in range(n - L):
            j = i + L
            best, bk = 1e18, i + 1
            for k in range(i + 1, j):
                c = W[i, k] + W[k, j] + area(i, k, j)
                if c < best:
                    best, bk = c, k
            W[i, j], O[i, j] = best, bk
    out, st = [], [(0, n - 1)]
    while st:
        i, j = st.pop()
        if j - i < 2:
            continue
        k = O[i, j]
        out.append((i, k, j))
        st += [(i, k), (k, j)]
    return out


def refine(pts, tris, nfix, edge):
    """Split patch edges longer than `edge`, never the rim (which the surface round it shares), and
    flip toward Delaunay."""
    pts = list(pts)
    tris = [tuple(t) for t in tris]
    rim = lambda a, b: a < nfix and b < nfix and (abs(a - b) == 1 or abs(a - b) == nfix - 1)
    for _ in range(12):
        ed = {}
        for t in tris:
            for u, v in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                k = (min(u, v), max(u, v))
                if k not in ed and not rim(*k) and np.linalg.norm(pts[u] - pts[v]) > edge:
                    ed[k] = None
        if not ed:
            break
        for k in ed:
            ed[k] = len(pts)
            pts.append((pts[k[0]] + pts[k[1]]) / 2)
        new = []
        for a, b, c in tris:
            ab = ed.get((min(a, b), max(a, b)))
            bc = ed.get((min(b, c), max(b, c)))
            ca = ed.get((min(c, a), max(c, a)))
            mids = [m is not None for m in (ab, bc, ca)]
            if not any(mids):
                new.append((a, b, c))
            elif all(mids):
                new += [(a, ab, ca), (ab, b, bc), (ca, bc, c), (ab, bc, ca)]
            elif sum(mids) == 2:
                if ab is None:      # bc, ca split
                    new += [(c, ca, bc), (a, b, bc), (a, bc, ca)]
                elif bc is None:    # ab, ca split
                    new += [(a, ab, ca), (ab, b, c), (ab, c, ca)]
                else:               # ab, bc split
                    new += [(b, bc, ab), (a, ab, bc), (a, bc, c)]
            elif ab is not None:
                new += [(a, ab, c), (ab, b, c)]
            elif bc is not None:
                new += [(b, bc, a), (bc, c, a)]
            else:
                new += [(c, ca, b), (ca, a, b)]
        tris = new
    pts = np.array(pts)
    return pts, _delaunay_flips(pts, tris)


def _delaunay_flips(P, tris):
    tris = [list(t) for t in tris]
    for _ in range(6):
        m = {}
        for i, t in enumerate(tris):
            for k in range(3):
                m.setdefault((t[k], t[(k + 1) % 3]), (i, t[(k + 2) % 3]))
        flips, seen = 0, set()
        for (u, v), (i, a) in list(m.items()):
            if (v, u) not in m or u > v:
                continue
            j, b = m[(v, u)]
            if i in seen or j in seen or a == b:
                continue
            def ang(p, x, y):
                e0, e1 = x - p, y - p
                return np.arccos(np.clip(e0 @ e1 / (np.linalg.norm(e0) * np.linalg.norm(e1) + 1e-12), -1, 1))
            if ang(P[a], P[u], P[v]) + ang(P[b], P[u], P[v]) > np.pi + 1e-3 and (a, b) not in m and (b, a) not in m:
                tris[i], tris[j] = [a, u, b], [b, v, a]
                seen |= {i, j}
                flips += 1
        if not flips:
            break
    return np.array(tris)


def fair(pts, tris, nfix, outer_pts, outer_tris):
    """The patch's inside verts by a bi-Laplacian, the rim and a ring of the surface beyond it held,
    so the patch leaves the rim tangent to what's round it."""
    allp = np.vstack([pts, outer_pts])
    allt = np.vstack([tris, outer_tris]) if len(outer_tris) else tris
    n = len(allp)
    e = edges_of(allt)
    A = sp.csr_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n))
    deg = np.asarray(A.sum(1)).ravel()
    deg[deg == 0] = 1
    L = sp.diags(1 / deg) @ A - sp.identity(n)
    B = (L @ L).tocsr()
    inner = np.arange(nfix, len(pts))
    if not len(inner):
        return pts
    keep = np.setdiff1d(np.arange(n), inner)
    x = spsolve((B[inner][:, inner] + 1e-9 * sp.identity(len(inner))).tocsc(), -B[inner][:, keep] @ allp[keep])
    out = pts.copy()
    out[inner] = x
    return out


def tutte_disc(tris, nv, nfix):
    """The patch laid flat with its rim on a circle: no triangle flips."""
    th = np.arange(nfix) / nfix * 2 * np.pi
    uv = np.zeros((nv, 2))
    uv[:nfix] = np.c_[np.cos(th), np.sin(th)]
    if nv > nfix:
        e = edges_of(tris)
        A = sp.csr_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(nv, nv))
        L = (sp.diags(np.asarray(A.sum(1)).ravel()) - A).tocsr()
        I = np.arange(nfix, nv)
        K = np.arange(nfix)
        for c in range(2):
            uv[I, c] = spsolve(L[I][:, I].tocsc(), -L[I][:, K] @ uv[K, c])
    return uv


def rasterize(tri_uv):
    """Texels (x, y) inside a triangle in pixel coordinates, with barycentrics."""
    mn = np.floor(tri_uv.min(0)).astype(int)
    mx = np.ceil(tri_uv.max(0)).astype(int)
    xs, ys = np.meshgrid(np.arange(mn[0], mx[0] + 1), np.arange(mn[1], mx[1] + 1))
    p = np.c_[xs.ravel() + 0.5, ys.ravel() + 0.5]
    a, b, c = tri_uv
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(d) < 1e-9:
        return xs.ravel()[:0], ys.ravel()[:0], np.zeros((0, 3))
    w0 = ((b[1] - c[1]) * (p[:, 0] - c[0]) + (c[0] - b[0]) * (p[:, 1] - c[1])) / d
    w1 = ((c[1] - a[1]) * (p[:, 0] - c[0]) + (a[0] - c[0]) * (p[:, 1] - c[1])) / d
    w2 = 1 - w0 - w1
    # (a texel and a half of slack, so the seams sample colour, not the empty atlas)
    tol = -1.5 / max(1.0, np.abs(tri_uv.max(0) - tri_uv.min(0)).max())
    m = (w0 >= tol) & (w1 >= tol) & (w2 >= tol)
    return xs.ravel()[m], ys.ravel()[m], np.c_[w0[m], w1[m], w2[m]]


def inpaint(img, unknown, diffuse=None, iters=80):
    """Fill the unknown texels from those round them: a pull-push pyramid for all of them, then
    diffusion on `diffuse` (the texels that show), so they blend into what's beside them."""
    known = ~unknown
    levels = [(img, known)]
    while levels[-1][0].shape[0] > 4:
        c, k = levels[-1]
        hh, ww = c.shape[0] // 2, c.shape[1] // 2
        w = k[:hh * 2, :ww * 2].reshape(hh, 2, ww, 2).astype(float)
        v = (c[:hh * 2, :ww * 2] * k[:hh * 2, :ww * 2, None]).reshape(hh, 2, ww, 2, -1)
        s = w.sum((1, 3))
        levels.append((v.sum((1, 3)) / np.maximum(s[..., None], 1), s > 0))
    fill = levels[-1][0]
    for c, k in reversed(levels[:-1]):
        fill = fill.repeat(2, 0).repeat(2, 1)
        fh, fw = fill.shape[:2]
        if fh < c.shape[0] or fw < c.shape[1]:
            fill = np.pad(fill, ((0, c.shape[0] - fh), (0, c.shape[1] - fw), (0, 0)), mode="edge")
        fill = np.where(k[..., None], c, fill)
    out = np.where(known[..., None], img, fill)
    if diffuse is None or not diffuse.any():
        return out
    ys, xs = np.where(diffuse)
    H, W = diffuse.shape
    up, dn = np.maximum(ys - 1, 0), np.minimum(ys + 1, H - 1)
    lf, rt = np.maximum(xs - 1, 0), np.minimum(xs + 1, W - 1)
    for _ in range(iters):
        out[ys, xs] = (out[up, xs] + out[dn, xs] + out[ys, lf] + out[ys, rt]) / 4
    return out


def repair():
    os.makedirs(BUILD, exist_ok=True)
    g = read_glb(SOURCE)
    P, UV, F = g["P"], g["UV"], g["F"]
    Wv = to_model(P)
    Nv = to_model(g["N"])
    base = np.asarray(g["base"]).astype(np.float64) / 255
    rm = np.asarray(g["rm"]).astype(np.float64) / 255
    nrm = np.asarray(g["normal"]).astype(np.float64) / 255
    H, W_, _ = base.shape
    skin = skin_mask(texel(base, UV))
    ce, ax = sword_axis(Wv, skin)
    # the sword as the source has it, for fitting the new one (its guard's line, its reach)
    t = (Wv - ce) @ ax
    rad = np.linalg.norm((Wv - ce) - np.outer(t, ax), axis=1)
    gm = (t > -0.275) & (t < -0.215) & (rad > 0.06) & (rad < 0.15) & (~skin)
    gc = Wv[gm] - ce
    guard = np.linalg.svd(gc - np.outer(gc @ ax, ax) - (gc - np.outer(gc @ ax, ax)).mean(0), full_matrices=False)[2][0]

    # weld at seams: one surface
    _, wid = np.unique(np.round(P / 1e-5).astype(np.int64), axis=0, return_inverse=True)
    wid = wid.ravel()
    Wel = np.zeros((wid.max() + 1, 3))
    Wel[wid] = Wv
    Fw = wid[F]
    gone = sword_faces(Wv, F, skin, ce, ax) | steel_faces(Wv, F, UV, base, ce, ax)
    kept = np.where(~gone)[0]
    # only the two arms: not the crumbs of sword the colours left behind
    n = len(Wel)
    e = edges_of(Fw[kept])
    A = sp.csr_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n))
    _, comp = connected_components(A, directed=False)
    fc = comp[Fw[kept, 0]]
    ids, cnt = np.unique(fc, return_counts=True)
    kept = kept[fc == ids[np.argmax(cnt)]]
    print(f"sword faces off: {gone.sum()}, crumbs off: {(~gone).sum() - len(kept)}, kept {len(kept)}")
    right = split_arms(Wel, Fw[kept])
    vs = right[Fw[kept]].sum(1)
    groups = {"R": kept[vs == 3], "L": kept[vs == 0]}
    print(f"arms parted: R {len(groups['R'])} faces, L {len(groups['L'])}, {((vs > 0) & (vs < 3)).sum()} on the cut dropped")
    for k in groups:
        groups[k] = make_manifold(Fw, peel_slivers(Fw, make_manifold(Fw, groups[k], Wel, ce, ax), Wel, ce, ax), Wel, ce, ax)
        relax_rims(Wel, boundary_loops(Fw[groups[k]]), ce, ax)
    Wv = Wel[wid]     # (the rims moved)

    # --- texture: steel on the skin near the hands comes off first, so rims sample clean colour
    hand_faces = np.concatenate(list(groups.values()))
    used = np.zeros((H, W_), bool)
    steel = np.zeros((H, W_), bool)
    uvp = UV * np.array([W_, H])
    fw_c = Wv[F[hand_faces]].mean(1) - ce
    fw_t = fw_c @ ax
    fw_r = np.linalg.norm(fw_c - np.outer(fw_t, ax), axis=1)
    near = (fw_t > -0.60) & (fw_t < -0.20) & (fw_r < 0.085)
    for fi, is_near in zip(hand_faces, near):
        tri = uvp[F[fi]]
        x, y, _ = rasterize(tri)
        x, y = np.clip(x, 0, W_ - 1), np.clip(y, 0, H - 1)
        used[y, x] = True
        if is_near:
            bad = steely(base[y, x])
            steel[y[bad], x[bad]] = True
    print(f"steel texels on the hands: {steel.sum()}")
    # grow the steel a little: its halo of JPEG noise goes with it
    grown = steel.copy()
    for _ in range(3):
        grown |= np.roll(grown, 1, 0) | np.roll(grown, -1, 0) | np.roll(grown, 1, 1) | np.roll(grown, -1, 1)
    grown &= used
    unknown = grown | (~used)
    base = inpaint(base, unknown, grown)
    rm = inpaint(rm, unknown, grown)
    nrm[grown] = (0.5, 0.5, 1.0)     # (the sword's own bumps go with its colour)

    # --- the holes: faired patches, each with a chart in the atlas's free room
    fc_all = Wv[F[hand_faces]].mean(1) - ce
    hand_zone = hand_faces[(np.linalg.norm(fc_all - np.outer(fc_all @ ax, ax), axis=1) < 0.09)]
    hz = texel(base, UV[F[hand_zone].ravel()])
    skin_tone = np.median(hz[skin_mask(hz)], axis=0)
    occupied = used.copy()
    du, dv = uvp[F[kept, 1]] - uvp[F[kept, 0]], uvp[F[kept, 2]] - uvp[F[kept, 0]]
    density = np.sqrt(np.abs(du[:, 0] * dv[:, 1] - du[:, 1] * dv[:, 0]).sum()
                      / np.linalg.norm(np.cross(Wv[F[kept, 1]] - Wv[F[kept, 0]], Wv[F[kept, 2]] - Wv[F[kept, 0]]), axis=1).sum())
    print(f"texel density {density:.0f} px/m")
    V_new, N_new, UV_new, F_new = [], [], [], []
    base_v = len(P)

    def place(w, h, occ):
        """Top-left of a free w x h rectangle, by an integral image."""
        I = np.zeros((H + 1, W_ + 1), np.int64)
        I[1:, 1:] = occ.astype(np.int64).cumsum(0).cumsum(1)
        s = I[h:, w:] - I[:-h, w:] - I[h:, :-w] + I[:-h, :-w]
        ys, xs = np.where(s == 0)
        if not len(ys):
            raise RuntimeError(f"no room in the atlas for a {w} x {h} chart")
        i = np.argmin(ys * W_ + xs)
        return xs[i], ys[i]

    reports = []
    for side, fidx in groups.items():
        tris_w = Fw[fidx]
        loops = boundary_loops(tris_w)
        # corner of the source mesh at each welded vert: its UV and normal, for sampling the rim
        corner = {}
        for f, fw in zip(F[fidx], tris_w):
            for a, b in zip(f, fw):
                corner.setdefault(b, []).append(a)
        for lp in loops:
            q = Wel[lp]
            nfix = len(lp)
            peri = np.linalg.norm(q - np.roll(q, -1, 0), axis=1).sum()
            tt = fill_min_area(q)
            pts, tr = refine(q, tt, nfix, PATCH_EDGE)
            # the ring of the surface just beyond the rim holds the patch tangent
            lp_set = {v: i for i, v in enumerate(lp)}
            ring = {}
            outer = []
            for fw in tris_w:
                if any(v in lp_set for v in fw):
                    t3 = []
                    for v in fw:
                        if v in lp_set:
                            t3.append(lp_set[v])
                        else:
                            ring.setdefault(v, len(pts) + len(ring))
                            t3.append(ring[v])
                    outer.append(t3)
            outer_pts = Wel[list(ring)] if ring else np.zeros((0, 3))
            pts = fair(pts, tr, nfix, outer_pts, np.array(outer) if outer else np.zeros((0, 3), int))
            nv = len(pts)
            # rim colour from the (now clean) atlas, then harmonic over the patch
            rim_c, rim_rm, rim_n = [], [], []
            for v in lp:
                cs = corner[v]
                rim_c.append(texel(base, UV[cs]).mean(0))
                rim_rm.append(texel(rm, UV[cs]).mean(0))
                rim_n.append(Nv[cs].mean(0))
            rim_c, rim_rm, rim_n = np.array(rim_c), np.array(rim_rm), np.array(rim_n)
            # (a rim vert on anything but skin takes its colour from the nearest skin along the rim)
            mx_ = rim_c.max(1)
            ok = skin_mask(rim_c) & ((mx_ - rim_c.min(1)) / np.maximum(mx_, 1e-3) > 0.3)
            if not ok.any():
                ok[:] = True
                rim_c[:] = skin_tone
            good = np.where(ok)[0]
            for i in np.where(~ok)[0]:
                d0 = np.abs(good - i)
                rim_c[i] = rim_c[good[np.argmin(np.minimum(d0, nfix - d0))]]
            for _ in range(2):
                rim_c = 0.5 * rim_c + 0.25 * (np.roll(rim_c, 1, 0) + np.roll(rim_c, -1, 0))
            rim_n /= np.maximum(np.linalg.norm(rim_n, axis=1, keepdims=True), 1e-9)
            ee = edges_of(tr)
            Adj = sp.csr_matrix((np.ones(len(ee) * 2), (np.r_[ee[:, 0], ee[:, 1]], np.r_[ee[:, 1], ee[:, 0]])), shape=(nv, nv))
            Lap = (sp.diags(np.asarray(Adj.sum(1)).ravel()) - Adj).tocsr()
            I_, K_ = np.arange(nfix, nv), np.arange(nfix)
            col = np.zeros((nv, 3))
            col[K_] = rim_c
            rmv = np.zeros((nv, 3))
            rmv[K_] = rim_rm
            hollow = np.zeros(nv)
            if len(I_):
                solver = Lap[I_][:, I_].tocsc()
                for c in range(3):
                    col[I_, c] = spsolve(solver, -Lap[I_][:, K_] @ col[K_, c])
                    rmv[I_, c] = spsolve(solver, -Lap[I_][:, K_] @ rmv[K_, c])
                # how deep into the patch (0 at the rim, 1 at the middle): -Lu = 1, normalised
                hollow[I_] = spsolve(solver, np.ones(len(I_)))
                hollow /= max(hollow.max(), 1e-9)
            # (toward the middle: the hand's own tone, in the shade of the closed fist)
            dp = np.sqrt(np.clip(hollow, 0, 1))[:, None]
            col = (col * (1 - 0.7 * dp) + skin_tone * 0.7 * dp) * (1 - HOLLOW * dp)
            # shading: the rim keeps the surface's normals, the middle its own
            nrms = np.zeros((nv, 3))
            for a, b, c in tr:
                fnn = np.cross(pts[b] - pts[a], pts[c] - pts[a])
                nrms[[a, b, c]] += fnn
            nrms[:nfix] = rim_n
            nrms /= np.maximum(np.linalg.norm(nrms, axis=1, keepdims=True), 1e-9)
            # the chart
            uvd = tutte_disc(tr, nv, nfix)
            # (a patch holds only a soft gradient, so its chart needs far less than the skin's density)
            r_px = int(np.clip(peri / (2 * np.pi) * density, 10, CHART_MAX))
            box = 2 * (r_px + PAD)
            x0, y0 = place(box, box, occupied)
            occupied[y0:y0 + box, x0:x0 + box] = True
            cuv_px = uvd * r_px + np.array([x0 + r_px + PAD, y0 + r_px + PAD])
            # paint: every texel of the box, nearest triangle wins (the box's corners stay rim colour)
            base[y0:y0 + box, x0:x0 + box] = rim_c.mean(0)
            rm[y0:y0 + box, x0:x0 + box] = rim_rm.mean(0)
            nrm[y0:y0 + box, x0:x0 + box] = (0.5, 0.5, 1.0)
            for a, b, c in tr:
                x, y, w = rasterize(cuv_px[[a, b, c]])
                if not len(x):
                    continue
                x, y = np.clip(x, x0, x0 + box - 1), np.clip(y, y0, y0 + box - 1)
                base[y, x] = col[a][None] * w[:, [0]] + col[b][None] * w[:, [1]] + col[c][None] * w[:, [2]]
                rm[y, x] = rmv[a][None] * w[:, [0]] + rmv[b][None] * w[:, [1]] + rmv[c][None] * w[:, [2]]
            off = base_v + sum(len(v) for v in V_new)
            V_new.append(pts)
            N_new.append(nrms)
            UV_new.append(cuv_px / np.array([W_, H]))
            F_new.append(tr + off)
            cc = q.mean(0) - ce
            reports.append(f"{side} hole: {nfix} rim verts, {peri:.3f} m round, at t={cc @ ax:+.3f} -> {len(tr)} faces, chart {box}px at ({x0},{y0})")
    print("\n".join(reports))

    # the rest of the atlas (what the sword's islands left): skin, so nothing grey bleeds in at mips
    base = inpaint(base, ~occupied)
    rm = inpaint(rm, ~occupied)
    nrm[~occupied] = (0.5, 0.5, 1.0)

    # --- together: what's kept of the source's verts, plus the patches
    keepF = np.concatenate([F[groups["R"]], F[groups["L"]]])
    V = np.vstack([Wv] + V_new)
    N = np.vstack([Nv] + N_new)
    UVs = np.vstack([UV] + UV_new)
    Fall = np.vstack([keepF] + F_new)
    side = np.zeros(len(V), np.int8)
    side[np.unique(F[groups["R"]])] = 1
    side[np.unique(F[groups["L"]])] = -1
    o = base_v
    for pts_, tr_ in zip(V_new, F_new):
        # (a patch belongs to the arm of the source verts its rim lies on)
        c = pts_.mean(0)
        rv = Wel[right & np.isin(np.arange(n), np.unique(Fw[groups["R"]]))]
        lv = Wel[(~right) & np.isin(np.arange(n), np.unique(Fw[groups["L"]]))]
        s = 1 if np.linalg.norm(rv - pts_[0], axis=1).min() < np.linalg.norm(lv - pts_[0], axis=1).min() else -1
        side[o:o + len(pts_)] = s
        o += len(pts_)
    live = np.unique(Fall)
    remap = -np.ones(len(V), np.int64)
    remap[live] = np.arange(len(live))
    Fall = remap[Fall]
    V, N, UVs, side = V[live], N[live], UVs[live], side[live]
    # one smooth normal per point of the surface, seams and patch rims included (the source's own
    # have strays that catch the light in stars)
    _, wv = np.unique(np.round(V / 1e-5).astype(np.int64), axis=0, return_inverse=True)
    wv = wv.ravel()
    A_, B_, C_ = V[Fall[:, 0]], V[Fall[:, 1]], V[Fall[:, 2]]
    fn = np.cross(B_ - A_, C_ - A_)
    acc = np.zeros((wv.max() + 1, 3))
    for k in range(3):
        np.add.at(acc, wv[Fall[:, k]], fn)
    acc /= np.maximum(np.linalg.norm(acc, axis=1, keepdims=True), 1e-12)
    bad = (acc[wv] * (N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9))).sum(1) < 0.5
    print(f"normals rebuilt: {bad.sum()} of the old ones were more than 60 degrees off the surface")
    N = acc[wv]
    np.savez(os.path.join(BUILD, "repaired.npz"), V=V, N=N, UV=UVs, F=Fall, side=side, sword_c=ce, sword_ax=ax, guard=guard)
    to8 = lambda a: Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
    to8(base).save(os.path.join(BUILD, "arms_basecolor.jpg"), quality=93, subsampling=0)
    to8(rm).save(os.path.join(BUILD, "arms_rm.jpg"), quality=90, subsampling=0)
    to8(nrm).save(os.path.join(BUILD, "arms_normal.png"), optimize=True)
    print(f"repaired: {len(V)} verts, {len(Fall)} faces, sword axis {ax.round(4)} through {ce.round(4)}, guard line {guard.round(3)}")


if __name__ == "__main__":
    repair()
