"""Heads brought down to their bodies' size: Meshy made a few of Phobos's people with heads too big for them (the owner,
2026-11-20: 'some are far too big for their body'). Each vertex the head moves is drawn in towards the Head joint by as
much of it as the head moves (its Head and HeadTop weight), so the neck, half the head's and half the neck's, blends.
Right in the game's own model (assets/game/folk/<id>.glb); what it was scaled by kept in its
asset.extras.headScale, so running this again only makes up the difference to what HEADS asks.

    python tools/folk/head_scale.py [ids...]

Run it again after tools/folk/build_folk.py builds any of these afresh.
"""
import json
import os
import struct
import sys

import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FOLK = os.path.join(ROOT, "assets", "game", "folk")
# How big each head's to be, of what Meshy made it (judged by eye against the body, chest up, all at one scale).
HEADS = {
    "alchemistgirl": 0.72, "astrologer": 0.82, "campcook": 0.85, "taverncook": 0.85, "armourer": 0.86, "eelseller": 0.88,
    "innkeeper": 0.85, "pieseller": 0.86, "fishwife": 0.9, "washerwoman": 0.92, "joiner": 0.93,
    "herbalist": 0.9, "soapmaker": 0.9, "pawnbroker": 0.9, "relicseller": 0.92, "cobbler": 0.92, "sorrel_b": 0.92,
}
SIZES = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
DTYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def read(path):
    data = bytearray(open(path, "rb").read())
    jl = struct.unpack("<I", data[12:16])[0]
    js = json.loads(data[20:20 + jl])
    b0 = 20 + jl + 8
    return data, js, jl, b0


def view(data, js, b0, ai):
    """An accessor's array, a view straight onto the file's bytes (so writing it writes the file)."""
    a = js["accessors"][ai]
    bv = js["bufferViews"][a["bufferView"]]
    n, c, dt = a["count"], COUNT[a["type"]], DTYPES[a["componentType"]]
    off = b0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = bv.get("byteStride", 0) or c * SIZES[a["componentType"]]
    if stride != c * SIZES[a["componentType"]]:
        raise SystemExit("interleaved accessors aren't handled")
    arr = np.frombuffer(memoryview(data)[off:off + n * stride], dtype=dt).reshape(n, c)
    return arr


def scale_head(k, want):
    path = os.path.join(FOLK, f"{k}.glb")
    data, js, jl, b0 = read(path)
    had = js.get("asset", {}).get("extras", {}).get("headScale", 1.0)
    s = want / had
    if abs(s - 1) < 1e-4:
        print(k, "already", want); return
    skin = js["skins"][0]
    names = [js["nodes"][j].get("name", "") for j in skin["joints"]]
    head = next(i for i, n in enumerate(names) if n.lower().endswith(("head", ":head")) and "top" not in n.lower())
    top = next((i for i, n in enumerate(names) if "headtop" in n.lower()), -1)
    ibm = view(data, js, b0, skin["inverseBindMatrices"]).astype(np.float64)
    M = ibm[head].reshape(4, 4).T          # (glTF's column order)
    J = np.linalg.inv(M)[:3, 3]            # the Head joint, where it stands in the bind pose
    pr = js["meshes"][0]["primitives"][0]
    pos = view(data, js, b0, pr["attributes"]["POSITION"])
    jo = view(data, js, b0, pr["attributes"]["JOINTS_0"]).astype(int)
    we = view(data, js, b0, pr["attributes"]["WEIGHTS_0"]).astype(np.float64)
    if we.max() > 1.5: we = we / 255.0 if we.max() <= 255 else we / 65535.0
    w = ((jo == head) | (jo == top)) * we
    w = np.clip(w.sum(1), 0, 1)
    p = pos.astype(np.float64)
    new = J + (p - J) * (1 + (s - 1) * w)[:, None]
    pos[:] = new.astype(np.float32)
    acc = js["accessors"][pr["attributes"]["POSITION"]]
    acc["min"] = [float(v) for v in new.min(0)]; acc["max"] = [float(v) for v in new.max(0)]
    js.setdefault("asset", {}).setdefault("extras", {})["headScale"] = want
    # (The file again: its JSON chunk, padded with spaces to four bytes, then its binary chunk as it now is.)
    txt = json.dumps(js, separators=(",", ":")).encode()
    txt += b" " * (-len(txt) % 4)
    rest = bytes(data[20 + jl:])
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(txt) + len(rest)) + struct.pack("<II", len(txt), 0x4E4F534A) + txt + rest
    open(path, "wb").write(out)
    print(k, f"head {had} -> {want}", int((w > 0.05).sum()), "vertices moved")


if __name__ == "__main__":
    for k in (sys.argv[1:] or HEADS):
        scale_head(k, HEADS[k])
