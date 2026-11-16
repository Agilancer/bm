"""Numbers on the dragon clips: feet that slide or sink, joints that pop, loops that don't join.

    python tools/dragons/clipcheck.py green              # every clip
    python tools/dragons/clipcheck.py green walk run     # some

Per clip: slide = the most a planted foot moves along the ground while it's down (mm on a 20 m dragon); sink = how far
the deepest foot goes under the floor; pop = the biggest jump in any joint's turning speed from one frame to the next (degrees per frame, at 30 fps), and
which; fast = the fastest any joint turns in a frame;
seam = for loops, how far the last frame is from the first (degrees, worst joint).
"""
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import clips as C  # noqa: E402
from dragonanim import Skel  # noqa: E402

M = 20.0 / 1.0          # metres per model unit, near enough (the model is a unit across the wings, 20 m nose to tail)


def angle(a, b):
    d = np.abs((a * b).sum(-1)).clip(0, 1)
    return np.degrees(2 * np.arccos(d))


def check(color, names=None):
    sk = Skel(color)
    C.SK_NOW[0] = sk
    # where each foot meets the ground: the forepaw's toe bases (it rolls over them), the hind foot's ball
    feet = {f'paw_{S}': [sk.ix[n] for n in sk.names if n.startswith('ftoe') and n.endswith(f'a_{S}')] for S in 'LR'}
    feet.update({f'foot_{S}': [sk.ix[f'foot_{S}']] for S in 'LR'})
    rows = []
    for name, fn in C.CLIPS.items():
        if names and name not in names:
            continue
        c = fn()
        t, L, rootT, P = C.bake(sk, c)
        air = c.info.get('air')
        slide, sink = 0.0, 0.0
        for fname, js in feet.items():
            y0 = sk.pos[js, 1].mean()
            y = P[:, js, 1].mean(1) - y0
            down = y < 0.0015
            sink = max(sink, -y.min())
            if air:
                continue
            xz = P[:, js][:, :, [0, 2]].mean(1)
            # runs of frames down: how far the foot travels inside each
            i = 0
            while i < len(t):
                if not down[i]:
                    i += 1
                    continue
                k = i
                while k + 1 < len(t) and down[k + 1]:
                    k += 1
                if k > i:
                    seg = xz[i:k + 1]
                    slide = max(slide, np.linalg.norm(seg - seg[0], axis=1).max())
                i = k + 1
        da = angle(L[1:], L[:-1])
        if c.loop:
            da = np.concatenate([da, da[:1]], 0)      # across the seam, as it plays round
        # a pop is a turn that jumps in speed from one frame to the next, not one that is merely fast
        jerk = np.abs(np.diff(da, axis=0))
        j = np.unravel_index(np.argmax(jerk), jerk.shape)
        pop, popj = jerk[j], sk.names[j[1]]
        fast = da.max()
        seam = angle(L[0], L[-1]).max() if c.loop else 0.0
        rows.append((name, c.dur, slide * M * 1000, sink * M * 1000, pop, popj, seam, fast))
    print(f'{color}: {"clip":14s} {"dur":>5s} {"slide mm":>9s} {"sink mm":>8s} {"pop":>6s} {"at":12s} {"fast":>5s} {"seam":>5s}')
    for r in rows:
        flag = ' <' if r[2] > 60 or r[3] > 40 or r[4] > 12 or r[6] > 1 else ''
        print(f'{"":7s}{r[0]:14s} {r[1]:5.1f} {r[2]:9.0f} {r[3]:8.0f} {r[4]:6.1f} {r[5]:12s} {r[7]:5.1f} {r[6]:5.2f}{flag}')
    return rows


def under(color, names=None, least=-0.008):
    """Clips with a joint (the root aside, which sits on the ground) under the floor: (clip, joint, depth, time)."""
    sk = Skel(color)
    C.SK_NOW[0] = sk
    out = []
    for name, fn in C.CLIPS.items():
        if names and name not in names:
            continue
        c = fn()
        t, L, rootT, P = C.bake(sk, c)
        floor = c.get('floor', t)
        y = P[:, 1:, 1] - floor[:, None]
        f, j = np.unravel_index(np.argmin(y), y.shape)
        if y[f, j] < least:
            out.append((name, sk.names[j + 1], round(float(y[f, j]) * M, 2), round(float(t[f]), 2)))
    return out


def pops(color, name, top=6):
    """Where a clip's pops are: (joint, time, jump), biggest first, one per joint."""
    sk = Skel(color)
    C.SK_NOW[0] = sk
    c = C.CLIPS[name]()
    t, L, rootT, P = C.bake(sk, c)
    da = angle(L[1:], L[:-1])
    jerk = np.abs(np.diff(da, axis=0))
    best = jerk.max(0)
    out = []
    for j in np.argsort(best)[::-1][:top]:
        f = int(jerk[:, j].argmax())
        out.append((sk.names[j], round(float(t[f + 1]), 2), round(float(best[j]), 1)))
    return out


def slides(color, name, least=0.0015):
    """Each time a planted foot moves along the ground: (foot, from, to, mm), biggest first."""
    sk = Skel(color)
    C.SK_NOW[0] = sk
    c = C.CLIPS[name]()
    t, L, rootT, P = C.bake(sk, c)
    feet = {f'paw_{S}': [sk.ix[n] for n in sk.names if n.startswith('ftoe') and n.endswith(f'a_{S}')] for S in 'LR'}
    feet.update({f'foot_{S}': [sk.ix[f'foot_{S}']] for S in 'LR'})
    out = []
    for fname, js in feet.items():
        y = P[:, js, 1].mean(1) - sk.pos[js, 1].mean()
        xz = P[:, js][:, :, [0, 2]].mean(1)
        down = y < 0.0015
        i = 0
        while i < len(t):
            if not down[i]:
                i += 1
                continue
            k = i
            while k + 1 < len(t) and down[k + 1]:
                k += 1
            m = np.linalg.norm(xz[i:k + 1] - xz[i], axis=1).max() if k > i else 0
            if m > least:
                out.append((fname, round(float(t[i]), 2), round(float(t[k]), 2), round(float(m * M * 1000))))
            i = k + 1
    return sorted(out, key=lambda r: -r[3])


if __name__ == '__main__':
    if sys.argv[1:2] == ['under']:
        print(under(sys.argv[2], sys.argv[3:] or None))
        sys.exit()
    if sys.argv[1:2] == ['slides']:
        col = sys.argv[2]
        for nm in sys.argv[3:]:
            print(nm, slides(col, nm)[:6])
        sys.exit()
    if sys.argv[1:2] == ['pops']:
        col = sys.argv[2]
        for nm in sys.argv[3:]:
            print(nm, pops(col, nm))
        sys.exit()
    argv = sys.argv[1:]
    colors = [a for a in argv if a in ('black', 'green', 'red', 'undead')] or ['green']
    names = [a for a in argv if a in C.CLIPS] or None
    for col in colors:
        check(col, names)
