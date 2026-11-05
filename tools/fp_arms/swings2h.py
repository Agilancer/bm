"""The two-handed moves, cut as first-person Skyrim plays them (a two-handed axe in the vanilla game, stepped through frame by frame).

What it shows, and what's here:

  * Carried, the weapon stands nearly upright at the right of the screen, its top near the top and both hands off the bottom (swings.CARRY).
  * Across (the vanilla game's right-to-left, about 0.25 s on the screen): the weapon's off the screen on the draw. Then the hands come in low from the
    lower right, in sight, the shaft lying almost flat across the view with its head trailing out to the right. They lead it right across
    to the lower left, and it whips round after them and off that corner. So here the fists are left of the X when the tip's on it.
  * Overhead (about 0.3 s on the screen): the hands come over from above, huge at the top corners, then the forearms make a V from the bottom corners with
    the fists at the middle and the blade standing up from them. It drops straight down the middle of the screen and off the bottom.
  * Home: off the screen for a long while, then it rises from the lower right, its top leaning in.

The left-to-right swings are those mirrored, and the rising cut's the same method: this footage shows neither. As in every clip here, the tip goes through the X
on a frame, along the swing's line, every blow starts and ends on the one guard, and the fist's speed is one hump. Both fists stay on the sword, and the elbows
follow from how near the shoulders the hands are (swings.solve_clip).
"""
import math

import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d

import swings as S
from swings import HZ, ZOOM, TIP, along, bell, slerp, un
from swings1h import carried, hump, lean_of

# The lines through the crosshair (degrees on screen, 0 right, 90 up, running from the + end to the - end)
LINES = {"sky1": 14.0, "sky2": 166.0, "sky3": 40.0, "sky4": 140.0, "sky5": 90.0, "wide_r": 6.0, "wide_l": 174.0, "chop": 72.0, "rise": -40.0}
# The right fist's way through each blow, in the eye's frame (metres: right, ahead, up): drawn back, in the strike, at the hit, past it, and at the end.
# back: the way the blade points when drawn back. tip: where the tip is on the line when it joins it and at the end (half the screen's height is 1).
DRAW = {
    "sky1": dict(way=[(0.50, 0.08, -0.20), (0.10, 0.42, -0.38), (-0.40, 0.40, -0.30), (-0.62, 0.30, -0.50), (-0.55, 0.22, -0.72)], back=(0.70, -0.62, 0.35), tip=(2.4, -2.2)),
    "sky2": dict(up=(0.10, 0.10, -0.62), way=[(-0.16, -0.10, 0.06), (-0.05, 0.42, -0.38), (0.50, 0.40, -0.30), (0.66, 0.30, -0.50), (0.62, 0.22, -0.72)], back=(-0.70, -0.62, 0.35), tip=(2.4, -2.2)),
    "sky3": dict(way=[(0.44, 0.06, -0.02), (0.12, 0.40, -0.24), (-0.36, 0.40, -0.48), (-0.52, 0.30, -0.66), (-0.46, 0.22, -0.82)], back=(0.45, -0.55, 0.70), tip=(2.2, -2.0)),
    "sky4": dict(up=(0.10, 0.10, -0.62), way=[(-0.20, -0.10, 0.02), (-0.10, 0.40, -0.28), (0.44, 0.40, -0.48), (0.58, 0.30, -0.66), (0.54, 0.22, -0.82)], back=(-0.45, -0.55, 0.70), tip=(2.2, -2.0)),
    "sky5": dict(way=[(0.18, -0.18, 0.16), (0.13, 0.24, 0.14), (0.03, 0.40, -0.52), (0.06, 0.42, -0.72), (0.12, 0.38, -0.88)], back=(0.06, -0.80, 0.60), tip=(2.4, -2.0), up=(0.46, 0.02, -0.14)),
    "wide_r": dict(way=[(0.54, 0.08, -0.26), (0.14, 0.44, -0.40), (-0.42, 0.42, -0.34), (-0.66, 0.30, -0.46), (-0.58, 0.22, -0.68)], back=(0.78, -0.60, 0.18), tip=(2.6, -2.4)),
    "wide_l": dict(up=(0.10, 0.10, -0.64), way=[(-0.18, -0.10, 0.00), (-0.06, 0.44, -0.40), (0.52, 0.42, -0.34), (0.70, 0.30, -0.46), (0.64, 0.22, -0.68)], back=(-0.78, -0.60, 0.18), tip=(2.6, -2.4)),
    "chop": dict(way=[(0.22, -0.18, 0.16), (0.16, 0.24, 0.14), (0.10, 0.40, -0.52), (0.08, 0.42, -0.72), (0.04, 0.38, -0.88)], back=(0.20, -0.75, 0.62), tip=(2.3, -2.0), up=(0.48, 0.02, -0.14)),
    "rise": dict(way=[(0.46, 0.08, -0.56), (0.20, 0.40, -0.58), (-0.28, 0.42, -0.50), (-0.50, 0.34, -0.34), (-0.48, 0.26, -0.20)], back=(0.55, -0.60, -0.58), tip=(2.2, -2.0)),
}
# seconds: guard to drawn right back, from there to the hit, through to the end of the follow-through, and home
TIMES = {k: (0.26, 0.20, 0.28, 0.32) for k in DRAW}
TIMES.update(sky2=(0.26, 0.22, 0.28, 0.32), sky4=(0.26, 0.22, 0.28, 0.32), sky5=(0.40, 0.22, 0.30, 0.38), chop=(0.36, 0.20, 0.30, 0.36), wide_r=(0.26, 0.22, 0.30, 0.32), wide_l=(0.26, 0.22, 0.30, 0.32))
ALIAS = {"slam": "sky5"}                   # (the same blow, under the name the game has it by)
ORDER = ("sky1", "sky2", "sky3", "sky4", "sky5", "slam", "chop", "rise", "wide_r", "wide_l")
COMBO = ("sky1", "sky2", "sky3", "sky4", "sky5")
HANG = 3                                   # frames the fist turns before the blade does
PEAK_LEAD = 2                              # frames before the hit that the fist is fastest
FIST_BUILD = 1.2                           # how late the speed comes in the strike
TIP_ON = 0.30                              # how much of the strike it takes the tip to join its line
RISE_BELL = (1.6, 1.5)                     # the way up: hardly slowing till it turns
HOME_FIST, HOME_BLADE = (1.4, 2.0), (1.25, 1.4)     # the way back: the arms lift first, the tip hanging and coming after
OVERLAP = 0.16                             # seconds the way back starts before the sweep's quite done
HOME_VIA = (0.40, 0.34, -0.72)             # the fist on the way home: under the screen on the right
HOME_LOW = un(np.array([0.30, 0.55, -0.78]))        # ...and the blade, pointing down, so it rises from the lower right


