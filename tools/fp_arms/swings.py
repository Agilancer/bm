"""What the first-person arms' clips share: the carry and its walk, the arm's joints from where its hand is, and the sword's roll in the fists.

The two-handed swings' own paths are in swings2h.py, the one-handed clips in swings1h.py.

  * No body: the arms hang from shoulders fixed to the camera, just behind and under the eye. Where an arm would run out of reach,
    its unseen shoulder eases toward the hand, like the torso turning into the blow, so the sword's path is never disturbed.
  * The edge leads the cut, a little off edge-on so the flat shows, and the sword never turns in the right fist (it's the fist that rolls,
    the wrist and forearm taking it up).
  * Baked at 60 Hz, with a frame exactly on the hit, so the tip is on the X on that frame.
"""
import math
import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d
from scipy.special import betainc

HZ = 60
TIP = 1.00                               # the sword's tip from the right fist (Bellmourn's PROXY sword2h)
# These arms are far heavier than the game's gauntlets, so they're carried further from the eye than
# mocap2h's (0.20, -0.15, -0.15): wider, lower and further ahead, so they read smaller and never swallow
# the view. The view model also has its own wider field of view (ZOOM, as viewmodel.js's twohand_zoom),
# which turns about the middle of the screen: the X stays put.
SHO = np.array([0.25, -0.02, -0.30])     # the right shoulder from the eye, the left mirrored
ZOOM = 0.8
POLE = np.array([1.0, -0.10, -0.60])     # the way the right elbow hangs (fp_rig's), the left mirrored
POLE_UP = np.array([1.0, 0.35, -0.35])   # ...and with the hands up: elbows out and under, the arms a V that frames the view
LIFT = 0.5                               # how much of a high hand's height the shoulders rise to: the arms stay below it
AHEAD = 1.6                              # ...and how much more they come forward than across: the arm stays off the eye
FLAT_ROLL = 34.0                         # degrees the edges sit off edge-on, so the flat shows
FLAT_SIDE = {"sky2": -1, "sky4": -1, "wide_l": -1, "rise": -1.4}                           # (which way they sit, by blow: toward the eye, not away)
ROLLS = 72                               # angles tried for a fist's roll about the handle

ASPECT = 16 / 9                          # the shape of screen the carry is laid out for
# The carry, as first-person Skyrim has it: the weapon nearly upright at the right of the screen, its top near the top, and both hands
# below the frame. (fist: x, y on the screen from -1 to 1 and its distance ahead, further out than
# the game's 0.45 as the swings' are, by OUT; tip: on the screen; guard: the way the guard's right end points,
# back toward the eye and up, so the blade shows part of its flat and the forearm comes in from the lower right)
CARRY = dict(fist=(0.60, -1.25, 0.42), tip=(0.52, 0.72), guard=(0.54, -0.66, 0.52))
# The left hand's way down the handle from where the sculpt has it, toward the pommel: a two-handed grip, not
# two fists stacked under the guard
LEFT_SLIDE = 0.04
# On the move (anims.walk_cycle): a slow figure of eight, swaying side to side and riding down at each footfall,
# with the tip hanging back. Bellmourn's sprite-like keys bounce at the ends of the sway; here it's one smooth
# curve. Standing still it's the same clip, slowed (WALK's timing: see the game's and the viewer's own).
WALK = dict(frames=55, sway=0.060, tip_sway=0.068, dip=0.030, lag=25.0, standing=0.4)

def un(v):
    return v / np.linalg.norm(v)


def bell(u, a, b):
    return betainc(a, b, np.clip(u, 0, 1))


def rot_about(axis, deg):
    """Rotation matrices about one axis, by an array of angles (degrees)."""
    a = np.radians(deg)
    c, s = np.cos(a), np.sin(a)
    x, y, z = axis
    K = np.array([[0, -z, y], [z, 0, -x], [-y, x, 0]])
    return np.eye(3) + s[..., None, None] * K + (1 - c)[..., None, None] * (K @ K)


def chord_spline(pts, param):
    """A C2 curve through points in space, by a parameter."""
    return CubicSpline(param, np.asarray(pts), bc_type="clamped")


