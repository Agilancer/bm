"""Give every Mixamo-rigged monster in roster.py its family's moves, borrowed from Pretty Lisandra.

    python tools/monsters/humanoids.py [ids...]

Writes assets/monsters/tripo/<id>.glb (mesh, 1024 textures, the chosen clips) and merges its entry into
assets/monsters/tripo/roster.json. Tripo stores these joints as matrices, which glTF can't animate, so they are turned
into rotation and translation first. Clips go across with tools/lisandra/transfer_clips.py: each bone takes the world
turn its Lisandra partner makes away from her rest pose. Hips keep their bob and sway; their travel over the ground is
taken out, since the game moves the body. Rotations are stored as normalised shorts.
"""
import io
import json
import os
import re
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'lisandra'))
sys.path.insert(0, HERE)
from transfer_clips import Rig, alignments, load, qfrom_mat, qinv, qnorm, qrot, transfer  # noqa: E402
import roster  # noqa: E402
from transfer_clips import qmul  # noqa: E402

LISANDRA = os.path.join(ROOT, 'assets', 'game', 'lisandra', 'pretty.glb')
OUT = os.path.join(ROOT, 'assets', 'monsters', 'tripo')
TEX = {0: 1024, 1: 512, 2: 1024}   # base colour, metal/rough, normal (by slot order below)


def decompose(doc):
    for n in doc['nodes']:
        m = n.pop('matrix', None)
        if m is None:
            continue
        M = np.array(m, float).reshape(4, 4).T
        t = M[:3, 3]
        s = np.linalg.norm(M[:3, :3], axis=0)
        R = M[:3, :3] / s
        if np.linalg.det(R) < 0:
            s[0] *= -1
            R[:, 0] *= -1
        n['translation'] = t.tolist()
        n['rotation'] = qnorm(qfrom_mat(R)).tolist()
        if np.abs(s - 1).max() > 1e-4:
            n['scale'] = s.tolist()


class Writer:
    """A fresh binary buffer: copies what is kept from the source and appends new data."""

    def __init__(self, doc, buf):
        self.doc, self.src = doc, buf
        self.buf = bytearray()
        self.views = []

    def raw(self, data, target=None):
        while len(self.buf) % 4:
            self.buf.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.buf), 'byteLength': len(data)}
        if target:
            v['target'] = target
        self.buf += data
        self.views.append(v)
        return len(self.views) - 1

    def acc(self, arr, kind, ctype=5126, normalized=False, minmax=False):
        arr = np.ascontiguousarray(arr)
        a = {'bufferView': self.raw(arr.tobytes()), 'componentType': ctype, 'count': int(arr.shape[0]), 'type': kind}
        if normalized:
            a['normalized'] = True
        if minmax:
            a['min'] = [float(x) for x in np.min(arr, 0).ravel()]
            a['max'] = [float(x) for x in np.max(arr, 0).ravel()]
        self.doc['accessors'].append(a)
        return len(self.doc['accessors']) - 1


