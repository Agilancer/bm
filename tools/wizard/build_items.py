"""Builds the wizard's new items, with system Python: python tools/wizard/build_items.py [skulls] [robes]

Skulls: eight of the owner's 24 catacomb skulls out of tools/build/skulls_hi.json (tools/skulls/separate.py with TRIS = (1800, 90), run in Blender,
writing to that name), each a GLB in assets/game/items, centred on its middle, life size, looking along +z.
Robes: every shape in every palette (src/items/items.js ROBE_SHAPES, ROBE_PALETTES), lofted cloth with painted weave and trim.
Then, in Blender through MCP, icons: tools/wizard/render_icons.py.
"""
import io
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ITEMS = os.path.join(ROOT, 'assets', 'game', 'items')


def jpeg(im, q=86):
    b = io.BytesIO()
    im.convert('RGB').save(b, 'JPEG', quality=q)
    return b.getvalue()


def write_glb(path, name, pos, nrm, uv, idx, images):
    """images: albedo, normal, metal-roughness, as JPEG bytes."""
    pos, nrm, uv = np.asarray(pos, 'f4'), np.asarray(nrm, 'f4'), np.asarray(uv, 'f4')
    idx = np.asarray(idx, 'u4')
    blobs, views = [], []
    off = 0
    def add(b, target=None):
        nonlocal off
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(b)}
        if target: v['target'] = target
        views.append(v)
        pad = (4 - len(b) % 4) % 4
        blobs.append(b + b'\0' * pad)
        off += len(b) + pad
        return len(views) - 1
    acc = [
        {'bufferView': add(pos.tobytes(), 34962), 'componentType': 5126, 'count': len(pos), 'type': 'VEC3', 'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()},
        {'bufferView': add(nrm.tobytes(), 34962), 'componentType': 5126, 'count': len(nrm), 'type': 'VEC3'},
        {'bufferView': add(uv.tobytes(), 34962), 'componentType': 5126, 'count': len(uv), 'type': 'VEC2'},
        {'bufferView': add(idx.tobytes(), 34963), 'componentType': 5125, 'count': len(idx), 'type': 'SCALAR'},
    ]
    imgs = [{'bufferView': add(b), 'mimeType': 'image/jpeg', 'name': f'{name}_{i}'} for i, b in enumerate(images)]
    j = {
        'asset': {'version': '2.0', 'generator': 'tools/wizard/build_items.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': [{'mesh': 0, 'name': name}],
        'meshes': [{'name': name, 'primitives': [{'attributes': {'POSITION': 0, 'NORMAL': 1, 'TEXCOORD_0': 2}, 'indices': 3, 'material': 0}]}],
        'materials': [{'name': name, 'normalTexture': {'index': 1}, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 2}}}],
        'textures': [{'source': i, 'sampler': 0} for i in range(3)], 'samplers': [{'wrapS': 10497, 'wrapT': 10497}], 'images': imgs,
        'accessors': acc, 'bufferViews': views, 'buffers': [{'byteLength': off}],
    }
    js = json.dumps(j, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    bin_ = b''.join(blobs)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(bin_), 0x004E4942) + bin_)


FLAT = jpeg(Image.new('RGB', (4, 4), (128, 128, 255)))


def mr_map(rough, metal=0):
    return jpeg(Image.new('RGB', (4, 4), (255, int(rough * 255), int(metal * 255))))


def skulls():
    data = json.load(open(os.path.join(ROOT, 'tools', 'build', 'skulls_hi.json')))
    for n, i in enumerate(range(0, 24, 3)):
        e = data[i]
        lod = e['lod'][0]
        p, nr, uv = (np.array(lod[k], 'f4') for k in ('p', 'n', 'uv'))
        p = p.reshape(-1, 3); nr = nr.reshape(-1, 3); uv = uv.reshape(-1, 2)
        sheet = Image.open(os.path.join(ROOT, 'assets', 'game', 'interior', f"{e['layer']}_c.webp")).convert('RGB')
        w, h = sheet.size
        lo, hi = uv.min(0), uv.max(0)
        box = (int(lo[0] * w) - 2, int(lo[1] * h) - 2, int(hi[0] * w) + 3, int(hi[1] * h) + 3)
        crop = sheet.crop(box)
        uv2 = (uv * [w, h] - [box[0], box[1]]) / [crop.size[0], crop.size[1]]
        p[:, 1] -= (p[:, 1].min() + p[:, 1].max()) / 2
        write_glb(os.path.join(ITEMS, f'skull_{n + 1:02d}.glb'), f'skull_{n + 1:02d}', p, nr, uv2, np.arange(len(p), dtype='u4'), [jpeg(crop, 90), FLAT, mr_map(0.72)])
        print('skull', n + 1, e['name'], len(p), crop.size)


