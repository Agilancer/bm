"""Rigs and clips for the unrigged beasts: giant spiders and giant worms.

    python tools/monsters/critters.py [ids...]

Spider rig: looked at from above, the body is what is left after the thin legs are opened away; each separate leg
patch outside it is a leg. A leg gets three joints (hip at the body, knee, shin) placed along the 3D distance out from
where it meets the body; its vertices blend between them by that distance. The body splits into front (Body) and
abdomen by how far back a vertex sits.
Worm rig: the spine follows the tube: distances walked over the surface from the top of the mouth slice it into rings
and the joints sit at the ring centres. The hooks round the mouth each get a bone, found by their angle round the
mouth's axis.
All joints rest unturned (world identity), which keeps the clip maths plain. Rigged sources go to tools/build/monsters/src.
"""
import json
import os
import struct
import sys

import numpy as np
from scipy import ndimage
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra, connected_components
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import roster  # noqa: E402
from beasts import Skeleton, write_beast, qa, up, yaw, ease, pulse, FPS  # noqa: E402
from rig_humanoid import load, mesh_world, accessor  # noqa: E402
from transfer_clips import qmul  # noqa: E402
import humanoids  # noqa: E402


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def write_rig(doc, buf, prims, joints, J, Wt, out, vlab=None):
    """joints: [(name, parent index or -1, world position)]. J, Wt: (N, 4) per vertex over all prims."""
    buf = bytearray(buf)
    # Skin follows nearby bones only. Weight smoothing can mix in a bone far along the tree (a leg lying on the
    # abdomen, the jaw hooks against the neck); those points tear into needles and planks. Keep bones within two
    # steps of the vertex's main bone, and drop triangles whose corners hang off bones more than three steps apart.
    nj = len(joints)
    hop = np.full((nj, nj), 99)
    nb = [[] for _ in range(nj)]
    for i, (_, par, _) in enumerate(joints):
        if par >= 0:
            nb[i].append(par)
            nb[par].append(i)
    for i in range(nj):
        hop[i, i], front = 0, [i]
        while front:
            nxt = []
            for u in front:
                for v in nb[u]:
                    if hop[i, v] == 99:
                        hop[i, v] = hop[i, u] + 1
                        nxt.append(v)
            front = nxt
    J = np.asarray(J).copy()
    Wt = np.asarray(Wt, np.float64).copy()
    dom = J[np.arange(len(J)), Wt.argmax(1)]
    far = hop[dom[:, None], J] > 2
    print(f'  {int((far & (Wt > 0.01)).any(1).sum())} vertices lose far-bone weight')
    Wt[far] = 0
    Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-9)
    base = len(doc['nodes'])
    for i, (name, par, p) in enumerate(joints):
        tp = p - (joints[par][2] if par >= 0 else 0)
        doc['nodes'].append({'name': name, 'translation': [float(v) for v in tp]})
    for i, (name, par, p) in enumerate(joints):
        if par >= 0:
            doc['nodes'][base + par].setdefault('children', []).append(base + i)
    arm = len(doc['nodes'])
    doc['nodes'].append({'name': 'Armature', 'children': [base + i for i, j in enumerate(joints) if j[1] < 0]})

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
    ibm = []
    for _, _, p in joints:
        M = np.eye(4)
        M[:3, 3] = p
        ibm.append(np.linalg.inv(M).T.ravel())
    doc['skins'] = [{'joints': list(range(base, base + len(joints))), 'inverseBindMatrices': push(np.array(ibm, np.float32), 'MAT4')}]
    k = 0
    for ni, pi, Pw, Rm, _, _ in prims:
        n = len(Pw)
        prim = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        N = accessor(doc, buf, prim['attributes']['NORMAL'])
        Nw = np.einsum('nij,nj->ni', Rm, N)
        Nw /= np.linalg.norm(Nw, axis=1, keepdims=True) + 1e-12
        prim['attributes']['POSITION'] = push(Pw.astype(np.float32), 'VEC3')
        prim['attributes']['NORMAL'] = push(Nw.astype(np.float32), 'VEC3')
        prim['attributes'].pop('TANGENT', None)
        prim['attributes']['JOINTS_0'] = push(J[k:k + n].astype(np.uint16), 'VEC4', 5123)
        prim['attributes']['WEIGHTS_0'] = push(Wt[k:k + n].astype(np.float32), 'VEC4')
        I = accessor(doc, buf, prim['indices']).astype(np.int64).reshape(-1, 3)
        D = dom[I + k]
        bad = np.zeros(len(I), bool)
        for a_, b_ in ((0, 1), (1, 2), (2, 0)):
            bad |= hop[D[:, a_], D[:, b_]] > 3
            if vlab is not None:   # spiders: two different legs never share a triangle
                L = vlab[I + k]
                bad |= (L[:, a_] >= 0) & (L[:, b_] >= 0) & (L[:, a_] != L[:, b_])
        if bad.any():
            print(f'  dropped {bad.sum()} triangles bridging far bones')
            prim['indices'] = push(I[~bad].astype(np.uint32).ravel(), 'SCALAR', 5125)
        k += n
        node = doc['nodes'][ni]
        for key in ('matrix', 'rotation', 'translation', 'scale'):
            node.pop(key, None)
        node['skin'] = 0
    for node in doc['nodes']:
        if 'children' in node:
            node['children'] = [c for c in node['children'] if 'mesh' not in doc['nodes'][c]]
    doc['scenes'][doc.get('scene', 0)]['nodes'] = [arm] + sorted({p[0] for p in prims})
    doc['buffers'] = [{'byteLength': len(buf)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(buf) % 4:
        buf.append(0)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))


