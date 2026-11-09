"""Rig an unrigged Tripo humanoid (standing in a T-pose) with a donor's Mixamo skeleton.

    python tools/monsters/rig_humanoid.py TARGET.glb DONOR.glb OUT.glb donor|bones

The donor's joints are mapped into the target by their two bounding boxes, then each joint is centred in the target's
cross-section around it (legs and spine in level slices, arms in upright ones), so the bones run down the middle of
the limbs. Skin weights:
  donor  each vertex takes the weights of the nearest vertex of the donor's (mapped) mesh. For siblings off one template.
  bones  each vertex is weighted by its distance to the fitted bones, then smoothed over its neighbours.
The mesh is baked into world space and bound to the skeleton at rest.
"""
import json
import struct
import sys

import numpy as np
from scipy.spatial import cKDTree

sys.path.insert(0, __file__.rsplit('\\', 1)[0].rsplit('/', 1)[0])
from humanoids import decompose  # noqa: E402
sys.path.insert(1, __file__.replace('\\', '/').rsplit('/', 2)[0] + '/lisandra')
from transfer_clips import accessor, aim_child, load, qfrom_mat, qnorm  # noqa: E402


def trs(n):
    if 'matrix' in n:
        return np.array(n['matrix'], float).reshape(4, 4).T
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * np.array(n.get('scale', [1, 1, 1]))
    M[:3, 3] = n.get('translation', [0, 0, 0])
    return M


def world_mats(doc):
    W = {}

    def walk(i, M):
        W[i] = M @ trs(doc['nodes'][i])
        for c in doc['nodes'][i].get('children', []):
            walk(c, W[i])
    for r in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(r, np.eye(4))
    return W


