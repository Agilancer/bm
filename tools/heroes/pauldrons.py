"""A joint of its own for each pauldron: python tools/heroes/pauldrons.py [ids] [--dry]

A pauldron rides the upper arm (some share it with the collar bone). With the arm raised past level it came up with it
and stood over the helm: a cheer or an overhead blow hid the head behind a shoulder plate (the critics, all four rounds).
A real pauldron hangs from the shoulder and the arm lifts under it. So every body's skin gets two joints more,
pauldron_l and pauldron_r: children of the collar bones, at rest exactly the upper arms (their place, their turn, their
inverse bind), and whatever a "shoulders" piece had on an upper arm it has on that side's pauldron joint instead. No clip
moves them; the game sets them each frame (Hero.posePauldrons, src/sim/hero.js): the upper arm's own turn while the arm
is at or below level, and past that only part of the rise. Nothing else changes: the mesh, the bind pose, every other
weight. A body that has the joints is left alone.
"""
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
try:
    import PIL  # noqa: F401
except ImportError:
    import types
    _pil = types.ModuleType("PIL"); _pil.Image = types.ModuleType("PIL.Image"); sys.modules["PIL"] = _pil; sys.modules["PIL.Image"] = _pil.Image
import rebind as R
from gaps import accessor, load_glb


def add(b, dry=False):
    path = os.path.join(R.HEROES, b + ".glb")
    g, blob = load_glb(path)
    skin = g["skins"][0]
    names = [g["nodes"][n]["name"] for n in skin["joints"]]
    if "pauldron_l" in names:
        return None
    ibm = np.array(accessor(g, blob, skin["inverseBindMatrices"])).reshape(-1, 16).astype(np.float32)
    node_of = {g["nodes"][n]["name"]: n for n in skin["joints"]}
    new_ibm = [ibm]
    for s in "lr":
        up = g["nodes"][node_of[f"upperarm_{s}"]]
        g["nodes"].append({"name": f"pauldron_{s}", **{k: up[k] for k in ("translation", "rotation", "scale") if k in up}})
        g["nodes"][node_of[f"clavicle_{s}"]].setdefault("children", []).append(len(g["nodes"]) - 1)
        skin["joints"].append(len(g["nodes"]) - 1)
        new_ibm.append(ibm[names.index(f"upperarm_{s}")][None])
    raw = np.concatenate(new_ibm).astype("<f4").tobytes()
    blob = bytes(blob) + b"\0" * (-len(blob) % 4)
    g["bufferViews"].append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(raw)})
    g["accessors"][skin["inverseBindMatrices"]] = {"bufferView": len(g["bufferViews"]) - 1, "componentType": 5126, "count": len(names) + 2, "type": "MAT4"}
    blob += raw
    prim = g["meshes"][0]["primitives"][0]
    A = {k: np.array(accessor(g, blob, v)) for k, v in prim["attributes"].items()}
    idx = np.array(accessor(g, blob, prim["indices"])).reshape(-1, 3)
    pieces = [dict(p) for p in g["scenes"][0]["extras"]["pieces"]]
    moved = 0
    for p in pieces:
        if not p["name"].startswith("shoulders") or p["kind"] == "mail":
            continue
        sl = slice(p["vstart"], p["vstart"] + p["vcount"])
        J = A["JOINTS_0"][sl]; W = A["WEIGHTS_0"][sl]
        for k, s in enumerate("lr"):
            ui, pi = names.index(f"upperarm_{s}"), len(names) + k
            m = (J == ui) & (W > 0)
            if m.any():
                J[m] = pi; moved += int(m.any(1).sum())
            p["joints"] = [[pi if j == ui else j, w] for j, w in p["joints"]]
        A["JOINTS_0"][sl] = J
    if not dry:
        R.write(path, g, blob, A, idx, pieces)
    return moved


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for b in args or [h["id"] for h in json.load(open(os.path.join(R.HEROES, "roster.json")))]:
        print(b, add(b, "--dry" in sys.argv))
