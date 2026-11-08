"""Give Lisandra's two forms cloth: chains of bones down her skirt, tabard and hanging sleeves, which the
game swings with gravity and keeps out of her legs and hands (src/sim/cloth.js).

    python tools/lisandra/cloth_rig.py pretty tools/build/lisandra/pretty_src.glb assets/game/lisandra/pretty.glb
    python tools/lisandra/cloth_rig.py witch  tools/build/lisandra/witch_src.glb  assets/game/lisandra/witch.glb

The sources are the models as they were before cloth (main at cc7474b: `git show cc7474b:assets/game/lisandra/pretty.glb`),
with all their clips and the _SKIRT mask from tools/lisandra_skirt.py. Needs NumPy.

What it does, in the model's own units (the game scales by LISANDRA_SCALE):
- drops the thirteen end bones that move nothing (finger tips, toe ends, head top), so there's room for cloth;
- adds chains of bones, each a child of the body bone the cloth hangs from, in bind pose with no rotation;
- weights each cloth vertex across the two nearest chains and the two nearest bones down them, blending into the body's own
  weights where the cloth meets the body;
- writes the chains to the scene's extras (`cloth`), for the game to simulate.
"""
import json
import struct
import sys

import numpy as np

# Each form: the chains. Skirt chains go round the hips at an angle (degrees: 0 = front, +90 = her left), from the height
# where the cloth leaves the body down to the hem. Sleeve chains hang from the arm at a distance out along it.
FORMS = {
    'pretty': {
        'skirt': {'angles': [60, 90, 120, 150, 180, -150, -120, -90, -60], 'top': 0.40, 'hem': 0.012, 'closed': False},
        'tabard': {'angles': [0], 'top': 0.40, 'hem': 0.03, 'within': 45},
        'sleeve': {'xs': [0.145, 0.285], 'top': 0.755, 'bottom': 0.37, 'blend': (0.755, 0.72), 'seed': (0.19, 0.735), 'cut': 0.752, 'hand': 0.33, 'inner': 0.12},
        'segments': 3,
    },
    'witch': {
        'skirt': {'angles': [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30], 'top': 0.43, 'hem': 0.05, 'closed': True},
        'sleeve': {'xs': [0.19, 0.305], 'top': 0.725, 'bottom': 0.45, 'blend': (0.725, 0.695), 'seed': (0.25, 0.68), 'cut': 0.722, 'hand': 0.315, 'inner': 0.178},
        'segments': 3,
    },
}


def load(path):
    raw = open(path, 'rb').read()
    n = struct.unpack_from('<I', raw, 12)[0]
    doc = json.loads(raw[20:20 + n])
    data = bytearray(raw[28 + n:28 + n + struct.unpack_from('<I', raw, 20 + n)[0]])
    return doc, data


def accessor(doc, data, i):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    dt = {5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[a['componentType']]
    w = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    size = np.dtype(dt).itemsize
    return np.ndarray((a['count'], w), dt, data, v.get('byteOffset', 0) + a.get('byteOffset', 0), (v.get('byteStride', w * size), size)).copy()


def append(doc, data, array, ctype, atype):
    data.extend(b'\0' * (-len(data) % 4))
    view = len(doc['bufferViews'])
    raw = np.ascontiguousarray(array).tobytes()
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(data), 'byteLength': len(raw)})
    data.extend(raw)
    doc['accessors'].append({'bufferView': view, 'componentType': ctype, 'count': len(array), 'type': atype})
    return len(doc['accessors']) - 1


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)


def levels(top, hem, n):
    return np.linspace(top, hem, n + 1)


def along(y, ys):
    """Where y is down a chain, in bones: each bone's weight peaks at its middle and blends to the next."""
    n = len(ys) - 1
    s = np.clip((ys[0] - y) / (ys[0] - ys[-1]) * n, 0, n)
    c = np.clip(s - 0.5, 0, n - 1)
    i = np.minimum(np.floor(c).astype(int), n - 2)
    f = np.clip(c - i, 0, 1)
    return i, f