def pack4(cols):
    """cols: list of (joint index, weight array). Top four per vertex, normalised."""
    idx = np.array([c[0] for c in cols])
    W = np.stack([c[1] for c in cols], 1)
    order = np.argsort(-W, 1)[:, :4]
    J = idx[order]
    w = np.take_along_axis(W, order, 1)
    w /= np.maximum(w.sum(1, keepdims=True), 1e-9)
    return J, w


# ---------------------------------------------------------------------------------------------------------------------
def surface_graph(doc, buf, prims, P):
    """Edges of the mesh's own triangles (welded where vertices sit on top of each other); loose islands are bridged
    to the main body at their nearest point."""
    off, E = 0, []
    for ni, pi, Pw, *_ in prims:
        pr = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        I = accessor(doc, buf, pr['indices']).astype(np.int64).reshape(-1, 3) + off
        off += len(Pw)
        E += [I[:, [0, 1]], I[:, [1, 2]], I[:, [2, 0]]]
    E = np.concatenate(E)
    tree = cKDTree(P)
    E = np.concatenate([E, tree.query_pairs(1e-5, output_type='ndarray').astype(np.int64)])
    n = len(P)
    nc, lab = connected_components(coo_matrix((np.ones(len(E)), (E[:, 0], E[:, 1])), shape=(n, n)), directed=False)
    main = np.argmax(np.bincount(lab))
    m = np.nonzero(lab == main)[0]
    tm = cKDTree(P[m])
    for c in range(nc):
        if c != main:
            s_ = np.nonzero(lab == c)[0]
            d, nn = tm.query(P[s_])
            k = np.argmin(d)
            E = np.concatenate([E, [[s_[k], m[nn[k]]]]])
    w = np.linalg.norm(P[E[:, 0]] - P[E[:, 1]], axis=1) + 1e-7
    return coo_matrix((w, (E[:, 0], E[:, 1])), shape=(n, n)).tocsr(), tree


