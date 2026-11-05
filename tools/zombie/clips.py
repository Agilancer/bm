"""The zombie's authored clips: four walks, four runs, four attacks. Run inside Blender.

Each clip is a set of curves over frames: feet as plants on the moving floor, the trunk as keyed
angles, arms as hand offsets from the shoulder. Lags and springs carry weight up the body, so the
head and hands arrive after the hips. Loops close exactly on frame n.

The player meets these at close range from an eye height of 1.62 m, so attacks land in view.
"""
import math

import numpy as np
from mathutils import Vector

from body import FPS, Body, Plant, curve, euler, floor_at, foot_track, spring, vcurve, wave, write_action

TAU = 2 * math.pi
LIMP = (28, 34, 22)  # slack curl of the knuckle, middle and end joints
CLAW = (12, 44, 40)
HOOK = (34, 62, 52)
FIST = (64, 86, 62)
SPLAY = (4, 16, 20)
# How far the zombie's root stands from the player when the blow lands, in metres. Any closer and the
# player's camera is inside its arms, looking at the crown of its head.
REACH = {"attack_rake": 1.2, "attack_flurry": 1.2, "attack_bite": .95, "attack_pounce": 1.55, "crawl_attack": 1.05}


class Clip:
    def __init__(self, n, loop, speed=0.0, root=None, about=""):
        self.n, self.loop, self.speed, self.root, self.about = n, loop, speed, root, about
        self.floor = floor_at(speed)
        self.pelvis = np.zeros((n + 1, 3))  # offset from rest
        self.pelvis_rot = np.zeros((n + 1, 3))  # pitch, roll, yaw
        self.spine = np.zeros((3, n + 1, 3))
        self.neck = np.zeros((n + 1, 3))
        self.head = np.zeros((n + 1, 3))
        self.feet = {}
        self.poles = {}
        self.hands = {}

    def track(self, s, plants):
        self.feet[s] = foot_track(self.n, plants, self.floor, self.loop)

    def peel(self, s, keys):
        """Raise the heel of a planted foot, so the back leg can drive."""
        lift = curve(self.n, keys, self.loop)
        for t, phi in zip(self.feet[s], lift):
            if t["stance"]:
                t["phi"] = max(t["phi"], phi)

    def chest(self, pitch, roll, yaw, shares=(.3, .35, .35)):
        for i, w in enumerate(shares):
            self.spine[i, :, 0] = np.asarray(pitch) * w
            self.spine[i, :, 1] = np.asarray(roll) * w
            self.spine[i, :, 2] = np.asarray(yaw) * w

    def hand(self, s, off, pole, flex=None, dev=None, twist=None, curl=None, thumb=None, shrug=1.0):
        n = self.n
        arr = lambda v, d: np.full(n + 1, d, dtype=float) if v is None else np.asarray(v, dtype=float)
        rows = lambda v: None if v is None else (np.tile(v, (n + 1, 1)) if np.ndim(v) == 1 else np.asarray(v))
        self.hands[s] = dict(off=np.asarray(off), pole=rows(pole), flex=arr(flex, 0), dev=arr(dev, 0), twist=arr(twist, 0),
                             curl=rows(LIMP if curl is None else curl), thumb=rows(thumb), shrug=shrug)


def mirror(c):
    """Swap the clip's sides, so a wound can sit on either leg."""
    across = np.array((-1, 1, 1))
    turn = np.array((1, -1, -1))
    c.pelvis = c.pelvis * across
    c.pelvis_rot, c.spine, c.neck, c.head = c.pelvis_rot * turn, c.spine * turn, c.neck * turn, c.head * turn
    c.feet = {o: [dict(t, x=-t["x"], yaw=-t["yaw"]) for t in c.feet[s]] for s, o in (("l", "r"), ("r", "l"))}
    c.poles = {("r" if s == "l" else "l"): p * across for s, p in c.poles.items()}
    c.hands = {("r" if s == "l" else "l"): dict(h, off=h["off"] * across, pole=h["pole"] * across) for s, h in c.hands.items()}
    return c


def trunk_at(body, c, f):
    body.begin()
    spine = [euler(*c.spine[i, f]) for i in range(3)]
    body.trunk(c.pelvis[f], euler(*c.pelvis_rot[f]), spine, euler(*c.neck[f]), euler(*c.head[f]))


def shoulder_at(body, s):
    body.put(f"clavicle_{s}", body.D["spine_03"])
    body.put(f"upperarm_{s}", body.D["spine_03"])
    return body.H[f"upperarm_{s}"]


def shoulder_path(body, c, s):
    out = np.zeros((c.n + 1, 3))
    for f in range(c.n + 1):
        trunk_at(body, c, f)
        out[f] = shoulder_at(body, s)
    return out


def pin_to_chest(body, c, s, local):
    """Hand offsets that hold the wrist at a spot on the chest, wherever the trunk throws it."""
    out = np.zeros((c.n + 1, 3))
    for f in range(c.n + 1):
        trunk_at(body, c, f)
        spot = body.H["spine_03"] + body.D["spine_03"] @ Vector(local)
        out[f] = spot - shoulder_at(body, s)
    return out


def trail(sig, frames, loop=True):
    """The signal, `frames` late."""
    n = len(sig) - 1
    at = np.arange(n + 1) - frames
    if loop:
        return np.interp(at % n, np.arange(n + 1), sig)
    return np.interp(at, np.arange(n + 1), sig)


def limp_arm(body, c, s, rest=(0, .12), flex=18, swing=None, gain=1.0, damp=2.6, length=.42, elbow_gain=1.0, lag=3, elbow_min=7):
    """A hanging arm as a damped pendulum, driven by how its shoulder is thrown about.

    rest is the hang angle forward and outward in radians, and swing an extra angle to pull towards.
    The forearm trails the upper arm by `lag` frames, so the elbow opens and closes on every swing,
    from `flex` degrees at rest. Returns hand offsets, the elbow pole and the wrist's flex.
    """
    n, sign = c.n, 1 if s == "l" else -1
    arm = body.arms[s]
    path = shoulder_path(body, c, s)
    if c.loop:
        acc = (np.roll(path[:-1], -1, 0) - 2 * path[:-1] + np.roll(path[:-1], 1, 0)) * FPS * FPS
        acc = np.vstack([acc, acc[:1]])
    else:
        acc = np.gradient(np.gradient(path, axis=0), axis=0) * FPS * FPS
    swing = np.zeros(n + 1) if swing is None else np.asarray(swing)
    th, xi, vt, vx = rest[0], rest[1], 0.0, 0.0
    g, dt, sub = 9.8 / length, 1 / (FPS * 8), 8
    angles = np.zeros((n + 1, 2))
    for lap in range(6 if c.loop else 1):
        for f in range(n if c.loop else n + 1):
            for k in range(sub):
                vt += (-g * math.sin(th - rest[0] - swing[f]) - damp * vt + acc[f, 1] * gain / length * math.cos(th)) * dt
                vx += (-g * math.sin(xi - rest[1]) - damp * vx - acc[f, 0] * gain * sign / length * math.cos(xi)) * dt
                th += vt * dt
                xi = max(xi + vx * dt, .03)
            angles[f] = th, xi
    if c.loop:
        angles[n] = angles[0]
    th_arr, xi_arr = angles[:, 0], angles[:, 1]
    elbow = math.radians(flex) + elbow_gain * (trail(th_arr, lag, c.loop) - th_arr)
    elbow = np.clip(elbow, math.radians(elbow_min), math.radians(85))
    fore = th_arr + elbow
    off = np.zeros((n + 1, 3))
    off[:, 0] = sign * np.sin(xi_arr) * (arm["l1"] + arm["l2"])
    off[:, 1] = -(np.sin(th_arr) * arm["l1"] + np.sin(fore) * arm["l2"]) * np.cos(xi_arr)
    off[:, 2] = -(np.cos(th_arr) * arm["l1"] + np.cos(fore) * arm["l2"]) * np.cos(xi_arr)
    wrist = 14 + np.clip(np.gradient(th_arr) * 95, -14, 22)
    return off, (sign * .35, 1, -.05), wrist


