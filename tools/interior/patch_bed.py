"""A bed moved in the built interior without building all of it again.

tools/interior/build_interior.py builds every room in Blender, and needs the skulls' sheet (tools/build/skulls.json) to do it.
The Halloways' east bed upstairs stood with its headboard through the wall: the board's back lay in the plane of the wall's
outside face, and flickered through it as a dark triangle seen from the square. In the builder it's now 0.1 further in
(`h.bed(4.1, 2.0, U, -1, 0)`); this does the same to the bed that's in assets/game/interior/interior.glb, to its collider in
interior.json, and to where its sleepers lie in assets/game/folk/spots.json. Plain Python, no Blender. A whole build gives
the same bed. It only moves a bed that's still where it was, so running it twice does nothing the second time.

    python tools/interior/patch_bed.py
"""
import json
import os
import struct

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
HOME = 2                        # which of village.json's homes: the Halloways'
WAS, NOW = (4.2, 2.0), (4.1, 2.0)   # the bed's middle on the house's own plan, before and after
MESHES = ('linen', 'wood_c0', 'wood_c1', 'wool_blue', 'cloth_red')   # what a bed and its bedding are made of

with open(os.path.join(ROOT, 'assets', 'game', 'village.json')) as f:
    h = json.load(f)['homes'][HOME]
c, s, k, hd = np.cos(h['yaw']), np.sin(h['yaw']), h['k'], h['d'] / 2


def world(lx, lz):
    """A point on the house's plan, on the ground: the same sum as Frame.p in tools/village/build_village.py."""
    X, Z = lx * k, (lz - hd) * k + hd
    return np.array([h['x'] + X * c + Z * s, h['z'] - X * s + Z * c])


old, new = world(*WAS), world(*NOW)
move = new - old
floor = h['h1'] + 0.3
# Everything of the bed: its frame (2 by 1 on the plan, the headboard 0.05 past its end), from the floor to the top of the board.
half = np.abs(np.array([1.05 * k * c + 0.5 * k * s, 1.05 * k * s + 0.5 * k * c])) + 0.03
inside = lambda p: abs(p[0] - old[0]) < half[0] and abs(p[2] - old[1]) < half[1] and floor - 0.02 < p[1] < floor + 1.2

path = os.path.join(ROOT, 'assets', 'game', 'interior', 'interior.glb')
raw = bytearray(open(path, 'rb').read())
jl = struct.unpack('<I', raw[12:16])[0]
js = json.loads(raw[20:20 + jl])
base = 20 + jl + 8
moved = 0
for mesh in js['meshes']:
    if not mesh['name'].startswith('cath|') or mesh['name'].split('|')[1] not in MESHES:
        continue
    a = js['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
    v = js['bufferViews'][a['bufferView']]
    at = base + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    pos = np.frombuffer(bytes(raw[at:at + a['count'] * 12]), np.float32).reshape(-1, 3).copy()
    hit = np.array([inside(p) for p in pos], bool)
    if not hit.any():
        continue
    pos[hit, 0] += move[0]
    pos[hit, 2] += move[1]
    raw[at:at + a['count'] * 12] = pos.astype(np.float32).tobytes()
    a['min'], a['max'] = pos.min(0).tolist(), pos.max(0).tolist()
    moved += int(hit.sum())
    print(f"{mesh['name']}: {int(hit.sum())} corners moved")
# (The header's the same length give or take the digits of a min and a max: written out again whole.)
head = json.dumps(js, separators=(',', ':')).encode()
head += b' ' * (-len(head) % 4)
body = bytes(raw[base - 8:])
if moved:
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(head) + len(body)))
        f.write(struct.pack('<I4s', len(head), b'JSON') + head)
        f.write(body)

path = os.path.join(ROOT, 'assets', 'game', 'interior', 'interior.json')
data = json.load(open(path))
n = 0
for col in data['colliders']:
    # (The bed's own box: as long and as wide as the bed. Not the little one on it.)
    if abs(col['x'] - old[0]) < 0.02 and abs(col['z'] - old[1]) < 0.02 and max(col['hx'], col['hz']) > 1.0:
        col['x'], col['z'] = round(col['x'] + move[0], 3), round(col['z'] + move[1], 3)
        n += 1
print('colliders moved:', n)
if n:
    with open(path, 'w') as f:
        json.dump(data, f, separators=(',', ':'))

path = os.path.join(ROOT, 'assets', 'game', 'folk', 'spots.json')
spots = json.load(open(path))
n = 0
for sp in spots['houses'][HOME]['spots']:
    if sp['kind'] == 'bed' and abs(sp['x'] - old[0]) < 0.02 and abs(sp['z'] - old[1]) < 0.02:
        sp['x'], sp['z'] = round(sp['x'] + move[0], 3), round(sp['z'] + move[1], 3)
        n += 1
print('beds moved in spots.json:', n)
if n:
    with open(path, 'w') as f:
        json.dump(spots, f, separators=(',', ':'))
