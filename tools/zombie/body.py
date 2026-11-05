"""Pose solver for the zombie rig. Run inside Blender.

Poses are written as a delta from the T-pose in armature axes: +X the zombie's left, -Y forward,
+Z up. So rx(+) leans forward, ry(+) leans left, rz(+) turns left. Legs and arms are two-bone IK
on pure hinges: feet come from a plan of plants on a floor that moves past them, so a stance foot
cannot slide, and hands are placed relative to the shoulder, so the arm drives them and the wrist
only follows.
"""
import math

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

FPS = 30
DIGITS = ("index", "middle", "ring", "pinky", "thumb")
FINGER_SCALE = {"index": .85, "middle": 1, "ring": 1.08, "pinky": 1.15, "thumb": .7}
UP, FWD = Vector((0, 0, 1)), Vector((0, -1, 0))
SWIVEL_RATE = math.radians(9)  # per frame


def rx(d):
    return Quaternion((1, 0, 0), math.radians(d))


def ry(d):
    return Quaternion((0, 1, 0), math.radians(d))


def rz(d):
    return Quaternion((0, 0, 1), math.radians(d))


def euler(pitch=0, roll=0, yaw=0):
    return rz(yaw) @ ry(roll) @ rx(pitch)


def frame(a, h):
    a = a.normalized()
    h = (h - a * a.dot(h)).normalized()
    return Matrix((a, h, a.cross(h))).transposed()


def smooth(t):
    t = min(max(t, 0), 1)
    return t * t * (3 - 2 * t)


def bump(s, peak=.5):
    """0 at both ends, 1 at `peak`."""
    a = peak / (1 - peak)
    return (s ** a * (1 - s)) / (peak ** a * (1 - peak)) if 0 < s < 1 else 0


def curve(n, keys, loop=False):
    """Monotone cubic through (frame, value) keys, sampled at frames 0..n: no overshoot past a key."""
    keys = sorted(keys)
    if loop:
        keys = [(f - n, v) for f, v in keys[-2:]] + keys + [(f + n, v) for f, v in keys[:2]]
    if len(keys) == 1:
        return np.full(n + 1, float(keys[0][1]))
    x = np.array([k[0] for k in keys], dtype=float)
    y = np.array([k[1] for k in keys], dtype=float)
    h, d = np.diff(x), np.diff(y) / np.diff(x)
    m = np.zeros_like(y)
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(y) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    out = np.zeros(n + 1)
    for f in range(n + 1):
        if f <= x[0]:
            out[f] = y[0]
        elif f >= x[-1]:
            out[f] = y[-1]
        else:
            i = int(np.searchsorted(x, f, side="right") - 1)
            t = (f - x[i]) / h[i]
            out[f] = (y[i] * (2 * t ** 3 - 3 * t ** 2 + 1) + m[i] * h[i] * (t ** 3 - 2 * t ** 2 + t)
                      + y[i + 1] * (-2 * t ** 3 + 3 * t ** 2) + m[i + 1] * h[i] * (t ** 3 - t ** 2))
    return out


def vcurve(n, keys, loop=False):
    """curve() for vector keys: returns an (n+1, k) array."""
    return np.stack([curve(n, [(f, v[i]) for f, v in keys], loop) for i in range(len(keys[0][1]))], axis=1)


def spring(sig, hz=3.0, damp=.45, loop=True, steps=4):
    """A second-order follower: lags the signal, overshoots after a jolt, then settles."""
    sig = np.asarray(sig, dtype=float)
    n = len(sig) - 1
    w, dt = 2 * math.pi * hz, 1 / (FPS * steps)
    x, v, out = sig[0], 0.0, np.zeros(n + 1)
    for lap in range(4 if loop else 1):
        for f in range(n + 1 if not loop else n):
            for k in range(steps):
                g = f + k / steps
                i = int(g)
                target = sig[i] + (sig[min(i + 1, n)] - sig[i]) * (g - i)
                v += (w * w * (target - x) - 2 * damp * w * v) * dt
                x += v * dt
            out[f] = x
    if loop:
        out[n] = out[0]
    return out


def wave(n, cycles, phase=0, amp=1.0):
    return amp * np.sin(2 * math.pi * (cycles * np.arange(n + 1) / n + phase))


