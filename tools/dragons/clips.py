"""The Elder Dragon Gods' clips, and the GLBs that carry them.

    python tools/dragons/clips.py                 # all four dragons, every clip -> art/dragons/anim/dragon_<color>.glb
    python tools/dragons/clips.py green fly roar  # one dragon, some clips (for looking at)

Every clip is a set of drivers (tools/dragons/dragonanim.py) timed for a dragon some twenty metres long, after
docs in the research notes: the size lives in long anticipations, held poses, slow settles and slow wings (a beat is never
under a second), while blows themselves stay quick. Feet that are down stay down; left and right never quite mirror.

Units: the model's (the dragon stands about 0.54 tall, its hips 0.22 off the ground); times in seconds.
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from dragonanim import (ID, LEGS, Clip, K, Skel, loopwobble, settle, sine, smooth, solve, window, wobble)  # noqa: E402
from glbio import Out, load  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
RIGGED = os.path.join(ROOT, 'art', 'dragons', 'rigged')
OUT = os.path.join(ROOT, 'art', 'dragons', 'anim')
FPS = 30
CLIPS = {}


def clip(fn):
    CLIPS[fn.__name__] = fn
    return fn


# ---- helpers -----------------------------------------------------------------------------------------------------------

def leg_scale():
    """The hind legs' length on the dragon the clips are being built for, against the green's (the clips' measure)."""
    sk = SK_NOW[0]
    if sk is None:
        return 1.0
    n = lambda a, b: np.linalg.norm(sk.pos[sk.ix[b]] - sk.pos[sk.ix[a]])      # noqa: E731
    return float(np.clip((n('thigh_L', 'shin_L') + n('shin_L', 'meta_L')) / 0.1826, 0.8, 1.2))


def S2(t, a, b):
    return smooth(t, a, b)


def gait(c, T, v, duty, lift_f, lift_h, offs=None, heel=22, curl=0.4, stride=1.0, fheel=1.2, tilt=30):
    """Feet that step in the elephant's order (left hind, left fore, right hind, right fore), each planted where it lands
    while the body walks on over it at v."""
    offs = offs or {'HL': 0.0, 'FL': 0.25, 'HR': 0.5, 'FR': 0.75}
    Ls = v * T * stride
    c.add('z', lambda t: v * np.asarray(t, float))
    for k, o in offs.items():
        lift = lift_f if k[0] == 'F' else lift_h

        def phase(t, o=o):
            ph = np.asarray(t, float) / T - o
            n = np.floor(ph)
            return n, ph - n

        def zf(t, o=o, phase=phase):
            n, p = phase(t)
            z_td = v * (n + o) * T + Ls * duty / 2 - (Ls - v * T) * 0
            u = np.clip((p - duty) / (1 - duty), 0, 1)
            e = u * u * (3 - 2 * u)
            return np.where(p < duty, z_td, z_td + Ls * e) - v * T * 0

        def yf(t, phase=phase, lift=lift):
            _, p = phase(t)
            u = np.clip((p - duty) / (1 - duty), 0, 1)
            return np.where(p < duty, 0.0, lift * np.sin(np.pi * u))

        def heelf(t, phase=phase):
            _, p = phase(t)
            u = np.clip((p - duty) / (1 - duty), 0, 1)
            return np.where(p < duty, heel * S2(p, duty - 0.22, duty), heel * (1 - S2(u, 0.45, 0.95)))

        def curlf(t, phase=phase):
            _, p = phase(t)
            u = np.clip((p - duty) / (1 - duty), 0, 1)
            return np.where(p < duty, -0.15 * S2(p, duty - 0.1, duty), curl * np.sin(np.pi * u) - 0.15 * (1 - S2(u, 0.0, 0.25)))

        def tiltf(t, phase=phase):
            # carried through the air the paw hangs, toes down, and comes level just before it lands
            _, p = phase(t)
            u = np.clip((p - duty) / (1 - duty), 0, 1)
            return np.where(p < duty, 0.0, tilt * S2(u, 0.08, 0.4) * (1 - S2(u, 0.65, 0.95)))

        c.add(f'{k}_z', zf)
        c.add(f'{k}_y', yf)
        c.add(f'{k}_curl', curlf)
        c.add(f'{k}_heel', heelf if k[0] == 'H' else (lambda t, f=heelf: f(t) * fheel))
        c.add(f'{k}_tilt', tiltf if k[0] == 'F' else (lambda t, f=tiltf: f(t) * 0.5))


def flap(T, top, bot, down=0.6, fold=0.55, sw_dn=8.0, sw_up=-8.0, phase=0.0):
    """One wing's beat: (stroke, fold, sweep) over time. The downstroke takes `down` of the beat, broad; the upstroke the
    rest, folded at elbow and wrist."""
    def ph(t):
        return (np.asarray(t, float) / T + phase) % 1.0

    def stroke(t):
        p = ph(t)
        u1, u2 = p / down, (p - down) / (1 - down)
        return np.where(p < down, top + (bot - top) * (1 - np.cos(np.pi * u1)) / 2, bot + (top - bot) * (1 - np.cos(np.pi * u2)) / 2)

    def foldf(t):
        # in and out again smoothly: a fold that set off or arrived at speed would snap every finger after it
        p = ph(t)
        u2 = np.clip((p - down) / (1 - down), 0, 1)
        return np.where(p >= down, fold * np.sin(np.pi * u2) ** 2, 0.0)

    # forward on the downstroke, back on the up; the back swing's size follows from the forward one's so the two meet at
    # one speed (sw_up gives only its direction)
    sw_back = -sw_dn * (1 - down) / down

    def sweep(t):
        p = ph(t)
        u1, u2 = np.clip(p / down, 0, 1), np.clip((p - down) / (1 - down), 0, 1)
        return np.where(p < down, sw_dn * np.sin(np.pi * u1), sw_back * np.sin(np.pi * u2))
    return stroke, foldf, sweep


def wings_flap(c, T, top=55, bot=-35, down=0.6, fold=0.55, sw=(8, -8), env=None, lagR=1 / 30, ampR=0.95, base=None, heave=0.012, pitch=1.6):
    """Both wings beating (the right a frame behind and a touch smaller), the body rising on each downstroke."""
    env = env or (lambda t: np.ones_like(np.asarray(t, float)))
    base = base or {}
    for S, lag, amp in (('L', 0.0, 1.0), ('R', lagR, ampR)):
        mid = (top + bot) / 2
        st, fo, sw_ = flap(T, mid + (top - mid) * amp, mid + (bot - mid) * amp, down, fold * amp, sw[0] * amp, sw[1] * amp)
        b_st, b_s, b_sw = base.get('stroke', 0.0), base.get('spread', 0.0), base.get('sweep', 0.0)
        c.add(f'w{S}_stroke', lambda t, st=st, lag=lag, b=b_st: env(t) * st(np.asarray(t) - lag) + (1 - env(t)) * b)
        c.add(f'w{S}_fold', lambda t, fo=fo, lag=lag: env(t) * fo(np.asarray(t) - lag))
        c.add(f'w{S}_spread', lambda t, fo=fo, lag=lag, b=b_s: env(t) * (1 - fo(np.asarray(t) - lag)) + (1 - env(t)) * b)
        c.add(f'w{S}_sweep', lambda t, sw_=sw_, lag=lag, b=b_sw: env(t) * sw_(np.asarray(t) - lag) + (1 - env(t)) * b)
    # the body rises on the downstroke, a little after it, and sinks on the upstroke
    c.add('y', lambda t: env(t) * -heave * np.cos(2 * np.pi * (np.asarray(t) / T - 0.12 - down * 0.5)))
    c.add('pitch', lambda t: env(t) * -pitch * np.cos(2 * np.pi * (np.asarray(t) / T - 0.2 - down * 0.5)))
    c.set('w_lag', T / 7)


def wings_pose(c, spread=0.0, stroke=0.0, sweep=0.0, fold=0.0, sides='LR'):
    for S in sides:
        for k, v in (('spread', spread), ('stroke', stroke), ('sweep', sweep), ('fold', fold)):
            c.add(f'w{S}_{k}', v)


def legs_tucked(c, front=1.0, hind=1.0, env=None, curl=0.7):
    """In the air: forefeet drawn up tight against the chest, hind feet trailing straight back under the tail."""
    env = env or (lambda t: np.ones_like(np.asarray(t, float)))
    for S in 'LR':
        c.add(f'F{S}_follow', lambda t: env(t))
        c.add(f'H{S}_follow', lambda t: env(t))
        c.add(f'F{S}_by', lambda t: env(t) * 0.1 * front)
        c.add(f'F{S}_bz', lambda t: env(t) * -0.05 * front)
        c.add(f'F{S}_tilt', lambda t: env(t) * 70 * front)
        c.add(f'F{S}_curl', lambda t: env(t) * (curl + 0.2))
        c.add(f'H{S}_by', lambda t: env(t) * 0.075 * hind)
        c.add(f'H{S}_bz', lambda t: env(t) * -0.16 * hind)
        c.add(f'H{S}_tilt', lambda t: env(t) * 85 * hind)
        c.add(f'H{S}_heel', lambda t: env(t) * 55 * hind)
        c.add(f'H{S}_curl', lambda t: env(t) * curl * 0.8)


def step_round(c, yaw, steps, about='hips', lift_f=0.035, lift_h=0.028, feet=None):
    """Turning on the spot: the body turns by yaw(t) (degrees) about its hips (or its middle); each foot holds its place on
    the ground and steps round to where it belongs under the turned body during its own steps, [(foot, t0, t1), ...],
    lifted up and over. A foot with no steps stays put and turns on its ball."""
    sk = SK_NOW[0]
    piv = sk.pos[sk.ix['hips']] if about == 'hips' else sk.pivot
    c.set('pivot_h', 1.0 if about == 'hips' else 0.0)
    for k, (S, part) in LEGS.items():
        if feet and k not in feet:
            continue
        rest = sk.pos[sk.ix[('hand_' if part == 'front' else 'foot_') + S]]
        v = rest - piv
        mine = sorted((t0, t1) for (kk, t0, t1) in steps if kk == k)
        lift = lift_f if part == 'front' else lift_h

        def ang(t, mine=mine):
            t = np.asarray(t, float)
            a = np.zeros_like(t)
            prev = 0.0
            for (t0, t1) in mine:
                to = float(yaw(np.array([t1]))[0])
                a = np.where(t >= t0, prev + (to - prev) * S2(t, t0, t1), a)
                prev = to
            return a if mine else yaw(t)

        r = lambda t, ang=ang: np.radians(ang(t))      # noqa: E731
        c.add(f'{k}_x', lambda t, v=v, r=r: v[0] * np.cos(r(t)) + v[2] * np.sin(r(t)) - v[0])
        c.add(f'{k}_z', lambda t, v=v, r=r: -v[0] * np.sin(r(t)) + v[2] * np.cos(r(t)) - v[2])
        c.add(f'{k}_turn', lambda t, ang=ang: ang(t) / np.where(np.abs(yaw(t)) > 0.5, yaw(t), 1e9))
        for (t0, t1) in mine:
            c.add(f'{k}_y', lambda t, t0=t0, t1=t1, lift=lift: lift * np.sin(np.pi * np.clip((np.asarray(t) - t0) / (t1 - t0), 0, 1)))
            c.add(f'{k}_curl', lambda t, t0=t0, t1=t1: 0.35 * np.sin(np.pi * np.clip((np.asarray(t) - t0) / (t1 - t0), 0, 1)))
            c.add(f'{k}_heel', lambda t, t0=t0, t1=t1, p=part: (14 if p == 'front' else 22) * np.sin(np.pi * np.clip((np.asarray(t) - t0) / (t1 - t0), 0, 1)))


def breathe(c, T, amp=1.2, rise=0.0018):
    """Slow breath: the chest lifts and the neck after it. Inhale a little quicker than exhale."""
    def b(t):
        p = (np.asarray(t, float) / T) % 1.0
        return np.where(p < 0.45, (1 - np.cos(np.pi * p / 0.45)) / 2, (1 + np.cos(np.pi * (p - 0.45) / 0.55)) / 2)
    c.add('breath', lambda t: amp * b(t))
    c.add('y', lambda t: rise * b(np.asarray(t) - 0.15))
    c.add('nk_pitch', lambda t: amp * 0.8 * b(np.asarray(t) - 0.25))


def impact(c, t0, depth=0.012, shake=0.8, dur=0.9):
    """A heavy blow landing: the body dips through a few frames, a shudder runs through it, and it settles."""
    c.add('y', K((t0 - 0.01, 0), (t0 + 0.12, -depth), (t0 + 0.45, depth * 0.15), (t0 + dur, 0)))
    c.add('tremor', lambda t: shake * np.exp(-np.clip(np.asarray(t) - t0, 0, None) / 0.25) * (np.asarray(t) > t0))
    c.add('nk_pitch', settle(t0 + 0.03, -6, 0.35, 0.9))
    c.add('tl_pitch', settle(t0 + 0.08, -8, 0.4, 1.0))


def stance(c, low=0.0, splay=0.0, tail=0.35, wings=0.0):
    # the forelegs stand all but straight in the model's own pose: a little lower and they have give in them
    c.add('y', -low - 0.006)
    for k in LEGS:
        c.add(f'{k}_splay', splay)
    c.add('tl_straight', tail)
    if wings:
        wings_pose(c, spread=wings * 0.25, stroke=wings * 12)


def mirror_clip(c, name):
    """The same move off the other side (drivers named for one side swapped, sideways ones flipped)."""
    m = Clip(name, c.dur, c.loop, **c.info)
    flip = ('yaw', 'roll', 'x', 'sp_yaw', 'sp_roll', 'nk_yaw', 'nk_roll', 'hd_yaw', 'hd_roll', 'tl_yaw', 'hp_yaw', 'hp_roll', 'hd_wyaw')
    for key, fs in c.d.items():
        k2 = key
        if key[:2] in ('FL', 'FR', 'HL', 'HR'):
            k2 = key[0] + ('R' if key[1] == 'L' else 'L') + key[2:]
        elif key[:2] in ('wL', 'wR'):
            k2 = 'w' + ('R' if key[1] == 'L' else 'L') + key[2:]
        sign = -1 if key in flip or (key[:2] in ('FL', 'FR', 'HL', 'HR') and key.endswith('_x')) else 1
        for f in fs:
            m.d.setdefault(k2, []).append((lambda t, f=f, s=sign: s * f(t)))
    return m


def delay(f, dt):
    return lambda t: f(np.asarray(t, float) - dt)


# ---- on the ground -----------------------------------------------------------------------------------------------------

@clip
def idle():
    c = Clip('idle', 12.0, loop=True)
    breathe(c, 4.0)
    stance(c, tail=0.12)
    c.add('tl_wave', 7)
    c.set('tl_wave_T', 6.0)
    # a look to its left and back, eyes first: the head turns, holds, comes home
    look = K((0, 0), (4.6, 0), (5.5, 30), (7.3, 34), (8.4, 0), (12, 0))
    c.add('hd_yaw', look)
    c.add('nk_yaw', lambda t: 0.45 * look(np.asarray(t) - 0.15))
    c.add('hd_pitch', K((0, 0), (4.6, 0), (5.5, 6), (7.3, 4), (8.4, 0), (12, 0)))
    # once a loop the weight moves over and back
    c.add('x', K((0, 0), (9.0, 0), (10.0, 0.006), (11.2, 0.006), (12, 0)))
    c.add('hp_roll', K((0, 0), (9.0, 0), (10.0, 1.5), (11.2, 1.5), (12, 0)))
    # a wing re-tucks
    for S, d in (('L', 0.0), ('R', 0.06)):
        c.add(f'w{S}_stroke', K((0, 0), (2.4 + d, 0), (2.75 + d, 6), (3.4 + d, -1), (3.9 + d, 0), (12, 0)))
        c.add(f'w{S}_ripple', window(2.5, 2.8, 3.4, 4.2))
    c.add('jaw', K((0, 0), (8.6, 0), (9.0, 0.08), (9.6, 0), (12, 0)))
    c.add('sp_yaw', loopwobble(12, 3, 3, 1.2))
    return c


@clip
def idle_alert():
    """Fighting stance: low, legs wide, head down and forward, tail lashing, breathing harder."""
    c = Clip('idle_alert', 6.0, loop=True)
    breathe(c, 2.0, amp=2.0, rise=0.003)
    stance(c, low=0.012, splay=0.35, tail=0.6, wings=0.6)
    c.add('nk_pitch', -16)
    c.add('hd_pitch', 9)
    c.add('nk_s', 6)
    c.add('jaw', lambda t: 0.12 + 0.06 * np.sin(2 * np.pi * np.asarray(t) / 3.0))
    c.add('tl_wave', 16)
    c.set('tl_wave_T', 3.0)
    c.add('tl_pitch', 6)
    c.add('hd_yaw', loopwobble(6, 11, 3, 9))
    c.add('nk_yaw', loopwobble(6, 12, 2, 6))
    c.add('x', loopwobble(6, 13, 2, 0.004))
    for S in 'LR':
        c.add(f'w{S}_ripple', 0.6)
    return c


@clip
def walk():
    c = Clip('walk', 2.0, loop=True)
    T, v = 2.0, 0.1
    gait(c, T, v, 0.68, 0.035, 0.03, heel=20)
    stance(c, low=0.018, tail=0.55)
    # the body bobs twice a stride, shoulders and hips a quarter apart, and sways over the planted side
    c.add('y', sine(T / 2, 0.005, 0.25))
    c.add('pitch', sine(T / 2, 0.8, 0.0))
    c.add('x', sine(T, 0.006, 0.1))
    c.add('hp_yaw', sine(T, 3.5, 0.0))
    c.add('sp_yaw', sine(T, -6, 0.0))
    c.add('hp_roll', sine(T, 2.0, 0.1))
    c.add('nk_pitch', sine(T / 2, 1.8, 0.62))
    c.add('nk_reach', -12)
    c.add('hd_pitch', 4)
    c.add('nk_yaw', sine(T, 3, 0.25))
    c.add('tl_wave', 9)
    c.set('tl_wave_T', 2.0)
    for S in 'LR':
        c.add(f'w{S}_stroke', sine(T / 2, 1.5, 0.45 if S == 'L' else 0.5))
    c.info['speed'] = v
    return c


@clip
def run():
    """The charge: an elephant's fast amble, no flight phase, head low on the target, tail straight back."""
    c = Clip('run', 1.25, loop=True)
    # (the stride by the length of its hind legs: the undead's are a seventh shorter than the green's, and the green's
    # stride on them folded the knee shut and threw it straight again in a frame or two)
    r = leg_scale()
    T, v = 1.25, 0.3 * r
    gait(c, T, v, 0.48, 0.06 * r, 0.055 * r, heel=30, curl=0.6)
    stance(c, low=0.032, tail=0.92)
    c.add('y', sine(T / 2, 0.012, 0.3))
    c.add('pitch', sine(T / 2, 2.0, 0.05))
    c.add('pitch', -4)
    c.add('hp_yaw', sine(T, 3.0, 0.0))
    c.add('sp_yaw', sine(T, -5, 0.0))
    c.add('sp_pitch', sine(T / 2, 3.0, 0.15))
    # the head down low and out ahead on the target, from the neck's root, held level: a bull's, not a horse's
    c.add('nk_reach', -38)
    c.add('nk_pitch', -6)
    c.add('nk_pitch', sine(T / 2, 3.0, 0.55))
    c.add('hd_pitch', 20)
    c.add('hd_pitch', sine(T / 2, -2.5, 0.6))
    c.add('jaw', 0.18)
    c.add('tl_wave', 5)
    c.set('tl_wave_T', 1.25)
    c.add('tl_pitch', 4)
    # the wings folded tight on its back, bouncing a little with the stride
    for S, ph in (('L', 0.4), ('R', 0.45)):
        c.add(f'w{S}_stroke', sine(T / 2, 3, ph))
    c.info['speed'] = v
    return c


@clip
def charge_start():
    """The charge's warning, a bull's: it rocks back on its haunches, the head goes down low on the target, a forefoot
    scrapes twice out to the side where it can be seen, a snort, and the weight goes forward into the run."""
    c = Clip('charge_start', 1.6)
    stance(c, splay=0.25, tail=K((0, 0.4), (1.6, 0.9)))
    c.add('nk_reach', K((0, 0), (0.45, -30), (1.3, -36), (1.6, -38)))
    c.add('nk_pitch', K((0, 0), (0.45, -6), (1.6, -6)))
    c.add('hd_pitch', K((0, 0), (0.5, 18), (1.6, 20)))
    c.add('y', K((0, 0), (0.5, -0.014), (1.3, -0.02), (1.6, -0.016)))
    c.add('pitch', K((0, 0), (0.5, 3), (1.15, 3.5), (1.6, -6)))
    c.add('z', K((0, 0), (0.5, -0.016), (1.2, -0.018), (1.6, 0.012)))
    # the right forefoot rakes back twice, out wide of the chest
    c.add('FR_x', K((0, 0), (0.35, -0.022), (1.12, -0.022), (1.3, 0)))
    c.add('FR_y', K((0, 0), (0.35, 0), (0.5, 0.03), (0.68, 0.004, 's'), (0.8, 0.026), (0.98, 0.003, 's'), (1.12, 0)))
    c.add('FR_z', K((0, 0), (0.35, 0), (0.5, 0.035), (0.68, -0.024, 's'), (0.8, 0.03), (0.98, -0.026, 's'), (1.12, 0)))
    c.add('FR_curl', K((0, 0), (0.45, -0.3), (0.68, 0.6), (0.8, -0.2), (0.98, 0.6), (1.2, 0)))
    c.add('FR_splay', K((0, 0), (0.35, 0.6), (1.12, 0.6), (1.3, 0.25)))
    c.add('jaw', K((0, 0), (1.05, 0), (1.15, 0.25), (1.35, 0.05), (1.6, 0.15)))
    c.add('tremor', K((0, 0), (1.05, 0), (1.12, 0.8), (1.4, 0)))
    c.add('tl_wave', 10)
    c.set('tl_wave_T', 1.6)
    wings_pose(c, spread=K((0, 0), (1.6, 0.2)), stroke=K((0, 0), (1.6, -6)))
    return c


@clip
def roar():
    c = Clip('roar', 4.6)
    stance(c, tail=K((0, 0.3), (1.2, 0.5), (1.6, 0.85), (3.6, 0.85), (4.6, 0.4)))
    # anticipation: head back and down, chest fills, forefeet wide, wings lift; the roar goes up, then the head comes
    # down and out at whoever it's roaring at, mouth open at them, for its second half
    c.add('nk_pitch', K((0, 0), (1.1, -10, 'f'), (1.5, 26), (2.3, 20), (2.75, -4), (3.4, -6), (4.3, -2), (4.6, 0)))
    c.add('nk_reach', K((0, 0), (1.1, 6), (1.5, 0), (2.3, 0), (2.75, -30), (3.4, -32), (4.3, -4), (4.6, 0)))
    c.add('nk_s', K((0, 0), (1.1, 14), (1.5, -4), (3.4, -2), (4.6, 0)))
    c.add('hd_pitch', K((0, 0), (1.1, -8, 'f'), (1.55, 16), (2.3, 12), (2.75, 26), (3.4, 24), (4.3, 0)))
    c.info['aim'] = [2.6, 3.6]
    c.add('breath', K((0, 0), (1.1, 4), (1.5, 2), (3.4, -1), (4.6, 0)))
    c.add('y', K((0, 0), (1.1, -0.008), (1.5, 0.006), (3.4, 0.004), (4.6, 0)))
    c.add('pitch', K((0, 0), (1.1, -2), (1.5, 5), (3.4, 4), (4.6, 0)))
    for S in 'LR':
        c.add(f'{"F" + S}_splay', K((0, 0), (1.0, 0.4), (4.6, 0.2)))
    c.add('jaw', K((0, 0), (1.15, 0.12), (1.5, 1.0), (3.35, 0.95), (3.95, 0.25), (4.05, 0.0, 's'), (4.6, 0)))
    c.add('tremor', K((0, 0), (1.45, 0), (1.6, 1.4), (3.2, 1.1), (3.6, 0)))
    c.add('hd_yaw', K((0, 0), (1.6, 0), (2.4, 14), (3.2, -10), (3.8, 0)))
    c.add('nk_yaw', K((0, 0), (1.6, 0), (2.5, 6), (3.3, -5), (3.9, 0)))
    for S, d in (('L', 0.0), ('R', 0.05)):
        c.add(f'w{S}_spread', K((0, 0), (1.1 + d, 0.12), (1.6 + d, 0.8), (3.4 + d, 0.75), (4.4 + d, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (1.1 + d, 8), (1.6 + d, 32), (3.4 + d, 28), (4.4 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (1.6 + d, 10), (3.4 + d, 6), (4.4 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (1.6, 0.4), (3.4, 0.3), (4.0, 1.5), (4.6, 0)))
    c.set('w_lag', 0.24)
    c.add('tl_pitch', K((0, 0), (1.5, 18), (3.4, 14), (4.6, 0)))
    return c


@clip
def bite():
    c = Clip('bite', 2.5, hit=1.08)
    stance(c, tail=0.45)
    # coil: the whole neck drawn back from its root into an S, the weight back on the haunches, jaw opening; then the
    # chest drives forward and down, the forefoot steps into it, and the head arrives last, low, mouth open at you
    c.add('nk_reach', K((0, 0), (0.85, 22, 'f'), (1.06, -38, 's'), (1.35, -35), (2.2, -4), (2.5, 0)))
    c.add('nk_pitch', K((0, 0), (0.85, 8, 'f'), (1.06, -4, 's'), (1.35, -4), (2.2, 0), (2.5, 0)))
    c.add('nk_s', K((0, 0), (0.85, 22, 'f'), (1.05, -4), (1.35, 0), (2.5, 0)))
    c.add('hd_pitch', K((0, 0), (0.7, -2), (0.97, 38), (1.22, 37), (2.1, 0)))      # (the head's keys lead: it moves after the neck)
    c.info['aim'] = [0.9, 1.45]
    c.add('jaw', K((0, 0), (0.6, 0.45), (0.98, 1.0), (1.08, 0.0, 's'), (2.5, 0)))
    c.add('z', K((0, 0), (0.85, -0.022, 'f'), (1.06, 0.062), (1.35, 0.058), (2.3, 0)))
    c.add('y', K((0, 0), (0.85, -0.004), (1.06, -0.02), (1.35, -0.018), (2.3, 0)))
    c.add('pitch', K((0, 0), (0.85, 4), (1.06, -7), (1.4, -6), (2.3, 0)))
    c.add('sp_pitch', K((0, 0), (0.85, 4), (1.06, -6), (1.4, -5), (2.3, 0)))
    # the left forefoot steps forward under the lunge, and back after
    c.add('FL_z', K((0, 0), (0.8, 0), (1.04, 0.05), (1.75, 0.05), (2.15, 0)))
    c.add('FL_y', K((0, 0), (0.8, 0), (0.92, 0.03), (1.04, 0, 's'), (1.75, 0), (1.95, 0.025), (2.15, 0)))
    c.add('FR_z', K((0, 0), (1.04, 0), (1.85, 0.0)))
    c.add('HL_heel', K((0, 0), (0.95, 0), (1.1, 14), (1.6, 12), (2.2, 0)))
    c.add('HR_heel', K((0, 0), (0.95, 0), (1.1, 16), (1.6, 14), (2.2, 0)))
    # the shake of a bite that caught something
    c.add('hd_roll', lambda t: 9 * np.sin(2 * np.pi * (np.asarray(t) - 1.35) / 0.32) * window(1.33, 1.4, 1.62, 1.8)(t))
    c.add('nk_yaw', lambda t: 4 * np.sin(2 * np.pi * (np.asarray(t) - 1.4) / 0.32) * window(1.35, 1.42, 1.62, 1.82)(t))
    c.add('tl_yaw', K((0, 0), (0.85, -10), (1.2, 12), (2.5, 0)))
    c.add('tremor', K((0, 0), (1.06, 0), (1.1, 0.7), (1.4, 0)))
    wings_pose(c, spread=K((0, 0), (0.85, 0.15), (1.1, 0.3), (2.5, 0)), stroke=K((0, 0), (1.1, 12), (2.5, 0)))
    c.info['through'] = [1.02, 1.16]
    return c


def claw_r_clip(name='claw_r', d=0.0, amp=1.0):
    """The right forepaw: the weight goes onto the other three, the paw rises high and back, the chest turns into the
    swing first and the arm follows, a wide flat sweep across and a slam down in front of its own chest. The other three
    stay on the ground the whole time: the chest doesn't rear (a dragon's legs are nearly straight under it, so a chest
    lifted even a little lifts the paw it's standing on), it leans onto the support paw instead."""
    c = Clip(name, 2.7, hit=1.18 + d)
    stance(c, tail=0.5)
    t1, t2, t3 = 1.0 + d, 1.18 + d, 1.45 + d
    tu = t1 - 0.28          # up by here, and held there (a quarter of a second, to be seen) until t1
    # weight off the right fore and over the others; the body rears a little and leans away from the raised paw
    c.add('x', K((0, 0), (0.7, 0.016), (t1, 0.018, 'f'), (t3, -0.004), (2.2, 0)))
    c.add('roll', K((0, 0), (0.75, 5 * amp), (t1, 6 * amp, 'f'), (t2, -3 * amp), (t3, -3), (2.4, 0)))
    c.add('yaw', K((0, 0), (0.85, -14 * amp, 'f'), (t1 + 0.06, -6), (t2, 12 * amp), (t3 + 0.1, 15 * amp), (2.5, 0)))
    c.add('sp_yaw', K((0, 0), (0.85, -10 * amp), (t1, -10 * amp, 'f'), (t2 - 0.04, 14 * amp), (t3, 10), (2.4, 0)))
    c.add('pitch', K((0, 0), (tu, 2), (t1, 2.5, 'f'), (t2, -3), (t3, -4), (2.4, 0)))
    c.add('y', K((0, 0), (tu, -0.006), (t1, -0.006), (t3 - 0.02, -0.01, 's'), (2.4, 0)))
    c.add('pivot_h', 0.6)
    # the paw: up high and out wide, as high as its shoulder, elbow cocked out, claws open; held; then across, low and
    # fast; then down in front of the chest, past the middle of it
    c.add('FR_follow', K((0, 0), (0.3, 0.2), (tu, 0.4), (t1, 0.4), (t3, 0.0), (2.7, 0)))
    c.add('FR_x', K((0, 0), (0.3, -0.02), (tu, -0.1 * amp), (t1, -0.105 * amp, 'f'), (t2, 0.02), (t2 + 0.1, 0.09 * amp), (t3, 0.12 * amp, 'f'), (2.0, 0.12 * amp), (2.5, 0)))
    c.add('FR_y', K((0, 0), (0.3, 0.08), (tu, 0.27 * amp), (t1, 0.28 * amp, 'f'), (t2, 0.11), (t2 + 0.1, 0.05), (t3, 0.0, 's'), (1.95, 0.0), (2.2, 0.03), (2.5, 0)))
    c.add('FR_z', K((0, 0), (0.3, 0.02), (tu, -0.02), (t1, -0.025, 'f'), (t2, 0.15 * amp), (t2 + 0.1, 0.15), (t3, 0.12, 'f'), (2.0, 0.12), (2.5, 0)))
    c.add('FR_tilt', K((0, 0), (tu, -40), (t1, -42, 'f'), (t2, 10), (t3, 0), (2.7, 0)))
    c.add('FR_curl', K((0, 0), (tu, -0.9), (t1, -0.95, 'f'), (t2, 0.5), (t3, 0.1), (2.2, 0)))
    c.add('FR_spread', K((0, 0), (tu, 1.0), (t1, 1.0), (t2, 0.6), (t3, 0), (2.7, 0)))
    c.add('FR_splay', K((0, 0), (tu, 1.1), (t1, 1.1), (t2, 0.2), (2.7, 0)))
    c.add('FR_scap', K((0, 0), (tu, 24), (t1, 25), (t2, -8), (t3, 0), (2.4, 0)))
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (tu, 10), (t1, 10), (t3, 0)))
    # eyes on the target; tail the other way
    c.add('hd_yaw', K((0, 0), (0.6, 10 * amp), (t2, -6), (t3, -10), (2.5, 0)))
    c.add('nk_yaw', K((0, 0), (0.85, 12 * amp), (t2, -4), (2.5, 0)))
    c.add('nk_pitch', K((0, 0), (t1, 6), (t2, -8), (t3, -10), (2.5, 0)))
    c.add('jaw', K((0, 0), (t1 - 0.2, 0.3), (t2, 0.55), (t3 + 0.2, 0.1), (2.5, 0)))
    c.add('tl_yaw', K((0, 0), (t1, 40 * amp), (t3 + 0.1, -35 * amp), (2.6, 0)))
    c.set('tl_lag', 0.05)
    c.add('tremor', K((0, 0), (t3 - 0.02, 0), (t3 + 0.03, 0.9), (t3 + 0.4, 0)))
    for S, w in (('L', 0.9), ('R', 1.0)):
        c.add(f'w{S}_spread', K((0, 0), (t1, 0.3 * w), (t2, 0.45 * w), (2.7, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (t1, 20 * w), (t2, 4), (2.7, 0)))
    c.info['through'] = [t2 - 0.08, t3]
    return c


@clip
def claw_r():
    return claw_r_clip()


@clip
def claw_l():
    return mirror_clip(claw_r_clip('claw_l', d=0.07, amp=0.94), 'claw_l')


@clip
def claw_slam():
    """Rears onto the hind legs, the tail a third leg, hangs at the top, then both forefeet and the chest come down with a
    wing-beat behind them."""
    c = Clip('claw_slam', 4.2, hit=2.25)
    c.add('tl_level', 0.45)
    c.add('pivot_h', 1.0)           # it rears about its hips, over its hind feet, which stay where they are
    stance(c, tail=0.7)
    ta, tb, th = 1.4, 1.85, 2.25
    c.add('pitch', K((0, 0), (0.35, -2), (ta, 36, 'f'), (tb, 40, 'f'), (th, -6, 's'), (th + 0.25, -3), (3.6, 0)))
    c.add('y', K((0, 0), (0.35, -0.01), (ta, 0.018), (tb, 0.022), (th, -0.004, 's'), (4.2, 0)))
    c.add('z', K((0, 0), (0.45, 0), (ta, -0.012), (tb, -0.01), (th, 0.012, 's'), (4.0, 0)))
    for S, sg in (('L', 1), ('R', -1)):
        # both forelimbs up above the shoulders and wide apart at the top, claws spread, where the front can see them
        c.add(f'F{S}_follow', K((0, 0), (0.3, 0.0), (0.75, 0.75), (ta, 0.95), (tb, 0.95), (th - 0.1, 0.4), (th, 0.0, 's'), (4.2, 0)))
        c.add(f'F{S}_by', K((0, 0), (ta, 0.07), (tb, 0.085), (th - 0.12, 0.02), (th, 0)))
        c.add(f'F{S}_bz', K((0, 0), (ta, 0.035), (tb, 0.04), (th, 0)))
        c.add(f'F{S}_bx', K((0, 0), (ta, 0.045 * sg), (tb, 0.05 * sg), (th - 0.1, 0.01 * sg), (th, 0)))
        c.add(f'F{S}_z', K((0, 0), (0.55, 0), (ta, 0.1), (th, 0.11, 's'), (3.4, 0.11), (3.9, 0.0)))
        c.add(f'F{S}_y', K((0, 0), (3.4, 0), (3.6, 0.025), (3.9, 0)))
        c.add(f'F{S}_tilt', K((0, 0), (ta, -20), (tb, -30), (th - 0.1, 10), (th, 0), (4.2, 0)))
        c.add(f'F{S}_curl', K((0, 0), (ta, -0.9), (tb, -1.0), (th, 0.3, 's'), (th + 0.3, -0.2), (4.0, 0)))
        c.add(f'F{S}_spread', K((0, 0), (tb, 1), (th, 0.9), (4.0, 0)))
        c.add(f'F{S}_splay', K((0, 0), (ta, 0.8), (tb, 0.9), (th, 0.6), (4.2, 0)))
        c.add(f'F{S}_scap', K((0, 0), (ta, 18), (tb, 22), (th, -6), (th + 0.4, 0)))
        # up on the balls of the hind feet as it rears
        c.add(f'H{S}_heel', K((0, 0), (ta, 26), (tb, 30), (th, 8), (th + 0.5, 0)))
    # the tail presses the ground as the third leg
    c.add('tl_pitch', K((0, 0), (ta, -18), (tb, -20), (th + 0.15, 10), (th + 0.6, -6), (4.2, 0)))
    c.add('nk_pitch', K((0, 0), (ta, 18, 'f'), (tb, 22, 'f'), (th + 0.08, -12, 's'), (th + 0.35, -8), (3.2, -2), (4.2, 0)))
    c.add('nk_reach', K((0, 0), (tb, 0), (th + 0.08, -26, 's'), (th + 0.35, -18), (3.2, -6), (4.2, 0)))
    c.add('nk_pitch', settle(th + 0.35, 6, 0.45, 1.0))
    c.add('hd_pitch', K((0, 0), (tb, -2), (th + 0.12, 8, 's'), (3.4, -2), (4.2, 0)))
    c.add('jaw', K((0, 0), (ta, 0.6), (tb, 0.9), (th, 0.7), (th + 0.4, 0.2), (4.0, 0)))
    for S, d in (('L', 0.0), ('R', 0.04)):
        c.add(f'w{S}_spread', K((0, 0), (ta + d, 0.6), (tb + d, 0.85), (th + d, 0.9), (th + 0.5 + d, 0.45), (3.9 + d, 0)))
        # the beat behind the slam goes down and back, not into the floor
        c.add(f'w{S}_stroke', K((0, 0), (ta + d, 30), (tb + d, 50, 'f'), (th + d, -6, 'f'), (th + 0.5 + d, 8), (3.9 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (tb + d, 14), (th + d, -24), (3.9, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (th, 0), (th + 0.3, 1.2), (3.9, 0)))
    c.set('w_lag', 0.21)
    impact(c, th, depth=0.016, shake=1.4)
    c.info['through'] = [th - 0.05, th + 0.1]
    return c


@clip
def claw_rake():
    """Left, right, both: a combo out of a half-rear, each blow given its own weight (the third, with both, the heaviest)."""
    c = Clip('claw_rake', 4.2, hit=1.18)
    stance(c, tail=0.6, splay=0.2)
    c.add('pivot_h', 0.7)
    hits = (1.18, 1.9, 2.65)
    c.add('pitch', K((0, 0), (0.75, 13, 'f'), (hits[0], 6), (hits[1] - 0.3, 12), (hits[1], 8), (hits[2] - 0.3, 14, 'f'), (hits[2] + 0.06, -4), (3.8, 0)))
    c.add('y', K((0, 0), (0.75, 0.01), (hits[1], 0.01), (hits[2] + 0.06, -0.006), (3.8, 0)))
    c.add('yaw', K((0, 0), (0.75, 8), (hits[0], -14), (hits[1] - 0.25, -6), (hits[1], 14), (hits[2], 0), (3.9, 0)))
    c.add('sp_yaw', K((0, 0), (0.75, 10), (hits[0], -16), (hits[1], 16), (hits[2], 0), (3.8, 0)))
    for S, (ts, sgn) in (('L', (hits[0], 1)), ('R', (hits[1], -1))):
        ts0 = ts - 0.42
        c.add(f'F{S}_follow', K((0, 0), (0.5, 0.3), (ts0, 0.35), (ts, 0.2), (hits[2] - 0.38, 0.3), (hits[2] - 0.02, 0.0), (3.6, 0)))
        c.add(f'F{S}_x', K((0, 0), (ts0, 0.06 * sgn, 'f'), (ts, -0.045 * sgn), (ts + 0.15, -0.05 * sgn), (hits[2] - 0.12, 0.0), (hits[2], 0.0)))
        c.add(f'F{S}_y', K((0, 0), (0.5, 0.06), (ts0, 0.16, 'f'), (ts, 0.07), (ts + 0.2, 0.1), (hits[2] - 0.26, 0.14, 'f'), (hits[2] - 0.03, 0.008), (hits[2] + 0.05, 0.0), (3.6, 0)))      # (down hard, not stopped dead)
        o = 0.14 if S == 'R' else 0.0
        c.add(f'F{S}_z', K((0, 0), (0.5, 0.03), (ts0, 0.0, 'f'), (ts, 0.14), (ts + 0.2, 0.15), (hits[2] - 0.12, 0.12), (hits[2], 0.12, 's'), (3.45 + o, 0.12), (3.85 + o, 0.0)))
        c.add(f'F{S}_y', K((0, 0), (3.45 + o, 0), (3.65 + o, 0.03), (3.85 + o, 0)))
        c.add(f'F{S}_curl', K((0, 0), (ts0, -0.9), (ts, 0.6), (ts + 0.2, -0.5), (hits[2], 0.3), (3.8, 0)))
        c.add(f'F{S}_spread', K((0, 0), (ts0, 1), (ts, 0.5), (hits[2], 0.8), (3.8, 0)))
        c.add(f'F{S}_tilt', K((0, 0), (ts0, -30), (ts, 15), (hits[2], 0), (4.0, 0)))
        c.add(f'H{S}_heel', K((0, 0), (0.7, 12), (hits[2], 10), (hits[2] + 0.4, 0)))
    c.add('hd_yaw', K((0, 0), (hits[0], 8), (hits[1], -8), (hits[2], 0), (4.2, 0)))
    c.add('nk_pitch', K((0, 0), (0.7, 8), (hits[2], -6), (4.2, 0)))
    c.add('nk_reach', K((0, 0), (0.7, 0), (hits[2], -22), (3.4, -10), (4.2, 0)))
    c.add('hd_pitch', K((0, 0), (hits[2], 10), (3.4, 4), (4.2, 0)))
    c.add('jaw', K((0, 0), (0.6, 0.5), (hits[2], 0.8), (3.4, 0.1), (4.2, 0)))
    c.add('tl_yaw', K((0, 0), (hits[0], 30), (hits[1], -30), (hits[2], 0), (4.2, 0)))
    wings_pose(c, spread=K((0, 0), (0.7, 0.4), (hits[2], 0.6), (4.2, 0)), stroke=K((0, 0), (0.7, 24), (hits[2], 4), (4.2, 0)), sweep=K((0, 0), (hits[2], -16), (4.2, 0)))
    impact(c, hits[2], depth=0.012, shake=1.0)
    c.info['through'] = [hits[0] - 0.08, hits[2] + 0.05]
    return c


@clip
def pounce():
    """A crouch, a leap and a landing on its forefeet. The clip leaps in place: the fight carries the body over the ground
    between leap[0] and leap[1] (as far as it means to jump), so the feet come down where the body is."""
    tl, ta, tg = 1.05, 1.75, 2.32
    c = Clip('pounce', 3.6, hit=tg, leap=[tl + 0.12, tg])
    stance(c, tail=K((0, 0.5), (1.0, 0.8), (3.6, 0.5)))
    # down deep on its haunches, chest to the ground, then up and over
    c.add('y', K((0, 0), (tl - 0.05, -0.052, 'f'), (tl + 0.28, 0.06), (ta, 0.13), (tg, 0.0, 's'), (tg + 0.18, -0.02), (3.1, 0), (3.6, 0)))
    c.add('z', K((0, 0), (tl, -0.028), (tl + 0.3, 0.0)))
    c.add('pitch', K((0, 0), (tl, -8, 'f'), (tl + 0.25, 16), (ta, 2), (tg - 0.05, -10), (tg + 0.2, -4), (3.4, 0)))
    c.add('nk_reach', K((0, 0), (tl, -24), (tl + 0.3, -10), (tg, -20), (2.8, -6), (3.6, 0)))
    c.add('hd_world', K((0, 0), (0.5, 1), (tg, 1), (2.8, 0)))
    c.add('hd_wpitch', K((0, 0), (0.6, -12), (tg, -16), (2.8, 0)))
    c.add('nk_pitch', K((0, 0), (tl, -18), (ta, -10), (tg, -20), (2.7, -4), (3.6, 0)))
    c.add('nk_pitch', settle(tg + 0.05, -8, 0.4, 0.9))
    c.add('jaw', K((0, 0), (tl, 0.2), (ta, 0.8), (tg, 0.9), (tg + 0.4, 0.2), (3.4, 0)))
    for S in 'LR':
        # crouch with feet down; launch hind first, fore after; in the air tucked, then the forefeet reach and take it
        c.add(f'H{S}_follow', K((0, 0), (tl + 0.05, 0), (tl + 0.35, 1), (tg - 0.32, 1), (tg + 0.06, 0)))
        c.add(f'F{S}_follow', K((0, 0), (tl + 0.12, 0), (tl + 0.42, 1), (tg - 0.32, 1), (tg - 0.06, 0)))
        c.add(f'H{S}_bz', K((0, 0), (tl + 0.4, -0.08), (ta, -0.06), (tg, 0)))
        c.add(f'H{S}_by', K((0, 0), (tl + 0.4, 0.03), (tg, 0)))
        c.add(f'F{S}_bz', K((0, 0), (tl + 0.5, -0.02), (ta, 0.04), (tg - 0.2, 0.05), (tg, 0.0)))
        c.add(f'F{S}_by', K((0, 0), (tl + 0.5, 0.05), (ta, 0.02), (tg - 0.1, 0.0)))
        c.add(f'H{S}_heel', K((0, 0), (tl - 0.1, 10), (tl + 0.1, 45), (tl + 0.4, 30), (tg, 0)))
        c.add(f'F{S}_curl', K((0, 0), (ta, -0.8), (tg - 0.08, 0.3), (3.0, 0)))
        c.add(f'F{S}_spread', K((0, 0), (ta, 1), (tg, 0.6), (3.2, 0)))
    for S, d in (('L', 0.0), ('R', 0.05)):
        c.add(f'w{S}_spread', K((0, 0), (tl - 0.2, 0.1), (tl + 0.3 + d, 0.85), (ta + d, 0.95), (tg + d, 0.6), (3.3 + d, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (tl + 0.1, 40), (ta - 0.2 + d, 45), (ta + 0.15 + d, -4), (tg + d, 14), (3.3 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (ta - 0.2 + d, 10), (ta + 0.15 + d, -18), (tg + d, -10), (3.3 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (tg, 0), (tg + 0.3, 1.2), (3.4, 0)))
    c.set('w_lag', 0.25)
    impact(c, tg, depth=0.014, shake=1.2)
    c.info['through'] = [tg - 0.12, tg + 0.08]
    return c


@clip
def tail_whip():
    """Winds up the other way, then the hips turn first and the tail follows as a wave, its tip arriving last and
    fastest; it carries on past, and swings back."""
    c = Clip('tail_whip', 3.6, hit=1.62)
    stance(c, tail=K((0, 0.5), (1.0, 0.9), (2.4, 0.9), (3.6, 0.45)), splay=0.25)
    tw, ts = 1.1, 1.62
    c.add('yaw', K((0, 0), (tw, 26, 'f'), (ts - 0.12, -20), (ts + 0.25, -36), (2.3, -30), (3.4, 0)))
    c.add('hp_yaw', K((0, 0), (tw, 10, 'f'), (ts - 0.25, -16), (ts + 0.2, -18), (3.3, 0)))
    c.add('tl_yaw', K((0, 0), (tw, -70, 'f'), (ts, 80), (ts + 0.4, 120), (2.3, 30), (2.9, -15), (3.6, 0)))
    c.set('tl_lag', 0.055)
    c.add('tl_pitch', K((0, 0), (tw, 12), (ts, 5), (ts + 0.45, -16), (2.4, 0)))
    c.add('hd_yaw', K((0, 0), (0.4, -30), (tw, -45), (ts, -10), (2.2, 0)))
    c.add('nk_yaw', K((0, 0), (0.5, -25), (tw, -30), (ts, 10), (2.4, 0)))
    c.add('y', K((0, 0), (tw, -0.01), (ts, 0.004), (2.6, 0)))
    c.add('roll', K((0, 0), (tw, -4), (ts, 5), (2.4, 0)))
    # planted feet; the fore pair steps round with the turn
    c.add('FL_x', K((0, 0), (ts - 0.05, 0), (ts + 0.15, -0.03), (2.6, -0.03), (2.98, 0)))
    c.add('FL_y', K((0, 0), (ts - 0.05, 0), (ts + 0.06, 0.03), (ts + 0.18, 0, 's'), (2.6, 0), (2.8, 0.025), (3.0, 0)))
    c.add('FR_x', K((0, 0), (ts + 0.05, 0), (ts + 0.3, -0.04), (2.8, -0.04), (3.18, 0)))
    c.add('FR_y', K((0, 0), (ts + 0.05, 0), (ts + 0.17, 0.03), (ts + 0.3, 0, 's'), (2.8, 0), (3.0, 0.025), (3.2, 0)))
    wings_pose(c, spread=K((0, 0), (tw, 0.35), (ts, 0.5), (3.4, 0)), stroke=K((0, 0), (tw, 20), (ts + 0.3, 8), (3.4, 0)))
    c.add('jaw', K((0, 0), (tw, 0.4), (ts + 0.2, 0.15), (3.0, 0)))
    c.add('tremor', K((0, 0), (ts, 0), (ts + 0.05, 0.5), (ts + 0.4, 0)))
    c.info['through'] = [ts - 0.15, ts + 0.35]
    return c


@clip
def tail_spin():
    """A full turn on its haunches, the tail sweeping the whole ring round it. It winds up through its back and tail (the
    feet stay put); the forequarters come up off the ground and the body swings half round over its hind feet, which
    shuffle round under it; the forefeet come down, it gathers, and swings the second half; the tail carries on past and
    swings back. Near a second for each half: a beast this size can't whirl."""
    c = Clip('tail_spin', 5.8, hit=1.9)
    stance(c, tail=K((0, 0.5), (1.0, 1.0), (4.4, 1.0), (5.8, 0.45)), splay=0.3, low=0.006)
    t0 = 1.1
    halves = ((1.3, 2.25), (2.75, 3.7))
    yaw = K((0, 0), (halves[0][0], 0), (halves[0][1] - 0.05, -176), (halves[0][1] + 0.2, -181, 'f'), (halves[1][0], -182), (halves[1][1] - 0.05, -356), (halves[1][1] + 0.25, -360, 'f'), (5.8, -360))
    c.add('yaw', yaw)
    # the wind-up is in the back and the tail, not the feet
    c.add('sp_yaw', K((0, 0), (t0, 16, 'f'), (1.7, -12), (2.25, -4), (2.9, -14), (3.7, -4), (4.6, 0)))
    c.add('hp_yaw', K((0, 0), (t0, 8, 'f'), (1.7, -6), (2.4, 0), (3.1, -6), (3.8, 0)))
    c.add('pitch', K((0, 0), (t0, -2), (1.45, 9), (2.05, 9), (2.25, -2, 's'), (2.85, 9), (3.5, 9), (3.7, -2, 's'), (4.3, 0)))
    c.add('y', K((0, 0), (t0, -0.012, 'f'), (1.45, 0.008), (2.05, 0.008), (2.25, -0.008, 's'), (2.6, -0.01), (2.85, 0.008), (3.5, 0.008),
                 (3.7, -0.008, 's'), (4.4, 0), (5.8, 0)))
    c.add('tl_yaw', K((0, 0), (t0, -60, 'f'), (1.8, 70), (halves[0][1], 85), (2.9, 60), (3.3, 90), (halves[1][1], 70), (4.4, -25), (5.2, 8), (5.8, 0)))
    c.set('tl_lag', 0.05)
    c.add('tl_pitch', K((0, 0), (t0, 8), (1.6, 14), (3.3, 14), (4.2, -6), (5.8, 0)))
    c.add('hd_yaw', K((0, 0), (t0, -32), (1.8, -24), (2.4, -10), (3.2, -24), (3.9, -6), (4.8, 0)))
    c.add('nk_yaw', K((0, 0), (t0, -18), (1.8, -14), (2.4, -4), (3.2, -14), (3.9, 0), (4.8, 0)))
    c.add('nk_reach', K((0, 0), (t0, -10), (3.9, -10), (4.8, 0)))
    # the hind feet shuffle round under the hips, two steps each a half; the hips stay over them
    hs = []
    for (a, b) in halves:
        q = (b - a) / 4
        hs += [('HR', a + 0.02, a + q * 1.3), ('HL', a + q, a + q * 2.3), ('HR', a + q * 2, a + q * 3.3), ('HL', a + q * 3, b + 0.12)]
    step_round(c, yaw, hs, about='hips', lift_h=0.018, feet=('HL', 'HR'))
    # the forefeet: up off the ground for each swing, carried round with the body, and down where it stops
    sk = SK_NOW[0]
    piv = sk.pos[sk.ix['hips']]
    mid = [(a + b) / 2 for (a, b) in halves]
    held = lambda t: np.where(np.asarray(t) < mid[0], 0.0, np.where(np.asarray(t) < mid[1], -180.0, -360.0))  # noqa: E731
    for k in ('FL', 'FR'):
        S = k[1]
        v = sk.pos[sk.ix['hand_' + S]] - piv
        fol = [(0, 0)]
        for (a, b) in halves:
            fol += [(a - 0.14, 0), (a + 0.24, 1), (b - 0.3, 1), (b, 0, 's')]
        c.add(f'{k}_follow', K(*fol))
        c.add(f'{k}_x', lambda t, v=v: v[0] * np.cos(np.radians(held(t))) + v[2] * np.sin(np.radians(held(t))) - v[0])
        c.add(f'{k}_z', lambda t, v=v: -v[0] * np.sin(np.radians(held(t))) + v[2] * np.cos(np.radians(held(t))) - v[2])
        c.add(f'{k}_turn', lambda t: held(t) / np.where(np.abs(yaw(t)) > 1, yaw(t), 1e9))
        c.add(f'{k}_by', K((0, 0), (1.5, 0.03), (2.0, 0.03), (halves[0][1], 0), (2.95, 0.03), (3.45, 0.03), (halves[1][1], 0)))
        c.add(f'{k}_curl', K((0, 0), (1.5, 0.5), (halves[0][1], -0.2), (2.95, 0.5), (halves[1][1], -0.2), (4.0, 0)))
    wings_pose(c, spread=K((0, 0), (t0, 0.4), (3.7, 0.5), (5.4, 0)), stroke=K((0, 0), (t0, 18), (1.7, 28), (halves[0][1], 8), (3.2, 28), (halves[1][1], 8), (5.4, 0)))
    c.set('w_lag', 0.2)
    c.add('jaw', K((0, 0), (t0, 0.4), (3.7, 0.3), (5.4, 0)))
    impact(c, halves[0][1], depth=0.006, shake=0.7, dur=0.5)
    impact(c, halves[1][1], depth=0.01, shake=1.0, dur=0.7)
    c.info['through'] = [1.5, 3.9]
    c.info['turn'] = 0
    return c


@clip
def wing_buffet():
    """Rocks back onto its haunches (it rears about its hips: the hind feet stay where they are, up on their balls), the
    wings rise high and forward, two great downstrokes that blast the air ahead and lift the forequarters, then down."""
    c = Clip('wing_buffet', 3.8, hit=1.5)
    c.add('tl_level', 0.5)
    c.add('pivot_h', 1.0)
    stance(c, tail=0.65)
    b1, b2 = (1.05, 1.6), (2.05, 2.7)
    c.add('pitch', K((0, 0), (0.4, -2), (1.0, 18, 'f'), (b1[1], 30), (b2[0], 25), (b2[1], 32), (3.05, 0, 's'), (3.8, 0)))
    c.add('y', K((0, 0), (0.4, -0.008), (1.0, 0.006), (b1[1], 0.012), (b2[0], 0.01), (b2[1], 0.014), (3.05, -0.004, 's'), (3.8, 0)))
    c.add('z', K((0, 0), (0.5, 0), (1.0, -0.008), (b2[1], -0.012), (3.05, 0), (3.8, 0)))
    for S, sg in (('L', 1), ('R', -1)):
        c.add(f'F{S}_follow', K((0, 0), (0.35, 0), (0.75, 0.8), (b2[1], 0.85), (2.95, 0.3), (3.05, 0, 's'), (3.8, 0)))
        c.add(f'F{S}_by', K((0, 0), (1.0, 0.04), (2.9, 0.0)))
        c.add(f'F{S}_bx', K((0, 0), (1.0, 0.02 * sg), (2.9, 0)))
        c.add(f'F{S}_tilt', K((0, 0), (0.55, 0), (1.0, 45), (2.9, 10), (3.05, 0)))
        c.add(f'F{S}_curl', K((0, 0), (0.55, 0), (1.0, 0.5), (2.9, 0.4), (3.05, 0), (3.8, 0)))
        c.add(f'F{S}_z', K((0, 0), (2.8, 0.01), (3.05, 0.0)))
        c.add(f'H{S}_heel', K((0, 0), (0.9, 18), (b2[1], 22), (3.05, 6), (3.5, 0)))
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.04, 0.95)):
        c.add(f'w{S}_spread', K((0, 0), (0.9 + d, 0.9), (b1[0] + d, 1.0), (b1[1] + d, 0.95), (b2[0] + d, 0.5), (b2[1] + d, 0.95), (3.1 + d, 0.6), (3.8 + d, 0)))
        c.add(f'w{S}_fold', K((0, 0), (b1[1] + d, 0.0), (b1[1] + 0.22 + d, 0.45), (b2[0] + d, 0.35), (b2[0] + 0.1 + d, 0.0)))
        # each downstroke ends with the tips well clear of the ground: the blast is the sweep forward and down, not a stab
        c.add(f'w{S}_stroke', K((0, 0), (0.95 + d, 62 * a, 'f'), (b1[1] + d, -16 * a, 'f'), (b2[0] + d, 56 * a), (b2[1] + d, -12 * a, 'f'), (3.2 + d, 10), (3.8 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (0.95 + d, 30), (b1[1] + d, -4), (b2[0] + d, 26), (b2[1] + d, -4), (3.6 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (3.0, 0), (3.3, 1.0), (3.8, 0)))
    c.set('w_lag', 0.2)
    c.add('nk_pitch', K((0, 0), (1.0, 14), (b1[1], 4), (b2[1], 6), (3.05, -10), (3.8, 0)))
    c.add('nk_reach', K((0, 0), (1.0, 4), (b2[1], -10), (3.05, -18), (3.8, 0)))
    c.add('hd_pitch', K((0, 0), (1.0, -6), (b2[1], -2), (3.05, 4), (3.8, 0)))
    c.add('jaw', K((0, 0), (1.0, 0.4), (b2[1], 0.7), (3.2, 0.1), (3.8, 0)))
    c.add('tl_pitch', K((0, 0), (1.0, -14), (b2[1], -16), (3.05, 4), (3.8, 0)))
    impact(c, 3.05, depth=0.01, shake=0.8, dur=0.7)
    c.info['through'] = [b1[0] + 0.2, b2[1]]
    return c


def breath_pose(c, t_ign, t_end, dur, low=0.014, aim=-8.0):
    """The breath's body, start to end. It draws up and back as it fills (the neck coiled from its root, the chest
    lifting), then thrusts the neck out long and low from its base at the target, the head aimed down the stream and held
    there in the world (the pulse and the heave go into the neck, never the aim), the chest down and braced. When the
    stream stops the mouth snaps shut and the neck comes back up, with a shake."""
    ti = t_ign
    t0 = min(0.0, ti - 0.7)
    c.add('breath', K((t0, 0), (ti - 0.1, 5), (ti + 0.2, 1), (t_end, 0)))
    c.add('nk_reach', K((t0, 0), (ti - 0.05, 12, 'f'), (ti + 0.2, -48, 's'), (ti + 0.4, -44), (t_end, -44), (t_end + 0.55, -8), (dur, 0)))
    c.add('nk_pitch', K((t0, 0), (ti - 0.05, 14, 'f'), (ti + 0.2, -6, 's'), (ti + 0.4, -4), (t_end, -4), (t_end + 0.55, 6), (dur, 0)))
    c.add('nk_s', K((t0, 0), (ti - 0.05, 14), (ti + 0.2, -6), (t_end, -6), (t_end + 0.55, 4), (dur, 0)))
    c.add('hd_pitch', K((t0, 0), (ti - 0.05, 12, 'f'), (ti + 0.2, 0), (t_end, 0), (t_end + 0.5, 6), (dur, 0)))
    c.add('hd_world', K((t0, 0), (ti - 0.1, 0), (ti + 0.4, 1), (t_end, 1), (t_end + 0.45, 0)))
    c.add('hd_wpitch', K((t0, 0), (ti, 0), (ti + 0.25, aim), (t_end, aim), (t_end + 0.45, 0)))
    c.add('jaw', K((t0, 0), (ti - 0.6, 0.15), (ti - 0.05, 0.4), (ti + 0.15, 1.0), (t_end, 1.0), (t_end + 0.14, 0.0, 's'), (dur, 0)))
    c.add('y', K((t0, 0), (ti - 0.1, 0.004), (ti + 0.2, -0.008 - low), (t_end, -0.008 - low), (dur, 0)))
    c.add('pitch', K((t0, 0), (ti - 0.1, 2), (ti + 0.2, -6), (t_end, -6), (dur, 0)))
    c.add('z', K((t0, 0), (ti - 0.1, -0.006), (ti + 0.2, 0.004), (ti + 0.5, -0.004), (t_end, -0.004), (dur, 0)))
    c.add('nk_roll', lambda t: 6 * np.sin(2 * np.pi * (np.asarray(t) - t_end - 0.4) / 0.3) * window(t_end + 0.35, t_end + 0.42, t_end + 0.7, t_end + 0.8)(t))





@clip
def breath():
    """On the ground: draws in, snaps forward and lets go; holds the stream steady, braced against its push; closes."""
    c = Clip('breath', 5.1, breathWin=[1.5 / 5.1, 4.3 / 5.1])
    stance(c, tail=0.6, splay=K((0, 0), (1.2, 0.35)))
    breath_pose(c, 1.3, 4.3, 5.1)
    c.info['aim'] = [1.1, 4.35]
    c.add('jaw', lambda t: 0.06 * np.sin(2 * np.pi * np.asarray(t) / 0.5) * window(1.5, 1.7, 4.1, 4.3)(t))
    c.add('breath', lambda t: 1.2 * np.sin(2 * np.pi * np.asarray(t) / 0.5) * window(1.5, 1.7, 4.1, 4.3)(t))
    c.add('hd_wyaw', lambda t: 4 * np.sin(2 * np.pi * (np.asarray(t) - 1.5) / 2.8) * window(1.5, 2.0, 3.8, 4.3)(t))
    c.add('tremor', window(1.45, 1.7, 4.0, 4.3))
    c.add('tl_pitch', K((0, 0), (1.3, 6), (4.3, 4), (5.1, 0)))
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (1.2, 0), (1.5, 8), (4.3, 8), (5.1, 0)))
    wings_pose(c, spread=K((0, 0), (1.3, 0.25), (4.3, 0.25), (5.1, 0)), stroke=K((0, 0), (1.3, 14), (4.3, 10), (5.1, 0)))
    return c


@clip
def breath_sweep():
    """The breath swept across the ground from its left to its right, the shoulders following the head."""
    c = Clip('breath_sweep', 4.9, breathWin=[1.5 / 4.9, 4.1 / 4.9])
    stance(c, tail=0.6, splay=K((0, 0), (1.2, 0.35)))
    breath_pose(c, 1.3, 4.1, 4.9)
    c.info['aim'] = [1.1, 4.15]
    sweep = K((0, 0), (1.1, 45), (1.55, 50, 'f'), (4.0, -50, 'f'), (4.9, -20))
    c.add('hd_yaw', lambda t: 0.45 * sweep(t))
    c.add('nk_yaw', lambda t: 0.4 * sweep(t))
    c.add('sp_yaw', lambda t: 0.2 * sweep(np.asarray(t) - 0.2))
    c.add('yaw', lambda t: 0.12 * sweep(np.asarray(t) - 0.25))
    c.add('hd_wyaw', lambda t: 0.85 * sweep(t) * window(1.0, 1.55, 4.1, 4.55)(t))
    c.add('tl_yaw', lambda t: -0.3 * sweep(np.asarray(t) - 0.35))
    c.add('breath', lambda t: 1.2 * np.sin(2 * np.pi * np.asarray(t) / 0.5) * window(1.5, 1.7, 3.9, 4.1)(t))
    c.add('tremor', window(1.45, 1.7, 3.8, 4.1))
    wings_pose(c, spread=K((0, 0), (1.3, 0.25), (4.1, 0.25), (4.9, 0)), stroke=K((0, 0), (1.3, 14), (4.9, 0)))
    return c


# ---- in the air --------------------------------------------------------------------------------------------------------

FLY_Y = 0.3     # where the flying clips hold the body, above the ground they started from


def air_body(c, pitch=4.0, neck=-34.0, tail=1.0, look=-6.0):
    """Flying: the neck out long and low ahead from its root (the head level with the shoulders, never stood up like a
    seahorse's), the head held level in the world, the tail straight back."""
    c.add('pitch', pitch)
    c.add('nk_reach', lambda t, n=neck: n(t) * 1.15 if callable(n) else n * 1.15)
    c.add('nk_pitch', -6)
    c.add('nk_s', -6)
    c.add('tl_straight', tail)
    c.add('tl_sag', 4)
    c.add('hd_world', 1.0)
    c.add('hd_wpitch', look)


@clip
def takeoff():
    """Crouch deep, wings up; the body leaps first, hind legs driving and forelegs vaulting, with the wings only opening
    and lifting (a full beat this near the ground would put the tips in it); then at the top of the leap the first great
    downstroke, and two more, each after smaller, the legs dangling, then drawn up."""
    c = Clip('takeoff', 4.6, air=[0, FLY_Y])
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.6)
    tl = 1.0
    # the beats: the first at the leap's top, each a little longer and smaller than the one before (never under a second)
    beats = [(tl + 0.45, 1.0, 72, -50), (tl + 1.45, 1.05, 60, -42), (tl + 2.5, 1.1, 52, -36)]
    c.add('y', K((0, 0), (tl, -0.035, 'f'), (tl + 0.35, 0.05), (tl + 0.75, 0.085), (tl + 1.15, 0.11), (tl + 2.0, 0.18), (tl + 3.0, 0.25), (4.6, FLY_Y)))
    c.add('pitch', K((0, 0), (tl, -6, 'f'), (tl + 0.3, 42), (tl + 1.05, 36), (tl + 2.0, 26), (4.6, 14)))
    c.add('z', K((0, 0), (tl, -0.015), (tl + 0.4, 0.02), (4.6, 0.04)))
    c.add('nk_s', K((0, 0), (0.6, 14), (tl, 18), (tl + 0.6, 4), (4.6, -4)))
    c.add('nk_pitch', K((0, 0), (tl, 8), (tl + 0.5, -10), (4.6, -10)))
    c.add('nk_reach', K((0, 0), (tl, 6), (tl + 0.6, -12), (4.6, -30)))
    c.add('hd_world', K((0, 0), (tl, 0.3), (tl + 0.5, 1), (4.6, 1)))
    c.add('hd_wpitch', K((0, 0), (tl + 0.5, 5), (4.6, -4)))
    c.add('tl_straight', K((0, 0.4), (tl, 0.8), (tl + 1.0, 1.0)))
    c.add('tl_pitch', K((0, 0), (tl, 14), (tl + 0.6, -20), (tl + 2.0, -10), (4.6, 0)))
    c.add('tl_wave', K((0, 0), (tl + 0.5, 0), (tl + 1.5, 10), (4.6, 6)))
    c.set('tl_wave_T', 2.0)
    # the legs: crouch on the ground, push off (hind first), dangle, then tuck; the paws turn under only once clear
    for S in 'LR':
        c.add(f'H{S}_follow', K((0, 0), (tl + 0.05, 0), (tl + 0.4, 0.9), (tl + 1.6, 1)))
        c.add(f'F{S}_follow', K((0, 0), (tl + 0.12, 0), (tl + 0.45, 0.9), (tl + 1.6, 1)))
        c.add(f'H{S}_heel', K((0, 0), (tl - 0.1, 10), (tl + 0.12, 50), (tl + 0.6, 10), (tl + 3.0, 50)))
        c.add(f'H{S}_bz', K((0, 0), (tl + 0.6, 0.0), (tl + 3.0, -0.14)))
        c.add(f'H{S}_by', K((0, 0), (tl + 0.6, -0.02), (tl + 3.0, 0.07)))
        c.add(f'H{S}_tilt', K((0, 0), (tl + 0.35, 0), (tl + 0.8, 30), (tl + 3.0, 80)))
        c.add(f'F{S}_by', K((0, 0), (tl + 0.6, -0.01), (tl + 2.6, 0.09)))
        c.add(f'F{S}_bz', K((0, 0), (tl + 2.6, -0.045)))
        c.add(f'F{S}_tilt', K((0, 0), (tl + 0.35, 0), (tl + 0.8, 40), (tl + 2.6, 65)))
        c.add(f'{"F" + S}_curl', K((0, 0), (tl, -0.3), (tl + 0.4, 0.2), (tl + 2.6, 0.85)))
        c.add(f'{"H" + S}_curl', K((0, 0), (tl, -0.3), (tl + 0.4, 0.2), (tl + 2.6, 0.6)))
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.035, 0.96)):
        # up and open through the crouch and the leap (no downstroke yet), then the beats
        st = [(0, 0), (0.55, 30), (tl + d, 56 * a), (tl + 0.4 + d, 70 * a, 'f')]
        sp = [(0, 0), (0.55, 0.6), (tl + d, 1.0)]
        fo = [(0, 0), (tl + 0.4, 0)]
        for (t0, T, top, bot) in beats:
            st += [(t0 + T * 0.6 + d, bot * a, 'f'), (t0 + T + d, top * a)]
            sp += [(t0 + T * 0.6 + d, 1.0), (t0 + T * 0.8 + d, 0.55), (t0 + T + d, 1.0)]
            fo += [(t0 + T * 0.6 + d, 0.0), (t0 + T * 0.8 + d, 0.45), (t0 + T + d, 0.0)]
        c.add(f'w{S}_stroke', K(*st))
        c.add(f'w{S}_spread', K(*sp))
        c.add(f'w{S}_fold', K(*fo))
        c.add(f'w{S}_sweep', K((0, 0), (tl, 20), (tl + 0.45, 24), (tl + 1.05, -10), (tl + 1.45, 14), (tl + 2.05, -8), (4.6, 0)))
    c.set('w_lag', 0.16)
    return c


@clip
def fly():
    """Cruise: one beat, about a second and a half."""
    c = Clip('fly', 1.6, loop=True, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    air_body(c)
    c.add('y', FLY_Y)
    legs_tucked(c)
    wings_flap(c, 1.6, top=52, bot=-34, fold=0.55, sw=(10, -12), heave=0.012, pitch=1.8)
    c.add('tl_wave', 5)
    c.set('tl_wave_T', 1.6)
    c.add('tl_pitch', sine(1.6, 3, 0.4))
    c.add('hd_wpitch', sine(1.6, 0.6, 0.1))
    return c


def hover_wings(c, T, fold=0.22, warp=None):
    """The hover's beat: wings swept forward and back through a wide arc, nearly full out the whole way (the upstroke
    folds them only a little), so from any side it reads as a wide wing, never a stick; the bottom of the stroke stays
    above the hips, so it hangs from its wings rather than rowing below itself. warp(t): where in its beats (0 the top
    of one) the wings are at t, for a beat that slows, hangs at the top, or quickens; t / T without one."""
    u = (lambda t: warp(np.asarray(t, float))) if warp else (lambda t: np.asarray(t, float) / T)
    for S, lag, a in (('L', 0.0, 1.0), ('R', 0.03, 0.95)):
        ph = lambda t, lag=lag: 2 * np.pi * u(np.asarray(t, float) - lag)      # noqa: E731
        c.add(f'w{S}_stroke', lambda t, ph=ph, a=a: a * (27 + 22 * np.cos(ph(t))))
        c.add(f'w{S}_sweep', lambda t, ph=ph, a=a: a * (19 + 18 * np.sin(ph(t) + 0.6)))      # (back is down, the body up at 40)
        fo = lambda t, ph=ph: fold * np.clip(np.sin(ph(t) + 3.6), 0, None) ** 1.2  # noqa: E731
        c.add(f'w{S}_fold', fo)
        c.add(f'w{S}_spread', lambda t, fo=fo: 1 - fo(t))
    c.set('w_lag', T / 7)
    c.add('y', lambda t: -0.02 * np.cos(2 * np.pi * (u(t) - 0.15)))
    c.add('pitch', lambda t: -2.5 * np.cos(2 * np.pi * (u(t) - 0.25)))


def hover_legs(c, T):
    """Hanging in the air the legs are drawn up off the ground: forefeet against the chest, hind feet up under the belly
    and back, swinging a little behind the heave."""
    for S in 'LR':
        c.add(f'F{S}_follow', 1)
        c.add(f'H{S}_follow', 1)
        c.add(f'F{S}_by', lambda t: 0.06 + 0.006 * np.cos(2 * np.pi * (np.asarray(t) / T - 0.4)))
        c.add(f'F{S}_bz', -0.02)
        c.add(f'F{S}_tilt', 55)
        c.add(f'F{S}_curl', 0.7)
        c.add(f'H{S}_by', 0.13)
        c.add(f'H{S}_bz', lambda t: -0.11 + 0.008 * np.cos(2 * np.pi * (np.asarray(t) / T - 0.45)))
        c.add(f'H{S}_tilt', 80)
        c.add(f'H{S}_heel', 55)
        c.add(f'H{S}_curl', 0.5)


@clip
def fly_hover():
    """Hanging in the air: body up at forty degrees, wings sweeping forward and back wide, legs drawn up, the tail
    trailing out behind level, two beats a little unlike."""
    c = Clip('fly_hover', 2.6, loop=True, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    c.add('tl_level', 1.0)
    air_body(c, pitch=40, neck=-14, look=-12)
    c.add('nk_s', 6)
    c.add('y', FLY_Y)
    hover_wings(c, 1.3)
    for S in 'LR':
        c.add(f'w{S}_stroke', lambda t: 3 * np.cos(2 * np.pi * np.asarray(t, float) / 2.6))
    hover_legs(c, 1.3)
    c.add('tl_pitch', lambda t: 35 + 5 * np.cos(2 * np.pi * (np.asarray(t) / 1.3 - 0.6)))      # (trailing back, near level: not hung under it)
    c.add('tl_wave', 6)
    c.set('tl_wave_T', 2.6)
    return c


@clip
def fly_glide():
    c = Clip('fly_glide', 5.0, loop=True, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    air_body(c, pitch=2)
    c.add('y', FLY_Y)
    legs_tucked(c)
    for S, seed in (('L', 1), ('R', 2)):
        wings_pose(c, spread=1.0, stroke=9, sweep=-2, sides=S)
        c.add(f'w{S}_stroke', loopwobble(5.0, seed, 4, 2.6))
        c.add(f'w{S}_sweep', loopwobble(5.0, seed + 10, 3, 1.5))
        c.add(f'w{S}_ripple', 0.35)
    c.add('y', sine(2.5, 0.006))
    c.add('roll', loopwobble(5.0, 5, 3, 2.0))
    c.add('tl_yaw', loopwobble(5.0, 6, 3, 6))
    c.add('hd_wyaw', loopwobble(5.0, 7, 2, 12))
    c.add('breath', sine(2.5, 0.8))
    c.add('tl_wave', 3)
    c.set('tl_wave_T', 5.0)
    return c


def bank_clip(name, side=1):
    """Into a turn: head and eyes first, then the roll; the outer wing reaches, the inner bends; the neck curves in, the
    tail swings out; out again level, facing the way it came in (the turn itself is the flight's to make)."""
    c = Clip(name, 3.6, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)
    air_body(c, pitch=3)
    c.add('y', K((0, FLY_Y), (1.0, FLY_Y - 0.01), (2.6, FLY_Y - 0.03), (3.6, FLY_Y)))
    legs_tucked(c)
    roll = K((0, 0), (0.35, 0), (1.25, 38), (2.6, 40), (3.4, 0))
    c.add('roll', lambda t: side * roll(t))
    c.add('yaw', K((0, 0), (0.4, 0), (1.5, 14 * side), (2.6, 16 * side), (3.5, 0)))
    c.add('hd_wyaw', K((0, 0), (0.35, 22 * side), (2.6, 26 * side), (3.4, 0)))
    c.add('nk_yaw', K((0, 0), (0.5, 14 * side), (2.6, 18 * side), (3.4, 0)))
    c.add('tl_yaw', K((0, 0), (0.8, -14 * side), (2.6, -18 * side), (3.6, 0)))
    c.add('tl_pitch', K((0, 0), (1.2, 6), (2.6, 6), (3.6, 0)))
    inner, outer = ('L', 'R') if side > 0 else ('R', 'L')
    wings_pose(c, spread=K((0, 1), (1.0, 0.85), (2.6, 0.85), (3.4, 1)), stroke=K((0, 8), (1.2, 18), (2.6, 16), (3.4, 8)), sides=inner)
    wings_pose(c, spread=1.0, stroke=K((0, 8), (1.2, -2), (2.6, 0), (3.4, 8)), sweep=K((0, 0), (1.2, 8), (2.6, 6), (3.4, 0)), sides=outer)
    # one beat of the outer wing through the turn
    c.add(f'w{outer}_stroke', lambda t: 30 * np.sin(np.pi * np.clip((np.asarray(t) - 1.6) / 1.0, 0, 1)) * 1.0)
    for S in 'LR':
        c.add(f'w{S}_ripple', 0.3)
    return c


@clip
def bank_l():
    return bank_clip('bank_l', 1)


@clip
def bank_r():
    return bank_clip('bank_r', -1)


@clip
def dive():
    """A stoop: nose down, the wings swept back tight along the flanks as a falcon's are, legs tight; a flutter at the
    edges. Then it pulls out: the wings thrown open and up under the load as the body flares, and one great slow
    downstroke that carries it out level."""
    c = Clip('dive', 4.8, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    c.add('tl_level', 0.5)
    air_body(c, pitch=0)
    legs_tucked(c, front=1.1, hind=1.1)
    te, tp = 0.95, 3.0
    c.add('pitch', K((0, 0), (te, -42), (tp - 0.1, -46), (tp + 0.6, 24), (4.0, 8), (4.8, 4)))
    # the fall itself is the fight's to make (it moves the body): the clip only sinks a little into it
    c.add('y', K((0, FLY_Y), (te, FLY_Y - 0.01), (tp, FLY_Y - 0.05), (tp + 0.6, FLY_Y - 0.06), (4.8, FLY_Y)))
    c.add('nk_pitch', K((0, 0), (te, 8), (tp, 10), (tp + 0.5, -8), (4.8, 0)))
    c.add('hd_world', K((0, 0), (te, -0.6), (tp, -0.6), (tp + 0.4, 0)))
    c.add('tl_pitch', K((0, 0), (te, 10), (tp, 8), (tp + 0.5, -24), (4.8, 0)))
    c.add('tl_wave', K((0, 2), (te, 2), (tp, 3), (tp + 0.6, 8), (4.8, 4)))
    c.set('tl_wave_T', 1.0)
    for S, d in (('L', 0.0), ('R', 0.04)):
        c.add(f'w{S}_spread', K((0, 1), (te + d, 0.22), (tp + d, 0.2), (tp + 0.3 + d, 1.0), (4.8, 1.0)))
        c.add(f'w{S}_fold', K((0, 0), (te + d, 0.6), (tp + d, 0.62), (tp + 0.3 + d, 0.0)))
        c.add(f'w{S}_sweep', K((0, 0), (te + d, -48), (tp + d, -50), (tp + 0.3 + d, 22), (tp + 0.8 + d, 12), (4.4 + d, -8), (4.8, 0)))
        c.add(f'w{S}_stroke', K((0, 8), (te + d, 16), (tp + d, 14), (tp + 0.3 + d, 46), (tp + 0.45 + d, 50), (4.1 + d, -36, 'f'), (4.8, 8)))
        c.add(f'w{S}_ripple', K((0, 0), (te, 1.6), (tp, 2.0), (tp + 0.3, 0.2)))
    c.set('w_lag', 0.2)
    for S in 'LR':
        c.add(f'H{S}_bz', K((0, 0), (tp, 0), (tp + 0.4, 0.06), (4.8, 0.0)))
        c.add(f'H{S}_by', K((0, 0), (tp, 0), (tp + 0.4, -0.04), (4.8, 0.0)))
    return c


@clip
def strafe_breath():
    """A low pass: one breath drawn in, the neck out low to aim ahead, the head locked while the wings glide; then a
    long, heavy beat that climbs it away."""
    c = Clip('strafe_breath', 4.4, air=[FLY_Y, FLY_Y], breathWin=[0.75 / 4.4, 2.9 / 4.4])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    air_body(c, pitch=K((0, 3), (0.7, -4), (2.9, -6), (3.6, 7), (4.4, 4)))
    c.add('y', K((0, FLY_Y), (2.9, FLY_Y - 0.02), (3.8, FLY_Y + 0.015), (4.4, FLY_Y)))
    legs_tucked(c)
    c.add('breath', K((0, 0), (0.6, 5), (0.85, 1), (2.9, 0)))
    c.add('nk_pitch', K((0, 0), (0.6, 4), (0.85, -10), (2.9, -12), (3.4, -2), (3.6, 0)))
    c.add('nk_reach', K((0, 0), (0.6, 6), (0.85, -16), (2.9, -16), (3.5, 0)))
    c.add('hd_wpitch', K((0, 0), (0.55, 4), (0.85, -10), (2.9, -10), (3.4, -4), (4.4, 0)))
    c.info['aim'] = [0.7, 3.0]
    c.add('jaw', K((0, 0), (0.45, 0.2), (0.75, 1.0), (2.85, 0.95), (3.0, 0.0, 's'), (4.4, 0)))
    c.add('tremor', window(0.75, 0.9, 2.7, 2.9))
    c.add('roll', K((0, 0), (1.0, 4), (2.4, -3), (3.6, 0)))
    for S, d in (('L', 0.0), ('R', 0.05)):
        wings_pose(c, spread=1.0, sides=S)
        c.add(f'w{S}_stroke', K((0, 10), (1.3 + d, 22), (2.1 + d, -12), (2.8 + d, 6), (3.35 + d, 46), (4.05 + d, -34, 'f'), (4.4, 0)))
        c.add(f'w{S}_fold', K((0, 0), (2.8 + d, 0), (3.1 + d, 0.3), (3.35 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (2.8 + d, 0), (3.35 + d, 16), (4.05 + d, -10), (4.4, 0)))
        c.add(f'w{S}_ripple', 0.4)
    c.set('w_lag', 0.25)
    return c


@clip
def hover_breath():
    """The whole breath from the hover in one (the game's wild drakes pour it this way): drawn up and back, held at the
    top, thrust out low and poured, and back into the hover, panting. hover_breath_in / _hold / _out are its parts."""
    c = hover_breath_master('hover_breath')
    c.info['breathWin'] = [HB_TI / HB_END, (HB_H1 + 0.14) / HB_END]
    c.info['aim'] = [1.3, HB_H1 + 0.1]
    return c


@clip
def land():
    """Comes in a touch low, flares nose-up into a stall with the wings thrown forward, two braking beats, hind feet down
    then fore, sinks into it, and folds the wings in stages."""
    c = Clip('land', 4.4, air=[FLY_Y, 0])
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.65)
    tf, th, tfo = 0.65, 2.45, 2.62
    r = leg_scale()
    c.add('y', K((0, FLY_Y), (tf, FLY_Y - 0.08), (1.6, 0.14), (th - 0.06, 0.014 * r), (th + 0.04, 0.0), (tfo + 0.12, -0.018 * r), (3.1, 0.003), (3.6, 0)))
    c.add('pitch', K((0, 4), (tf, -4), (1.35, 52), (2.1, 44), (th, 24), (tfo, -2, 's'), (3.0, 1), (3.6, 0)))
    c.add('z', K((0, 0), (tf, 0.04), (th, 0.02), (4.4, 0)))
    c.add('nk_pitch', K((0, -30), (tf, -26), (1.4, -6), (th, -4), (tfo + 0.08, -22, 's'), (3.1, -4), (4.4, 0)))
    c.add('nk_pitch', settle(tfo + 0.1, -8, 0.4, 0.9))
    c.add('nk_s', K((0, -4), (1.4, 8), (th, 4), (4.4, 0)))
    c.add('hd_world', K((0, 1), (th, 1), (3.0, 0)))
    c.add('hd_wpitch', K((0, -6), (1.4, -14), (th, -10), (3.0, 0)))
    c.add('tl_straight', K((0, 1), (th, 0.9), (4.4, 0.4)))
    c.add('tl_pitch', K((0, 0), (1.4, 12), (th - 0.3, 6), (th, -6), (tfo + 0.1, -10, 's'), (3.2, 2), (4.4, 0)))
    for S in 'LR':
        c.add(f'H{S}_follow', K((0, 1), (1.0, 1), (th - 0.55, 0.75), (th, 0)))
        c.add(f'F{S}_follow', K((0, 1), (1.0, 1), (tfo - 0.25, 0.6), (tfo, 0)))
        c.add(f'H{S}_bz', K((0, -0.1), (1.0, -0.02), (th - 0.3, 0.05), (th, 0.03)))
        c.add(f'H{S}_by', K((0, 0.05), (1.0, 0.0), (th - 0.3, -0.04 * r ** 3), (th, -0.02 * r ** 3)))      # (reached down for the ground: less on shorter legs)
        c.add(f'H{S}_tilt', K((0, 70), (1.2, 20), (th, 0)))
        c.add(f'H{S}_heel', K((0, 40), (1.2, 15), (th, 0), (tfo + 0.1, 12), (3.2, 0)))
        c.add(f'F{S}_by', K((0, 0.075), (1.0, 0.03), (tfo - 0.3, -0.03), (tfo, 0)))
        c.add(f'F{S}_bz', K((0, -0.025), (1.2, 0.05), (tfo, 0.03)))
        c.add(f'F{S}_tilt', K((0, 55), (1.2, 15), (tfo, 0)))
        c.add(f'F{S}_curl', K((0, 0.7), (1.2, -0.4), (tfo, 0.0), (3.0, -0.2), (3.6, 0)))
        c.add(f'H{S}_curl', K((0, 0.55), (1.2, -0.3), (th, 0), (3.6, 0)))
        c.add(f'F{S}_splay', K((tfo, 0), (tfo + 0.1, 0.35), (4.0, 0)))
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.04, 0.95)):
        c.add(f'w{S}_spread', K((0, 1), (1.85 + d, 1), (2.05 + d, 0.6), (2.25 + d, 1), (tfo + d, 0.85), (3.15 + d, 0.45), (3.4 + d, 0.6), (4.2 + d, 0)))
        c.add(f'w{S}_fold', K((0, 0), (1.85 + d, 0), (2.05 + d, 0.4), (2.25 + d, 0)))
        c.add(f'w{S}_stroke', K((0, 8), (tf + d, 14), (1.35 + d, 40 * a), (1.85 + d, -28 * a, 'f'), (2.1 + d, 46 * a), (tfo + d, -24 * a, 'f'), (3.15 + d, 16), (3.35 + d, 26), (3.6 + d, 6), (4.2 + d, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (1.35 + d, 36), (1.85 + d, 10), (2.1 + d, 34), (tfo + d, 6), (4.2, 0)))
        c.add(f'w{S}_ripple', K((0, 0.2), (3.0, 0.3), (3.5, 1.0), (4.4, 0)))
    c.set('w_lag', 0.2)
    impact(c, tfo, depth=0.006, shake=1.0, dur=0.8)
    return c


@clip
def crash_land():
    """Too fast and too steep: a failed, lopsided flare; the chest and forelimbs strike first and the forelegs fold under
    it; it bounces, comes down again on its chest and rolls onto its right side, that wing crumpled under, the other
    sprawled over, the tail whipping round; the head goes down in the dirt and it lies there, winded, heaving; then it
    gets its forelegs out under it, heaves itself up and shakes it off."""
    c = Clip('crash_land', 8.4, air=[FLY_Y, 0])
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.4)
    ti, tb, tp, tr, tu = 0.85, 1.4, 2.5, 5.2, 6.9   # strikes, down again, comes to rest, starts up, up
    c.add('y', K((0, FLY_Y), (ti, -0.095, 's'), (ti + 0.22, -0.04), (tb, -0.095, 's'), (tp, -0.1), (tr, -0.1), (tr + 0.6, -0.075), (tu, 0.0), (8.4, 0)))
    c.add('pitch', K((0, -26), (ti, -16, 's'), (ti + 0.22, -6), (tb, -10, 's'), (tp, -8), (tr, -8), (tr + 0.6, 3), (tu, 0), (8.4, 0)))
    c.add('roll', K((0, -6), (ti, -12), (tb, -22), (tp, -34), (tr, -32), (tr + 0.6, -22), (tu, 0), (8.4, 0)))
    c.add('yaw', K((0, 0), (ti, -6), (tp, -24), (8.4, -24)))
    c.add('nk_reach', K((0, -30), (ti, -10), (ti + 0.15, -40, 's'), (tb + 0.1, -24), (tp, -46, 's'), (tr, -48), (tr + 0.8, -14), (tu + 0.4, 0), (8.4, 0)))
    c.add('nk_pitch', K((0, -6), (ti, -4), (ti + 0.15, -16, 's'), (tb + 0.1, -10), (tp, -22, 's'), (tr, -24), (tr + 0.8, -4), (tu + 0.4, 4), (8.4, 0)))
    c.add('nk_pitch', settle(ti + 0.16, 14, 0.3, 0.7))
    c.add('hd_pitch', K((0, 0), (tp, -10, 's'), (tr, -10), (tr + 0.8, 4), (8.4, 0)))
    c.add('hd_roll', K((0, 0), (tp, -16), (tr, -18), (tr + 0.8, 0)))
    c.add('nk_yaw', K((0, 0), (ti, 10), (tp, -24), (tr, -28), (tr + 0.8, 0)))
    c.add('tl_straight', K((0, 1), (tp, 0.9), (8.4, 0.35)))
    c.add('tl_yaw', K((0, 0), (ti, 20), (1.6, -70), (tp, -95), (3.3, -60), (tr, -50), (tu, 0)))
    c.add('tl_pitch', K((0, 0), (ti + 0.3, 30), (tp, -10, 's'), (tr, -6), (8.4, 0)))
    c.set('tl_lag', 0.05)
    # winded: big slow heaves while it lies
    c.add('breath', lambda t: 4 * (1 - np.cos(2 * np.pi * (np.asarray(t) - tp) / 1.3)) / 2 * window(tp, tp + 0.4, tr - 0.2, tr + 0.3)(t))
    # the shake that runs from the head down to the tail once it's up
    c.add('nk_roll', lambda t: 14 * np.sin(2 * np.pi * (np.asarray(t) - 7.25) / 0.36) * window(7.2, 7.3, 7.7, 7.85)(t))
    c.add('sp_roll', lambda t: 8 * np.sin(2 * np.pi * (np.asarray(t) - 7.4) / 0.36) * window(7.35, 7.45, 7.8, 8.0)(t))
    c.add('tl_wave', lambda t: 18 * window(7.5, 7.6, 8.0, 8.3)(t))
    c.set('tl_wave_T', 0.5)
    for S, sg in (('L', 1), ('R', -1)):
        # the hind feet come down planted and splay as it goes down on its belly; they stay where they are until it's up
        c.add(f'H{S}_follow', K((0, 1), (ti - 0.2, 0.7), (ti + 0.3, 0)))
        c.add(f'H{S}_splay', K((0, 0), (ti, 0.4), (tr, 0.4), (tu, 0)))
        c.add(f'H{S}_heel', K((0, 0), (tr, 0), (tr + 0.5, 20), (tu, 0)))
        # the forelegs strike, buckle and fold under the chest; at tr they come out and are put down in front again
        c.add(f'F{S}_follow', K((0, 1), (ti - 0.15, 0.6), (ti, 0.45, 's'), (ti + 0.15, 0.9), (tr, 0.9), (tr + 0.5 + 0.12 * (S == 'R'), 0.0)))
        c.add(f'F{S}_by', K((0, 0), (ti, 0.0), (ti + 0.12, 0.08), (tr, 0.08), (tr + 0.3, 0.07), (tr + 0.5, 0.0)))
        c.add(f'F{S}_bz', K((0, 0), (ti, 0.0), (ti + 0.2, -0.06), (tr, -0.06), (tr + 0.3, 0.02), (tr + 0.5, 0.0)))
        c.add(f'F{S}_bx', K((0, 0), (ti + 0.2, 0.045 * sg), (tr, 0.045 * sg), (tr + 0.5, 0.0)))
        c.add(f'F{S}_tilt', K((0, 0), (ti + 0.12, 0), (ti + 0.38, 18), (tr, 18), (tr + 0.25, 6), (tr + 0.5, 0)))
        c.add(f'F{S}_by', K((tr, 0), (tr + 0.2, 0.03), (tr + 0.45, 0)))
        c.add(f'F{S}_curl', K((0, 0.4), (ti, -0.6), (ti + 0.25, 0.6), (tr, 0.6), (tr + 0.45, -0.4), (tr + 0.65, 0)))
        c.add(f'F{S}_z', K((0, 0), (tr + 0.2, 0.0), (tr + 0.55, 0.05), (tu, 0.05), (8.2, 0)))
        c.add(f'F{S}_y', K((0, 0), (8.0, 0), (8.1, 0.02), (8.2, 0)))
    # wings: the left flails on and sprawls over the top; the right is dragged under and crumpled
    c.add('wL_spread', K((0, 0.9), (ti, 0.9), (tp, 0.7), (tr, 0.65), (tu, 0.4), (8.1, 0)))
    c.add('wL_stroke', K((0, 40), (0.4, -10), (ti, 30), (tb, -20), (1.9, 25), (tp, -40, 'f'), (tr, -42), (tr + 0.6, 20), (tu, 30), (8.1, 0)))
    c.add('wL_sweep', K((0, 0), (tp, 10), (tr, 10), (tu, 0)))
    c.add('wR_spread', K((0, 0.5), (ti, 0.7), (tp, 0.4), (tr, 0.38), (tu, 0.4), (8.2, 0)))
    c.add('wR_fold', K((0, 0.3), (ti, 0.0), (tp, 0.55), (tr, 0.55), (tu, 0.1), (8.2, 0)))
    c.add('wR_stroke', K((0, -10), (ti, -24), (tp, 30), (tr, 30), (tr + 0.6, 10), (tu, 20), (8.2, 0)))
    c.add('wR_sweep', K((0, 0), (tp, -30), (tr, -28), (tu, 0)))
    for S in 'LR':
        c.add(f'w{S}_ripple', K((0, 1.5), (tp, 1.0), (tr, 0.2), (7.4, 1.2), (8.4, 0)))
    c.add('jaw', K((0, 0.6), (ti, 0.9), (tp, 0.4), (tr, 0.35), (tr + 0.6, 0.1), (7.6, 0.7), (8.1, 0.1), (8.4, 0)))
    impact(c, ti, depth=0.0, shake=2.0, dur=0.6)
    impact(c, tb, depth=0.0, shake=1.4, dur=0.6)
    return c


@clip
def hit():
    c = Clip('hit', 0.8)
    stance(c, tail=0.4)
    c.add('nk_pitch', K((0, 0), (0.12, 8, 's'), (0.75, 0)))
    c.add('nk_yaw', K((0, 0), (0.12, -6, 's'), (0.75, 0)))
    c.add('hd_pitch', K((0, 0), (0.14, 6), (0.75, 0)))
    c.add('breath', K((0, 0), (0.1, -2), (0.6, 0)))
    c.add('z', K((0, 0), (0.12, -0.004), (0.7, 0)))
    c.add('jaw', K((0, 0), (0.15, 0.35), (0.6, 0.05), (0.8, 0)))
    for S, d in (('L', 0.12), ('R', 0.16)):
        c.add(f'w{S}_stroke', K((0, 0), (d, 0), (d + 0.12, 7), (0.8, 0)))
    c.add('tremor', K((0, 0), (0.08, 0.6), (0.4, 0)))
    return c


@clip
def hit_big():
    """A blow that really lands, from its front left: in the first tenth of a second the head and neck are thrown back
    and away to its right, the jaw flung open, the body jolted back and leaning off the struck side so the left forefoot
    comes up off the ground, the wings flung out wide; it gives ground, the left forefoot put down a step back and the
    right after it; a snarl, and it steps up into its place again."""
    c = Clip('hit_big', 1.8)
    stance(c, tail=0.5)
    c.add('z', K((0, 0), (0.14, -0.02, 's'), (0.5, -0.034), (1.0, -0.034), (1.55, 0)))
    c.add('x', K((0, 0), (0.14, -0.012, 's'), (0.6, -0.014), (1.5, 0)))
    c.add('pitch', K((0, 0), (0.14, 6, 's'), (0.5, 4), (1.0, 1.5), (1.6, 0)))
    c.add('roll', K((0, 0), (0.14, -7, 's'), (0.5, -6), (0.75, -2), (1.4, 0)))
    c.add('yaw', K((0, 0), (0.14, -9, 's'), (0.6, -7), (1.55, 0)))
    c.add('nk_reach', K((0, 0), (0.12, 16, 's'), (0.5, 12), (1.1, 0)))
    c.add('nk_pitch', K((0, 0), (0.12, 26, 's'), (0.45, 18), (1.0, 4), (1.35, -4), (1.8, 0)))
    c.add('nk_yaw', K((0, 0), (0.12, -28, 's'), (0.5, -20), (1.25, 0)))
    c.add('hd_pitch', K((0, 0), (0.14, 18, 's'), (0.5, 10), (1.1, 0)))
    c.add('hd_yaw', K((0, 0), (0.14, -14, 's'), (0.6, -8), (1.25, 0)))
    c.add('hd_roll', K((0, 0), (0.2, -16), (0.8, 0)))
    c.add('jaw', K((0, 0), (0.12, 0.8), (0.5, 0.5), (0.85, 0.2), (1.2, 0.65), (1.6, 0.05), (1.8, 0)))
    c.add('tremor', K((0, 0), (0.1, 1.4), (0.6, 0.3), (1.0, 0)))
    # the left forefoot comes up off the ground, pawing, and is put down a step back; the right steps back after it;
    # then both step up again (the clip ends where it began: a step back the game would otherwise slide it)
    c.add('FL_y', K((0, 0), (0.16, 0), (0.36, 0.07), (0.62, 0, 's'), (1.05, 0), (1.2, 0.03), (1.36, 0)))
    c.add('FL_z', K((0, 0), (0.2, 0), (0.62, -0.05), (1.05, -0.05), (1.36, 0)))
    c.add('FL_tilt', K((0, 0), (0.2, 0), (0.36, -24), (0.62, 0)))
    c.add('FL_curl', K((0, 0), (0.2, 0), (0.36, -0.5), (0.62, 0)))
    c.add('FR_y', K((0, 0), (0.5, 0), (0.64, 0.03), (0.82, 0), (1.2, 0), (1.34, 0.025), (1.5, 0)))
    c.add('FR_z', K((0, 0), (0.5, 0), (0.8, -0.034), (1.2, -0.034), (1.5, 0)))
    c.add('tl_yaw', K((0, 0), (0.25, 35), (0.9, -12), (1.6, 0)))
    c.add('tl_pitch', K((0, 0), (0.2, 16), (1.0, 0)))
    for S, d in (('L', 0.0), ('R', 0.05)):
        c.add(f'w{S}_spread', K((0, 0), (0.28 + d, 0.85), (0.65 + d, 0.7), (1.3 + d, 0.12), (1.8, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (0.28 + d, 42), (0.65 + d, 30), (1.3 + d, 6), (1.8, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (0.2 + d, 18), (1.3 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (0.2, 1.6), (1.2, 0.3), (1.8, 0)))
    c.set('w_lag', 0.16)
    return c


@clip
def stagger():
    """Stunned: the legs give, the head hangs and swings low, the wings droop with their tips on the ground; then a
    shake that runs down the body, and up with a snarl."""
    c = Clip('stagger', 6.2)
    stance(c, tail=K((0, 0.4), (1.0, 0.25), (4.6, 0.25), (6.2, 0.5)))
    te, tx = 1.0, 4.6
    c.add('y', K((0, 0), (te, -0.035), (tx, -0.032), (5.6, 0), (6.2, 0)))
    c.add('pitch', K((0, 0), (te, -6), (tx, -5), (5.6, 2), (6.2, 0)))
    c.add('nk_pitch', K((0, 0), (te, -34), (tx, -32), (5.3, -6), (5.7, 18), (6.2, 0)))
    c.add('hd_pitch', K((0, 0), (te, -16), (tx, -14), (5.4, 6), (6.2, 0)))
    sway = lambda t: 16 * np.sin(2 * np.pi * (np.asarray(t) - te) / 2.6) * window(te - 0.2, te + 0.6, tx - 0.4, tx + 0.2)(t)  # noqa: E731
    c.add('hd_yaw', sway)
    c.add('nk_yaw', lambda t: 0.6 * sway(np.asarray(t) - 0.15))
    c.add('x', lambda t: -0.006 * np.sin(2 * np.pi * (np.asarray(t) - te - 0.4) / 2.6) * window(te, te + 0.6, tx - 0.4, tx)(t))
    c.add('jaw', K((0, 0), (te, 0.3), (tx, 0.28), (5.2, 0.1), (5.7, 0.9), (6.1, 0.2)))
    c.add('nk_roll', lambda t: 16 * np.sin(2 * np.pi * (np.asarray(t) - tx - 0.1) / 0.34) * window(tx, tx + 0.1, tx + 0.45, tx + 0.6)(t))
    c.add('sp_roll', lambda t: 9 * np.sin(2 * np.pi * (np.asarray(t) - tx - 0.25) / 0.34) * window(tx + 0.15, tx + 0.25, tx + 0.6, tx + 0.75)(t))
    c.add('tl_wave', lambda t: 14 * window(tx + 0.3, tx + 0.4, tx + 0.9, tx + 1.2)(t))
    c.set('tl_wave_T', 0.5)
    for S in 'LR':
        c.add(f'F{S}_splay', K((0, 0), (te, 0.5), (tx, 0.5), (5.6, 0)))
        o = 0.0 if S == 'L' else 0.12
        c.add(f'F{S}_x', K((0, 0), (0.55 + o, 0), (0.85 + o, 0.015 * (1 if S == 'L' else -1)), (4.95 + o, 0.015 * (1 if S == 'L' else -1)), (5.25 + o, 0)))
        c.add(f'F{S}_y', K((0, 0), (0.55 + o, 0), (0.7 + o, 0.02), (0.85 + o, 0), (4.95 + o, 0), (5.1 + o, 0.02), (5.25 + o, 0)))
        c.add(f'w{S}_spread', K((0, 0), (te, 0.64), (tx, 0.66), (5.4, 0.1), (6.2, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (te, -54), (tx - 0.3, -56), (tx + 0.3, -20), (5.4, 6), (6.2, 0)))      # (up off the ground before the shake)
        c.add(f'w{S}_ripple', K((0, 0), (te, 0.4), (tx, 0.4), (tx + 0.6, 1.4), (6.2, 0)))
    c.add('tremor', K((0, 0), (5.55, 0), (5.7, 1.2), (6.1, 0)))
    c.add('FR_y', K((0, 0), (2.3, 0), (2.45, 0.02), (2.6, 0, 's'), (6.2, 0)))
    c.add('FR_x', K((0, 0), (2.3, 0), (2.6, -0.012), (5.07, -0.012), (5.37, 0)))      # (moves only while it's lifted)
    return c


@clip
def enrage():
    """Rears up over its hind feet (on their balls), forelimbs high and wide with the claws open, wings full out; roars
    to the sky shaking, then brings its head down at you, still reared, and comes down hard on both forefeet."""
    c = Clip('enrage', 4.6)
    c.add('tl_level', 0.45)
    c.add('pivot_h', 1.0)
    stance(c, tail=0.7, splay=0.3)
    tr, tro, ts = 1.35, 2.15, 3.75
    c.add('y', K((0, 0), (tr, -0.016), (tro, 0.012), (ts - 0.1, 0.012), (ts + 0.25, -0.006, 's'), (4.6, -0.008)))
    c.add('pitch', K((0, 0), (tr, -4), (tro, 34), (ts - 0.05, 32), (ts + 0.25, -4, 's'), (4.6, -1)))
    c.add('tremor', K((0, 0), (0.2, 1.4), (tr, 1.6), (tro, 0.8), (tro + 0.2, 1.8), (ts, 1.6), (4.3, 0.2), (4.6, 0)))
    c.add('breath', lambda t: 3 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 0.7)) * window(0, 0.2, tr - 0.2, tr)(t))
    for S, sg in (('L', 1), ('R', -1)):
        c.add(f'F{S}_follow', K((0, 0), (tr, 0), (tro, 0.9), (ts - 0.1, 0.9), (ts + 0.25, 0, 's')))
        c.add(f'F{S}_by', K((0, 0), (tr, 0), (tro, 0.075), (ts - 0.15, 0.07), (ts + 0.1, 0)))
        c.add(f'F{S}_bx', K((0, 0), (tr, 0), (tro, 0.045 * sg), (ts - 0.15, 0.04 * sg), (ts + 0.1, 0)))
        c.add(f'F{S}_bz', K((0, 0), (tr, 0), (tro, 0.03), (ts, 0)))
        c.add(f'F{S}_tilt', K((0, 0), (tr + 0.15, 0), (tro, -25), (ts - 0.15, -20), (ts + 0.05, 10), (ts + 0.25, 0)))
        c.add(f'F{S}_curl', K((0, 0), (tr, 0), (tro, -0.9), (ts, -0.9), (ts + 0.3, 0.3), (4.6, 0)))
        c.add(f'F{S}_spread', K((0, 0), (tr, 0), (tro, 1), (ts + 0.3, 1), (4.6, 0.3)))
        c.add(f'F{S}_splay', K((0, 0), (tr, 0), (tro, 0.9), (ts, 0.6), (4.6, 0.3)))
        c.add(f'F{S}_scap', K((0, 0), (tr, 0), (tro, 20), (ts, 16), (ts + 0.3, -4), (4.6, 0)))
        c.add(f'F{S}_z', K((0, 0), (tr, 0), (tro, 0.06), (ts + 0.25, 0.07, 's'), (4.6, 0.07)))
        c.add(f'H{S}_heel', K((0, 0), (tr, 4), (tro, 28), (ts, 26), (ts + 0.3, 6), (4.6, 0)))
    c.add('nk_pitch', K((0, 0), (tr, -18), (tro + 0.1, 30), (2.7, 22), (3.15, 4), (ts, 2), (ts + 0.3, -14, 's'), (4.6, -10)))
    c.add('nk_reach', K((0, 0), (tro + 0.1, 0), (2.7, 0), (3.15, -26), (ts, -24), (ts + 0.3, -30, 's'), (4.6, -14)))
    c.add('hd_pitch', K((0, 0), (tr, 8), (tro + 0.15, 22), (2.7, 16), (3.15, 18), (ts, 14), (ts + 0.3, 6), (4.6, 8)))
    c.add('jaw', K((0, 0), (tr, 0.4), (tro + 0.1, 1.0), (ts, 0.95), (ts + 0.4, 0.3), (4.6, 0.2)))
    c.add('hd_yaw', K((tro, 0), (2.6, 10), (3.1, -6), (ts, 0)))
    c.add('tl_pitch', K((0, 0), (tr, 10), (tro, -16), (ts, -12), (4.6, 4)))
    c.add('tl_wave', 14)
    c.set('tl_wave_T', 1.5)
    for S, d in (('L', 0.0), ('R', 0.05)):
        c.add(f'w{S}_spread', K((0, 0), (tr + d, 0.4), (tro + d, 1.0), (ts + d, 1.0), (4.4 + d, 0.3)))
        c.add(f'w{S}_stroke', K((0, 0), (tr + d, 20), (tro + d, 40), (ts + d, 36), (ts + 0.3 + d, -12, 'f'), (4.6, 12)))
        c.add(f'w{S}_sweep', K((0, 0), (tro + d, 14), (ts + d, 10), (4.6, 0)))
        c.add(f'w{S}_ripple', K((0, 0.6), (tro, 0.3), (ts, 0.4), (ts + 0.3, 1.3), (4.6, 0.4)))
    c.set('w_lag', 0.2)
    impact(c, ts + 0.25, depth=0.012, shake=1.6)
    return c


@clip
def death():
    """Its legs go, one foreleg first; it sinks onto its chest and rolls over a little onto its right side; the neck goes
    down along the ground and the head comes to rest on it, jaw slack; the legs fold under the weight; the wings slump,
    the lower one along the ground, the upper draped over the flank; the tail slaps once; a last breath."""
    c = Clip('death', 6.6)
    c.set('toe_floor', 1.0)
    stance(c, tail=K((0, 0.4), (2.6, 0.55), (6.6, 0.4)))
    th, tc, tg = 0.3, 1.65, 2.35
    c.add('y', K((0, 0), (th, -0.004), (tc, -0.03), (tg, -0.14, 's'), (tg + 0.18, -0.128), (2.8, -0.14), (6.6, -0.14)))
    c.add('pitch', K((0, 0), (th, 3), (tc, -8), (tg, -12, 's'), (2.8, -10), (6.6, -10)))
    c.add('roll', K((0, 0), (0.9, -6), (tc, -10), (tg, -18), (3.2, -24), (6.6, -24)))
    c.add('nk_reach', K((0, 0), (th, 8), (tc, -8), (tg + 0.1, -26), (3.0, -52, 's'), (6.6, -54)))
    c.add('nk_pitch', K((0, 0), (th, 12, 's'), (0.9, 4), (tc, -10), (tg + 0.1, -14), (3.0, -22, 's'), (6.6, -23)))
    c.add('nk_pitch', settle(3.02, 7, 0.3, 0.7))
    c.add('nk_yaw', K((0, 0), (th, -14), (tc, 10), (3.0, -26), (6.6, -28)))
    c.add('hd_pitch', K((0, 0), (th, 8), (2.4, -6), (3.0, -10, 's'), (6.6, -12)))
    c.add('hd_roll', K((0, 0), (3.0, -18), (6.6, -20)))
    c.add('jaw', K((0, 0), (th, 0.6), (0.9, 0.3), (tc, 0.7), (3.0, 0.45), (4.4, 0.45), (5.0, 0.2), (6.6, 0.18)))
    c.add('tremor', K((0, 0), (th, 1.3), (0.8, 0.2), (tg, 1.0), (2.6, 0)))
    # one foreleg goes first; then the legs fold under the weight where they stand (the feet stay where they are)
    c.add('FR_y', K((0, 0), (0.7, 0), (0.85, 0.02), (1.0, 0, 's')))
    c.add('FR_x', K((0, 0), (0.7, 0), (1.0, -0.02), (6.6, -0.02)))
    for S, sg in (('L', 1), ('R', -1)):
        c.add(f'F{S}_splay', K((0, 0), (tc, 0.3), (6.6, 0.35)))
        c.add(f'H{S}_splay', K((0, 0), (tc, 0.3), (6.6, 0.4)))
        c.add(f'F{S}_curl', K((0, 0), (tg, -0.3), (3.0, 0.5), (6.6, 0.55)))
        c.add(f'H{S}_curl', K((0, 0), (tg, -0.2), (3.0, 0.4), (6.6, 0.45)))
    # the tail slaps last; the wings slump: the right (the low side) along the ground, the left draped over
    c.add('tl_yaw', K((0, 0), (tc, 20), (3.05, -25, 's'), (6.6, -28)))
    c.add('tl_pitch', K((0, 0), (tc, 18), (3.05, -14, 's'), (6.6, -14)))
    c.set('tl_lag', 0.05)
    c.add('wL_spread', K((0, 0), (th, 0.3), (tc, 0.5), (tg, 0.55), (3.3, 0.58), (6.6, 0.58)))
    c.add('wL_fold', K((0, 0), (tg, 0.1), (6.6, 0.15)))
    c.add('wL_stroke', K((0, 0), (th, 18), (tc, 6), (tg + 0.1, -58, 'f'), (3.3, -74), (6.6, -78)))
    c.add('wR_spread', K((0, 0), (th, 0.3), (tc, 0.5), (tg + 0.08, 0.6), (3.38, 0.62), (6.6, 0.62)))
    c.add('wR_stroke', K((0, 0), (th, 18), (tc, 6), (tg + 0.18, -16, 'f'), (3.38, -26), (6.6, -28)))
    for S in 'LR':
        c.add(f'w{S}_ripple', K((0, 0), (tg, 1.4), (3.4, 0.2), (4.0, 0)))
    c.set('w_lag', 0.24)
    # one last breath
    c.add('breath', K((0, 0), (3.6, 0), (4.4, 4), (5.4, -1), (6.6, -1)))
    impact(c, tg, depth=0.0, shake=1.0)
    return c


@clip
def death_air():
    """Killed on the wing: a jolt and the wings stop, one folding, one flailing; it rolls as it falls, limbs and tail
    trailing up; it hits on its left side and the head arcs down after and bounces once; it ploughs a little and lies on
    its side, the under wing folded beneath it, the upper flopped over the top and down the far side with its fingers on
    the ground, the legs folded, the head in the dirt."""
    c = Clip('death_air', 5.6, air=[FLY_Y * 2, 0])
    c.set('toe_floor', 1.0)
    tg = 2.15
    top = FLY_Y * 2
    c.add('y', K((0, top), (0.3, top + 0.01), (tg, -0.04, 's'), (tg + 0.2, -0.07), (2.75, -0.1, 's'), (5.6, -0.1)))
    c.add('pitch', K((0, 4), (0.3, 10), (1.4, -22), (tg, -30, 's'), (tg + 0.3, -12), (3.0, -6), (5.6, -5)))
    c.add('roll', K((0, 0), (0.3, -6), (1.6, 52), (tg, 70, 's'), (tg + 0.35, 58), (3.0, 62), (5.6, 62)))
    c.add('yaw', K((0, 0), (tg, 18), (5.6, 30)))
    c.add('nk_reach', K((0, -30), (0.3, -14), (1.6, 10), (tg, 6), (tg + 0.3, -40, 's'), (tg + 0.5, -32), (2.9, -42), (5.6, -44)))
    c.add('nk_pitch', K((0, -6), (0.3, -4), (1.6, 8), (tg, 6), (tg + 0.3, -18, 's'), (5.6, -20)))
    c.add('nk_yaw', K((0, 0), (1.6, -20), (tg + 0.3, 24), (5.6, 28)))
    c.add('hd_pitch', K((0, 0), (0.3, 12), (tg + 0.3, -12, 's'), (5.6, -14)))
    c.add('hd_roll', K((0, 0), (tg + 0.3, 16), (5.6, 18)))
    c.add('jaw', K((0, 0.2), (0.3, 0.8), (1.5, 0.5), (tg, 0.7), (3.4, 0.3), (5.6, 0.2)))
    c.add('tl_straight', K((0, 1), (tg, 0.95), (5.6, 0.5)))
    c.add('tl_pitch', K((0, 0), (1.4, 32), (tg, 26), (tg + 0.4, -18, 's'), (5.6, -14)))
    c.add('tl_wave', K((0, 4), (0.4, 18), (tg, 18), (tg + 0.6, 4), (5.6, 0)))
    c.set('tl_wave_T', 0.9)
    # falling, the legs trail up; down, they fold, the feet against the body
    legs_tucked(c, front=0.4, hind=0.4, env=lambda t: 1 - smooth(t, tg + 0.5, 3.4))
    for S in 'LR':
        c.add(f'F{S}_follow', K((0, 0), (tg + 0.5, 0), (3.4, 0.8), (5.6, 0.8)))
        c.add(f'H{S}_follow', K((0, 0), (tg + 0.5, 0), (3.4, 0.7), (5.6, 0.7)))
        c.add(f'F{S}_by', K((0, 0), (0.6, 0.05), (tg - 0.3, 0.06), (tg + 0.4, 0.03), (5.6, 0.04)))
        c.add(f'H{S}_by', K((0, 0), (0.6, 0.04), (tg - 0.3, 0.05), (tg + 0.4, 0.03), (5.6, 0.04)))
        c.add(f'F{S}_tilt', K((0, 0), (tg + 0.5, 0), (3.4, 40 if S == 'R' else 15), (5.6, 45 if S == 'R' else 15)))
        c.add(f'H{S}_tilt', K((0, 0), (tg + 0.5, 0), (3.4, 40), (5.6, 45)))
        c.add(f'F{S}_splay', K((0, 0), (tg, 0.3), (5.6, 0.3)))
        c.add(f'H{S}_splay', K((0, 0), (tg, 0.25), (5.6, 0.3)))
    # the paw it lands on (the left fore) tucked in toward the belly, up off the ground it lies on, laid flatter and the toes
    # curled in (the black's otherwise go through the floor)
    c.add('FL_bx', K((0, 0), (tg - 0.2, 0), (tg + 0.3, -0.09), (5.6, -0.09)))
    c.add('FL_curl', K((0, 0), (tg, 0), (tg + 0.5, -0.3), (5.6, -0.3)))
    # the left wing folds as it dies and ends folded under; the right flails as it falls and ends draped over the top
    c.add('wL_spread', K((0, 1), (0.3, 1), (1.0, 0.4), (tg, 0.3), (tg + 0.5, 0.25), (5.6, 0.25)))
    c.add('wL_fold', K((0, 0), (1.0, 0.45), (tg, 0.55), (tg + 0.5, 0.6), (5.6, 0.6)))
    c.add('wL_stroke', K((0, 30), (0.3, 30), (1.2, 50), (tg, 46), (tg + 0.4, 56, 'f'), (5.6, 56)))
    c.add('wR_spread', K((0, 1), (tg, 0.85), (tg + 0.5, 0.52), (5.6, 0.5)))
    c.add('wR_fold', K((0, 0), (tg + 0.5, 0.4), (5.6, 0.45)))
    c.add('wR_stroke', lambda t: K((0, 30), (0.3, 30), (tg, 20), (tg + 0.7, -112, 'f'), (5.6, -120))(t) + 30 * np.sin(2 * np.pi * np.asarray(t) / 0.55) * window(0.35, 0.5, tg - 0.3, tg)(t))
    c.add('wR_sweep', lambda t: 20 * np.sin(2 * np.pi * np.asarray(t) / 0.55 + 1) * window(0.35, 0.5, tg - 0.3, tg)(t))
    for S in 'LR':
        c.add(f'w{S}_ripple', K((0, 0), (0.4, 2.0), (tg, 2.0), (tg + 0.6, 0.3), (5.6, 0)))
    c.add('tremor', K((0, 0), (0.05, 1.5), (0.5, 0), (tg, 0), (tg + 0.05, 2.0), (tg + 0.6, 0)))
    c.add('breath', K((0, 0), (3.6, 0), (4.4, 3), (5.4, -1)))
    return c


@clip
def rise():
    """Up from below the edge: labouring beats as it climbs, one great downstroke that throws it over the lip, then
    slow, heavy hovering beats at the top while it roars; then down on to the island, heavy, and the wings fold."""
    c = Clip('rise', 10.0, air=[-0.5, 0])
    c.add('tl_level', 0.6)
    c.add('floor', K((0, -2.0), (5.8, -2.0), (6.3, 0.0)))     # it climbs up past the island's edge, then is over it
    tg, ta, tl = 3.0, 4.0, 7.2
    c.add('y', K((0, -0.5), (tg, -0.12), (ta, 0.26), (5.2, 0.27), (6.2, 0.2), (tl - 0.02, 0.01), (tl, 0.0, 's'), (tl + 0.2, -0.02), (8.0, 0), (10, 0)))
    c.add('z', K((0, -0.12), (tg, -0.06), (ta, 0.0), (tl, 0.04), (10, 0.04)))
    c.add('pitch', K((0, 50), (tg, 46), (ta, 30), (5.2, 26), (6.4, 40), (tl, 4, 's'), (8.0, 0), (10, 0)))
    c.add('nk_pitch', K((0, -6), (tg, -4), (ta, 16), (5.0, 24), (6.2, 0), (tl + 0.08, -20, 's'), (8.2, -4), (9.0, 6), (10, 0)))
    c.add('nk_s', K((0, 8), (ta, -2), (6.2, 4), (10, 0)))
    c.add('hd_world', K((0, 1), (ta, 1), (6.2, 0.7), (tl, 0)))
    c.add('hd_wpitch', K((0, 10), (tg, 12), (ta, 24), (5.4, 18), (6.2, -6)))
    c.add('jaw', K((0, 0.2), (ta - 0.1, 0.3), (ta + 0.25, 1.0), (5.6, 0.95), (6.0, 0.1), (tl, 0.2), (8.8, 0.1), (9.1, 0.7), (9.7, 0.1), (10, 0)))
    c.add('tremor', K((0, 0), (ta + 0.2, 0), (ta + 0.35, 1.6), (5.6, 1.3), (6.0, 0), (9.05, 0), (9.15, 1.0), (9.6, 0)))
    c.add('tl_straight', K((0, 1), (tl, 1), (10, 0.45)))
    c.add('tl_pitch', K((0, -30), (tg, -24), (ta, 10), (5.2, 18), (tl, -10), (tl + 0.2, -14, 's'), (8.4, 0), (10, 0)))
    c.add('tl_wave', K((0, 10), (tl, 8), (10, 4)))
    c.set('tl_wave_T', 2.5)
    # hover beats while it climbs, then the great one, then the wings held wide
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.035, 0.96)):
        st = [(0, 40 * a)]
        sp = [(0, 1.0)]
        fo = [(0, 0)]
        for b in range(2):
            t0 = b * 1.4
            st += [(t0 + 0.8 + d, -34 * a, 'f'), (t0 + 1.4 + d, 44 * a)]
            sp += [(t0 + 0.8 + d, 1.0), (t0 + 1.05 + d, 0.55), (t0 + 1.4 + d, 0.95)]
            fo += [(t0 + 0.8 + d, 0), (t0 + 1.05 + d, 0.45), (t0 + 1.4 + d, 0.05)]
        st += [(tg + 0.05 + d, 70 * a, 'f'), (ta - 0.1 + d, -50 * a, 'f'), (ta + 0.55 + d, 40 * a), (5.1 + d, -24 * a, 'f'), (5.75 + d, 50 * a), (6.8 + d, -10 * a), (tl + 0.15 + d, -22 * a, 'f'), (8.0 + d, 18), (8.4 + d, 30), (8.7 + d, 4), (9.4 + d, 0)]
        sp += [(tg + d, 1.0), (ta + d, 1.0), (6.4 + d, 1.0), (6.7 + d, 0.6), (7.0 + d, 1.0), (7.9 + d, 0.6), (8.4 + d, 0.65), (9.4 + d, 0)]
        fo += [(tg + d, 0.0), (ta + d, 0.0), (4.25 + d, 0.35), (4.55 + d, 0.0), (5.4 + d, 0.35), (5.7 + d, 0.0), (6.4 + d, 0.0), (6.7 + d, 0.4), (7.0 + d, 0.0)]
        c.add(f'w{S}_stroke', K(*st))
        c.add(f'w{S}_spread', K(*sp))
        c.add(f'w{S}_fold', K(*fo))
        c.add(f'w{S}_sweep', K((0, 0), (tg, 26), (ta, -6), (5.6, 4), (6.2, 30), (tl, 4), (9.4, 0)))
        c.add(f'w{S}_ripple', K((0, 0.3), (ta, 0.1), (5.6, 0.5), (8.6, 1.2), (10, 0)))
    c.set('w_lag', 0.2)
    for S in 'LR':
        c.add(f'F{S}_follow', K((0, 1), (6.2, 1), (tl - 0.05, 0.4), (tl + 0.05, 0, 's')))
        c.add(f'H{S}_follow', K((0, 1), (6.2, 1), (tl - 0.12, 0.5), (tl, 0, 's')))
        c.add(f'F{S}_by', K((0, 0.04), (ta, 0.07), (6.2, 0.0), (tl, 0)))
        c.add(f'F{S}_bz', K((0, -0.01), (ta, -0.02), (6.4, 0.06), (tl, 0.04)))
        c.add(f'F{S}_tilt', K((0, 35), (ta, 55), (6.4, 10), (tl, 0)))
        c.add(f'F{S}_curl', K((0, 0.5), (ta, 0.8), (6.4, -0.5), (tl, 0), (10, 0)))
        c.add(f'H{S}_bz', K((0, -0.02), (ta, -0.09), (6.4, 0.02), (tl, 0.02)))
        c.add(f'H{S}_by', K((0, 0.0), (ta, 0.04), (6.4, -0.02), (tl, 0)))
        c.add(f'H{S}_tilt', K((0, 45), (ta, 70), (6.4, 10), (tl, 0)))
        c.add(f'H{S}_heel', K((0, 20), (ta, 40), (6.4, 10), (tl, 0)))
        c.add(f'F{S}_z', K((0, 0.04), (tl, 0.04), (10, 0.04)))
        c.add(f'H{S}_z', K((0, 0.04), (tl, 0.04), (10, 0.04)))
    impact(c, tl, depth=0.0, shake=1.6, dur=0.9)
    return c


# ---- round two: turning on the spot, stopping, a breath held as long as the fight wants, a held stun, the air --------

def turn_clip(name, deg, dur, n):
    """Turning on the spot about its middle (deg > 0 to its left): the head and eyes lead, the shoulders follow, the hips
    last; each foot lifted and put down again where it belongs under the turning body, in the walking order, n steps
    each; the last of them catch up after the body has finished, as a big animal's do; the tail swings wide behind.
    info turn: how far the clip turns it, for the game to take over at the end."""
    c = Clip(name, dur, turn=deg)
    stance(c, low=0.006, tail=0.55)
    t0 = 0.25
    span = (dur - 0.15 - t0) / (n + 0.08)
    sg = 1 if deg > 0 else -1
    order = ('FL', 'HR', 'FR', 'HL') if deg > 0 else ('FR', 'HL', 'FL', 'HR')
    t1 = t0 + (n - 1 + 0.42) * span          # the body is round by the time the first foot takes its last step
    yaw = K((0, 0), (t0, 0), (t1, deg, 'f'), (dur, deg))
    c.add('yaw', yaw)
    steps = []
    for k in range(n):
        for i, foot in enumerate(order):
            a = t0 + k * span + i * span * 0.22
            steps.append((foot, a, a + span * 0.42))
    step_round(c, yaw, steps, about='middle', lift_f=0.03, lift_h=0.025)
    c.add('hd_yaw', K((0, 0), (t0, 24 * sg), (t1 - 0.3, 16 * sg), (t1 + 0.3, 0), (dur, 0)))
    c.add('nk_yaw', K((0, 0), (t0 + 0.1, 14 * sg), (t1 - 0.2, 8 * sg), (t1 + 0.4, 0), (dur, 0)))
    c.add('sp_yaw', K((0, 0), (t0 + 0.2, 8 * sg), (t1 - 0.1, 4 * sg), (t1 + 0.5, 0), (dur, 0)))
    c.add('tl_yaw', K((0, 0), (t0 + 0.3, -28 * sg), (t1, -18 * sg), (dur, 0)))
    c.set('tl_lag', 0.06)
    c.add('y', lambda t: -0.004 * np.sin(np.pi * np.clip((np.asarray(t) - t0) / (dur - t0 - 0.15), 0, 1)))
    wings_pose(c, spread=K((0, 0), (t0, 0.12), (t1, 0.12), (dur, 0)), stroke=K((0, 0), (t0, 8), (t1, 6), (dur, 0)))
    return c


@clip
def turn_l():
    return turn_clip('turn_l', 90, 3.0, 2)


@clip
def turn_r():
    return turn_clip('turn_r', -90, 3.0, 2)


@clip
def turn_180():
    return turn_clip('turn_180', 180, 4.8, 3)


@clip
def charge_stop():
    """Out of the charge: the feet thrown out ahead and braced where they stop, the body still coming on over them from
    behind, the head and neck flung up, the wings snapping open forward to brake, the tail swinging round; it rocks
    back once and settles into its fighting stance."""
    c = Clip('charge_stop', 2.2)
    stance(c, low=0.012, splay=0.3, tail=K((0, 0.9), (2.2, 0.6)))
    c.add('pivot_h', 0.5)
    c.add('z', K((0, -0.07), (0.45, -0.01), (0.7, 0.012, 'f'), (1.2, -0.006), (1.8, 0)))
    c.add('pitch', K((0, -6), (0.3, 5), (0.7, -5), (1.2, 2), (1.8, 0)))
    c.add('y', K((0, 0.004), (0.4, -0.016), (0.7, -0.01), (1.3, -0.006), (2.2, 0)))
    for S in 'LR':
        c.add(f'F{S}_curl', K((0, 0), (0.3, -0.5), (0.8, -0.3), (1.5, 0)))
        c.add(f'H{S}_heel', K((0, 0), (0.3, 16), (0.8, 6), (1.4, 0)))
    c.add('nk_reach', K((0, -38), (0.5, -6), (0.8, -20), (1.4, -10), (2.2, -6)))
    c.add('nk_pitch', K((0, -6), (0.5, 12), (0.85, -12), (1.4, -14), (2.2, -14)))
    c.add('hd_pitch', K((0, 20), (0.5, -8), (1.0, 8), (2.2, 9)))
    c.add('jaw', K((0, 0.15), (0.5, 0.55), (1.0, 0.15), (2.2, 0.12)))
    c.add('tremor', K((0, 0), (0.4, 0.8), (0.9, 0)))
    c.add('tl_yaw', K((0, 0), (0.5, 30), (1.2, -16), (2.0, 0)))
    for S, d in (('L', 0.0), ('R', 0.05)):
        c.add(f'w{S}_spread', K((0, 0.2), (0.35 + d, 0.9), (0.9 + d, 0.85), (1.6 + d, 0.3), (2.2, 0.15)))
        c.add(f'w{S}_stroke', K((0, -6), (0.35 + d, 30), (0.9 + d, 24), (1.6 + d, 10), (2.2, 8)))
        c.add(f'w{S}_sweep', K((0, 0), (0.35 + d, 28), (0.9 + d, 20), (1.8 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (0.5, 1.2), (1.4, 0.3), (2.2, 0.4)))
    c.set('w_lag', 0.2)
    return c


@clip
def breath_in():
    """The first part of a breath of any length (breath_in, breath_hold for as long as the fight pours it,
    breath_out): drawn in, and the stream let go at the end."""
    c = Clip('breath_in', 1.7, breathWin=[1.5 / 1.7, 1.0])
    stance(c, tail=0.6, splay=K((0, 0), (1.2, 0.35)))
    breath_pose(c, 1.3, 99.0, 100.0)
    c.info['aim'] = [1.15, 1.7]
    c.add('tremor', window(1.45, 1.7, 99, 100))
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (1.2, 0), (1.5, 8)))
    wings_pose(c, spread=K((0, 0), (1.3, 0.25)), stroke=K((0, 0), (1.3, 12)))
    return c


@clip
def breath_hold():
    """The stream poured: held steady and braced against its push, the throat pulsing; a loop."""
    c = Clip('breath_hold', 2.0, loop=True, breathWin=[0.0, 1.0])
    stance(c, tail=0.6, splay=0.35)
    breath_pose(c, -10.0, 99.0, 100.0)
    c.info['aim'] = [0.0, 2.0]
    c.add('jaw', lambda t: 0.06 * np.sin(2 * np.pi * np.asarray(t) / 0.5))
    c.add('breath', lambda t: 1.2 * np.sin(2 * np.pi * np.asarray(t) / 0.5))
    c.add('hd_wyaw', lambda t: 3 * np.sin(2 * np.pi * np.asarray(t) / 2.0))
    c.add('nk_roll', lambda t: 1.5 * np.sin(2 * np.pi * np.asarray(t) / 0.25))      # the push of the stream (a shake that loops)
    for S in 'LR':
        c.add(f'H{S}_heel', 8)
    wings_pose(c, spread=0.25, stroke=12)
    return c


@clip
def breath_out():
    """The end of a held breath: the mouth snaps shut, the neck comes back up with a shake, the weight back."""
    c = Clip('breath_out', 1.0)
    stance(c, tail=0.6, splay=K((0, 0.35), (1.0, 0.0)))
    breath_pose(c, -10.0, 0.0, 1.0)
    c.info['aim'] = [0.0, 0.25]
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 8), (0.6, 0)))
    wings_pose(c, spread=K((0, 0.25), (1.0, 0)), stroke=K((0, 12), (1.0, 0)))
    return c


@clip
def stagger_loop():
    """Stunned, held as long as the fight keeps it down: legs braced wide and giving, the chest sunk, the neck hung so the
    head all but drags on the ground and swings slowly side to side, the jaw hanging open, the wings sagged out with
    their fingers on the ground, breathing hard; a loop. Nothing like its fighting stance (idle_enraged): there the head
    is up and weaving and the wings are raised."""
    T = 5.2
    c = Clip('stagger_loop', T, loop=True)
    stance(c, splay=0.55, tail=0.2)
    c.add('y', lambda t: -0.07 + 0.003 * np.sin(2 * np.pi * np.asarray(t) / 2.6))
    c.add('pitch', -12)
    c.add('nk_reach', -55)
    c.add('nk_pitch', -40)
    c.add('hd_pitch', -6)
    sway = lambda t: 18 * np.sin(2 * np.pi * np.asarray(t) / T)      # noqa: E731
    c.add('hd_yaw', sway)
    c.add('nk_yaw', lambda t: 0.7 * sway(np.asarray(t) - 0.25))
    c.add('hd_roll', lambda t: 6 * np.sin(2 * np.pi * (np.asarray(t) - 0.4) / T))
    c.add('x', lambda t: -0.006 * np.sin(2 * np.pi * (np.asarray(t) - 0.4) / T))
    c.add('roll', lambda t: 2.5 * np.sin(2 * np.pi * (np.asarray(t) - 0.6) / T))
    c.add('jaw', lambda t: 0.5 + 0.06 * np.sin(2 * np.pi * np.asarray(t) / 1.3))
    c.add('breath', lambda t: 3.0 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 1.3)))
    c.add('tl_pitch', -6)
    for S, sg in (('L', 1), ('R', -1)):
        c.add(f'F{S}_splay', 0.6)
        c.add(f'H{S}_splay', 0.3)
        c.add(f'F{S}_x', 0.015 * sg)
        c.add(f'w{S}_spread', 0.66)
        c.add(f'w{S}_stroke', lambda t, sg=sg: -56 + 3 * sg * np.sin(2 * np.pi * np.asarray(t) / T))
        c.add(f'w{S}_ripple', 0.3)
    c.add('FR_x', -0.012)
    return c


