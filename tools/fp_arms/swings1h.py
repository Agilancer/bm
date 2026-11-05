"""The sword-and-shield moves on the new skeleton, cut as first-person Skyrim plays them. The lines through the X come from
tools/templates/mocap1h.py in Bellmourn (the owner's sword-and-shield video); the rest comes from stepping through first-person footage.

  * Carried, the hand's off the bottom of the screen and the top half of the blade stands up at the right (GUARD).
  * A blow draws right back: the fist comes by the shoulder, the elbow folds and the sword leaves the screen (DRAW's top, back).
  * Then the elbow opens and drives the fist out. The tip joins its line (TIP_ON), goes through the X on a frame, and the arm runs on off
    the far side of the view, opening till shoulder, arm and blade are one line (ARM_OUT). It comes home from under the screen.
  * At the hit the fist is well out to the side of the X, often off the screen, so the blade lies across the view, not into it. A metre
    of blade from a fist `a` metres off the X's ray sits asin(a) off that ray: `blade_d1`'s fist is 0.80 out, so about 53 degrees. Square to the ray can't be reached.
  * The forearm follows the hand (`lead`) and the wrist only cocks in the blade's plane, where the shoulder can get there. Lower `lead`
    leaves it to plain reach and the wrist takes up the rest. The hand may be off the screen for most of a blow.
  * The fist's speed is one hump (`hump`): it's fastest a little before the hit and slows through the follow-through. The blade's length
    never changes, and the sword never turns in the fist, since it hangs from the hand's own joint.
  * Every blow starts and ends on the one guard, so any can follow any.

The `sky` blows are the five-swing combo, and the game's attack. The body goes with the blow (`lean_of`): only the world moves, so the
arms and the X stay put on the screen. The shield steps aside for each blow as in the game (out and down, face turned out) and comes back
with the recovery. Held up, it stands left of the middle with the sword down and off the screen, and a thrust goes over its rim.

Carried, both ride your steps as the two-hander's does (anims.walk_cycle): the same sway, in step.
"""
import math

import numpy as np
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d

import swings as S
from swings import HZ, along, bell, chord_spline, frame_of_arm, slerp, steady_twist, sword_frames, transport, twist_of, un, unwrap_deg, viterbi, wrap180

TIP = 1.00                                 # the sword's tip from the fist, as tools/swords/lengthen.py draws them (Bellmourn's 0.60 reads as a dagger)
POMMEL = -0.098                            # ...and its pommel, which sits just past the wrist
POMMEL_CLEAR = 62.0                        # the least angle at the wrist between the forearm and the pommel: below it, the pommel's through the skin
SHOULDER_EASE = 0.40                       # metres: the shoulder may come this far before it weighs as much as a bent wrist
UPPER_ANCHOR = np.array([0.0, -0.24, 0.0])   # where an upper arm heads for, from the shoulder: an elbow close by the shoulder itself would swing it round in a frame
SHOULDER_ROOM = (0.34, 0.30, 0.20)         # how far the torso can carry the shoulder: across, ahead, up or down (metres)
TWIST_EASE = 80.0                         # how far a forearm rolls either way from the sculpt's before it starts to cost (degrees)
TWIST_MAX = 105.0                          # ...and the most it will (the sculpt has no more in its skin)
TWIST_RATE = 12.0                           # ...and how fast, in degrees a frame
# How far the wrist is cocked from the sculpt's grip, in the blade's own plane (degrees). The sculpt holds the handle almost
# in line with its forearm, as far as a real wrist goes that way; from there it only opens the one way, blade up from the
# forearm, and it can close the little that's left between them. COCK: the most it may be at the wind-up, the hit and the end of the follow-through.
RADIALS = np.arange(-15.0, 71.0, 5.0)
COCK = dict(wind=65.0, hit=45.0, end=40.0)
HOOK_EASE = 0.10                           # how far off its forearm's line, on the screen, before a fist starts to cost (half the screen's height is 1)
ELBOW_DROP = 0.15                          # after the hit, how far under the hand an elbow should fall on the screen (from -1 to 1)
ELBOW_NEAR = 0.30                          # ...and how near the eye it may come before the forearm swells to a lump (metres)
ELBOW_ASTRAY = 0.09                        # how far an elbow may stray the wrong side of the arm's line before the wrist helps out (metres)
FOLD_EASE = 35.0                           # past the hit, the degrees of fold between forearm and blade on the screen that weigh as much as the rest
# What a cut's finish asks beyond those, by name. in_line: how much it wants its forearm and blade in one line on the screen. room: in
# place of SHOULDER_ROOM. (An arm's cut end isn't its shoulder: it's partway up the upper arm, and it rises with the elbow.) drop: in
# place of ELBOW_DROP. An overhead cut ends with the arm straight and the elbow still up: forearm, fist and blade going down one line.
# A backhand ends with the forearm swung out across the body from an elbow under the view, the blade going on from it.
FINISH = {"d1": dict(room=(0.40, 0.30, 0.22)), "flat1": dict(room=(0.40, 0.30, 0.22)), "rise1": dict(room=(0.40, 0.30, 0.22)), "over": dict(room=(0.34, 0.30, 0.26), drop=1.0), "d2": dict(in_line=6.0), "flat2": dict(in_line=6.0)}
SHO = np.array([0.25, 0.02, -0.32])        # the right shoulder from the eye, the left mirrored
ZOOM = S.ZOOM
ROLLS = S.ROLLS
# How far the edges sit off edge-on, by blow, and which way (degrees). Where a cut's plane runs nearly through the eye (d2, flat2) a blade with its edge
# dead true is a wire, so it rolls well off; on the lever it shows its flat anyway, and the edge can lead true.
FLAT_PAST = {"d1": 28.0, "over": 17.0, "d2": 60.0, "flat2": 40.0}
FLAT = {"sky1": 25.0, "sky2": -25.0, "sky3": -17.0, "sky4": -25.0, "sky5": 17.0, "d1": 30.0, "d2": -36.0, "over": 17.0, "rise1": -17.0, "rise2": -10.0, "flat1": -17.0, "flat2": -40.0}