def line_of(name):
    return LINES[ALIAS.get(name, name)]


def drawn_path(name, half):
    """A blow: drawn back off the screen, the hands driven through with the blade trailing on to its line and the tip on the X on a frame, off the far side of the view, and home from under it."""
    key = ALIAS.get(name, name)
    F = DRAW[key]
    al = LINES[key]
    r_al = math.radians(al)
    f0 = np.array([0.0, 1.0, 0.0])
    u = np.array([math.cos(r_al), 0.0, math.sin(r_al)])
    n = np.cross(u, f0)
    fy = 1.6 * ZOOM
    way = np.array(F["way"], float)
    arc = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(way, axis=0), axis=1))]
    fist_on = CubicSpline(arc, way, bc_type="natural")
    t_rise, t_strike, t_through, t_home = TIMES[key]
    i_wind = int(round(t_rise * HZ))
    i_hit = i_wind + int(round(t_strike * HZ))
    i_end = i_hit + int(round(t_through * HZ))
    i_free = i_end - int(round(OVERLAP * HZ))
    N = i_end + int(round(t_home * HZ))
    T = np.arange(N + 1) / HZ
    TB, TH, TE, TS = T[i_wind], T[i_hit], T[i_end], T[i_free]
    TF, TP = T[i_wind - HANG], T[i_hit - PEAK_LEAD]
    g0, d0 = S.carry(half)
    r0 = g0 + d0 * half

    fine = np.linspace(0.0, float(arc[-1]), 4001)
    gone_ = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(fist_on(fine), axis=0), axis=1))]
    total, to_hit = float(gone_[-1]), float(np.interp(arc[2], fine, gone_))
    lo, hi = 0.02 * to_hit, 0.999 * to_hit
    for _ in range(50):
        mid = (lo + hi) / 2
        if float(hump(np.array([TH]), TF, TP, TE, mid, total - mid, FIST_BUILD)[0]) < to_hit:
            lo = mid
        else:
            hi = mid
    gone = hump(T, TF, TP, TE, (lo + hi) / 2, total - (lo + hi) / 2, FIST_BUILD)
    W_ = fist_on(np.interp(gone, gone_, fine))

    def pose_at(i, c):
        """The fist on this frame, and the blade from it, with its tip at c on the line on the screen."""
        r_ = math.atan(c / fy)
        ray = math.cos(r_) * f0 + math.sin(r_) * u
        g_ = W_[i]
        k = ray @ g_
        s_ = k + math.sqrt(max(k * k - g_ @ g_ + TIP * TIP, 1e-6))
        return g_, un(ray * s_ - g_)

    i_on = i_wind + max(int(round(TIP_ON * (i_hit - i_wind))), 2)
    c0, c1 = F["tip"]
    C = np.where(np.arange(N + 1) <= i_hit, c0 * (gone[i_hit] - gone) / (gone[i_hit] - gone[i_on]), c1 * (gone - gone[i_hit]) / (gone[i_end] - gone[i_hit]))
    C = np.clip(C, -7.0, 7.0)
    C = gaussian_filter1d(C, 1.2, mode="nearest")
    C = C - C[i_hit] * np.exp(-(((np.arange(N + 1) - i_hit) / 7.0) ** 2))
    theta_of = lambda d_: math.degrees(math.atan2(d_ @ u, d_ @ f0))
    d_top = un(np.array(F["back"], float))
    r_e, d_e = pose_at(N, C[N])
    top = way[0]
    pr = CubicSpline([0, 0.5, 1], [r0, np.array(F.get("up", (r0 + top) / 2)), top], bc_type="natural")
    rr = CubicSpline([0, 0.5, 1], [r_e, np.array(HOME_VIA), r0], bc_type="natural")
    home = [d_e, HOME_LOW, d0]
    R, D, W, V, TT = [], [], [], [], []
    for i, t in enumerate(T):
        if i <= i_wind:
            x = float(bell(np.array(t / TB), *RISE_BELL))
            xf = float(bell(np.array(min(t / TF, 1.0)), *RISE_BELL))
            g = pr(xf) if t < TF else W_[i]
            d, w = un(slerp(d0, d_top, x)), x ** 2
        else:
            g, d = pose_at(i, C[i])
            if i < i_on:
                q_ = (i - i_wind) / (i_on - i_wind)
                d = un(slerp(d_top, d, q_ * q_ * (3 - 2 * q_)))
            w = 1.0
            if i > i_free:
                q = (t - TS) / (T[-1] - TS)
                x, xd = float(bell(np.array(q), *HOME_FIST)), float(bell(np.array(q), *HOME_BLADE))
                w = 1 - x
                g = rr(x) + g - r_e
                d = carried(along(home, xd), d_e, d)
        tt = theta_of(d)
        r = math.radians(tt)
        v = math.sin(r) * f0 - math.cos(r) * u
        v = un(v - d * (v @ d)) if i <= i_end else np.zeros(3)
        R.append(g)
        D.append(d)
        W.append(w)
        V.append(v)
        TT.append(tt)
    R, D = np.array(R), np.array(D)
    soft = gaussian_filter1d(D, 1.2, axis=0, mode="nearest")
    idx = np.arange(N + 1)
    keep = np.maximum(np.exp(-(((idx - i_hit) / 4.0) ** 2)), np.maximum(1 - idx / 5.0, (idx - N + 5) / 5.0).clip(0, 1))[:, None]
    D = soft * (1 - keep) + D * keep
    D = D / np.linalg.norm(D, axis=1, keepdims=True)
    # (the tip stays where the unsmoothed blade put it: the fist moves that little, so the line and the X hold)
    return dict(name=key, T=T, G=R - D * half, D=D, edge_w=np.array(W), travel=np.array(V), normal=n, line=(u, f0),
                hit=i_hit, wind=i_wind, on=i_on, end=i_end, free=i_free, theta=np.array(TT), angle=al)
