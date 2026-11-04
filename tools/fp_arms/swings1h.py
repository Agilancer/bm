"""The sword-and-shield moves on the new skeleton, by the same rules as the two-hander (swings.py).

The cuts' lines are the game's (tools/templates/mocap1h.py in Bellmourn: the user's sword-and-shield video). In the
game a one-hander is drawn shrunk, so its keys are laid out in a lifted frame; here the arms have the two-hander's own
view, so the crosshair's ray is simply straight ahead. As there:

  * the tip of the blade goes through the X at the hit, on a frame, along the swing's drawn line;
  * the edge leads the cut, a little off edge-on so the flat shows; the sword never turns in the fist
    (it hangs from the hand's own joint here, so it can't);
  * the arm carries the swing, not the wrist: as in the video, a wrist only bends in the blade's own plane, cocked back in
    the wind-up and opening toward straight through the cut (`cock`), never sideways; the elbow and the unseen shoulder
    move to put the forearm there, the torso turning behind the blow, and the arm goes out long through the follow-through;
  * the blade's angle drives the swing, with one bell of speed and no holds;
  * the fist is laid out on the screen (FIST): low and beside the X at the hit, so the blade pivots through it;
  * every blow starts and ends on the one guard.

The follow-through is what's changed most: the game's cuts carry 38 to 68 degrees past the hit; here
they carry further, the whole arm going on down the line with the blade, the hand low at the end of it.

The shield steps aside for each blow as in the game (out and down, face turned out), frame for frame,
and comes back with the recovery. Holding it up (block) brings its rim just under the X, the sword drawn
back and down out of its way, and a thrust goes over the rim.

Carried, both ride your steps as the two-hander's does (anims.walk_cycle): the same sway, in step.
"""
import math

import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d

import swings as S
from swings import HZ, along, bell, chord_spline, frame_of_arm, slerp, steady_twist, sword_frames, transport, twist_of, un, unwrap_deg, viterbi, wrap180

TIP = 0.60                                 # the sword's tip from the fist (Bellmourn's PROXY sword1h)
POMMEL = -0.098                            # ...and its pommel, which sits just past the wrist
POMMEL_CLEAR = 62.0                        # the least angle at the wrist between the forearm and the pommel: below it, the pommel's through the skin
SHOULDER_EASE = 0.40                       # metres: the shoulder may come this far before it weighs as much as a bent wrist
SHOULDER_ROOM = (0.22, 0.30, 0.12)         # how far the torso can carry the shoulder: across, ahead, up or down (metres)
TWIST_EASE = 100.0                         # how far a forearm rolls either way from the sculpt's before it starts to cost (degrees)
TWIST_MAX = 125.0                          # ...and the most it will (the sculpt has no more in its skin)
TWIST_RATE = 9.0                           # ...and how fast, in degrees a frame
# How far the wrist is cocked from the sculpt's grip, in the blade's own plane (degrees). The sculpt holds the handle almost
# in line with its forearm, as far as a real wrist goes that way; from there it only opens the one way, blade up from the
# forearm. COCK: the most it may be at the wind-up, the hit and the end of the follow-through.
RADIALS = np.arange(15.0, 71.0, 5.0)
COCK = dict(wind=65.0, hit=45.0, end=40.0)
# ...and on the cuts that finish out to the right, across the arm's own side, the blade can't lie in line with the forearm and
# stay in sight: it stands off it, as a hammer does in a fist, its plane still through the forearm
COCK_END = {"d2": 45.0, "flat2": 45.0}
HOOK_EASE = 0.10                           # how far off its forearm's line, on the screen, before a fist starts to cost (half the screen's height is 1)
ELBOW_DROP = 0.15                          # after the hit, how far under the hand an elbow should fall on the screen (from -1 to 1)
ELBOW_NEAR = 0.30                          # ...and how near the eye it may come before the forearm swells to a lump (metres)
ELBOW_BEND = (12.0, 140.0)                 # how straight and how bent an elbow goes (degrees from straight)
ELBOW_ASTRAY = 0.09                        # how far an elbow may stray the wrong side of the arm's line before the wrist helps out (metres)
IN_LINE = {}                               # past the hit, how much a cut wants its forearm and blade in one line on the screen (by name)
FOLD_EASE = 35.0                           # ...and the degrees of fold between them that weigh as much as the rest
SHO = np.array([0.25, 0.02, -0.32])        # the right shoulder from the eye, the left mirrored
ZOOM = S.ZOOM
ROLLS = S.ROLLS
FLAT_ROLL = S.FLAT_ROLL
FLAT_SIDE = {"rise1": -1, "flat1": -1, "over": 1}                             # (which way the edges sit off edge-on, by blow: toward the eye, not away)

