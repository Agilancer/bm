"""Cuts the gems out of GEM STONES COLLECTION - 1.glb to assets/game/items/skull_gems.glb, and finds where they can sit on the held skull: each anchor is cast from the game's camera onto the baked skull_arm.glb, so whatever it hits the holder can see. Writes src/gfx/skullgemdata.js. Run skull_arm.py first, with system Python."""
import io, json, os, struct, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_items import ITEMS, jpeg, write_glb

SRC = r'F:\!    BM V2\! TRIPO MODELS\Gems\GEM STONES COLLECTION - 1.glb'
CUTS = {'diamond': 0, 'sapphire': 5, 'ruby': 15, 'emerald': 10, 'amethyst': 2, 'topaz': 3, 'empty': 12}   # by piece, largest first
MID, EYE_Y = 402, 527    # the skull's midline and eye line on a 1440 x 810 screen
MIDS = {'crown': 454, 'fore': 471, 'high': 487, 'glab': 503, 'bridge': 520, 'nose': 534}
PAIRS = {'browI': (22, 498), 'browM': (42, 496), 'browO': (62, 500), 'foreI': (20, 480), 'foreO': (42, 477), 'hairI': (24, 460), 'temple': (68, 489), 'underI': (24, 553), 'underO': (44, 556), 'cheek': (64, 552)}