def mesh_world(doc, buf):
    """Every primitive's vertices in world space (bind pose for skinned meshes)."""
    W = world_mats(doc)
    out = []
    ibm = None
    if doc.get('skins'):
        sk = doc['skins'][0]
        ibm = accessor(doc, buf, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
        J = [W[j] for j in sk['joints']]
    for ni, n in W.items():
        node = doc['nodes'][ni]
        if 'mesh' not in node:
            continue
        for pi, p in enumerate(doc['meshes'][node['mesh']]['primitives']):
            P = accessor(doc, buf, p['attributes']['POSITION'])
            if 'skin' in node and ibm is not None:
                js = accessor(doc, buf, p['attributes']['JOINTS_0']).astype(int)
                ws = accessor(doc, buf, p['attributes']['WEIGHTS_0'])
                M = np.zeros((len(P), 4, 4))
                for k in range(4):
                    Mk = np.stack([J[j] @ ibm[j] for j in range(len(J))])[js[:, k]]
                    M += ws[:, k, None, None] * Mk
                Pw = np.einsum('nij,nj->ni', M, np.c_[P, np.ones(len(P))])[:, :3]
                out.append((ni, pi, Pw, M[:, :3, :3], js, ws))
            else:
                Pw = (n @ np.c_[P, np.ones(len(P))].T).T[:, :3]
                out.append((ni, pi, Pw, np.broadcast_to(n[:3, :3], (len(P), 3, 3)), None, None))
    return out


def fit(donor_doc, donor_buf, P):
    """Donor joints in the target's world: names, parents, rest rotations (world), positions."""
    decompose(donor_doc)
    W = world_mats(donor_doc)
    sk = donor_doc['skins'][0]
    names = [donor_doc['nodes'][j]['name'] for j in sk['joints']]
    jn = {n: i for i, n in enumerate(sk['joints'])}
    parent = [-1] * len(names)
    for i, n in enumerate(donor_doc['nodes']):
        for c in n.get('children', []):
            if c in jn and i in jn:
                parent[jn[c]] = jn[i]
    Jw = np.array([W[j] for j in sk['joints']])
    Rw = Jw[:, :3, :3] / np.linalg.norm(Jw[:, :3, :3], axis=1, keepdims=True)
    dp = Jw[:, :3, 3]
    DP = np.concatenate([m[2] for m in mesh_world(donor_doc, donor_buf)])
    lo, hi = DP.min(0), DP.max(0)
    tlo, thi = P.min(0), P.max(0)
    scale = (thi - tlo) / (hi - lo)
    pos = (dp - lo) * scale + tlo
    H = thi[1] - tlo[1]
    tree = cKDTree(P)
    for _ in range(3):
        for i, nm in enumerate(names):
            b = nm.split(':')[-1]
            if any(f in b for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')) or b.endswith('_End'):
                continue
            arm = any(k in b for k in ('Shoulder', 'Arm', 'Hand'))
            p = pos[i]
            idx = tree.query_ball_point(p, 0.09 * H)
            if len(idx) < 8:
                continue
            Q = P[idx]
            axis = 0 if arm else 1
            Q = Q[np.abs(Q[:, axis] - p[axis]) < 0.012 * H]
            if len(Q) < 6:
                continue
            c = (Q.min(0) + Q.max(0)) / 2      # middle of the cross-section's extent
            keep = [a for a in range(3) if a != axis]
            if b in ('Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'):
                keep = [2]                      # the spine stays on the centre line; only its depth is fitted
            for a in keep:
                pos[i, a] = c[a]
    # Children of a moved joint whose fitting was skipped (fingers, ends) ride along with their parent.
    return names, parent, Rw, pos, dp, scale, lo, tlo, DP


def seg_dist(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def bone_weights(P, names, pos):
    at = {n: i for i, n in enumerate(names)}
    segs = []
    for i, n in enumerate(names):
        c = aim_child(n)
        if c in at:
            segs.append((i, pos[i], pos[at[c]]))
        elif not n.endswith('_End') and 'Top' not in n:
            segs.append((i, pos[i], pos[i]))
    D = np.stack([seg_dist(P, a, b) for _, a, b in segs], 1)
    order = np.argsort(D, 1)[:, :4]
    d = np.take_along_axis(D, order, 1)
    w = (d[:, :1] + 1e-4) ** 6 / (d + 1e-4) ** 6
    w[d > d[:, :1] * 1.6 + 0.01] = 0
    w /= w.sum(1, keepdims=True)
    J = np.array([s[0] for s in segs])[order]
    # Smooth across neighbours so seams between bones blend.
    full = np.zeros((len(P), len(names)))
    np.put_along_axis(full, J, w, 1)
    tree = cKDTree(P)
    _, nb = tree.query(P, 10)
    full = full[nb].mean(1)
    J = np.argsort(-full, 1)[:, :4]
    w = np.take_along_axis(full, J, 1)
    w /= w.sum(1, keepdims=True)
    return J, w


def main(target, donor, out, method):
    doc, buf = load(target)
    ddoc, dbuf = load(donor)
    prims = mesh_world(doc, buf)
    P = np.concatenate([p[2] for p in prims])
    names, parent, Rw, pos, dp, scale, lo, tlo, DP = fit(ddoc, dbuf, P)
    # Ends and fingers keep their offsets from their fitted parent.
    for i in range(len(names)):
        b = names[i].split(':')[-1]
        if any(f in b for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')) or b.endswith('_End'):
            p = parent[i]
            chain = [i]
            while p >= 0 and any(f in names[p] for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky')):
                chain.append(p)
                p = parent[p]
            if p >= 0:
                pos[i] = pos[p] + (dp[i] - dp[p]) * scale
    if method == 'donor':
        dprims = mesh_world(ddoc, dbuf)
        DPm = (np.concatenate([d[2] for d in dprims]) - lo) * scale + tlo
        DJ = np.concatenate([d[4] for d in dprims])
        DW = np.concatenate([d[5] for d in dprims])
        _, nn = cKDTree(DPm).query(P)
        J, Wt = DJ[nn], DW[nn]
    else:
        J, Wt = bone_weights(P, names, pos)
    # New nodes: an armature at the scene root, the joints under it.
    base = len(doc['nodes'])
    arm = base + len(names)
    for i, n in enumerate(names):
        R = Rw[i]
        if parent[i] < 0:
            Rl, tl = R, pos[i]
        else:
            Rp = Rw[parent[i]]
            Rl, tl = Rp.T @ R, Rp.T @ (pos[i] - pos[parent[i]])
        doc['nodes'].append({'name': n, 'rotation': qnorm(qfrom_mat(Rl)).tolist(), 'translation': tl.tolist()})
    for i in range(len(names)):
        if parent[i] >= 0:
            doc['nodes'][base + parent[i]].setdefault('children', []).append(base + i)
    roots = [base + i for i in range(len(names)) if parent[i] < 0]
    doc['nodes'].append({'name': 'Armature', 'children': roots})
    doc['scenes'][doc.get('scene', 0)]['nodes'].append(arm)
    ibm = []
    for i in range(len(names)):
        M = np.eye(4)
        M[:3, :3], M[:3, 3] = Rw[i], pos[i]
        ibm.append(np.linalg.inv(M).T.ravel())
    buf = bytearray(buf)

    def push(arr, kind, ctype=5126):
        while len(buf) % 4:
            buf.append(0)
        raw = np.ascontiguousarray(arr).tobytes()
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf.extend(raw)
        a = {'bufferView': len(doc['bufferViews']) - 1, 'componentType': ctype, 'count': len(arr), 'type': kind}
        if kind == 'VEC3' and ctype == 5126:
            a['min'], a['max'] = np.min(arr, 0).tolist(), np.max(arr, 0).tolist()
        doc['accessors'].append(a)
        return len(doc['accessors']) - 1
    doc['skins'] = [{'joints': list(range(base, base + len(names))), 'inverseBindMatrices': push(np.array(ibm, np.float32), 'MAT4'),
                     'skeleton': roots[0]}]
    k = 0
    for ni, pi, Pw, Rm, _, _ in prims:
        n = len(Pw)
        p = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        Nm = accessor(doc, buf, p['attributes']['NORMAL'])
        Nw = np.einsum('nij,nj->ni', Rm, Nm)
        Nw /= np.linalg.norm(Nw, axis=1, keepdims=True) + 1e-12
        p['attributes']['POSITION'] = push(Pw.astype(np.float32), 'VEC3')
        p['attributes']['NORMAL'] = push(Nw.astype(np.float32), 'VEC3')
        p['attributes'].pop('TANGENT', None)
        p['attributes']['JOINTS_0'] = push(J[k:k + n].astype(np.uint16), 'VEC4', 5123)
        p['attributes']['WEIGHTS_0'] = push(Wt[k:k + n].astype(np.float32), 'VEC4')
        k += n
        node = doc['nodes'][ni]
        for key in ('matrix', 'rotation', 'translation', 'scale'):
            node.pop(key, None)
        node['skin'] = 0
    # Mesh nodes must sit at the root, untransformed.
    for i, node in enumerate(doc['nodes']):
        if 'children' in node:
            node['children'] = [c for c in node['children'] if 'mesh' not in doc['nodes'][c]]
    doc['scenes'][doc.get('scene', 0)]['nodes'] = [arm] + [ni for ni in {p[0] for p in prims}]
    doc['buffers'] = [{'byteLength': len(buf)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(buf) % 4:
        buf.append(0)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    print(f'rigged {out}: {len(names)} joints, {len(P)} vertices ({method})')


if __name__ == '__main__':
    main(*sys.argv[1:5])