# mocap1h.SWINGS' lines through the crosshair (degrees on screen, 0 right, 90 up, running from the + end to the - end)
LINES = {"d1": 37.0, "d2": 143.0, "over": 90.0, "rise1": -25.0, "rise2": -155.0, "flat1": 10.0, "flat2": 170.0}
# the wind-up's furthest blade angle: less far back than the video's, so the wrist stays a wrist
WIND_CAP = {"d1": 84, "d2": 84, "over": 85, "rise1": 20, "rise2": 20, "flat1": 45, "flat2": 60}
LAG_AT = 0.60                              # the blade's angle at the middle key: this far from the hit's toward the wind-up's
# The fist's way through each blow, laid out on the screen at 16:9: (x, y, how far ahead). The wind-up, the middle of
# the swing (it has most of its way behind it: the fist leads, then slows as the blade comes through), the hit, and
# through it: (degrees of blade past the hit, x, y, how far ahead), staying in sight. The blade is put on the tip's ray
# from wherever the fist is: only the tip's path is the rule's.
FIST = {
    "d1": dict(wind=(0.66, 0.2, 0.46), lag=(0.5, -0.42, 0.46), hit=(0.42, -0.62, 0.46),
        through=[(23, 0.276, -0.656, 0.478), (42, 0.17, -0.682, 0.491), (58, 0.1, -0.7, 0.5)]),
    "d2": dict(wind=(-0.28, 0.02, 0.46), lag=(-0.24, -0.38, 0.48), hit=(-0.16, -0.56, 0.5),
        through=[(23, -0.07, -0.569, 0.473), (42, -0.004, -0.576, 0.453), (58, 0.04, -0.58, 0.44)]),
    "over": dict(wind=(0.36, 0.5, 0.44), lag=(0.28, -0.4, 0.46), hit=(0.24, -0.66, 0.46),
        through=[(23, 0.321, -0.687, 0.442), (42, 0.38, -0.707, 0.429), (58, 0.42, -0.72, 0.42)]),
    "rise1": dict(wind=(0.62, -0.62, 0.46), lag=(0.5, -0.62, 0.46), hit=(0.4, -0.6, 0.46),
        through=[(21, 0.175, -0.532, 0.478), (37, 0.01, -0.483, 0.491), (52, -0.1, -0.45, 0.5)]),
    "rise2": dict(wind=(-0.24, -0.6, 0.5), lag=(-0.18, -0.56, 0.5), hit=(-0.14, -0.54, 0.52),
        through=[(26, 0.036, -0.499, 0.538), (46, 0.164, -0.47, 0.551), (64, 0.25, -0.45, 0.56)]),
    "flat1": dict(wind=(0.7, -0.38, 0.58), lag=(0.5, -0.26, 0.48), hit=(0.44, -0.32, 0.5),
        through=[(26, 0.197, -0.514, 0.455), (46, 0.019, -0.655, 0.422), (64, -0.1, -0.75, 0.4)]),
    "flat2": dict(wind=(-0.46, -0.1, 0.46), lag=(-0.24, -0.46, 0.48), hit=(-0.14, -0.52, 0.5),
        through=[(26, 0.08, -0.444, 0.482), (48, 0.242, -0.387, 0.469), (66, 0.35, -0.35, 0.46)]),
}
# seconds: guard to wind-up, the swing, back to the guard
TIMES = {"d1": (0.22, 0.44, 0.40), "d2": (0.22, 0.44, 0.36), "over": (0.32, 0.46, 0.38), "rise1": (0.26, 0.42, 0.46),
         "rise2": (0.26, 0.42, 0.38), "flat1": (0.22, 0.44, 0.42), "flat2": (0.22, 0.44, 0.36)}
HOME_BELL = (1.5, 1.7)                     # the way back: more even than a blow's, so it never reads as a second one
ORDER = ("d1", "d2", "over", "rise1", "rise2", "flat1", "flat2")
COMBOS = {1: ["d1", "d2", "over"], 2: ["rise1", "rise2", "stab"], 3: ["flat1", "flat2", "over"],
          4: ["stab", "d1", "d2"], 5: ["over", "rise1", "flat1"], 6: ["d2", "flat2", "stab", "over"]}   # (mocap1h.COMBOS)



def screen(sx, sy, y):
    """A place on the screen at 16:9, and how far ahead, in the eye's frame."""
    fy = 1.6 * ZOOM
    fx = fy / S.ASPECT
    return np.array([sx / fx * y, y, sy / fy * y])


def pose_on_screen(fist, tip):
    """A held pose, from where its fist and tip fall on the screen."""
    g = screen(*fist)
    ray = screen(*tip, 1.0)
    a, b, c = ray @ ray, ray @ g, g @ g - TIP * TIP
    return dict(g=g, d=un(ray * (b + math.sqrt(b * b - a * c)) / a - g))