# mocap1h.SWINGS' lines through the crosshair (degrees on screen, 0 right, 90 up, running from the + end to the - end)
LINES = {"sky1": 18.0, "sky2": 162.0, "sky3": -40.0, "sky4": 125.0, "sky5": 90.0, "d1": 37.0, "d2": 143.0, "over": 90.0, "rise1": -25.0, "rise2": -155.0, "flat1": 10.0, "flat2": 170.0}
# Each blow, in the eye's frame (metres: right, ahead, up). top: the fist drawn back by the shoulder, the elbow folded. hit: the fist at the hit, well to the side of
# the X and often off the screen, so the blade lies across the view, square to the crosshair, and square to the way it's going: the fist's a long way off the
# X's ray, and a metre of blade can only lie so flat. back: the way the blade points when drawn back. tip: where the tip is on the line when it joins it and at the end.
# run: how far the fist runs along the line before and after the hit, carrying the blade across with it, hardly turning.
LEAD_HIT, LEAD_END = 0.85, 0.60              # how far the forearm follows the hand, at the hit and at the end of the follow-through: from there the elbow straightens, reaching
ARM_OUT = 0.59                             # at the end of the follow-through: the fist this far out from the shoulder toward the tip
DRAW = {
    "d1": dict(top=(0.42, 0.06, -0.06), hit=(0.62, 0.32, -0.50), back=(0.30, -0.45, 0.84), tip=(1.9, -2.0), run=(0.30, 0.42)),
    "d2": dict(top=(-0.06, 0.16, -0.30), hit=(-0.15, 0.42, -0.62), back=(-0.55, -0.35, 0.75), tip=(1.9, -2.0), run=(0.26, 0.42)),
    "over": dict(top=(0.28, 0.04, 0.02), hit=(0.45, 0.38, -0.25), back=(0.12, -0.75, 0.65), tip=(1.7, -1.8), run=(0.30, 0.42)),
    "rise1": dict(top=(0.46, 0.10, -0.50), hit=(0.00, 0.42, -0.60), back=(0.45, -0.70, -0.55), tip=(1.9, -2.0), run=(0.26, 0.36)),
    "rise2": dict(top=(-0.02, 0.18, -0.52), hit=(0.35, 0.40, -0.60), back=(-0.50, -0.45, -0.74), tip=(1.9, -2.0), run=(0.26, 0.36)),
    "flat1": dict(top=(0.50, 0.08, -0.26), hit=(0.40, 0.40, -0.55), back=(0.70, -0.70, 0.12), tip=(2.0, -2.2), run=(0.28, 0.44)),
    # the five-swing combo, from first-person Skyrim alone: across from the right, back across from the left, up from low on the right, down from the upper left, and the
    # big overhead finisher with the longest draw
    "sky1": dict(top=(0.48, 0.06, -0.12), hit=(0.60, 0.34, -0.46), back=(0.62, -0.62, 0.45), tip=(1.9, -2.2), run=(0.30, 0.42)),
    "sky2": dict(top=(-0.06, 0.16, -0.28), hit=(-0.16, 0.42, -0.60), back=(-0.70, -0.55, 0.40), tip=(1.9, -2.2), run=(0.26, 0.42)),
    "sky3": dict(top=(0.46, 0.10, -0.48), hit=(0.10, 0.42, -0.60), back=(0.45, -0.70, -0.55), tip=(1.9, -2.0), run=(0.26, 0.36)),
    "sky4": dict(top=(-0.04, 0.14, -0.22), hit=(-0.10, 0.42, -0.60), back=(-0.45, -0.40, 0.80), tip=(1.9, -2.0), run=(0.26, 0.42)),
    "sky5": dict(top=(0.30, 0.02, 0.04), hit=(0.50, 0.38, -0.30), back=(0.10, -0.85, 0.52), tip=(1.9, -1.9), run=(0.30, 0.42)),
    "flat2": dict(top=(-0.08, 0.16, -0.30), hit=(-0.18, 0.42, -0.60), back=(-0.75, -0.62, 0.20), tip=(2.0, -2.2), run=(0.26, 0.44)),
}
# seconds: guard to drawn right back, from there to the hit, through to the end of the follow-through, and home. What first-person Skyrim shows: it's on the
# screen for the strike, a fifth to a third of a second, and off it for most of the rest.
TIMES = {k: (0.23, 0.17, 0.30, 0.30) for k in DRAW}
TIMES.update(sky1=(0.18, 0.15, 0.26, 0.26), sky2=(0.18, 0.15, 0.26, 0.26), sky3=(0.18, 0.15, 0.26, 0.26), sky4=(0.18, 0.15, 0.26, 0.26), sky5=(0.30, 0.19, 0.34, 0.34))
HANG = 3                                   # frames the fist turns before the blade does: it's off down the line while the blade's still going back
PEAK_LEAD = 2                              # frames before the hit that the fist is fastest
FIST_BUILD = 1.2                           # how late the speed comes in the strike (the power of sin^2 of the time: 1 is an even rise)
TIP_ON = 0.45                              # how much of the strike it takes the tip to join its line
RISE_BELL = (1.6, 1.5)                      # the way up: hardly slowing till it turns, so it never hangs at the top
HOME_FIST, HOME_BLADE = (1.4, 2.0), (1.25, 1.4)     # the way back, on a bell each: the arm lifts first, the tip hanging and coming after
OVERLAP = 0.18                             # seconds the way back starts before the sweep's quite done: the blade never stops dead at the bottom
LEAN = (0.03, 0.02, 0.035)                 # the turn of the head with a cut across, its dip with one downward, and its tilt with one across (radians)
ORDER = ("d1", "d2", "over", "rise1", "rise2", "flat1", "flat2", "sky1", "sky2", "sky3", "sky4", "sky5")
COMBOS = {1: ["sky1", "sky2", "sky3", "sky4", "sky5"], 2: ["d1", "d2", "over"], 3: ["rise1", "rise2", "stab"], 4: ["flat1", "flat2", "over"],
          5: ["stab", "d1", "d2"], 6: ["over", "rise1", "flat1"], 7: ["d2", "flat2", "stab", "over"]}   # (the first's first-person Skyrim's; the rest, mocap1h.COMBOS)



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


