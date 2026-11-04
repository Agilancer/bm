"""The sword-and-shield moves on the new skeleton, by the same rules as the two-hander (swings.py).

The cuts are the game's own (tools/templates/mocap1h.py in Bellmourn: the user's sword-and-shield video):
per cut a line through the crosshair, and (along the line from the crosshair, depth, the blade's angle
past ahead) for its wind-up, lag and hit. In the game a one-hander is drawn shrunk, so its keys are laid
out in a lifted frame; here the arms have the two-hander's own view, so the crosshair's ray is simply
straight ahead. As there:

  * the tip of the blade goes through the X at the hit, on a frame, along the swing's drawn line;
  * the edge leads the cut, a little off edge-on so the flat shows; the sword never turns in the fist
    (it hangs from the hand's own joint here, so it can't);
  * the arms hang from shoulders fixed to the camera, which ease toward a hand that's out of reach;
  * the blade's angle drives the swing, with one bell of speed and no holds;
  * every blow starts and ends on the one guard.

The follow-through is what's changed most: the game's cuts carry 38 to 68 degrees past the hit; here
they carry 70 to 108, the fist going on down the line and the wrist rolling through.

The shield steps aside for each blow as in the game (out and down, face turned out), frame for frame,
and comes back with the recovery. Holding it up (block) brings its rim just under the X, the sword drawn
back and down out of its way, and a thrust goes over the rim.
"""
import math

import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d

import swings as S
from swings import HZ, along, bell, chord_spline, frame_of_arm, slerp, sword_frames, transport, twist_of, un, unwrap_deg, viterbi, wrap180

TIP = 0.60                                 # the sword's tip from the fist (Bellmourn's PROXY sword1h)
SHO = np.array([0.25, 0.02, -0.32])        # the right shoulder from the eye, the left mirrored
OUT = 1.15                                 # the fists further out along the same lines than the keys: these arms are heavy
ZOOM = S.ZOOM
ROLLS = S.ROLLS
FLAT_ROLL = S.FLAT_ROLL

# mocap1h.SWINGS: line through the crosshair (degrees on screen, 0 right, 90 up, running from its + end to its
# - end), and (u along it, depth, blade angle) at the wind-up, (depth, blade angle) at the lag, (u, depth) at the
# hit. The lag's place along the line comes evenly between wind-up and hit (line_path): the game's keys have the
# fist hang back and then rush, up to half a metre in ten degrees of blade, a whip across the screen.
SWINGS = {
    "d1": (37.0, (0.30, 0.32, 100), (0.42, 60), (-0.30, 0.38)),         # high right to low left
    "d2": (143.0, (0.20, 0.42, 100), (0.46, 60), (-0.30, 0.38)),        # high left to low right
    "over": (90.0, (0.30, 0.30, 150), (0.42, 66), (-0.25, 0.40)),       # straight down, over the head
    "rise1": (-25.0, (0.30, 0.40, 100), (0.44, 56), (-0.18, 0.42)),     # low right, up to high left
    "rise2": (-155.0, (0.30, 0.40, 100), (0.44, 56), (-0.18, 0.42)),    # low left, up to high right
    "flat1": (10.0, (0.30, 0.38, 80), (0.44, 62), (-0.30, 0.40)),       # right to left across
    "flat2": (170.0, (0.22, 0.42, 80), (0.46, 62), (-0.30, 0.40)),      # left to right, back again
}
# the wind-up's furthest blade angle: less far back than the video's, so the wrist stays a wrist
WIND_CAP = {"d1": 84, "d2": 84, "over": 112, "rise1": 84, "rise2": 84, "flat1": 86, "flat2": 86}
# the overhead wind-up's fist (ahead, along the line): further forward and lower than the video's, so the arm
# isn't a wall beside the eye, its cut end never comes into view, and the fist stays in sight
WIND_AT = {"over": (0.44, 0.20)}
# the follow-through: (blade's angle, fist ahead, fist along the line), carrying on from the hit
THROUGH = {
    "d1": [(-8, 0.44, -0.42), (-32, 0.41, -0.47), (-60, 0.33, -0.52)],
    "d2": [(-8, 0.44, -0.42), (-32, 0.41, -0.47), (-58, 0.33, -0.51)],
    "over": [(-8, 0.47, -0.37), (-36, 0.45, -0.45), (-68, 0.37, -0.52)],
    "rise1": [(-8, 0.50, -0.25), (-30, 0.50, -0.27), (-56, 0.46, -0.27)],
    "rise2": [(-8, 0.50, -0.25), (-30, 0.50, -0.27), (-56, 0.46, -0.27)],
    "flat1": [(-10, 0.47, -0.42), (-40, 0.42, -0.50), (-72, 0.32, -0.54)],
    "flat2": [(-10, 0.47, -0.42), (-40, 0.42, -0.50), (-72, 0.32, -0.54)],
}
# how far beside the line the fist runs (m: wind-up, lag, hit, end), so the arm clears the X; the tip is still
# put on the line by turning the blade. LOW: the way it goes, where it isn't just the low side of the line
BESIDE = {"d1": (0.15, 0.13, 0.08, 0.04), "d2": (0.12, 0.12, 0.08, 0.04), "over": (0.14, 0.15, 0.11, 0.06),
          "rise1": (0.04, 0.12, 0.24, 0.27), "rise2": (0.04, 0.10, 0.15, 0.15), "flat1": (0.15, 0.17, 0.16, 0.10),
          "flat2": (0.15, 0.17, 0.16, 0.10)}