def rebuild(doc, src):
    """Copy every accessor's view and every image into a new buffer, dropping old animations; shrink textures."""
    old_views = doc['bufferViews']
    doc['animations'] = []
    # Keep only what the meshes and skins use: the source's own clips go.
    used = set()
    for m in doc['meshes']:
        for p in m['primitives']:
            used.update(p['attributes'].values())
            if 'indices' in p:
                used.add(p['indices'])
    used.update(s['inverseBindMatrices'] for s in doc.get('skins', []) if 'inverseBindMatrices' in s)
    remap, keep = {}, []
    for i, a in enumerate(doc['accessors']):
        if i in used:
            remap[i] = len(keep)
            keep.append(a)
    doc['accessors'] = keep
    for m in doc['meshes']:
        for p in m['primitives']:
            p['attributes'] = {k: remap[v] for k, v in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = remap[p['indices']]
            p.pop('targets', None)
    for s in doc.get('skins', []):
        if 'inverseBindMatrices' in s:
            s['inverseBindMatrices'] = remap[s['inverseBindMatrices']]
    w = Writer(doc, src)
    moved = {}
    for a in doc['accessors']:
        vi = a.get('bufferView')
        if vi is None:
            continue
        if vi not in moved:
            v = old_views[vi]
            data = bytes(src[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
            nv = w.raw(data, v.get('target'))
            if 'byteStride' in v:
                w.views[nv]['byteStride'] = v['byteStride']
            moved[vi] = nv
        a['bufferView'] = moved[vi]
    # Which slot each image fills, for its size.
    slot = {}
    for m in doc.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for key, s in (('baseColorTexture', 0), ('metallicRoughnessTexture', 1)):
            if key in pbr:
                slot[doc['textures'][pbr[key]['index']]['source']] = s
        if 'normalTexture' in m:
            slot[doc['textures'][m['normalTexture']['index']]['source']] = 2
    for i, im in enumerate(doc.get('images', [])):
        v = old_views[im['bufferView']]
        img = Image.open(io.BytesIO(bytes(src[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])))
        size = TEX.get(slot.get(i, 0), 1024)
        if max(img.size) > size:
            img = img.resize((size, size), Image.LANCZOS)
        out = io.BytesIO()
        alpha = img.mode in ('RGBA', 'LA') and np.asarray(img.getchannel('A')).min() < 250
        if alpha:
            img.save(out, 'PNG', optimize=True)
            im['mimeType'] = 'image/png'
        else:
            img.convert('RGB').save(out, 'JPEG', quality=86)
            im['mimeType'] = 'image/jpeg'
        im['bufferView'] = w.raw(out.getvalue())
    doc['bufferViews'] = w.views
    return w


def strip_travel(hips, base, rest_t):
    """Take the hips' drift over the ground out of a clip, keeping bob and sway. Over the ground the clip starts and
    ends over the rest spot (some source clips start half a metre off it)."""
    world = qrot(np.broadcast_to(base, (len(hips), 4)), hips - rest_t)
    n = len(hips)
    ramp = np.linspace(0, 1, n)[:, None]
    for k in (0, 2):
        world[:, k] -= world[0, k] + (world[-1, k] - world[0, k]) * ramp[:, 0]
        # and whatever lunge is left keeps no more than 15 cm of its reach
        world[:, k] = np.clip(world[:, k], -0.15, 0.15)
    return rest_t + qrot(np.broadcast_to(qinv(base), (n, 4)), world)


def face_front(rots, hips, j, base, restR, rest_t, chain=()):
    """Some of Lisandra's clips run off at an angle (her hips turned 90 or 180 degrees for the whole clip). Turn the
    clip back so on average the hips face the way they face at rest, and centre their reach over the rest spot."""
    n = len(rots)
    B = np.broadcast_to(base, (n, 4))
    W = qmul(B, rots[:, j])
    rest_w = qmul(base, restR[j])
    for c in chain:   # judge by the chest: crouches twist the hips under a chest that faces front
        W = qmul(W, rots[:, c])
        rest_w = qmul(rest_w, restR[c])
    d = qmul(W, np.broadcast_to(qinv(rest_w), (n, 4)))
    f = qrot(d, np.broadcast_to([0.0, 0, 1], (n, 3)))
    yaw = np.arctan2(f[:, 0], f[:, 2])
    mean = np.arctan2(np.sin(yaw).mean(), np.cos(yaw).mean())
    if abs(np.degrees(mean)) > 30:
        c = np.array([0, np.sin(-mean / 2), 0, np.cos(-mean / 2)])
        fix = qmul(qmul(np.broadcast_to(qinv(base), (n, 4)), np.broadcast_to(c, (n, 4))), B)
        rots[:, j] = qmul(fix, rots[:, j])
        if hips is not None:
            off = qrot(B, hips - rest_t)
            off = qrot(np.broadcast_to(c, (n, 4)), off)
            hips = rest_t + qrot(np.broadcast_to(qinv(base), (n, 4)), off)
    if hips is not None:   # start over the rest spot, not wherever the source clip began
        off = qrot(B, hips - rest_t)
        off[:, [0, 2]] -= off[:, [0, 2]].mean(0)
        hips = rest_t + qrot(np.broadcast_to(qinv(base), (n, 4)), off)
    return rots, hips, np.degrees(mean)


def _qa(axis, deg):
    h = np.radians(np.asarray(deg, float)) / 2
    return np.concatenate([np.asarray(axis, float) * np.sin(h)[..., None], np.cos(h)[..., None]], -1)


def scream(rots, new, times):
    """On top of a roar: the head thrown back, the chest out, the arms flung wide, a shake at the peak.
    Turns are about the world's axes (X to the creature's left, Y up, Z forward), put into each joint's parent frame at
    rest: local' = (P^-1 G P) local."""
    n = len(times)
    d = max(times[-1], 1e-3)
    u = times / d
    e = np.clip((u - 0.08) / 0.2, 0, 1) * np.clip((0.97 - u) / 0.22, 0, 1)
    e = e * e * (3 - 2 * e)
    shake = np.sin(times * 38) * 2.5 * e
    short = [nm.split(':')[-1] for nm in new.names]
    plan = {'Spine1': _qa([1, 0, 0], -8 * e), 'Spine2': _qa([1, 0, 0], -10 * e), 'Neck': _qa([1, 0, 0], -12 * e - shake),
            'Head': _qa([1, 0, 0], -22 * e + shake),
            'LeftArm': _qa([0, 0, 1], 38 * e), 'RightArm': _qa([0, 0, 1], -38 * e),
            'LeftForeArm': _qa([0, 1, 0], -20 * e), 'RightForeArm': _qa([0, 1, 0], 20 * e)}
    for k, G in plan.items():
        if k not in short:
            continue
        j = short.index(k)
        p = new.parent[j]
        P = new.worldR[p] if p >= 0 else new.base
        conj = qmul(qmul(np.broadcast_to(qinv(P), (n, 4)), G), np.broadcast_to(P, (n, 4)))
        rots[:, j] = qmul(conj, rots[:, j])
    return rots


def hunch(rots, new, deg):
    """Bent forward through the spine by deg, the neck and head turned back up to look ahead, the arms hanging low."""
    n = len(rots)
    short = [nm.split(':')[-1] for nm in new.names]
    plan = {'Spine': deg * 0.3, 'Spine1': deg * 0.35, 'Spine2': deg * 0.35, 'Neck': -deg * 0.45, 'Head': -deg * 0.4,
            'LeftArm': deg * 0.5, 'RightArm': deg * 0.5}
    for k, d in plan.items():
        if k in short:
            j = short.index(k)
            p = new.parent[j]
            P = new.worldR[p] if p >= 0 else new.base
            G = np.broadcast_to(_qa([1, 0, 0], d), (n, 4))
            rots[:, j] = qmul(qmul(qmul(np.broadcast_to(qinv(P), (n, 4)), G), np.broadcast_to(P, (n, 4))), rots[:, j])
    return rots


def spread(rots, new, deg):
    """Arms held out from the sides by deg, on every frame."""
    n = len(rots)
    short = [nm.split(':')[-1] for nm in new.names]
    for k, sg in (('LeftArm', 1), ('RightArm', -1)):
        if k in short:
            j = short.index(k)
            p = new.parent[j]
            P = new.worldR[p] if p >= 0 else new.base
            G = np.broadcast_to(_qa([0, 0, 1], sg * deg), (n, 4))
            rots[:, j] = qmul(qmul(qmul(np.broadcast_to(qinv(P), (n, 4)), G), np.broadcast_to(P, (n, 4))), rots[:, j])
    return rots


def skirt_weights(doc, buf, new, H):
    """Cloth away from the leg bones (a skirt's shell) moves most of its leg weight onto the hips."""
    from rig_humanoid import mesh_world
    names = [doc['nodes'][j].get('name', '') for j in doc['skins'][0]['joints']]
    short = [n.split(':')[-1] for n in names]
    if 'Hips' not in short:
        return 0
    hips = short.index('Hips')
    pos = lambda k: new.worldP[new.at[names[short.index(k)]]] if k in short else None
    segs = {}
    for sd in ('Left', 'Right'):
        pts = [pos(sd + k) for k in ('UpLeg', 'Leg', 'Foot')]
        if None in [p is None for p in pts] or any(p is None for p in pts):
            continue
        for k in ('UpLeg', 'Leg'):
            segs[short.index(sd + k)] = pts
    r0, band = 0.045 * H, 0.04 * H
    moved = 0
    for ni, pi, Pw, *_ in mesh_world(doc, buf):
        pr = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        aj, aw = doc['accessors'][pr['attributes']['JOINTS_0']], doc['accessors'][pr['attributes']['WEIGHTS_0']]
        if aw['componentType'] != 5126 or aj['componentType'] not in (5121, 5123) or aj.get('byteOffset', 0) or aw.get('byteOffset', 0):
            continue
        jt = np.uint8 if aj['componentType'] == 5121 else np.uint16
        oj = doc['bufferViews'][aj['bufferView']].get('byteOffset', 0)
        ow = doc['bufferViews'][aw['bufferView']].get('byteOffset', 0)
        J = np.frombuffer(buf, jt, aw['count'] * 4, oj).reshape(-1, 4).astype(int)
        W = np.frombuffer(buf, np.float32, aw['count'] * 4, ow).reshape(-1, 4).copy()

        def dseg(P, a, b):
            ab = b - a
            t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
            return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)
        f = np.zeros(len(W))
        for c in range(4):
            for j, (a, b, c_) in segs.items():
                m = (J[:, c] == j) & (W[:, c] > 0)
                if m.any():
                    d = np.minimum(dseg(Pw[m], a, b), dseg(Pw[m], b, c_))
                    f[m] = np.maximum(f[m], 0.85 * np.clip((d - r0) / band, 0, 1))
        rows = np.nonzero(f > 0)[0]
        for v in rows:
            take = 0.0
            for c in range(4):
                if J[v, c] in segs:
                    take += W[v, c] * f[v]
                    W[v, c] *= 1 - f[v]
            hs = np.nonzero(J[v] == hips)[0]
            c = hs[0] if len(hs) else int(np.argmin(W[v]))
            if not len(hs):
                take += W[v, c]
                W[v, c] = 0
                J[v, c] = hips
            W[v, c] += take
        moved += len(rows)
        buf[oj:oj + J.size * np.dtype(jt).itemsize] = J.astype(jt).tobytes()
        buf[ow:ow + W.nbytes] = (W / np.maximum(W.sum(1, keepdims=True), 1e-9)).astype(np.float32).tobytes()
    return moved


def tail_weights(doc, buf, new):
    """A tail Tripo hung off both thighs at once swings forward between the feet on every stride: below the hips,
    any vertex held by both legs goes onto the hips alone."""
    from rig_humanoid import mesh_world
    names = [doc['nodes'][j].get('name', '') for j in doc['skins'][0]['joints']]
    short = [n.split(':')[-1] for n in names]
    if not {'Hips', 'LeftUpLeg', 'RightUpLeg'} <= set(short):
        return 0
    hips, lu, ru = short.index('Hips'), short.index('LeftUpLeg'), short.index('RightUpLeg')
    legs = {i for i, n in enumerate(short) if n.startswith(('Left', 'Right')) and any(k in n for k in ('UpLeg', 'Leg', 'Foot', 'Toe'))}
    hy = new.worldP[new.at[names[hips]]][1]
    moved = 0
    for ni, pi, Pw, *_ in mesh_world(doc, buf):
        pr = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        aj, aw = doc['accessors'][pr['attributes']['JOINTS_0']], doc['accessors'][pr['attributes']['WEIGHTS_0']]
        if aw['componentType'] != 5126 or aj['componentType'] not in (5121, 5123) or aj.get('byteOffset', 0) or aw.get('byteOffset', 0):
            continue
        jt = np.uint8 if aj['componentType'] == 5121 else np.uint16
        oj = doc['bufferViews'][aj['bufferView']].get('byteOffset', 0)
        ow = doc['bufferViews'][aw['bufferView']].get('byteOffset', 0)
        J = np.frombuffer(buf, jt, aw['count'] * 4, oj).reshape(-1, 4).astype(int)
        W = np.frombuffer(buf, np.float32, aw['count'] * 4, ow).reshape(-1, 4).copy()
        both = (((J == lu) & (W > 0.05)).any(1)) & (((J == ru) & (W > 0.05)).any(1)) & (Pw[:, 1] < hy)
        for v in np.nonzero(both)[0]:
            take = sum(W[v, c] for c in range(4) if J[v, c] in legs)
            for c in range(4):
                if J[v, c] in legs:
                    W[v, c] = 0
            hs = np.nonzero(J[v] == hips)[0]
            c = hs[0] if len(hs) else int(np.argmin(W[v]))
            if not len(hs):
                take += W[v, c]
                W[v, c] = 0
                J[v, c] = hips
            W[v, c] += take
        moved += int(both.sum())
        buf[oj:oj + J.size * np.dtype(jt).itemsize] = J.astype(jt).tobytes()
        buf[ow:ow + W.nbytes] = (W / np.maximum(W.sum(1, keepdims=True), 1e-9)).astype(np.float32).tobytes()
    return moved


def build(entry, lis, lis_anims):
    import wings  # (here: wings imports this module)
    doc, buf = load(roster.src_path(entry))
    buf = bytearray(buf)
    decompose(doc)
    new = Rig(doc, buf)
    if entry['id'].startswith(roster.SKIRTS):
        print(f"  {skirt_weights(doc, buf, new, new.worldP[:, 1].max() * 1.1)} skirt vertices now hang off the hips")
    if entry['id'].startswith(roster.TAILS):
        print(f"  {tail_weights(doc, buf, new)} tail vertices now hang off the hips")
    A, _ = alignments(lis, new)
    hn = next(n for n in new.names if n.endswith('Hips'))
    scale = new.worldP[new.at[hn]][1] / lis.worldP[lis.at[hn]][1]
    w = rebuild(doc, buf)
    hip_node = new.nodes[new.at[hn]]
    rest_t = np.array(doc['nodes'][hip_node].get('translation', [0.0, 0, 0]))
    chest = [new.at[n] for k in ('Spine', 'Spine1', 'Spine2') for n in new.names if n.split(':')[-1] == k]
    clips = {}
    plan = roster.clips_for(entry['family'], entry['id'])
    if entry.get('breath'):
        plan['breath'] = (roster.ROAR, 4.0, 7.0)   # the scream: head forward, mouth wide
    wing_j = [new.at.get(n) for n in wings.WING]
    for game, spec in plan.items():
        name, t0, t1 = spec[:3]
        rate = (spec[3] if len(spec) > 3 else 1.0) * entry.get('rate', 1.0)
        anim = lis_anims[name]
        times, rots, hips = transfer(lis, new, anim, A, scale)
        if hips is not None:   # transfer copies the hips' move in Lisandra's frame: turn it into this rig's
            hj = new.at[hn]
            d = qrot(np.broadcast_to(lis.base, (len(hips), 4)), hips - new.restT[hj])
            hips = new.restT[hj] + qrot(np.broadcast_to(qinv(new.base), (len(hips), 4)), d)
        keep = (times >= t0 - 1e-6) & ((times <= t1 + 1e-6) if t1 else True)
        times, rots = (times[keep] - times[keep][0]) / rate, rots[keep]
        hips = None if hips is None else hips[keep]
        if len(times) < 2:
            times = np.array([0.0, 1 / 30])
            rots = np.repeat(rots[:1], 2, 0)
            hips = None if hips is None else np.repeat(hips[:1], 2, 0)
        if hips is not None:
            hips = strip_travel(hips, new.base, rest_t)
        if game == 'roar' and entry['family'] != 'caster':
            rots = scream(rots, new, times)
        turned = 0
        if game.startswith(('idle', 'walk', 'run')):   # moves and falls may swing any way round
            rots, hips, turned = face_front(rots, hips, new.at[hn], new.base, new.restR, rest_t, chest)
        # overlays after facing: a chest bent far forward would read as turned round
        hk = next((v for k, v in roster.HUNCH.items() if entry['id'].startswith(k)), 0)
        if hk and game.startswith(('walk', 'run')):
            rots = hunch(rots, new, hk)
        elif hk and entry['id'] in roster.HUNCH_ALL and game.startswith(('idle', 'atk', 'roar')):
            rots = hunch(rots, new, hk if game.startswith('atk') else hk / 2)
        pick = lambda t: next((v for k_, v in (t.items() if isinstance(t, dict) else ((x, True) for x in t)) if entry['id'].startswith(k_)), None)
        if pick(roster.DAMP_ARMS):
            k = pick(roster.DAMP_ARMS)
            if game.startswith(('atk', 'death')):   # strikes and falls swing hardest: keep the wings open
                k = max(k, 0.82)
            for j, nm in enumerate(new.names):
                if re.search(r'(Shoulder|Arm|ForeArm|Hand)$', nm):
                    r0 = np.broadcast_to(new.restR[j], rots[:, j].shape)
                    sg = np.sign(np.sum(rots[:, j] * r0, -1, keepdims=True)) + 1e-9
                    q = (1 - k) * rots[:, j] + k * r0 * sg
                    rots[:, j] = q / np.linalg.norm(q, axis=-1, keepdims=True)
        if pick(roster.STILL_FINGERS):
            for j, nm in enumerate(new.names):
                if re.search(r'Hand(Thumb|Index|Middle|Ring|Pinky)', nm):
                    rots[:, j] = new.restR[j]
        if pick(roster.SPREAD):
            rots = spread(rots, new, pick(roster.SPREAD))
        if abs(turned) > 30:
            print(f'   {game}: turned {turned:+.0f} deg back to the front')
        if None not in wing_j:
            F = wings.flaps(game, times, hover=entry['family'] == 'flyer')
            for k, j in enumerate(wing_j):
                rots[:, j] = qmul(np.broadcast_to(new.restR[j], (len(times), 4)), F[:, k])
        t_acc = w.acc(times[:, None].astype(np.float32), 'SCALAR', minmax=True)
        samplers, channels = [], []
        for j, node in enumerate(new.nodes):
            track = rots[:, j]
            if np.abs(track - track[:1]).max() < 1e-4 and min(np.abs(track[0] - new.restR[j]).max(),
                                                              np.abs(track[0] + new.restR[j]).max()) < 1e-4:
                continue
            q = np.round(np.clip(track, -1, 1) * 32767).astype(np.int16)
            samplers.append({'input': t_acc, 'output': w.acc(q, 'VEC4', 5122, True), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': 'rotation'}})
        if hips is not None:
            samplers.append({'input': t_acc, 'output': w.acc(hips.astype(np.float32), 'VEC3'), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': hip_node, 'path': 'translation'}})
        doc['animations'].append({'name': game, 'samplers': samplers, 'channels': channels})
        clips[game] = round(float(times[-1]), 3)
    if entry['id'].startswith(roster.TWO_SIDED):
        for m in doc.get('materials', []):
            m['doubleSided'] = True
    doc['buffers'] = [{'byteLength': len(w.buf)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(w.buf) % 4:
        w.buf.append(0)
    path = os.path.join(OUT, entry['id'] + '.glb')
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(w.buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(w.buf), 0x004E4942) + bytes(w.buf))
    cf = next((v for k_, v in roster.CULL.items() if entry['id'].startswith(k_)), None)
    if cf:   # wing membrane between arm and leg tears: drop what any move stretches
        import stretch
        print(f"  {stretch.cull(entry['id'], factor=cf, islands=0.006)} stretched triangles dropped")
    if entry['id'] in roster.LIFT:   # baked too dark to read in the game's light
        import texture
        texture.lift(entry['id'], roster.LIFT[entry['id']])
    import atlas   # many pieces, each its own colour map: one piece, one sheet, for the game's renderer
    atlas.merge(entry['id'])
    # Standing height in the file's own units, for scaling to entry['height'].
    top = new.worldP[:, 1].max()
    meta = {k: v for k, v in entry.items() if k != 'src'}
    if entry['family'] == 'flyer':
        meta['hover'] = roster.HOVER
    if entry.get('breath'):
        # The jaw sits in front of and below the head joint. The viewer reads the direction in the head bone's own frame,
        # and Tripo rigs can turn that frame a quarter turn off the body: aim from the head's rest turn, not a constant.
        head = next(i for i, n in enumerate(new.names) if n.endswith('Head'))
        d = qrot(qinv(new.worldR[head]), np.array([0, -0.15, 1.0]))
        meta.update(mouthOff=0.06, mouthDir=[round(float(x), 3) for x in d / np.linalg.norm(d)])
    meta.update(kind='humanoid', clips=clips, rigTop=round(float(top), 4), bytes=os.path.getsize(path))
    print(f"{entry['id']:24s} {len(clips)} clips  {os.path.getsize(path) / 1e6:.1f} MB", flush=True)
    return meta


def save_roster(metas):
    path = os.path.join(OUT, 'roster.json')
    cur = json.load(open(path)) if os.path.exists(path) else {}
    for m in metas:
        arms = roster.arms_for(m['id'])
        if arms:
            m['arms'] = arms
        cur[m['id']] = m
    json.dump(cur, open(path, 'w'), indent=1)


def main(ids):
    os.makedirs(OUT, exist_ok=True)
    ldoc, lbuf = load(LISANDRA)
    lis = Rig(ldoc, lbuf)
    lis_anims = {a['name']: a for a in ldoc['animations']}
    todo = [e for e in roster.H if not ids or e['id'] in ids or e.get('group') in ids]
    metas = []
    for e in todo:
        if not os.path.exists(roster.src_path(e)):
            print('missing source, skipped:', e['id'])
            continue
        metas.append(build(e, lis, lis_anims))
        save_roster(metas[-1:])


if __name__ == '__main__':
    main(sys.argv[1:])
