"""Give the witch a jaw: one new bone under her head, so her mouth can open as she speaks.

    python tools/lisandra/jaw_rig.py IN.glb OUT.glb [--sheet weights.png]

Her face is the owner's sculpt with the lips painted on: there is no inside to the mouth. So the jaw takes everything
below the painted line between her lips (measured off a flat front render of her texture, LIP below), cut sharp there,
and when it turns down the few big triangles across that line stretch. Stretched, they'd only show taller lips, so the
model-true shader darkens them by how far she's opened into the inside of her mouth (docs/RENDERING.md). The cheeks
beside the mouth and the skin under the chin go part of the way. Only weight her Head held is handed over (Tripo hung
a fifth of her lips and chin on her neck), so her neck blends as before.

Nothing else changes: her mesh, normals, UVs, textures, the other bones and every clip stay as they were. The new bone,
`Jaw`, is the last joint, a child of `mixamorig:Head` turned as the head is, at the hinge of her jaw; no clip moves it.
The scene's extras carry jaw: {joint, axis, open, lip}: the axis (in the bone's own frame) she opens about, the most it
opens in radians, and for the shader, in her own units, the lip line as y0 - k * (x - mid)^2, the mouth's half width,
how far in front the lips are (z), how tall the triangles across the line are, and how far the lips part per radian.
Needs NumPy.
"""
import json
import struct
import sys

import numpy as np

# Measured on the owner's witch (LISANDRA - UGLY OLD WITCH NEW.glb), in her own units (y up, z forward, 0.978 tall).
# LIP: the painted line between her lips, (x, y) left to right, from the darkest row of a flat front render.
LIP = [(-0.0138, 0.8238), (-0.0127, 0.8234), (-0.0109, 0.8234), (-0.0098, 0.8237), (-0.0080, 0.8241),
       (-0.0057, 0.8243), (-0.0028, 0.8246), (0.0001, 0.8244), (0.0025, 0.8246), (0.0054, 0.8245), (0.0077, 0.8242),
       (0.0095, 0.8239), (0.0112, 0.8235), (0.0130, 0.8233), (0.0142, 0.8236)]
MID = 0.0004              # her mouth's middle, between the corners
CORNER = 0.0140           # half the mouth's width
HINGE = (MID, 0.833, 0.012)   # where the jaw turns: in front of the ear, at the height of the nose's base
OPEN = 0.12               # the most it turns, radians: about a centimetre between her lips in the game
# The same line as a curve, fitted to LIP (y0 - k * (x - mid)^2): what the shader uses.
CURVE = (0.8246, 8.06, 0.0002)


def smooth(a, b, v):
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def jaw_weights(pos):
    """How much of each point the jaw carries, 0 to 1."""
    x, y, z = pos.T
    dx = np.abs(x - MID)
    lx, ly = np.array(LIP).T
    lip = np.interp(x, lx, ly)                       # held level past the corners
    # Below the line: all of it, cut sharp between the corners so the lips part cleanly; past the corners the cheek
    # gives way over a band that widens outward, so the corners stretch rather than tear.
    band = 0.0002 + 0.012 * smooth(CORNER - 0.002, CORNER + 0.02, dx)
    below = smooth(-band * 0.25, band, lip - y)
    side = 1 - smooth(0.018, 0.046, dx)              # out to the angle of the jaw, and no further (her hair hangs there)
    front = smooth(-0.005, 0.02, z)                  # the face and the chin, not behind the ear
    throat = smooth(0.772, 0.792, y)                 # the skin under the chin, fading into the neck
    return below * side * front * throat


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