# the carry, where the game draws it (measured in its moves.html at 16:9): the fist low in the lower right fifth, the
# blade up and clear of the view's middle
GUARD = pose_on_screen((0.60, -0.84, 0.44), (0.63, 0.55))
# the sword drawn back and out of the shield's way, as the game's
BACK = pose_on_screen((0.72, -0.96, 0.42), (0.86, 0.16))
# on the way back a blade that ended left of the X comes along the bottom and lifts on the right, by way of this:
# it never sweeps back across the middle like a second blow
BACK_LOW = dict(d=un(np.array([-0.05, 0.95, 0.0])))
# ...and the fist goes by way of here, out in front: the elbow drops and the arm draws the sword back
HOME_VIA = (0.42, -0.70, 0.52)
# the shield, in the eye's frame: (the fist on its grip, the way its face points); moves.py's ROUND, ROUND_UP,
# ROUND_ASIDE, its shove and its settle. Carried, only its upper right shows in the corner; up, its rim is just under
# the X and it stands left of the middle, so you look over it and past it
SHIELD = dict(carry=dict(c=(-0.357, 0.46, -0.622), face=(-0.30, 0.95, 0.10)),
              aside=dict(c=(-0.50, 0.40, -0.72), face=(-0.75, 0.66, 0.10)),
              up=dict(c=(-0.035, 0.42, -0.285), face=(0.0, 1.0, 0.08), turn=4),
              shove=dict(c=(-0.03, 0.50, -0.26), face=(0.0, 1.0, 0.20), turn=4))
# on the move (anims.walk_cycle, made smooth): the fist and shield sway and dip in step, the tip less and later. Standing
# it's the same loop, smaller and slowed right down; holding the shield up, it's smaller still
WALK = dict(frames=55, sway=0.053, tip_sway=0.022, dip=0.018, lag=25.0, standing=0.4, holding=0.3)
# the thrust: drawn back to the hip, the tip then on the X's own ray all the way in (fist: right, ahead, up)
STAB = dict(draw=(0.27, 0.27, -0.27), chamber=(0.26, 0.29, -0.20), thrust=(0.18, 0.48, -0.20), hit=(0.13, 0.60, -0.20),
            end=(0.11, 0.68, -0.19))


def tip_on_ray(g):
    """The blade from a fist whose tip lies on the X's ray."""
    y = g[1] + math.sqrt(max(TIP * TIP - g[0] ** 2 - g[2] ** 2, 1e-4))
    return un(np.array([0.0, y, 0.0]) - g)


def line_path(name):
    """A cut: the fist and blade at each 60th of a second, and its timing facts."""
    al = LINES[name]
    r_al = math.radians(al)
    f0 = np.array([0.0, 1.0, 0.0])
    u = np.array([math.cos(r_al), 0.0, math.sin(r_al)])
    n = np.cross(u, f0)
    low = n * (-1 if n[2] > 1e-6 else 1) if abs(n[2]) > 1e-6 else np.array([1.0, 0.0, 0.0])

    def plane(sx, sy, y):
        """A place on the screen: how far ahead, along the line, and beside it."""
        p_ = screen(sx, sy, y)
        return p_ @ f0, p_ @ u, p_ @ low

    F = FIST[name]
    tw = WIND_CAP[name]
    hit_ = plane(*F["hit"])
    th = math.degrees(math.asin(np.clip(-hit_[1] / TIP, -1, 1)))
    seq = [(tw, *plane(*F["wind"])), (th + LAG_AT * (tw - th), *plane(*F["lag"])), (th, *hit_)]
    seq += [(th - past, *plane(sx, sy, y)) for past, sx, sy, y in F["through"]]
    TH = np.array([s_[0] for s_ in seq])
    assert np.all(np.diff(TH) < 0), f"{name}: the blade must keep turning one way {TH}"
    ga, gb, gc = (CubicSpline(-TH, [s_[i] for s_ in seq], bc_type="natural") for i in (1, 2, 3))

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
    u_hit = float(np.interp((TH[0] - th) / span, bell(uu, *S.BELLS["swing"]), uu))
    TA = round(TA * HZ) / HZ
    TB = (round((TA + TB * u_hit) * HZ) / HZ - TA) / u_hit
    t_end = TA + TB
    N = int(round((t_end + TC) * HZ))
    TC = N / HZ - t_end
    T = np.arange(N + 1) / HZ
    g_w, d_w = pose_at(float(tw))
    g_e, d_e = pose_at(float(TH[-1]))
    pg = chord_spline([GUARD["g"], g_w], [0, 1])
    tip_e = g_e + d_e * TIP
    fx_ = 1.6 * ZOOM / S.ASPECT
    from_left = fx_ * tip_e[0] / tip_e[1] < 0.25
    home = [d_e, BACK_LOW["d"], GUARD["d"]] if from_left else [d_e, GUARD["d"]]
    rg = chord_spline([g_e, screen(*HOME_VIA), GUARD["g"]], [0, 0.5, 1]) if from_left else chord_spline([g_e, GUARD["g"]], [0, 1])
    G, D, W, V, TT, LEAD, COCKS, FIN = [], [], [], [], [], [], [], []
    for t in T:
        lead = 1.0
        cock = COCK["wind"]
        fin = 0.0
        if t < TA:
            x = float(bell(np.array(t / TA), *S.BELLS["rise"]))
            lead = x
            g, d, w, v, tt = pg(x), un(slerp(GUARD["d"], d_w, x)), x ** 2, np.zeros(3), tw
        elif t <= t_end + 1e-9:
            x = float(bell(np.array((t - TA) / TB), *S.BELLS["swing"]))
            tt = float(TH[0] - span * x)
            g, d = pose_at(tt)
            r = math.radians(tt)
            v = -math.sin(r) * f0 + math.cos(r) * u
            v = un(v - d * (v @ d))
            past = (th - tt) / max(th - TH[-1], 1e-6)
            w = 1.0 - float(np.clip((past - 0.35) / 0.65, 0, 1)) ** 2
            to_hit = float(np.clip((TH[0] - tt) / (TH[0] - th), 0, 1))
            cock = COCK["wind"] + (COCK["hit"] - COCK["wind"]) * to_hit * to_hit * (3 - 2 * to_hit)
            if tt < th:
                cock = COCK["hit"] + (COCK_END.get(name, COCK["end"]) - COCK["hit"]) * min(past, 1.0)
                fin = min(past * 3, 1.0)
        else:
            x = float(bell(np.array((t - t_end) / TC), *HOME_BELL))
            lead = 1 - x ** 2.5
            fin = 1 - x
            cock = COCK_END.get(name, COCK["end"]) + (COCK["wind"] - COCK_END.get(name, COCK["end"])) * x
            g, d, w, v, tt = rg(x), along(home, x), 0.0, np.zeros(3), TH[-1]
        G.append(g)
        D.append(d)
        W.append(w)
        V.append(v)
        TT.append(tt)
        LEAD.append(lead)
        COCKS.append(cock)
        FIN.append(fin)
    return dict(name=name, T=T, G=np.array(G), D=np.array(D), edge_w=np.array(W), travel=np.array(V), normal=n,
                hit=int(round((TA + TB * u_hit) * HZ)), wind=int(round(TA * HZ)), end=int(round(t_end * HZ)),
                theta=np.array(TT), line=al, start=GUARD, stop=GUARD, lead=np.array(LEAD), cock=np.array(COCKS), finish=np.array(FIN))