LOW = {"d2": (0.0, 0.0, -1.0), "rise1": (0.0, 0.0, -1.0), "rise2": (0.0, 0.0, -1.0), "flat1": (0.0, 0.0, -1.0), "flat2": (0.0, 0.0, -1.0)}
# seconds: guard to wind-up, the swing, back to the guard
TIMES = {"d1": (0.22, 0.50, 0.46), "d2": (0.22, 0.50, 0.46), "over": (0.32, 0.52, 0.46), "rise1": (0.34, 0.54, 0.46),
         "rise2": (0.34, 0.54, 0.46), "flat1": (0.22, 0.52, 0.46), "flat2": (0.22, 0.52, 0.46)}
ORDER = ("d1", "d2", "over", "rise1", "rise2", "flat1", "flat2")
COMBOS = {1: ["d1", "d2", "over"], 2: ["rise1", "rise2", "stab"], 3: ["flat1", "flat2", "over"],
          4: ["stab", "d1", "d2"], 5: ["over", "rise1", "flat1"], 6: ["d2", "flat2", "stab", "over"]}   # (mocap1h.COMBOS)

# the carry, as the game draws it: the fist low in the lower right fifth, the blade up
GUARD = dict(g=np.array([0.360, 0.44, -0.27]), d=un(np.array([0.07, 0.05, 1.0])))
# the sword drawn back and out of the shield's way
BACK = dict(g=np.array([0.42, 0.40, -0.33]), d=un(np.array([0.50, 0.30, 0.87])))
# the shield, in the eye's frame: (the fist on its grip, the way its face points); moves.py's ROUND, ROUND_UP,
# ROUND_ASIDE, its shove and its settle. Up: its rim just under the X, so you look over it
SHIELD = dict(carry=dict(c=(-0.42, 0.46, -0.50), face=(-0.30, 0.95, 0.10)),
              aside=dict(c=(-0.53, 0.40, -0.62), face=(-0.75, 0.66, 0.10)),
              up=dict(c=(0.04, 0.44, -0.33), face=(0.0, 1.0, 0.08)),
              shove=dict(c=(0.05, 0.53, -0.29), face=(0.0, 1.0, 0.20)))
# the thrust: drawn back to the hip, the tip then on the X's own ray all the way in (fist: right, ahead, up)
STAB = dict(draw=(0.27, 0.27, -0.27), chamber=(0.24, 0.29, -0.20), thrust=(0.11, 0.48, -0.20), hit=(0.07, 0.60, -0.20),
            end=(0.05, 0.70, -0.19))


def tip_on_ray(g):
    """The blade from a fist whose tip lies on the X's ray."""
    y = g[1] + math.sqrt(max(TIP * TIP - g[0] ** 2 - g[2] ** 2, 1e-4))
    return un(np.array([0.0, y, 0.0]) - g)


