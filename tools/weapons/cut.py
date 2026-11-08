"""Cuts the owner's Tripo weapon and shield sheets (sheets.py) into one item each, with no Blender.

    python tools/weapons/cut.py                 every sheet
    python tools/weapons/cut.py Shields Axes    only these folders

Each sheet is one mesh with four to eight things on it, in one row or two. Its loose parts are found, and parts that overlap
along the row by half the narrower one are one item (a dagger's hilt and its broken-off blade, a bow's string). Where two
things are fused into one part (the first mace sheet, two great mace sheets, a great axe sheet), the part is cut where the
surface walk from each handle meets (as tools/staffs2/cut.py cuts staffs). A speck no item overlaps goes to the nearest.

The shape is the model's own: one turn and one uniform scale, nothing bent. Its charts are copied texel for texel out of the
sheet's maps into an atlas of its own, then scaled down to TEX if larger (tools/staffs2/cut.py's atlas and writer).

Shields are put in the frame the kite shields have been in since tools/shields/separate.py: the grip at the origin on the back
of the board, GRIP of its height up from the point, top up (+Y), face out (-Z), sized to an AREA. They go to assets/game/items,
where the game loads them, and their table to src/items/shields2.js. Icons: tools/weapons/shield_icons.py, in background Blender.

Weapons go to assets/game/weapons/<kind>/<id>.glb, for later: stood up with the striking end up (+Y), the sheet's front to -X and
its width along Z (the staffs' frame), the origin at the middle of the bottom end (bows and boomerangs: the middle of their box),
every sheet sized so its longest thing is its kind's LENGTH. No grip is set yet. All are listed in assets/game/weapons/weapons.json.
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from glbio import read_glb, staffcut as sc  # noqa: E402
from sheets import SHEETS, sheet_path  # noqa: E402

ITEMS = os.path.join(ROOT, "assets", "game", "items")
STORE = os.path.join(ROOT, "assets", "game", "weapons")
BUILD = os.path.join(ROOT, "tools", "build", "weapons")
TEX = 1024
# area: square metres, width by height, as the old kites' 0.33 (about 0.39 by 0.86); a tower is half as big again.
# length: metres, the longest thing on a sheet. flip: drawn point down on the sheet. hands: 0 for a shield.
KINDS = dict(
    kite=dict(area=0.33, grip=0.58, hands=0),
    tower=dict(area=0.50, grip=0.55, hands=0),
    sword=dict(length=1.1, flip=True, hands=1, folder="swords"),
    dagger=dict(length=0.45, flip=True, hands=1, folder="daggers"),
    spear=dict(length=2.3, hands=2, folder="spears"),
    lance=dict(length=3.0, hands=1, folder="lances"),
    mace=dict(length=0.75, hands=1, folder="maces"),
    great_mace=dict(length=1.35, hands=2, folder="maces"),
    axe=dict(length=0.75, hands=1, folder="axes"),
    great_axe=dict(length=1.4, hands=2, folder="axes"),
    bow=dict(length=1.45, hands=2, folder="bows", middle=True),
    boomerang=dict(length=0.6, hands=1, folder="boomerangs", middle=True),
)
SPECK = 0.015        # of a row's triangles: less than this and a part no item overlaps isn't an item of its own
# The sheet's axes to a weapon's, as the staffs: the sheet's depth to X (its front to -X), up stays up, its width to Z. A turn.
R = np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]], float)


# ---- which item each triangle is ----

def overlap(a, b):
    """How much two x ranges overlap, of the narrower."""
    return (min(a[1], b[1]) - max(a[0], b[0])) / max(min(a[1] - a[0], b[1] - b[0]), 1e-9)


def by_handles(W, Fw, faces, k, spacing):
    """k things fused into one part, cut where the surface walks from their handles meet: labels 0..k-1, left to right."""
    vs, loc = np.unique(Fw[faces], return_inverse=True)
    Fl = loc.reshape(-1, 3)
    V = W[vs]
    y0, h = V[:, 1].min(), np.ptp(V[:, 1])
    lo, hi = y0 + 0.08 * h, y0 + 0.45 * h
    band = (V[:, 1] > lo) & (V[:, 1] < hi)
    x0, step = V[:, 0].min(), 0.003
    bins = ((V[:, 0] - x0) / step).astype(int)
    nb = bins.max() + 2
    # A handle runs through every height of the band; a cloth or a vine only through some.
    cover = np.zeros(nb)
    edges_ = np.linspace(lo, hi, 31)
    for a, b in zip(edges_[:-1], edges_[1:]):
        hit = np.zeros(nb, bool)
        hit[bins[band & (V[:, 1] >= a) & (V[:, 1] < b)]] = True
        cover += hit | np.r_[hit[1:], False] | np.r_[False, hit[:-1]]
    cover = np.convolve(cover, np.ones(3) / 3, "same")
    c = []
    for b in np.argsort(-cover, kind="stable"):
        if all(abs(b - o) * step > 0.5 * spacing for o in c):
            c.append(b)
        if len(c) == k:
            break
    cx = np.sort(x0 + (np.array(c) + 0.5) * step)
    r = min(0.014, 0.1 * spacing)
    seeds, owner = [], []
    for j, x in enumerate(cx):
        near = np.nonzero(band & (np.abs(V[:, 0] - x) < r))[0]
        assert len(near) > 10, f"no handle at {x:.3f}"
        seeds += list(near)
        owner += [j] * len(near)
    E = np.unique(np.sort(np.concatenate([Fl[:, [0, 1]], Fl[:, [1, 2]], Fl[:, [2, 0]]]), 1), axis=0)
    E = E[E[:, 0] != E[:, 1]]
    L = np.linalg.norm(V[E[:, 0]] - V[E[:, 1]], axis=1) + 1e-9
    n = len(V)
    G = coo_matrix((np.r_[L, L], (np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]])), shape=(n, n)).tocsr()
    dist, _, src = dijkstra(G, directed=False, indices=np.array(seeds), min_only=True, return_predecessors=True)
    own = np.full(n, -1)
    own[seeds] = owner
    lab = np.full(n, -1)
    ok = np.isfinite(dist)
    lab[ok] = own[src[ok]]
    if (~ok).any():                     # (a speck that joined this group: the nearest)
        _, i = cKDTree(V[ok]).query(V[~ok])
        lab[~ok] = lab[ok][i]
    t = lab[Fl]
    return np.where(t[:, 1] == t[:, 2], t[:, 1], t[:, 0]), cx


def split(g, rows, n):
    """Which item each triangle is, 0 to n-1, top row first, left to right."""
    P, F = g["P"], g["F"]
    w = sc.weld(P)
    nw = w.max() + 1
    W = np.zeros((nw, 3))
    W[w] = P
    Fw = w[F]
    fc = sc.labels(Fw, nw)[Fw[:, 0]]
    parts = {}
    for i in np.unique(fc):
        f = np.nonzero(fc == i)[0]
        V = W[np.unique(Fw[f])]
        parts[i] = dict(faces=f, lo=V.min(0), hi=V.max(0))
    row_of = {i: 0 for i in parts}
    if rows == 2:
        ys = np.sort(W[:, 1])
        y0, h = ys[0], ys[-1] - ys[0]
        mid = (ys > y0 + 0.3 * h) & (ys < y0 + 0.7 * h)
        yy = ys[mid]
        k = np.diff(yy).argmax()
        cut_y = (yy[k] + yy[k + 1]) / 2
        row_of = {i: 0 if (p["lo"][1] + p["hi"][1]) / 2 > cut_y else 1 for i, p in parts.items()}
    cols = n // rows
    face = np.full(len(F), -1)
    out = 0
    report = []
    for r in range(rows):
        mine = [i for i in parts if row_of[i] == r]
        groups = [dict(ids=[i], lo=parts[i]["lo"][0], hi=parts[i]["hi"][0]) for i in mine]
        joined = True
        while joined:
            joined = False
            for a in range(len(groups)):
                for b in range(a + 1, len(groups)):
                    A, B = groups[a], groups[b]
                    if overlap((A["lo"], A["hi"]), (B["lo"], B["hi"])) >= 0.5:
                        A["ids"] += B["ids"]
                        A["lo"], A["hi"] = min(A["lo"], B["lo"]), max(A["hi"], B["hi"])
                        groups.pop(b)
                        joined = True
                        break
                if joined:
                    break
        for G in groups:
            G["faces"] = np.concatenate([parts[i]["faces"] for i in G["ids"]])
        total = sum(len(G["faces"]) for G in groups)
        main = [G for G in groups if len(G["faces"]) >= SPECK * total]
        specks = [G for G in groups if len(G["faces"]) < SPECK * total]
        x0, x1 = min(G["lo"] for G in main), max(G["hi"] for G in main)
        spacing = (x1 - x0) / cols
        for G in main:
            G["k"] = max(1, int(round((G["hi"] - G["lo"]) / spacing)))
        if sum(G["k"] for G in main) != cols:
            # (One wide thing among narrow ones, a bow and its string say: as many as there are, if that's the count.)
            assert len(main) == cols, f"row {r}: {len(main)} parts, widths {[round(G['hi'] - G['lo'], 3) for G in main]}, for {cols}"
            for G in main:
                G["k"] = 1
        for s in specks:
            mid_x = (s["lo"] + s["hi"]) / 2
            G = min(main, key=lambda G: 0 if G["lo"] <= mid_x <= G["hi"] else min(abs(G["lo"] - mid_x), abs(G["hi"] - mid_x)))
            G["faces"] = np.concatenate([G["faces"], s["faces"]])
        main.sort(key=lambda G: G["lo"] + G["hi"])
        for G in main:
            if G["k"] == 1:
                face[G["faces"]] = out
            else:
                sub, cx = by_handles(W, Fw, G["faces"], G["k"], spacing)
                face[G["faces"]] = out + sub
                report.append(f"fused part cut at handles {np.round(cx, 3)}")
            out += G["k"]
        if specks:
            report.append(f"row {r}: {len(specks)} specks joined")
    assert out == n and (face >= 0).all(), f"{out} items for {n}"
    return face, report


# ---- each item ----

def frame(spec, P, N, sheet_long):
    """The item's own frame: (positions, normals) in metres."""
    if spec.get("area"):
        x0, x1 = P[:, 0].min(), P[:, 0].max()
        y0, y1 = P[:, 1].min(), P[:, 1].max()
        w, h = x1 - x0, y1 - y0
        cx = (x0 + x1) / 2
        # The back of the board: most of its middle, not a strap standing off it. (The face looks along +Z on the sheet.)
        back = np.percentile(P[np.abs(P[:, 0] - cx) < 0.15 * w, 2], 15)
        o = np.array([cx, y0 + spec["grip"] * h, back])
        T = np.diag([-1.0, 1.0, -1.0])           # a half turn about the height: face out to -Z
        return (P - o) @ T * np.sqrt(spec["area"] / (w * h)), N @ T
    T = R @ (np.diag([-1.0, -1.0, 1.0]) if spec.get("flip") else np.eye(3))
    Q, Nq = P @ T.T, N @ T.T
    if spec.get("middle"):
        o = (Q.min(0) + Q.max(0)) / 2
    else:
        y0 = Q[:, 1].min()
        foot = Q[Q[:, 1] < y0 + 0.04 * np.ptp(Q[:, 1])]
        o = np.array([(foot[:, 0].min() + foot[:, 0].max()) / 2, y0, (foot[:, 2].min() + foot[:, 2].max()) / 2])
    return (Q - o) * (spec["length"] / sheet_long), Nq


