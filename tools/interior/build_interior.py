"""The Cathedral of Tessariel and what's under it, authored in Blender and exported as assets/game/interior/interior.glb + interior.json.

Run through the Blender MCP:  exec(open(r"...\\tools\\interior\\build_interior.py").read()); build()

Who made it: Tessariel's order raised the cathedral over the old burial ground and stood on the graves. What happened since:
the priest in the back office kept a Velscour banner behind his door, and the stair he kept locked goes to the catacombs, where
the dead no longer lie still. x east, y up, z south, game coordinates. The nave runs east from a west front that catches the
low sun, so the village looks up at it from the green. One-way: nothing above ground overlaps what's below in plan, so a height
function stays a function of x and z.
"""
import json
import math
import os
import random

import bpy

ROOT = globals().get('ROOT_OVERRIDE') or os.environ.get('BM_ROOT') or r"C:\Users\agila\.codex\.chatgpt-projects\g-p-6acb04ed5a908191836d71a249b8135a\work\bm-cathedral"
OUT = os.path.join(ROOT, 'assets', 'game', 'interior')
MAN = json.load(open(os.path.join(OUT, 'manifest.json')))
TILE_M = {l['name']: l['metres'] for l in MAN['layers']}
PIECE = MAN['pieces']
R = random.Random(11)

F0 = 3.0            # the cathedral's floor. terrain.js levels the site just under it.
XW, XE, ZS = 66.0, 112.0, 13.0   # the hall's inside: west wall, east wall, half width
PIER_Z = 6.5
BAY = (XE - XW) / 5
SPRING, APEX = F0 + 11.0, F0 + 18.5
CHANCEL = F0 + 0.75
OFFICE_X = 124.0
Y_STAIR_TOP = CHANCEL
RISE, RUN = 0.25, 0.5


# ---- vectors ----
def sub(a, b): return (a[0] - b[0], a[1] - b[1], a[2] - b[2])
def add(a, b): return (a[0] + b[0], a[1] + b[1], a[2] + b[2])
def mul(a, s): return (a[0] * s, a[1] * s, a[2] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
def cross(a, b): return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
def unit(a):
    l = math.sqrt(dot(a, a)) or 1.0
    return (a[0] / l, a[1] / l, a[2] / l)
def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))


class World:
    def __init__(self):
        self.mats = {}
        self.zone = 'cath'
        self.colliders, self.floors, self.lights, self.glow, self.spawns = [], [], [], [], []

    def tri(self, mat, ps, uvs, ns=None):
        m = self.mats.setdefault((self.zone, mat), {'p': [], 'uv': [], 'n': []})
        face = cross(sub(ps[1], ps[0]), sub(ps[2], ps[0]))
        if ns is None:
            n = unit(face)
            ns = (n, n, n)
        elif dot(face, ns[0]) < 0:   # the winding follows the normal it was given
            ps = (ps[0], ps[2], ps[1]); uvs = (uvs[0], uvs[2], uvs[1]); ns = (ns[0], ns[2], ns[1])
        m['p'].extend(ps); m['uv'].extend(uvs); m['n'].extend(ns)

    def quad(self, mat, a, b, c, d, uvs=None, ns=None):
        uvs = uvs or ((0, 1), (1, 1), (1, 0), (0, 0))
        self.tri(mat, (a, b, c), (uvs[0], uvs[1], uvs[2]), None if ns is None else (ns[0], ns[1], ns[2]))
        self.tri(mat, (a, c, d), (uvs[0], uvs[2], uvs[3]), None if ns is None else (ns[0], ns[2], ns[3]))

    def collide(self, x0, z0, x1, z1, h=40.0):
        self.colliders.append({'x': round((x0 + x1) / 2, 3), 'z': round((z0 + z1) / 2, 3), 'hx': round(abs(x1 - x0) / 2, 3), 'hz': round(abs(z1 - z0) / 2, 3), 'yaw': 0.0, 'h': h})

    def floor(self, x0, z0, x1, z1, y, y2=None, axis='x'):
        """y at the low edge of the axis, y2 at its high edge."""
        self.floors.append({'x0': round(min(x0, x1), 3), 'z0': round(min(z0, z1), 3), 'x1': round(max(x0, x1), 3), 'z1': round(max(z0, z1), 3), 'y': round(y, 3), 'y2': round(y if y2 is None else y2, 3), 'axis': axis})

    def light(self, x, y, z, c, r, i, flicker=0.0):
        self.lights.append({'p': [round(x, 2), round(y, 2), round(z, 2)], 'c': list(c), 'r': r, 'i': i, 'flicker': flicker})

    def glowquad(self, a, b, c, d, layer, uv, tint):
        """An additive card. layer < 100 reads that atlas layer; 100 is a soft fade along v and across u."""
        u0, v0, u1, v1 = uv
        vs = [(a, (u0, v1)), (b, (u1, v1)), (c, (u1, v0)), (d, (u0, v0))]
        for k in (0, 1, 2, 0, 2, 3):
            p, t = vs[k]
            self.glow.extend([round(p[0], 3), round(p[1], 3), round(p[2], 3), round(t[0], 4), round(t[1], 4), tint[0], tint[1], tint[2], layer])


W = World()


# ---- shapes ----
def pointed(x, hw, h):
    """A two-centred arch: the height at x across half-width hw, rising h."""
    x = min(abs(x), hw)
    cx = (hw * hw - h * h) / (2 * hw)
    r = hw - cx
    return math.sqrt(max(r * r - (x - cx) ** 2, 0.0))


def norm_arch(d):
    return pointed(d, 1.0, 1.05) / 1.05


def wall(mat, a, b, y0, y1, openings=(), inward=None, tile=None, u_off=0.0):
    """A vertical face from a to b, (x, z). openings: dicts with t (metres along), w, lo(u), hi(u) in u -1..1. y0 and y1 are heights or functions of metres along."""
    tile = tile or TILE_M.get(mat, 3.0)
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    n = (-uz, 0.0, ux)
    if inward and (inward[0] - a[0]) * n[0] + (inward[1] - a[1]) * n[2] < 0:
        n = (-n[0], 0.0, -n[2])
    fy0 = y0 if callable(y0) else (lambda t: y0)
    fy1 = y1 if callable(y1) else (lambda t: y1)
    cuts = {0.0, L}
    for o in openings:
        for i in range(17):
            cuts.add(max(0.0, min(L, o['t'] + (i / 8 - 1) * o['w'] / 2)))
    if callable(y1) or callable(y0):
        for i in range(1, int(L / 2)):
            cuts.add(i * L / int(L / 2))
    cuts = sorted(cuts)

    def at(t, y): return (a[0] + ux * t, y, a[1] + uz * t)

    def piece(t0, t1, b0, b1, c0, c1):
        if c0 - b0 < 1e-3 and c1 - b1 < 1e-3:
            return
        W.quad(mat, at(t0, b0), at(t1, b1), at(t1, c1), at(t0, c0),
               (((t0 + u_off) / tile, -b0 / tile), ((t1 + u_off) / tile, -b1 / tile), ((t1 + u_off) / tile, -c1 / tile), ((t0 + u_off) / tile, -c0 / tile)), (n, n, n, n))
    for t0, t1 in zip(cuts, cuts[1:]):
        m = (t0 + t1) / 2
        here = sorted((o for o in openings if abs(m - o['t']) < o['w'] / 2), key=lambda o: o['lo'](0))
        b0, b1, c0, c1 = fy0(t0), fy0(t1), fy1(t0), fy1(t1)
        if not here:
            piece(t0, t1, b0, b1, c0, c1)
            continue
        for o in here:
            u0, u1 = (t0 - o['t']) / (o['w'] / 2), (t1 - o['t']) / (o['w'] / 2)
            piece(t0, t1, b0, b1, min(max(o['lo'](u0), b0), c0), min(max(o['lo'](u1), b1), c1))
            b0, b1 = max(min(o['hi'](u0), c0), b0), max(min(o['hi'](u1), c1), b1)
        piece(t0, t1, b0, b1, c0, c1)
    return n


def arch_op(t, w, sill, spring, apex):
    hw = w / 2

    def hi(u):
        return spring + pointed(u * hw, hw, apex - spring)
    return {'t': t, 'w': w, 'lo': lambda u: sill, 'hi': hi, 'sill': sill, 'spring': spring, 'apex': apex}


def round_op(t, cy, r):
    return {'t': t, 'w': 2 * r, 'lo': lambda u: cy - r * math.sqrt(max(1 - u * u, 0.0)), 'hi': lambda u: cy + r * math.sqrt(max(1 - u * u, 0.0)), 'cy': cy, 'r': r}


def tube(mat, pts, r, ref=(0.0, 1.0, 0.0), sides=6, tile=1.5, ry=None):
    """A moulding along a polyline, smooth round its section. ref is a direction its section keeps square to."""
    ry = ry or r
    rings = []
    for i, p in enumerate(pts):
        t = unit(sub(pts[min(i + 1, len(pts) - 1)], pts[max(i - 1, 0)]))
        s = cross(t, ref)
        if dot(s, s) < 1e-5:
            s = cross(t, (1.0, 0.0, 0.0))
        s = unit(s)
        u = unit(cross(s, t))
        ring = []
        for k in range(sides):
            a = k / sides * math.tau + math.pi / sides
            d = add(mul(s, math.cos(a)), mul(u, math.sin(a)))
            ring.append((add(p, add(mul(s, math.cos(a) * r), mul(u, math.sin(a) * ry))), d))
        rings.append(ring)
    v = 0.0
    for i in range(len(rings) - 1):
        seg = math.dist(pts[i], pts[i + 1])
        for k in range(sides):
            k2 = (k + 1) % sides
            A, B, C, D = rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]
            ar = math.tau * r / tile
            W.quad(mat, A[0], B[0], C[0], D[0], ((ar * k / sides, v / tile), (ar * (k + 1) / sides, v / tile), (ar * (k + 1) / sides, (v + seg) / tile), (ar * k / sides, (v + seg) / tile)), (A[1], B[1], C[1], D[1]))
        v += seg


def lathe(mat, x, z, prof, sides=12, tile=2.0, phase=0.0):
    """Round about a vertical axis through (x, z), prof being (radius, y) from the bottom up."""
    v = 0.0
    for (r0, y0), (r1, y1) in zip(prof, prof[1:]):
        seg = math.hypot(r1 - r0, y1 - y0)
        if seg < 1e-5:
            continue
        ny = (r0 - r1) / seg
        nr = (y1 - y0) / seg
        ar = max(1.0, round(math.tau * max(r0, r1) / tile))
        for k in range(sides):
            a0, a1 = phase + k / sides * math.tau, phase + (k + 1) / sides * math.tau
            c0, s0, c1, s1 = math.cos(a0), math.sin(a0), math.cos(a1), math.sin(a1)
            W.quad(mat, (x + c0 * r0, y0, z + s0 * r0), (x + c1 * r0, y0, z + s1 * r0), (x + c1 * r1, y1, z + s1 * r1), (x + c0 * r1, y1, z + s0 * r1),
                   ((k / sides * ar, v / tile), ((k + 1) / sides * ar, v / tile), ((k + 1) / sides * ar, (v + seg) / tile), (k / sides * ar, (v + seg) / tile)),
                   ((c0 * nr, ny, s0 * nr), (c1 * nr, ny, s1 * nr), (c1 * nr, ny, s1 * nr), (c0 * nr, ny, s0 * nr)))
        v += seg


def bx(mat, cx, cy, cz, hx, hy, hz, tile=None):
    """A box, its texture at world scale."""
    tile = tile or TILE_M.get(mat, 2.0)
    o = R.random()
    faces = [((1, 0, 0), (0, 0, -1), (0, 1, 0), hz, hy, hx), ((-1, 0, 0), (0, 0, 1), (0, 1, 0), hz, hy, hx),
             ((0, 0, 1), (1, 0, 0), (0, 1, 0), hx, hy, hz), ((0, 0, -1), (-1, 0, 0), (0, 1, 0), hx, hy, hz),
             ((0, 1, 0), (1, 0, 0), (0, 0, -1), hx, hz, hy), ((0, -1, 0), (1, 0, 0), (0, 0, 1), hx, hz, hy)]
    c0 = (cx, cy, cz)
    for n, u, v, hu, hv, hn in faces:
        c = add(c0, mul(n, hn))
        p = lambda su, sv: add(add(c, mul(u, su * hu)), mul(v, sv * hv))
        W.quad(mat, p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), ((o, o), (o + 2 * hu / tile, o), (o + 2 * hu / tile, o + 2 * hv / tile), (o, o + 2 * hv / tile)), (n, n, n, n))


def floor_rect(mat, x0, z0, x1, z1, y, tile=None, rot=False):
    tile = tile or TILE_M.get(mat, 3.0)
    n = (0.0, 1.0, 0.0)
    uv = (lambda x, z: (z / tile, x / tile)) if rot else (lambda x, z: (x / tile, z / tile))
    W.quad(mat, (x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0), (uv(x0, z0), uv(x0, z1), uv(x1, z1), uv(x1, z0)), (n, n, n, n))


def groin(mat, x0, x1, z0, z1, ys, ya, n=12, rib='marble', rib_r=0.2):
    """Two pointed barrels crossing: y = barrel(min(|u|, |v|)), so each side of the cell is an open arch. Ribs on the arrises, and round each cell."""
    cx, cz, hx, hz = (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2
    tile = TILE_M.get(mat, 3.0)

    def P(u, v):
        return (cx + u * hx, ys + (ya - ys) * norm_arch(min(abs(u), abs(v))), cz + v * hz)

    def N(u, v, along_u):
        e = 0.02
        if along_u:
            dy = (norm_arch(abs(u) + e) - norm_arch(max(abs(u) - e, 0))) / (2 * e) * (ya - ys) * math.copysign(1, u)
            return unit((dy / hx, -1.0, 0.0))
        dy = (norm_arch(abs(v) + e) - norm_arch(max(abs(v) - e, 0))) / (2 * e) * (ya - ys) * math.copysign(1, v)
        return unit((0.0, -1.0, dy / hz))

    def UV(p): return (p[0] / tile, p[2] / tile)

    for j in range(n):
        for i in range(n):
            u0, u1, v0, v1 = -1 + 2 * i / n, -1 + 2 * (i + 1) / n, -1 + 2 * j / n, -1 + 2 * (j + 1) / n
            same = (u0 + u1) * (v0 + v1) > 0
            tris = ((u0, v0), (u1, v0), (u1, v1)), ((u0, v0), (u1, v1), (u0, v1)) if same else None
            if not same:
                tris = ((u0, v0), (u1, v0), (u0, v1)), ((u1, v0), (u1, v1), (u0, v1))
            for t in tris:
                cu, cv = sum(a for a, _ in t) / 3, sum(b for _, b in t) / 3
                along_u = abs(cu) < abs(cv)
                ps = tuple(P(a, b) for a, b in t)
                W.tri(mat, ps, tuple(UV(p) for p in ps), tuple(N(a or 1e-3, b or 1e-3, along_u) for a, b in t))
    steps = 14
    for su, sv in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        tube(rib, [P(su * i / steps, sv * i / steps) for i in range(steps + 1)], rib_r, ref=unit((sv * hz, 0.0, -su * hx)))
    for e, ref in (((-1, None), (0, 0, 1)), ((1, None), (0, 0, 1)), ((None, -1), (1, 0, 0)), ((None, 1), (1, 0, 0))):
        pts = [P(e[0], -1 + 2 * i / steps) if e[1] is None else P(-1 + 2 * i / steps, e[1]) for i in range(steps + 1)]
        tube(rib, pts, rib_r * 1.25, ref=(1, 0, 0) if e[1] is None else (0, 0, 1))
    lathe('gold', cx, cz, [(0.0, ya - 0.34), (0.28, ya - 0.2), (0.34, ya - 0.05), (0.2, ya + 0.04)], 10)


def pier(x, z, ys):
    """A clustered pier: a core and four shafts, each a rib's way down to the floor."""
    lathe('wall_ashlar', x, z, [(1.05, F0), (1.05, F0 + 0.28), (0.86, F0 + 0.5), (0.72, F0 + 0.7), (0.72, ys - 0.7), (0.95, ys - 0.25), (1.08, ys)], 16)
    for a in range(4):
        ax, az = math.cos(a * math.pi / 2), math.sin(a * math.pi / 2)
        lathe('wall_ashlar', x + ax * 0.72, z + az * 0.72, [(0.3, F0 + 0.5), (0.2, F0 + 0.8), (0.2, ys - 0.5), (0.34, ys)], 8)
    W.collide(x - 1.0, z - 1.0, x + 1.0, z + 1.0)


def banner(piece, x, y_top, z, nx, nz, height, offset=0.08):
    """A cut-out hung on a wall, facing (nx, nz). Keeps its own proportions."""
    p = PIECE[piece]
    w = height * p['aspect']
    sx, sz = -nz, nx        # (on screen left to right for someone facing it)
    ox, oz = x + nx * offset, z + nz * offset
    u0, v0, u1, v1 = p['uv']
    n = (nx, 0.0, nz)
    W.quad(p['layer'], (ox - sx * w / 2, y_top - height, oz - sz * w / 2), (ox + sx * w / 2, y_top - height, oz + sz * w / 2),
           (ox + sx * w / 2, y_top, oz + sz * w / 2), (ox - sx * w / 2, y_top, oz - sz * w / 2), ((u0, v1), (u1, v1), (u1, v0), (u0, v0)), (n, n, n, n))


def flame(x, y, z, s=0.12):
    for dx, dz in ((1, 0), (0, 1)):
        W.tri('flame', ((x - dx * s, y, z - dz * s), (x + dx * s, y, z + dz * s), (x, y + s * 3.2, z)), ((0, 0), (1, 0), (0.5, 1)))


def wash(x, y, z, nx, nz, size, tint):
    """Firelight pooled on the wall behind a flame."""
    ox, oz = x + nx * 0.03, z + nz * 0.03
    sx, sz = -nz * size, nx * size
    W.glowquad((ox - sx, y - size, oz - sz), (ox + sx, y - size, oz + sz), (ox + sx, y + size, oz + sz), (ox - sx, y + size, oz - sz), 101, (0, 0, 1, 1), tint)


def torch(x, y, z, nx, nz, c=(1.0, 0.55, 0.22), i=16.0, r=13.0, out=0.9):
    bx('iron', x + nx * 0.08, y - 0.1, z + nz * 0.08, 0.05 + abs(nx) * 0.08, 0.05, 0.05 + abs(nz) * 0.08)
    lathe('iron', x + nx * 0.2, z + nz * 0.2, [(0.03, y - 0.42), (0.04, y - 0.1), (0.1, y), (0.11, y + 0.06)], 6)
    flame(x + nx * 0.2, y + 0.04, z + nz * 0.2, 0.09)
    wash(x, y + 0.3, z, nx, nz, 2.6, (0.11, 0.052, 0.02))
    W.light(x + nx * out, y + 0.25, z + nz * out, c, r, i, 1.0)


def candle_rack(x, z, y, n=7, spread=0.42):
    lathe('gold', x, z, [(0.34, y), (0.08, y + 0.1), (0.05, y + 0.95), (0.3, y + 1.02), (0.3, y + 1.06)], 8)
    for k in range(n):
        a = k / n * math.tau
        cx, cz = x + math.cos(a) * spread * 0.6, z + math.sin(a) * spread * 0.6
        lathe('wall_ashlar', cx, cz, [(0.028, y + 1.05), (0.028, y + 1.24 + (k % 3) * 0.05)], 5)
        flame(cx, y + 1.25 + (k % 3) * 0.05, cz, 0.035)
    W.collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 1.2)


