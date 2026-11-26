"""Writes the wizard with his back strap made level (tools/player/strap_level.py, run in Blender) into his file.

    python tools/player/strap_glb.py <wizard.glb before> <mesh.npz from Blender> <wizard.glb out>      (Python 3.12, NumPy)

The .npz is what Blender's `strap_export` wrote of the mesh as strap_level left it: every point's place (Blender space),
its index in the file before (`oi`; a point the cuts made has none, its index is past the file's count), its normal (the
file's, mixed for a new point; the straight band's for the band's two ends), each triangle's points and its corners'
places on the map, and the skin of each new point (Blender's vertex groups, as bmesh mixed them along the cut edge).

Everything else in the file is kept byte for byte: the skeleton and its clips, the robe's cloth bones, the pictures. A
point that wasn't cut and whose place on the map didn't change keeps its index, its skin and its UV as they were.
"""
import json
import struct
import sys

import numpy as np

COMP = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    m = struct.unpack_from('<I', data, 20 + n)[0]
    return doc, bytearray(data[20 + n + 8:20 + n + 8 + m])


def accessor(doc, buf, i):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    k = NCOMP[a['type']]
    arr = np.frombuffer(bytes(buf), COMP[a['componentType']], a['count'] * k, v.get('byteOffset', 0) + a.get('byteOffset', 0))
    return arr.reshape(a['count'], k) if k > 1 else arr


def append(doc, buf, arr, comp, typ, target=None):
    """A new buffer view and accessor for arr at the end of the binary chunk (4-byte aligned)."""
    buf.extend(b'\0' * (-len(buf) % 4))
    off = len(buf)
    raw = np.ascontiguousarray(arr).astype(COMP[comp]).tobytes()
    buf.extend(raw)
    view = {'buffer': 0, 'byteOffset': off, 'byteLength': len(raw)}
    if target:
        view['target'] = target
    doc['bufferViews'].append(view)
    acc = {'bufferView': len(doc['bufferViews']) - 1, 'componentType': comp, 'count': int(len(arr)), 'type': typ}
    if typ == 'VEC3' and comp == 5126:
        acc['min'] = [float(x) for x in arr.min(0)]
        acc['max'] = [float(x) for x in arr.max(0)]
    doc['accessors'].append(acc)
    return len(doc['accessors']) - 1


