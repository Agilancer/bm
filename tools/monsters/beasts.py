"""Clips made by hand (in code) for the beasts: dragons on their Tripo rigs; spiders and worms on rigs made here.

    python tools/monsters/beasts.py [ids...]

Bones are labelled by where they sit, not by name, since every Tripo dragon is rigged differently: chains that reach
the ground are legs (front or hind by which side of the hips they hang), chains that reach far out sideways above the
ground are wings, chains behind the hips are the tail, the chain out in front is the neck and head, the rest is spine.
Each clip is written as turns about the world's rest axes (X across, Y up, Z forward) per bone, so a turn on a neck
bone bends everything beyond it; the root also bobs and lunges. Writes assets/monsters/tripo/<id>.glb and its roster
entry, like humanoids.py.
"""
import json
import os
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import roster  # noqa: E402
from humanoids import OUT, Writer, decompose, rebuild, save_roster  # noqa: E402
import humanoids  # noqa: E402
from rig_humanoid import load, mesh_world, world_mats  # noqa: E402
from transfer_clips import qinv, qmul, qnorm, qfrom_mat  # noqa: E402

FPS = 30


def qa(axis, deg):
    deg = np.asarray(deg, float)
    a = np.radians(deg) / 2
    ax = np.asarray(axis, float)
    return np.concatenate([ax * np.sin(a)[..., None], np.cos(a)[..., None]], -1)


def up(deg):        # nose up / foot forward, for things pointing forward or down
    return qa([1, 0, 0], -np.asarray(deg, float))


def yaw(deg):       # turn toward the creature's left (+X)
    return qa([0, 1, 0], deg)


def roll(deg):      # roll to the creature's right side down... (+Z axis)
    return qa([0, 0, 1], deg)


