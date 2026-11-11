"""The smith's anvil put into the built interior without building all of it again.

tools/interior/build_interior.py builds every room in Blender, and needs the skulls' sheet (tools/build/skulls.json) to do it.
When only the anvil has changed (Home.anvil) this takes that one piece of furniture out of the file and puts it into
assets/game/interior/interior.glb, in place of the anvil that's there, with its collider in interior.json and the side the smith
stands in assets/game/folk/spots.json. Plain Python, no Blender. A whole build gives the same anvil.

    python tools/interior/patch_anvil.py
"""
import json
import os
import struct

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SMITH = 4                      # which of village.json's homes (the order homes() in build_interior.py unpacks them)
REACH = (0.62, 0.36)           # everything of the old anvil and the new is within this of its middle, along world x and z

src = os.path.join(HERE, 'build_interior.py')
g = {'ROOT_OVERRIDE': ROOT, '__name__': 'patch', '__file__': src}
exec(open(src, encoding='utf8').read(), g)
W = g['W']
with open(os.path.join(ROOT, 'assets', 'game', 'village.json')) as f:
    smith = g['Home'](json.load(f)['homes'][SMITH])
W.zone = 'cath'
F = g['HOME_FLOOR']
smith.anvil(*g['ANVIL'], F, *g['ANVIL_SIDE'])
ox, oz = smith.p(*g['ANVIL'])
inside = lambda p: abs(p[0] - ox) < REACH[0] and abs(p[2] - oz) < REACH[1] and F - 0.01 < p[1] < F + 1.1

# ---- the model ----
path = os.path.join(ROOT, 'assets', 'game', 'interior', 'interior.glb')
raw = open(path, 'rb').read()
jl = struct.unpack('<I', raw[12:16])[0]
js = json.loads(raw[20:20 + jl])
blob = raw[20 + jl + 8:]
views = [bytes(blob[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]) for v in js['bufferViews']]
DT = {5126: np.float32, 5123: np.uint16, 5125: np.uint32}
W_ = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}


def read(i):
    a = js['accessors'][i]
    return np.frombuffer(views[a['bufferView']], DT[a['componentType']], a['count'] * W_[a['type']], a.get('byteOffset', 0)).reshape(-1, W_[a['type']])


def write(i, arr):
    a = js['accessors'][i]
    if a['type'] == 'SCALAR':
        arr = arr.astype(np.uint16 if arr.max(initial=0) < 65535 else np.uint32)
        a['componentType'] = 5123 if arr.dtype == np.uint16 else 5125
    else:
        arr = arr.astype(np.float32)
    views[a['bufferView']] = arr.tobytes()
    a['count'] = len(arr)
    a.pop('byteOffset', None)
    if a['type'] == 'VEC3' and 'min' in a:
        a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()


for (zone, mat), m in W.mats.items():
    mesh = next(x for x in js['meshes'] if x['name'] == f'{zone}|{mat}')
    pr = mesh['primitives'][0]
    at = pr['attributes']
    pos, nrm, uv, idx = read(at['POSITION']), read(at['NORMAL']), read(at['TEXCOORD_0']), read(pr['indices']).reshape(-1, 3)
    old = np.array([all(inside(pos[v]) for v in t) for t in idx], bool)
    keep = idx[~old]
    used = np.unique(keep)
    remap = np.full(len(pos), -1, np.int64)
    remap[used] = np.arange(len(used))
    n = len(m['p'])
    write(at['POSITION'], np.concatenate([pos[used], np.array(m['p'], np.float32)]))
    write(at['NORMAL'], np.concatenate([nrm[used], np.array(m['n'], np.float32)]))
    write(at['TEXCOORD_0'], np.concatenate([uv[used], np.array(m['uv'], np.float32)]))
    write(pr['indices'], np.concatenate([remap[keep].reshape(-1), len(used) + np.arange(n)]))
    print(f'{zone}|{mat}: {int(old.sum())} triangles out, {n // 3} in')

out, off = bytearray(), 0
for v, b in zip(js['bufferViews'], views):
    out += b'\0' * (-len(out) % 4)
    v['byteOffset'], v['byteLength'] = len(out), len(b)
    out += b
out += b'\0' * (-len(out) % 4)
js['buffers'][0]['byteLength'] = len(out)
head = json.dumps(js, separators=(',', ':')).encode()
head += b' ' * (-len(head) % 4)
with open(path, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(head) + 8 + len(out)))
    f.write(struct.pack('<I4s', len(head), b'JSON') + head)
    f.write(struct.pack('<I4s', len(out), b'BIN\0') + bytes(out))

# ---- what the feet run into ----
path = os.path.join(ROOT, 'assets', 'game', 'interior', 'interior.json')
data = json.load(open(path))
was = len(data['colliders'])
data['colliders'] = [c for c in data['colliders'] if not (abs(c['x'] - ox) < 0.2 and abs(c['z'] - oz) < 0.2 and c['hx'] < 0.7 and c['hz'] < 0.7 and c['h'] < 2)]
print(f"colliders: {was - len(data['colliders'])} out, {len(W.colliders)} in")
data['colliders'] += W.colliders
with open(path, 'w') as f:
    json.dump(data, f, separators=(',', ':'))

# ---- the side the smith stands (tools/folk/spots.py reads the same off a whole build) ----
path = os.path.join(ROOT, 'assets', 'game', 'folk', 'spots.json')
spots = json.load(open(path))
nx, nz = g['ANVIL_SIDE']
for h in spots['houses']:
    for s in h['spots']:
        if s['kind'] == 'anvil':
            s['dir'] = [round(nx * smith.c + nz * smith.s, 3) + 0.0, round(-nx * smith.s + nz * smith.c, 3) + 0.0]
            print('the smith stands', s['dir'], 'of it')
with open(path, 'w') as f:
    json.dump(spots, f, separators=(',', ':'))
