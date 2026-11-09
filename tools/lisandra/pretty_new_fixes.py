"""The touch-ups on the new Pretty (the owner's Tripo model, LISANDRA - PRETTY NEW + RIGGING.glb), for both tools:

    python tools/lisandra/transfer_clips.py tools/build/lisandra/pretty_src.glb NEW_RIG.glb tools/build/lisandra/new/pretty_new_clips.glb
    python tools/lisandra/surface_paste.py tools/build/lisandra/new/pretty_new_clips.glb tools/build/lisandra/new/pretty_new_painted.glb tools/lisandra/pretty_new_fixes.py
    python tools/lisandra/reweight.py tools/build/lisandra/new/pretty_new_painted.glb assets/game/lisandra/pretty.glb tools/lisandra/pretty_new_fixes.py

Nothing is generated or reshaped. The texture fix copies her own leather; the rest is which bones move what.
- The hanging panel on her right hip: Tripo painted it as a navy lattice that read as cracked paint, with a white-to-blue
  inner face that showed as a bright blade from the front. It takes the plain trouser leather from the back of her left
  thigh instead (mirrored, stretched to the panel's length; her left thigh's outer side carries a dagger sheath).
- The panel was all right thigh, a rigid board: now it hangs from the belt (Hips) and rests on the thigh.
- The hair was weighted to her shoulders and arms: now by where it sits, head to nape to down her back.
- The trouser under the panel's back edge was painted the panel's blue-grey: it takes the same leather.
- Every UV island is bled 12 texels out, so mipmaps don't pull the background into the seams.
"""
import numpy as np
from scipy.spatial import cKDTree

import surface_paste as sp


def _off_mirror(m, side):
    """How far each face's middle sits from the other side of her, mirrored: what one side has and the other hasn't.
    side +1 measures against her left (x > 0), -1 against her right."""
    other = np.nonzero(m.cent[:, 0] * side > 0)[0]
    tree = cKDTree(m.cent[other])
    Q = m.cent * np.array([-1, 1, 1])
    _, cand = tree.query(Q, k=8)
    best = np.full(len(Q), np.inf)
    for k in range(8):
        t = m.tri[other[cand[:, k]]]
        q, _ = sp.closest_on_triangles(Q, m.pos[t[:, 0]], m.pos[t[:, 1]], m.pos[t[:, 2]])
        best = np.minimum(best, np.linalg.norm(q - Q, axis=1))
    return best


# Points on the panel's two big outer pieces; its other pieces are what stands off her right thigh with no match on her left.
PANEL_AT = [[-0.1072, 0.4634, 0.0563], [-0.1174, 0.4589, -0.0022]]


def panel(m):
    c = m.cent
    off = (c[:, 0] < -0.087) & (c[:, 1] > 0.347) & (c[:, 1] < 0.556) & (_off_mirror(m, 1) > 0.006)
    _, near = cKDTree(c).query(np.array(PANEL_AT))
    return np.union1d(np.nonzero(off)[0], np.nonzero(np.isin(m.island, m.island[near]))[0])


def under_panel(m):
    """The trouser just under and behind the panel, which Tripo painted the panel's blue-grey; it shows when the panel lifts.
    Faces on her thigh's own surface (matched on her left), pale or bluish."""
    c = m.cent
    col = face_col(m)
    tint = (col.mean(1) > 0.17) & (col[:, 2] - col[:, 0] > 0.025)
    box = (c[:, 0] < -0.075) & (c[:, 1] > 0.35) & (c[:, 1] < 0.61) & (c[:, 2] > -0.05) & (c[:, 2] < 0.07)
    return np.setdiff1d(np.nonzero(box & tint & (_off_mirror(m, 1) < 0.0015))[0], panel(m))


def left_thigh_back(m):
    """The back of her left thigh's trouser, between the knee guard and the seat; only faces her right side matches."""
    c = m.cent
    box = (c[:, 0] > 0.02) & (c[:, 1] > 0.36) & (c[:, 1] < 0.51) & (c[:, 2] < 0.0)
    return np.nonzero(box & (_off_mirror(m, -1) < 0.002))[0]