@clip
def idle_enraged():
    """Its fighting stance once it's enraged: lower, wings half raised and quivering, the head low and weaving, panting
    through an open mouth, the tail lashing hard; a loop."""
    c = Clip('idle_enraged', 3.0, loop=True)
    stance(c, low=0.018, splay=0.4, tail=0.7)
    c.add('breath', lambda t: 2.6 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 0.75)))
    c.add('y', lambda t: 0.002 * np.sin(2 * np.pi * np.asarray(t) / 0.75))
    c.add('nk_reach', -20)
    c.add('nk_pitch', -8)
    c.add('hd_pitch', 12)
    c.add('hd_yaw', loopwobble(3.0, 21, 3, 12))
    c.add('nk_yaw', loopwobble(3.0, 22, 2, 8))
    c.add('sp_yaw', loopwobble(3.0, 23, 2, 4))
    c.add('jaw', lambda t: 0.35 + 0.15 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 0.75)))
    c.add('tl_wave', 24)
    c.set('tl_wave_T', 1.5)
    c.add('tl_pitch', 8)
    for S in 'LR':
        c.add(f'w{S}_spread', 0.45)
        c.add(f'w{S}_stroke', 26)
        c.add(f'w{S}_sweep', 6)
        c.add(f'w{S}_ripple', 1.0)
        c.add(f'F{S}_curl', -0.3)
    return c