# the carry, as first-person Skyrim has it: the hand off the bottom of the screen, the top of the blade standing up at the right
GUARD = pose_on_screen((0.60, -1.25, 0.42), (0.50, 0.55))
# the sword down and off the screen behind the shield, as first-person Skyrim has it
BACK = pose_on_screen((0.74, -1.45, 0.38), (1.15, -1.15))
# on the way home a blade comes along the bottom and lifts on the right, by way of this: it never sweeps back across the middle like a second blow
BACK_LOW = dict(d=un(np.array([0.10, 0.92, 0.28])))
# the shield, in the eye's frame: (the fist on its grip, the way its face points). As first-person Skyrim plays it
# (YouTube _ZMx-ejIIBc at 1.9-2.8 s and 7.4-8.5 s): carried, only an edge shows in the corner; up, the boss is low on the left, the
# top of the rim is above the X's height and the rim passes under the X; a bash shoves it up and in, whips it out to the left edge-on
# with the fist showing, and comes back
# The wrist never bends: the hand is locked straight on the forearm and the shield is rigid on the hand, resting on both. So the shield is aimed only by the elbow (`pole`)
# and the forearm's roll: `face` is the way wanted, and the roll that comes nearest it is found.
ELBOW_UP, ELBOW_OUT = (-0.3, -0.2, -1.0), (-1.0, -0.1, -0.6)
SHIELD = dict(carry=dict(c=(-0.36, 0.44, -0.58), face=(-0.80, 0.60, 0.10), pole=ELBOW_OUT),
              aside=dict(c=(-0.50, 0.36, -0.70), face=(-0.95, 0.30, 0.05), pole=ELBOW_OUT),
              up=dict(c=(-0.04, 0.34, -0.13), face=(-0.25, 1.0, 0.05), pole=ELBOW_UP),
              shove=dict(c=(0.0, 0.39, -0.04), face=(-0.25, 1.0, 0.20), pole=ELBOW_UP),
              whip=dict(c=(-0.13, 0.40, -0.19), face=(-0.85, 0.50, 0.05), pole=ELBOW_UP))
SHIELD_T = dict(up=0.22, down=0.26, bash=(0.0, 0.13, 0.28, 0.44, 0.54))
# on the move (anims.walk_cycle, made smooth): the fist and shield sway and dip in step, the tip less and later. Standing
# it's the same loop, smaller and slowed right down; holding the shield up, it's smaller still
WALK = dict(frames=55, sway=0.053, tip_sway=0.022, dip=0.018, lag=25.0, standing=0.4, holding=0.3)
# the thrust: drawn back low to the right, then a punch, the tip coming in to the X only as it lands and staying on its ray as the arm drives on
# (fist: right, ahead, up; chamber_tip: where the tip starts from, on the screen)
STAB = dict(draw=(0.42, 0.20, -0.42), chamber=(0.42, 0.16, -0.40), thrust=(0.32, 0.40, -0.30), hit=(0.26, 0.60, -0.30),
            end=(0.23, 0.70, -0.30), chamber_tip=(0.95, 0.30))


def tip_at(g, sx, sy):
    """The blade from a fist whose tip lies on the ray through this place on the screen."""
    fy = 1.6 * ZOOM
    ray = un(np.array([sx / fy, 1.0, sy / fy]))
    k = ray @ g
    return un(ray * (k + math.sqrt(max(k * k - g @ g + TIP * TIP, 1e-4))) - g)


_AX = np.linspace(0.0, 1.0, 1001)
_POW = np.geomspace(0.02, 60.0, 600)
_AREA = np.array([np.trapezoid(np.sin(_AX * np.pi / 2) ** (2 * a_), _AX) for a_ in _POW])


