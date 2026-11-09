"""Find stretched skin: pose a built monster at moments of a clip on the CPU and list triangles whose edges grow far past
their rest length (needles, rods, torn panels), with the bones their corners hang off.

    python tools/monsters/stretch.py worm_1 hit death2
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TYPES = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
SIZE = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    doc = json.loads(b[20:20 + n])
    o = 20 + n
    m = struct.unpack('<I', b[o:o + 4])[0]
    return doc, b[o + 8:o + 8 + m]


def acc(doc, buf, i):
    a = doc['accessors'][i]
    bv = doc['bufferViews'][a['bufferView']]
    dt, k = TYPES[a['componentType']], SIZE[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0)
    if stride and stride != np.dtype(dt).itemsize * k:
        raw = np.frombuffer(buf, np.uint8, stride * a['count'], off).reshape(a['count'], stride)
        x = raw[:, :np.dtype(dt).itemsize * k].copy().view(dt).reshape(a['count'], k)
    else:
        x = np.frombuffer(buf, dt, a['count'] * k, off).reshape(a['count'], k)
    x = x.astype(np.float64)
    if a.get('normalized'):
        x = np.maximum(x / {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']], -1)
    return x


def qmat(q):
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def trs(n, over):
    M = np.eye(4)
    if 'matrix' in n:
        return np.array(n['matrix']).reshape(4, 4).T
    t = over.get('translation', n.get('translation', [0, 0, 0]))
    r = over.get('rotation', n.get('rotation', [0, 0, 0, 1]))
    s = over.get('scale', n.get('scale', [1, 1, 1]))
    M[:3, :3] = qmat(np.array(r)) * s
    M[:3, 3] = t
    return M


def sample(doc, buf, anim, t):
    over = {}
    for ch in anim['channels']:
        s = anim['samplers'][ch['sampler']]
        T = acc(doc, buf, s['input'])[:, 0]
        V = acc(doc, buf, s['output'])
        i = int(np.clip(np.searchsorted(T, t) - 1, 0, len(T) - 1))
        j = min(i + 1, len(T) - 1)
        f = 0 if j == i else np.clip((t - T[i]) / (T[j] - T[i]), 0, 1)
        v = V[i] * (1 - f) + V[j] * f
        over.setdefault(ch['target']['node'], {})[ch['target']['path']] = v
    return over


def world(doc, over):
    parent = {}
    for i, n in enumerate(doc['nodes']):
        for c in n.get('children', []):
            parent[c] = i
    W = {}

    def get(i):
        if i not in W:
            L = trs(doc['nodes'][i], over.get(i, {}))
            W[i] = (get(parent[i]) @ L) if i in parent else L
        return W[i]
    for i in range(len(doc['nodes'])):
        get(i)
    return W


def check(id_, clips=None, steps=12, factor=3.0, path=None):
    doc, buf = load(path or os.path.join(ROOT, 'assets', 'monsters', 'tripo', id_ + '.glb'))
    skin = doc['skins'][0]
    J = skin['joints']
    IBM = acc(doc, buf, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    names = [doc['nodes'][j].get('name', str(j)) for j in J]
    prims = []
    for ni, n in enumerate(doc['nodes']):
        if 'mesh' in n and 'skin' in n:
            for p in doc['meshes'][n['mesh']]['primitives']:
                at = p['attributes']
                prims.append((acc(doc, buf, at['POSITION']), acc(doc, buf, at['JOINTS_0']).astype(int),
                               acc(doc, buf, at['WEIGHTS_0']), acc(doc, buf, p['indices']).astype(int).reshape(-1, 3)))
    rest = world(doc, {})
    out = []
    for a in doc['animations']:
        if clips and a['name'] not in clips:
            continue
        dur = max(acc(doc, buf, s['input'])[-1, 0] for s in a['samplers'])
        for t in np.linspace(0, dur, steps):
            Wd = world(doc, sample(doc, buf, a, t))
            S = np.array([Wd[j] @ IBM[k] for k, j in enumerate(J)])
            S0 = np.array([rest[j] @ IBM[k] for k, j in enumerate(J)])
            for P, Jv, Wv, I in prims:
                def skin_(Sm):
                    M = np.einsum('vk,vkij->vij', Wv, Sm[Jv])
                    return np.einsum('vij,vj->vi', M[:, :3, :3], P) + M[:, :3, 3]
                Q, Q0 = skin_(S), skin_(S0)
                e = lambda X: np.stack([np.linalg.norm(X[I[:, a_]] - X[I[:, b_]], axis=1) for a_, b_ in ((0, 1), (1, 2), (2, 0))], 1)
                r = (e(Q) / (e(Q0) + 1e-6)).max(1)
                bad = np.nonzero((r > factor) & (e(Q).max(1) > 0.02))[0]
                if len(bad):
                    v = np.unique(I[bad])
                    top = {}
                    for x in v:
                        for k in range(4):
                            if Wv[x, k] > 0.05:
                                top[names[Jv[x, k]]] = top.get(names[Jv[x, k]], 0) + 1
                    out.append((a['name'], round(float(t), 2), len(bad), round(float(r.max()), 1),
                                sorted(top.items(), key=lambda z: -z[1])[:6]))
    return out


if __name__ == '__main__':
    for row in check(sys.argv[1], sys.argv[2:] or None):
        print(row)


def cull(id_, factor=4.0, steps=12, path=None, islands=0):
    """Drop every triangle that some move stretches past `factor` times its rest edge length (and over 2 cm): the
    needles and rods. Rewrites the built GLB in place; returns how many triangles went."""
    path = path or os.path.join(ROOT, 'assets', 'monsters', 'tripo', id_ + '.glb')
    doc, buf = load(path)
    skin = doc['skins'][0]
    J = skin['joints']
    IBM = acc(doc, buf, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    rest = world(doc, {})
    S0 = np.array([rest[j] @ IBM[k] for k, j in enumerate(J)])
    poses = []
    for a in doc['animations']:
        dur = max(acc(doc, buf, s['input'])[-1, 0] for s in a['samplers'])
        for t in np.linspace(0, dur, steps):
            Wd = world(doc, sample(doc, buf, a, t))
            poses.append(np.array([Wd[j] @ IBM[k] for k, j in enumerate(J)]))
    buf = bytearray(buf)
    gone = 0
    for n in doc['nodes']:
        if 'mesh' not in n or 'skin' not in n:
            continue
        for p in doc['meshes'][n['mesh']]['primitives']:
            at = p['attributes']
            P = acc(doc, buf, at['POSITION'])
            Jv = acc(doc, buf, at['JOINTS_0']).astype(int)
            Wv = acc(doc, buf, at['WEIGHTS_0'])
            I = acc(doc, buf, p['indices']).astype(np.int64).reshape(-1, 3)

            def edges(Sm):
                M = np.einsum('vk,vkij->vij', Wv, Sm[Jv])
                X = np.einsum('vij,vj->vi', M[:, :3, :3], P) + M[:, :3, 3]
                return np.stack([np.linalg.norm(X[I[:, a_]] - X[I[:, b_]], axis=1) for a_, b_ in ((0, 1), (1, 2), (2, 0))], 1)
            e0 = edges(S0) + 1e-6
            bad = np.zeros(len(I), bool)
            for Sm in poses:
                e = edges(Sm)
                bad |= ((e / e0).max(1) > factor) & (e.max(1) > 0.02)
            if islands:   # what the cull leaves floating: small pieces cut off from the body read as shards
                from scipy.sparse import coo_matrix
                from scipy.sparse.csgraph import connected_components
                _, wid = np.unique(np.round(P, 4), axis=0, return_inverse=True)
                wid = wid.ravel()
                keep = np.nonzero(~bad)[0]
                tri = wid[I[keep]]
                nV = wid.max() + 1
                e = np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]]])
                g = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(nV, nV))
                _, lab = connected_components(g, directed=False)
                tl = lab[tri[:, 0]]
                cnt = np.bincount(tl)
                small = cnt[tl] < islands * len(I)
                bad[keep[small]] = True
            if not bad.any():
                continue
            gone += int(bad.sum())
            raw = I[~bad].astype(np.uint32).ravel().tobytes()
            while len(buf) % 4:
                buf.append(0)
            doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw), 'target': 34963})
            buf.extend(raw)
            doc['accessors'].append({'bufferView': len(doc['bufferViews']) - 1, 'componentType': 5125,
                                     'count': int((~bad).sum() * 3), 'type': 'SCALAR'})
            p['indices'] = len(doc['accessors']) - 1
    if gone:
        while len(buf) % 4:
            buf.append(0)
        doc['buffers'][0]['byteLength'] = len(buf)
        js = json.dumps(doc, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
            f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    return gone