class Plant:
    """One foot on the floor from `strike` to `lift`, then swinging to the next plant."""

    def __init__(self, strike, lift, y, x, yaw=0, hs=-12, to=28, height=.07, peak=.45, flat=.18, heel=.55, drag=False, swing_end=.5, out=0):
        self.__dict__.update(locals())
        del self.__dict__["self"]


def floor_at(speed):
    return lambda f: speed * f / FPS


def foot_track(n, plants, floor, loop=True):
    """Per frame: ball position on the floor plane, lift, pitch (+ heel up), yaw, and how flat the toes lie."""
    out = []
    count = len(plants)
    for f in range(n + 1):
        hit = None
        for shift in ((-n, 0, n) if loop else (0,)):
            for i, p in enumerate(plants):
                s0, l0 = p.strike + shift, p.lift + shift
                if s0 <= f < l0:
                    w = (f - s0) / (l0 - s0)
                    if w < p.flat:
                        phi = p.hs * (1 - smooth(w / p.flat))
                    elif w > p.heel:
                        phi = p.to * smooth((w - p.heel) / (1 - p.heel)) ** 1.3
                    else:
                        phi = 0
                    hit = dict(x=p.x, y=p.y + floor(f) - floor(s0), z=0, phi=phi, yaw=p.yaw, flat=1, stance=True)
                    break
                nxt = plants[(i + 1) % count]
                s1 = nxt.strike + shift + (n if i + 1 == count and loop else 0)
                if i + 1 == count and not loop:
                    continue
                if l0 <= f < s1:
                    t, span = (f - l0) / (s1 - l0), s1 - l0
                    y0 = p.y + floor(l0) - floor(s0)
                    vel = (floor(f + 1) - floor(f)) * span
                    h00, h10 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t
                    h01, h11 = -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
                    y = y0 * h00 + vel * h10 + nxt.y * h01 + vel * p.swing_end * h11
                    q = smooth(t)
                    if p.drag:
                        phi = p.to + (nxt.hs - p.to) * smooth((t - .75) / .25)
                        hit = dict(x=p.x + (nxt.x - p.x) * q + p.out * bump(t), y=y, z=0, phi=phi, yaw=p.yaw + (nxt.yaw - p.yaw) * q, flat=1, stance=False)
                    else:
                        phi = p.to + (nxt.hs - p.to) * smooth(t * 1.15)
                        flat = 1 - smooth(t * 3)
                        z = p.height * bump(t, p.peak)
                        toe = max(phi * (1 - flat), 0)
                        z = max(z, .09 * math.sin(math.radians(toe)) * bump(t, .5) ** .4)
                        hit = dict(x=p.x + (nxt.x - p.x) * q + p.out * bump(t), y=y, z=z, phi=phi, yaw=p.yaw + (nxt.yaw - p.yaw) * q, flat=flat, stance=False)
                    break
            if hit:
                break
        if not hit:
            raise ValueError(f"frame {f} has no plant")
        out.append(hit)
    return out