def main():
    src, npz, out = sys.argv[1:4]
    doc, buf = load(src)
    prim = doc['meshes'][0]['primitives'][0]
    at = prim['attributes']
    P0, N0, UV0 = accessor(doc, buf, at['POSITION']), accessor(doc, buf, at['NORMAL']), accessor(doc, buf, at['TEXCOORD_0'])
    J0, W0 = accessor(doc, buf, at['JOINTS_0']), accessor(doc, buf, at['WEIGHTS_0'])
    n0 = len(P0)
    tri0 = doc['accessors'][prim['indices']]['count'] // 3
    z = np.load(npz)
    co, nrm = z['co'], z['nrm']
    pos = np.c_[co[:, 0], co[:, 2], -co[:, 1]]                  # Blender (x, -z, y) back to glTF (x, y, z)
    nrm = nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    tri_v, tri_uv = z['tri_v'], z['tri_uv'].copy()
    tri_uv[..., 1] = 1 - tri_uv[..., 1]                          # Blender's v up to glTF's v down
    names = [doc['nodes'][j]['name'] for j in doc['skins'][0]['joints']]
    jidx = {nm: i for i, nm in enumerate(names)}
    gnames = [str(s) for s in z['gnames']]

    # One file point per (point, place on the map): a point's own index while its UV is unchanged.
    out_pos, out_nrm, out_uv, out_j, out_w = [], [], [], [], []
    key = {}

    def skin(vi):
        if vi < n0:
            return J0[vi], W0[vi]
        gw, gj = z['gw'][vi], z['gj'][vi]
        acc = {}
        for g, w in zip(gj, gw):
            if w > 0:
                acc[jidx[gnames[g]]] = acc.get(jidx[gnames[g]], 0) + float(w)
        top = sorted(acc.items(), key=lambda kv: -kv[1])[:4]
        tot = sum(w for _, w in top) or 1
        j = np.zeros(4, np.uint8)
        w = np.zeros(4, np.float32)
        for k, (jj, ww) in enumerate(top):
            j[k], w[k] = jj, ww / tot
        return j, w

    # The file's own points first, at their own indices.
    for vi in range(n0):
        out_pos.append(pos[vi])
        out_nrm.append(nrm[vi])
        out_uv.append(UV0[vi])
        out_j.append(J0[vi])
        out_w.append(W0[vi])
    idx = np.zeros(tri_v.shape, np.int64)
    moved_uv = 0
    for t in range(len(tri_v)):
        for c in range(3):
            vi, uv = int(tri_v[t, c]), tri_uv[t, c]
            if vi < n0 and np.abs(uv - UV0[vi]).max() < 2e-6:
                idx[t, c] = vi
                continue
            k = (vi, round(float(uv[0]), 6), round(float(uv[1]), 6))
            if k not in key:
                key[k] = len(out_pos)
                j, w = skin(vi)
                out_pos.append(pos[vi])
                out_nrm.append(nrm[vi])
                out_uv.append(uv)
                out_j.append(j)
                out_w.append(w)
                moved_uv += vi < n0
            idx[t, c] = key[k]
    P = np.array(out_pos, np.float32)
    # (A point that wasn't moved keeps its place to the bit.)
    same = np.all(np.abs(P[:n0] - P0) < 2e-7, axis=1)
    P[:n0][same] = P0[same]
    N = np.array(out_nrm, np.float32)
    N[:n0][same] = N0[same]
    at['POSITION'] = append(doc, buf, P, 5126, 'VEC3', 34962)
    at['NORMAL'] = append(doc, buf, N, 5126, 'VEC3', 34962)
    at['TEXCOORD_0'] = append(doc, buf, np.array(out_uv, np.float32), 5126, 'VEC2', 34962)
    at['JOINTS_0'] = append(doc, buf, np.array(out_j, np.uint8), 5121, 'VEC4', 34962)
    at['WEIGHTS_0'] = append(doc, buf, np.array(out_w, np.float32), 5126, 'VEC4', 34962)
    prim['indices'] = append(doc, buf, idx.reshape(-1).astype(np.uint32), 5125, 'SCALAR', 34963)
    # Drop what nothing points at any more (the old attributes' views), so the file doesn't carry them twice.
    used_acc = set(at.values()) | {prim['indices']}
    for s in doc.get('skins', []):
        used_acc.add(s['inverseBindMatrices'])
    for a in doc.get('animations', []):
        for smp in a['samplers']:
            used_acc |= {smp['input'], smp['output']}
    keep_views = {doc['accessors'][i]['bufferView'] for i in used_acc} | {im['bufferView'] for im in doc.get('images', []) if 'bufferView' in im}
    newbuf = bytearray()
    remap = {}
    for vi, v in enumerate(doc['bufferViews']):
        if vi not in keep_views:
            continue
        newbuf.extend(b'\0' * (-len(newbuf) % 4))
        o = len(newbuf)
        newbuf.extend(buf[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
        nv = dict(v)
        nv['byteOffset'] = o
        remap[vi] = nv
    order = sorted(remap)
    new_index = {old: k for k, old in enumerate(order)}
    doc['bufferViews'] = [remap[o] for o in order]
    acc_keep = sorted(used_acc)
    acc_index = {old: k for k, old in enumerate(acc_keep)}
    accs = []
    for old in acc_keep:
        a = dict(doc['accessors'][old])
        a['bufferView'] = new_index[a['bufferView']]
        accs.append(a)
    doc['accessors'] = accs
    for k in list(at):
        at[k] = acc_index[at[k]]
    prim['indices'] = acc_index[prim['indices']]
    for s in doc.get('skins', []):
        s['inverseBindMatrices'] = acc_index[s['inverseBindMatrices']]
    for a in doc.get('animations', []):
        for smp in a['samplers']:
            smp['input'], smp['output'] = acc_index[smp['input']], acc_index[smp['output']]
    for im in doc.get('images', []):
        if 'bufferView' in im:
            im['bufferView'] = new_index[im['bufferView']]
    newbuf.extend(b'\0' * (-len(newbuf) % 4))
    doc['buffers'][0]['byteLength'] = len(newbuf)
    meta = json.dumps(doc, separators=(',', ':')).encode()
    meta += b' ' * (-len(meta) % 4)
    with open(out, 'wb') as fh:
        fh.write(struct.pack('<5I', 0x46546C67, 2, 28 + len(meta) + len(newbuf), len(meta), 0x4E4F534A))
        fh.write(meta)
        fh.write(struct.pack('<2I', len(newbuf), 0x004E4942))
        fh.write(newbuf)
    moved = int((~same).sum())
    print(f'{out}: {len(P)} points ({len(P) - n0} more: the cuts\' points and {moved_uv} old points at new places on the '
          f'map), {moved} points moved, {len(idx)} triangles (was {tri0})')


if __name__ == '__main__':
    main()