# ---- cloth ----------------------------------------------------------------------------------------------------------

SEG = 28
TAU = math.pi * 2


class Mesh:
    def __init__(self):
        self.p, self.uv, self.f = [], [], []

    def loft(self, rings, vr=(0.0, 1.0), ur=(0.0, 1.0), fold=0.0, seed=0.0):
        """rings: (centre, along-x axis, along-z axis), the last ones shut with their own centre. Normals face out; v runs along the rings."""
        base = len(self.p)
        n = len(rings)
        for i, (c, ax, az) in enumerate(rings):
            t = i / max(n - 1, 1)
            for j in range(SEG + 1):
                a = TAU * (j / SEG - 0.5)
                k = 1 + fold * t * (0.6 * math.sin(7 * a + seed) + 0.4 * math.sin(13 * a + 2.3 + seed))
                self.p.append([c[m] + (ax[m] * math.sin(a) + az[m] * math.cos(a)) * k for m in range(3)])
                self.uv.append([ur[0] + (ur[1] - ur[0]) * j / SEG, vr[0] + (vr[1] - vr[0]) * t])
        faces = []
        for i in range(n - 1):
            for j in range(SEG):
                a, b = base + i * (SEG + 1) + j, base + i * (SEG + 1) + j + 1
                c, d = a + SEG + 1, b + SEG + 1
                faces += [(a, b, c), (b, d, c)]
        # Which way round: away from the middle of the tube.
        P = np.array(self.p[base:])
        mid = n // 2
        q = P[mid * (SEG + 1)] - np.array(rings[mid][0])
        a0, b0, c0 = (np.array(self.p[v]) for v in faces[(mid - (mid == n - 1)) * SEG * 2])
        if np.dot(np.cross(b0 - a0, c0 - a0), q) < 0: faces = [(a, c, b) for a, b, c in faces]
        # Shut each end.
        for ring_i in (0, n - 1):
            c = len(self.p)
            self.p.append(list(rings[ring_i][0])); self.uv.append([0.5, vr[0] + (vr[1] - vr[0]) * (ring_i / max(n - 1, 1))])
            for j in range(SEG):
                a, b = base + ring_i * (SEG + 1) + j, base + ring_i * (SEG + 1) + j + 1
                inward = np.cross(np.array(self.p[b]) - self.p[a], np.array(self.p[c]) - self.p[a])
                out = np.array(rings[ring_i][0]) - np.array(rings[1 if ring_i == 0 else n - 2][0])
                faces.append((a, b, c) if np.dot(inward, out) > 0 else (a, c, b))
        self.f += faces

    def tube(self, stations, **k):
        """stations: (x, y, z, rx, rz), rings lying flat."""
        self.loft([((x, y, z), (rx, 0, 0), (0, 0, rz)) for x, y, z, rx, rz in stations], **k)

    def along(self, stations, **k):
        """stations: (x, y, z, rx, ry), rings standing up, for what runs forward along z."""
        self.loft([((x, y, z), (rx, 0, 0), (0, ry, 0)) for x, y, z, rx, ry in stations], **k)

    def sleeves(self, sx, top, cuff_x, cuff_y, r0, r1, z=0.0):
        for s in (-1, 1):
            st = []
            for i in range(7):
                t = i / 6
                st.append((s * (sx + (cuff_x - sx) * t ** 0.8), top + (cuff_y - top) * t, z, r0 + (r1 - r0) * t ** 1.6, r0 + (r1 - r0) * t ** 1.6))
            self.tube(st, vr=(0.5, 0.98), ur=(0.0, 0.25), fold=0.05, seed=s)

    def done(self):
        p = np.array(self.p, 'f4')
        p -= (p.min(0) + p.max(0)) / 2
        p *= 0.55 / max(p.max(0) - p.min(0))
        f = np.array(self.f, 'u4')
        n = np.zeros_like(p)
        fn = np.cross(p[f[:, 1]] - p[f[:, 0]], p[f[:, 2]] - p[f[:, 0]])
        for i in range(3): np.add.at(n, f[:, i], fn)
        # The seam of each tube shares a normal.
        key = {}
        for i, v in enumerate(np.round(p, 4).tolist()): key.setdefault(tuple(v), []).append(i)
        for ids in key.values():
            if len(ids) > 1: n[ids] = n[ids].sum(0)
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-6)
        return p, n, np.array(self.uv, 'f4'), f.reshape(-1)


