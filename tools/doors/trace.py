"""What the door pictures show, for tools/doors/model.py to model over: where the planks meet, which spots are rivets, and maps for the one atlas they share.
Writes assets/game/items/doors_{c,n,m}.webp into tools/build/doors (the glb carries them) and tools/build/doors/trace.json.

    python tools/doors/trace.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
IN = os.path.join(ROOT, 'assets', 'game', 'interior')
OUT = os.path.join(ROOT, 'tools', 'build', 'doors')
NAMES = ('door_great', 'door_pointed', 'door_iron', 'door_iron2')
SIZE = 1024


def trace(name):
    im = np.asarray(Image.open(os.path.join(IN, f'{name}_c.webp')).convert('RGBA').resize((SIZE, SIZE), Image.LANCZOS), np.float32) / 255
    rgb, a = im[..., :3], im[..., 3] > 0.5
    ys, xs = np.nonzero(a)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    # Iron is what has no colour in it; old oak always has.
    iron = (sat < 0.34) & a
    iron = ndimage.binary_opening(ndimage.binary_closing(iron, iterations=3), iterations=3)
    keep = iron
    # A rivet is a small round bright spot with a dark ring round it.
    lum = rgb.mean(-1)
    blob = -ndimage.gaussian_laplace(lum, 5.0) * 25
    peak = (blob == ndimage.maximum_filter(blob, 21)) & (blob > 0.1) & ndimage.binary_erosion(a, iterations=8)
    studs = [[round(x / SIZE, 4), round(y / SIZE, 4), round(9.5 / SIZE, 4)] for y, x in zip(*np.nonzero(peak))]
    # Where one plank meets the next: dark lines straight down the wood.
    wood = a & ~ndimage.binary_dilation(keep, iterations=3)
    band = np.where(wood, lum, np.nan)
    with np.errstate(invalid='ignore'):
        prof = np.nanmedian(band[int(y0 + (y1 - y0) * 0.35):int(y0 + (y1 - y0) * 0.95)], axis=0)
    prof = np.nan_to_num(prof, nan=float(np.nanmedian(prof)))
    dip = ndimage.uniform_filter1d(prof, 41) - prof
    # (The strongest first, and no plank narrower than a hand and a half.)
    seams = []
    for x in sorted(range(x0 + 40, x1 - 40), key=lambda x: -dip[x]):
        if dip[x] > 0.012 and all(abs(x - q) > 62 for q in seams):
            seams.append(x)
    seams = [round(x / SIZE, 4) for x in sorted(seams)]
    outline = []
    for x in np.linspace(x0, x1 - 1, 65):
        col = np.nonzero(a[:, int(x)])[0]
        outline.append([round(float(x) / SIZE, 4), round(int(col.min()) / SIZE, 4)])
    print(name, 'box', (x0, y0, x1, y1), 'studs', len(studs), 'seams', len(seams))
    return {'box': [x0 / SIZE, y0 / SIZE, x1 / SIZE, y1 / SIZE], 'studs': studs, 'seams': seams, 'outline': outline}, rgb, keep, a


def maps(pics):
    n = SIZE * 2
    c, nm, m = np.zeros((n, n, 3), np.float32), np.zeros((n, n, 3), np.float32), np.zeros((n, n, 3), np.float32)
    for i, (rgb, iron, a) in enumerate(pics):
        ox, oy = (i % 2) * SIZE, (i // 2) * SIZE
        lum = rgb.mean(-1)
        h = ndimage.gaussian_filter(lum, 0.8)
        gx, gy = ndimage.sobel(h, axis=1), ndimage.sobel(h, axis=0)
        k = 1.6
        nx, ny, nz = -gx * k, gy * k, np.ones_like(h)
        L = np.sqrt(nx * nx + ny * ny + nz * nz)
        soft = ndimage.gaussian_filter(iron.astype(np.float32), 1.2)
        c[oy:oy + SIZE, ox:ox + SIZE] = rgb
        nm[oy:oy + SIZE, ox:ox + SIZE] = np.stack([nx / L, ny / L, nz / L], -1) * 0.5 + 0.5
        m[oy:oy + SIZE, ox:ox + SIZE] = np.stack([np.ones_like(h), np.clip(0.82 - soft * 0.32 - lum * 0.12, 0.3, 1), soft * 0.85], -1)
    for name, v in (('doors_c', c), ('doors_n', nm), ('doors_m', m)):
        Image.fromarray((np.clip(v, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGB').save(os.path.join(OUT, f'{name}.png'))


os.makedirs(OUT, exist_ok=True)
result, pics = {}, []
for name in NAMES:
    t, rgb, iron, a = trace(name)
    result[name] = t
    pics.append((rgb, iron, a))
maps(pics)
json.dump(result, open(os.path.join(OUT, 'trace.json'), 'w'))
print(json.dumps({k: {'seams': v['seams'], 'studs': len(v['studs'])} for k, v in result.items()}))