def thumb(P, UV, F, alb, px=520):
    """The item as it sat on the sheet, from the front, for the contact sheets."""
    rng = np.random.default_rng(1)
    tri, tuv = P[F], UV[F]
    pts, uvs = [P], [UV]
    for _ in range(4):
        a, b = rng.random(2)
        a, b = (1 - a, 1 - b) if a + b > 1 else (a, b)
        pts.append(tri[:, 0] + a * (tri[:, 1] - tri[:, 0]) + b * (tri[:, 2] - tri[:, 0]))
        uvs.append(tuv[:, 0] + a * (tuv[:, 1] - tuv[:, 0]) + b * (tuv[:, 2] - tuv[:, 0]))
    pts, uvs = np.concatenate(pts), np.concatenate(uvs)
    hh, ww = alb.shape[:2]
    col = alb[np.clip((uvs[:, 1] * hh).astype(int), 0, hh - 1), np.clip((uvs[:, 0] * ww).astype(int), 0, ww - 1)]
    lo, hi = pts.min(0), pts.max(0)
    k = px / max(hi[1] - lo[1], hi[0] - lo[0])
    W_, H_ = int((hi[0] - lo[0]) * k) + 2, int((hi[1] - lo[1]) * k) + 2
    img = np.full((H_, W_, 3), 38, np.uint8)
    o = np.argsort(pts[:, 2])
    img[(H_ - 1 - (pts[o, 1] - lo[1]) * k).astype(int), ((pts[o, 0] - lo[0]) * k).astype(int)] = col[o]
    return img


