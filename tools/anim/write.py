# Puts motions (tools/anim/export.py, from Blender) into the game's files.
#
#   python tools/anim/write.py glb <file.glb> <motions folder> [--drop walk,run] [--rename run=run_old] [--out other.glb]
#       each motion becomes an animation of that name in the GLB (one of that name already there is replaced): a rotation
#       track for every joint that moves and a translation track for the hips. Nothing else in the file is touched: mesh,
#       skin, joints, bind pose and pictures are the same bytes. scenes[0].extras.clips gets each clip's loop and travel.
#   python tools/anim/write.py bank <clips.json> <clips.bin> <motions folder> [--prefix A_]
#       each motion is packed onto the end of the heroes' clip bank (assets/game/clips.*), on the master skeleton.
import json, os, struct, sys
import numpy as np


def qmul(a, b):
    w1, x1, y1, z1 = a[..., 0], a[..., 1], a[..., 2], a[..., 3]; w2, x2, y2, z2 = b[..., 0], b[..., 1], b[..., 2], b[..., 3]
    return np.stack([w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2, w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2, w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2], -1)

def qinv(a): return a * np.array([1, -1, -1, -1.0])

def qrot(q, v):
    p = np.concatenate([[0.0], v]); return qmul(qmul(q, p), qinv(q))[1:]

def wxyz(q): return np.array([q[3], q[0], q[1], q[2]], float)      # glTF's x, y, z, w
def xyzw(q): return np.stack([q[..., 1], q[..., 2], q[..., 3], q[..., 0]], -1)


def same_side(q):
    q = q.copy()
    for i in range(1, len(q)):
        if (q[i] * q[i - 1]).sum() < 0: q[i] = -q[i]
    return q


def load_glb(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    js = json.loads(b[20:20 + n])
    o = 20 + n
    m = struct.unpack('<I', b[o:o + 4])[0]
    return js, bytearray(b[o + 8:o + 8 + m])


def save_glb(path, js, blob):
    j = json.dumps(js, separators=(',', ':')).encode()
    j += b' ' * (-len(j) % 4)
    blob = bytes(blob) + b'\0' * (-len(blob) % 4)
    out = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(j) + 8 + len(blob)) + struct.pack('<I4s', len(j), b'JSON') + j + struct.pack('<I4s', len(blob), b'BIN\0') + blob
    open(path, 'wb').write(out)


def rest_worlds(js):
    """Each node's rest in the world: a turn, and the 3x3 that takes its children's places into the world."""
    nodes = js['nodes']
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get('children', []): parent[c] = i
    Rw, Mw = {}, {}
    def go(i):
        if i in Rw: return
        n = nodes[i]
        q = wxyz(n.get('rotation', [0, 0, 0, 1])); s = np.array(n.get('scale', [1, 1, 1]), float)
        if 'matrix' in n: raise ValueError('a node with a matrix: not handled')
        m = quat_mat(q) * s
        if i in parent:
            go(parent[i]); p = parent[i]
            Rw[i] = qmul(Rw[p], q); Mw[i] = Mw[p] @ m
        else: Rw[i] = q; Mw[i] = m
    for i in range(len(nodes)): go(i)
    return parent, Rw, Mw


def quat_mat(q):
    w, x, y, z = q
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def locals_of(js, mo):
    """A motion as the file's own joints have it: node -> local turns (frames x 4, w first), and the hips' local places."""
    parent, Rw, Mw = rest_worlds(js)
    by = {n.get('name'): i for i, n in enumerate(js['nodes'])}
    F = mo['frames']
    turns = {by[b]: np.array(t, float) for b, t in mo['turns'].items() if b in by}
    missing = [b for b in mo['turns'] if b not in by]
    if missing: raise ValueError(f'bones not in the file: {missing[:6]}')
    one = np.tile(np.array([1.0, 0, 0, 0]), (F, 1))
    def turn(i):                      # how node i is turned from rest: its own, or the nearest moving one above it
        while i is not None:
            if i in turns: return turns[i]
            i = parent.get(i)
        return one
    out = {}
    for i in turns:
        p = parent.get(i)
        wj = qmul(turns[i], Rw[i][None])
        if p is None: loc = wj
        else: loc = qmul(qinv(qmul(turn(p), Rw[p][None])), wj)
        out[i] = same_side(loc / np.linalg.norm(loc, axis=1, keepdims=True))
    h = by[mo['hips']]; p = parent.get(h)
    d = np.array(mo['hips_delta'], float) * mo.get('hips_scale', 1.0)      # (a body bigger than the skeleton the file's for)
    rest_t = np.array(js['nodes'][h].get('translation', [0, 0, 0]), float)
    inv = np.linalg.inv(Mw[p]) if p is not None else np.eye(3)
    hips = rest_t[None] + d @ inv.T
    return out, h, hips


