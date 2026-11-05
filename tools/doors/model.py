"""The doors, modelled. Run inside Blender, through Blender MCP (after python tools/doors/trace.py):

    exec(open(path).read(), dict(__file__=path, __name__="__main__"))

Each leaf is oak planks with real grooves, the owner's picture of that door over them, and on it, in relief, the iron the picture shows: straps, bands and plates measured off it (IRON),
rivets as domes where the picture has them, a ring pull and hinge barrels. Local frame (game coordinates, x east, y up, z south): the hinge at the origin, the foot at y = 0, the front looking along +z.
The game swings them: src/items/doors.js. Writes assets/game/items/doors.glb and leaves the lot in the scene Doors to look at.
"""
import json
import math
import os

import bmesh
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BUILD = os.path.join(ROOT, 'tools', 'build', 'doors')
TRACE = json.load(open(os.path.join(BUILD, 'trace.json')))
ATLAS = {'door_great': 0, 'door_pointed': 1, 'door_iron': 2, 'door_iron2': 3}
SCENE = 'Doors'

# Home doors fill what build_village.py leaves between its posts, sill and lintel; the rest fit their arches in build_interior.py.
HOME_W, HOME_H = 1.54, 2.15
# picture, width, spring, apex (None: the picture's own arch), thickness, iron's height, the part of the picture it is (-1 left half, 1 right half, 0 all), which way the leaf runs from its hinge,
# where the ring is on the picture (u, v, radius), and the heights of the hinges as a share of the picture from its top.
SPEC = {
    'door_great_l': dict(pic='door_great', w=2.3, spring=4.8, apex=7.6, t=0.15, iron=0.03, half=-1, hinge=1, ring=(0.406, 0.59, 0.036), straps=(0.4, 0.79), xc=2.3, hw=2.3),
    'door_great_r': dict(pic='door_great', w=2.3, spring=4.8, apex=7.6, t=0.15, iron=0.03, half=1, hinge=-1, ring=(0.59, 0.59, 0.036), straps=(0.4, 0.79), xc=-2.3, hw=2.3),
    'door_pointed': dict(pic='door_pointed', w=2.2, spring=2.4, apex=3.4, t=0.09, iron=0.016, half=0, hinge=1, ring=(0.494, 0.586, 0.044), straps=(0.345, 0.755), xc=1.1, hw=1.1),
    'door_iron_r': dict(pic='door_iron', w=2.2, spring=2.4, apex=3.4, t=0.09, iron=0.016, half=0, hinge=-1, ring=(0.49, 0.424, 0.05), straps=(0.25, 0.74), xc=-1.1, hw=1.1),
    'door_iron2': dict(pic='door_iron2', w=HOME_W, spring=None, apex=HOME_H, t=0.07, iron=0.013, half=0, hinge=1, ring=(0.476, 0.424, 0.045), straps=(0.28, 0.7), xc=HOME_W / 2, hw=HOME_W / 2),
    'door_iron2_r': dict(pic='door_iron2', w=HOME_W, spring=None, apex=HOME_H, t=0.07, iron=0.013, half=0, hinge=-1, ring=(0.476, 0.424, 0.045), straps=(0.28, 0.7), xc=-HOME_W / 2, hw=HOME_W / 2),
}
# How far down each picture its arch starts, as a share of its height.
SPRING = {'door_great': 0.345, 'door_pointed': 0.38, 'door_iron': 0.28, 'door_iron2': 0.28}


def strap(v, h, u0, u1, tip):
    """A bar across the picture at v, half height h, from u0 to u1 and ending in a spade running tip further on."""
    d = 1 if tip >= 0 else -1
    k = abs(tip)
    return [
        [(u0, v - h), (u1, v - h), (u1, v + h), (u0, v + h)],
        [(u1, v - h), (u1 + d * k * 0.25, v - h * 2.6), (u1 + d * k * 0.55, v - h * 1.4), (u1 + d * k, v), (u1 + d * k * 0.55, v + h * 1.4), (u1 + d * k * 0.25, v + h * 2.6), (u1, v + h)],
    ]


def plate(u, v, hu, hv):
    """A lozenge behind a ring or a keyhole."""
    return [[(u, v - hv), (u + hu, v), (u, v + hv), (u - hu, v)]]