@clip
def talon_strike():
    """An attack from the air: it comes in low on a glide, swings its body up and its feet forward as a hawk does,
    talons wide open and held out at you with a scream (two-thirds of a second, to be seen coming and dodged), and
    rakes through what's under it with all four, the wings thrown forward to brake; then a heavy beat carries it up and
    away. The clip strikes in place: the fight carries it over the ground between leap[0] and leap[1]."""
    th = 1.8
    c = Clip('talon_strike', 3.75, hit=th, air=[FLY_Y, FLY_Y], leap=[0.3, th + 0.1])
    c.add('floor', -3.0)
    c.add('tl_level', 0.6)
    air_body(c, pitch=K((0, 3), (0.8, -6), (1.25, 34), (th - 0.2, 38), (th + 0.15, 30), (2.65, 6), (3.75, 4)),
             neck=K((0, -34), (1.2, -10), (th - 0.3, -8), (th, -24), (3.75, -34)), look=K((0, -6), (0.8, -24), (th, -30), (2.75, -6)))
    c.add('y', K((0, FLY_Y), (0.9, FLY_Y - 0.15), (1.25, FLY_Y - 0.19), (th, FLY_Y - 0.22), (th + 0.3, FLY_Y - 0.19), (2.85, FLY_Y - 0.02), (3.75, FLY_Y)))
    tuck = K((0, 1), (0.55, 1), (1.1, 0), (2.35, 0), (3.15, 1))
    legs_tucked(c, env=tuck)
    for S in 'LR':
        # out of the tuck, the feet thrown forward and down, claws spread wide and held there; closed on the strike, and
        # drawn up again
        reach = lambda t: 1 - tuck(t)      # noqa: E731
        c.add(f'H{S}_follow', lambda t: reach(t))
        c.add(f'F{S}_follow', lambda t: reach(t))
        c.add(f'H{S}_bz', lambda t: 0.12 * reach(t))
        c.add(f'H{S}_by', lambda t: -0.05 * reach(t))
        c.add(f'H{S}_tilt', lambda t: -20 * reach(t))
        c.add(f'F{S}_bz', lambda t: 0.08 * reach(t))
        c.add(f'F{S}_by', lambda t: -0.03 * reach(t))
        c.add(f'H{S}_curl', K((0, 0), (0.9, 0), (1.15, -0.9), (th - 0.08, -0.95), (th + 0.14, 0.9), (2.55, 0.4), (3.05, 0)))
        c.add(f'F{S}_curl', K((0, 0), (0.9, 0), (1.15, -0.9), (th - 0.08, -0.95), (th + 0.16, 0.9), (2.55, 0.4), (3.05, 0)))
        c.add(f'F{S}_spread', K((0, 0), (1.15, 1), (th - 0.08, 1), (th + 0.12, 0.3), (2.75, 0)))
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.04, 0.95)):
        c.add(f'w{S}_spread', K((0, 1), (2.35 + d, 1), (2.6 + d, 0.6), (2.9 + d, 1), (3.75, 1)))
        c.add(f'w{S}_fold', K((0, 0), (2.35 + d, 0), (2.6 + d, 0.4), (2.9 + d, 0)))
        c.add(f'w{S}_stroke', K((0, 10), (0.8 + d, 6), (1.25 + d, 50 * a), (th - 0.2 + d, 56 * a), (th + 0.15 + d, 50 * a), (th + 0.75 + d, -34 * a, 'f'), (2.9 + d, 42 * a), (3.55 + d, -16 * a, 'f'), (3.75, -8)))
        c.add(f'w{S}_sweep', K((0, 0), (1.25 + d, 28), (th - 0.3 + d, 32), (th + 0.15 + d, 26), (th + 0.75 + d, -6), (3.75, 0)))
        c.add(f'w{S}_ripple', K((0, 0.3), (1.25, 0.8), (th, 1.4), (2.75, 0.3)))
    c.set('w_lag', 0.2)
    # the scream that goes with the talons held out: the head up, the jaw wide
    c.add('jaw', K((0, 0), (0.9, 0.2), (1.2, 0.9), (th - 0.1, 0.95), (th + 0.1, 0.6), (th + 0.5, 0.2), (2.95, 0)))
    c.add('hd_pitch', K((0, 0), (1.0, 0), (1.25, 12), (th - 0.15, 10), (th + 0.05, 0)))
    c.add('tl_pitch', K((0, 0), (1.25, -14), (th - 0.3, -18), (th + 0.3, -10), (2.95, 0)))
    c.add('tremor', K((0, 0), (1.2, 0), (1.3, 0.5), (th - 0.1, 0.4), (th, 0), (th + 0.05, 0.9), (th + 0.4, 0)))
    c.info['through'] = [th - 0.12, th + 0.18]
    return c