def hump(T, t0, tp, t1, left, right, build=1.0):
    """How far a thing has gone at each of the times T, on one smooth hump of speed: still at t0, fastest at tp, still again at t1;
    `left` by tp and `right` after it. `build`: how late the speed comes on the way up. The way down takes what shape it must."""
    v = left / ((tp - t0) * np.interp(build, _POW, _AREA))
    fall = float(np.interp(right / (v * (t1 - tp)), _AREA[::-1], _POW[::-1]))
    fine = np.linspace(t0, t1, 4001)
    x = np.where(fine <= tp, (fine - t0) / (tp - t0), (t1 - fine) / (t1 - tp))
    speed = v * np.sin(np.clip(x, 0, 1) * np.pi / 2) ** (2 * np.where(fine <= tp, build, fall))
    run = np.r_[0.0, np.cumsum((speed[1:] + speed[:-1]) / 2 * np.diff(fine))]
    k = fine <= tp
    at_top = run[k][-1]
    run[k] *= left / at_top
    run[~k] = left + (run[~k] - at_top) * right / max(run[-1] - at_top, 1e-9)
    return np.interp(T, fine, run)


def screen_at(x, y, ahead):
    """A place on the screen, x as wide as it really is, and how far ahead, in the eye's frame."""
    fy = 1.6 * ZOOM
    return np.array([x / fy * ahead, ahead, y / fy * ahead])


def lean_of(line):
    """How far the view goes with a cut at its fullest (radians, as the game's shake has them: turning left, up, the head to the right): the
    body's behind the blow. Only the world moves: the arms and the X stay put on the screen, so the tip still lands on it."""
    r = math.radians(line)
    return [round(LEAN[0] * math.cos(r), 4), round(-LEAN[1] * math.sin(r), 4), round(-LEAN[2] * math.cos(r), 4)]


def carried(d, a, b):
    """A direction, turned as much as a is from b: how a move that's still dying away carries what's begun on top of it."""
    k = np.cross(a, b)
    s_, c_ = np.linalg.norm(k), float(a @ b)
    if s_ < 1e-6:
        return d
    k = k / s_
    return d * c_ + np.cross(k, d) * s_ + k * (k @ d) * (1 - c_)