def slerp(a, b, t):
    w = math.acos(float(np.clip(a @ b, -1, 1)))
    if w < 1e-5:
        return a
    return (math.sin((1 - t) * w) * a + math.sin(t * w) * b) / math.sin(w)


def along(ds, x):
    """Turn along a list of directions, at an even rate, x from 0 to 1 over the whole way."""
    arcs = [math.acos(float(np.clip(p @ q, -1, 1))) for p, q in zip(ds, ds[1:])]
    d = x * sum(arcs)
    for i, w in enumerate(arcs):
        if d <= w or i == len(arcs) - 1:
            return un(slerp(ds[i], ds[i + 1], float(np.clip(d / max(w, 1e-6), 0, 1))))
        d -= w


def carry(half):
    """The guard: (grip middle, blade's way), from where the carry falls on the screen."""
    fy = 1.6 * ZOOM
    fx = fy / ASPECT
    sx, sy, y = CARRY["fist"]
    r = np.array([sx / fx * y, y, sy / fy * y])
    ray = np.array([CARRY["tip"][0] / fx, 1.0, CARRY["tip"][1] / fy])
    a, b, c = ray @ ray, ray @ r, r @ r - TIP * TIP
    d = un(ray * (b + math.sqrt(b * b - a * c)) / a - r)
    return r - d * half, d


def idle_path(half, amount=1.0):
    """The carry on the move, starting and ending on the guard: the fist on a smooth figure of eight, at the
    middle of its sway and the low point of its dip on frame 0, the tip going the same way, less and later.
    `amount`: of the walk's size (standing still it's the same, smaller and slower)."""
    g0, d0 = carry(half)
    r0 = g0 + d0 * half
    t0 = r0 + d0 * TIP
    N = WALK["frames"]
    T = np.arange(N + 1) / HZ
    ph = 2 * np.pi * np.arange(N + 1) / N
    lag = math.radians(WALK["lag"])
    x_, z_ = np.array([1.0, 0.0, 0.0]), np.array([0.0, 0.0, 1.0])
    r = r0 + amount * (np.outer(WALK["sway"] * np.sin(ph), x_) + np.outer(WALK["dip"] * np.sin(ph) ** 2, z_))
    t = t0 + amount * (np.outer(WALK["tip_sway"] * (np.sin(ph - lag) + math.sin(lag)), x_)
                       + np.outer(WALK["dip"] * (np.sin(ph - lag) ** 2 - math.sin(lag) ** 2), z_))
    D = (t - r) / np.linalg.norm(t - r, axis=1, keepdims=True)
    return dict(name="idle", T=T, G=r - D * half, D=D, edge_w=np.zeros(N + 1), travel=np.zeros((N + 1, 3)),
                normal=np.array([0, 0, 1.0]), hit=None, wind=0, end=N, line=None)