@clip
def hit_air():
    """Struck in the air: a jolt that throws the head and one wing back, a lurch down and a roll, and a ragged beat that
    catches it."""
    c = Clip('hit_air', 1.4, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)
    air_body(c, pitch=K((0, 4), (0.12, 12, 's'), (0.6, 0), (1.4, 4)))
    c.add('y', K((0, FLY_Y), (0.15, FLY_Y + 0.006), (0.5, FLY_Y - 0.03), (1.4, FLY_Y)))
    c.add('roll', K((0, 0), (0.15, -12, 's'), (0.7, 6), (1.4, 0)))
    legs_tucked(c)
    c.add('nk_pitch', K((0, 0), (0.12, 10, 's'), (0.7, 0)))
    c.add('nk_yaw', K((0, 0), (0.12, -10, 's'), (0.8, 0)))
    c.add('jaw', K((0, 0), (0.15, 0.6), (0.6, 0.1), (1.4, 0)))
    c.add('tremor', K((0, 0), (0.08, 1.0), (0.5, 0)))
    for S, d, a in (('L', 0.0, 1.0), ('R', 0.06, 0.8)):
        c.add(f'w{S}_spread', K((0, 1), (0.15 + d, 0.7), (0.5 + d, 1.0), (1.4, 1.0)))
        c.add(f'w{S}_fold', K((0, 0), (0.15 + d, 0.3), (0.5 + d, 0.0)))
        c.add(f'w{S}_stroke', K((0, 10), (0.15 + d, 40 * a), (0.75 + d, -30 * a, 'f'), (1.4, 8)))
        c.add(f'w{S}_sweep', K((0, 0), (0.15 + d, -20), (0.75 + d, 10), (1.4, 0)))
        c.add(f'w{S}_ripple', K((0, 0.3), (0.15, 2.0), (0.9, 0.3)))
    c.set('w_lag', 0.12)
    return c