# ---- the cathedral ----
def wall_op_trim(mat, a, b, op, inward, r=0.14):
    """A moulding round an opening on the wall a to b, proud of its face."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    if (inward[0] - a[0]) * nx + (inward[1] - a[1]) * nz < 0:
        nx, nz = -nx, -nz
    pts = []
    N = 24
    for i in range(N + 1):
        u = -1 + 2 * i / N
        t = op['t'] + u * op['w'] / 2
        pts.append((a[0] + ux * t + nx * 0.06, op['hi'](u), a[1] + uz * t + nz * 0.06))
    if 'cy' in op:
        lows = []
        for i in range(N + 1):
            u = 1 - 2 * i / N
            t = op['t'] + u * op['w'] / 2
            lows.append((a[0] + ux * t + nx * 0.06, op['lo'](u), a[1] + uz * t + nz * 0.06))
        pts += lows[1:]
    else:
        pts = [(pts[0][0], op['sill'], pts[0][2])] + pts + [(pts[-1][0], op['sill'], pts[-1][2])]
    tube(mat, pts, r, ref=(nx, 0.0, nz))


def reveal(mat, a, b, op, inward, depth, tile=2.0):
    """The thickness of the wall inside an opening."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    if (inward[0] - a[0]) * nx + (inward[1] - a[1]) * nz < 0:
        nx, nz = -nx, -nz
    N = 16

    def at(u, y, d):
        t = op['t'] + u * op['w'] / 2
        return (a[0] + ux * t - nx * d, y, a[1] + uz * t - nz * d)
    for i in range(N):
        u0, u1 = -1 + 2 * i / N, -1 + 2 * (i + 1) / N
        y0, y1 = op['hi'](u0), op['hi'](u1)
        W.quad(mat, at(u0, y0, 0), at(u1, y1, 0), at(u1, y1, depth), at(u0, y0, depth), ((u0, 0), (u1, 0), (u1, depth / tile), (u0, depth / tile)))
        if 'cy' in op or op.get('sill', F0) > F0 + 0.1:
            y0, y1 = op['lo'](u0), op['lo'](u1)
            W.quad(mat, at(u0, y0, 0), at(u1, y1, 0), at(u1, y1, depth), at(u0, y0, depth), ((u0, 0), (u1, 0), (u1, depth / tile), (u0, depth / tile)))
    if 'cy' not in op:
        for u in (-1, 1):
            W.quad(mat, at(u, op['sill'], 0), at(u, op['spring'], 0), at(u, op['spring'], depth), at(u, op['sill'], depth), ((0, 0), ((op['spring'] - op['sill']) / tile, 0), ((op['spring'] - op['sill']) / tile, depth / tile), (0, depth / tile)))


def glass_pane(piece, a, b, t, sill, h, depth, inward, sun=None):
    """One window in its opening, and if the sun's on it, its colours thrown across the floor."""
    p = PIECE[piece]
    w = h * p['aspect']
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    if (inward[0] - a[0]) * nx + (inward[1] - a[1]) * nz < 0:
        nx, nz = -nx, -nz
    cx, cz = a[0] + ux * t - nx * depth, a[1] + uz * t - nz * depth
    u0, v0, u1, v1 = p['uv']
    n = (nx, 0.0, nz)
    # (looked at from inside, the picture must read the right way round)
    sx, sz = nz, -nx
    A, B, C, D = (cx - sx * w / 2, sill, cz - sz * w / 2), (cx + sx * w / 2, sill, cz + sz * w / 2), (cx + sx * w / 2, sill + h, cz + sz * w / 2), (cx - sx * w / 2, sill + h, cz - sz * w / 2)
    W.quad(p['layer'], A, B, C, D, ((u0, v1), (u1, v1), (u1, v0), (u0, v0)), (n, n, n, n))
    if sun:
        idx = int(p['layer'].split('_')[1])
        def fall(q):
            k = (q[1] - F0 - 0.012) / sun[1]
            return (q[0] + sun[0] * k, F0 + 0.012, q[2] + sun[2] * k)
        fa, fb, fc, fd = fall(A), fall(B), fall(C), fall(D)
        W.glowquad(fa, fb, fc, fd, idx, p['uv'], (2.0, 1.9, 1.7))
        # The shaft itself, hardly there: dust in the light between glass and floor.
        for s0, s1 in ((0.0, 0.5), (0.5, 1.0)):
            mid0, mid1 = lerp(A, B, s0), lerp(A, B, s1)
            top0, top1 = lerp(D, C, s0), lerp(D, C, s1)
            W.glowquad(lerp(mid0, fall(top0), 0.92), lerp(mid1, fall(top1), 0.92), top1, top0, 100, (0, 0, 1, 1), (0.08, 0.068, 0.045))


def cathedral():
    W.zone = 'cath'
    inside = (90.0, 0.0)
    wall_top = F0 + 21.0
    # Floors: pale marble down the middle with a border, diamonds under the side aisles, and a carpet to the chancel.
    floor_rect('marble', XW, -PIER_Z, 101.0, PIER_Z, F0)
    floor_rect('floor_diamond', XW, -ZS, 101.0, -PIER_Z, F0)
    floor_rect('floor_diamond', XW, PIER_Z, 101.0, ZS, F0)
    floor_rect('carpet', XW, -1.8, 101.0, 1.8, F0 + 0.012, tile=3.6, rot=True)
    W.floor(XW - 0.5, -ZS, 101.0, ZS, F0)
    # The chancel: three steps up and a floor of chevrons, under its own rail.
    for k in range(3):
        y = F0 + (k + 1) * 0.25
        x = 101.0 + k * 0.5
        bx('wall_ashlar', x + 0.25, y - 0.125, 0.0, 0.25, 0.125, ZS, 2.0)
    W.floor(101.0, -ZS, 102.5, ZS, F0, CHANCEL)
    floor_rect('wood_a3', 102.5, -ZS, XE, ZS, CHANCEL, tile=1.3)
    floor_rect('carpet', XE - 8.0, -3.2, XE - 0.2, 3.2, CHANCEL + 0.012, tile=3.2, rot=True)
    W.floor(102.5, -ZS, XE + 0.95, ZS, CHANCEL)
    # Walls: the side walls carry the windows, the arcade running under them.
    panes = ['glass_a_1', 'glass_b_1', 'glass_e_1']   # Velscour's, every one: see README, The two sides
    sun = (0.78, 0.5, 0.38)
    glass_h = 12.8
    sill = F0 + 2.9
    for side, k in ((1, 0), (-1, 1)):
        z = side * ZS
        a, b = (XW, z), (XE, z)
        ops = []
        for i in range(5):
            t = (i + 0.5) * BAY
            ops.append(arch_op(t, 5.25, sill + 0.12, sill + 8.6, sill + 12.4))
        wall('arcade', a, b, F0, sill, inward=inside, tile=2.9)
        wall('wall_ashlar', a, b, sill, wall_top, ops, inward=inside)
        tube('wall_ashlar', [(XW, sill, z - side * 0.08), (XE, sill, z - side * 0.08)], 0.14, ref=(0, 0, 1))
        wall('wall_rough', (XW - 1, z + side), (XE + 1, z + side), F0 - 1.0, wall_top, ops, inward=(90.0, z))
        for i, o in enumerate(ops):
            reveal('wall_ashlar', a, b, o, inside, 1.0)
            wall_op_trim('wall_ashlar', a, b, o, inside, 0.16)
            glass_pane(panes[(i + k) % 3], a, b, o['t'], sill, glass_h, 0.55, inside, sun if side > 0 else None)
            # (A window throws its colour even where the sun isn't on it.)
            col = (1.0, 0.25, 0.2)
            W.light(XW + o['t'], F0 + 6.0, z - side * 2.5, col, 15.0, 9.0 if k == 0 else 5.0)
        W.collide(XW - 1, z, XE + 1, z + side)
    # The west front: great door and the rose above it.
    a, b = (XW, -ZS), (XW, ZS)
    door = arch_op(ZS, 4.6, F0, F0 + 4.8, F0 + 7.6)
    rose = round_op(ZS, F0 + 13.2, 5.3)
    ops = [door, rose]
    wall('wall_ashlar', a, b, F0, wall_top, ops, inward=inside)
    # Out in front the wall runs up into the gable.
    gable = lambda t: wall_top + (1 - abs(t - 15.0) / 15.0) * 11.0
    wall('wall_rough', (XW - 1, -15.0), (XW - 1, 15.0), F0 - 1.0, gable, [arch_op(15.0, 4.6, F0, F0 + 4.8, F0 + 7.6), round_op(15.0, F0 + 13.2, 5.3)], inward=(XW + 5, 0.0))
    for z0, z1 in ((-ZS - 1, -2.2), (2.2, ZS + 1)):
        W.collide(XW - 1, z0, XW, z1)
    reveal('wall_ashlar', a, b, door, inside, 1.0)
    reveal('wall_ashlar', a, b, rose, inside, 1.0)
    wall_op_trim('wall_ashlar', a, b, rose, inside, 0.24)
    wall_op_trim('wall_ashlar', a, b, door, inside, 0.2)
    outer = ((XW - 1, -ZS), (XW - 1, ZS))
    for k, (dw, r) in enumerate(((0.0, 0.26), (0.45, 0.2), (0.9, 0.16))):
        o = arch_op(ZS, door['w'] + dw * 2, F0, F0 + 4.8, F0 + 7.6 + dw * 0.9)
        wall_op_trim('wall_ashlar', outer[0], outer[1], o, (XW, 0.0), r)
    wall_op_trim('wall_ashlar', outer[0], outer[1], rose, (XW, 0.0), 0.34)
    p = PIECE['rose_0']
    u0, v0, u1, v1 = p['uv']
    rs = 5.45
    n = (1.0, 0.0, 0.0)
    W.quad(p['layer'], (XW - 0.55, rose['cy'] - rs, rs), (XW - 0.55, rose['cy'] - rs, -rs), (XW - 0.55, rose['cy'] + rs, -rs), (XW - 0.55, rose['cy'] + rs, rs), ((u0, v1), (u1, v1), (u1, v0), (u0, v0)), (n, n, n, n))
    W.light(XW + 4.0, rose['cy'], 0.0, (1.0, 0.28, 0.2), 20.0, 18.0)
    # The rose's throw down the carpet, in the low sun.
    k = 1.0 / sun[1]
    def fall(x, y, z):
        d = (y - F0 - 0.02) * k
        return (x + sun[0] * d, F0 + 0.02, z - sun[2] * d)
    idx = int(p['layer'].split('_')[1])
    W.glowquad(fall(XW - 0.55, rose['cy'] - rs, rs), fall(XW - 0.55, rose['cy'] - rs, -rs), fall(XW - 0.55, rose['cy'] + rs, -rs), fall(XW - 0.55, rose['cy'] + rs, rs), idx, p['uv'], (1.5, 1.2, 1.1))
    # Doors, stood open, inward.
    for s in (-1, 1):
        hinge = (XW, F0, s * 2.3)
        tip = (XW + 2.2, F0, s * 2.3)
        hw = 2.2
        n = (0.0, 0.0, 1.0)
        W.quad('wood_b0', hinge, tip, (tip[0], F0 + 6.0, tip[2]), (hinge[0], F0 + 6.8, hinge[2]), ((0, 3), (1, 3), (1, 0), (0, 0)), (n, n, n, n))
        for yb in (1.0, 3.2, 5.2):
            bx('iron', XW + 1.0, F0 + yb, s * 2.3, 0.95, 0.09, 0.05)
        W.collide(XW, s * 2.2, XW + 2.2, s * 2.45, 7.0)
    for s in (-1, 1):
        candle_rack(XW + 2.6, s * 3.6, F0)
        torch(XW - 1.5, F0 + 3.3, s * 3.6, -1.0, 0.0, i=10.0, r=9.0)
    W.light(XW + 3.0, F0 + 2.4, 0.0, (1.0, 0.68, 0.36), 11.0, 12.0, 0.4)
    # Vault: three aisles of five bays, on piers.
    for i in range(5):
        x0 = XW + i * BAY
        groin('wall_ashlar', x0, x0 + BAY, -PIER_Z, PIER_Z, SPRING, APEX)
        ya = SPRING + 4.6
        groin('wall_ashlar', x0, x0 + BAY, -ZS, -PIER_Z, SPRING, ya)
        groin('wall_ashlar', x0, x0 + BAY, PIER_Z, ZS, SPRING, ya)
        # Spandrels: what's left between the low aisle vault and the high nave one.
        for z in (-PIER_Z, PIER_Z):
            N = 12
            for j in range(N):
                u0, u1 = -1 + 2 * j / N, -1 + 2 * (j + 1) / N
                y0, y1 = SPRING + (ya - SPRING) * norm_arch(abs(u0)), SPRING + (ya - SPRING) * norm_arch(abs(u1))
                t0, t1 = SPRING + (APEX - SPRING) * norm_arch(abs(u0)), SPRING + (APEX - SPRING) * norm_arch(abs(u1))
                xa, xb = x0 + BAY / 2 + u0 * BAY / 2, x0 + BAY / 2 + u1 * BAY / 2
                W.quad('wall_ashlar', (xa, y0, z), (xb, y1, z), (xb, t1, z), (xa, t0, z), ((xa / 3, y0 / 3), (xb / 3, y1 / 3), (xb / 3, t1 / 3), (xa / 3, t0 / 3)))
        if i:
            pier(x0, -PIER_Z, SPRING)
            pier(x0, PIER_Z, SPRING)
    for i in range(5):
        W.light(XW + (i + 0.5) * BAY, SPRING + 1.5, 0.0, (1.0, 0.82, 0.6), 17.0, 16.0)
    # The chancel's piers stand clear of the back wall; half piers carry the end of each row.
    for x in (XW, XE):
        for z in (-PIER_Z, PIER_Z):
            s = 1 if x == XW else -1
            lathe('wall_ashlar', x + s * 0.2, z, [(0.6, F0), (0.5, F0 + 0.5), (0.42, F0 + 0.7), (0.42, SPRING - 0.6), (0.6, SPRING)], 10)
    # Banners of Tessariel on the piers, facing the nave.
    names = ['vel_a_0', 'vel_d_0', 'vel_c_0', 'vel_a_0', 'vel_d_0', 'vel_c_0', 'vel_a_0', 'vel_d_0']
    k = 0
    for i in (1, 2, 3, 4):
        x = XW + i * BAY
        for s in (-1, 1):
            banner(names[k], x, F0 + 10.2, s * (PIER_Z - 0.95), 0.0, -s, 5.0, 0.0)
            k += 1
    # The pews, facing east; every row's ends in the burr.
    for s in (-1, 1):
        for r in range(13):
            x = 73.0 + r * 2.15
            z0, z1 = s * 2.3, s * 5.6
            zc, hz = (z0 + z1) / 2, abs(z1 - z0) / 2
            bx('wood_a0', x, F0 + 0.46, zc, 0.24, 0.035, hz)        # seat
            bx('wood_b1', x - 0.24, F0 + 0.72, zc, 0.03, 0.34, hz)    # back
            bx('wood_c1', x + 0.36, F0 + 0.28, zc, 0.03, 0.28, hz)    # kneeler front
            bx('gold', x - 0.24, F0 + 1.07, zc, 0.04, 0.014, hz)      # rail
            for zz in (z0, z1):
                bx('wood_a1', x + 0.06, F0 + 0.52, zz, 0.36, 0.52, 0.045)
            W.collide(x - 0.33, min(z0, z1), x + 0.43, max(z0, z1), 1.05)
    # The pulpit, in front of the door it hides: a burr drum on a stem, its stair behind it.
    px, pz = XE - 4.5, 0.0
    y = CHANCEL
    lathe('wood_b2', px, pz, [(0.6, y), (0.3, y + 0.25), (0.26, y + 1.0), (0.9, y + 1.5), (0.95, y + 2.5), (1.05, y + 2.62), (0.0, y + 2.62)], 10, tile=2.0, phase=0.1)
    lathe('gold', px, pz, [(0.97, y + 1.5), (0.99, y + 1.56)], 10)
    lathe('gold', px, pz, [(1.07, y + 2.55), (1.08, y + 2.64)], 10)
    bx('wood_c2', px + 0.15, y + 2.72, pz, 0.32, 0.03, 0.42)    # the book rest
    bx('wood_a3', px - 0.68, y + 2.66, pz, 0.05, 0.14, 0.34)
    W.collide(px - 1.0, pz - 1.0, px + 1.0, pz + 1.0, 3.0)
    lathe('wood_b2', px - 0.7, pz, [(0.0, y + 5.2), (1.5, y + 5.05), (1.6, y + 4.85), (0.0, y + 4.85)], 10, phase=0.1)
    lathe('gold', px - 0.7, pz, [(0.3, y + 5.15), (0.05, y + 5.9), (0.0, y + 6.0)], 8)
    bx('wood_c2', px - 1.45, y + 2.5, pz, 0.08, 2.5, 0.28)
    for s in (-1, 1):
        torch(XE, CHANCEL + 2.5, s * 1.9, -1.0, 0.0, i=14.0, r=9.0)
    W.light(XE - 0.8, CHANCEL + 2.4, 0.0, (1.0, 0.72, 0.42), 7.0, 10.0, 0.3)
    for s in (-1, 1):
        bx('wood_b3', px + 1.6, y + 0.95, s * 1.15, 0.5, 0.95, 0.06)  # the stair rail, with chevrons
    # Candle stands either side, the rail in front of them, and the great banners on the wall.
    for s in (-1, 1):
        for zz in (4.5, 8.5, 11.5):
            candle_rack(XE - 3.2, s * zz, CHANCEL)
        W.light(XE - 3.0, CHANCEL + 2.0, s * 7.5, (1.0, 0.68, 0.36), 13.0, 22.0, 0.5)
        banner('vel_a_0' if s < 0 else 'vel_d_0', XE - 0.3, CHANCEL + 16.0, s * 8.0, -1.0, 0.0, 12.5, 0.0)
    W.light(XE - 7.0, F0 + 7.0, 0.0, (1.0, 0.75, 0.48), 20.0, 26.0, 0.25)
    # Pedestals of light along the nave, so the middle isn't only window.
    for i in (1, 3):
        for s in (-1, 1):
            W.light(XW + i * BAY + 2.0, F0 + 3.0, s * 7.0, (1.0, 0.62, 0.3), 12.0, 10.0, 0.5)
            candle_rack(XW + i * BAY + 2.0, s * 7.8, F0, 5)
    # The back wall, with the plain door behind the pulpit.
    a, b = (XE, -ZS), (XE, ZS)
    door2 = arch_op(ZS, 2.2, CHANCEL, CHANCEL + 2.4, CHANCEL + 3.4)
    wall('tracery', a, b, CHANCEL, CHANCEL + 3.4, [door2], inward=inside, tile=3.4)
    wall('wall_ashlar', a, b, CHANCEL + 3.4, wall_top, inward=inside)
    for z0, z1 in ((-ZS, -1.1), (1.1, ZS)):
        W.collide(XE, z0, XE + 1, z1)
    wall('wall_rough', (XE + 1, -ZS - 1), (XE + 1, ZS + 1), F0 - 1.0, wall_top, [arch_op(ZS + 1, 2.2, CHANCEL, CHANCEL + 2.4, CHANCEL + 3.4)], inward=(XE + 3, 0.0))
    reveal('wall_ashlar', a, b, door2, inside, 0.95)
    wall_op_trim('wood_c0', a, b, door2, inside, 0.09)
    # Outside: buttresses, and the roof.
    for i in range(6):
        x = XW + i * BAY
        for s in (-1, 1):
            z = s * (ZS + 1)
            bx('wall_rough', x, F0 + 7.0, z + s * 1.0, 0.8, 8.0, 1.0)
            bx('wall_rough', x, F0 + 17.0, z + s * 0.55, 0.65, 2.0, 0.55)
            W.collide(x - 0.8, z, x + 0.8, z + s * 2.0, 30.0)
            for yy in (F0 + 15.0,):
                W.quad('roof', (x - 0.8, yy, z + s * 2.0), (x + 0.8, yy, z + s * 2.0), (x + 0.8, yy + 2.0, z + s * 1.1), (x - 0.8, yy + 2.0, z + s * 1.1), ((0, 1), (0.4, 1), (0.4, 0), (0, 0)))
    ridge = wall_top + 11.0
    for s in (-1, 1):
        ze = s * (ZS + 2.0)
        W.quad('roof', (XW - 1.4, wall_top - 0.9, ze), (XE + 1.4, wall_top - 0.9, ze), (XE + 1.4, ridge, 0.0), (XW - 1.4, ridge, 0.0),
               ((0, 4), (13, 4), (13, 0), (0, 0)))
    wall('wall_rough', (XE + 1, -15.0), (XE + 1, 15.0), wall_top, gable, inward=(XE + 6, 0.0))
    # Two towers either side of the west front, each with its spire, and a porch of steps up to the door.
    for s in (-1, 1):
        tz = s * 18.5
        bx('wall_rough', XW - 2.5, F0 + 14.0, tz, 5.0, 15.0, 4.5, 3.6)
        W.collide(XW - 7.5, tz - 4.5, XW + 2.5, tz + 4.5)
        bx('wall_rough', XW - 2.5, F0 + 33.0, tz, 3.9, 4.0, 3.5, 3.6)
        for fx, fz in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            cx, cz = XW - 2.5 + fx * 3.92, tz + fz * 3.52
            o = arch_op(0.0, 1.8, F0 + 30.5, F0 + 33.5, F0 + 35.5)
            sx, sz = abs(fz), abs(fx)
            bx('iron', cx, F0 + 32.5, cz, 0.9 * sx + 0.02, 2.2, 0.9 * sz + 0.02)
        lathe('roof', XW - 2.5, tz, [(5.0, F0 + 37.0), (4.4, F0 + 37.2), (0.14, F0 + 57.0), (0.0, F0 + 57.3)], 8, tile=5.0, phase=math.pi / 8)
        lathe('gold', XW - 2.5, tz, [(0.11, F0 + 57.0), (0.05, F0 + 59.0), (0.0, F0 + 59.2)], 6)
    for k in range(4):
        top = F0 - 0.8 + (k + 1) * 0.2
        bx('floor_diamond', XW - 5.6 + k * 0.7 + (4 - k) * 0.35 + 2.1 - k * 0.35 - 2.1, top - 0.5, 0.0, 0.35 + (3 - k) * 0.35 + 2.0, 0.5, 5.2 - k * 0.25, 2.0)
    W.floor(XW - 5.6, -5.0, XW - 2.8, 5.0, F0 - 0.8, F0)
    W.floor(XW - 2.8, -5.0, XW - 0.5, 5.0, F0)
    # A dark plinth: stone stays wet and sooty where it meets the ground.
    bx('cata_wall', XW - 1.25, F0 + 0.55, -8.0, 0.2, 1.75, 6.0, 3.0)
    bx('cata_wall', XW - 1.25, F0 + 0.55, 8.0, 0.2, 1.75, 6.0, 3.0)
    for s in (-1, 1):
        bx('cata_wall', XW - 2.5, F0 + 0.75, s * 18.5, 5.15, 2.0, 4.65, 3.0)
    # Courses and pinnacles: what stops a stone front being one flat sheet.
    for yy in (F0 + 8.6, F0 + 17.2):
        tube('wall_ashlar', [(XW - 1.12, yy, -14.0), (XW - 1.12, yy, 14.0)], 0.2, ref=(1, 0, 0))
    for s in (-1, 1):
        for yy in (F0 + 9.0, F0 + 20.0, F0 + 29.0):
            for sign in (-1, 1):
                x, z = XW - 2.5 + sign * 5.05, s * 18.5
                tube('wall_ashlar', [(x, yy, z - 4.5), (x, yy, z + 4.5)], 0.18, ref=(1, 0, 0))
                x, z = XW - 2.5, s * 18.5 + sign * 4.55
                tube('wall_ashlar', [(x - 5, yy, z), (x + 5, yy, z)], 0.18, ref=(0, 0, 1))
        # A tall lancet of dark louvre up each tower's front.
        x = XW - 7.55
        wall('tracery', (x, s * 18.5 - 3.2), (x, s * 18.5 + 3.2), F0 + 21.0, F0 + 24.4, inward=(XW - 20, s * 18.5), tile=3.4)
        wall('tracery', (x, s * 18.5 - 3.2), (x, s * 18.5 + 3.2), F0 + 11.0, F0 + 14.4, inward=(XW - 20, s * 18.5), tile=3.4)
    wall('tracery', (XW - 1.1, -6.0), (XW - 1.1, 6.0), F0 + 21.5, F0 + 24.9, inward=(XW - 20, 0.0), tile=3.4)
    lathe('gold', XW - 1.1, 0.0, [(0.16, wall_top + 11.0), (0.06, wall_top + 12.6), (0.0, wall_top + 12.8)], 6)
    for i in range(6):
        for s in (-1, 1):
            x, z = XW + i * BAY, s * (ZS + 1 + 1.0)
            lathe('wall_rough', x, z, [(0.55, F0 + 19.0), (0.4, F0 + 19.3), (0.06, F0 + 22.5), (0.0, F0 + 22.7)], 8)
    for s in (-1, 1):
        W.collide(XW - 5.0, s * 5.0, XW - 1.0, s * 5.3, 0.7)


