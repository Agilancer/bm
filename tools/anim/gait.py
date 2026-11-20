# The third-person gaits, authored in Blender: a walk, a jog, a run and a sprint for any of the game's two-legged
# skeletons (the player's wizard, the heroes' master skeleton, Lisandra's), each made for the speed the game moves that
# body at, so the legs turn over as a runner's do and the feet hold the ground.
#
# Run inside Blender (the Blender MCP: exec(open('tools/anim/gait.py').read())). It keeps itself in
# bpy.app.driver_namespace['gait'], since nothing else persists between calls.
#
#   G = bpy.app.driver_namespace['gait']
#   rig = G.Rig(armature, G.ROLES['wizard'])            the skeleton, by what each bone is for
#   G.bake(rig, 'run', G.STYLES['wizard'])              an action named for the gait, on that armature
#   G.measure(rig, 'run')                               what it measures: cadence, lean, bob, shoulders, reach
#   tools/anim/export.py writes the actions into the game's files.
#
# How a cycle is made (the body's own space: +X his left, -Y ahead, +Z up, as Blender has a glTF body):
#   - the feet are placed, not swung: each is planted and goes back under him at the speed he's moving, rolls from the
#     heel (or the middle of the foot, or its ball, by pace) onto the ball and leaves the ground; through the air its
#     ankle follows a path through the heel's kick, the pass under the hip, the knee's drive and the reach, and comes
#     down already moving back with the ground. The thigh and shin are solved to it;
#   - the hips ride that: down into each landing and up through each flight (or, walking, up over the planted leg), across
#     to the planted foot, dropped on the side of the leg in the air, turned with the leg that's forward;
#   - the chest turns against the hips, late; leans by the pace; gives to the planted side;
#   - the shoulders are not a bar: each collarbone goes forward with its arm and up at the top of the back swing; the
#     upper arm swings from the shoulder, the elbow opens as the hand passes the hip and shuts as it comes up in front,
#     the hand drags behind the forearm;
#   - the head keeps its own level and looks where he's going;
#   - no two strides are the same: a loop is four strides (eight steps), each a little different in how far the arms and
#     chest go and how high he rides, with a slow drift under it all, and the two sides are not mirror images.
import bpy, math, random
from mathutils import Vector, Quaternion, Matrix

X = Vector((1, 0, 0)); UP = Vector((0, 0, 1)); FWD = Vector((0, -1, 0)); BACK = Vector((0, 1, 0)); DOWN = Vector((0, 0, -1))
TAU = math.pi * 2
FPS = 30


