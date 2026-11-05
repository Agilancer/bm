"""Finishes each piece from tools/gear/separate.py and writes it to assets/game/items, for the ground: normal and metal/rough maps derived
from its colours the way tools/armor/rig_armor.py does it, a pair brought together as they'd lie in a chest (a suit's arms are two metres
apart), and all of it scaled to GROUND metres at its longest, since a piece on the ground is a smaller copy of what's worn.

    (separate.py, in Blender)
    python tools/gear/atlas.py
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "swords"))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "armor"))
import atlas  # noqa: E402
from rig_armor import derive_pbr  # noqa: E402

GROUND = 0.5      # metres, at its longest
SIDE = 768        # the most any piece's maps are written at
PIECES = [f"{s}_{p}" for s in ("knight", "t_purple", "t_silver", "t_pale", "t_white") for p in ("head", "chest", "shoulders", "hands", "legs", "feet")]


def read(path):
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    sb = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        arr = np.frombuffer(sb, dt, a["count"] * n, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n) if n > 1 else arr

    mesh = next(n for n in j["nodes"] if "mesh" in n)
    pr = j["meshes"][mesh["mesh"]]["primitives"][0]
    a = pr["attributes"]
    t = j["materials"][pr["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    bv = j["bufferViews"][j["images"][j["textures"][t]["source"]]["bufferView"]]
    color = np.array(Image.open(io.BytesIO(sb[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB"))
    return dict(j=j, node=mesh, P=acc(a["POSITION"]).astype(np.float64), N=acc(a["NORMAL"]).astype(np.float64), UV=acc(a["TEXCOORD_0"]).copy(),
                F=acc(pr["indices"]).astype(np.int64).reshape(-1, 3), color=color)


def lay_pair(g, hands):
    """A left and a right, side by side. A pair of hands hangs fingers down, and is cut to the shorter of the two: some suits' right
    gauntlet runs on up the arm in one segment."""
    P, N = g["P"], g["N"]
    side = np.sign(P[:, 0])
    side[side == 0] = 1
    tri_side = np.sign(P[g["F"]][:, :, 0].mean(1))
    if hands:
        reach = min(np.abs(P[side > 0, 0]).max() - np.abs(P[side > 0, 0]).min(), np.abs(P[side < 0, 0]).max() - np.abs(P[side < 0, 0]).min())
        keep = np.ones(len(g["F"]), bool)
        for s in (1, -1):
            tip = np.abs(P[side == s, 0]).max()
            keep &= ~((tri_side == s) & ((tip - np.abs(P[g["F"]][:, :, 0]).max(1)) > reach * 1.02))
        g["F"] = g["F"][keep]
        for s in (1, -1):
            m = side == s
            x, y = P[m, 0].copy(), P[m, 1].copy()
            nx, ny = N[m, 0].copy(), N[m, 1].copy()
            # (fingers +x with s = 1, -x with s = -1: either way to -y)
            P[m, 0], P[m, 1] = s * y, -s * x
            N[m, 0], N[m, 1] = s * ny, -s * nx
    used = np.unique(g["F"])
    keepv = np.zeros(len(P), bool)
    keepv[used] = True
    for s in (1, -1):
        m = (side == s) & keepv
        if not m.any():
            continue
        lo, hi = P[m, 0].min(), P[m, 0].max()
        P[side == s, 0] += (s * 0.012 + (-lo if s > 0 else -hi))
        # (and each at the same height: the two come off the source a little apart)
        P[side == s, 1] -= (P[m, 1].min() + P[m, 1].max()) / 2


def build():
    sizes = {}
    for name in PIECES:
        g = read(os.path.join(atlas.BUILD, f"{name}.glb"))
        slot = name.rsplit("_", 1)[1]
        if slot in ("hands", "shoulders"):
            lay_pair(g, slot == "hands")
        used = np.unique(g["F"])
        lo, hi = g["P"][used].min(0), g["P"][used].max(0)
        g["P"] = (g["P"] - (lo + hi) / 2) * (GROUND / (hi - lo).max())
        S = min(g["color"].shape[0], SIDE)
        color = np.array(Image.fromarray(g["color"]).resize((S, S), Image.LANCZOS))
        normal, mr = derive_pbr(color.astype(np.float32), False, 3.0)
        maps = [color, np.clip(mr * 255 + 0.5, 0, 255).astype(np.uint8), np.clip(normal * 255 + 0.5, 0, 255).astype(np.uint8)]
        g["P"] = g["P"].astype(np.float32)
        g["N"] = g["N"].astype(np.float32)
        size = atlas.write(os.path.join(atlas.OUT, f"{name}.glb"), name, g, g["UV"], maps, [], normal_kind="jpg")
        ext = g["P"][used].max(0) - g["P"][used].min(0)
        sizes[name] = [round(float(x), 3) for x in ext]
        print(f"{name:20s} {size / 1e6:5.2f} MB {len(g['F']):5d} tris {S} maps  {sizes[name]}", flush=True)


if __name__ == "__main__":
    build()
