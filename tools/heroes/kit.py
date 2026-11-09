"""Arm the heroes: pick every hero's weapons by class, then cut each chosen weapon down to a hero prop.

    python kit.py pick      choose each hero's main hand, off hand and back board -> assets/game/heroes/kit.json
    python kit.py prep      strip bowstrings, weld, write tools/build/heroes/kit/src/<id>.npz for Blender
    blender -b --factory-startup -P decimate_props.py -- tools/build/heroes/kit/src tools/build/heroes/kit/dec
    python kit.py pack      grip to the origin, colour map shrunk -> assets/game/heroes/kit/<id>.glb

A prop is one primitive with one colour map (renderer.buildProp reads nothing else). Long weapons keep the catalogue's
axes: +Y along the haft or blade, the origin moved from the foot to where the fist closes. Bows keep their middle as
the grip and lose every triangle of their string: the game draws the string itself, tip to tip, in the archer's own
colour, and pulls it back to the hand when they draw. The tips are written to the prop's extras.
"""
import io
import json
import os
import random
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "tools", "staffs2"))
import cut as staffcut  # noqa: E402

CATALOGUE = os.path.join(ROOT, "assets", "game", "weapons", "weapons.json")
ROSTER = os.path.join(ROOT, "assets", "game", "heroes", "roster.json")
KIT = os.path.join(ROOT, "assets", "game", "heroes", "kit.json")
OUT = os.path.join(ROOT, "assets", "game", "heroes", "kit")
BUILD = os.path.join(ROOT, "tools", "build", "heroes", "kit")

# Heroes are Tessariel's: nothing that reads as the Dark Lord's goes in their hands.
GRIM = ("void", "blood", "skull", "hell", "death", "black", "shadow", "bone", "thorn", "butcher")
# Left out: cinder_bow came out of the cutter in two pieces with nothing at the grip; nightshade_bow's lower tip curls
# into its string and goes with it.
BROKEN = ("cinder_bow", "nightshade_bow")

# Where the fist closes, as a share of the length from the foot (bows: the middle).
GRIP = {"dagger": 0.16, "sword": 0.11, "mace": 0.12, "axe": 0.12, "great_mace": 0.2, "great_axe": 0.2,
        "spear": 0.38, "lance": 0.2, "bow": 0.5, "boomerang": 0.5, "kite": 0.5, "tower": 0.5}
# Triangles and colour-map size per kind: small things small.
BUDGET = {"dagger": (1400, 256), "sword": (1800, 256), "mace": (1800, 256), "great_mace": (2400, 256),
          "spear": (2400, 256), "lance": (3000, 512), "bow": (2000, 256), "boomerang": (1800, 256),
          "kite": (2400, 512), "tower": (2600, 512)}
# Bowstrings, drawn by the game: the colour each archer chose.
STRINGS = {"gold": [1.0, 0.78, 0.32], "azure": [0.35, 0.7, 1.0], "emerald": [0.3, 1.0, 0.55], "violet": [0.75, 0.45, 1.0],
           "crimson": [1.0, 0.3, 0.3], "silver": [0.92, 0.95, 1.0], "ember": [1.0, 0.55, 0.2], "rose": [1.0, 0.55, 0.8]}


def catalogue():
    return json.load(open(CATALOGUE))


def pool(cat, kind, *, note=None, tiers=None, exclude=()):
    out = []
    for i, v in cat.items():
        if v["kind"] != kind or any(g in i for g in GRIM) or i in exclude or i in BROKEN:
            continue
        if note and note not in v.get("note", ""):
            continue
        if tiers is not None and v["tier"] not in tiers:
            continue
        out.append(i)
    return sorted(out)