def rot(axis, deg): return Quaternion(axis, math.radians(deg))
def yaw(deg): return rot(UP, deg)                 # + : his right side goes forward
def lean(deg): return rot(X, deg)                 # + : forward
def tilt(deg): return rot(BACK, deg)              # + : his left side goes down
def smooth(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def lerp(a, b, t): return a + (b - a) * t
def wave(u, peak, skew=0.0):
    """Periodic in u: +1 at `peak`, -1 half a cycle on. skew > 0: it comes up to the peak faster than it leaves."""
    a = TAU * (u - peak)
    return math.cos(a - skew * math.sin(a))


def frame(d, h):
    d = d.normalized(); h = (h - d * h.dot(d))
    if h.length < 1e-6: h = d.orthogonal()
    h.normalize()
    return Matrix((d, h, d.cross(h))).transposed()


def turn_between(d0, h0, d1, h1):
    return (frame(d1, h1) @ frame(d0, h0).inverted()).to_quaternion()


def keyed(keys, q):
    """Piecewise through (q, value) keys, eased between them."""
    if q <= keys[0][0]: return keys[0][1]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if q <= b: return lerp(va, vb, smooth((q - a) / (b - a)))
    return keys[-1][1]


def hermite(knots, w):
    """A path through (w, point, tangent or None) knots; tangents left as None are taken from the neighbours."""
    n = len(knots)
    tans = []
    for i, (wi, p, t) in enumerate(knots):
        if t is not None: tans.append(t); continue
        a, b = knots[max(i - 1, 0)], knots[min(i + 1, n - 1)]
        tans.append((b[1] - a[1]) / max(b[0] - a[0], 1e-6))
    for i in range(n - 1):
        w0, p0, _ = knots[i]; w1, p1, _ = knots[i + 1]
        if w <= w1 or i == n - 2:
            h = w1 - w0; s = max(0.0, min(1.0, (w - w0) / h))
            s2, s3 = s * s, s * s * s
            return p0 * (2 * s3 - 3 * s2 + 1) + tans[i] * (h * (s3 - 2 * s2 + s)) + p1 * (-2 * s3 + 3 * s2) + tans[i + 1] * (h * (s3 - s2))


# ---------------------------------------------------------------------------------------------------------------------
# The skeletons, by what each bone is for.
def _fingers(pat, names, n=3): return [[pat.format(f, k) for k in range(1, n + 1)] for f in names]

ROLES = {
    'wizard': dict(
        hips='Hip', spine=['Waist', 'Spine01', 'Spine02'], neck=['NeckTwist01', 'NeckTwist02'], head='Head',
        clav='{}_Clavicle', upper='{}_Upperarm', lower='{}_Forearm', hand='{}_Hand',
        thigh='{}_Thigh', calf='{}_Calf', foot='{}_Foot', toe='{}_ToeBase', sides=('L', 'R'),
        fingers=lambda s: _fingers(s + '_{}{}', ['Index', 'Mid', 'Ring', 'Pinky']), thumb=lambda s: [s + '_Thumb%d' % k for k in (1, 2, 3)]),
    'ual': dict(
        hips='pelvis', spine=['spine_01', 'spine_02', 'spine_03'], neck=['neck_01'], head='Head',
        clav='clavicle_{}', upper='upperarm_{}', lower='lowerarm_{}', hand='hand_{}',
        thigh='thigh_{}', calf='calf_{}', foot='foot_{}', toe='ball_{}', sides=('l', 'r'),
        fingers=lambda s: _fingers('{}_0{}_' + s, ['index', 'middle', 'ring', 'pinky']), thumb=lambda s: ['thumb_0%d_%s' % (k, s) for k in (1, 2, 3)]),
    'mixamo': dict(
        hips='mixamorig:Hips', spine=['mixamorig:Spine', 'mixamorig:Spine1', 'mixamorig:Spine2'], neck=['mixamorig:Neck'], head='mixamorig:Head',
        clav='mixamorig:{}Shoulder', upper='mixamorig:{}Arm', lower='mixamorig:{}ForeArm', hand='mixamorig:{}Hand',
        thigh='mixamorig:{}UpLeg', calf='mixamorig:{}Leg', foot='mixamorig:{}Foot', toe='mixamorig:{}ToeBase', sides=('Left', 'Right'),
        fingers=lambda s: _fingers('mixamorig:' + s + 'Hand{}{}', ['Index', 'Middle', 'Ring', 'Pinky']), thumb=lambda s: ['mixamorig:%sHandThumb%d' % (s, k) for k in (1, 2, 3)]),
}


class Rig:
    def __init__(self, arm, roles):
        self.arm = arm; self.roles = roles
        B = arm.data.bones
        names = {b.name for b in B}
        def nm(n):
            if n in names: return n
            alt = n.replace(':', '_')                      # (how some exporters write mixamorig:Hips)
            if alt in names: return alt
            raise KeyError(f'{arm.name}: no bone {n}')
        self.q0 = {b.name: b.matrix_local.to_quaternion() for b in B}
        self.p0 = {b.name: b.head_local.copy() for b in B}
        self.parent = {b.name: (b.parent.name if b.parent else None) for b in B}
        self.hips = nm(roles['hips']); self.spine = [nm(n) for n in roles['spine']]; self.neck = [nm(n) for n in roles['neck']]; self.head = nm(roles['head'])
        self.side = {}
        for i, s in enumerate(roles['sides']):
            d = {k: nm(roles[k].format(s)) for k in ('clav', 'upper', 'lower', 'hand', 'thigh', 'calf', 'foot', 'toe')}
            d['sign'] = 1 if i == 0 else -1
            d['fingers'] = [[nm(n) for n in chain] for chain in roles['fingers'](s)]
            d['thumb'] = [nm(n) for n in roles['thumb'](s)]
            p = self.p0
            d['l1'] = (p[d['calf']] - p[d['thigh']]).length; d['l2'] = (p[d['foot']] - p[d['calf']]).length
            d['thigh_dir'] = (p[d['calf']] - p[d['thigh']]).normalized(); d['calf_dir'] = (p[d['foot']] - p[d['calf']]).normalized()
            d['upper_dir'] = (p[d['lower']] - p[d['upper']]).normalized(); d['lower_dir'] = (p[d['hand']] - p[d['lower']]).normalized()
            # (The elbow's hinge as the arm lies at rest: it bends the forearm forward.)
            d['arm_hinge'] = d['upper_dir'].cross(FWD).normalized()
            d['palm'] = (DOWN - d['lower_dir'] * DOWN.dot(d['lower_dir'])).normalized()
            self.side['L' if i == 0 else 'R'] = d
        L = self.side['L']
        self.leg = L['l1'] + L['l2']                                      # hip joint to ankle, straight
        self.ankle_h = self.p0[L['foot']].z                              # the ankle's height, standing
        self.ball = self.p0[L['toe']] - self.p0[L['foot']]               # the ball of the foot from the ankle
        self.ball = Vector((0, self.ball.y, self.ball.z))
        self.hip_h = self.p0[L['thigh']].z
        self.hip_w = abs(self.p0[L['thigh']].x)
        self.height = max(b.tail_local.z for b in B)
        # Which bones are posed, and for each the posed bone above it.
        self.posed = [self.hips] + self.spine + self.neck + [self.head]
        for d in self.side.values():
            self.posed += [d[k] for k in ('clav', 'upper', 'lower', 'hand', 'thigh', 'calf', 'foot', 'toe')] + [b for c in d['fingers'] for b in c] + d['thumb']
        ps = set(self.posed)
        self.above = {}
        for b in self.posed:
            p = self.parent[b]
            while p and p not in ps: p = self.parent[p]
            self.above[b] = p

    def apply(self, D, hips_at, frame_no=None):
        """D: bone -> how it's turned from rest (the body's space). hips_at: where the hips' joint is."""
        pb = self.arm.pose.bones
        for b in self.posed:
            q0 = self.q0[b]; up = self.above[b]
            rel = (D[up].inverted() @ D[b]) if up else D[b]
            bone = pb[b]
            bone.rotation_mode = 'QUATERNION'
            q = q0.inverted() @ rel @ q0
            prev = getattr(bone, '_prev', None)
            bone.rotation_quaternion = q
            if frame_no is not None: bone.keyframe_insert('rotation_quaternion', frame=frame_no)
        h = pb[self.hips]
        h.location = self.q0[self.hips].inverted() @ (hips_at - self.p0[self.hips])
        if frame_no is not None: h.keyframe_insert('location', frame=frame_no)


# ---------------------------------------------------------------------------------------------------------------------
# The gaits. Speeds are the game's (m/s, for a body 1.8 m tall: a smaller rig's are scaled to it). Lengths are in leg
# lengths (hip joint to ankle) unless they say otherwise; angles in degrees.
GAITS = {
    'walk': dict(
        v=1.3, steps=1.85, duty=0.6, front=0.36,
        strike=[(0, -16), (0.14, 0), (0.56, 0), (0.85, 34), (1, 52)],      # the foot's pitch through its time on the ground (+ : heel up)
        swing=[(0.28, -0.3, 0.15), (0.55, 0.0, 0.085), (0.82, 0.3, 0.07)], # the ankle through the air: (when, ahead of the hip, off the ground)
        ankle=[(0, 0), (0.35, 6), (0.75, -8), (1, -10)],                   # the foot on the shin through the air (+ : toes down), added to how it left
        width=0.085, ride=-0.03, bob=0.022, bob_at=0.6, sway=0.042, drop=5.0, hip_yaw=5.5, hip_lean=1.0,
        chest_yaw=6.5, chest_lag=0.05, lean=3.0, chest_tilt=3.2, nod=0.8,
        arm=dict(fwd=18, back=24, out=8, elbow=20, elbow_fwd=14, elbow_back=0, elbow_pass=-6, turn_in=12, skew=0.1, lag=0.03),
        clav=dict(fwd=3.5, up=1.2, shrug=0.5), wrist=10, head_keep=0.75, curl=34),
    'jog': dict(
        v=3.1, steps=2.75, duty=0.325, front=0.28,
        strike=[(0, -4), (0.12, 0), (0.5, 0), (0.82, 36), (1, 58)],
        swing=[(0.26, -0.46, 0.32), (0.48, -0.15, 0.3), (0.64, 0.1, 0.15), (0.87, 0.3, 0.045)],
        ankle=[(0, 0), (0.3, 12), (0.65, -12), (1, -10)],
        width=0.06, ride=-0.07, bob=0.028, bob_at=None, sway=0.014, drop=5.0, hip_yaw=6.0, hip_lean=5.0,
        chest_yaw=8.5, chest_lag=0.07, lean=9.0, chest_tilt=4.5, nod=1.4,
        arm=dict(fwd=30, back=46, out=13, elbow=80, elbow_fwd=14, elbow_back=2, elbow_pass=-14, turn_in=16, skew=0.18, lag=0.035),
        clav=dict(fwd=6.0, up=2.2, shrug=1.5), wrist=12, head_keep=0.8, curl=52),
    'run': dict(
        v=5.6, steps=3.2, duty=0.235, front=0.26,
        strike=[(0, 1), (0.1, 0), (0.42, 0), (0.8, 40), (1, 62)],
        swing=[(0.24, -0.5, 0.42), (0.44, -0.12, 0.42), (0.62, 0.2, 0.2), (0.86, 0.34, 0.055)],
        ankle=[(0, 0), (0.25, 16), (0.65, -10), (1, -10)],
        width=0.05, ride=-0.072, bob=0.028, bob_at=None, sway=0.01, drop=5.5, hip_yaw=8.0, hip_lean=11.0,
        chest_yaw=10.0, chest_lag=0.08, lean=18.0, chest_tilt=5.0, nod=1.8,
        arm=dict(fwd=38, back=55, out=15, elbow=90, elbow_fwd=14, elbow_back=4, elbow_pass=-24, turn_in=16, skew=0.22, lag=0.04),
        clav=dict(fwd=8.5, up=3.2, shrug=2.5), wrist=14, head_keep=0.82, curl=60),
    'sprint': dict(
        v=8.6, steps=4.4, duty=0.2, front=0.2,
        strike=[(0, 9), (0.3, 4), (0.5, 9), (0.82, 42), (1, 60)],
        swing=[(0.22, -0.44, 0.7), (0.42, -0.12, 0.6), (0.6, 0.3, 0.33), (0.85, 0.34, 0.065)],
        ankle=[(0, 0), (0.25, 18), (0.65, -10), (1, -6)],
        width=0.04, ride=-0.07, bob=0.024, bob_at=None, sway=0.008, drop=5.5, hip_yaw=10.0, hip_lean=20.0,
        chest_yaw=13.0, chest_lag=0.085, lean=30.0, chest_tilt=8.5, nod=1.6,
        arm=dict(fwd=55, back=62, out=19, elbow=90, elbow_fwd=18, elbow_back=6, elbow_pass=-34, turn_in=14, skew=0.28, lag=0.045),
        clav=dict(fwd=11.0, up=4.5, shrug=4.0), wrist=16, head_keep=0.8, curl=66),
}

# How each kind of body carries itself, as multipliers on a gait (and a few things of its own).
#   cadence: its steps a second against the gait's (the stride is as much longer or shorter: the pace is the game's);
#   lift: how high the knee drives; back: how far the arm goes back; strike: degrees more onto the ball of the foot as it lands.
STYLES = {
    'wizard': dict(unit=1.0),
    # Plate: fewer, longer strides; heavier in the landing; the shoulders rolling and the pauldrons with them; the arms
    # carried wider and not far back (the plate won't let them); the knees not driven high; a wide track.
    'hero': dict(unit=1.0, cadence=0.92, bob=1.15, chest_yaw=1.1, chest_tilt=1.7, drop=1.15, sway=1.3, arm_out=1.5, arm_swing=0.95, back=0.72, elbow=0.95, clav=1.25, lean=0.95, width=2.7, lift=0.25, kick=0.8, vary=1.1),
    # Lisandra: quicker, shorter steps, landing on the ball of the foot (she's in heels); a narrow track, the elbows in
    # and the hands kept outside the ribs; more in the hips and less in the shoulders.
    'lisandra': dict(unit=1.75, cadence=1.06, bob=0.82, chest_yaw=0.8, chest_tilt=0.75, drop=1.4, hip_yaw=1.35, sway=1.3, arm_out=0.95, arm_swing=0.9, back=0.92, elbow=1.05, clav=0.85, lean=0.88, width=0.7, turn_in=0.35, lift=0.95, kick=1.0, strike=13.0, ground=0.9),
}

STRIDES = 4   # strides in a loop


class Vary:
    """What makes each stride its own: a factor for each step, eased from one step to the next, and a slow drift."""
    def __init__(self, seed, steps):
        self.r = random.Random(seed); self.steps = steps; self.per = {}; self.ph = {}

    def step(self, name, at, amp):
        if name not in self.per: self.per[name] = [self.r.uniform(-1, 1) for _ in range(self.steps)]
        a = self.per[name]; i = int(math.floor(at)) % self.steps; f = at - math.floor(at)
        return 1 + amp * lerp(a[i], a[(i + 1) % self.steps], smooth(f))

    def drift(self, name, t, amp):
        if name not in self.ph: self.ph[name] = [self.r.uniform(0, TAU) for _ in range(3)]
        p = self.ph[name]
        return amp * (0.6 * math.sin(TAU * t + p[0]) + 0.3 * math.sin(TAU * 2 * t + p[1]) + 0.2 * math.sin(TAU * 3 * t + p[2]))


class Gait:
    def __init__(self, rig, name, style, seed=7):
        self.rig = rig; self.g = g = GAITS[name]; self.st = st = dict(style); self.name = name
        self.unit = st.get('unit', 1.0)                           # the game's metres to one of the rig's own units
        self.scale = self.unit
        self.v = g['v'] * st.get('pace', 1.0) / self.unit
        self.steps = g['steps'] * st.get('cadence', 1.0)          # steps a second
        self.duty = min(0.7, g['duty'] * st.get('cadence', 1.0) * st.get('ground', 1.0))  # (as long on the ground, whatever the cadence)
        self.T = 2 / self.steps                                    # a stride, seconds
        self.stride = self.v * self.T                              # and its length, rig units
        self.loop = self.T * STRIDES
        self.frames = round(self.loop * FPS)
        self.vary = Vary(seed + hash(name) % 97, STRIDES * 2)
        self.L = rig.leg
        self._ends = {}

    def m(self, key): return self.st.get(key, 1.0)

    # ---- a foot ----
    def planted(self, u, side):
        """The foot on the ground, u (0..duty) through its stride: the ankle's place (ahead, up) and the foot's pitch."""
        g, rig, L = self.g, self.rig, self.L
        q = u / self.duty
        flat = g['front'] * self.duty * self.stride - u * self.stride      # the ankle ahead of the hip, were the foot flat
        pitch = keyed(g['strike'], q)
        if self.st.get('strike'): pitch += self.st['strike'] * (1 - smooth(q / 0.5))
        ball = rig.ball                                                    # (y: -ahead, z)
        ahead, up = -ball.y, ball.z                                        # the ball from the ankle: ahead, and (negative) up
        c, s = math.cos(math.radians(pitch)), math.sin(math.radians(pitch))
        if pitch >= 0:
            # Over the ball: the ankle = ball + turn(ankle - ball).
            ax, az = -ahead, -up
            return flat + ahead + (ax * c + az * s), rig.ankle_h + up + (-ax * s + az * c), pitch
        # On the heel: a point under and behind the ankle.
        hx, hz = -0.3 * ahead, -rig.ankle_h * 0.92
        ax, az = -hx, -hz
        return flat + hx + (ax * c + az * s), rig.ankle_h + hz + (-ax * s + az * c), pitch

    def foot(self, u, side, hip_h):
        """A foot at u (0..1) through its stride: the ankle (ahead, up), the foot's pitch, how planted it is."""
        g, L = self.g, self.L
        duty = self.duty
        if u < duty:
            a, h, p = self.planted(u, side)
            return a, h, p, 1.0
        w = (u - duty) / (1 - duty)
        e = 1e-3
        a0, h0, p0 = self.planted(duty, side); a0b, h0b, _ = self.planted(duty - e, side)
        a1, h1, p1 = self.planted(0, side); a1b, h1b, _ = self.planted(e, side)
        span = 1 - duty
        t0 = Vector(((a0 - a0b) / e * span * 0.15, (h0 - h0b) / e * span))
        t1 = Vector(((a1b - a1) / e * span, (h1b - h1) / e * span))
        kick = self.m('kick'); lift = self.m('lift')
        knots = [(0, Vector((a0, h0)), t0)]
        for (wk, ax, hz) in g['swing']:
            # (The pass and the knee's drive: lower and shorter for a body that doesn't lift its knees.)
            if 0.35 < wk < 0.75: ax, hz = lerp(ax * 0.5, ax, lift), lerp(min(hz, 0.14), hz, lift)
            knots.append((wk, Vector((ax * L, self.rig.ankle_h + hz * L * (kick if ax < 0 else 1))), None))
        knots.append((1, Vector((a1, h1)), t1))
        p = hermite(knots, w)
        return p.x, max(p.y, self.rig.ankle_h * 0.9), None, 0.0

    # ---- one moment of the loop ----
    def pose(self, t):
        g, rig, st, L, V = self.g, self.rig, self.st, self.L, self.vary
        S = t * STRIDES                       # strides gone
        s = S % 1.0                           # through this stride: 0 the left foot lands
        at = S * 2                            # steps gone
        duty = self.duty
        D = {}
        # -- the hips --
        step = at % 1.0
        low = duty if g['bob_at'] is None else g['bob_at'] + 0.5
        bobk = self.m('bob') * V.step('bob', at, 0.16 * self.m('vary'))
        z = g['ride'] * L - g['bob'] * L * bobk * (wave(step, low) + 0.22 * wave(step * 2, low * 2 + 0.25))
        mid_l = duty * 0.5
        x = g['sway'] * self.m('sway') * L * wave(s, mid_l) + V.drift('sway', t, 0.006 * L)
        yf = 0.012 * L * wave(step, duty * 0.2 + 0.5)           # carried on through the flight, checked in the landing
        hip_yaw = -g['hip_yaw'] * self.m('hip_yaw') * wave(s, -0.03) * V.step('hipyaw', at, 0.12)
        hip_tilt = -g['drop'] * self.m('drop') * wave(s, duty * 0.45, 0.2)
        Dh = yaw(hip_yaw) @ tilt(hip_tilt) @ lean(g['hip_lean'] * self.m('lean'))
        D[rig.hips] = Dh
        hips_at = rig.p0[rig.hips] + Vector((x, -yf, z))
        # -- the chest, against the hips and late --
        lag = g['chest_lag']
        cy = g['chest_yaw'] * self.m('chest_yaw') * wave(s, lag) * V.step('chest', at, 0.16 * self.m('vary')) + V.drift('chestyaw', t, 1.8)
        ct = g['chest_tilt'] * self.m('chest_tilt') * wave(s, duty * 0.5 + 0.03) + V.drift('chesttilt', t, 1.1)
        cl = g['lean'] * self.m('lean') + g['nod'] * wave(step, duty * 0.7 + 0.04) + V.drift('lean', t, 1.2)
        Dc = yaw(cy) @ tilt(ct) @ lean(cl)
        n = len(rig.spine)
        for i, b in enumerate(rig.spine):
            D[b] = Dh.slerp(Dc, [0.3, 0.68, 1.0][i] if n == 3 else (i + 1) / n)
        # -- the head: its own level, a little of the chest's turn, a nod after each landing --
        keep = g['head_keep']
        hy = cy * (1 - keep) * 0.6 + V.drift('heady', t, 2.6)
        ht = ct * (1 - keep) + V.drift('headt', t, 1.2)
        hl = cl * (1 - keep) * 0.9 + 0.5 * g['nod'] * wave(step, duty * 0.7 + 0.1) + V.drift('headl', t, 1.5)
        Dhd = yaw(hy) @ tilt(ht) @ lean(hl)
        for i, b in enumerate(rig.neck):
            D[b] = Dc.slerp(Dhd, (i + 1) / (len(rig.neck) + 1))
        D[rig.head] = Dhd
        # -- the legs --
        info = {'reach': {}}
        for key, d in rig.side.items():
            u = s if key == 'L' else (s + 0.5) % 1.0
            sign = d['sign']
            hip = hips_at + Dh @ (rig.p0[d['thigh']] - rig.p0[rig.hips])
            a, h, pitch, planted = self.foot(u, key, hip.z)
            # Track width, and a little out round the planted leg on the way through.
            sx = sign * (g['width'] * self.m('width') * L + rig.hip_w * 0.12) + (0 if planted else sign * 0.012 * L * math.sin(math.pi * (u - duty) / (1 - duty)))
            ankle = Vector((sx, -a, h))
            to = ankle - hip
            dist = to.length
            reach = (d['l1'] + d['l2']) * 0.996
            info['reach'][key] = dist / (d['l1'] + d['l2'])
            if dist > reach: ankle = hip + to * (reach / dist); to = ankle - hip; dist = reach
            dn = to / dist
            pole = (yaw(hip_yaw * 0.5) @ FWD) + X * sign * 0.06
            perp = pole - dn * pole.dot(dn); perp.normalize()
            l1, l2 = d['l1'], d['l2']
            aa = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist); hh = math.sqrt(max(0.0, l1 * l1 - aa * aa))
            knee = hip + dn * aa + perp * hh
            hinge = perp.cross(dn).normalized()
            u1 = (knee - hip).normalized(); u2 = (ankle - knee).normalized()
            D[d['thigh']] = turn_between(d['thigh_dir'], X, u1, hinge)
            D[d['calf']] = turn_between(d['calf_dir'], X, u2, hinge)
            shin = math.degrees(math.atan2(u2.dot(BACK), u2.dot(DOWN)))
            if pitch is None:
                # In the air: the foot on its shin, eased from how it left the ground to how it'll land.
                e = self._ends.get(key)
                if e is None:
                    e = self._ends[key] = self.ends(key)
                w = (u - duty) / (1 - duty)
                rel = lerp(e[0], e[1], smooth(w)) + keyed(g['ankle'], w) * math.sin(math.pi * min(1, w * 1.0)) ** 0.5
                pitch = shin + rel
                toe = pitch * smooth(w * 4) if w < 0.25 else pitch
            else:
                toe = min(pitch, 0) * 1.0
            Df = yaw(hip_yaw * 0.5) @ rot(X, pitch)
            D[d['foot']] = Df
            D[d['toe']] = yaw(hip_yaw * 0.5) @ rot(X, toe)
        # -- the arms --
        A = g['arm']
        for key, d in rig.side.items():
            sign = d['sign']
            # (The left arm's forward when the right foot lands.)
            ua = (s + (0.5 if key == 'L' else 0.0)) % 1.0
            side_k = 1.07 if key == 'R' else 0.95
            sw = self.m('arm_swing') * side_k * V.step('arm' + key, at + (0 if key == 'L' else 0.5), 0.17 * self.m('vary'))
            wv = wave(ua, A['lag'], A['skew'])
            swing = (A['fwd'] if wv > 0 else A['back'] * self.m('back')) * wv * sw
            mid = 0.0
            # (Out from the ribs all the way round, a little more behind: the fist passes outside the hip, the elbow shows from behind.)
            out = A['out'] * self.m('arm_out') * (1 + 0.2 * max(0.0, -wv)) + (2.0 if key == 'R' else 0.0) + V.drift('out' + key, t, 2.0)
            # The upper arm from the shoulder: down, swung, let out from the ribs.
            ud = rot(BACK, -sign * out) @ (rot(X, -(swing + mid)) @ DOWN)
            # The elbow: shut most as the hand comes up in front, open as it passes the hip.
            late = wave(ua, A['lag'] + 0.04)
            bend = A['elbow'] * self.m('elbow') + A['elbow_fwd'] * max(0.0, late) + A['elbow_back'] * max(0.0, -late) + A['elbow_pass'] * (0.5 + 0.5 * wave(ua * 2, (A['lag'] + 0.3) * 2)) + V.drift('elbow' + key, t, 4.0)
            bend = max(4.0, bend + (5.0 if key == 'R' else -2.0) * min(1.0, A['elbow'] / 60))
            fperp = FWD - ud * FWD.dot(ud)
            if fperp.length < 0.2: fperp = UP - ud * UP.dot(ud)
            fperp.normalize()
            # (In front the forearm comes in as far as under his own chin, never across the chest; behind, not at all.)
            turn_in = A['turn_in'] * self.m('turn_in') * (0.5 + 0.5 * wv)
            fperp = Quaternion(ud, math.radians(sign * turn_in)) @ fperp       # the forearm brought in across the body
            ld = ud * math.cos(math.radians(bend)) + fperp * math.sin(math.radians(bend))
            # Into the chest's frame (the arms hang from it), most of the way: the swing stays his own.
            Dcs = Quaternion().slerp(Dc, 0.8)
            ud = Dcs @ ud; ld = Dcs @ ld
            hinge = ud.cross(ld).normalized()
            Du = turn_between(d['upper_dir'], d['arm_hinge'], ud, hinge)
            Dl = turn_between(d['lower_dir'], d['arm_hinge'], ld, hinge)
            # The collarbone: forward with the arm, up at the top of the back swing, and a breath of a shrug in each landing.
            C = g['clav']; ck = self.m('clav')
            cl_late = wave(ua, A['lag'] + 0.03, A['skew'])
            prot = C['fwd'] * ck * cl_late
            elev = C['up'] * ck * max(0.0, -cl_late) ** 1.5 + C['shrug'] * ck * (0.5 + 0.5 * wave(step, duty * 0.6 + 0.08)) + C['up'] * 0.35 * ck * max(0.0, cl_late) ** 2
            D[d['clav']] = Dc @ rot(UP, -sign * prot) @ rot(BACK, -sign * elev)
            # (The collarbone carries the arm: what it's turned, the arm was going to be turned anyway, so take it off.)
            D[d['upper']] = Du; D[d['lower']] = Dl
            # The hand drags behind the forearm, and hangs a little off its line.
            vel = wave(ua, A['lag'] + 0.25 + 0.06, A['skew'])                  # (how fast the arm's going forward, late)
            wr = g['wrist'] * vel
            D[d['hand']] = Quaternion(hinge, math.radians(-wr)) @ Dl @ rot(d['lower_dir'], 0)
            curl = g['curl'] + V.drift('curl' + key, t, 4.0)
            Dp = D[d['hand']]
            for fi, chain in enumerate(d['fingers']):
                Dk = Dp
                for k, b in enumerate(chain):
                    dirv = rig_dir(rig, b, chain, k)
                    ax = dirv.cross(d['palm']).normalized()
                    Dk = Dk @ rot(ax, curl * (0.82 + 0.09 * fi) * (1.0, 1.05, 0.75)[min(k, 2)])
                    D[b] = Dk
            Dk = Dp
            for k, b in enumerate(d['thumb']):
                dirv = rig_dir(rig, b, d['thumb'], k)
                n2 = (d['palm'] * 0.5 + d['lower_dir'] * 0.2 + BACK * 0.6).normalized()
                ax = dirv.cross(n2)
                if ax.length < 1e-4: ax = d['arm_hinge']
                Dk = Dk @ rot(ax.normalized(), (0.0, curl * 0.3, curl * 0.45)[min(k, 2)])
                D[b] = Dk
        return D, hips_at, info

    def ends(self, key):
        """How the foot sits on its shin as it leaves the ground, and as it lands (degrees, + : toes down)."""
        out = []
        for u in (self.duty - 1e-4, 0.0):
            s = u if key == 'L' else (u + 0.5) % 1.0
            # (A pose at that moment, the foot planted.)
            saved = self._ends.get(key); self._ends[key] = (0, 0)
            D, _, _ = self.pose_at_stride(s)
            self._ends[key] = saved
            d = self.rig.side[key]
            u2 = (D[d['calf']] @ d['calf_dir'])
            shin = math.degrees(math.atan2(u2.dot(BACK), u2.dot(DOWN)))
            pitch = keyed(self.g['strike'], 1.0 if u > 0.01 else 0.0) + (0.0 if u > 0.01 else self.st.get('strike', 0.0))
            out.append(pitch - shin)
        return out

    def pose_at_stride(self, s): return self.pose(s / STRIDES)