def smoothed(off, hz, damp, loop=True):
    return np.stack([spring(off[:, i], hz, damp, loop) for i in range(3)], 1)


def solve(body, c):
    """Run every frame through the IK."""
    body.swivel = {}
    for lap in range(2 if c.loop else 1):  # a loop's second lap starts with the elbows as the first ended
        body.clamps = 0
        poses = []
        for f in range(c.n + 1):
            trunk_at(body, c, f)
            for s in "lr":
                pole = c.poles.get(s)
                body.foot(s, c.feet[s][f], None if pole is None else Vector(pole[f]))
                h = c.hands[s]
                body.arm_to(s, h["off"][f], h["pole"][f], h["flex"][f], h["dev"][f], h["twist"][f], h["curl"][f],
                            None if h["thumb"] is None else h["thumb"][f], h["shrug"])
            poses.append(body.output())
    if c.loop:
        poses[-1] = poses[0]
    return poses, body.clamps


# ----- Walks ------------------------------------------------------------------------------------

def walk_shamble(body):
    """Head-heavy trudge: scuffing, swaying side to side, both arms dead weight."""
    n, v = 56, .46
    c = Clip(n, True, v, about="Head-heavy trudge, scuffs its toes, arms hanging dead")
    d, travel = 28, v * 36 / FPS
    c.track("l", [Plant(0, 36, -travel / 2 - .02, .115, 10, hs=-6, to=16, height=.028, peak=.55, flat=.14, heel=.62)])
    c.track("r", [Plant(d, d + 36, -travel / 2 + .02, -.125, -14, hs=-5, to=14, height=.022, peak=.55, flat=.14, heel=.62)])
    c.pelvis[:, 2] = curve(n, [(3, -.083), (14, -.052), (31, -.088), (42, -.056)], True)
    c.pelvis[:, 0] = curve(n, [(10, .055), (38, -.06)], True)
    c.pelvis[:, 1] = .03
    c.pelvis_rot[:, 0] = 7 + wave(n, 2, .1, 1.2)
    c.pelvis_rot[:, 1] = curve(n, [(10, -4), (38, 4.5)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -5), (28, 5)], True)
    roll = spring(curve(n, [(14, 7), (42, -8)], True) + 3, 2.2, .5)
    yaw = -c.pelvis_rot[:, 2] * 1.4
    pitch = 30 + spring(curve(n, [(4, 3), (16, -2), (32, 4), (44, -2)], True), 2.6, .4)
    c.chest(pitch, roll, yaw)
    c.neck[:, 0] = -15 + spring(curve(n, [(6, 5), (20, -2), (34, 6), (48, -2)], True), 2.4, .35)
    c.neck[:, 1] = -7 + 5 * wave(n, 1, .2)
    c.head[:, 0] = -6 + 2.5 * wave(n, 2, .4)
    c.head[:, 1] = -9 - 7 * wave(n, 1, .3)
    c.head[:, 2] = 9 * wave(n, 1, .05)
    for s, rest, flex, ph, gain in (("l", (.14, .15), 20, .5, 1.1), ("r", (.04, .11), 15, 0, 1.25)):
        off, pole, wrist = limp_arm(body, c, s, rest, flex, wave(n, 1, ph, .13), gain, elbow_gain=1.6)
        c.hand(s, off, pole, wrist + 12, curl=(32, 38, 26) if s == "l" else (24, 28, 18))
    return c


def walk_drag(body):
    """Right leg is ruined and locked: it vaults over it, then the left hauls and the right toe scrapes after."""
    n, v = 76, .36
    c = Clip(n, True, v, about="Ruined right leg, locked and turned out: hauls with the left, the toe scrapes after it")
    c.track("l", [Plant(0, 54, -.36, .105, 10, hs=-14, to=30, height=.055, peak=.5, flat=.14, heel=.68)])
    c.track("r", [Plant(52, 80, -.11, -.165, -32, hs=-2, to=14, height=0, flat=.12, heel=.5, drag=True, swing_end=.2)])
    c.pelvis[:, 2] = curve(n, [(4, -.07), (26, -.025), (48, -.055), (58, -.03), (68, -.035)], True)
    c.pelvis[:, 0] = curve(n, [(4, .03), (26, .085), (46, .05), (62, -.095)], True)
    c.pelvis[:, 1] = curve(n, [(0, .04), (34, .0), (62, .05)], True)
    c.pelvis_rot[:, 0] = curve(n, [(4, 9), (30, 5), (58, 13)], True)
    c.pelvis_rot[:, 1] = curve(n, [(4, -2), (26, 6), (48, -5), (62, 7)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -12), (30, 2), (58, 10)], True)
    pitch = spring(curve(n, [(4, 28), (28, 22), (52, 26), (62, 37)], True), 2.4, .45)
    roll = spring(curve(n, [(4, 2), (26, 13), (50, 8), (64, -20)], True), 2.0, .45)
    yaw = spring(curve(n, [(0, 14), (30, -4), (58, -12)], True), 2.2, .5)
    c.chest(pitch, roll, yaw)
    c.neck[:, 0] = -15 - spring(curve(n, [(10, -4), (56, 2), (66, -8)], True), 2.5, .35)
    c.neck[:, 1] = spring(curve(n, [(26, -8), (62, 9)], True), 2.2, .35)
    c.head[:, 0] = -8 + 2 * wave(n, 2, .1)
    c.head[:, 1] = spring(curve(n, [(26, -5), (64, 11)], True), 2.0, .3) + 2
    c.head[:, 2] = curve(n, [(0, -8), (30, 4), (60, 10)], True)
    off, pole, wrist = limp_arm(body, c, "r", (.0, .1), 16, wave(n, 1, .1, .1), 1.3, 2.2, elbow_gain=1.6)
    c.hand("r", off, pole, wrist + 10, curl=(20, 24, 16))
    # The left hand paws at its thigh as the bad leg takes weight: it stays below the hip.
    lhand = vcurve(n, [(0, (.2, -.22, -.38)), (26, (.2, -.28, -.34)), (54, (.17, -.2, -.4)), (64, (.27, -.26, -.36))], True)
    c.hand("l", smoothed(lhand, 2.4, .45), (.8, .3, -.5), curve(n, [(0, 16), (64, 28)], True), curl=vcurve(n, [(10, CLAW), (40, LIMP), (64, CLAW)], True))
    return c