def office():
    """The priest's room: wood to shoulder height, cloth above, one lamp, and on the wall by the far door, what he really serves."""
    W.zone = 'cath'
    x0, x1, hz = XE + 0.95, OFFICE_X, 6.0
    y, top = CHANCEL, CHANCEL + 5.0
    inside = ((x0 + x1) / 2, 0.0)
    floor_rect('wood_c3', x0, -hz, x1, hz, y, tile=1.5)
    W.floor(x0, -hz, x1, hz, y)
    d_w = arch_op(hz, 2.2, y, y + 2.4, y + 3.4)
    d_e = arch_op(hz, 2.2, y, y + 2.4, y + 3.4)
    for a, b, ops in (((x0, -hz), (x0, hz), [d_w]), ((x1, -hz), (x1, hz), [d_e]), ((x0, -hz), (x1, -hz), []), ((x0, hz), (x1, hz), [])):
        wall('wood_b1', a, b, y, y + 2.3, ops, inward=inside, tile=2.2)
        wall('wall_ashlar', a, b, y + 2.3, top, ops, inward=inside)
        tube('wood_c0', [(a[0], y + 2.3, a[1]), (b[0], y + 2.3, b[1])], 0.05, ref=(0, 1, 0))
    for a, b, o in (((x0, -hz), (x0, hz), d_w), ((x1, -hz), (x1, hz), d_e)):
        wall_op_trim('wood_c0', a, b, o, inside, 0.09)
    reveal('wall_ashlar', (x1, -hz), (x1, hz), d_e, inside, 0.6)
    # A beamed ceiling.
    n = (0.0, -1.0, 0.0)
    W.quad('wood_a2', (x0, top, -hz), (x1, top, -hz), (x1, top, hz), (x0, top, hz), ((0, 0), (4, 0), (4, 4), (0, 4)), (n, n, n, n))
    x = x0 + 1.5
    while x < x1:
        bx('wood_c2', x, top - 0.15, 0.0, 0.14, 0.15, hz)
        x += 2.4
    W.collide(x0, -hz - 1, x1, -hz)
    W.collide(x0, hz, x1, hz + 1)
    for z0, z1 in ((-hz, -1.1), (1.1, hz)):
        W.collide(x1, z0, x1 + 0.6, z1)
    # The desk, its chair, a shelf of books on each side, and a rug.
    dx, dz = x0 + 5.0, -2.4
    bx('wood_c2', dx, y + 0.8, dz, 1.0, 0.04, 0.55)
    for sx in (-1, 1):
        bx('wood_a1', dx + sx * 0.8, y + 0.38, dz, 0.2, 0.38, 0.5)
    bx('wood_a0', dx - 1.1, y + 0.46, dz, 0.24, 0.03, 0.24)
    bx('wood_a0', dx - 1.33, y + 0.8, dz, 0.03, 0.38, 0.24)
    W.collide(dx - 1.05, dz - 0.6, dx + 1.05, dz + 0.6, 0.95)
    lathe('gold', dx + 0.5, dz + 0.1, [(0.1, y + 0.84), (0.02, y + 0.95), (0.02, y + 1.15), (0.09, y + 1.2), (0.09, y + 1.45), (0.02, y + 1.5)], 6)
    flame(dx + 0.5, y + 1.25, dz + 0.1, 0.03)
    W.light(dx + 0.5, y + 1.6, dz + 0.1, (1.0, 0.68, 0.34), 11.0, 18.0, 0.3)
    W.light(x0 + 2.0, y + 3.8, 2.0, (1.0, 0.6, 0.3), 14.0, 20.0, 0.2)
    W.light(x1 - 2.0, y + 3.6, 0.0, (1.0, 0.64, 0.36), 13.0, 18.0, 0.2)
    floor_rect('carpet', dx - 2.2, dz - 1.2, dx + 1.6, dz + 1.2, y + 0.012, tile=2.4)
    rng = random.Random(3)
    for sz in (-1, 1):
        zw = sz * (hz - 0.25)
        bx('wood_b0', x0 + 2.3, y + 1.45, zw, 1.6, 1.45, 0.25)
        W.collide(x0 + 0.7, zw - 0.28, x0 + 3.9, zw + 0.28, 3.0)
        for shelf in range(4):
            yy = y + 0.25 + shelf * 0.68
            x = x0 + 0.85
            while x < x0 + 3.75:
                w = rng.uniform(0.04, 0.09)
                h = rng.uniform(0.2, 0.3)
                bx(rng.choice(['cloth_red', 'wood_c1', 'carpet', 'wood_b2']), x, yy + h, zw - sz * 0.27, w, h, 0.12, 1.5)
                x += w * 2.3
    banner('vel_d_1', x1, y + 4.6, 3.8, -1.0, 0.0, 4.0, 0.03)


# ---- below ----
def stair(a_x, b_x, y0, width, mats):
    """A flight going east, its treads real, its floor a slope the feet ride."""
    n = max(1, int(round((y0 - mats['y1']) / RISE)))
    run = (b_x - a_x) / n
    hw = width / 2
    for i in range(n):
        y = y0 - (i + 1) * RISE
        x = a_x + i * run
        tile = TILE_M[mats['floor']]
        floor_rect(mats['floor'], x, -hw, x + run, hw, y, tile)
        wN = (-1.0, 0.0, 0.0)
        W.quad(mats['floor'], (x, y, -hw), (x, y, hw), (x, y + RISE, hw), (x, y + RISE, -hw), ((0, 0), (width / tile, 0), (width / tile, RISE / tile), (0, RISE / tile)), (wN, wN, wN, wN))
    W.floor(a_x, -hw, b_x, hw, y0, mats['y1'])