def line_path(name):
    """A cut: the fist and blade at each 60th of a second, and its timing facts."""
    al, (uw, dw, tw), (dl, tl), (uh, dh) = SWINGS[name]
    r_al = math.radians(al)
    f0 = np.array([0.0, 1.0, 0.0])
    u = np.array([math.cos(r_al), 0.0, math.sin(r_al)])
    n = np.cross(u, f0)
    tw = min(tw, WIND_CAP[name])
    bw, aw, al_, bh, ah = OUT * uw, OUT * dw, OUT * dl, OUT * uh, OUT * dh
    aw, bw = WIND_AT.get(name, (aw, bw))
    th = math.degrees(math.asin(np.clip(-bh / TIP, -1, 1)))
    bl = bw + (bh - bw) * (tw - tl) / (tw - th)
    seq = [(tw, aw, bw), (tl, al_, bl), (th, ah, bh)] + THROUGH[name]
    TH = np.array([s[0] for s in seq])
    assert np.all(np.diff(TH) < 0), f"{name}: the blade must keep turning one way {TH}"
    ga = CubicSpline(-TH, [s[1] for s in seq], bc_type="natural")
    gb = CubicSpline(-TH, [s[2] for s in seq], bc_type="natural")
    TH_c = np.r_[TH[:3], TH[-1]]
    gc = CubicSpline(-TH_c, BESIDE[name], bc_type="natural")
    low = n * (-1 if n[2] > 1e-6 else 1) if abs(n[2]) > 1e-6 else np.array([1.0, 0.0, 0.0])
    low = np.array(LOW.get(name, low))

    def pose_at(th_):
        r_ = math.radians(th_)
        gp = f0 * float(ga(-th_)) + u * float(gb(-th_))
        ray = un(gp + TIP * (math.cos(r_) * f0 + math.sin(r_) * u))
        g_ = gp + low * float(gc(-th_))
        k = ray @ g_
        s_ = k + math.sqrt(max(k * k - g_ @ g_ + TIP * TIP, 1e-6))
        return g_, un(ray * s_ - g_)

    TA, TB, TC = TIMES[name]
    span = TH[0] - TH[-1]
    uu = np.linspace(0, 1, 4001)
    u_hit = float(np.interp((TH[0] - th) / span, bell(uu, 2.0, 2.3), uu))
    TA = round(TA * HZ) / HZ
    TB = (round((TA + TB * u_hit) * HZ) / HZ - TA) / u_hit
    t_end = TA + TB
    N = int(round((t_end + TC) * HZ))
    TC = N / HZ - t_end
    T = np.arange(N + 1) / HZ
    g_w, d_w = pose_at(float(tw))
    g_e, d_e = pose_at(float(TH[-1]))
    pg, rg = chord_spline([GUARD["g"], g_w], [0, 1]), chord_spline([g_e, GUARD["g"]], [0, 1])
    G, D, W, V, TT = [], [], [], [], []
    for t in T:
        if t < TA:
            x = float(bell(np.array(t / TA), 2.0, 2.2))
            g, d, w, v, tt = pg(x), un(slerp(GUARD["d"], d_w, x)), x ** 2, np.zeros(3), tw
        elif t <= t_end + 1e-9:
            x = float(bell(np.array((t - TA) / TB), 2.0, 2.3))
            tt = float(TH[0] - span * x)
            g, d = pose_at(tt)
            r = math.radians(tt)
            v = -math.sin(r) * f0 + math.cos(r) * u
            v = un(v - d * (v @ d))
            past = (th - tt) / max(th - TH[-1], 1e-6)
            w = 1.0 - float(np.clip((past - 0.35) / 0.65, 0, 1)) ** 2
        else:
            x = float(bell(np.array((t - t_end) / TC), 1.8, 2.4))
            g, d, w, v, tt = rg(x), un(slerp(d_e, GUARD["d"], x)), 0.0, np.zeros(3), TH[-1]
        G.append(g)
        D.append(d)
        W.append(w)
        V.append(v)
        TT.append(tt)
    return dict(name=name, T=T, G=np.array(G), D=np.array(D), edge_w=np.array(W), travel=np.array(V), normal=n,
                hit=int(round((TA + TB * u_hit) * HZ)), wind=int(round(TA * HZ)), end=int(round(t_end * HZ)),
                theta=np.array(TT), line=al, start=GUARD, stop=GUARD)