def walk_reach(body):
    """The hungry walk: both arms up and grasping at different heights, legs locked, chin thrust out."""
    n, v = 46, .62
    c = Clip(n, True, v, about="Hungry: arms up and grasping unevenly, legs locked straight, chin thrust out")
    d, travel = 23, v * 29 / FPS
    stiff = dict(hs=-8, to=12, height=.02, peak=.48, flat=.16, heel=.7)
    c.track("l", [Plant(0, 29, -travel / 2 - .02, .1, 7, **stiff)])
    c.track("r", [Plant(d, d + 29, -travel / 2 - .02, -.1, -7, **stiff)])
    c.pelvis[:, 2] = curve(n, [(3, -.04), (13, -.005), (26, -.04), (36, -.005)], True)
    c.pelvis[:, 0] = curve(n, [(8, .04), (31, -.04)], True)
    c.pelvis[:, 1] = .015
    c.pelvis_rot[:, 0] = 7
    c.pelvis_rot[:, 1] = curve(n, [(8, -4), (31, 4)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -7), (23, 7)], True)
    c.chest(24 + spring(curve(n, [(4, 2), (14, -1), (27, 2), (37, -1)], True), 3, .4), spring(curve(n, [(10, 4), (33, -4)], True), 2.4, .5), spring(-c.pelvis_rot[:, 2] * 1.1, 3, .5))
    c.neck[:, 0] = 6 + spring(curve(n, [(5, 2), (15, -1), (28, 2), (38, -1)], True), 2.6, .35)
    c.head[:, 0] = -28 + 1.5 * wave(n, 2, .3)
    c.head[:, 1] = 6 + 4 * wave(n, 1, .1)
    c.head[:, 2] = 5 * wave(n, 1, .35)
    lift = spring(curve(n, [(3, -.025), (13, .015), (26, -.025), (36, .015)], True), 2.6, .35)
    # Shoulder-wide and uneven: the left hand hangs 20 cm below the right.
    for s, sign, y, z, ph, grasps in (("l", 1, -.445, -.2, 0, 2), ("r", -1, -.485, .02, .4, 1)):
        off = np.zeros((n + 1, 3))
        off[:, 0] = sign * .02 + .012 * wave(n, 1, ph)
        off[:, 1] = y + .01 * wave(n, 1, ph + .25)
        off[:, 2] = z + lift + .012 * wave(n, 2, ph)
        grasp = .5 + .5 * wave(n, grasps, ph)
        curl = np.outer(1 - grasp, SPLAY) + np.outer(grasp, HOOK)
        c.hand(s, off, (sign * .8, .1, -.6), 18 + 8 * wave(n, 2, ph + .1), curl=curl, thumb=(10, 28, 26))
    return c


def walk_stagger(body):
    """Keeps nearly falling: four uneven steps, one crossing over, torso pitching after its feet."""
    n, v = 88, .42
    c = Clip(n, True, v, about="Always nearly falling: four uneven steps, one crossing over, flung arms")
    c.track("l", [Plant(0, 34, -.23, .09, 8, hs=-10, to=22, height=.04, peak=.5, flat=.15, heel=.6),
                  Plant(46, 74, -.2, .165, 24, hs=-3, to=18, height=.05, peak=.45, flat=.12, heel=.55)])
    c.track("r", [Plant(26, 50, -.16, .0, -6, hs=-5, to=20, height=.03, peak=.55, flat=.14, heel=.55),
                  Plant(68, 94, -.22, -.135, -18, hs=-10, to=24, height=.055, peak=.45, flat=.15, heel=.6)])
    c.pelvis[:, 2] = curve(n, [(3, -.075), (16, -.05), (30, -.095), (40, -.066), (50, -.112), (60, -.056), (72, -.082), (83, -.05)], True)
    c.pelvis[:, 0] = curve(n, [(14, .05), (36, -.0), (54, .1), (80, -.075)], True)
    c.pelvis[:, 1] = curve(n, [(0, .03), (40, .0), (50, .04)], True)
    c.pelvis_rot[:, 0] = curve(n, [(4, 8), (28, 13), (48, 15), (62, 4), (84, 7)], True)
    c.pelvis_rot[:, 1] = curve(n, [(14, -5), (36, 3), (54, -9), (80, 6)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -8), (30, 14), (46, -14), (70, 10)], True)
    c.chest(spring(curve(n, [(6, 18), (32, 30), (48, 40), (62, 14), (84, 20)], True), 1.9, .42),
            spring(curve(n, [(14, 7), (38, -5), (56, 17), (82, -10)], True), 1.8, .42),
            spring(curve(n, [(0, 12), (32, -16), (50, 16), (72, -12)], True), 2.0, .42))
    c.neck[:, 0] = -12 + spring(curve(n, [(10, 0), (34, 4), (50, 10), (64, -10), (84, 0)], True), 1.8, .28)
    c.neck[:, 1] = spring(curve(n, [(20, -6), (42, 7), (60, -12), (84, 9)], True), 1.7, .28)
    c.head[:, 0] = -8 + spring(curve(n, [(36, 2), (54, 6), (66, -8)], True), 2, .3)
    c.head[:, 1] = spring(curve(n, [(22, -7), (44, 8), (62, -14), (86, 10)], True), 1.7, .28)
    c.head[:, 2] = spring(curve(n, [(10, -9), (44, 14), (74, -10)], True), 1.5, .4)
    off, pole, wrist = limp_arm(body, c, "r", (.05, .22), 18, None, 1.5, 1.9, elbow_gain=1.4)
    off[:, 0] -= curve(n, [(58, 0), (70, .05), (82, 0)], True)
    c.hand("r", off, pole, wrist + 12, curl=(30, 36, 24))
    # The left arm flings out to catch the fall as the steps cross.
    loff, lpole, lwrist = limp_arm(body, c, "l", (.1, .18), 20, None, 1.4, 1.9, elbow_gain=1.4)
    catch = curve(n, [(0, 0), (36, 0), (50, 1), (62, 1), (78, 0)], True)
    catch = np.clip(spring(catch, 2.2, .55), 0, 1.1)[:, None]
    flung = np.array((.36, -.27, -.1))
    c.hand("l", loff * (1 - catch) + flung * catch, lpole, lwrist + 14 + catch[:, 0] * 8,
           curl=np.outer(1 - catch[:, 0], LIMP) + np.outer(catch[:, 0], SPLAY))
    return c