@clip
def spit():
    """A quick fireball: the head drawn back and up with the jaw cracked and the chest filling (by 0.6 s), held there
    a quarter of a second so it can be seen coming, then snapped forward and down, mouth wide, the ball let go at the
    snap (hit, 1.0 s); a shake of the head after."""
    th, tb, tw = 1.0, 0.6, 0.85
    c = Clip('spit', 2.0, hit=th)
    stance(c, tail=0.5, splay=0.2)
    c.add('nk_reach', K((0, 0), (tb, 12), (tw, 14, 'f'), (th, -30, 's'), (th + 0.25, -26), (1.7, -4), (2.0, 0)))
    c.add('nk_pitch', K((0, 0), (tb, 10), (tw, 12, 'f'), (th, -4, 's'), (1.7, 0)))
    c.add('hd_pitch', K((0, 0), (tb, -10), (tw, -12, 'f'), (th, 0, 's'), (th + 0.3, -2), (1.8, 0)))
    c.add('jaw', K((0, 0), (tb, 0.3), (tw, 0.4), (th - 0.04, 1.0), (th + 0.2, 0.8), (th + 0.45, 0.05), (2.0, 0)))
    c.add('breath', K((0, 0), (tb, 4), (tw, 5), (th, 0), (1.3, 0)))
    c.add('y', K((0, 0), (tb, 0.004), (tw, 0.005), (th + 0.05, -0.008), (1.8, 0)))
    c.add('pitch', K((0, 0), (tb, 2), (tw, 2.5), (th + 0.05, -3), (1.8, 0)))
    c.add('tremor', K((0, 0), (tb, 0), (tw, 0.25), (th, 0), (th + 0.05, 0.8), (th + 0.35, 0)))
    c.add('hd_roll', lambda t: 7 * np.sin(2 * np.pi * (np.asarray(t) - th - 0.3) / 0.3) * window(th + 0.28, th + 0.34, th + 0.6, th + 0.75)(t))
    wings_pose(c, spread=K((0, 0), (tb, 0.2), (th, 0.3), (2.0, 0)), stroke=K((0, 0), (tb, 10), (th, 14), (2.0, 0)))
    c.info['through'] = [th - 0.05, th + 0.1]
    c.info['aim'] = [tw, th + 0.3]
    return c