def stab_path(name, start, times=(0.30, 0.34, 0.46)):
    """The thrust: back to the hip, then straight down the X's ray, the tip on it all the way in and out."""
    TA, TB, TC = times
    draw, chamber, thrust, hit, end = (OUT * np.array(STAB[k]) / 1.15 for k in ("draw", "chamber", "thrust", "hit", "end"))
    d_ch = tip_on_ray(chamber)
    pg = chord_spline([start["g"], draw, chamber], [0, 0.5, 1])
    ds = [start["d"], un(0.5 * (start["d"] + d_ch) + np.array([0.0, 0.1, 0.0])), d_ch]
    fg = CubicSpline([0, 0.45, 0.72, 1], [chamber, thrust, hit, end], bc_type="clamped")
    uu = np.linspace(0, 1, 2001)
    u_hit = float(np.interp(0.72, bell(uu, 2.0, 2.3), uu))
    TA = round(TA * HZ) / HZ
    TB = (round((TA + TB * u_hit) * HZ) / HZ - TA) / u_hit
    t_end = TA + TB
    N = int(round((t_end + TC) * HZ))
    TC = N / HZ - t_end
    T = np.arange(N + 1) / HZ
    g_e, d_e = fg(1.0), tip_on_ray(fg(1.0))
    rg = chord_spline([g_e, start["g"]], [0, 1])
    G, D = [], []
    for t in T:
        if t < TA:
            x = float(bell(np.array(t / TA), 2.0, 2.2))
            g, d = pg(x), along(ds, x)
        elif t <= t_end + 1e-9:
            x = float(bell(np.array((t - TA) / TB), 2.0, 2.3))
            g = fg(x)
            d = tip_on_ray(g)
        else:
            x = float(bell(np.array((t - t_end) / TC), 1.8, 2.4))
            g, d = rg(x), un(slerp(d_e, start["d"], x))
        G.append(g)
        D.append(d)
    n = N + 1
    return dict(name=name, T=T, G=np.array(G), D=np.array(D), edge_w=np.zeros(n), travel=np.zeros((n, 3)), normal=np.array([0, 0, 1.0]),
                hit=int(round((TA + TB * u_hit) * HZ)), wind=int(round(TA * HZ)), end=int(round(t_end * HZ)), line=None, thrust=True,
                start=start, stop=start)


def hold_path(name, pose, seconds=4.0, rate=30):
    """A pose, breathing: a loop that starts and ends on it."""
    N = int(seconds * rate)
    T = np.arange(N + 1) / rate
    ph = 2 * np.pi * T / seconds
    G = np.array([pose["g"] + np.array([0.0015 * np.sin(p), 0.0, 0.0045 * (1 - np.cos(p)) * -0.5]) for p in ph])
    D = np.array([un(pose["d"] + np.array([0.0025 * np.sin(p), 0.0, 0.0035 * (1 - np.cos(p)) * -0.5])) for p in ph])
    return dict(name=name, T=T, G=G, D=D, edge_w=np.zeros(N + 1), travel=np.zeros((N + 1, 3)), normal=np.array([0, 0, 1.0]),
                hit=None, wind=0, end=N, line=None, start=pose, stop=pose)


def move_path(name, a, b, seconds):
    """From one pose to another on one bell (the sword, while the shield comes up or goes down)."""
    N = int(round(seconds * HZ))
    T = np.arange(N + 1) / HZ
    x = bell(T / T[-1], 2.0, 2.2)
    G = a["g"] * (1 - x[:, None]) + b["g"] * x[:, None]
    D = np.array([un(slerp(a["d"], b["d"], float(q))) for q in x])
    return dict(name=name, T=T, G=G, D=D, edge_w=np.zeros(N + 1), travel=np.zeros((N + 1, 3)), normal=np.array([0, 0, 1.0]),
                hit=None, wind=0, end=N, line=None, start=a, stop=b)


