"""The mail under a hero's plates, made again to cover the gaps: python tools/heroes/mail.py [ids...] [--dry] [--out DIR]

tools/armor/rig_armor.py (add_sleeves) gave every body a short round tube at each joint, a fifth of a metre long and well
inside the plates. Where plates part as the joint bends, that left the sky or the inside of a plate showing round a thin
dark pipe. This takes those tubes out of a built body (assets/game/heroes/<id>.glb) and puts in mail made to fill the
gaps, from the body's own plates in its bind pose:

  - Each sleeve's cross-section follows the inside of the plates round it, sector by sector, ring by ring, so it reaches
    out to the plates' edges rather than to the narrowest of them.
  - It runs well up under the plates on both sides (SLEEVES: how far), so a bent joint still has mail across its gap.
  - Its weights ease from one bone to the next over seven rings, so it bends as a sleeve does.
  - A mail skirt from the waist to the thighs (the hauberk's), which the hip sleeves alone never covered: crouched or
    kicking, the hips opened onto the sky.
  - A mail shirt under the torso's plates, waist to neck: a body made of parts from different suits can have chest and
    back plates that don't meet (lancer_f2 showed the sky through her chest standing still).
  - Each cover is sized from the pieces on its own bones only, so a sleeve doesn't reach out to an arm hanging beside it.

The plates, cloth, paint and skeleton are untouched. The shader draws anything with u past the atlas as mail (MAIL_UV;
src/gfx/materials.js). `python tools/heroes/gaps.py` measures what's left showing.
"""
import io
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
HEROES = os.path.join(ROOT, "assets", "game", "heroes")
sys.path.insert(0, HERE)
from gaps import accessor, load_glb  # noqa: E402

MAIL_UV = 2.0
SIDES = 18
# (parent, joint, child, reach up, reach down, as fractions of a 1.9 m body). Up is toward the parent.
SLEEVES = [("pelvis", "spine_01", "spine_02", 0.15, 0.13), ("spine_03", "neck_01", "Head", 0.09, 0.08)]
for _s in "lr":
    SLEEVES += [
        (f"clavicle_{_s}", f"upperarm_{_s}", f"lowerarm_{_s}", 0.11, 0.17),
        (f"upperarm_{_s}", f"lowerarm_{_s}", f"hand_{_s}", 0.13, 0.12),
        (f"lowerarm_{_s}", f"hand_{_s}", f"middle_01_{_s}", 0.09, 0.05),
        (f"thigh_{_s}", f"calf_{_s}", f"foot_{_s}", 0.15, 0.13),
        (f"calf_{_s}", f"foot_{_s}", f"ball_{_s}", 0.09, 0.05),
    ]
# The hip sleeves are the skirt's legs (skirt() below).
RINGS = 7


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def frame(axis):
    a = np.array([0.31, 0.87, 0.38])
    side_a = np.cross(axis, a); side_a /= np.linalg.norm(side_a)
    return side_a, np.cross(axis, side_a)


def section(pts, centre, axis, side_a, side_b, r_min, r_max, keep=0.12, shrink=0.9):
    """The inside of the plates round `centre` across `axis`: a radius for each of SIDES sectors (the low end of what's
    there, a little inside it), smoothed round the ring. Sectors with nothing fall back on their neighbours."""
    rel = pts - centre
    along = rel @ axis
    near = np.abs(along) < 0.05
    rel = rel[near]
    x, y = rel @ side_a, rel @ side_b
    rad = np.hypot(x, y)
    ok = (rad < r_max * 1.4) & (rad > r_min * 0.5)
    ang = np.arctan2(y[ok], x[ok]); rad = rad[ok]
    out = np.full(SIDES, np.nan)
    for k in range(SIDES):
        a0 = k / SIDES * 2 * np.pi - np.pi
        d = np.abs(((ang - a0) + np.pi) % (2 * np.pi) - np.pi)
        sel = rad[d < np.pi / SIDES * 1.6]
        if len(sel) >= 4:
            out[k] = np.percentile(sel, keep * 100) * shrink
    if np.all(np.isnan(out)):
        return None
    good = ~np.isnan(out)
    idx = np.arange(SIDES)
    out = np.interp(idx, idx[good], out[good], period=SIDES)
    # Round the ring a little, so a lone spike of plate doesn't pull a fold into the mail.
    sm = (np.roll(out, 1) + out * 2 + np.roll(out, -1)) / 4
    return np.clip(sm, r_min, r_max)


