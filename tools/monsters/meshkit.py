"""Mesh surgery on the game's one-piece skinned models, with no Blender: read a glb into arrays, cut and join pieces, pose it
by one of its clips, draw it to a picture, and write it back with its skeleton and clips as they were.

Used by possessed_knights.py and knight_variants.py (Velscour's knights) and tools/knights/fifthwatch.py (the paladin).

The raw mesh of a Tripo monster has +X to the front, +Y up, Z across the shoulders (the T-pose arms run along Z), about a
metre from fingertip to fingertip; its skeleton turns that so it stands with X across and +Z to the front, which is the
space posed() and rest_world() answer in and everything here is worked out in. The game scales it by roster.json's
height / rigTop (rigTop is the head bone's height: the top of the head is a tenth or so over `height`).
"""
import io
import json
import os
import struct

import numpy as np
from PIL import Image

try:
    from numba import njit
except ImportError:          # the pictures are slow without it, and nothing else minds
    def njit(*a, **k):
        return (lambda f: f) if not (a and callable(a[0])) else a[0]

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TRIPO = os.path.join(ROOT, 'assets', 'monsters', 'tripo')
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read_glb(path):
    b = open(path, 'rb').read()
    n = struct.unpack('<I', b[12:16])[0]
    doc = json.loads(b[20:20 + n])
    o = 20 + n
    m = struct.unpack('<I', b[o:o + 4])[0]
    return doc, b[o + 8:o + 8 + m]


