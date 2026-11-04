"""Where in each attack clip the blow actually falls, measured from the speed of the hand.

Prints each clip's windows of fast movement, as fractions of the clip, which is what ATTACKS in src/sim/knight.js
uses for when a blade can land.

Usage: python tools/armor/measure_blows.py assets/armor/velscour_knight.glb
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from rig_to_ual import load_glb, quat_matrix, read_accessor  # noqa: E402

CLIPS = (("Sword_Regular_A", "r"), ("Sword_Regular_B", "r"), ("Sword_Regular_C", "r"), ("Sword_Attack", "r"), ("Sword_Dash", "r"),
         ("Melee_Hook", "l"), ("Sword_Regular_Combo", "r"), ("Sword_Heavy_Combo", "r"))


def main():
    g, blob = load_glb(sys.argv[1])
    nodes = g["nodes"]
    index = {n.get("name"): i for i, n in enumerate(nodes)}
    parent = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
    anims = {a["name"]: a for a in g["animations"]}
    for clip, side in CLIPS:
        tracks = {}
        for c in anims[clip]["channels"]:
            s = anims[clip]["samplers"][c["sampler"]]
            tracks[(c["target"]["node"], c["target"]["path"])] = (read_accessor(g, blob, s["input"]), read_accessor(g, blob, s["output"]))
        times = tracks[(index["pelvis"], "translation")][0]

        def hand_at(frame):
            joint, m = index[f"hand_{side}"], np.eye(4)
            while joint is not None:
                n, local = nodes[joint], np.eye(4)
                r, t = tracks.get((joint, "rotation")), tracks.get((joint, "translation"))
                local[:3, :3] = quat_matrix(r[1][min(frame, len(r[1]) - 1)] if r else n.get("rotation", (0, 0, 0, 1)))
                local[:3, 3] = t[1][min(frame, len(t[1]) - 1)] if t else n.get("translation", (0, 0, 0))
                m = local @ m
                joint = parent.get(joint)
            return m[:3, 3]

        path = np.array([hand_at(f) for f in range(len(times))])
        speed = np.linalg.norm(np.diff(path, axis=0), axis=1) / np.diff(times)
        fast = speed > max(speed.max() * 0.55, 1.2)
        edges = np.flatnonzero(np.diff(np.r_[False, fast, False].astype(int)))
        last = len(times) - 1
        windows = [(round(a / last, 2), round(b / last, 2)) for a, b in zip(edges[::2], edges[1::2])]
        print(f"{clip} ({side}): {times[-1]:.2f} s, peak {speed.max():.1f}, blows at {windows}")


if __name__ == "__main__":
    main()