def tube(centres, axes, radii, weights, njoints):
    """Rings of SIDES vertices round each centre, quads between them."""
    vs, ns, ws = [], [], []
    for c, ax, r, w in zip(centres, axes, radii, weights):
        sa, sb = frame(ax)
        for k in range(SIDES):
            a = k / SIDES * 2 * np.pi - np.pi
            d = sa * np.cos(a) + sb * np.sin(a)
            vs.append(c + d * r[k]); ns.append(d)
            wv = np.zeros(njoints)
            for j, x in w.items():
                wv[j] += x
            ws.append(wv)
    tris = []
    for ri in range(len(centres) - 1):
        for k in range(SIDES):
            a, b = ri * SIDES + k, ri * SIDES + (k + 1) % SIDES
            c, d = a + SIDES, b + SIDES
            tris += [(a, b, d), (a, d, c)]
    return np.array(vs), np.array(ns), np.array(ws), np.array(tris)


def own(pts_by, names, fallback):
    """The points of the pieces that ride these joints (the plates round this joint, not an arm hanging beside it)."""
    sel = [pts_by[n] for n in names if n in pts_by]
    sel = np.concatenate(sel) if sel else np.zeros((0, 3))
    return sel if len(sel) > 200 else fallback


def sleeve(target, index, pts, height, parent, joint, child, up, down, pts_by=None):
    unit = height / 1.9
    if pts_by is not None:
        pts = own(pts_by, (parent, joint, child), pts)
    j = target[joint]
    into = target[joint] - target[parent]
    into = into / np.linalg.norm(into) if np.linalg.norm(into) > 1e-4 else np.array([0, 1.0, 0])
    out = target[child] - j
    out /= np.linalg.norm(out)
    axis = into + out
    axis /= np.linalg.norm(axis)
    ip, ij = index[parent], index[joint]
    centres, axes, radii, weights = [], [], [], []
    for t in np.linspace(-1, 1, RINGS):
        off = (up if t < 0 else down) * unit * t
        c = j + (into if t < 0 else out) * off
        ax = into if t < -0.5 else out if t > 0.5 else axis
        sa, sb = frame(ax)
        r = section(pts, c, ax, sa, sb, 0.03 * unit, 0.2 * unit)
        if r is None:
            r = np.full(SIDES, 0.05 * unit)
        keep_parent = 1 - smooth((t + 0.8) / 1.6)
        centres.append(c); axes.append(ax); radii.append(r); weights.append({ip: keep_parent, ij: 1 - keep_parent})
    # (Neighbouring rings no wider than a step from each other: the plates' own edges are ragged.)
    for i in range(1, RINGS):
        radii[i] = np.minimum(radii[i], radii[i - 1] * 1.25 + 0.004)
    for i in range(RINGS - 2, -1, -1):
        radii[i] = np.minimum(radii[i], radii[i + 1] * 1.25 + 0.004)
    return tube(centres, axes, radii, weights, len(index))


