"""After skull_hold.py, with system Python: Blender's export of skull_arm.glb carries stray objects and a png; this keeps the arm alone, in the form src/gfx/renderer.js buildSword reads."""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_items import ITEMS, jpeg, mr_map, write_glb, FLAT

path = os.path.join(ITEMS, 'skull_arm.glb')
b = open(path, 'rb').read()
n = struct.unpack('<I', b[12:16])[0]
g = json.loads(b[20:20 + n])
bin_ = b[20 + n + 8:]
def view(i):
    v = g['bufferViews'][i]
    return bin_[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
def acc(i, dt, w):
    a = g['accessors'][i]
    return np.frombuffer(view(a['bufferView']), dt, a['count'] * w, a.get('byteOffset', 0)).reshape(-1, w) if w > 1 else np.frombuffer(view(a['bufferView']), dt, a['count'], a.get('byteOffset', 0))
m = next(x for x in g['meshes'] if x['name'] != 'Cube')
pr = m['primitives'][0]
at = pr['attributes']
idx_a = g['accessors'][pr['indices']]
idx = acc(pr['indices'], {5123: 'u2', 5125: 'u4'}[idx_a['componentType']], 1).astype('u4')
mat = g['materials'][pr['material']]
pbr = mat.get('pbrMetallicRoughness', {})
def tex(ref, size=1024, q=88):
    if not ref: return None
    im = Image.open(io.BytesIO(view(g['images'][g['textures'][ref['index']]['source']]['bufferView']))).convert('RGB')
    if max(im.size) > size: im = im.resize((size, size), Image.LANCZOS)
    return jpeg(im, q)
print(mat.get('name'), 'albedo', 'baseColorTexture' in pbr, 'normal', 'normalTexture' in mat, 'mr', 'metallicRoughnessTexture' in pbr)
images = [tex(pbr.get('baseColorTexture')) or jpeg(Image.new('RGB', (4, 4), (200, 150, 120))), tex(mat.get('normalTexture'), q=80) or FLAT, tex(pbr.get('metallicRoughnessTexture'), 512, 80) or mr_map(0.6)]
pos, nrm, uv = acc(at['POSITION'], 'f4', 3), acc(at['NORMAL'], 'f4', 3), acc(at['TEXCOORD_0'], 'f4', 2)
# The arm's whole-arm move is on its node, not in its vertices: bake it in, since the game reads vertices alone.
node = next(x for x in g['nodes'] if x.get('mesh') == g['meshes'].index(m))
M = np.eye(4)
if 'matrix' in node: M = np.array(node['matrix'], dtype=float).reshape(4, 4).T
else:
    qx, qy, qz, qw = node.get('rotation', [0, 0, 0, 1])
    M[:3, :3] = [[1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
                 [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
                 [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)]]
    M[:3, :3] = M[:3, :3] @ np.diag(node.get('scale', [1, 1, 1]))
    M[:3, 3] = node.get('translation', [0, 0, 0])
print('node transform', np.round(M[:3, 3], 3))
pos = (pos @ M[:3, :3].T + M[:3, 3]).astype('f4')
nrm = nrm @ np.linalg.inv(M[:3, :3])
nrm = (nrm / np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)).astype('f4')
write_glb(path, 'skull_arm', pos, nrm, uv, idx, images)
print(os.path.getsize(path), len(pos), pos.min(0), pos.max(0))
