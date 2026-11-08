"""Move every clip from one Mixamo-rigged Lisandra onto another: the new model gets the old one's moves.

    python tools/lisandra/transfer_clips.py OLD.glb NEW.glb OUT.glb

Both rigs carry the same bone names, but each was rigged on its own, so a bone's rest turn and roll differ between them
(the new right arm's roll is half a turn off the old one's). Copying the clips' local turns straight across would twist
her limbs, so each bone takes the world-space turn its old partner makes away from the old rest pose. First, though, each
new limb bone is laid along its old partner's rest bone, so a clip authored on the old body puts the new one's arms, legs
and fingers where it put the old one's. Hands are laid by two lines, the fingers and the knuckles, so the palm faces where it did.

The hips' travel is scaled by the ratio of the two hip heights. Other bones keep the new rig's own lengths: only the
hips' translation is written. The new model's own clips are kept; an old clip of the same name comes in renamed
(`walk` becomes `walk_gown`). Needs NumPy.
"""
import json
import struct
import sys

import numpy as np

RENAME = {'walk': 'walk_gown'}
# Her back, neck and head keep their own lines: the two bodies stand differently (the old one's spine leans 17 degrees
# off the new one's at the hips), and laying the new spine along the old would bend her into the old one's posture.
OWN = {'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head'}


def load(path):
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    off = 20 + n
    m = struct.unpack_from('<I', data, off)[0]
    return doc, bytearray(data[off + 8:off + 8 + m])


def accessor(doc, buf, i):
    a = doc['accessors'][i]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dtype = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a['componentType']]
    v = doc['bufferViews'][a['bufferView']]
    size = np.dtype(dtype).itemsize
    stride = v.get('byteStride', width * size)
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    arr = np.ndarray((a['count'], width), dtype, buf, start, (stride, size)).astype(np.float64)
    if a.get('normalized'):
        arr /= np.iinfo(dtype).max
    return arr


# Quaternions are x, y, z, w, as glTF has them; every function works on arrays of them.
def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0)
    bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], -1)


def qinv(q):
    return q * np.array([-1, -1, -1, 1.0])


def qrot(q, v):
    p = np.concatenate([v, np.zeros(v.shape[:-1] + (1,))], -1)
    return qmul(qmul(q, p), qinv(q))[..., :3]


def qnorm(q):
    return q / np.linalg.norm(q, axis=-1, keepdims=True)


def qfrom_mat(m):
    """Rotation matrix (columns are the turned axes) to a quaternion."""
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1) * 2
        return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, s / 4])
    i = int(np.argmax(np.diag(m)))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = np.sqrt(1 + m[i, i] - m[j, j] - m[k, k]) * 2
    q = np.zeros(4)
    q[i] = s / 4
    q[j] = (m[j, i] + m[i, j]) / s
    q[k] = (m[k, i] + m[i, k]) / s
    q[3] = (m[k, j] - m[j, k]) / s
    return q


def frame(a, b):
    """An orthonormal frame from a main line and a second line across it, as matrix columns."""
    x = a / np.linalg.norm(a)
    y = b - x * (x @ b)
    y /= np.linalg.norm(y)
    return np.stack([x, y, np.cross(x, y)], 1)


def shortest(a, b):
    """The smallest turn taking direction a onto direction b."""
    a, b = a / np.linalg.norm(a), b / np.linalg.norm(b)
    c = np.cross(a, b)
    q = np.array([c[0], c[1], c[2], 1 + a @ b])
    if q[3] < 1e-6:
        side = np.cross(a, [1, 0, 0]) if abs(a[0]) < 0.9 else np.cross(a, [0, 1, 0])
        return np.array([*(side / np.linalg.norm(side)), 0])
    return qnorm(q)


class Rig:
    def __init__(self, doc, buf):
        self.doc, self.buf = doc, buf
        skin = doc['skins'][0]
        self.nodes = skin['joints']
        self.names = [doc['nodes'][n]['name'] for n in self.nodes]
        self.at = {n: i for i, n in enumerate(self.names)}
        parent_node = {}
        for i, n in enumerate(doc['nodes']):
            for c in n.get('children', []):
                parent_node[c] = i
        jn = {n: i for i, n in enumerate(self.nodes)}
        self.parent = [jn.get(parent_node.get(n), -1) for n in self.nodes]
        # The joints' parents are listed before them? Not promised: order them.
        self.order, seen = [], set()
        while len(self.order) < len(self.nodes):
            for j in range(len(self.nodes)):
                if j not in seen and (self.parent[j] < 0 or self.parent[j] in seen):
                    self.order.append(j)
                    seen.add(j)
        # Above the root joint: the armature's own turn, if any.
        top = parent_node.get(self.nodes[self.order[0]])
        q = np.array([0, 0, 0, 1.0])
        while top is not None:
            q = qmul(np.array(doc['nodes'][top].get('rotation', [0, 0, 0, 1])), q)
            top = parent_node.get(top)
        self.base = q
        self.restR = np.array([doc['nodes'][n].get('rotation', [0, 0, 0, 1]) for n in self.nodes], float)
        self.restT = np.array([doc['nodes'][n].get('translation', [0, 0, 0]) for n in self.nodes], float)
        self.worldR, self.worldP = self.fk(self.restR[None], self.restT[None])
        self.worldR, self.worldP = self.worldR[0], self.worldP[0]

    def fk(self, local, trans):
        """World turns and places of every joint, frame by frame (T, J, 4) and (T, J, 3)."""
        T = local.shape[0]
        wr = np.zeros((T, len(self.nodes), 4))
        wp = np.zeros((T, len(self.nodes), 3))
        for j in self.order:
            p = self.parent[j]
            if p < 0:
                wr[:, j] = qmul(np.broadcast_to(self.base, (T, 4)), local[:, j])
                wp[:, j] = qrot(np.broadcast_to(self.base, (T, 4)), trans[:, j])
            else:
                wr[:, j] = qmul(wr[:, p], local[:, j])
                wp[:, j] = wp[:, p] + qrot(wr[:, p], trans[:, j])
        return wr, wp