def bar(u0, v0, u1, v1):
    return [[(u0, v0), (u1, v0), (u1, v1), (u0, v1)]]


# What's iron on each picture, in its own u and v (a share of the whole image, from its top left). band: an iron frame round the leaf this wide, as a share of its width.
IRON = {
    'door_great': dict(band=0, parts=[
        *bar(0.156, 0.345, 0.2, 0.975), *bar(0.812, 0.345, 0.856, 0.975), *bar(0.464, 0.05, 0.54, 0.975),
        *strap(0.4, 0.012, 0.2, 0.40, 0.036), *strap(0.79, 0.012, 0.2, 0.40, 0.036),
        *strap(0.4, 0.012, 0.812, 0.60, -0.036), *strap(0.79, 0.012, 0.812, 0.60, -0.036),
        *plate(0.406, 0.555, 0.03, 0.05), *plate(0.59, 0.555, 0.03, 0.05),
    ]),
    'door_pointed': dict(band=0, parts=[
        *strap(0.344, 0.011, 0.26, 0.74, 0.0), *strap(0.756, 0.011, 0.26, 0.74, 0.0),
        *plate(0.494, 0.54, 0.035, 0.065),
    ]),
    'door_iron': dict(band=0.085, parts=[
        *strap(0.25, 0.018, 0.28, 0.645, 0.075), *strap(0.736, 0.018, 0.28, 0.645, 0.075),
        *plate(0.49, 0.39, 0.052, 0.09), *plate(0.69, 0.56, 0.032, 0.07),
    ]),
    'door_iron2': dict(band=0.085, parts=[
        *strap(0.28, 0.018, 0.27, 0.655, 0.07), *strap(0.70, 0.018, 0.27, 0.655, 0.07),
        *plate(0.476, 0.40, 0.06, 0.105), *plate(0.68, 0.545, 0.035, 0.07),
    ]),
}


def pointed(x, hw, h):
    """A two-centred arch, as build_interior.py cuts them."""
    x = min(abs(x), hw)
    cx = (hw * hw - h * h) / (2 * hw)
    r = hw - cx
    return math.sqrt(max(r * r - (x - cx) ** 2, 0.0))


