"""SURFING.glb with its right arm gone: the left arm alone, rigid, in the view's own space, for src/gfx/renderer.js buildSword. Run with system Python. CAM is where the eye sits in the model; the arm's shape isn't touched."""
import io, json, os, struct, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_items import ITEMS, jpeg, write_glb

SRC = r'F:\!    BM V2\! TRIPO MODELS\FIRST PERSON MODELS\SURFING.glb'
SCALE, CAM = 0.0085, np.array([0.0, 48.0, 25.0])
f = open(SRC, 'rb'); f.read(12)
n, _ = struct.unpack('<II', f.read(8)); g = json.loads(f.read(n))
m, _ = struct.unpack('<II', f.read(8)); b = f.read(m)
def acc(i):
    a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]
    t = {5126: 'f4', 5125: 'u4', 5123: 'u2'}[a['componentType']]; k = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[a['type']]
    return np.frombuffer(b, t, a['count'] * k, v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, k)
def tex(ref, size, q):
    v = g['bufferViews'][g['images'][g['textures'][ref['index']]['source']]['bufferView']]
    im = Image.open(io.BytesIO(b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')
    return jpeg(im.resize((size, size), Image.LANCZOS) if max(im.size) > size else im, q)
pr = g['meshes'][0]['primitives'][0]; at = pr['attributes']
P, N, U, I = acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0']), acc(pr['indices']).reshape(-1, 3)
keep = P[:, 0] < 0        # the left arm: nothing crosses x = 0
tri = I[keep[I].all(1)]
used, inv = np.unique(tri, return_inverse=True)
mat = g['materials'][0]; pbr = mat['pbrMetallicRoughness']
out = os.path.join(ITEMS, 'surf_arm.glb')
write_glb(out, 'surf_arm', ((P[used] - CAM) * SCALE).astype('f4'), N[used].astype('f4'), U[used].astype('f4'), inv.reshape(-1).astype('u4'),
          [tex(pbr['baseColorTexture'], 1024, 88), tex(mat['normalTexture'], 1024, 80), tex(pbr['metallicRoughnessTexture'], 512, 80)])
print(os.path.getsize(out), len(used), len(tri), (P[used] - CAM).min(0) * SCALE, (P[used] - CAM).max(0) * SCALE)