def acc(doc, buf, i):
    a = doc['accessors'][i]
    bv = doc['bufferViews'][a['bufferView']]
    n = NC[a['type']]
    dt = np.dtype(DT[a['componentType']])
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or n * dt.itemsize
    raw = np.frombuffer(buf, np.uint8, count=stride * (a['count'] - 1) + n * dt.itemsize, offset=o)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], n * dt.itemsize), (stride, 1)).copy().view(dt).reshape(a['count'], n)
    if a.get('normalized'):
        out = np.maximum(out.astype(np.float32) / {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']], -1)
    return out


def image(doc, buf, tex_index):
    bv = doc['bufferViews'][doc['images'][doc['textures'][tex_index]['source']]['bufferView']]
    o = bv.get('byteOffset', 0)
    return Image.open(io.BytesIO(buf[o:o + bv['byteLength']]))


class Mesh:
    """One piece: P, N (n,3), UV (n,2), J (n,4 joint numbers), W (n,4), F (m,3)."""

    def __init__(self, P, N, UV, J, W, F):
        self.P, self.N, self.UV = np.asarray(P, np.float64), np.asarray(N, np.float64), np.asarray(UV, np.float64)
        self.J, self.W, self.F = np.asarray(J, np.int64), np.asarray(W, np.float64), np.asarray(F, np.int64).reshape(-1, 3)

    def copy(self):
        return Mesh(self.P.copy(), self.N.copy(), self.UV.copy(), self.J.copy(), self.W.copy(), self.F.copy())

    def faces_where(self, keep):
        """The faces in `keep` (a mask over faces), with only the corners they use."""
        F = self.F[keep]
        used = np.zeros(len(self.P), bool)
        used[F] = True
        new = np.cumsum(used) - 1
        return Mesh(self.P[used], self.N[used], self.UV[used], self.J[used], self.W[used], new[F])

    def verts_where(self, keep, any_corner=False):
        """The faces whose corners are all (or any) in `keep` (a mask over corners)."""
        k = keep[self.F]
        return self.faces_where(k.any(1) if any_corner else k.all(1))

    def bind(self, joint):
        """Hang the whole piece off one joint."""
        self.J[:] = [joint, 0, 0, 0]
        self.W[:] = [1, 0, 0, 0]
        return self

    @staticmethod
    def join(parts):
        base, F = 0, []
        for p in parts:
            F.append(p.F + base)
            base += len(p.P)
        cat = lambda k: np.concatenate([getattr(p, k) for p in parts])
        return Mesh(cat('P'), cat('N'), cat('UV'), cat('J'), cat('W'), np.concatenate(F))

    def islands(self):
        """A number per corner: which connected piece it's in (corners at one place count as one)."""
        key = np.round(self.P * 1e5).astype(np.int64)
        _, at = np.unique(key, axis=0, return_inverse=True)
        at = at.ravel()
        parent = np.arange(at.max() + 1)

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        for a, b, c in at[self.F]:
            ra, rb, rc = find(a), find(b), find(c)
            parent[rb] = ra
            parent[find(rc)] = ra
        root = np.array([find(x) for x in range(len(parent))])
        _, lab = np.unique(root, return_inverse=True)
        return lab[at]

    def recompute_normals(self, only=None):
        fn = np.cross(self.P[self.F[:, 1]] - self.P[self.F[:, 0]], self.P[self.F[:, 2]] - self.P[self.F[:, 0]])
        N = np.zeros_like(self.P)
        for k in range(3):
            np.add.at(N, self.F[:, k], fn)
        N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
        if only is None:
            self.N = N
        else:
            self.N[only] = N[only]


class Model:
    """A glb with one skinned piece and three maps, as the game's Tripo monsters are kept."""

    def __init__(self, path):
        self.path = path
        self.doc, self.buf = read_glb(path)
        doc, buf = self.doc, self.buf
        prims = [p for m in doc['meshes'] for p in m['primitives']]
        assert len(prims) == 1, f'{path}: {len(prims)} pieces (run atlas.py first)'
        a = prims[0]['attributes']
        w = acc(doc, buf, a['WEIGHTS_0']).astype(np.float64)
        self.mesh = Mesh(acc(doc, buf, a['POSITION']), acc(doc, buf, a['NORMAL']), acc(doc, buf, a['TEXCOORD_0']),
                         acc(doc, buf, a['JOINTS_0']), w / np.maximum(w.sum(1, keepdims=True), 1e-9), acc(doc, buf, prims[0]['indices']).ravel())
        self.joints = doc['skins'][0]['joints']
        self.names = [doc['nodes'][j].get('name', '') for j in self.joints]
        self.ibm = acc(doc, buf, doc['skins'][0]['inverseBindMatrices']).astype(np.float64).reshape(-1, 4, 4).transpose(0, 2, 1)
        mat = doc['materials'][prims[0].get('material', 0)]
        pbr = mat['pbrMetallicRoughness']
        self.albedo = image(doc, buf, pbr['baseColorTexture']['index']).convert('RGB')
        self._mat = mat

    def maps(self):
        """The normal map and the metal/rough map (not read until asked for)."""
        return (image(self.doc, self.buf, self._mat['normalTexture']['index']),
                image(self.doc, self.buf, self._mat['pbrMetallicRoughness']['metallicRoughnessTexture']['index']))

    def joint(self, name):
        """A joint's number in the skin, by the end of its name ('Head', 'Spine2')."""
        hits = [i for i, n in enumerate(self.names) if n.split(':')[-1] == name]
        assert hits, f'{self.path}: no joint {name}'
        return hits[0]

    def weight_of(self, *names, mesh=None):
        """Each corner's weight on these joints together."""
        m = mesh or self.mesh
        ids = [self.joint(n) for n in names if any(x.split(':')[-1] == n for x in self.names)]
        return (m.W * np.isin(m.J, ids)).sum(1)

    # -- posing
    def world(self, over=None):
        """Every node's world matrix, with some nodes' own translation/rotation/scale replaced."""
        doc = self.doc
        over = over or {}
        out = [None] * len(doc['nodes'])

        def visit(i, pm):
            n = doc['nodes'][i]
            o = over.get(i, {})
            if 'matrix' in n:
                M = np.array(n['matrix'], float).reshape(4, 4).T
            else:
                M = np.eye(4)
                M[:3, :3] = qmat(np.asarray(o.get('rotation', n.get('rotation', [0, 0, 0, 1])), float)) * np.asarray(o.get('scale', n.get('scale', [1, 1, 1])), float)
                M[:3, 3] = o.get('translation', n.get('translation', [0, 0, 0]))
            out[i] = pm @ M
            for c in n.get('children', []):
                visit(c, out[i])
        for r in doc['scenes'][doc.get('scene', 0)]['nodes']:
            visit(r, np.eye(4))
        return out

    def clip(self, name):
        return next((a for a in self.doc.get('animations', []) if a.get('name') == name), None)

    def sample(self, name, frac):
        """A clip at a share of its length: {node: {path: value}}."""
        anim = self.clip(name)
        if anim is None:
            return {}
        over, doc, buf = {}, self.doc, self.buf
        dur = max(doc['accessors'][s['input']]['max'][0] for s in anim['samplers'])
        t = dur * frac
        for ch in anim['channels']:
            s = anim['samplers'][ch['sampler']]
            T = acc(doc, buf, s['input'])[:, 0]
            V = acc(doc, buf, s['output']).astype(np.float64)
            i = int(np.clip(np.searchsorted(T, t) - 1, 0, len(T) - 1))
            j = min(i + 1, len(T) - 1)
            f = 0 if j == i else np.clip((t - T[i]) / (T[j] - T[i]), 0, 1)
            v = V[i] * (1 - f) + V[j] * f
            if ch['target']['path'] == 'rotation':
                if V[i] @ V[j] < 0:
                    v = V[i] * (1 - f) - V[j] * f
                v = v / np.linalg.norm(v)
            over.setdefault(ch['target']['node'], {})[ch['target']['path']] = v
        return over

    def skin_mats(self, over=None):
        w = self.world(over)
        return np.stack([w[j] @ self.ibm[k] for k, j in enumerate(self.joints)])

    def posed(self, mesh=None, clip=None, frac=0.0, over=None):
        """The piece's corners and normals as a clip leaves them (clip None: at rest)."""
        m = mesh or self.mesh
        S = self.skin_mats(over if over is not None else (self.sample(clip, frac) if clip else None))
        M = (S[m.J] * m.W[:, :, None, None]).sum(1)
        P = (M[:, :3, :3] @ m.P[:, :, None])[:, :, 0] + M[:, :3, 3]
        N = (M[:, :3, :3] @ m.N[:, :, None])[:, :, 0]
        return P, N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

    def unposed(self, mesh, over=None):
        """The other way: a piece whose corners are where posed() would put them, taken back to the raw mesh's space by
        each corner's own joints. (At rest that's all but one turn for the whole body; a few finger joints differ a hair.)"""
        S = self.skin_mats(over)
        M = np.linalg.inv((S[mesh.J] * mesh.W[:, :, None, None]).sum(1))
        P = (M[:, :3, :3] @ mesh.P[:, :, None])[:, :, 0] + M[:, :3, 3]
        N = (M[:, :3, :3] @ mesh.N[:, :, None])[:, :, 0]
        return P, N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

    def rest_world(self, name):
        """A joint's place as the model stands at rest (where posed() puts things: X across, Z to the front)."""
        return self.world()[self.joints[self.joint(name)]][:3, 3]

    # -- writing
    def save(self, path, mesh, albedo, normal=None, mr=None, quality=90, name=None):
        """Write `mesh` and its maps over this model's skeleton and clips. normal / mr: PIL images, or None for flat ones."""
        doc, buf = json.loads(json.dumps(self.doc)), self.buf
        out, views, accs = bytearray(), [], []

        def add_view(raw, target=None):
            while len(out) % 4:
                out.append(0)
            v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw)}
            if target:
                v['target'] = target
            out.extend(raw)
            views.append(v)
            return len(views) - 1

        copied = {}

        def copy_acc(i):
            if i in copied:
                return copied[i]
            a = dict(doc['accessors'][i])
            was = a.get('normalized')
            a.pop('normalized', None)
            arr = acc({'accessors': [a], 'bufferViews': doc['bufferViews']}, buf, 0)
            if was:
                a['normalized'] = True
            a['bufferView'] = add_view(arr.tobytes())
            a.pop('byteOffset', None)
            accs.append(a)
            copied[i] = len(accs) - 1
            return copied[i]

        def new_acc(arr, ctype, typ, target=None, minmax=False):
            arr = np.ascontiguousarray(arr.astype(DT[ctype]))
            a = {'bufferView': add_view(arr.tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
            if minmax:
                a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()
            accs.append(a)
            return len(accs) - 1

        skin = dict(doc['skins'][0])
        skin['inverseBindMatrices'] = copy_acc(skin['inverseBindMatrices'])
        for an in doc.get('animations', []):
            for s in an['samplers']:
                s['input'], s['output'] = copy_acc(s['input']), copy_acc(s['output'])
        m = mesh
        W = m.W / np.maximum(m.W.sum(1, keepdims=True), 1e-9)
        prim = {'attributes': {
            'POSITION': new_acc(m.P, 5126, 'VEC3', 34962, True),
            'NORMAL': new_acc(m.N, 5126, 'VEC3', 34962),
            'TEXCOORD_0': new_acc(m.UV, 5126, 'VEC2', 34962),
            'JOINTS_0': new_acc(m.J, 5123, 'VEC4', 34962),
            'WEIGHTS_0': new_acc(W, 5126, 'VEC4', 34962),
        }, 'indices': new_acc(m.F.ravel(), 5125, 'SCALAR', 34963), 'material': 0}

        def enc(img, fmt, **kw):
            b = io.BytesIO()
            img.save(b, fmt, **kw)
            return b.getvalue()
        normal = normal or Image.new('RGB', (4, 4), (128, 128, 255))
        mr = mr or Image.new('RGB', (4, 4), (0, 230, 0))
        doc['images'] = [
            {'bufferView': add_view(enc(albedo.convert('RGB'), 'JPEG', quality=quality)), 'mimeType': 'image/jpeg'},
            {'bufferView': add_view(enc(normal, 'PNG', optimize=True)), 'mimeType': 'image/png'},
            {'bufferView': add_view(enc(mr, 'PNG', optimize=True)), 'mimeType': 'image/png'},
        ]
        doc['textures'] = [{'source': 0}, {'source': 1}, {'source': 2}]
        doc['materials'] = [{'name': 'atlas', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 2},
                                                                       'metallicFactor': 0.0, 'roughnessFactor': 0.9},
                             'normalTexture': {'index': 1}, 'doubleSided': True}]
        doc['meshes'] = [{'name': name or os.path.splitext(os.path.basename(path))[0], 'primitives': [prim]}]
        doc['skins'] = [skin]
        doc['accessors'], doc['bufferViews'] = accs, views
        doc.pop('samplers', None)
        while len(out) % 4:
            out.append(0)
        doc['buffers'] = [{'byteLength': len(out)}]
        js = json.dumps(doc, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(out)))
            f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            f.write(struct.pack('<II', len(out), 0x004E4942) + bytes(out))
        return os.path.getsize(path)