def natural_sword_frame(arm, pose):
    """The sword's rotation at a held pose: the roll that sits easiest in the wrist while showing the
    blade's flat to the eye, not a hairline of its edge."""
    g, d = pose["g"], pose["d"]
    x0 = un(np.cross(d, np.array([0.0, 0.0, 1.0])))
    grid = np.arange(ROLLS) * 360.0 / ROLLS
    Rs = sword_frames(np.broadcast_to(d, (ROLLS, 3)), np.broadcast_to(x0, (ROLLS, 3)), grid)
    R_h, W = arm.hand(Rs, np.broadcast_to(g, (ROLLS, 3)), np.zeros(ROLLS))
    Sh, _ = arm.reach(W)
    bend, _, E = arm.cost(R_h, Sh, W)
    _, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
    tw = twist_of(Rf, R_h, arm.Q0)
    eye = un(-(g + d * TIP * 0.6))
    edge_on = np.degrees(np.arccos(np.clip(np.abs(Rs[:, :, 0] @ eye), 0, 1)))      # (0: the flat square to the eye)
    return Rs[int(np.argmin((bend / 80) ** 2 + (tw / 90) ** 2 + (edge_on / 30) ** 2))]


def solve_sword(path, arm):
    """The sword's roll through a clip (wrist at ease, the edge leading), then the arm on it."""
    T, G, D = path["T"], path["G"], path["D"]
    N = len(T)
    Rs_a, Rs_b = natural_sword_frame(arm, path["start"]), natural_sword_frame(arm, path["stop"])
    X = transport(D, Rs_a[:, 0])
    grid = np.arange(ROLLS) * 360.0 / ROLLS
    step = 360.0 / ROLLS
    cost = np.zeros((N, ROLLS))
    fl = math.radians(FLAT_ROLL)
    for i in range(N):
        Rs = sword_frames(np.broadcast_to(D[i], (ROLLS, 3)), np.broadcast_to(X[i], (ROLLS, 3)), grid)
        R_h, W = arm.hand(Rs, np.broadcast_to(G[i], (ROLLS, 3)), np.zeros(ROLLS))
        Sh, _ = arm.reach(W)
        bend, _, E = arm.cost(R_h, Sh, W)
        _, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
        tw = twist_of(Rf, R_h, arm.Q0)
        c = (bend / 90) ** 2 + (tw / 100) ** 2
        w, v = path["edge_w"][i], path["travel"][i]
        if w > 0 and np.linalg.norm(v) > 0:
            target = math.cos(fl) * v + math.sin(fl) * un(np.cross(D[i], v))
            err = np.degrees(np.arccos(np.clip(np.abs(Rs[:, :, 2] @ target), 0, 1)))
            c = c + 3.5 * w * (err / 25) ** 2
        cost[i] = c
    ang_of = lambda x, i: math.degrees(math.atan2(x @ np.cross(X[i], D[i]), x @ X[i]))
    p0, p1 = ang_of(Rs_a[:, 0], 0), ang_of(Rs_b[:, 0], N - 1)
    psi = grid[viterbi(cost, step, 1 / 36.0, int(round(p0 / step)) % ROLLS, int(round(p1 / step)) % ROLLS)]
    psi = gaussian_filter1d(unwrap_deg(psi), 2.6, mode="nearest")
    d0, d1 = wrap180(p0 - psi[0]), wrap180(p1 - psi[-1])
    a = np.clip(1 - T / max(T[path["wind"]], 1e-6), 0, 1) if path["wind"] else np.zeros(N)
    b = np.clip((T - T[path["end"]]) / max(T[-1] - T[path["end"]], 1e-6), 0, 1) if path["end"] < N - 1 else np.zeros(N)
    if not path["wind"] and path["end"] == N - 1:      # (a plain move: the difference spreads over all of it)
        a, b = 1 - T / T[-1], T / T[-1]
    psi = psi + d0 * (a * a * (3 - 2 * a)) + d1 * (b * b * (3 - 2 * b))
    return sword_frames(D, X, psi)


