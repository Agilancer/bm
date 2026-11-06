"""HUMAN HAND SKULL.glb with its right hand gone: the left arm and the skull it holds, one fused mesh, rigid, in the view's own space, for src/gfx/renderer.js buildSword. Run with system Python. The shape isn't touched: one uniform SCALE, sized to the staff arm's elbow-to-knuckle, and one rigid turn and place. AT goes in SKULL_AT in renderer.js."""
import io, json, os, struct, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_items import ITEMS, jpeg, write_glb

SRC = r'F:\!    BM V2\! TRIPO MODELS\FIRST PERSON MODELS\HUMAN HAND SKULL.glb'
SCALE = 1.05
PIVOT = np.array([-0.119, 0.55, -0.061])     # the skull's middle in the model
FACING = (24.0, -7.0, 15.0)                   # how the skull sits in the model, degrees: its face turned toward +x, pitched up, rolled (its right side higher)
WARM = (0.34, 0.44)    # bone to skin, by how much redder than blue
FIX = (0.0, 0.0, 0.0)                        # by eye after that: yaw, pitch, roll
AT = np.array(json.loads(sys.argv[1])) if len(sys.argv) > 1 else np.array([-0.483, -0.159, -0.783])   # the skull's middle in the view
if len(sys.argv) > 2: FIX = tuple(json.loads(sys.argv[2]))
def frame(yaw, pitch, roll):
    # Columns right, up, forward, for a face looking along forward.
    y, p, r = np.radians([yaw, pitch, roll])
    f = np.array([np.sin(y) * np.cos(p), np.sin(p), np.cos(y) * np.cos(p)])
    x = np.cross([0, 1, 0], f); x /= np.linalg.norm(x); u = np.cross(f, x)
    return np.stack([x * np.cos(r) + u * np.sin(r), -x * np.sin(r) + u * np.cos(r), f], 1)
# The whole arm turns as one so the skull looks straight at the eye (at the view's origin), level with the screen.
f_t = -AT / np.linalg.norm(AT)
x_t = np.cross([0, 1, 0], f_t); x_t /= np.linalg.norm(x_t)
TURN = np.stack([x_t, np.cross(f_t, x_t), f_t], 1) @ frame(*FACING).T @ frame(*FIX).T
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
keep = P[:, 0] < 0        # the left arm and skull: the right hand is a separate piece, all of it past x = 0.135
tri = I[keep[I].all(1)]
used, inv = np.unique(tri, return_inverse=True)
mat = g['materials'][0]; pbr = mat['pbrMetallicRoughness']
V = (P[used] - PIVOT) @ TURN.T * SCALE + AT
NV = N[used] @ TURN.T
out = os.path.join(ITEMS, 'skull_arm.glb')
# Which of the texture is bone, in the metal-roughness map's red, for the palette swaps: inside the skull's shape, and not the colour of skin.
from PIL import ImageDraw, ImageFilter
BODY_C, BODY_R = np.array([-0.122, 0.547, -0.125]), np.array([0.135, 0.17, 0.19])
ATLAS = 2048
v_ = g['bufferViews'][g['images'][g['textures'][pbr['baseColorTexture']['index']]['source']]['bufferView']]
alb = np.asarray(Image.open(io.BytesIO(b[v_.get('byteOffset', 0):v_.get('byteOffset', 0) + v_['byteLength']])).convert('RGB').resize((512, 512), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5))).astype('f4')
c_ = alb[(U[:, 1] % 1 * 511).astype(int), (U[:, 0] % 1 * 511).astype(int)]
warm = (c_[:, 0] - c_[:, 2]) / np.maximum(c_[:, 0], 1); bright = c_.mean(1)
score = np.clip((WARM[1] - warm) / (WARM[1] - WARM[0]), 0, 1); score[bright < 75] = 1
score *= ((P - BODY_C) / BODY_R) ** 2 @ np.ones(3) < 1
score[(P[:, 1] > 0.52) & (P[:, 0] > -0.24) & (((P - BODY_C) / BODY_R) ** 2 @ np.ones(3) < 1)] = 1    # (All cranium up here, however pink.)
score[(P[:, 1] < 0.52) & (P[:, 0] < -0.205)] = 0                                                         # (The thumb, beside the cheek.)
# Along the mesh, not the texels: stains on bone and shadows on skin make no holes. (Welded: the UV seams split vertices.)
key = np.round(P * 1e4).astype('i8'); _, weld = np.unique(key, axis=0, return_inverse=True); weld = weld.reshape(-1)
S_ = np.bincount(weld, score) / np.bincount(weld); W = weld[tri]; ends = np.r_[W[:, [0, 1]], W[:, [1, 2]], W[:, [2, 0]]]
for _ in range(14):
    sum_ = np.zeros(len(S_)); cnt = np.zeros(len(S_))
    np.add.at(sum_, ends[:, 0], S_[ends[:, 1]]); np.add.at(cnt, ends[:, 0], 1); np.add.at(sum_, ends[:, 1], S_[ends[:, 0]]); np.add.at(cnt, ends[:, 1], 1)
    S_ = (S_ + sum_) / (1 + cnt)
isbone = S_[weld] > 0.5
shape = Image.new('L', (ATLAS, ATLAS), 0); dr = ImageDraw.Draw(shape)
for tr in tri[isbone[tri].sum(1) >= 2]:
    dr.polygon([(U[v, 0] % 1 * ATLAS, U[v, 1] % 1 * ATLAS) for v in tr], fill=255)
maskIm = shape.filter(ImageFilter.GaussianBlur(2)).resize((1024, 1024), Image.LANCZOS)
print('bone share', round(float(isbone[used].mean()), 3))
rm = tex(pbr['metallicRoughnessTexture'], 1024, 90); rm = Image.open(io.BytesIO(rm)).convert('RGB').resize((1024, 1024))
rmb = io.BytesIO(); Image.merge('RGB', (maskIm, *rm.split()[1:])).save(rmb, 'JPEG', quality=92, subsampling=0); rm_bytes = rmb.getvalue()
write_glb(out, 'skull_arm', V.astype('f4'), NV.astype('f4'), U[used].astype('f4'), inv.reshape(-1).astype('u4'),
          [tex(pbr['baseColorTexture'], 2048, 88), tex(mat['normalTexture'], 1024, 80), rm_bytes])
print(os.path.getsize(out), V.min(0).round(3), V.max(0).round(3), 'SKULL_AT', AT.round(3).tolist())
cut = V[P[used][:, 1] < 0.02]
print('cut slope (frame edge 0.78)', (cut[:, 1] / cut[:, 2]).min().round(3), 'z', cut[:, 2].max().round(3))
# How deep each socket is along the eye's ray, for src/gfx/skulleyes.js: (screen x, y at 1440x810) as seen in the game.
if len(sys.argv) > 3:
    D = np.linalg.norm(V, axis=1); D_ = V / D[:, None]
    for name, px, py in json.loads(sys.argv[3]):
        r = np.array([(px - 720) / 405 * 0.7813, (405 - py) / 405 * 0.7813, -1.0]); r /= np.linalg.norm(r)
        for R in (0.006, 0.012, 0.02, 0.03):
            near = D_ @ r > np.cos(R)
            print(name, 'cone', R, 'n', near.sum(), 'depths', np.percentile(D[near], [0, 25, 50, 75, 100]).round(3) if near.any() else None)