class Body:
    def __init__(self, arm, mesh):
        self.arm = arm
        bones = arm.data.bones
        self.par = {b.name: b.parent.name if b.parent else None for b in bones}
        self.qr = {b.name: b.matrix_local.to_quaternion() for b in bones}
        self.P = {b.name: b.head_local.copy() for b in bones}
        self.order = sorted(self.P, key=lambda n: len(bones[n].parent_recursive))
        self.clamps = 0
        self.swivel = {}
        self.legs, self.arms, self.digits = {}, {}, {}
        for s, sign in (("l", 1), ("r", -1)):
            A, B, T = self.P[f"foot_{s}"], self.P[f"ball_{s}"], self.P[f"ball_leaf_{s}"]
            hip, knee = self.P[f"thigh_{s}"], self.P[f"calf_{s}"]
            d = B - A
            psi = math.degrees(math.atan2(d.x, -d.y))
            d2 = T - B
            psi_toe = math.degrees(math.atan2(d2.x, -d2.y))
            un = rz(-psi)
            g = mesh.vertex_groups[f"foot_{s}"].index
            heel_y = max((un @ (v.co - B)).y for v in mesh.data.vertices if v.co.z < .035 and any(e.group == g and e.weight > .3 for e in v.groups))
            self.legs[s] = dict(l1=(knee - hip).length, l2=(A - knee).length, psi=psi, psi_toe=psi_toe, ball_z=B.z,
                                ankle=un @ (A - B), heel=Vector((0, heel_y, -B.z)),
                                f_t=frame(knee - hip, FWD), f_c=frame(A - knee, FWD))
            sh, el, wr = self.P[f"upperarm_{s}"], self.P[f"lowerarm_{s}"], self.P[f"hand_{s}"]
            h0 = Vector((0, 0, -sign))
            palm = Vector((0, 0, -1))
            fore = (wr - el).normalized()
            self.arms[s] = dict(sign=sign, l1=(el - sh).length, l2=(wr - el).length, f_u=frame(el - sh, h0), f_f=frame(wr - el, h0),
                                flex=fore.cross(palm).normalized(), axis=fore, dev=palm)
            base = (self.P[f"middle_02_{s}"] + self.P[f"middle_01_{s}"]) / 2
            for d_name in DIGITS:
                chain = [f"{d_name}_01_{s}", f"{d_name}_02_{s}", f"{d_name}_03_{s}", f"{d_name}_04_leaf_{s}"]
                axes = []
                for a, b in zip(chain, chain[1:]):
                    v = self.P[b] - self.P[a]
                    to = (base + palm * .03 - self.P[a]) if d_name == "thumb" else palm
                    axes.append(v.cross(to).normalized())
                self.digits[(s, d_name)] = (chain, axes)

    def begin(self):
        self.D = {"root": Quaternion()}
        self.H = {"root": self.P["root"].copy()}

    def put(self, name, q):
        p = self.par[name]
        self.D[name] = q
        self.H[name] = self.H[p] + self.D[p] @ (self.P[name] - self.P[p])

    def trunk(self, offset, pelvis, spine, neck, head):
        self.D["pelvis"] = pelvis
        self.H["pelvis"] = self.P["pelvis"] + Vector(offset)
        q = pelvis
        for name, r in zip(("spine_01", "spine_02", "spine_03"), spine):
            q = q @ r
            self.put(name, q)
        q = q @ neck
        self.put("neck_01", q)
        self.put("Head", q @ head)

    def foot(self, s, t, pole=None):
        c = self.legs[s]
        yaw = rz(t["yaw"])
        ball = Vector((t["x"], t["y"], c["ball_z"] + t["z"]))
        if t["phi"] >= 0:
            ankle = ball + yaw @ rx(t["phi"]) @ c["ankle"]
        else:
            heel = ball + yaw @ c["heel"]
            ankle = heel + yaw @ rx(t["phi"]) @ (c["ankle"] - c["heel"])
        if pole is None:
            pole = yaw @ FWD
        self.solve_leg(s, ankle, pole)
        self.put(f"foot_{s}", yaw @ rx(t["phi"]) @ rz(-c["psi"]))
        self.put(f"ball_{s}", yaw @ rx(t["phi"] * (1 - t["flat"])) @ rz(-c["psi_toe"]))
        self.put(f"ball_leaf_{s}", self.D[f"ball_{s}"])

    def solve_leg(self, s, ankle, pole):
        c = self.legs[s]
        self.put(f"thigh_{s}", Quaternion())
        hip = self.H[f"thigh_{s}"]
        d = ankle - hip
        length, reach = d.length, c["l1"] + c["l2"]
        if length > reach * .999:
            self.clamps += 1
            length = reach * .999
        dn = d.normalized()
        x = (c["l1"] ** 2 - c["l2"] ** 2 + length ** 2) / (2 * length)
        y = math.sqrt(max(c["l1"] ** 2 - x * x, 0))
        n = (pole - dn * dn.dot(pole)).normalized()
        knee = hip + dn * x + n * y
        self.put(f"thigh_{s}", (frame(knee - hip, n) @ c["f_t"].transposed()).to_quaternion())
        self.put(f"calf_{s}", (frame(hip + dn * length - knee, n) @ c["f_c"].transposed()).to_quaternion())

    def arm_to(self, s, off, pole, flex=0, dev=0, twist=0, curl=(25, 30, 20), thumb=None, shrug=1.0):
        """Place the hand at `off` from the shoulder, in armature axes, with the elbow towards `pole`."""
        c = self.arms[s]
        chest = self.D["spine_03"]
        off = Vector(off)
        v = chest.inverted() @ off.normalized()
        elev = 20 * max(v.z + .25, 0) * shrug
        prot = 16 * max(-v.y, -.3) * shrug
        self.put(f"clavicle_{s}", chest @ ry(-c["sign"] * elev) @ rz(-c["sign"] * prot))
        self.put(f"upperarm_{s}", self.D[f"clavicle_{s}"])
        shoulder = self.H[f"upperarm_{s}"]
        length = min(off.length, (c["l1"] + c["l2"]) * .998)
        dn = off.normalized()
        pole = Vector(pole)
        n = self.swivel_towards(s, dn, (pole - dn * dn.dot(pole)).normalized())
        x = (c["l1"] ** 2 - c["l2"] ** 2 + length ** 2) / (2 * length)
        y = math.sqrt(max(c["l1"] ** 2 - x * x, 0))
        elbow = shoulder + dn * x + n * y
        h = n.cross(dn)
        self.put(f"upperarm_{s}", (frame(elbow - shoulder, h) @ c["f_u"].transposed()).to_quaternion())
        self.put(f"lowerarm_{s}", (frame(shoulder + dn * length - elbow, h) @ c["f_f"].transposed()).to_quaternion())
        hand = self.D[f"lowerarm_{s}"] @ Quaternion(c["axis"], math.radians(twist)) @ Quaternion(c["flex"], math.radians(flex)) @ Quaternion(c["dev"], math.radians(dev))
        self.put(f"hand_{s}", hand)
        self.fingers(s, curl, thumb)

    def swivel_towards(self, s, dn, want):
        """Carry the elbow's plane over from the last frame, turning it towards `want` at a limited rate.

        Taking the pole fresh each frame flips the upper arm as the hand sweeps past it.
        """
        prev = self.swivel.get(s)
        if prev is None:
            self.swivel[s] = want
            return want
        prev = (prev - dn * dn.dot(prev)).normalized()
        gap = prev.angle(want)
        if gap > SWIVEL_RATE:
            axis = prev.cross(want)
            want = Quaternion(axis if axis.length > 1e-4 else dn, SWIVEL_RATE) @ prev
        self.swivel[s] = want
        return want

    def fingers(self, s, curl, thumb=None):
        for d_name in DIGITS:
            chain, axes = self.digits[(s, d_name)]
            scale = FINGER_SCALE[d_name]
            amount = thumb if d_name == "thumb" and thumb is not None else curl
            q = self.D[f"hand_{s}"]
            for name, axis, angle in zip(chain, axes, amount):
                q = q @ Quaternion(axis, math.radians(angle * scale))
                self.put(name, q)
            self.put(chain[3], q)

    def output(self):
        quats = {}
        for n in self.order:
            p = self.par[n]
            dp = self.D.get(p, Quaternion()) if p else Quaternion()
            d = self.D.get(n, dp)
            quats[n] = self.qr[n].inverted() @ dp.inverted() @ d @ self.qr[n]
        return quats, self.qr["pelvis"].inverted() @ (self.H["pelvis"] - self.P["pelvis"])


