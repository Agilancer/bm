"""A cloak modelled draped along an outstretched arm, hung down instead: python tools/heroes/drape.py paladin_m1 [--dry]

paladin_m1's cloak was modelled with its lining lying out along both arms of the T-pose (the left as far as the elbow).
Whatever it was bound to, that cloth was wrong once the arms came down: on the trunk it stood out sideways under the
pauldron as black blades; on the arm it tore from the rest of the cloak, and a raised arm lifted it in shards (the
critics, four rounds, 2026-11-20 to 24; seen at last in Blender, the cloak painted red, tools/build/h3 dbg()).

So that cloth is hung: each cloak vertex out along an arm (past the shoulder joint, within REACH of the arm's line) is
moved, once, to where the upper arm carries it when he stands at ease (the game's own standing pose, posedump), by how
far out along the arm it lies (eased in over EASE from the shoulder), and bound to the trunk alone. From then on it
hangs from the shoulder under the pauldron whatever the arm does. This MOVES THE CLOAK'S REST SHAPE (cloth only, never
a plate): the one place in this pass a model's cloth is re-shaped, as backpin.py presses cloth behind a back shield.
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, "..", "build", "h3"))
import rebind as R, relax as X, stretch as S

REACH = 0.32     # metres (1.8 m hero) from the arm's line
EASE = 0.22      # of the way to the elbow over which the hanging eases in from the shoulder
ARMISH = ("clavicle", "upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb")


def drape(b, dry=False):
    path, g, blob, A, idx, pieces, names, T = R._open(b)
    A = {k: np.array(v) for k, v in A.items()}
    u = g["scenes"][0]["extras"].get("height", 1.8) / 1.8
    fr = X.poses(b)[0]                                   # standing at ease
    Bd = S.Body(b)
    at = {n: i for i, n in enumerate(fr["names"])}
    FQ = np.asarray(fr["wq"], float).reshape(-1, 4); FT = np.asarray(fr["wt"], float).reshape(-1, 3)
    wq = np.array([FQ[at[n]] for n in names]); wt = np.array([FT[at[n]] for n in names])
    sq = S.qmul(wq, Bd.ibq); st = S.qrot(wq, Bd.ibt) + wt     # each joint: bind -> world at ease
    s3 = names.index("spine_03")
    inv_q = sq[s3] * np.array([-1, -1, -1, 1.0])
    done = []
    for p in pieces:
        if p["kind"] != "cloth" or p.get("armcut") or p.get("draped"):
            continue
        sl = slice(p["vstart"], p["vstart"] + p["vcount"])
        P = A["POSITION"][sl].astype(np.float64); N = A["NORMAL"][sl].astype(np.float64)
        if P[:, 1].max() < T["spine_02"][1]:
            continue
        full = R._full(A, sl, len(names)); moved = np.zeros(len(P))
        for s in "lr":
            Sj, E = T[f"upperarm_{s}"], T[f"lowerarm_{s}"]; ax = E - Sj
            t = ((P - Sj) @ ax) / (ax @ ax); d = np.linalg.norm(P - (Sj + np.outer(t, ax)), axis=1)
            k = np.clip(t / EASE, 0, 1); k = k * k * (3 - 2 * k) * (d < REACH * u) * (t > 0)
            if (k > 0.5).sum() < 12:
                continue
            ui = names.index(f"upperarm_{s}")
            # where the arm carries it at ease, seen from the chest: bind -> world by the arm, world -> bind by spine_03
            W = S.qrot(sq[ui], P) + st[ui]
            Pn = S.qrot(inv_q, W - st[s3])
            Nn = S.qrot(inv_q, S.qrot(sq[ui], N))
            P = P + (Pn - P) * k[:, None]; N = N + (Nn - N) * k[:, None]
            moved = np.maximum(moved, k)
        if moved.max() <= 0:
            continue
        arm = [i for i, n in enumerate(names) if any(a in n for a in ARMISH)]
        on = moved > 0
        w = full[on][:, arm].sum(1); f2 = full[on]; f2[:, arm] = 0
        rest = f2.sum(1); f2 *= np.where(rest > 1e-6, 1 / np.maximum(rest, 1e-9), 0)[:, None]; f2[rest <= 1e-6, s3] = 1
        full[on] = f2
        A["POSITION"][sl] = P.astype(np.float32)
        A["NORMAL"][sl] = (N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)).astype(np.float32)
        R._store(A, sl, full); p["draped"] = 1; p.pop("feathered", None)
        done.append((p["name"], int(on.sum())))
    if done and not dry:
        R.write(path, g, blob, A, idx, pieces)
    return done


if __name__ == "__main__":
    for b in [a for a in sys.argv[1:] if not a.startswith("--")]:
        print(b, drape(b, "--dry" in sys.argv))
