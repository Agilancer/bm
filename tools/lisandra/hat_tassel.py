"""Take the tassel off the witch's hat.

    python tools/lisandra/hat_tassel.py IN.glb OUT.glb [--sheet before_after.png]

The owner's witch (LISANDRA - UGLY OLD WITCH NEW.glb) has a thin tassel hanging from the brim of her hat, over her left
shoulder: 312 triangles, one piece with the hat. Tripo's rig hung the top of it on her head and the bottom of it on her
left arm, so in the game it stretched from her brim to wherever her arm was. On the owner's word (2026-11-10) it goes.

Its triangles are left out of the index list, and the ring of eight points where it grew from the brim's underside is
drawn in to one point on the brim, which closes the hole it would leave (they move a centimetre at most, in her own
units, on a brim 0.3 wide).
Nothing else changes: every vertex stays in the file with its normal, UV, weights and skirt mask (the tassel's own are
simply no longer drawn), so the bones, the jaw, the clips and the textures are as they were, and the file is the same
size. Run it last, after jaw_rig.py (docs/RENDERING.md, "The witch's gown"). A file with no tassel is refused.
Needs NumPy; the sheet needs Pillow.
"""
import json
import struct
import sys

import numpy as np

# Measured on the owner's witch, in her own units (y up, x to her left, z forward, 0.978 tall, arms out level).
# The tassel hangs in this box: narrow in x and z, from just over her arm (whose top is at 0.770) to the brim's underside.
BOX = {'x': (0.116, 0.131), 'y': (0.778, 0.856), 'z': (0.009, 0.0215)}
EXPECT = (280, 340)       # how many triangles that should be, or this isn't the model the box was measured on
INDEX_TYPES = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32}


def load(path):
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    m = struct.unpack_from('<I', data, 20 + n)[0]
    return doc, bytearray(data[28 + n:28 + n + m])


def view(doc, buf, i, dtype, width):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    size = np.dtype(dtype).itemsize
    return np.ndarray((a['count'], width), dtype, buf, v.get('byteOffset', 0) + a.get('byteOffset', 0),
                      (v.get('byteStride', width * size), size))


def tassel(pos, tris):
    """Which triangles are the tassel: every one that lies wholly in its box."""
    p = pos[tris]
    inside = np.ones(len(tris), bool)
    for axis, (lo, hi) in zip(range(3), (BOX['x'], BOX['y'], BOX['z'])):
        inside &= (p[:, :, axis].min(1) > lo) & (p[:, :, axis].max(1) < hi)
    return inside


def main(src, out, sheet=None):
    doc, buf = load(src)
    prim = doc['meshes'][0]['primitives'][0]
    pos32 = view(doc, buf, prim['attributes']['POSITION'], np.float32, 3)
    pos = pos32.astype(np.float64)
    ia = doc['accessors'][prim['indices']]
    idx = view(doc, buf, prim['indices'], INDEX_TYPES[ia['componentType']], 1)
    tris = idx.reshape(-1, 3).astype(np.int64)

    gone = tassel(pos, tris)
    if not EXPECT[0] <= gone.sum() <= EXPECT[1]:
        sys.exit(f'{gone.sum()} triangles where the tassel should be (expected {EXPECT[0]} to {EXPECT[1]}): '
                 'it is already off, or this is not the witch the box was measured on')

    # Points at the same place are one point (a seam in her UVs has two there). The ring the tassel grew from: its
    # points that what's left of her still uses.
    _, weld = np.unique(np.round(pos * 1e5).astype(np.int64), axis=0, return_inverse=True)
    weld = weld.ravel()
    on_tassel = np.zeros(weld.max() + 1, bool)
    on_tassel[weld[tris[gone]].ravel()] = True
    kept = np.zeros(weld.max() + 1, bool)
    kept[weld[tris[~gone]].ravel()] = True
    ring = on_tassel & kept
    ring_points = np.nonzero(ring[weld])[0]
    # Drawn in to where the ring meets the brim itself (its highest points: the rest are a collar hanging under it), so
    # what's left lies in the brim's own surface and not a pinch below it.
    ring_y = pos[ring_points, 1]
    centre = pos[ring_points][ring_y > ring_y.max() - 0.0025].mean(0)
    reach = np.linalg.norm(pos[ring_points] - centre, axis=1).max()
    assert 3 <= ring.sum() <= 16 and reach < 0.012, f'the ring is {ring.sum()} points, {reach:.4f} across: not as measured'
    before = pos.copy()

    pos32[ring_points] = centre.astype(np.float32)
    left = tris[~gone].astype(idx.dtype).reshape(-1, 1)
    idx[:len(left)] = left
    idx[len(left):] = 0                       # (the rest of the index list's bytes stay in the file, unused)
    ia['count'] = int(len(left))
    del pos32, idx

    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    print(f'{gone.sum()} triangles off ({len(left) // 3} left); the ring of {ring.sum()} points drawn in to '
          f'{np.round(centre, 4)} (the furthest moved {reach * 1000:.1f} mm)')
    if sheet:
        after = before.copy()
        after[ring_points] = centre
        draw(before, tris, after, tris[~gone], sheet)


