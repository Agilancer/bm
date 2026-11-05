"""The atlas layers for what tools/skulls/separate.py and the owner's door pictures became, written beside the others in assets/game/interior and added to
its manifest. Run after build_assets.py, which rewrites that manifest. The doors' pictures stand on black: that goes, so each cuts out along its own arch.

    python tools/skulls/maps.py <folder with the door pictures, 1.webp ... 11.webp>
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'village'))
from build_textures import analyse, normal_from  # noqa: E402

OUT = os.path.join(ROOT, 'assets', 'game', 'interior')
SOURCE = r'F:\!    BM V2\! TRIPO MODELS\Objects for Scenes'
ATLAS, ATLAS_D = 1024, 512
SKULLS = (('skulls_a', 'SKULLS - NO JAWS 1.glb'), ('skulls_b', 'SKULLS - NO JAWS 2.glb'))
# atlas layer: picture, and whether it's a pair of leaves.
DOORS = {'door_great': (4, True), 'door_pointed': (3, False), 'door_iron': (9, False), 'door_iron2': (10, False)}
# How much of a tile's width one life-size skull takes, so a wall of them is the dead at their own size, and not a giant's. (A skull is 0.155 m across.)
LIFE_SIZE = {'skulls': 0.17, 'skulls2': 0.19, 'skulls3': 0.18, 'femurs': 0.19, 'cata_bones': 0.17}
SKULL_W = 0.155


def detail(rgb, kind, size, strength=3.0):
    h, r = analyse(rgb, kind)
    nx, ny = normal_from(h, strength)
    return Image.fromarray((np.stack([nx, ny, r, h], -1) * 255 + 0.5).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)


def glb_image(path, name_has):
    with open(path, 'rb') as f:
        data = f.read()
    n = struct.unpack_from('<I', data, 12)[0]
    j = json.loads(data[20:20 + n])
    binary = data[20 + n + 8:]
    for im in j['images']:
        if name_has in im.get('name', '').lower():
            v = j['bufferViews'][im['bufferView']]
            return Image.open(io.BytesIO(binary[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')
    raise KeyError(name_has)


def cut_out(path):
    """Off the black it stands on. Whatever's clear keeps the colour beside it, so a mip level doesn't darken the edge."""
    a = np.asarray(Image.open(path).convert('RGB'), np.uint8)
    dark = a.max(-1) < 26
    labels, _ = ndimage.label(dark)
    border = set(labels[0]) | set(labels[-1]) | set(labels[:, 0]) | set(labels[:, -1])
    clear = np.isin(labels, [b for b in border if b])
    idx = ndimage.distance_transform_edt(clear, return_distances=False, return_indices=True)
    rgb = a[idx[0], idx[1]]
    alpha = np.where(clear, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(~clear)
    return np.dstack([rgb, alpha]), (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


def main(door_dir):
    path = os.path.join(OUT, 'manifest.json')
    man = json.load(open(path))
    made = {a['name'] for a in man['atlases']}
    def add(name):
        if name not in made:
            man['atlases'].append({'name': name, 'kind': 'banner', 'rose': False})
            made.add(name)
    for name, file in SKULLS:
        rgb = glb_image(os.path.join(SOURCE, file), 'basecolor')
        im = rgb.resize((ATLAS, ATLAS), Image.LANCZOS).convert('RGBA')
        im.save(f'{OUT}/{name}_c.webp', quality=88, method=5, alpha_quality=95, exact=True)
        detail(np.asarray(rgb.resize((1024, 1024)), np.float32) / 255, 'other', ATLAS_D).save(f'{OUT}/{name}_d.webp', quality=60, method=5, alpha_quality=70, exact=True)
        add(name)
    for name, (n, pair) in DOORS.items():
        a, (x0, y0, x1, y1) = cut_out(os.path.join(door_dir, f'{n}.webp'))
        s = a.shape[0]
        im = Image.fromarray(a, 'RGBA').resize((ATLAS, ATLAS), Image.LANCZOS)
        im.save(f'{OUT}/{name}_c.webp', quality=88, method=5, alpha_quality=95, exact=True)
        detail(np.asarray(im.convert('RGB'), np.float32) / 255, 'wood', ATLAS_D).save(f'{OUT}/{name}_d.webp', quality=60, method=5, alpha_quality=70, exact=True)
        add(name)
        w, h = (x1 - x0) / s, (y1 - y0) / s
        if pair:
            mid = (x0 + x1) / 2 / s
            man['pieces'][f'{name}_l'] = {'layer': name, 'uv': [x0 / s, y0 / s, mid, y1 / s], 'aspect': w / 2 / h}
            man['pieces'][f'{name}_r'] = {'layer': name, 'uv': [mid, y0 / s, x1 / s, y1 / s], 'aspect': w / 2 / h}
        else:
            man['pieces'][name] = {'layer': name, 'uv': [x0 / s, y0 / s, x1 / s, y1 / s], 'aspect': w / h}
    for layer in man['layers']:
        if layer['name'] in LIFE_SIZE:
            layer['metres'] = round(SKULL_W / LIFE_SIZE[layer['name']], 2)
            print(layer['name'], layer['metres'])
    with open(path, 'w') as f:
        json.dump(man, f)
    print(len(man['atlases']), 'atlases', {k: v for k, v in man['pieces'].items() if k.startswith('door')})


main(sys.argv[1])