class Leaf:
    def __init__(self, spec):
        self.s = spec
        self.tr = TRACE[spec['pic']]
        x0, y0, x1, y1 = self.tr['box']
        mid = (x0 + x1) / 2
        self.u0, self.u1 = {-1: (x0, mid), 0: (x0, x1), 1: (mid, x1)}[spec['half']]
        self.v0, self.v1 = y0, y1
        self.sf = SPRING[spec['pic']]
        self.apex = spec['apex']
        self.spring = spec['spring'] if spec['spring'] is not None else self.apex * (1 - self.sf)
        self.w = spec['w']
        self.sign = spec['hinge']
        self.atlas = ATLAS[spec['pic']]

    # x across the leaf, from a picture's u, and back. The picture's left edge is the hinge, unless it's the right half of a pair, whose right edge is.
    def xu(self, u):
        t = (u - self.u0) / (self.u1 - self.u0)
        if self.s['half'] == 1:
            return -self.w * (1 - t)
        return self.w * t if self.sign > 0 else -self.w * t

    def ux(self, x):
        if self.s['half'] == 1:
            t = 1 + x / self.w
        else:
            t = x / self.w if self.sign > 0 else -x / self.w
        return self.u0 + (self.u1 - self.u0) * t

    def yv(self, v):
        n = (v - self.v0) / (self.v1 - self.v0)
        if n >= self.sf:
            return self.spring * (1 - n) / (1 - self.sf)
        return self.spring + (self.apex - self.spring) * (self.sf - n) / self.sf

    def vy(self, y):
        if y <= self.spring:
            n = 1 - y / self.spring * (1 - self.sf)
        else:
            n = self.sf - (y - self.spring) / (self.apex - self.spring) * self.sf
        return self.v0 + (self.v1 - self.v0) * n

    def top(self, x):
        if self.s['spring'] is not None:
            return self.spring + pointed(x - self.s['xc'], self.s['hw'], self.apex - self.spring)
        # The picture's own arch.
        u = self.ux(x)
        o = self.tr['outline']
        for a, b in zip(o, o[1:]):
            if a[0] <= u <= b[0]:
                t = (u - a[0]) / max(b[0] - a[0], 1e-6)
                return min(self.apex, self.yv(a[1] + (b[1] - a[1]) * t))
        return self.spring

    def uv(self, x, y):
        u, v = self.ux(x), self.vy(y)
        # Over the spring the picture's own arch is fitted to the leaf's, column by column, so its edge comes to the leaf's edge.
        if y > self.spring:
            o = self.tr['outline']
            pic = o[-1][1]
            for a, b in zip(o, o[1:]):
                if a[0] <= u <= b[0]:
                    pic = a[1] + (b[1] - a[1]) * (u - a[0]) / max(b[0] - a[0], 1e-6)
                    break
            base = self.vy(self.spring)
            n = (y - self.spring) / max(self.top(x) - self.spring, 1e-4)
            v = base + (pic + 0.002 - base) * min(n, 1.0)
        ox, oy = (self.atlas % 2) * 0.5, (self.atlas // 2) * 0.5
        return (ox + u * 0.5, 1 - (oy + v * 0.5))

    def columns(self, grooves):
        lo, hi = (0.0, self.w) if self.sign > 0 else (-self.w, 0.0)
        xs = {round(lo + (hi - lo) * i / 22, 4) for i in range(23)}
        marks = {}
        if grooves:
            g = 0.006 + self.s['t'] * 0.05
            for u in self.tr['seams']:
                if not self.u0 < u < self.u1:
                    continue
                x = self.xu(u)
                if lo + 0.02 < x < hi - 0.02:
                    for k in (-g, 0.0, g):
                        xs.add(round(x + k, 4))
                    marks[round(x, 4)] = self.s['t'] * 0.12
        return sorted(xs), marks


class Mesher:
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.uvl = self.bm.loops.layers.uv.new('UVMap')

    def face(self, pts, uvs, out, smooth=False):
        """In the game's coordinates, turned to look along out, whichever order they came in."""
        n = [0.0, 0.0, 0.0]
        for i, a in enumerate(pts):
            b = pts[(i + 1) % len(pts)]
            n[0] += (a[1] - b[1]) * (a[2] + b[2])
            n[1] += (a[2] - b[2]) * (a[0] + b[0])
            n[2] += (a[0] - b[0]) * (a[1] + b[1])
        if n[0] ** 2 + n[1] ** 2 + n[2] ** 2 < 1e-14:
            return
        # (Blender's frame is the game's with z turned round and swapped for y, which keeps the handedness: a loop faces the same way in both.)
        if n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0:
            pts, uvs = pts[::-1], uvs[::-1]
        vs = [self.bm.verts.new((p[0], -p[2], p[1])) for p in pts]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return
        f.smooth = smooth
        for lp, uv in zip(f.loops, uvs):
            lp[self.uvl].uv = uv

    def finish(self, collection):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.6), use_dissolve_boundaries=False, verts=bm.verts, edges=bm.edges, delimit={'UV'})
        bmesh.ops.triangulate(bm, faces=bm.faces)
        me = bpy.data.meshes.new(self.name)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(self.name, me)
        collection.objects.link(ob)
        return ob


def body(m, L, detail):
    t = L.s['t'] / 2
    xs, marks = L.columns(detail)
    def depth(x):
        return marks.get(round(x, 4), 0.0)
    for side in (1, -1):
        for a, b in zip(xs, xs[1:]):
            za, zb = side * (t - depth(a)), side * (t - depth(b))
            ta, tb = L.top(a), L.top(b)
            pts = [(a, 0, za), (b, 0, zb), (b, tb, zb), (a, ta, za)]
            m.face(pts, [L.uv(p[0], p[1]) for p in pts], (0, 0, side))
    # All round the edge.
    for a, b in zip(xs, xs[1:]):
        ta, tb = L.top(a), L.top(b)
        m.face([(a, ta, t), (b, tb, t), (b, tb, -t), (a, ta, -t)], [L.uv(a, ta - 0.01), L.uv(b, tb - 0.01), L.uv(b, tb - 0.01), L.uv(a, ta - 0.01)], (0, 1, 0))
        m.face([(a, 0, -t), (b, 0, -t), (b, 0, t), (a, 0, t)], [L.uv(a, 0.01), L.uv(b, 0.01), L.uv(b, 0.01), L.uv(a, 0.01)], (0, -1, 0))
    for x, sg in ((xs[0], -1), (xs[-1], 1)):
        y = L.top(x)
        xi = x - sg * 0.01
        m.face([(x, 0, -t), (x, 0, t), (x, y, t), (x, y, -t)], [L.uv(xi, 0), L.uv(xi, 0), L.uv(xi, y), L.uv(xi, y)], (sg, 0, 0))


