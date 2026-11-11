"""The bards' lutes: cuts the owner's sheet of six (one Tripo mesh, the six stood in a row, heads up) into a hero prop each.

    python tools/heroes/lutes.py LUTES.glb [--preview DIR]

Needs numpy, scipy, Pillow and meshoptimizer (pip install meshoptimizer: the sheet comes meshopt-compressed, and the same
library thins each lute down; no Blender).

Each lute is found by the gaps along the row, thinned to TRIS triangles, and its charts copied texel for texel out of the
sheet's colour map into an atlas of its own (tools/staffs2/cut.py's packer), shrunk to TEX. It's written as the other props
are (tools/heroes/kit.py write_prop; renderer.buildProp reads one primitive and one colour map), to
assets/game/heroes/kit/lute_<name>.glb, in a frame of its own:

    +Y  along the neck, toward the pegs
    +Z  out of the soundboard, the way the strings face
    the origin on the soundboard, in the middle of the bowl's width, a third of the way up from the foot

What the game needs to hold one (src/sim/hero.js) goes into kit.json's props: its length, how far the foot and the head are
from the origin, where the left hand closes on the neck (neck: y, and the neck's half thickness), where the right hand
strums (strum: y), the bowl's half width and its depth. Each bard is given one (kit.json heroes: lute), keeping the sword.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "staffs2"))
sys.path.insert(0, HERE)
import cut as staffcut  # noqa: E402
from kit import write_prop  # noqa: E402

KIT = os.path.join(ROOT, "assets", "game", "heroes", "kit.json")
OUT = os.path.join(ROOT, "assets", "game", "heroes", "kit")
LENGTH = 0.82      # metres, foot to pegs, of the longest on the sheet
TRIS, TEX = 3200, 512
# Left to right on the sheet, and the bard who plays each.
LUTES = [("lute_ivory", "bard_f1"), ("lute_rosewood", "bard_m1"), ("lute_sunburst", "bard_m2"),
         ("lute_greenwood", "bard_f2"), ("lute_ebony", "bard_m3"), ("lute_amber", "bard_f3")]


def read_sheet(path):
    """The sheet's mesh and colour map, out of its meshopt compression."""
    import meshoptimizer as mo
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    sb = raw[20 + jl + 8:]

    def view(i):
        bv = j["bufferViews"][i]
        e = bv.get("extensions", {}).get("EXT_meshopt_compression")
        if not e:
            return sb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]]
        src = sb[e["byteOffset"]:e["byteOffset"] + e["byteLength"]]
        if e["mode"] == "ATTRIBUTES":
            out = np.frombuffer(mo.decode_vertex_buffer(e["count"], e["byteStride"], src).tobytes(), np.uint8).copy()
            f = e.get("filter", "NONE")
            if f == "EXPONENTIAL":      # each float as a 24-bit mantissa and an 8-bit power of two
                v = out.view(np.int32)
                out = (((v << 8) >> 8).astype(np.float64) * np.power(2.0, v >> 24)).astype(np.float32).view(np.uint8)
            elif f != "NONE":
                raise SystemExit(f"meshopt filter {f} isn't read here")
            return out.tobytes()
        # (The binding hands back a 32-bit array whatever the index size: the first count * size bytes of it are the indices.)
        out = np.asarray(mo.decode_index_buffer(e["count"], e["byteStride"], src))
        return out.tobytes()[:e["count"] * e["byteStride"]]

    def acc(i):
        a = j["accessors"][i]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        dt = np.dtype({5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5120: np.int8, 5121: np.uint8, 5122: np.int16}[a["componentType"]])
        stride = j["bufferViews"][a["bufferView"]].get("byteStride") or dt.itemsize * n
        arr = np.frombuffer(view(a["bufferView"]), np.uint8).reshape(-1, stride)[:a["count"], :dt.itemsize * n].copy().view(dt).reshape(a["count"], n)
        if a.get("normalized"):
            arr = np.maximum(arr.astype(np.float64) / {5120: 127, 5122: 32767, 5121: 255, 5123: 65535}[a["componentType"]], -1)
        return arr if n > 1 else arr.ravel()

    pr = j["meshes"][0]["primitives"][0]
    at = pr["attributes"]
    N = acc(at["NORMAL"]).astype(np.float64)
    N /= np.linalg.norm(N, axis=1, keepdims=True) + 1e-12
    bv = j["bufferViews"][j["images"][j["textures"][j["materials"][pr["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]]["bufferView"]]
    colour = np.array(Image.open(io.BytesIO(sb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB"))
    return dict(P=acc(at["POSITION"]).astype(np.float64), N=N, UV=acc(at["TEXCOORD_0"]).astype(np.float64),
                F=acc(pr["indices"]).astype(np.int64).reshape(-1, 3), maps=[colour])


def split(g, count):
    """Which lute each triangle is, 0 to count-1 along the row (Z): by the widest gaps between them."""
    z = g["P"][g["F"]].mean(1)[:, 2]
    lo, hi = z.min(), z.max()
    bins = np.histogram(z, 400, (lo, hi))[0] > 0
    # Runs of empty bins, widest first.
    gaps, start = [], None
    for i, b in enumerate(bins):
        if not b and start is None:
            start = i
        if b and start is not None:
            gaps.append((i - start, (start + i) / 2))
            start = None
    cuts = sorted(lo + (hi - lo) * m / 400 for _, m in sorted(gaps, reverse=True)[:count - 1])
    assert len(cuts) == count - 1, f"found {len(cuts) + 1} lutes on the sheet, not {count}"
    return np.searchsorted(cuts, z)


def thin(P, N, UV, F, tris):
    """Down to about `tris` triangles, keeping the charts' edges and the colours where they are."""
    import meshoptimizer as mo
    idx = F.astype(np.uint32).ravel()
    dest = np.zeros_like(idx)
    # (Vertices that share a place but not a chart are a seam to it, and it keeps them together. Its pick of vertices is
    # from the ones there are, so each keeps its own place on the map.)
    n = mo.simplify(dest, idx, P.astype(np.float32), target_index_count=tris * 3, target_error=0.05)
    n = n[0] if isinstance(n, tuple) else n
    F2 = dest[:n].reshape(-1, 3).astype(np.int64)
    used = np.unique(F2)
    remap = np.full(len(P), -1)
    remap[used] = np.arange(len(used))
    return P[used], N[used], UV[used], remap[F2]


def build(path, preview=None):
    from scipy import ndimage
    g = read_sheet(path)
    staffcut.TEX = g["maps"][0].shape[0]
    face = split(g, len(LUTES))
    charts = staffcut.all_charts(g["UV"], g["F"], face)
    tall = max(np.ptp(g["P"][np.unique(g["F"][face == k])][:, 1]) for k in range(len(LUTES)))
    scale = LENGTH / tall
    kit = json.load(open(KIT))
    for k, (name, bard) in enumerate(LUTES):
        mine_f = np.nonzero(face == k)[0]
        mine = [c for c in charts if np.isin(c["faces"], mine_f).any()]
        F0 = g["F"][mine_f]
        used = np.unique(F0)
        remap = np.full(len(g["P"]), -1)
        remap[used] = np.arange(len(used))
        F = remap[F0]
        P, N, UV0 = g["P"][used], g["N"][used], g["UV"][used]
        # Which way the soundboard faces. Each lute stands turned its own way on the sheet, so it's found from the lute
        # itself: the soundboard is the one big flat face, so of all the ways the bowl's triangles face, level round the
        # neck's axis, the one most of its area faces is the soundboard's.
        y0, y1 = P[:, 1].min(), P[:, 1].max()
        h = y1 - y0
        tri = P[F]
        low = tri.mean(1)[:, 1] < y0 + 0.42 * h
        fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        area = np.linalg.norm(fn, axis=1) + 1e-18
        fn = fn / area[:, None]
        flat = low & (np.abs(fn[:, 1]) < 0.35)
        az = np.arctan2(fn[flat, 2], fn[flat, 0])
        hist = np.zeros(72)
        np.add.at(hist, ((az + np.pi) / (2 * np.pi) * 72).astype(int) % 72, area[flat])
        hist = hist + np.roll(hist, 1) + np.roll(hist, -1)
        peak = (hist.argmax() + 0.5) / 72 * 2 * np.pi - np.pi
        close = np.abs((az - peak + np.pi) % (2 * np.pi) - np.pi) < 0.35
        nf = (fn[flat][close] * area[flat][close, None]).sum(0)
        nf[1] = 0
        nf /= np.linalg.norm(nf)
        # The sheet's axes to the prop's: across, up the neck, out of the soundboard. A turn, not a mirror.
        R = np.array([np.cross([0, 1, 0], nf), [0, 1, 0], nf], float)
        bowl = P[P[:, 1] < y0 + 0.4 * h] @ R.T
        o = np.array([(bowl[:, 0].min() + bowl[:, 0].max()) / 2, y0 + h / 3, np.percentile(bowl[:, 2], 97)])
        V = (P @ R.T - o) * scale
        Nn = N @ R.T
        s = np.degrees(np.arctan2(nf[2], nf[0]))
        # Its own atlas.
        placed, S = None, 0
        for S in range(512, staffcut.TEX + 1, 256):
            placed = staffcut.pack(mine, S)
            if placed:
                break
        assert placed, f"{name} doesn't fit an atlas"
        UV = np.zeros((len(used), 2))
        out = np.zeros((S, S, 3), np.uint8)
        done = np.zeros((S, S), bool)
        for c in mine:
            dx, dy = placed[c["id"]]
            ys, xs = c["copy"]
            out[ys + dy, xs + dx] = g["maps"][0][ys + c["y"], xs + c["x"]]
            done[ys + dy, xs + dx] = True
            vv = remap[c["verts"]]
            vv = vv[vv >= 0]
            UV[vv] = (UV0[vv] * staffcut.TEX + (dx - c["x"], dy - c["y"])) / S
        near = ndimage.distance_transform_edt(~done, return_distances=False, return_indices=True)
        out = out[near[0], near[1]]
        if S > TEX:
            out = np.array(Image.fromarray(out).resize((TEX, TEX), Image.LANCZOS))
        V, Nn, UV, F = thin(V, Nn, UV, F, TRIS)
        # What the hands need to know.
        L = float(np.ptp(V[:, 1]))
        foot, head = float(V[:, 1].min()), float(V[:, 1].max())
        ny = foot + 0.66 * L
        ring = V[np.abs(V[:, 1] - ny) < 0.03]
        low = V[V[:, 1] < foot + 0.42 * L]
        ex = dict(kind="lute", length=round(L, 4), reach=round(head, 4), butt=round(-foot, 4),
                  neck=[round(float(ring[:, 0].mean()), 4), round(ny, 4), round(float(ring[:, 2].mean()), 4)],
                  neckR=round(float(np.ptp(ring[:, 0]) / 2), 4), strum=round(foot + 0.27 * L, 4),
                  half=round(float(np.abs(low[:, 0]).max()), 4), depth=round(float(-low[:, 2].min()), 4))
        dst = os.path.join(OUT, name + ".glb")
        write_prop(dst, name, V, Nn, UV, F, out, ex)
        kit["props"][name] = ex
        kit["heroes"][bard]["lute"] = name
        if name not in kit["items"]:
            kit["items"] = sorted(kit["items"] + [name])
        print(f"{name}: {bard}, {len(F)} tris, {os.path.getsize(dst) // 1024} KB, {L:.2f} m, soundboard turned {s:.0f} degrees from the sheet's front")
        if preview:
            os.makedirs(preview, exist_ok=True)
            Image.fromarray(out).save(os.path.join(preview, name + "_map.png"))
            # Face on (looking down -Z at the soundboard) and side on (down +X), flat-shaded by the map's colour.
            for tag, a, b, depth in (("face", 0, 1, 2), ("side", 2, 1, 0)):
                W = 360
                img = np.zeros((W * 2, W, 3), np.uint8) + 24
                cen = V[F].mean(1)
                col = out[np.clip((UV[F].mean(1)[:, 1] * out.shape[0]).astype(int), 0, out.shape[0] - 1), np.clip((UV[F].mean(1)[:, 0] * out.shape[1]).astype(int), 0, out.shape[1] - 1)]
                order = np.argsort(cen[:, depth])
                px = ((cen[:, a] / LENGTH + 0.5) * (W - 1)).astype(int).clip(0, W - 1)
                py = ((0.72 - cen[:, b] / LENGTH) * (W - 1) * 1.6).astype(int).clip(0, 2 * W - 1)
                for dx in range(-2, 3):
                    for dy in range(-2, 3):
                        img[(py[order] + dy).clip(0, 2 * W - 1), (px[order] + dx).clip(0, W - 1)] = col[order]
                Image.fromarray(img).save(os.path.join(preview, f"{name}_{tag}.png"))
    json.dump(kit, open(KIT, "w"), indent=1)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        raise SystemExit(__doc__)
    build(args[0], sys.argv[sys.argv.index("--preview") + 1] if "--preview" in sys.argv else None)
