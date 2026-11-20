"""Hands brought down to their bodies' size: Meshy made nearly every townsperson's hands too big for them (the owner,
2026-11-20: 'their hands are TOO BIG'), wrist to fingertip some 13 to 15 hundredths of their height where a hand's
nearer 11. Each hand scaled about its wrist (the Hand joint), its mesh and its finger joints both, so a fist still closes
at its own knuckles: each vertex drawn in by as much of it as the hand moves, the finger joints' rest and bind made
again from their new places (as tools/folk/body_proportion.py does the legs). What each was done to is kept in its
asset.extras.hands, so running this again only makes up the difference.

    python tools/folk/hand_scale.py [ids...]       (all the folk's bodies but the castle's creatures, if none named)

Run it after tools/folk/build_folk.py builds any of these afresh, and after body_proportion.py.
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from head_scale import read, view, FOLK  # noqa: E402
from body_proportion import local  # noqa: E402

TARGET = 0.11          # wrist to fingertip, of the body's height
MOST = 0.7             # never smaller than this of what it was
# The castle's creatures: their hands are claws, and theirs to keep.
CLAWS = {"demonsteward", "bonebutler", "imppage", "torturer", "ghoulscullion", "archivistghost", "hellguard"}


def hands(k):
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
    if "LeftHand" not in names:
        return None
    ibm = view(data, js, b0, skin["inverseBindMatrices"])
    P = np.array([np.linalg.inv(ibm[i].reshape(4, 4).T.astype(np.float64))[:3, 3] for i in range(len(J))])
    pr = js["meshes"][0]["primitives"][0]["attributes"]
    pos = view(data, js, b0, pr["POSITION"])
    p = pos.astype(np.float64)
    jo = view(data, js, b0, pr["JOINTS_0"]).astype(int)
    we = view(data, js, b0, pr["WEIGHTS_0"]).astype(np.float64)
    if we.max() > 1.5: we = we / (255.0 if we.max() <= 255 else 65535.0)
    H = p[:, 1].max() - p[:, 1].min()
    had = js.get("asset", {}).get("extras", {}).get("hands")
    newP = P.copy()
    said = []
    for side in ("Left", "Right"):
        sub = np.array([n.startswith(f"{side}Hand") for n in names])
        wj = names.index(f"{side}Hand")
        w = np.clip((sub[jo] * we).sum(1), 0, 1)
        sel = p[w > 0.6]
        if not len(sel): continue
        L = np.linalg.norm(sel - P[wj], axis=1).max() / H
        # (What it measures now is after any scale before: the scale it wants of what it was is TARGET over what it was.)
        was = L / (had[side] if had else 1.0)
        want = max(MOST, min(1.0, TARGET / was))
        s = want / (had[side] if had else 1.0)
        if abs(s - 1) < 1e-3:
            said.append(f"{side} already {want:.2f}"); continue
        W = P[wj]
        p = W + (p - W) * (1 + (s - 1) * w)[:, None]
        newP[sub] = W + (newP[sub] - W) * s
        js.setdefault("asset", {}).setdefault("extras", {}).setdefault("hands", {"Left": 1.0, "Right": 1.0})[side] = round(want, 4)
        said.append(f"{side} {was:.3f} -> x{want:.2f}")
    if np.allclose(newP, P):
        print(k, ", ".join(said) or "no hands"); return
    pos[:] = p.astype(np.float32)
    acc = js["accessors"][pr["POSITION"]]
    acc["min"] = [float(v) for v in p.min(0)]; acc["max"] = [float(v) for v in p.max(0)]
    for i in range(len(J)):
        M = ibm[i].reshape(4, 4).T.astype(np.float64)
        M[:3, 3] = -M[:3, :3] @ newP[i]
        ibm[i] = M.T.reshape(16).astype(np.float32)
    meshW = world(next(i for i, n in enumerate(nodes) if "mesh" in n))
    jw = {j: (meshW @ np.append(newP[i], 1.0))[:3] for i, j in enumerate(J)}
    for i, j in enumerate(J):
        if np.allclose(newP[i], P[i]) and (parent.get(j) not in jw or np.allclose(newP[J.index(parent[j])], P[J.index(parent[j])])):
            continue
        par = parent[j]
        R = world(par)[:3, :3]
        org = jw[par] if par in jw else world(par)[:3, 3]
        nodes[j]["translation"] = [float(v) for v in np.linalg.solve(R, jw[j] - org)]
    txt = json.dumps(js, separators=(",", ":")).encode(); txt += b" " * (-len(txt) % 4)
    rest = bytes(data[20 + jl:])
    open(path, "wb").write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(txt) + len(rest)) + struct.pack("<II", len(txt), 0x4E4F534A) + txt + rest)
    print(k, ", ".join(said))


if __name__ == "__main__":
    f = json.load(open(os.path.join(FOLK, "folk.json")))
    for k in (sys.argv[1:] or [k for k in f["models"] if k not in CLAWS]):
        hands(k)