def rig_spider(src, out):
    """Legs: feet are the far ends of the surface walked from the middle of the front body; a vertex is on a foot's leg
    when it lies on the way there (little detour) and outside the thick body."""
    doc, buf = load(src)
    prims = mesh_world(doc, buf)
    P = np.concatenate([p[2] for p in prims])
    H = P[:, 1].max()
    g, tree = surface_graph(doc, buf, prims, P)
    hi = P[P[:, 1] > 0.5 * H]
    zf, zb = hi[:, 2].max(), hi[:, 2].min()
    cen = hi[hi[:, 2] > zb + 0.6 * (zf - zb)].mean(0)
    c = tree.query(cen)[1]
    D = dijkstra(g, directed=False, indices=c)
    nb = tree.query_ball_point(P, 0.07)
    tips = [i for i in range(len(P)) if D[i] > 0.2 and D[i] >= max(D[nb[i]]) - 1e-9 and abs(P[i, 0]) > 0.06]
    # thick body by a 3D opening of the filled voxels
    N = 128
    lo = P.min(0)
    sc = (N - 9) / np.ptp(P, 0).max()
    ijk = ((P - lo) * sc + 4).astype(int)
    occ = np.zeros((N, N, N), bool)
    occ[tuple(ijk.T)] = True
    occ = ndimage.binary_erosion(ndimage.binary_fill_holes(ndimage.binary_dilation(occ, iterations=2)), iterations=1)
    r = 4
    ball = np.sum(np.stack(np.mgrid[-r:r + 1, -r:r + 1, -r:r + 1]) ** 2, 0) <= r * r
    body = ndimage.binary_opening(occ, structure=ball)
    lab, n = ndimage.label(body)
    sz = ndimage.sum(body, lab, range(1, n + 1))
    body = np.isin(lab, 1 + np.nonzero(sz > 0.08 * sz.max())[0])   # the abdomen and the front body can come apart
    body = ndimage.binary_dilation(body, iterations=1)
    # the front body is too slim for the opening: a ball round its middle covers it
    is_body = body[tuple(ijk.T)] | (np.linalg.norm((P - cen) * [1, 1.4, 1], axis=1) < 0.1 * np.ptp(P[:, 0]))
    Dt = dijkstra(g, directed=False, indices=tips)
    excess = Dt + D[None] - D[tips][:, None]
    owner = np.argmin(excess, 0)
    on_leg = (excess.min(0) < 0.07) & ~is_body
    Pb = P[is_body]
    zs = np.linspace(Pb[:, 2].min(), Pb[:, 2].max(), 40)
    width = np.array([np.ptp(Pb[np.abs(Pb[:, 2] - z) < 0.015, 0]) if (np.abs(Pb[:, 2] - z) < 0.015).sum() > 3 else 9 for z in zs])
    mid = (zs > Pb[:, 2].min() + 0.25 * np.ptp(Pb[:, 2])) & (zs < cen[2])
    z_waist = zs[mid][np.argmin(width[mid])] if mid.any() else cen[2] - 0.1
    ground = P[:, 1].min()
    body_c = Pb[Pb[:, 2] > z_waist].mean(0)
    abd_c = Pb[Pb[:, 2] < z_waist].mean(0)
    head = Pb[Pb[:, 2] > Pb[:, 2].max() - 0.05 * np.ptp(Pb[:, 2])].mean(0)
    waist = np.array([0, body_c[1], z_waist])
    joints = [('Root', -1, np.array([body_c[0], ground, body_c[2]])), ('Body', 0, body_c), ('Abdomen', 1, waist),
              ('AbdomenTip', 2, abd_c + (abd_c - waist) * 0.6), ('Head', 1, head)]
    zb_ = P[:, 2]
    w_abd = smooth(z_waist + 0.02, z_waist - 0.04, zb_)
    w_tip = smooth(abd_c[2], abd_c[2] - 0.12, zb_)
    w_head = smooth(head[2] - 0.07, head[2] - 0.02, zb_)
    leg_w, names = [], []
    w_legs = np.zeros(len(P))
    order = sorted(range(len(tips)), key=lambda i: (P[tips[i], 0] < 0, -P[tips[i], 2]))
    count = {True: 0, False: 0}
    for i in order:
        m = on_leg & (owner == i)
        if m.sum() < 30:
            continue
        L = np.nonzero(m)[0]
        dr = D[L].min()
        root = P[L[np.argsort(D[L])[:12]]].mean(0)
        span = D[tips[i]] - dr
        f = np.zeros(len(P))
        f[L] = (D[L] - dr) / span
        left = P[tips[i], 0] > 0
        count[left] += 1
        nm = f"Leg{'L' if left else 'R'}{count[left]}"
        pts = [root]
        for q in (0.36, 0.7, 1.0):
            sel = m & (np.abs(f - q) < 0.05)
            pts.append(P[sel].mean(0) if sel.sum() > 3 else P[tips[i]])
        base = len(joints)
        joints += [(nm + 'a', 1, pts[0]), (nm + 'b', base, pts[1]), (nm + 'c', base + 1, pts[2]), (nm + 'd', base + 2, pts[3])]
        names.append(nm)
        wa = (1 - smooth(0.26, 0.46, f)) * m
        wc = smooth(0.6, 0.8, f) * m
        leg_w += [(base, wa), (base + 1, m - wa - wc), (base + 2, wc)]
        # the first stretch of the leg also follows the body a little, so the hip does not tear
        w_legs += m
    rest = 1 - np.clip(w_legs, 0, 1)
    cols = [(1, rest * (1 - w_abd) * (1 - w_head)), (2, rest * w_abd * (1 - w_tip)), (3, rest * w_abd * w_tip),
            (4, rest * w_head * (1 - w_abd))] + leg_w
    J, W = pack4(cols)
    stray = W.sum(1) < 1e-6
    if stray.any():
        ok = ~stray
        _, nn = cKDTree(P[ok]).query(P[stray])
        J[stray], W[stray] = J[ok][nn], W[ok][nn]
    full = np.zeros((len(P), len(joints)))
    np.put_along_axis(full, J, W, 1)
    _, nb6 = tree.query(P, 6)
    for _ in range(2):
        full = full[nb6].mean(1)
    J = np.argsort(-full, 1)[:, :4]
    W = np.take_along_axis(full, J, 1)
    W /= W.sum(1, keepdims=True)
    # each leg vertex follows its own leg only: no weight from a neighbouring leg it happens to touch
    leg_of = np.full(len(joints), -1)
    for li in range(len(names)):
        leg_of[5 + 4 * li: 9 + 4 * li] = li
    vlab = leg_of[J[:, 0]]
    other = (leg_of[J] >= 0) & (leg_of[J] != vlab[:, None]) & (vlab[:, None] >= 0)
    W[other] = 0
    W /= np.maximum(W.sum(1, keepdims=True), 1e-9)
    write_rig(doc, buf, prims, joints, J, W, out, vlab)
    print(f'{out}: {len(names)} legs {names}, waist z {z_waist:.2f}')