def solve_arm(arm, Rs, r):
    """An arm on whatever its hand holds, frame by frame."""
    R_h, W = arm.hand(Rs, r, np.zeros(len(r)))
    Sh, _ = arm.reach(W)
    _, p = arm.elbow(Sh, W)
    p = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
    E, _ = arm.elbow(Sh, W, p)
    Ru, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
    tw = wrap180(unwrap_deg(twist_of(Rf, R_h, arm.Q0)))
    f = (W - E) / arm.F
    bend = np.degrees(np.arccos(np.clip((f * (R_h @ arm.fh[..., None])[..., 0]).sum(-1), -1, 1)))
    return dict(S=Sh, E=E, W=W, Ru=Ru, Rf=Rf, Rh=R_h, twist=tw, bend=bend)


def shield_frame(arm, c, face):
    """The shield's rotation for a fist place and a way to face: the turn about its face that sits
    easiest in the wrist, its grip within sixty degrees of upright."""
    c, face = np.array(c, float), un(np.array(face, float))
    z = -face
    up = un(np.array([0.0, 0.0, 1.0]) - z * z[2])
    best, Rb = 1e18, None
    for a in np.arange(-60, 61, 4.0):
        r = math.radians(a)
        y = un(math.cos(r) * up + math.sin(r) * np.cross(z, up))
        Rs = np.c_[np.cross(y, z), y, z]
        R_h, W = arm.hand(Rs[None], c[None], np.zeros(1))
        Sh, _ = arm.reach(W)
        bend, _, E = arm.cost(R_h, Sh, W)
        _, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
        tw = twist_of(Rf, R_h, arm.Q0)
        k = float((bend[0] / 60) ** 2 + (tw[0] / 90) ** 2 + (a / 90) ** 2)
        if k < best:
            best, Rb = k, Rs
    return Rb


def quat_of(R):
    w = math.sqrt(max(1 + np.trace(R), 1e-12)) / 2
    if w > 1e-3:
        return np.array([(R[2, 1] - R[1, 2]) / (4 * w), (R[0, 2] - R[2, 0]) / (4 * w), (R[1, 0] - R[0, 1]) / (4 * w), w])
    i = int(np.argmax(np.diag(R)))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = math.sqrt(max(1 + R[i, i] - R[j, j] - R[k, k], 1e-12)) * 2
    q = np.zeros(4)
    q[i] = s / 4
    q[j] = (R[j, i] + R[i, j]) / s
    q[k] = (R[k, i] + R[i, k]) / s
    q[3] = (R[k, j] - R[j, k]) / s
    return q


def mat_of(q):
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def blend_shield(keys, weights):
    """Shield frames through a list of (centre, rotation) keys, by a [frames] float position along them."""
    cs = np.array([k[0] for k in keys])
    qs = [quat_of(k[1]) for k in keys]
    for i in range(1, len(qs)):
        if qs[i] @ qs[i - 1] < 0:
            qs[i] = -qs[i]
    Rs, ps = [], []
    for x in weights:
        i = min(int(x), len(keys) - 2)
        u = float(x - i)
        q = (1 - u) * qs[i] + u * qs[i + 1]
        Rs.append(mat_of(q))
        ps.append((1 - u) * cs[i] + u * cs[i + 1])
    return np.array(Rs), np.array(ps)