def aim_child(name):
    """The bone each bone points at, and for hands the line across the knuckles."""
    b = name.split(':')[-1]
    side = 'Left' if b.startswith('Left') else 'Right' if b.startswith('Right') else ''
    tail = b[len(side):]
    chain = {'Hips': 'Spine', 'Spine': 'Spine1', 'Spine1': 'Spine2', 'Spine2': 'Neck', 'Neck': 'Head', 'Head': 'HeadTop_End',
             'Shoulder': 'Arm', 'Arm': 'ForeArm', 'ForeArm': 'Hand', 'Hand': 'HandMiddle1',
             'UpLeg': 'Leg', 'Leg': 'Foot', 'Foot': 'ToeBase', 'ToeBase': 'Toe_End'}
    pre = name[:len(name) - len(b)]
    if tail in chain:
        return pre + side + chain[tail]
    for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
        if tail.startswith('Hand' + f) and tail[-1] in '123':
            return pre + side + tail[:-1] + str(int(tail[-1]) + 1)
    return None


def alignments(old, new):
    """For each new bone, the world turn laying it along its old partner at rest."""
    A = np.tile([0, 0, 0, 1.0], (len(new.names), 1))
    report = []
    for j, name in enumerate(new.names):
        c = aim_child(name)
        if c is None or c not in new.at or name not in old.at or c not in old.at or name.split(':')[-1] in OWN:
            continue
        o, oc, nc = old.at[name], old.at[c], new.at[c]
        dO = old.worldP[oc] - old.worldP[o]
        dN = new.worldP[nc] - new.worldP[j]
        if np.linalg.norm(dO) < 1e-6 or np.linalg.norm(dN) < 1e-6:
            continue
        if name.endswith('Hand') and all(f'{name}{f}1' in new.at and f'{name}{f}1' in old.at for f in ('Index', 'Pinky')):
            sO = old.worldP[old.at[name + 'Index1']] - old.worldP[old.at[name + 'Pinky1']]
            sN = new.worldP[new.at[name + 'Index1']] - new.worldP[new.at[name + 'Pinky1']]
            A[j] = qnorm(qfrom_mat(frame(dO, sO) @ frame(dN, sN).T))
        else:
            A[j] = shortest(dN, dO)
        report.append((np.degrees(2 * np.arccos(min(1, abs(A[j][3])))), name))
    return A, sorted(report, reverse=True)


def sample(times, values, grid, step):
    """A channel's keys read at the grid's times."""
    if len(times) == 1:
        return np.repeat(values[:1], len(grid), 0)
    k = np.clip(np.searchsorted(times, grid, 'right') - 1, 0, len(times) - 1)
    if step:
        return values[k]
    k = np.clip(k, 0, len(times) - 2)
    a = np.clip((grid - times[k]) / np.maximum(times[k + 1] - times[k], 1e-9), 0, 1)[:, None]
    lo, hi = values[k], values[k + 1]
    if values.shape[1] == 4:
        hi = np.where((lo * hi).sum(1, keepdims=True) < 0, -hi, hi)
        return qnorm(lo * (1 - a) + hi * a)
    return lo * (1 - a) + hi * a