def rig_dir(rig, b, chain, k):
    p = rig.p0
    if k + 1 < len(chain): v = p[chain[k + 1]] - p[b]
    else: v = p[b] - p[chain[k - 1]]
    return v.normalized()


def use_action(arm, act):
    if not arm.animation_data: arm.animation_data_create()
    arm.animation_data.action = act
    try:
        if act.slots: arm.animation_data.action_slot = act.slots[0]
    except Exception: pass
    return act


def bake(rig, name, style, action=None, seed=7):
    """The gait as an action on the rig's armature: a loop of STRIDES strides, its last frame its first again."""
    arm = rig.arm
    gait = Gait(rig, name, style, seed)
    aname = action or name
    old = bpy.data.actions.get(aname)
    if old: bpy.data.actions.remove(old)
    act = bpy.data.actions.new(aname)
    use_action(arm, act)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    n = gait.frames
    worst = 0
    for f in range(n + 1):
        D, at, info = gait.pose((f % n) / n)
        worst = max(worst, max(info['reach'].values()))
        rig.apply(D, at, f)
    use_action(arm, act)
    # (Neighbouring keys on the same side of the sphere, or the curves spin the long way round between them.)
    for fc in fcurves(act): pass
    fix_flips(arm, act, n)
    act.frame_range = (0, n); act.use_frame_range = True
    act['gait'] = name; act['loop_s'] = gait.loop; act['stride_m'] = gait.stride * gait.scale; act['speed'] = gait.g['v']; act['travel'] = gait.stride * STRIDES
    bpy.context.scene.frame_start = 0; bpy.context.scene.frame_end = n
    return dict(action=aname, frames=n, loop=round(gait.loop, 3), stride_units=round(gait.stride, 3), travel_units=round(gait.stride * STRIDES, 3), worst_reach=round(worst, 3))


