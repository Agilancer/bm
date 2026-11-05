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


def torch(x, y, z, nx, nz, c=(1.0, 0.55, 0.22), i=16.0, r=13.0):
    bx('iron', x + nx * 0.08, y - 0.1, z + nz * 0.08, 0.05 + abs(nx) * 0.08, 0.05, 0.05 + abs(nz) * 0.08)
    lathe('iron', x + nx * 0.2, z + nz * 0.2, [(0.03, y - 0.42), (0.04, y - 0.1), (0.1, y), (0.11, y + 0.06)], 6)
    flame(x + nx * 0.2, y + 0.04, z + nz * 0.2, 0.09)
    wash(x, y + 0.3, z, nx, nz, 2.1, (0.2, 0.095, 0.035))
    W.light(x + nx * 0.5, y + 0.25, z + nz * 0.5, c, r, i, 1.0)


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
        W.glowquad(fa, fb, fc, fd, idx, p['uv'], (1.1, 1.05, 0.95))
        # The shaft itself, hardly there: dust in the light between glass and floor.
        for s0, s1 in ((0.0, 0.5), (0.5, 1.0)):
            mid0, mid1 = lerp(A, B, s0), lerp(A, B, s1)
            top0, top1 = lerp(D, C, s0), lerp(D, C, s1)
            W.glowquad(lerp(mid0, fall(top0), 0.92), lerp(mid1, fall(top1), 0.92), top1, top0, 100, (0, 0, 1, 1), (0.05, 0.043, 0.03))


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
    floor_rect('wood_a3', 102.5, -ZS, XE, ZS, CHANCEL, tile=2.2)
    W.floor(102.5, -ZS, XE + 0.95, ZS, CHANCEL)
    # Walls: the side walls carry the windows, the arcade running under them.
    panes = ['glass_a', 'glass_b', 'glass_c', 'glass_d', 'glass_e']
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
            glass_pane(f'{panes[i]}_{k}', a, b, o['t'], sill, glass_h, 0.55, inside, sun if side > 0 else None)
            # (A window throws its colour even where the sun isn't on it.)
            col = (0.55, 0.62, 1.0) if k == 0 else (1.0, 0.25, 0.2)
            W.light(XW + o['t'], F0 + 6.0, z - side * 2.5, col, 15.0, 9.0 if k == 0 else 5.0)
        W.collide(XW - 1, z, XE + 1, z + side)
    # The west front: great door and the rose above it.
    a, b = (XW, -ZS), (XW, ZS)
    door = arch_op(ZS, 4.6, F0, F0 + 4.8, F0 + 7.6)
    rose = round_op(ZS, F0 + 12.1, 4.3)
    ops = [door, rose]
    wall('wall_ashlar', a, b, F0, wall_top, ops, inward=inside)
    # Out in front the wall runs up into the gable.
    gable = lambda t: wall_top + (1 - abs(t - 15.0) / 15.0) * 11.0
    wall('wall_rough', (XW - 1, -15.0), (XW - 1, 15.0), F0 - 1.0, gable, [arch_op(15.0, 4.6, F0, F0 + 4.8, F0 + 7.6), round_op(15.0, F0 + 12.1, 4.3)], inward=(XW + 5, 0.0))
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
    rs = 4.42
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
            bx('iron', XW + 1.0, F0 + yb, s * 2.3, 0.95, 0.05, 0.03)
        W.collide(XW, s * 2.2, XW + 2.2, s * 2.45, 7.0)
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
    names = ['tess_a_0', 'tess_b_0', 'tess_c_1', 'tess_d_0', 'tess_a_1', 'tess_b_1', 'tess_c_0', 'tess_d_1']
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
    for s in (-1, 1):
        bx('wood_b3', px + 1.6, y + 0.95, s * 1.15, 0.5, 0.95, 0.06)  # the stair rail, with chevrons
    # Candle stands either side, the rail in front of them, and the great banners on the wall.
    for s in (-1, 1):
        for zz in (4.5, 8.5, 11.5):
            candle_rack(XE - 3.2, s * zz, CHANCEL)
        W.light(XE - 3.0, CHANCEL + 2.0, s * 7.5, (1.0, 0.68, 0.36), 13.0, 22.0, 0.5)
        banner('tess_a_0' if s < 0 else 'tess_a_1', XE - 0.3, CHANCEL + 16.0, s * 8.0, -1.0, 0.0, 12.5, 0.0)
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
    bx('gold', XW - 1.1, wall_top + 12.0, 0.0, 0.05, 0.05, 0.45)
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
    floor_rect('wood_c3', x0, -hz, x1, hz, y, tile=2.4)
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
    W.light(dx + 0.5, y + 1.6, dz + 0.1, (1.0, 0.68, 0.34), 10.0, 7.0, 0.3)
    W.light(x0 + 2.0, y + 3.8, 2.0, (1.0, 0.6, 0.3), 12.0, 7.0, 0.2)
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