def build(sheet):
    spec = KINDS[sheet["kind"]]
    g = read_glb(sheet_path(sheet))
    n = len(sheet["items"])
    face, report = split(g, sheet["rows"], n)
    charts = sc.all_charts(g["UV"], g["F"], face)
    shield = bool(spec.get("area"))
    # Every weapon on a sheet takes the sheet's one scale: the longest thing on it is its kind's length.
    sheet_long = max(np.ptp(g["P"][np.unique(g["F"][face == k])][:, :2], 0).max() for k in range(n))
    folder = ITEMS if shield else os.path.join(STORE, spec["folder"])
    os.makedirs(folder, exist_ok=True)
    rows, thumbs = [], []
    for k, (name, title) in enumerate(sheet["items"]):
        mine_f = np.nonzero(face == k)[0]
        mine = [c for c in charts if np.isin(c["faces"], mine_f).any()]
        F0 = g["F"][mine_f]
        used = np.unique(F0)
        remap = np.full(len(g["P"]), -1)
        remap[used] = np.arange(len(used))
        F = remap[F0]
        V, Nn = frame(spec, g["P"][used], g["N"][used], sheet_long)
        UV0 = g["UV"][used]
        placed, S = None, 0
        for S in range(512, sc.TEX + 1, 256):
            placed = sc.pack(mine, S)
            if placed:
                break
        assert placed, f"{name} doesn't fit"
        UV = np.zeros((len(used), 2))
        maps = [np.zeros((S, S, 3), np.uint8) for _ in g["maps"]]
        done = np.zeros((S, S), bool)
        for c in mine:
            dx, dy = placed[c["id"]]
            ys, xs = c["copy"]
            for o, m in zip(maps, g["maps"]):
                o[ys + dy, xs + dx] = m[ys + c["y"], xs + c["x"]]
            done[ys + dy, xs + dx] = True
            vv = remap[c["verts"]]
            vv = vv[vv >= 0]
            UV[vv] = (UV0[vv] * sc.TEX + (dx - c["x"], dy - c["y"])) / S
        near = ndimage.distance_transform_edt(~done, return_distances=False, return_indices=True)
        maps = [o[near[0], near[1]] for o in maps]
        if S > TEX:
            maps = [np.array(Image.fromarray(o).resize((TEX, TEX), Image.LANCZOS)) for o in maps]
        path = os.path.join(folder, f"{name}.glb")
        size = sc.write(path, name, V, Nn, UV, F, maps, None, {}, generator="bm tools/weapons/cut.py")
        ext = np.ptp(V, 0)
        rows.append(dict(id=name, name=title, kind=sheet["kind"], hands=spec["hands"], tier=sheet["tier"], note=sheet["note"],
                         file=os.path.relpath(path, ROOT).replace(os.sep, "/"), source=f"{sheet['folder']}/{sheet['file']}",
                         size=[round(float(x), 3) for x in ext], tris=int(len(F))))
        thumbs.append((name, thumb(g["P"][used], UV0, F, g["maps"][0])))
        print(f"  {name:24s} {size / 1e6:5.2f} MB {len(F):6d} tris  atlas {S}->{min(S, TEX)}  {done.mean() * 100:3.0f}% used  "
              f"size {ext[0]:.2f} x {ext[1]:.2f} x {ext[2]:.2f} m  y {V[:, 1].min():+.2f}..{V[:, 1].max():+.2f}", flush=True)
    return sheet, rows, thumbs, report