def run_corridor(a, b, w, ya, yb, spring, apex, wall_mat, floor_mat, roof_mat, dado=None, ribs=4.0, ops_l=(), ops_r=(), tile_floor=None, stairs=False, bay=None, trim=None):
    """An axis-aligned passage from a to b, its floor from ya to yb: straight walls, a pointed barrel, ribs. ops are openings in its left and right walls.
    wall_mat, dado and floor_mat can each be several, turn about, every bay metres, so a long wall isn't one sheet. trim is what its plinths and kerbs are made of."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    hw = w / 2
    fy = lambda t: ya + (yb - ya) * t / L

    def P(t, s, y):   # t along, s across (-1..1), y height above
        return (a[0] + ux * t + nx * s * hw, y, a[1] + uz * t + nz * s * hw)
    for s, ops in ((-1, ops_l), (1, ops_r)):
        p0 = (a[0] + nx * s * hw, a[1] + nz * s * hw)
        p1 = (b[0] + nx * s * hw, b[1] + nz * s * hw)
        inward = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        nb = max(1, int(round(L / bay))) if bay else 1
        for k in range(nb):
            t0, t1 = k * L / nb, (k + 1) * L / nb
            q0 = (p0[0] + ux * t0, p0[1] + uz * t0)
            q1 = (p0[0] + ux * t1, p0[1] + uz * t1)
            here = [dict(o, t=o['t'] - t0) for o in ops if o['t'] + o['w'] / 2 > t0 and o['t'] - o['w'] / 2 < t1]
            f0 = (lambda t0: lambda t: fy(t + t0))(t0)
            wm = seq(wall_mat)[k % len(seq(wall_mat))]
            if dado:
                dm = seq(dado)[k % len(seq(dado))]
                wall(dm, q0, q1, lambda t: f0(t) - 0.6, lambda t: f0(t) + 2.6, here, inward=inward, u_off=t0)
                wall(wm, q0, q1, lambda t: f0(t) + 2.6, lambda t: f0(t) + spring + 0.02, here, inward=inward, u_off=t0)
            else:
                wall(wm, q0, q1, lambda t: f0(t) - 0.6, lambda t: f0(t) + spring + 0.02, here, inward=inward, u_off=t0)
        if trim:
            if ya == yb:
                skirt(trim, p0, p1, ya, ops, inward, course=(ya + 2.6) if dado else None)
            else:
                for t0, t1 in clear_runs(L, ops):
                    q0, q1 = P(t0, s * 0.965, fy(t0) + 0.16), P(t1, s * 0.965, fy(t1) + 0.16)
                    tube(trim, [q0, q1], 0.15, ref=(0.0, 1.0, 0.0), ry=0.2)
        for o in ops:
            if o.get('blocked'):
                continue
            wall_op_trim(trim or seq(wall_mat)[0], p0, p1, o, inward, 0.12)
        if trim and bay:   # a buttress at each seam, unless a door's there
            for k in range(1, nb):
                t = k * L / nb
                if all(abs(t - o['t']) > o['w'] / 2 + 0.5 for o in ops) and bay < 7.0:
                    c = P(t, s * (hw - 0.14) / hw, fy(t) + spring / 2 - 0.3)
                    obox(trim, c, (ux, 0.0, uz), (nx * s, 0.0, nz * s), 0.34, spring / 2 + 0.3, 0.15, 2.2)
        if trim:   # a cornice where the vault springs
            for t0, t1 in clear_runs(L, [o for o in ops if o['apex'] > spring]):
                q0, q1 = P(t0, s * 0.985, fy(t0) + spring), P(t1, s * 0.985, fy(t1) + spring)
                tube(trim, [q0, q1], 0.16, ref=(0.0, 1.0, 0.0), ry=0.11)
        gaps = sorted((o['t'] - o['w'] / 2, o['t'] + o['w'] / 2) for o in ops if not o.get('blocked'))
        t0 = 0.0
        for g0, g1 in gaps + [(L, L)]:
            if g0 > t0:
                q0, q1 = P(t0, s, 0), P(g0, s, 0)
                q2 = (q1[0] + nx * s, q1[2] + nz * s)
                W.collide(q0[0], q0[2], q2[0], q2[1])
            t0 = g1
    # The barrel.
    N = 12
    tile = TILE_M[roof_mat]
    rib_m = seq(wall_mat)[0] if not trim else trim
    seg = max(1, int(L / 2))
    for i in range(seg):
        t0, t1 = i * L / seg, (i + 1) * L / seg
        for k in range(N):
            s0, s1 = -1 + 2 * k / N, -1 + 2 * (k + 1) / N
            y0, y1 = pointed(s0 * hw, hw, apex - spring), pointed(s1 * hw, hw, apex - spring)
            A, B = P(t0, s0, fy(t0) + spring + y0), P(t0, s1, fy(t0) + spring + y1)
            C, D = P(t1, s1, fy(t1) + spring + y1), P(t1, s0, fy(t1) + spring + y0)
            W.quad(roof_mat, A, B, C, D, ((t0 / tile, s0 * hw / tile), (t0 / tile, s1 * hw / tile), (t1 / tile, s1 * hw / tile), (t1 / tile, s0 * hw / tile)),
                   ((-nx * s0, -1.0, -nz * s0), (-nx * s1, -1.0, -nz * s1), (-nx * s1, -1.0, -nz * s1), (-nx * s0, -1.0, -nz * s0)))
    if ribs:
        n = max(1, int(L / ribs))
        for i in range(n + 1):
            t = i * L / n
            pts = [P(t, -1 + 2 * k / 14, fy(t) + spring + pointed((-1 + 2 * k / 14) * hw, hw, apex - spring)) for k in range(15)]
            tube(rib_m, pts, 0.14, ref=(ux, 0.0, uz))
            if trim and w >= 4.5 and ya == yb:
                cr = P(t, 0, fy(t) + spring + pointed(0, hw, apex - spring))
                lathe(rib_m, cr[0], cr[2], [(0.0, cr[1] - 0.22), (0.2, cr[1] - 0.16), (0.3, cr[1] - 0.05), (0.2, cr[1] + 0.06)], 8)
            for s in (-1, 1):
                q = P(t, s, 0)
                tube(rib_m, [(q[0] - nx * s * 0.02, fy(t), q[2] - nz * s * 0.02), (q[0] - nx * s * 0.02, fy(t) + spring, q[2] - nz * s * 0.02)], 0.13, ref=(ux, 0.0, uz))
    # The floor.
    if ya == yb:
        x0, x1 = min(a[0] - nx * hw, b[0] + nx * hw, a[0] + nx * hw), max(a[0] - nx * hw, b[0] + nx * hw, a[0] + nx * hw, b[0] - nx * hw)
        z0, z1 = min(a[1] - nz * hw, b[1] + nz * hw, a[1] + nz * hw), max(a[1] - nz * hw, b[1] + nz * hw, a[1] + nz * hw, b[1] - nz * hw)
        nb = max(1, int(round(L / bay))) if bay else 1
        for k in range(nb):
            t0, t1 = k * L / nb, (k + 1) * L / nb
            fm = seq(floor_mat)[k % len(seq(floor_mat))]
            A, C = P(t0, -1, ya), P(t1, 1, ya)
            floor_rect(fm, min(A[0], C[0]), min(A[2], C[2]), max(A[0], C[0]), max(A[2], C[2]), ya)
            if trim and k:
                q0, q1 = P(t0, -1, ya), P(t0, 1, ya)
                strip(trim, (q0[0], q0[2]), (q1[0], q1[2]), ya, 0.26, 0.05)
        if trim and w >= 3.0:
            # Pale joints, so a floor's big slabs of different sizes read at a distance: three runs side by side, their cross joints staggered.
            rj = random.Random(int(a[0] + a[1]))
            lanes = (-0.78, -0.26, 0.26, 0.78) if w >= 4.5 else (-1.0, 0.0, 1.0)
            for l0, l1 in zip(lanes, lanes[1:]):
                t = rj.uniform(0.2, 1.4)
                while t < L - 0.3:
                    q0, q1 = P(t, l0, ya), P(t, l1, ya)
                    strip(trim, (q0[0], q0[2]), (q1[0], q1[2]), ya, 0.06, 0.012)
                    t += rj.uniform(0.9, 2.3)
            for l in lanes[1:-1]:
                q0, q1 = P(0, l, ya), P(L, l, ya)
                strip(trim, (q0[0], q0[2]), (q1[0], q1[2]), ya, 0.07, 0.012)
        if trim and w >= 4.5:
            # A gutter down each side, under a kerb: the floor is a road with edges.
            for s in (-1, 1):
                k = (hw - 0.62) / hw * s
                q0, q1 = P(0, k, ya), P(L, k, ya)
                strip(trim, (q0[0], q0[2]), (q1[0], q1[2]), ya, 0.2, 0.06)
                g0, g1 = P(0, s, ya + 0.008), P(L, k, ya + 0.008)
                floor_rect('cata_earth', min(g0[0], g1[0]), min(g0[2], g1[2]), max(g0[0], g1[0]), max(g0[2], g1[2]), ya + 0.008)
        W.floor(x0, z0, x1, z1, ya)
    else:
        n = int(round(abs(yb - ya) / RISE))
        for i in range(n):
            t0, t1 = i * L / n, (i + 1) * L / n
            y = ya + (yb - ya) * (i + 1) / n
            floor_m = seq(floor_mat)[i % 2 % len(seq(floor_mat))]
            tf = TILE_M[floor_m]
            A, B = P(t0, -1, y), P(t0, 1, y)
            C, D = P(t1, 1, y), P(t1, -1, y)
            up = (0.0, 1.0, 0.0)
            W.quad(floor_m, A, B, C, D, ((A[0] / tf, A[2] / tf), (B[0] / tf, B[2] / tf), (C[0] / tf, C[2] / tf), (D[0] / tf, D[2] / tf)), (up, up, up, up))
            E, F = P(t0, -1, y - (yb - ya) / n), P(t0, 1, y - (yb - ya) / n)
            face = (-ux, 0.0, -uz)
            W.quad(floor_m, A, B, F, E, ((0, 0), (w / tf, 0), (w / tf, RISE / tf), (0, RISE / tf)), (face, face, face, face))
        x0, x1 = sorted((a[0] + nx * hw, b[0] - nx * hw))
        z0, z1 = sorted((a[1] + nz * hw, b[1] - nz * hw))
        axis = 'x' if abs(ux) > 0.5 else 'z'
        lo, hi = (ya, yb) if ((a[0] if axis == 'x' else a[1]) < (b[0] if axis == 'x' else b[1])) else (yb, ya)
        W.floor(x0, z0, x1, z1, lo, hi, axis)


def room(poly, y, spring, apex, wall_mat, floor_mat, roof_mat, dado=None, ops=None, rib=None, floor_tile=None, ribs=True, inner=None, inner_tile=None, trim=None, boss=True, ring=0.6):
    """A many-sided room with a star vault. ops: edge index to openings. Polygons run any way round.
    wall_mat, dado and floor_mat can each be several, turn about round the room. inner is a floor of its own in the middle, a kerbed ring around it; trim makes the kerbs and plinths."""
    ops = ops or {}
    cx = sum(p[0] for p in poly) / len(poly)
    cz = sum(p[1] for p in poly) / len(poly)
    rib = rib or seq(wall_mat)[0]
    floors = seq(floor_mat)
    tf = floor_tile or TILE_M[floors[0]]
    ti = inner_tile or (TILE_M[inner] if inner else tf)
    tr = TILE_M[roof_mat]
    up = (0.0, 1.0, 0.0)
    ys, ya = y + spring, y + apex
    N = len(poly)
    RINGS = 7
    for i in range(N):
        a, b = poly[i], poly[(i + 1) % N]
        fm = floors[i % len(floors)]
        tfm = floor_tile or TILE_M[fm]
        a2 = (cx + (a[0] - cx) * ring, cz + (a[1] - cz) * ring)
        b2 = (cx + (b[0] - cx) * ring, cz + (b[1] - cz) * ring)
        W.quad(fm, (a[0], y, a[1]), (b[0], y, b[1]), (b2[0], y, b2[1]), (a2[0], y, a2[1]), tuple((q[0] / tfm, q[1] / tfm) for q in (a, b, b2, a2)), (up, up, up, up))
        im = inner or fm
        if inner:   # (a picture on the floor sits square on the room's centre)
            uvi = lambda q: ((q[0] - cx) / ti + 0.5, (q[1] - cz) / ti + 0.5)
        else:
            uvi = lambda q: (q[0] / tfm, q[1] / tfm)
        W.tri(im, ((a2[0], y, a2[1]), (b2[0], y, b2[1]), (cx, y, cz)), (uvi(a2), uvi(b2), uvi((cx, cz))), (up, up, up))
        if trim:
            strip(trim, a2, b2, y, 0.34, 0.07)
            strip(trim, a, a2, y, 0.22, 0.05)
        o = ops.get(i, [])
        wm = seq(wall_mat)[i % len(seq(wall_mat))]
        if dado:
            wall(seq(dado)[i % len(seq(dado))], a, b, y, y + 3.0, o, inward=(cx, cz))
            wall(wm, a, b, y + 3.0, ys + 2.0, o, inward=(cx, cz))
        else:
            wall(wm, a, b, y, ys + 2.0, o, inward=(cx, cz))
        if trim:
            skirt(trim, a, b, y, o, (cx, cz), course=(y + 3.0) if dado else None)
            L_ = math.hypot(b[0] - a[0], b[1] - a[1])
            for t0, t1 in clear_runs(L_, [op for op in o if op.get('apex', 0) > ys]):
                L0, ux_, uz_, nx_, nz_ = wall_frame(a, b, (cx, cz))
                tube(trim, [(a[0] + ux_ * t0 + nx_ * 0.05, ys, a[1] + uz_ * t0 + nz_ * 0.05), (a[0] + ux_ * t1 + nx_ * 0.05, ys, a[1] + uz_ * t1 + nz_ * 0.05)], 0.18, ref=(0.0, 1.0, 0.0), ry=0.13)
            for op in o:
                if not op.get('blocked'):
                    keystone(a, b, op, (cx, cz))
            # The floor's slabs, in a ring and a spoke between each kerb.
            k3 = 1.0 - (1.0 - ring) * 0.5
            a3, b3 = (cx + (a[0] - cx) * k3, cz + (a[1] - cz) * k3), (cx + (b[0] - cx) * k3, cz + (b[1] - cz) * k3)
            strip(trim, a3, b3, y, 0.09, 0.014)
            for e in (0.33, 0.67):
                strip(trim, (a3[0] + (b3[0] - a3[0]) * e, a3[1] + (b3[1] - a3[1]) * e), (a2[0] + (b2[0] - a2[0]) * e, a2[1] + (b2[1] - a2[1]) * e), y, 0.07, 0.012)
            for e in (0.5,):
                strip(trim, (a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e), (a3[0] + (b3[0] - a3[0]) * e, a3[1] + (b3[1] - a3[1]) * e), y, 0.07, 0.012)
        for op in o:
            if not op.get('blocked'):
                wall_op_trim(rib, a, b, op, (cx, cz), 0.16)
        # Collision: the wall, a metre thick, with gaps at its openings.
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        ux, uz = dx / L, dz / L
        nx, nz = -uz, ux
        if (cx - a[0]) * nx + (cz - a[1]) * nz > 0:
            nx, nz = -nx, -nz
        t0 = 0.0
        for g0, g1 in sorted((op['t'] - op['w'] / 2, op['t'] + op['w'] / 2) for op in o if not op.get('blocked')) + [(L, L)]:
            if g0 > t0 + 0.01:
                mx, mz = a[0] + ux * (t0 + g0) / 2 + nx * 0.5, a[1] + uz * (t0 + g0) / 2 + nz * 0.5
                W.colliders.append({'x': round(mx, 3), 'z': round(mz, 3), 'hx': round((g0 - t0) / 2, 3), 'hz': 0.5, 'yaw': round(-math.atan2(uz, ux), 5), 'h': 40.0})
            t0 = g1
        # The vault's web.
        for r in range(RINGS):
            k0, k1 = r / RINGS, (r + 1) / RINGS
            def S(t, k):
                ex, ez = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                edge_bow = 1.0 - abs(2 * t - 1) ** 2
                px, pz = ex + (cx - ex) * k, ez + (cz - ez) * k
                rho = 1 - k
                return (px, ys + (ya - ys) * norm_arch(rho) * (0.9 + 0.1 * (1 - edge_bow * rho)) + edge_bow * rho * rho * (spring * 0.0 + 1.3), pz)
            def Nn(p):
                d = unit((p[0] - cx, 0.0, p[2] - cz))
                return unit((-d[0] * 0.5, -1.0, -d[2] * 0.5))
            for s in range(4):
                t0v, t1v = s / 4, (s + 1) / 4
                A, B, C, D = S(t0v, k0), S(t1v, k0), S(t1v, k1), S(t0v, k1)
                W.quad(roof_mat, A, B, C, D, tuple((q[0] / tr, q[2] / tr) for q in (A, B, C, D)), (Nn(A), Nn(B), Nn(C), Nn(D)))
        if ribs:
            pts = []
            for r in range(RINGS + 1):
                k = r / RINGS
                pts.append((a[0] + (cx - a[0]) * k, ys + (ya - ys) * norm_arch(1 - k), a[1] + (cz - a[1]) * k))
            tube(rib, pts, 0.2, ref=unit((-(cz - a[1]), 0.0, cx - a[0])))
            lathe(rib, a[0] + (cx - a[0]) * 0.02, a[1] + (cz - a[1]) * 0.02, [(0.34, y), (0.26, y + 0.5), (0.24, ys - 0.4), (0.36, ys)], 8)
    if boss:
        lathe('gold', cx, cz, [(0.0, ya - 0.3), (0.42, ya - 0.14), (0.5, ya + 0.02), (0.3, ya + 0.12)], 10)
    x0, x1 = min(p[0] for p in poly), max(p[0] for p in poly)
    z0, z1 = min(p[1] for p in poly), max(p[1] for p in poly)
    W.floor(x0, z0, x1, z1, y)


def ngon(cx, cz, r, n, phase=0.0):
    return [(cx + math.cos(phase + i / n * math.tau) * r, cz + math.sin(phase + i / n * math.tau) * r) for i in range(n)]


def gate(a, b, w, spring, apex, y, t=None):
    """An opening a passage's width on the wall a to b, at its middle unless told."""
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    return arch_op((L / 2) if t is None else t, w, y, y + spring, y + apex)


def sarcophagus(x, y, z, along_x=True, lid='wall_ashlar', mat='wall_rough', hx=1.2, hz=0.55):
    if not along_x:
        hx, hz = hz, hx
    bx(mat, x, y + 0.38, z, hx, 0.38, hz, 2.0)
    bx('wall_ashlar', x, y + 0.78, z, hx * 1.05, 0.04, hz * 1.05, 2.0)
    bx(lid, x, y + 0.92, z, hx * 0.93, 0.1, hz * 0.8, 2.0)
    bx(lid, x, y + 1.08, z, hx * 0.8, 0.07, hz * 0.45, 2.0)
    W.collide(x - hx, z - hz, x + hx, z + hz, 1.2)


def seq(m):
    return m if isinstance(m, (tuple, list)) else (m,)


def obox(mat, c, u, n, hu, hv, hn, tile=None):
    """A box turned to face n, u along its width, up the world's up. Its texture at world scale."""
    tile = tile or TILE_M.get(mat, 2.0)
    o = R.random()
    v = (0.0, 1.0, 0.0)
    for f, a, b, ha, hb, hf in ((n, u, v, hu, hv, hn), (mul(n, -1), u, v, hu, hv, hn), (u, n, v, hn, hv, hu), (mul(u, -1), n, v, hn, hv, hu), (v, u, n, hu, hn, hv), (mul(v, -1), u, n, hu, hn, hv)):
        k = add(c, mul(f, hf))
        p = lambda s, t: add(add(k, mul(a, s * ha)), mul(b, t * hb))
        W.quad(mat, p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), ((o, o), (o + 2 * ha / tile, o), (o + 2 * ha / tile, o + 2 * hb / tile), (o, o + 2 * hb / tile)), (f, f, f, f))


def strip(mat, p0, p1, y, w=0.2, h=0.06, tile=None):
    """A kerb on a floor from p0 to p1, (x, z), its sides sloped so a low light catches it."""
    tile = tile or TILE_M.get(mat, 3.0)
    dx, dz = p1[0] - p0[0], p1[1] - p0[1]
    L = math.hypot(dx, dz)
    if L < 1e-3:
        return
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    hw, ht = w / 2, w * 0.34
    o = R.random()
    top = (0.0, 1.0, 0.0)
    T = lambda s, e: (p0[0] + ux * L * e + nx * s * ht, y + h, p0[1] + uz * L * e + nz * s * ht)
    B = lambda s, e: (p0[0] + ux * L * e + nx * s * hw, y, p0[1] + uz * L * e + nz * s * hw)
    W.quad(mat, T(-1, 0), T(1, 0), T(1, 1), T(-1, 1), ((o, o), (o + w / tile, o), (o + w / tile, o + L / tile), (o, o + L / tile)), (top, top, top, top))
    for s in (-1, 1):
        m = unit((nx * s * h, hw - ht, nz * s * h))
        W.quad(mat, B(s, 0), B(s, 1), T(s, 1), T(s, 0), ((o, o), (o + L / tile, o), (o + L / tile, o + h / tile), (o, o + h / tile)), (m, m, m, m))
    for e, d in ((0, -1), (1, 1)):
        m = (ux * d, 0.0, uz * d)
        W.quad(mat, B(-1, e), B(1, e), T(1, e), T(-1, e), ((o, o), (o + w / tile, o), (o + w / tile, o + h / tile), (o, o + h / tile)), (m, m, m, m))


def clear_runs(L, ops):
    """Stretches of a wall L long between its openings. (Recesses count: nothing runs across a hole.)"""
    runs, t0 = [], 0.0
    for g0, g1 in sorted((o['t'] - o['w'] / 2, o['t'] + o['w'] / 2) for o in ops) + [(L, L)]:
        if g0 > t0 + 0.05:
            runs.append((t0, g0))
        t0 = max(t0, g1)
    return runs


def skirt(mat, a, b, y, ops, inward, course=None, w=0.42, h=0.26):
    """A plinth along the foot of a wall, and a moulded course higher up if asked for one, each stopping at an opening."""
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    if (inward[0] - a[0]) * nx + (inward[1] - a[1]) * nz < 0:
        nx, nz = -nx, -nz
    for t0, t1 in clear_runs(L, ops):
        q0 = (a[0] + ux * t0 + nx * w * 0.3, a[1] + uz * t0 + nz * w * 0.3)
        q1 = (a[0] + ux * t1 + nx * w * 0.3, a[1] + uz * t1 + nz * w * 0.3)
        strip(mat, q0, q1, y, w, h)
        if course is not None:
            tube(mat, [(a[0] + ux * t0 + nx * 0.03, course, a[1] + uz * t0 + nz * 0.03), (a[0] + ux * t1 + nx * 0.03, course, a[1] + uz * t1 + nz * 0.03)], 0.12, ref=(0.0, 1.0, 0.0), ry=0.08)


def pool_of_light(x, z, y, size=3.4, tint=(0.11, 0.058, 0.024)):
    """The floor under a flame, lit whether or not that flame is one the frame has room for."""
    W.glowquad((x - size, y + 0.025, z - size), (x + size, y + 0.025, z - size), (x + size, y + 0.025, z + size), (x - size, y + 0.025, z + size), 101, (0, 0, 1, 1), tint)


def halo(x, y, z, size=0.5, tint=(0.16, 0.08, 0.03)):
    for dx, dz in ((1, 0), (0, 1)):
        W.glowquad((x - dx * size, y - size, z - dz * size), (x + dx * size, y - size, z + dz * size), (x + dx * size, y + size, z + dz * size), (x - dx * size, y + size, z - dz * size), 101, (0, 0, 1, 1), tint)


def candle(x, y, z, tall=0.2, r=0.026):
    """A stub of wax in its pan, run down one side, burning."""
    lathe('iron', x, z, [(0.012, y - 0.03), (0.075, y), (0.08, y + 0.016)], 6)
    lathe('bone', x, z, [(r * 1.3, y + 0.012), (r, y + 0.04), (r, y + tall), (r * 0.6, y + tall + 0.006)], 5, tile=1.0)
    lathe('bone', x + r * 0.85, z, [(0.012, y + 0.01), (0.017, y + tall * 0.4), (0.008, y + tall * 0.85)], 4, tile=1.0)
    flame(x, y + tall, z, 0.03)


def candelabra(x, z, y, h=2.2, arms=4, i=15.0, r=11.0, c=(1.0, 0.62, 0.3), phase=0.4):
    """A standing iron candelabrum, taller than a man: a three-footed base, a knopped shaft, arms that sweep out and up."""
    for k in range(3):
        a = phase + k / 3 * math.tau
        ca, sa = math.cos(a), math.sin(a)
        tube('iron', [(x, y + 0.34, z), (x + ca * 0.16, y + 0.26, z + sa * 0.16), (x + ca * 0.34, y + 0.1, z + sa * 0.34), (x + ca * 0.42, y + 0.02, z + sa * 0.42)], 0.026, sides=5)
    top = y + h
    lathe('iron', x, z, [(0.09, y + 0.26), (0.05, y + 0.38), (0.032, y + 0.46), (0.03, y + h * 0.46), (0.075, y + h * 0.49), (0.03, y + h * 0.52), (0.026, top - 0.42), (0.07, top - 0.36), (0.1, top - 0.3), (0.03, top - 0.24), (0.024, top - 0.03)], 6)
    candle(x, top, z, 0.28)
    for k in range(arms):
        a = phase + (k + 0.5) / arms * math.tau
        ca, sa = math.cos(a), math.sin(a)
        tube('iron', [(x, top - 0.36, z), (x + ca * 0.14, top - 0.44, z + sa * 0.14), (x + ca * 0.3, top - 0.4, z + sa * 0.3), (x + ca * 0.38, top - 0.26, z + sa * 0.38), (x + ca * 0.39, top - 0.12, z + sa * 0.39)], 0.018, sides=4)
        candle(x + ca * 0.39, top - 0.1, z + sa * 0.39, 0.16 + (k % 3) * 0.05)
    halo(x, top + 0.2, z, 0.75)
    pool_of_light(x, z, y)
    W.collide(x - 0.3, z - 0.3, x + 0.3, z + 0.3, h)
    W.light(x, top + 0.35, z, c, r, i, 0.9)