def run_corridor(a, b, w, ya, yb, spring, apex, wall_mat, floor_mat, roof_mat, dado=None, ribs=4.0, ops_l=(), ops_r=(), tile_floor=None, stairs=False):
    """An axis-aligned passage from a to b, its floor from ya to yb: straight walls, a pointed barrel, ribs. ops are openings in its left and right walls."""
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
        if dado:
            wall(dado, p0, p1, lambda t: fy(t) - 0.6, lambda t: fy(t) + 2.6, ops, inward=inward)
            wall(wall_mat, p0, p1, lambda t: fy(t) + 2.6, lambda t: fy(t) + spring + 0.02, ops, inward=inward)
        else:
            wall(wall_mat, p0, p1, lambda t: fy(t) - 0.6, lambda t: fy(t) + spring + 0.02, ops, inward=inward)
        gaps = sorted((o['t'] - o['w'] / 2, o['t'] + o['w'] / 2) for o in ops)
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
            tube(wall_mat, pts, 0.14, ref=(ux, 0.0, uz))
            for s in (-1, 1):
                q = P(t, s, 0)
                tube(wall_mat, [(q[0] - nx * s * 0.02, fy(t), q[2] - nz * s * 0.02), (q[0] - nx * s * 0.02, fy(t) + spring, q[2] - nz * s * 0.02)], 0.13, ref=(ux, 0.0, uz))
    # The floor.
    if ya == yb:
        tf = TILE_M[floor_mat]
        x0, x1 = min(a[0] - nx * hw, b[0] + nx * hw, a[0] + nx * hw), max(a[0] - nx * hw, b[0] + nx * hw, a[0] + nx * hw, b[0] - nx * hw)
        z0, z1 = min(a[1] - nz * hw, b[1] + nz * hw, a[1] + nz * hw), max(a[1] - nz * hw, b[1] + nz * hw, a[1] + nz * hw, b[1] - nz * hw)
        floor_rect(floor_mat, x0, z0, x1, z1, ya)
        W.floor(x0, z0, x1, z1, ya)
    else:
        n = int(round(abs(yb - ya) / RISE))
        for i in range(n):
            t0, t1 = i * L / n, (i + 1) * L / n
            y = ya + (yb - ya) * (i + 1) / n
            tf = TILE_M[floor_mat]
            A, B = P(t0, -1, y), P(t0, 1, y)
            C, D = P(t1, 1, y), P(t1, -1, y)
            up = (0.0, 1.0, 0.0)
            W.quad(floor_mat, A, B, C, D, ((A[0] / tf, A[2] / tf), (B[0] / tf, B[2] / tf), (C[0] / tf, C[2] / tf), (D[0] / tf, D[2] / tf)), (up, up, up, up))
            E, F = P(t0, -1, y - (yb - ya) / n), P(t0, 1, y - (yb - ya) / n)
            face = (-ux, 0.0, -uz)
            W.quad(floor_mat, A, B, F, E, ((0, 0), (w / tf, 0), (w / tf, RISE / tf), (0, RISE / tf)), (face, face, face, face))
        x0, x1 = sorted((a[0] + nx * hw, b[0] - nx * hw))
        z0, z1 = sorted((a[1] + nz * hw, b[1] - nz * hw))
        axis = 'x' if abs(ux) > 0.5 else 'z'
        lo, hi = (ya, yb) if ((a[0] if axis == 'x' else a[1]) < (b[0] if axis == 'x' else b[1])) else (yb, ya)
        W.floor(x0, z0, x1, z1, lo, hi, axis)