def stab_path(name, start, times=(0.28, 0.26, 0.36)):
    """The thrust: back to the hip, then straight down the X's ray, the tip on it all the way in and out."""
    TA, TB, TC = times
    draw, chamber, thrust, hit, end = (np.array(STAB[k]) for k in ("draw", "chamber", "thrust", "hit", "end"))
    d_ch = tip_on_ray(chamber)
    pg = chord_spline([start["g"], draw, chamber], [0, 0.5, 1])
    ds = [start["d"], un(0.5 * (start["d"] + d_ch) + np.array([0.0, 0.1, 0.0])), d_ch]
    fg = CubicSpline([0, 0.45, 0.72, 1], [chamber, thrust, hit, end], bc_type="clamped")
    uu = np.linspace(0, 1, 2001)
    u_hit = float(np.interp(0.72, bell(uu, 2.0, 1.6), uu))
    TA = round(TA * HZ) / HZ
    TB = (round((TA + TB * u_hit) * HZ) / HZ - TA) / u_hit
    t_end = TA + TB
    N = int(round((t_end + TC) * HZ))
    TC = N / HZ - t_end
    T = np.arange(N + 1) / HZ
    g_e, d_e = fg(1.0), tip_on_ray(fg(1.0))
    rg = chord_spline([g_e, start["g"]], [0, 1])
    G, D, LEAD = [], [], []
    for t in T:
        lead = 1.0
        if t < TA:
            x = float(bell(np.array(t / TA), 2.0, 2.2))
            lead = x
            g, d = pg(x), along(ds, x)
        elif t <= t_end + 1e-9:
            x = float(bell(np.array((t - TA) / TB), 2.0, 1.6))
            g = fg(x)
            d = tip_on_ray(g)
        else:
            x = float(bell(np.array((t - t_end) / TC), 1.8, 2.4))
            lead = 1 - x
            g, d = rg(x), un(slerp(d_e, start["d"], x))
        G.append(g)
        D.append(d)
        LEAD.append(lead)
    n = N + 1
    return dict(name=name, T=T, G=np.array(G), D=np.array(D), edge_w=np.zeros(n), travel=np.zeros((n, 3)), normal=np.array([0, 0, 1.0]),
                hit=int(round((TA + TB * u_hit) * HZ)), wind=int(round(TA * HZ)), end=int(round(t_end * HZ)), line=None, thrust=True,
                start=start, stop=start, lead=np.array(LEAD) * 0.75, cock=np.full(n, COCK["wind"]))      # (driven straight ahead: the wrist has the last of it)