def un_rows(v):
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def drawn_path(name):
    """A cut as first-person Skyrim plays it: the sword drawn back off the screen, the fist right back by the shoulder and the elbow folded; then
    the elbow opens and drives the fist out through the X, the blade trailing on to its line and the tip on the X on a frame; and the arm runs
    on across and off the far side of the view, coming home from under it. The elbow's bend follows from how near the shoulder the fist is."""
    al = LINES[name]
    r_al = math.radians(al)
    f0 = np.array([0.0, 1.0, 0.0])
    u = np.array([math.cos(r_al), 0.0, math.sin(r_al)])
    n = np.cross(u, f0)
    F = DRAW[name]
    fy_ = 1.6 * ZOOM
    hit_, (r0_, r1_) = np.array(F["hit"], float), F["run"]
    # (past the hit the elbow goes on opening, till shoulder, arm and blade are one line toward where the tip's gone)
    r_e = math.atan(F["tip"][1] / fy_)
    out_ = SHO + ARM_OUT * un((math.cos(r_e) * f0 + math.sin(r_e) * u) * 1.6 - SHO)
    way = np.array([F["top"], hit_ + u * r0_ - f0 * 0.10, hit_, (hit_ + out_) / 2 + f0 * 0.03, out_])
    arc = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(way, axis=0), axis=1))]
    fist_on = CubicSpline(arc, way, bc_type="natural")
    t_rise, t_strike, t_through, t_home = TIMES[name]
    i_wind = int(round(t_rise * HZ))
    i_hit = i_wind + int(round(t_strike * HZ))
    i_end = i_hit + int(round(t_through * HZ))
    i_free = i_end - int(round(OVERLAP * HZ))
    N = i_end + int(round(t_home * HZ))
    T = np.arange(N + 1) / HZ
    TB, TH_, TE, TS = T[i_wind], T[i_hit], T[i_end], T[i_free]
    TF, TP = T[i_wind - HANG], T[i_hit - PEAK_LEAD]

    # the fist: its one hump, with the hit's waypoint under it on the hit's frame
    fine_ = np.linspace(0.0, float(arc[-1]), 4001)
    gone_ = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(fist_on(fine_), axis=0), axis=1))]      # (true metres along it, so its speed is its hump's)
    total, to_hit = float(gone_[-1]), float(np.interp(arc[2], fine_, gone_))
    lo, hi = 0.02 * to_hit, 0.999 * to_hit
    for _ in range(50):
        mid = (lo + hi) / 2
        if float(hump(np.array([TH_]), TF, TP, TE, mid, total - mid, FIST_BUILD)[0]) < to_hit:
            lo = mid
        else:
            hi = mid
    gone = hump(T, TF, TP, TE, (lo + hi) / 2, total - (lo + hi) / 2, FIST_BUILD)
    W_ = fist_on(np.interp(gone, gone_, fine_))

    def pose_at(i, c):
        """The fist on this frame, and the blade from it, with its tip at c on the line on the screen (half the screen's height is 1)."""
        r_ = math.atan(c / fy_)
        ray = math.cos(r_) * f0 + math.sin(r_) * u
        g_ = W_[i]
        k = ray @ g_
        s_ = k + math.sqrt(max(k * k - g_ @ g_ + TIP * TIP, 1e-6))
        return g_, un(ray * s_ - g_)

    # the tip on its line: from off the screen at the start of the strike, through the X at the hit, and on off the screen
    i_on = i_wind + max(int(round(TIP_ON * (i_hit - i_wind))), 2)
    c0, c1 = F["tip"]
    C = np.where(np.arange(N + 1) <= i_hit, c0 * (gone[i_hit] - gone) / (gone[i_hit] - gone[i_on]), c1 * (gone - gone[i_hit]) / (gone[i_end] - gone[i_hit]))
    C = np.clip(C, -7.0, 7.0)
    C = gaussian_filter1d(C, 1.2, mode="nearest")
    C = C - C[i_hit] * np.exp(-(((np.arange(N + 1) - i_hit) / 7.0) ** 2))
    theta_of = lambda d_: math.degrees(math.atan2(d_ @ u, d_ @ f0))
    d_top = un(np.array(F["back"], float))
    g_e, d_e = pose_at(N, C[N])
    top = way[0]
    via_up = (GUARD["g"] + top) / 2 + np.array(F.get("up_via", (0.0, 0.0, 0.0)))
    pg = CubicSpline([0, 0.5, 1], [GUARD["g"], via_up, top], bc_type="natural")      # (eased once, by its bell)
    home = [d_e, BACK_LOW["d"], GUARD["d"]]
    via = np.array(F.get("home_via", (0.34, 0.36, -0.62)))     # (under the view: it comes home from below the screen)
    rg = CubicSpline([0, 0.5, 1], [g_e, via, GUARD["g"]], bc_type="natural")      # (eased once, by its bell)
    G, D, W, V, TT, LEAD, COCKS, FIN = [], [], [], [], [], [], [], []
    gone_w, gone_h, gone_e = gone[i_wind], gone[i_hit], gone[i_end]
    for i, t in enumerate(T):
        lead, cock, fin = 1.0, COCK["wind"], 0.0
        if i <= i_wind:
            x = float(bell(np.array(t / TB), *RISE_BELL))
            xf = float(bell(np.array(min(t / TF, 1.0)), *RISE_BELL))
            g = pg(xf) if t < TF else W_[i]
            d, w = un(slerp(GUARD["d"], d_top, x)), x ** 2
            tt = theta_of(d)
            lead = xf
        else:
            g, d = pose_at(i, C[i])
            if i < i_on:      # (it comes off where it was drawn back to and onto its line with the fist already on its way)
                q_ = (i - i_wind) / (i_on - i_wind)
                d = un(slerp(d_top, d, q_ * q_ * (3 - 2 * q_)))
            tt = theta_of(d)
            w = 1.0
            to_hit = float(np.clip((gone[i] - gone_w) / (gone_h - gone_w), 0, 1))
            cock = COCK["wind"] + (COCK["hit"] - COCK["wind"]) * to_hit * to_hit * (3 - 2 * to_hit)
            lead = 1.0 - (1.0 - LEAD_HIT) * to_hit * to_hit * (3 - 2 * to_hit)
            if i > i_hit:
                past = float(np.clip((gone[i] - gone_h) / max(gone_e - gone_h, 1e-6), 0, 1))
                cock = COCK["hit"] + (COCK["end"] - COCK["hit"]) * past
                fin = min(past * 3, 1.0)
                lead = LEAD_HIT + (LEAD_END - LEAD_HIT) * min(past / 0.6, 1.0)
            if i > i_free:         # (the way back, on top of the last of the sweep)
                q = (t - TS) / (T[-1] - TS)
                x, xd = float(bell(np.array(q), *HOME_FIST)), float(bell(np.array(q), *HOME_BLADE))
                lead += (1 - lead) * x
                lead *= 1 - x ** 6
                fin *= 1 - x
                cock += (COCK["wind"] - cock) * x
                w *= 1 - x
                g = rg(x) + g - g_e
                d = carried(along(home, xd), d_e, d)
        r = math.radians(tt)
        v = math.sin(r) * f0 - math.cos(r) * u      # (the way the blade's going)
        v = un(v - d * (v @ d)) if i <= i_end else np.zeros(3)
        G.append(g)
        D.append(d)
        W.append(w)
        V.append(v)
        TT.append(tt)
        LEAD.append(lead)
        COCKS.append(cock)
        FIN.append(fin)
    D = np.array(D)
    soft = gaussian_filter1d(D, 2.0, axis=0, mode="nearest")
    keep = np.maximum(np.exp(-(((np.arange(N + 1) - i_hit) / 4.0) ** 2)), np.maximum(1 - np.arange(N + 1) / 5.0, (np.arange(N + 1) - N + 5) / 5.0).clip(0, 1))[:, None]
    D = un_rows(soft * (1 - keep) + D * keep)
    return dict(name=name, T=T, G=np.array(G), D=D, edge_w=np.array(W), travel=np.array(V), normal=n,
                hit=i_hit, wind=i_wind, on=i_on, end=i_end, free=i_free,
                theta=np.array(TT), line=al, start=GUARD, stop=GUARD, lead=np.array(LEAD), cock=np.array(COCKS), finish=np.array(FIN))