def hauberk(target, index, pts, height, pts_by=None):
    """A mail shirt under the torso's plates, from the waist sleeve up to the neck's: where the chest and back plates don't
    meet the shoulders or each other (a body made of parts from different suits), the gap shows mail, not the sky. Each
    ring rides the spine joint it's at, eased into the next."""
    unit = height / 1.9
    chain = [n for n in ("spine_01", "spine_02", "spine_03", "neck_01") if n in index]
    if len(chain) < 3:
        return None
    if pts_by is not None:
        pts = own(pts_by, ("pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "clavicle_l", "clavicle_r"), pts)
    centres, axes, radii, weights = [], [], [], []
    for a, b in zip(chain[:-1], chain[1:]):
        pa, pb = target[a], target[b]
        ax = (pb - pa) / np.linalg.norm(pb - pa)
        last = b == chain[-1]
        for f in ((0.0, 0.5, 0.85) if last else (0.0, 0.5)):
            c = pa + (pb - pa) * f
            sa, sb = frame(ax)
            r = section(pts, c, ax, sa, sb, 0.05 * unit, 0.2 * unit, keep=0.1, shrink=0.88)
            if r is None:
                r = np.full(SIDES, 0.1 * unit)
            centres.append(c); axes.append(ax); radii.append(r)
            weights.append({index[a]: 1 - smooth(f), index[b]: smooth(f)})
    for i in range(1, len(radii)):
        radii[i] = np.minimum(radii[i], radii[i - 1] * 1.2 + 0.004)
    return tube(centres, axes, radii, weights, len(index))


def skirt(target, index, pts, height, side, pts_by=None):
    """One leg of the mail skirt: from the waist, round the hip, down the thigh. Upper rings ride the pelvis, lower ones
    the thigh, so a raised knee draws the mail across the front of the hip as a hauberk's skirt does."""
    unit = height / 1.9
    if pts_by is not None:
        pts = own(pts_by, ("pelvis", "spine_01", f"thigh_{side}"), pts)
    hip, knee = target[f"thigh_{side}"], target[f"calf_{side}"]
    pel = target["pelvis"]
    down = (knee - hip) / np.linalg.norm(knee - hip)
    ip, it = index["pelvis"], index[f"thigh_{side}"]
    centres, axes, radii, weights = [], [], [], []
    # From a hand above the hip joint (part way in to the pelvis's middle) to about half way down the thigh.
    stops = [(-0.12, 0.55), (-0.06, 0.35), (0.0, 0.15), (0.06, 0.0), (0.12, 0.0), (0.2, 0.0), (0.27, 0.0)]
    for k, (along, inward) in enumerate(stops):
        c = hip + down * along * unit + (pel - hip) * np.array([1, 0, 1]) * inward * 0.6
        ax = down if along >= 0 else (down + np.array([0, -1.0, 0])) / np.linalg.norm(down + np.array([0, -1.0, 0]))
        sa, sb = frame(ax)
        r = section(pts, c, ax, sa, sb, 0.05 * unit, 0.19 * unit, keep=0.12, shrink=0.9)
        if r is None:
            r = np.full(SIDES, 0.08 * unit)
        keep_pelvis = 1 - smooth((along + 0.04) / 0.2)
        centres.append(c); axes.append(ax); radii.append(r); weights.append({ip: keep_pelvis, it: 1 - keep_pelvis})
    for i in range(1, len(radii)):
        radii[i] = np.minimum(radii[i], radii[i - 1] * 1.2 + 0.004)
    return tube(centres, axes, radii, weights, len(index))


def rebuild(body_id, dry=False, out_dir=None):
    path = os.path.join(HEROES, f"{body_id}.glb")
    g, blob = load_glb(path)
    prim = g["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    A = {k: np.array(accessor(g, blob, v)) for k, v in at.items()}
    idx = np.array(accessor(g, blob, prim["indices"])).reshape(-1, 3).astype(np.int64)
    pieces = g["scenes"][0]["extras"]["pieces"]
    height = g["scenes"][0]["extras"].get("height", 1.8)
    skin = g["skins"][0]
    names = [g["nodes"][n]["name"] for n in skin["joints"]]
    index = {n: i for i, n in enumerate(names)}
    ibm = np.array(accessor(g, blob, skin["inverseBindMatrices"])).reshape(-1, 4, 4).transpose(0, 2, 1)
    target = {n: np.linalg.inv(ibm[i])[:3, 3] for n, i in index.items()}
    # Keep everything that isn't mail, in order.
    keep_p = [k for k, p in enumerate(pieces) if p["kind"] != "mail"]
    vkeep = np.zeros(len(A["POSITION"]), bool)
    tkeep = np.zeros(len(idx), bool)
    new_pieces = []
    for k in keep_p:
        p = pieces[k]
        vkeep[p["vstart"]:p["vstart"] + p["vcount"]] = True
        tkeep[p["tstart"]:p["tstart"] + p["tcount"]] = True
    remap = np.cumsum(vkeep) - 1
    out = {k: v[vkeep] for k, v in A.items()}
    tris = remap[idx[tkeep]]
    vn, tn = 0, 0
    old_to_new = {}
    for k in keep_p:
        p = dict(pieces[k])
        old_to_new[k] = len(new_pieces)
        p["vstart"], p["tstart"] = vn, tn
        vn += p["vcount"]; tn += p["tcount"]
        new_pieces.append(p)
    if "_PIECE" in out:
        pv = np.array(out["_PIECE"]).reshape(-1).astype(np.int64)
        out["_PIECE"] = np.array([old_to_new[int(x)] for x in pv], dtype=np.float64)
    # What the mail has to stay inside: the plates and cloth, in the bind pose; and, joint by joint, the points of the
    # pieces that ride it (a piece's joints, from the table; cloth by where most of its weight is).
    pts = out["POSITION"].astype(np.float64)
    pts_by = {}
    for p in new_pieces:
        js = [names[j] for j, w in p.get("joints", []) if w > 0.2]
        seg = pts[p["vstart"]:p["vstart"] + p["vcount"]]
        if not js and p["kind"] == "cloth":
            w = out["WEIGHTS_0"][p["vstart"]:p["vstart"] + p["vcount"]]; jn = out["JOINTS_0"][p["vstart"]:p["vstart"] + p["vcount"]]
            js = [names[int(jn[i, int(np.argmax(w[i]))])] for i in range(0, len(seg), max(1, len(seg) // 50))]
        for n in set(js):
            pts_by.setdefault(n, []).append(seg)
    pts_by = {n: np.concatenate(v) for n, v in pts_by.items()}
    adds = []
    for (parent, joint, child, up, down) in SLEEVES:
        if not all(n in index for n in (parent, joint, child)):
            continue
        adds.append((f"mail_{joint}", sleeve(target, index, pts, height, parent, joint, child, up, down, pts_by), joint))
    for s in "lr":
        if f"thigh_{s}" in index:
            adds.append((f"mail_thigh_{s}", skirt(target, index, pts, height, s, pts_by), f"thigh_{s}"))
    hb = hauberk(target, index, pts, height, pts_by)
    if hb is not None:
        adds.append(("mail_hauberk", hb, "spine_02"))
    jt_dtype = out["JOINTS_0"].dtype
    for name, (vs, ns, ws, tr), joint in adds:
        pid = len(new_pieces)
        # Up to four joints a vertex, heaviest first (the game reads JOINTS_0/WEIGHTS_0 as four).
        order = np.argsort(-ws, axis=1)[:, :4]
        wsel = np.take_along_axis(ws, order, 1)
        wsel /= np.maximum(wsel.sum(1, keepdims=True), 1e-9)
        lo, hi = vs.min(0), vs.max(0)
        new_pieces.append({"name": name, "kind": "mail", "vstart": vn, "vcount": len(vs), "tstart": tn, "tcount": len(tr),
                           "joints": [[index[joint], 1.0]], "min": lo.tolist(), "max": hi.tolist()})
        out["POSITION"] = np.concatenate([out["POSITION"], vs.astype(np.float32)])
        out["NORMAL"] = np.concatenate([out["NORMAL"], ns.astype(np.float32)])
        out["TEXCOORD_0"] = np.concatenate([out["TEXCOORD_0"], np.full((len(vs), 2), MAIL_UV, np.float32)])
        out["JOINTS_0"] = np.concatenate([out["JOINTS_0"], order.astype(jt_dtype)])
        out["WEIGHTS_0"] = np.concatenate([out["WEIGHTS_0"], wsel.astype(np.float32)])
        if "_FLEX" in out:
            out["_FLEX"] = np.concatenate([np.array(out["_FLEX"]).reshape(-1), np.zeros(len(vs), np.float32)])
        if "_PIECE" in out:
            out["_PIECE"] = np.concatenate([out["_PIECE"], np.full(len(vs), pid, np.float64)])
        tris = np.concatenate([tris, tr + vn])
        vn += len(vs); tn += len(tr)
    if dry:
        return new_pieces, out, tris
    write(os.path.join(out_dir, f"{body_id}.glb") if out_dir else path, g, blob, out, tris, new_pieces)
    return new_pieces, out, tris


def write(path, g, blob, attrs, tris, pieces):
    """The same file with the mesh's attributes and indices replaced; every other buffer view (the images, the IBMs) kept."""
    prim = g["meshes"][0]["primitives"][0]
    comp_of = {k: g["accessors"][v]["componentType"] for k, v in prim["attributes"].items()}
    np_of = {5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "u1"}
    kind_of = {k: g["accessors"][v]["type"] for k, v in prim["attributes"].items()}
    mesh_acc = set(prim["attributes"].values()) | {prim["indices"]}
    mesh_views = {g["accessors"][a]["bufferView"] for a in mesh_acc}
    other_views = set(range(len(g["bufferViews"]))) - mesh_views
    # Views something else still uses (the IBM accessor, images) are copied over in order.
    new_blob = bytearray()
    view_map = {}
    views = []
    for vi in sorted(other_views):
        bv = g["bufferViews"][vi]
        off = bv.get("byteOffset", 0)
        new_blob.extend(b"\0" * (-len(new_blob) % 4))
        nv = dict(bv); nv["byteOffset"] = len(new_blob)
        new_blob.extend(blob[off:off + bv["byteLength"]])
        view_map[vi] = len(views); views.append(nv)
    accessors = []
    acc_map = {}
    for ai, a in enumerate(g["accessors"]):
        if ai in mesh_acc:
            continue
        na = dict(a); na["bufferView"] = view_map[a["bufferView"]]
        acc_map[ai] = len(accessors); accessors.append(na)

    def add(data, comp, kind, target, bounds=False):
        raw = np.ascontiguousarray(data).astype(np_of[comp]).tobytes()
        new_blob.extend(b"\0" * (-len(new_blob) % 4))
        views.append({"buffer": 0, "byteOffset": len(new_blob), "byteLength": len(raw), "target": target})
        new_blob.extend(raw)
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[kind]
        acc = {"bufferView": len(views) - 1, "componentType": comp, "count": len(raw) // (width * np.dtype(np_of[comp]).itemsize), "type": kind}
        if bounds:
            flat = np.asarray(data).reshape(-1, width)
            acc["min"] = [float(x) for x in flat.min(0)]; acc["max"] = [float(x) for x in flat.max(0)]
        accessors.append(acc)
        return len(accessors) - 1

    new_attrs = {}
    for k in prim["attributes"]:
        new_attrs[k] = add(attrs[k], comp_of[k], kind_of[k], 34962, bounds=(k == "POSITION"))
    new_idx = add(np.asarray(tris).reshape(-1), 5125, "SCALAR", 34963)
    g2 = dict(g)
    g2["accessors"] = accessors
    g2["bufferViews"] = views
    g2["buffers"] = [{"byteLength": len(new_blob)}]
    g2["meshes"] = [dict(g["meshes"][0], primitives=[dict(prim, attributes=new_attrs, indices=new_idx)])]
    g2["skins"] = [dict(s, inverseBindMatrices=acc_map[s["inverseBindMatrices"]]) for s in g["skins"]]
    for img in g2.get("images", []):
        img["bufferView"] = view_map[img["bufferView"]]
    scenes = [dict(s) for s in g["scenes"]]
    scenes[0]["extras"] = dict(scenes[0]["extras"], pieces=pieces)
    g2["scenes"] = scenes
    js = json.dumps(g2, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    new_blob.extend(b"\0" * (-len(new_blob) % 4))
    total = 12 + 8 + len(js) + 8 + len(new_blob)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(new_blob), 0x004E4942)); f.write(bytes(new_blob))


def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    args = [a for a in args if a != "--dry"]
    out_dir = None
    if "--out" in args:
        k = args.index("--out"); out_dir = args[k + 1]; del args[k:k + 2]
        os.makedirs(out_dir, exist_ok=True)
    ids = args or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    for b in ids:
        pieces, out, tris = rebuild(b, dry, out_dir)
        n = sum(1 for p in pieces if p["kind"] == "mail")
        print(f"{b}: {n} mail pieces, {len(out['POSITION'])} vertices, {len(tris)} triangles{' (dry)' if dry else ''}")


if __name__ == "__main__":
    main()
