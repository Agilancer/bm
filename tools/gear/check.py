"""Measures the shipped gauntlets, per suit and rig: how round each finger's plates are (thin over wide, on the bone's own frame: a flat finger
is under 0.5), how far they stand off the skin of the same finger, and how long a joint's weights reach.

    python tools/gear/check.py
"""
import glob
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gauntlets as G  # noqa: E402

for path in sorted(glob.glob(os.path.join(G.ROOT, "assets", "fp", "gauntlets_*.glb"))):
    g, b = G.load(path)
    print(os.path.basename(path))
    for m in g["meshes"]:
        rig = G.Rig(m["name"])
        pr = m["primitives"][0]
        P = G.acc(g, b, pr["attributes"]["POSITION"]).astype(np.float64)
        J = G.acc(g, b, pr["attributes"]["JOINTS_0"]).astype(np.int64)
        W = G.acc(g, b, pr["attributes"]["WEIGHTS_0"])
        dom = J[np.arange(len(J)), W.argmax(1)]
        ratios, gaps = [], []
        for s in rig.sides:
            sk = rig.sk[s]
            for f in G.FINGERS:
                for k in range(3):
                    bone = f"{f}{k}"
                    q = P[dom == rig.index[rig.bone_name(bone, s)]]
                    skin = rig.skin_of(bone, s)
                    if len(q) < 8 or len(skin) < 8:
                        continue
                    _, e = G.extent(q, sk.R[bone], sk.at[bone])
                    ratios.append(min(e[1], e[2]) / max(e[1], e[2]))
                    _, es = G.extent(skin, sk.R[bone], sk.at[bone])
                    gaps.append(float(((e[1:] - es[1:]) / 2).min()))
        print(f"  {m['name']:13s} finger thin/wide median {np.median(ratios):.2f} min {np.min(ratios):.2f}; stands off the skin median {np.median(gaps) * 1000:.1f} mm, worst {np.min(gaps) * 1000:.1f} mm; {len(ratios)} bones")