def chain(x, z, y0, y1):
    """Hanging from y1 down to y0, a link at a time, each turned from the last."""
    n = max(2, int((y1 - y0) / 0.16))
    for k in range(n):
        y = y0 + (y1 - y0) * (k + 0.5) / n
        bx('iron', x, y, z, *((0.03, 0.07, 0.008) if k % 2 else (0.008, 0.07, 0.03)), 1.0)


def corona(x, z, y, top, rad=1.8, n=8, i=26.0, r=14.0):
    """A wheel of candles on three chains, for a room with nothing to stand one on."""
    for s in (0.02, 0.0):
        tube('iron', [(x + math.cos(k / 24 * math.tau) * (rad + s), y + s, z + math.sin(k / 24 * math.tau) * (rad + s)) for k in range(25)], 0.035, sides=5)
    for k in range(3):
        a = k / 3 * math.tau + 0.5
        tube('iron', [(x, y + 1.0, z), (x + math.cos(a) * rad, y, z + math.sin(a) * rad)], 0.016, ref=(0.0, 0.0, 1.0), sides=4)
        tube('iron', [(x + math.cos(a + 1.05) * rad, y, z + math.sin(a + 1.05) * rad), (x + math.cos(a + 1.05 + math.pi) * rad, y, z + math.sin(a + 1.05 + math.pi) * rad)], 0.02, ref=(0.0, 1.0, 0.0), sides=4)
    chain(x, z, y + 1.0, top)
    for k in range(n):
        a = k / n * math.tau
        candle(x + math.cos(a) * rad, y + 0.04, z + math.sin(a) * rad, 0.16 + (k % 3) * 0.04)
    halo(x, y + 0.2, z, rad * 1.2, (0.05, 0.025, 0.01))
    W.light(x, y - 0.4, z, (1.0, 0.62, 0.32), r, i, 0.7)


def lantern(x, z, y, top, c=(1.0, 0.16, 0.09), i=7.0, r=6.0):
    """His colour, in an iron cage, over the door that goes deeper. A lamp you can point at, and not a stain on the room."""
    chain(x, z, y + 0.3, top)
    lathe('iron', x, z, [(0.02, y + 0.3), (0.14, y + 0.2), (0.15, y + 0.17)], 6)
    lathe('iron', x, z, [(0.15, y - 0.2), (0.15, y - 0.17), (0.03, y - 0.28)], 6)
    for k in range(4):
        a = k / 4 * math.tau + 0.4
        tube('iron', [(x + math.cos(a) * 0.14, y + 0.18, z + math.sin(a) * 0.14), (x + math.cos(a) * 0.14, y - 0.18, z + math.sin(a) * 0.14)], 0.009, sides=4)
    flame(x, y - 0.14, z, 0.05)
    halo(x, y, z, 0.9, (0.3, 0.035, 0.018))
    W.light(x, y - 0.3, z, c, r, i, 0.3)


def skull(x, y, z, nx=1.0, nz=0.0, s=0.105, mat='bone'):
    """A skull facing (nx, nz): it has sockets and a jaw, so it reads at a glance as what it is."""
    sx, sz = -nz, nx
    lathe(mat, x, z, [(s * 0.62, y + s * 0.42), (s * 0.95, y + s * 0.8), (s, y + s * 1.25), (s * 0.68, y + s * 1.72), (0.0, y + s * 1.86)], 6, tile=0.6)
    lathe(mat, x + nx * s * 0.45, z + nz * s * 0.45, [(0.0, y), (s * 0.5, y + s * 0.03), (s * 0.58, y + s * 0.42), (s * 0.5, y + s * 0.6)], 5, tile=0.6)
    for d in (-1, 1):
        ex, ez = x + nx * s * 0.82 + sx * d * s * 0.42, z + nz * s * 0.82 + sz * d * s * 0.42
        lathe('iron', ex, ez, [(0.0, y + s * 0.78), (s * 0.25, y + s * 0.98), (0.0, y + s * 1.2)], 4)
    lathe('iron', x + nx * s * 0.92, z + nz * s * 0.92, [(0.0, y + s * 0.5), (s * 0.12, y + s * 0.64), (0.0, y + s * 0.8)], 3)


def long_bone(x, y, z, a, L=0.42, r=0.018, mat='bone'):
    dx, dz = math.cos(a) * L / 2, math.sin(a) * L / 2
    tube(mat, [(x - dx, y + r, z - dz), (x, y + r * 0.8, z), (x + dx, y + r, z + dz)], r, sides=4, tile=0.6)
    for s in (-1, 1):
        lathe(mat, x + s * dx, z + s * dz, [(0.0, y), (r * 1.9, y + r), (0.0, y + r * 2.4)], 4, tile=0.6)


def heap(x, z, y, n=8, spread=0.5, seed=0):
    """What's left of a burial: skulls looking any way, long bones across them."""
    r2 = random.Random(int(x * 31 + z * 17 + seed))
    for k in range(n):
        a = r2.uniform(0, math.tau)
        d = r2.uniform(0, spread)
        px, pz = x + math.cos(a) * d, z + math.sin(a) * d
        if k % 3 == 0:
            b = r2.uniform(0, math.tau)
            skull(px, y, pz, math.cos(b), math.sin(b), r2.uniform(0.09, 0.115))
        else:
            long_bone(px, y, pz, r2.uniform(0, math.pi), r2.uniform(0.3, 0.46))


def wall_frame(a, b, inward):
    dx, dz = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dz)
    ux, uz = dx / L, dz / L
    nx, nz = -uz, ux
    if (inward[0] - a[0]) * nx + (inward[1] - a[1]) * nz < 0:
        nx, nz = -nx, -nz
    return L, ux, uz, nx, nz


def loculi(a, b, y, inward, rows=4, h=3.0, depth=0.5, mat='cata_block', seed=0):
    """A pila, what makes a catacomb a catacomb: body-length graves cut one over another up the wall. Most still sealed
    with a slab; some cracked open or robbed, with what was in them lying in the hole."""
    L, ux, uz, nx, nz = wall_frame(a, b, inward)
    rng = random.Random(seed + int(a[0] * 7 + a[1] * 13))
    u, n = (ux, 0.0, uz), (nx, 0.0, nz)
    rows = rng.choice((3, 4, 4, 5))
    cols = max(1, int(round(L / rng.choice((1.7, 2.0, 2.4)))))
    cw, ch = L / cols, h / rows
    O = lambda t, d: (a[0] + ux * t + nx * d, a[1] + uz * t + nz * d)
    # The dark behind.
    p0, p1 = O(0, 0.02), O(L, 0.02)
    W.quad('cata_earth', (p0[0], y, p0[1]), (p1[0], y, p1[1]), (p1[0], y + h, p1[1]), (p0[0], y + h, p0[1]), ((0, 0), (L / 3, 0), (L / 3, h / 3), (0, h / 3)), (n, n, n, n))
    fr = 0.07
    for r in range(rows + 1):   # ledges, each a little deeper than the frame
        c = O(L / 2, depth / 2 + 0.02)
        obox(mat, (c[0], y + r * ch, c[1]), u, n, L / 2, fr, depth / 2 + 0.02)
    for k in range(cols + 1):
        c = O(k * cw, depth / 2)
        obox(mat, (c[0], y + h / 2, c[1]), u, n, fr * 1.15, h / 2, depth / 2)
    for r in range(rows):
        cy = y + (r + 0.5) * ch
        for k in range(cols):
            t = (k + 0.5) * cw
            what = rng.random()
            hu, hv = cw / 2 - fr * 1.15, ch / 2 - fr
            slab = rng.choice(('cata_wall3', 'cata_block', 'cata_floor3', 'cata_floor', 'cata_rubble'))
            front = depth * rng.uniform(0.3, 0.58)
            if what < 0.26:     # sealed
                c = O(t, front)
                obox(slab, (c[0], cy, c[1]), u, n, hu, hv, 0.03, 1.6)
            elif what < 0.42:    # sealed with three tiles, as the poor were
                for s in (-1, 0, 1):
                    if rng.random() < 0.82:
                        c = O(t + s * hu * 2 / 3, front + s * 0.01)
                        obox(slab, (c[0], cy, c[1]), u, n, hu / 3 - 0.012, hv - 0.006, 0.026, 1.6)
            elif what < 0.58:   # broken: half a slab left, the rest in the hole
                s = rng.choice((-1, 1))
                c = O(t + s * hu * 0.45, front)
                obox(slab, (c[0], cy, c[1]), u, n, hu * 0.55, hv, 0.03, 1.6)
                c = O(t - s * hu * 0.5, depth * 0.45)
                skull(c[0], cy - hv, c[1], nx, nz, 0.095)
            elif what < 0.86:    # a body still in its shroud, drawn half out by whoever came for it
                s = rng.choice((-1, 1))
                q0, q1, q2 = O(t - s * hu * 0.85, depth * 0.45), O(t, depth * 0.55), O(t + s * hu * 0.62, depth * 0.62)
                base = cy - hv + 0.09
                tube('bone', [(q0[0], base, q0[1]), (q1[0], base + 0.012, q1[1]), (q2[0], base, q2[1])], 0.11, ref=(0.0, 1.0, 0.0), ry=0.085, sides=6, tile=0.5)
                c = O(t + s * hu * 0.8, depth * 0.66)
                skull(c[0], cy - hv, c[1], nx, nz, 0.092)
            else:               # robbed
                c = O(t + rng.uniform(-0.4, 0.4), depth * 0.5)
                skull(c[0], cy - hv, c[1], nx + rng.uniform(-0.4, 0.4), nz + rng.uniform(-0.4, 0.4), 0.1)
                c = O(t + rng.uniform(-0.5, 0.5), depth * 0.55)
                long_bone(c[0], cy - hv, c[1], math.atan2(uz, ux) + rng.uniform(-0.25, 0.25))
    c = O(L / 2, depth / 2)
    W.colliders.append({'x': round(c[0], 3), 'z': round(c[1], 3), 'hx': round(L / 2, 3), 'hz': round(depth / 2, 3), 'yaw': round(-math.atan2(uz, ux), 5), 'h': 40.0})


def recess_op(t, y, w=2.5):
    """An arched hole in a wall that goes nowhere: see arcosolium."""
    o = arch_op(t, w, y + 0.88, y + 2.1, y + 3.15)
    o['blocked'] = True
    return o


def arcosolium(a, b, op, inward, y, mat='cata_wall4', seed=0, lit=False, trim='cata_block'):
    """An arched tomb cut back into the wall, the dead on a shelf at waist height under the arch: the catacombs' better
    class of grave, and real depth in a wall where a painting would only have looked it."""
    L, ux, uz, nx, nz = wall_frame(a, b, inward)
    D = 0.95
    At = lambda u, yy, d: (a[0] + ux * (op['t'] + u * op['w'] / 2) - nx * d, yy, a[1] + uz * (op['t'] + u * op['w'] / 2) - nz * d)
    reveal(mat, a, b, op, inward, D)
    N = 16
    n = (nx, 0.0, nz)
    tile = TILE_M.get(mat, 3.0)
    for i in range(N):
        u0, u1 = -1 + 2 * i / N, -1 + 2 * (i + 1) / N
        y0, y1 = op['hi'](u0), op['hi'](u1)
        t0, t1 = u0 * op['w'] / 2, u1 * op['w'] / 2
        W.quad(mat, At(u0, op['sill'], D), At(u1, op['sill'], D), At(u1, y1, D), At(u0, y0, D), ((t0 / tile, -op['sill'] / tile), (t1 / tile, -op['sill'] / tile), (t1 / tile, -y1 / tile), (t0 / tile, -y0 / tile)), (n, n, n, n))
    up = (0.0, 1.0, 0.0)
    W.quad('cata_block', At(-1, op['sill'], -0.1), At(1, op['sill'], -0.1), At(1, op['sill'], D), At(-1, op['sill'], D), ((0, 0), (op['w'] / 1.6, 0), (op['w'] / 1.6, D / 1.6), (0, D / 1.6)), (up, up, up, up))
    wall_op_trim(trim, a, b, op, inward, 0.13)
    # The occupant. Long-boned, and past caring.
    m = At(0.0, op['sill'], 0.4)
    rng = random.Random(seed + int(m[0] * 3 + m[2] * 5))
    head = rng.choice((-1, 1))
    along = math.atan2(uz, ux)
    skull(m[0] + ux * head * 0.7, m[1] + 0.01, m[2] + uz * head * 0.7, nx, nz, 0.105)
    for k in range(4):
        long_bone(m[0] + ux * rng.uniform(-0.5, 0.4) + nx * rng.uniform(-0.2, 0.2), m[1] + 0.01, m[2] + uz * rng.uniform(-0.5, 0.4) + nz * rng.uniform(-0.2, 0.2), along + rng.uniform(-0.3, 0.3))
    if lit:
        c = At(-head * 0.7, op['sill'], 0.3)
        candle(c[0], c[1] + 0.02, c[2], 0.15)
        bk = At(-head * 0.7, op['sill'] + 0.45, D - 0.03)
        W.glowquad((bk[0] - ux * 0.9, bk[1] - 0.9, bk[2] - uz * 0.9), (bk[0] + ux * 0.9, bk[1] - 0.9, bk[2] + uz * 0.9), (bk[0] + ux * 0.9, bk[1] + 0.9, bk[2] + uz * 0.9), (bk[0] - ux * 0.9, bk[1] + 0.9, bk[2] - uz * 0.9), 101, (0, 0, 1, 1), (0.14, 0.07, 0.03))
        W.light(c[0] + nx * 0.8, c[1] + 0.5, c[2] + nz * 0.8, (1.0, 0.6, 0.3), 6.5, 5.0, 0.9)


def grave(x, z, y, ux, uz, hl=1.05, hw=0.5, mat='wall_ashlar', mark=True):
    """A slab let into the floor with his V cut in it. Not much of one: a thing to walk over and see."""
    u, n = (ux, 0.0, uz), (-uz, 0.0, ux)
    obox(mat, (x, y + 0.02, z), u, n, hl, 0.025, hw, 1.8)
    c = lambda a, b: (x + ux * a - uz * b, z + uz * a + ux * b)
    for p, q in ((c(-hl, -hw), c(hl, -hw)), (c(hl, -hw), c(hl, hw)), (c(hl, hw), c(-hl, hw)), (c(-hl, hw), c(-hl, -hw))):
        strip('cata_block', p, q, y, 0.15, 0.08)
    if mark:
        for s in (-1, 1):
            strip('iron', c(0.55, s * 0.28), c(-0.42, 0.0), y + 0.045, 0.075, 0.008)


def shaft(x, z, y, top, r=0.7, tint=(0.04, 0.033, 0.024), i=30.0, ring='cata_block'):
    """A lucernarium: a light well bored down from the world above, the only thing in the place that isn't flame. Dust
    hangs in it. It's what you walk towards, and what you look up at. (Ash and bone, not blue: blue is the other side's.)"""
    lathe(ring, x, z, [(r + 0.5, top - 0.5), (r + 0.26, top - 0.34), (r + 0.2, top - 0.1), (r, top - 0.08), (r, top + 2.4)], 12)
    lathe('iron', x, z, [(r, top + 2.4), (0.0, top + 2.42)], 8)
    W.glowquad((x - r, top + 2.3, z - r), (x + r, top + 2.3, z - r), (x + r, top + 2.3, z + r), (x - r, top + 2.3, z + r), 101, (0, 0, 1, 1), (1.1, 0.96, 0.74))
    N = 3
    for k in range(N):
        a = k / N * math.pi + 0.3
        dx, dz = math.cos(a), math.sin(a)
        wb = r * 2.0
        wt = r * 1.05
        W.glowquad((x - dx * wb, y, z - dz * wb), (x + dx * wb, y, z + dz * wb), (x + dx * wt, top, z + dz * wt), (x - dx * wt, top, z - dz * wt), 102, (0, 0, 1, 1), tint)
    pool_of_light(x, z, y, r * 4.0, (tint[0] * 3.0, tint[1] * 3.0, tint[2] * 3.0))
    W.light(x, y + (top - y) * 0.45, z, (0.82, 0.74, 0.62), (top - y) * 1.35, i, 0.0)


def sconce(x, y, z, nx, nz, lit=True):
    """A three-branched iron bracket on a wall: fire at a different height from the torches and the stands."""
    sx, sz = -nz, nx
    bx('iron', x + nx * 0.03, y, z + nz * 0.03, 0.05 + abs(sx) * 0.08, 0.2, 0.05 + abs(sz) * 0.08)
    for k in (-1, 0, 1):
        tip = (x + nx * 0.3 + sx * k * 0.26, y + 0.12 + (1 - abs(k)) * 0.1, z + nz * 0.3 + sz * k * 0.26)
        tube('iron', [(x + nx * 0.04, y - 0.06, z + nz * 0.04), (x + nx * 0.2 + sx * k * 0.15, y - 0.06, z + nz * 0.2 + sz * k * 0.15), tip], 0.014, sides=4)
        candle(tip[0], tip[1], tip[2], 0.12 + (k % 2) * 0.05)
    wash(x, y + 0.2, z, nx, nz, 2.0, (0.1, 0.05, 0.02))
    if lit:
        W.light(x + nx * 0.9, y + 0.3, z + nz * 0.9, (1.0, 0.62, 0.3), 8.0, 8.0, 0.9)


def floor_candles(x, z, y, n=5, seed=0, lit=False):
    """Stubs burnt down on bare stone, left where someone knelt: a line of them leads the eye."""
    r2 = random.Random(int(x * 41 + z * 23 + seed))
    for k in range(n):
        a, d = r2.uniform(0, math.tau), r2.uniform(0.05, 0.3)
        px, pz = x + math.cos(a) * d, z + math.sin(a) * d
        tall = r2.uniform(0.09, 0.26)
        lathe('bone', px, pz, [(0.06, y), (0.034, y + 0.03), (0.03, y + tall), (0.018, y + tall + 0.006)], 5, tile=1.0)
        flame(px, y + tall, pz, 0.028)
    halo(x, y + 0.3, z, 0.55, (0.1, 0.05, 0.02))
    pool_of_light(x, z, y, 1.5, (0.07, 0.038, 0.016))
    if lit:
        W.light(x, y + 0.6, z, (1.0, 0.6, 0.28), 5.5, 4.0, 0.9)


def keystone(a, b, op, inward):
    """The block at an arch's crown, with his mark cut in it, so a door says whose it is."""
    L, ux, uz, nx, nz = wall_frame(a, b, inward)
    t = op['t']
    cx, cz = a[0] + ux * t + nx * 0.14, a[1] + uz * t + nz * 0.14
    cy = op['apex'] + 0.02
    obox('cata_block', (cx, cy, cz), (ux, 0.0, uz), (nx, 0.0, nz), 0.3, 0.4, 0.16, 1.6)
    fx, fz = cx + nx * 0.17, cz + nz * 0.17
    tube('iron', [(fx - ux * 0.17, cy + 0.24, fz - uz * 0.17), (fx, cy - 0.24, fz), (fx + ux * 0.17, cy + 0.24, fz + uz * 0.17)], 0.03, ref=(nx, 0.0, nz), sides=4)