class Arm:
    """One arm of the skeleton: lengths and how its hand sits on the sword, in the sword's frame."""

    def __init__(self, side, info, B, held="sword", sho=SHO, lift=None, slide=0.0, ahead=1.0, pole=POLE, knee=0.86):
        from rig import TWIST_AT
        I = info[side]
        self.side, self.U, self.F = side, I["U"], I["F"]
        self.knee = knee       # (how much of its reach an arm uses before the shoulder starts to come with it)
        self.lift = lift       # (how much of the way up toward a high hand a shoulder may rise: None, all of it)
        self.ahead = ahead     # (...and how far it comes forward, against across)
        self.sign = 1 if side == "R" else -1
        self.S0 = sho * np.array([self.sign, 1, 1])
        self.pole = pole * np.array([self.sign, 1, 1])
        self.pole_up = POLE_UP * np.array([self.sign, 1, 1])
        Rs0, r0 = info[held]["R"], info[held]["p"]
        self.R_h0 = B[f"hand_{side}"]["R"]
        self.R_f0 = B[f"forearm_{side}"]["R"]
        self.rel = Rs0.T @ self.R_h0                     # the hand in the sword's frame
        self.off = Rs0.T @ (I["W"] - r0)                 # the wrist in the sword's frame
        self.fist = Rs0.T @ (I["fist"] - r0)             # the fist's middle on the handle (on the y axis)
        self.off[1] -= slide                             # (`slide`: moved down the handle from where the sculpt has it)
        self.fist[1] -= slide
        self.fh = self.R_h0.T @ un(I["W"] - I["E"])      # the forearm's way in the hand's frame, at rest
        self.Q0 = self.R_f0.T @ self.R_h0
        self.twist_at = TWIST_AT

    def hand(self, Rs, r, roll):
        """Hand rotations and wrists, for sword frames (..,3,3), origins (..,3), and rolls (degrees)
        of this fist about the handle."""
        Ry = rot_about((0, 1, 0), np.asarray(roll, float))
        c = np.array([0.0, self.fist[1], 0.0])
        R_h = Rs @ Ry @ self.rel
        W = r + (Rs @ (c + (Ry @ (self.off - c)[..., None])[..., 0])[..., None])[..., 0]
        return R_h, W

    def reach(self, W):
        """The shoulder for a wrist: fixed, until the arm would run out, then easing toward the hand."""
        v = W - self.S0
        D = np.linalg.norm(v, axis=-1, keepdims=True)
        Lmax = (self.U + self.F) * 0.992
        knee = Lmax * self.knee
        soft = np.where(D > knee, knee + (Lmax - knee) * (1 - np.exp(-(D - knee) / (Lmax - knee))), D)
        if self.lift is None:
            return W - v / D * soft, soft
        # (eased along a flatter line, so it stays low: the arm's cut end must never come into view)
        e = v * np.array([1.0, self.ahead, self.lift])
        e = e / np.linalg.norm(e, axis=-1, keepdims=True)
        ve = (v * e).sum(-1, keepdims=True)
        k = ve - np.sqrt(np.maximum(ve * ve - D * D + soft * soft, 0))
        return self.S0 + k * e, soft

    def steady_pole(self, S, W):
        """The elbow's way through a clip, with no flips: it carries on from the last frame, and only heads for where elbows hang as far as
        that's well defined. Where an arm points along its pole (a hand drawn back across the body) any way would do, and it would snap round."""
        N = len(W)
        k = np.clip((W[:, 2:] + 0.08) / 0.34, 0, 1)
        k = k * k * (3 - 2 * k)
        want = self.pole * (1 - k) + self.pole_up * k
        d = W - S
        dn = d / np.linalg.norm(d, axis=1, keepdims=True)
        out = np.zeros((N, 3))
        for i in range(N):
            size = np.linalg.norm(want[i])
            t = want[i] - dn[i] * (want[i] @ dn[i])
            sure = np.linalg.norm(t) / size
            t = t / max(np.linalg.norm(t), 1e-6)
            if i == 0:
                out[i] = t
                continue
            q = out[i - 1] - dn[i] * (out[i - 1] @ dn[i])
            q = q / max(np.linalg.norm(q), 1e-6)
            a = max(0.3 * sure * sure, ((i - (N - 9)) / 8.0) if i > N - 9 else 0.0)      # (back on the guard's own by the end)
            v = q * (1 - a) + t * a
            out[i] = v / max(np.linalg.norm(v), 1e-6)
        return out

    def elbow(self, S, W, pole_dir=None):
        d = W - S
        D = np.linalg.norm(d, axis=-1, keepdims=True)
        dn = d / D
        a = (self.U ** 2 - self.F ** 2 + D ** 2) / (2 * D)
        h = np.sqrt(np.maximum(self.U ** 2 - a ** 2, 0))
        if pole_dir is None:
            k = np.clip((W[..., 2:] + 0.08) / 0.34, 0, 1)
            k = k * k * (3 - 2 * k)
            pv = self.pole * (1 - k) + self.pole_up * k
        else:
            pv = pole_dir
        p = pv - dn * (pv * dn).sum(-1, keepdims=True)
        p /= np.maximum(np.linalg.norm(p, axis=-1, keepdims=True), 1e-6)
        return S + dn * a + p * h, p

    def cost(self, R_h, S, W):
        """How much the wrist has to bend and twist, for this hand on this arm (degrees)."""
        E, _ = self.elbow(S, W)
        f = (W - E) / self.F
        fr = (R_h @ self.fh[..., None])[..., 0]
        bend = np.degrees(np.arccos(np.clip((f * fr).sum(-1), -1, 1)))
        return bend, f, E