# ---- round three: the breath in the air in three parts, knocked down and up again, steps off, turns in the air, the
# tail brought down from overhead, and a grab -----------------------------------------------------------------------------

HB_T = 1.4      # the hover's beat while it breathes
# The breath from the hover on one clock: drawn in until HB_IN (the stream let go at HB_TI), poured from HB_IN to HB_H1
# (two beats, the loop hover_breath_hold plays), and back into the hover by HB_END.
HB_IN, HB_TI = 2.2, 1.78
HB_H1 = HB_IN + 2 * HB_T
HB_END = HB_H1 + 1.4
# The pose it pours from: body down to 25 degrees, the neck thrown out long and low ahead of it from the root, the head
# well out in front of the hips and below the hover, aimed down at what it's burning (measured on the four dragons: the
# head 3.2-4.7 m ahead of the hips and 2-2.5 m under where it hangs in the hover, the mouth 5-6 m out).
HB_POUR = {'pitch': 25.0, 'reach': -90.0, 'npitch': -45.0, 'look': -30.0, 'y': -0.02}
HB_UP = {'pitch': 50.0, 'reach': 22.0, 'npitch': 12.0, 'ns': 12.0, 'look': 25.0, 'y': 0.07}


def hb_warp(t):
    """Where the wings are in their beats (0 the top of one) through the breath from the hover: one deep beat to the
    top by 1.1, hung there until 1.4; from rest there they pick up to the hover's own rate by 1.7 (the downstroke driven
    with the thrust) and keep it exactly while it pours (whole beats, so the held loop joins); after HB_H1 a slow, spent
    beat that comes to rest at the top of the next one as the clip ends."""
    t = np.asarray(t, float)
    r = 1 / HB_T
    a = K((0, 0), (0.3, 0.3 / HB_T), (1.1, 1.0, 'f'), (1.4, 1.0, 'f'))(t)
    x = np.clip((t - 1.4) / 0.3, 0, 1)
    a = a + r * 0.3 * (x ** 3 - x ** 4 / 2) + r * np.clip(t - 1.7, 0, None)       # (speed eased in from 0 to r, then r)
    p1 = 1.0 + r * 0.15 + r * (HB_H1 - 1.7)
    d = HB_END - HB_H1
    r2 = 2 * (np.ceil(p1) - p1) / d - r       # (r falling straight to r2 over the out: lands on the next top at HB_END)
    u = np.clip(t - HB_H1, 0, d)
    return a + (r2 - r) * u ** 2 / (2 * d)