def draw(before, tris_before, after, tris_after, path):
    """Her head from the front, with the tassel and without, flat shaded."""
    from PIL import Image

    def head(pos, tris, w=560, box=(-0.26, 0.26, 0.70, 0.99)):
        x0, x1, y0, y1 = box
        h = int(w * (y1 - y0) / (x1 - x0))
        depth = np.full((h, w), -1e9)
        img = np.full((h, w, 3), (38, 38, 58), np.uint8)
        p = pos[tris]
        near = (p[:, :, 1].max(1) > y0) & (np.abs(p[:, :, 0]).min(1) < x1)
        sx = (pos[:, 0] - x0) / (x1 - x0) * w
        sy = (y1 - pos[:, 1]) / (y1 - y0) * h
        for a, b, c in tris[near]:
            xs, ys = sx[[a, b, c]], sy[[a, b, c]]
            ax, bx = int(max(0, np.floor(xs.min()))), int(min(w - 1, np.ceil(xs.max())))
            ay, by = int(max(0, np.floor(ys.min()))), int(min(h - 1, np.ceil(ys.max())))
            d = (xs[1] - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (ys[1] - ys[0])
            if bx < ax or by < ay or abs(d) < 1e-9:
                continue
            gx, gy = np.meshgrid(np.arange(ax, bx + 1) + 0.5, np.arange(ay, by + 1) + 0.5)
            w1 = ((gx - xs[0]) * (ys[2] - ys[0]) - (xs[2] - xs[0]) * (gy - ys[0])) / d
            w2 = ((xs[1] - xs[0]) * (gy - ys[0]) - (gx - xs[0]) * (ys[1] - ys[0])) / d
            w0 = 1 - w1 - w2
            z = w0 * pos[a, 2] + w1 * pos[b, 2] + w2 * pos[c, 2]
            part = depth[ay:by + 1, ax:bx + 1]
            hit = (w0 >= 0) & (w1 >= 0) & (w2 >= 0) & (z > part)
            part[hit] = z[hit]
            n = np.cross(pos[b] - pos[a], pos[c] - pos[a])
            img[ay:by + 1, ax:bx + 1][hit] = 90 + 150 * abs(n[2]) / (np.linalg.norm(n) + 1e-12)
        return Image.fromarray(img)

    a, b = head(before, tris_before), head(after, tris_after)
    sheet = Image.new('RGB', (a.width * 2 + 8, a.height), (255, 0, 255))
    sheet.paste(a, (0, 0))
    sheet.paste(b, (a.width + 8, 0))
    sheet.save(path)


if __name__ == '__main__':
    args = sys.argv[1:]
    sheet_to = None
    if '--sheet' in args:
        at = args.index('--sheet')
        sheet_to = args[at + 1] if at + 1 < len(args) else sys.exit(__doc__)
        del args[at:at + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    main(args[0], args[1], sheet_to)