def contact(folder, got):
    """One picture per folder of what each item got, named, as it sat on its sheet."""
    tiles = []
    for sheet, rows, thumbs, report in got:
        for name, img in thumbs:
            im = Image.fromarray(img)
            im.thumbnail((240, 300))
            t = Image.new("RGB", (240, 316), (20, 20, 22))
            t.paste(im, ((240 - im.width) // 2, 14 + (300 - im.height) // 2))
            ImageDraw.Draw(t).text((3, 1), name, fill=(255, 255, 255))
            tiles.append(t)
    per = 8
    out = Image.new("RGB", (per * 242, ((len(tiles) + per - 1) // per) * 318), (0, 0, 0))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % per) * 242, (i // per) * 318))
    os.makedirs(BUILD, exist_ok=True)
    out.save(os.path.join(BUILD, f"cut_{folder}.png"))


def write_js(manifest):
    """src/items/shields2.js: the new shields' lines of the SHIELDS table."""
    rows = ",\n".join(f"  {m['id']}: {{ name: {json.dumps(m['name'])}, rarity: {m['tier']}, kind: '{m['kind']}' }}"
                      for m in manifest.values() if m["hands"] == 0)
    with open(os.path.join(ROOT, "src", "items", "shields2.js"), "w", newline="\n") as f:
        f.write("// The kite and tower shields cut from the owner's thirteen sheets of 2026-11-07 (tools/weapons: written by cut.py from sheets.py,\n"
                "// don't edit here). rarity: what it drops as, by how fine it looks. kind: kite or tower.\n"
                f"export const SHIELDS2 = {{\n{rows},\n}};\n")


def main():
    want = set(sys.argv[1:])
    todo = [s for s in SHEETS if not want or s["folder"] in want]
    ids = [i for s in SHEETS for i, _ in s["items"]]
    assert len(ids) == len(set(ids)), "an id twice"
    old = {f[:-4] for f in os.listdir(ITEMS) if f.endswith(".glb")}
    mine = {i for s in SHEETS if KINDS[s["kind"]].get("area") for i, _ in s["items"]}
    clash = (set(ids) & old) - mine
    assert not clash, f"ids already in assets/game/items: {clash}"
    path = os.path.join(STORE, "weapons.json")
    manifest = json.load(open(path)) if os.path.exists(path) else {}
    by_folder = {}
    with ProcessPoolExecutor(6) as ex:
        for sheet, rows, thumbs, report in ex.map(build, todo):
            print(f"{sheet['folder']}/{sheet['file']}: {len(rows)} items", *report, sep="\n    ")
            for r in rows:
                manifest[r["id"]] = r
            by_folder.setdefault(sheet["folder"], []).append((sheet, rows, thumbs, report))
    for folder, got in by_folder.items():
        contact(folder.split(" ")[0], got)
    order = {i: k for k, i in enumerate(ids)}
    manifest = dict(sorted(manifest.items(), key=lambda kv: order.get(kv[0], 1e9)))
    os.makedirs(STORE, exist_ok=True)
    with open(path, "w", newline="\n") as f:
        json.dump(manifest, f, indent=1)
    write_js(manifest)
    print(len(manifest), "items in", os.path.relpath(path, ROOT))


if __name__ == "__main__":
    main()