def glb(path, folder, drop=(), out=None, rename=None):
    js, blob = load_glb(path)
    # (An old clip kept under another name, for comparing: only if that name isn't already there, so a second run doesn't
    # put the new clip in the old one's place.)
    have = {a.get('name') for a in js.get('animations', [])}
    for a in js.get('animations', []):
        to = (rename or {}).get(a.get('name'))
        if to and to not in have: a['name'] = to
    motions = [json.load(open(os.path.join(folder, f))) for f in sorted(os.listdir(folder)) if f.endswith('.json')]
    names = {m['name'] for m in motions} | set(drop)
    anims = [a for a in js.get('animations', []) if a.get('name') not in names]
    js['animations'] = anims
    compact(js, blob)
    blob = bytearray(blob_of(js))
    def view(data):
        while len(blob) % 4: blob.append(0)
        js['bufferViews'].append(dict(buffer=0, byteOffset=len(blob), byteLength=len(data)))
        blob.extend(data)
        return len(js['bufferViews']) - 1
    def acc(arr, typ, minmax=False):
        a = dict(bufferView=view(arr.astype('<f4').tobytes()), componentType=5126, count=len(arr), type=typ)
        if minmax: a['min'] = [float(arr.min())]; a['max'] = [float(arr.max())]
        js['accessors'].append(a)
        return len(js['accessors']) - 1
    extras = js['scenes'][0].setdefault('extras', {})
    info = extras.setdefault('clips', {})
    for n in drop: info.pop(n, None)
    for mo in motions:
        loc, h, hips = locals_of(js, mo)
        F = mo['frames']
        t = acc(np.linspace(0, mo['seconds'], F), 'SCALAR', True)
        samplers, channels = [], []
        for node, q in sorted(loc.items()):
            samplers.append(dict(input=t, output=acc(xyzw(q), 'VEC4'), interpolation='LINEAR'))
            channels.append(dict(sampler=len(samplers) - 1, target=dict(node=node, path='rotation')))
        samplers.append(dict(input=t, output=acc(hips, 'VEC3'), interpolation='LINEAR'))
        channels.append(dict(sampler=len(samplers) - 1, target=dict(node=h, path='translation')))
        js['animations'].append(dict(name=mo['name'], samplers=samplers, channels=channels))
        info[mo['name']] = {k: v for k, v in dict(loop=bool(mo.get('loop')), travel=mo.get('travel') and round(mo['travel'], 4), speed=mo.get('speed'), steps=mo.get('steps'), gait=mo.get('gait')).items() if v is not None}
        print(f"  {mo['name']}: {F} frames, {mo['seconds']:.3f} s, {len(loc)} joints")
    js['buffers'][0]['byteLength'] = len(blob) + (-len(blob) % 4)
    save_glb(out or path, js, blob)
    print(out or path, f'{os.path.getsize(out or path) / 1048576:.2f} MB')


_BLOB = {}
def blob_of(js): return _BLOB[id(js)]


def compact(js, blob):
    """Drops the accessors and buffer views nothing uses any more (a replaced clip's), and closes the gaps."""
    used = set()
    for m in js.get('meshes', []):
        for p in m['primitives']:
            used.update(p.get('attributes', {}).values())
            if 'indices' in p: used.add(p['indices'])
            for t in p.get('targets', []): used.update(t.values())
    for s in js.get('skins', []):
        if 'inverseBindMatrices' in s: used.add(s['inverseBindMatrices'])
    for a in js.get('animations', []):
        for s in a['samplers']: used.update([s['input'], s['output']])
    amap = {old: new for new, old in enumerate(sorted(used))}
    js['accessors'] = [js['accessors'][i] for i in sorted(used)]
    for m in js.get('meshes', []):
        for p in m['primitives']:
            p['attributes'] = {k: amap[v] for k, v in p['attributes'].items()}
            if 'indices' in p: p['indices'] = amap[p['indices']]
            if 'targets' in p: p['targets'] = [{k: amap[v] for k, v in t.items()} for t in p['targets']]
    for s in js.get('skins', []):
        if 'inverseBindMatrices' in s: s['inverseBindMatrices'] = amap[s['inverseBindMatrices']]
    for a in js.get('animations', []):
        for s in a['samplers']: s['input'] = amap[s['input']]; s['output'] = amap[s['output']]
    vused = {a['bufferView'] for a in js['accessors'] if 'bufferView' in a} | {im['bufferView'] for im in js.get('images', []) if 'bufferView' in im}
    for a in js['accessors']:
        if 'sparse' in a: raise ValueError('sparse accessors: not handled')
    vmap = {}; views = []; new = bytearray()
    for old in sorted(vused):
        v = dict(js['bufferViews'][old])
        while len(new) % 4: new.append(0)
        o = v.get('byteOffset', 0)
        data = blob[o:o + v['byteLength']]
        v['byteOffset'] = len(new); new.extend(data)
        vmap[old] = len(views); views.append(v)
    js['bufferViews'] = views
    for a in js['accessors']:
        if 'bufferView' in a: a['bufferView'] = vmap[a['bufferView']]
    for im in js.get('images', []):
        if 'bufferView' in im: im['bufferView'] = vmap[im['bufferView']]
    _BLOB[id(js)] = new