def linear_mode():
    return bpy.types.Keyframe.bl_rna.properties["interpolation"].enum_items["LINEAR"].value


def write_action(name, poses):
    """poses: a list of (quats, pelvis location), one per frame from 0."""
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    slot = act.slots.new("OBJECT", "rig")
    bag = act.layers.new("anim").strips.new(type="KEYFRAME").channelbag(slot, ensure=True)
    count = len(poses)
    frames = np.arange(count, dtype=np.float32)
    mode = linear_mode()

    def key(path, index, group, values):
        fc = bag.fcurves.new(path, index=index, group_name=group)
        fc.keyframe_points.add(count)
        fc.keyframe_points.foreach_set("co", np.stack([frames, values], axis=1).ravel())
        fc.keyframe_points.foreach_set("interpolation", [mode] * count)
        fc.update()

    for bone in poses[0][0]:
        q = np.array([list(p[0][bone]) for p in poses], dtype=np.float32)
        for i in range(1, count):
            if q[i] @ q[i - 1] < 0:
                q[i] = -q[i]
        path = f'pose.bones["{bone}"].rotation_quaternion'
        for i in range(4):
            key(path, i, bone, q[:, i])
    loc = np.array([list(p[1]) for p in poses], dtype=np.float32)
    for i in range(3):
        key('pose.bones["pelvis"].location', i, "pelvis", loc[:, i])
    return act