def raised(m, L, outer, up, base, side):
    """A convex shape of iron standing up from the wood, with a chamfer round its top. outer: (x, y) on the leaf."""
    t = L.s['t'] / 2
    hi, lo = side * (t + up), side * (t - 0.003)
    cx = sum(p[0] for p in outer) / len(outer)
    cy = sum(p[1] for p in outer) / len(outer)
    def shrink(p):
        dx, dy = p[0] - cx, p[1] - cy
        L_ = math.hypot(dx, dy) or 1
        k = max(0.0, 1 - base / L_)
        return (cx + dx * k, cy + dy * k)
    inner = [shrink(p) for p in outer]
    pts = [(*p, hi) for p in inner]
    m.face(pts, [L.uv(p[0], p[1]) for p in pts], (0, 0, side))
    n = len(outer)
    for i in range(n):
        a, b = outer[i], outer[(i + 1) % n]
        c, d = inner[(i + 1) % n], inner[i]
        ex, ey = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy
        q = [(*a, side * (t + up * 0.55)), (*b, side * (t + up * 0.55)), (*c, hi), (*d, hi)]
        m.face(q, [L.uv(p[0], p[1]) for p in q], (ex, ey, side * 0.5))
        w = [(*a, lo), (*b, lo), (*b, side * (t + up * 0.55)), (*a, side * (t + up * 0.55))]
        m.face(w, [L.uv(p[0], p[1]) for p in w], (ex, ey, 0))