def qmat(q):
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def clip(mesh, d, only=None):
    """Cut the piece where d (a number per corner) crosses nought, and keep the side where it's below: the faces across
    the line are split along it. only: a mask over corners; a face with a corner outside it is left whole whatever d says.
    Returns the new Mesh and the numbers of the corners made along the cut."""
    F = mesh.F
    up = d[F] > 0
    whole = np.zeros(len(F), bool) if only is None else ~only[F].all(1)
    keep = whole | ~up.any(1)
    cut = ~whole & up.any(1) & ~up.all(1)
    P, N, UV, J, W = [list(x) for x in (mesh.P, mesh.N, mesh.UV, mesh.J, mesh.W)]
    made, out = {}, [F[keep]]

    def mid(a, b):                       # a is kept, b is cut away
        k = (min(a, b), max(a, b))
        if k not in made:
            t = d[a] / (d[a] - d[b])
            P.append(mesh.P[a] + (mesh.P[b] - mesh.P[a]) * t)
            n = mesh.N[a] + (mesh.N[b] - mesh.N[a]) * t
            N.append(n / max(np.linalg.norm(n), 1e-12))
            UV.append(mesh.UV[a] + (mesh.UV[b] - mesh.UV[a]) * t)
            J.append(mesh.J[a])
            W.append(mesh.W[a])
            made[k] = len(P) - 1
        return made[k]
    extra = []
    for f in F[cut]:
        for r in range(3):               # turn it so the odd corner out comes first
            a, b, c = f[r], f[(r + 1) % 3], f[(r + 2) % 3]
            if (d[a] > 0) != (d[b] > 0) and (d[a] > 0) != (d[c] > 0):
                break
        if d[a] > 0:                     # one corner goes: a quad is left
            ab, ac = mid(b, a), mid(c, a)
            extra += [[ab, b, c], [ab, c, ac]]
        else:                            # one corner stays
            extra.append([a, mid(a, b), mid(a, c)])
    if extra:
        out.append(np.array(extra))
    m = Mesh(np.array(P), np.array(N), np.array(UV), np.array(J), np.array(W), np.concatenate(out))
    rim = np.array(sorted(made.values()), int)
    used = np.zeros(len(m.P), bool)
    used[m.F] = True
    new = np.cumsum(used) - 1
    return Mesh(m.P[used], m.N[used], m.UV[used], m.J[used], m.W[used], new[m.F]), new[rim[used[rim]]]


