"""The player's body as arrays: the mesh, its skin and its colour map, read from assets/game/player/wizard.glb."""
import io
import json
import struct

import numpy as np
from PIL import Image

_TYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}


def load(path):
    data = open(path, "rb").read()
    n = struct.unpack_from("<I", data, 12)[0]
    g = json.loads(data[20:20 + n])
    start = 20 + n + 8

    def acc(i):
        a = g["accessors"][i]
        v = g["bufferViews"][a["bufferView"]]
        t, c = _TYPES[a["componentType"]], _COUNT[a["type"]]
        off = start + v.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(data, t, a["count"] * c, off).reshape(a["count"], c) if c > 1 else np.frombuffer(data, t, a["count"], off)

    def image(i):
        v = g["bufferViews"][g["images"][i]["bufferView"]]
        off = start + v.get("byteOffset", 0)
        return Image.open(io.BytesIO(data[off:off + v["byteLength"]]))

    p = g["meshes"][0]["primitives"][0]
    at = p["attributes"]
    mat = g["materials"][p["material"]]
    src = lambda t: g["textures"][t["index"]]["source"]
    return {
        "pos": acc(at["POSITION"]).astype(np.float64), "nrm": acc(at["NORMAL"]).astype(np.float64), "uv": acc(at["TEXCOORD_0"]).astype(np.float64),
        "joints": acc(at["JOINTS_0"]).astype(np.int64), "weights": acc(at["WEIGHTS_0"]).astype(np.float64),
        "tris": acc(p["indices"]).astype(np.int64).reshape(-1, 3),
        "names": [g["nodes"][j]["name"] for j in g["skins"][0]["joints"]],
        # Where each joint is in the bind pose (the inverse of its inverse bind matrix; glTF's are column-major).
        "bind": np.array([np.linalg.inv(mm.reshape(4, 4).T)[:3, 3] for mm in acc(g["skins"][0]["inverseBindMatrices"]).astype(np.float64)]),
        "color": image(src(mat["pbrMetallicRoughness"]["baseColorTexture"])).convert("RGB"),
    }
