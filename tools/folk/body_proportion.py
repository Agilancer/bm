"""Bodies brought into proportion: Meshy made a few of Phobos's people with legs too short for them, and broad, so that they
stood like giant dwarves (the owner, 2026-11-20: 'make sure their bodies look proportional and proper. This dude looks like
a giant dwarf'). Their legs are lengthened, the mesh and the skeleton both, feet kept on the ground (each vertex by as
much of it as the legs move); then the whole body's brought back to the height it was, so it's the trunk, the shoulders
and the head that come down, not the legs that go up.

The skeleton's rest (each joint's node translation) and its inverse bind matrices are made again from the joints' new
places, their turns left as they were: the rig takes its bone lengths from the rest and the clips' turns as they are
(src/folk/rig.js), so the walk and every other clip play on the longer legs. What each was done to is kept in its
asset.extras.legs, so running this again only makes up the difference to what LEGS asks. Its manifest line's hips and
head heights (assets/game/folk/folk.json) set again to match.

    python tools/folk/body_proportion.py [ids...]

How far each body's hips stand, of its height (the Hips joint over the top of its head, tools/folk's measure): most of the
town's are 0.55 to 0.58. Run it again after tools/folk/build_folk.py builds any of these afresh, then head_scale.py.
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from head_scale import read, view, FOLK  # noqa: E402
import manifest  # noqa: E402

# The hips' height, of the whole, each is to stand at: theirs was 0.51 to 0.53.
LEGS = {
    "tollkeeper": 0.56, "innkeeper": 0.555, "merchant": 0.555, "taverncook": 0.55, "carter": 0.555, "peddler": 0.555,
    "moneylender": 0.55, "ostler": 0.555,
}
LEG_JOINTS = ("UpLeg", "Leg", "Foot", "ToeBase", "Toe_End")


def quat_mat(q):
    x, y, z, w = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def local(n):
    T = np.eye(4)
    T[:3, :3] = quat_mat(n.get("rotation", [0, 0, 0, 1])) * np.array(n.get("scale", [1, 1, 1]))[None, :]
    T[:3, 3] = n.get("translation", [0, 0, 0])
    return T


def proportion(k, target):
    path = os.path.join(FOLK, f"{k}.glb")
    data, js, jl, b0 = read(path)
    nodes = js["nodes"]
    parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    def world(i):
        M = local(nodes[i])
        while i in parent:
            i = parent[i]; M = local(nodes[i]) @ M
        return M
    skin = js["skins"][0]
    J = skin["joints"]
    names = [nodes[j].get("name", "").split(":")[-1] for j in J]
    ibm = view(data, js, b0, skin["inverseBindMatrices"])
    P = np.array([np.linalg.inv(ibm[i].reshape(4, 4).T.astype(np.float64))[:3, 3] for i in range(len(J))])
    pr = js["meshes"][0]["primitives"][0]["attributes"]
    pos = view(data, js, b0, pr["POSITION"])
    p = pos.astype(np.float64)
    y0 = float(p[:, 1].min())
    hips = names.index("Hips"); top = names.index("HeadTop_End") if "HeadTop_End" in names else None
    H = (P[top, 1] if top is not None else p[:, 1].max()) - y0
    leg = (P[hips, 1] - y0) / H
    had = js.get("asset", {}).get("extras", {}).get("legs")
    if had and abs(had - target) < 1e-4:
        print(k, "already", target); return
    # How much longer the legs: so the hips stand at target of the whole, the whole then brought back to its height.
    kk = target * (1 - leg) / (leg * (1 - target))
    hy = P[hips, 1] - y0
    isleg = np.array([n.endswith(LEG_JOINTS) and n != "Hips" for n in names])
    def move(y, wleg):
        legy = y0 + (y - y0) * kk
        up = y + hy * (kk - 1)
        return wleg * legy + (1 - wleg) * up
    jo = view(data, js, b0, pr["JOINTS_0"]).astype(int)
    we = view(data, js, b0, pr["WEIGHTS_0"]).astype(np.float64)
    if we.max() > 1.5: we = we / (255.0 if we.max() <= 255 else 65535.0)
    wl = np.clip((isleg[jo] * we).sum(1), 0, 1)
    newp = p.copy(); newp[:, 1] = move(p[:, 1], wl)
    newP = P.copy(); newP[:, 1] = move(P[:, 1], isleg.astype(float))
    # Back to its height: everything drawn in towards the ground under its middle.
    Hn = (newP[top, 1] if top is not None else newp[:, 1].max()) - y0
    u = H / Hn
    c = np.array([P[hips, 0], y0, P[hips, 2]])
    newp = c + (newp - c) * u
    newP = c + (newP - c) * u
    pos[:] = newp.astype(np.float32)
    acc = js["accessors"][pr["POSITION"]]
    acc["min"] = [float(v) for v in newp.min(0)]; acc["max"] = [float(v) for v in newp.max(0)]
    # The inverse bind matrices: the same turns, about the joints' new places.
    for i in range(len(J)):
        M = ibm[i].reshape(4, 4).T.astype(np.float64)
        A = M[:3, :3]
        # (A uniform scale u of the whole: a joint's own frame is the same, its offsets u times; the bind matrix's turn and
        # scale stay, its translation's the new place's.)
        M[:3, 3] = -A @ newP[i]
        ibm[i] = M.T.reshape(16).astype(np.float32)
    # The joints' rest: each one's translation from its parent's new place, in its parent's own frame (turns as they were).
    meshW = world(next(i for i, n in enumerate(nodes) if "mesh" in n))
    jw = {j: meshW @ np.vstack([np.hstack([np.eye(3), newP[i][:, None]]), [0, 0, 0, 1]]) for i, j in enumerate(J)}
    for i, j in enumerate(J):
        par = parent.get(j)
        pw = world(par) if par is not None and par not in jw else None
        if par in jw:
            # The parent's frame: its world turn and scale as the nodes have them, at its new place.
            R = world(par)[:3, :3]
            org = jw[par][:3, 3]
        else:
            R = pw[:3, :3] if pw is not None else np.eye(3); org = pw[:3, 3] if pw is not None else np.zeros(3)
        nodes[j]["translation"] = [float(v) for v in np.linalg.solve(R, jw[j][:3, 3] - org)]
    js.setdefault("asset", {}).setdefault("extras", {})["legs"] = target
    txt = json.dumps(js, separators=(",", ":")).encode(); txt += b" " * (-len(txt) % 4)
    rest = bytes(data[20 + jl:])
    open(path, "wb").write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(txt) + len(rest)) + struct.pack("<II", len(txt), 0x4E4F534A) + txt + rest)
    newhips = float(newP[hips, 1]); newhead = float(newP[names.index("Head"), 1])
    print(k, f"hips {leg:.3f} -> {(newhips - y0) / H:.3f} of its height; legs x{kk:.3f}, then x{u:.3f} all over")
    return newhips, newhead


if __name__ == "__main__":
    done = {}
    for k in (sys.argv[1:] or LEGS):
        r = proportion(k, LEGS[k])
        if r: done[k] = r
    if done:
        def change(doc):
            for k, (hips, head) in done.items():
                m = doc["models"][k]
                if "hips" in m: m["hips"] = round(hips, 3)
                if "head" in m: m["head"] = round(head, 3)
        manifest.update(FOLK, change)
