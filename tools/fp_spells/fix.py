"""Through Blender MCP: makes <model>_fix, a copy of the delivered sculpt with only the fingers in <model>_nudges.json moved, and
proves nothing else did. Its shading normals are smoothed, which moves nothing: light on the sculpt's lumpy surface is what looks
janky, and with the picture painted on, the fine detail comes from the picture. Dumps the result for hands.py.

    exec(compile(open(p, encoding="utf-8").read(), p, "exec"), dict(__file__=p, __name__="__main__", MODEL="attack"))
"""
import json
import os

import bpy
import numpy as np

_here = os.path.dirname(os.path.abspath(__file__))
_ns = {"__file__": os.path.join(_here, "morph.py"), "__name__": "morph"}
exec(compile(open(_ns["__file__"], encoding="utf-8").read(), _ns["__file__"], "exec"), _ns)
nudge = _ns["nudge"]
ROOT = os.path.dirname(os.path.dirname(_here))
SETTLE = 10             # passes smoothing how a finger's nudge spreads along it, so that it leaves no step
NORMAL_PASSES = 30      # passes smoothing the copy of the surface that light is worked out on: the higher, the broader the forms it picks out
OUT = os.path.join(ROOT, "tools", "build", "spells")


def fix(name):
    d = np.load(os.path.join(OUT, name + "_mesh.npz"))
    Q0, inv = d["Q"], d["inv"]
    Q = Q0.copy()
    cam = json.load(open(os.path.join(OUT, name + "_camera.json")))
    nudges = json.load(open(os.path.join(OUT, name + "_nudges.json")))
    moved_ids = []
    for key, m in nudges.items():
        ids, t, w = np.array(m["ids"]), np.array(m["t"]), np.array(m["w"])
        Q[ids] = Q[ids] + w[:, None] * (nudge(Q[ids], t, np.array(m["x"]), cam) - Q[ids])
        moved_ids.append(ids)
    arm_path = os.path.join(OUT, name + "_arm.npz")
    if os.path.exists(arm_path):        # (arm.py: the forearm's outline, onto the picture's)
        arm = np.load(arm_path)
        Q[arm["ids"]] += arm["delta"]
        moved_ids.append(arm["ids"])
    edges = np.unique(np.sort(np.vstack([d["tri"][:, [0, 1]], d["tri"][:, [1, 2]], d["tri"][:, [2, 0]]]), axis=1), axis=0)
    edges = edges[edges[:, 0] != edges[:, 1]]

    def spread(x, passes, only=None):
        deg = np.maximum(np.bincount(edges.ravel(), minlength=len(x)), 1)[:, None]
        for _ in range(passes):
            s = np.zeros_like(x)
            np.add.at(s, edges[:, 0], x[edges[:, 1]])
            np.add.at(s, edges[:, 1], x[edges[:, 0]])
            y = 0.5 * x + 0.5 * s / deg
            x = y if only is None else np.where(only[:, None], y, x)
        return x
    if moved_ids:
        inside = np.zeros(len(Q), bool)
        inside[np.concatenate(moved_ids)] = True
        Q = Q0 + spread(Q - Q0, SETTLE, inside)
    src = bpy.data.objects[name]
    me = src.data.copy()
    target = name + "_fix"
    o = bpy.data.objects.get(target)
    if o is None:
        o = bpy.data.objects.new(target, me)
        for col in src.users_collection:
            col.objects.link(o)
    else:
        old = o.data
        o.data = me
        bpy.data.meshes.remove(old)
    o.matrix_world = src.matrix_world
    o.hide_viewport = o.hide_render = False
    n = len(me.vertices)
    # the delivered normals stay, except on what moved
    loop_v = np.empty(len(me.loops), int)
    me.loops.foreach_get("vertex_index", loop_v)
    cn = np.empty(len(me.loops) * 3)
    me.corner_normals.foreach_get("vector", cn)
    N = np.zeros((n, 3))
    N[loop_v] = cn.reshape(-1, 3)
    M = np.linalg.inv(np.array(src.matrix_world))
    me.vertices.foreach_set("co", (Q[inv] @ M[:3, :3].T + M[:3, 3]).ravel())
    me.update()
    # (Taubin's two-step, on a copy of the surface, keeps a thin finger round; smoothing the normals themselves collapses them on it)
    soft = Q.copy()
    for _ in range(NORMAL_PASSES):
        soft = soft + 0.6 * (spread(soft, 1) - soft) * 2
        soft = soft - 0.62 * (spread(soft, 1) - soft) * 2
    wt = d["tri"]
    fn = np.cross(soft[wt[:, 1]] - soft[wt[:, 0]], soft[wt[:, 2]] - soft[wt[:, 0]])
    sm = np.zeros_like(soft)
    for c in range(3):
        np.add.at(sm, wt[:, c], fn)
    sm /= np.maximum(np.linalg.norm(sm, axis=1, keepdims=True), 1e-12)
    N = sm[inv]
    me.normals_split_custom_set_from_vertices(N.tolist())
    me.update()
    # the proof
    dist = np.linalg.norm(Q - Q0, axis=1)
    outside = np.ones(len(Q), bool)
    if moved_ids:
        outside[np.concatenate(moved_ids)] = False
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get("uv", uv)
    vuv = np.zeros((n, 2))
    vuv[loop_v] = uv.reshape(-1, 2)
    me.calc_loop_triangles()
    tri = np.array([t.vertices for t in me.loop_triangles])
    np.savez(os.path.join(OUT, name + "_fixed.npz"), V=Q[inv], uv=vuv, tri=tri, N=N, inv=inv)
    return dict(fingers=sorted(nudges), moved_mm=round(float(dist.max()) * 1000, 1), points_moved=int((dist > 1e-7).sum()), points=len(Q),
        moved_outside_those_fingers=int((dist[outside] > 1e-7).sum()))


if __name__ == "__main__":
    print(fix(globals().get("MODEL", "attack")))