def pick():
    cat = catalogue()
    roster = json.load(open(ROSTER))
    rng = random.Random(11)
    P = {
        "maul": pool(cat, "great_mace"),
        "mace": [m for m in pool(cat, "mace") if m in ("lionsun_mace", "gilded_lion_mace", "war_hammer", "frostburst_mace", "icecrystal_mace", "bluewheel_mace", "flanged_mace")],
        "holy_kite": [k for k in pool(cat, "kite") if any(w in k for w in ("sun", "radiant", "lion", "star", "dawn", "solar", "cross", "fleur", "griffin"))],
        "kite": pool(cat, "kite", tiers=(0, 1, 2)),
        "lance": pool(cat, "lance"),
        "tower": pool(cat, "tower"),
        "bow": pool(cat, "bow"),
        "dagger": pool(cat, "dagger"),
        "spear": pool(cat, "spear", note="dragoons"),
        "boomerang": pool(cat, "boomerang"),
        "blade": pool(cat, "sword", note="rare"),
    }
    used = {k: [] for k in P}

    def take(k):
        # Every hero something of their own while the pool lasts.
        fresh = [x for x in P[k] if x not in used[k]] or P[k]
        x = rng.choice(fresh)
        used[k].append(x)
        return x

    kit, strings = {}, list(STRINGS)
    paladins = 0
    for h in roster:
        c, e = h["cls"], {"main": None, "off": None, "back": None, "string": None, "style": None}
        if c == "paladin":
            # Half carry a great hammer in both hands, half a hammer or a sword and a kite shield.
            if paladins % 2 == 0:
                e.update(main=take("maul"), back=take("kite"), style="two_hand")
            else:
                e.update(main=take("mace"), off=take("holy_kite"), style="sword_board")
            paladins += 1
        elif c == "lancer":
            e.update(main=take("lance"), off=take("tower"), style="lance")
        elif c == "archer":
            e.update(main=take("bow"), back=take("kite"), style="bow", string=strings[len(kit) % len(strings)])
        elif c in ("rogue", "ninja"):
            d = take("dagger")
            e.update(main=d, off=d, back=take("kite"), style="daggers")
        elif c == "dragoon":
            e.update(main=take("spear"), back=take("kite"), style="spear")
        elif c == "boomerang":
            b = take("boomerang")
            e.update(main=b, off=b, back=take("kite"), style="boomerang")
        elif c == "bard":
            e.update(main=take("blade"), back=take("kite"), style="blade")
        kit[h["id"]] = e
    items = sorted({x for e in kit.values() for x in (e["main"], e["off"], e["back"]) if x})
    json.dump({"heroes": kit, "strings": STRINGS, "items": items}, open(KIT, "w"), indent=1)
    print(f"{len(kit)} heroes armed with {len(items)} different items")


def read(item):
    v = catalogue()[item]
    g = staffcut.read_glb(os.path.join(ROOT, v["file"]))
    return v, g


def weld_ids(P, eps=2e4):
    _, inv = np.unique(np.round(P * eps).astype(np.int64), axis=0, return_inverse=True)
    return inv.ravel()


