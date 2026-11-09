"""Draw the plague knights' beaks out into a plague doctor's mask.

The Tripo masks carry a short beak that drops almost straight down onto the collar. A plague doctor's beak juts out
from between the eye lenses, nearly level, and curves down to a point. This re-lays the beak's own vertices along that
curve (same texture, same cross-section, longer), blending to nothing at the face so the eyes and hood don't move, and
binds the beak wholly to the head so it stays rigid.

Mesh space here: +X is the front, +Y up, Z across the shoulders (the model's T-pose arms run along Z).

    python tools/monsters/plague_beak.py SRC.glb OUT.glb
"""
import json
import struct
import sys
import os

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lisandra'))
from transfer_clips import load, accessor  # noqa: E402

A = np.array([0.060, 0.905, 0.0])     # the beak's root, inside the face between the lenses
B = np.array([0.096, 0.833, 0.0])     # the old tip, just above the collar
LEN = 0.125                            # new length along the curve
PHI0, PHI1 = np.radians(-12), np.radians(-52)   # direction below level, at the root and at the tip
R0, R1 = 0.030, 0.008                  # the old beak's radius at root and tip


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def curve(s, n=64):
    """Points and directions along the new beak at fractions s (0 root, 1 tip; extrapolated past 1)."""
    ss = np.linspace(0, 1.3, n * 2)
    phi = PHI0 + (PHI1 - PHI0) * np.clip(ss, 0, 1)
    d = np.stack([np.cos(phi), np.sin(phi), np.zeros_like(phi)], 1)
    pts = A + np.concatenate([[[0, 0, 0]], np.cumsum((d[1:] + d[:-1]) / 2 * np.diff(ss)[:, None] * LEN, 0)])
    k = np.clip(np.searchsorted(ss, s) - 1, 0, len(ss) - 2)
    a = ((s - ss[k]) / (ss[k + 1] - ss[k]))[:, None]
    return pts[k] * (1 - a) + pts[k + 1] * a, PHI0 + (PHI1 - PHI0) * np.clip(s, 0, 1)


def reshape(P, N):
    u = (B - A) / np.linalg.norm(B - A)
    n_old = np.array([-u[1], u[0], 0])
    len0 = np.linalg.norm(B - A)
    d = P - A
    t = d @ u / len0
    rn, rz = d @ n_old, d[:, 2]
    # Below the beak sits the mask's chin plate: take less there.
    r = np.hypot(np.where(rn < 0, rn / 0.5, rn), rz)
    R = R0 * (1 - np.clip(t, 0, 1)) + R1 * np.clip(t, 0, 1)
    w = smooth(0.08, 0.35, t) * (1 - smooth(1.0, 1.35, r / R)) * (t < 1.25) * (P[:, 0] > 0.045) * (P[:, 1] > 0.829)
    c, phi = curve(np.maximum(t, 0))
    n_new = np.stack([-np.sin(phi), np.cos(phi), np.zeros_like(phi)], 1)
    # A fuller cone: thicker toward the face, the old point kept at the tip.
    fat = (1.4 - 0.4 * np.clip(t, 0, 1))[:, None]
    new = c + fat * (rn[:, None] * n_new + rz[:, None] * np.array([0, 0, 1.0]))
    P2 = P + w[:, None] * (new - P)
    ang = (phi - np.arctan2(u[1], u[0])) * w
    ca, sa = np.cos(ang), np.sin(ang)
    N2 = N.copy()
    N2[:, 0], N2[:, 1] = ca * N[:, 0] - sa * N[:, 1], sa * N[:, 0] + ca * N[:, 1]
    return P2, N2, w


def write_acc(doc, buf, i, arr):
    a = doc['accessors'][i]
    v = doc['bufferViews'][a['bufferView']]
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = v.get('byteStride', 12)
    for k in range(3):
        np.ndarray((a['count'],), np.float32, buf, start + 4 * k, (stride,))[:] = arr[:, k]
    if 'min' in a:
        a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()


def main(src, out):
    doc, buf = load(src)
    prim = doc['meshes'][0]['primitives'][0]
    at = prim['attributes']
    P, N = accessor(doc, buf, at['POSITION']), accessor(doc, buf, at['NORMAL'])
    P2, N2, w = reshape(P, N)
    moved = w > 0.01
    print(f'{moved.sum()} vertices moved; tip now at {P2[moved][np.argmax(P2[moved, 0])].round(3)}')
    write_acc(doc, buf, at['POSITION'], P2)
    write_acc(doc, buf, at['NORMAL'], N2 / np.linalg.norm(N2, axis=1, keepdims=True))
    # The beak goes wholly to the head.
    names = [doc['nodes'][j]['name'] for j in doc['skins'][0]['joints']]
    head = names.index('mixamorig:Head')
    J, W = at['JOINTS_0'], at['WEIGHTS_0']
    ja, wa = doc['accessors'][J], doc['accessors'][W]
    jdt = {5121: np.uint8, 5123: np.uint16}[ja['componentType']]
    jv, wv = doc['bufferViews'][ja['bufferView']], doc['bufferViews'][wa['bufferView']]
    js = np.ndarray((ja['count'], 4), jdt, buf, jv.get('byteOffset', 0) + ja.get('byteOffset', 0),
                    (jv.get('byteStride', 4 * np.dtype(jdt).itemsize), np.dtype(jdt).itemsize))
    assert wa['componentType'] == 5126
    ws = np.ndarray((wa['count'], 4), np.float32, buf, wv.get('byteOffset', 0) + wa.get('byteOffset', 0),
                    (wv.get('byteStride', 16), 4))
    hard = w > 0.3
    js[hard] = [head, 0, 0, 0]
    ws[hard] = [1, 0, 0, 0]
    js_ = json.dumps(doc, separators=(',', ':')).encode()
    js_ += b' ' * (-len(js_) % 4)
    with open(out, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js_) + len(buf)))
        f.write(struct.pack('<II', len(js_), 0x4E4F534A) + js_)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
