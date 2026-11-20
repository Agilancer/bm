"""Where Lisandra passes into herself through the opening: run in Blender (the owner's rule), after
    node tools/lisandra/pose_dump.mjs POSES.json witch
Each pose's palette (dual quaternions, as the game's shader skins her: src/gfx/shaders.js SKIN) is put on her own mesh,
and the arm and hand verts are tested against her trunk (hips, spine, neck, head, shoulders) and legs, as in
tools/folk/rig_fit.py: inside means behind the nearest face of that part and a ray out along its normal crosses the part
an odd number of times; more than 1.5 cm in counts.

    exec(open(r'<repo>/tools/lisandra/self_clip.py').read(), g); g['run'](root, poses_path)
"""
import json
import os

import numpy as np


def load(root, asset):
    g = {"__file__": os.path.join(root, "tools", "folk", "rig_fit.py")}
    exec(open(g["__file__"]).read(), g)
    data, js, jl, b0 = g["read"](os.path.join(root, asset))
    skin = js["skins"][0]; J = skin["joints"]; nodes = js["nodes"]
    names = [nodes[j]["name"].split(":")[-1] for j in J]
    pos, jo, we, faces = [], [], [], []
    off = 0
    for mi, n in enumerate(nodes):
        if "mesh" not in n or "skin" not in n: continue
        for pr in js["meshes"][n["mesh"]]["primitives"]:
            at = pr["attributes"]
            if "JOINTS_0" not in at: continue
            p = g["view"](data, js, b0, at["POSITION"]).astype(np.float64)
            w = g["view"](data, js, b0, at["WEIGHTS_0"]).astype(np.float64)
            if w.max() > 1.5: w = w / (255.0 if w.max() <= 255 else 65535.0)
            ix = g["view"](data, js, b0, pr["indices"]).reshape(-1, 3).astype(np.int64) if "indices" in pr else np.arange(len(p)).reshape(-1, 3)
            pos.append(p); jo.append(g["view"](data, js, b0, at["JOINTS_0"]).astype(int)); we.append(w); faces.append(ix + off)
            off += len(p)
    return g, names, np.vstack(pos), np.vstack(jo), np.vstack(we), np.vstack(faces)


def dq_skin(pal, pos, jo, we, scale):
    """Dual quaternion skinning (the game's): blend each vert's joints' dual quats, normalise, apply."""
    P = np.asarray(pal, np.float64).reshape(-1, 8)
    r = np.zeros((len(pos), 4)); d = np.zeros((len(pos), 4))
    q0 = P[jo[:, 0], :4]
    for k in range(4):
        rk = P[jo[:, k], :4]; dk = P[jo[:, k], 4:]
        s = np.sign((rk * q0).sum(1)); s[s == 0] = 1
        r += (we[:, k] * s)[:, None] * rk; d += (we[:, k] * s)[:, None] * dk
    n = np.linalg.norm(r, axis=1)[:, None]; r /= n; d /= n
    v = pos * scale
    x, y, z, w = r[:, 0], r[:, 1], r[:, 2], r[:, 3]
    uv = np.cross(r[:, :3], v); uuv = np.cross(r[:, :3], uv)
    rot = v + 2 * (w[:, None] * uv + uuv)
    # Translation of a dual quat: 2 * dual * conj(real).
    dx, dy, dz, dw = d[:, 0], d[:, 1], d[:, 2], d[:, 3]
    t = 2 * np.stack([dw * -x + dx * w + dy * -z - dz * -y,
                      dw * -y - dx * -z + dy * w + dz * -x,
                      dw * -z + dx * -y - dy * -x + dz * w], 1)
    return rot + t


GROUPS = {"trunk": ("Hips", "Spine", "Spine1", "Spine2", "Neck", "Head", "Jaw", "LeftShoulder", "RightShoulder"),
          "larm": ("LeftArm", "LeftForeArm", "LeftHand"), "rarm": ("RightArm", "RightForeArm", "RightHand"),
          "lleg": ("LeftUpLeg", "LeftLeg"), "rleg": ("RightUpLeg", "RightLeg")}
TESTS = [("larm", "trunk"), ("rarm", "trunk"), ("larm", "lleg"), ("rarm", "rleg"), ("larm", "rarm")]


def groups(names, jo, we):
    keys = list(GROUPS); jg = np.full(len(names), -1)
    for i, n in enumerate(names):
        for gi, gk in enumerate(keys):
            if n in GROUPS[gk]: jg[i] = gi
        if n.startswith("LeftHand"): jg[i] = keys.index("larm")
        if n.startswith("RightHand"): jg[i] = keys.index("rarm")
    w = np.zeros((len(jo), len(keys)))
    for k in range(4):
        gg = jg[jo[:, k]]
        for gi in range(len(keys)): w[:, gi] += np.where(gg == gi, we[:, k], 0)
    vg = np.full(len(jo), -1); sure = w.max(1) > 0.85; vg[sure] = w.argmax(1)[sure]
    return keys, vg


def inside(V, F, vg, keys, a, b, step=3, depth=0.015):
    from mathutils.bvhtree import BVHTree
    ia, ib = keys.index(a), keys.index(b)
    fb = F[(vg[F] == ib).all(1)]
    if len(fb) < 10: return 0, 0.0, []
    Vt = [tuple(p) for p in V]
    tree = BVHTree.FromPolygons(Vt, fb.tolist(), all_triangles=True)
    va = np.nonzero(vg == ia)[0][::step]
    hits = []; deep = 0.0
    for vi in va:
        h = tree.find_nearest(Vt[vi], 0.12)
        if h[0] is None: continue
        d = np.array(h[0]) - V[vi]; nrm = np.array(h[1])
        if np.dot(-d, nrm) > -depth: continue
        cnt = 0; o = Vt[vi]
        for _ in range(8):
            r = tree.ray_cast(o, tuple(nrm), 2.0)
            if r[0] is None: break
            cnt += 1; o = tuple(np.array(r[0]) + nrm * 1e-4)
        if cnt % 2:
            hits.append(int(vi)); deep = max(deep, float(np.linalg.norm(d)))
    return len(hits) / max(len(va), 1), deep, hits


def run(root, poses_path, scale=None, every=1):
    D = json.load(open(poses_path))
    g, names, pos, jo, we, F = load(root, D["asset"])
    if scale is None:
        from importlib import import_module  # noqa
        scale = 1.75  # LISANDRA_SCALE (src/core/lisandra.js)
    keys, vg = groups(names, jo, we)
    rows = []
    for p in D["poses"][::every]:
        V = dq_skin(p["pal"], pos, jo, we, scale)
        row = {"t": p["t"], "stage": p["stage"], "clip": p["clip"]}
        for a, b in TESTS:
            s, dp, _ = inside(V, F, vg, keys, a, b)
            row[a + ">" + b] = round(s * 100, 1); row["deep"] = max(row.get("deep", 0), round(dp, 3))
        rows.append(row)
    return rows, (g, names, pos, jo, we, F, keys, vg, scale, D)


def show(ctx, i, name="lis", x=0.0):
    import bpy
    g, names, pos, jo, we, F, keys, vg, scale, D = ctx
    p = D["poses"][i]
    V = dq_skin(p["pal"], pos, jo, we, scale)
    V = V - np.array([p["x"], 0, p["z"]])
    V = np.stack([V[:, 0] + x, -V[:, 2], V[:, 1]], 1)
    me = bpy.data.meshes.new(name); me.from_pydata(V.tolist(), [], F.tolist())
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob
