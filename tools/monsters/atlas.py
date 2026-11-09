"""Merge a monster made of many pieces into one piece with one colour sheet, so the game can draw it.

The game's renderer (src/gfx/renderer.js buildCrabs) draws a monster as one primitive with three maps: colour, normal and
metal/rough. Some Tripo models (the necromancer lords, necromancer 3, Velscour's knights) come as dozens of primitives, each
with its own small colour map and no other maps. This packs those colour maps into one sheet (power-of-two squares, packed
like a quadtree), moves each piece's uvs into its square, joins the pieces, and adds a flat normal map and a plain
metal/rough map. The skeleton and the clips are kept as they are.

    python tools/monsters/atlas.py necromancer_lord [more ids]
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stretch import ROOT, load  # noqa: E402

SHEET = 4096
PAD = 4
DT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def read(doc, buf, i):
    a = doc['accessors'][i]
    bv = doc['bufferViews'][a['bufferView']]
    n = NC[a['type']]
    dt = np.dtype(DT[a['componentType']])
    o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or n * dt.itemsize
    raw = np.frombuffer(buf, np.uint8, count=stride * (a['count'] - 1) + n * dt.itemsize, offset=o)
    out = np.lib.stride_tricks.as_strided(raw, (a['count'], n * dt.itemsize), (stride, 1)).copy().view(dt)
    return out.reshape(a['count'], n)


def place(sizes):
    """Square power-of-two sizes into a SHEET square: [x, y] per size, or None if they don't fit."""
    free = [(0, 0, SHEET)]
    spots = [None] * len(sizes)
    for i in sorted(range(len(sizes)), key=lambda k: -sizes[k]):
        s = sizes[i]
        fit = [f for f in free if f[2] >= s]
        if not fit:
            return None
        f = min(fit, key=lambda f: (f[2], f[1], f[0]))
        free.remove(f)
        x, y, c = f
        # Split the cell down to this size; the other three quarters at each step go back on the list.
        while c > s:
            c //= 2
            free += [(x + c, y, c), (x, y + c, c), (x + c, y + c, c)]
        spots[i] = (x, y)
    return spots