def strip_string(P, F):
    """Drop a bow's string: every triangle lying along the straight line between its two tips, and any loose bit
    (a nocked arrow, a string bead) that sits on that line. Returns the kept faces and the two tips."""
    y = P[:, 1]
    lo, hi = y.min(), y.max()
    H = hi - lo
    # Seen from above, the string is the one spot where vertices stack up along the whole height of the bow: find the
    # 3 mm cell holding vertices at the most different heights (2 cm steps), away from the tips' own wood.
    # (Only on the string's side of the bow: the side the tips reach toward, across from the grip.)
    tz = (P[y > hi - 0.03, 2].mean() + P[y < lo + 0.03, 2].mean()) / 2
    gz = np.median(P[np.abs(y - (hi + lo) / 2) < 0.08 * H, 2])
    side = np.sign(tz - gz)
    mid = (y > lo + 0.08 * H) & (y < hi - 0.08 * H) & ((P[:, 2] - gz) * side > 0.6 * abs(tz - gz))
    ix = np.floor(P[mid, 0] / 0.003).astype(np.int64)
    iz = np.floor(P[mid, 2] / 0.003).astype(np.int64)
    iy = np.floor(y[mid] / 0.02).astype(np.int64)
    cells = np.unique(np.c_[ix, iz, iy], axis=0)
    keys, score = np.unique(cells[:, :2], axis=0, return_counts=True)
    # (A cell's neighbours count too: a cord 8 mm thick spans a few cells.)
    best, bs = None, -1
    for k in keys[np.argsort(-score)[:40]]:
        near = (np.abs(cells[:, 0] - k[0]) <= 2) & (np.abs(cells[:, 1] - k[1]) <= 2)
        s_ = len(np.unique(cells[near, 2]))
        if s_ > bs:
            best, bs = k, s_
    cx, cz = (best + 0.5) * 0.003
    # A bow modelled without a string has no tall stack out there, only the tips' own wood: cut nothing.
    if bs * 0.02 < 0.2 * H:
        return F, P[y > hi - 0.01].mean(0), P[y < lo + 0.01].mean(0)
    # The cord may lean: fit it as a line, twice, each time to what lies close to the last fit.
    ym = (hi + lo) / 2
    fx, fz = np.array([0.0, cx]), np.array([0.0, cz])
    for r in (0.02, 0.012):
        lx, lz = fx[0] * (y - ym) + fx[1], fz[0] * (y - ym) + fz[1]
        near = mid & (np.hypot(P[:, 0] - lx, P[:, 2] - lz) < r)
        A = np.c_[y[near] - ym, np.ones(near.sum())]
        fx = np.linalg.lstsq(A, P[near, 0], rcond=None)[0]
        fz = np.linalg.lstsq(A, P[near, 2], rcond=None)[0]
    at = lambda yy: np.array([fx[0] * (yy - ym) + fx[1], yy, fz[0] * (yy - ym) + fz[1]])
    top, bot = at(hi - 0.015), at(lo + 0.015)
    ax = top - bot
    L = np.linalg.norm(ax)
    ax /= L

    def off_line(X):
        d = X - bot
        return np.linalg.norm(d - np.outer(d @ ax, ax), axis=1), (d @ ax) / L

    # First the string itself: a thin straight cord, so every corner of its triangles hugs the line. The limbs only
    # cross the line near the tips, and they are thicker than the cord, so a thin cut leaves the wood alone.
    vd, vs = off_line(P)
    # (Judged by the triangle's middle along the string: some cords are single slivers running into the tips. Some
    # have wrapped sleeves, so the cord is let be up to 2.2 cm thick.)
    sm = vs[F].mean(1)
    cord = (vd[F] < 0.022).all(1) & (sm > 0.04) & (sm < 0.96)
    K = F[~cord]
    # Then whatever was strung on it (beads, stars, a nocked arrow) is left loose: small islands near the line.
    w = weld_ids(P)
    parent = np.arange(w.max() + 1)

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for a, b, c in w[K]:
        ra = find(a)
        parent[find(b)] = ra
        parent[find(c)] = ra
    isl = np.array([find(i) for i in w[K[:, 0]]])
    dist, _ = off_line(P[K].mean(1))
    keep = np.ones(len(K), bool)
    roots, counts = np.unique(isl, return_counts=True)
    for r, c in zip(roots, counts):
        m = isl == r
        if c < len(K) * 0.15 and np.median(dist[m]) < 0.06:
            keep[m] = False
    F = K
    return F[keep], top, bot


def prep():
    kit = json.load(open(KIT))
    os.makedirs(os.path.join(BUILD, "src"), exist_ok=True)
    plan = {}
    for item in kit["items"]:
        v, g = read(item)
        P, F, UV = g["P"], g["F"], g["UV"]
        extras = {}
        if v["kind"] == "bow":
            n0 = len(F)
            F, top, bot = strip_string(P, F)
            extras["tips"] = [top.tolist(), bot.tolist()]
            print(f"{item}: string cut, {n0 - len(F)} triangles")
        np.savez(os.path.join(BUILD, "src", item + ".npz"), P=P.astype(np.float32), F=F.astype(np.int32), UV=UV.astype(np.float32))
        tris, tex = BUDGET[v["kind"]]
        plan[item] = dict(kind=v["kind"], tris=tris, tex=tex, extras=extras)
    json.dump(plan, open(os.path.join(BUILD, "plan.json"), "w"), indent=1)