def carry_path(name, pose, amount):
    """A pose, riding your steps: a loop that starts and ends on it, the fist on a smooth figure of eight, at the middle
    of its sway and the low point of its dip on frame 0, the tip going the same way, less and later. `amount`: of the
    walk's size. Also the shield's way, to go with it."""
    N = WALK["frames"]
    T = np.arange(N + 1) / HZ
    ph = 2 * np.pi * np.arange(N + 1) / N
    lag = math.radians(WALK["lag"])
    x_, z_ = np.array([1.0, 0.0, 0.0]), np.array([0.0, 0.0, 1.0])
    off = amount * (np.outer(WALK["sway"] * np.sin(ph), x_) + np.outer(WALK["dip"] * np.sin(ph) ** 2, z_))
    tip = pose["g"] + pose["d"] * TIP + amount * (np.outer(WALK["tip_sway"] * (np.sin(ph - lag) + math.sin(lag)), x_)
                                                  + np.outer(WALK["dip"] * (np.sin(ph - lag) ** 2 - math.sin(lag) ** 2), z_))
    G = pose["g"] + off
    D = (tip - G) / np.linalg.norm(tip - G, axis=1, keepdims=True)
    return dict(name=name, T=T, G=G, D=D, edge_w=np.zeros(N + 1), travel=np.zeros((N + 1, 3)), normal=np.array([0, 0, 1.0]),
                hit=None, wind=0, end=N, line=None, start=pose, stop=pose), off


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
    twists = np.zeros((N, ROLLS))
    fl = math.radians(FLAT_ROLL * FLAT_SIDE.get(path["name"], 1))
    leads = path.get("lead", np.zeros(N))
    cocks = path.get("cock", np.full(N, COCK["wind"]))
    finishes = path.get("finish", np.zeros(N))
    for i in range(N):
        Rs = sword_frames(np.broadcast_to(D[i], (ROLLS, 3)), np.broadcast_to(X[i], (ROLLS, 3)), grid)
        R_h, W = arm.hand(Rs, np.broadcast_to(G[i], (ROLLS, 3)), np.zeros(ROLLS))
        Sh, E, bend, _, _, more = arm_on_hand(arm, R_h, W, leads[i], cocks[i], None, finishes[i])
        twists[i] = more[0]
        c = (bend / 90) ** 2 + (np.linalg.norm(Sh - arm.S0, axis=-1) / SHOULDER_EASE) ** 2 + (elbow_astray(arm, E, W) / 0.04) ** 2
        high, near = elbow_on_screen(E, W)
        c = c + finishes[i] * ((high / 0.2) ** 2 + (near / 0.06) ** 2)
        if finishes[i] > 0:       # (past the hit: the fist on the forearm's line, the blade's flat to the eye)
            to_eye = un(-(G[i] + D[i] * TIP * 0.5))
            flat = np.degrees(np.arcsin(np.clip(np.abs(Rs[:, :, 0] @ to_eye), 0, 1)))
            c = c + finishes[i] * ((hook_on_screen(E, W, G[i]) / HOOK_EASE) ** 2 + 2 * (np.maximum(0, 22 - flat) / 12) ** 2)
            c = c + finishes[i] * IN_LINE.get(path["name"], 0.0) * (fold_on_screen(E, W, G[i] + D[i] * TIP) / FOLD_EASE) ** 2
        q = G[i] + Rs[:, :, 1] * POMMEL - W
        e = (E - W) / np.linalg.norm(E - W, axis=-1, keepdims=True)
        clear = np.degrees(np.arccos(np.clip((q * e).sum(-1) / np.linalg.norm(q, axis=-1), -1, 1)))
        c = c + 4 * (np.maximum(0, POMMEL_CLEAR - clear) / 25) ** 2
        w, v = path["edge_w"][i], path["travel"][i]
        if path["hit"] is not None and i <= path["hit"]:      # (coming up and coming in the flat shows: edge-on it's a wire against the sky)
            to_eye = un(-(G[i] + D[i] * TIP * 0.5))
            flat = np.degrees(np.arcsin(np.clip(np.abs(Rs[:, :, 0] @ to_eye), 0, 1)))
            c = c + 2.5 * (np.maximum(0, 25 - flat) / 15) ** 2
        if w > 0 and np.linalg.norm(v) > 0:
            target = math.cos(fl) * v + math.sin(fl) * un(np.cross(D[i], v))
            err = np.degrees(np.arccos(np.clip(np.abs(Rs[:, :, 2] @ target), 0, 1)))
            c = c + 3.5 * w * (err / 25) ** 2
        cost[i] = c
    ang_of = lambda x, i: math.degrees(math.atan2(x @ np.cross(X[i], D[i]), x @ X[i]))
    p0, p1 = ang_of(Rs_a[:, 0], 0), ang_of(Rs_b[:, 0], N - 1)
    # the roll, within a full turn either way of the start, knowing how far the forearm has really wound: a roll one
    # turn on looks the same at the hand but isn't the same wrist
    i0 = int(round(p0 / step)) % ROLLS
    rolls = grid[i0] + (np.arange(2 * ROLLS) - ROLLS) * step
    idx = (np.arange(2 * ROLLS) - ROLLS + i0) % ROLLS
    per_roll = np.sign(np.median(wrap180(np.diff(twists[0]))))
    ref = twists[0, i0] + per_roll * (rolls - grid[i0])
    wound = ref + wrap180(twists[:, idx] - ref)
    whole = cost[:, idx] + (wound / 100) ** 2 + (np.maximum(0, np.abs(wound) - TWIST_EASE) / 15) ** 2
    psi = rolls[viterbi(whole, step, 1 / 36.0, ROLLS, ROLLS + int(round(wrap180(p1 - grid[i0]) / step)))]
    psi = gaussian_filter1d(psi, 2.6, mode="nearest")
    d0, d1 = wrap180(p0 - psi[0]), wrap180(p1 - psi[-1])
    a = np.clip(1 - T / max(T[path["wind"]], 1e-6), 0, 1) if path["wind"] else np.zeros(N)
    b = np.clip((T - T[path["end"]]) / max(T[-1] - T[path["end"]], 1e-6), 0, 1) if path["end"] < N - 1 else np.zeros(N)
    if not path["wind"] and path["end"] == N - 1:      # (a plain move: the difference spreads over all of it)
        a, b = 1 - T / T[-1], T / T[-1]
    psi = psi + d0 * (a * a * (3 - 2 * a)) + d1 * (b * b * (3 - 2 * b))
    return sword_frames(D, X, psi)


