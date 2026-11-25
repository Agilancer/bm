"""The wizard's robe, made to sit on him as the owner's model has it (assets/game/player/wizard.glb):

    python tools/player/robe_rig.py <wizard.glb before> <wizard.glb out>      (Python 3.12 with NumPy)

The source is the wizard as the third-person gaits left it (main before this tool: `git show 718153ab:assets/game/player/wizard.glb`).
Its figures were found and checked on the model posed in Blender (through the Blender MCP): the strap with the arms down,
forward and raised, and which vertices go on the cloth.

Two things, and nothing else in the file is touched (mesh, clips, pictures are the same bytes; only the skin's joints, weights
and bind matrices are new, and the scene's extras get `cloth`):

1. The strap across his back, between the two round medallions. It was skinned partly to the upper arms (up to a third), so
   when the arms come down from the T-pose it was modelled in, or the game puts them where they hold the staff and skull,
   it folded into a V. The shoulder blades ride the collarbones, not the arms: on the back, inside the shoulder joints, the
   upper arm's share goes to its collarbone (fading out toward the shoulder, so the shoulder caps still go with the arm).

2. The back of his tabard. The back panel and the rear of the skirt were skinned ~85% to the thighs, so they wrapped each
   leg like trousers: a leg kicked back took the cloth with it. Now they hang from chains of bones that the game swings
   with gravity (src/sim/cloth.js): they trail as he runs and a leg only pushes them out of its way. The front (the
   centre panel and the flaps over the thighs) stays as it was.
"""
import json
import os
import struct
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lisandra'))
from cloth_rig import accessor, along, append, levels, load, quat_from_matrix, seg_dist, smooth  # noqa: E402

# glTF space: y up, +z ahead, +x his left. Angles round him: 0 ahead, +90 his left, 180 behind.
STRAP = {'in': 0.14, 'out': 0.195, 'back': (-0.07, -0.11), 'low': (1.18, 1.24), 'high': (1.56, 1.62)}
ROBE = {
    'angles': [120, 150, 180, -150, -120],   # the chains, round the back
    'top': 0.93, 'hem': 0.57, 'segments': 3,
    'hem_cut': 0.605, 'panel': (14, 26), 'panel_drop': 0.06,   # where the skirt's hem is, round the back (see below)
    'into_body': (0.93, 0.87),               # the cloth comes off the body over this much height under the belt
    'side': (88, 112),                       # and off the skinned front over these angles
    'ease': 12,                              # passes easing the cloth's share over the surface
    'off_leg': (0.075, 0.09),                # what's nearer a thigh's line than this is the trouser leg, not the skirt
}


def joints_weights(J, W, rows, add_j, add_w):
    """Merge more joints into rows of a 4-influence skin, keeping the four biggest."""
    allj = np.concatenate([J[rows], add_j], 1)
    allw = np.concatenate([W[rows], add_w], 1)
    n = allj.shape[1]
    for a in range(n):
        for b in range(a + 1, n):
            same = (allj[:, a] == allj[:, b]) & (allw[:, b] > 0)
            allw[same, a] += allw[same, b]
            allw[same, b] = 0
    order = np.argsort(-allw, 1)[:, :4]
    nj = np.take_along_axis(allj, order, 1)
    nw = np.take_along_axis(allw, order, 1)
    nw /= np.maximum(nw.sum(1, keepdims=True), 1e-9)
    J[rows] = np.where(nw > 0, nj, 0)
    W[rows] = nw