def load(path):
    f = open(path, 'rb'); f.read(12)
    n, _ = struct.unpack('<II', f.read(8)); g = json.loads(f.read(n))
    m, _ = struct.unpack('<II', f.read(8)); b = f.read(m)
    def acc(i):
        a = g['accessors'][i]; v = g['bufferViews'][a['bufferView']]
        t = {5126: 'f4', 5125: 'u4', 5123: 'u2'}[a['componentType']]; k = {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[a['type']]
        return np.frombuffer(b, t, a['count'] * k, v.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, k)
    pr = g['meshes'][0]['primitives'][0]; at = pr['attributes']
    return g, b, acc(at['POSITION']), acc(at['NORMAL']), acc(at['TEXCOORD_0']), acc(pr['indices']).reshape(-1, 3)

g, b, P, N, U, I = load(SRC)
key = np.round(P * 1e4).astype('i8'); _, w = np.unique(key, axis=0, return_inverse=True); w = w.reshape(-1); par = np.arange(w.max() + 1)
def find(x):
    while par[x] != x: par[x] = par[par[x]]; x = par[x]
    return x
for a, c, d in w[I]:
    r = find(a)
    for o in (c, d):
        q = find(o)
        if q != r: par[q] = r
root = np.array([find(i) for i in range(len(par))])[w]; u, c = np.unique(root, return_counts=True); order = u[np.argsort(-c)]
pos, nrm, uv, idx, table, base = [], [], [], [], {}, 0
for name, piece in CUTS.items():
    keep = root == order[piece]; tri = I[keep[I].all(1)]
    centre = (P[keep].min(0) + P[keep].max(0)) / 2; size = np.linalg.norm(P[keep] - centre, axis=1).max()
    # Fewer points: a gem is twenty pixels across on the screen, and its facets are painted. Welded only where the texture agrees.
    cell = np.c_[np.round((P - centre) / size * 11), np.round(U * 180)].astype('i8')
    used = np.unique(tri); _, inv, cnt = np.unique(cell[used], axis=0, return_inverse=True, return_counts=True); inv = inv.reshape(-1)
    remap = np.full(len(P), -1); remap[used] = inv
    t2 = remap[tri]; t2 = t2[(t2[:, 0] != t2[:, 1]) & (t2[:, 1] != t2[:, 2]) & (t2[:, 0] != t2[:, 2])]
    mean = lambda A: np.stack([np.bincount(inv, A[used][:, k], len(cnt)) / cnt for k in range(A.shape[1])], 1)
    p2, n2, u2 = (mean(P) - centre) / size, mean(N), mean(U)
    n2 /= np.maximum(np.linalg.norm(n2, axis=1, keepdims=True), 1e-6)
    table[name] = {'v': [base, len(p2)], 'i': [sum(len(x) for x in idx), t2.size]}
    pos.append(p2); nrm.append(n2); uv.append(u2); idx.append((t2 + base).reshape(-1)); base += len(p2)
    print(name, 'verts', len(p2), 'tris', len(t2))
def tex(ref, size, q):
    v = g['bufferViews'][g['images'][g['textures'][ref['index']]['source']]['bufferView']]
    im = Image.open(io.BytesIO(b[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')
    return im.resize((size, size), Image.LANCZOS)
mat = g['materials'][0]; pbr = mat['pbrMetallicRoughness']
mr = tex(pbr['metallicRoughnessTexture'], 256, 80); mr = Image.merge('RGB', (Image.new('L', mr.size, 0), *mr.split()[1:]))    # (R is the bone mask: none here.)
out = os.path.join(ITEMS, 'skull_gems.glb')
write_glb(out, 'skull_gems', np.vstack(pos).astype('f4'), np.vstack(nrm).astype('f4'), np.vstack(uv).astype('f4'), np.concatenate(idx).astype('u4'),
          [jpeg(tex(pbr['baseColorTexture'], 1024, 90), 90), jpeg(tex(mat['normalTexture'], 512, 80), 80), jpeg(mr, 80)])
print('glb', os.path.getsize(out))

# The anchors.
_, _, A, AN, _, AI = load(os.path.join(ITEMS, 'skull_arm.glb'))
T = A[AI]; c0 = T.mean(1); near = np.linalg.norm(c0 - np.array([-0.483, -0.159, -0.783]), axis=1) < 0.24; T = T[near]
def cast(px, py):
    d = np.array([(px - 720) / 405 * 0.7813, (405 - py) / 405 * 0.7813, -1.0]); d /= np.linalg.norm(d)
    e1, e2 = T[:, 1] - T[:, 0], T[:, 2] - T[:, 0]; h = np.cross(d, e2); a = (e1 * h).sum(1); ok = np.abs(a) > 1e-9
    s = -T[:, 0]; uu = (s * h).sum(1) / np.where(ok, a, 1); q = np.cross(s, e1); vv = (q @ d) / np.where(ok, a, 1); t = (e2 * q).sum(1) / np.where(ok, a, 1)
    hit = ok & (uu >= 0) & (vv >= 0) & (uu + vv <= 1) & (t > 0)
    if not hit.any(): raise SystemExit(f'no hit at {px},{py}')
    i = np.argmin(np.where(hit, t, 9e9)); n = np.cross(e1[i], e2[i]); n /= np.linalg.norm(n)
    # (Smoothed over a little round about, so a gem doesn't lie along one pit in the bone.)
    p = d * t[i]; close = np.linalg.norm(T.mean(1) - p, axis=1) < 0.018
    ns = np.cross(e1[close], e2[close]); ns /= np.maximum(np.linalg.norm(ns, axis=1, keepdims=True), 1e-9); ns *= np.sign(ns @ -d)[:, None]
    n = ns.mean(0); n /= np.linalg.norm(n)
    return [round(float(x), 4) for x in (*p, *n)]
anchors = {k: cast(MID, y) for k, y in MIDS.items()}
for k, (dx, y) in PAIRS.items():
    anchors[k + 'L'] = cast(MID - (min(dx, 47) if y < 530 else dx), y); anchors[k + 'R'] = cast(MID + dx, y)
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'gfx', 'skullgemdata.js')
open(path, 'w', newline='\n').write('// Made by tools/wizard/skull_gems.py. Where each gem lies in skull_gems.glb, and each place on the held skull: x, y, z, then its normal, in the view\'s own space.\n' +
    'export const GEM_CUTS = ' + json.dumps(table) + ';\nexport const SKULL_ANCHORS = ' + json.dumps(anchors) + ';\n')
print(len(anchors), 'anchors')