def _unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-9)


def _turned(v, axis, deg):
    """v, turned about a unit axis square to it, by an angle in degrees."""
    a = np.radians(deg)[..., None]
    return np.cos(a) * v + np.sin(a) * np.cross(axis, v)


def forearm_way(arm, R_h, cocks):
    """The way a forearm lies for this hand, the wrist cocked by this much (degrees), in the blade's own plane (.., 3)."""
    f0 = arm.rel @ arm.fh                # (in the sword's frame)
    a = math.atan2(-f0[2], f0[1]) + np.radians(cocks)
    r = math.hypot(f0[1], f0[2])
    fs = np.stack([np.full_like(a, f0[0]), r * np.cos(a), -r * np.sin(a)], -1)
    return ((R_h @ np.swapaxes(arm.rel, -1, -2))[..., None, :, :] @ fs[..., None])[..., 0]


def _shoulder_fits(arm, S_):
    """Is this somewhere a shoulder could get to with the torso turning, and is its cut end off the screen?"""
    d = (S_ - arm.S0) / np.array(SHOULDER_ROOM)
    fy = 1.6 * ZOOM
    fx = fy / S.ASPECT
    y = np.maximum(S_[..., 1], 1e-3)
    off = (fy * (np.abs(S_[..., 2]) - 0.07) / y > 1.0) | (fx * (np.abs(S_[..., 0]) - 0.07) / y > 1.0) | (S_[..., 1] < 0.05)
    return ((d * d).sum(-1) <= 1) & off


def _shoulder_for(arm, E, want):
    """The shoulder nearest where it wants to be, an upper arm from this elbow."""
    return E + _unit(want - E) * arm.U


def elbow_astray(arm, E, W):
    """How far (metres) an elbow has gone the wrong side of the line from the shoulder to the wrist: elbows hang out and down.
    Up or in, the upper arm turns its far side, which the sculpt never painted, to the eye."""
    line = _unit(W - arm.S0)
    off = E - arm.S0
    off = off - line * (off * line).sum(-1, keepdims=True)
    pole = _unit(arm.pole)
    under = np.clip((1.6 * ZOOM * E[..., 2] / np.maximum(E[..., 1], 0.05) + 1.1) / 0.3, 0, 1)      # (under the screen's edge, nobody sees that upper arm)
    return np.maximum(0.0, -(off * pole).sum(-1)) * under


def elbow_on_screen(E, W):
    """After the hit: how far an elbow is from falling well under the hand on the screen (a forearm laid flat across the
    bottom of the view, the fist hooked off its end, reads as a broken wrist), and how near it's come to the eye."""
    fy = 1.6 * ZOOM
    height = lambda P_: fy * P_[..., 2] / np.maximum(P_[..., 1], 0.05)
    return np.maximum(0.0, height(E) - height(W) + ELBOW_DROP), np.maximum(0.0, ELBOW_NEAR - np.linalg.norm(E, axis=-1))


def hook_on_screen(E, W, fist):
    """How far a fist hangs off the line of its forearm on the screen (half the screen's height is 1): what reads as a wrist
    hooked over, whatever the joint says, since the sculpt's hand sits a little off the forearm's axis."""
    fy = 1.6 * ZOOM
    at = lambda P_: fy * P_[..., [0, 2]] / np.maximum(P_[..., 1:2], 0.05)
    a, b = at(W) - at(E), at(fist) - at(W)
    return np.abs(a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]) / np.maximum(np.linalg.norm(a, axis=-1), 1e-6)


def fold_on_screen(E, W, tip):
    """The degrees between a forearm and its blade on the screen (0: one straight line)."""
    fy = 1.6 * ZOOM
    at = lambda P_: fy * P_[..., [0, 2]] / np.maximum(P_[..., 1:2], 0.05)
    a, b = at(W) - at(E), at(tip) - at(W)
    return np.degrees(np.arctan2(np.abs(a[..., 0] * b[..., 1] - a[..., 1] * b[..., 0]), (a * b).sum(-1)))


def best_cock(arm, R_h, W, most, finish=0.0):
    """How far to cock the wrist for this hand: whatever asks least of the shoulder and leaves the elbow hanging naturally,
    within `most` (degrees), and straighter if it's all the same to the arm."""
    ways = forearm_way(arm, R_h, RADIALS)      # (.., K, 3)
    E = W[..., None, :] - ways * arm.F
    S_ = _shoulder_for(arm, E, arm.S0)
    c = (np.linalg.norm(S_ - arm.S0, axis=-1) / 0.12) ** 2 + (RADIALS / 70.0) ** 2 + (elbow_astray(arm, E, W[..., None, :]) / 0.03) ** 2
    c = c + 40.0 * ~_shoulder_fits(arm, S_) + 400.0 * (RADIALS > np.asarray(most)[..., None])
    high, near = elbow_on_screen(E, W[..., None, :])
    c = c + np.asarray(finish)[..., None] * ((high / 0.2) ** 2 + (near / 0.06) ** 2)
    return RADIALS[np.argmin(c, axis=-1)]


