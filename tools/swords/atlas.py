"""Gives each sword from tools/swords/separate.py an atlas of its own and writes it to assets/game/items, with swords.json
for what the game needs without opening a GLB. A sheet's four swords share one 2048 set of maps, of which each uses 9 to
23%. Charts are moved by whole texels and never resampled or turned, so the art is the source's, texel for texel, and the
normal map stays right. Then reads the results back against the sheets in art/swords.

    (separate.py, in Blender)
    python tools/swords/atlas.py
"""
import io
import json
import os
import runpy
import struct

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ART = os.path.join(ROOT, "art", "swords")
BUILD = os.path.join(ROOT, "tools", "build", "swords")
OUT = os.path.join(ROOT, "assets", "game", "items")

SHEETS = runpy.run_path(os.path.join(HERE, "sheets.py"))["SHEETS"]
R = np.array([[0, 0, 1], [0, -1, 0], [1, 0, 0]], float)     # the source's frame to the item's, in glTF axes (separate.py's TURN)
TEX = 2048                                 # the source's maps
KEEP = 2                                   # texels kept around each chart for the filter
GAP = 3                                    # ...and clear space each side of that, so the top mips don't bleed
CELL = 4                                   # the packing grid, in texels
ICON_MARGIN = 0.02                         # clear space around a sword in its inventory icon, which is 1 wide by 4 tall
GREATSWORD = dict(icon="assets/game/items/icons/greatsword.webp", hands=2, tip=1.0, frame=dict(y=[-0.35, 1.03], z=0.1725),
                  sockets=[dict(slot="guard", y=0.085, z=0.0, radius=0.02), dict(slot="blade", y=0.55, z=0.0, radius=0.018),
                           dict(slot="blade", y=0.3, z=0.0, radius=0.018), dict(slot="pommel", y=-0.29, z=0.0, radius=0.02)])