def jpeg(arr, q=88):
    b = io.BytesIO()
    Image.fromarray(arr).save(b, "JPEG", quality=q, optimize=True)
    return b.getvalue()


def write_prop(path, name, P, N, UV, F, albedo, extras):
    b = staffcut.Glb()
    img = dict(bufferView=b.view(jpeg(albedo)), mimeType="image/jpeg", name=f"{name}_basecolor")
    attrs = dict(POSITION=b.accessor(P.astype(np.float32), "VEC3", 5126, 34962, minmax=True),
                 NORMAL=b.accessor(N.astype(np.float32), "VEC3", 5126, 34962),
                 TEXCOORD_0=b.accessor(UV.astype(np.float32), "VEC2", 5126, 34962))
    prim = dict(attributes=attrs, indices=b.accessor(F.astype(np.uint32).ravel(), "SCALAR", 5125, 34963), material=0)
    gltf = dict(asset=dict(version="2.0", generator="bm tools/heroes/kit.py"), scene=0, scenes=[dict(name=name, nodes=[0])],
                nodes=[dict(name=name, mesh=0)], meshes=[dict(name=name, primitives=[prim], extras=extras)],
                materials=[dict(name=name, pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicFactor=0.6, roughnessFactor=0.5))],
                textures=[dict(source=0, sampler=0)], samplers=[dict(magFilter=9729, minFilter=9987, wrapS=33071, wrapT=33071)],
                images=[img], accessors=b.accessors, bufferViews=b.views, buffers=[dict(byteLength=0)])
    while len(b.bin) % 4:
        b.bin.append(0)
    gltf["buffers"][0]["byteLength"] = len(b.bin)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(b.bin)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(b.bin), 0x004E4942) + bytes(b.bin))


def pack():
    plan = json.load(open(os.path.join(BUILD, "plan.json")))
    os.makedirs(OUT, exist_ok=True)
    total = 0
    props = {}
    for item, p in plan.items():
        d = np.load(os.path.join(BUILD, "dec", item + ".npz"))
        P, N, UV, F = d["P"].astype(np.float64), d["N"], d["UV"], d["F"]
        v, g = read(item)
        lo, hi = P[:, 1].min(), P[:, 1].max()
        L = hi - lo
        kind = p["kind"]
        if kind in ("bow", "boomerang", "kite", "tower"):
            o = (P.min(0) + P.max(0)) / 2
        else:
            o = np.array([0.0, lo + GRIP[kind] * L, 0.0])
            # (Centred across the haft at the grip, so the fist closes on the wood, not beside it.)
            near = np.abs(P[:, 1] - o[1]) < 0.03
            if near.any():
                o[0], o[2] = P[near, 0].mean(), P[near, 2].mean()
        P = P - o
        ex = dict(p["extras"], kind=kind, length=float(L), reach=float(hi - o[1]), butt=float(o[1] - lo))
        if "tips" in ex:
            ex["tips"] = [(np.array(t) - o).round(4).tolist() for t in ex["tips"]]
        alb = np.array(Image.fromarray(g["maps"][0]).resize((p["tex"], p["tex"]), Image.LANCZOS))
        path = os.path.join(OUT, item + ".glb")
        write_prop(path, item, P, N, UV, F, alb, ex)
        props[item] = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in ex.items()}
        total += os.path.getsize(path)
        print(f"{item}: {len(F)} tris, {os.path.getsize(path) // 1024} KB")
    # What the game needs of each without opening the files: its kind, length, reach past the fist, and a bow's tips.
    kit = json.load(open(KIT))
    kit["props"] = props
    json.dump(kit, open(KIT, "w"), indent=1)
    print(f"{len(plan)} props, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    {"pick": pick, "prep": prep, "pack": pack}[sys.argv[1]]()
