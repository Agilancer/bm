"""A cloak that hung as two boards, hung as cloth: python tools/heroes/cloakhang.py paladin_m2 [--dry]

paladin_m2's cloak is two long panels behind him, bound three parts in four to the pelvis from collar to hem: whatever he
did they swung as two stiff planks (the critics, rounds 2 to 4). Here each panel's vertices are weighted by where they
hang, as a coat's are (rebind.coat_weights): up the trunk by height, so it bends with his back; below the hips a share
LEG of what a coat would give to the thigh of its side, and the shin's share of that below the knee, so each panel
trails its own leg through a stride. Nothing goes to the arms. Shape, paint and bind pose untouched.
"""
import os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import rebind as R

LEG = 0.5
BACK = -0.06     # metres: a cloth piece wholly behind this (z, bind pose) and from the shoulders to below the knee is a cloak


def hang(b, dry=False):
    path, g, blob, A, idx, pieces, names, T = R._open(b)
    index = {n: i for i, n in enumerate(names)}
    legs = [index[f"{j}_{s}"] for j in ("thigh", "calf") for s in "lr"]
    arms = [i for i, n in enumerate(names) if any(a in n for a in ("upperarm", "lowerarm", "hand_"))]
    trunk = [index[n] for n in R._TRUNK]
    done = []
    for p in pieces:
        if p["kind"] != "cloth" or p.get("hung"):
            continue
        sl = slice(p["vstart"], p["vstart"] + p["vcount"])
        P = A["POSITION"][sl].astype(np.float64)
        if P[:, 2].max() > BACK or P[:, 1].max() < T["spine_03"][1] - 0.05 or P[:, 1].min() > T["calf_l"][1]:
            continue
        W = R.coat_weights(P, T, index, len(names))
        give = W[:, arms].sum(1) + W[:, legs].sum(1) * (1 - LEG)
        W[:, arms] = 0; W[:, legs] *= LEG
        tr = W[:, trunk]; W[:, trunk] = tr + (tr / np.maximum(tr.sum(1, keepdims=True), 1e-9)) * give[:, None]
        W[tr.sum(1) < 1e-6, index["pelvis"]] += give[tr.sum(1) < 1e-6]
        R._store(A, sl, W / W.sum(1, keepdims=True)); p["hung"] = 1
        done.append((p["name"], p["vcount"]))
    if done and not dry:
        R.write(path, g, blob, A, idx, pieces)
    return done


if __name__ == "__main__":
    for b in [a for a in sys.argv[1:] if not a.startswith("--")]:
        print(b, hang(b, "--dry" in sys.argv))