def main():
    src, out = sys.argv[1], sys.argv[2]
    doc, data = load(src)
    scene = doc['scenes'][0]
    if 'cloth' in scene.get('extras', {}):
        sys.exit('already rigged: run it on the wizard from before (see the top of this file)')
    skin = doc['skins'][0]
    prim = doc['meshes'][0]['primitives'][0]
    att = prim['attributes']
    pos = accessor(doc, data, att['POSITION']).astype(np.float64)
    J = accessor(doc, data, att['JOINTS_0']).astype(np.int64)
    W = accessor(doc, data, att['WEIGHTS_0']).astype(np.float64)
    J0, W0 = J.copy(), W.copy()
    ibm = accessor(doc, data, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
    nodes = doc['nodes']
    names = [nodes[j]['name'] for j in skin['joints']]
    bind = np.linalg.inv(ibm)
    idx = {n: i for i, n in enumerate(names)}
    at = lambda n: bind[idx[n]][:3, 3]
    x, y, z = pos[:, 0], pos[:, 1], pos[:, 2]

    # ---- 1. the strap across the back ----
    s = STRAP
    f = (1 - smooth(s['in'], s['out'], np.abs(x))) * smooth(-s['back'][0], -s['back'][1], -z) \
        * smooth(*s['low'], y) * (1 - smooth(*s['high'], y))
    moved = 0
    for side, sgn in (('L', 1), ('R', -1)):
        arm = np.array([idx[n] for n in names if n.startswith(side + '_Upperarm')])
        rows = np.where((f > 0) & (x * sgn > 0) & np.isin(J, arm).any(1))[0]
        if not len(rows):
            continue
        on_arm = np.isin(J[rows], arm) & (W[rows] > 0)
        take = (W[rows] * on_arm) * f[rows, None]
        W[rows] -= take
        give = take.sum(1)
        joints_weights(J, W, rows, np.full((len(rows), 1), idx[side + '_Clavicle']), give[:, None])
        moved += len(rows)
    print(f'strap: {moved} verts off the upper arms onto the collarbones')

    # ---- 2. the back of the tabard ----
    r = ROBE
    c = (at('L_Thigh') + at('R_Thigh')) / 2
    ang = np.degrees(np.arctan2(x - c[0], z - c[2]))
    rad = np.hypot(x - c[0], z - c[2])
    # (From the thigh's line and the shin's: under the knee, from the thigh's alone, the calves and boot tops looked far off it.)
    leg = np.minimum.reduce([seg_dist(pos, at(f'{s}_Thigh'), at(f'{s}_Calf')) for s in 'LR'] + [seg_dist(pos, at(f'{s}_Calf'), at(f'{s}_Foot')) for s in 'LR'])
    under = 1 - smooth(r['into_body'][1], r['into_body'][0], y)            # 0 at the belt, 1 a few cm under it
    round_ = smooth(r['side'][0], r['side'][1], np.abs(ang))                # 0 at his sides and front, 1 behind
    off_leg = smooth(r['off_leg'][0], r['off_leg'][1], leg)
    # Under the skirt's hem is the trouser leg, which the bones' lines don't tell apart (they run well forward in the legs,
    # and round the back the legs stand as far out from his middle as the skirt). All round the back the skirt ends at one
    # height: going down, the vertices stop (between the legs) or the surface steps in to the leg (at 0.58 m to 0.62 m).
    # (The back panel's point hangs a few centimetres under the flaps' hems: there the cut is lower.)
    panel = 1 - smooth(r['panel'][0], r['panel'][1], 180 - np.abs(ang))
    cut = r['hem_cut'] - r['panel_drop'] * panel
    above = smooth(cut - 0.02, cut + 0.005, y)
    cloth = under * round_ * off_leg * above * (y < r['top'] + 0.02)
    # Eased over the surface (each vertex toward its neighbours, a few times over), so nowhere does the cloth's share jump
    # from one vertex to the next: a jump is where the skin tears as the cloth swings off the body.
    welded, inv = np.unique(np.round(pos, 5), axis=0, return_inverse=True)
    inv = inv.ravel()
    tri = accessor(doc, data, prim['indices']).reshape(-1, 3)
    e = inv[tri][:, [0, 1, 1, 2, 2, 0]].reshape(-1, 2)
    e = np.unique(np.sort(e[e[:, 0] != e[:, 1]], 1), axis=0)
    cw_ = np.zeros(len(welded))
    np.maximum.at(cw_, inv, cloth)
    deg = np.bincount(e.ravel(), minlength=len(welded)).astype(float)
    for _ in range(r['ease']):
        acc = np.bincount(e[:, 0], cw_[e[:, 1]], len(welded)) + np.bincount(e[:, 1], cw_[e[:, 0]], len(welded))
        cw_ = np.where(deg > 0, 0.5 * cw_ + 0.5 * acc / np.maximum(deg, 1), cw_)
    cloth = cw_[inv] * (y > r['hem'] - 0.12) * (np.abs(ang) > r['side'][0] - 12)
    jump = np.abs(cw_[e[:, 0]] - cw_[e[:, 1]])
    print(f'  biggest step in the cloth share between neighbours: {jump.max():.2f} (edges over 0.25: {(jump > 0.25).sum()})')
    sel = cloth > 0.02
    ys = levels(r['top'], r['hem'], r['segments'])

    def surface(a, yy):
        d = (ang - a + 180) % 360 - 180
        k = sel & (np.abs(d) < 12) & (np.abs(y - yy) < 0.025)
        return np.percentile(rad[k], 90) if k.sum() > 4 else None

    chains = []
    for a in r['angles']:
        pts = []
        for yy in ys:
            rr = surface(a, yy)
            if rr is None:   # (under the hem: carry on down the line above)
                rr = pts[-1][3] if pts else 0.15
            pts.append([c[0] + np.sin(np.radians(a)) * rr, yy, c[2] + np.cos(np.radians(a)) * rr, rr])
        pts = np.array(pts)
        chains.append({'kind': 'skirt', 'parent': 'Pelvis', 'angle': a, 'points': pts[:, :3]})
        print(f'  chain {a:5d}: radius', np.round(pts[:, 3], 3).tolist(), 'off the thigh line',
              np.round([min(seg_dist(p[None], at('L_Thigh'), at('L_Calf'))[0], seg_dist(p[None], at('R_Thigh'), at('R_Calf'))[0]) for p in pts[:, :3]], 3).tolist())

    # How the old skin carried each point: the game moves a chain's top so, and starts the cloth from there.
    rows_all = np.where(sel)[0]
    for ch in chains:
        ch['anchors'] = []
        for p in ch['points']:
            d = np.linalg.norm(pos[rows_all] - p, axis=1)
            near = rows_all[np.argsort(d)[:16]]
            acc = {}
            for v in near:
                for j, w in zip(J0[v], W0[v]):
                    if w > 0:
                        acc[int(j)] = acc.get(int(j), 0) + float(w)
            top = sorted(acc.items(), key=lambda kv: -kv[1])[:4]
            tot = sum(w for _, w in top)
            ch['anchors'].append({'j': [names[j] for j, _ in top], 'w': [round(w / tot, 4) for _, w in top]})

    # The bones: one at each point but the last, each the child of the one above, the first of the pelvis. Bound unturned.
    seg = r['segments']
    for ci, ch in enumerate(chains):
        ch['joints'] = []
        parent_name, parent_bind = ch['parent'], bind[idx[ch['parent']]]
        for k in range(seg):
            name = f'cloth_skirt_{ci}_{k}'
            p = ch['points'][k]
            pinv = np.linalg.inv(parent_bind)
            local = pinv @ np.r_[p, 1.0]
            q = quat_from_matrix(pinv[:3, :3])
            ni = len(nodes)
            nodes.append({'name': name, 'translation': [float(v) for v in local[:3]], 'rotation': [float(v) for v in q]})
            nodes[skin['joints'][idx[parent_name]]].setdefault('children', []).append(ni)
            skin['joints'].append(ni)
            idx[name] = len(names)
            names.append(name)
            m = np.eye(4)
            m[:3, 3] = p
            bind = np.concatenate([bind, m[None]], 0)
            ch['joints'].append(name)
            parent_name, parent_bind = name, m

    # Weights: between the two chains either side by angle (measured round the back, 120 .. 240), and down them by height.
    rows = rows_all
    a = np.where(ang[rows] < 0, ang[rows] + 360, ang[rows])
    ca = np.array([ch['angle'] % 360 for ch in chains], float)
    order = np.argsort(ca)
    ca = ca[order]
    k = np.clip(np.searchsorted(ca, a) - 1, 0, len(ca) - 2)
    t = np.clip((a - ca[k]) / (ca[k + 1] - ca[k]), 0, 1)
    i, fy = along(y[rows], ys)
    jid = lambda cc, jj: np.array([idx[chains[order[c1]]['joints'][j1]] for c1, j1 in zip(cc, jj)])
    cj = np.stack([jid(k, i), jid(k, i + 1), jid(k + 1, i), jid(k + 1, i + 1)], 1)
    cw = np.stack([(1 - t) * (1 - fy), (1 - t) * fy, t * (1 - fy), t * fy], 1) * cloth[rows, None]
    W[rows] *= (1 - cloth[rows, None])
    joints_weights(J, W, rows, cj, cw)
    print(f'robe: {len(rows)} verts onto {len(chains)} chains of {seg} bones ({int((cloth > 0.98).sum())} wholly)')

    # ---- write ----
    ibm_new = np.linalg.inv(bind).transpose(0, 2, 1).reshape(-1, 16).astype('<f4')
    skin['inverseBindMatrices'] = append(doc, data, ibm_new, 5126, 'MAT4')
    assert len(names) < 256
    att['JOINTS_0'] = append(doc, data, J.astype('u1'), 5121, 'VEC4')
    att['WEIGHTS_0'] = append(doc, data, W.astype('<f4'), 5126, 'VEC4')
    scene.setdefault('extras', {})['cloth'] = {
        'chains': [{'kind': ch['kind'], 'parent': ch['parent'], 'joints': ch['joints'], 'tip': [float(v) for v in ch['points'][-1]],
                    'angle': ch['angle'], 'anchors': ch['anchors']} for ch in chains],
        'closed': False,
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
    print(f'{out}: {len(names)} joints')


if __name__ == '__main__':
    main()