def merge(id_, path=None):
    path = path or os.path.join(ROOT, 'assets', 'monsters', 'tripo', id_ + '.glb')
    doc, buf = load(path)
    prims = [p for m in doc['meshes'] for p in m['primitives']]
    if len(prims) == 1 and 'normalTexture' in doc['materials'][prims[0].get('material', 0)]:
        return 0
    # Each piece's colour map.
    imgs = []
    for p in prims:
        m = doc['materials'][p.get('material', 0)]
        t = m['pbrMetallicRoughness']['baseColorTexture']['index']
        im = doc['images'][doc['textures'][t]['source']]
        bv = doc['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        img = Image.open(io.BytesIO(bytes(buf[o:o + bv['byteLength']]))).convert('RGB')
        f = m['pbrMetallicRoughness'].get('baseColorFactor')
        if f and any(abs(c - 1) > 1e-3 for c in f[:3]):
            img = Image.fromarray((np.asarray(img, float) * np.array(f[:3])).clip(0, 255).astype(np.uint8))
        imgs.append(img)
    sizes = [max(i.size) for i in imgs]
    while (spots := place(sizes)) is None:
        sizes = [max(16, s // 2) for s in sizes]
    sheet = Image.new('RGB', (SHEET, SHEET))
    pos, nrm, uv, joints, weights, idx = [], [], [], [], [], []
    base = 0
    for p, img, s, (x, y) in zip(prims, imgs, sizes, spots):
        a = p['attributes']
        sheet.paste(img.resize((s, s), Image.LANCZOS), (x, y))
        # Bleed the edge pixels out a little so mips don't pick up the neighbour's colours.
        q = np.asarray(sheet.crop((x, y, x + s, y + s)))
        t = read(doc, buf, a['TEXCOORD_0']).astype(np.float64)
        t = np.clip(t, 0, 1)
        inner = (s - 2 * PAD) / SHEET if s > 4 * PAD else s / SHEET
        off = PAD / SHEET if s > 4 * PAD else 0
        t[:, 0] = x / SHEET + off + t[:, 0] * inner
        t[:, 1] = y / SHEET + off + t[:, 1] * inner
        if s > 4 * PAD:
            small = Image.fromarray(q).resize((s - 2 * PAD, s - 2 * PAD), Image.LANCZOS)
            padded = np.pad(np.asarray(small), ((PAD, PAD), (PAD, PAD), (0, 0)), mode='edge')
            sheet.paste(Image.fromarray(padded), (x, y))
        pos.append(read(doc, buf, a['POSITION']).astype(np.float32))
        nrm.append(read(doc, buf, a['NORMAL']).astype(np.float32))
        uv.append(t.astype(np.float32))
        joints.append(read(doc, buf, a['JOINTS_0']).astype(np.uint16))
        w = read(doc, buf, a['WEIGHTS_0']).astype(np.float32)
        weights.append(w / np.maximum(w.sum(1, keepdims=True), 1e-8))
        idx.append(read(doc, buf, p['indices']).astype(np.uint32).ravel() + base)
        base += len(pos[-1])
    attrs = dict(POSITION=np.concatenate(pos), NORMAL=np.concatenate(nrm), TEXCOORD_0=np.concatenate(uv),
                 JOINTS_0=np.concatenate(joints), WEIGHTS_0=np.concatenate(weights))
    indices = np.concatenate(idx)

    # A new buffer: what the skin and clips use, copied over, then the joined piece and its three maps.
    out = bytearray()
    views, accs = [], []

    def add_view(raw, target=None):
        while len(out) % 4:
            out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw)}
        if target:
            v['target'] = target
        out.extend(raw)
        views.append(v)
        return len(views) - 1

    def copy_acc(i):
        a = dict(doc['accessors'][i])
        bv = doc['bufferViews'][a['bufferView']]
        n = NC[a['type']] * np.dtype(DT[a['componentType']]).itemsize
        arr = read(doc, buf, i)
        a['bufferView'] = add_view(arr.tobytes())
        a.pop('byteOffset', None)
        assert arr.nbytes == a['count'] * n
        accs.append(a)
        return len(accs) - 1

    def new_acc(arr, ctype, typ, target=None, minmax=False):
        a = {'bufferView': add_view(np.ascontiguousarray(arr).tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
        if minmax:
            a['min'] = arr.min(0).tolist()
            a['max'] = arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1

    skin = dict(doc['skins'][0])
    skin['inverseBindMatrices'] = copy_acc(skin['inverseBindMatrices'])
    anims = []
    for an in doc.get('animations', []):
        an = json.loads(json.dumps(an))
        for s in an['samplers']:
            s['input'] = copy_acc(s['input'])
            s['output'] = copy_acc(s['output'])
        anims.append(an)
    prim = {'attributes': {
        'POSITION': new_acc(attrs['POSITION'], 5126, 'VEC3', 34962, True),
        'NORMAL': new_acc(attrs['NORMAL'], 5126, 'VEC3', 34962),
        'TEXCOORD_0': new_acc(attrs['TEXCOORD_0'], 5126, 'VEC2', 34962),
        'JOINTS_0': new_acc(attrs['JOINTS_0'], 5123, 'VEC4', 34962),
        'WEIGHTS_0': new_acc(attrs['WEIGHTS_0'], 5126, 'VEC4', 34962),
    }, 'indices': new_acc(indices, 5125, 'SCALAR', 34963), 'material': 0}

    def jpeg(img, q=90):
        b = io.BytesIO()
        img.save(b, 'JPEG', quality=q)
        return b.getvalue()

    def png(img):
        b = io.BytesIO()
        img.save(b, 'PNG')
        return b.getvalue()

    images = [
        {'bufferView': add_view(jpeg(sheet)), 'mimeType': 'image/jpeg'},
        {'bufferView': add_view(png(Image.new('RGB', (4, 4), (128, 128, 255)))), 'mimeType': 'image/png'},
        # Tripo's pieces are all metal 0, rough 0.9.
        {'bufferView': add_view(png(Image.new('RGB', (4, 4), (0, 230, 0)))), 'mimeType': 'image/png'},
    ]
    doc['images'] = images
    doc['textures'] = [{'source': 0}, {'source': 1}, {'source': 2}]
    doc['materials'] = [{'name': 'atlas', 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicRoughnessTexture': {'index': 2},
                                                                   'metallicFactor': 0.0, 'roughnessFactor': 0.9},
                         'normalTexture': {'index': 1}, 'doubleSided': True}]
    doc['meshes'] = [{'name': id_, 'primitives': [prim]}]
    # One node carries the mesh; the others that carried pieces are left empty.
    first = True
    for nd in doc['nodes']:
        if 'mesh' in nd:
            if first:
                nd['mesh'] = 0
                first = False
            else:
                del nd['mesh']
                nd.pop('skin', None)
    doc['skins'] = [skin]
    doc['animations'] = anims
    doc['accessors'] = accs
    doc['bufferViews'] = views
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
    return len(prims)


if __name__ == '__main__':
    for i in sys.argv[1:]:
        print(i, merge(i), 'pieces joined')