def slit(a, b, t, y0, y1, inward):
    """A tall window with no sky behind it: something burns in the rock, red, behind a stone frame."""
    L, ux, uz, nx, nz = wall_frame(a, b, inward)
    x, z = a[0] + ux * t + nx * 0.04, a[1] + uz * t + nz * 0.04
    hw = 0.2
    for r, tint in ((hw, (0.9, 0.07, 0.03)), (hw * 4, (0.16, 0.012, 0.006))):
        W.glowquad((x - ux * r, y0, z - uz * r), (x + ux * r, y0, z + uz * r), (x + ux * r, y1, z + uz * r), (x - ux * r, y1, z - uz * r), 100, (0, 0, 1, 1), tint)
    op = arch_op(t, hw * 2.4, y0, y1 - 0.5, y1)
    wall_op_trim('cata_block', a, b, op, inward, 0.08)
    for k in range(5):
        by = y0 + (k + 0.5) / 5 * (y1 - y0)
        tube('iron', [(x - ux * hw, by, z - uz * hw), (x + ux * hw, by, z + uz * hw)], 0.012, ref=(0.0, 1.0, 0.0), sides=4)


def portcullis(x0, x1, z, y0, y1):
    """An iron gate, drawn up: you pass under its teeth."""
    n = max(3, int((x1 - x0) / 0.42))
    for k in range(n + 1):
        x = x0 + (x1 - x0) * k / n
        tube('iron', [(x, y1, z), (x, y0 + 0.12, z)], 0.028, sides=4)
        lathe('iron', x, z, [(0.0, y0 - 0.16), (0.04, y0 + 0.14)], 4)
    for k in range(int((y1 - y0) / 0.5) + 1):
        y = y0 + 0.45 + k * 0.5
        tube('iron', [(x0, y, z), (x1, y, z)], 0.024, ref=(0.0, 1.0, 0.0), sides=4)


def skull_column(x, z, y, h=3.8, rings=8):
    """A pier faced in the dead, ring on ring, staring out."""
    lathe('cata_wall2', x, z, [(0.72, y), (0.56, y + 0.3), (0.42, y + 0.42), (0.42, y + h - 0.4), (0.56, y + h - 0.26), (0.72, y + h)], 10)
    for r in range(rings):
        py = y + 0.46 + r * (h - 0.92) / rings
        for k in range(8):
            a = (k + 0.5 * (r % 2)) / 8 * math.tau
            skull(x + math.cos(a) * 0.46, py, z + math.sin(a) * 0.46, math.cos(a), math.sin(a), 0.135)
    W.collide(x - 0.72, z - 0.72, x + 0.72, z + 0.72, h)


