"""The dragons' clip solver: a clip is a set of drivers (curves over time for the body, spine, neck, head, jaw, tail, each
wing and each foot), and solve() turns them into joint rotations on one dragon's skeleton (tools/dragons/fit.py).

Why drivers and not raw rotations: the four dragons share one skeleton but not one rest pose. Their wings rest raised
with the fingers hanging, their tails curl round their bodies, each its own way. So a wing or a tail is posed by aiming its
bones at target directions (spread, folded, straight back), solved per dragon from its own rest shape; the legs reach their
feet by two-bone IK to targets on the ground, so planted feet stay put; the spine, neck, head and jaw, which rest much
alike, turn by plain angles.

Frames: the model's own (glTF): x is the dragon's left, y up, z forward. Every bind rotation is identity, so a joint's
local axes are the model's axes until something turns it. Quaternions are (x, y, z, w).
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
RIGGED = os.path.join(HERE, '..', '..', 'art', 'dragons', 'rigged')
X, Y, Z = np.eye(3)
ID = np.array([0, 0, 0, 1.0])


# ---- quaternions over any leading shape --------------------------------------------------------------------------------

def qmul(a, b):
    ax, ay, az, aw = np.moveaxis(a, -1, 0)
    bx, by, bz, bw = np.moveaxis(b, -1, 0)
    return np.stack([aw * bx + ax * bw + ay * bz - az * by,
                     aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw,
                     aw * bw - ax * bx - ay * by - az * bz], -1)


def qinv(q):
    return q * np.array([-1, -1, -1, 1.0])


def qrot(q, v):
    u, w = q[..., :3], q[..., 3:4]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


def norm(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def qnorm(q):
    return q / np.maximum(np.linalg.norm(q, axis=-1, keepdims=True), 1e-12)


def qaxis(axis, deg):
    """Turn about axis by deg (degrees; an array of them gives an array of turns)."""
    deg = np.asarray(deg, float)
    axis = norm(np.asarray(axis, float))
    h = np.radians(deg)[..., None] / 2
    return np.concatenate([np.sin(h) * axis, np.cos(h)], -1)


def arc(u, v):
    """The shortest turn taking direction u to direction v."""
    u, v = norm(u), norm(v)
    u, v = np.broadcast_arrays(u, v)
    d = (u * v).sum(-1, keepdims=True)
    q = np.concatenate([np.cross(u, v), 1 + d], -1)
    bad = q[..., 3] < 1e-6
    if bad.any():     # opposite: half a turn about anything square to u
        p = np.cross(u[bad], X)
        p = np.where(np.linalg.norm(p, axis=-1, keepdims=True) < 1e-6, np.cross(u[bad], Y), p)
        q[bad] = np.concatenate([norm(p), np.zeros((len(p), 1))], -1)
    return qnorm(q)


def nlerp(a, b, w):
    w = np.asarray(w, float)[..., None]
    s = np.where((a * b).sum(-1, keepdims=True) < 0, -1.0, 1.0)
    return qnorm(a * (1 - w) + b * s * w)


def dlerp(a, b, w):
    w = np.asarray(w, float)[..., None]
    return norm(a * (1 - w) + b * w)


def dslerp(a, b, w):
    """Directions blended along the arc between them, at an even rate (a straight blend of two far-apart directions
    rushes through the middle)."""
    w = np.asarray(w, float)[..., None]
    a, b, w = np.broadcast_arrays(norm(a), norm(b), w)
    w = w[..., :1]
    d = np.clip((a * b).sum(-1, keepdims=True), -1, 1)
    th = np.arccos(d)
    s = np.sin(th)
    ok = s > 1e-5
    s = np.where(ok, s, 1.0)
    out = np.where(ok, np.sin((1 - w) * th) / s * a + np.sin(w * th) / s * b, a * (1 - w) + b * w)
    return norm(out)


def euler(up=0.0, left=0.0, roll=0.0):
    """A turn for a bone that points forward: up raises its tip, left swings it to the dragon's left, roll leans it
    (positive: its left side down)."""
    return qmul(qmul(qaxis(Y, left), qaxis(X, -np.asarray(up, float))), qaxis(Z, -np.asarray(roll, float)))


# ---- curves ------------------------------------------------------------------------------------------------------------

class K:
    """A curve through keys, K((t, v), (t, v, 'f'), ...): cubic between keys. A key's mode:
    'a' (default) passes smoothly through it, 'f' stops on it, 's' strikes it (arrives still accelerating, as a blow
    or a fall does, and leaves from rest), 'l' comes into it in a straight line. Before the first key and after the last,
    the curve holds."""

    def __init__(self, *keys):
        ks = sorted((tuple(k) + ('a',))[:3] for k in keys)
        self.t = np.array([k[0] for k in ks], float)
        self.v = np.array([k[1] for k in ks], float)
        mode = [k[2] for k in ks]
        n = len(ks)
        s = np.diff(self.v) / np.maximum(np.diff(self.t), 1e-9) if n > 1 else np.zeros(0)
        self.mi, self.mo = np.zeros(n), np.zeros(n)
        for i in range(n):
            a, b = (s[i - 1] if i > 0 else None), (s[i] if i < n - 1 else None)
            if mode[i] == 'f' or a is None or b is None:
                m = 0.0
            elif a * b <= 0:
                m = 0.0
            else:
                m = (a + b) / 2
                m = np.sign(m) * min(abs(m), 3 * min(abs(a), abs(b)))
            self.mi[i] = self.mo[i] = m
            if mode[i] == 's' and a is not None:
                self.mi[i], self.mo[i] = 2 * a, 0.0
            if mode[i] == 'l' and a is not None:
                self.mi[i] = a
                if i > 0:
                    self.mo[i - 1] = a

    def __call__(self, t):
        t = np.asarray(t, float)
        if len(self.t) == 1:
            return np.full_like(t, self.v[0])
        i = np.clip(np.searchsorted(self.t, t, side='right') - 1, 0, len(self.t) - 2)
        t0, t1 = self.t[i], self.t[i + 1]
        h = t1 - t0
        u = np.clip((t - t0) / np.maximum(h, 1e-9), 0, 1)
        u2, u3 = u * u, u * u * u
        v = (2 * u3 - 3 * u2 + 1) * self.v[i] + (u3 - 2 * u2 + u) * h * self.mo[i] + (-2 * u3 + 3 * u2) * self.v[i + 1] + (u3 - u2) * h * self.mi[i + 1]
        return np.where(t <= self.t[0], self.v[0], np.where(t >= self.t[-1], self.v[-1], v))


def sine(period, amp, phase=0.0):
    return lambda t: amp * np.sin(2 * np.pi * (np.asarray(t, float) / period + phase))


def smooth(t, a, b):
    u = np.clip((np.asarray(t, float) - a) / max(b - a, 1e-9), 0, 1)
    return u * u * (3 - 2 * u)


def window(t0, t1, t2, t3):
    """0 before t0, rising to 1 by t1, 1 until t2, back to 0 by t3."""
    return lambda t: smooth(t, t0, t1) * (1 - smooth(t, t2, t3))


def settle(t0, amp, tau=0.45, period=1.0):
    """The overshoots after a stop at t0: starts at nothing, swings amp one way, dies away."""
    def f(t):
        u = np.asarray(t, float) - t0
        return np.where(u > 0, amp * np.exp(-u / tau) * np.sin(2 * np.pi * u / period), 0.0)
    return f


def wobble(seed, rate, amp):
    """Smooth, never-repeating-looking drift: a few sines at odd rates."""
    r = np.random.default_rng(seed)
    fs, ps, ws = r.uniform(0.6, 1.7, 4) * rate, r.uniform(0, 1, 4), r.uniform(0.5, 1, 4)
    ws = ws / ws.sum()
    return lambda t: amp * sum(w * np.sin(2 * np.pi * (f * np.asarray(t, float) + p)) for f, p, w in zip(fs, ps, ws))


def loopwobble(dur, seed, harmonics, amp):
    """Drift that comes back to itself after dur (for loops): whole numbers of cycles only."""
    r = np.random.default_rng(seed)
    n = min(3, harmonics)
    ks = r.choice(np.arange(1, harmonics + 1), n, replace=False)
    ps, ws = r.uniform(0, 1, n), r.uniform(0.5, 1, n)
    ws = ws / ws.sum()
    return lambda t: amp * sum(w * np.sin(2 * np.pi * (k * np.asarray(t, float) / dur + p)) for k, p, w in zip(ks, ps, ws))


# ---- a clip ------------------------------------------------------------------------------------------------------------

class Clip:
    """Drivers by name, each a sum of curves over time. Unset drivers are their default (mostly 0)."""

    # wL_tuck, wR_tuck: the wings folded along the flanks (1) unless a clip spreads or folds them, which lets the tuck go
    DEFAULTS = {'nk_lag': 0.035, 'tl_lag': 0.045, 'w_lag': 0.0, 'tl_droop': 6.0, 'jaw_shut': 0.0, 'wL_tuck': 1.0, 'wR_tuck': 1.0}

    def __init__(self, name, dur, loop=False, **info):
        self.name, self.dur, self.loop, self.info = name, float(dur), loop, info
        self.d = {}

    def set(self, key, f):
        self.d[key] = [f if callable(f) else (lambda t, c=float(f): np.full_like(np.asarray(t, float), c))]
        return self

    def add(self, key, f):
        self.d.setdefault(key, []).append(f if callable(f) else (lambda t, c=float(f): np.full_like(np.asarray(t, float), c)))
        return self

    def get(self, key, t, default=None):
        t = np.asarray(t, float)
        fs = self.d.get(key)
        if not fs:
            return np.full_like(t, self.DEFAULTS.get(key, 0.0) if default is None else default)
        return sum(f(t) for f in fs)

    def const(self, key, default=0.0):
        fs = self.d.get(key)
        return float(fs[0](np.zeros(1))[0]) if fs else self.DEFAULTS.get(key, default)


# ---- a dragon's skeleton -----------------------------------------------------------------------------------------------

SIDES = ('L', 'R')
LEGS = {'FL': ('L', 'front'), 'FR': ('R', 'front'), 'HL': ('L', 'hind'), 'HR': ('R', 'hind')}


class Skel:
    def __init__(self, color):
        meta = json.load(open(os.path.join(RIGGED, f'dragon_{color}.json')))
        J = meta['joints']
        self.color, self.meta = color, meta
        self.names = [j['name'] for j in J]
        self.ix = {n: i for i, n in enumerate(self.names)}
        self.parent = np.array([self.ix[j['parent']] if j['parent'] else -1 for j in J])
        assert all(p < i for i, p in enumerate(self.parent)), 'joints must come after their parents'
        self.pos = np.array([j['pos'] for j in J], float)
        tip = np.array([j['tip'] if j['tip'] is not None else j['pos'] for j in J], float)
        self.off = self.pos - np.where(self.parent[:, None] >= 0, self.pos[np.maximum(self.parent, 0)], 0)
        self.off[0] = self.pos[0]
        seg = tip - self.pos
        self.dir = np.where(np.linalg.norm(seg, axis=1, keepdims=True) > 1e-5, norm(seg), Z)
        self.seglen = np.linalg.norm(seg, axis=1)
        # each tail bone's resting heading (degrees about the up axis from straight ahead, unwound along the tail from
        # straight back, 180) and height angle; and the turn that takes its rest back to pointing straight ahead, level
        self.tail_h, self.tail_e, self.tail_unrest = {}, {}, {}
        prev = 180.0
        for i in range(1, 15):
            j = self.ix.get(f'tail{i}')
            if j is None:
                continue
            dj = self.dir[j]
            h = np.degrees(np.arctan2(dj[0], dj[2]))
            h = prev + (h - prev + 180) % 360 - 180
            e = np.degrees(np.arcsin(np.clip(dj[1], -1, 1)))
            self.tail_h[j], self.tail_e[j], prev = h, e, h
            self.tail_unrest[j] = qinv(qmul(qaxis(Y, h), qaxis(X, -e)))
        self.H = meta['height']
        self.jaw_scale = meta.get('jawScale', 1.0)
        self.pivot = (self.pos[self.ix['hips']] + self.pos[self.ix['chest']]) / 2
        self.fingers = sorted({n[2] for n in self.names if n.startswith('wf') and n.endswith('a_L')})
        self.nfing = len(self.fingers)
        self.ntoe_f = len([n for n in self.names if n.startswith('ftoe') and n.endswith('a_L')])
        self.ntoe_h = len([n for n in self.names if n.startswith('htoe') and n.endswith('a_L')])
        # where each forepaw's toes start: the paw rolls over them as its heel lifts
        self.fball = {S: self.pos[[self.ix[n] for n in self.names if n.startswith('ftoe') and n.endswith(f'a_{S}')]].mean(0)
                      for S in SIDES}
        # each leg's pole: which way its middle joint bends, from the rest pose
        self.pole = {}
        for k, (S, part) in LEGS.items():
            a, b, c = (('upperarm', 'forearm', 'hand') if part == 'front' else ('thigh', 'shin', 'meta'))
            A, B, C = self.pos[self.ix[f'{a}_{S}']], self.pos[self.ix[f'{b}_{S}']], self.pos[self.ix[f'{c}_{S}']]
            u = norm(C - A)
            v = (B - A) - ((B - A) @ u) * u
            if np.linalg.norm(v) < 1e-4:
                v = -Z if part == 'front' else Z
            self.pole[k] = norm(v)


# ---- the wing's target shapes (left wing, in the chest's frame; the right is their mirror) ----------------------------

SPREAD = {'whum': (1.0, 0.16, -0.30), 'wfore': (1.0, 0.05, 0.42), 'wthumb': (0.25, 0.35, 1.0)}
FOLD = {'whum': (0.62, 0.62, -0.40), 'wfore': (0.45, 0.30, -0.85), 'wthumb': (0.2, 0.55, 0.8)}
FAN = {5: [14, -10, -36, -66, -100], 4: [14, -22, -56, -98]}     # spread fingers, degrees from straight out toward forward


# Folded on the ground, as a bat folds: the arm bone up and back, the forearm forward along the shoulder with the wrist
# high, the fingers laid back along the flank over the hips, the leading one highest, each a little lower than the one
# before it, bowed down along their length. The membrane goes with them; the model is never reshaped.
TUCK = {'whum': (0.42, 0.50, -0.76), 'wfore': (0.22, 0.52, 0.83), 'wthumb': (0.10, 0.62, 0.78)}


def finger_tuck(K, k, seg):
    u = k / max(K - 1, 1)
    return norm(np.array([0.17 - 0.12 * u, -0.04 - 0.24 * u - 0.07 * seg, -1.0]))


def finger_spread(K, k, seg):
    a = np.radians(FAN[K][k] - 5 * seg)
    return np.array([np.cos(a), -0.02 * seg, np.sin(a)])


def finger_fold(K, k, seg):
    a = np.radians(-150 + 6 * k + 4 * seg)
    return norm(np.array([np.cos(a) * 0.9, -0.35 - 0.1 * seg, np.sin(a)]))


def mirror(v):
    return v * np.array([-1, 1, 1.0])


# ---- the solver --------------------------------------------------------------------------------------------------------

SOFT = 0.94
NK_REACH = (0.34, 0.26, 0.18, 0.11, 0.07, 0.04)


def floored(a, b, k):
    """a, kept from going far under b: unchanged at or above b, and below it easing toward b - k, never past. Smooth
    where it meets b, so a foot or a wing meeting the floor settles onto it rather than stopping at a corner."""
    a = np.asarray(a, float)
    return np.where(a >= b, a, b - k * (1 - np.exp(np.minimum(a - b, 0) / max(k, 1e-9))))


TOE_BACK = np.radians(80.0)


def over_time(lift, t, loop=False):
    """A toe's bend back (toe_lift), spread over the frames round it when t is a clip's frames, evenly spaced (a bake):
    begun a little before the paw comes down and let go a little after, rather than all in the one frame it touches,
    which snapped. At least as much as each frame needs, near enough. Anything else (a few times looked at) as it is.
    In a loop the frames round the seam are the ones at the other end (the last frame is the first again)."""
    t = np.asarray(t, float)
    if len(t) < 6 or not np.allclose(np.diff(t), t[1] - t[0], atol=1e-6) or not np.any(lift < 0):
        return lift
    n, k = len(lift), 3
    if loop:                                       # (wrapped round the seam: frame n-1 is frame 0)
        body = lift[:-1]
        pad = np.concatenate([body[-k:], body, body[:k + 1]])
    else:
        pad = np.pad(lift, k, mode='edge')
    deep = np.min(np.stack([pad[i:i + n] for i in range(2 * k + 1)]), axis=0)       # the most each frame's neighbours need
    w = np.exp(-0.5 * (np.arange(-k, k + 1) / 1.4) ** 2)
    w /= w.sum()
    if loop:
        body = deep[:-1]
        pad = np.concatenate([body[-k:], body, body[:k + 1]])
    else:
        pad = np.pad(deep, k, mode='edge')
    return np.minimum(sum(w[i] * pad[i:i + n] for i in range(2 * k + 1)), 0.0)


def toe_lift(pos, Wq, rest_dir, length, floor):
    """How far (radians, about the bone's own X, its hinge) a toe at pos turned Wq in the world must bend back so its end
    stays above the floor: none where it already is (so nothing jumps where it starts), the least turn that does it
    otherwise, eased on as floored() eases a foot."""
    d = qrot(Wq, np.broadcast_to(rest_dir, (len(pos), 3)))
    a = qrot(Wq, np.broadcast_to(X, (len(pos), 3)))
    end = pos[:, 1] + length * d[:, 1]
    want = floored(end, floor, 0.01)
    lift = np.zeros(len(pos))
    m = want > end + 1e-9
    if not m.any():
        return lift
    # d turned about a by th: y(th) = A cos th + B sin th + C
    ad = (a * d).sum(-1)
    A = d[:, 1] - a[:, 1] * ad
    B = np.cross(a, d)[:, 1]
    Cc = a[:, 1] * ad
    Rr = np.maximum(np.hypot(A, B), 1e-9)
    ph = np.arctan2(B, A)
    tgt = np.clip(((want - pos[:, 1]) / length - Cc) / Rr, -1, 1)
    w = np.arccos(tgt)
    # only ever back (a negative turn: the toe opened, as a curl below zero opens it), the first turn that way that does
    # it, and never more than TOE_BACK (a toe that can't clear the floor that way is as far back as it goes)
    c1, c2 = ph - w, ph + w
    c1 = c1 - 2 * np.pi * np.ceil(c1 / (2 * np.pi))
    c2 = c2 - 2 * np.pi * np.ceil(c2 / (2 * np.pi))
    th = np.clip(np.maximum(c1, c2), -TOE_BACK, 0.0)
    # and faded out where it can't help without a jump: a toe whose root is down at the floor itself (the paw's the
    # trouble there, not the toe), or one that bending back would first take lower (it points down and back already)
    fade = np.clip((pos[:, 1] - floor + 0.006) / 0.006, 0, 1) * np.clip(-B / (0.25 * Rr), 0, 1)
    return np.where(m, th * fade, 0.0)


def above_floor(pos, d, length, floor):
    """A bone's world direction d from pos, bent up just enough that its end stays above the floor (y = floor), keeping
    its heading over the ground; it eases onto the floor rather than meeting it at a corner."""
    need = (np.asarray(floor, float) - pos[:, 1]) / max(length, 1e-6)
    near = d[:, 1] < need + 0.2
    if not near.any():
        return d
    dy = np.clip(floored(d[:, 1], need + 0.2, 0.35), -1, 1)
    flat = d[:, [0, 2]]
    fl = np.linalg.norm(flat, axis=1, keepdims=True)
    flat = np.where(fl > 1e-6, flat / np.maximum(fl, 1e-9), np.array([[0, -1.0]]))
    h = np.sqrt(np.maximum(1 - dy * dy, 0))
    up = np.stack([flat[:, 0] * h, dy, flat[:, 1] * h], -1)
    return np.where(near[:, None], up, d)


DEBUG = {}      # each leg's last target, reach and stretch, for looking into


def two_bone(A, T, l1, l2, pole):
    d = T - A
    dist = np.linalg.norm(d, axis=-1, keepdims=True)
    u = d / np.maximum(dist, 1e-9)
    full = l1 + l2
    soft = SOFT * full
    over = np.maximum(dist - soft, 0)
    # past `soft` the reach comes in ever more slowly, reaching full only at infinity (soft IK): no snap at full stretch
    dc = np.where(dist > soft, soft + (full - soft) * (1 - np.exp(-over / max(full - soft, 1e-9))), dist)
    dc = np.clip(dc, abs(l1 - l2) * 1.02 + 1e-6, full * 0.9995)
    a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc)
    h = np.sqrt(np.maximum(l1 * l1 - a * a, 0))
    v = norm(pole - (pole * u).sum(-1, keepdims=True) * u)
    return A + u * a + v * h, A + u * dc


def solve(sk, clip, t):
    """Local rotations (F, J, 4) and the root's translation (F, 3) for times t."""
    t = np.asarray(t, float)
    F, J = len(t), len(sk.names)
    g = clip.get
    ix = sk.ix
    L = np.tile(ID, (F, J, 1))
    R = np.zeros((F, J, 4))
    P = np.zeros((F, J, 3))

    def fk(j):
        p = sk.parent[j]
        if p < 0:
            R[:, j] = L[:, j]
        else:
            R[:, j] = qmul(R[:, p], L[:, j])
            P[:, j] = P[:, p] + qrot(R[:, p], np.broadcast_to(sk.off[j], (F, 3)))

    def aim(j, target_world):
        p = sk.parent[j]
        L[:, j] = arc(np.broadcast_to(sk.dir[j], (F, 3)), qrot(qinv(R[:, p]), target_world))

    # the body: turned about its middle (or, pivot_h, about its hips: a rear that stays over its hind feet), moved
    Rb = qmul(qmul(qaxis(Y, g('yaw', t)), qaxis(X, -g('pitch', t))), qaxis(Z, -g('roll', t)))
    tb = np.stack([g('x', t), g('y', t), g('z', t)], -1)
    ph = np.clip(g('pivot_h', t), 0, 1)[:, None]
    c, p0 = sk.pivot * (1 - ph) + sk.pos[sk.ix['hips']] * ph, sk.pos[0]
    rootT = c + tb - qrot(Rb, c - p0)
    L[:, 0] = Rb
    R[:, 0] = Rb
    P[:, 0] = rootT
    tremor = g('tremor', t)
    floor = g('floor', t)          # the ground's height under it (the clip's start); far below when it's off the edge
    shake = lambda seed, rate=5.0: wobble(seed, rate, 1.0)(t) * tremor   # noqa: E731

    nk_lag, tl_lag, w_lag = clip.const('nk_lag'), clip.const('tl_lag'), clip.const('w_lag')
    for j, name in enumerate(sk.names):
        if j == 0:
            continue
        if name == 'hips':
            L[:, j] = euler(g('hp_pitch', t), g('hp_yaw', t), g('hp_roll', t))
        elif name in ('spine1', 'spine2', 'chest'):
            k = ('spine1', 'spine2', 'chest').index(name)
            tt = t - k * 0.02
            L[:, j] = euler(g('sp_pitch', tt) / 3 + g('breath', tt) * (0.6 if k == 2 else 0.3), g('sp_yaw', tt) / 3, g('sp_roll', tt) / 3 + shake(10 + k) * 0.3)
        elif name.startswith('neck'):
            i = int(name[4:])
            tt = t - i * nk_lag
            s = g('nk_s', tt) * (-1 if i <= 3 else 1) / 3
            # nk_reach: the neck tipped from its root, most of the turn in the first joints, so it goes out long and low
            # rather than curling its upright S over
            reach = g('nk_reach', t - nk_lag) * NK_REACH[i - 1]
            L[:, j] = euler(g('nk_pitch', tt) / 6 + s + reach + shake(20 + i) * 0.5, g('nk_yaw', tt) / 6, g('nk_roll', tt) / 6)
        elif name == 'head':
            tt = t - 7 * nk_lag
            local = euler(g('hd_pitch', tt) + shake(31) * 0.7, g('hd_yaw', tt) + shake(32) * 0.5, g('hd_roll', tt))
            hw = g('hd_world', t)
            if np.any(hw > 0):
                # held steady in the world: its own turn over the body's heading only, whatever the neck does
                want = qmul(qaxis(Y, g('yaw', t)), euler(g('hd_wpitch', tt), g('hd_wyaw', tt), 0))
                local = nlerp(local, qmul(qinv(R[:, sk.parent[j]]), want), hw)
            L[:, j] = local
        elif name == 'jaw':
            L[:, j] = qaxis(X, (g('jaw', t) * 38 + shake(40, 7) * 0.6 * (g('jaw', t) > 0.2)) * sk.jaw_scale)
        elif name.startswith('tail'):
            i = int(name[4:])
            n = 14
            tt = t - i * tl_lag
            w = i / n
            # by heading and height angles in the hips' frame, never by the shortest turn: a tail curled round to the
            # front unwinds the way it curled (the shortest way from pointing forward to pointing back is a flip)
            droop = clip.const('tl_droop') + g('tl_sag', tt) * w
            st = np.clip(g('tl_straight', tt), 0, 1)
            psi = g('tl_yaw', tt) * w + g('tl_wave', tt) * w * np.sin(2 * np.pi * tt / max(clip.const('tl_wave_T', 6.0), 1e-3))
            head = sk.tail_h[j] * (1 - st) + 180.0 * st - psi
            elev = sk.tail_e[j] * (1 - st) - droop * st + g('tl_pitch', tt) * w
            # tl_level: how much the tail keeps level in the world when the body pitches (its root can't, its tip can)
            elev = elev + g('tl_level', t) * g('pitch', t) * np.clip(2 * w, 0, 1)      # now, not behind the wave
            hr, er = np.radians(head), np.radians(elev)
            d = np.stack([np.sin(hr) * np.cos(er), np.sin(er), np.cos(hr) * np.cos(er)], -1)
            Rh = R[:, ix['hips']]
            pj = P[:, sk.parent[j]] + qrot(R[:, sk.parent[j]], np.broadcast_to(sk.off[j], (F, 3)))
            dw = above_floor(pj, qrot(Rh, d), sk.seglen[j], floor + 0.012 + 0.03 * (1 - w))
            d = qrot(qinv(Rh), dw)
            head = head + np.degrees(np.angle(np.exp(1j * (np.arctan2(d[:, 0], d[:, 2]) - np.radians(head)))))
            elev = np.degrees(np.arcsin(np.clip(d[:, 1], -1, 1)))
            Wt = qmul(qmul(qaxis(Y, head), qaxis(X, -elev)), sk.tail_unrest[j])
            L[:, j] = qmul(qinv(R[:, sk.parent[j]]), qmul(Rh, Wt))
        elif name.startswith(('wroot', 'whum', 'wfore', 'whand', 'wthumb', 'wf')):
            S = name[-1]
            base_name = name[:-2]
            lvl = 0 if base_name in ('wroot', 'whum') else 1 if base_name in ('wfore', 'whand', 'wthumb') else 2 + 'abc'.index(base_name[-1])
            tt = t - lvl * w_lag / 4          # w_lag: how far the wingtip (level 4) trails the shoulder
            stroke, sweep = g(f'w{S}_stroke', tt), g(f'w{S}_sweep', tt)
            if base_name == 'wroot':
                L[:, j] = qaxis(Z, stroke * 0.12 * (1 if S == 'L' else -1))
                fk(j)
                continue
            if base_name == 'whand':
                fk(j)
                continue
            s = np.clip(g(f'w{S}_spread', tt), 0, 1)
            f = np.clip(g(f'w{S}_fold', tt), 0, 1)
            r = np.clip(1 - s - f, 0, 1)
            rest = sk.dir[j] if S == 'L' else mirror(sk.dir[j])
            if base_name.startswith('wf') and base_name[2].isdigit():
                k, seg = sk.fingers.index(base_name[2]), 'abc'.index(base_name[3])
                sp, fo = finger_spread(sk.nfing, k, seg), finger_fold(sk.nfing, k, seg)
                # a slow ripple in the trailing membrane while it isn't taut
                # (in a loop, a whole number of ripples to the loop, or it would tick at the seam)
                rf = max(1, round(2.3 * clip.dur)) / clip.dur if clip.loop else 2.3
                ripple = g(f'w{S}_ripple', tt) * (k / max(sk.nfing - 1, 1)) * np.sin(2 * np.pi * (tt * rf + k * 0.17 + seg * 0.11))
                stroke = stroke + ripple * (seg + 1)
            else:
                sp, fo = np.array(SPREAD[base_name], float), np.array(FOLD[base_name], float)
            act = np.clip(s + f, 0, 1)
            shape = dslerp(norm(sp), norm(fo), f / np.maximum(s + f, 1e-6))
            d = dslerp(np.broadcast_to(rest, (F, 3)), shape, act)
            # folded along the flank, as far as the clip isn't spreading or folding it for a beat (in the left wing's
            # frame, as sp and fo are: the right wing's whole turn is mirrored below)
            fing = base_name.startswith('wf') and base_name[2].isdigit()
            tu = finger_tuck(sk.nfing, k, seg) if fing else norm(np.array(TUCK[base_name], float))
            tk = np.clip(g(f'w{S}_tuck', tt), 0, 1) * (1 - act)
            d = dslerp(d, np.broadcast_to(tu, (F, 3)), tk)
            # the bone's whole turn in the chest's frame, not just where it points: shaped out of rest (never near a half
            # turn), then the wing's stroke and sweep turn it as one rigid plane, so no bone twists about its own length
            # however its parent turned
            Q = qmul(qmul(qaxis(Z, stroke), qaxis(Y, -sweep)), arc(np.broadcast_to(rest, (F, 3)), d))
            if S == 'R':
                Q = Q * np.array([1, -1, -1, 1.0])      # the left wing's turn, seen in the mirror
            Wq = qmul(R[:, ix['chest']], Q)
            # a wing that would go into the ground lies along it instead
            pj = P[:, sk.parent[j]] + qrot(R[:, sk.parent[j]], np.broadcast_to(sk.off[j], (F, 3)))
            dw = qrot(Wq, np.broadcast_to(sk.dir[j], (F, 3)))
            dfix = above_floor(pj, dw, sk.seglen[j], floor + 0.01)
            Wq = qmul(arc(dw, dfix), Wq)
            L[:, j] = qmul(qinv(R[:, sk.parent[j]]), Wq)
        elif name.startswith('scap'):
            S = name[-1]
            k = 'F' + S
            L[:, j] = euler(g(f'{k}_scap', t), 0, 0)
        elif name.startswith(('upperarm', 'thigh')):
            S = name[-1]
            front = name.startswith('upperarm')
            k = ('F' if front else 'H') + S
            leg(sk, clip, t, k, L, R, P, fk, aim)
            continue      # leg() did the whole limb
        elif name.startswith(('forearm', 'hand', 'shin', 'meta', 'foot')):
            continue      # done with its limb
        elif name.startswith(('ftoe', 'htoe')):
            S = name[-1]
            k = ('F' if name[0] == 'f' else 'H') + S
            seg = name[5]
            toe = int(name[4]) - 1
            nt = sk.ntoe_f if name[0] == 'f' else sk.ntoe_h
            curl = g(f'{k}_curl', t)
            spread = g(f'{k}_spread', t) * (toe - (nt - 1) / 2) * 7 * (1 if S == 'L' else -1)
            # a forepaw rolled up on its toes: the toes stay down (the hind foot's ball joint is laid flat already)
            back = g(f'{k}_heel', t) if (name[0] == 'f' and seg == 'a') else 0.0
            L[:, j] = qmul(qaxis(Y, spread if seg == 'a' else 0), qaxis(X, curl * (35 if seg == 'a' else 50) - back))
            # a toe that would go into the ground bends back on its own knuckle, just enough to stay on it (the leg's reach
            # puts the foot, never its toes: a paw folded under a chest that's come down on it, or a crouch, would push
            # them through the floor). About its hinge only, never swung round: a toe pointing straight down has no
            # heading to keep.
            pr = R[:, sk.parent[j]]
            pj = P[:, sk.parent[j]] + qrot(pr, np.broadcast_to(sk.off[j], (F, 3)))
            tf = np.clip(g('toe_floor', t), 0, 1)          # (the clips that put the paws where the toes would go under)
            if np.any(tf > 0):
                lift = toe_lift(pj, qmul(pr, L[:, j]), sk.dir[j], sk.seglen[j], floor)
                L[:, j] = qmul(L[:, j], qaxis(X, tf * np.degrees(over_time(lift, t, clip.loop))))
        fk(j)
    return L, P, R, rootT


def leg(sk, clip, t, k, L, R, P, fk, aim):
    """One leg, top to toe-base: the reach by two-bone IK, the foot laid flat (or as told)."""
    g = clip.get
    ix = sk.ix
    S, part = LEGS[k]
    F = len(t)
    follow = np.clip(g(f'{k}_follow', t), 0, 1)[:, None]
    if part == 'front':
        top, mid, end, flat = (ix[f'{n}_{S}'] for n in ('upperarm', 'forearm', 'hand', 'hand'))
        anchor = ix['chest']
    else:
        top, mid, end, flat = ix[f'thigh_{S}'], ix[f'shin_{S}'], ix[f'meta_{S}'], ix[f'foot_{S}']
        anchor = ix['hips']
    fk(top)       # its rest turn for now, to know where it starts
    A = P[:, top]
    # where the foot goes: on the ground (the model's frame), or carried with the body
    goal = sk.pos[flat]
    og = np.stack([g(f'{k}_x', t), g(f'{k}_y', t), g(f'{k}_z', t)], -1)
    ob = np.stack([g(f'{k}_bx', t), g(f'{k}_by', t), g(f'{k}_bz', t)], -1)
    ground = goal + og
    body = P[:, anchor] + qrot(R[:, anchor], (goal - sk.pos[anchor]) + ob)
    T = ground * (1 - follow) + body * follow
    # a foot changing over between the ground and the body goes up and over, never along the floor
    T = T + Y * (g(f'{k}_arc', t, 0.03) * np.sin(np.pi * follow[:, 0]))[:, None]
    # the foot's own turn in the world: flat on the ground (tilted as told), or with the body
    tilt = g(f'{k}_tilt', t)
    Wg = qmul(qaxis(Y, g('yaw', t) * g(f'{k}_turn', t)), qaxis(X, tilt))
    Wb = qmul(R[:, anchor], qaxis(X, tilt))
    W = nlerp(Wg, Wb, follow[:, 0])
    floor = g('floor', t)
    T = T.copy()
    T[:, 1] = floored(T[:, 1], floor + sk.pos[flat][1], 0.006)      # the paw's wrist, the hind foot's ball: never under the floor
    ball = T
    if part == 'front':
        # the paw rolls forward over its toes as its heel comes up, the wrist rising toward the shoulder
        heel = g(f'{k}_heel', t)
        v = np.broadcast_to(sk.pos[end] - sk.fball[S], (F, 3))
        Wh = qmul(W, qaxis(X, heel))
        T = T + qrot(Wh, v) - qrot(W, v)
        W = Wh
        # and its knuckles (the toes' roots) never under the floor either: a paw tipped by a body rolled over onto it
        # comes up off the ground by as much as it would have gone into it
        roots = [sk.ix[n] for n in sk.names if n.startswith('ftoe') and n.endswith(f'a_{S}')]
        rel = np.min(np.stack([qrot(W, np.broadcast_to(sk.pos[r] - sk.pos[end], (F, 3)))[:, 1] for r in roots], -1), axis=-1)
        T[:, 1] = floored(T[:, 1], floor + 0.004 - rel, 0.006)
    if part == 'hind':
        # the ankle sits above and behind the ball, its metatarsus raised by heel
        heel = g(f'{k}_heel', t)
        up = sk.pos[end] - sk.pos[flat]
        T = T + qrot(qmul(W, qaxis(X, heel)), np.broadcast_to(up, (F, 3)))
        T[:, 1] = floored(T[:, 1], floor + 0.9 * sk.pos[end][1], 0.006)
    pole = qrot(R[:, anchor], np.broadcast_to(sk.pole[k], (F, 3)))
    pole = norm(pole + qrot(R[:, anchor], np.broadcast_to(X if S == 'L' else -X, (F, 3))) * g(f'{k}_splay', t)[:, None])
    l1 = np.linalg.norm(sk.pos[mid] - sk.pos[top])
    l2 = np.linalg.norm(sk.pos[end] - sk.pos[mid])
    B, E = two_bone(A, T, l1, l2, pole)
    DEBUG[k] = (T, E, np.linalg.norm(T - A, axis=-1) / (l1 + l2))
    aim(top, B - A)
    fk(top)
    fk(mid)                    # where it starts, before turning it
    aim(mid, E - P[:, mid])
    fk(mid)
    if part == 'front':
        L[:, end] = qmul(qinv(R[:, mid]), W)
        fk(end)
    else:
        fk(end)
        aim(end, ball - P[:, end])
        fk(end)
        L[:, flat] = qmul(qinv(R[:, end]), W)
        fk(flat)