def frame_of_arm(S, E, W, U, F):
    ud = (E - S) / U
    fd = (W - E) / F
    n = np.cross(ud, fd)
    n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-6)
    return np.stack([n, ud, np.cross(n, ud)], -1), np.stack([n, fd, np.cross(n, fd)], -1)


def twist_of(R_f, R_h, Q0):
    """The hand's turn about the forearm's axis, against the rest pose (degrees)."""
    D = np.swapaxes(R_f, -1, -2) @ R_h @ Q0.T
    # quaternion's y and w parts of D give its twist about y
    w = np.sqrt(np.maximum(1 + D[..., 0, 0] + D[..., 1, 1] + D[..., 2, 2], 1e-9)) / 2
    y = (D[..., 0, 2] - D[..., 2, 0]) / (4 * w)
    return np.degrees(2 * np.arctan2(y, w))


def transport(D, x0):
    """A frame's x axis carried along the blade's way, turning as little as it can."""
    X = np.zeros_like(D)
    x = x0 - D[0] * (x0 @ D[0])
    x = un(x)
    X[0] = x
    for i in range(1, len(D)):
        v = np.cross(D[i - 1], D[i])
        c = D[i - 1] @ D[i]
        if np.linalg.norm(v) > 1e-9:
            K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
            x = (np.eye(3) + K + K @ K / (1 + c)) @ x
        x = un(x - D[i] * (x @ D[i]))
        X[i] = x
    return X


def sword_frames(D, X, roll):
    """Sword rotation (x, y along the blade, z along the guard) for base axes X and rolls (degrees)."""
    Z = np.cross(X, D)
    r = np.radians(roll)[..., None]
    x = np.cos(r) * X + np.sin(r) * Z
    return np.stack([x, D, np.cross(x, D)], -1)


def viterbi(cost, step_deg, weight, start=None, end=None):
    """The cheapest path of angles through a [frames, angles] cost, wrapping round: each frame's change
    is charged by `weight` per degree squared."""
    N, K = cost.shape
    idx = np.arange(K)
    dd = np.abs(idx[None] - idx[:, None])
    dd = np.minimum(dd, K - dd) * step_deg
    pen = weight * dd.astype(float) ** 2
    c = cost[0].copy()
    if start is not None:
        m = np.full(K, 1e9)
        m[start] = 0
        c = c + m
    back = np.zeros((N, K), int)
    for i in range(1, N):
        tot = c[None] + pen
        back[i] = tot.argmin(1)
        c = tot.min(1) + cost[i]
    if end is not None:
        m = np.full(K, 1e9)
        m[end] = 0
        c = c + m
    out = np.zeros(N, int)
    out[-1] = int(np.argmin(c))
    for i in range(N - 1, 0, -1):
        out[i - 1] = back[i, out[i]]
    return out


def unwrap_deg(a):
    return np.degrees(np.unwrap(np.radians(a)))


def wrap180(a):
    return (a + 180) % 360 - 180


def steady_twist(a):
    """A forearm's twist through a clip with no jumps: it may run past 180 degrees, never wrap round."""
    u = unwrap_deg(a)
    return u - 360 * np.round(u[0] / 360)


def guard_rolls(arms, half):
    """The carry's sword roll (the guard as CARRY has it) and left fist's roll (whichever sits easiest in the wrist)."""
    g0, d0 = carry(half)
    r0 = g0 + d0 * half
    x0 = un(np.cross(d0, np.array([0.0, 0.0, 1.0])))
    grid = np.arange(ROLLS) * 360.0 / ROLLS
    z = np.array(CARRY["guard"], float)
    x = un(np.cross(d0, un(z - d0 * (z @ d0))))
    psi0 = math.degrees(math.atan2(x @ np.cross(x0, d0), x @ x0))
    Rs0 = sword_frames(d0[None], x0[None], np.array([psi0]))[0]
    R_h, W = arms["L"].hand(np.broadcast_to(Rs0, (ROLLS, 3, 3)), np.broadcast_to(r0, (ROLLS, 3)), grid)
    S, _ = arms["L"].reach(W)
    bend, _, _ = arms["L"].cost(R_h, S, W)
    E, _ = arms["L"].elbow(S, W)
    Ru, Rf = frame_of_arm(S, E, W, arms["L"].U, arms["L"].F)
    tw = twist_of(Rf, R_h, arms["L"].Q0)
    phi0 = grid[np.argmin((bend / 60) ** 2 + (tw / 90) ** 2)]
    return x0, Rs0, float(psi0), float(phi0)


