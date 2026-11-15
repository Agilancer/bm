"""Reading and writing the dragons' GLB files: the Tripo sources in, the Elder Dragon Gods' rigged models out.

Everything here is in glTF's frame: X across (the dragon's left is +X), Y up, Z forward (the snout points +Z).
"""
import io
import json
import struct

import numpy as np

COMP = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32, 5122: np.int16, 5120: np.int8}
WIDTH = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    off = 20 + n
    m = struct.unpack_from('<I', data, off)[0]
    return doc, bytes(data[off + 8:off + 8 + m])


def accessor(doc, buf, i):
    a = doc['accessors'][i]
    width = WIDTH[a['type']]
    dtype = COMP[a['componentType']]
    v = doc['bufferViews'][a['bufferView']]
    size = np.dtype(dtype).itemsize
    stride = v.get('byteStride', width * size)
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    arr = np.ndarray((a['count'], width), dtype, buf, start, (stride, size)).astype(np.float64)
    if a.get('normalized'):
        arr /= np.iinfo(dtype).max
    return arr


def view_bytes(doc, buf, vi):
    v = doc['bufferViews'][vi]
    o = v.get('byteOffset', 0)
    return bytes(buf[o:o + v['byteLength']])


def trs(n):
    if 'matrix' in n:
        return np.array(n['matrix'], float).reshape(4, 4).T
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * np.array(n.get('scale', [1, 1, 1]))
    M[:3, 3] = n.get('translation', [0, 0, 0])
    return M


def world_mats(doc):
    W = {}

    def walk(i, M):
        W[i] = M @ trs(doc['nodes'][i])
        for c in doc['nodes'][i].get('children', []):
            walk(c, W[i])
    for r in doc['scenes'][doc.get('scene', 0)]['nodes']:
        walk(r, np.eye(4))
    return W


