"""Cuts the owner's eighteen Tripo sheets in F:\\!    BM V2\\! TRIPO MODELS\\Staffs 2 into one item per staff, with no Blender.

    python tools/staffs2/cut.py            every sheet
    python tools/staffs2/cut.py 3 7        only these sheets

Each sheet is one mesh with four or five staffs side by side, and their heads often touch. Every vertex goes to the staff whose
lower shaft it is nearest to along the surface (a Dijkstra from all the shafts at once), so where two heads meet the cut falls
where they meet, and each staff keeps all of its own. Loose bits (a gem, a hanging crystal) go with the staff they hang nearest.

Then each is put in the frame the game holds a staff in, as tools/staffs/new_staffs.py does: stood up by its lower shaft if it
leans (one rigid turn), the fist at the origin a little under two thirds of the way up, the head up (+Y), the sheet's width across
(+Z), the face to -X. The shape is the model's own: one turn and one uniform scale, nothing bent. Its charts are copied texel for
texel out of the sheet's 4096 maps into an atlas of its own, then scaled to MAX_TEX. Parts that hang (staffs.py DANGLES) are
marked with the point they hang from, for the renderer to swing.

Writes assets/game/items/<id>.glb and the staffs' lines in swords.json. Icons: tools/staffs2/icons.py, in background Blender.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components, dijkstra
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from staffs import MOVES, STAFFS, sheet_path  # noqa: E402

OUT = os.path.join(ROOT, "assets", "game", "items")
BUILD = os.path.join(ROOT, "tools", "build", "staffs2")
TEX = 4096                     # the sheets' maps
KEEP, GAP, CELL = 6, 6, 8      # texels kept round each chart, clear space past that, the packing grid (at 4096: a quarter of that at 1024)
LENGTH = 1.824                 # metres, foot to head, of the tallest staff on a sheet: the elementals' length
GRIP = 0.637                   # how far up from the foot the fist is, as the elementals
FILL = [("guard", 0.76, 0.03), ("blade", 0.56, 0.024), ("blade", 0.24, 0.024), ("pommel", 0.06, 0.028)]
# A sheet's glTF axes to the item's: the sheet's depth to X (its front to -X), up stays up, its width to Z. A turn, not a mirror.
R = np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]], float)


def read_glb(path):
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    sb = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n_ = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        arr = np.frombuffer(sb, dt, a["count"] * n_, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n_) if n_ > 1 else arr

    def image(t, mode="RGB"):
        bv = j["bufferViews"][j["images"][j["textures"][t["index"]]["source"]]["bufferView"]]
        return np.array(Image.open(io.BytesIO(sb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert(mode))

    node = next(n for n in j["nodes"] if "mesh" in n)
    pr = j["meshes"][node["mesh"]]["primitives"][0]
    a = pr["attributes"]
    mat = j["materials"][pr["material"]]
    P = acc(a["POSITION"]).astype(np.float64)
    # (Tripo's node may carry a transform: the sheets come out of it 1 tall, on the ground.)
    M = np.eye(4)
    if "matrix" in node:
        M = np.array(node["matrix"]).reshape(4, 4).T
    else:
        from scipy.spatial.transform import Rotation
        if "rotation" in node:
            M[:3, :3] = Rotation.from_quat(node["rotation"]).as_matrix()
        if "scale" in node:
            M[:3, :3] = M[:3, :3] * np.array(node["scale"])
        if "translation" in node:
            M[:3, 3] = node["translation"]
    P = P @ M[:3, :3].T + M[:3, 3]
    N = acc(a["NORMAL"]).astype(np.float64) @ np.linalg.inv(M[:3, :3])
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    maps = [image(mat["pbrMetallicRoughness"]["baseColorTexture"]), image(mat["pbrMetallicRoughness"]["metallicRoughnessTexture"]), image(mat["normalTexture"])]
    return dict(P=P, N=N, UV=acc(a["TEXCOORD_0"]).astype(np.float64), F=acc(pr["indices"]).astype(np.int64).reshape(-1, 3), maps=maps)


def weld(P):
    _, inv = np.unique(np.round(P * 2e4).astype(np.int64), axis=0, return_inverse=True)
    return inv.ravel()


def edges(F):
    return np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])


def split(g, count):
    """Which staff each triangle is, 0 to count-1 left to right on the sheet."""
    P, F = g["P"], g["F"]
    w = weld(P)
    n = w.max() + 1
    W = np.zeros((n, 3))
    W[w] = P
    E = np.unique(np.sort(w[edges(F)], 1), axis=0)
    E = E[E[:, 0] != E[:, 1]]
    L = np.linalg.norm(W[E[:, 0]] - W[E[:, 1]], axis=1) + 1e-9
    G = coo_matrix((np.r_[L, L], (np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]])), shape=(n, n)).tocsr()

    # The shafts, low down: the columns of the sheet that something runs through at every height. (A cloth or a vine is there at
    # some heights and not others, and a shaft at all of them.)
    band = (W[:, 1] > 0.12) & (W[:, 1] < 0.5)
    x0 = W[:, 0].min()
    bins = ((W[:, 0] - x0) / 0.004).astype(int)
    nb = bins.max() + 2
    cover = np.zeros(nb)
    for lo in np.linspace(0.12, 0.49, 30):
        hit = np.zeros(nb, bool)
        hit[bins[band & (W[:, 1] >= lo) & (W[:, 1] < lo + 0.0125)]] = True
        cover += hit | np.r_[hit[1:], False] | np.r_[False, hit[:-1]]
    cover = np.convolve(cover, np.ones(3) / 3, "same")
    c = []
    for b in np.argsort(-cover, kind="stable"):
        if all(abs(b - o) * 0.004 > 0.09 for o in c):
            c.append(b)
        if len(c) == count:
            break
    c = np.sort(x0 + (np.array(c) + 0.5) * 0.004)
    # (and to each one's own middle, from the vertices about it)
    for k in range(count):
        near = W[band & (np.abs(W[:, 0] - c[k]) < 0.02), 0]
        c[k] = np.median(near)
    seeds, owner = [], []
    for k in range(count):
        near = np.nonzero(band & (np.abs(W[:, 0] - c[k]) < 0.014))[0]
        assert len(near) > 10, f"no shaft at {c[k]:.3f}"
        seeds += list(near)
        owner += [k] * len(near)
    seeds, owner = np.array(seeds), np.array(owner)
    dist, _, src = dijkstra(G, directed=False, indices=seeds, min_only=True, return_predecessors=True)
    lab = np.full(n, -1)
    ok = np.isfinite(dist)
    own = np.full(n, -1)
    own[seeds] = owner
    lab[ok] = own[src[ok]]
    # What no shaft reaches is a part on its own (a head set on its shaft, a stone hung by nothing, a flame's tip). Right over a
    # shaft, it's that shaft's: a head floating over its own can be nearer the next staff's wide head. Otherwise it goes whole to
    # the staff it's nearest.
    if (~ok).any():
        comp = connected_components(G, directed=False)[1]
        tree = cKDTree(W[ok])
        for cc in np.unique(comp[~ok]):
            m = comp == cc
            mid = (W[m, 0].min() + W[m, 0].max()) / 2
            if np.abs(c - mid).min() < 0.03:
                lab[m] = np.argmin(np.abs(c - mid))
            else:
                d, i = tree.query(W[m])
                lab[m] = lab[ok][i[np.argmin(d)]]
    t = lab[w[F]]
    face = np.where(t[:, 1] == t[:, 2], t[:, 1], t[:, 0])
    return face, c


def stand(P):
    """The turn that stands a staff up by its lower shaft, as new_staffs.py: the line through the middles of slices from 8% to 60% up."""
    y0, y1 = P[:, 1].min(), P[:, 1].max()
    tall = y1 - y0
    tol = 0.022 * tall

    def middle(v):
        m = np.median(v)
        kept = v[np.abs(v - m) < tol]
        return (kept.min() + kept.max()) / 2

    hs = [y0 + t * tall for t in np.linspace(0.08, 0.6, 9)]
    cut = [P[np.abs(P[:, 1] - h) < 0.015 * tall] for h in hs]
    ax = np.array([np.polyfit(hs, [middle(s[:, 0]) for s in cut], 1)[0], 1.0, np.polyfit(hs, [middle(s[:, 2]) for s in cut], 1)[0]])
    ax /= np.linalg.norm(ax)
    up = np.array([0, 1.0, 0])
    ang = np.arccos(np.clip(ax @ up, -1, 1))
    if ang < 0.035:
        return np.eye(3), 0.0, middle
    k = np.cross(ax, up)
    k /= np.linalg.norm(k)
    K = np.array([[0, -k[2], k[1]], [k[2], 0, -k[0]], [-k[1], k[0], 0]])
    return np.eye(3) + np.sin(ang) * K + (1 - np.cos(ang)) * K @ K, np.degrees(ang), middle


# ---- the atlas: as tools/swords/atlas.py, at the sheets' 4096 ----

def labels(F, n):
    r = np.concatenate([F[:, 0], F[:, 1]])
    c = np.concatenate([F[:, 1], F[:, 2]])
    return connected_components(coo_matrix((np.ones(len(r)), (r, c)), shape=(n, n)), directed=False)[1]


def charts_of(UV, F):
    _, wl = np.unique(np.round(UV * TEX * 8).astype(np.int64), axis=0, return_inverse=True)
    wl = wl.ravel()
    return labels(wl[F], wl.max() + 1)[wl[F[:, 0]]]


def rasterize(uv, tris):
    px = uv[tris] * TEX
    x0, y0 = np.floor(px.reshape(-1, 2).min(0)).astype(int)
    x1, y1 = np.ceil(px.reshape(-1, 2).max(0)).astype(int) + 1
    img = Image.new("1", (x1 - x0, y1 - y0))
    d = ImageDraw.Draw(img)
    for t in px - (x0, y0):
        d.polygon([tuple(p) for p in t], fill=1)
    return (x0, y0), np.array(img)


def all_charts(UV, F, face):
    """Every chart of every staff on the sheet: what each may copy (its own texels and KEEP round them, never another's) and its room."""
    owner = np.full((TEX, TEX), -1, np.int32)
    chart = charts_of(UV, F)
    out = []
    pad = KEEP + GAP
    for c in np.unique(chart):
        sel = chart == c
        tris = F[sel]
        (x0, y0), m = rasterize(UV, tris)
        out.append(dict(id=len(out), staff=np.bincount(face[sel]).argmax(), faces=np.nonzero(sel)[0], verts=np.unique(tris), x=x0 - pad, y=y0 - pad, true=np.pad(m, pad)))
    for ch in out:
        y0, x0 = max(ch["y"], 0), max(ch["x"], 0)
        M = ch["true"][y0 - ch["y"]:, x0 - ch["x"]:][:TEX - y0, :TEX - x0]
        owner[y0:y0 + M.shape[0], x0:x0 + M.shape[1]][M] = ch["id"]
    for ch in out:
        grown = ndimage.binary_dilation(ch["true"], iterations=KEEP)
        ys, xs = np.nonzero(grown)
        sy, sx = ys + ch["y"], xs + ch["x"]
        ok = (sy >= 0) & (sy < TEX) & (sx >= 0) & (sx < TEX)
        ys, xs, sy, sx = ys[ok], xs[ok], sy[ok], sx[ok]
        mine = (owner[sy, sx] == -1) | (owner[sy, sx] == ch["id"])
        ch["copy"] = (ys[mine], xs[mine])
        room = ndimage.binary_dilation(grown, iterations=GAP)
        h, w = grown.shape
        cells = np.zeros(((h + CELL - 1) // CELL, (w + CELL - 1) // CELL), bool)
        yy, xx = np.nonzero(room)
        cells[yy // CELL, xx // CELL] = True
        ch["cells"] = cells
    return out


def pack(charts, S):
    G = S // CELL
    occ = np.zeros((G, G), np.float64)
    placed = {}
    for ch in sorted(charts, key=lambda c: -c["cells"].sum()):
        m = ch["cells"]
        h, w = m.shape
        if h > G or w > G:
            return None
        ov = np.fft.irfft2(np.fft.rfft2(occ) * np.fft.rfft2(m[::-1, ::-1].astype(np.float64), s=occ.shape), s=occ.shape)
        free = ov[h - 1:G, w - 1:G] < 0.5
        if not free.any():
            return None
        ys, xs = np.nonzero(free)
        best = np.lexsort((xs + ys, np.maximum(xs + w, ys + h)))[0]
        y, x = int(ys[best]), int(xs[best])
        occ[y:y + h, x:x + w] += m
        placed[ch["id"]] = (x * CELL, y * CELL)
    return placed


# ---- writing ----

class Glb:
    def __init__(self):
        self.bin, self.views, self.accessors = bytearray(), [], []

    def view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = dict(buffer=0, byteOffset=len(self.bin), byteLength=len(data))
        if target:
            v["target"] = target
        self.bin += data
        self.views.append(v)
        return len(self.views) - 1

    def accessor(self, arr, kind, ctype, target, minmax=False):
        a = dict(bufferView=self.view(arr.tobytes(), target), componentType=ctype, count=len(arr), type=kind)
        if minmax:
            a.update(min=[float(x) for x in arr.min(0)], max=[float(x) for x in arr.max(0)])
        self.accessors.append(a)
        return len(self.accessors) - 1


def jpeg(arr, q):
    b = io.BytesIO()
    Image.fromarray(arr).save(b, "JPEG", quality=q, subsampling=0, optimize=True)
    return b.getvalue()


def write(path, name, P, N, UV, F, maps, dangle, extras):
    b = Glb()
    images = [dict(bufferView=b.view(jpeg(maps[0], 88)), mimeType="image/jpeg", name=f"{name}_basecolor"),
              dict(bufferView=b.view(jpeg(maps[1], 85)), mimeType="image/jpeg", name=f"{name}_rm"),
              dict(bufferView=b.view(jpeg(maps[2], 92)), mimeType="image/jpeg", name=f"{name}_normal")]
    attrs = dict(POSITION=b.accessor(P.astype(np.float32), "VEC3", 5126, 34962, minmax=True), NORMAL=b.accessor(N.astype(np.float32), "VEC3", 5126, 34962),
                 TEXCOORD_0=b.accessor(UV.astype(np.float32), "VEC2", 5126, 34962))
    if dangle is not None:
        # (Which hanging part a vertex is on, 0 for none, and how much of that part's swing it takes.)
        attrs["_DANGLE"] = b.accessor(dangle.astype(np.float32), "VEC2", 5126, 34962)
    prim = dict(attributes=attrs, indices=b.accessor(F.astype(np.uint32).ravel(), "SCALAR", 5125, 34963), material=0)
    gltf = dict(asset=dict(version="2.0", generator="bm tools/staffs2/cut.py"), scene=0, scenes=[dict(name=name, nodes=[0])], nodes=[dict(name=name, mesh=0)],
                meshes=[dict(name=name, primitives=[prim], extras=extras)],
                materials=[dict(name=name, pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicRoughnessTexture=dict(index=1)), normalTexture=dict(index=2))],
                textures=[dict(source=i, sampler=0) for i in range(3)], samplers=[dict(magFilter=9729, minFilter=9987, wrapS=33071, wrapT=33071)],
                images=images, accessors=b.accessors, bufferViews=b.views, buffers=[dict(byteLength=0)])
    while len(b.bin) % 4:
        b.bin.append(0)
    gltf["buffers"][0]["byteLength"] = len(b.bin)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(b.bin)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(b.bin), 0x004E4942) + bytes(b.bin))
    return total


def surface(V, tris, y, z=0.0):
    """Where a line along X at (y, z) goes through the staff: its back and front, or None."""
    t = V[tris]
    a, b, c = t[:, 0], t[:, 1], t[:, 2]
    d = (b[:, 1] - a[:, 1]) * (c[:, 2] - a[:, 2]) - (b[:, 2] - a[:, 2]) * (c[:, 1] - a[:, 1])
    with np.errstate(divide="ignore", invalid="ignore"):
        u = ((y - a[:, 1]) * (c[:, 2] - a[:, 2]) - (z - a[:, 2]) * (c[:, 1] - a[:, 1])) / d
        v = ((b[:, 1] - a[:, 1]) * (z - a[:, 2]) - (b[:, 2] - a[:, 2]) * (y - a[:, 1])) / d
    hit = (u >= 0) & (v >= 0) & (u + v <= 1) & (np.abs(d) > 1e-12)
    if not hit.any():
        return None
    xs = a[hit, 0] + u[hit] * (b[hit, 0] - a[hit, 0]) + v[hit] * (c[hit, 0] - a[hit, 0])
    return float(xs.min()), float(xs.max())


def mark_dangles(V, F, specs):
    """What hangs: each spec names the height just under where it's tied on (cut) and a point on it (seed: up and across, in
    metres, as the staff faces you). Below the cut a pendant is a piece of its own, so the piece the seed is on is the pendant,
    to the last strand of its cord. It hangs from the middle of where it was cut. weight: how much of the swing a vertex takes,
    rising from 0 at the cut over `bend` of its length, so a cord bends where it's tied and the stone swings whole. A cloth
    bends all the way down."""
    if not specs:
        return None, []
    D = np.zeros((len(V), 2))
    w = weld(V)
    n = w.max() + 1
    W = np.zeros((n, 3))
    W[w] = V
    out = []
    for i, s in enumerate(specs):
        # (and outside the shaft's core, where a cord brushing the shaft would join it on)
        below = (W[:, 1] < s["cut"]) & (np.hypot(W[:, 0], W[:, 2]) > s.get("core", 0.032))
        Fw = w[F]
        keep = below[Fw].all(1)
        lab = labels(Fw[keep], n)
        cand = np.nonzero(below)[0]
        y, z = s["seed"][:2]
        d = np.hypot(W[cand, 1] - y, W[cand, 2] - z)
        if len(s["seed"]) > 2:   # (in front of the shaft: of what's near the seed, the nearest the eye)
            near = cand[d < d.min() + 0.012]
            seed = near[np.argmin(W[near, 0])]
        else:
            seed = cand[np.argmin(d)]
        piece = (lab == lab[seed]) & below
        assert piece.sum() < 0.25 * n, f"dangle {i}: {piece.sum()} of {n} vertices, it's joined to the staff below its cut"
        sel = piece[w]
        top = V[sel, 1].max()
        piv = V[sel & (V[:, 1] > top - 0.008)].mean(0)
        length = float(top - V[sel, 1].min())
        bend = s.get("bend", 1.0 if s.get("cloth") else 0.25)
        u = np.clip((top - V[sel, 1]) / max(length * bend, 1e-4), 0, 1)
        D[sel, 0] = i + 1
        D[sel, 1] = u * u * (3 - 2 * u)
        out.append(dict(pivot=[round(float(x), 4) for x in piv], length=round(length, 4), cloth=bool(s.get("cloth", False))))
        print(f"    dangle {i + 1}: {sel.sum()} verts, {length * 100:.1f} cm from {np.round(piv, 3)}{' cloth' if s.get('cloth') else ''}")
    return D, out


def build_sheet(sheet, manifest, only=None):
    staffs = [s for s in STAFFS if s["sheet"] == sheet]
    g = read_glb(sheet_path(sheet))
    face, cols = split(g, len(staffs))
    # Where two staffs touch and the surface walk got it wrong: these boxes of the sheet go to the staff they're the art of.
    C = g["P"][g["F"]].mean(1)
    for lo, hi, a, b in MOVES.get(sheet, []):
        m = (face == a) & np.all(C >= lo, 1) & np.all(C <= hi, 1)
        face[m] = b
        print(f"  moved {m.sum()} triangles from {a} to {b}")
    counts = np.bincount(face, minlength=len(staffs))
    print(f"sheet {sheet}: shafts at {np.round(cols, 3)}, triangles {counts}")
    charts = all_charts(g["UV"], g["F"], face)
    sheet_tall = max(np.ptp(g["P"][np.unique(g["F"][face == k]), 1]) for k in range(len(staffs)))
    os.makedirs(BUILD, exist_ok=True)
    for k, spec in enumerate(staffs):
        name = spec["id"]
        if only and name not in only:
            continue
        mine_f = np.nonzero(face == k)[0]
        # (A chart that crosses from one staff to the next, where the heads touch, is copied into both.)
        mine = [c for c in charts if np.isin(c["faces"], mine_f).any()]
        F0 = g["F"][mine_f]
        used = np.unique(F0)
        remap = np.full(len(g["P"]), -1)
        remap[used] = np.arange(len(used))
        F = remap[F0]
        P = g["P"][used] @ R.T
        Nn = g["N"][used] @ R.T
        UV0 = g["UV"][used]
        turn, lean, middle = stand(P)
        P = P @ turn.T
        Nn = Nn @ turn.T
        foot, head = P[:, 1].min(), P[:, 1].max()
        tall = head - foot
        scale = LENGTH / sheet_tall
        grip = foot + GRIP * tall
        near = P[np.abs(P[:, 1] - grip) < 0.02 * tall]
        fist = np.array([middle(near[:, 0]), grip, middle(near[:, 2])])
        V = (P - fist) * scale
        tall_m = tall * scale

        # the atlas
        placed, S = None, 0
        for S in range(512, TEX + 1, 256):
            placed = pack(mine, S)
            if placed:
                break
        assert placed, f"{name} doesn't fit"
        UV = np.zeros((len(used), 2))
        out = [np.zeros((S, S, 3), np.uint8) for _ in g["maps"]]
        done = np.zeros((S, S), bool)
        for c in mine:
            dx, dy = placed[c["id"]]
            ys, xs = c["copy"]
            ty, tx = ys + dy, xs + dx
            for o, m in zip(out, g["maps"]):
                o[ty, tx] = m[ys + c["y"], xs + c["x"]]
            done[ty, tx] = True
            vv = remap[c["verts"]]
            vv = vv[vv >= 0]
            UV[vv] = (UV0[vv] * TEX + (dx - c["x"], dy - c["y"])) / S
        near_ = ndimage.distance_transform_edt(~done, return_distances=False, return_indices=True)
        out = [o[near_[0], near_[1]] for o in out]
        T = spec.get("tex", 1024)
        if S > T:
            out = [np.array(Image.fromarray(o).resize((T, T), Image.LANCZOS)) for o in out]

        sockets = []
        for slot, up, r in FILL:
            y = V[:, 1].min() + up * tall_m
            s = V[np.abs(V[:, 1] - y) < 0.025]
            z = (lambda v: (lambda m: (v[np.abs(v - m) < 0.04].min() + v[np.abs(v - m) < 0.04].max()) / 2)(np.median(v)))(s[:, 2])
            hit = surface(V, F, y, z) or (float(s[:, 0].min()), float(s[:, 0].max()))
            sockets.append(dict(slot=slot, y=round(float(y), 4), z=round(float(z), 4), radius=r, back=round(hit[0], 4), front=round(hit[1], 4)))
        D, dangles = mark_dangles(V, F, spec.get("dangles"))
        extras = dict(dangles=dangles) if dangles else {}
        path = os.path.join(OUT, f"{name}.glb")
        size = write(path, name, V, Nn, UV, F, out, D, extras)
        y0, y1 = float(V[:, 1].min()), float(V[:, 1].max())
        margin = 0.02
        across = float(np.abs(V[:, 2]).max()) + margin
        h = max(y1 - y0 + 2 * margin, across * 8)
        mid = (y0 + y1) / 2
        manifest["swords"][name] = dict(file=f"assets/game/items/{name}.glb", icon=f"assets/game/items/icons/{name}.webp", hands=3, tip=0.5, pommel=round(y0, 4),
                                        guard=round(float(np.abs(V[:, 2]).max()), 4), frame=dict(y=[round(mid - h / 2, 4), round(mid + h / 2, 4)], z=round(h / 8, 4)), sockets=sockets)
        print(f"  {name:22s} {size / 1e6:5.2f} MB {len(F):6d} tris  atlas {S}->{min(S, T)}  {done.mean() * 100:3.0f}% used  "
              f"{tall_m:.2f} m  head {y1:+.2f}  across +-{np.abs(V[:, 2]).max():.2f}  lean {lean:4.1f}  dangles {len(dangles)}")
        np.savez_compressed(os.path.join(BUILD, f"{name}.npz"), P=V, F=F)


def write_js():
    """src/items/staffs2.js: what the game needs of the table, for the items, the hands and the shots."""
    rows = ",\n".join(f"  {{ id: '{s['id']}', name: {json.dumps(s['name'])}, tier: {s['tier']}, shot: '{s['shot']}' }}" for s in STAFFS)
    with open(os.path.join(ROOT, "src", "items", "staffs2.js"), "w", newline="\n") as f:
        f.write("// The 83 staffs cut from the owner's eighteen sheets (tools/staffs2: written by cut.py from staffs.py, don't edit here).\n"
                "// tier: the rarity it drops at, by how fine it looks. shot: what it fires, STAFF_SHOTS in src/sim/casting.js.\n"
                f"export const STAFFS2 = [\n{rows},\n];\n")


def main():
    write_js()
    args = sys.argv[1:]
    sheets = sorted({s["sheet"] for s in STAFFS})
    only = None
    if args and all(a.isdigit() for a in args):
        sheets = [int(a) for a in args]
    elif args:
        only = set(args)
        sheets = sorted({s["sheet"] for s in STAFFS if s["id"] in only})
    path = os.path.join(OUT, "swords.json")
    for sh in sheets:
        with open(path) as f:
            manifest = json.load(f)
        build_sheet(sh, manifest, only)
        with open(path, "w") as f:
            json.dump(manifest, f, indent=1)


if __name__ == "__main__":
    main()