def _arm_at(arm, R_h, W, Sh, E0, k, cock, keep=None):
    """The arm with its lead at k and its wrist cocked by `cock`, as a real arm goes: the forearm's way, then the elbow's hinge
    about it (the hand's own hinge, turned by at most TWIST_MAX: a forearm can only roll so far) and how far the elbow is
    bent. The shoulder lands as near as those allow to where it wants to be. So a hinge can't flip and a forearm can't wind.
    `keep`: (twist, bend) to use, already smoothed, in place of working them out. Gives the shoulder, elbow, wrist's bend,
    and (the twist, the elbow's bend, the hinge's rest, the forearm's way)."""
    natural = (R_h @ arm.fh[..., None])[..., 0]
    wanted = forearm_way(arm, R_h, np.asarray(cock)[..., None])[..., 0, :]
    f = _unit((W - E0) / arm.F * (1 - k) + wanted * k)
    E = W - f * arm.F
    rest = (R_h @ np.swapaxes(arm.Q0, -1, -2))[..., 0]
    rest = _unit(rest - f * (rest * f).sum(-1, keepdims=True))
    if keep is None:
        ud = -_unit(arm.S0 * k + Sh * (1 - k) - E)
        along_f = (ud * f).sum(-1, keepdims=True)
        side = ud - f * along_f
        n = _unit(np.cross(side, f))
        tau = np.degrees(np.arctan2((np.cross(rest, n) * f).sum(-1), (rest * n).sum(-1)))
        phi = np.degrees(np.arctan2(np.linalg.norm(side, axis=-1), along_f[..., 0]))
    else:
        tau, phi = keep
    tau = np.clip(tau, -TWIST_MAX, TWIST_MAX)
    phi = np.clip(phi, *ELBOW_BEND)
    n = _turned(rest, f, tau)
    a = np.radians(phi)[..., None]
    ud = np.cos(a) * f + np.sin(a) * np.cross(f, n)
    S_ = E - ud * arm.U
    bend = np.degrees(np.arccos(np.clip((f * natural).sum(-1), -1, 1)))
    return S_, E, bend, (tau, phi, n, f, ud)


def arm_on_hand(arm, R_h, W, lead, most, pole=None, finish=0.0):
    """Shoulder, elbow, the wrist's bend, how far the arm leads and how far the wrist is cocked, for a hand. `lead`, from 0 to
    1: how far the arm should carry the swing. At 0 the arm reaches for the wrist as it can and the wrist takes up the rest;
    at 1 the wrist only cocks in the blade's plane, by at most `most`, and the elbow and shoulder go where that puts them.
    It leads as far as a shoulder can get to (SHOULDER_ROOM), and the wrist gives the little that's left."""
    Sh, _ = arm.reach(W)
    E0, _ = arm.elbow(Sh, W, pole)
    lead = np.broadcast_to(np.asarray(lead, float), W.shape[:-1])
    cock = best_cock(arm, R_h, W, most, finish)
    k = np.zeros_like(lead)
    for a in (1.0, 0.8, 0.6, 0.4, 0.2):      # (from the most it could lead, down)
        try_k = lead * a
        S_, E_, _, _ = _arm_at(arm, R_h, W, Sh, E0, try_k[..., None], cock)
        k = np.where((k == 0) & _shoulder_fits(arm, S_) & (elbow_astray(arm, E_, W) < ELBOW_ASTRAY), try_k, k)
    S_, E, bend, more = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock)
    return S_, E, bend, k, cock, more


