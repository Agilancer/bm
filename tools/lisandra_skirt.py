"""Mark the original skirt surfaces for the game's leg collision pass.

Usage: python tools/lisandra_skirt.py pretty input.glb output.glb
Requires NumPy and SciPy. Output must be a new file.
"""
import argparse
import json
import struct
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


def read_accessor(doc, data, index, dtype, width):
    accessor = doc["accessors"][index]
    view = doc["bufferViews"][accessor["bufferView"]]
    size = np.dtype(dtype).itemsize
    return np.ndarray(
        (accessor["count"], width), dtype, data,
        view.get("byteOffset", 0) + accessor.get("byteOffset", 0),
        (view.get("byteStride", width * size), size),
    )


def smooth(low, high, values):
    t = np.clip((values - low) / (high - low), 0, 1)
    return t * t * (3 - 2 * t)


def skirt_mask(form, pos, triangles):
    x, y, z = pos.T
    if form == "witch":
        # The boot tops and inner lining are welded to the coat. Isolate the outer
        # shell with the lower hem silhouette so the shader never pushes the boots.
        side = smooth(0.102, 0.124, abs(x - 0.006))
        front = smooth(0.055, 0.077, z)
        back = smooth(0.061, 0.086, -z)
        outer = np.maximum.reduce([side, front, back])
        skirt = np.maximum(outer * smooth(0.09, 0.16, y), smooth(0.16, 0.205, y))
        return skirt * (1 - smooth(0.35, 0.47, y))

    # Below the thigh seams the coat, center tabard and the legs are separate
    # components. Weld coincident UV seams before identifying the two panels.
    welded, index = np.unique(np.round(pos, 5), axis=0, return_inverse=True)
    edges = index[triangles][:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2)
    edges = edges[(welded[edges, 1] < 0.40).all(axis=1)]
    graph = coo_matrix((np.ones(len(edges)), edges.T), shape=(len(welded),) * 2).tocsr()
    _, labels = connected_components(graph, directed=False)
    coat, _, _, tabard = np.argsort(np.bincount(labels))[-4:][::-1]
    mask = np.isin(labels[index], [coat, tabard])
    return mask * (1 - smooth(0.34, 0.397, y))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("form", choices=["pretty", "witch"])
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = args.source.read_bytes()
    json_size = struct.unpack_from("<I", source, 12)[0]
    doc = json.loads(source[20:20 + json_size])
    data = bytearray(source[28 + json_size:])
    primitive = doc["meshes"][0]["primitives"][0]
    pos = read_accessor(doc, data, primitive["attributes"]["POSITION"], "<f4", 3)
    index = primitive["indices"]
    dtype = {5123: "<u2", 5125: "<u4"}[doc["accessors"][index]["componentType"]]
    triangles = read_accessor(doc, data, index, dtype, 1).reshape(-1, 3)
    mask = skirt_mask(args.form, pos, triangles).astype("<f4").tobytes()
    del pos, triangles

    data.extend(b"\0" * (-len(data) % 4))
    view = len(doc["bufferViews"])
    doc["bufferViews"].append(dict(buffer=0, byteOffset=len(data), byteLength=len(mask)))
    data.extend(mask)
    primitive["attributes"]["_SKIRT"] = len(doc["accessors"])
    doc["accessors"].append(dict(bufferView=view, componentType=5126, count=len(mask) // 4, type="SCALAR"))
    doc["buffers"][0]["byteLength"] = len(data)
    metadata = json.dumps(doc, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    with args.output.open("xb") as out:
        out.write(struct.pack("<5I", 0x46546C67, 2, 28 + len(metadata) + len(data), len(metadata), 0x4E4F534A))
        out.write(metadata)
        out.write(struct.pack("<2I", len(data), 0x004E4942))
        out.write(data)


if __name__ == "__main__":
    main()