def stab_path(name, start, times=(0.20, 0.16, 0.36)):
    """The thrust: drawn back low to the right, then a punch down to the X, the tip arriving as the arm's fastest; it stays on the X's ray as the arm drives on."""
    TA, TB, TC = times
    draw, chamber, thrust, hit, end = (np.array(STAB[k]) for k in ("draw", "chamber", "thrust", "hit", "end"))
    cx, cy = STAB["chamber_tip"]
    d_ch = tip_at(chamber, cx, cy)
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
    g_e, d_e = fg(1.0), tip_at(fg(1.0), 0.0, 0.0)
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
            q_ = min(x / 0.72, 1.0)
            k_ = 1 - q_ * q_ * (3 - 2 * q_)
            d = tip_at(g, cx * k_, cy * k_)
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
    fl_ = FLAT.get(path["name"], 0.0)
    leads = path.get("lead", np.zeros(N))
    cocks = path.get("cock", np.full(N, COCK["wind"]))
    finishes = path.get("finish", np.zeros(N))
    how = FINISH.get(path["name"], {})
    for i in range(N):
        Rs = sword_frames(np.broadcast_to(D[i], (ROLLS, 3)), np.broadcast_to(X[i], (ROLLS, 3)), grid)
        R_h, W = arm.hand(Rs, np.broadcast_to(G[i], (ROLLS, 3)), np.zeros(ROLLS))
        Sh, E, bend, _, _, more = arm_on_hand(arm, R_h, W, leads[i], cocks[i], None, finishes[i], how)
        twists[i] = more[0]
        c = (bend / 90) ** 2 + (np.linalg.norm(Sh - arm.S0, axis=-1) / SHOULDER_EASE) ** 2 + (elbow_astray(arm, E, W) / 0.04) ** 2
        high, near = elbow_on_screen(E, W, how)
        c = c + finishes[i] * (high / 0.2) ** 2 + (near / 0.06) ** 2
        if finishes[i] > 0:       # (past the hit: the fist on the forearm's line, the blade's flat to the eye)
            to_eye = un(-(G[i] + D[i] * TIP * 0.5))
            flat = np.degrees(np.arcsin(np.clip(np.abs(Rs[:, :, 0] @ to_eye), 0, 1)))
            c = c + finishes[i] * ((hook_on_screen(E, W, G[i]) / HOOK_EASE) ** 2 + 2 * (np.maximum(0, 22 - flat) / 12) ** 2)
            c = c + finishes[i] * how.get("in_line", 0.0) * (fold_on_screen(E, W, G[i] + D[i] * TIP) / FOLD_EASE) ** 2
        q = G[i] + Rs[:, :, 1] * POMMEL - W
        e = (E - W) / np.linalg.norm(E - W, axis=-1, keepdims=True)
        clear = np.degrees(np.arccos(np.clip((q * e).sum(-1) / np.linalg.norm(q, axis=-1), -1, 1)))
        c = c + 4 * (np.maximum(0, POMMEL_CLEAR - clear) / 25) ** 2
        w, v = path["edge_w"][i], path["travel"][i]
        if path["hit"] is not None:      # (the flat shows, always: edge-on it's a wire against the sky)
            to_eye = un(-(G[i] + D[i] * TIP * 0.5))
            flat = np.degrees(np.arcsin(np.clip(np.abs(Rs[:, :, 0] @ to_eye), 0, 1)))
            c = c + 2.5 * (np.maximum(0, 25 - flat) / 15) ** 2 + 6 * (np.maximum(0, 14 - flat) / 8) ** 2
        if w > 0 and np.linalg.norm(v) > 0:
            fl = math.radians(fl_ + (math.copysign(FLAT_PAST.get(path["name"], 45.0), fl_) - fl_) * finishes[i])       # (once it's through the X it can open up and show its width)
            target = math.cos(fl) * v + math.sin(fl) * un(np.cross(D[i], v))
            err = np.degrees(np.arccos(np.clip(-(Rs[:, :, 2] @ target), -1, 1)))      # (the knuckle edge is the sword's -z: never the back of the blade)
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


def _shoulder_fits(arm, S_, how={}):
    """Is this somewhere a shoulder could get to with the torso turning, and is its cut end off the screen?"""
    d = (S_ - arm.S0) / np.array(how.get("room", SHOULDER_ROOM))
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


def elbow_on_screen(E, W, how={}):
    """After the hit: how far an elbow is from falling well under the hand on the screen (a forearm laid flat across the
    bottom of the view, the fist hooked off its end, reads as a broken wrist), and how near it's come to the eye."""
    fy = 1.6 * ZOOM
    height = lambda P_: fy * P_[..., 2] / np.maximum(P_[..., 1], 0.05)
    return np.maximum(0.0, height(E) - height(W) + how.get("drop", ELBOW_DROP)), np.maximum(0.0, ELBOW_NEAR - np.linalg.norm(E, axis=-1))


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


def best_cock(arm, R_h, W, most, finish=0.0, how={}):
    """How far to cock the wrist for this hand: whatever asks least of the shoulder and leaves the elbow hanging naturally,
    within `most` (degrees), and straighter if it's all the same to the arm."""
    ways = forearm_way(arm, R_h, RADIALS)      # (.., K, 3)
    E = W[..., None, :] - ways * arm.F
    S_ = _shoulder_for(arm, E, arm.S0)
    c = (np.linalg.norm(S_ - arm.S0, axis=-1) / 0.12) ** 2 + (RADIALS / 70.0) ** 2 + (elbow_astray(arm, E, W[..., None, :]) / 0.03) ** 2
    c = c + 40.0 * ~_shoulder_fits(arm, S_, how) + 400.0 * (RADIALS > np.asarray(most)[..., None])
    high, near = elbow_on_screen(E, W[..., None, :], how)
    c = c + np.asarray(finish)[..., None] * (high / 0.2) ** 2 + (near / 0.06) ** 2
    return RADIALS[np.argmin(c, axis=-1)]