def lead_arm(arm, Rs, r, lead, most=None, finish=None):
    """The sword arm, carrying the swing: frame by frame, on the hand that holds the sword. Its lead, the wrist's cock, the
    forearm's twist and the elbow's bend all ease from frame to frame, so nothing in the arm can jump."""
    if most is None:
        most = np.full(len(r), COCK["wind"])
    R_h, W = arm.hand(Rs, r, np.zeros(len(r)))
    Sh, _ = arm.reach(W)
    _, p = arm.elbow(Sh, W)
    p = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
    _, _, _, k, cock, _ = arm_on_hand(arm, R_h, W, lead, most, p, 0.0 if finish is None else finish)
    k = np.minimum(gaussian_filter1d(k, 3.0, mode="nearest"), lead)       # (no quicker than the arm could turn)
    cock = gaussian_filter1d(cock, 3.0, mode="nearest")
    Sh, _ = arm.reach(W)
    E0, _ = arm.elbow(Sh, W, p)
    _, _, _, (tau, phi, _, _, _) = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock)
    N = len(r)
    wound = unwrap_deg(tau)
    u = np.arange(N) / (N - 1)
    wound = wound - (wound[-1] - tau[-1]) * np.clip((u - 0.6) / 0.4, 0, 1)      # (back to where it started, by the end)

    def eased(x):
        """Smoothed, and still exactly itself on the first and last frames: those are the guard."""
        y = gaussian_filter1d(x, 2.0, mode="nearest")
        return y + (x[0] - y[0]) * np.clip(1 - u * 8, 0, 1) ** 2 + (x[-1] - y[-1]) * np.clip(1 - (1 - u) * 8, 0, 1) ** 2

    def no_quicker(x, per_frame):
        """No faster than this per frame, whichever way it's run through: where an arm goes nearly straight its hinge can
        swing right round in a few frames, and the forearm would spin with it."""
        a, b = x.copy(), x.copy()
        for i in range(1, N):
            a[i] = np.clip(a[i], a[i - 1] - per_frame, a[i - 1] + per_frame)
            b[N - 1 - i] = np.clip(b[N - 1 - i], b[N - i] - per_frame, b[N - i] + per_frame)
        return (a + b) / 2

    tau, phi = eased(no_quicker(np.clip(wound, -TWIST_MAX, TWIST_MAX), TWIST_RATE)), eased(phi)
    S_, E, bend, (tau, phi, n, f, ud) = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock, (tau, phi))

    def about(y):
        x = _unit(n - y * (n * y).sum(-1, keepdims=True))
        return np.stack([x, y, np.cross(x, y)], -1)
    Ru, Rf = about(ud), about(f)
    tw = steady_twist(twist_of(Rf, R_h, arm.Q0))
    return dict(S=S_, E=E, W=W, Ru=Ru, Rf=Rf, Rh=R_h, twist=tw, bend=bend, cock=cock, lead=k)


def solve_arm(arm, Rs, r):
    """An arm on whatever its hand holds, frame by frame."""
    R_h, W = arm.hand(Rs, r, np.zeros(len(r)))
    Sh, _ = arm.reach(W)
    _, p = arm.elbow(Sh, W)
    p = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
    E, _ = arm.elbow(Sh, W, p)
    Ru, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
    tw = steady_twist(twist_of(Rf, R_h, arm.Q0))
    f = (W - E) / arm.F
    bend = np.degrees(np.arccos(np.clip((f * (R_h @ arm.fh[..., None])[..., 0]).sum(-1), -1, 1)))
    return dict(S=Sh, E=E, W=W, Ru=Ru, Rf=Rf, Rh=R_h, twist=tw, bend=bend)


def shield_frame(arm, c, face, turn=None):
    """The shield's rotation for a fist place and a way to face: the turn about its face that sits
    easiest in the wrist, its grip within sixty degrees of upright (or as `turn` says, in degrees: held up, the
    planks stand nearly upright as the game's do)."""
    c, face = np.array(c, float), un(np.array(face, float))
    z = -face
    up = un(np.array([0.0, 0.0, 1.0]) - z * z[2])
    best, Rb = 1e18, None
    for a in np.arange(-60, 61, 4.0) if turn is None else (float(turn),):
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
    armR = S.Arm("R", info, B, held="sword", sho=SHO, lift=0.5, ahead=1.2)
    armL = S.Arm("L", info, B, held="shield", sho=SHO, lift=0.5)
    SK = {k: (np.array(v["c"], float), shield_frame(armL, v["c"], v["face"], v.get("turn"))) for k, v in SHIELD.items()}
    carry, aside, up, shove = SK["carry"], SK["aside"], SK["up"], SK["shove"]
    clips = {}

    def clip(cname, path, shield_keys, weights, off=0.0):
        Rs = solve_sword(path, armR)
        sol = dict(T=path["T"], sword_R=Rs, sword_p=path["G"], R=lead_arm(armR, Rs, path["G"], path.get("lead", np.zeros(len(path["T"]))), path.get("cock"), path.get("finish")))
        RL, pL = blend_shield(shield_keys, weights)
        sol["L"] = solve_arm(armL, RL, pL + off)
        clips[cname] = (path, sol)

    for name in ORDER + ("stab",):
        path = stab_path("stab", GUARD) if name == "stab" else line_path(name)
        T = path["T"]
        t_in, t_stay = T[path["hit"]] * 0.9, T[path["end"]]
        w = bell(np.minimum(T / t_in, 1.0), 2.0, 2.2) * (1 - bell(np.clip((T - t_stay) / (T[-1] - t_stay), 0, 1), 2.0, 2.2))
        clip(f"blade_{name}", path, [carry, aside], w)
    # the carry, standing and on the move
    for cname, amount in (("guard_idle", WALK["standing"]), ("guard_walk", 1.0)):
        p, off = carry_path("idle", GUARD, amount)
        clip(cname, p, [carry, carry], np.zeros(len(p["T"])), off)
    # the shield up: raised, driven out and up (the shove), settling back into the block
    p = move_path("up", GUARD, BACK, 0.46)
    x = bell(p["T"] / p["T"][-1], 1.8, 1.8)
    clip("shield_up", p, [carry, up, shove, up], np.minimum(3 * x * (0.5 + 0.5 * x) / 1.0, 3.0))
    p, off = carry_path("hold", BACK, WALK["holding"])
    clip("shield_hold", p, [up, up], np.zeros(len(p["T"])), off)
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