def lane(x0, z0, x1, z1, y, hw=1.7, step=2.2):
    """One lit way across a room: a run of pale slabs between kerbs, a candle every couple of paces each side of it."""
    L = math.hypot(x1 - x0, z1 - z0)
    ux, uz = (x1 - x0) / L, (z1 - z0) / L
    nx, nz = -uz, ux
    for s in (-1, 1):
        strip('cata_block', (x0 + nx * s * hw, z0 + nz * s * hw), (x1 + nx * s * hw, z1 + nz * s * hw), y, 0.26, 0.08)
    A, C = (x0 - nx * hw, z0 - nz * hw), (x1 + nx * hw, z1 + nz * hw)
    floor_rect('cata_floor2', min(A[0], C[0]), min(A[1], C[1]), max(A[0], C[0]), max(A[1], C[1]), y + 0.012)
    rl = random.Random(int(x0 + z0))
    t = 2.0
    while t < L - 1.2:
        grave(x0 + ux * t, z0 + uz * t, y + 0.012, ux, uz, 0.95, hw * 0.46)
        for k in range(3):
            d, o = rl.uniform(-1.2, 1.2), rl.uniform(-hw, hw)
            long_bone(x0 + ux * (t + d) + nx * o, y + 0.05, z0 + uz * (t + d) + nz * o, rl.uniform(0, math.pi), rl.uniform(0.28, 0.44))
        for k in range(3):
            s_, d, o = rl.uniform(0.05, 0.16), rl.uniform(-1.4, 1.4), rl.uniform(-hw, hw)
            bx('cata_wall2', x0 + ux * (t + d) + nx * o, y + 0.02 + s_ * 0.5, z0 + uz * (t + d) + nz * o, s_, s_ * 0.5, s_ * 0.8, 1.8)
        t += 3.3
    n = int(L / step)
    for k in range(n + 1):
        t = k * L / max(n, 1)
        for s in (-1, 1):
            px, pz = x0 + ux * t + nx * s * (hw + 0.24), z0 + uz * t + nz * s * (hw + 0.24)
            candle(px, y + 0.03, pz, 0.15 + (k % 3) * 0.05)
            halo(px, y + 0.3, pz, 0.34, (0.12, 0.06, 0.024))
    for k in range(n // 2 + 1):
        t = (k + 0.5) * L / (n // 2 + 1)
        W.light(x0 + ux * t, y + 1.0, z0 + uz * t, (1.0, 0.62, 0.3), 6.5, 7.0, 0.8)
        pool_of_light(x0 + ux * t, z0 + uz * t, y + 0.012, 2.6, (0.09, 0.05, 0.022))


def bone_chandelier(x, z, y, top, rad=1.5, n=12):
    """A wheel hung with the dead: skulls round its rim, long bones raying out, candles standing on them."""
    corona(x, z, y, top, rad, 6, 20.0, 13.0)
    for k in range(n):
        a = k / n * math.tau
        ca, sa = math.cos(a), math.sin(a)
        skull(x + ca * rad, y - 0.3, z + sa * rad, ca, sa, 0.115)
        tube('iron', [(x + ca * rad, y, z + sa * rad), (x + ca * rad, y - 0.1, z + sa * rad)], 0.01, sides=3)
        if k % 2 == 0:
            long_bone(x + ca * rad * 0.62, y - 0.02, z + sa * rad * 0.62, a, rad * 0.72, 0.024)


def fallen_vault(x, z, y, seed=0):
    """Where the roof came down: blocks in a heap with a broken rib lying across them, and the ground around it dusty and pale."""
    rng = random.Random(seed + 7)
    for k in range(22):
        a, d = rng.uniform(0, math.tau), rng.uniform(0, 2.3) ** 1.1
        s = rng.uniform(0.2, 0.62) * (1.2 - d / 3.2)
        n = (math.cos(a + k), 0.0, math.sin(a + k))
        u = (n[2], 0.0, -n[0])
        obox(rng.choice(('cata_block', 'cata_wall3', 'cata_wall2')), (x + math.cos(a) * d, y + s * 0.55 + max(0.0, 1.05 - d) * 0.7, z + math.sin(a) * d), u, n, s * rng.uniform(0.9, 1.4), s * 0.55, s, 1.8)
    for s, h in ((-1, 0.5), (1, 1.5)):
        a = 0.7 + s * 0.3 + seed
        tube('cata_block', [(x + math.cos(a) * 2.6 * k, y + h * (1 - abs(k)) + 0.4, z + math.sin(a) * 2.6 * k) for k in (-1, -0.5, 0, 0.5, 1)], 0.22, ref=(0.0, 1.0, 0.0), sides=6)
    pool_of_light(x, z, y, 4.2, (0.05, 0.042, 0.03))
    W.collide(x - 1.3, z - 1.3, x + 1.3, z + 1.3, 1.6)


def glow_v(x, y, z, nx, nz, h=2.6, w=1.3):
    """His mark, burning on a wall, from y up: what you walk towards. Red, because it's the one place red belongs."""
    sx, sz = -nz, nx
    ox, oz = x + nx * 0.3, z + nz * 0.3   # (clear of the wall's mouldings, or they cut it in two)
    for s in (-1, 1):
        for g, tint in ((h * 0.055, (1.1, 0.075, 0.03)), (h * 0.2, (0.24, 0.016, 0.008))):
            tx0, tz0 = ox + sx * s * w, oz + sz * s * w
            W.glowquad((ox - sx * g, y, oz - sz * g), (ox + sx * g, y, oz + sz * g), (tx0 + sx * g, y + h, tz0 + sz * g), (tx0 - sx * g, y + h, tz0 - sz * g), 100, (0, 0, 1, 1), tint)
    W.light(x + nx * 1.2, y + h * 0.5, z + nz * 1.2, (1.0, 0.13, 0.07), 6.0, 8.0, 0.25)


def spawn(x, z, which=None, yaw=None, y=None):
    W.spawns.append({'x': round(x, 2), 'z': round(z, 2), 'yaw': round(R.uniform(0, 6.28) if yaw is None else yaw, 3), 'which': (R.randint(1, 6) if which is None else which)})


def below():
    W.zone = 'deep'
    # ---- the long stair: from the office door, east and down, four flights with a landing between each. ----
    x = OFFICE_X + 0.6
    y = CHANCEL
    w = 4.2
    hw = w / 2
    run_corridor((OFFICE_X, 0.0), (x, 0.0), 2.2, y, y, 2.4, 3.4, 'wall_ashlar', 'wall_ashlar', 'wall_ashlar', ribs=0)
    # (from the door's width out to the stair's)
    wall('wall_ashlar', (x, -hw), (x, hw), y, y + 6.4, [arch_op(hw, 2.2, y, y + 2.4, y + 3.4)], inward=(x + 2, 0.0))
    W.zone = 'deep'
    flights = 4
    steps = 20
    land = 3.2
    names = ['vel_a_0', 'vel_b_1', 'vel_c_0']
    W.light(x + 4.0, y + 0.0, 0.0, (1.0, 0.6, 0.3), 12.0, 10.0, 0.6)
    stair_walls = (('cata_block', 'cata_wall3'), ('cata_wall3', 'cata_wall'), ('cata_wall', 'cata_wall4'), ('cata_wall4', 'cata_block'))
    torch(x + 5.0, y + 0.2, hw, 0.0, -1.0, i=8.0)
    for f in range(flights):
        x1 = x + steps * RUN
        y1 = y - steps * RISE
        run_corridor((x, 0.0), (x1, 0.0), w, y, y1, 4.2, 6.2, stair_walls[f], ('cata_floor2', 'cata_floor3'), 'cata_roof', ribs=2.5, bay=3.3, trim='cata_block')
        sw = 1 if f % 2 else -1
        for e, side in ((0.2, -sw), (0.5, sw), (0.8, -sw)):
            torch(x + (x1 - x) * e, y + (y1 - y) * e + 2.6, side * (hw - 0.3), 0.0, -side, i=6.0, r=9.0)
        x = x1
        y = y1
        if f < flights - 1:
            run_corridor((x, 0.0), (x + land, 0.0), w, y, y, 4.2, 6.2, 'cata_wall4', 'cata_floor3', 'cata_roof', ribs=1.6, trim='cata_block')
            torch(x + land / 2, y + 2.6, hw, 0.0, -1.0, i=10.0)
            torch(x + land / 2, y + 2.6, -hw, 0.0, 1.0, i=10.0)
            banner(names[f], x + land / 2, y + 4.0, -hw, 0.0, 1.0, 3.2, 0.16)
            x += land
    Y1 = y
    # ---- Stage I, the Bell Crypt: where the stair lets out. Arrive; see the way on, north. ----
    cx, cz = x + 12.0, 0.0
    poly = ngon(cx, cz, 13.0, 8, math.pi / 8)
    # Edges of this octagon: pick by which way each faces.
    def facing(poly, dx, dz):
        best, bi = -9, 0
        c = (sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly))
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            m = ((a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1])
            l = math.hypot(*m)
            d = (m[0] * dx + m[1] * dz) / l
            if d > best:
                best, bi = d, i
        return bi
    w_i, n_i, s_i = facing(poly, -1, 0), facing(poly, 0, -1), facing(poly, 0, 1)
    apothem = 13.0 * math.cos(math.pi / 8)
    # The stair's foot, up to the octagon's west face.
    run_corridor((x, 0.0), (cx - apothem, 0.0), w, Y1, Y1, 4.2, 6.2, 'cata_wall', 'cata_floor', 'cata_roof', ribs=1.5, trim='cata_block')
    door_ops = {
        w_i: [gate(poly[w_i], poly[(w_i + 1) % 8], w, 4.2, 6.2, Y1)],
        n_i: [gate(poly[n_i], poly[(n_i + 1) % 8], 6.0, 4.0, 6.5, Y1)],
        s_i: [gate(poly[s_i], poly[(s_i + 1) % 8], 3.4, 2.8, 4.2, Y1)],
    }
    room(poly, Y1, 7.0, 10.0, ('cata_wall', 'cata_wall3', 'cata_rubble', 'cata_wall3'), ('cata_floor', 'cata_floor3'), 'cata_roof', dado=('candles', 'cata_wall4', 'cata_block', 'candles', 'cata_wall4'), ops=door_ops, inner='cata_floor4', trim='cata_block', rib='cata_block', boss=False)
    corona(cx, cz, Y1 + 5.0, Y1 + 9.7, 2.2, 9, 26.0, 15.0)
    for k in range(6):
        a = (k + 0.5) / 6 * math.tau
        grave(cx + math.cos(a) * 9.2, cz + math.sin(a) * 9.2, Y1, -math.sin(a), math.cos(a), 0.95, 0.45)
    for sx, sz in ((6.3, 9.0), (6.3, -9.0), (-10.0, 7.5), (-10.0, -7.5)):
        candelabra(cx + sx, cz + sz, Y1)
    # In the middle, the first tomb, ringed by candles: the room's point, and something to circle.
    sarcophagus(cx, Y1, cz, True, 'wall_ashlar', 'wall_rough', 1.5, 0.75)
    for k in range(6):
        a = k / 6 * math.tau
        candle_rack(cx + math.cos(a) * 3.2, cz + math.sin(a) * 3.2, Y1, 4, 0.3)
    W.light(cx, Y1 + 3.5, cz, (1.0, 0.6, 0.3), 24.0, 40.0, 0.6)
    a, b = poly[n_i], poly[(n_i + 1) % 8]
    for s in (-1, 1):
        mx = (a[0] + b[0]) / 2 + s * 4.2
        torch(mx, Y1 + 3.4, (a[1] + b[1]) / 2, 0.0, 1.0, i=20.0)
    for i in (w_i + 2, w_i - 2 + 8):
        i %= 8
        if i in door_ops:
            continue
    for i in range(8):
        if i in door_ops:
            continue
        a, b = poly[i], poly[(i + 1) % 8]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        d = unit((cx - m[0], 0.0, cz - m[1]))
        torch(m[0], Y1 + 3.4, m[1], d[0], d[2])
        banner(['vel_a_1', 'vel_b_0', 'vel_c_1', 'vel_d_0', 'vel_a_0'][i % 5], m[0], Y1 + 8.6, m[1], d[0], d[2], 4.2, 0.2)
    for i in range(8):
        if i not in door_ops:
            a, b = poly[i], poly[(i + 1) % 8]
            L_ = math.hypot(b[0] - a[0], b[1] - a[1])
            for e in (0.16, 0.84):
                slit(a, b, L_ * e, Y1 + 3.5, Y1 + 6.6, (cx, cz))
    for a, b in ((-5, -4), (6, 3), (-3, 7)):
        spawn(cx + a, cz + b)
    # ---- South, the Reliquary: a branch that pays. A low door, a short passage, a rich small room. ----
    sa, sb = poly[s_i], poly[(s_i + 1) % 8]
    smz = (sa[1] + sb[1]) / 2
    run_corridor((cx, smz), (cx, smz + 10.0), 3.4, Y1, Y1, 2.8, 4.2, ('cata_wall2', 'cata_rubble'), ('cata_floor2', 'cata_floor4'), 'cata_wall2', ribs=2.0, bay=3.4, trim='cata_block')
    torch(cx + 1.7, Y1 + 2.0, smz + 5.0, -1.0, 0.0, i=6.0, r=8.0)
    relc = (cx, smz + 10.0 + 7.0 * math.cos(math.pi / 6))
    rel = ngon(relc[0], relc[1], 7.0, 6, 0.0)
    rn = facing(rel, 0, -1)
    room(rel, Y1, 5.0, 8.5, ('skulls3', 'skulls2', 'cata_blood'), 'cata_floor3', 'cata_roof', dado=('candles_v', 'femurs'), ops={rn: [gate(rel[rn], rel[(rn + 1) % 6], 3.4, 2.8, 4.2, Y1)]}, rib='cata_block', inner='cata_v_floor', inner_tile=8.0, trim='cata_block', ring=0.66)
    for s in (-1, 1):
        candelabra(relc[0] + s * 5.0, relc[1] + 0.8, Y1, i=12.0, r=10.0)
    sarcophagus(relc[0], Y1, relc[1] + 3.2, True, 'wall_ashlar', 'cata_wall2', 1.1, 0.6)
    W.light(relc[0], Y1 + 3.0, relc[1], (1.0, 0.58, 0.3), 13.0, 26.0, 0.4)
    glow_v(relc[0], Y1 + 3.5, relc[1] + 6.02, 0.0, -1.0, 2.8, 1.3)
    banner('vel_b_1', relc[0] + 3.5, Y1 + 5.0, relc[1] + 6.0, 0.0, -1.0, 3.6, 0.22)
    banner('vel_d_0', relc[0] - 3.5, Y1 + 5.0, relc[1] + 6.0, 0.0, -1.0, 3.6, 0.22)
    spawn(relc[0] - 3.0, relc[1] - 1.5)
    spawn(relc[0] + 3.0, relc[1] - 1.5)
    # ---- North, the Gallery of the Poor: a long hall of niches with an ossuary branch off the middle. ----
    na, nb = poly[n_i], poly[(n_i + 1) % 8]
    nz = (na[1] + nb[1]) / 2
    G_L = 42.0
    side_op = arch_op(G_L / 2, 3.6, Y1, Y1 + 3.0, Y1 + 4.6)
    gx = cx
    CUB = (17.49, 31.49)   # (metres along the gallery to the two side chambers' doors, in the middle of their bays)
    cub_ops = [arch_op(t, 2.8, Y1, Y1 + 2.6, Y1 + 3.8) for t in CUB]
    run_corridor((gx, nz), (gx, nz - G_L), 6.0, Y1, Y1, 4.0, 6.5, ('cata_wall3', 'niches', 'cata_rubble', 'niches', 'cata_wall', 'cata_wall4'), ('cata_bones', 'cata_floor3', 'cata_floor2', 'cata_earth', 'cata_floor', 'cata_floor3'), 'cata_roof',
                 dado=('skulls3', 'cata_block', 'cata_wall4', 'femurs', 'cata_block', 'skulls'), ribs=7.0, bay=7.0, ops_r=[side_op], ops_l=cub_ops, trim='cata_block')
    # The graves themselves, tier on tier, in every bay that isn't a door or a banner.
    for sign, z0, z1 in ((1, -12.5, -18.64), (1, -19.36, -25.64), (1, -26.36, -31.0), (1, -35.0, -39.64), (1, -40.36, -46.64), (-1, -19.36, -25.64), (-1, -33.36, -39.64)):
        loculi((gx + sign * 3.0, z0), (gx + sign * 3.0, z1), Y1 + 0.18, (gx, z0), rows=4, h=2.9, seed=int(z0) * sign)
    for sign, gz in ((1, -13.4), (-1, -19.0), (1, -26.0), (-1, -33.0), (-1, -40.0), (1, -47.0), (-1, -52.5)):
        candelabra(gx + sign * 2.15, gz, Y1, i=13.0, r=10.0)
    for gz in (-15.5, -22.5, -29.5, -36.5, -43.5, -50.5):
        grave(gx, gz, Y1, 0.0, -1.0)
    for sign, gz, h in ((1, -19.0, 3.1), (-1, -26.0, 2.5), (1, -40.0, 3.1), (-1, -47.0, 2.5)):
        sconce(gx + sign * 2.48, Y1 + h, gz, -sign, 0.0)
    # Coffins that never got a grave, stacked at the door.
    for k, (m, dz) in enumerate((('wood_c1', 0.0), ('wood_b1', 0.05), ('wood_a1', -0.08))):
        bx(m, gx - 2.3, Y1 + 0.26 + k * 0.5, -15.5 + dz, 0.36, 0.24, 1.05, 1.4)
        bx(m, gx - 2.3, Y1 + 0.5 + k * 0.5, -15.5 + dz, 0.28, 0.03, 0.95, 1.4)
    W.collide(gx - 2.68, -16.6, gx - 1.92, -14.4, 1.6)
    portcullis(gx - 2.5, gx + 2.5, -53.95, Y1 + 3.3, Y1 + 6.3)
    shaft(gx, -33.0, Y1, Y1 + 6.3, 0.62, i=22.0)
    for t, s in ((7, 1), (12, -1), (18, 1), (25, -1), (30, 1), (35, -1), (38, 1)):
        spawn(gx + s * 1.6, nz - t)
    for k, gz in enumerate((-15.5, -50.5)):
        banner(['vel_c_0', 'vel_b_1'][k], gx - 3.0, Y1 + 5.2, gz, 1.0, 0.0, 3.4, 0.2)
    # Two side chambers off the gallery's west wall, the way a family bought a room: one a tomb, one where the bones were stacked when the tiers ran out.
    for k, t in enumerate(CUB):
        cz0 = nz - t
        run_corridor((gx - 3.0, cz0), (gx - 4.0, cz0), 2.8, Y1, Y1, 2.6, 3.8, 'cata_wall3', 'cata_floor3', 'cata_wall3', ribs=0)
        xw, xe = gx - 10.0, gx - 4.0
        cub = [(xw, cz0 - 3.0), (xe, cz0 - 3.0), (xe, cz0 + 3.0), (xw, cz0 + 3.0)]
        cub_door = arch_op(3.0, 2.8, Y1, Y1 + 2.6, Y1 + 3.8)
        if k == 0:
            back = recess_op(3.0, Y1, 3.0)
            room(cub, Y1, 3.2, 5.2, 'cata_wall4', 'cata_floor3', 'cata_roof', dado='cata_rubble', ops={1: [cub_door], 3: [back]}, rib='cata_block', trim='cata_block', inner='cata_floor4', ring=0.5)
            arcosolium(cub[3], cub[0], back, (xe, cz0), Y1, seed=11, lit=True)
            glow_v(xw + 0.0, Y1 + 3.4, cz0, 1.0, 0.0, 1.5, 0.75)
            sarcophagus((xw + xe) / 2, Y1, cz0, False, 'wall_ashlar', 'cata_rubble', 0.9, 1.2)
            candelabra(xe - 0.8, cz0 + 2.4, Y1, i=16.0, r=11.0)
            candelabra(xw + 0.9, cz0 + 2.4, Y1, i=9.0, r=8.0)
            heap(xw + 1.0, cz0 - 2.0, Y1, 9, 0.5)
            spawn(xw + 1.2, cz0 - 1.6)
        else:
            room(cub, Y1, 3.2, 5.2, ('femurs', 'skulls3'), ('cata_earth', 'cata_bones'), 'cata_roof', dado=('skulls2', 'skulls'), ops={1: [cub_door]}, rib='cata_wall2', trim='cata_wall2', inner='cata_earth', ring=0.5)
            for hx_, hz_ in ((1.0, -2.1), (1.0, 2.1), (2.9, -2.2), (2.9, 2.2), (0.8, 0.2)):
                heap(xw + hx_, cz0 + hz_, Y1, 16, 0.7, seed=k)
            candelabra(xw + 3.2, cz0 + 2.2, Y1, i=11.0, r=9.0)
            bx('cata_block', xw + 0.55, Y1 + 0.5, cz0, 0.5, 0.5, 1.0, 2.0)
            for j in range(5):
                skull(xw + 1.1, Y1, cz0 + (j - 2) * 0.38, 1.0, 0.0, 0.11)
                skull(xw + 0.5, Y1 + 1.0, cz0 + (j - 2) * 0.38, 1.0, 0.0, 0.11)
            floor_candles(xw + 1.5, cz0 - 1.3, Y1, 5, lit=True)
            floor_candles(xw + 1.5, cz0 + 1.3, Y1, 5)
            glow_v(xw, Y1 + 1.9, cz0, 1.0, 0.0, 2.2, 1.0)
            W.collide(xw, cz0 - 1.0, xw + 1.05, cz0 + 1.0, 1.0)
            spawn(xw + 3.0, cz0 - 1.4)
    # (East side, x+, is which of run_corridor's walls? Going north, its right hand faces east.)
    OZ = nz - G_L / 2
    oss_x = gx + 3.0 + 8.0
    run_corridor((gx + 3.0, OZ), (oss_x, OZ), 3.6, Y1, Y1, 3.0, 4.6, ('cata_rubble', 'cata_wall2'), ('cata_floor4', 'cata_floor2'), 'cata_wall2', ribs=2.0, bay=4.0, trim='cata_block')
    oss = [(oss_x, OZ - 7.0), (oss_x + 3.0, OZ - 10.0), (oss_x + 13.0, OZ - 10.0), (oss_x + 16.0, OZ - 7.0), (oss_x + 16.0, OZ + 7.0), (oss_x + 13.0, OZ + 10.0), (oss_x + 3.0, OZ + 10.0), (oss_x, OZ + 7.0)]
    oss_ops = {7: [arch_op(7.0, 3.6, Y1, Y1 + 3.0, Y1 + 4.6)], 1: [recess_op(2.0, Y1, 2.4), recess_op(8.0, Y1, 2.4)], 3: [recess_op(7.0, Y1, 2.6)], 5: [recess_op(2.0, Y1, 2.4), recess_op(8.0, Y1, 2.4)]}
    room(oss, Y1, 5.2, 9.0, ('skulls2', 'cata_wall4', 'femurs', 'cata_wall4', 'skulls3', 'cata_wall4', 'femurs', 'cata_wall4'), ('cata_bones', 'cata_floor3', 'cata_earth', 'cata_floor3'), 'cata_roof', dado=('femurs', 'cata_block', 'skulls3', 'cata_block', 'skulls', 'cata_block', 'femurs', 'cata_block'), ops=oss_ops, rib='cata_block', trim='cata_block', inner='cata_floor4', boss=False)
    for i, ol in oss_ops.items():
        for k, op in enumerate(ol):
            if op.get('blocked'):
                arcosolium(oss[i], oss[(i + 1) % 8], op, (oss_x + 8.0, OZ), Y1, mat='cata_rubble', seed=i * 3 + k, lit=(i + k) % 2 == 0)
    # Skulls set out along the angled walls on stone shelves: a wall of faces.
    for i in (0, 2, 4, 6):
        a, b = oss[i], oss[(i + 1) % 8]
        L, ux, uz, nx, nz2 = wall_frame(a, b, (oss_x + 8.0, OZ))
        for hy in (1.15, 1.95, 2.75):
            c = (a[0] + ux * L / 2 + nx * 0.14, Y1 + hy - 0.05, a[1] + uz * L / 2 + nz2 * 0.14)
            obox('cata_block', c, (ux, 0.0, uz), (nx, 0.0, nz2), L / 2, 0.05, 0.16)
            for k in range(int(L / 0.31)):
                t = (k + 0.5) * L / int(L / 0.31)
                skull(a[0] + ux * t + nx * 0.16, Y1 + hy, a[1] + uz * t + nz2 * 0.16, nx, nz2, 0.1)
    corona(oss_x + 8.0, OZ, Y1 + 5.0, Y1 + 8.8, 2.0, 8, 24.0, 15.0)
    # The room's reason: an altar built of the dead, between two piers faced in them.
    ax_, az_ = oss_x + 13.0, OZ
    bx('cata_block', ax_, Y1 + 0.3, az_, 1.3, 0.3, 1.8, 2.0)
    bx('cata_block', ax_ + 0.1, Y1 + 0.85, az_, 1.05, 0.25, 1.5, 2.0)
    bx('wall_ashlar', ax_ + 0.15, Y1 + 1.14, az_, 0.95, 0.04, 1.4, 2.0)
    for lvl, (lx, ly, n_) in enumerate(((-1.34, 0.02, 11), (-1.1, 0.62, 9), (-0.82, 1.18, 7))):
        for k in range(n_):
            skull(ax_ + lx, Y1 + ly, az_ + (k - (n_ - 1) / 2) * 0.3, -1.0, 0.0, 0.11)
    for s in (-1, 1):
        skull_column(ax_, az_ + s * 3.3, Y1)
        floor_candles(ax_ - 2.0, az_ + s * 2.2, Y1, 5, lit=s > 0)
    tube('iron', [(ax_ + 0.6, Y1 + 3.5, az_ - 0.75), (ax_ + 0.6, Y1 + 1.2, az_), (ax_ + 0.6, Y1 + 3.5, az_ + 0.75)], 0.07, ref=(1.0, 0.0, 0.0), sides=5)
    for s in (-1, 0, 1):
        candle(ax_ + 0.1, Y1 + 1.2, az_ + s * 0.6, 0.2)
    W.collide(ax_ - 1.3, az_ - 1.8, ax_ + 1.3, az_ + 1.8, 1.3)
    W.light(ax_ - 1.0, Y1 + 2.2, az_, (1.0, 0.56, 0.26), 8.0, 14.0, 0.8)
    for sx, sz in ((2.4, -8.0), (13.6, -8.0), (2.4, 8.0), (13.6, 8.0)):
        candelabra(oss_x + sx, OZ + sz, Y1, i=11.0, r=9.0)
    for k, (dx, dz) in enumerate(((5, -5), (11, 5), (5, 5), (11, -5))):
        sarcophagus(oss_x + dx, Y1, OZ + dz, True, 'wall_rough', 'cata_wall')
    for s in (-1, 1):
        torch(oss_x + 8.0, Y1 + 3.6, OZ + s * 10.0, 0.0, -s, c=(1.0, 0.68, 0.34), i=12.0, r=13.0, out=2.2)
        torch(oss_x + 16.0, Y1 + 3.6, OZ + s * 4.0, -1.0, 0.0, c=(1.0, 0.68, 0.34), i=12.0, r=13.0, out=2.2)
    for dx, dz in ((3, 0), (8, 2), (10.2, -1.6), (8, -7)):
        spawn(oss_x + dx, OZ + dz)
    # ---- Stage II: the Sexton's Stair, north and down, to the Hall of the Founders. ----
    sz0 = nz - G_L
    Y2 = Y1 - 8.0
    sz1 = sz0 - 16.0
    run_corridor((gx, sz0), (gx, sz1), 5.0, Y1, Y2, 4.0, 6.5, ('cata_rubble', 'cata_wall2', 'cata_wall4'), ('cata_floor2', 'cata_floor'), 'cata_roof', ribs=2.5, bay=5.4, trim='cata_block')
    torch(gx - 2.5, Y1 - 1.2, sz0 - 4.0, 1.0, 0.0, c=(1.0, 0.45, 0.2))
    torch(gx + 2.5, Y2 + 3.2, sz1 + 4.0, -1.0, 0.0, c=(1.0, 0.45, 0.2))
    HR = 18.0
    hallc = (gx, sz1 - HR * math.cos(math.pi / 8))
    hall = ngon(hallc[0], hallc[1], HR, 8, math.pi / 8)
    hs, he = facing(hall, 0, 1), facing(hall, 1, 0)
    hall_ops = {hs: [gate(hall[hs], hall[(hs + 1) % 8], 5.0, 4.0, 6.5, Y2)], he: [gate(hall[he], hall[(he + 1) % 8], 7.0, 4.6, 7.2, Y2)]}
    for i in range(8):
        if i not in hall_ops:
            hL = math.hypot(hall[(i + 1) % 8][0] - hall[i][0], hall[(i + 1) % 8][1] - hall[i][1])
            hall_ops[i] = [recess_op(hL * 0.2, Y2, 2.6), recess_op(hL * 0.8, Y2, 2.6)]
    room(hall, Y2, 9.0, 18.0, ('cata_wall', 'cata_wall3', 'cata_rubble', 'cata_wall4'), ('cata_floor3', 'cata_floor', 'cata_floor4', 'cata_floor2'), 'cata_roof', dado=('panel', 'cata_block', 'cata_wall4', 'cata_block'), rib='cata_block', ops=hall_ops, trim='cata_block', inner='cata_v_floor', inner_tile=11.0, ring=0.52, boss=False)
    for i, ol in hall_ops.items():
        for k, op in enumerate(ol):
            if op.get('blocked'):
                arcosolium(hall[i], hall[(i + 1) % 8], op, hallc, Y2, seed=i * 5 + k, lit=(i + k) % 2 == 0)
    # The Founders' Tomb: a stepped mound of stone with their coffin on top, a landmark the whole room turns round.
    tx, tz = hallc
    for k, (r, h) in enumerate(((5.2, 0.5), (4.3, 0.5), (3.4, 0.5))):
        bx('cata_block', tx, Y2 + 0.25 + k * 0.5, tz, r, 0.25, r, 3.0)
    sarcophagus(tx, Y2 + 1.5, tz, True, 'wall_ashlar', 'wall_ashlar', 1.9, 0.95)
    W.collide(tx - 5.2, tz - 5.2, tx + 5.2, tz + 5.2, 3.0)
    for s in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        px, pz = tx + s[0] * 9.0, tz + s[1] * 9.0
        lathe('cata_block', px, pz, [(0.9, Y2), (0.72, Y2 + 0.5), (0.62, Y2 + 0.8), (0.62, Y2 + 8.0), (0.9, Y2 + 9.0)], 12)
        W.collide(px - 0.75, pz - 0.75, px + 0.75, pz + 0.75)
        torch(px - s[0] * 0.62, Y2 + 3.2, pz - s[1] * 0.62, -s[0] * 0.7, -s[1] * 0.7, c=(1.0, 0.42, 0.2), i=14.0, r=16.0)
    W.light(tx, Y2 + 7.0, tz, (1.0, 0.5, 0.26), 30.0, 90.0, 0.2)
    W.light(tx, Y2 + 3.8, tz, (1.0, 0.62, 0.32), 13.0, 32.0, 0.5)
    # A light well falling on the Founders, the first thing you see from the stair's foot, and chained cages on the way to it.
    shaft(tx, tz, Y2 + 1.52, Y2 + 17.7, 1.1, tint=(0.045, 0.037, 0.027), i=70.0)
    for sx, sz in ((-13.0, 8.0), (-13.0, -8.0), (13.0, -10.5), (4.2, -15.0), (-4.2, -15.0), (12.5, 10.5), (-4.2, 14.6), (4.2, 14.6)):
        candelabra(tx + sx, tz + sz, Y2, h=2.5, i=16.0, r=13.0)
    lane(tx, tz + 16.2, tx, tz + 5.4, Y2, 1.5)
    fallen_vault(tx - 11.5, tz - 11.0, Y2, 1)
    for s in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        px, pz = tx + s[0] * 5.6, tz + s[1] * 5.6
        chain(px, pz, Y2 + 5.6, Y2 + 16.2)
        lathe('iron', px, pz, [(0.0, Y2 + 3.7), (0.3, Y2 + 3.72), (0.34, Y2 + 3.76)], 8)
        lathe('iron', px, pz, [(0.34, Y2 + 5.1), (0.18, Y2 + 5.5), (0.03, Y2 + 5.62)], 8)
        for k in range(8):
            a = k / 8 * math.tau
            tube('iron', [(px + math.cos(a) * 0.34, Y2 + 3.74, pz + math.sin(a) * 0.34), (px + math.cos(a) * 0.36, Y2 + 4.4, pz + math.sin(a) * 0.36), (px + math.cos(a) * 0.34, Y2 + 5.12, pz + math.sin(a) * 0.34)], 0.012, sides=4)
        skull(px, Y2 + 3.76, pz, -s[0], -s[1], 0.11)
    for k in range(8):
        a = (k + 0.5) / 8 * math.tau
        grave(tx + math.cos(a) * 7.0, tz + math.sin(a) * 7.0, Y2, -math.sin(a), math.cos(a), 1.0, 0.46)
    for s in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        candle_rack(tx + s[0] * 2.9, tz + s[1] * 2.6, Y2 + 1.5, 5, 0.3)
    def brazier(x, z, y=Y2, i=24.0, c=(1.0, 0.52, 0.22)):
        lathe('iron', x, z, [(0.42, y), (0.1, y + 0.12), (0.08, y + 0.8), (0.5, y + 1.0), (0.56, y + 1.2)], 8)
        for k in range(7):
            a = k * 2.4
            r = 0.1 + 0.05 * k
            flame(x + math.cos(a) * r, y + 1.1, z + math.sin(a) * r, 0.1 - 0.008 * k)
        W.collide(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 1.2)
        W.light(x, y + 2.0, z, c, 16.0, i, 1.0)
    def ruin(x, z, y=Y2, n=9, spread=1.5, column=True):
        rng = random.Random(int(x * 13 + z * 7))
        for k in range(n):
            s = rng.uniform(0.12, 0.42)
            bx('cata_wall2', x + rng.uniform(-spread, spread), y + s * 0.6, z + rng.uniform(-spread, spread), s * rng.uniform(0.8, 1.5), s * 0.6, s, 2.0)
        if column:
            h = rng.uniform(1.6, 3.2)
            lathe('cata_wall', x, z, [(0.8, y), (0.62, y + 0.45), (0.56, y + 0.7), (0.56, y + h), (0.3, y + h + 0.1)], 10)
            W.collide(x - 0.65, z - 0.65, x + 0.65, z + 0.65, h)
    brazier(tx - 8.0, tz + 12.0 - 13.0 - 3.0)
    brazier(tx + 3.0, tz + 12.0)
    brazier(tx + 12.0, tz - 7.0)
    ruin(tx - 13.0, tz + 3.0, column=False)
    ruin(tx + 11.5, tz + 6.5, column=False)
    ruin(tx + 2.0, tz - 13.0)
    ruin(tx - 8.0, tz + 11.5)
    ruin(tx + 13.5, tz - 5.0)
    ruin(tx + 7.0, tz - 14.0, column=False)
    ruin(tx + 6.0, tz + 14.0, column=False)
    ruin(tx - 15.0, tz - 3.0, column=False)
    sarcophagus(tx - 12.0, Y2, tz - 6.0, False, 'wall_ashlar', 'wall_rough')
    sarcophagus(tx + 10.5, Y2, tz + 9.5, True, 'wall_ashlar', 'wall_rough')
    for k in range(4):
        a = (k + 0.5) / 4 * math.tau
        W.light(tx + math.cos(a) * 11.0, Y2 + 4.0, tz + math.sin(a) * 11.0, (1.0, 0.5, 0.22), 15.0, 18.0, 0.8)
    for i in range(8):
        if i in (hs, he):
            continue
        a, b = hall[i], hall[(i + 1) % 8]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        d = unit((tx - m[0], 0.0, tz - m[1]))
        banner(['vel_d_0', 'vel_a_1', 'vel_c_1', 'vel_b_0', 'vel_d_1', 'vel_a_0'][i % 6], m[0], Y2 + 9.5, m[1], d[0], d[2], 6.0, 0.25)
    for a, b in ((-9, 2), (-3, -10), (4, -11), (10, -4), (9, 6), (-10, -6), (-6, 10), (7, 11), (0, 12)):
        spawn(tx + a, tz + b)
    # ---- Stage III: the Abbots' Gallery east, tombs down each side, into the round Tomb at the end. ----
    ax0 = tx + HR * math.cos(math.pi / 8)
    AL = 26.0
    ab_ops = [recess_op(t, Y2, 2.5) for t in (9.3, 17.3)]
    run_corridor((ax0, tz), (ax0 + AL, tz), 7.0, Y2, Y2, 4.6, 7.2, ('cata_wall2', 'cata_rubble', 'cata_wall3'), ('cata_floor', 'cata_floor4', 'cata_floor3'), ('seep'), dado=('cata_block', 'panel2', 'cata_wall4'), ribs=4.3, bay=8.667, ops_l=ab_ops, ops_r=ab_ops, trim='cata_block')
    for s in (-1, 1):
        for k, op in enumerate(ab_ops):
            arcosolium((ax0, tz + s * 3.5), (ax0 + AL, tz + s * 3.5), op, (ax0 + AL / 2, tz), Y2, seed=k + s, lit=(k + s) % 2 == 0)
    for t in (9.3, 17.3):
        grave(ax0 + t, tz, Y2, 1.0, 0.0)
    bone_chandelier(ax0 + 13.0, tz, Y2 + 3.7, Y2 + 7.1)
    for s in (-1, 1):
        candelabra(ax0 + 1.6, tz + s * 3.0, Y2, i=12.0, r=10.0)
        candelabra(ax0 + AL - 1.4, tz + s * 3.0, Y2, i=12.0, r=10.0)

    W.light(ax0 + 1.0, Y2 + 3.0, tz, (1.0, 0.55, 0.28), 13.0, 22.0, 0.6)
    for t in (5.0, 13.0, 21.0):
        for s in (-1, 1):
            sarcophagus(ax0 + t, Y2, tz + s * 2.5, True, 'wall_ashlar', 'wall_rough', 1.2, 0.5)
            torch(ax0 + t + 2.5, Y2 + 3.2, tz + s * 3.5, 0.0, -s, c=(1.0, 0.4, 0.2))
    for t, s in ((3.0, 0.4), (9.0, -0.6), (17.0, 0.5), (24.0, -0.3)):
        spawn(ax0 + t, tz + s)
    TR = 15.0
    tombc = (ax0 + AL + TR * math.cos(math.pi / 16), tz)
    tomb = ngon(tombc[0], tombc[1], TR, 16, math.pi / 16)
    tw = facing(tomb, -1, 0)
    room(tomb, Y2, 7.5, 15.5, ('cata_blood', 'cata_rubble', 'blood_v', 'cata_rubble'), ('cata_floor3', 'cata_floor'), 'cata_roof', dado=('cata_block', 'candles_v', 'cata_block', 'cata_blood'), rib='cata_block', trim='cata_block',
         ops={tw: [gate(tomb[tw], tomb[(tw + 1) % 16], 5.6, 4.6, 7.2, Y2)]}, inner='cata_v_floor', inner_tile=13.0, ring=0.56)
    corona(tombc[0] - 3.5, tombc[1], Y2 + 6.0, Y2 + 15.0, 2.6, 10, 40.0, 18.0)
    for a in (0.72, -0.72, 1.75, -1.75, 2.5, -2.5):
        candelabra(tombc[0] + math.cos(a) * 12.4, tombc[1] + math.sin(a) * 12.4, Y2, h=2.6, i=18.0, r=13.0)
    # (a door narrower than the gallery, so its shoulders need closing)
    for s in (-1, 1):
        W.quad('cata_wall2', (ax0 + AL, Y2, tz + s * 2.8), (ax0 + AL, Y2, tz + s * 3.5), (ax0 + AL, Y2 + 9.0, tz + s * 3.5), (ax0 + AL, Y2 + 9.0, tz + s * 2.8), ((0, 3), (0.2, 3), (0.2, 0), (0, 0)))
    # The end of it all. Three steps up, the last abbot's tomb, and at his head an empty stone throne, under a V that burns.
    tcx, tcz = tombc
    for s in (-1, 1):
        a = s * 0.46
        banner('vel_c_1', tcx + math.cos(a) * 14.35, Y2 + 12.0, tcz + math.sin(a) * 14.35, -math.cos(a), -math.sin(a), 9.0, 0.2)
    for k, (hx_, hz_) in enumerate(((3.4, 4.0), (2.85, 3.4), (2.3, 2.8))):
        bx('cata_block', tcx + 7.0, Y2 + 0.3 + k * 0.6, tcz, hx_, 0.3, hz_, 2.6)
    sarcophagus(tcx + 7.0, Y2 + 1.8, tcz, False, 'wall_ashlar', 'cata_block', 1.1, 2.2)
    W.collide(tcx + 3.6, tcz - 4.0, tcx + 10.4, tcz + 4.0, 3.2)
    tx_ = tcx + 11.6
    bx('cata_block', tx_, Y2 + 0.6, tcz, 1.5, 0.6, 2.0, 2.6)
    bx('cata_block', tx_ + 0.1, Y2 + 1.55, tcz, 0.95, 0.35, 1.05, 2.6)
    for s in (-1, 1):
        bx('cata_block', tx_ - 0.02, Y2 + 2.3, tcz + s * 1.0, 0.85, 0.42, 0.2, 2.6)
    bx('cata_block', tx_ + 0.95, Y2 + 3.8, tcz, 0.25, 2.6, 1.15, 2.6)
    tube('cata_block', [(tx_ + 0.9, Y2 + 9.4, tcz - 2.1), (tx_ + 0.9, Y2 + 6.2, tcz), (tx_ + 0.9, Y2 + 9.4, tcz + 2.1)], 0.28, ref=(1.0, 0.0, 0.0), sides=6)
    # Finials on the throne's shoulders, and iron stakes round the dais with what was left on them.
    for s in (-1, 1):
        lathe('cata_block', tx_ + 0.95, tcz + s * 1.15, [(0.3, Y2 + 1.2), (0.26, Y2 + 6.4), (0.36, Y2 + 6.6), (0.14, Y2 + 7.0), (0.0, Y2 + 8.2)], 8)
        for dx_ in (-3.2, 3.2):
            sx_, sz_ = tcx + 7.0 + dx_, tcz + s * 3.8
            lathe('iron', sx_, sz_, [(0.07, Y2 + 0.6), (0.05, Y2 + 2.8), (0.0, Y2 + 4.6)], 5)
            skull(sx_, Y2 + 3.55, sz_, -1.0, 0.0, 0.14)
        lathe('cata_block', tcx + 7.0, tcz + s * 2.0, [(0.16, Y2 + 1.8), (0.13, Y2 + 2.9), (0.2, Y2 + 3.0), (0.0, Y2 + 3.5)], 6)
        skull(tcx + 5.5, Y2 + 1.8, tcz + s * 1.3, -1.0, 0.0, 0.14)
    W.collide(tx_ - 1.5, tcz - 2.0, tx_ + 1.5, tcz + 2.0, 6.0)
    vx = tcx + 14.0
    for s in (-1, 1):
        for w_, tint in ((0.42, (1.1, 0.075, 0.03)), (1.5, (0.24, 0.016, 0.008))):
            # (each stroke of the V, top to bottom, the thin hot one inside a wide dull one)
            topz, botz = tcz + s * 4.0, tcz
            W.glowquad((vx, Y2 + 5.4, botz - w_), (vx, Y2 + 5.4, botz + w_), (vx, Y2 + 13.2, topz + w_), (vx, Y2 + 13.2, topz - w_), 100, (0, 0, 1, 1), tint)
    W.light(tcx + 12.4, Y2 + 8.0, tcz, (1.0, 0.13, 0.07), 10.0, 26.0, 0.25)
    W.light(tcx + 8.6, Y2 + 4.4, tcz - 2.6, (1.0, 0.55, 0.28), 7.5, 22.0, 0.5)
    shaft(tcx + 7.0, tcz, Y2 + 1.82, Y2 + 13.7, 0.9, i=46.0)
    lane(tcx - 14.4, tcz, tcx + 3.5, tcz, Y2, 1.9)
    for k in range(12):
        a = k / 12 * math.tau
        px, pz = tombc[0] + math.cos(a) * 13.5, tombc[1] + math.sin(a) * 13.5
        if k in (5, 6, 7):
            continue
        d = (-math.cos(a), -math.sin(a))
        torch(tombc[0] + math.cos(a) * 14.6, Y2 + 4.0, tombc[1] + math.sin(a) * 14.6, d[0], d[1], c=(1.0, 0.42, 0.2), i=7.0, r=12.0)
    W.light(tombc[0] + 7.0, Y2 + 5.0, tombc[1], (1.0, 0.56, 0.32), 20.0, 40.0, 0.3)
    W.light(tombc[0] + 6.0, Y2 + 2.6, tombc[1], (1.0, 0.45, 0.25), 11.0, 40.0, 0.3)
    # The way on is always red: his colour, in the mouth of each door that goes deeper, and the Tomb at the end of them.
    lantern(186.2, -14.5, Y1 + 4.2, Y1 + 6.4)
    lantern(186.2, -52.0, Y1 + 4.0, Y1 + 6.4)
    lantern(186.2, -71.0, Y2 + 4.2, Y2 + 6.4)
    lantern(205.2, tz, Y2 + 4.8, Y2 + 7.1)
    lantern(226.8, tz, Y2 + 4.8, Y2 + 7.1)
    # Bones, where the dead lay before they got up.
    def bones(x, z, y, n=5):
        r2 = random.Random(int(x * 31 + z * 17))
        for k in range(n):
            long_bone(x + r2.uniform(-0.8, 0.8), y, z + r2.uniform(-0.8, 0.8), r2.uniform(0, math.pi), r2.uniform(0.28, 0.46))
        a = r2.uniform(0, math.tau)
        skull(x + r2.uniform(-0.5, 0.5), y, z + r2.uniform(-0.5, 0.5), math.cos(a), math.sin(a), r2.uniform(0.09, 0.115))
    r3 = random.Random(11)
    def scatter(cx0, cz0, inner, outer, y, n, rub):
        for k in range(n):
            a, r = r3.uniform(0, math.tau), r3.uniform(inner, outer)
            x, z = cx0 + math.cos(a) * r, cz0 + math.sin(a) * r
            bones(x, z, y)
            pool_of_light(x, z, y, 2.6, (0.06, 0.04, 0.024))
            if k % rub == 0:
                ruin(x + 0.8, z - 0.5, y=y, n=4, spread=0.6, column=False)
    scatter(tx, tz, 6.5, 15.0, Y2, 14, 2)
    scatter(tombc[0], tombc[1], 4.0, 12.5, Y2, 12, 2)
    scatter(186.2, 0.0, 4.0, 11.5, Y1, 8, 3)
    scatter(205.0, -33.0, 2.0, 9.0, Y1, 7, 3)
    for gz in (-19.0, -32.0, -44.0):
        bones(186.2 - 1.6, gz, Y1, 4)
        bones(186.2 + 1.6, gz + 5.0, Y1, 4)
    # Stone standing proud of the walls, so they read as bays and not one long sheet.
    for gz in (-19.0, -26.0, -33.0, -40.0, -47.0):
        for s in (-1, 1):
            if gz != -33.0 or s < 0:    # (east of there is the Ossuary's door)
                bx('cata_wall2', 186.2 + s * 2.76, Y1 + 2.0, gz, 0.26, 2.0, 0.36)
    # The rooms' edges have fire too, so a body in a far corner can be counted.
    for s in (-1, 1):
        brazier(tx + 15.5, tz + s * 5.0, i=18.0)
    W.light(186.2, Y1 + 4.0, 26.0, (1.0, 0.62, 0.34), 11.0, 26.0, 0.4)
    W.light(179.0, Y1 + 3.5, 7.0, (1.0, 0.62, 0.34), 10.0, 18.0, 0.5)
    # What's come down off the walls.
    rng = random.Random(7)
    for gz in (-16.0, -21.5, -30.0, -36.0, -47.0, -49.0):
        ruin(186.2 + rng.choice((-1, 1)) * 2.2, gz, y=Y1, n=4, spread=0.4, column=False)
    for ox, oz in ((202.0, -29.0), (208.5, -36.0), (213.0, -30.5), (199.5, -38.0)):
        ruin(ox, oz, y=Y1, n=6, spread=0.9, column=False)
    for s in (-1, 1):
        brazier(186.2 + s * 4.6, -9.0, y=Y1)
        brazier(186.2 + s * 2.2, -52.6, y=Y1, i=16.0)
        brazier(186.2 + s * 6.5, -72.5, i=20.0)
    ruin(195.5, 7.0, y=Y1)
    ruin(195.0, -7.0, y=Y1)
    ruin(177.5, 9.5, y=Y1, column=False)
    brazier(tombc[0] + 5.5, tombc[1] - 5.2, c=(1.0, 0.25, 0.14))
    brazier(tombc[0] + 5.5, tombc[1] + 5.2, c=(1.0, 0.25, 0.14))
    for k, a in enumerate((2.2, 2.6, 3.5, 4.15, 0.9, 5.4)):
        px, pz = tombc[0] + math.cos(a) * 8.6, tombc[1] + math.sin(a) * 8.6
        ruin(px, pz, n=6, spread=1.1, column=k in (4, 5))
    for k in range(10):
        a = (k + 0.5) / 10 * math.tau
        if math.cos(a) < 0.2:
            spawn(tombc[0] + math.cos(a) * (6.0 + (k % 3) * 2.2), tombc[1] + math.sin(a) * (6.0 + (k % 3) * 2.2))
    for dz in (-9.0, 9.0):
        spawn(tombc[0] + 6.0, tombc[1] + dz)
    # Each room burns its own colour, so you know from the light alone where you've got to. (His red, and the wells' ash, stay as they are.)
    def hue(x, z, y):
        if x < 172.0: return (1.0, 0.6, 0.3)              # the stair: plain tallow
        if z > 13.0: return (1.0, 0.78, 0.56)             # the Reliquary: good wax
        if y > -20.0 and x < 183.0 and z < -13.0: return (0.9, 0.8, 0.42)   # the side chambers: tallow gone sour
        if y > -20.0 and x > 197.0 and z < -13.0: return (1.0, 0.86, 0.68)  # the Ossuary: pale, the colour of what's in it
        if y > -20.0 and z < -13.0: return (1.0, 0.68, 0.36)  # the Gallery: ochre
        if x > 229.0: return (1.0, 0.5, 0.26)             # the Tomb
        if x > 203.0: return (1.0, 0.42, 0.17)            # the Abbots': copper
        if y < -16.0: return (1.0, 0.54, 0.26)            # the Hall: ember
        return (1.0, 0.64, 0.32)                          # the Crypt: amber
    for L in W.lights:
        x_, y_, z_ = L['p']
        if y_ < 3.0 and x_ > 126.0 and L['c'][1] > 0.2 and L['c'][2] < 0.56 and L['c'][0] > 0.95:
            L['c'] = list(hue(x_, z_, y_))
    return Y1, Y2


def stair_cover():
    """Where the stair's vault would stand out of the hill: a stone hood, sloped into the ground."""
    W.zone = 'cath'
    x0, x1 = OFFICE_X + 1.0, OFFICE_X + 32.0
    top0, top1 = CHANCEL + 7.6, F0 - 2.0
    for s in (-1, 1):
        W.quad('wall_rough', (x0, F0 - 2.0, s * 9.0), (x1, F0 - 2.0, s * 9.0), (x1, top1, 0.0), (x0, top0, 0.0), ((0, 3), (9, 3), (9, 0), (0, 0)))
    # The office's own shell and roof.
    hz = 7.0
    wall('wall_rough', (XE + 1, -hz), (OFFICE_X + 1.0, -hz), F0 - 1.0, F0 + 8.0, inward=(120, 0))
    wall('wall_rough', (XE + 1, hz), (OFFICE_X + 1.0, hz), F0 - 1.0, F0 + 8.0, inward=(120, 0))
    wall('wall_rough', (OFFICE_X + 1.0, -hz), (OFFICE_X + 1.0, hz), F0 - 1.0, F0 + 8.0, [arch_op(hz, 2.2, CHANCEL, CHANCEL + 2.4, CHANCEL + 3.4)], inward=(120, 0))
    for s in (-1, 1):
        W.quad('roof', (XE + 1.0, F0 + 7.6, s * (hz + 0.8)), (OFFICE_X + 1.6, F0 + 7.6, s * (hz + 0.8)), (OFFICE_X + 1.6, F0 + 12.5, 0.0), (XE + 1.0, F0 + 12.5, 0.0), ((0, 2), (3, 2), (3, 0), (0, 0)))


def compose():
    cathedral()
    office()
    stair_cover()
    Y1, Y2 = below()
    return Y1, Y2


def build():
    Y1, Y2 = compose()
    # Into its own scene, so nothing else open in this Blender is touched.
    scene = bpy.data.scenes.new('BM_Interior')
    objs = []
    tris = 0
    for (zone, mat), m in W.mats.items():
        verts = [(p[0], -p[2], p[1]) for p in m['p']]
        faces = [(i, i + 1, i + 2) for i in range(0, len(verts), 3)]
        me = bpy.data.meshes.new(f'{zone}|{mat}')
        me.from_pydata(verts, [], faces)
        uv = me.uv_layers.new(name='UVMap')
        for i, loop in enumerate(me.loops):
            u, v = m['uv'][loop.vertex_index]
            uv.data[i].uv = (u, 1 - v)
        me.update()
        me.normals_split_custom_set_from_vertices([(n[0], -n[2], n[1]) for n in m['n']])
        mt = bpy.data.materials.get(mat) or bpy.data.materials.new(mat)
        me.materials.append(mt)
        ob = bpy.data.objects.new(f'{zone}|{mat}', me)
        scene.collection.objects.link(ob)
        objs.append(ob)
        tris += len(faces)
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    prev = win.scene
    win.scene = scene
    try:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        out = os.path.join(OUT, 'interior.glb')
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_image_format='NONE', export_texcoords=True, export_normals=True, export_materials='EXPORT', export_apply=False, export_yup=True)
    finally:
        win.scene = prev
    for o in objs:
        me = o.data
        bpy.data.objects.remove(o)
        bpy.data.meshes.remove(me)
    bpy.data.scenes.remove(scene)
    # Floors, most specific first: the first one that holds a point is the ground there.
    data = {'f0': F0, 'y1': Y1, 'y2': Y2, 'colliders': W.colliders, 'floors': W.floors, 'lights': W.lights, 'spawns': W.spawns, 'glow': W.glow}
    with open(os.path.join(OUT, 'interior.json'), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'{len(objs)} parts, {tris} tris, {len(W.colliders)} colliders, {len(W.floors)} floors, {len(W.lights)} lights, {len(W.spawns)} zombies, {len(W.glow) // 9 // 6} cards, glb {os.path.getsize(out) / 1048576:.2f} MB, Y1 {Y1} Y2 {Y2}')
