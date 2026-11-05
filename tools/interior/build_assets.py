"""Turn the cut textures into what the game loads: square tile layers, and atlas layers that hold a pair of cut-outs each.

Usage: python tools/interior/build_assets.py   (from the repo root, after cut_sheets.py)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'village'))
from build_textures import analyse, normal_from

CUT = 'art/interior/cut'
OUT = 'assets/game/interior'
TILE, TILE_D, ATLAS, ATLAS_D = 512, 256, 1024, 512
# name: (source, kind, metres per repeat)
TILES = {
    'wall_ashlar': ('church_1_1', 'stone', 3.6), 'wall_rough': ('church_3_0', 'stone', 3.6), 'floor_diamond': ('church_1_2', 'stone', 3.0),
    'arcade': ('church_1_3', 'stone', 3.4), 'tracery': ('church_4_3', 'stone', 3.4), 'marble': ('marble_1_0', 'stone', 4.0), 'carpet': ('keep_3_1', 'other', 3.6), 'cloth_red': ('keep_2_2', 'other', 2.0),
    'cata_wall': ('cata_3_0', 'stone', 3.0), 'cata_wall2': ('cata_7_0', 'stone', 3.0), 'cata_floor': ('cata_4_2', 'stone', 3.0), 'cata_floor2': ('cata_3_2', 'stone', 3.0),
    'cata_v_floor': ('cata_9_2', 'stone', 4.0), 'cata_bones': ('cata_6_1', 'stone', 3.0), 'skulls': ('cata_2_1', 'stone', 2.6), 'skulls2': ('cata_4_1', 'stone', 2.6),
    'niches': ('cata_3_3', 'stone', 3.2), 'seep': ('cata_1_3', 'stone', 3.4), 'cata_roof': ('cata_2_3', 'stone', 3.4), 'candles': ('cata_11_3', 'stone', 3.2), 'candles_v': ('cata_9_3', 'stone', 3.2),
    'panel': ('panel_4_0', 'stone', 3.2), 'panel2': ('panel_5_0', 'stone', 3.2), 'blood_v': ('cata_11_0', 'stone', 4.0),
}
TILES.update({f'wood_{s}{k}': (f'lacquer_{s}_{k}', 'wood', 2.2) for s in 'abc' for k in range(4)})
FROM_VILLAGE = {'roof': ('assets/game/tex/roof_1_c.webp', 'roof', 4.0)}
PAIRS = [[f'{n}_{k}' for k in (0, 1)] for n in ('tess_a', 'tess_b', 'tess_c', 'tess_d', 'vel_a', 'vel_b', 'vel_c', 'vel_d', 'glass_a', 'glass_b', 'glass_c', 'glass_d', 'glass_e')] + [['rose_0']]


def detail(rgb, kind, size, strength=5.0):
    h, r = analyse(rgb, kind)
    if kind == 'stone' and False:
        pass
    nx, ny = normal_from(h, strength)
    return Image.fromarray((np.stack([nx, ny, r, h], -1) * 255 + 0.5).astype(np.uint8), 'RGBA').resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    layers = []
    for name, (src, kind, m) in {**TILES, **FROM_VILLAGE}.items():
        path = src if src.endswith('.webp') else f'{CUT}/{src}.webp'
        im = Image.open(path).convert('RGB')
        if name == 'marble':   # pale in a dark nave reads as lit paper: take it down to what stone reflects
            im = Image.fromarray((np.asarray(im, np.float32) * 0.72).astype(np.uint8))
        rgb = np.asarray(im, dtype=np.float32) / 255
        im.resize((TILE, TILE), Image.LANCZOS).save(f'{OUT}/{name}_c.webp', quality=82, method=5)
        detail(rgb, kind, TILE_D).save(f'{OUT}/{name}_d.webp', quality=62, method=5, alpha_quality=70, exact=True)
        layers.append({'name': name, 'kind': kind, 'metres': m})
    atlas, pieces = [], {}
    for i, pair in enumerate(PAIRS):
        sheet = Image.new('RGBA', (ATLAS, ATLAS), (0, 0, 0, 0))
        cell = ATLAS // len(pair)
        for k, p in enumerate(pair):
            im = Image.open(f'{CUT}/{p}.webp').convert('RGBA')
            w, h = im.size
            s = min(cell / w, ATLAS / h)
            nw, nh = int(w * s), int(h * s)
            x0, y0 = cell * k + (cell - nw) // 2, (ATLAS - nh) // 2
            sheet.paste(im.resize((nw, nh), Image.LANCZOS), (x0, y0))
            pieces[p] = {'layer': f'atlas_{i}', 'uv': [x0 / ATLAS, y0 / ATLAS, (x0 + nw) / ATLAS, (y0 + nh) / ATLAS], 'aspect': w / h}
        # (Transparent pixels keep the colour beside them, so a mip level doesn't darken the edge.)
        a = np.asarray(sheet, np.uint8).copy()
        sheet = Image.fromarray(a, 'RGBA')
        sheet.save(f'{OUT}/atlas_{i}_c.webp', quality=88, method=5, alpha_quality=95, exact=True)
        glass = pair[0].startswith(('glass', 'rose'))
        rgb = np.asarray(sheet.convert('RGB'), np.float32) / 255
        detail(rgb, 'other' if glass else 'wood', ATLAS_D, 3.0).save(f'{OUT}/atlas_{i}_d.webp', quality=60, method=5, alpha_quality=70, exact=True)
        atlas.append({'name': f'atlas_{i}', 'kind': 'glass' if glass else 'banner'})
    with open(f'{OUT}/manifest.json', 'w') as f:
        json.dump({'tile': [TILE, TILE_D], 'atlas': [ATLAS, ATLAS_D], 'layers': layers, 'atlases': atlas, 'pieces': pieces}, f)
    total = sum(os.path.getsize(f'{OUT}/{n}') for n in os.listdir(OUT))
    print(len(layers), 'tiles', len(atlas), 'atlases', round(total / 1048576, 1), 'MB')


main()