class Spider:
    def __init__(self, sk):
        self.sk = sk
        n = sk.names
        self.at = {nm: i for i, nm in enumerate(n)}
        self.legs = []
        for i, nm in enumerate(n):
            if nm.startswith('Leg') and nm.endswith('a'):
                side = 1 if nm[3] == 'L' else -1
                num = int(nm[4:-1])
                ch = [i, self.at[nm[:-1] + 'b'], self.at[nm[:-1] + 'c']]
                tip = self.at[nm[:-1] + 'd']
                o = sk.p[tip] - sk.p[self.at['Body']]   # out from the body's middle: never straight down
                o[1] = 0
                o /= np.linalg.norm(o) + 1e-9
                self.legs.append(dict(ch=ch, side=side, num=num, out=o, front=num <= 2))
        self.count = max(l['num'] for l in self.legs)
        self.H = sk.P[:, 1].max()

    def lift_axis(self, leg):
        a = np.cross(leg['out'], [0, 1, 0])   # rotating about this raises the leg
        return a / np.linalg.norm(a)

    def leg(self, G, leg, lift=0, sweep=0, curl=0):
        a = self.lift_axis(leg)
        T = G.shape[0]
        ch = leg['ch']
        G[:, ch[0]] = qmul(qmul(qa([0, 1, 0], np.broadcast_to(sweep, T)), qa(a, np.broadcast_to(lift, T))), G[:, ch[0]])
        G[:, ch[1]] = qmul(qa(a, -np.broadcast_to(curl, T)), G[:, ch[1]])
        G[:, ch[2]] = qmul(qa(a, -np.broadcast_to(curl, T) * 0.8), G[:, ch[2]])

    def gait(self, G, t, f, lift, sweep):
        for l in self.legs:
            # alternating tetrapod: L1 R2 L3 R4 against R1 L2 R3 L4
            grp = (l['num'] + (l['side'] > 0)) % 2
            ph = 2 * np.pi * (f * t + 0.5 * grp + 0.06 * l['num'])
            self.leg(G, l, lift * np.maximum(0, np.sin(ph)), sweep * np.cos(ph) * (1 if l['side'] > 0 else -1), -8 * np.maximum(0, np.sin(ph)))

    def body(self, G, pitch=0, yaw_=0, roll_=0, abd=0):
        b = self.at['Body']
        T = G.shape[0]
        G[:, b] = qmul(qmul(up(np.broadcast_to(pitch, T)), qa([0, 1, 0], np.broadcast_to(yaw_, T))), G[:, b])
        G[:, b] = qmul(qa([0, 0, 1], np.broadcast_to(roll_, T)), G[:, b])
        # keep the legs where they were: counter the body's pitch and roll on every hip
        for l in self.legs:
            G[:, l['ch'][0]] = qmul(qa([0, 0, 1], -np.broadcast_to(roll_, T)), qmul(up(-np.broadcast_to(pitch, T)), G[:, l['ch'][0]]))
        G[:, self.at['Abdomen']] = qmul(up(np.broadcast_to(abd, T)), G[:, self.at['Abdomen']])

    def front(self, n=1):
        return [l for l in self.legs if l['num'] <= n]

    def clips(self):
        H = self.H
        out = {}

        def clip(name, dur, fn):
            T = int(round(dur * FPS)) + 1
            t = np.linspace(0, dur, T)
            G = np.tile([0, 0, 0, 1.0], (T, self.sk.J, 1))
            R = np.zeros((T, 3))
            fn(t, G, R)
            out[name] = (t, G, R)

        def idle(t, G, R):
            self.body(G, 1.5 * np.sin(2 * np.pi * t / 2.4), 0, 0, 4 * np.sin(2 * np.pi * t / 1.2))
            for l in self.legs:
                self.leg(G, l, 3 * np.maximum(0, np.sin(2 * np.pi * (t / 4 + l['num'] * 0.21 + (l['side'] > 0) * 0.5))), 0, 0)
            R[:, 1] = 0.01 * H * np.sin(2 * np.pi * t / 2.4)
        clip('idle', 4.8, idle)

        def idle2(t, G, R):   # tastes the air: front legs lift and feel
            for l in self.front(1):
                ph = 2 * np.pi * t / 1.6 + (l['side'] > 0) * np.pi
                self.leg(G, l, 30 + 15 * np.sin(ph), 10 * np.sin(ph * 0.5), 20 + 10 * np.cos(ph))
            self.body(G, 6, 8 * np.sin(2 * np.pi * t / 4), 0, -4)
        clip('idle2', 4.8, idle2)

        def idle3(t, G, R):   # cleans a foreleg at the fangs, in jerks, then a twitch of the whole body
            steps = np.floor(t * 3.0)
            rng = np.random.default_rng(7)
            jit = rng.uniform(-1, 1, (int(steps.max()) + 2, 3))
            k = jit[steps.astype(int)]
            self.body(G, 8 + 4 * k[:, 0], 14 * k[:, 1], 3 * k[:, 2], 10 + 6 * k[:, 0])
            for l in self.legs:
                if l['num'] == 1 and l['side'] > 0:   # the foreleg lifts to the mouth and rubs
                    self.leg(G, l, 55 + 10 * np.sin(t * 14), -25, 70 + 15 * np.sin(t * 14))
                else:
                    self.leg(G, l, 6 * np.abs(k[:, (l['num'] + (l['side'] > 0)) % 3]), 0, 0)
        clip('idle3', 4.0, idle3)

        def walk(t, G, R):
            self.gait(G, t, 1 / 0.9, 20, 14)
            self.body(G, 0, 3 * np.sin(2 * np.pi * t / 0.9), 2 * np.sin(2 * np.pi * t / 0.45), 3 * np.sin(2 * np.pi * t / 0.45))
            R[:, 1] = 0.012 * H * np.sin(2 * np.pi * t / 0.45)
        clip('walk', 0.9, walk)

        def run(t, G, R):
            self.gait(G, t, 1 / 0.45, 26, 20)
            self.body(G, -4, 0, 3 * np.sin(2 * np.pi * t / 0.225), 5)
            R[:, 1] = -0.02 * H + 0.015 * H * np.sin(2 * np.pi * t / 0.225)
        clip('run', 0.45, run)

        def run2(t, G, R):   # skitter: tiny fast steps, low
            self.gait(G, t, 1 / 0.3, 18, 10)
            self.body(G, -6, 0, 0, 8)
            R[:, 1] = -0.05 * H
        clip('run2', 0.6, run2)

        def pounce(t, G, R):   # jump: crouch, spring, all legs out
            c = pulse(t, 0, 0.35, 0.4, 0.5)
            air = pulse(t, 0.45, 0.6, 0.9, 1.15)
            land = pulse(t, 1.1, 1.18, 1.25, 1.6)
            for l in self.legs:
                self.leg(G, l, -15 * c + 25 * air * (1.4 if l['front'] else 0.6) - 10 * land, 0, 25 * c - 15 * air)
            self.body(G, 8 * air - 6 * land, 0, 0, -10 * air)
            R[:, 1] = -0.12 * H * c + 0.55 * H * np.sin(np.clip((t - 0.45) / 0.7, 0, 1) * np.pi) - 0.08 * H * land
            R[:, 2] = 0.9 * H * ease((t - 0.45) / 0.7)
        clip('jump', 1.6, pounce)

        def bite(t, G, R):   # atk1: rear, fangs forward, lunge
            rear = pulse(t, 0, 0.35, 0.45, 0.55)
            strike = pulse(t, 0.45, 0.55, 0.65, 1.0)
            for l in self.front(2):
                self.leg(G, l, (50 if l['num'] == 1 else 25) * rear + 10 * strike, -l['side'] * 15 * rear, 25 * rear)
            self.body(G, 18 * rear - 12 * strike, 0, 0, -10 * rear)
            R[:, 2] = -0.05 * H * rear + 0.3 * H * strike
            R[:, 1] = 0.05 * H * rear
        clip('atk1', 1.2, bite)

        def stab(t, G, R):   # atk2: both forelegs high, then stab down
            up_ = pulse(t, 0, 0.4, 0.5, 0.58)
            down = pulse(t, 0.5, 0.58, 0.75, 1.1)
            for l in self.front(1):
                self.leg(G, l, 75 * up_ - 25 * down, 0, 40 * up_ - 20 * down)
            self.body(G, 12 * up_ - 8 * down, 0, 0, 0)
            R[:, 2] = 0.15 * H * down
        clip('atk2', 1.3, stab)

        def sting(t, G, R):   # atk3: abdomen curls under and jabs forward
            k = pulse(t, 0.05, 0.45, 0.55, 0.65)
            jab = pulse(t, 0.55, 0.65, 0.75, 1.1)
            self.body(G, -8 * k + 5 * jab, 0, 0, -40 * k - 25 * jab)
            for l in self.legs:
                if not l['front']:
                    self.leg(G, l, -8 * k, 0, 12 * k)
            R[:, 1] = 0.08 * H * k
        clip('atk3', 1.3, sting)

        def lunge(t, G, R):   # atk4: low run-in and grapple
            k = pulse(t, 0, 0.25, 0.6, 1.0)
            grab = pulse(t, 0.25, 0.4, 0.7, 1.0)
            for l in self.legs:
                self.leg(G, l, (28 * grab if l['num'] <= 2 else -5 * k), -l['side'] * 20 * grab * (l['num'] <= 2), (25 * grab if l['num'] <= 2 else 10 * k))
            self.body(G, -10 * k + 10 * grab, 0, 0, 10 * k)
            R[:, 2] = 0.5 * H * ease(t / 0.4) * (1 - ease((t - 0.7) / 0.5))
            R[:, 1] = -0.06 * H * k
        clip('atk4', 1.3, lunge)

        def rake(t, G, R):   # atk5: left then right foreleg slash
            for l in self.front(1):
                s0 = 0.15 if l['side'] > 0 else 0.6
                k = pulse(t, s0, s0 + 0.15, s0 + 0.2, s0 + 0.45)
                self.leg(G, l, 55 * k, -l['side'] * 50 * k * np.sin(np.clip((t - s0) / 0.45, 0, 1) * np.pi * 1.5), 25 * k)
            self.body(G, 8, 15 * np.sin(2 * np.pi * t / 1.4), 0, 0)
        clip('atk5', 1.4, rake)

        def threat(t, G, R):   # roar: rear high, forelegs spread, abdomen up, shiver
            k = pulse(t, 0.1, 0.6, 2.0, 2.6)
            sh = np.sin(t * 50) * 3 * k
            for l in self.legs:
                if l['num'] <= 2:
                    self.leg(G, l, (70 if l['num'] == 1 else 45) * k + sh, -l['side'] * 25 * k, 10 * k)
                else:
                    self.leg(G, l, -8 * k, 0, 15 * k)
            self.body(G, 25 * k, 0, 0, 25 * k + sh)
            R[:, 1] = 0.12 * H * k
        clip('roar', 2.8, threat)

        def hit(t, G, R):
            k = np.exp(-t * 4) * np.sin(np.minimum(t * 12, np.pi))
            self.body(G, 22 * k, 18 * k, 14 * k, 25 * k)
            for l in self.legs:
                self.leg(G, l, (35 if l['front'] else 12) * k, 0, 30 * k)
            R[:, 2] = -0.25 * H * k
            R[:, 1] = 0.06 * H * k
        clip('hit', 0.8, hit)

        def death(t, G, R):   # flips onto its back, legs curl in
            k = ease(t / 0.8)
            c = ease((t - 0.5) / 1.4)
            twitch = np.sin(t * 25) * 10 * (1 - c) * (t > 0.6)
            self.body(G, 0, 0, 180 * k, 0)
            for l in self.legs:
                self.leg(G, l, 10 * c, 0, 110 * c + twitch)
            R[:, 1] = 0.35 * H * np.sin(k * np.pi) - 0.2 * H * c
        clip('death', 2.4, death)

        def death2(t, G, R):   # collapses where it stands, legs splay
            k = ease(t / 0.7)
            for l in self.legs:
                self.leg(G, l, -25 * k, l['side'] * 10 * k, -20 * k + np.sin(t * 30) * 6 * (1 - ease(t / 1.6)))
            self.body(G, -5 * k, 0, 6 * k, -6 * k)
            R[:, 1] = -0.25 * H * k
        clip('death2', 2.0, death2)

        def crumple(t, G, R):   # legs buckle outward, the body slams flat to the floor, then the legs curl in and twitch
            k = ease(t / 0.45)
            c = ease((t - 0.6) / 1.2)
            tw = np.sin(t * 28) * 8 * (t > 0.5) * (1 - ease((t - 0.5) / 1.8))
            for l in self.legs:
                self.leg(G, l, 30 * k - 20 * c, l['side'] * 18 * k, -35 * k + 85 * c + tw)
            self.body(G, -8 * k, 0, 10 * k, -12 * k)
            R[:, 1] = -0.5 * H * k + 0.03 * H * np.exp(-((t - 0.5) / 0.08) ** 2)
        clip('crumple', 2.4, crumple)
        return out