def fcurves(act):
    out = []
    try:
        for layer in act.layers:
            for strip in layer.strips:
                for bag in strip.channelbags: out += list(bag.fcurves)
    except Exception:
        out = list(getattr(act, 'fcurves', []))
    return out


def fix_flips(arm, act, n):
    by = {}
    for fc in fcurves(act):
        if fc.data_path.endswith('rotation_quaternion'): by.setdefault(fc.data_path, [None] * 4)[fc.array_index] = fc
    for path, fcs in by.items():
        if any(f is None for f in fcs): continue
        prev = None
        for i in range(len(fcs[0].keyframe_points)):
            q = [fcs[c].keyframe_points[i].co[1] for c in range(4)]
            if prev and sum(a * b for a, b in zip(q, prev)) < 0:
                q = [-v for v in q]
                for c in range(4):
                    kp = fcs[c].keyframe_points[i]; kp.co[1] = q[c]; kp.handle_left[1] = q[c]; kp.handle_right[1] = q[c]
            prev = q
        for f in fcs:
            for kp in f.keyframe_points: kp.interpolation = 'LINEAR'
            f.update()


def sample(rig, action, bones, step=1.0):
    arm = rig.arm
    act = bpy.data.actions[action]
    use_action(arm, act)
    f0, f1 = act.frame_range
    sc = bpy.context.scene
    out = []; f = f0
    while f <= f1 + 1e-6:
        sc.frame_set(int(f), subframe=f - int(f))
        out.append({b: ((arm.pose.bones[b].matrix).translation.copy(), arm.pose.bones[b].matrix.to_quaternion()) for b in bones})
        f += step
    return out