def pointed():
    m = Mesh()
    m.tube([(0, 0.005, 0, 0.14, 0.14), (0, 0.0, 0, 0.26, 0.26), (0, -0.03, 0, 0.36, 0.36), (0, -0.05, 0, 0.365, 0.365), (0, -0.015, 0, 0.26, 0.26), (0, 0.02, 0, 0.14, 0.14)], vr=(0.0, 0.2), fold=0.05)
    st = [(0.2 * t ** 2.6 - 0.32 * max(t - 0.82, 0) ** 1.2, 0.60 * t - 0.1 * t ** 3, -0.03 * t, 0.145 * (1 - t) ** 0.8 + 0.004, 0.145 * (1 - t) ** 0.8 + 0.004) for t in (i / 15 for i in range(16))]
    m.tube(st, vr=(0.22, 1.0), fold=0.02, seed=1.5)
    return m


def wide():
    m = Mesh()
    m.tube([(0, 0.005, 0, 0.14, 0.14), (0, 0.0, 0, 0.3, 0.3), (0, -0.02, 0, 0.46, 0.46), (0, -0.045, 0, 0.47, 0.47), (0, -0.01, 0, 0.3, 0.3), (0, 0.02, 0, 0.14, 0.14)], vr=(0.0, 0.2), fold=0.09, seed=0.7)
    m.tube([(0, 0, 0, 0.15, 0.15), (0, 0.1, 0, 0.14, 0.14), (0, 0.2, 0, 0.11, 0.12), (0, 0.235, 0, 0.05, 0.07), (0, 0.245, 0, 0.002, 0.002)], vr=(0.22, 1.0), fold=0.03)
    return m


def hood():
    m = Mesh()
    m.tube([(0, 0, 0, 0.17, 0.19), (0, 0.08, -0.01, 0.15, 0.17), (0, 0.2, -0.02, 0.15, 0.18), (0, 0.3, -0.04, 0.13, 0.16), (0, 0.38, -0.08, 0.08, 0.1), (0, 0.42, -0.16, 0.025, 0.03), (0, 0.42, -0.2, 0.002, 0.002)], vr=(0.05, 0.9), fold=0.03)
    # The shoulder capelet it hangs from.
    m.tube([(0, 0.04, 0, 0.15, 0.17), (0, -0.04, -0.01, 0.2, 0.2), (0, -0.14, -0.01, 0.27, 0.25)], vr=(0.0, 0.05), fold=0.1)
    return m


def garment(hem_y, hem_x, hem_z, sleeves, collar, waist=0.17, fold=0.08):
    m = Mesh()
    top = 0.6
    st = [(0, top + 0.08 * collar, 0, 0.1 + 0.03 * collar, 0.1 + 0.03 * collar), (0, top, 0, 0.09, 0.09), (0, top - 0.05, 0, 0.17, 0.12), (0, top - 0.12, 0, 0.23, 0.145), (0, top - 0.35, 0, waist + 0.03, waist * 0.78)]
    for i in range(1, 8):
        t = i / 7
        st.append((0, top - 0.35 + (hem_y - top + 0.35) * t, 0, waist + 0.03 + (hem_x - waist - 0.03) * t ** 1.3, waist * 0.78 + (hem_z - waist * 0.78) * t ** 1.3))
    m.tube(st, vr=(0.0, 1.0), ur=(0.25, 1.0), fold=fold)
    if sleeves: m.sleeves(0.2, top - 0.11, *sleeves)
    return m