def band(m, L, frac, up):
    """An iron frame following the leaf's edge: up its hinge side, round the arch, down the other, and along the foot. Its strips meet square, so they're laid one by one."""
    t = L.s['t'] / 2
    d = L.w * frac
    bevel = min(0.006, d * 0.2)
    lo, hi = (0.0, L.w) if L.sign > 0 else (-L.w, 0.0)
    inset = lambda x: min(x - lo, hi - x)
    n = 28
    path = [(lo + 0.001, 0.0)] + [(lo + (hi - lo) * i / n, L.top(lo + (hi - lo) * i / n) - 0.002) for i in range(n + 1)] + [(hi - 0.001, 0.0)]
    # Each point's way in.
    def inward(i):
        a, b = path[max(i - 1, 0)], path[min(i + 1, len(path) - 1)]
        ex, ey = b[0] - a[0], b[1] - a[1]
        l = math.hypot(ex, ey) or 1
        return (ey / l, -ex / l)
    inner = []
    for i, p in enumerate(path):
        nx, ny = inward(i)
        inner.append((p[0] + nx * d, p[1] + ny * d))
    # (Clockwise as you look at the front, so inward is to the right. If it's the other way out, turn it.)
    if inner[len(path) // 2][1] > path[len(path) // 2][1]:
        inner = [(2 * p[0] - q[0], 2 * p[1] - q[1]) for p, q in zip(path, inner)]
    for side in (1, -1):
        h, l_ = side * (t + up), side * (t - 0.003)
        for i in range(len(path) - 1):
            a, b, c, e = path[i], path[i + 1], inner[i + 1], inner[i]
            if b[0] == a[0] and b[1] == a[1]:
                continue
            q = [(*a, h), (*b, h), (*c, h), (*e, h)]
            m.face(q, [L.uv(p[0], p[1]) for p in q], (0, 0, side))
            w = [(*e, h), (*c, h), (*c, l_), (*e, l_)]
            m.face(w, [L.uv(p[0], p[1]) for p in w], (path[i][0] - inner[i][0], path[i][1] - inner[i][1], 0))
            o = [(*a, h), (*b, h), (*b, l_), (*a, l_)]
            m.face(o, [L.uv(p[0], p[1]) for p in o], (inner[i][0] - path[i][0], inner[i][1] - path[i][1], 0) if False else (a[0] - inner[i][0], a[1] - inner[i][1], 0))
        # The foot.
        f = [(lo, 0.0), (hi, 0.0), (hi, d * 0.95), (lo, d * 0.95)]
        raised(m, L, f, up, bevel, side)


def iron(m, L):
    spec = IRON[L.s['pic']]
    up = L.s['iron']
    bevel = up * 0.5
    if spec['band']:
        band(m, L, spec['band'], up)
    for side in (1, -1):
        for part in spec['parts']:
            pts = []
            for u, v in part:
                u = max(L.u0, min(L.u1, u))
                x = L.xu(u)
                pts.append((x, min(L.yv(v), L.top(x) - 0.004)))
            if max(p[0] for p in pts) - min(p[0] for p in pts) < 0.01:
                continue
            raised(m, L, pts, up, bevel, side)


def dome(m, L, cx, cy, cz, r, side, seg=5):
    """A rivet's head."""
    h = r * 0.62
    def pt(k, i):
        a = i / seg * math.tau
        f = (1 - (k / 2) ** 2) ** 0.5
        return (cx + math.cos(a) * r * f, cy + math.sin(a) * r * f, cz + side * h * k / 2)
    tip = (cx, cy, cz + side * h)
    for i in range(seg):
        a = (i + 0.5) / seg * math.tau
        out = (math.cos(a), math.sin(a), side)
        m.face([pt(0, i), pt(0, i + 1), pt(1, i + 1), pt(1, i)], [L.uv(cx, cy)] * 4, out, smooth=True)
        m.face([pt(1, i), pt(1, i + 1), tip], [L.uv(cx, cy)] * 3, (0, 0, side), smooth=True)


def ring(m, L, cx, cy, cz, R, r, side, n=20, seg=6):
    """The pull: a round bar bent into a circle, standing proud of the door."""
    def pt(i, k):
        a, b = i / n * math.tau, k / seg * math.tau
        o = (math.cos(a), math.sin(a))
        return (cx + o[0] * (R + r * math.cos(b)), cy + o[1] * (R + r * math.cos(b)), cz + side * r * math.sin(b))
    for i in range(n):
        for k in range(seg):
            a, b = (i + 0.5) / n * math.tau, (k + 0.5) / seg * math.tau
            out = (math.cos(a) * math.cos(b), math.sin(a) * math.cos(b), side * math.sin(b))
            q = [pt(i, k), pt(i + 1, k), pt(i + 1, k + 1), pt(i, k + 1)]
            m.face(q, [L.uv(p[0], p[1]) for p in q], out, smooth=True)


def hardware(m, L):
    t, s = L.s['t'] / 2, L.s
    scale = abs(L.xu(L.u1) - L.xu(L.u0)) / (L.u1 - L.u0)      # metres of door to a unit of picture, across
    for side in (1, -1):
        for u, v, r in L.tr['studs']:
            if not L.u0 + 0.004 < u < L.u1 - 0.004:
                continue
            x, y = L.xu(u), L.yv(v)
            if y < L.top(x) - 0.01:
                dome(m, L, x, y, side * (t + s['iron'] * 0.2), max(0.011, scale * r * 0.9), side)
        u, v, rr = s['ring']
        cx, cy = L.xu(u), L.yv(L.v0 + (L.v1 - L.v0) * v)
        R = scale * rr
        ring(m, L, cx, cy, side * (t + s['iron'] + R * 0.16), R, R * 0.15, side)
        # What it hangs from.
        dome(m, L, cx, cy + R * 1.02, side * (t + s['iron'] * 0.5), R * 0.32, side, seg=8)
    # Hinge barrels, on the hinge edge at the straps, on the side the leaf opens away from: the line it turns about.
    for sv in s['straps']:
        y = L.yv(L.v0 + (L.v1 - L.v0) * sv)
        h = 0.05 + s['t'] * 0.45
        r = 0.018 + s['t'] * 0.11
        uv = L.uv(0.03 * L.sign, y)
        for i in range(8):
            a, b = i / 8 * math.tau, (i + 1) / 8 * math.tau
            c = (a + b) / 2
            pts = [(math.cos(a) * r, y - h, t + math.sin(a) * r), (math.cos(b) * r, y - h, t + math.sin(b) * r),
                   (math.cos(b) * r, y + h, t + math.sin(b) * r), (math.cos(a) * r, y + h, t + math.sin(a) * r)]
            m.face(pts, [uv] * 4, (math.cos(c), 0, math.sin(c)), smooth=True)
        for yy, sg in ((y - h, -1), (y + h, 1)):
            pts = [(math.cos(i / 8 * math.tau) * r, yy, t + math.sin(i / 8 * math.tau) * r) for i in range(8)]
            m.face(pts, [uv] * 8, (0, sg, 0))


def head(collection):
    """What fills the corners over a home's arched door, in the square opening the village leaves for it: timber, part of the frame. The leaf's left edge at x = 0."""
    L = Leaf(SPEC['door_iron2'])
    m = Mesher('door_head')
    t = 0.045
    n = 22
    xs = [HOME_W * i / n for i in range(n + 1)]
    top = HOME_H + 0.03
    def wood(x, y):
        return L.uv(0.3 + x * 0.25, 0.5 + (y - HOME_H) * 0.5)
    for a, b in zip(xs, xs[1:]):
        ya, yb = L.top(a) - 0.01, L.top(b) - 0.01
        if ya >= top - 0.002 and yb >= top - 0.002:
            continue
        for side in (1, -1):
            pts = [(a, ya, side * t), (b, yb, side * t), (b, top, side * t), (a, top, side * t)]
            m.face(pts, [wood(p[0], p[1]) for p in pts], (0, 0, side))
        q = [(a, ya, -t), (b, yb, -t), (b, yb, t), (a, ya, t)]
        m.face(q, [wood(p[0], p[1]) for p in q], (0, -1, 0))
    return m.finish(collection)


def material():
    mat = bpy.data.materials.get('doors') or bpy.data.materials.new('doors')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'SEPARATE_COLOR'):
            nt.nodes.remove(n)
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    def tex(file, colour):
        img = bpy.data.images.load(os.path.join(BUILD, file), check_existing=True)
        img.reload()
        img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        return n
    c, nm, mr = tex('doors_c.png', True), tex('doors_n.png', False), tex('doors_m.png', False)
    nt.links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
    nmap = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(nm.outputs['Color'], nmap.inputs['Color'])
    nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(mr.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
    nt.links.new(sep.outputs[2], bsdf.inputs['Metallic'])
    return mat


def build():
    scene = bpy.data.scenes.get(SCENE)
    if scene:
        for o in list(scene.collection.objects):
            bpy.data.objects.remove(o)
    else:
        scene = bpy.data.scenes.new(SCENE)
    mat = material()
    objs = []
    for name, spec in SPEC.items():
        L = Leaf(spec)
        m = Mesher(name)
        body(m, L, True)
        iron(m, L)
        hardware(m, L)
        objs.append(m.finish(scene.collection))
        # And from across the town: the same leaf, with the relief left to its picture.
        far = Mesher(name + '_far')
        body(far, L, False)
        objs.append(far.finish(scene.collection))
    objs.append(head(scene.collection))
    for o in objs:
        o.data.materials.append(mat)
    return scene, objs


def export(scene, objs):
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    prev = win.scene
    win.scene = scene
    try:
        layer = bpy.context.view_layer
        layer.active_layer_collection = layer.layer_collection
        out = os.path.join(ROOT, 'assets', 'game', 'items', 'doors.glb')
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_active_scene=True, use_active_collection=True, export_image_format='WEBP', export_image_quality=82, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_apply=False, export_yup=True)
    finally:
        win.scene = prev
    print('doors.glb', round(os.path.getsize(out) / 1048576, 2), 'MB')


if __name__ == '__main__':
    scene, objs = build()
    for o in objs:
        print(o.name, len(o.data.polygons))
    export(scene, objs)