# ---- shapes made from nothing

def lathe(profile, n=20, uv_rect=(0, 0, 1, 1), close_top=False):
    """A surface of revolution about Y: profile is [(radius, y), ...] from the bottom up; uv_rect (u0, v0, u1, v1) is wrapped
    round it (u round, v up the profile). Returns a Mesh with no weights set."""
    prof = np.asarray(profile, float)
    k = len(prof)
    ang = np.linspace(0, 2 * np.pi, n + 1)
    P = np.zeros((k, n + 1, 3))
    P[:, :, 0] = prof[:, 0:1] * np.cos(ang)
    P[:, :, 2] = prof[:, 0:1] * np.sin(ang)
    P[:, :, 1] = prof[:, 1:2]
    u0, v0, u1, v1 = uv_rect
    UV = np.zeros((k, n + 1, 2))
    UV[:, :, 0] = u0 + (u1 - u0) * np.linspace(0, 1, n + 1)
    UV[:, :, 1] = (v1 + (v0 - v1) * np.linspace(0, 1, k))[:, None]
    F = []
    for i in range(k - 1):
        for j in range(n):
            a, b, c, d = i * (n + 1) + j, i * (n + 1) + j + 1, (i + 1) * (n + 1) + j, (i + 1) * (n + 1) + j + 1
            F += [[a, c, b], [b, c, d]]
    m = Mesh(P.reshape(-1, 3), np.zeros((k * (n + 1), 3)), UV.reshape(-1, 2), np.zeros((k * (n + 1), 4), int), np.tile([1.0, 0, 0, 0], (k * (n + 1), 1)), F)
    m.recompute_normals()
    return m