def node_matrix(nd):
    x, y, z, w = nd.get('rotation', [0, 0, 0, 1])
    R = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                  [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                  [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * np.array(nd.get('scale', [1, 1, 1]))
    M[:3, 3] = nd.get('translation', [0, 0, 0])
    return M


def main(src, out, sheet=None):
    doc, buf = load(src)
    skin = doc['skins'][0]
    names = [doc['nodes'][j]['name'] for j in skin['joints']]
    if 'Jaw' in names:
        sys.exit('she already has a jaw')
    head = names.index('mixamorig:Head')
    prim = doc['meshes'][0]['primitives'][0]
    pos = view(doc, buf, prim['attributes']['POSITION'], np.float32, 3).astype(np.float64)
    ja = doc['accessors'][prim['attributes']['JOINTS_0']]
    wa = doc['accessors'][prim['attributes']['WEIGHTS_0']]
    assert ja['componentType'] == 5121 and wa['componentType'] == 5126 and len(names) < 255, 'expects u8 joints, float weights'
    J = view(doc, buf, prim['attributes']['JOINTS_0'], np.uint8, 4)
    W = view(doc, buf, prim['attributes']['WEIGHTS_0'], np.float32, 4)

    # The new joint: last, under the head, turned as the head is, at the hinge.
    jaw = len(names)
    parent = {c: i for i, nd in enumerate(doc['nodes']) for c in nd.get('children', [])}
    hn = skin['joints'][head]
    hw, i = np.eye(4), hn
    while i is not None:
        hw = node_matrix(doc['nodes'][i]) @ hw
        i = parent.get(i)
    R = hw[:3, :3] / np.linalg.norm(hw[:3, :3], axis=0)
    local_t = np.linalg.solve(hw[:3, :3], np.array(HINGE) - hw[:3, 3])
    doc['nodes'].append({'name': 'Jaw', 'translation': [float(v) for v in local_t]})
    jn = len(doc['nodes']) - 1
    doc['nodes'][hn].setdefault('children', []).append(jn)
    skin['joints'].append(jn)
    bind = hw.copy()
    bind[:3, 3] = HINGE
    ibm_old = view(doc, buf, skin['inverseBindMatrices'], np.float32, 16).copy()
    ibm = np.vstack([ibm_old, np.linalg.inv(bind).T.reshape(1, 16).astype(np.float32)])
    # She opens about her own side-to-side line, in the bone's frame.
    axis = R.T @ np.array([1.0, 0, 0])

    # Hand the jaw its share of what the head held.
    w = jaw_weights(pos)
    on_head = (J == head) & (W > 0)
    h = (W * on_head).sum(1)
    give = w * h
    moved = 0
    for v in np.nonzero(give > 1e-4)[0]:
        ws, js = W[v].astype(np.float64), J[v].astype(int)
        ws[(js == head) & (ws > 0)] *= 1 - w[v]
        free = np.nonzero(ws <= 0)[0]
        slot = free[0] if len(free) else int(np.argmin(ws))
        ws[slot], js[slot] = give[v], jaw
        ws /= ws.sum()
        W[v], J[v] = ws.astype(np.float32), js.astype(np.uint8)
        moved += 1

    # For the shader: the triangles across her lip line (one corner on the jaw, one not), how tall they are at rest, and
    # how fast their jaw corners drop as she opens (the jaw turns about her side-to-side line, so a point drops by its
    # distance in front of the hinge, times the share of it the jaw carries).
    tris = view(doc, buf, prim['indices'], {5123: np.uint16, 5125: np.uint32}[doc['accessors'][prim['indices']]['componentType']], 1)
    tris = tris.reshape(-1, 3).astype(np.int64)
    share = (W * (J == jaw)).sum(1)
    t_share, t_y = share[tris], pos[tris, 1]
    mid_x = np.abs(pos[tris, 0].mean(1) - MID)
    across = (t_share.max(1) > 0.5) & (t_share.min(1) < 0.05) & (mid_x < CORNER - 0.002) & (pos[tris, 2].min(1) > 0.02)
    rise = float(np.median(t_y[across].max(1) - t_y[across].min(1)))
    low = np.unique(tris[across][t_share[across] > 0.5])
    per_rad = float(np.median(share[low] * (pos[low, 2] - HINGE[2])))
    lip_z = float(np.median(pos[np.unique(tris[across]), 2]))
    y0, k, mid = CURVE
    lip = {'y0': y0, 'k': k, 'mid': mid, 'half': CORNER, 'z': round(lip_z, 4), 'rise': round(rise, 4), 'perRad': round(per_rad, 4)}

    # The new inverse binds go on the end of the buffer (once nothing looks into it: a bytearray can't grow under a view).
    del J, W, tris
    while len(buf) % 4:
        buf.append(0)
    raw = ibm.astype('<f4').tobytes()
    doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
    buf += raw
    doc['accessors'].append({'bufferView': len(doc['bufferViews']) - 1, 'componentType': 5126, 'count': len(ibm), 'type': 'MAT4'})
    skin['inverseBindMatrices'] = len(doc['accessors']) - 1
    scene = doc['scenes'][doc.get('scene', 0)]
    scene.setdefault('extras', {})['jaw'] = {'joint': 'Jaw', 'axis': [float(v) for v in axis / np.linalg.norm(axis)],
                                             'open': OPEN, 'lip': lip}

    doc['buffers'][0]['byteLength'] = len(buf)
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    print(f'jaw at {HINGE}, axis {np.round(axis, 3)}; {moved} points carry some jaw, {(w > 0.99).sum()} wholly; '
          f'{across.sum()} triangles across the lips; lip {lip}')
    if sheet:
        draw(pos, w, sheet)


def draw(pos, w, path):
    from PIL import Image
    sel = (pos[:, 1] > 0.76) & (pos[:, 1] < 0.88) & (np.abs(pos[:, 0]) < 0.07)
    S, size = 9000, 1100
    img = np.full((size, size * 2, 3), 255, np.uint8)
    for k, (i, flip) in enumerate([(0, 1), (2, 1)]):
        idx = np.nonzero(sel)[0]
        idx = idx[np.argsort(pos[idx, 2] if i == 0 else -pos[idx, 0])]  # nearer points last
        px = (size / 2 + pos[idx, i] * S * flip).astype(int) + k * size
        py = (size / 2 - (pos[idx, 1] - 0.82) * S).astype(int)
        ok = (px >= k * size) & (px < (k + 1) * size) & (py >= 0) & (py < size)
        c = w[idx][ok, None]
        img[py[ok], px[ok]] = (np.array([70, 90, 200]) * (1 - c) + np.array([230, 40, 30]) * c).astype(np.uint8)
    Image.fromarray(img).save(path)


if __name__ == '__main__':
    a = sys.argv[1:]
    sheet = a[a.index('--sheet') + 1] if '--sheet' in a else None
    main(a[0], a[1], sheet)
