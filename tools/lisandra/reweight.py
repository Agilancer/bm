"""Re-weight parts of a skinned model: say which bones move which vertices, by where each vertex sits.

    python tools/lisandra/reweight.py IN.glb OUT.glb SPEC.py

The mesh's shape is never touched; only JOINTS_0 / WEIGHTS_0 change. SPEC.py defines REWEIGHTS, a list of dicts:
    name:     what it is (printed)
    faces:    a function (model) -> face indices; their vertices are re-weighted
    weights:  a function (pos) -> {joint name: weight per vertex}, pos being the (N, 3) bind-pose positions; weights
              are normalised, and the four largest kept
    mix:      0..1, or a function (pos) -> 0..1 per vertex: how much of the new weights replace the old (default 1)
Joint names may drop the "mixamorig:" prefix. Vertices that sit on the same spot (a UV seam splits one corner into
several) are re-weighted together, so no crack opens between a re-weighted island and its neighbour. `model` is surface_paste.Model, so the face pickers work for both tools.
Needs NumPy and SciPy.
"""
import runpy
import sys

import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, __import__('os').path.dirname(__file__))
from surface_paste import Model, accessor, compact, load  # noqa: E402


def write_accessor(doc, buf, i, arr):
    a = doc['accessors'][i]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    dtype = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a['componentType']]
    v = doc['bufferViews'][a['bufferView']]
    size = np.dtype(dtype).itemsize
    stride = v.get('byteStride', width * size)
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    view = np.ndarray((a['count'], width), dtype, buf, start, (stride, size))
    view[:] = arr.astype(dtype)


def main(inp, outp, spec_path):
    doc, buf = load(inp)
    model = Model(doc, buf)
    prim = doc['meshes'][0]['primitives'][0]
    ji, wi = prim['attributes']['JOINTS_0'], prim['attributes']['WEIGHTS_0']
    J = accessor(doc, buf, ji).astype(int)
    W = accessor(doc, buf, wi).astype(np.float64)
    names = [doc['nodes'][j]['name'] for j in doc['skins'][0]['joints']]

    def index(name):
        for k, n in enumerate(names):
            if n == name or n.split(':')[-1] == name:
                return k
        raise KeyError(name)

    nj = len(names)
    for rw in runpy.run_path(spec_path)['REWEIGHTS']:
        faces = np.asarray(rw['faces'](model), int)
        chosen = np.unique(model.tri[faces])
        # Every vertex on the same spot as a chosen one goes with it (weld across UV seams).
        near = cKDTree(model.pos).query_ball_point(model.pos[chosen], 1e-6)
        verts = np.unique(np.concatenate([np.asarray(n, int) for n in near] + [chosen]))
        pos = model.pos[verts]
        # Old weights as a dense table, new ones on top.
        old = np.zeros((len(verts), nj))
        np.add.at(old, (np.repeat(np.arange(len(verts)), 4), J[verts].ravel()), W[verts].ravel())
        new = np.zeros_like(old)
        for name, w in rw['weights'](pos).items():
            new[:, index(name)] += np.broadcast_to(np.asarray(w, float), len(verts))
        new /= np.maximum(new.sum(1, keepdims=True), 1e-12)
        mix = rw.get('mix', 1.0)
        mix = np.broadcast_to(np.asarray(mix(pos) if callable(mix) else mix, float), len(verts))[:, None]
        dense = old * (1 - mix) + new * mix
        top = np.argsort(-dense, 1)[:, :4]
        tw = np.take_along_axis(dense, top, 1)
        tw /= np.maximum(tw.sum(1, keepdims=True), 1e-12)
        J[verts], W[verts] = top, tw
        print(f"  {rw.get('name', '?')}: {len(verts)} vertices ({len(verts) - len(chosen)} more on shared spots)")
    write_accessor(doc, buf, ji, J)
    write_accessor(doc, buf, wi, W)
    compact(doc, buf, outp)


if __name__ == '__main__':
    main(*sys.argv[1:4])