def _arm_at(arm, R_h, W, Sh, E0, k, cock, keep=None):
    """The arm with its lead at k and its wrist cocked by `cock`, as a real arm goes: the forearm's way, the upper arm from that elbow
    heading for where the shoulder wants to be, and the forearm's roll on the hand's own hinge, turned by at most TWIST_MAX: a forearm
    can only roll so far, and past that the elbow's skin takes up what the hinge can't, off in the corner of the view.
    `keep`: the twist to use, already smoothed, in place of working it out. Gives the shoulder, elbow, wrist's bend, and (the twist,
    the hinge, the forearm's way, the upper arm's way)."""
    natural = (R_h @ arm.fh[..., None])[..., 0]
    wanted = forearm_way(arm, R_h, np.asarray(cock)[..., None])[..., 0, :]
    f = _unit((W - E0) / arm.F * (1 - k) + wanted * k)
    E = W - f * arm.F
    rest = (R_h @ np.swapaxes(arm.Q0, -1, -2))[..., 0]
    rest = _unit(rest - f * (rest * f).sum(-1, keepdims=True))
    ud = _unit(E - ((arm.S0 + UPPER_ANCHOR) * k + Sh * (1 - k)))
    if keep is None:
        n = _unit(np.cross(ud - f * (ud * f).sum(-1, keepdims=True), f))
        tau = np.degrees(np.arctan2((np.cross(rest, n) * f).sum(-1), (rest * n).sum(-1)))
    else:
        tau = keep
    tau = np.clip(tau, -TWIST_MAX, TWIST_MAX)
    n = _turned(rest, f, tau)
    bend = np.degrees(np.arccos(np.clip((f * natural).sum(-1), -1, 1)))
    return E - ud * arm.U, E, bend, (tau, n, f, ud)


def arm_on_hand(arm, R_h, W, lead, most, pole=None, finish=0.0, how={}):
    """Shoulder, elbow, the wrist's bend, how far the arm leads and how far the wrist is cocked, for a hand. `lead`, from 0 to
    1: how far the arm should carry the swing. At 0 the arm reaches for the wrist as it can and the wrist takes up the rest;
    at 1 the wrist only cocks in the blade's plane, by at most `most`, and the elbow and shoulder go where that puts them.
    It leads as far as a shoulder can get to (SHOULDER_ROOM), and the wrist gives the little that's left."""
    Sh, _ = arm.reach(W)
    E0, _ = arm.elbow(Sh, W, pole)
    lead = np.broadcast_to(np.asarray(lead, float), W.shape[:-1])
    cock = best_cock(arm, R_h, W, most, finish, how)
    k = np.zeros_like(lead)
    for a in (1.0, 0.8, 0.6, 0.4, 0.2):      # (from the most it could lead, down)
        try_k = lead * a
        S_, E_, _, _ = _arm_at(arm, R_h, W, Sh, E0, try_k[..., None], cock)
        k = np.where((k == 0) & _shoulder_fits(arm, S_, how) & (elbow_astray(arm, E_, W) < ELBOW_ASTRAY), try_k, k)
    S_, E, bend, more = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock)
    return S_, E, bend, k, cock, more


def lead_arm(arm, Rs, r, lead, most=None, finish=None, how={}):
    """The sword arm, carrying the swing: frame by frame, on the hand that holds the sword. Its lead, the wrist's cock, the
    forearm's twist and the elbow's bend all ease from frame to frame, so nothing in the arm can jump."""
    if most is None:
        most = np.full(len(r), COCK["wind"])
    R_h, W = arm.hand(Rs, r, np.zeros(len(r)))
    Sh, _ = arm.reach(W)
    _, p = arm.elbow(Sh, W)
    p_ = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
    u_ = np.arange(len(r)) / (len(r) - 1)
    p = p_ + (p[0] - p_[0]) * (np.clip(1 - u_ * 8, 0, 1) ** 2)[:, None] + (p[-1] - p_[-1]) * (np.clip(1 - (1 - u_) * 8, 0, 1) ** 2)[:, None]      # (still the guard's on its first and last frames)
    _, _, _, k, cock, _ = arm_on_hand(arm, R_h, W, lead, most, p, 0.0 if finish is None else finish, how)
    k = np.minimum(gaussian_filter1d(k, 3.0, mode="nearest"), lead)       # (no quicker than the arm could turn)
    cock = gaussian_filter1d(cock, 3.0, mode="nearest")
    Sh, _ = arm.reach(W)
    E0, _ = arm.elbow(Sh, W, p)
    _, _, _, (tau, _, _, _) = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock)
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

    limited = np.clip(wound, -TWIST_MAX, TWIST_MAX)
    quick = no_quicker(limited, TWIST_RATE)
    quick = quick + (limited[0] - quick[0]) * np.clip(1 - u * 6, 0, 1) ** 2 + (limited[-1] - quick[-1]) * np.clip(1 - (1 - u) * 6, 0, 1) ** 2
    S_, E, bend, (tau, n, f, ud) = _arm_at(arm, R_h, W, Sh, E0, k[..., None], cock, eased(quick))

    def about(y):
        x = _unit(n - y * (n * y).sum(-1, keepdims=True))
        return np.stack([x, y, np.cross(x, y)], -1)
    Rf = about(f)
    c_ = (f * ud).sum(-1, keepdims=True)
    ax = np.cross(f, ud)
    xu = Rf[..., 0] * c_ + np.cross(ax, Rf[..., 0]) + ax * (ax * Rf[..., 0]).sum(-1, keepdims=True) / (1 + c_)
    Ru = np.stack([xu, ud, np.cross(xu, ud)], -1)
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