def solve_clip(path, arms, half, guard):
    x_g, Rs_g, psi_g, phi_g = guard
    T, G, D = path["T"], path["G"], path["D"]
    N = len(T)
    r = G + D * half
    # --- the sword's roll: wrists at ease and the edge leading the cut
    X = transport(D, x_g)
    grid = np.arange(ROLLS) * 360.0 / ROLLS
    step = 360.0 / ROLLS
    cost = np.zeros((N, ROLLS))
    armR = arms["R"]
    for i in range(N):
        Rs = sword_frames(np.broadcast_to(D[i], (ROLLS, 3)), np.broadcast_to(X[i], (ROLLS, 3)), grid)
        R_h, W = armR.hand(Rs, np.broadcast_to(r[i], (ROLLS, 3)), np.zeros(ROLLS))
        S, _ = armR.reach(W)
        bend, _, E = armR.cost(R_h, S, W)
        _, Rf = frame_of_arm(S, E, W, armR.U, armR.F)
        tw = twist_of(Rf, R_h, armR.Q0)
        c = (bend / 70) ** 2 + (tw / 100) ** 2
        w = path["edge_w"][i]
        v = path["travel"][i]
        if w > 0 and np.linalg.norm(v) > 0:
            fl = math.radians(FLAT_ROLL * FLAT_SIDE.get(path["name"], 1))
            target = math.cos(fl) * v + math.sin(fl) * un(np.cross(D[i], v))
            ez = Rs[:, :, 2]      # the guard's line: the edges
            err = np.degrees(np.arccos(np.clip(np.abs(ez @ target), 0, 1)))
            c = c + 3.5 * w * (err / 25) ** 2
        cost[i] = c
    # (the carry's roll in this path's first and last frames)
    ang_of = lambda x, i: math.degrees(math.atan2(x @ np.cross(X[i], D[i]), x @ X[i]))
    psi_start = ang_of(Rs_g[:, 0], 0)
    psi_end = ang_of(Rs_g[:, 0], N - 1)
    s_i, e_i = int(round(psi_start / step)) % ROLLS, int(round(psi_end / step)) % ROLLS
    psi = grid[viterbi(cost, step, 1 / 36.0, s_i, e_i)]
    psi = gaussian_filter1d(unwrap_deg(psi), 2.6, mode="nearest")
    # pinned exactly on the carry at both ends, the difference spread over the wind-up and recovery
    d0 = wrap180(psi_start - psi[0])
    d1 = wrap180(psi_end - psi[-1])
    a = np.clip(1 - T / max(T[path["wind"]], 1e-6), 0, 1)
    b = np.clip((T - T[path["end"]]) / max(T[-1] - T[path["end"]], 1e-6), 0, 1)
    if path["hit"] is None:     # (a loop: over all of it, so it closes)
        a, b = 1 - T / T[-1], T / T[-1]
    psi = psi + d0 * (a * a * (3 - 2 * a)) + d1 * (b * b * (3 - 2 * b))
    Rs = sword_frames(D, X, psi)
    # --- the left fist's roll about the handle: wrist at ease, no more
    armL = arms["L"]
    costL = np.zeros((N, ROLLS))
    for i in range(N):
        R_h, W = armL.hand(np.broadcast_to(Rs[i], (ROLLS, 3, 3)), np.broadcast_to(r[i], (ROLLS, 3)), grid)
        S, _ = armL.reach(W)
        bend, _, E = armL.cost(R_h, S, W)
        _, Rf = frame_of_arm(S, E, W, armL.U, armL.F)
        tw = twist_of(Rf, R_h, armL.Q0)
        costL[i] = (bend / 70) ** 2 + (tw / 100) ** 2
    s_i = int(round(phi_g / step)) % ROLLS
    phi = grid[viterbi(costL, step, 1 / 144.0, s_i, s_i)]
    phi = gaussian_filter1d(unwrap_deg(phi), 3.0, mode="nearest")
    d0, d1 = wrap180(phi_g - phi[0]), wrap180(phi_g - phi[-1])
    u = T / T[-1]
    phi = phi + d0 * (1 - u) + d1 * u
    # --- both arms, every frame
    out = dict(T=T, sword_R=Rs, sword_p=r, psi=psi, phi=phi)
    bend_all, twist_all = {}, {}
    for side, roll in (("R", np.zeros(N)), ("L", phi)):
        arm = arms[side]
        R_h, W = arm.hand(Rs, r, roll)
        S, _ = arm.reach(W)
        # the elbow's way, smoothed so it can never flick where the arm points along its pole
        p = arm.steady_pole(S, W)
        p_ = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
        u_ = np.arange(N) / (N - 1)
        p = p_ + (p[0] - p_[0]) * (np.clip(1 - u_ * 8, 0, 1) ** 2)[:, None] + (p[-1] - p_[-1]) * (np.clip(1 - (1 - u_) * 8, 0, 1) ** 2)[:, None]
        E, _ = arm.elbow(S, W, p)
        Ru, Rf = frame_of_arm(S, E, W, arm.U, arm.F)
        tw = steady_twist(twist_of(Rf, R_h, arm.Q0))
        f = (W - E) / arm.F
        bend = np.degrees(np.arccos(np.clip((f * (R_h @ arm.fh[..., None])[..., 0]).sum(-1), -1, 1)))
        out[side] = dict(S=S, E=E, W=W, Ru=Ru, Rf=Rf, Rh=R_h, twist=tw)
        bend_all[side], twist_all[side] = bend, tw
    out["bend"], out["twist"] = bend_all, twist_all
    return out