def room(poly, y, spring, apex, wall_mat, floor_mat, roof_mat, dado=None, ops=None, rib=None, floor_tile=None, ribs=True):
    """A many-sided room with a star vault. ops: edge index to openings. Polygons run any way round."""
    ops = ops or {}
    cx = sum(p[0] for p in poly) / len(poly)
    cz = sum(p[1] for p in poly) / len(poly)
    rib = rib or wall_mat
    tf = floor_tile or TILE_M[floor_mat]
    tr = TILE_M[roof_mat]
    up = (0.0, 1.0, 0.0)
    ys, ya = y + spring, y + apex
    N = len(poly)
    RINGS = 7
    for i in range(N):
        a, b = poly[i], poly[(i + 1) % N]
        W.tri(floor_mat, ((a[0], y, a[1]), (b[0], y, b[1]), (cx, y, cz)), ((a[0] / tf, a[1] / tf), (b[0] / tf, b[1] / tf), (cx / tf, cz / tf)), (up, up, up))
        o = ops.get(i, [])
        if dado:
            wall(dado, a, b, y, y + 3.0, o, inward=(cx, cz))
            wall(wall_mat, a, b, y + 3.0, ys + 2.0, o, inward=(cx, cz))
        else:
            wall(wall_mat, a, b, y, ys + 2.0, o, inward=(cx, cz))
        for op in o:
            wall_op_trim(rib, a, b, op, (cx, cz), 0.16)
        # Collision: the wall, a metre thick, with gaps at its openings.
        dx, dz = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dz)
        ux, uz = dx / L, dz / L
        nx, nz = -uz, ux
        if (cx - a[0]) * nx + (cz - a[1]) * nz > 0:
            nx, nz = -nx, -nz
        t0 = 0.0
        for g0, g1 in sorted((op['t'] - op['w'] / 2, op['t'] + op['w'] / 2) for op in o) + [(L, L)]:
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
    torch(x + 5.0, y + 0.2, hw, 0.0, -1.0, i=8.0)
    for f in range(flights):
        x1 = x + steps * RUN
        y1 = y - steps * RISE
        run_corridor((x, 0.0), (x1, 0.0), w, y, y1, 4.2, 6.2, 'panel', 'cata_floor2', 'cata_roof', ribs=2.5)
        x = x1
        y = y1
        if f < flights - 1:
            run_corridor((x, 0.0), (x + land, 0.0), w, y, y, 4.2, 6.2, 'cata_wall', 'cata_floor', 'cata_roof', ribs=1.6)
            torch(x + land / 2, y + 2.6, hw, 0.0, -1.0)
            torch(x + land / 2, y + 2.6, -hw, 0.0, 1.0)
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
    run_corridor((x, 0.0), (cx - apothem, 0.0), w, Y1, Y1, 4.2, 6.2, 'cata_wall', 'cata_floor', 'cata_roof', ribs=1.5)
    door_ops = {
        w_i: [gate(poly[w_i], poly[(w_i + 1) % 8], w, 4.2, 6.2, Y1)],
        n_i: [gate(poly[n_i], poly[(n_i + 1) % 8], 6.0, 4.0, 6.5, Y1)],
        s_i: [gate(poly[s_i], poly[(s_i + 1) % 8], 3.4, 2.8, 4.2, Y1)],
    }
    room(poly, Y1, 7.0, 13.0, 'cata_wall', 'cata_floor', 'cata_roof', dado='candles', ops=door_ops)
    # In the middle, the first tomb, ringed by candles: the room's point, and something to circle.
    sarcophagus(cx, Y1, cz, True, 'wall_ashlar', 'wall_rough', 1.5, 0.75)
    for k in range(6):
        a = k / 6 * math.tau
        candle_rack(cx + math.cos(a) * 3.2, cz + math.sin(a) * 3.2, Y1, 4, 0.3)
    W.light(cx, Y1 + 2.5, cz, (1.0, 0.55, 0.25), 16.0, 18.0, 0.6)
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
    for a, b in ((-5, -4), (6, 3), (-3, 7)):
        spawn(cx + a, cz + b)
    # ---- South, the Reliquary: a branch that pays. A low door, a short passage, a rich small room. ----
    sa, sb = poly[s_i], poly[(s_i + 1) % 8]
    smz = (sa[1] + sb[1]) / 2
    run_corridor((cx, smz), (cx, smz + 10.0), 3.4, Y1, Y1, 2.8, 4.2, 'cata_wall2', 'cata_floor2', 'cata_wall2', ribs=2.0)
    torch(cx + 1.7, Y1 + 2.0, smz + 5.0, -1.0, 0.0, i=6.0, r=8.0)
    relc = (cx, smz + 10.0 + 7.0 * math.cos(math.pi / 6))
    rel = ngon(relc[0], relc[1], 7.0, 6, 0.0)
    rn = facing(rel, 0, -1)
    room(rel, Y1, 5.0, 8.5, 'skulls2', 'cata_v_floor', 'cata_roof', dado='candles_v', ops={rn: [gate(rel[rn], rel[(rn + 1) % 6], 3.4, 2.8, 4.2, Y1)]}, rib='wall_ashlar')
    sarcophagus(relc[0], Y1, relc[1] + 1.5, True, 'wood_a1', 'wood_b2', 1.1, 0.6)
    W.light(relc[0], Y1 + 3.0, relc[1], (1.0, 0.3, 0.18), 13.0, 30.0, 0.4)
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
    run_corridor((gx, nz), (gx, nz - G_L), 6.0, Y1, Y1, 4.0, 6.5, 'niches', 'cata_bones', 'cata_roof', dado='skulls', ribs=4.2, ops_r=[side_op])
    t = 3.0
    side = 1
    while t < G_L - 2:
        if abs(t - G_L / 2) > 3:
            torch(gx + side * 3.0, Y1 + 3.3, nz - t, -side, 0.0, c=(0.8, 0.95, 0.5), i=7.0, r=10.0)
        t += 6.0
        side = -side
    for t, s in ((7, 1), (12, -1), (18, 1), (25, -1), (30, 1), (35, -1), (38, 1)):
        spawn(gx + s * 1.6, nz - t)
    for k, t in enumerate((9.0, 33.0)):
        banner(['vel_c_0', 'vel_b_1'][k], gx - 3.0, Y1 + 5.2, nz - t, 1.0, 0.0, 3.4, 0.2)
    # (East side, x+, is which of run_corridor's walls? Going north, its right hand faces east.)
    OZ = nz - G_L / 2
    oss_x = gx + 3.0 + 8.0
    run_corridor((gx + 3.0, OZ), (oss_x, OZ), 3.6, Y1, Y1, 3.0, 4.6, 'cata_wall2', 'cata_floor2', 'cata_wall2', ribs=2.0)
    oss = [(oss_x, OZ - 7.0), (oss_x + 3.0, OZ - 10.0), (oss_x + 13.0, OZ - 10.0), (oss_x + 16.0, OZ - 7.0), (oss_x + 16.0, OZ + 7.0), (oss_x + 13.0, OZ + 10.0), (oss_x + 3.0, OZ + 10.0), (oss_x, OZ + 7.0)]
    room(oss, Y1, 5.2, 9.0, 'skulls2', 'cata_bones', 'cata_roof', dado='skulls', ops={7: [arch_op(7.0, 3.6, Y1, Y1 + 3.0, Y1 + 4.6)]}, rib='cata_wall2')
    for k, (dx, dz) in enumerate(((5, -5), (11, 5), (5, 5), (11, -5))):
        sarcophagus(oss_x + dx, Y1, OZ + dz, True, 'wall_rough', 'cata_wall')
    W.light(oss_x + 8.0, Y1 + 4.0, OZ, (0.7, 0.95, 0.45), 18.0, 30.0, 0.4)
    for s in (-1, 1):
        torch(oss_x + 8.0, Y1 + 3.2, OZ + s * 10.0, 0.0, -s, c=(0.8, 0.95, 0.5))
        torch(oss_x + 16.0, Y1 + 3.2, OZ + s * 4.0, -1.0, 0.0, c=(0.8, 0.95, 0.5))
    for dx, dz in ((3, 0), (8, 2), (13, -1), (8, -7)):
        spawn(oss_x + dx, OZ + dz)
    # ---- Stage II: the Sexton's Stair, north and down, to the Hall of the Founders. ----
    sz0 = nz - G_L
    Y2 = Y1 - 8.0
    sz1 = sz0 - 16.0
    run_corridor((gx, sz0), (gx, sz1), 5.0, Y1, Y2, 4.0, 6.5, 'panel2', 'cata_floor2', 'cata_roof', ribs=2.5)
    torch(gx - 2.5, Y1 - 1.2, sz0 - 4.0, 1.0, 0.0, c=(1.0, 0.45, 0.2))
    torch(gx + 2.5, Y2 + 3.2, sz1 + 4.0, -1.0, 0.0, c=(1.0, 0.45, 0.2))
    HR = 18.0
    hallc = (gx, sz1 - HR * math.cos(math.pi / 8))
    hall = ngon(hallc[0], hallc[1], HR, 8, math.pi / 8)
    hs, he = facing(hall, 0, 1), facing(hall, 1, 0)
    room(hall, Y2, 9.0, 18.0, 'cata_wall', 'cata_v_floor', 'cata_roof', dado='panel', floor_tile=5.0, rib='wall_ashlar', ops={
        hs: [gate(hall[hs], hall[(hs + 1) % 8], 5.0, 4.0, 6.5, Y2)], he: [gate(hall[he], hall[(he + 1) % 8], 7.0, 4.6, 7.2, Y2)]})
    # The Founders' Tomb: a stepped mound of stone with their coffin on top, a landmark the whole room turns round.
    tx, tz = hallc
    for k, (r, h) in enumerate(((5.2, 0.5), (4.3, 0.5), (3.4, 0.5))):
        bx('wall_rough', tx, Y2 + 0.25 + k * 0.5, tz, r, 0.25, r, 3.0)
    sarcophagus(tx, Y2 + 1.5, tz, True, 'wall_ashlar', 'wall_ashlar', 1.9, 0.95)
    W.collide(tx - 5.2, tz - 5.2, tx + 5.2, tz + 5.2, 3.0)
    for s in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        px, pz = tx + s[0] * 9.0, tz + s[1] * 9.0
        lathe('cata_wall', px, pz, [(0.9, Y2), (0.72, Y2 + 0.5), (0.62, Y2 + 0.8), (0.62, Y2 + 8.0), (0.9, Y2 + 9.0)], 12)
        W.collide(px - 0.75, pz - 0.75, px + 0.75, pz + 0.75)
        torch(px - s[0] * 0.62, Y2 + 3.2, pz - s[1] * 0.62, -s[0] * 0.7, -s[1] * 0.7, c=(1.0, 0.42, 0.2), i=14.0, r=16.0)
    W.light(tx, Y2 + 7.0, tz, (1.0, 0.42, 0.22), 26.0, 34.0, 0.2)
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
    run_corridor((ax0, tz), (ax0 + AL, tz), 7.0, Y2, Y2, 4.6, 7.2, 'cata_wall2', 'cata_floor', 'seep', dado='panel2', ribs=4.3)
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
    room(tomb, Y2, 7.5, 15.5, 'blood_v', 'cata_v_floor', 'cata_roof', dado='candles_v', floor_tile=6.0, rib='wall_rough',
         ops={tw: [gate(tomb[tw], tomb[(tw + 1) % 16], 5.6, 4.6, 7.2, Y2)]})
    # (a door narrower than the gallery, so its shoulders need closing)
    for s in (-1, 1):
        W.quad('cata_wall2', (ax0 + AL, Y2, tz + s * 2.8), (ax0 + AL, Y2, tz + s * 3.5), (ax0 + AL, Y2 + 9.0, tz + s * 3.5), (ax0 + AL, Y2 + 9.0, tz + s * 2.8), ((0, 3), (0.2, 3), (0.2, 0), (0, 0)))
    bigV = PIECE['vel_c_1']
    east = (tombc[0] + TR * 0.97, tombc[1])
    banner('vel_c_1', east[0], Y2 + 13.5, east[1], -1.0, 0.0, 12.0, 0.2)
    bx('wall_rough', tombc[0] + 7.0, Y2 + 0.5, tombc[1], 2.4, 0.5, 3.0)
    sarcophagus(tombc[0] + 7.0, Y2 + 1.0, tombc[1], False, 'wood_a1', 'wall_rough', 1.0, 1.9)
    W.collide(tombc[0] + 4.6, tombc[1] - 3.0, tombc[0] + 9.4, tombc[1] + 3.0, 2.2)
    for k in range(12):
        a = k / 12 * math.tau
        px, pz = tombc[0] + math.cos(a) * 13.5, tombc[1] + math.sin(a) * 13.5
        if k in (5, 6, 7):
            continue
        d = (-math.cos(a), -math.sin(a))
        torch(tombc[0] + math.cos(a) * 14.6, Y2 + 4.0, tombc[1] + math.sin(a) * 14.6, d[0], d[1], c=(1.0, 0.3, 0.16), i=10.0, r=14.0)
    W.light(tombc[0], Y2 + 8.0, tombc[1], (1.0, 0.18, 0.12), 26.0, 30.0, 0.3)
    for k in range(10):
        a = (k + 0.5) / 10 * math.tau
        if math.cos(a) < 0.2:
            spawn(tombc[0] + math.cos(a) * (6.0 + (k % 3) * 2.2), tombc[1] + math.sin(a) * (6.0 + (k % 3) * 2.2))
    for dz in (-9.0, 9.0):
        spawn(tombc[0] + 6.0, tombc[1] + dz)
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
