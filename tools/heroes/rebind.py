"""A chest that rides the arms and legs, put back on the body: python tools/heroes/rebind.py [ids...] [--dry]

tools/armor/rig_armor.py cuts a shell that spans a joint along its source weights and binds each piece rigidly to one
bone (right for a forearm and its gauntlet). On six bodies it did that to the whole chest: lancer_f2's breastplate went in
two halves onto her upper arms and her belly and tabard onto her right thigh; the archers' (ARCHER 2) and the rogues'
(ROGUE 1) coats the same. With the arms down at her sides the two halves of the chest swung up to her ears and left a hole
where it had been, and the skirt went wherever the one leg did.

This finds such a chest (a "chest" part cut into pieces, a big one of them wholly on an arm or a leg), and gives every
vertex of it weights by where it is on the body in the bind pose, as a coat's would be:

  - the trunk by height, from the pelvis up the spine: the chest stays on the chest
  - past the shoulder joint, onto the upper arm (and past the elbow, the forearm): only the shoulder's cap goes with the arm
  - below the hips, part onto the thigh of its side (the middle shared between the two), more the lower it hangs; below
    the knee, part onto the shin

The pieces become cloth in the piece table (bound per vertex; the table's joint is the trunk's, for the sim's hit tests).
Their shape, paint and place in the bind pose are untouched.

It also mirrors an arm's plate that's on one side only onto the other (mirror_arms: paladin_f2's right vambrace).

Run tools/heroes/mail.py after it, which sizes the covers from
where the plates ride. `--dry` only lists what it would change.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
HEROES = os.path.join(ROOT, "assets", "game", "heroes")
sys.path.insert(0, HERE)
from gaps import accessor, load_glb  # noqa: E402
from mail import write  # noqa: E402

LIMB = ("upperarm", "lowerarm", "hand", "thigh", "calf", "foot")


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def families(pieces, names):
    """Chest parts cut onto the limbs: {part name: [piece indices]} where a piece of 300 vertices or more is wholly on an
    arm or a leg, and the part is a big one (a coat or a cuirass, not a strap)."""
    fam = {}
    for k, p in enumerate(pieces):
        if p["kind"] == "plate" and p["name"].startswith("chest"):
            fam.setdefault(p["name"].split("#")[0], []).append(k)
    out = {}
    for n, ks in fam.items():
        on_limb = any(pieces[k]["vcount"] >= 300 and any(any(x in names[j] for x in LIMB) and w > 0.9 for j, w in pieces[k].get("joints", [])) for k in ks)
        if on_limb and sum(pieces[k]["vcount"] for k in ks) >= 1500:
            out[n] = ks
    return out


def coat_weights(P, T, index, njoints):
    """Weights for a coat's vertices P (bind pose), by where each is on the body. T: joint positions."""
    W = np.zeros((len(P), njoints))
    x, y = P[:, 0], P[:, 1]
    # The trunk, by height.
    chain = ["pelvis", "spine_01", "spine_02", "spine_03"]
    ys = np.array([T[n][1] for n in chain])
    trunk = np.zeros((len(P), len(chain)))
    for i in range(len(chain)):
        lo = ys[i - 1] if i else -1e9
        hi = ys[i + 1] if i + 1 < len(chain) else 1e9
        up = np.clip((y - lo) / max(ys[i] - lo, 1e-6), 0, 1) if i else np.ones(len(P))
        down = np.clip((hi - y) / max(hi - ys[i], 1e-6), 0, 1) if i + 1 < len(chain) else np.ones(len(P))
        trunk[:, i] = np.minimum(up, down)
    trunk /= trunk.sum(1, keepdims=True)
    arm = np.zeros(len(P)); leg = np.zeros(len(P))
    for s, sg in (("l", 1.0), ("r", -1.0)):
        sx = sg * x
        sh, el = T[f"upperarm_{s}"], T[f"lowerarm_{s}"]
        # Past the shoulder joint, at shoulder height: the arm's.
        t = smooth((sx - (sg * sh[0] - 0.02)) / 0.08) * smooth((y - (sh[1] - 0.24)) / 0.08)
        fore = smooth((sx - (sg * el[0] - 0.03)) / 0.06)
        W[:, index[f"upperarm_{s}"]] += t * (1 - fore)
        W[:, index[f"lowerarm_{s}"]] += t * fore
        arm += t
        # Below the hips: the thigh of its side, the middle shared; below the knee, the shin's share of that.
        hip, knee = T[f"thigh_{s}"], T[f"calf_{s}"]
        a = smooth((hip[1] + 0.02 - y) / 0.3) * 0.75 * smooth((sx + 0.05) / 0.10)
        shin = smooth((knee[1] - y) / 0.15) * 0.6
        W[:, index[f"thigh_{s}"]] += a * (1 - shin)
        W[:, index[f"calf_{s}"]] += a * shin
        leg += a
    rest = np.clip(1 - arm - leg, 0, 1)
    for i, n in enumerate(chain):
        W[:, index[n]] += trunk[:, i] * rest
    return W / W.sum(1, keepdims=True)