def face_col(m):
    """Each face's colour at its middle."""
    if not hasattr(m, '_col'):
        im, _ = sp.image_of(m.doc, m.buf, m.doc['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index'])
        img = np.asarray(im.convert('RGB'), np.float64) / 255
        m._col = sp.sample(img, m.uv[m.tri].mean(1))
    return m._col


def face_lum(m):
    return face_col(m).mean(1)


def hair(m):
    """Her hair: dark UV islands above the waist and inside her shoulders' width, and the greyer ones on her head."""
    lum, isl, c = face_lum(m), m.island, m.cent
    n = isl.max() + 1
    cnt = np.bincount(isl, minlength=n)
    ml = np.bincount(isl, lum, n) / np.maximum(cnt, 1)
    my = np.bincount(isl, c[:, 1], n) / np.maximum(cnt, 1)
    ymin = np.full(n, 9.0)
    np.minimum.at(ymin, isl, c[:, 1])
    xmax = np.zeros(n)
    np.maximum.at(xmax, isl, np.abs(c[:, 0]))
    ok = (((ml < 0.125) & (my > 0.62) & (xmax < 0.14)) | ((ml < 0.16) & (my > 0.62) & (xmax < 0.12))
          | ((ml < 0.16) & (ymin > 0.8) & (xmax < 0.12)))
    return np.nonzero(ok[isl])[0]


def ss(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def panel_weights(p):
    # Mostly Hips at the belt row; 90% thigh from 12 cm down, where it rests on the thigh.
    s = ss((0.61 - p[:, 1]) / 0.12)
    return {'RightUpLeg': 0.15 + 0.75 * s, 'Hips': 0.85 - 0.75 * s}


def hair_weights(p):
    """By where each point sits, never by what it had, so stacked layers of hair move as one sheet."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    # All Head from about ear level up beside her face (the Head joint is at 0.879); behind, only the back of the skull,
    # so hair hanging below it doesn't swing up into a shelf when she bows her head.
    behind = ss((-0.02 - z) / 0.03)
    head = ss((y - 0.84 - 0.05 * behind) / 0.06)
    neck = (1 - head) * ss((y - 0.76) / 0.08)   # the nape and the hair over the collar
    low = 1 - head - neck                       # shoulder-blade length and below: down her spine, so a bow tilts it less
    a = ss((0.74 - y) / 0.08)
    b = ss((0.67 - y) / 0.06)
    w = {'Head': head, 'Neck': neck, 'Spine2': low * (1 - 0.6 * a), 'Spine1': low * (0.6 * a - 0.3 * b), 'Spine': low * 0.3 * b}
    # Hair lying on a shoulder pad rides it a little (15%), so the pad doesn't rise through it.
    pad = 0.15 * ss((np.abs(x) - 0.07) / 0.04) * ss((0.84 - y) / 0.03) * ss((y - 0.70) / 0.04)
    w = {k: v * (1 - pad) for k, v in w.items()}
    w['RightShoulder'] = pad * (x < 0)
    w['LeftShoulder'] = pad * (x >= 0)
    return w


FIXES = [
    {'name': 'hip panel: leather from the back of her left thigh', 'faces': panel, 'mirror': True,
     'scale': [1, 0.49, 1], 'pivot': [0, 0.392, 0], 'shift': [0, 0, -0.07], 'source': left_thigh_back},
    {'name': 'trouser under the panel: the same leather', 'faces': under_panel, 'mirror': True,
     'scale': [1, 0.49, 1], 'pivot': [0, 0.392, 0], 'shift': [0, 0, -0.07], 'source': left_thigh_back},
]
PAD = 12

REWEIGHTS = [
    {'name': 'hip panel: hangs from the belt, rests on the thigh', 'faces': panel, 'weights': panel_weights},
    {'name': 'hair: head, nape, back', 'faces': hair, 'weights': hair_weights},
]