def hover_breath_master(name):
    """The in-breath: one deep beat while the chest swells and lifts, the neck drawn back and up from its root, chin
    raised; it hangs at the top of the beat, wings held high, for a third of a second (the tell); then the thrust, the
    downstroke and the neck together, the body pitching down and the head driven out low, and the stream let go. Poured:
    the head held on its mark while the body heaves under it, the throat pulsing. Out: the mouth snaps shut, the neck
    comes back, the body settles back up into the hover, and it pants."""
    I, TI, H1, E = HB_IN, HB_TI, HB_H1, HB_END
    P, U = HB_POUR, HB_UP
    c = Clip(name, E, air=[FLY_Y, FLY_Y])
    c.add('floor', -3.0)          # up in the air: no ground under it to meet
    c.add('tl_level', 1.0)
    c.add('tl_straight', 1.0)
    c.add('tl_sag', 4)
    c.add('hd_world', 1.0)
    W = hb_warp         # (where the wings are in their beats)
    hover_wings(c, HB_T, warp=W)
    for S in 'LR':      # thrown up higher still as it hangs at the top
        c.add(f'w{S}_stroke', lambda t: 12 * window(0.75, 1.1, 1.4, 1.7)(t))
    hover_legs(c, HB_T)
    c.add('tl_pitch', lambda t: 35 + 5 * np.cos(2 * np.pi * (W(t) - 0.6)))
    hold = lambda a, b, v_hover, v_up, v_pour, f_up=1.1: K(      # noqa: E731
        (0, v_hover), (0.5, v_hover + (v_up - v_hover) * 0.35), (f_up, v_up), (1.4, v_up, 'f'), (a, v_pour, 'f'),
        (I, v_pour), (H1, v_pour), (H1 + 0.15, v_pour), (b, v_hover, 'f'), (E, v_hover))
    c.add('pitch', hold(1.92, E - 0.3, 40, U['pitch'], P['pitch']))
    c.add('nk_reach', hold(1.86, E - 0.5, -14 * 1.15, U['reach'], P['reach']))
    c.add('nk_pitch', hold(1.88, E - 0.45, -6, U['npitch'], P['npitch']))
    c.add('nk_s', hold(1.86, E - 0.5, 0, U['ns'], 0))
    c.add('hd_wpitch', hold(1.84, E - 0.55, -12, U['look'], P['look']))
    c.add('y', FLY_Y)
    c.add('y', hold(1.95, E - 0.25, 0, U['y'], P['y']))
    pour = window(TI, TI + 0.25, H1, H1 + 0.2)
    c.add('breath', K((0, 0), (1.1, 5), (1.4, 5.5, 'f'), (TI + 0.05, 1.2), (I, 1.0), (H1, 1.0), (H1 + 0.3, 0), (E, 0)))
    c.add('breath', lambda t: 1.2 * np.sin(2 * np.pi * (np.asarray(t) - I) / 0.7) * pour(t))
    c.add('breath', lambda t: 2.5 * np.abs(np.sin(2 * np.pi * (np.asarray(t) - H1) / 0.7)) * window(H1 + 0.3, H1 + 0.5, E - 0.2, E)(t))
    c.add('jaw', K((0, 0), (0.8, 0.15), (1.1, 0.35), (1.4, 0.4, 'f'), (TI, 1.0), (I, 0.97), (H1, 0.97), (H1 + 0.14, 0.0, 's'),
                   (H1 + 0.5, 0.3), (E - 0.2, 0.2), (E, 0)))
    c.add('jaw', lambda t: 0.04 * np.sin(2 * np.pi * (np.asarray(t) - I) / 0.7) * pour(t))
    c.add('nk_roll', lambda t: 1.5 * np.sin(2 * np.pi * (np.asarray(t) - I) / 0.35) * pour(t))      # the push of the stream
    c.add('nk_roll', lambda t: 6 * np.sin(2 * np.pi * (np.asarray(t) - H1 - 0.2) / 0.3) * window(H1 + 0.15, H1 + 0.22, H1 + 0.5, H1 + 0.62)(t))
    c.add('hd_wyaw', lambda t: 3 * np.sin(2 * np.pi * (np.asarray(t) - I) / (2 * HB_T)) * pour(t))
    c.add('tremor', K((0, 0), (TI - 0.04, 0), (TI + 0.12, 0.8), (H1, 0.8), (H1 + 0.2, 0)))
    c.add('z', K((0, 0), (TI, 0), (I, -0.008), (H1, -0.008), (H1 + 0.6, 0)))
    return c


def part_of(m, name, t0, dur, loop=False, **info):
    """A stretch of a longer clip, [t0, t0 + dur], as a clip of its own (the same drivers, read later)."""
    c = Clip(name, dur, loop, **{**m.info, **info})
    for key, fs in m.d.items():
        c.d[key] = [(lambda t, f=f: f(np.asarray(t, float) + t0)) for f in fs]
    return c


@clip
def hover_breath_in():
    """The breath from the hover, the first part of one of any length (hover_breath_in, hover_breath_hold for as long as
    the fight pours it, hover_breath_out): drawn up and back, the tell held at the top of the beat, the thrust, and the
    stream let go at the end."""
    c = part_of(hover_breath_master('m'), 'hover_breath_in', 0.0, HB_IN, breathWin=[HB_TI / HB_IN, 1.0])
    c.info['aim'] = [1.3, HB_IN]
    return c


@clip
def hover_breath_hold():
    """The stream poured from the hover: the head held out low on its mark while the body heaves on the beats under it,
    the throat pulsing; a loop of two beats."""
    c = part_of(hover_breath_master('m'), 'hover_breath_hold', HB_IN, 2 * HB_T, loop=True, breathWin=[0.0, 1.0])
    c.info['aim'] = [0.0, 2 * HB_T]
    return c


@clip
def hover_breath_out():
    """The end of a held breath in the air: the mouth snaps shut, the neck comes back, the body settles back up into the
    hover, and it pants."""
    c = part_of(hover_breath_master('m'), 'hover_breath_out', HB_H1, HB_END - HB_H1)
    c.info['aim'] = [0.0, 0.15]
    return c


# Knocked down: on its right side, the legs off the ground. The pose all three clips meet at (knockdown's end, the loop,
# get_up's start). It lands a body's width over toward the side it falls on (KD_X, its right): the root goes with it and
# stays there (info keep) until get_up brings it back over its feet.
KD_Y, KD_ROLL, KD_PITCH, KD_YAW, KD_X = -0.118, -64.0, -3.0, -12.0, -0.17
# the feet off the ground as it lies, carried with the body: the upper (left) pair held up past level, the lower pair drawn
# in against the belly, clear of the ground it lies on
KD_BY = {'L': 0.075, 'R': 0.125}
# and the lower pair tucked in toward the belly, which on its side is up off the ground (the body's own left is nearly the
# world's up as it lies on its right): without it the solver keeps those paws on the floor and drags them along it
KD_BX = {'F': 0.14, 'H': 0.08}


DOWN_WINGS = {'wR_spread': 0.3, 'wR_fold': 0.6, 'wR_stroke': 45, 'wL_spread': 0.5, 'wL_fold': 0.45, 'wL_stroke': -118}


def down_wings(c, t0=None, t1=None, right=None):
    """Lying on its right side: the right wing crumpled under it, the left flopped over the top and down, fingers on the
    ground (as death_air's, mirrored); the right folded up along the flank it lies on, not pressed through the floor:
    flung out at t0 and there by t1, or (no times) there throughout. right: (t0, t1, spread) for the right wing on its
    own, folded in before the body comes down on it (or its fingers meet the ground first and snap back)."""
    if t0 is None:
        for k, v in DOWN_WINGS.items():
            c.add(k, v)
        return
    r0, r1, rsp = right or (t0, t1, 0.9)
    c.add('wR_spread', K((0, 0), (r0, rsp), (r1, 0.3)))
    c.add('wR_fold', K((0, 0), (r0, 0.0), (r1, 0.6)))
    c.add('wR_stroke', K((0, 0), (r0, 50), (r1, 45)))
    c.add('wL_spread', K((0, 0), (t0, 0.9), (t1, 0.5)))
    c.add('wL_fold', K((0, 0), (t0, 0.0), (t1, 0.45)))
    c.add('wL_stroke', K((0, 0), (t0, 45), (t1, -118, 'f')))


def down_legs(c, env, kick, by=None, tuck=None):
    """On its side, the legs off the ground and up with the body; env[S](t) how far each side's feet go with the body
    (0 planted where they stand, 1 carried); kick(t, k) (0 to 1) how hard each one paws the air; by[S] how far up off
    the ground each side's feet are held; tuck(t) (0 to 1) how far over on its side it is, for the lower pair's tuck."""
    by = by or KD_BY
    tuck = tuck or (lambda t: np.ones_like(np.asarray(t, float)))
    for part in 'FH':
        c.add(f'{part}R_bx', lambda t, e=env['R'], b=KD_BX[part]: e(t) * tuck(t) * b)
    for i, (S, part) in enumerate((('L', 'F'), ('R', 'F'), ('L', 'H'), ('R', 'H'))):
        k = part + S
        e = env[S]
        ph = (0.0, 1.9, 3.3, 5.0)[i]
        c.add(f'{k}_follow', lambda t, e=e: e(t))
        c.add(f'{k}_by', lambda t, e=e, ph=ph, k=k, b=by[S]: e(t) * (b + kick(t, k) * 0.03 * np.sin(2 * np.pi * np.asarray(t) / 0.48 + ph)))
        c.add(f'{k}_bz', lambda t, e=e, ph=ph, k=k: e(t) * ((0.03 if k[0] == 'F' else -0.06) + kick(t, k) * 0.045 * np.sin(2 * np.pi * np.asarray(t) / 0.48 + ph + 1.2)))
        c.add(f'{k}_tilt', lambda t, e=e: e(t) * 40)
        c.add(f'{k}_curl', lambda t, e=e, ph=ph, k=k: e(t) * (0.4 + kick(t, k) * 0.4 * np.sin(2 * np.pi * np.asarray(t) / 0.48 + ph + 2.0)))


@clip
def knockdown():
    """Bowled over by a blow it couldn't stand (a charge met head on, a blast): it rears back off its forefeet, twists,
    and goes over onto its right side, the legs thrown up and flailing, the wings flung out then crumpled under and
    flopped over; it hits, bounces, and lies there kicking. knockdown_loop holds it down; get_up stands it up.
    The feet: the upper (left) pair come off first and fly up past level; the lower (right) pair stay planted where they
    stand while the body comes over onto them, and only leave the ground as it lands, drawn in to the belly."""
    tg = 1.25
    c = Clip('knockdown', 3.2, keep=True)
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.4)
    c.add('x', K((0, 0), (0.3, 0.004), (0.8, KD_X * 0.45), (tg, KD_X - 0.012, 's'), (tg + 0.3, KD_X), (3.2, KD_X)))
    c.add('y', K((0, 0), (0.25, 0.008), (0.75, 0.004), (tg, KD_Y - 0.008, 's'), (tg + 0.16, KD_Y + 0.012), (tg + 0.36, KD_Y, 's'), (3.2, KD_Y)))
    c.add('pitch', K((0, 0), (0.25, 10, 's'), (0.7, 14), (tg, -5, 's'), (tg + 0.4, KD_PITCH), (3.2, KD_PITCH)))
    c.add('roll', K((0, 0), (0.25, -4), (0.75, -24), (tg, KD_ROLL - 8, 's'), (tg + 0.2, KD_ROLL + 6), (tg + 0.42, KD_ROLL), (3.2, KD_ROLL)))
    c.add('yaw', K((0, 0), (0.4, -4), (tg, KD_YAW), (3.2, KD_YAW)))
    # the head thrown back by the blow, then it whips down and hits after the body; jaw open, roaring
    c.add('nk_pitch', K((0, 0), (0.2, 24, 's'), (0.7, 16), (tg + 0.15, -14, 's'), (tg + 0.5, -10), (3.2, -10)))
    c.add('nk_reach', K((0, 0), (0.2, 12), (0.8, 0), (tg + 0.15, -34, 's'), (tg + 0.5, -30), (3.2, -30)))
    c.add('nk_yaw', K((0, 0), (0.2, -20, 's'), (tg, 10), (tg + 0.4, 20), (3.2, 20)))
    c.add('hd_pitch', K((0, 0), (0.2, 14), (tg, -4), (3.2, -8)))
    c.add('hd_roll', K((0, 0), (tg + 0.2, 18), (3.2, 20)))
    c.add('jaw', K((0, 0), (0.18, 0.9), (0.9, 0.7), (tg + 0.1, 1.0), (tg + 0.5, 0.45), (3.2, 0.35)))
    c.add('tremor', K((0, 0), (0.12, 1.4), (0.6, 0.4), (tg, 0), (tg + 0.04, 2.0), (tg + 0.7, 0.2), (3.2, 0)))
    env = {'L': K((0, 0), (0.15, 0), (0.7, 1), (3.2, 1)), 'R': K((0, 0), (0.9, 0), (tg + 0.1, 1), (3.2, 1))}
    kick = lambda t, k: K((0, 0), (0.4, 0.85), (tg, 0.7), (2.2, 0.8), (3.2, 0.5))(t) * (1.0 if k[1] == 'L' else 0.35)      # noqa: E731
    down_legs(c, env, kick, tuck=K((0, 0), (0.75, 0.35), (tg, 1.0), (3.2, 1.0)))
    for k in ('FL', 'HL'):      # (the upper pair off the ground first, pawing)
        c.add(f'{k}_y', K((0, 0), (0.12, 0), (0.3, 0.06), (0.7, 0.06)))
    c.add('tl_yaw', K((0, 0), (0.3, 30), (tg, -50), (tg + 0.5, -30), (3.2, -34)))
    c.add('tl_pitch', K((0, 0), (0.5, 24), (tg + 0.1, -10, 's'), (3.2, -6)))
    c.add('tl_straight', K((0, 0.4), (tg, 0.8), (3.2, 0.7)))
    c.set('tl_lag', 0.05)
    down_wings(c, 0.45, tg + 0.35, right=(0.4, 1.1, 0.6))
    for S in 'LR':
        c.add(f'w{S}_ripple', K((0, 0), (0.4, 1.3), (tg, 1.0), (tg + 0.6, 0.3), (3.2, 0.2)))
    c.set('w_lag', 0.2)
    c.add('breath', lambda t: 3 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 1.2)) * window(tg + 0.6, tg + 1.0, 3.0, 3.2)(t))
    impact(c, tg, depth=0.0, shake=1.6, dur=0.7)
    c.info['down'] = [tg, 3.2]
    return c


@clip
def knockdown_loop():
    """Down on its side, as long as the fight keeps it there: heaving, the legs pawing the air slowly, the head lifted a
    little off the ground and let fall again; a loop."""
    T = 2.4
    c = Clip('knockdown_loop', T, loop=True, keep=True)
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.4)
    c.add('x', KD_X)
    c.add('y', KD_Y)
    c.add('pitch', KD_PITCH)
    c.add('roll', lambda t: KD_ROLL + 2 * np.sin(2 * np.pi * np.asarray(t) / T))
    c.add('yaw', KD_YAW)
    c.add('nk_pitch', lambda t: -10 + 6 * np.clip(np.sin(2 * np.pi * np.asarray(t) / T), 0, None))
    c.add('nk_reach', -30)
    c.add('nk_yaw', 20)
    c.add('hd_pitch', lambda t: -8 + 4 * np.clip(np.sin(2 * np.pi * np.asarray(t) / T), 0, None))
    c.add('hd_roll', 20)
    c.add('jaw', lambda t: 0.35 + 0.1 * np.sin(2 * np.pi * np.asarray(t) / 1.2))
    c.add('breath', lambda t: 3 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 1.2)))
    one = lambda t: np.ones_like(np.asarray(t, float))      # noqa: E731
    kick = lambda t, k: (0.5 if k[1] == 'L' else 0.18) * np.ones_like(np.asarray(t, float))      # noqa: E731
    down_legs(c, {'L': one, 'R': one}, kick)
    c.add('tl_yaw', lambda t: -34 + 6 * np.sin(2 * np.pi * np.asarray(t) / T))
    c.add('tl_pitch', -6)
    c.add('tl_straight', 0.7)
    down_wings(c)
    for S in 'LR':
        c.add(f'w{S}_ripple', 0.2)
    return c


@clip
def get_up():
    """Up from its side, a paw at a time: the legs drawn in and folded first, paws off the ground; it rolls over onto
    its belly with them tucked under; then it puts each forefoot down where it'll stand (left, then right) and heaves
    the front up on them; then each hind foot (left, right), and pushes up onto all four, back over its feet, and shakes
    it off from the head down to the tail, wings folding. A paw once down stays where it's put."""
    E = 3.8
    c = Clip('get_up', E, keep=True)
    c.set('toe_floor', 1.0)
    c.add('tl_level', 0.4)
    tb, tbel = 0.55, 1.3        # folded; over on its belly
    fl, fr, hl, hr = 1.5, 1.68, 2.0, 2.18       # each paw down
    tu = 2.75                   # up
    c.add('x', K((0, KD_X), (tb, KD_X), (tbel, KD_X * 0.35), (fr, KD_X * 0.25), (hr, KD_X * 0.08), (tu, 0, 'f'), (E, 0)))
    c.add('y', K((0, KD_Y), (tb, KD_Y), (tbel, -0.09), (fr, -0.085), (hr, -0.06), (tu, 0.0), (E, 0)))
    c.add('pitch', K((0, KD_PITCH), (tbel, -4), (fr, 5), (hr, 7), (tu, 0), (E, 0)))
    c.add('roll', K((0, KD_ROLL), (0.3, KD_ROLL - 3), (tb, KD_ROLL + 4), (tbel, -6), (fr, -2), (hr, 0), (E, 0)))
    c.add('yaw', K((0, KD_YAW), (tbel, -9), (tu, -2), (E, 0)))
    c.add('nk_pitch', K((0, -10), (0.3, -14), (tbel, 4), (fr, 10), (tu, 4), (E, 0)))
    c.add('nk_reach', K((0, -30), (tbel, -14), (tu, 0), (E, 0)))
    c.add('nk_yaw', K((0, 20), (tbel, 6), (tu, 0)))
    c.add('hd_pitch', K((0, -8), (tbel, 0), (tu, 4), (E, 0)))
    c.add('hd_roll', K((0, 20), (tbel, 4), (fr, 0)))
    c.add('jaw', K((0, 0.35), (tbel, 0.5), (hr, 0.2), (3.05, 0.7), (3.4, 0.1), (E, 0)))
    c.add('breath', lambda t: 3 * np.abs(np.sin(2 * np.pi * np.asarray(t) / 1.2)) * window(-1, 0, 1.8, 2.4)(t))
    # the shake, once it's up
    c.add('nk_roll', lambda t: 14 * np.sin(2 * np.pi * (np.asarray(t) - 2.9) / 0.34) * window(2.85, 2.95, 3.25, 3.4)(t))
    c.add('sp_roll', lambda t: 8 * np.sin(2 * np.pi * (np.asarray(t) - 3.05) / 0.34) * window(3.0, 3.1, 3.4, 3.55)(t))
    c.add('tl_wave', lambda t: 16 * window(3.15, 3.25, 3.55, 3.75)(t))
    c.set('tl_wave_T', 0.5)
    # the legs: from where they're held as it lies, drawn in and folded tight under it (the paws a hand off the ground)
    # as it rolls; then each let down onto its own spot, lifted clear (an arc) on the way, and left there
    tuck = {'F': (0.16, 0.04, 60, 0.9), 'H': (0.12, -0.08, 70, 0.8)}      # (by, bz, tilt, curl) folded under the belly
    down = {'FL': fl, 'FR': fr, 'HL': hl, 'HR': hr}
    kick = K((0, 0.5), (tb, 0))
    for i, (S, part) in enumerate((('L', 'F'), ('R', 'F'), ('L', 'H'), ('R', 'H'))):
        k = part + S
        ph = (0.0, 1.9, 3.3, 5.0)[i]
        by0, bz0 = KD_BY[S], (0.03 if part == 'F' else -0.06)
        by1, bz1, tilt1, curl1 = tuck[part]
        td = down[k]
        fol = K((0, 1), (td - (0.4 if part == 'F' else 0.5), 1), (td, 0, 'f'), (E, 0))      # (let down slowly: the paw turns flat on the way)
        c.add(f'{k}_follow', fol)
        c.add(f'{k}_arc', 0.045)      # (lifted clear on the way down: the solver's arc is sin(pi follow) of this)
        c.add(f'{k}_by', lambda t, ph=ph, by0=by0, by1=by1: K((0, by0), (tb, by1), (E, by1))(t) + kick(t) * 0.03 * np.sin(2 * np.pi * np.asarray(t) / 0.48 + ph))
        c.add(f'{k}_bz', K((0, bz0), (tb, bz1), (E, bz1)))
        if S == 'R':        # (the lower pair's tuck toward the belly, let go as it comes over onto it)
            c.add(f'{k}_bx', K((0, KD_BX[part]), (tb, KD_BX[part]), (tbel, 0.7 * KD_BX[part]), (tbel + 0.2, 0.0), (E, 0.0)))
        c.add(f'{k}_tilt', lambda t, fol=fol, tilt1=tilt1: fol(t) * K((0, 40), (tb, tilt1), (E, tilt1))(t))
        c.add(f'{k}_curl', lambda t, fol=fol, ph=ph, curl1=curl1: fol(t) * (K((0, 0.4), (tb, curl1), (E, curl1))(t) + kick(t) * 0.4 * np.sin(2 * np.pi * np.asarray(t) / 0.48 + ph + 2.0)))
        c.add(f'{k}_splay', K((0, 0), (td, 0.35), (tu, 0.2), (E, 0)))
        if part == 'H':
            c.add(f'{k}_heel', K((0, 0), (td, 20), (tu, 0)))
    c.add('tl_yaw', K((0, -34), (tbel, -20), (tu, 0), (E, 0)))
    c.add('tl_pitch', K((0, -6), (fr, 6), (tu, 0)))
    c.add('tl_straight', K((0, 0.7), (tu, 0.4), (E, 0.35)))
    # wings: out from under and off the top, opened to help it up, then folded
    c.add('wR_spread', K((0, 0.3), (tbel, 0.7), (fr, 0.8), (tu, 0.4), (E - 0.1, 0)))
    c.add('wR_fold', K((0, 0.6), (tbel, 0.1), (fr, 0), (E, 0)))
    c.add('wR_stroke', K((0, 45), (tbel, 30), (fr, 30), (hr, -10, 'f'), (tu, 12), (E - 0.1, 0)))
    c.add('wL_spread', K((0, 0.5), (tbel, 0.7), (fr, 0.8), (tu, 0.4), (E - 0.1, 0)))
    c.add('wL_fold', K((0, 0.45), (tbel, 0.1), (fr, 0), (E, 0)))
    c.add('wL_stroke', K((0, -118), (tb, -80), (tbel, 0), (fr, 34), (hr, -8, 'f'), (tu, 12), (E - 0.1, 0)))
    for S in 'LR':
        c.add(f'w{S}_ripple', K((0, 0.2), (fr, 0.6), (3.25, 1.4), (E, 0)))
    c.set('w_lag', 0.2)
    c.add('tremor', K((0, 0), (fr, 0.6), (hr, 0.8), (tu, 0)))
    return c