def measure(rig, action, unit=1.0, fps=FPS):
    """What a clip measures, for the review and for me: printed, and returned."""
    L, R = rig.side['L'], rig.side['R']
    bones = [rig.hips, rig.spine[-1], rig.head] + [d[k] for d in (L, R) for k in ('upper', 'lower', 'hand', 'thigh', 'calf', 'foot', 'toe', 'clav')]
    S = sample(rig, action, bones)[:-1]
    n = len(S); dur = n / fps
    col = lambda b, i: [r[b][0][i] for r in S]
    rng = lambda v: max(v) - min(v)
    out = {'frames': n, 'seconds': round(dur, 3)}
    d = [r[L['foot']][0].y - r[R['foot']][0].y for r in S]
    steps = sum(1 for i in range(n) if (d[i] <= 0) != (d[(i + 1) % n] <= 0))
    out['steps'] = steps; out['steps_per_min'] = round(steps / dur * 60)
    lo = min(min(col(L['toe'], 2)), min(col(R['toe'], 2)))
    air = sum(1 for r in S if min(r[L['toe']][0].z, r[R['toe']][0].z) > lo + 0.035 * rig.leg and min(r[L['foot']][0].z, r[R['foot']][0].z) > rig.ankle_h + 0.03 * rig.leg)
    out['airborne_pct'] = round(100 * air / n)
    def line(a, b):
        ya, ro = [], []
        for r in S:
            v = r[a][0] - r[b][0]
            ya.append(math.degrees(math.atan2(-v.y, v.x))); ro.append(math.degrees(math.atan2(v.z, math.hypot(v.x, v.y))))
        return ya, ro
    ya, ro = line(L['upper'], R['upper']); out['shoulder_line_yaw'] = round(rng(ya), 1); out['shoulder_line_roll'] = round(rng(ro), 1)
    ya, ro = line(L['thigh'], R['thigh']); out['hip_line_yaw'] = round(rng(ya), 1); out['hip_line_roll'] = round(rng(ro), 1)
    for key, dd in (('L', L), ('R', R)):
        rel = []
        for r in S:
            p, q = r[rig.spine[-1]]
            rel.append(q.inverted() @ (r[dd['upper']][0] - p))
        out[f'{key}_shoulder_in_chest_cm'] = [round(rng([v[i] for v in rel]) * 100 * unit, 1) for i in range(3)]
        el, sw = [], []
        for r in S:
            u = (r[dd['lower']][0] - r[dd['upper']][0]).normalized(); l = (r[dd['hand']][0] - r[dd['lower']][0]).normalized()
            el.append(math.degrees(u.angle(l))); sw.append(math.degrees(math.atan2(-u.y, -u.z)))
        out[f'{key}_elbow_bend'] = [round(min(el)), round(max(el))]; out[f'{key}_upperarm_swing'] = [round(min(sw)), round(max(sw))]
        kn = []
        for r in S:
            u = (r[dd['calf']][0] - r[dd['thigh']][0]).normalized(); l = (r[dd['foot']][0] - r[dd['calf']][0]).normalized(); kn.append(math.degrees(u.angle(l)))
        out[f'{key}_knee_bend'] = [round(min(kn)), round(max(kn))]
        out[f'{key}_ankle_top'] = round(max(col(dd['foot'], 2)) / rig.leg, 2)
    le = []
    for r in S:
        v = r[rig.spine[-1]][0] - r[rig.hips][0]; le.append(math.degrees(math.atan2(-v.y, v.z)))
    out['trunk_lean'] = [round(min(le), 1), round(max(le), 1)]
    k = 100 * unit
    out['hip_bob_cm'] = round(rng(col(rig.hips, 2)) * k, 1); out['head_bob_cm'] = round(rng(col(rig.head, 2)) * k, 1); out['hip_sway_cm'] = round(rng(col(rig.hips, 0)) * k, 1)
    hy = [math.degrees(math.atan2(-(r[rig.head][1] @ X).y, (r[rig.head][1] @ X).x)) for r in S]
    out['head_yaw'] = round(rng(hy), 1)
    # The worst jump of any hand or foot from one frame to the next, against its own average (a pop shows as a big ratio).
    pops = {}
    for b in (L['hand'], R['hand'], L['foot'], R['foot'], rig.head):
        sp = [(S[(i + 1) % n][b][0] - S[i][b][0]).length for i in range(n)]
        acc = [abs(sp[(i + 1) % n] - sp[i]) for i in range(n)]
        pops[b] = round(max(acc) / (sum(sp) / n + 1e-9), 2)
    out['worst_jerk'] = max(pops.values())
    # A planted foot's slide: while a toe is on the ground it should go back at the pace of the clip.
    act = bpy.data.actions[action]
    if 'travel' in act:
        v = act['travel'] / dur
        worst = 0
        for dd in (L, R):
            for i in range(n):
                a, b = S[i][dd['toe']][0], S[(i + 1) % n][dd['toe']][0]
                fa, fb = S[i][dd['foot']][0], S[(i + 1) % n][dd['foot']][0]
                # (Flat on the ground: the ball down and the ankle no higher than it stands.)
                if a.z < lo + 0.012 * rig.leg and b.z < lo + 0.012 * rig.leg and fa.z < rig.ankle_h + 0.012 * rig.leg and fb.z < rig.ankle_h + 0.012 * rig.leg:
                    worst = max(worst, abs((b.y - a.y) * fps - v) / v)
        out['plant_slide_pct'] = round(worst * 100)
    for k_, v_ in out.items(): print(f'  {k_}: {v_}')
    return out


class _NS: pass
G = _NS()
for _k, _v in list(globals().items()):
    if not _k.startswith('_'): setattr(G, _k, _v)
bpy.app.driver_namespace['gait'] = G