# ---------------------------------------------------------------------------------------------------------------------
def rig_worm(src, out, segs=12):
    doc, buf = load(src)
    prims = mesh_world(doc, buf)
    P = np.concatenate([p[2] for p in prims])
    tree = cKDTree(P)
    d, nb = tree.query(P, 9)
    rows = np.repeat(np.arange(len(P)), 8)
    g = coo_matrix((d[:, 1:].ravel() + 1e-6, (rows, nb[:, 1:].ravel())), shape=(len(P), len(P))).tocsr()
    top = int(np.argmax(P[:, 1]))
    D = dijkstra(g, directed=False, indices=top)
    D[~np.isfinite(D)] = np.nanmax(D[np.isfinite(D)])
    # The mouth: the top part. Its axis: from the ring centre below the hooks up to the top.
    Dm = D.max()
    rings = np.linspace(0.0, Dm, segs + 2)
    cent = []
    for a, b in zip(rings[:-1], rings[1:]):
        s = (D >= a) & (D < b)
        cent.append(P[s].mean(0) if s.sum() > 5 else (cent[-1] if cent else P[top]))
    cent = np.array(cent)
    # spine from the tail end (far) to the mouth (near): joint k at ring centre
    spine = cent[::-1]
    ground = P[:, 1].min()
    joints = [('Root', -1, np.array([spine[0][0], ground, spine[0][2]]))]
    for k, c in enumerate(spine[:-1]):
        joints.append((f'Spine{k}', k, c))
    nspine = len(joints) - 1
    # Mouth hooks: vertices in the top 22% of distance, clustered by angle round the mouth axis.
    head = joints[-1][2]
    axis = spine[-1] - spine[-3]
    axis /= np.linalg.norm(axis)
    hm = D < 0.22 * Dm
    v = P[hm] - head
    v -= np.outer(v @ axis, axis)
    e1 = np.cross(axis, [1, 0, 0]) if abs(axis[0]) < 0.9 else np.cross(axis, [0, 0, 1])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(axis, e1)
    ang = np.arctan2(v @ e2, v @ e1)
    hist, edges = np.histogram(ang, 36, (-np.pi, np.pi))
    hs = ndimage.uniform_filter1d(hist.astype(float), 3, mode='wrap')
    peaks = [i for i in range(36) if hs[i] >= hs[i - 1] and hs[i] > hs[(i + 1) % 36] and hs[i] > hs.mean() * 1.15]
    peaks = sorted(peaks, key=lambda i: -hs[i])[:4]
    centres = np.array([(edges[i] + edges[i + 1]) / 2 for i in peaks])
    idx_head = len(joints) - 1
    hook_w = []
    hm_idx = np.nonzero(hm)[0]
    if len(centres) >= 2:
        da = np.abs(((ang[:, None] - centres[None]) + np.pi) % (2 * np.pi) - np.pi)
        lab = np.argmin(da, 1)
        for h in range(len(centres)):
            sel = hm_idx[lab == h]
            if len(sel) < 10:
                continue
            Q = P[sel]
            base_pt = Q[np.argsort(D[sel])[-max(5, len(sel) // 10):]].mean(0)
            tip = Q[np.argsort(D[sel])[:max(5, len(sel) // 10)]].mean(0)
            j = len(joints)
            joints.append((f'Hook{h}', idx_head, base_pt))
            joints.append((f'Hook{h}tip', j, tip))
            # weight: grows from the hook's base to its tip
            frac = np.zeros(len(P))
            frac[sel] = np.clip(1 - D[sel] / (0.22 * Dm), 0, 1)
            w = smooth(0.15, 0.55, frac)
            hook_w.append((j, w * (1 - smooth(0.6, 0.95, frac))))
            hook_w.append((j + 1, w * smooth(0.6, 0.95, frac)))
    # spine weights by distance along the tube
    pos = (Dm - D) / Dm * (len(rings) - 2)  # 0 at tail end ring centre .. segs at the top
    cols = []
    for k in range(nspine):
        c = k + 0.5
        cols.append((k + 1, np.clip(1 - np.abs(pos - c), 0, 1)))
    hooks_total = sum(w for _, w in hook_w) if hook_w else 0
    cols = [(j, w * (1 - hooks_total)) for j, w in cols] + hook_w
    J, W = pack4(cols)
    stray = W.sum(1) < 1e-6
    J[stray] = [nspine, 0, 0, 0]
    W[stray] = [1, 0, 0, 0]
    write_rig(doc, buf, prims, joints, J, W, out)
    print(f'{out}: {nspine} spine joints, {len(hook_w) // 2} hooks')


class Worm:
    def __init__(self, sk):
        self.sk = sk
        self.spine = [i for i, n in enumerate(sk.names) if n.startswith('Spine')]
        self.hooks = [i for i, n in enumerate(sk.names) if n.startswith('Hook') and not n.endswith('tip')]
        self.H = sk.P[:, 1].max()
        self.head = sk.p[self.spine[-1]]

    def wave(self, G, t, amp, freq, wl=1.0, axis='x', lo=0, k_up=0.0):
        n = len(self.spine)
        for i, j in enumerate(self.spine[lo:], lo):
            s = i / n
            ph = 2 * np.pi * (freq * t - s / wl)
            ang = amp * np.sin(ph) / n * 3 * (0.4 + s)
            q = qa([0, 0, 1], ang) if axis == 'x' else up(ang)
            G[:, j] = qmul(q, G[:, j])

    def bend(self, G, pitch=0, yaw_=0, frm=0.3):
        n = len(self.spine)
        sel = self.spine[int(frm * n):]
        T = G.shape[0]
        for j in sel:
            G[:, j] = qmul(qmul(up(np.broadcast_to(pitch, T) / len(sel)), yaw(np.broadcast_to(yaw_, T) / len(sel))), G[:, j])

    def mouth(self, G, open_):
        T = G.shape[0]
        for j in self.hooks:
            r = self.sk.p[j] - self.head
            a = np.cross([0, 1, 0], r)
            if np.linalg.norm(a) < 1e-6:
                a = np.array([1.0, 0, 0])
            a /= np.linalg.norm(a)
            G[:, j] = qmul(qa(a, -np.clip(1.4 * np.broadcast_to(open_, T), -20, 50)), G[:, j])

    def clips(self):
        H = self.H
        out = {}

        def clip(name, dur, fn):
            T = int(round(dur * FPS)) + 1
            t = np.linspace(0, dur, T)
            G = np.tile([0, 0, 0, 1.0], (T, self.sk.J, 1))
            R = np.zeros((T, 3))
            fn(t, G, R)
            out[name] = (t, G, R)

        def idle(t, G, R):
            self.wave(G, t, 10, 1 / 4.0, 1.2)
            self.wave(G, t + 1, 6, 1 / 5.0, 1.0, 'z')
            self.mouth(G, 8 + 8 * np.sin(2 * np.pi * t / 2.0))
        clip('idle', 8.0, idle)

        def idle2(t, G, R):   # tastes the air, mouth flexing open
            self.bend(G, 15 * np.sin(2 * np.pi * t / 3), 30 * np.sin(2 * np.pi * t / 6))
            self.mouth(G, 20 + 25 * np.maximum(0, np.sin(2 * np.pi * t / 1.5)))
            self.wave(G, t, 5, 1 / 3.0)
        clip('idle2', 6.0, idle2)

        def idle3(t, G, R):   # coils, pulses
            self.wave(G, t, 18, 1 / 2.0, 0.7)
            self.bend(G, -12, 0)
            self.mouth(G, 4 + 4 * np.sin(t * 9))
            R[:, 1] = -0.03 * H * (1 + np.sin(2 * np.pi * t / 2))
        clip('idle3', 4.0, idle3)

        def slither(t, G, R, speed=1.0):
            ph = 2 * np.pi * speed / 1.2 * t
            self.wave(G, t, 55 * speed, speed / 1.2, 0.6)
            self.wave(G, t, 20, speed / 1.2, 0.6, 'z')
            self.bend(G, -14 * speed + 12 * np.sin(ph), 0)
            self.mouth(G, 12 + 10 * np.maximum(0, np.sin(ph)))
            R[:, 1] = -0.05 * H * (1 + np.sin(ph)) * speed
            R[:, 2] = 0.04 * H * np.sin(ph)
        clip('walk', 2.4, slither)
        clip('run', 1.2, lambda t, G, R: slither(t, G, R, 2.0))

        def burrow(t, G, R):
            k = ease(t / 1.6)
            self.wave(G, t, 25, 2, 0.7)
            self.bend(G, -40 * k, 0)
            self.mouth(G, -10 * k)
            R[:, 1] = -1.05 * H * k
        clip('burrow', 1.8, burrow)

        def emerge(t, G, R):
            k = ease(t / 1.0)
            burst = pulse(t, 0.6, 0.8, 1.0, 1.6)
            self.wave(G, t, 20 * (1 - k) + 6, 2, 0.7)
            self.bend(G, 25 * burst, 0)
            self.mouth(G, 50 * burst)
            R[:, 1] = -1.05 * H * (1 - k)
        clip('emerge', 1.8, emerge)

        def strike(t, G, R):   # atk1: rear back, lunge down, mouth gaping
            back = pulse(t, 0, 0.45, 0.5, 0.6)
            hit = pulse(t, 0.55, 0.68, 0.8, 1.2)
            self.bend(G, 30 * back - 75 * hit, 0, 0.2)
            self.mouth(G, 20 * back + 55 * hit - 30 * pulse(t, 0.75, 0.8, 0.85, 1.0))
            R[:, 2] = -0.05 * H * back
        clip('atk1', 1.4, strike)

        def sweep(t, G, R):   # atk2: side-scythe
            k = pulse(t, 0, 0.35, 0.4, 0.5)
            s = pulse(t, 0.4, 0.6, 0.7, 1.1)
            self.bend(G, -30 * s, 45 * k - 80 * s, 0.15)
            self.mouth(G, 30 * s)
        clip('atk2', 1.3, sweep)

        def slam(t, G, R):   # atk3: up high and crash down
            rise = pulse(t, 0, 0.6, 0.7, 0.8)
            crash = pulse(t, 0.75, 0.88, 1.0, 1.6)
            self.bend(G, 25 * rise - 90 * crash, 0, 0.1)
            self.mouth(G, 30 * rise)
            R[:, 1] = 0.15 * H * rise
        clip('atk3', 1.8, slam)

        def swallow(t, G, R):   # atk4: engulf: lunge, snap shut, pull back and gulp
            l = pulse(t, 0.1, 0.35, 0.45, 0.9)
            self.bend(G, -55 * l, 0, 0.2)
            self.mouth(G, 70 * pulse(t, 0.05, 0.3, 0.38, 0.45) - 15 * pulse(t, 0.45, 0.5, 1.2, 1.5))
            self.wave(G, t, 12 * ease((t - 0.8) / 0.3), 3.0, 0.5, 'z')
        clip('atk4', 1.7, swallow)

        def spit(t, G, R):   # breath: rear, mouth wide, spew
            draw = pulse(t, 0, 0.5, 0.6, 0.8)
            pour = pulse(t, 0.7, 0.9, 2.0, 2.4)
            self.bend(G, 25 * draw - 25 * pour, 15 * np.sin(2 * np.pi * t / 2.4) * pour)
            self.mouth(G, 20 * draw + 60 * pour)
        clip('breath', 2.6, spit)

        def roar(t, G, R):
            k = pulse(t, 0.1, 0.5, 2.0, 2.6)
            sh = np.sin(t * 40) * 4 * k
            self.bend(G, 25 * k, sh)
            self.mouth(G, 75 * k + sh * 2)
            self.wave(G, t, 6 * k, 3.0, 0.6)
            R[:, 1] = 0.08 * H * k
        clip('roar', 2.8, roar)

        def hit(t, G, R):
            k = pulse(t, 0, 0.07, 0.15, 0.75)   # snaps back hard, shudders, settles
            self.bend(G, 45 * k, 15 * k, 0.1)
            self.wave(G, t, 18 * k, 6.0, 0.5)
            self.mouth(G, 40 * k)
            R[:, 2] = -0.06 * H * k
        clip('hit', 0.9, hit)

        def death(t, G, R):
            k = ease(t / 1.6)
            writhe = (1 - k) * 25
            self.wave(G, t, writhe, 2.5, 0.6)
            self.bend(G, -85 * k, 10 * k, 0.0)   # falls forward flat on the ground
            self.mouth(G, 45 * pulse(t, 0, 0.3, 0.6, 1.0))
            R[:, 1] = -0.1 * H * k
        clip('death', 2.6, death)
        def death2(t, G, R):   # topples sideways and flops on the ground, a last few twitches
            k = ease(t / 1.2)
            low = self.spine[:max(2, len(self.spine) // 2)]
            for j in low:   # rolls over sideways from the base: the whole body ends lying on the ground
                G[:, j] = qmul(qa([0, 0, 1], 88 * k / len(low)), G[:, j])   # away from the camera's side
            self.bend(G, -15 * k, 0, 0.5)
            self.wave(G, t, 18 * (1 - ease(t / 2.2)), 3.0, 0.5, 'z')
            self.mouth(G, 40 * pulse(t, 0.2, 0.5, 0.9, 1.6))
            R[:, 1] = -0.12 * H * k
        clip('death2', 2.6, death2)
        return out


def build(entry):
    src = roster.src_path(entry)
    rigged = os.path.join(roster.FIXED, entry['id'] + '.rig.glb')
    if entry['kind'] == 'spider':
        rig_spider(src, rigged)
    else:
        rig_worm(src, rigged)
    doc, buf = load(rigged)
    sk = Skeleton(doc, buf)
    maker = Spider(sk) if entry['kind'] == 'spider' else Worm(sk)
    extra = {}
    if entry['kind'] == 'worm':
        extra = dict(breath='acid', mouth='Spine%d' % (len(maker.spine) - 1), mouthDir=[0, 0.2, 1], mouthOff=0.0,
                     breathWin=[0.2, 0.9])
    clips = maker.clips()
    if entry.get('noflip'):   # too many limbs to land on its back cleanly (a stiff limb sticks up): it dies where it stands
        t2, G2, R2 = clips.pop('crumple')
        clips['death'] = (t2, G2, R2)
        clips['death2'] = (t2 * 1.6, G2, R2)   # the same collapse, a slow agonised one
    clips.pop('crumple', None)
    reach = entry.get('reach', 1.0)   # big bodies need lunges that cover ground, or the strike reads as a twitch
    for k_, (t_, G_, R_) in list(clips.items()):
        if k_.startswith('atk') and reach != 1.0:
            R_ = R_.copy(); R_[:, 2] *= reach
            clips[k_] = (t_, G_, R_)
    tempo = entry.get('tempo', 1.0)   # the same moves at another speed give each spider its own temper
    clips = {k: (t / tempo, G, R) for k, (t, G, R) in clips.items()}
    meta = write_beast(entry, sk, doc, buf, clips, extra)
    import stretch   # last pass: any triangle a move still stretches into a needle is dropped
    print(f"  {stretch.cull(entry['id'])} needle triangles dropped")
    meta['bytes'] = os.path.getsize(os.path.join(stretch.ROOT, 'assets', 'monsters', 'tripo', entry['id'] + '.glb'))
    return meta


def main(ids):
    from humanoids import save_roster
    for e in roster.BEASTS:
        if e['kind'] not in ('spider', 'worm') or (ids and e['id'] not in ids and e.get('group') not in ids):
            continue
        save_roster([build(e)])


if __name__ == '__main__':
    main(sys.argv[1:])