def hop_clip(name, side, back, dur=1.7):
    """Off the ground and back (side 0) or to one side (side > 0 its left): a crouch, a spring with one beat of the
    wings, all four off, and down again square, low, facing the same way, ready. The clip hops in place: the fight
    carries it over the ground between leap[0] and leap[1], back (metres on a 20 m dragon, scaled to its size) behind it
    and side to its left."""
    to, tl = 0.36, 0.88          # off, down
    c = Clip(name, dur, leap=[to, tl], hop=[side, back])
    stance(c, low=0.006, tail=0.5)
    c.add('y', K((0, 0), (0.3, -0.016, 'f'), (to + 0.18, 0.035), (tl - 0.12, 0.022), (tl, -0.012, 's'), (tl + 0.3, -0.006), (dur, 0)))
    c.add('pitch', K((0, 0), (0.3, -3), (to + 0.15, 6), (tl - 0.1, 3), (tl, -2, 's'), (dur, 0)))
    c.add('roll', K((0, 0), (0.3, -4 * side), (to + 0.2, 6 * side), (tl, -3 * side), (dur, 0)))
    c.add('yaw', K((0, 0), (to, 0), (to + 0.2, 6 * side), (tl, 0), (dur, 0)))
    env = K((0, 0), (to - 0.06, 0), (to + 0.16, 1), (tl - 0.14, 1), (tl, 0, 's'))
    for S in 'LR':
        for P_ in 'FH':
            k = P_ + S
            c.add(f'{k}_follow', lambda t: env(t))
            c.add(f'{k}_by', lambda t, P_=P_: env(t) * (0.03 if P_ == 'F' else 0.02))
            c.add(f'{k}_curl', K((0, 0), (to, -0.3), (to + 0.15, 0.4), (tl - 0.05, -0.2), (tl + 0.1, 0)))
        c.add(f'H{S}_heel', K((0, 0), (0.2, 10), (to - 0.02, 34), (to + 0.3, 12), (tl + 0.2, 0)))
    # eyes on the foe the whole way: the head held, low, the mouth a little open
    c.add('hd_world', K((0, 0), (0.2, 1), (tl + 0.3, 1), (dur, 0)))
    c.add('hd_wpitch', -4)
    c.add('nk_reach', K((0, 0), (0.3, -10), (tl, -16), (dur, 0)))
    c.add('jaw', K((0, 0), (0.3, 0.3), (tl + 0.2, 0.4), (dur, 0)))
    c.add('tl_pitch', K((0, 0), (to, -10), (to + 0.25, 16), (tl + 0.1, -10, 's'), (dur, 0)))
    c.add('tl_yaw', K((0, 0), (to + 0.2, -24 * side), (tl + 0.2, 10 * side), (dur, 0)))
    for S, d in (('L', 0.0), ('R', 0.04)):
        c.add(f'w{S}_spread', K((0, 0), (0.2 + d, 0.6), (to + d, 1.0), (tl + d, 0.9), (tl + 0.5 + d, 0.2), (dur, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (0.25 + d, 44), (to + 0.22 + d, -20, 'f'), (tl + d, 24), (tl + 0.5 + d, 6), (dur, 0)))
        c.add(f'w{S}_sweep', K((0, 0), (0.25 + d, 10 + 10 * back), (to + 0.22 + d, -14), (tl + 0.4 + d, 0)))
        c.add(f'w{S}_ripple', K((0, 0), (to, 0.5), (tl, 1.2), (dur, 0)))
    c.set('w_lag', 0.16)
    impact(c, tl, depth=0.006, shake=0.6, dur=0.5)
    return c


@clip
def backstep():
    return hop_clip('backstep', 0, 1.0)


@clip
def sidestep_l():
    return hop_clip('sidestep_l', 1, 0.0)


@clip
def sidestep_r():
    return hop_clip('sidestep_r', -1, 0.0)


def hover_turn_clip(name, deg):
    """Turning where it hangs in the air (deg > 0 to its left): the head and eyes go first, the outer wing beats harder
    and sweeps further than the inner, the body banks a little into it, the tail swings out wide; two beats.
    info turn: how far it turns, for the game to take over at the end."""
    T = 1.3
    dur = 2 * T
    sg = 1 if deg > 0 else -1
    c = Clip(name, dur, air=[FLY_Y, FLY_Y], turn=deg)
    c.add('floor', -3.0)
    c.add('tl_level', 1.0)
    air_body(c, pitch=40, neck=-14, look=-12)
    c.add('nk_s', 6)
    c.add('y', FLY_Y)
    hover_wings(c, T)
    hover_legs(c, T)
    yaw = K((0, 0), (0.2, 0), (dur - 0.35, deg, 'f'), (dur, deg))
    c.add('yaw', yaw)
    c.add('roll', K((0, 0), (0.5, 9 * sg), (dur - 0.6, 7 * sg), (dur, 0)))
    c.add('hd_wyaw', K((0, 0), (0.15, 28 * sg), (dur - 0.7, 18 * sg), (dur - 0.1, 0)))
    c.add('nk_yaw', K((0, 0), (0.25, 16 * sg), (dur - 0.6, 10 * sg), (dur, 0)))
    c.add('tl_yaw', K((0, 0), (0.6, -30 * sg), (dur - 0.4, -20 * sg), (dur, 0)))
    c.add('tl_pitch', lambda t: 35 + 5 * np.cos(2 * np.pi * (np.asarray(t) / T - 0.6)))
    outer, inner = ('R', 'L') if sg > 0 else ('L', 'R')
    env = window(0.0, 0.3, dur - 0.5, dur)
    c.add(f'w{outer}_stroke', lambda t: 10 * env(t) * np.cos(2 * np.pi * np.asarray(t) / T))
    c.add(f'w{outer}_sweep', lambda t: 10 * env(t) * np.sin(2 * np.pi * np.asarray(t) / T + 0.6))
    c.add(f'w{inner}_stroke', lambda t: -6 * env(t) * np.cos(2 * np.pi * np.asarray(t) / T))
    return c


@clip
def hover_turn_l():
    return hover_turn_clip('hover_turn_l', 90)


@clip
def hover_turn_r():
    return hover_turn_clip('hover_turn_r', -90)


@clip
def tail_slam():
    """The tail brought down from overhead behind it like a club: it plants its forefeet and looks back over its left
    shoulder at what's there, the tail curls up high over its back, hangs there (the tell), and comes down hard on the
    ground behind its left flank; the ground shakes; it drags the tail back round. The tail is driven from its root at
    th; the tip, a whip's length behind, meets the ground at tc, and the blow, the jolt and the shake are timed to that."""
    th, tc = 1.75, 2.12
    E = 3.6
    c = Clip('tail_slam', E, hit=tc)
    stance(c, low=0.004, splay=K((0, 0), (0.6, 0.3), (3.2, 0)), tail=K((0, 0.4), (0.5, 0.2), (th, 0.15), (E, 0.4)))
    c.add('yaw', K((0, 0), (0.6, -10), (th, -14), (tc, -14), (2.9, -6), (E, 0)))
    c.add('sp_yaw', K((0, 0), (0.6, -12), (th, -14), (3.2, 0)))
    c.add('roll', K((0, 0), (0.6, 4), (th, 5), (tc, -3, 's'), (2.9, 0)))
    c.add('pitch', K((0, 0), (0.6, -3), (th, -4), (tc, 2, 's'), (2.9, 0)))
    c.add('pivot_h', 0.0)
    # looking back at it over the shoulder
    c.add('nk_yaw', K((0, 0), (0.5, 40), (tc, 46), (2.7, 20), (E, 0)))
    c.add('hd_yaw', K((0, 0), (0.5, 30), (tc, 34), (2.7, 10), (E, 0)))
    c.add('nk_pitch', K((0, 0), (0.6, 8), (tc - 0.05, 4), (tc + 0.05, -6, 's'), (E, 0)))
    c.add('jaw', K((0, 0), (0.5, 0.4), (tc - 0.1, 0.7), (tc + 0.2, 0.3), (E, 0)))
    # the tail: up over the back (curled, held), then down to its left and behind, hard
    c.add('tl_pitch', K((0, 0), (0.35, -8), (1.05, 78), (th - 0.28, 84, 'f'), (th, -6), (th + 0.35, -7), (2.9, 0), (E, 0)))      # (down onto the ground)
    c.add('tl_yaw', K((0, 0), (1.05, 10), (th - 0.28, 14, 'f'), (th, 42), (2.9, 30), (E, 0)))
    c.add('tl_wave', K((0, 0), (0.8, 10), (th - 0.2, 6), (th, 0)))
    c.set('tl_wave_T', 1.2)
    c.set('tl_lag', 0.035)
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (0.6, 10), (tc, 14), (2.9, 0)))
    for S, d in (('L', 0.0), ('R', 0.04)):
        c.add(f'w{S}_spread', K((0, 0), (0.6 + d, 0.45), (tc + d, 0.5), (3.0 + d, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (0.6 + d, 26), (tc - 0.1 + d, 30), (tc + 0.2 + d, 8), (3.2, 0)))
    impact(c, tc, depth=0.008, shake=1.3)
    c.info['through'] = [tc - 0.08, tc + 0.1]
    return c


def low_reach():
    """How much more the moves that put the jaws on the ground (grab, bite_low) must tip the snout down and let the chest
    down for this dragon: the black's neck carries its head higher and stiffer than the others' (without this its catch
    is 0.7 m higher than theirs)."""
    sk = SK_NOW[0]
    return 1.0 if sk is not None and sk.color == 'black' else 0.0


@clip
def grab():
    """A bite that keeps what it catches, and looks nothing like one coming: no coil. The head goes down low and out to
    its left, cocked over on its side with the jaws wide, the left forefoot steps in under it and the wings come half up;
    it hangs there a breath (the tell); then a low scoop across the ground from its left to the middle, and the jaws shut
    on what's there. Then the head reared up and back with it held, shaken from side to side, and flung away over its
    right shoulder with a twist of the neck (throw: when it lets go). hold: from the catch to the throw."""
    td, tw = 0.72, 1.02          # down and cocked, held until
    tc, tr, tt = 1.3, 1.97, 3.07      # caught, up, thrown
    E = 4.1
    c = Clip('grab', E, hit=tc, hold=[tc, tt], throw=tt)
    stance(c, tail=0.45)
    # the body: the chest let down and pitched forward over the forefeet into the scoop
    c.add('y', K((0, 0), (td, -0.06), (tw, -0.062), (tc, -0.08, 's'), (tc + 0.2, -0.076), (tr, 0.006), (2.8, 0.006), (E, 0)))
    c.add('pitch', K((0, 0), (td, -16), (tw, -16.5), (tc, -22, 's'), (tc + 0.2, -21), (tr, 5), (2.8, 5), (tt + 0.2, -2), (E, 0)))
    c.add('sp_pitch', K((0, 0), (td, -2), (tc, -4), (tr, 0)))
    c.add('z', K((0, 0), (td, 0.02), (tw, 0.02), (tc, 0.04, 's'), (tc + 0.2, 0.038), (tr, 0.0), (E, 0)))
    c.add('x', K((0, 0), (td, 0.008), (tw, 0.008), (tc, 0.0), (E, 0)))
    # the neck reached down and out low; held; then swept across in the scoop and reared up with it
    c.add('nk_reach', K((0, 0), (td, -55), (tw, -56, 'f'), (tc, -62, 's'), (tc + 0.2, -55), (tr, 6), (2.8, 8), (tt - 0.1, 0), (tt + 0.2, -12), (E, 0)))
    c.add('nk_pitch', K((0, 0), (td, -45), (tw, -46, 'f'), (tc, -58, 's'), (tc + 0.2, -50), (tr, 26), (2.8, 24), (tt - 0.15, 30, 'f'), (tt + 0.15, 6, 's'), (E, 0)))
    c.add('hd_pitch', K((0, 0), (td - 0.1, 6), (tw - 0.1, 7, 'f'), (tc - 0.12, 24, 's'), (tc + 0.1, 18), (tr, 12), (2.8, 10), (tt, -6), (E, 0)))
    c.add('jaw', K((0, 0), (td - 0.1, 1.0), (tw + 0.1, 1.0, 'f'), (tc, 0.25, 's'), (tt - 0.05, 0.25), (tt + 0.05, 0.9), (tt + 0.4, 0.3), (E, 0)))
    # out to its left and cocked over; the scoop brings it back across to the middle (the head's keys lead the neck's)
    c.add('hd_roll', lambda t: K((0, 0), (td - 0.15, -30), (tw - 0.15, -31, 'f'), (tc - 0.12, 0, 's'), (E, 0))(t)
          + 14 * np.sin(2 * np.pi * (np.asarray(t) - 2.12) / 0.36) * window(2.07, 2.17, 2.72, 2.84)(t))
    c.add('nk_yaw', lambda t: K((0, 0), (td, 22), (tw, 23, 'f'), (tc, -6, 's'), (tc + 0.25, -2), (tr, 0), (tt - 0.25, 18, 'f'), (tt + 0.15, -40, 's'), (3.6, -14), (E, 0))(t)
          + 8 * np.sin(2 * np.pi * (np.asarray(t) - 2.12) / 0.36) * window(2.07, 2.17, 2.72, 2.84)(t))
    c.add('hd_yaw', K((0, 0), (td - 0.1, 12), (tw - 0.1, 12, 'f'), (tc - 0.1, -4), (tr, 0), (tt - 0.25, 10), (tt + 0.15, -24, 's'), (3.7, 0)))
    c.add('sp_yaw', K((0, 0), (td, 8), (tw, 8), (tc, -4), (tr, 0), (tt - 0.25, 6), (tt + 0.2, -12), (3.8, 0)))
    # the left forefoot steps in under the reach, and back after the throw
    c.add('FL_z', K((0, 0), (0.25, 0), (0.6, 0.05), (2.0, 0.05), (2.4, 0)))
    c.add('FL_x', K((0, 0), (0.25, 0), (0.6, 0.012), (2.0, 0.012), (2.4, 0)))
    c.add('FL_y', K((0, 0), (0.25, 0), (0.42, 0.035), (0.6, 0, 's'), (2.0, 0), (2.2, 0.025), (2.4, 0)))
    c.add('tl_yaw', K((0, 0), (td, -14), (tw, -15), (tc, 10), (tt - 0.2, -16), (tt + 0.3, 24), (E, 0)))
    c.add('tremor', K((0, 0), (tc - 0.02, 0), (tc + 0.03, 0.7), (tc + 0.4, 0), (2.12, 0.6), (2.8, 0)))
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (td, 10), (tc, 16), (tc + 0.4, 12), (2.4, 0)))
    # the wings half up and open over the reach, held; folded a little into the scoop; up as it rears
    for S, d in (('L', 0.0), ('R', 0.04)):
        c.add(f'w{S}_spread', K((0, 0), (td + d, 0.5), (tw + d, 0.5), (tc + d, 0.3), (tr, 0.55), (tt, 0.5), (E, 0)))
        c.add(f'w{S}_stroke', K((0, 0), (td + d, 32), (tw + d, 33), (tc + d, 12), (tr, 30), (tt, 24), (E, 0)))
    lo, win = low_reach(), window(0.3, 0.7, 1.4, 1.9)
    c.add('hd_pitch', lambda t: 12 * lo * win(t))
    c.add('pitch', lambda t: -3 * lo * win(t))
    c.add('y', lambda t: -0.012 * lo * win(t))
    c.info['through'] = [tc - 0.1, tc + 0.06]
    c.info['aim'] = [0.4, tw]
    return c


@clip
def bite_low():
    """A bite at something small and near its feet (a hero under its chin): the head drops, the jaw opens, and it
    snaps down low in front of its own forefeet with a short forward drive of the chest, then up again. Quicker than
    the full bite and with no coil, so the tell is the head going down."""
    tc = 0.95
    E = 2.2
    c = Clip('bite_low', E, hit=tc)
    stance(c, tail=0.45)
    c.add('y', K((0, 0), (0.6, -0.04), (tc, -0.07, 's'), (tc + 0.25, -0.065), (1.8, 0)))
    c.add('pitch', K((0, 0), (0.6, -10), (tc, -19, 's'), (tc + 0.25, -17), (1.8, 0)))
    c.add('z', K((0, 0), (0.6, -0.01), (tc, 0.03, 's'), (tc + 0.25, 0.028), (1.9, 0)))
    c.add('nk_reach', K((0, 0), (0.6, -40), (tc, -60, 's'), (tc + 0.25, -55), (1.9, 0)))
    c.add('nk_pitch', K((0, 0), (0.6, -30), (tc, -56, 's'), (tc + 0.25, -50), (1.9, 0)))
    c.add('hd_pitch', K((0, 0), (0.5, 14), (tc - 0.12, 26, 's'), (tc + 0.2, 20), (1.8, 0)))
    c.add('jaw', K((0, 0), (0.45, 0.6), (tc - 0.1, 1.0), (tc, 0.0, 's'), (E, 0)))
    c.add('hd_roll', lambda t: 8 * np.sin(2 * np.pi * (np.asarray(t) - tc - 0.15) / 0.3) * window(tc + 0.12, tc + 0.2, tc + 0.4, tc + 0.55)(t))
    c.add('FL_z', K((0, 0), (0.35, 0), (0.62, 0.03), (1.5, 0.03), (1.85, 0)))
    c.add('FL_y', K((0, 0), (0.35, 0), (0.48, 0.025), (0.62, 0, 's'), (1.5, 0), (1.68, 0.02), (1.85, 0)))
    for S in 'LR':
        c.add(f'H{S}_heel', K((0, 0), (0.6, 8), (tc, 14), (1.8, 0)))
    c.add('tl_yaw', K((0, 0), (0.6, -8), (tc + 0.2, 10), (E, 0)))
    c.add('tremor', K((0, 0), (tc - 0.02, 0), (tc + 0.03, 0.6), (tc + 0.35, 0)))
    wings_pose(c, spread=K((0, 0), (0.6, 0.2), (tc, 0.3), (E, 0)), stroke=K((0, 0), (tc, 10), (E, 0)))
    lo, win = low_reach(), window(0.2, 0.6, 1.1, 1.7)
    c.add('hd_pitch', lambda t: 12 * lo * win(t))
    c.add('pitch', lambda t: -3 * lo * win(t))
    c.add('y', lambda t: -0.012 * lo * win(t))
    c.info['through'] = [tc - 0.08, tc + 0.06]
    c.info['aim'] = [0.3, tc - 0.05]
    return c


# ---- baking and writing ------------------------------------------------------------------------------------------------

SK_NOW = [None]       # the skeleton the clips are being built for (tail_spin reads its feet)

# The names the game already looks for (src/sim/tripo.js, src/sim/dungeon.js): each points at one of the clips above, so the
# wild drakes and the lair dragons keep working on the new rig without carrying anything twice.
ALIAS = {'idle2': 'idle_alert', 'fly2': 'fly_hover', 'jump': 'takeoff', 'atk1': 'bite', 'atk2': 'claw_l', 'atk3': 'claw_r',
         'atk4': 'tail_whip', 'atk5': 'claw_slam', 'breath2': 'breath_sweep'}


def bake(sk, c, fps=FPS):
    n = int(round(c.dur * fps)) + 1
    t = np.linspace(0, c.dur, n)
    L, P, R, rootT = solve(sk, c, t)
    return t, L, rootT, P


def same_hemisphere(q):
    q = q.copy()
    for i in range(1, len(q)):
        if (q[i] * q[i - 1]).sum() < 0:
            q[i] = -q[i]
    return q


def decimate(t, v, tol):
    """Keys a straight line between neighbours would give back within tol, dropped (Douglas-Peucker over the track)."""
    keep = np.zeros(len(t), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(t) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        u = ((t[a + 1:b] - t[a]) / (t[b] - t[a]))[:, None]
        err = np.abs(v[a + 1:b] - (v[a] * (1 - u) + v[b] * u)).max(1)
        i = int(np.argmax(err))
        if err[i] > tol:
            m = a + 1 + i
            keep[m] = True
            stack += [(a, m), (m, b)]
    return keep


def write(color, names=None, out_dir=OUT):
    sk = Skel(color)
    SK_NOW[0] = sk
    doc, buf = load(os.path.join(RIGGED, f'dragon_{color}.glb'))
    o = Out()
    o.doc, o.buf = doc, bytearray(buf)
    doc['animations'] = []
    info = {}
    stats = []
    for name, fn in CLIPS.items():
        if names and name not in names:
            continue
        c = fn()
        t, L, rootT, P = bake(sk, c)
        anim = {'name': name, 'samplers': [], 'channels': []}
        keys = 0
        for j in range(len(sk.names)):
            q = same_hemisphere(L[:, j])
            if j > 0 and np.abs(q - np.array([0, 0, 0, 1.0])).max() < 0.0012:
                continue        # never moves in this clip: the rest pose stands
            keep = decimate(t, q, 0.0016)
            if c.loop:
                keep[0] = keep[-1] = True
            ti = o.acc(t[keep].astype(np.float32), 'SCALAR', minmax=True)
            vi = o.acc(np.round(q[keep] * 32767).astype(np.int16), 'VEC4', comp=5122, normalized=True)
            anim['samplers'].append({'input': ti, 'output': vi, 'interpolation': 'LINEAR'})
            anim['channels'].append({'sampler': len(anim['samplers']) - 1, 'target': {'node': j, 'path': 'rotation'}})
            keys += int(keep.sum())
        keep = decimate(t, rootT, 0.0004)
        ti = o.acc(t[keep].astype(np.float32), 'SCALAR', minmax=True)
        vi = o.acc(rootT[keep].astype(np.float32), 'VEC3')
        anim['samplers'].append({'input': ti, 'output': vi, 'interpolation': 'LINEAR'})
        anim['channels'].append({'sampler': len(anim['samplers']) - 1, 'target': {'node': 0, 'path': 'translation'}})
        doc['animations'].append(anim)
        info[name] = {'loop': c.loop, **{k: v for k, v in c.info.items()}, 'dur': round(c.dur, 3)}
        stats.append((name, c.dur, len(anim['channels']), keys))
    scene = doc['scenes'][0]
    scene['extras'] = {'clips': info, 'alias': {k: v for k, v in ALIAS.items() if v in info}, 'fps': 30}
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f'dragon_{color}.glb')
    o.save(path)
    print(f'{color}: {len(stats)} clips, {sum(s[1] for s in stats):.1f} s, {sum(s[3] for s in stats)} rotation keys, '
          f'{os.path.getsize(path) / 1e6:.2f} MB -> {path}')
    return path, stats


def main(argv):
    colors = [a for a in argv if a in ('black', 'green', 'red', 'undead')] or ['black', 'green', 'red', 'undead']
    names = [a for a in argv if a in CLIPS] or None
    for col in colors:
        write(col, names)


if __name__ == '__main__':
    main(sys.argv[1:])