def build_clips(info, B):
    """All the clips: {name: (path, sol)}, sol holding each arm's joints frame by frame."""
    armR = S.Arm("R", info, B, held="sword", sho=SHO, lift=0.5)
    armL = S.Arm("L", info, B, held="shield", sho=SHO, lift=0.5)
    SK = {k: (np.array(v["c"], float), shield_frame(armL, v["c"], v["face"])) for k, v in SHIELD.items()}
    carry, aside, up, shove = SK["carry"], SK["aside"], SK["up"], SK["shove"]
    clips = {}

    def clip(cname, path, shield_keys, weights):
        Rs = solve_sword(path, armR)
        sol = dict(T=path["T"], sword_R=Rs, sword_p=path["G"], R=solve_arm(armR, Rs, path["G"]))
        RL, pL = blend_shield(shield_keys, weights)
        sol["L"] = solve_arm(armL, RL, pL)
        clips[cname] = (path, sol)

    for name in ORDER + ("stab",):
        path = stab_path("stab", GUARD) if name == "stab" else line_path(name)
        T = path["T"]
        t_in, t_stay = T[path["hit"]] * 0.9, T[path["end"]]
        w = bell(np.minimum(T / t_in, 1.0), 2.0, 2.2) * (1 - bell(np.clip((T - t_stay) / (T[-1] - t_stay), 0, 1), 2.0, 2.2))
        clip(f"blade_{name}", path, [carry, aside], w)
    # the guard, at rest
    p = hold_path("idle", GUARD)
    ph = 2 * np.pi * p["T"] / 4.0
    clip("guard_idle", p, [carry, aside], 0.012 * (1 - np.cos(ph)))
    # the shield up: raised, driven out and up (the shove), settling back into the block
    p = move_path("up", GUARD, BACK, 0.46)
    x = bell(p["T"] / p["T"][-1], 1.8, 1.8)
    clip("shield_up", p, [carry, up, shove, up], np.minimum(3 * x * (0.5 + 0.5 * x) / 1.0, 3.0))
    p = hold_path("hold", BACK, seconds=3.0)
    clip("shield_hold", p, [up, up], np.zeros(len(p["T"])))
    p = move_path("down", BACK, GUARD, 0.42)
    clip("shield_down", p, [up, carry], bell(p["T"] / p["T"][-1], 2.0, 2.0))
    # the thrust over the rim: the shield stays up
    p = stab_path("stab", BACK, times=(0.24, 0.30, 0.38))
    clip("blade_stab_block", p, [up, up], np.zeros(len(p["T"])))
    return clips, armR, armL


def metrics(path, sol):
    tip = sol["sword_p"] + sol["sword_R"][:, :, 1] * TIP
    m = dict(duration=float(path["T"][-1]))
    m["wrist_bend_max"] = {s: float(sol[s]["bend"].max()) for s in "RL"}
    m["wrist_twist_max"] = {s: float(np.abs(sol[s]["twist"]).max()) for s in "RL"}
    near = 9.0
    for side in "RL":
        A = sol[side]
        for a, b, rad in ((A["S"], A["E"], 0.10), (A["E"], A["W"], 0.075)):
            ab = b - a
            t = np.clip(-(a * ab).sum(1) / (ab * ab).sum(1), 0, 1)[:, None]
            near = min(near, float((np.linalg.norm(a + t * ab, axis=1) - rad).min()))
    m["nearest_eye"] = near
    # the fist's fastest, in metres a second; and frames where an arm's cut end shows (at 16:9: its middle,
    # a little to spare: the flesh round it runs on off the screen as an arm)
    m["fist_m_s"] = float(np.linalg.norm(np.diff(sol["sword_p"], axis=0), axis=1).max() / (path["T"][1] - path["T"][0]))
    fy, fx = 1.6 * ZOOM, 1.6 * ZOOM / (16 / 9)
    stump = 0
    for side in "RL":
        P = sol[side]["S"]
        y = np.maximum(P[:, 1], 1e-3)
        stump += int(((P[:, 1] > 0.05) & (fx * (np.abs(P[:, 0]) - 0.05) / y < 1) & (fy * (np.abs(P[:, 2]) - 0.05) / y < 1)).sum())
    m["stump_frames"] = stump
    if path["hit"] is not None:
        h = path["hit"]
        fy = 1.6 * ZOOM
        fx = fy / 1.6
        m["hit_time"] = float(path["T"][h])
        m["tip_ndc_at_hit"] = (float(fx * tip[h, 0] / tip[h, 1]), float(fy * tip[h, 2] / tip[h, 1]))
        if "theta" in path:
            m["carries"] = float(path["theta"][h] - path["theta"][path["end"]])
        sp = np.degrees(np.arccos(np.clip((sol["sword_R"][1:, :, 1] * sol["sword_R"][:-1, :, 1]).sum(1), -1, 1))) * HZ
        m["peak_deg_s"] = float(sp.max())
    return m