def rebind(body_id, dry=False):
    path = os.path.join(HEROES, f"{body_id}.glb")
    g, blob = load_glb(path)
    prim = g["meshes"][0]["primitives"][0]
    A = {k: np.array(accessor(g, blob, v)) for k, v in prim["attributes"].items()}
    idx = np.array(accessor(g, blob, prim["indices"])).reshape(-1, 3)
    pieces = [dict(p) for p in g["scenes"][0]["extras"]["pieces"]]
    skin = g["skins"][0]
    names = [g["nodes"][n]["name"] for n in skin["joints"]]
    index = {n: i for i, n in enumerate(names)}
    ibm = np.array(accessor(g, blob, skin["inverseBindMatrices"])).reshape(-1, 4, 4).transpose(0, 2, 1)
    T = {n: np.linalg.inv(ibm[i])[:3, 3] for i, n in enumerate(names)}
    fam = families(pieces, names)
    if not fam:
        return []
    done = []
    jn = A["JOINTS_0"].copy(); wt = A["WEIGHTS_0"].astype(np.float64).copy()
    for n, ks in fam.items():
        for k in ks:
            p = pieces[k]
            sl = slice(p["vstart"], p["vstart"] + p["vcount"])
            W = coat_weights(A["POSITION"][sl].astype(np.float64), T, index, len(names))
            order = np.argsort(-W, axis=1)[:, :4]
            w4 = np.take_along_axis(W, order, 1)
            w4 /= w4.sum(1, keepdims=True)
            jn[sl] = order.astype(jn.dtype); wt[sl] = w4
            was = [(names[j], round(w, 2)) for j, w in p.get("joints", [])]
            top = int(np.argmax(W.sum(0)))
            p["kind"] = "cloth"; p["joints"] = [[top, 1.0]]
            done.append((p["name"], p["vcount"], was, names[top]))
    if not dry:
        A["JOINTS_0"] = jn; A["WEIGHTS_0"] = wt.astype(np.float32)
        write(path, g, blob, A, idx, pieces)
    return done


def mirror_arms(body_id, dry=False):
    """An arm's plate that's there on one side and not on the other (paladin_f2 has her left vambrace and no right one,
    the gauntlet beyond it there on both): the one she has, mirrored across the body onto the other arm, bound to the same
    bone on that side. Only the arms' own pieces, and only where the far side has none at all on that bone."""
    path = os.path.join(HEROES, f"{body_id}.glb")
    g, blob = load_glb(path)
    prim = g["meshes"][0]["primitives"][0]
    A = {k: np.array(accessor(g, blob, v)) for k, v in prim["attributes"].items()}
    idx = np.array(accessor(g, blob, prim["indices"])).reshape(-1, 3).astype(np.int64)
    pieces = [dict(p) for p in g["scenes"][0]["extras"]["pieces"]]
    names = [g["nodes"][n]["name"] for n in g["skins"][0]["joints"]]
    index = {n: i for i, n in enumerate(names)}
    other = lambda n: n[:-2] + ("_r" if n.endswith("_l") else "_l") if n[-2:] in ("_l", "_r") else n
    count = {}
    for p in pieces:
        if p["kind"] == "plate":
            for j, w in p.get("joints", []):
                if w >= 0.5:
                    count[names[j]] = count.get(names[j], 0) + p["vcount"]
    done = []
    for k, p in enumerate(list(pieces)):
        if p["kind"] != "plate" or not p["name"].startswith("arms") or p["vcount"] < 250 or "(mirrored)" in p["name"]:
            continue
        js = [(names[j], w) for j, w in p.get("joints", [])]
        if len(js) != 1 or not any(x in js[0][0] for x in ("upperarm", "lowerarm")) or count.get(other(js[0][0]), 0) > 0:
            continue
        sl = slice(p["vstart"], p["vstart"] + p["vcount"])
        n0 = len(A["POSITION"])
        flip = np.array([-1, 1, 1], np.float32)
        jmap = np.array([index[other(n)] for n in names])
        tri = idx[p["tstart"]:p["tstart"] + p["tcount"]] - p["vstart"] + n0
        add = {"POSITION": A["POSITION"][sl] * flip, "NORMAL": A["NORMAL"][sl] * flip, "TEXCOORD_0": A["TEXCOORD_0"][sl],
               "JOINTS_0": jmap[A["JOINTS_0"][sl].astype(np.int64)].astype(A["JOINTS_0"].dtype), "WEIGHTS_0": A["WEIGHTS_0"][sl],
               "_FLEX": np.array(A["_FLEX"]).reshape(-1)[sl], "_PIECE": np.full(p["vcount"], len(pieces), A["_PIECE"].dtype)}
        for key, v in add.items():
            A[key] = np.concatenate([np.array(A[key]).reshape((-1,) + v.shape[1:]), v])
        q = dict(p, name=p["name"] + " (mirrored)", vstart=n0, tstart=len(idx), joints=[[index[other(js[0][0])], 1.0]],
                 min=[-p["max"][0], p["min"][1], p["min"][2]], max=[-p["min"][0], p["max"][1], p["max"][2]])
        idx = np.concatenate([idx, tri[:, ::-1]])
        pieces.append(q)
        count[other(js[0][0])] = p["vcount"]
        done.append((p["name"], p["vcount"], js[0][0], other(js[0][0])))
    if done and not dry:
        write(path, g, blob, A, idx, pieces)
    return done


def main():
    args = [a for a in sys.argv[1:] if a != "--dry"]
    dry = "--dry" in sys.argv
    ids = args or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    n = 0
    for b in ids:
        done = rebind(b, dry)
        for name, count, was, now in done:
            print(f"{b}: {name} ({count} vertices) was on {was}, now a coat on the body (mostly {now}){' (dry)' if dry else ''}")
        for name, count, a, c in mirror_arms(b, dry):
            print(f"{b}: {name} ({count} vertices) is on {a} and there's nothing on {c}: mirrored onto it{' (dry)' if dry else ''}")
            done = True
        n += bool(done)
    print(f"{n} bodies {'would be ' if dry else ''}changed")


if __name__ == "__main__":
    main()