def main():
    form, src, out = sys.argv[1], sys.argv[2], sys.argv[3]
    cfg = FORMS[form]
    doc, data = load(src)
    skin = doc['skins'][0]
    prim = doc['meshes'][0]['primitives'][0]
    att = prim['attributes']
    pos = accessor(doc, data, att['POSITION'])
    J = accessor(doc, data, att['JOINTS_0']).astype(np.int64)
    W = accessor(doc, data, att['WEIGHTS_0']).astype(np.float64)
    mask = accessor(doc, data, att['_SKIRT'])[:, 0].astype(np.float64)
    ibm = accessor(doc, data, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    nodes = doc['nodes']
    names = [nodes[j]['name'] for j in skin['joints']]
    bind = np.linalg.inv(ibm)
    at = lambda name: bind[names.index('mixamorig:' + name)][:3, 3]

    # The end bones that move nothing go, and every joint index after them moves down.
    dead = [i for i, n in enumerate(names) if n.endswith(('Toe_End', 'HeadTop_End')) or n[-1] == '4' and 'Hand' in n]
    assert not np.isin(J[W > 0], dead).any(), 'an end bone carries weight'
    keep = [i for i in range(len(names)) if i not in dead]
    remap = np.full(len(names), -1)
    remap[keep] = np.arange(len(keep))
    J = np.where(W > 0, remap[J], 0)
    skin['joints'] = [skin['joints'][i] for i in keep]
    names = [names[i] for i in keep]
    bind = bind[keep]

    hips = at('Hips')
    seg = cfg['segments']
    chains = []   # {kind, parent, points (seg+1, 3)}

    def surface(sel, angle, y, fallback):
        """The cloth's outer surface at this angle round the hips and this height."""
        ang = np.degrees(np.arctan2(pos[sel, 0] - hips[0], pos[sel, 2] - hips[2]))
        r = np.hypot(pos[sel, 0] - hips[0], pos[sel, 2] - hips[2])
        d = (ang - angle + 180) % 360 - 180
        k = (np.abs(d) < 12) & (np.abs(pos[sel, 1] - y) < 0.025)
        return np.percentile(r[k], 90) if k.sum() > 4 else fallback

    # The skirt: what the mask marks, and on the witch the ragged hem under it too, which is welded to her boots: there the
    # cloth is whatever stands well clear of the shins.
    cloth = mask.copy()
    if form == 'witch':
        shin = np.minimum.reduce([seg_dist(pos, at(s + 'Leg'), at(s + 'Foot')) for s in ('Left', 'Right')]
                                 + [seg_dist(pos, at(s + 'Foot'), at(s + 'ToeBase')) + 0.012 for s in ('Left', 'Right')])
        rr = np.hypot(pos[:, 0] - hips[0], pos[:, 2] - hips[2])
        hem = smooth(0.045, 0.062, shin) * (1 - smooth(0.17, 0.2, pos[:, 1])) * smooth(0.07, 0.09, rr) * smooth(0.035, 0.05, pos[:, 1])
        cloth = np.maximum(cloth, hem)
    sk = cfg['skirt']
    ys = levels(sk['top'], sk['hem'], seg)
    in_skirt = cloth > 0.02
    tabard = np.zeros(len(pos), bool)
    if 'tabard' in cfg:
        ang_all = np.degrees(np.arctan2(pos[:, 0] - hips[0], pos[:, 2] - hips[2]))
        tabard = in_skirt & (np.abs(ang_all) < cfg['tabard']['within'])
    for a in sk['angles']:
        pts = [hips + [np.sin(np.radians(a)) * surface(in_skirt & ~tabard, a, y, 0.12), 0, np.cos(np.radians(a)) * surface(in_skirt & ~tabard, a, y, 0.12)] for y in ys]
        for p, y in zip(pts, ys): p[1] = y
        chains.append({'kind': 'skirt', 'parent': 'mixamorig:Hips', 'angle': a, 'points': np.array(pts)})
    if 'tabard' in cfg:
        tb = cfg['tabard']
        tys = levels(tb['top'], tb['hem'], seg)
        pts = []
        for y in tys:
            k = tabard & (np.abs(pos[:, 1] - y) < 0.025)
            p = pos[k].mean(0) if k.sum() > 4 else np.array([hips[0], y, hips[2] + 0.065])
            p[2] = np.percentile(pos[k, 2], 90) if k.sum() > 4 else p[2]
            p[1] = y
            pts.append(p)
        chains.append({'kind': 'tabard', 'parent': 'mixamorig:Hips', 'angle': 0, 'points': np.array(pts)})

    # The sleeves: the piece that hangs from the arm. Cut just under the arm, the drape comes away as one connected piece:
    # the one that holds the vertex nearest the seed point, under the arm. Then add back the band above the cut, out of
    # the hand, that blends into the arm.
    sl = cfg['sleeve']
    welded, inv = np.unique(np.round(pos, 4), axis=0, return_inverse=True)
    inv = inv.ravel()
    tri = accessor(doc, data, prim['indices']).reshape(-1, 3)
    edges = inv[tri][:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2)
    sleeve_side = {}
    for side, sign in (('Left', 1), ('Right', -1)):
        x = pos[:, 0] * sign
        wx = welded[:, 0] * sign
        low = (welded[:, 1] < sl['cut']) & (welded[:, 1] > sl['bottom'] - 0.06) & (wx > sl['inner'])
        e = edges[low[edges].all(1)]
        lab = components(len(welded), e)
        seed = np.argmin(np.where(low, np.hypot(wx - sl['seed'][0], welded[:, 1] - sl['seed'][1]), 9))
        piece = (lab == lab[seed]) & low
        sel = piece[inv]
        band = (x > sl['xs'][0] - 0.03) & (x < sl['hand']) & (pos[:, 1] >= sl['cut']) & (pos[:, 1] < sl['top'] + 0.01) & (pos[:, 2] < 0.2)
        sel = sel | (band & (np.abs(pos[:, 1] - sl['top']) < 0.012))
        sel &= cloth < 0.02
        sleeve_side[side] = sel
        p = pos[sel]
        print(f'  {side} sleeve piece: {sel.sum()} verts, x {p[:, 0].min():.3f}..{p[:, 0].max():.3f}, y {p[:, 1].min():.3f}..{p[:, 1].max():.3f}')
        sys_ = levels(sl['top'], sl['bottom'], seg)
        fore = at(side + 'ForeArm')
        for cx in sl['xs']:
            pts = []
            for y in sys_:
                k = sel & (np.abs(x - cx) < 0.03) & (np.abs(pos[:, 1] - y) < 0.03)
                z = np.median(pos[k, 2]) if k.sum() > 4 else fore[2]
                pts.append([cx * sign, y, z])
            parent = 'mixamorig:%sForeArm' % side if cx * 1.0 >= abs(fore[0]) - 0.005 else 'mixamorig:%sArm' % side
            chains.append({'kind': 'sleeve', 'side': side, 'parent': parent, 'x': cx, 'points': np.array(pts)})

    # How the body carried each point before: the skin weights of the cloth around it. The game moves a chain's top with
    # these and pulls the rest toward them, so the cloth starts from where the old skin put it (over the thighs, say).
    for ch in chains:
        region = sleeve_side[ch['side']] if ch['kind'] == 'sleeve' else (tabard if ch['kind'] == 'tabard' else in_skirt & ~tabard)
        rows = np.where(region)[0]
        ch['anchors'] = []
        for p in ch['points']:
            d = np.linalg.norm(pos[rows] - p, axis=1)
            near = rows[np.argsort(d)[:16]]
            acc_w = {}
            for v in near:
                for j, w in zip(J[v], W[v]):
                    if w > 0: acc_w[int(j)] = acc_w.get(int(j), 0) + float(w)
            top = sorted(acc_w.items(), key=lambda kv: -kv[1])[:4]
            tot = sum(w for _, w in top)
            ch['anchors'].append({'j': [names[j] for j, _ in top], 'w': [round(w / tot, 4) for _, w in top]})

    # The new bones: one at each point but the last, each the child of the one above, the first of the body bone.
    base = len(names)
    new_nodes = []
    for ci, ch in enumerate(chains):
        ch['joints'] = []
        parent_name, parent_bind = ch['parent'], bind[names.index(ch['parent'])]
        for k in range(seg):
            name = f"cloth_{ch['kind']}_{ci}_{k}"
            p = ch['points'][k]
            pinv = np.linalg.inv(parent_bind)
            local = pinv @ np.r_[p, 1.0]
            rot = pinv[:3, :3]
            q = quat_from_matrix(rot)
            node = {'name': name, 'translation': [float(v) for v in local[:3]], 'rotation': [float(v) for v in q]}
            ni = len(nodes)
            nodes.append(node)
            parent_node = skin['joints'][names.index(parent_name)]
            nodes[parent_node].setdefault('children', []).append(ni)
            skin['joints'].append(ni)
            names.append(name)
            m = np.eye(4); m[:3, 3] = p
            bind = np.concatenate([bind, m[None]], 0)
            ch['joints'].append(name)
            parent_name, parent_bind = name, m
            new_nodes.append(ni)
    idx = {n: i for i, n in enumerate(names)}

    # Weights.
    def give(rows, cw, blend):
        """Mix cloth weights (rows: n x 4 joints, cw: n x 4) into the body's by blend, keeping the four biggest."""
        nonlocal J, W
        allj = np.concatenate([J[rows], cw[0]], 1)
        allw = np.concatenate([W[rows] * (1 - blend[:, None]), cw[1] * blend[:, None]], 1)
        # Merge repeats of the same joint.
        for a in range(8):
            for b in range(a + 1, 8):
                same = (allj[:, a] == allj[:, b]) & (allw[:, b] > 0)
                allw[same, a] += allw[same, b]
                allw[same, b] = 0
        order = np.argsort(-allw, 1)[:, :4]
        nj = np.take_along_axis(allj, order, 1)
        nw = np.take_along_axis(allw, order, 1)
        nw /= nw.sum(1, keepdims=True)
        J[rows] = nj
        W[rows] = nw

    # Skirt (not the tabard): between the two chains either side by angle.
    skirt_chains = [c for c, ch in enumerate(chains) if ch['kind'] == 'skirt']
    angles = np.array([chains[c]['angle'] for c in skirt_chains], float)
    rows = np.where(in_skirt & ~tabard)[0]
    a = np.degrees(np.arctan2(pos[rows, 0] - hips[0], pos[rows, 2] - hips[2]))
    order = np.argsort(angles)
    sa = angles[order]
    sc = np.array(skirt_chains)[order]
    if sk['closed']:
        ext_a = np.r_[sa[-1] - 360, sa, sa[0] + 360]
        ext_c = np.r_[sc[-1], sc, sc[0]]
    else:
        # Open at the front: the skirt runs from -85 round the back to +85. Measure that way round.
        a = np.where(a < 0, a + 360, a)
        sa2 = np.where(sa < 0, sa + 360, sa)
        o2 = np.argsort(sa2)
        ext_a, ext_c = sa2[o2], sc[o2]
    k = np.clip(np.searchsorted(ext_a, a) - 1, 0, len(ext_a) - 2)
    t = np.clip((a - ext_a[k]) / (ext_a[k + 1] - ext_a[k]), 0, 1)
    ca, cb = ext_c[k], ext_c[k + 1]
    i, f = along(pos[rows, 1], ys)
    ja = lambda c, j: np.array([idx[chains[cc]['joints'][jj]] for cc, jj in zip(c, j)])
    cj = np.stack([ja(ca, i), ja(ca, i + 1), ja(cb, i), ja(cb, i + 1)], 1)
    cw = np.stack([(1 - t) * (1 - f), (1 - t) * f, t * (1 - f), t * f], 1)
    give(rows, (cj, cw), cloth[rows])

    if 'tabard' in cfg:
        tc = next(c for c, ch in enumerate(chains) if ch['kind'] == 'tabard')
        rows = np.where(tabard)[0]
        i, f = along(pos[rows, 1], levels(cfg['tabard']['top'], cfg['tabard']['hem'], seg))
        jt = np.array([idx[n] for n in chains[tc]['joints']])
        cj = np.stack([jt[i], jt[i + 1], jt[i], jt[i + 1]], 1)
        cw = np.stack([1 - f, f, 0 * f, 0 * f], 1)
        give(rows, (cj, cw), cloth[rows])

    for side, sign in (('Left', 1), ('Right', -1)):
        cs = [c for c, ch in enumerate(chains) if ch['kind'] == 'sleeve' and ch['side'] == side]
        rows = np.where(sleeve_side[side])[0]
        x = pos[rows, 0] * sign
        x0, x1 = chains[cs[0]]['x'], chains[cs[1]]['x']
        t = np.clip((x - x0) / (x1 - x0), 0, 1)
        i, f = along(pos[rows, 1], levels(sl['top'], sl['bottom'], seg))
        j0 = np.array([idx[n] for n in chains[cs[0]]['joints']])
        j1 = np.array([idx[n] for n in chains[cs[1]]['joints']])
        cj = np.stack([j0[i], j0[i + 1], j1[i], j1[i + 1]], 1)
        cw = np.stack([(1 - t) * (1 - f), (1 - t) * f, t * (1 - f), t * f], 1)
        blend = smooth(sl['blend'][0], sl['blend'][1], pos[rows, 1])
        give(rows, (cj, cw), blend)

    # Write it all back.
    ibm_new = np.linalg.inv(bind).transpose(0, 2, 1).reshape(-1, 16).astype('<f4')
    skin['inverseBindMatrices'] = append(doc, data, ibm_new, 5126, 'MAT4')
    jt = 5123 if len(names) > 255 else 5121
    att['JOINTS_0'] = append(doc, data, J.astype('<u2' if jt == 5123 else 'u1'), jt, 'VEC4')
    att['WEIGHTS_0'] = append(doc, data, W.astype('<f4'), 5126, 'VEC4')
    # How far out her body and dress reach at her sides, by depth under the hips: the sleeves hang outside this.
    body = ~(sleeve_side['Left'] | sleeve_side['Right'])
    ang_b = np.degrees(np.arctan2(pos[:, 0] - hips[0], pos[:, 2] - hips[2]))
    rad_b = np.hypot(pos[:, 0] - hips[0], pos[:, 2] - hips[2])
    side_b = body & (np.abs(np.abs(ang_b) - 90) < 35)
    dress = []
    for y in np.arange(hips[1] + 0.16, 0.0, -0.04):
        k = side_b & (np.abs(pos[:, 1] - y) < 0.02)
        if k.sum() > 4:
            dress.append([round(float(hips[1] - y), 4), round(float(np.percentile(rad_b[k], 98)), 4)])
    print('  dress', dress)
    scene = doc['scenes'][0]
    scene.setdefault('extras', {})['cloth'] = {
        'chains': [{'kind': ch['kind'], 'parent': ch['parent'], 'joints': ch['joints'], 'side': ch.get('side'),
                    'tip': [float(v) for v in ch['points'][-1]], 'angle': ch.get('angle'), 'anchors': ch['anchors']} for ch in chains],
        'closed': sk['closed'],
        'dress': dress,
    }
    doc['buffers'][0]['byteLength'] = len(data)
    meta = json.dumps(doc, separators=(',', ':')).encode()
    meta += b' ' * (-len(meta) % 4)
    data.extend(b'\0' * (-len(data) % 4))
    with open(out, 'wb') as fh:
        fh.write(struct.pack('<5I', 0x46546C67, 2, 28 + len(meta) + len(data), len(meta), 0x4E4F534A))
        fh.write(meta)
        fh.write(struct.pack('<2I', len(data), 0x004E4942))
        fh.write(data)
    counts = {k: sum(1 for c in chains if c['kind'] == k) for k in ('skirt', 'tabard', 'sleeve')}
    print(f'{form}: {len(names)} joints ({len(new_nodes)} cloth), chains {counts}, skirt verts {int((in_skirt & ~tabard).sum())}, '
          f'tabard {int(tabard.sum())}, sleeves {int(sleeve_side["Left"].sum())}+{int(sleeve_side["Right"].sum())}')
    for ch in chains:
        print(' ', ch['kind'], ch.get('angle', ch.get('x')), ch['parent'].replace('mixamorig:', ''), np.round(ch['points'], 3).tolist())


def components(n, edges):
    """Connected components by union-find."""
    parent = np.arange(n)

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a
    for a, b in edges:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb
    return np.array([find(i) for i in range(n)])


def quat_from_matrix(m):
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1) * 2
        return [(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s]
    i = int(np.argmax(np.diag(m)))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = np.sqrt(1 + m[i, i] - m[j, j] - m[k, k]) * 2
    q = [0, 0, 0, 0]
    q[i] = 0.25 * s
    q[j] = (m[j, i] + m[i, j]) / s
    q[k] = (m[k, i] + m[i, k]) / s
    q[3] = (m[k, j] - m[j, k]) / s
    return q


if __name__ == '__main__':
    main()