def cape(cowl=False):
    m = Mesh()
    m.tube([(0, 0.18, 0, 0.11, 0.11), (0, 0.13, 0, 0.1, 0.1), (0, 0.09, -0.005, 0.2, 0.17), (0, 0.0, -0.01, 0.31, 0.24), (0, -0.14, -0.02, 0.38, 0.29), (0, -0.3, -0.03, 0.42, 0.32)], vr=(0.0, 1.0), fold=0.09)
    if cowl: m.tube([(0, 0.14, -0.07, 0.14, 0.11), (0, 0.27, -0.13, 0.16, 0.13), (0, 0.32, -0.2, 0.1, 0.08), (0, 0.27, -0.25, 0.01, 0.01)], vr=(0.3, 0.8), fold=0.03)
    return m


def legs(wrapped=False):
    m = Mesh()
    m.tube([(0, 0.5, 0, 0.18, 0.13), (0, 0.46, 0, 0.19, 0.135), (0, 0.32, 0, 0.21, 0.15), (0, 0.2, 0, 0.19, 0.14)], vr=(0.0, 0.14), ur=(0.0, 1.0))
    for s in (-1, 1):
        st = []
        for i in range(12 if wrapped else 7):
            t = i / (11 if wrapped else 6)
            r = 0.105 + (0.078 - 0.105) * t
            if wrapped: r *= 1 + 0.07 * math.sin(t * 34)
            st.append((s * (0.095 + 0.02 * t), 0.32 - 0.92 * t, 0, r, r))
        m.tube(st, vr=(0.14, 1.0), fold=0.03, seed=s)
    return m


def feet(curl=False):
    m = Mesh()
    for s in (-1, 1):
        x = s * 0.13
        m.tube([(x, 0.34, -0.03, 0.085, 0.09), (x, 0.3, -0.03, 0.075, 0.08), (x, 0.14, -0.03, 0.068, 0.075), (x, 0.05, -0.02, 0.075, 0.085)], vr=(0.0, 0.5), fold=0.04, seed=s)
        fw = [(x, 0.05, -0.1, 0.05, 0.045), (x, 0.055, -0.03, 0.075, 0.065), (x, 0.052, 0.05, 0.072, 0.052), (x, 0.045, 0.12, 0.062, 0.042)]
        if curl: fw += [(x, 0.055, 0.2, 0.042, 0.03), (x, 0.09, 0.26, 0.024, 0.022), (x, 0.15, 0.28, 0.014, 0.014), (x, 0.185, 0.25, 0.007, 0.007), (x, 0.185, 0.215, 0.002, 0.002)]
        else: fw += [(x, 0.04, 0.17, 0.042, 0.028), (x, 0.03, 0.19, 0.012, 0.01)]
        m.along(fw, vr=(0.5, 1.0))
    return m


SHAPES = {
    'pointed': (pointed, 'head'), 'wide': (wide, 'head'), 'hood': (hood, 'head'),
    'long': (lambda: garment(-0.95, 0.36, 0.3, (-0.42, -0.2, 0.065, 0.15, 0), 1), 'chest'),
    'jacket': (lambda: garment(0.0, 0.25, 0.17, (-0.38, 0.0, 0.058, 0.08), 2, waist=0.18, fold=0.025), 'chest'),
    'coat': (lambda: garment(-0.7, 0.3, 0.21, (-0.4, -0.08, 0.06, 0.095), 3, fold=0.05), 'chest'),
    'mantle': (cape, 'shoulders'), 'cowl': (lambda: cape(True), 'shoulders'),
    'pants': (legs, 'legs'), 'wraps': (lambda: legs(True), 'legs'),
    'boots': (feet, 'feet'), 'curled': (lambda: feet(True), 'feet'),
}
PALETTES = {  # cloth, trim, metal of the trim's thread
    'ash': ((112, 108, 102), (168, 158, 136)), 'moss': ((70, 88, 46), (160, 136, 62)), 'night': ((30, 36, 84), (190, 170, 96)),
    'crimson': ((124, 24, 30), (214, 166, 76)), 'amethyst': ((90, 42, 134), (206, 206, 228)),
}
TEX = 256
rng = np.random.default_rng(1793)
WEAVE = (np.sin(np.arange(TEX) * 2.2)[None, :] * np.sin(np.arange(TEX) * 2.2)[:, None]) * 0.05 + rng.normal(0, 0.035, (TEX, TEX))
# Soft blotches: cloth that has been worn and rained on.
BLOT = np.asarray(Image.fromarray(np.uint8(rng.random((16, 16)) * 255)).resize((TEX, TEX), Image.BICUBIC), 'f4') / 255 - 0.5