def transform(mesh, M=None, scale=1.0, shift=(0, 0, 0)):
    """Scale, then turn by the 3x3 M, then move."""
    R = np.eye(3) if M is None else np.asarray(M, float)
    mesh.P = (mesh.P * scale) @ R.T + np.asarray(shift, float)
    mesh.N = mesh.N @ R.T
    mesh.N /= np.maximum(np.linalg.norm(mesh.N, axis=1, keepdims=True), 1e-12)
    return mesh


# ---- drawing, to look at what was made

@njit(cache=True)
def _raster(S, Z, F, W, H, zbuf, fid, bary):
    for f in range(F.shape[0]):
        a, b, c = F[f, 0], F[f, 1], F[f, 2]
        x0, y0, x1, y1, x2, y2 = S[a, 0], S[a, 1], S[b, 0], S[b, 1], S[c, 0], S[c, 1]
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-12:
            continue
        xa = max(int(np.floor(min(x0, x1, x2))), 0)
        xb = min(int(np.ceil(max(x0, x1, x2))), W - 1)
        ya = max(int(np.floor(min(y0, y1, y2))), 0)
        yb = min(int(np.ceil(max(y0, y1, y2))), H - 1)
        for y in range(ya, yb + 1):
            for x in range(xa, xb + 1):
                px, py = x + 0.5, y + 0.5
                w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area
                w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area
                w2 = 1.0 - w0 - w1
                if w0 < -1e-6 or w1 < -1e-6 or w2 < -1e-6:
                    continue
                z = w0 * Z[a] + w1 * Z[b] + w2 * Z[c]
                if z > zbuf[y, x]:
                    zbuf[y, x] = z
                    fid[y, x] = f
                    bary[y, x, 0] = w0
                    bary[y, x, 1] = w1