def ease(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def pulse(t, t0, t1, t2, t3):
    """0 before t0, rising to 1 by t1, held to t2, back to 0 by t3."""
    return ease((t - t0) / max(t1 - t0, 1e-6)) * (1 - ease((t - t2) / max(t3 - t2, 1e-6)))


class Skeleton:
    def __init__(self, doc, buf):
        decompose(doc)
        self.doc = doc
        W = world_mats(doc)
        sk = doc['skins'][0]
        self.nodes = sk['joints']
        self.names = [doc['nodes'][j].get('name', str(j)) for j in self.nodes]
        self.J = len(self.nodes)
        at = {n: i for i, n in enumerate(self.nodes)}
        self.parent = [-1] * self.J
        for i, n in enumerate(doc['nodes']):
            for c in n.get('children', []):
                if c in at and i in at:
                    self.parent[at[c]] = at[i]
        self.children = [[c for c in range(self.J) if self.parent[c] == j] for j in range(self.J)]
        self.p = np.array([W[j][:3, 3] for j in self.nodes])
        R = np.array([W[j][:3, :3] for j in self.nodes])
        self.Rw = R / np.linalg.norm(R, axis=1, keepdims=True)
        self.qw = np.array([qnorm(qfrom_mat(r)) for r in self.Rw])
        self.restR = np.array([doc['nodes'][j].get('rotation', [0, 0, 0, 1]) for j in self.nodes], float)
        self.restT = np.array([doc['nodes'][j].get('translation', [0, 0, 0]) for j in self.nodes], float)
        self.P = np.concatenate([m[2] for m in mesh_world(doc, buf)])
        # Parents' world turn above the skeleton's root, to put root translation offsets into its parent's frame.
        roots = [j for j in range(self.J) if self.parent[j] < 0]
        self.root = max(roots, key=lambda j: len(self.subtree(j)))
        pn = next((i for i, n in enumerate(doc['nodes']) if self.nodes[self.root] in n.get('children', [])), None)
        self.parentRw = np.eye(3) if pn is None else W[pn][:3, :3] / np.linalg.norm(W[pn][:3, :3], axis=0)

    def subtree(self, j):
        out = [j]
        for c in self.children[j]:
            out += self.subtree(c)
        return out

    def main_chain(self, j, key):
        """From j down to the descendant leaf that minimises key(position)."""
        leaf = min(self.subtree(j), key=lambda k: key(self.p[k]))
        chain = [leaf]
        while chain[-1] != j:
            chain.append(self.parent[chain[-1]])
        return chain[::-1]

    def bake(self, G, rootT):
        """World-axis turns per bone (T, J, 4) and root offsets (T, 3) to local rotations and the root's translation."""
        T = G.shape[0]
        conj = qmul(qmul(np.broadcast_to(qinv(self.qw), (T, self.J, 4)), G), np.broadcast_to(self.qw, (T, self.J, 4)))
        local = qmul(np.broadcast_to(self.restR, (T, self.J, 4)), conj)
        local = qnorm(local)
        for t in range(1, T):
            flip = (local[t] * local[t - 1]).sum(1) < 0
            local[t, flip] *= -1
        rt = self.restT[self.root] + rootT @ self.parentRw   # world offset into the parent's frame (R^T x)
        return local, rt


class Dragon:
    def __init__(self, sk):
        self.sk = sk
        p, J = sk.p, sk.J
        width = np.abs(sk.P[:, 0]).max()
        self.H = sk.P[:, 1].max()
        hips = sk.p[sk.root]
        zc = hips[2]
        self.role = ['spine'] * J
        sub = [sk.subtree(j) for j in range(J)]
        jmax = np.abs(p[:, 0]).max()
        # The spine: from the root to the joint furthest forward (the snout).
        front = max(range(J), key=lambda j: p[j, 2] - 0.5 * abs(p[j, 0]))
        path = [front]
        while sk.parent[path[-1]] >= 0:
            path.append(sk.parent[path[-1]])
        path = path[::-1]
        on = set(path)
        self.legs, self.wings, tails = [], [], []
        def classify(c):
            s_ = sub[c]
            P_ = p[s_]
            if P_[:, 0].min() < -0.025 and P_[:, 0].max() > 0.025 and abs(p[c, 0]) < 0.02 and len(sk.children[c]) > 1                     and P_[:, 2].min() > zc - 0.12:
                for k in sk.children[c]:
                    classify(k)
                return
            if len(s_) >= 4 and P_[:, 2].min() < zc - 0.12 and abs(p[c, 0]) < 0.05 and (P_[:, 2].min() < p[c, 2] - 0.1)                     and not (P_[:, 1].min() < 0.12 * self.H and np.abs(P_[:, 0]).min() > 0.02):
                tails.append(c)
                return
            if P_[:, 1].min() < 0.12 * self.H and np.abs(P_[:, 0]).max() < 0.5 * jmax:
                for k in s_:
                    self.role[k] = 'leg'
                ch = sk.main_chain(c, lambda q: q[1])
                while len(ch) > 3 and abs(p[ch[0], 0]) < 0.02:   # a centre (spine) bone is not the top of a leg
                    ch = ch[1:]
                if len(ch) >= 2:
                    self.legs.append(dict(chain=ch, side=np.sign(P_[:, 0].mean()) or 1, front=p[c, 2] > zc + 0.02))
            elif np.abs(P_[:, 0]).max() > 0.5 * jmax and len(s_) >= 3:
                for k in s_:
                    self.role[k] = 'wing'
                self.wings.append(dict(chain=sk.main_chain(c, lambda q: -abs(q[0])), side=np.sign(P_[:, 0].mean()) or 1, all=s_))

        for j in path:
            for c in sk.children[j]:
                if c not in on:
                    classify(c)
        self.tail = []
        if tails:
            t0 = max(tails, key=lambda j: len(sub[j]))
            self.tail = sk.main_chain(t0, lambda q: -np.hypot(q[0], q[2] - zc))
            for k in self.tail:
                self.role[k] = 'tail'
        # Trunk: the spine up to the last joint legs or wings hang from; past it, the neck.
        branch = max([i for i, j in enumerate(path) if any(self.role[c] in ('leg', 'wing') for c in sk.children[j])] + [0])
        self.trunk = path[:branch + 1]
        self.neck = path[branch + 1:]
        # Eyes sit beside the snout: breathe from their parent.
        mouth = front
        if 'Eye' in sk.names[front] and sk.parent[front] >= 0:
            mouth = sk.parent[front]
            self.neck = [j for j in self.neck if j != front]
        self.mouth = mouth
        # Breath leaves along the face: forward and a little down, whatever way the snout bone points.
        d = np.array([0, -0.3, 1.0])
        d = d / np.linalg.norm(d)
        self.mouth_dir = (sk.Rw[mouth].T @ d).tolist()
        front = mouth
        print('  legs', [(sk.names[l['chain'][0]], 'F' if l['front'] else 'H', int(l['side'])) for l in self.legs])
        print('  wings', [(sk.names[w['chain'][0]], int(w['side']), len(w['chain'])) for w in self.wings],
              'tail', len(self.tail), 'trunk', len(self.trunk), 'neck', len(self.neck), 'mouth', sk.names[front])

    # --- building blocks -------------------------------------------------------------------------------------------
    def frame(self, dur):
        T = int(round(dur * FPS)) + 1
        t = np.linspace(0, dur, T)
        return t, np.tile([0, 0, 0, 1.0], (T, self.sk.J, 1)), np.zeros((T, 3))

    @staticmethod
    def add(G, j, q):
        G[:, j] = qmul(q, G[:, j])

    def spread_chain(self, G, chain, q_fn, weights=None):
        n = len(chain)
        for i, j in enumerate(chain):
            w = 1 / n if weights is None else weights[i]
            self.add(G, j, q_fn(w))

    def tail_wave(self, G, t, amp, freq, phase=0.0, lift=0.0):
        n = max(len(self.tail), 1)
        for i, j in enumerate(self.tail):
            k = (i + 1) / n
            self.add(G, j, yaw(amp * k * np.sin(2 * np.pi * freq * t - phase - i * 0.45) / n * 2.2))
            if np.any(lift):
                self.add(G, j, up(lift / n))

    def neck_pose(self, G, pitch, yaw_=0, roll_=0):
        # pitch skips the neck's root bones: on some Tripo skins foreclaw vertices hang off them and swing out as needles
        nk = self.neck[2:] if len(self.neck) > 4 else self.neck
        n = max(len(nk), 1)
        for j in nk:
            self.add(G, j, up(np.broadcast_to(pitch, G.shape[:1]) / n))
        n = max(len(self.neck), 1)
        for j in self.neck:
            self.add(G, j, yaw(np.broadcast_to(yaw_, G.shape[:1]) / n))
            if np.any(roll_):
                self.add(G, j, roll(np.broadcast_to(roll_, G.shape[:1]) / n))

    def wing_pose(self, G, lift, sweep=0, flex=0, fold=0):
        """lift: raise the wing at the shoulder; flex: bend at the elbow/wrist (up +); fold: tuck tips back."""
        T = G.shape[0]
        for w in self.wings:
            s = w['side']
            ch = w['chain']
            self.add(G, ch[0], qmul(yaw(s * -np.broadcast_to(sweep, T)), roll(s * np.broadcast_to(lift, T))))
            for i, j in enumerate(ch[1:]):
                self.add(G, j, qmul(yaw(s * -np.broadcast_to(fold, T) / max(len(ch) - 1, 1)),
                                    roll(s * np.broadcast_to(flex, T) / max(len(ch) - 1, 1))))

    def folded(self, G, k=1.0):
        self.wing_pose(G, -25 * k, sweep=40 * k, flex=-25 * k, fold=60 * k)

    def legs_gait(self, G, t, freq, amp, lift, gallop=False):
        for leg in self.legs:
            ch = leg['chain']
            off = 0.0
            if gallop:
                off = 0.0 if leg['front'] else 0.5
                off += 0.12 * (leg['side'] > 0)
            else:
                # diagonal pairs: front-left with hind-right
                off = 0.0 if (leg['front'] == (leg['side'] > 0)) else 0.5
            ph = 2 * np.pi * (freq * t + off)
            self.add(G, ch[0], up(amp * np.sin(ph)))
            if len(ch) > 1:
                bend = lift * np.maximum(0, np.sin(ph + np.pi / 2))
                self.add(G, ch[1], up(-bend if leg['front'] else bend))
            if len(ch) > 2:
                self.add(G, ch[2], up(-amp * 0.6 * np.sin(ph)))

    def breathe(self, G, t, k=1.0):
        for j in self.trunk[1:2]:
            self.add(G, j, up(1.5 * k * np.sin(2 * np.pi * t / 3.2)))

    def _aim(self, G, ch, targets, k, angle, rot):
        """Turn each bone of a chain so its segment points at a target angle (angle(): the segment's rest angle in
        degrees; rot(deg): the turn that adds to it). Each turn undoes what the bones above it already added."""
        prev = 0.0
        for i, tg in enumerate(targets):
            if i + 1 >= len(ch):
                break
            want = tg - angle(self.sk.p[ch[i + 1]] - self.sk.p[ch[i]])
            self.add(G, ch[i], rot((want - prev) * k))
            prev = want

    def tuck_legs(self, G, k):
        """In flight: forelegs folded up under the chest (past the collar bone when there is one), hind legs trailing
        back below the tail base. Aimed from each segment's rest angle, so it works whatever the rest pose is."""
        side = lambda v: np.degrees(np.arctan2(v[2], -v[1]))   # 0 = straight down, + = forward
        for leg in self.legs:
            ch = leg['chain']
            if leg['front']:
                o = 1 if len(ch) >= 4 else 0
                self._aim(G, ch[o:], (65, -95, -20), k, side, up)
            else:
                self._aim(G, ch, (-55, -85, -100), k, side, up)

    def spread_wings(self, G, k, lift=4.0):
        """Wings laid out flat (each segment level, a few degrees up), from their folded rest."""
        T = G.shape[0]
        for w in self.wings:
            s = w['side']
            elev = lambda v: np.degrees(np.arctan2(v[1], np.hypot(v[0], v[2])))
            self._aim(G, w['chain'], [lift] * (len(w['chain']) - 1), k, elev,
                      lambda d, s=s: roll(s * np.broadcast_to(d, T)))

    def trunk_pitch(self, G, deg, legs_level=True):
        """Pitch the body about the hips; legs counter-turn so feet don't swing with it."""
        r = self.trunk[0]
        self.add(G, r, up(deg))
        if legs_level:
            for leg in self.legs:
                self.add(G, leg['chain'][0], up(-np.asarray(deg)))

    # --- clips ------------------------------------------------------------------------------------------------------
    def clips(self):
        H = self.H
        out = {}

        def clip(name, dur, fn):
            t, G, R = self.frame(dur)
            fn(t, G, R)
            out[name] = (t, G, R)

        def idle(t, G, R):
            self.folded(G)
            self.breathe(G, t)
            self.neck_pose(G, 4 * np.sin(2 * np.pi * t / 3.2), 6 * np.sin(2 * np.pi * t / 6.4))
            self.tail_wave(G, t, 10, 1 / 3.2)
            R[:, 1] = -0.006 * H * (1 + np.sin(2 * np.pi * t / 3.2))
        clip('idle', 6.4, idle)

        def idle2(t, G, R):   # looks around, wary
            self.folded(G)
            self.breathe(G, t)
            look = 40 * np.sin(2 * np.pi * t / 6.0) * ease(t / 0.8)
            self.neck_pose(G, 10 + 6 * np.sin(2 * np.pi * t / 3.0), look, 8 * np.sin(2 * np.pi * t / 6.0))
            self.tail_wave(G, t, 18, 1 / 3.0)
        clip('idle2', 6.0, idle2)

        def idle3(t, G, R):   # low, menacing, wings half up, growl shiver
            k = ease(t / 0.6)
            shiver = np.sin(t * 55) * 0.8
            self.wing_pose(G, 10 * k + shiver, sweep=10, flex=10 * k)
            self.trunk_pitch(G, -6 * k)
            self.neck_pose(G, -22 * k + shiver, 4 * np.sin(2 * np.pi * t / 4))
            self.tail_wave(G, t, 25, 1 / 2.0, lift=8)
            R[:, 1] = -0.04 * H * k
        clip('idle3', 4.0, idle3)

        def walk(t, G, R):
            f = 1 / 1.6
            self.folded(G)
            self.legs_gait(G, t, f, 18, 30)
            self.neck_pose(G, -4 + 3 * np.sin(2 * np.pi * 2 * f * t), 6 * np.sin(2 * np.pi * f * t))
            self.add(G, self.trunk[0], roll(3 * np.sin(2 * np.pi * f * t)))
            self.tail_wave(G, t, 16, f, phase=1)
            R[:, 1] = 0.01 * H * np.sin(2 * np.pi * 2 * f * t)
        clip('walk', 1.6, walk)

        def walk2(t, G, R):   # stalking prowl, head low
            f = 1 / 2.2
            self.folded(G, 0.8)
            self.legs_gait(G, t, f, 14, 26)
            self.trunk_pitch(G, -5)
            self.neck_pose(G, -20, 10 * np.sin(2 * np.pi * f * t))
            self.tail_wave(G, t, 22, f, phase=1)
            R[:, 1] = -0.035 * H + 0.008 * H * np.sin(2 * np.pi * 2 * f * t)
        clip('walk2', 2.2, walk2)

        def run(t, G, R):   # bounding gallop
            f = 1 / 0.8
            self.wing_pose(G, -10, sweep=30, flex=-20, fold=45)
            self.legs_gait(G, t, f, 32, 50, gallop=True)
            self.trunk_pitch(G, 7 * np.sin(2 * np.pi * f * t), legs_level=False)
            self.neck_pose(G, -10 - 6 * np.sin(2 * np.pi * f * t + 1))
            self.tail_wave(G, t, 14, f, phase=2, lift=-6)
            R[:, 1] = 0.035 * H * np.abs(np.sin(2 * np.pi * f * t))
        clip('run', 0.8, run)

        def fly(t, G, R):
            f = 1 / 0.6
            ph = 2 * np.pi * f * t
            self.wing_pose(G, 15 + 70 * np.sin(ph), sweep=-8 + 10 * np.cos(ph), flex=40 * np.sin(ph - 0.8), fold=-8 + 20 * (1 - np.sin(ph)) / 2)
            self.tuck_legs(G, 1.0)
            self.trunk_pitch(G, -14 + 5 * np.sin(ph + np.pi), legs_level=False)
            self.neck_pose(G, 6 - 4 * np.sin(ph), 0)
            self.tail_wave(G, t, 10, f / 2, lift=8)
            R[:, 1] = 0.08 * H * np.sin(ph + np.pi)
        clip('fly', 1.8, fly)

        def fly2(t, G, R):   # glide, banking
            bank = 14 * np.sin(2 * np.pi * t / 4)
            self.spread_wings(G, 1.0, 4 + 3 * np.sin(2 * np.pi * t / 1.3))   # wings laid out flat and wide
            self.tuck_legs(G, 1.0)
            self.trunk_pitch(G, -10, legs_level=False)
            self.add(G, self.trunk[0], roll(bank))
            self.neck_pose(G, 2, -bank * 0.6)
            self.tail_wave(G, t, 12, 1 / 4, lift=6)
        clip('fly2', 4.0, fly2)

        def jump(t, G, R):   # takeoff: crouch, spring, two downbeats
            c = pulse(t, 0, 0.35, 0.45, 0.6)
            air = ease((t - 0.45) / 0.5)
            beat = np.where(t > 0.5, np.sin(2 * np.pi * (t - 0.5) / 0.7), 0)
            self.wing_pose(G, 40 * c + (10 + 50 * beat) * air, flex=25 * beat * air)
            self.trunk_pitch(G, -8 * c + 14 * air * (1 - ease((t - 1.4) / 0.6)))
            self.tuck_legs(G, air)
            self.neck_pose(G, -15 * c + 12 * air)
            self.tail_wave(G, t, 12, 0.7, lift=-10 * c)
            R[:, 1] = -0.06 * H * c + 0.9 * H * ease((t - 0.45) / 1.3)
        clip('jump', 2.0, jump)

        def land(t, G, R):
            down = 1 - ease(t / 0.9)
            beat = np.sin(2 * np.pi * t / 0.5) * down
            impact = pulse(t, 0.85, 0.95, 1.0, 1.5)
            self.wing_pose(G, 30 * down + 30 * beat, flex=-20 * impact)
            self.tuck_legs(G, down)
            self.trunk_pitch(G, 12 * down - 6 * impact)
            self.neck_pose(G, 8 * down - 18 * impact)
            R[:, 1] = 0.9 * H * down - 0.05 * H * impact
        clip('land', 1.8, land)

        def bite(t, G, R):   # atk1: rear the neck back, snap down and forward
            back = pulse(t, 0, 0.45, 0.5, 0.6)
            strike = pulse(t, 0.5, 0.62, 0.85, 1.3)
            self.folded(G, 0.7)
            self.neck_pose(G, 60 * back - 70 * strike, 0, 10 * strike * np.sin(t * 40))
            self.trunk_pitch(G, 8 * back - 14 * strike)
            self.wing_pose(G, 25 * back + 10 * strike, flex=10 * back)
            self.tail_wave(G, t, 20, 1, lift=10 * back)
            R[:, 2] = -0.1 * H * back + 0.4 * H * strike
            R[:, 1] = -0.03 * H * strike
        clip('atk1', 1.6, bite)

        def claw(t, G, R):   # atk2: rear onto hind legs, rake with a forefoot
            fr = [l for l in self.legs if l['front'] and l['side'] > 0] or [l for l in self.legs if l['front']]
            k = pulse(t, 0.1, 0.45, 0.75, 1.3)
            rake = pulse(t, 0.45, 0.6, 0.65, 0.95)
            self.folded(G, 1 - 0.6 * k)
            self.wing_pose(G, 25 * k, flex=15 * k)
            self.trunk_pitch(G, 14 * k - 10 * rake)
            for l in fr[:1]:
                self.add(G, l['chain'][0], up(55 * k - 90 * rake))
                if len(l['chain']) > 1:
                    self.add(G, l['chain'][1], up(-50 * k + 40 * rake))
                self.add(G, l['chain'][0], qa([0, 0, 1], -l['side'] * 25 * k))
            self.neck_pose(G, 10 * k - 15 * rake, -15 * rake)
            self.tail_wave(G, t, 18, 0.8)
            R[:, 1] = 0.05 * H * k
            R[:, 2] = 0.08 * H * rake
        clip('atk2', 1.5, claw)

        def tail_sweep(t, G, R):   # atk3: twist and scythe the tail round
            wind = pulse(t, 0, 0.4, 0.45, 0.6)
            sw = pulse(t, 0.45, 0.75, 0.9, 1.6)
            turn = 35 * wind - 60 * sw
            self.add(G, self.trunk[0], yaw(-turn * 0.5))
            n = max(len(self.tail), 1)
            for i, j in enumerate(self.tail):
                self.add(G, j, yaw(turn * 2.4 / n * (1 + i / n)))
                self.add(G, j, up(8 / n * sw))
            self.folded(G, 0.8)
            self.neck_pose(G, -10 * sw, turn * 0.4)
            for leg in self.legs:
                self.add(G, leg['chain'][0], yaw(turn * 0.5))
        clip('atk3', 1.7, tail_sweep)

        def buffet(t, G, R):   # atk4: wings up high, then a slam that blasts forward
            up_ = pulse(t, 0, 0.5, 0.6, 0.7)
            slam = pulse(t, 0.6, 0.75, 0.9, 1.4)
            self.wing_pose(G, 70 * up_ - 25 * slam, sweep=-30 * slam, flex=30 * up_ - 30 * slam)
            self.trunk_pitch(G, 10 * up_ - 6 * slam)
            self.neck_pose(G, 18 * up_ - 20 * slam)
            self.tail_wave(G, t, 15, 1)
            R[:, 1] = 0.04 * H * up_
        clip('atk4', 1.5, buffet)

        def stomp(t, G, R):   # atk5: rear right up and crash down with both forefeet
            rear = pulse(t, 0.05, 0.6, 0.75, 0.95)
            crash = pulse(t, 0.85, 0.95, 1.1, 1.6)
            self.wing_pose(G, 45 * rear - 20 * crash, flex=20 * rear, sweep=-10 * rear)
            self.trunk_pitch(G, 32 * rear - 6 * crash)
            for l in self.legs:
                if l['front']:
                    self.add(G, l['chain'][0], up(40 * rear))
                    if len(l['chain']) > 1:
                        self.add(G, l['chain'][1], up(-60 * rear))
            self.neck_pose(G, 20 * rear - 35 * crash, 0, 0)
            self.tail_wave(G, t, 10, 0.6, lift=-15 * rear)
            R[:, 1] = 0.1 * H * rear - 0.05 * H * crash
            R[:, 2] = 0.1 * H * crash
        clip('atk5', 1.8, stomp)

        def breath(t, G, R, sweep=0.0):   # draw in, rear back, then pour it out
            draw = pulse(t, 0, 0.9, 1.0, 1.2)
            pour = pulse(t, 1.05, 1.2, 2.9, 3.3)
            sw = sweep * np.sin(np.clip((t - 1.15) / 1.8, 0, 1) * np.pi * 2 - np.pi / 2) * pour
            self.wing_pose(G, 14 * draw + 18 * pour, sweep=-15 * pour)
            self.trunk_pitch(G, 4 * draw - 4 * pour)   # the chest barely lifts: a big lift stretches the forefoot skin into a needle
            self.neck_pose(G, 65 * draw + (10 if sweep else 4) * pour, sw, 0)
            self.add(G, self.trunk[0], yaw(sw * 0.3))
            self.tail_wave(G, t, 10, 0.8, lift=6 * draw)
            R[:, 1] = 0.03 * H * draw
            R[:, 2] = -0.04 * H * draw + 0.03 * H * pour
        clip('breath', 3.5, breath)
        clip('breath2', 3.5, lambda t, G, R: breath(t, G, R, 32.0))

        def roar(t, G, R):
            k = pulse(t, 0.1, 0.6, 2.2, 2.8)
            shake = np.sin(t * 38) * 5 * k
            self.wing_pose(G, 45 * k, sweep=-15 * k, flex=25 * k)
            self.trunk_pitch(G, 12 * k)
            self.neck_pose(G, 40 * k, shake, shake * 0.6)
            self.tail_wave(G, t, 20, 1.2, lift=10 * k)
            R[:, 1] = 0.03 * H * k
        clip('roar', 3.0, roar)

        def hit(t, G, R):
            k = np.exp(-t * 5) * np.sin(np.minimum(t * 14, np.pi))
            self.folded(G, 0.8)
            self.neck_pose(G, 25 * k, 20 * k)
            self.trunk_pitch(G, 6 * k)
            self.wing_pose(G, 15 * k)
            R[:, 2] = -0.05 * H * k
        clip('hit', 0.9, hit)

        def death(t, G, R, side=1):
            k = ease(t / 1.4)
            spasm = np.sin(t * 30) * 6 * (1 - k)
            self.add(G, self.trunk[0], roll(side * 75 * k))
            self.wing_pose(G, -40 * k + spasm, flex=-30 * k, fold=30 * k)
            self.neck_pose(G, -30 * k + 30 * pulse(t, 0, 0.3, 0.4, 0.9), side * 25 * k)
            for l in self.legs:
                self.add(G, l['chain'][0], up(20 * k * (1 if l['front'] else -1)))
            self.tail_wave(G, t, 20 * (1 - k), 1.5)
            R[:, 1] = -0.15 * H * k
            R[:, 0] = side * 0.12 * H * k
        clip('death', 2.4, death)
        clip('death2', 2.4, lambda t, G, R: death(t, G, R, -1))

        if not self.tail:
            pass
        return out


def write_beast(entry, sk, doc, buf, clips, extra):
    w = rebuild(doc, buf)
    names = {}
    for name, (t, G, R) in clips.items():
        local, rt = sk.bake(G, R)
        t_acc = w.acc(t[:, None].astype(np.float32), 'SCALAR', minmax=True)
        samplers, channels = [], []
        for j, node in enumerate(sk.nodes):
            tr = local[:, j]
            if np.abs(tr - sk.restR[j]).max() < 1e-4:
                continue
            q = np.round(np.clip(tr, -1, 1) * 32767).astype(np.int16)
            samplers.append({'input': t_acc, 'output': w.acc(q, 'VEC4', 5122, True), 'interpolation': 'LINEAR'})
            channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': 'rotation'}})
        samplers.append({'input': t_acc, 'output': w.acc(rt.astype(np.float32), 'VEC3'), 'interpolation': 'LINEAR'})
        channels.append({'sampler': len(samplers) - 1, 'target': {'node': sk.nodes[sk.root], 'path': 'translation'}})
        doc['animations'].append({'name': name, 'samplers': samplers, 'channels': channels})
        names[name] = round(float(t[-1]), 3)
    if entry['id'].startswith(roster.TWO_SIDED):
        for m in doc.get('materials', []):
            m['doubleSided'] = True
    doc['buffers'] = [{'byteLength': len(w.buf)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    while len(w.buf) % 4:
        w.buf.append(0)
    path = os.path.join(OUT, entry['id'] + '.glb')
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(w.buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(w.buf), 0x004E4942) + bytes(w.buf))
    meta = {k: v for k, v in entry.items() if k != 'src'}
    meta.update(clips=names, rigTop=round(float(sk.P[:, 1].max()), 4), bytes=os.path.getsize(path), **extra)
    print(f"{entry['id']:24s} {len(names)} clips  {os.path.getsize(path) / 1e6:.1f} MB", flush=True)
    return meta


def fix_far_weights(doc, buf, sk, H, high_bones):
    """Tripo's skin hangs some low vertices (foreclaws) off high bones (the neck): when the neck rears they swing out as
    long needles. A vertex near the ground keeps no weight on a bone high above it; that weight goes to the nearest low
    bone."""
    prims = mesh_world(doc, buf)
    names = [doc['nodes'][n].get('name') for n in doc['skins'][0]['joints']]
    jp = np.array([sk.p[sk.names.index(nm)] if nm in sk.names else [0, 9, 0] for nm in names])
    ground = min(p[2][:, 1].min() for p in prims)
    low_b = np.nonzero(jp[:, 1] - ground < 0.4 * H)[0]
    # only the neck and head count as "high": wing bones reach the ground on wyverns and must keep their skin
    is_high = np.array([nm in high_bones for nm in names])
    moved = 0
    for ni, pi, Pw, *_ in prims:
        pr = doc['meshes'][doc['nodes'][ni]['mesh']]['primitives'][pi]
        aj, aw = doc['accessors'][pr['attributes']['JOINTS_0']], doc['accessors'][pr['attributes']['WEIGHTS_0']]
        if aj['componentType'] != 5121 or aw['componentType'] != 5126:
            continue
        def view(a, dt):
            bv = doc['bufferViews'][a['bufferView']]
            o = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
            return np.frombuffer(buf, dt, a['count'] * 4, o).reshape(-1, 4).copy(), o
        J, oj = view(aj, np.uint8)
        W, ow = view(aw, np.float32)
        y = Pw[:, 1] - ground
        bad = (y[:, None] < 0.25 * H) & (jp[J, 1] - ground > 0.55 * H) & is_high[J] & (W > 0)
        rows = np.nonzero(bad.any(1))[0]
        for v in rows:
            near = low_b[np.argmin(np.linalg.norm(jp[low_b] - Pw[v], axis=1))]
            for c in np.nonzero(bad[v])[0]:
                J[v, c] = near
        moved += len(rows)
        buf[oj:oj + J.nbytes] = J.tobytes()
        buf[ow:ow + W.nbytes] = W.tobytes()
    print(f'  {moved} low vertices taken off high bones')


def build_dragon(entry):
    doc, buf = load(roster.src_path(entry))
    sk = Skeleton(doc, buf)
    d = Dragon(sk)
    head = set(d.neck) | {d.mouth}
    for j in list(head):
        head |= set(sk.subtree(j)) if callable(getattr(sk, 'subtree', None)) else set()
    fix_far_weights(doc, buf, sk, d.H, {sk.names[j] for j in head})
    humanoids.TEX = {0: 2048, 1: 1024, 2: 2048}
    meta = write_beast(entry, sk, doc, buf, d.clips(), dict(
        mouth=sk.names[d.mouth], mouthDir=d.mouth_dir, mouthOff=0.0, breathWin=[0.34, 0.83],
        hover={'fly': 0.55, 'fly2': 0.7, 'jump': 0.0, 'land': 0.0}))
    humanoids.TEX = {0: 1024, 1: 512, 2: 1024}
    return meta


def main(ids):
    metas = []
    for e in roster.BEASTS:
        if ids and e['id'] not in ids and e.get('group') not in ids:
            continue
        print(e['id'])
        if e['kind'] == 'dragon':
            metas.append(build_dragon(e))
        save_roster(metas[-1:])


if __name__ == '__main__':
    main(sys.argv[1:])