def cloth(shape, cloth_c, trim_c):
    v, u = np.mgrid[0:TEX, 0:TEX] / (TEX - 1)
    a = np.array(cloth_c, 'f4')[None, None] * (1 + WEAVE[..., None] + BLOT[..., None] * 0.22)
    # Long folds run down the length, dark in their valleys.
    a *= (1 - 0.14 * (0.5 + 0.5 * np.sin(u * 44 + np.sin(v * 5) * 1.4)))[..., None]
    t = np.array(trim_c, 'f4')
    mask = np.zeros((TEX, TEX), bool)
    def band(lo, hi): mask[(v >= lo) & (v <= hi)] = True
    chest = shape in ('long', 'jacket', 'coat')
    if shape in ('pointed', 'wide'): band(0.205, 0.255); band(0.0, 0.015)
    elif shape == 'hood':
        # The dark of the opening, at the front (u = 0.5 + a quarter of nothing: front is the middle of the ring).
        d = np.hypot((u - 0.5) / 0.17, (v - 0.42) / 0.25)
        a[d < 1] *= 0.12
        mask |= (d >= 1) & (d < 1.13)
    elif chest:
        band(0.96, 1.0); band(0.0, 0.03); band(0.48, 0.49)
        mask[(np.abs(u - 0.625) < 0.012)] = True  # the front's edge. (The body's u runs 0.25 to 1, the sleeves' 0 to 0.25.)
        if shape == 'long': band(0.3, 0.325)
        if shape == 'coat': mask[np.abs(u - 0.625) < 0.03] = True
    elif shape in ('mantle', 'cowl'): band(0.93, 1.0); band(0.0, 0.04)
    elif shape in ('pants', 'wraps'):
        band(0.0, 0.05); band(0.97, 1.0)
        if shape == 'wraps': mask[(np.sin(v * 78 + u * 6.28) > 0.72) & (v > 0.14)] = True
    else: band(0.0, 0.05); band(0.47, 0.5); band(0.97, 1.0)
    a[mask] = t * (0.85 + 0.15 * (1 + WEAVE[mask][..., None]))
    # A row of stitched runes along the widest trim.
    if chest or shape in ('mantle', 'cowl'):
        rows = (0.98 if chest else 0.965)
        for i in range(24):
            cx, cy = (i + 0.5) / 24, rows
            d = np.hypot((u - cx) * 3, v - cy)
            a[d < 0.008] *= 0.45
    im = Image.fromarray(np.uint8(np.clip(a, 0, 255)))
    # Normal: the weave, and the long folds.
    gx = np.gradient(WEAVE * 3 + 0.12 * np.sin(u * 44 + np.sin(v * 5) * 1.4), axis=1)
    gy = np.gradient(WEAVE * 3, axis=0)
    nm = np.dstack([gx * 2 + 0.5, gy * 2 + 0.5, np.ones_like(gx)])
    nm_im = Image.fromarray(np.uint8(np.clip(nm, 0, 1) * 255))
    mr = np.full((TEX // 4, TEX // 4, 3), 255, 'u1')
    mr[..., 1] = 225; mr[..., 2] = 0
    tm = np.asarray(Image.fromarray(np.uint8(mask) * 255).resize((TEX // 4, TEX // 4))) > 90
    mr[tm, 1] = 110; mr[tm, 2] = 150
    return jpeg(im), jpeg(nm_im, 80), jpeg(Image.fromarray(mr), 85)


def robes():
    for shape, (make, slot) in SHAPES.items():
        p, n, uv, f = make().done()
        for pal, (c, t) in PALETTES.items():
            name = f'{pal}_{shape}_{slot}'
            write_glb(os.path.join(ITEMS, f'{name}.glb'), name, p, n, uv, f, cloth(shape, c, t))
        print(shape, len(p), 'verts', len(f) // 3, 'tris')


if __name__ == '__main__':
    what = sys.argv[1:] or ['skulls', 'robes']
    if 'skulls' in what: skulls()
    if 'robes' in what: robes()