def draw(P, N, mesh, tex, yaw=0.0, pitch=0.0, size=(480, 640), centre=None, span=None, bg=(52, 56, 64), glow=None, front='z', light=1.0):
    """An orthographic picture. yaw 0 looks at the model's front, 90 at its left side; pitch tilts the eye up over it.
    glow: a mask image the size of the map (white where it shines of itself). front: which axis the model faces ('x' or 'z')."""
    W, H = size
    ya, pa = np.radians(yaw), np.radians(pitch)
    f0 = np.array([1.0, 0, 0]) if front == 'x' else np.array([0, 0, 1.0])
    s0 = np.array([0, 0, -1.0]) if front == 'x' else np.array([1.0, 0, 0])      # the eye's right when it looks at the front
    eye = np.cos(ya) * f0 - np.sin(ya) * s0                                      # from the model to the eye, level
    right = np.cos(ya) * s0 + np.sin(ya) * f0
    up = np.array([0, 1.0, 0])
    eye3 = np.cos(pa) * eye + np.sin(pa) * up
    up3 = np.cross(eye3, right)
    up3 /= np.linalg.norm(up3)
    lo, hi = P.min(0), P.max(0)
    c = (lo + hi) / 2 if centre is None else np.asarray(centre, float)
    span = span or float((hi - lo).max()) * 1.08
    k = min(W, H) / span
    d = P - c
    S = np.stack([W / 2 + (d @ right) * k, H / 2 - (d @ up3) * k], 1)
    Z = d @ eye3
    zbuf = np.full((H, W), -1e9)
    fid = np.full((H, W), -1, np.int64)
    bary = np.zeros((H, W, 2))
    _raster(S, Z, mesh.F, W, H, zbuf, fid, bary)
    hit = fid >= 0
    f = mesh.F[fid[hit]]
    b0, b1 = bary[hit][:, 0:1], bary[hit][:, 1:2]
    b2 = 1 - b0 - b1
    uv = mesh.UV[f[:, 0]] * b0 + mesh.UV[f[:, 1]] * b1 + mesh.UV[f[:, 2]] * b2
    n = N[f[:, 0]] * b0 + N[f[:, 1]] * b1 + N[f[:, 2]] * b2
    n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
    n[(n @ eye3) < 0] *= -1                              # both sides are drawn
    T = np.asarray(tex.convert('RGB'), np.float64) / 255
    th, tw = T.shape[:2]
    u = uv - np.floor(uv)
    tx = np.clip((u[:, 0] * tw).astype(int), 0, tw - 1)
    ty = np.clip((u[:, 1] * th).astype(int), 0, th - 1)
    col = T[ty, tx] ** 2.2
    key = eye3 * 0.5 + up * 0.75 + right * 0.45
    key /= np.linalg.norm(key)
    fill = eye3 * 0.3 - right * 0.8 + up * 0.2
    fill /= np.linalg.norm(fill)
    lit = (0.3 + 0.85 * np.maximum(n @ key, 0) + 0.25 * np.maximum(n @ fill, 0) + 0.25 * (1 - np.maximum(n @ eye3, 0)) ** 3) * light
    col = col * lit[:, None]
    if glow is not None:
        G = np.asarray(glow.convert('L'), np.float64) / 255
        gh, gw = G.shape
        g = G[np.clip((u[:, 1] * gh).astype(int), 0, gh - 1), np.clip((u[:, 0] * gw).astype(int), 0, gw - 1)]
        col = col + g[:, None] * np.array([3.0, 0.1, 0.04])
    img = np.zeros((H, W, 3)) + (np.array(bg) / 255) ** 2.2
    img[hit] = col
    return Image.fromarray((np.clip(img, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8))


def sheet(pics, cols=None, label=None):
    """Pictures side by side."""
    cols = cols or len(pics)
    w, h = pics[0].size
    rows = (len(pics) + cols - 1) // cols
    out = Image.new('RGB', (w * cols, h * rows), (30, 30, 34))
    for i, p in enumerate(pics):
        out.paste(p, ((i % cols) * w, (i // cols) * h))
    return out