class Source:
    """A Tripo dragon: its one skinned primitive in world space at bind, its triangles, UVs, material, and its old bones."""

    def __init__(self, path):
        doc, buf = load(path)
        self.doc, self.buf = doc, buf
        W = world_mats(doc)
        mesh_nodes = [i for i, n in enumerate(doc['nodes']) if 'mesh' in n]
        assert len(mesh_nodes) == 1, mesh_nodes
        ni = mesh_nodes[0]
        prims = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives']
        assert len(prims) == 1, len(prims)
        p = prims[0]
        self.prim = p
        P = accessor(doc, buf, p['attributes']['POSITION'])
        N = accessor(doc, buf, p['attributes']['NORMAL']) if 'NORMAL' in p['attributes'] else None
        self.uv = accessor(doc, buf, p['attributes']['TEXCOORD_0'])
        self.tri = accessor(doc, buf, p['indices']).astype(np.int64).reshape(-1, 3)
        node = doc['nodes'][ni]
        if 'skin' in node:
            sk = doc['skins'][node['skin']]
            ibm = accessor(doc, buf, sk['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)
            js = accessor(doc, buf, p['attributes']['JOINTS_0']).astype(int)
            ws = accessor(doc, buf, p['attributes']['WEIGHTS_0'])
            Jm = np.stack([W[j] @ ibm[k] for k, j in enumerate(sk['joints'])])
            M = np.einsum('nk,nkij->nij', ws, Jm[js])
            self.P = np.einsum('nij,nj->ni', M, np.c_[P, np.ones(len(P))])[:, :3]
            R = M[:, :3, :3]
            self.N = None if N is None else np.einsum('nij,nj->ni', R, N)
            self.old_names = [doc['nodes'][j].get('name', str(j)) for j in sk['joints']]
            self.old_pos = np.array([W[j][:3, 3] for j in sk['joints']])
            self.old_js, self.old_ws = js, ws
        else:
            M = W[ni]
            self.P = (M @ np.c_[P, np.ones(len(P))].T).T[:, :3]
            self.N = None if N is None else (M[:3, :3] @ N.T).T
            self.old_names, self.old_pos, self.old_js, self.old_ws = [], np.zeros((0, 3)), None, None
        if self.N is not None:
            self.N /= np.linalg.norm(self.N, axis=1, keepdims=True) + 1e-12
        self.material = doc['materials'][p['material']] if 'material' in p else None

    def images(self):
        """The material's images as (slot, mime, bytes): slot 'base', 'mr', 'normal', 'emissive', 'occlusion'."""
        doc, out = self.doc, []
        m = self.material or {}
        pbr = m.get('pbrMetallicRoughness', {})
        refs = [('base', pbr.get('baseColorTexture')), ('mr', pbr.get('metallicRoughnessTexture')),
                ('normal', m.get('normalTexture')), ('emissive', m.get('emissiveTexture')), ('occlusion', m.get('occlusionTexture'))]
        for slot, ref in refs:
            if not ref:
                continue
            im = doc['images'][doc['textures'][ref['index']]['source']]
            out.append((slot, im.get('mimeType', 'image/png'), view_bytes(doc, self.buf, im['bufferView'])))
        return out


def weld(P, tol=1e-5):
    """Index of each vertex's welded twin (vertices split at UV seams share a position)."""
    key = np.round(P / tol).astype(np.int64)
    _, idx, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return inv.reshape(-1), idx


class Out:
    """A GLB being written: one binary buffer, views appended as they come."""

    def __init__(self):
        self.doc = {'asset': {'version': '2.0', 'generator': 'bm tools/dragons'}, 'scene': 0, 'scenes': [{'nodes': []}],
                    'nodes': [], 'meshes': [], 'skins': [], 'accessors': [], 'bufferViews': [], 'buffers': [],
                    'materials': [], 'textures': [], 'images': [], 'samplers': [], 'animations': []}
        self.buf = bytearray()

    def view(self, data, target=None):
        while len(self.buf) % 4:
            self.buf.append(0)
        v = {'buffer': 0, 'byteOffset': len(self.buf), 'byteLength': len(data)}
        if target:
            v['target'] = target
        self.buf += data
        self.doc['bufferViews'].append(v)
        return len(self.doc['bufferViews']) - 1

    def acc(self, arr, type_, comp=5126, normalized=False, target=None, minmax=False):
        arr = np.ascontiguousarray(arr, COMP[comp])
        vi = self.view(arr.tobytes(), target)
        a = {'bufferView': vi, 'componentType': comp, 'count': int(arr.shape[0]), 'type': type_}
        if normalized:
            a['normalized'] = True
        if minmax:
            flat = arr.reshape(arr.shape[0], -1)
            a['min'] = flat.min(0).astype(float).tolist()
            a['max'] = flat.max(0).astype(float).tolist()
        self.doc['accessors'].append(a)
        return len(self.doc['accessors']) - 1

    def image(self, mime, data):
        vi = self.view(data)
        self.doc['images'].append({'bufferView': vi, 'mimeType': mime})
        if not self.doc['samplers']:
            self.doc['samplers'].append({'magFilter': 9729, 'minFilter': 9987, 'wrapS': 10497, 'wrapT': 10497})
        self.doc['textures'].append({'sampler': 0, 'source': len(self.doc['images']) - 1})
        return len(self.doc['textures']) - 1

    def save(self, path):
        doc = {k: v for k, v in self.doc.items() if v != [] or k in ('nodes', 'scenes')}
        doc['buffers'] = [{'byteLength': len(self.buf)}]
        js = json.dumps(doc, separators=(',', ':')).encode()
        js += b' ' * (-len(js) % 4)
        while len(self.buf) % 4:
            self.buf.append(0)
        with open(path, 'wb') as f:
            f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(self.buf)))
            f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
            f.write(struct.pack('<II', len(self.buf), 0x004E4942) + bytes(self.buf))


def shrink(mime, data, size, quality=88):
    """An image resized to at most size on its longest side; JPEG unless it has real alpha."""
    from PIL import Image
    img = Image.open(io.BytesIO(data))
    if max(img.size) > size:
        img = img.resize((size, size) if img.size[0] == img.size[1] else
                         (round(img.size[0] * size / max(img.size)), round(img.size[1] * size / max(img.size))), Image.LANCZOS)
    out = io.BytesIO()
    alpha = img.mode in ('RGBA', 'LA') and np.asarray(img.getchannel('A')).min() < 250
    if alpha:
        img.save(out, 'PNG', optimize=True)
        return 'image/png', out.getvalue()
    img.convert('RGB').save(out, 'JPEG', quality=quality)
    return 'image/jpeg', out.getvalue()