def read_glb(path):
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    sb = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n_ = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        arr = np.frombuffer(sb, dt, a["count"] * n_, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n_) if n_ > 1 else arr

    def image(t):
        bv = j["bufferViews"][j["images"][j["textures"][t["index"]]["source"]]["bufferView"]]
        return np.array(Image.open(io.BytesIO(sb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB"))

    mesh = next(n for n in j["nodes"] if "mesh" in n)
    pr = j["meshes"][mesh["mesh"]]["primitives"][0]
    a = pr["attributes"]
    mat = j["materials"][pr["material"]]
    maps = [image(mat["pbrMetallicRoughness"]["baseColorTexture"]), image(mat["pbrMetallicRoughness"]["metallicRoughnessTexture"]), image(mat["normalTexture"])]
    return dict(j=j, node=mesh, P=acc(a["POSITION"]), N=acc(a["NORMAL"]), UV=acc(a["TEXCOORD_0"]), F=acc(pr["indices"]).astype(np.int64).reshape(-1, 3), maps=maps)


def labels(F, n):
    """Connected parts, by the vertices the triangles share."""
    r = np.concatenate([F[:, 0], F[:, 1]])
    c = np.concatenate([F[:, 1], F[:, 2]])
    return connected_components(coo_matrix((np.ones(len(r)), (r, c)), shape=(n, n)), directed=False)[1]


def charts_of(g):
    """A sword's UV charts: the triangles joined in UV space, since the exporter also splits vertices at hard edges."""
    _, weld = np.unique(np.round(g["UV"] * TEX * 8).astype(np.int64), axis=0, return_inverse=True)
    weld = weld.ravel()
    return labels(weld[g["F"]], weld.max() + 1)[weld[g["F"][:, 0]]]


def rasterize(uv, tris):
    """A chart's texels: the crop's corner and its mask."""
    px = uv[tris] * TEX
    x0, y0 = np.floor(px.reshape(-1, 2).min(0)).astype(int)
    x1, y1 = np.ceil(px.reshape(-1, 2).max(0)).astype(int) + 1
    img = Image.new("1", (x1 - x0, y1 - y0))
    d = ImageDraw.Draw(img)
    for t in px - (x0, y0):
        d.polygon([tuple(p) for p in t], fill=1)
    return (x0, y0), np.array(img)


def all_charts(swords):
    """Every chart of every sword, the texels each may copy (its own and KEEP around, never another chart's) and the room it needs."""
    owner = np.full((TEX, TEX), -1, np.int32)
    out = []
    pad = KEEP + GAP
    for k, g in enumerate(swords):
        chart = charts_of(g)
        for c in np.unique(chart):
            tris = g["F"][chart == c]
            (x0, y0), m = rasterize(g["UV"], tris)
            out.append(dict(id=len(out), sword=k, verts=np.unique(tris), x=x0 - pad, y=y0 - pad, true=np.pad(m, pad)))
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
    """Lays charts in a square of S texels, largest first, each where it keeps the used corner smallest. None if they don't fit."""
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


def surface(V, tris, y, z=0.0):
    """Where a line along X at (y, z) goes through the sword: its back and front, or None if it misses."""
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


def encode(arr, kind):
    b = io.BytesIO()
    if kind == "jpg":
        Image.fromarray(arr).save(b, "JPEG", quality=95, subsampling=0, optimize=True)
    else:
        Image.fromarray(arr).save(b, "PNG", optimize=True)
    return b.getvalue()


def write(path, name, g, UVn, maps, sockets, normal_kind="png"):
    b = Glb()
    images = [dict(bufferView=b.view(encode(maps[0], "jpg")), mimeType="image/jpeg", name=f"{name}_basecolor"),
              dict(bufferView=b.view(encode(maps[1], "jpg")), mimeType="image/jpeg", name=f"{name}_rm"),
              dict(bufferView=b.view(encode(maps[2], normal_kind)), mimeType="image/png" if normal_kind == "png" else "image/jpeg", name=f"{name}_normal")]
    prim = dict(attributes=dict(POSITION=b.accessor(g["P"], "VEC3", 5126, 34962, minmax=True), NORMAL=b.accessor(g["N"], "VEC3", 5126, 34962),
                                TEXCOORD_0=b.accessor(UVn.astype(np.float32), "VEC2", 5126, 34962)),
                indices=b.accessor(g["F"].astype(np.uint32).ravel(), "SCALAR", 5125, 34963), material=0)
    nodes = [dict(name=name, mesh=0, children=list(range(1, len(sockets) + 1)))]
    for i, s in enumerate(sockets):
        nodes.append(dict(name=f"socket_{i + 1}", translation=[0.0, s["y"], s["z"]], extras=dict(slot=s["slot"], radius=s["radius"], back=s["back"], front=s["front"])))
    gltf = dict(asset=dict(version="2.0", generator="bm tools/swords (Blender, then atlas.py)"), scene=0, scenes=[dict(name=name, nodes=[0])], nodes=nodes,
                meshes=[dict(name=name, primitives=[prim])],
                materials=[dict(name=name, pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicRoughnessTexture=dict(index=1)), normalTexture=dict(index=2))],
                textures=[dict(source=i, sampler=0) for i in range(3)], samplers=[dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)],
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


def sockets_of(g):
    out = []
    for i in g["node"].get("children", []):
        n = g["j"]["nodes"][i]
        if n["name"].startswith("socket_"):
            y, z = n["translation"][1], n["translation"][2] if len(n["translation"]) > 2 else 0.0
            hit = surface(g["P"], g["F"], y, z)
            assert hit, f"{n['name']} at {y:.3f}, {z:.3f} is off the sword"
            out.append(dict(n=n["name"], slot=n["extras"]["slot"], y=round(float(y), 4), z=round(float(z), 4), radius=round(float(n["extras"]["radius"]), 4), back=round(hit[0], 4), front=round(hit[1], 4)))
    out.sort(key=lambda s: s.pop("n"))
    assert len(out) == 4, "every sword has room for all four sockets"
    return out


def frame_of(V):
    """What a sword's icon shows, 1 wide by 4 tall: all of the sword, as large as it goes."""
    y0, y1 = float(V[:, 1].min()) - ICON_MARGIN, float(V[:, 1].max()) + ICON_MARGIN
    z = float(np.abs(V[:, 2]).max()) + ICON_MARGIN
    h = max(y1 - y0, z * 8)
    mid = (y0 + y1) / 2
    return dict(y=[round(mid - h / 2, 4), round(mid + h / 2, 4)], z=round(h / 8, 4))


def to_item(P, ex):
    """A sheet's points where separate.py put them, in glTF axes, and which of them are on the handle it drew out."""
    B = np.c_[P[:, 0], -P[:, 2], P[:, 1]] - (ex["fist_x"], ex["fist_y"], ex["fist_z"])
    s = ex["scale_from_source"]
    x, y, z = -B[:, 1] * s, -B[:, 0] * s, -B[:, 2] * s
    drawn = np.clip(ex["stretch_a"] - z, 0, ex["stretch_g"])
    return np.c_[x, z - drawn * (ex["stretch_k"] - 1), -y], (ex["stretch_g"] > 0) & (z < ex["stretch_a"] + 0.002) & (drawn < ex["stretch_g"] + 0.002)


def sample(m, uv):
    h, w = m.shape[:2]
    x, y = uv[:, 0] * w - 0.5, uv[:, 1] * h - 0.5
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    cl = lambda a, n: np.clip(a, 0, n - 1)
    m = m.astype(np.float32)
    return ((m[cl(y0, h), cl(x0, w)] * (1 - fx) + m[cl(y0, h), cl(x0 + 1, w)] * fx) * (1 - fy)
            + (m[cl(y0 + 1, h), cl(x0, w)] * (1 - fx) + m[cl(y0 + 1, h), cl(x0 + 1, w)] * fx) * fy)


def check(sheet, swords):
    """Reads the files back: the sheet's shape, normals and art, nothing lost and nothing from a neighbour."""
    src = read_glb(os.path.join(ART, sheet["source"]))
    edges = (-9, *sheet["gaps"], 9)
    C = src["P"][src["F"]].mean(1)[:, 0]
    total = 0
    for k, (spec, raw) in enumerate(zip(sheet["swords"], swords)):
        name = spec["id"]
        g = read_glb(os.path.join(OUT, f"{name}.glb"))
        assert (g["F"] == raw["F"]).all() and (g["P"] == raw["P"]).all(), "the atlas step moved geometry"
        total += len(g["F"])
        # Blender's copy against the sheet: the same points, in the item's frame.
        mine = np.unique(src["F"][(C > edges[k]) & (C < edges[k + 1])])
        A, drawn = to_item(src["P"][mine], raw["node"]["extras"])
        d, _ = cKDTree(A).query(g["P"])
        back, _ = cKDTree(g["P"]).query(A)
        # matched corner by corner on position, UV and normal (the same corner can have two normals, at a hard edge), for the normals
        Ns = src["N"][mine] @ R.T
        key = np.c_[A * 1000, src["UV"][mine] * 1000, Ns * 100]
        _, ik = cKDTree(key).query(np.c_[g["P"] * 1000, raw["UV"] * 1000, g["N"] * 100])
        dots = np.clip((Ns[ik] * g["N"]).sum(1) / np.maximum(np.linalg.norm(Ns[ik], axis=1) * np.linalg.norm(g["N"], axis=1), 1e-9), -1, 1)
        # (a handle drawn out has rightly tilted its normals. A vertex or few of the rest move on Blender's trip, on slivers of a square millimetre.)
        off = np.degrees(np.arccos(dots))[~drawn[ik]]
        worst, moved = float(np.percentile(off, 99.9)), int((off > 2).sum())
        # every vertex, and each triangle's middle, on the new maps against the source's
        lines = []
        ct = (raw["UV"][raw["F"]].mean(1), g["UV"][g["F"]].mean(1))
        uvsrc = src["UV"][mine][ik]
        for i_, nm in enumerate(("color", "rm", "normal")):
            diff = np.abs(np.r_[sample(src["maps"][i_], uvsrc) - sample(g["maps"][i_], g["UV"]), sample(src["maps"][i_], ct[0]) - sample(g["maps"][i_], ct[1])])
            lines.append(f"{nm} mean {diff.mean():.2f} p99 {np.percentile(diff, 99):.1f}")
        assert max(d.max(), back.max()) < 1e-4 and worst < 3 and moved <= 5, f"{name}: shape {max(d.max(), back.max()) * 1000:.3f} mm, normals {worst:.2f} deg, {moved} over 2"
        print(f"check {name:20s} shape {max(d.max(), back.max()) * 1000:.3f} mm, normals p99.9 {worst:.2f} deg, {moved} over 2; {'; '.join(lines)}")
    assert total == len(src["F"]), "lost geometry"
    print(f"check {sheet['source']}: {total} triangles, the whole sheet and none twice")


def build_sheet(sheet, manifest):
    ids = [spec["id"] for spec in sheet["swords"]]
    swords = [read_glb(os.path.join(BUILD, f"{n}.glb")) for n in ids]
    charts = all_charts(swords)
    for k, (name, g) in enumerate(zip(ids, swords)):
        mine = [c for c in charts if c["sword"] == k]
        placed = None
        for S in range(512, TEX + 1, 256):
            placed = pack(mine, S)
            if placed:
                break
        assert placed, f"{name} doesn't fit a {TEX} atlas"
        UVn = np.zeros((len(g["UV"]), 2))
        out = [np.zeros((S, S, 3), np.uint8) for _ in g["maps"]]
        done = np.zeros((S, S), bool)
        for c in mine:
            dx, dy = placed[c["id"]]
            ys, xs = c["copy"]
            ty, tx = ys + dy, xs + dx
            for o, m in zip(out, g["maps"]):
                o[ty, tx] = m[ys + c["y"], xs + c["x"]]
            done[ty, tx] = True
            UVn[c["verts"]] = (g["UV"][c["verts"]] * TEX + (dx - c["x"], dy - c["y"])) / S
        # the empty texels take their nearest chart's colour, so mips and JPEG have no edge to ring on
        near = ndimage.distance_transform_edt(~done, return_distances=False, return_indices=True)
        out = [o[near[0], near[1]] for o in out]
        sockets = sockets_of(g)
        size = write(os.path.join(OUT, f"{name}.glb"), name, g, UVn, out, sockets)
        V = g["P"]
        manifest["swords"][name] = dict(file=f"assets/game/items/{name}.glb", icon=f"assets/game/items/icons/{name}.webp", hands=sheet["hands"], tip=sheet["tip"], pommel=round(float(V[:, 1].min()), 4),
                                        guard=round(float(np.abs(V[:, 2]).max()), 4), frame=frame_of(V), sockets=sockets)
        print(f"{name:20s} {size / 1e6:5.2f} MB  {len(V):5d} verts {len(g['F']):5d} tris  {len(mine):3d} charts  atlas {S}  use {done.mean() * 100:.0f}%  "
              f"y[{V[:, 1].min():+.3f},{V[:, 1].max():+.3f}] z[{V[:, 2].min():+.3f},{V[:, 2].max():+.3f}] x +-{np.abs(V[:, 0]).max():.3f}")
    check(sheet, swords)


def build():
    manifest = dict(swords=dict(greatsword=GREATSWORD))
    for sheet in SHEETS:
        build_sheet(sheet, manifest)
    with open(os.path.join(OUT, "swords.json"), "w") as f:
        json.dump(manifest, f, indent=1)


if __name__ == "__main__":
    build()