def straight_arm(arm, c, roll, poles):
    """The shield arm, frame by frame, with the wrist locked straight: for the grip's place, the forearm's roll (degrees) and where the elbow goes."""
    W = np.array(c, float)
    for i in range(7):
        Sh, _ = arm.reach(W)
        _, p = arm.elbow(Sh, W, poles)
        if i == 6 and len(W) > 1:
            p = gaussian_filter1d(p, 2.0, axis=0, mode="nearest")
        E, _ = arm.elbow(Sh, W, p)
        Ru, Rf = frame_of_arm(Sh, E, W, arm.U, arm.F)
        R_h = Rf @ S.rot_about((0, 1, 0), roll) @ arm.Q0
        Rs = R_h @ arm.rel.T
        if i < 6:
            W = c + (Rs @ arm.off[..., None])[..., 0]
    return dict(S=Sh, E=E, W=W, Ru=Ru, Rf=Rf, Rh=R_h, twist=np.asarray(roll, float), bend=np.zeros(len(W)), shield=Rs)


def shield_roll(arm, c, face, pole):
    """The forearm's roll that points the shield nearest `face`."""
    c, want, pole = np.array(c, float), un(np.array(face, float)), np.array(pole, float)
    best, out = -2.0, 0.0
    for r in np.arange(-180.0, 180.0, 2.0):
        Rs = straight_arm(arm, c[None], np.array([r]), pole[None])["shield"][0]
        k = float(-Rs[:, 2] @ want)
        if k > best:
            best, out = k, float(r)
    return out


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


def nearest_rolls(keys):
    """The keys' rolls run on from each other, the short way round."""
    out = [keys[0][1]]
    for k in keys[1:]:
        out.append(out[-1] + wrap180(k[1] - out[-1]))
    return np.array(out)


def blend_shield(keys, weights):
    """Grip, roll and elbow through a list of (grip, roll, pole) keys, by a [frames] float position along them."""
    cs, ls, rs = np.array([k[0] for k in keys]), np.array([k[2] for k in keys]), nearest_rolls(keys)
    ps, pp, tw = [], [], []
    for x in weights:
        i = min(int(x), len(keys) - 2)
        u = float(x - i)
        ps.append((1 - u) * cs[i] + u * cs[i + 1])
        pp.append((1 - u) * ls[i] + u * ls[i + 1])
        tw.append((1 - u) * rs[i] + u * rs[i + 1])
    return np.array(ps), np.array(tw), np.array(pp)


def shield_spline(keys, times, T):
    """Grip, roll and elbow for each time in T, smooth through the keys at their times, at rest at both ends."""
    cs, ls, rs = np.array([k[0] for k in keys]), np.array([k[2] for k in keys]), nearest_rolls(keys)
    spline = lambda v: CubicSpline(times, v, bc_type="clamped")(T)
    return spline(cs), spline(rs), spline(ls)


def build_clips(info, B):
    """All the clips: {name: (path, sol)}, sol holding each arm's joints frame by frame."""
    armR = S.Arm("R", info, B, held="sword", sho=SHO, lift=0.5, ahead=1.2, knee=0.96)
    armL = S.Arm("L", info, B, held="shield", sho=SHO, lift=0.5)
    SK = {k: (np.array(v["c"], float), shield_roll(armL, v["c"], v["face"], v["pole"]), np.array(v["pole"], float)) for k, v in SHIELD.items()}
    carry, aside, up, shove, whip = SK["carry"], SK["aside"], SK["up"], SK["shove"], SK["whip"]
    clips = {}

    def clip(cname, path, shield_keys, weights, off=0.0):
        Rs = solve_sword(path, armR)
        sol = dict(T=path["T"], sword_R=Rs, sword_p=path["G"], R=lead_arm(armR, Rs, path["G"], path.get("lead", np.zeros(len(path["T"]))), path.get("cock"), path.get("finish"), FINISH.get(path["name"], {})))
        pL, rolls, poles = shield_keys if isinstance(shield_keys, tuple) else blend_shield(shield_keys, weights)
        sol["L"] = straight_arm(armL, pL + off, rolls, poles)
        clips[cname] = (path, sol)

    for name in ORDER + ("stab",):
        path = stab_path("stab", GUARD) if name == "stab" else drawn_path(name)
        T = path["T"]
        t_in, t_stay = T[path["hit"]] * 0.9, T[path["end"]]
        w = bell(np.minimum(T / t_in, 1.0), 2.0, 2.2) * (1 - bell(np.clip((T - t_stay) / (T[-1] - t_stay), 0, 1), 2.0, 2.2))
        clip(f"blade_{name}", path, [carry, aside], w)
    # the carry, standing and on the move
    for cname, amount in (("guard_idle", WALK["standing"]), ("guard_walk", 1.0)):
        p, off = carry_path("idle", GUARD, amount)
        clip(cname, p, [carry, carry], np.zeros(len(p["T"])), off)
    # the shield up: one quick raise
    p = move_path("up", GUARD, BACK, SHIELD_T["up"])
    clip("shield_up", p, [carry, up], bell(p["T"] / p["T"][-1], 2.0, 2.0))
    # the bash, from the block and back to it
    p = move_path("bash", BACK, BACK, SHIELD_T["bash"][-1])
    clip("shield_bash", p, shield_spline([up, shove, whip, up, up], SHIELD_T["bash"], p["T"]), None)
    p, off = carry_path("hold", BACK, WALK["holding"])
    clip("shield_hold", p, [up, up], np.zeros(len(p["T"])), off)
    p = move_path("down", BACK, GUARD, SHIELD_T["down"])
    clip("shield_down", p, [up, carry], bell(p["T"] / p["T"][-1], 2.0, 2.0))
    # the thrust over the rim: the shield stays up
    p = stab_path("stab", BACK, times=(0.20, 0.16, 0.38))
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