def transfer(old, new, anim, A, scale):
    doc, buf = old.doc, old.buf
    J = len(new.names)
    chans = []
    for c in anim['channels']:
        name = doc['nodes'][c['target']['node']].get('name')
        if name in old.at and c['target']['path'] in ('rotation', 'translation'):
            s = anim['samplers'][c['sampler']]
            chans.append((old.at[name], c['target']['path'], accessor(doc, buf, s['input'])[:, 0],
                          accessor(doc, buf, s['output']), s.get('interpolation') == 'STEP'))
    rot_times = [t for _, p, t, _, _ in chans if p == 'rotation']
    grid = max(rot_times, key=len) if rot_times else np.array([0.0])
    T = len(grid)
    local = np.broadcast_to(old.restR, (T,) + old.restR.shape).copy()
    trans = np.broadcast_to(old.restT, (T,) + old.restT.shape).copy()
    for j, path, times, values, step in chans:
        (local if path == 'rotation' else trans)[:, j] = sample(times, values, grid, step)
    local = qnorm(local)
    oldR, _ = old.fk(local, trans)
    # Each new bone: the old bone's turn away from its rest, applied to the new bone laid along the old one.
    newR = np.zeros((T, J, 4))
    for j, name in enumerate(new.names):
        if name not in old.at:
            newR[:, j] = np.broadcast_to(new.worldR[j], (T, 4))
            continue
        o = old.at[name]
        delta = qmul(oldR[:, o], np.broadcast_to(qinv(old.worldR[o]), (T, 4)))
        newR[:, j] = qmul(delta, np.broadcast_to(qmul(A[j], new.worldR[j]), (T, 4)))
    out = np.zeros((T, J, 4))
    for j in range(J):
        p = new.parent[j]
        up = np.broadcast_to(new.base, (T, 4)) if p < 0 else newR[:, p]
        out[:, j] = qnorm(qmul(qinv(up), newR[:, j]))
    # Keep each key on the same side as the last, so nothing blends through a flip.
    for t in range(1, T):
        flip = (out[t] * out[t - 1]).sum(1) < 0
        out[t, flip] *= -1
    hips = None
    hn = next((n for n in new.names if n.endswith('Hips')), None)
    if hn and hn in old.at:
        o = old.at[hn]
        hips = new.restT[new.at[hn]] + (trans[:, o] - old.restT[o]) * scale
    return grid - grid[0], out, hips


def main(old_path, new_path, out_path):
    old = Rig(*load(old_path))
    new = Rig(*load(new_path))
    A, report = alignments(old, new)
    print('largest rest differences laid straight (degrees):')
    for ang, name in report[:8]:
        print(f'  {ang:6.1f}  {name}')
    hn = next(n for n in new.names if n.endswith('Hips'))
    scale = new.worldP[new.at[hn]][1] / old.worldP[old.at[hn]][1]
    print(f'hip height ratio {scale:.3f}')

    doc, buf = new.doc, new.buf
    have = {a['name'] for a in doc.get('animations', [])}
    doc.setdefault('animations', [])

    def push(arr, kind, minmax=False):
        nonlocal buf
        while len(buf) % 4:
            buf.append(0)
        raw = np.ascontiguousarray(arr, np.float32).tobytes()
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf += raw
        acc = {'bufferView': len(doc['bufferViews']) - 1, 'componentType': 5126, 'count': int(arr.shape[0]), 'type': kind}
        if minmax:
            acc['min'] = [float(v) for v in np.min(arr, 0).ravel()]
            acc['max'] = [float(v) for v in np.max(arr, 0).ravel()]
        doc['accessors'].append(acc)
        return len(doc['accessors']) - 1

    hip_node = new.nodes[new.at[hn]]
    count = 0
    for anim in old.doc.get('animations', []):
        name = RENAME.get(anim['name'], anim['name']) if anim['name'] in have else anim['name']
        if name in have:
            continue
        times, rots, hips = transfer(old, new, anim, A, scale)
        if len(times) < 2:
            times = np.array([0.0, 1 / 30])
            rots = np.repeat(rots[:1], 2, 0)
            hips = None if hips is None else np.repeat(hips[:1], 2, 0)
        t_acc = push(times[:, None], 'SCALAR', True)
        t2_acc = None
        samplers, channels = [], []
        for j, node in enumerate(new.nodes):
            track = rots[:, j]
            if np.abs(track - track[:1]).max() < 1e-5:
                # Still the whole clip: two keys are enough.
                if np.abs(track[0] - new.restR[j]).max() < 1e-5 or np.abs(track[0] + new.restR[j]).max() < 1e-5:
                    continue
                if t2_acc is None:
                    t2_acc = push(np.array([[0.0], [times[-1]]]), 'SCALAR', True)
                samplers.append({'input': t2_acc, 'output': push(track[[0, -1]], 'VEC4'), 'interpolation': 'LINEAR'})
            else:
                samplers.append({'input': t_acc, 'output': push(track, 'VEC4'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': 'rotation'}})
        if hips is not None:
            samplers.append({'input': t_acc, 'output': push(hips, 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': hip_node, 'path': 'translation'}})
        doc['animations'].append({'name': name, 'samplers': samplers, 'channels': channels})
        have.add(name)
        count += 1
    doc['buffers'][0]['byteLength'] = len(buf)
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(buf) % 4:
        buf.append(0)
    with open(out_path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    print(f'{count} clips moved across; {len(doc["animations"])} in {out_path} ({(28 + len(js) + len(buf)) / 1e6:.1f} MB)')


if __name__ == '__main__':
    main(*sys.argv[1:4])
