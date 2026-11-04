"""Fit a Bellmourn kite shield's handle to a knight's fist.

The arm has to stand off the back of the board or the forearm goes through it, and that takes the fist away from the
handle modelled at the shield's origin. This moves the bar to where the fist is, in both holds, turns it 45 degrees so
it suits both, and stretches the posts back to the board. Nothing else in the model changes.

The socket here must match the left-hand socket in Knight's constructor (src/sim/knight.js).

Usage: python fit_shield.py SOURCE.glb KNIGHT.glb CLIPS.json SHIELD_SCALE OUT.glb
"""
import json
import struct
import sys

import numpy as np


def load(path):
    raw = open(path, "rb").read()
    n = struct.unpack_from("<I", raw, 12)[0]
    return json.loads(raw[20:20 + n]), bytearray(raw[28 + n:])


def view(g, blob, index):
    a = g["accessors"][index]
    bv = g["bufferViews"][a["bufferView"]]
    n = {"VEC2": 2, "VEC3": 3}[a["type"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    return np.frombuffer(blob, "<f4", a["count"] * n, off).reshape(-1, n).copy(), off


def unit(v):
    return v / np.linalg.norm(v)


def main():
    source, knight, clips, shield_scale, out = sys.argv[1:6]
    shield_scale = float(shield_scale)
    k, _ = load(knight)
    node = next(n for n in k["nodes"] if n.get("name") == "middle_01_l")
    L = float(np.linalg.norm(node["translation"]))
    grip = json.load(open(clips))["grip"]["l"]
    f, p, kn = (np.array(grip[n]) for n in ("fingers", "palm", "knuckles"))

    # From the shield's origin to the middle of the closed fist, in the hand's frame.
    socket = f * L * 0.62 - p * L * 0.42
    fist = f * L * 0.5 + p * L * 0.08
    delta = fist - socket

    # The same point in the fighting hold's frame, in shield units.
    lean = -0.12
    z = unit(p * np.cos(lean) + f * np.sin(lean))
    y = unit(kn - z * (kn @ z))
    x = np.cross(y, z)
    target = np.array([delta @ x, delta @ y, delta @ z]) / shield_scale

    g, blob = load(source)
    prim = g["meshes"][0]["primitives"][0]
    pos, pos_off = view(g, blob, prim["attributes"]["POSITION"])
    nrm, nrm_off = view(g, blob, prim["attributes"]["NORMAL"])
    a = g["accessors"][prim["indices"]]
    bv = g["bufferViews"][a["bufferView"]]
    fmt = {5125: "<u4", 5123: "<u2"}[a["componentType"]]
    tris = np.frombuffer(blob, fmt, a["count"], bv.get("byteOffset", 0) + a.get("byteOffset", 0)).astype(int)

    # Parts: connected groups of welded vertices.
    weld = np.unique(np.round(pos / 2e-4).astype(np.int64), axis=0, return_inverse=True)[1].ravel()
    parent = np.arange(weld.max() + 1)

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for t in weld[tris].reshape(-1, 3):
        parent[find(t[1])] = find(t[0])
        parent[find(t[2])] = find(t[0])
    part = np.array([find(i) for i in range(len(parent))])[weld]

    def pick(test):
        for r in np.unique(part):
            m = pos[part == r]
            if test(m.min(0), m.max(0)):
                return part == r
        raise ValueError("handle part not found")

    bar = pick(lambda a, b: abs(a[1] + 0.06) < 0.005 and abs(b[1] - 0.06) < 0.005 and abs(a[2] + 0.01) < 0.005 and abs(b[2] - 0.01) < 0.005)
    low = pick(lambda a, b: abs(a[1] + 0.06) < 0.005 and abs(b[1] + 0.05) < 0.005 and abs(a[2] + 0.05) < 0.005)
    high = pick(lambda a, b: abs(a[1] - 0.05) < 0.005 and abs(b[1] - 0.06) < 0.005 and abs(a[2] + 0.05) < 0.005)

    c, s = np.cos(np.pi / 4), np.sin(np.pi / 4)
    turn = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
    centre = pos[bar].mean(0)
    pos[bar] = (pos[bar] - centre) @ turn.T + target
    nrm[bar] = nrm[bar] @ turn.T

    # Each post keeps its foot on the board and takes its head to the bar's end.
    for mask, end in ((low, np.array([0, -0.055, 0])), (high, np.array([0, 0.055, 0]))):
        new_end = turn @ end + target
        zmin, zmax = pos[mask][:, 2].min(), pos[mask][:, 2].max()
        t = ((pos[mask][:, 2] - zmin) / (zmax - zmin))[:, None]
        pos[mask] = pos[mask] + t * (new_end - end)

    blob[pos_off:pos_off + pos.size * 4] = pos.astype("<f4").tobytes()
    blob[nrm_off:nrm_off + nrm.size * 4] = nrm.astype("<f4").tobytes()
    mn, mx = pos.min(0), pos.max(0)
    g["accessors"][prim["attributes"]["POSITION"]]["min"] = [float(v) for v in mn]
    g["accessors"][prim["attributes"]["POSITION"]]["max"] = [float(v) for v in mx]
    js = json.dumps(g, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    body = bytes(blob) + b"\0" * (-len(blob) % 4)
    with open(out, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(body)))
        fh.write(struct.pack("<I4s", len(js), b"JSON") + js)
        fh.write(struct.pack("<I4s", len(body), b"BIN\0") + body)
    print(f"{out}: bar at {np.round(target, 3)} in shield units, hand length {L:.3f}")


if __name__ == "__main__":
    main()