def metrics(path, sol, half, aspect=1.6):
    """What the rules ask, measured: the tip's place on screen at the hit, how far it strays from the
    drawn line through the swing, and how evenly it moves."""
    tip = sol["sword_p"] + sol["sword_R"][:, :, 1] * TIP
    m = {}
    if path["hit"] is None:
        return m
    fy = 1.6 * ZOOM
    fx = fy / aspect
    ahead = np.maximum(tip[:, 1], 1e-3)
    sx, sy = fx * tip[:, 0] / ahead, fy * tip[:, 2] / ahead
    h = path["hit"]
    m["tip_ndc_at_hit"] = (float(sx[h]), float(sy[h]))
    u, f0 = path["line"]
    # off the line (eye-space angle out of the swing's plane)
    w0, w1 = path["wind"], path["end"]
    dirs = tip[w0:w1 + 1] / np.linalg.norm(tip[w0:w1 + 1], axis=1, keepdims=True)
    m["off_plane_deg"] = float(np.degrees(np.arcsin(np.abs(dirs @ path["normal"]))).max())
    # past the crosshair, the blade's own angle at the end of the follow-through
    m["blade_past_deg"] = float(-path["theta"][w1])
    speed = np.linalg.norm(np.diff(sol["sword_R"][:, :, 1], axis=0), axis=1) * HZ
    m["peak_deg_s"] = float(np.degrees(speed.max()))
    m["max_step_in_speed"] = float((np.abs(np.diff(speed)) / max(speed.max(), 1e-6)).max())
    # how near the arms come to the eye (bones less their flesh)
    near = 9.0
    for side in "RL":
        A = sol[side]
        for a, b, rad in ((A["S"], A["E"], 0.115), (A["E"], A["W"], 0.08)):
            ab = b - a
            t = np.clip(-(a * ab).sum(1) / (ab * ab).sum(1), 0, 1)[:, None]
            near = min(near, float((np.linalg.norm(a + t * ab, axis=1) - rad).min()))
    m["nearest_eye"] = near
    m["duration"] = float(path["T"][-1])
    m["hit_time"] = float(path["T"][h])
    return m
