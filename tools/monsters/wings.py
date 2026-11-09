"""Give a winged Tripo humanoid (harpies, dragonlings) wing bones, and make wing beats for its clips.

    python tools/monsters/wings.py SRC.glb OUT.glb

Tripo rigs these as plain humans, so the wings ride the spine like a board. Three joints a side go in under Spine2
(root on the upper back, mid and tip along the top edge of the wing). A vertex belongs to a wing as far as it is away
from both the arm bones and the body bones; along the span it passes from root to mid to tip. The rest of its weight
stays where Tripo put it.

flaps(name, times) gives each wing joint's turn per frame for a clip, by what kind of clip it is (humanoids.py calls it).
"""
import json
import struct
import sys
import os

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_humanoid import mesh_world, world_mats, seg_dist, load, accessor  # noqa: E402
from humanoids import decompose  # noqa: E402
sys.path.insert(1, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lisandra'))
from transfer_clips import qfrom_mat, qnorm, qinv, qmul, aim_child  # noqa: E402

WING = ['WingL1', 'WingL2', 'WingL3', 'WingR1', 'WingR2', 'WingR3']


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def main(src, out):
    doc, buf = load(src)
    decompose(doc)
    buf = bytearray(buf)
    prims = mesh_world(doc, buf)
    W = world_mats(doc)
    sk = doc['skins'][0]
    jn = [doc['nodes'][j]['name'] for j in sk['joints']]
    short = [n.split(':')[-1] for n in jn]
    jp = np.array([W[j][:3, 3] for j in sk['joints']])
    at = {n: i for i, n in enumerate(jn)}
    P = np.concatenate([p[2] for p in prims])
    H = P[:, 1].max()
    arm, body = [], []
    for i, n in enumerate(jn):
        c = aim_child(n)
        if c not in at:
            continue
        seg = (jp[i], jp[at[c]])
        if any(k in short[i] for k in ('Shoulder', 'Arm', 'Hand')):
            arm.append(seg)
        else:
            body.append(seg)
    d_arm = np.min([seg_dist(P, a, b) for a, b in arm], 0)
    d_body = np.min([seg_dist(P, a, b) for a, b in body], 0)
    # Tails hang on the centre line; wings start out to the sides.
    m = smooth(0.035 * H, 0.07 * H, d_arm) * smooth(0.06 * H, 0.1 * H, d_body) * smooth(0.03 * H, 0.07 * H, np.abs(P[:, 0]))
    sp2 = jp[short.index('Spine2')]
    neck = jp[short.index('Neck')]
    root_y = sp2[1] + 0.6 * (neck[1] - sp2[1])
    joints = []
    for side, sign in (('L', 1), ('R', -1)):
        on = (m > 0.5) & (P[:, 0] * sign > 0)
        x0 = 0.05 * H
        span = (P[on, 0] * sign).max() - x0
        back = P[on & (np.abs(P[:, 0]) < 0.15 * H), 2]
        rz = np.percentile(back, 60) if len(back) else sp2[2] - 0.05 * H
        pts = [np.array([sign * x0, root_y, rz])]
        for f in (0.38, 0.72):
            band = on & (np.abs(P[:, 0] * sign - x0 - f * span) < 0.04 * span)
            top = P[band][np.argsort(-P[band, 1])[:max(3, band.sum() // 5)]]
            pts.append(np.array([sign * (x0 + f * span), top[:, 1].mean(), top[:, 2].mean()]))
        joints.append((side, sign, pts, x0, span))
    # Weights: wing share by membership, along the span by distance out.
    js, ws = [], []
    for ni, pi, Pw, _, J, Wt in prims:
        js.append(J.astype(np.int64))
        ws.append(Wt.copy())
    J = np.concatenate(js)
    Wt = np.concatenate(ws)
    base_j = len(jn)
    newW = np.zeros((len(P), 3))
    for k, (side, sign, pts, x0, span) in enumerate(joints):
        s = np.clip((P[:, 0] * sign - x0) / span, 0, 1.2)
        w1 = 1 - smooth(0.15, 0.45, s)
        w3 = smooth(0.55, 0.85, s)
        w2 = 1 - w1 - w3
        mine = (P[:, 0] * sign > 0) * m
        for jj, w in enumerate((w1, w2, w3)):
            col = w * mine
            # Fold the new weight into the four slots: replace the weakest slots.
            for v in np.nonzero(col > 0.01)[0]:
                cur = Wt[v] * (1 - mine[v])
                slots = list(zip(J[v], cur))
                slots.append((base_j + k * 3 + jj, col[v]))
                slots = sorted(slots, key=lambda x: -x[1])[:4]
                J[v] = [a for a, _ in slots]
                Wt[v] = [b for _, b in slots]
    Wt /= Wt.sum(1, keepdims=True)
    # Joints into the node tree under Spine2, world rest turned like nothing (identity).
    sp2n = sk['joints'][short.index('Spine2')]
    Rsp = W[sp2n][:3, :3]
    Rsp = Rsp / np.linalg.norm(Rsp, axis=0)
    new_nodes = []
    ibm = accessor(doc, buf, sk['inverseBindMatrices']).reshape(-1, 16)
    # Tripo binds the mesh turned against the skeleton's rest (a quarter turn about Y): the body's joints carry that
    # turn in their bind matrices, so the wing joints must too, or the wings skin a quarter turn off the body.
    C = W[sp2n] @ ibm.reshape(-1, 4, 4).transpose(0, 2, 1)[short.index('Spine2')]
    extra = []
    for side, sign, pts, _, _ in joints:
        parent_node, parent_R, parent_p = sp2n, Rsp, W[sp2n][:3, 3]
        for k, p in enumerate(pts):
            if k:
                n = {'name': f'Wing{side}{k + 1}', 'rotation': [0, 0, 0, 1], 'translation': (p - parent_p).tolist()}
            else:
                n = {'name': f'Wing{side}{k + 1}', 'rotation': qnorm(qfrom_mat(parent_R.T)).tolist(),
                     'translation': (np.linalg.inv(W[parent_node][:3, :3]) @ (p - parent_p)).tolist()}
            doc['nodes'].append(n)
            idx = len(doc['nodes']) - 1
            doc['nodes'][parent_node].setdefault('children', []).append(idx)
            new_nodes.append(idx)
            M = np.eye(4)
            M[:3, 3] = p
            extra.append((np.linalg.inv(M) @ C).T.ravel())
            parent_node, parent_R, parent_p = idx, np.eye(3), p
    sk['joints'] += new_nodes

    def push(arr, kind, ctype=5126):
        while len(buf) % 4:
            buf.append(0)
        raw = np.ascontiguousarray(arr).tobytes()
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf.extend(raw)
        doc['accessors'].append({'bufferView': len(doc['bufferViews']) - 1, 'componentType': ctype, 'count': len(arr), 'type': kind})
        return len(doc['accessors']) - 1
    sk['inverseBindMatrices'] = push(np.concatenate([ibm, np.array(extra)]).astype(np.float32), 'MAT4')
    k = 0
    for ni, pi, Pw, _, _, _ in prims:
        n = len(Pw)
        p = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        p['attributes']['JOINTS_0'] = push(J[k:k + n].astype(np.uint16), 'VEC4', 5123)
        p['attributes']['WEIGHTS_0'] = push(Wt[k:k + n].astype(np.float32), 'VEC4')
        k += n
    doc['buffers'] = [{'byteLength': len(buf)}]
    js_ = json.dumps(doc, separators=(',', ':')).encode()
    js_ += b' ' * (-len(js_) % 4)
    while len(buf) % 4:
        buf.append(0)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js_) + len(buf)))
        f.write(struct.pack('<II', len(js_), 0x4E4F534A) + js_)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    print(f'{out}: {(m > 0.5).sum()} wing vertices of {len(P)}; spans {[round(j[4], 3) for j in joints]}')


def _q(axis, deg):
    a = np.radians(deg) / 2
    axis = np.asarray(axis, float)
    return np.concatenate([axis * np.sin(a)[..., None], np.cos(a)[..., None]], -1)


def flaps(name, times, hover=True):
    """Turns for WingL1..3, WingR1..3, (T, 6, 4), in the body's rest frame (front +Z, up +Y, left wing on +X)."""
    t = np.asarray(times, float)
    dur = max(t[-1], 1e-3)
    T = len(t)

    def beats(period):
        n = max(1, round(dur / period))
        return 2 * np.pi * n * t / dur
    lift = np.zeros((T, 3))    # raise (+) / lower (-), degrees, per joint root..tip
    sweep = np.zeros((T, 3))   # back (+) / forward (-)
    if name.startswith('fly') or (name == 'idle' and hover):   # ground walkers (dragonlings) rest with wings folded
        ph = beats(0.62 if name == 'idle' else 0.5)
        amp = 34 if name == 'idle' else 46
        lift[:, 0] = 8 + amp * np.sin(ph)
        lift[:, 1] = 22 * np.sin(ph - 0.7)
        lift[:, 2] = 18 * np.sin(ph - 1.3)
        sweep[:, 1] = 12 * (1 - np.sin(ph)) / 2
    elif name.startswith(('idle', 'walk', 'run', 'climb')):
        ph = beats(1.2 if name.startswith('run') else 2.5)
        lift[:, 0] = -22 + 4 * np.sin(ph)
        sweep[:, 0] = 38
        lift[:, 1] = -10
        sweep[:, 1] = 35 + 3 * np.sin(ph + 1)
        sweep[:, 2] = 25
    elif name.startswith(('atk', 'pounce', 'jump', 'land', 'breath')):
        env = np.sin(np.clip(t / dur, 0, 1) * np.pi)
        ph = 2 * np.pi * t / dur
        lift[:, 0] = 18 + 30 * env * np.sin(ph * 2)
        sweep[:, 0] = -10 * env
        lift[:, 1] = 15 * env * np.sin(ph * 2 - 0.7)
        lift[:, 2] = 12 * env * np.sin(ph * 2 - 1.3)
    elif name.startswith('roar'):
        k = np.clip(t / 0.4, 0, 1)
        lift[:, 0] = 30 * k + 3 * np.sin(t * 40) * k
        sweep[:, 0] = -15 * k
        lift[:, 1] = 12 * k
    elif name.startswith('hit'):
        e = np.exp(-t * 6) * np.sin(t * 25)
        lift[:, 0] = -5 + 20 * e
        sweep[:, 0] = 20
    else:   # death: the wings droop and fold
        k = np.clip(t / dur * 1.4, 0, 1)
        lift[:, 0] = -10 - 30 * k
        sweep[:, 0] = 15 + 25 * k
        lift[:, 1] = -20 * k
        lift[:, 2] = -25 * k
    out = np.zeros((T, 6, 4))
    for side, sign in ((0, 1), (1, -1)):
        for j in range(3):
            q = qmul(_q([0, 1, 0], sign * sweep[:, j]), _q([0, 0, 1], sign * lift[:, j]))
            out[:, side * 3 + j] = q
    return out


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