# ----- Runs -------------------------------------------------------------------------------------

def stride(n, v, stance, width=.09, yaw=6, offset=(0, 0), **plant):
    travel = v * stance / FPS
    return ([Plant(0, stance, -travel / 2 + offset[0], width, yaw, **plant)],
            [Plant(n // 2, n // 2 + stance, -travel / 2 + offset[1], -width, -yaw, **plant)])


def pump_arm(n, phase, fore, back):
    """A bent arm driving from the shoulder at the running beat. phase is the frame its hand is furthest forward."""
    off = vcurve(n, [(phase % n, fore), ((phase + n // 2) % n, back)], True)
    return smoothed(off, FPS / n * 1.9, .55)


def run_charge(body):
    """Flat-out sprint: pitched far forward, knees driving, arms thrashing out of time."""
    n, v = 20, 4.1
    c = Clip(n, True, v, about="Flat-out sprint, pitched far forward, arms thrashing out of time")
    l, r = stride(n, v, 6, .07, 4, (.03, .03), hs=-6, to=46, height=.27, peak=.42, flat=.2, heel=.35, swing_end=.25)
    c.track("l", l)
    c.track("r", r)
    c.poles = {s: np.tile((.0, -1, -.06), (n + 1, 1)) for s in "lr"}
    c.pelvis[:, 2] = curve(n, [(3, -.17), (8, -.115), (13, -.17), (18, -.115)], True)
    c.pelvis[:, 0] = curve(n, [(3, .022), (13, -.022)], True)
    c.pelvis[:, 1] = -.03
    c.pelvis_rot[:, 0] = 20 + curve(n, [(3, 3), (8, -2), (13, 3), (18, -2)], True)
    c.pelvis_rot[:, 1] = curve(n, [(3, -4), (13, 4)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -9), (10, 9)], True)
    c.chest(24 + spring(curve(n, [(4, 2), (9, -2), (14, 2), (19, -2)], True), 6, .35), spring(curve(n, [(4, 6), (14, -6)], True), 4, .5), spring(-c.pelvis_rot[:, 2] * 1.7, 5, .5))
    c.neck[:, 0] = -26 + spring(curve(n, [(5, 2), (10, -2), (15, 2), (20, -2)], True), 5, .3)
    c.head[:, 0] = -20
    c.head[:, 1] = 7 * wave(n, 1, .2)
    c.head[:, 2] = 6 * wave(n, 1, .05)
    # The elbows hold near a right angle and the swing comes from the shoulder, unevenly, two frames out of time.
    c.hand("l", pump_arm(n, 12, (.1, -.27, -.16), (.18, .13, -.24)), (.75, .6, -.3), 14 + 12 * wave(n, 1, .3), curl=HOOK)
    c.hand("r", pump_arm(n, 4, (-.05, -.28, -.12), (-.18, .11, -.26)), (-.75, .6, -.3), 16 + 12 * wave(n, 1, .8), curl=CLAW)
    return c


def run_lope(body):
    """Heavy, loose bounding: big hang-time, arms flung about like dead weight, head rolling after the chest."""
    n, v = 26, 3.1
    c = Clip(n, True, v, about="Heavy loose bounding, head rolling and arms flung about like dead weight")
    l, r = stride(n, v, 8, .1, 10, (.0, .02), hs=-14, to=38, height=.2, peak=.45, flat=.25, heel=.45, swing_end=.3)
    c.track("l", l)
    c.track("r", r)
    c.pelvis[:, 2] = curve(n, [(4, -.17), (10, -.065), (17, -.175), (23, -.07)], True)
    c.pelvis[:, 0] = curve(n, [(4, .045), (17, -.05)], True)
    c.pelvis_rot[:, 0] = 12 + curve(n, [(4, 4), (10, -3), (17, 4), (23, -3)], True)
    c.pelvis_rot[:, 1] = curve(n, [(4, -7), (17, 7)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -11), (13, 11)], True)
    bob = curve(n, [(5, 7), (12, -5), (18, 7), (25, -5)], True)
    c.chest(20 + spring(bob, 3.2, .3), spring(curve(n, [(6, 8), (19, -8)], True), 2.8, .4), spring(-c.pelvis_rot[:, 2] * 1.3, 3.5, .5))
    # The head follows the chest two frames late, at half the reach it had.
    c.neck[:, 0] = -13 + trail(spring(bob * .5, 2.6, .4), 2)
    c.neck[:, 1] = spring(curve(n, [(8, -8), (21, 8)], True), 2.4, .35)
    c.head[:, 0] = -6 + trail(spring(bob * .3, 2.6, .4), 3)
    c.head[:, 1] = spring(curve(n, [(9, -8), (22, 8)], True), 2.2, .35)
    for s, rest, ph in (("l", (-.02, .26), .08), ("r", (-.1, .3), .58)):
        off, pole, wrist = limp_arm(body, c, s, rest, 28, wave(n, 1, ph, .72), .9, 1.6, .4, elbow_gain=2.8, lag=3, elbow_min=15)
        c.hand(s, smoothed(off, 7, .7), pole, np.minimum(spring(wrist, 5, .7) + 6, 25), curl=LIMP)
    return c


def run_hobble(body):
    """A broken run on a locked leg: bounds off the good one, swings the stiff one wide, one arm clamped to its chest."""
    n, v = 32, 2.3
    c = Clip(n, True, v, about="Broken run: bounds off the right, swings the locked left wide, left arm clamped to its chest")
    c.track("l", [Plant(0, 7, -.23, .085, 8, hs=-8, to=40, height=.2, peak=.42, flat=.22, heel=.35, swing_end=.3)])
    c.track("r", [Plant(17, 22, -.08, -.16, -24, hs=-2, to=14, height=.015, peak=.55, flat=.2, heel=.5, swing_end=.2, out=-.17)])
    c.poles = {"r": np.tile((-.25, -1, 0), (n + 1, 1))}
    c.pelvis[:, 2] = curve(n, [(3, -.045), (11, -.01), (19, -.05), (26, -.025)], True)
    c.pelvis[:, 0] = curve(n, [(5, .05), (21, -.08)], True)
    c.pelvis[:, 1] = -.01
    c.pelvis_rot[:, 0] = curve(n, [(4, 15), (13, 9), (21, 20)], True)
    c.pelvis_rot[:, 1] = curve(n, [(5, 9), (21, -6)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -12), (17, 12)], True)
    c.chest(spring(curve(n, [(5, 20), (13, 13), (22, 32)], True), 3, .36), spring(curve(n, [(5, 9), (22, -17)], True), 2.8, .4), spring(curve(n, [(0, 13), (17, -15)], True), 3.2, .5))
    c.neck[:, 0] = -19 + spring(curve(n, [(6, 4), (14, -5), (23, 8)], True), 2.8, .26)
    c.neck[:, 1] = spring(curve(n, [(8, -8), (24, 12)], True), 2.4, .3)
    c.head[:, 0] = -12 + spring(curve(n, [(6, 3), (15, -3), (24, 5)], True), 2.8, .26)
    c.head[:, 1] = spring(curve(n, [(8, -8), (26, 12)], True), 2.4, .3)
    # Fist seated on the sternum: the elbow gives a little as each landing jolts it.
    clamp = pin_to_chest(body, c, "r", (-.1, -.145, .03))
    jolt = spring(curve(n, [(17, 0), (19, .026), (24, 0), (32, 0)], True), 4, .3)
    clamp[:, 2] += jolt
    clamp[:, 1] -= jolt * .5
    c.hand("r", clamp, (-.9, .35, -.45), 26 + 7 * wave(n, 1, .2), curl=FIST, thumb=(26, 40, 30), shrug=.4)
    off, pole, wrist = limp_arm(body, c, "l", (.1, .4), 20, wave(n, 1, .1, .25), 1.0, 1.9, .4, elbow_gain=2)
    c.hand("l", off, pole, wrist + 6, curl=CLAW)
    return mirror(c)


def run_frenzy(body):
    """Grasping sprint: bent double, shoving off hard, arms clawing out and raking back in turn."""
    n, v = 18, 3.7
    c = Clip(n, True, v, about="Grasping sprint: bent double, driving off its toes, clawing at its prey in turn")
    l, r = stride(n, v, 6, .085, 5, (.0, .0), hs=-4, to=40, height=.22, peak=.42, flat=.2, heel=.35, swing_end=.25)
    c.track("l", l)
    c.track("r", r)
    # The knees straighten as each foot leaves the floor, at about 7 and 16.
    c.pelvis[:, 2] = curve(n, [(3, -.2), (6.5, -.055), (12, -.2), (15.5, -.055)], True)
    c.pelvis[:, 0] = curve(n, [(3, .025), (12, -.025)], True)
    c.pelvis[:, 1] = -.045
    c.pelvis_rot[:, 0] = 26
    c.pelvis_rot[:, 1] = curve(n, [(3, -4), (12, 4)], True)
    c.pelvis_rot[:, 2] = curve(n, [(0, -8), (9, 8)], True)
    c.chest(21 + spring(curve(n, [(4, 2), (8, -2), (13, 2), (17, -2)], True), 6, .35), spring(curve(n, [(4, 4), (13, -4)], True), 4, .5), spring(-c.pelvis_rot[:, 2] * 1.8, 5, .5))
    c.neck[:, 0] = -30
    c.head[:, 0] = -24
    c.head[:, 1] = 5 * wave(n, 1, .1)
    for s, sign, ph in (("l", 1, 2), ("r", -1, 11)):
        # Six frames lashing out, twelve raking back.
        out, back = (sign * .08, -.47, .12), (sign * .17, -.2, -.2)
        off = vcurve(n, [(ph, back), ((ph + 6) % n, out)], True)
        grasp = curve(n, [(ph, 1), ((ph + 6) % n, 0), ((ph + 10) % n, 1)], True)
        c.hand(s, smoothed(off, 4.5, .6), (sign * .8, .1, -.6), 8 + 18 * grasp, curl=np.outer(1 - grasp, SPLAY) + np.outer(grasp, HOOK), thumb=(12, 30, 24))
    return c


# ----- Attacks ----------------------------------------------------------------------------------

READY = dict(
    z=-.1, pitch=9, chest=25, neck=-14, head=-8,
    l=((.1, -.17, -.42), (.5, .85, -.1)), r=((-.08, -.2, -.42), (-.5, .85, -.1)),
    feet=(.115, -.07, 10), feet_r=(-.125, .11, -15),
)
LOW = {"l": (.5, .85, -.1), "r": (-.5, .85, -.1)}  # the elbow at rest: back and out
# Elbow up and out for the raise, leading forward into the strike, back and out on the way through.
RAISED, LEADING, THROUGH = (.75, .2, .5), (.85, -.25, .35), (.75, -.55, 0)
AFTER = (.75, .4, -.2)


def elbow(sign, v):
    return (sign * v[0], v[1], v[2])


def planted(y, x, yaw, strike=-30, lift=999, **kw):
    return Plant(strike, lift, y, x, yaw, **kw)


def set_trunk(c, pelvis, hips, chest, neck, head, chest_hz=3.6, neck_hz=None):
    n = c.n
    c.pelvis = vcurve(n, pelvis)
    c.pelvis_rot = vcurve(n, hips)
    rot = smoothed(vcurve(n, chest), chest_hz, .5, False)
    c.chest(rot[:, 0], rot[:, 1], rot[:, 2])
    c.neck = vcurve(n, neck)
    if neck_hz:
        c.neck = smoothed(c.neck, neck_hz, .4, False)
    c.head = vcurve(n, head)


def attack_rake(body):
    """The elbow hauls up behind the head, the back heel and hips drive, the chest follows, and the arm whips down across."""
    n = 44
    c = Clip(n, False, about="Elbow hauled up behind its head, drives off the back leg, rakes down across the body")
    c.track("l", [planted(READY["feet"][1], READY["feet"][0], READY["feet"][2], lift=11, to=8, height=.08, heel=.4),
                  Plant(17, 999, -.36, .135, 16, hs=-16, flat=.2, heel=9)])
    c.track("r", [planted(READY["feet_r"][1], READY["feet_r"][0], READY["feet_r"][2], to=0, heel=9)])
    c.peel("r", [(0, 0), (12, 0), (18, 32), (24, 24), (35, 0), (44, 0)])
    set_trunk(c,
              [(0, (0, .0, READY["z"])), (11, (-.05, .06, -.09)), (17, (.03, -.22, -.055)), (20, (.05, -.24, -.06)), (27, (.05, -.2, -.12)), (44, (0, .0, READY["z"]))],
              [(0, (READY["pitch"], 0, 0)), (11, (2, 6, -24)), (16, (10, -4, 10)), (20, (12, -6, 24)), (27, (12, -7, 28)), (44, (READY["pitch"], 0, 0))],
              [(0, (READY["chest"], 0, 0)), (12, (2, 12, -36)), (19, (30, -10, 20)), (23, (24, -13, 36)), (30, (26, -13, 40)), (44, (READY["chest"], 0, 0))],
              [(0, (READY["neck"], 0, 0)), (12, (-6, 3, 16)), (19, (-26, -3, -6)), (30, (-30, -3, -6)), (44, (READY["neck"], 0, 0))],
              [(0, (READY["head"], 0, 0)), (12, (-10, 5, 12)), (21, (-20, -6, -10)), (30, (-24, -4, -8)), (44, (READY["head"], 0, 0))], neck_hz=3.4)
    rh = vcurve(n, [(0, READY["r"][0]), (5, (-.28, .02, -.22)), (9, (-.24, .14, .1)), (12, (-.06, .18, .25)), (15, (.06, -.06, .24)), (18, (.04, -.4, .22)), (21, (.2, -.38, -.06)), (25, (.33, -.18, -.3)), (33, (.14, -.14, -.45)), (44, READY["r"][0])])
    pole = vcurve(n, [(0, LOW["r"]), (9, elbow(-1, RAISED)), (13, elbow(-1, LEADING)), (17, elbow(-1, THROUGH)), (22, elbow(-1, AFTER)), (44, LOW["r"])])
    curl = vcurve(n, [(0, LIMP), (11, SPLAY), (19, SPLAY), (23, CLAW), (28, HOOK), (37, LIMP), (44, LIMP)])
    c.hand("r", rh, pole, curve(n, [(0, 12), (10, -12), (15, -14), (19, 8), (24, 20), (44, 12)]), curl=curl)
    lh = vcurve(n, [(0, READY["l"][0]), (11, (.14, -.3, -.28)), (18, (.27, .03, -.4)), (24, (.3, .13, -.37)), (44, READY["l"][0])])
    c.hand("l", smoothed(lh, 3.6, .55, False), LOW["l"], curve(n, [(0, 12), (20, 22), (44, 12)]), curl=LIMP)
    return c


def attack_flurry(body):
    """Marches in behind three wild alternating rakes: a foot plants on each, the hips turn and the chest whips after."""
    n, travel = 68, .55
    ramp = dict(start=4, end=34, dist=travel, ramp=6)
    c = Clip(n, False, root=ramp, about="Marches in, a foot planting on each of three wild rakes, the hips turning before the chest")
    c.floor = travelled_floor(ramp)
    c.track("l", [planted(READY["feet"][1], READY["feet"][0], READY["feet"][2], lift=9, to=14, height=.07, heel=.3),
                  Plant(19, 38, -.3, .11, 9, hs=-12, to=30, height=.07, flat=.15, heel=.5),
                  Plant(45, 999, -.3, .13, 14, hs=-14, flat=.2, heel=9)])
    c.track("r", [planted(READY["feet_r"][1], READY["feet_r"][0], READY["feet_r"][2], lift=22, to=34, height=.08, heel=.4),
                  Plant(32, 999, -.26, -.12, -12, hs=-10, flat=.2, heel=9)])
    c.peel("r", [(0, 0), (8, 0), (15, 26), (22, 36), (24, 0), (68, 0)])
    set_trunk(c,
              [(0, (0, 0, READY["z"])), (10, (.03, .0, -.12)), (15, (-.02, -.1, -.065)), (20, (-.03, -.12, -.1)), (26, (.04, -.13, -.05)), (33, (.04, -.13, -.1)), (39, (-.04, -.13, -.04)), (46, (-.04, -.13, -.09)), (56, (-.02, -.08, -.12)), (68, (0, 0, READY["z"]))],
              [(0, (READY["pitch"], 0, 0)), (10, (8, 3, -13)), (17, (10, -5, 17)), (25, (10, -3, 14)), (30, (10, 6, -18)), (38, (10, 3, -15)), (43, (10, -6, 18)), (68, (READY["pitch"], 0, 0))],
              [(0, (READY["chest"], 0, 0)), (12, (14, 8, -28)), (19, (26, -12, 30)), (27, (28, -8, 26)), (32, (26, 12, -32)), (40, (22, 8, -28)), (45, (22, -14, 36)), (68, (READY["chest"], 0, 0))],
              [(0, (READY["neck"], 0, 0)), (12, (-12, 2, 12)), (19, (-22, -3, -8)), (27, (-14, -2, -6)), (32, (-22, 4, 10)), (40, (-14, 2, 8)), (45, (-30, -4, -10)), (68, (READY["neck"], 0, 0))],
              [(0, (READY["head"], 0, 0)), (20, (-14, -7, -8)), (33, (-14, 7, 9)), (46, (-22, -9, -10)), (68, (READY["head"], 0, 0))], chest_hz=4.5)
    rh = vcurve(n, [(0, READY["r"][0]), (6, (-.3, .0, -.25)), (10, (-.2, .16, .12)), (13, (-.06, .12, .26)), (16, (.05, -.1, .25)), (19, (.06, -.38, .24)), (23, (.2, -.32, -.16)), (28, (-.16, -.24, -.28)), (31, (-.2, -.2, -.2)), (35, (-.25, -.02, -.08)), (38, (-.2, .12, .12)), (41, (-.06, .12, .26)), (43, (.05, -.1, .25)), (45, (.06, -.38, .26)), (48, (.24, -.3, -.12)), (54, (.12, -.14, -.44)), (68, READY["r"][0])])
    lh = vcurve(n, [(0, READY["l"][0]), (10, (.12, -.3, -.3)), (16, (.16, -.32, -.28)), (20, (.3, -.05, -.18)), (24, (.2, .16, .14)), (27, (.06, .12, .26)), (29, (-.05, -.1, .25)), (32, (-.06, -.38, .24)), (36, (-.2, -.32, -.16)), (41, (.02, -.28, -.3)), (46, (.16, -.3, -.28)), (56, (.12, -.2, -.4)), (68, READY["l"][0])])
    c.hand("r", rh, vcurve(n, [(0, LOW["r"]), (8, elbow(-1, RAISED)), (12, elbow(-1, LEADING)), (17, elbow(-1, THROUGH)), (25, elbow(-1, AFTER)), (30, elbow(-1, AFTER)), (35, elbow(-1, RAISED)), (39, elbow(-1, LEADING)), (43, elbow(-1, THROUGH)), (49, elbow(-1, AFTER)), (68, LOW["r"])]),
           curve(n, [(0, 12), (10, -12), (15, -14), (20, 10), (24, 20), (34, 4), (40, -12), (46, 10), (50, 20), (68, 12)]),
           curl=vcurve(n, [(0, LIMP), (8, SPLAY), (20, SPLAY), (23, CLAW), (27, HOOK), (34, SPLAY), (46, SPLAY), (49, CLAW), (54, HOOK), (62, LIMP), (68, LIMP)]))
    c.hand("l", lh, vcurve(n, [(0, LOW["l"]), (18, elbow(1, AFTER)), (22, elbow(1, RAISED)), (26, elbow(1, LEADING)), (30, elbow(1, THROUGH)), (36, elbow(1, AFTER)), (68, LOW["l"])]),
           curve(n, [(0, 12), (20, -12), (28, -14), (33, 10), (37, 20), (68, 12)]),
           curl=vcurve(n, [(0, LIMP), (17, HOOK), (22, SPLAY), (33, SPLAY), (36, CLAW), (40, HOOK), (50, LIMP), (68, LIMP)]))
    return c


def attack_bite(body):
    """Both hands lunge up and clamp at the shoulders, haul in, and the mouth drives up: the chest worries it."""
    n = 64
    c = Clip(n, False, about="Lunges, clamps on at shoulder height, hauls in and worries the bite from its chest")
    c.track("l", [planted(READY["feet"][1], READY["feet"][0], READY["feet"][2], lift=8, to=10, height=.07, heel=.4),
                  Plant(15, 999, -.38, .13, 14, hs=-14, flat=.18, heel=9)])
    c.track("r", [planted(READY["feet_r"][1], READY["feet_r"][0], READY["feet_r"][2], to=8, heel=.5, lift=48, height=.05),
                  Plant(56, 999, .03, -.125, -15, hs=-5, flat=.2, heel=9)])
    c.peel("r", [(0, 0), (10, 0), (15, 26), (28, 10), (64, 0)])
    set_trunk(c,
              [(0, (0, 0, READY["z"])), (7, (0, .05, -.13)), (15, (.02, -.16, -.09)), (22, (.02, -.13, -.075)), (45, (.02, -.12, -.07)), (52, (.01, -.05, -.1)), (64, (0, 0, READY["z"]))],
              [(0, (READY["pitch"], 0, 0)), (7, (4, 0, -4)), (15, (12, -3, 8)), (24, (8, 0, 5)), (45, (8, 0, 5)), (64, (READY["pitch"], 0, 0))],
              [(0, (READY["chest"], 0, 0)), (7, (8, 0, -6)), (15, (30, -2, 8)), (22, (22, 0, 4)), (28, (24, 2, 3)), (45, (24, 1, 2)), (53, (22, 0, 0)), (64, (READY["chest"], 0, 0))],
              [(0, (READY["neck"], 0, 0)), (7, (2, 0, 0)), (16, (-22, 0, 0)), (25, (-18, 0, 0)), (29, (-10, 0, 0)), (46, (-10, 0, 0)), (54, (-20, 0, 0)), (64, (READY["neck"], 0, 0))],
              [(0, (READY["head"], 0, 0)), (16, (-14, 0, 0)), (25, (-24, 0, 0)), (29, (-26, 0, 0)), (46, (-26, 0, 0)), (54, (-12, 0, 0)), (64, (READY["head"], 0, 0))], chest_hz=3.8)
    # The worry is thrown from the chest, and neck and head only ride it.
    shake = np.zeros(n + 1)
    for f in range(29, 46):
        shake[f] = math.sin((f - 29) * TAU / 7.5) * math.sin((f - 29) / 17 * math.pi)
    c.spine[:, :, 2] += shake[None, :] * 2.0
    c.spine[:, :, 1] += shake[None, :] * 1.5
    c.pelvis[:, 0] += shake * .015
    c.neck[:, 2] += trail(shake, 1, False) * 4
    c.head[:, 2] += trail(shake, 2, False) * 8
    c.head[:, 1] += trail(shake, 2, False) * 4
    for s, sign, late in (("l", 1, 0), ("r", -1, 1)):
        off = vcurve(n, [(0, READY[s][0]), (7, (sign * .24, .03, -.33)), (14 + late, (sign * .12, -.45, .12)), (19, (sign * .12, -.44, .1)), (27, (sign * .13, -.28, .16)), (45, (sign * .13, -.27, .16)), (52, (sign * .17, -.36, -.12)), (64, READY[s][0])])
        off[29:46, 2] += shake[29:46] * .012 * sign
        off[29:46, 1] += np.abs(shake[29:46]) * .012
        curl = vcurve(n, [(0, LIMP), (9, SPLAY), (13 + late, SPLAY), (17 + late, HOOK), (21, FIST), (46, FIST), (54, LIMP), (64, LIMP)])
        thumb = vcurve(n, [(0, (10, 24, 16)), (13, (0, 8, 8)), (21, (34, 46, 30)), (46, (34, 46, 30)), (64, (10, 24, 16))])
        c.hand(s, off, (sign * .8, .25, -.55), curve(n, [(0, 12), (8, -8), (14, -4), (22, 18), (46, 18), (64, 12)]), curl=curl, thumb=thumb)
    return c


def attack_pounce(body):
    """Sinks and coils, then springs flat with its hands driving up from the knees to hit at shoulder height, and drops raking."""
    n, travel = 66, 1.6
    ramp = dict(start=19, end=28, dist=travel, ramp=2)
    c = Clip(n, False, root=ramp, about="Coils, leaps flat with hands driving up to hit at shoulder height on frame 27, drops into a crouch raking")
    c.floor = travelled_floor(ramp)
    c.track("l", [planted(READY["feet"][1], READY["feet"][0], READY["feet"][2], lift=20, to=44, height=.3, peak=.4, heel=.6, swing_end=.1),
                  Plant(31, 999, -.4, .14, 15, hs=-6, flat=.18, heel=9)])
    c.track("r", [planted(READY["feet_r"][1], READY["feet_r"][0], READY["feet_r"][2], lift=21, to=44, height=.34, peak=.45, heel=.6, swing_end=.1),
                  Plant(36, 999, .02, -.13, -17, hs=-4, flat=.18, heel=9)])
    set_trunk(c,
              [(0, (0, 0, READY["z"])), (12, (0, .1, -.38)), (17, (0, .09, -.42)), (21, (0, -.1, -.14)), (25, (0, -.2, .04)), (27, (0, -.22, .06)), (31, (0, -.24, -.18)), (35, (0, -.22, -.3)), (44, (.01, -.14, -.22)), (56, (0, -.04, -.12)), (66, (0, 0, READY["z"]))],
              [(0, (READY["pitch"], 0, 0)), (14, (28, 0, 0)), (21, (22, 0, 0)), (26, (26, 0, 0)), (32, (28, -3, 7)), (42, (22, -3, 5)), (56, (14, 0, 0)), (66, (READY["pitch"], 0, 0))],
              [(0, (READY["chest"], 0, 0)), (14, (47, 0, 0)), (21, (8, 0, 0)), (26, (8, 0, 0)), (33, (38, -4, 4)), (43, (26, -2, 0)), (56, (24, 0, 0)), (66, (READY["chest"], 0, 0))],
              [(0, (READY["neck"], 0, 0)), (14, (-28, 0, 0)), (22, (-20, 0, 0)), (26, (-28, 0, 0)), (33, (-32, 0, 0)), (44, (-30, 0, 0)), (66, (READY["neck"], 0, 0))],
              [(0, (READY["head"], 0, 0)), (14, (-22, 0, 0)), (22, (-12, 0, 0)), (33, (-24, 0, 0)), (44, (-26, 0, 0)), (66, (READY["head"], 0, 0))], chest_hz=4)
    for s, sign, d in (("l", 1, 2), ("r", -1, 0)):  # the left hand arrives two frames behind the right
        off = vcurve(n, [(0, READY[s][0]), (10, (sign * .12, .2, -.4)), (16, (sign * .14, .28, -.33)), (20 + d, (sign * .16, .02, -.38)), (24 + d, (sign * .12, -.3, -.14)), (27 + d, (sign * .1, -.4, .1)), (31 + d, (sign * .14, -.44, .0)), (35 + d, (sign * .19, -.34, -.2)), (39 + d, (sign * .19, -.24, -.33)), (50, (sign * .15, -.2, -.4)), (66, READY[s][0])])
        curl = vcurve(n, [(0, LIMP), (16, LIMP), (22, SPLAY), (31 + d, SPLAY), (35 + d, HOOK), (45, CLAW), (60, LIMP), (66, LIMP)])
        c.hand(s, off, (sign * .85, .35, -.35), curve(n, [(0, 12), (16, 20), (23, -6), (27 + d, -10), (32 + d, 14), (66, 12)]), curl=curl)
    return c


def travelled_floor(root):
    """Distance covered by frame f: constant speed with an ease at each end, as the viewer plays it."""
    def at(f):
        k, span = root["ramp"], root["end"] - root["start"]
        v = root["dist"] / (span - k)
        u = max(0, min(f, root["end"]) - root["start"])
        if not k:
            return v * u
        if u < k:
            return v * u * u / (2 * k)
        if u < span - k:
            return v * (u - k / 2)
        o = span - u
        return v * (span - k - o * o / (2 * k))
    return at


# ----- On the ground: what's left of it after the legs have gone ---------------------------------------

def prone(c, lift=None, bob=None, roll=None, yaw=None):
    """Lies along the floor with its chest propped up and its head craned forward, legs trailing."""
    n = c.n
    lift = np.zeros(n + 1) if lift is None else np.asarray(lift)
    c.pelvis[:, 1] = .42
    c.pelvis[:, 2] = -.76 + (0 if bob is None else np.asarray(bob))
    c.pelvis_rot[:, 0] = 84
    c.pelvis_rot[:, 1] = 0 if roll is None else roll
    c.pelvis_rot[:, 2] = 0 if yaw is None else -np.asarray(yaw) * .5
    c.chest(-14 - lift, np.zeros(n + 1) if roll is None else -np.asarray(roll) * .8, np.zeros(n + 1) if yaw is None else yaw)
    c.neck[:, 0] = -34 - lift * .2
    c.head[:, 0] = -26 - lift * .2
    for s, sign in (("l", 1), ("r", -1)):
        sway = (.03 * wave(n, 1, 0 if s == "l" else .5)) if c.loop else np.zeros(n + 1)
        c.feet[s] = [dict(x=sign * .17 + sign * float(w), y=1.2 + float(w), z=.0, phi=68.0, yaw=sign * 14.0, flat=1, stance=False) for w in sway]
        c.poles[s] = np.tile(np.array((sign * .2, -.3, -1.0)), (n + 1, 1))


def smooth_step(t):
    t = min(max(t, 0), 1)
    return t * t * (3 - 2 * t)


def crawl(body):
    """Hauls itself along by the arms: one hand reaches and claws in, the chest swings over it, then the other."""
    n, v = 48, .55
    c = Clip(n, True, v, about="Hauls itself along the ground, hand over hand, with its legs trailing")
    half = n // 2
    prone(c, bob=curve(n, [(4, .03), (16, -.02), (28, .03), (40, -.02)], True), roll=curve(n, [(8, 6), (32, -6)], True), yaw=curve(n, [(0, 8), (24, -8)], True))
    pull = v * (half + 6) / FPS
    for s, sign, d in (("l", 1, 0), ("r", -1, half)):
        y, z = np.zeros(n + 1), np.zeros(n + 1)
        for f in range(n + 1):
            u = ((f - d) % n) / n
            if u < .6:  # on the floor, sliding back under it as the body goes over
                y[f], z[f] = -.62 + pull * u / .6, .06
            else:  # up and forward again
                w = (u - .6) / .4
                y[f], z[f] = -.62 + pull * (1 - smooth_step(w)), .06 + .16 * math.sin(w * math.pi)
        target = np.stack([np.full(n + 1, sign * .3), y, z], 1)
        curl = np.array([CLAW if ((f - d) % n) / n < .6 else SPLAY for f in range(n + 1)], dtype=float)
        c.hand(s, target - shoulder_path(body, c, s), (sign * .9, .5, .2), np.full(n + 1, -18.0), curl=curl)
    return c


def crawl_attack(body):
    """Rears up on one arm and drags the other down across whatever it has reached."""
    n = 34
    c = Clip(n, False, about="Rears up on its left arm and rakes with its right; it lands on frame 16")
    lift = curve(n, [(0, 0), (11, 26), (16, 16), (24, 8), (34, 0)])
    prone(c, lift=lift, bob=curve(n, [(0, 0), (11, .08), (16, .03), (34, 0)]), yaw=curve(n, [(0, 0), (10, -14), (17, 16), (34, 0)]))
    for s, sign, keys, curl in (
            ("r", -1, [(0, (-.3, -.42, .06)), (10, (-.34, -.5, .62)), (16, (-.12, -.8, .38)), (21, (.04, -.62, .08)), (34, (-.3, -.42, .06))], [(0, CLAW), (9, SPLAY), (16, SPLAY), (20, HOOK), (34, CLAW)]),
            ("l", 1, [(0, (.3, -.42, .06)), (34, (.3, -.42, .06))], [(0, CLAW), (34, CLAW)])):
        c.hand(s, vcurve(n, keys) - shoulder_path(body, c, s), (sign * .9, .5, .2), np.full(n + 1, -12.0), curl=vcurve(n, curl))
    return c


ALL = {
    "crawl": crawl, "crawl_attack": crawl_attack,
    "walk_shamble": walk_shamble, "walk_drag": walk_drag, "walk_reach": walk_reach, "walk_stagger": walk_stagger,
    "run_charge": run_charge, "run_lope": run_lope, "run_hobble": run_hobble, "run_frenzy": run_frenzy,
    "attack_rake": attack_rake, "attack_flurry": attack_flurry, "attack_bite": attack_bite, "attack_pounce": attack_pounce,
}


def build(arm, mesh, only=None, prefix="z_"):
    body = Body(arm, mesh)
    meta = {}
    for name, make in ALL.items():
        if only and name not in only:
            continue
        c = make(body)
        poses, clamps = solve(body, c)
        write_action(prefix + name, poses)
        meta[name] = dict(frames=c.n, loop=c.loop, fps=FPS, speed=c.speed, duration=c.n / FPS, about=c.about)
        if c.root:
            meta[name]["root"] = c.root
        if name in REACH:
            meta[name]["reach"] = REACH[name]
        print(name, c.n, "frames, leg clamps", clamps)
    return meta