def bank(meta_path, bin_path, folder, prefix=''):
    meta = json.load(open(meta_path))
    raw = open(bin_path, 'rb').read()
    cut = meta['pelvisByteOffset']
    rot = np.frombuffer(raw[:cut], '<i2').copy(); pel = np.frombuffer(raw[cut:], '<f4').copy()
    skel = meta['skeleton']
    # The master skeleton as a file's nodes would have it, for locals_of.
    js = dict(nodes=[dict(name=s['name'], translation=s['t'], rotation=s['r'], children=[i for i, c in enumerate(skel) if c['parent'] == k]) for k, s in enumerate(skel)])
    motions = [json.load(open(os.path.join(folder, f))) for f in sorted(os.listdir(folder)) if f.endswith('.json')]
    # (Packed again: a clip of that name already in the bank is left where it lies and no longer pointed at. To keep the
    # bank from growing each time, the rotations past the last clip that isn't ours are cut off first.)
    ours = {prefix + m['name'] for m in motions}
    keep = {n: c for n, c in meta['clips'].items() if n not in ours}
    end_r = max(max((t[1] + (4 if t[2] else c['frames'] * 4)) for t in c['tracks']) for c in keep.values())
    end_p = max(c['pelvis'] + c['frames'] * 3 for c in keep.values())
    rot = rot[:end_r]; pel = pel[:end_p]
    meta['clips'] = keep
    chunks = []; off = len(rot); pchunks = []; poff = len(pel)
    for mo in motions:
        loc, h, hips = locals_of(js, mo)
        F = mo['frames']
        tracks = []
        for j in range(len(skel)):
            if j in loc: q = xyzw(loc[j])
            else: q = np.tile(np.array(skel[j]['r'], float), (F, 1))
            still = np.abs(q - q[0]).max() < 2e-4
            data = np.round((q[:1] if still else q) * 32767).astype('<i2').reshape(-1)
            tracks.append([j, off, 1 if still else 0]); chunks.append(data); off += data.size
        pchunks.append(hips.astype('<f4').reshape(-1))
        name = prefix + mo['name']
        k = mo.get('hips_scale', 1.0)
        # (stride: how far a loop goes and the pace it was made for, on the master skeleton: a body's own are these by its motionScale.)
        meta['clips'][name] = dict(frames=F, dur=mo['seconds'], loop=True, tracks=tracks, pelvis=poff, stride=dict(travel=round(mo['travel'] * k, 4), pace=round(mo.get('speed') * k, 4), steps=mo.get('steps')))
        poff += F * 3
        print(f'  {name}: {F} frames, {mo["seconds"]:.3f} s')
    rot = np.concatenate([rot] + chunks)
    if len(rot) % 2: rot = np.concatenate([rot, np.zeros(1, '<i2')])
    pel = np.concatenate([pel] + pchunks)
    meta['pelvisByteOffset'] = len(rot) * 2
    open(bin_path, 'wb').write(rot.astype('<i2').tobytes() + pel.astype('<f4').tobytes())
    json.dump(meta, open(meta_path, 'w'), separators=(',', ':'))
    print(bin_path, f'{os.path.getsize(bin_path) / 1048576:.2f} MB')


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if a[0] == 'glb': glb(a[1], a[2], drop=[n for n in (opt('--drop') or '').split(',') if n], out=opt('--out'), rename=dict(p.split('=') for p in (opt('--rename') or '').split(',') if p))
    elif a[0] == 'bank': bank(a[1], a[2], a[3], prefix=opt('--prefix', ''))
    else: print(__doc__)
