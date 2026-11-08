"""Builds the village in Blender and exports assets/game/village.glb and village.json.

Run inside Blender (through the Blender MCP or Text Editor):
    exec(open(r"...\\tools\\village\\build_village.py").read()); build()

Everything is authored in game coordinates: x east, y up, z south. Each material's name is the layer it
draws from in assets/game/tex, so the whole village is one vertex buffer and one draw call in the game.
"""
import json
import math
import os
import random

import bpy

ROOT = None
if "__file__" in globals():
    ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROOT = ROOT or r"C:\Users\agila\.codex\.chatgpt-projects\g-p-6acb04ed5a908191836d71a249b8135a\work\bm"

Rng = random.Random(7)


class Builder:
    """Per-material vertex soup, in game coordinates."""

    def __init__(self):
        self.mats = {}

    def tri(self, mat, ps, uvs, normals=None):
        m = self.mats.setdefault(mat, {"p": [], "uv": [], "n": []})
        if normals is None:
            a, b, c = ps
            n = norm(cross(sub(b, a), sub(c, a)))
            normals = (n, n, n)
        m["p"].extend(ps)
        m["uv"].extend(uvs)
        m["n"].extend(normals)

    def quad(self, mat, a, b, c, d, uva=(0, 1), uvb=(1, 1), uvc=(1, 0), uvd=(0, 0), normal=None):
        """Counter-clockwise from the outside: a bottom-left, b bottom-right, c top-right, d top-left."""
        ns = None if normal is None else (normal, normal, normal)
        self.tri(mat, (a, b, c), (uva, uvb, uvc), ns)
        self.tri(mat, (a, c, d), (uva, uvc, uvd), ns)


def sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def scale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def norm(a):
    ln = math.sqrt(a[0] ** 2 + a[1] ** 2 + a[2] ** 2) or 1
    return (a[0] / ln, a[1] / ln, a[2] / ln)


SUMMIT = (-512.0, 166.0, 146.0)       # (x, z, height): the top of the hill, in src/core/terrain.js.
ROAD_SIGN_Y = (0.09, 0.2)


# Every house, and all that's in it, this much bigger on the ground, about its front wall: the doors stay where the lanes reach them, and it
# grows back and to either side. Heights stay. tools/interior/build_interior.py takes it from the homes list, so the insides match.
HOUSE_SCALE = 1.25
# The market stalls: (x, z, yaw), the keeper's side to local +z. The same numbers as `stall` in src/folk/town.js PLACES.
STALLS = ((-6.5, -9.8, 0.08), (6.36, 5.12, 1.249), (-6.8, 4.55, -1.61), (4.33, -6.0, 2.553))


class Frame:
    """A local frame on the ground: local z is the building's front."""

    def __init__(self, x, z, yaw, y=0.0):
        self.x, self.z, self.y, self.yaw = x, z, y, yaw
        self.c, self.s = math.cos(yaw), math.sin(yaw)
        self.k, self.front = 1.0, 0.0     # a house's plan is drawn this much bigger, about its front wall: see HOUSE_SCALE

    def p(self, lx, ly, lz):
        lx, lz = lx * self.k, (lz - self.front) * self.k + self.front
        return (self.x + lx * self.c + lz * self.s, self.y + ly, self.z - lx * self.s + lz * self.c)

    def d(self, lx, ly, lz):
        return (lx * self.c + lz * self.s, ly, -lx * self.s + lz * self.c)


def box(b, f, mat, cx, cy, cz, hx, hy, hz, uv_scale=(1.0, 1.0), grain="y"):
    """A box in frame f. grain picks the local axis the texture's v runs along."""
    ctr = (cx, cy, cz)
    h = (hx, hy, hz)
    axes = [((1, 0, 0), (0, 1, 0), (0, 0, 1)), ((0, 0, -1), (0, 1, 0), (1, 0, 0)), ((-1, 0, 0), (0, 1, 0), (0, 0, -1)),
            ((0, 0, 1), (0, 1, 0), (-1, 0, 0)), ((1, 0, 0), (0, 0, -1), (0, 1, 0)), ((1, 0, 0), (0, 0, 1), (0, -1, 0))]
    us, vs = uv_scale
    off = Rng.random()
    for ax_u, ax_v, ax_n in axes:
        hu = abs(ax_u[0]) * hx + abs(ax_u[1]) * hy + abs(ax_u[2]) * hz
        hv = abs(ax_v[0]) * hx + abs(ax_v[1]) * hy + abs(ax_v[2]) * hz
        hn = abs(ax_n[0]) * hx + abs(ax_n[1]) * hy + abs(ax_n[2]) * hz
        c = (ctr[0] + ax_n[0] * hn, ctr[1] + ax_n[1] * hn, ctr[2] + ax_n[2] * hn)

        def corner(su, sv):
            return f.p(c[0] + ax_u[0] * hu * su + ax_v[0] * hv * sv,
                       c[1] + ax_u[1] * hu * su + ax_v[1] * hv * sv,
                       c[2] + ax_u[2] * hu * su + ax_v[2] * hv * sv)
        long_is_u = hu > hv
        lu, lv = (hv * 2 * us, hu * 2 * vs) if long_is_u else (hu * 2 * us, hv * 2 * vs)
        if long_is_u:
            uvs = [(off, off + lv), (off, off), (off + lu, off), (off + lu, off + lv)]
        else:
            uvs = [(off, off + lv), (off + lu, off + lv), (off + lu, off), (off, off)]
        b.quad(mat, corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), uvs[0], uvs[1], uvs[2], uvs[3], f.d(*ax_n))


def cylinder(b, f, mat, base, top, r0, r1, sides=10, uv=(1.0, 1.0), caps=True, cap_mat=None):
    """A tapered cylinder between local points."""
    axis = norm(sub(top, base))
    up = (0, 0, 1) if abs(axis[2]) < 0.9 else (1, 0, 0)
    u = norm(cross(up, axis))
    v = cross(axis, u)
    length = math.dist(base, top)
    ring = []
    for i in range(sides + 1):
        t = i / sides * math.tau
        ring.append((math.cos(t), math.sin(t)))
    for i in range(sides):
        (c0, s0), (c1, s1) = ring[i], ring[i + 1]
        n0 = add(scale(u, c0), scale(v, s0))
        n1 = add(scale(u, c1), scale(v, s1))
        a = f.p(*add(base, scale(n0, r0)))
        b_ = f.p(*add(base, scale(n1, r0)))
        c = f.p(*add(top, scale(n1, r1)))
        d = f.p(*add(top, scale(n0, r1)))
        u0, u1 = i / sides * uv[0], (i + 1) / sides * uv[0]
        vv = length * uv[1]
        nn0, nn1 = f.d(*n0), f.d(*n1)
        b.tri(mat, (a, b_, c), ((u0, vv), (u1, vv), (u1, 0)), (nn0, nn1, nn1))
        b.tri(mat, (a, c, d), ((u0, vv), (u1, 0), (u0, 0)), (nn0, nn1, nn0))
        if caps:
            cm = cap_mat or mat
            ctr_t = f.p(*top)
            ctr_b = f.p(*base)
            nt, nb = f.d(*axis), f.d(*scale(axis, -1))
            b.tri(cm, (ctr_t, d, c), ((0.5, 0.5), (0.5 + c0 * 0.4, 0.5 + s0 * 0.4), (0.5 + c1 * 0.4, 0.5 + s1 * 0.4)), (nt, nt, nt))
            b.tri(cm, (ctr_b, b_, a), ((0.5, 0.5), (0.5 + c1 * 0.4, 0.5 + s1 * 0.4), (0.5 + c0 * 0.4, 0.5 + s0 * 0.4)), (nb, nb, nb))


def ball(b, f, mat, cx, cy, cz, r, seg=7):
    """A small low-poly sphere with smooth normals."""
    rows = max(3, seg - 2)
    for j in range(rows):
        a0, a1 = j / rows * math.pi, (j + 1) / rows * math.pi
        for i in range(seg):
            t0, t1 = i / seg * math.tau, (i + 1) / seg * math.tau
            def pt(a, t):
                n = (math.sin(a) * math.cos(t), math.cos(a), math.sin(a) * math.sin(t))
                return f.p(cx + n[0] * r, cy + n[1] * r, cz + n[2] * r), f.d(*n)
            (p0, n0), (p1, n1), (p2, n2), (p3, n3) = pt(a0, t0), pt(a0, t1), pt(a1, t1), pt(a1, t0)
            uv = (0.5, 0.5)
            if j > 0:
                b.tri(mat, (p0, p1, p2), (uv, uv, uv), (n0, n1, n2))
            if j < rows - 1:
                b.tri(mat, (p0, p2, p3), (uv, uv, uv), (n0, n2, n3))


def wall(b, f, mat, x0, x1, z, y0, y1, tile_w, v0=0.0, v1=1.0, u_off=0.0, depth_sign=1):
    """A wall in the local plane z, facing +z (or -z with depth_sign -1)."""
    n = f.d(0, 0, depth_sign)
    a = (x0, y0, z)
    c = (x1, y1, z)
    L = abs(x1 - x0)
    u = L / tile_w
    if depth_sign > 0:
        b.quad(mat, f.p(x0, y0, z), f.p(x1, y0, z), f.p(x1, y1, z), f.p(x0, y1, z),
               (u_off, v1), (u_off + u, v1), (u_off + u, v0), (u_off, v0), n)
    else:
        b.quad(mat, f.p(x1, y0, z), f.p(x0, y0, z), f.p(x0, y1, z), f.p(x1, y1, z),
               (u_off, v1), (u_off + u, v1), (u_off + u, v0), (u_off, v0), n)


def side_wall(b, f, mat, z0, z1, x, y0, y1, tile_w, v0=0.0, v1=1.0, u_off=0.0, sign=1):
    """A wall in the local plane x, facing +x (sign 1) or -x (sign -1)."""
    n = f.d(sign, 0, 0)
    L = abs(z1 - z0)
    u = L / tile_w
    if sign > 0:
        b.quad(mat, f.p(x, y0, z1), f.p(x, y0, z0), f.p(x, y1, z0), f.p(x, y1, z1),
               (u_off, v1), (u_off + u, v1), (u_off + u, v0), (u_off, v0), n)
    else:
        b.quad(mat, f.p(x, y0, z0), f.p(x, y0, z1), f.p(x, y1, z1), f.p(x, y1, z0),
               (u_off, v1), (u_off + u, v1), (u_off + u, v0), (u_off, v0), n)


def sag(t, amount):
    return math.sin(t * math.pi) * amount


def roof_slope(b, f, mat, x0, x1, z_eave, y_eave, z_ridge, y_ridge, tile, sag_x, sag_y, segs=(10, 6), under=False):
    """One shingled slope with a slight sag, so it reads as an old roof and not a plane."""
    sx, sy = segs
    pts = []
    uvs = []
    slope_len = math.hypot(z_ridge - z_eave, y_ridge - y_eave)
    for j in range(sy + 1):
        v = j / sy
        row, ruv = [], []
        for i in range(sx + 1):
            u = i / sx
            drop = sag(u, sag_x) * (0.35 + 0.65 * v) + sag(v, sag_y) * (0.5 + 0.5 * sag(u, 1))
            wobble = math.sin(u * 13.1 + v * 7.3) * 0.012
            x = x0 + (x1 - x0) * u
            z = z_eave + (z_ridge - z_eave) * v
            y = y_eave + (y_ridge - y_eave) * v - drop + wobble
            row.append((x, y, z))
            ruv.append((u * abs(x1 - x0) / tile, 1 - v * slope_len / (tile * 1024 / 1792)))
        pts.append(row)
        uvs.append(ruv)
    facing = 1 if z_ridge < z_eave else -1
    if under:
        facing = -facing
    # One normal for the whole slope, so a sag shows in the silhouette and not as blotches of light.
    dz_, dy_ = z_ridge - z_eave, y_ridge - y_eave
    plane = norm(f.d(0, abs(dz_), dy_ * (1 if dz_ < 0 else -1)))
    if under:
        plane = scale(plane, -1)
    for j in range(sy):
        for i in range(sx):
            a, bb, c, d = pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]
            ua, ub, uc, ud = uvs[j][i], uvs[j][i + 1], uvs[j + 1][i + 1], uvs[j + 1][i]
            fa, fb, fc, fd = f.p(*a), f.p(*bb), f.p(*c), f.p(*d)
            if facing > 0:
                b.quad(mat, fa, fb, fc, fd, ua, ub, uc, ud, plane)
            else:
                b.quad(mat, fb, fa, fd, fc, ub, ua, ud, uc, plane)
    return pts


class Scene:
    def __init__(self):
        self.b = Builder()
        self.colliders = []
        self.lights = []
        self.smoke = []
        self.doors = []
        self.fences = []
        self.windows = []
        self.trees = []
        self.homes = []        # what tools/interior/build_interior.py fits out
        self.footprints = []   # where each house stands, for the ground map

    def collider(self, x, z, hx, hz, yaw=0.0, h=4.0):
        self.colliders.append({"x": round(x, 3), "z": round(z, 3), "hx": round(hx, 3), "hz": round(hz, 3), "yaw": round(yaw, 4), "h": h})


def face(b, f, mat, pts, uvs, normal):
    """A flat convex face in frame f, wound so it faces along normal (local), as a fan."""
    n = f.d(*normal)
    ps = [f.p(*p) for p in pts]
    for i in range(1, len(ps) - 1):
        a, c, d = ps[0], ps[i], ps[i + 1]
        ua, uc, ud = uvs[0], uvs[i], uvs[i + 1]
        if sum(x * y for x, y in zip(cross(sub(c, a), sub(d, a)), n)) < 0:
            c, d, uc, ud = d, c, ud, uc
        b.tri(mat, (a, c, d), (ua, uc, ud), (n, n, n))


def prism(b, f, mat, x0, x1, profile, uv=0.45, axis="x"):
    """A convex profile, given as (z, y) (or (x, y) with axis z), drawn out from x0 to x1. Timber cut to fit: a barge board's two halves meet in a true mitre."""
    def at(s, q):
        return (s, q[1], q[0]) if axis == "x" else (q[0], q[1], s)
    sign = 1 if x1 > x0 else -1
    end = (sign, 0, 0) if axis == "x" else (0, 0, sign)
    uvs = [(q[0] * uv, q[1] * uv) for q in profile]
    face(b, f, mat, [at(x1, q) for q in profile], uvs, end)
    face(b, f, mat, [at(x0, q) for q in profile], uvs, scale(end, -1))
    cx = sum(q[0] for q in profile) / len(profile)
    cy = sum(q[1] for q in profile) / len(profile)
    for i in range(len(profile)):
        p, q = profile[i], profile[(i + 1) % len(profile)]
        d = (q[0] - p[0], q[1] - p[1])
        ln = math.hypot(*d) or 1
        nn = (d[1] / ln, -d[0] / ln)
        if nn[0] * (p[0] - cx) + nn[1] * (p[1] - cy) < 0:
            nn = (-nn[0], -nn[1])
        nrm = (0, nn[1], nn[0]) if axis == "x" else (nn[0], nn[1], 0)
        L = abs(x1 - x0) * uv
        face(b, f, mat, [at(x0, p), at(x1, p), at(x1, q), at(x0, q)], [(0, 0), (L, 0), (L, ln * uv), (0, ln * uv)], nrm)


def beam(b, f, mat, p0, p1, w, h, uv=0.4):
    """A square-cut timber from p0 to p1, its top toward the sky."""
    d = norm(sub(p1, p0))
    side = norm(cross(d, (0, 1, 0))) if abs(d[1]) < 0.98 else (1, 0, 0)
    up = cross(side, d)
    if up[1] < 0:
        up = scale(up, -1)
    L = math.dist(p0, p1) * uv
    ring = [add(scale(side, sx * w), scale(up, sy * h)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for i in range(4):
        r0, r1 = ring[i], ring[(i + 1) % 4]
        nrm = norm(add(r0, r1))
        face(b, f, mat, [add(p0, r0), add(p0, r1), add(p1, r1), add(p1, r0)], [(0, 0), (w * 2 * uv, 0), (w * 2 * uv, L), (0, L)], nrm)
    face(b, f, mat, [add(p1, r) for r in ring], [(0, 0), (1, 0), (1, 1), (0, 1)], d)
    face(b, f, mat, [add(p0, r) for r in ring], [(0, 0), (1, 0), (1, 1), (0, 1)], scale(d, -1))


ROOF_TH = 0.15       # how far the shingles stand above the rafters, straight up: so every plane's top meets its neighbour's on the same line as its rafters do


def plane(S, f, mat, pts, tile, sag=0.0, under="wood", rows=5, cols=8):
    """One plane of a roof, through a convex polygon whose first two points are its eave. A sag only ever dips the middle: every edge stays on the line it shares with what it meets."""
    b = S.b
    a = pts[0]
    far = max(pts[2:], key=lambda p: math.dist(p, a))
    n = norm(cross(sub(pts[1], a), sub(far, a)))
    if n[1] < 0:
        n = scale(n, -1)
    e1 = norm(cross((0, 1, 0), n))
    e2 = cross(n, e1)
    if e2[1] < 0:
        e1, e2 = scale(e1, -1), scale(e2, -1)
    off = sum(x * y for x, y in zip(a, n))
    st = [(sum(x * y for x, y in zip(p, e1)), sum(x * y for x, y in zip(p, e2))) for p in pts]
    t0, t1 = min(q[1] for q in st), max(q[1] for q in st)
    levels = sorted(set([round(q[1], 5) for q in st] + [round(t0 + (t1 - t0) * k / rows, 5) for k in range(rows + 1)]))
    def span(t):
        lo, hi = 1e9, -1e9
        m = len(st)
        for i in range(m):
            (s0, u0), (s1, u1) = st[i], st[(i + 1) % m]
            if min(u0, u1) - 1e-4 <= t <= max(u0, u1) + 1e-4:
                if abs(u1 - u0) < 1e-6:
                    lo, hi = min(lo, s0, s1), max(hi, s0, s1)
                else:
                    s = s0 + (s1 - s0) * (t - u0) / (u1 - u0)
                    lo, hi = min(lo, s), max(hi, s)
        return lo, hi
    def point(s, t, s0, s1):
        dip = sag * math.sin(math.pi * (s - s0) / max(s1 - s0, 1e-4)) * math.sin(math.pi * (t - t0) / max(t1 - t0, 1e-4)) if s1 - s0 > 0.3 else 0.0
        p = add(scale(n, off), add(scale(e1, s), scale(e2, t)))
        return (p[0], p[1] - dip, p[2])
    aspect = tile * 1024 / 1792
    for j in range(len(levels) - 1):
        ta, tb = levels[j], levels[j + 1]
        (la, ha), (lb, hb) = span(ta), span(tb)
        for i in range(cols):
            ua, ub = i / cols, (i + 1) / cols
            sa0, sa1, sb0, sb1 = la + (ha - la) * ua, la + (ha - la) * ub, lb + (hb - lb) * ub, lb + (hb - lb) * ua
            q = [point(sa0, ta, la, ha), point(sa1, ta, la, ha), point(sb0, tb, lb, hb), point(sb1, tb, lb, hb)]
            uvs = [(sa0 / tile, 1 - ta / aspect), (sa1 / tile, 1 - ta / aspect), (sb0 / tile, 1 - tb / aspect), (sb1 / tile, 1 - tb / aspect)]
            top = [(p[0], p[1] + ROOF_TH, p[2]) for p in q]
            for mat_, ring, nn in ((mat, top, n), (under, q, scale(n, -1))):
                if mat_:
                    face(b, f, mat_, ring, uvs, nn)
    return n


def cap(S, f, mat, p0, p1, tile, fall, wide=0.23, end=None):
    """Shingles lapped over a ridge or a hip, from p0 to p1 on the roof's top surface. fall is how fast the planes either side drop away from the line."""
    b = S.b
    d = norm(sub(p1, p0))
    side = norm(cross(d, (0, 1, 0)))
    up = norm(cross(side, d))
    if up[1] < 0:
        up = scale(up, -1)
    L = math.dist(p0, p1) / tile
    for s in (1, -1):
        rim = (scale(side, s * wide)[0], -wide * fall + 0.035, scale(side, s * wide)[2])
        crest = scale(up, 0.08)
        ring = [add(p0, rim), add(p1, rim), add(p1, crest), add(p0, crest)]
        nrm = norm(add(scale(side, s), scale(up, 1 + fall)))
        face(b, f, mat, ring, [(0, 0.2), (L, 0.2), (L, 0.09), (0, 0.09)], nrm)
    for at_, nrm in ((p0, scale(d, -1)), (p1, d)):
        rim_l = add(at_, (side[0] * wide, -wide * fall + 0.035, side[2] * wide))
        rim_r = add(at_, (-side[0] * wide, -wide * fall + 0.035, -side[2] * wide))
        face(b, f, "wood", [rim_l, rim_r, add(at_, scale(up, 0.08))], [(0, 0), (0.2, 0), (0.1, 0.1)], nrm)


class Roof:
    """A roof in its own frame R: the ridge along R's x, the walls at x = +-hx and z = +-hz, the rafters leaving the wall tops at ye."""

    def __init__(self, S, R, sp, hx, hz, ye):
        self.S, self.R, self.hx, self.hz, self.ye = S, R, hx, hz, ye
        self.t = math.tan(sp.get("pitch", 52) * math.pi / 180)
        self.mat, self.tile = sp["roof"], sp.get("roof_tile", 3.4)
        self.sag = sp.get("sag", 0.09)
        self.over_x, self.over_z = sp.get("over_x", 0.5), sp.get("over_z", 0.5)
        self.ex, self.ez = hx + self.over_x, hz + self.over_z
        self.ey = ye - self.over_z * self.t
        self.yr = ye + hz * self.t
        self.gable_mat = sp["gable"]
        self.gtile = sp.get("gable_tile", 4.6)

    def y_at(self, z):
        return self.yr - abs(z) * self.t

    def fascia(self, x0, x1, z, y=None):
        """A board along the rafters' ends, under the shingles' edge."""
        b, y = self.S.b, self.ey if y is None else y
        beam(b, self.R, "wood", (x0, y + ROOF_TH / 2 - 0.05, z), (x1, y + ROOF_TH / 2 - 0.05, z), 0.04, ROOF_TH / 2 + 0.05)

    def verge(self, x, sx, z_to=0.0):
        """Barge boards up one end, a pair that meets at the ridge (or stops under a half hip)."""
        b, R = self.S.b, self.R
        tk = 0.07
        for sz in (1, -1):
            e, top = self.ez + 0.02, z_to
            profile = [(sz * e, self.y_at(e) - 0.14), (sz * e, self.y_at(e) + ROOF_TH + 0.05), (sz * top, self.y_at(top) + ROOF_TH + 0.05), (sz * top, self.y_at(top) - 0.14)]
            prism(b, R, "wood", x, x + sx * tk, profile)

    def gable_wall(self, sx, z_top=0.0, x=None, y_top=None):
        """The end wall above the wall plate, closed right up under the rafters. To a point, or level under a half hip."""
        b, R = self.S.b, self.R
        x = sx * self.hx if x is None else x
        hz, ye = self.hz, self.ye
        ax = self.gtile * 1024 / 1792
        yt = self.y_at(z_top) if y_top is None else y_top
        pts = [(x, ye, hz), (x, ye, -hz)] + ([(x, yt, -z_top), (x, yt, z_top)] if z_top > 0 else [(x, yt, 0.0)])
        uvs = [((p[2] + hz) / self.gtile + 0.2, 1 - (p[1] - ye) / ax) for p in pts]
        face(b, R, self.gable_mat, pts, uvs, (sx, 0, 0))
        # The tie at its foot and a king post, standing proud.
        box(b, R, "wood", x + sx * 0.04, ye + 0.03, 0, 0.08, 0.1, hz, uv_scale=(0.9, 0.2))
        box(b, R, "wood", x + sx * 0.04, (ye + yt) / 2, 0, 0.07, (yt - ye) / 2, 0.08, uv_scale=(0.9, 0.3))

    def slopes(self, x0=None, x1=None, cut=()):
        """The two long planes, end to end. cut: cross gables on the front (+z), whose valleys it stops at."""
        S, R, t = self.S, self.R, self.t
        ex, ez, ey, yr = self.ex, self.ez, self.ey, self.yr
        x0 = -ex if x0 is None else x0
        x1 = ex if x1 is None else x1
        plane(S, R, self.mat, [(x1, ey, -ez), (x0, ey, -ez), (x0, yr, 0), (x1, yr, 0)], self.tile, self.sag, cols=max(4, int((x1 - x0) / 1.2)))
        self.fascia(x0, x1, -ez)
        edge = x0
        for xc, A, zr, yc in sorted(cut):
            plane(S, R, self.mat, [(edge, ey, ez), (xc - A, ey, ez), (xc - A, yr, 0), (edge, yr, 0)], self.tile, self.sag, cols=max(3, int((xc - A - edge) / 1.2)))
            self.fascia(edge, xc - A, ez)
            plane(S, R, self.mat, [(xc - A, ey, ez), (xc, yc, zr), (xc, yr, 0), (xc - A, yr, 0)], self.tile, 0.0, rows=3, cols=3)
            plane(S, R, self.mat, [(xc, yc, zr), (xc + A, ey, ez), (xc + A, yr, 0), (xc, yr, 0)], self.tile, 0.0, rows=3, cols=3)
            edge = xc + A
        plane(S, R, self.mat, [(edge, ey, ez), (x1, ey, ez), (x1, yr, 0), (edge, yr, 0)], self.tile, self.sag, cols=max(3, int((x1 - edge) / 1.2)))
        self.fascia(edge, x1, ez)

    def gable(self, cross_gables=()):
        cuts = [self.cross_gable(xc, a) for xc, a in cross_gables]
        self.slopes(cut=cuts)
        ex, yr = self.ex, self.yr
        for sx in (1, -1):
            self.gable_wall(sx)
            self.verge(sx * ex, sx)
        cap(self.S, self.R, self.mat, (-ex - 0.07, yr + ROOF_TH, 0), (ex + 0.07, yr + ROOF_TH, 0), self.tile, self.t)
        return yr

    def hip(self):
        """All four sides slope, at the one pitch. If it's as wide as it's long, that's a pyramid."""
        S, R, t = self.S, self.R, self.t
        self.ex = self.hx + self.over_z
        ex, ez, ey, yr = self.ex, self.ez, self.ey, self.yr
        rx = max(0.0, ex - ez)
        yr = ey + ez * t
        for sx, sz in ((1, -1), (-1, 1)):
            plane(S, R, self.mat, [(sx * ex, ey, sz * ez), (-sx * ex, ey, sz * ez), (-sx * rx, yr, 0), (sx * rx, yr, 0)], self.tile, self.sag, cols=max(4, int(2 * ex / 1.2)))
            self.fascia(-ex, ex, sz * ez)
        for sx in (1, -1):
            plane(S, R, self.mat, [(sx * ex, ey, sx * ez), (sx * ex, ey, -sx * ez), (sx * rx, yr, 0)], self.tile, self.sag * 0.5, rows=4, cols=5)
            beam(S.b, R, "wood", (sx * ex, ey + ROOF_TH / 2 - 0.05, -ez), (sx * ex, ey + ROOF_TH / 2 - 0.05, ez), 0.04, ROOF_TH / 2 + 0.05)
            for sz in (1, -1):
                cap(S, R, self.mat, (sx * ex, ey + ROOF_TH, sz * ez), (sx * rx, yr + ROOF_TH, 0), self.tile, t * 0.72, wide=0.18)
        if rx > 0:
            cap(S, R, self.mat, (-rx - 0.05, yr + ROOF_TH, 0), (rx + 0.05, yr + ROOF_TH, 0), self.tile, t)
        return yr

    def half_hip(self, frac=0.36):
        """A gable with its top clipped back. A small hip caps each end, over a wall that stops level beneath it."""
        S, R, t = self.S, self.R, self.t
        self.ex = self.hx + self.over_z
        ex, ez, ey, yr = self.ex, self.ez, self.ey, self.yr
        yh = yr - (yr - ey) * frac
        zh = (yr - yh) / t
        xr = ex - (yr - yh) / t
        for sx, sz in ((1, -1), (-1, 1)):
            plane(S, R, self.mat, [(sx * ex, ey, sz * ez), (-sx * ex, ey, sz * ez), (-sx * ex, yh, sz * zh), (-sx * xr, yr, 0), (sx * xr, yr, 0), (sx * ex, yh, sz * zh)], self.tile, self.sag, rows=6, cols=max(4, int(2 * ex / 1.2)))
            self.fascia(-ex, ex, sz * ez)
        for sx in (1, -1):
            plane(S, R, self.mat, [(sx * ex, yh, sx * zh), (sx * ex, yh, -sx * zh), (sx * xr, yr, 0)], self.tile, 0.0, rows=3, cols=3)
            beam(S.b, R, "wood", (sx * ex, yh + ROOF_TH / 2 - 0.05, -zh), (sx * ex, yh + ROOF_TH / 2 - 0.05, zh), 0.04, ROOF_TH / 2 + 0.05)
            for sz in (1, -1):
                cap(S, R, self.mat, (sx * ex, yh + ROOF_TH, sz * zh), (sx * xr, yr + ROOF_TH, 0), self.tile, t * 0.72, wide=0.16)
            self.gable_wall(sx, z_top=zh - (ex - self.hx))
            self.verge(sx * ex, sx, z_to=zh)
        cap(S, R, self.mat, (-xr - 0.04, yr + ROOF_TH, 0), (xr + 0.04, yr + ROOF_TH, 0), self.tile, t)
        return yr

    def cross_gable(self, xc, a):
        """A gable across the front slope, at the same pitch: its eaves run into the main eave, and its valleys are where the two planes really cross."""
        S, R, t = self.S, self.R, self.t
        hz, ye, ey, ez = self.hz, self.ye, self.ey, self.ez
        yc = ye + a * t
        A = a + self.over_z
        zf = ez
        zr = hz - (yc - ye) / t
        for s in (1, -1):
            plane(S, R, self.mat, [(xc + s * A, ey, ez), (xc, yc, zr), (xc, yc, ez)], self.tile, 0.0, rows=3, cols=3)
            # A board up each side of its front, meeting at its point.
            profile = [(s * A, ey - 0.14), (s * A, ey + ROOF_TH + 0.05), (0, yc + ROOF_TH + 0.05), (0, yc - 0.14)]
            prism(S.b, R, "wood", ez, ez + 0.07, [(xc + q[0], q[1]) for q in profile], axis="z")
            # Its valley, lapped with a line of shingle.
            cap(S, R, self.mat, (xc + s * A, ey + ROOF_TH, ez), (xc, yc + ROOF_TH, zr), self.tile, -0.05, wide=0.13)
        cap(S, R, self.mat, (xc, yc + ROOF_TH, zr), (xc, yc + ROOF_TH, ez + 0.07), self.tile, t)
        # Its gable, on the wall's own plane: the wall below carries straight on up.
        ax = self.gtile * 1024 / 1792
        pts = [(xc - a, ye, hz), (xc + a, ye, hz), (xc, yc, hz)]
        face(S.b, R, self.gable_mat, pts, [((p[0] + a) / self.gtile, 1 - (p[1] - ye) / ax) for p in pts], (0, 0, 1))
        box(S.b, R, "wood", xc, (ye + yc) / 2, hz + 0.04, 0.07, (yc - ye) / 2, 0.06, uv_scale=(0.9, 0.3))
        return (xc, A, zr, yc)

    def dormer(self, xd, z_sill, a=0.72, high=1.15, pane=True):
        """A little window standing on the front slope, its roof at the same pitch. Sills on the shingles' top, and its own valleys down to them."""
        S, R, t = self.S, self.R, self.t
        b = S.b
        ys = self.y_at(z_sill) + ROOF_TH
        yt = ys + high
        yc = yt + a * t * 0.8
        td = t * 0.8
        o = 0.18
        A = a + o
        ey = yt - o * td
        # Where its roof comes down to the shingles.
        z_at = lambda y: z_sill - (y - ys) / t
        zr, zm = z_at(yc + ROOF_TH), z_at(ey + ROOF_TH)
        zf = z_sill + o
        for s in (1, -1):
            pts = [(xd + s * A, ey, zf), (xd + s * A, ey, zm), (xd, yc, zr), (xd, yc, zf)]
            plane(S, R, self.mat, pts, self.tile, 0.0, rows=2, cols=2)
            cap(S, R, self.mat, (xd + s * A, ey + ROOF_TH, zm), (xd, yc + ROOF_TH, zr), self.tile, -0.05, wide=0.08)
            # The cheek, down to the shingles.
            x = xd + s * a
            ch = [(x, ys - 0.1, z_sill), (x, yt + 0.02, z_sill), (x, yt + 0.02, z_at(yt))]
            face(b, R, "wood", ch, [(0, 0), (0, 0.5), (0.6, 0.5)], (s, 0, 0))
            prism(b, R, "wood", zf, zf + 0.05, [(xd + s * A, ey - 0.1), (xd + s * A, ey + ROOF_TH + 0.04), (xd, yc + ROOF_TH + 0.04), (xd, yc - 0.1)], axis="z")
        cap(S, R, self.mat, (xd, yc + ROOF_TH, zr), (xd, yc + ROOF_TH, zf + 0.05), self.tile, td, wide=0.12)
        # Its front, and what stops it being hollow behind the board.
        ax = self.gtile * 1024 / 1792
        pts = [(xd - a, ys - 0.1, z_sill), (xd + a, ys - 0.1, z_sill), (xd + a, yt, z_sill), (xd, yc, z_sill), (xd - a, yt, z_sill)]
        face(b, R, self.gable_mat, pts, [((p[0] + a) / self.gtile, 1 - (p[1] - ys) / ax) for p in pts], (0, 0, 1))
        window(S, R, xd, ys + 0.1 + (high - 0.1) / 2, z_sill + 0.02, 1, w=a * 1.15, h=(high - 0.2) * 0.9)
        box(b, R, "wood", xd - a, (ys + yt) / 2, z_sill + 0.02, 0.06, (yt - ys) / 2 + 0.05, 0.05, uv_scale=(0.9, 0.3))
        box(b, R, "wood", xd + a, (ys + yt) / 2, z_sill + 0.02, 0.06, (yt - ys) / 2 + 0.05, 0.05, uv_scale=(0.9, 0.3))
        box(b, R, "wood", xd, ys + 0.02, z_sill + 0.03, a + 0.08, 0.05, 0.06, uv_scale=(0.9, 0.2), grain="x")


def window(S, f, x, y, z, facing=1, w=0.62, h=0.56, along_x=True):
    """A leaded window, cut from a wall's own painting with its frame, set on a blank stretch of wall."""
    u0, v0, u1, v1 = 268 / 1792, 272 / 1024, 612 / 1792, 584 / 1024
    uv = [(u0, v1), (u1, v1), (u1, v0), (u0, v0)]
    if along_x:
        pts = [(x - w, y - h, z), (x + w, y - h, z), (x + w, y + h, z), (x - w, y + h, z)] if facing > 0 else [(x + w, y - h, z), (x - w, y - h, z), (x - w, y + h, z), (x + w, y + h, z)]
        face(S.b, f, "wall_16", pts, uv, (0, 0, facing))
    else:
        pts = [(x, y - h, z + w), (x, y - h, z - w), (x, y + h, z - w), (x, y + h, z + w)] if facing > 0 else [(x, y - h, z - w), (x, y - h, z + w), (x, y + h, z + w), (x, y + h, z - w)]
        face(S.b, f, "wall_16", pts, uv, (facing, 0, 0))


def dressed_window(S, f, x, y, z, facing=1, along_x=True, w=0.62, h=0.6):
    """A window for a stone house: the leaded lights split by a stone mullion and transom, in a dressed surround, a sill under it
    and a hood mould over it to throw the rain off."""
    b = S.b
    window(S, f, x, y, z, facing, w, h, along_x)
    T = (0.42, 0.42)
    o = facing * 0.055
    def put(u, v, du, dv, out, dn):
        # u along the wall, v up, out from the wall's face.
        if along_x:
            box(b, f, "stone", x + u, y + v, z + out, du, dv, dn, uv_scale=T, grain="x" if du > dv else "y")
        else:
            box(b, f, "stone", x + out, y + v, z + u, dn, dv, du, uv_scale=T)
    put(0, 0, 0.045, h, o, 0.055)                       # mullion
    put(0, h * 0.32, w, 0.035, o, 0.05)                 # transom
    for sd in (-1, 1):
        put(sd * (w + 0.07), 0, 0.08, h + 0.05, o, 0.065)   # jambs
    put(0, -h - 0.08, w + 0.17, 0.06, o * 1.5, 0.085)   # sill
    put(0, h + 0.1, w + 0.22, 0.07, o * 1.5, 0.085)     # hood mould
    for sd in (-1, 1):
        put(sd * (w + 0.17), h - 0.04, 0.05, 0.13, o * 1.5, 0.085)  # its drops


def manor_porch(S, f, x, hd, pw=1.55, depth=1.45, top=6.53, pitch=50):
    """A two-storey porch of the house's own stone: an open arch below, a room over it with its own window, under a gable of
    its own that runs back into the main roof. Its end is a parapet: coping stones over the roof's edge, a ball at the top."""
    b = S.b
    T = (0.42, 0.42)
    th = 0.2
    zf = hd + depth
    arch = 2.95
    t = math.tan(pitch * math.pi / 180)
    ridge = top + pw * t
    for sd in (-1, 1):
        box(b, f, "rubble", x + sd * (pw - th), (top - 0.6) / 2, hd + depth / 2, th, (top + 0.6) / 2, depth / 2, uv_scale=T)
        # Quoins up the front corners.
        k, yq = 0, -0.1
        while yq < top - 0.3:
            run = 0.3 if k % 2 == 0 else 0.18
            box(b, f, "stone", x + sd * (pw + 0.03 - run), yq + 0.2, zf + 0.03, run, 0.2, 0.05, uv_scale=T)
            box(b, f, "stone", x + sd * (pw + 0.03), yq + 0.2, zf - (0.46 - run), 0.05, 0.2, 0.46 - run, uv_scale=T)
            yq += 0.42
            k += 1
        x0, _, z0 = f.p(x + sd * (pw - th), 0, hd + depth / 2)
        S.collider(x0, z0, th * f.k, depth / 2 * f.k, f.yaw, 3.0)
    box(b, f, "rubble", x, (arch + top) / 2, zf - th, pw, (top - arch) / 2, th, uv_scale=T)
    # The arch: dressed jambs, the head's two shoulders cut in stone, and a plain panel over it.
    inner = pw - 2 * th
    for sd in (-1, 1):
        box(b, f, "stone", x + sd * (inner - 0.06), arch / 2 - 0.05, zf - 0.02, 0.12, arch / 2 + 0.05, 0.06, uv_scale=T)
        tri = [(x + sd * inner, arch - 0.42, zf + 0.045), (x + sd * inner, arch, zf + 0.045), (x + sd * (inner - 0.7), arch, zf + 0.045)]
        if sd < 0:
            tri = [tri[0], tri[2], tri[1]]
        face(b, f, "stone", tri, [(0, 0), (0, 0.2), (0.3, 0.2)], (0, 0, 1))
    box(b, f, "stone", x, arch + 0.12, zf, inner + 0.12, 0.13, 0.06, uv_scale=T, grain="x")
    box(b, f, "stone", x, arch + 0.62, zf, 0.5, 0.3, 0.05, uv_scale=T, grain="x")
    # The string course carried round it.
    box(b, f, "stone", x, 3.58, zf + 0.04, pw + 0.07, 0.09, 0.08, uv_scale=T, grain="x")
    for sd in (-1, 1):
        box(b, f, "stone", x + sd * (pw + 0.04), 3.58, hd + depth / 2, 0.08, 0.09, depth / 2, uv_scale=T)
    dressed_window(S, f, x, 5.0, zf + 0.015, 1, w=0.5, h=0.55)
    # The gable and its coping.
    face(b, f, "rubble", [(x - pw, top - 0.02, zf), (x + pw, top - 0.02, zf), (x, ridge + 0.05, zf)],
         [(0, 0), (2 * pw * 0.42, 0), (pw * 0.42, pw * t * 0.42)], (0, 0, 1))
    for sd in (-1, 1):
        beam(b, f, "stone", (x + sd * (pw + 0.08), top - 0.06, zf - 0.06), (x, ridge + 0.16, zf - 0.06), 0.13, 0.09)
        box(b, f, "stone", x + sd * (pw + 0.02), top - 0.02, zf - 0.06, 0.16, 0.1, 0.16, uv_scale=T)
    ball(b, f, "stone", x, ridge + 0.36, zf - 0.06, 0.15, 7)
    box(b, f, "stone", x, ridge + 0.16, zf - 0.06, 0.12, 0.08, 0.12, uv_scale=T)
    # Its roof, from the parapet back into the main roof.
    zb = hd - 2.4
    o = 0.28
    for sd in (-1, 1):
        plane(S, f, "roof_2", [(x + sd * (pw + o), top - o * t, zb), (x + sd * (pw + o), top - o * t, zf - 0.08), (x, ridge, zf - 0.08), (x, ridge, zb)], 2.4, 0.02, rows=3, cols=3)
        beam(b, f, "wood", (x + sd * (pw + o), top - o * t + ROOF_TH / 2 - 0.05, zf - 0.08), (x + sd * (pw + o), top - o * t + ROOF_TH / 2 - 0.05, hd), 0.04, ROOF_TH / 2 + 0.05)
    cap(S, f, "roof_2", (x, ridge + ROOF_TH, zb), (x, ridge + ROOF_TH, zf - 0.1), 2.4, t)


def slit(S, f, x, y, z, facing=1, along_x=True):
    """An arrow slit: a dark line through thick stone, its edges dressed."""
    b = S.b
    if along_x:
        box(b, f, "iron", x, y, z, 0.05, 0.42, 0.01, uv_scale=(0.2, 0.2))
        for s in (-1, 1):
            box(b, f, "stone", x + s * 0.13, y, z, 0.08, 0.5, 0.04, uv_scale=(0.42, 0.42))
        for s in (-1, 1):
            box(b, f, "stone", x, y + s * 0.5, z, 0.21, 0.07, 0.04, uv_scale=(0.42, 0.42))
    else:
        box(b, f, "iron", x, y, z, 0.01, 0.42, 0.05, uv_scale=(0.2, 0.2))
        for s in (-1, 1):
            box(b, f, "stone", x, y, z + s * 0.13, 0.04, 0.5, 0.08, uv_scale=(0.42, 0.42))
        for s in (-1, 1):
            box(b, f, "stone", x, y + s * 0.5, z, 0.04, 0.07, 0.21, uv_scale=(0.42, 0.42))


def chimney_stack(S, f, cx, cz, top, kind="square"):
    b = S.b
    if kind == "round":
        cylinder(b, f, "rubble", (cx, 0.1, cz), (cx, top, cz), 0.44, 0.38, 10, uv=(2.0, 0.42))
        cylinder(b, f, "stone", (cx, top, cz), (cx, top + 0.18, cz), 0.5, 0.46, 10, uv=(2.0, 0.42))
        cylinder(b, f, "iron", (cx, top + 0.18, cz), (cx, top + 0.5, cz), 0.16, 0.12, 8, uv=(0.5, 0.4))
    else:
        wide = 0.56 if kind == "broad" else 0.42
        box(b, f, "rubble", cx, top / 2 + 0.1, cz, wide, top / 2, 0.42, uv_scale=(0.42, 0.42))
        box(b, f, "stone", cx, top + 0.14, cz, wide + 0.08, 0.09, 0.5, uv_scale=(0.42, 0.42))
        box(b, f, "rubble", cx, top + 0.3, cz, 0.2, 0.09, 0.2, uv_scale=(0.42, 0.42))
    S.smoke.append({"p": [round(v, 3) for v in f.p(cx, top + 0.45, cz)]})


def shed(S, f, x0, z0, x1, z1, yh, yl, down, mat="roof_1", tile=3.0, posts=True, walls=None, solid=True):
    """A lean-to: one plane, from yh at its high side to yl at its low. down is the way it slopes, as (x, z)."""
    b = S.b
    dx, dz = down
    o = 0.28
    if dx:
        hi, lo = (x0, x1) if dx > 0 else (x1, x0)
        run = abs(x1 - x0)
        drop = (yh - yl) / run
        pts = [(lo + dx * o, yl - o * drop, z0 - o), (lo + dx * o, yl - o * drop, z1 + o), (hi, yh, z1 + o), (hi, yh, z0 - o)]
        beam(b, f, "wood", (lo + dx * o, yl - o * drop + ROOF_TH / 2 - 0.05, z0 - o), (lo + dx * o, yl - o * drop + ROOF_TH / 2 - 0.05, z1 + o), 0.04, ROOF_TH / 2 + 0.05)
        for z in (z0 - o, z1 + o):
            beam(b, f, "wood", (lo + dx * o, yl - o * drop + ROOF_TH / 2 - 0.05, z), (hi, yh + ROOF_TH / 2 - 0.05, z), 0.04, ROOF_TH / 2 + 0.05)
    else:
        hi, lo = (z0, z1) if dz > 0 else (z1, z0)
        run = abs(z1 - z0)
        drop = (yh - yl) / run
        pts = [(x0 - o, yl - o * drop, lo + dz * o), (x1 + o, yl - o * drop, lo + dz * o), (x1 + o, yh, hi), (x0 - o, yh, hi)]
        beam(b, f, "wood", (x0 - o, yl - o * drop + ROOF_TH / 2 - 0.05, lo + dz * o), (x1 + o, yl - o * drop + ROOF_TH / 2 - 0.05, lo + dz * o), 0.04, ROOF_TH / 2 + 0.05)
        for x in (x0 - o, x1 + o):
            beam(b, f, "wood", (x, yl - o * drop + ROOF_TH / 2 - 0.05, lo + dz * o), (x, yh + ROOF_TH / 2 - 0.05, hi), 0.04, ROOF_TH / 2 + 0.05)
    plane(S, f, mat, pts, tile, 0.04, rows=3, cols=4)
    if posts:
        for px, pz in posts if isinstance(posts, (list, tuple)) else ((lo, z0), (lo, z1)) if dx else ((x0, lo), (x1, lo)):
            if dx:
                top = yl + abs(px - lo) * drop
            else:
                top = yl + abs(pz - lo) * drop
            box(b, f, "wood", px, top / 2 - 0.05, pz, 0.1, top / 2 + 0.05, 0.1, uv_scale=(0.9, 0.3))
    if walls:
        mat_w, tile_w = walls
        mx, mz = (x0 + x1) / 2, (z0 + z1) / 2
        # Closed in, down to the ground, up to the plane.
        if dx:
            side_wall(b, f, mat_w, z0, z1, lo, -0.6, yl, tile_w, 0, 1, sign=1 if dx > 0 else -1)
            for z, s in ((z0, -1), (z1, 1)):
                pts_w = [(lo, -0.6, z), (hi, -0.6, z), (hi, yh, z), (lo, yl, z)]
                face(b, f, mat_w, pts_w, [(p[0] / tile_w, 1 - p[1] / tile_w) for p in pts_w], (0, 0, s))
        else:
            wall(b, f, mat_w, x0, x1, lo, -0.6, yl, tile_w, 0, 1, depth_sign=1 if dz > 0 else -1)
            for x, s in ((x0, -1), (x1, 1)):
                pts_w = [(x, -0.6, lo), (x, -0.6, hi), (x, yh, hi), (x, yl, lo)]
                face(b, f, mat_w, pts_w, [(p[2] / tile_w, 1 - p[1] / tile_w) for p in pts_w], (s, 0, 0))
        if solid:
            c = f.p(mx, 0, mz)
            S.collider(c[0], c[2], (abs(x1 - x0) / 2) * f.k, (abs(z1 - z0) / 2) * f.k, f.yaw, 3.0)


DOOR_W, DOOR_H = 1.6, 2.35


def house(S, cx, cz, yaw, w, d, sp):
    """A house, front to local +z. Walls to the two floors the inside is fitted to, and whatever roof and trimmings it's given. See tools/interior/build_interior.py for the inside."""
    b = S.b
    f = Frame(cx, cz, yaw)
    hw, hd = w / 2, d / 2
    f.k, f.front = HOUSE_SCALE, hd
    h1 = sp.get("h1", 3.2)
    h2 = sp.get("h2", 2.7)
    jet = sp.get("jetty", 0.42)
    below = 1.2
    door_x = sp["doors"][0]["x"]
    # Ground floor. The texture's own stone skirt meets the ground.
    gf = sp["ground"]
    gf_tile = {True: h1, False: h1 * 1792 / 1024}
    for side, (mat, square) in zip(("front", "back", "left", "right"), gf):
        tile = gf_tile[square]
        v1 = 1 + below / h1
        if mat in ("stone", "rubble"):
            tile, v1 = 2.6, (h1 + below) / 2.6
        if side == "front":
            # Cut round the door, the picture carrying on across the cut.
            dl, dr = door_x - DOOR_W / 2 / f.k, door_x + DOOR_W / 2 / f.k
            wall(b, f, mat, -hw, dl, hd, -below, h1, tile, 0, v1, u_off=0.13)
            wall(b, f, mat, dr, hw, hd, -below, h1, tile, 0, v1, u_off=0.13 + (dr + hw) / tile)
            wall(b, f, mat, dl, dr, hd, DOOR_H, h1, tile, 0, (h1 - DOOR_H) / (h1 + below) * v1, u_off=0.13 + (dl + hw) / tile)
        elif side == "back":
            wall(b, f, mat, -hw, hw, -hd, -below, h1, tile, 0, v1, u_off=0.41, depth_sign=-1)
        elif side == "left":
            side_wall(b, f, mat, -hd, hd, -hw, -below, h1, tile, 0, v1, u_off=0.27, sign=-1)
        else:
            side_wall(b, f, mat, -hd, hd, hw, -below, h1, tile, 0, v1, u_off=0.63, sign=1)
    # Stone sill course around the foot, to seat the walls in the ground.
    dl, dr = door_x - DOOR_W / 2 / f.k, door_x + DOOR_W / 2 / f.k
    for sx, sz, hx, hz in (((dl - hw - 0.15) / 2, hd + 0.05, (dl + hw + 0.15) / 2, 0.13), ((dr + hw + 0.15) / 2, hd + 0.05, (hw + 0.15 - dr) / 2, 0.13),
                           (0, -hd - 0.05, hw + 0.15, 0.13), (hw + 0.05, 0, 0.13, hd), (-hw - 0.05, 0, 0.13, hd)):
        box(b, f, "rubble", sx, -0.25, sz, hx, 0.45, hz, uv_scale=(0.30, 0.30))
    stone_body = sp.get("stone_body", False)
    timber = not stone_body
    if timber:
        # Corner posts, and the girt the upper floor rests on.
        for sx in (-1, 1):
            for sz in (-1, 1):
                box(b, f, "wood", sx * (hw + 0.03), h1 / 2 - 0.1, sz * (hd + 0.03), 0.17, h1 / 2 + 0.1, 0.17, uv_scale=(0.9, 0.3))
        box(b, f, "wood", 0, h1 + 0.02, hd + 0.08, hw + 0.2, 0.13, 0.13, uv_scale=(0.9, 0.2), grain="x")
        box(b, f, "wood", 0, h1 + 0.02, -hd - 0.08, hw + 0.2, 0.13, 0.13, uv_scale=(0.9, 0.2), grain="x")
        box(b, f, "wood", hw + 0.08, h1 + 0.02, 0, 0.13, 0.13, hd, uv_scale=(0.9, 0.2))
        box(b, f, "wood", -hw - 0.08, h1 + 0.02, 0, 0.13, 0.13, hd, uv_scale=(0.9, 0.2))
    if jet > 0:
        # Joist ends under the overhang, front and back, and its underside closed.
        n_j = int(w / 0.85)
        for i in range(n_j + 1):
            x = -hw + i * w / n_j
            for sz in (-1, 1):
                box(b, f, "wood", x, h1 + 0.2, sz * (hd + jet * 0.5), 0.08, 0.08, jet * 0.5 + 0.1, uv_scale=(0.5, 0.25))
        for sz in (-1, 1):
            n = f.d(0, -1, 0)
            z_a, z_b = sz * hd, sz * (hd + jet)
            pa, pb, pc, pd = f.p(-hw, h1 + 0.28, z_a), f.p(hw, h1 + 0.28, z_a), f.p(hw, h1 + 0.28, z_b), f.p(-hw, h1 + 0.28, z_b)
            if sz > 0:
                b.quad("wood", pa, pd, pc, pb, (0, 0), (0, 0.3), (2, 0.3), (2, 0), n)
            else:
                b.quad("wood", pa, pb, pc, pd, (0, 0), (2, 0), (2, 0.3), (0, 0.3), n)
    # Upper floor.
    y0, y1 = h1 + 0.28, h1 + 0.28 + h2
    uz = hd + jet
    for side, (mat, v0, v1, tile) in zip(("front", "back", "left", "right"), sp["upper"]):
        if mat in ("stone", "rubble"):
            tile, v0, v1 = 2.6, 0, h2 / 2.6
        if side == "front":
            wall(b, f, mat, -hw, hw, uz, y0, y1, tile, v0, v1, u_off=0.31)
        elif side == "back":
            wall(b, f, mat, -hw, hw, -uz, y0, y1, tile, v0, v1, u_off=0.55, depth_sign=-1)
        elif side == "left":
            side_wall(b, f, mat, -uz, uz, -hw, y0, y1, tile, v0, v1, u_off=0.07, sign=-1)
        else:
            side_wall(b, f, mat, -uz, uz, hw, y0, y1, tile, v0, v1, u_off=0.77, sign=1)
    if timber:
        for sx in (-1, 1):
            for sz in (-1, 1):
                box(b, f, "wood", sx * (hw + 0.02), (y0 + y1) / 2, sz * (uz + 0.02), 0.13, h2 / 2 + 0.02, 0.13, uv_scale=(0.9, 0.3))
    else:
        # Dressed quoins up each corner, and a string course where the floor is.
        for sx in (-1, 1):
            for sz in (-1, 1):
                k = 0
                yq = -0.1
                while yq < y1 - 0.2:
                    wide = k % 2 == 0
                    run = 0.34 if wide else 0.2
                    box(b, f, "stone", sx * (hw + 0.1 - run), yq + 0.2, sz * (uz + 0.04), run, 0.2, 0.06, uv_scale=(0.42, 0.42))
                    box(b, f, "stone", sx * (hw + 0.04), yq + 0.2, sz * (uz + 0.1 - (0.54 - run)), 0.06, 0.2, 0.54 - run, uv_scale=(0.42, 0.42))
                    yq += 0.42
                    k += 1
        box(b, f, "stone", 0, y0 - 0.1, hd + 0.05, hw + 0.08, 0.09, 0.08, uv_scale=(0.42, 0.42), grain="x")
        box(b, f, "stone", 0, y0 - 0.1, -hd - 0.05, hw + 0.08, 0.09, 0.08, uv_scale=(0.42, 0.42), grain="x")
        box(b, f, "stone", hw + 0.05, y0 - 0.1, 0, 0.08, 0.09, hd, uv_scale=(0.42, 0.42))
        box(b, f, "stone", -hw - 0.05, y0 - 0.1, 0, 0.08, 0.09, hd, uv_scale=(0.42, 0.42))
    win = dressed_window if sp.get("dressed") else window
    for wx, wy in sp.get("windows_front", []):
        win(S, f, wx, wy, uz + 0.015, 1)
    for wx, wy in sp.get("windows_back", []):
        win(S, f, wx, wy, -uz - 0.015, -1)
    for wz, wy in sp.get("windows_left", []):
        win(S, f, -hw - 0.015, wy, wz, -1, along_x=False)
    for wz, wy in sp.get("windows_right", []):
        win(S, f, hw + 0.015, wy, wz, 1, along_x=False)
    for wx, wy, fc in sp.get("slits", []):
        if fc in (1, -1):
            slit(S, f, wx, wy, fc * (uz + 0.04), fc)
        else:
            slit(S, f, fc / 2 * (hw + 0.04), wy, wx, 1, along_x=False)
    # The roof, on a frame of its own whose x is the ridge.
    ye = y1 - 0.05
    along_z = sp.get("ridge") == "z"
    R = Frame(cx, cz, yaw + math.pi / 2) if along_z else f
    rf = Roof(S, R, sp, *((uz, hw) if along_z else (hw, uz)), ye)
    kind = sp.get("kind", "gable")
    if kind == "gable":
        yr = rf.gable(sp.get("cross", ()))
    elif kind == "hip":
        yr = rf.hip()
    else:
        yr = rf.half_hip(sp.get("clip", 0.36))
    for dd in sp.get("dormers", ()):
        rf.dormer(*dd)
    if kind == "hip" and sp.get("finial"):
        box(b, R, "iron", 0, yr + ROOF_TH + 0.55, 0, 0.03, 0.55, 0.03, uv_scale=(0.2, 0.2))
        ball(b, R, "iron", 0, yr + ROOF_TH + 0.18, 0, 0.13, 7)
    # Chimney, out through the roof and clear above the ridge.
    chimneys = sp.get("chimneys") or [sp["chimney"]]
    for ch in chimneys:
        # Out through the slope where it stands, and on up a little way above it.
        rx, rz = (abs(ch[1]), abs(ch[0])) if along_z else (abs(ch[0]), abs(ch[1]))
        over = rf.y_at(rz)
        if kind != "gable":
            over = min(over, rf.ey + (rf.ex - rx) * rf.t)
        chimney_stack(S, f, ch[0], ch[1], over + sp.get("stack", 1.15), sp.get("stack_kind", "square"))
    # Doors: a frame through the wall's thickness, a stone step, a lantern.
    for dd in sp.get("doors", []):
        dx = dd["x"]
        dh = dd.get("h", 3.0)
        fm = "stone" if stone_body else "wood"
        for sx in (-1, 1):
            box(b, f, fm, dx + sx * (DOOR_W / 2 + 0.05) / f.k, DOOR_H / 2, hd - 0.05, 0.08, DOOR_H / 2 + 0.05, 0.13, uv_scale=(0.42, 0.42) if stone_body else (0.9, 0.3))
        box(b, f, fm, dx, DOOR_H + 0.05, hd - 0.05, DOOR_W / 2 + 0.13, 0.08, 0.13, uv_scale=(0.42, 0.42) if stone_body else (0.9, 0.2), grain="x")
        box(b, f, "wood", dx, 0.1, hd - 0.05, DOOR_W / 2, 0.06, 0.13, uv_scale=(0.9, 0.2), grain="x")
        box(b, f, "stone", dx, 0.03, hd + 0.34, 0.95, 0.09, 0.32, uv_scale=(0.3, 0.3))
        box(b, f, "stone", dx, -0.03, hd + 0.72, 1.15, 0.07, 0.3, uv_scale=(0.3, 0.3))
        S.doors.append({"p": [round(v, 3) for v in f.p(dx, 0, hd + 1.2)]})
        lx = dx + dd.get("lamp", 1.05)
        lantern(S, f, lx, min(dh * 0.9, h1 - 0.3), hd + 0.05)
    mid = f.p(0, 0, 0)
    S.footprints.append({"x": round(mid[0], 3), "z": round(mid[2], 3), "hx": round(hw * f.k + 0.14, 3), "hz": round(hd * f.k + 0.14, 3), "yaw": round(yaw, 4), "h": 4.0})
    S.homes.append({"x": cx, "z": cz, "k": f.k, "mid": [mid[0], mid[2]], "yaw": yaw, "w": w, "d": d, "h1": h1, "h2": h2, "jet": jet, "door": door_x, "chimney": chimneys[0], "chimneys": chimneys, "who": sp.get("who", ""),
                    "stone": stone_body, "stack_w": 0.56 if sp.get("stack_kind") == "broad" else 0.42})
    # Extra lit windows, for the shader's glow and the light they throw.
    for lw in sp.get("glow", []):
        S.lights.append({"p": [round(v, 3) for v in f.p(lw[0], lw[1], lw[2])], "c": [1.0, 0.55, 0.22], "r": 4.0, "i": 1.1, "flicker": 0.25})
    return f


def hanging_sign(S, f, x, y, z, picture="wood"):
    """A board on an iron bracket off the wall."""
    b = S.b
    box(b, f, "iron", x, y + 0.5, z + 0.5, 0.02, 0.02, 0.55, uv_scale=(0.2, 0.2))
    beam(b, f, "iron", (x, y + 0.05, z), (x, y + 0.5, z + 0.55), 0.015, 0.015)
    for s in (-1, 1):
        box(b, f, "iron", x, y + 0.36, z + 0.72 + s * 0.28, 0.01, 0.14, 0.01, uv_scale=(0.2, 0.2))
    box(b, f, picture, x, y - 0.02, z + 0.72, 0.04, 0.3, 0.42, uv_scale=(0.9, 0.9))
    box(b, f, "iron", x, y + 0.29, z + 0.72, 0.05, 0.015, 0.45, uv_scale=(0.2, 0.2))


def porch(S, f, x, z, hw, depth, y_top):
    """Posts and a little roof over a door."""
    b = S.b
    for s in (-1, 1):
        box(b, f, "wood", x + s * hw, (y_top - 0.5) / 2, z + depth, 0.09, (y_top - 0.5) / 2 + 0.05, 0.09, uv_scale=(0.9, 0.3))
        beam(b, f, "wood", (x + s * hw, y_top - 0.95, z + depth), (x + s * hw, y_top - 0.05, z + 0.03), 0.05, 0.05)
    shed(S, f, x - hw, z, x + hw, z + depth, y_top, y_top - 0.55, (0, 1), mat="roof_2", tile=2.4, posts=False)


def coffin(S, f, x, y, z, along=(0, 1), lid=True):
    """Six-sided, wide at the shoulder."""
    b = S.b
    ax, az = along
    cx, cz = -az, ax
    L, sh, ft, tp = 0.95, 0.31, 0.17, 0.2
    prof = [(-L, ft), (0.42, sh), (L, tp)]
    ring = [(q[0], s * q[1]) for s, order in ((1, prof), (-1, list(reversed(prof)))) for q in order]
    def pt(t, s, h):
        return (x + ax * t + cx * s, y + h, z + az * t + cz * s)
    H = 0.34
    pts_top = [pt(t, s, H) for t, s in ring]
    pts_bot = [pt(t, s, 0) for t, s in ring]
    uvs = [((p[0] + p[2]) * 0.7, (p[2] - p[0]) * 0.7) for p in pts_top]
    face(b, f, "wood", pts_top, uvs, (0, 1, 0))
    m = len(ring)
    for i in range(m):
        j = (i + 1) % m
        e = sub(pts_top[j], pts_top[i])
        nrm = norm(cross(e, (0, 1, 0)))
        cen = pt(0, 0, H / 2)
        if sum(u * v for u, v in zip(nrm, sub(pts_top[i], cen))) < 0:
            nrm = scale(nrm, -1)
        face(b, f, "wood", [pts_bot[i], pts_bot[j], pts_top[j], pts_top[i]], [(0, 0), (0.7, 0), (0.7, 0.3), (0, 0.3)], nrm)


def rack(S, f, x, z, w=2.6, cloth="cloth_oat", n=3):
    """A frame of poles with what's drying on it."""
    b = S.b
    for s in (-1, 1):
        beam(b, f, "wood", (x + s * w / 2, -0.1, z), (x + s * w / 2, 2.3, z), 0.06, 0.06)
    beam(b, f, "wood", (x - w / 2 - 0.15, 2.28, z), (x + w / 2 + 0.15, 2.28, z), 0.05, 0.05)
    for i in range(n):
        cx = x + (i + 0.5 - n / 2) * w / n
        hw = w / n * 0.42
        hg = 0.75 + 0.25 * ((i * 7) % 3) / 2
        face(b, f, cloth, [(cx - hw, 2.24 - hg, z), (cx + hw, 2.24 - hg * 0.86, z), (cx + hw, 2.24, z), (cx - hw, 2.24, z)], [(0, 1), (1, 1), (1, 0), (0, 0)], (0, 0, 1))
        face(b, f, cloth, [(cx + hw, 2.24 - hg * 0.86, z - 0.01), (cx - hw, 2.24 - hg, z - 0.01), (cx - hw, 2.24, z - 0.01), (cx + hw, 2.24, z - 0.01)], [(1, 1), (0, 1), (0, 0), (1, 0)], (0, 0, -1))
    c = f.p(x, 0, z)
    S.collider(c[0], c[2], (w / 2 + 0.05) * f.k, (0.1) * f.k, f.yaw, 2.2)


def woodpile(S, f, x, z, w=2.4, rows=4, along_x=True):
    b = S.b
    r = random.Random(int(abs(x * 13 + z * 7)))
    for j in range(rows):
        n = int(w / 0.22) - j
        for i in range(n):
            t = (i + 0.5 * (j % 2)) * 0.22 - w / 2 + r.uniform(-0.01, 0.01)
            y = 0.1 + j * 0.19
            L = 0.4 + r.uniform(-0.04, 0.04)
            if along_x:
                cylinder(b, f, "bark", (x + t, y, z - L), (x + t, y, z + L), 0.1, 0.1, 6, uv=(0.8, 0.5), cap_mat="wood")
            else:
                cylinder(b, f, "bark", (x - L, y, z + t), (x + L, y, z + t), 0.1, 0.1, 6, uv=(0.8, 0.5), cap_mat="wood")
    c = f.p(x, 0, z)
    S.collider(c[0], c[2], (w / 2 if along_x else 0.42) * f.k, (0.42 if along_x else w / 2) * f.k, f.yaw, rows * 0.19)


def lantern(S, f, x, y, z):
    b = S.b
    box(b, f, "iron", x, y + 0.2, z + 0.18, 0.018, 0.018, 0.2, uv_scale=(0.2, 0.2))
    box(b, f, "iron", x, y + 0.13, z + 0.34, 0.012, 0.07, 0.012, uv_scale=(0.2, 0.2))
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(b, f, "iron", x + sx * 0.07, y - 0.08, z + 0.34 + sz * 0.07, 0.008, 0.14, 0.008, uv_scale=(0.2, 0.2))
    box(b, f, "iron", x, y + 0.07, z + 0.34, 0.095, 0.015, 0.095, uv_scale=(0.2, 0.2))
    box(b, f, "iron", x, y - 0.22, z + 0.34, 0.09, 0.012, 0.09, uv_scale=(0.2, 0.2))
    box(b, f, "flame", x, y - 0.08, z + 0.34, 0.05, 0.11, 0.05, uv_scale=(1, 1))
    S.lights.append({"p": [round(v, 3) for v in f.p(x, y - 0.08, z + 0.36)], "c": [1.0, 0.62, 0.28], "r": 7.0, "i": 2.6, "flicker": 0.6})


def well(S, x, z):
    """Courses of dressed stone in a ring, capped, with a little roof over a windlass."""
    b = S.b
    f = Frame(x, z, 0.4)
    R = 1.0
    courses = 4
    blocks = 11
    hc = 0.25
    r = random.Random(21)
    def ring_block(a, y, half_w, half_h, depth, mat, nudge=0.0):
        centre = f.p(math.cos(a) * (R + nudge), 0, math.sin(a) * (R + nudge))
        radial = f.d(math.cos(a), 0, math.sin(a))
        box(b, Frame(centre[0], centre[2], math.atan2(radial[0], radial[2])), mat, 0, y, 0, half_w, half_h, depth, uv_scale=(0.55, 0.55))
    for c in range(courses):
        y = -0.1 + c * hc + hc / 2
        for i in range(blocks):
            a = (i + (c % 2) * 0.5) / blocks * math.tau
            ring_block(a, y, math.tau * R / blocks / 2 * 0.97, hc / 2 * 0.96, 0.13, "rubble", r.uniform(-0.012, 0.012))
    # A rough core behind the courses, so the gaps between stones are stone and not sky.
    cylinder(b, f, "stone", (0, -0.2, 0), (0, -0.1 + courses * hc, 0), R + 0.07, R + 0.07, 18, uv=(6, 1.0), caps=False)
    # Cap stones, overhanging, with gaps you can see.
    y_cap = -0.1 + courses * hc + 0.05
    for i in range(blocks):
        ring_block((i + 0.25) / blocks * math.tau, y_cap, math.tau * R / blocks / 2 * 0.95, 0.055, 0.2, "stone", 0.02)
    # Dark water, low in the shaft.
    up = f.d(0, 1, 0)
    sides = 16
    for i in range(sides):
        a0, a1 = i / sides * math.tau, (i + 1) / sides * math.tau
        b.tri("water", (f.p(0, 0.02, 0), f.p(math.cos(a1) * 0.9, 0.02, math.sin(a1) * 0.9), f.p(math.cos(a0) * 0.9, 0.02, math.sin(a0) * 0.9)), ((0.5, 0.5), (1, 0.5), (1, 1)), (up, up, up))
    # Posts, windlass and a small shingle roof.
    for sx in (-1, 1):
        box(b, f, "wood", sx * 1.12, 1.35, 0, 0.09, 1.45, 0.09, uv_scale=(1.0, 0.45))
        box(b, f, "wood", sx * 1.12, 2.72, 0, 0.11, 0.05, 0.78, uv_scale=(1.0, 0.45))
    cylinder(b, f, "wood", (-1.08, 1.86, 0), (1.08, 1.86, 0), 0.07, 0.07, 8, uv=(0.5, 0.5))
    box(b, f, "iron", 1.22, 1.72, 0.0, 0.015, 0.14, 0.015, uv_scale=(0.3, 0.3))
    box(b, f, "wood", 1.22, 1.6, 0.06, 0.02, 0.02, 0.07, uv_scale=(0.3, 0.3))
    cylinder(b, f, "iron", (0.0, 0.62, 0), (0.0, 1.8, 0), 0.008, 0.008, 5, caps=False)
    cylinder(b, f, "wood", (0, 0.36, 0), (0, 0.62, 0), 0.14, 0.17, 10, uv=(0.6, 0.6))
    ye, yr = 2.74, 3.46
    for sz in (1, -1):
        plane(S, f, "roof_2", [(1.42, ye, sz * 1.05), (-1.42, ye, sz * 1.05), (-1.42, yr, 0), (1.42, yr, 0)], 2.0, 0.02, rows=3, cols=4)
        beam(b, f, "wood", (-1.42, ye + 0.03, sz * 1.05), (1.42, ye + 0.03, sz * 1.05), 0.03, 0.1)
    drop = (yr - ye) / 1.05
    for sx in (-1, 1):
        for sz in (-1, 1):
            prism(b, f, "wood", sx * 1.42, sx * 1.48, [(sz * 1.07, ye - 0.1), (sz * 1.07, ye + ROOF_TH + 0.03), (0, yr + ROOF_TH + 0.03), (0, yr - 0.1)])
        box(b, f, "wood", sx * 1.12, 3.1, 0, 0.05, 0.36, 0.05, uv_scale=(1.0, 0.45))
    cap(S, f, "roof_2", (-1.5, yr + ROOF_TH, 0), (1.5, yr + ROOF_TH, 0), 2.0, drop, wide=0.14)
    S.collider(x, z, 1.15, 1.15, 0.4, 1.1)


def barrel(S, x, z, yaw=0.0, r=0.36, h=0.92, y=0.0):
    b = S.b
    f = Frame(x, z, yaw, y)
    segs = [(0.0, 0.84), (0.25, 0.97), (0.5, 1.0), (0.75, 0.97), (1.0, 0.84)]
    for (t0, s0), (t1, s1) in zip(segs, segs[1:]):
        cylinder(b, f, "wood", (0, t0 * h, 0), (0, t1 * h, 0), r * s0, r * s1, 12, uv=(1.5, 0.4), caps=False)
    for t in (0.14, 0.86):
        s = 0.92
        cylinder(b, f, "iron", (0, t * h - 0.025, 0), (0, t * h + 0.025, 0), r * s + 0.008, r * s + 0.008, 12, caps=False)
    cylinder(b, f, "wood", (0, h - 0.01, 0), (0, h, 0), r * 0.82, r * 0.82, 12, uv=(0.5, 0.4))
    S.collider(x, z, r * 0.9, r * 0.9, yaw, h)


def crate(S, x, z, yaw=0.0, s=0.45, y=0.0, collide=True):
    b = S.b
    f = Frame(x, z, yaw, y)
    box(b, f, "wood", 0, s, 0, s * 0.94, s * 0.94, s * 0.94, uv_scale=(1.5, 1.5))
    for a in (-1, 1):
        box(b, f, "wood", a * s * 0.95, s, s * 0.95, 0.04, s, 0.04, uv_scale=(0.8, 0.25))
        box(b, f, "wood", a * s * 0.95, s, -s * 0.95, 0.04, s, 0.04, uv_scale=(0.8, 0.25))
        for yy in (0.07, s * 2 - 0.07):
            box(b, f, "wood", 0, yy, a * s * 0.95, s, 0.04, 0.04, uv_scale=(0.8, 0.25))
            box(b, f, "wood", a * s * 0.95, yy, 0, 0.04, 0.04, s, uv_scale=(0.8, 0.25))
    if collide:
        S.collider(x, z, s, s, yaw, s * 2)


def fence(S, pts, h=1.05, post_gap=2.3):
    b = S.b
    S.fences.append([list(p) for p in pts])
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        L = math.hypot(x1 - x0, z1 - z0)
        yaw = math.atan2(x1 - x0, z1 - z0)
        f = Frame(x0, z0, yaw)
        n = max(1, int(L / post_gap))
        for i in range(n + 1):
            t = i / n * L
            box(b, f, "wood", Rng.uniform(-0.02, 0.02), h / 2 - 0.12 + Rng.uniform(-0.03, 0.03), t, 0.065, h / 2 + 0.12, 0.065, uv_scale=(0.8, 0.3))
        for ry in (h * 0.45, h * 0.85):
            box(b, f, "wood", 0.07, ry + Rng.uniform(-0.03, 0.03), L / 2, 0.025, 0.05, L / 2 + 0.2, uv_scale=(0.7, 0.2))
        S.collider((x0 + x1) / 2, (z0 + z1) / 2, 0.08, L / 2, yaw, h)


def stall(S, x, z, yaw):
    b = S.b
    f = Frame(x, z, yaw)
    w, d = 1.7, 0.95
    for sx in (-1, 1):
        for sz in (-1, 1):
            hgt = 2.45 if sz > 0 else 2.0
            box(b, f, "wood", sx * w, hgt / 2, sz * d, 0.06, hgt / 2, 0.06, uv_scale=(0.8, 0.3))
    # The counter: one board 0.6 deep across the customers' side (local -z), on two trestles, a cloth hung over its front. The
    # keeper stands behind it under the awning; the stock waits behind them in crates.
    cz = -d + 0.31
    box(b, f, "wood", 0, 0.92, cz, w, 0.04, 0.31, uv_scale=(1.8, 1.8))
    for sx in (-1, 1):
        box(b, f, "wood", sx * (w - 0.3), 0.45, cz, 0.05, 0.43, 0.24, uv_scale=(0.8, 0.3))
        box(b, f, "wood", sx * (w - 0.3), 0.12, cz, 0.06, 0.04, 0.29, uv_scale=(0.8, 0.3))
    box(b, f, "cloth_red", 0, 0.6, -d - 0.025, w + 0.02, 0.33, 0.012, uv_scale=(1.0, 1.0))
    box(b, f, "cloth_oat", 0, 0.29, -d - 0.035, w + 0.02, 0.035, 0.012, uv_scale=(1.0, 1.0))
    for cx_, cz_, hx_, hy_, hz_, y_ in ((-1.15, 0.7, 0.3, 0.24, 0.22, 0.0), (-1.1, 0.68, 0.24, 0.17, 0.18, 0.48), (1.2, 0.72, 0.28, 0.24, 0.2, 0.0)):
        box(b, f, "wood", cx_, y_ + hy_, cz_, hx_, hy_, hz_, uv_scale=(1.2, 1.2))
        for s_ in (-1, 1):
            box(b, f, "wood", cx_, y_ + hy_, cz_ + s_ * (hz_ + 0.005), hx_ + 0.01, 0.025, 0.006, uv_scale=(1.2, 0.3), grain="x")
    # A sack slumped against the right-hand crate.
    ball(b, f, "cloth_oat", 0.82, 0.3, 0.76, 0.22, 7)
    # Striped awning that sags between its poles.
    for i in range(6):
        x0 = -w - 0.12 + i * (2 * w + 0.24) / 6
        x1 = x0 + (2 * w + 0.24) / 6
        mat = "cloth_red" if i % 2 == 0 else "cloth_oat"
        roof_slope(b, f, mat, x0, x1, d + 0.5, 2.28, -d - 0.05, 2.0, 1.2, 0.0, 0.1, (1, 6))
    # The counter's bare. What's for sale is set out on it when the stall opens, and packed away at dusk with a cloth roped over
    # the counter for the night: the renderer draws those (Renderer.wares), at this same place (`stall` in src/folk/town.js PLACES).
    # Something to bump into: the counter, the crates, and the four posts.
    for lx, lz, hx_, hz_ in ((0, cz, w + 0.08, 0.36), (-1.15, 0.7, 0.33, 0.25), (1.0, 0.73, 0.5, 0.25)):
        wx, _, wz = f.p(lx, 0, lz)
        S.collider(wx, wz, hx_, hz_, yaw, 1.0)
    wx, _, wz = f.p(0, 0, d)
    for sx in (-1, 1):
        px_, _, pz_ = f.p(sx * w, 0, d)
        S.collider(px_, pz_, 0.1, 0.1, yaw, 2.4)


def cart(S, x, z, yaw):
    b = S.b
    f = Frame(x, z, yaw)
    box(b, f, "wood", 0, 0.82, 0, 0.72, 0.05, 1.25, uv_scale=(1.5, 1.5))
    for sx in (-1, 1):
        box(b, f, "wood", sx * 0.74, 1.03, 0, 0.03, 0.18, 1.25, uv_scale=(1.5, 1.0))
        cylinder(b, f, "wood", (sx * 0.86, 0.56, 0.05), (sx * 0.78, 0.56, 0.05), 0.56, 0.56, 16, uv=(0.8, 0.2), cap_mat="wood")
        cylinder(b, f, "iron", (sx * 0.87, 0.56, 0.05), (sx * 0.77, 0.56, 0.05), 0.58, 0.58, 16, caps=False)
    for sz in (-1, 1):
        box(b, f, "wood", 0, 1.03, sz * 1.27, 0.74, 0.18, 0.03, uv_scale=(1.5, 1.0))
    for sx in (-0.34, 0.34):
        cylinder(b, f, "wood", (sx, 0.55, 3.0), (sx, 0.84, 1.1), 0.045, 0.05, 6, uv=(0.3, 0.3))
    for i in range(3):
        crate(S, -0.3 + 0.5 * i, 0.4 - i * 0.65, 0, 0.0, 0.0, collide=False) if False else None
    S.collider(x, z, 0.8, 1.35, yaw, 1.2)


def tree(S, x, z, height, spread, seed, kind=0):
    """Oak, ash, lime or a tall poplar: a leaning, forking trunk and limbs out to separate masses of leaf."""
    r = random.Random(seed)
    b = S.b
    f = Frame(x, z, r.uniform(0, math.tau))
    trunk_frac = {0: 0.34, 1: 0.5, 2: 0.42, 3: 0.3}[kind]
    limbs = {0: 8, 1: 6, 2: 7, 3: 9}[kind]
    spread_y = {0: 0.42, 1: 0.5, 2: 0.46, 3: 0.75}[kind]
    trunk_h = height * trunk_frac
    r0 = 0.03 * height + 0.1
    lean = (r.uniform(-0.12, 0.12) * trunk_h, r.uniform(-0.12, 0.12) * trunk_h)
    # The bole, in bending sections, flared at the foot.
    pts = []
    n_seg = 5
    for i in range(n_seg + 1):
        t = i / n_seg
        pts.append((lean[0] * t * t + math.sin(t * 4 + seed) * 0.07 * t * trunk_h * 0.2, -0.45 + (trunk_h + 0.45) * t, lean[1] * t * t + math.cos(t * 3 + seed) * 0.07 * t * trunk_h * 0.2))
    rad = lambda t: r0 * (1.0 - 0.34 * t) + r0 * 0.75 * max(0.0, 1 - t * 5.5) ** 2
    for i in range(n_seg):
        cylinder(b, f, "bark", pts[i], pts[i + 1], rad(i / n_seg), rad((i + 1) / n_seg), 9, uv=(1.5, 0.5), caps=False)
    top = pts[-1]
    canopy_c = (top[0], height * (trunk_frac + (1 - trunk_frac) * 0.5), top[2])
    masses = []
    forks = []
    for i in range(limbs):
        a = i / limbs * math.tau + r.uniform(-0.4, 0.4)
        reach = r.uniform(0.45, 0.9) if kind != 3 else r.uniform(0.3, 0.55)
        height_f = r.uniform(0.2, 0.95)
        tip = (top[0] + math.cos(a) * spread * reach, trunk_h + height_f * (height - trunk_h) * 0.8, top[2] + math.sin(a) * spread * reach)
        start_t = r.uniform(0.75, 1.0)
        base = (pts[3][0] + (top[0] - pts[3][0]) * start_t, trunk_h * start_t + (pts[3][1] - trunk_h) * (1 - start_t), pts[3][2] + (top[2] - pts[3][2]) * start_t)
        mid = ((base[0] + tip[0]) / 2 + r.uniform(-0.3, 0.3), (base[1] + tip[1]) / 2 - r.uniform(0, 0.4), (base[2] + tip[2]) / 2 + r.uniform(-0.3, 0.3))
        cylinder(b, f, "bark", base, mid, r0 * 0.42, r0 * 0.22, 6, uv=(1.2, 0.6), caps=False)
        cylinder(b, f, "bark", mid, tip, r0 * 0.22, 0.03, 5, uv=(1.0, 0.6), caps=False)
        forks.append((mid, tip))
        masses.append((tip, r.uniform(0.3, 0.46) * spread))
    masses.append(((top[0], height * 0.88, top[2]), 0.46 * spread))
    for mc, mr in masses:
        n_cards = int(24 + mr * 9)
        for i in range(n_cards):
            th, ph = r.uniform(0, math.tau), math.acos(r.uniform(-0.5, 1))
            rd = r.uniform(0.4, 1.0) * mr
            ctr = (mc[0] + math.cos(th) * math.sin(ph) * rd, mc[1] + math.cos(ph) * rd * (0.8 if kind != 3 else 1.3), mc[2] + math.sin(th) * math.sin(ph) * rd)
            size = r.uniform(0.7, 1.2) * (0.7 + mr * 0.14)
            out = norm(add(scale(norm(sub(ctr, mc)), 0.7), scale(norm(sub(ctr, canopy_c)), 0.5)))
            tilt = norm((r.uniform(-1, 1), r.uniform(-1, 1), r.uniform(-1, 1)))
            u = norm(cross(out, tilt))
            v = cross(u, out)
            u = norm(add(u, scale(out, r.uniform(-0.55, 0.55))))
            pa = add(ctr, add(scale(u, -size), scale(v, -size)))
            pb = add(ctr, add(scale(u, size), scale(v, -size)))
            pc = add(ctr, add(scale(u, size), scale(v, size)))
            pd = add(ctr, add(scale(u, -size), scale(v, size)))
            ps = [f.p(*p) for p in (pa, pb, pc, pd)]
            ns = [f.d(*norm(add(scale(out, 0.85), (0, 0.3, 0)))) for _ in range(4)]
            b.tri("leaves", (ps[0], ps[1], ps[2]), ((0, 1), (1, 1), (1, 0)), (ns[0], ns[1], ns[2]))
            b.tri("leaves", (ps[0], ps[2], ps[3]), ((0, 1), (1, 0), (0, 0)), (ns[0], ns[2], ns[3]))
    S.collider(x, z, r0 * 1.2, r0 * 1.2, 0, 3)
    S.trees.append({"p": [round(x, 2), round(z, 2)], "h": height, "s": spread})


def herb_bed(S, x, z, hx, hz, seed):
    """A raised bed boarded round, the earth in it dark, and herbs in rows: some bushy, some low."""
    b = S.b
    f = Frame(x, z, 0.0)
    for sx in (-1, 1):
        box(b, f, "wood", sx * hx, 0.1, 0, 0.045, 0.16, hz + 0.045, uv_scale=(0.8, 0.3))
    for sz in (-1, 1):
        box(b, f, "wood", 0, 0.1, sz * hz, hx, 0.16, 0.045, uv_scale=(0.8, 0.3), grain="x")
    box(b, f, "bark", 0, 0.1, 0, hx - 0.04, 0.13, hz - 0.04, uv_scale=(0.5, 0.5))
    r = random.Random(seed)
    rows = max(1, int(round(hz * 2 / 0.5)))
    for j in range(rows):
        zz = -hz + (j + 0.5) * 2 * hz / rows
        xx = -hx + 0.22
        while xx < hx - 0.18:
            rad = r.uniform(0.12, 0.21)
            ball(b, f, "leaves", xx, 0.22 + rad * 0.55, zz + r.uniform(-0.04, 0.04), rad, 6)
            xx += rad * 1.6 + r.uniform(0.0, 0.08)
    S.collider(x, z, hx + 0.06, hz + 0.06, 0.0, 0.3)


def gate_pier(S, x, z):
    """A square stone pier with a ball on it, either side of a gateway."""
    f = Frame(x, z, 0.0)
    box(S.b, f, "stone", 0, 0.8, 0, 0.3, 0.85, 0.3, uv_scale=(0.42, 0.42))
    box(S.b, f, "stone", 0, 1.68, 0, 0.36, 0.05, 0.36, uv_scale=(0.42, 0.42))
    ball(S.b, f, "stone", 0, 1.93, 0, 0.2, 7)
    S.collider(x, z, 0.32, 0.32, 0.0, 1.8)


def low_wall(S, x0, z0, x1, z1, h=1.05):
    """A dry-stone wall in irregular courses: something to fight around."""
    b = S.b
    L = math.hypot(x1 - x0, z1 - z0)
    yaw = math.atan2(x1 - x0, z1 - z0)
    f = Frame(x0, z0, yaw)
    r = random.Random(int(x0 * 7 + z0 * 13))
    courses = 4
    hc = h / courses
    for c in range(courses):
        pos = r.uniform(0, 0.2)
        while pos < L:
            bl = r.uniform(0.36, 0.72)
            if pos + bl > L:
                bl = L - pos
            if bl > 0.12:
                top_gone = c == courses - 1 and r.random() < 0.28
                if not top_gone:
                    box(b, f, "rubble", r.uniform(-0.03, 0.03), -0.05 + c * hc + hc / 2, pos + bl / 2, 0.24 - c * 0.012, hc / 2 * 0.97, bl / 2 * 0.97, uv_scale=(0.7, 0.7))
            pos += bl
    S.collider((x0 + x1) / 2, (z0 + z1) / 2, 0.24, L / 2, yaw, h)


def xz(f, lx, lz):
    p = f.p(lx, 0, lz)
    return p[0], p[2]


def compose():
    S = Scene()
    W = lambda n, sq=False: (f"wall_{n:02d}", sq)
    U = lambda a, b, c, d=None: [(f"wall_{n:02d}", 0, 1, 5.1) for n in (a, b, c, c if d is None else d)]
    STONE = ("stone", False)
    RUBBLE = ("rubble", False)
    E, S_, N, Wt = math.pi / 2, math.pi, 0.0, -math.pi / 2     # which way each door looks: east, north, south, west

    # 1. The inn: long, on the north side of the square, facing it, a gable over its best room and two windows out of the roof.
    f = house(S, 1.0, -19.0, N, 15.0, 7.4, {
        "h1": 3.3, "ground": [W(16), W(19), W(17), W(17)], "upper": U(8, 10, 9),
        "gable": "wall_07", "roof": "roof_1", "pitch": 50, "sag": 0.1, "chimney": (5.2, -0.8),
        "cross": [(-4.2, 2.2)], "dormers": [(1.2, 2.9), (4.4, 2.9)],
        "windows_front": [(-4.2, 4.95), (0.2, 4.95), (2.6, 4.95), (5.6, 4.95)], "windows_back": [(-3.0, 4.95), (3.0, 4.95)],
        "doors": [{"x": -1.4}], "glow": [(3.0, 1.7, 4.3), (-5.0, 1.7, 4.3)],
    })
    hanging_sign(S, f, -3.1, 2.75, 3.75)
    box(S.b, f, "wood", 3.6, 0.46, 4.1, 1.1, 0.04, 0.2, uv_scale=(0.9, 0.2), grain="x")
    for s in (-1, 1):
        box(S.b, f, "wood", 3.6 + s * 0.95, 0.22, 4.1, 0.04, 0.22, 0.17, uv_scale=(0.9, 0.3))
    # 2. The chandler's, west: gable-end on to the square, tall, with the attic's own windows up in it.
    f = house(S, -19.0, 0.5, E, 9.5, 7.0, {
        "h1": 3.2, "h2": 3.0, "jetty": 0.5, "ground": [W(18), W(18), W(13, True), W(13, True)], "upper": U(12, 11, 12),
        "gable": "wall_09", "roof": "roof_3", "ridge": "z", "pitch": 52, "sag": 0.11, "chimney": (-2.6, 0.8), "over_x": 0.6,
        "windows_front": [(-2.3, 5.0), (2.3, 5.0)], "windows_back": [(0.0, 5.0)], "windows_left": [(0.0, 5.0)], "windows_right": [(-1.6, 5.0), (1.6, 5.0)],
        "doors": [{"x": 0.0}], "glow": [(2.6, 1.7, 3.9)],
    })
    for s in (-1, 1):
        window(S, f, s * 1.5, 7.55, 4.03, 1, w=0.5, h=0.46)
    box(S.b, f, "cloth_red", 2.9, 2.3, 3.56, 0.32, 0.5, 0.015, uv_scale=(1, 1))
    # 3. The reeve's, east: stone below, a hipped roof with a stack at each end, and a porch to the door.
    f = house(S, 18.5, 3.5, Wt, 10.5, 6.6, {
        "h1": 3.4, "jetty": 0.0, "ground": [W(15, True), W(14, True), W(15, True), W(15, True)], "upper": U(7, 9, 10),
        "gable": "wall_11", "roof": "roof_2", "kind": "hip", "pitch": 44, "sag": 0.08, "over_z": 0.6, "chimney": (-3.4, -0.6), "chimneys": [(-3.4, -0.6), (4.3, -2.6)], "stack": 0.9,
        "windows_front": [(-3.6, 5.05), (0.6, 5.05), (3.6, 5.05)], "windows_back": [(-2.0, 5.05), (2.0, 5.05)], "windows_left": [(0.0, 5.05)], "windows_right": [(0.0, 5.05)],
        "doors": [{"x": 0.6, "lamp": 1.25}], "glow": [(-3.2, 1.7, 3.7)],
    })
    porch(S, f, 0.6, 3.3, 1.3, 1.7, 3.15)
    # 4. The south cottage: low, the top of its gables clipped back, one big window out of the roof, and a lean-to behind.
    f = house(S, 9.5, 21.0, S_, 10.0, 6.6, {
        "h1": 2.7, "h2": 2.4, "jetty": 0.0, "ground": [W(17), W(20, True), W(20, True), W(16)], "upper": U(11, 7, 8),
        "gable": "wall_10", "roof": "roof_4", "kind": "half", "clip": 0.3, "pitch": 56, "sag": 0.14, "chimney": (-2.8, 0.4),
        "dormers": [(1.8, 2.2, 1.0, 1.2)], "windows_left": [(0.0, 4.2)],
        "doors": [{"x": -1.0}], "glow": [(2.6, 1.7, 3.9)],
    })
    shed(S, f, -3.4, -5.7, 3.0, -3.3, 3.6, 2.1, (0, -1), mat="roof_4", walls=("rubble", 2.6))
    woodpile(S, f, 4.3, -3.95, 1.4, 4, along_x=False)

    well(S, -1.5, 1.0)
    # The market round the well: curios, ale, bread and cloth. (Where each keeper stands, and their customers: PLACES in src/folk/town.js.)
    for sx, sz, syaw in STALLS:
        stall(S, sx, sz, syaw)
    cart(S, 17.5, -6.5, 1.1)
    for x, z, y in ((-9.4, -11.6, 0), (-10.3, -10.9, 0), (-9.6, -10.6, 0)):
        barrel(S, x, z, Rng.uniform(0, 6), 0.36, 0.92, y)
    barrel(S, 11.6, -5.0, 0.3)
    barrel(S, 12.4, -4.5, 1.2)
    crate(S, 13.0, -5.6, 0.4, 0.45)
    crate(S, 13.05, -5.6, 0.9, 0.3, 0.9, collide=False)
    crate(S, -14.0, 6.6, 0.2, 0.5)
    crate(S, -13.4, 7.7, -0.5, 0.42)
    barrel(S, -14.1, 8.1, 0.6)
    crate(S, 3.0, 16.2, 0.1, 0.45)
    barrel(S, 4.0, 16.8, 0.9)
    # Paddock fence on the south-west, a run behind the inn, and two more out east. All clear of the roads and lanes: node tools/village/fences.mjs checks.
    fence(S, [(-21, 12.2), (-21, 21), (-8, 26), (-6, 26.5)])
    fence(S, [(-10.5, -22.2), (-19, -20), (-26, -12.5)])
    fence(S, [(21.5, -9.5), (27.5, -13.5), (28, -6)])
    fence(S, [(21, 27), (31, 20), (33, 12)])
    # Low stone walls and a stack of crates in the square: cover, corners, and something to back an enemy against.
    low_wall(S, -8.5, 6.5, -5.0, 9.5)
    low_wall(S, 11.0, -0.6, 14.0, -3.0)
    low_wall(S, 5.8, 8.6, 9.8, 7.8)
    crate(S, -9.0, 10.6, 0.5, 0.42)
    crate(S, 9.9, -3.5, 0.2, 0.5)
    # A few great oaks, inside the town. The pines stand outside it: tools/village/build_pines.py and src/core/forest.js.
    for i, (x, z, h, sp) in enumerate(((-14.5, 15.0, 17, 8.5), (-29, -22, 18, 9), (31, -6, 19, 9.5), (28.5, 25, 17, 9), (-27.5, 34, 20, 10), (24, -36, 18, 9))):
        tree(S, x, z, h, sp, 100 + i, 0)

    # The town beyond the square, up the south road and the east road and out behind. Their plots are levelled: PLOTS in src/core/terrain.js.
    # 5. The smith's: rubble below, a broad low roof, and the forge out under its own lean-to with a stack of its own.
    f = house(S, -10.0, 36.0, E, 9.0, 6.6, {
        "h1": 3.0, "h2": 2.5, "jetty": 0.0, "ground": [RUBBLE, RUBBLE, RUBBLE, RUBBLE], "upper": U(10, 12, 8),
        "gable": "wall_07", "roof": "roof_1", "pitch": 46, "sag": 0.1, "chimney": (-2.6, 0.6), "over_x": 0.35,
        "windows_front": [(2.0, 4.5)], "windows_left": [(0.0, 4.5)],
        "doors": [{"x": 0.3}], "glow": [(2.6, 1.7, 3.7)],
    })
    shed(S, f, 4.5, -2.8, 7.9, 2.8, 4.4, 2.5, (1, 0), mat="roof_1", posts=[(7.9, -2.8), (7.9, 2.8)])
    chimney_stack(S, f, 5.15, -2.1, 7.6, "broad")
    box(S.b, f, "rubble", 5.6, 0.45, -1.1, 1.0, 0.6, 0.85, uv_scale=(0.42, 0.42))
    box(S.b, f, "flame", 5.6, 1.06, -1.1, 0.55, 0.03, 0.42, uv_scale=(1, 1))
    S.lights.append({"p": [round(v, 3) for v in f.p(5.9, 1.5, -1.1)], "c": [1.0, 0.4, 0.13], "r": 8.0, "i": 7.0, "flicker": 0.9})
    box(S.b, f, "bark", 6.2, 0.33, 1.3, 0.27, 0.33, 0.27, uv_scale=(0.6, 0.6))
    box(S.b, f, "iron", 6.2, 0.72, 1.3, 0.13, 0.06, 0.38, uv_scale=(0.2, 0.2))
    box(S.b, f, "iron", 6.2, 0.8, 1.72, 0.04, 0.03, 0.12, uv_scale=(0.2, 0.2))
    x, z = xz(f, 5.6, -1.1)
    S.collider(x, z, (1.0) * f.k, (0.85) * f.k, f.yaw, 1.05)
    x, z = xz(f, 6.2, 1.3)
    S.collider(x, z, (0.3) * f.k, (0.42) * f.k, f.yaw, 0.8)
    barrel(S, *xz(f, 7.2, 2.2), 0.4)
    # 6. The alewife's: two gables over the street, side by side.
    f = house(S, 16.0, 37.0, Wt, 10.0, 7.0, {
        "jetty": 0.5, "ground": [W(17), W(18), W(15, True), W(15, True)], "upper": U(11, 7, 12),
        "gable": "wall_10", "roof": "roof_4", "pitch": 52, "sag": 0.1, "chimney": (3.9, 0.6), "cross": [(-2.4, 1.5), (2.4, 1.5)],
        "windows_front": [(-2.4, 4.85), (2.4, 4.85)], "windows_back": [(0.0, 4.85)],
        "doors": [{"x": 0.0, "lamp": 1.0}], "glow": [(-3.0, 1.7, 4.0)],
    })
    hanging_sign(S, f, -1.6, 2.7, 3.55)
    for lx, lz in ((-3.5, 4.2), (-4.2, 4.3), (-3.8, 4.95)):
        barrel(S, *xz(f, lx, lz), 0.3)
    barrel(S, *xz(f, 2.9, 4.2), 1.1, 0.42, 1.05)
    # 7. The tithe barn: the biggest roof in the town on stone walls, buttressed, with a hoist over a loft door.
    f = house(S, 38.0, -36.0, N, 12.0, 8.0, {
        "h1": 3.4, "h2": 2.8, "jetty": 0.0, "stone_body": True, "ground": [STONE, STONE, STONE, STONE], "upper": [("stone", 0, 1, 2.6)] * 4,
        "gable": "wall_18", "roof": "roof_3", "kind": "half", "clip": 0.34, "pitch": 52, "sag": 0.16, "chimney": (-5.1, -3.1), "stack": 0.7,
        "slits": [(-3.5, 2.0, -1), (0.0, 2.0, -1), (3.5, 2.0, -1), (-1.5, 2.2, 2), (1.5, 2.2, 2), (-1.5, 2.2, -2), (1.5, 2.2, -2)],
        "doors": [{"x": 0.0, "lamp": 1.35}],
    })
    for x_ in (-4.2, 4.2):
        box(S.b, f, "rubble", x_, 1.5, 4.25, 0.4, 1.9, 0.25, uv_scale=(0.42, 0.42))
        x, z = xz(f, x_, 4.25)
        S.collider(x, z, (0.4) * f.k, (0.25) * f.k, f.yaw, 3.0)
    for s in (-1, 1):
        for lz in (-2.2, 2.2):
            box(S.b, f, "rubble", s * 6.25, 1.5, lz, 0.25, 1.9, 0.4, uv_scale=(0.42, 0.42))
            x, z = xz(f, s * 6.25, lz)
            S.collider(x, z, (0.25) * f.k, (0.4) * f.k, f.yaw, 3.0)
    box(S.b, f, "wood", 2.6, 5.0, 4.03, 0.8, 0.8, 0.03, uv_scale=(0.9, 0.9), grain="x")
    box(S.b, f, "wood", 2.6, 6.45, 4.8, 0.09, 0.09, 1.0, uv_scale=(0.9, 0.2))
    cylinder(S.b, f, "iron", (2.6, 3.0, 5.55), (2.6, 6.37, 5.55), 0.012, 0.012, 5, caps=False)
    box(S.b, f, "wood", 2.6, 2.75, 5.55, 0.3, 0.25, 0.3, uv_scale=(0.9, 0.9))
    box(S.b, f, "wood", 0.0, 2.55, 4.03, 1.15, 0.12, 0.05, uv_scale=(0.9, 0.2), grain="x")
    # 8. The tannery: narrow, gable-on and very steep, hides on racks out front and a lean-to down its side.
    f = house(S, 44.0, -16.0, S_, 8.0, 7.6, {
        "h1": 3.0, "h2": 2.4, "jetty": 0.0, "ground": [W(18), W(17), W(13, True), W(13, True)], "upper": U(7, 8, 11),
        "gable": "wall_09", "roof": "roof_1", "ridge": "z", "pitch": 60, "sag": 0.13, "chimney": (2.6, 2.0), "over_x": 0.4,
        "windows_front": [(-1.8, 4.5)], "windows_left": [(-1.4, 4.5), (1.4, 4.5)],
        "doors": [{"x": -0.4}],
    })
    shed(S, f, 4.0, -3.0, 6.3, 1.4, 3.6, 2.2, (1, 0), mat="roof_1", walls=("wall_18", 4.0))
    rack(S, f, 2.2, 5.2, 2.4, "cloth_oat", 2)
    rack(S, f, -2.6, 5.4, 2.0, "cloth_red", 2)
    for lx, lz in ((5.1, 2.5), (4.5, 3.2)):
        barrel(S, *xz(f, lx, lz), 0.2, 0.5, 0.62)
    # 9. The weaver's: long and low, a row of three windows out of the roof for the light on the loom, and cloth out on lines.
    f = house(S, -40.0, -14.0, E, 11.0, 6.0, {
        "h1": 2.9, "h2": 2.4, "jetty": 0.35, "ground": [W(17), W(16), W(15, True), W(15, True)], "upper": U(12, 9, 8),
        "gable": "wall_08", "roof": "roof_2", "pitch": 48, "sag": 0.08, "chimney": (4.2, 0.2),
        "dormers": [(-3.4, 2.15, 0.62, 1.0), (0.0, 2.15, 0.62, 1.0), (3.4, 2.15, 0.62, 1.0)], "windows_left": [(0.0, 4.4)], "windows_right": [(0.0, 4.4)],
        "doors": [{"x": 0.3}], "glow": [(-3.0, 1.7, 3.4)],
    })
    rack(S, f, -3.2, 5.4, 3.4, "cloth_red", 3)
    rack(S, f, 3.2, 5.8, 3.0, "cloth_oat", 3)
    # 10. The hunter's: small and hugely steep, nearly all roof, with a chimney to match, antlers over the door and logs stacked under a lean-to.
    f = house(S, -42.0, 18.0, E, 8.5, 7.0, {
        "h1": 2.9, "h2": 2.4, "jetty": 0.0, "ground": [W(19), W(18), W(20, True), W(20, True)], "upper": U(10, 11, 7),
        "gable": "wall_12", "roof": "roof_4", "pitch": 64, "sag": 0.12, "chimney": (-3.0, 0.2), "stack": 0.9, "stack_kind": "broad", "over_x": 0.4,
        "doors": [{"x": -0.3}], "windows_right": [(0.0, 4.4)],
    })
    shed(S, f, 4.25, -3.0, 6.5, 2.0, 2.7, 1.8, (1, 0), mat="roof_4", posts=[(6.5, -3.0), (6.5, 2.0)])
    woodpile(S, f, 5.5, -0.5, 4.0, 6, along_x=False)
    rack(S, f, -3.0, 5.0, 2.4, "cloth_oat", 2)
    for s in (-1, 1):
        beam(S.b, f, "bark", (-0.3, 3.0, 3.56), (-0.3 + s * 0.55, 3.45, 3.62), 0.022, 0.022)
        beam(S.b, f, "bark", (-0.3 + s * 0.55, 3.45, 3.62), (-0.3 + s * 0.72, 3.95, 3.6), 0.016, 0.016)
        beam(S.b, f, "bark", (-0.3 + s * 0.34, 3.28, 3.6), (-0.3 + s * 0.3, 3.68, 3.62), 0.014, 0.014)
    box(S.b, f, "bark", -0.3, 3.0, 3.54, 0.09, 0.12, 0.03, uv_scale=(0.4, 0.4))
    # 11. The coffin maker's: dark, thin, gable-on, and what it makes stacked by the door.
    f = house(S, 8.0, -37.0, N, 7.5, 8.0, {
        "jetty": 0.5, "h2": 2.8, "ground": [W(19), W(20, True), W(20, True), W(19)], "upper": U(9, 7, 7),
        "gable": "wall_07", "roof": "roof_3", "ridge": "z", "pitch": 58, "sag": 0.09, "chimney": (2.6, -2.6), "over_x": 0.5,
        "windows_front": [(0.0, 5.0)], "windows_right": [(-2.0, 5.0)],
        "doors": [{"x": 0.0, "lamp": -1.05}],
    })
    for i, (lx, lz) in enumerate(((3.4, 5.0), (3.4, 5.0), (3.4, 5.0))):
        coffin(S, f, lx + i * 0.02, i * 0.35, lz, (0, 1))
    coffin(S, f, -2.7, 0.0, 5.0, (0, 1))
    x, z = xz(f, 3.4, 5.0)
    S.collider(x, z, (0.35) * f.k, (1.0) * f.k, f.yaw, 1.05)
    x, z = xz(f, -2.7, 5.0)
    S.collider(x, z, (0.35) * f.k, (1.0) * f.k, f.yaw, 0.34)
    hanging_sign(S, f, -1.5, 2.7, 4.0)
    # 12. The tower house: square stone, slits for windows, a tall pyramid of a roof, and a shed against its foot.
    f = house(S, -30.0, -34.0, N, 7.4, 7.4, {
        "h1": 3.3, "h2": 3.4, "jetty": 0.0, "stone_body": True, "ground": [STONE, STONE, STONE, STONE], "upper": [("stone", 0, 1, 2.6)] * 4,
        "gable": "wall_18", "roof": "roof_1", "kind": "hip", "finial": True, "pitch": 58, "sag": 0.06, "over_z": 0.42, "chimney": (2.6, 0.6), "stack": 0.7,
        "slits": [(-1.8, 5.2, 1), (1.8, 5.2, 1), (-1.6, 2.0, 1), (1.7, 2.0, 1), (0.0, 5.2, -1), (0.0, 2.0, -1), (-1.2, 5.2, 2), (1.2, 5.2, 2), (-1.2, 5.2, -2), (1.2, 2.0, -2)],
        "doors": [{"x": 0.0, "lamp": 1.1}],
    })
    for k in range(7):
        x_ = -3.3 + k * 1.1
        for s in (-1, 1):
            box(S.b, f, "stone", x_, 6.72, s * 3.76, 0.14, 0.13, 0.1, uv_scale=(0.42, 0.42))
            box(S.b, f, "stone", s * 3.76, 6.72, x_, 0.1, 0.13, 0.14, uv_scale=(0.42, 0.42))
    shed(S, f, 3.7, -1.5, 6.1, 2.2, 3.1, 2.2, (1, 0), mat="roof_1", walls=("rubble", 2.6))
    # The east end, on the ground the church stood on (OLD_CHURCH_GROUND in src/core/town.js), either side of the church road.
    # 13. The reeve's manor (the Ashbys'): the one house in the town of dressed stone all the way up, hipped, a stack at each end, a porch, and a
    # walled forecourt to the road with a pier either side of its gateway. Coursed rubble dressed with cut stone: quoins, a string
    # course, mullioned windows on both floors in the same bays, and a porch of two storeys under a gable of its own.
    RUBBLE = ("rubble", False)
    f = house(S, 80.0, -11.5, N, 13.0, 8.0, {
        "h1": 3.4, "h2": 2.9, "jetty": 0.0, "stone_body": True, "dressed": True, "ground": [RUBBLE] * 4, "upper": [("rubble", 0, 1, 2.6)] * 4,
        "gable": "wall_18", "roof": "roof_2", "kind": "hip", "pitch": 40, "sag": 0.04, "over_z": 0.55,
        "chimney": (5.4, 0.6), "chimneys": [(5.4, 0.6), (-5.4, 1.2)], "stack": 1.9,
        "windows_front": [(-5.0, 1.8), (-2.9, 1.8), (2.9, 1.8), (5.0, 1.8), (-5.0, 5.1), (-2.9, 5.1), (2.9, 5.1), (5.0, 5.1)],
        "windows_back": [(-3.2, 1.8), (3.2, 1.8), (-3.2, 5.1), (3.2, 5.1)],
        "windows_left": [(-1.4, 1.8), (-1.4, 5.1)], "windows_right": [(-1.8, 1.8), (1.9, 1.8), (-1.8, 5.1), (1.9, 5.1)],
        "doors": [{"x": 0.0, "lamp": 0.95}], "glow": [(-2.9, 1.8, 4.5), (2.9, 1.8, 4.5)],
    })
    manor_porch(S, f, 0.0, 4.0)
    low_wall(S, 71.2, -7.3, 71.2, -3.4)
    low_wall(S, 71.2, -3.4, 77.8, -3.4)
    low_wall(S, 82.2, -3.4, 88.8, -3.4)
    low_wall(S, 88.8, -3.4, 88.8, -7.3)
    gate_pier(S, 77.75, -3.4)
    gate_pier(S, 82.25, -3.4)
    barrel(S, 89.8, -4.6, 0.3)
    barrel(S, 90.4, -5.3, 1.0)
    crate(S, 90.1, -6.3, 0.2, 0.45)
    # 14. The bakehouse, across the road: a broad stack, and the bread oven out under a lean-to on its east end, a pile of faggots
    # to fire it.
    f = house(S, 64.0, 9.5, S_, 9.5, 7.0, {
        "h1": 3.0, "h2": 2.5, "jetty": 0.4, "ground": [W(16), W(19), W(13, True), W(13, True)], "upper": U(8, 12, 10),
        "gable": "wall_08", "roof": "roof_4", "pitch": 50, "sag": 0.1, "chimney": (-3.6, 0.4), "stack": 1.2, "stack_kind": "broad",
        "windows_front": [(-1.6, 4.55), (2.4, 4.55)], "windows_back": [(0.0, 4.55)], "windows_right": [(0.0, 4.55)],
        "doors": [{"x": 1.0, "lamp": -1.05}], "glow": [(-2.4, 1.7, 4.1)],
    })
    hanging_sign(S, f, -1.7, 2.6, 3.55)
    shed(S, f, -7.6, -2.5, -4.75, 2.5, 2.9, 2.1, (-1, 0), mat="roof_4", posts=[(-7.6, -2.5), (-7.6, 2.5)])
    box(S.b, f, "rubble", -6.1, 0.42, -0.6, 0.95, 0.52, 1.0, uv_scale=(0.42, 0.42))
    ball(S.b, f, "rubble", -6.1, 0.95, -0.6, 0.85, 9)
    # The mouth, low in the dome's face, a stone over it.
    box(S.b, f, "flame", -6.1, 1.12, 0.25, 0.24, 0.16, 0.02, uv_scale=(1, 1))
    box(S.b, f, "stone", -6.1, 1.32, 0.22, 0.32, 0.05, 0.08, uv_scale=(0.42, 0.42))
    chimney_stack(S, f, -6.3, -1.1, 4.0, "square")
    S.lights.append({"p": [round(v, 3) for v in f.p(-6.1, 1.0, 0.8)], "c": [1.0, 0.45, 0.16], "r": 6.0, "i": 4.0, "flicker": 0.7})
    x, z = xz(f, -6.1, -0.6)
    S.collider(x, z, (0.98) * f.k, (1.02) * f.k, f.yaw, 1.8)
    woodpile(S, f, -6.6, 1.75, 1.6, 3, along_x=True)
    barrel(S, *xz(f, 3.7, 3.95), 0.4)
    crate(S, *xz(f, 2.9, 3.95), 0.3, 0.42)
    cart(S, 75.6, 10.2, 0.12)
    # 15. The herbalist's: small and steep, its gable to the road, and the physic garden fenced in behind it, a step off its back
    # wall, entered at its south-east corner: beds of herbs in rows, and a frame for the linen.
    f = house(S, 84.0, 10.0, S_, 8.0, 7.0, {
        "h1": 2.9, "h2": 2.4, "jetty": 0.0, "ground": [W(20, True), W(18), W(16), W(16)], "upper": U(9, 11, 12),
        "gable": "wall_12", "roof": "roof_3", "ridge": "z", "pitch": 60, "sag": 0.12, "chimney": (2.4, 0.3), "over_x": 0.45,
        "windows_front": [(1.5, 4.4)], "windows_left": [(-1.2, 4.4)], "windows_right": [(1.2, 4.4)],
        "doors": [{"x": -1.0}], "glow": [(1.8, 1.7, 4.1)],
    })
    # Bunches drying under the girt, beside the door.
    beam(S.b, f, "wood", (0.55, 2.55, 3.62), (3.45, 2.55, 3.62), 0.025, 0.025)
    for k in range(6):
        hx_ = 0.8 + k * 0.5
        box(S.b, f, "wood", hx_, 2.42, 3.62, 0.006, 0.12, 0.006, uv_scale=(0.2, 0.2))
        box(S.b, f, "leaves", hx_, 2.2, 3.62, 0.09, 0.15, 0.07, uv_scale=(0.6, 0.6))
    fence(S, [(86.0, 16.5), (79.4, 16.5), (79.4, 23.6), (88.6, 23.6), (88.6, 19.6)])
    herb_bed(S, 81.7, 19.9, 1.7, 0.55, 51)
    herb_bed(S, 81.7, 22.4, 1.7, 0.5, 52)
    herb_bed(S, 86.3, 22.4, 1.3, 0.5, 53)
    rack(S, Frame(0.0, 0.0, 0.0), 84.6, 17.6, 2.4, "cloth_oat", 2)
    # Where the town ends to the east, a post with a rag on it, for what's up the road.
    signpost(S, 97.0, 0.1, 2.9, -1.2, red=True)

    # Where the two roads up the hill leave the town, and where they end. (Heights from src/core/terrain.js.)
    signpost(S, -29.0, ROAD_SIGN_Y[0], 22.5, 0.63)
    signpost(S, -27.0, ROAD_SIGN_Y[1], -5.6, 0.0, red=True)
    summit(S)
    return S


def signpost(S, x, y, z, yaw, red=False):
    """An old post where a road leaves the town, its board pointing the way. The way down at speed has a rag tied to it."""
    f = Frame(x, z, yaw, y)
    b = S.b
    box(b, f, "wood", 0, 1.3, 0, 0.075, 1.5, 0.075, uv_scale=(0.9, 0.3))
    box(b, f, "wood", -0.72, 2.25, 0, 0.82, 0.13, 0.03, uv_scale=(1.2, 0.5), grain="x")
    box(b, f, "iron", 0.09, 2.25, 0, 0.012, 0.15, 0.04, uv_scale=(0.2, 0.2))
    if red:
        box(b, f, "cloth_red", -1.35, 1.92, 0.04, 0.09, 0.26, 0.012, uv_scale=(0.6, 0.6))
    S.collider(x, z, 0.14, 0.14, yaw, 3.0)


def summit(S):
    """The top of the hill: a cairn with a fire burning on it, where both roads end."""
    f = Frame(SUMMIT[0], SUMMIT[1], 0.0, SUMMIT[2])
    b = S.b
    for (cx, cz, yaw, hx, hy, hz, y) in ((0, 0, 0.3, 1.9, 0.62, 1.7, 0.42), (0.1, -0.1, 1.0, 1.35, 0.55, 1.25, 1.42), (-0.1, 0.05, 0.5, 0.8, 0.48, 0.74, 2.35),
                                         (2.2, 0.8, 0.9, 0.5, 0.36, 0.4, 0.22), (-1.9, 1.5, 0.2, 0.42, 0.3, 0.54, 0.18), (0.8, -2.3, 1.4, 0.56, 0.34, 0.4, 0.2), (-2.3, -1.2, 0.6, 0.36, 0.26, 0.36, 0.14)):
        g = Frame(SUMMIT[0] + cx, SUMMIT[1] + cz, yaw, SUMMIT[2])
        box(b, g, "rubble", 0, y, 0, hx, hy, hz, uv_scale=(0.42, 0.42))
    box(b, f, "iron", 0, 3.35, 0, 0.1, 0.6, 0.1, uv_scale=(0.2, 0.2))
    box(b, f, "iron", 0, 3.98, 0, 0.62, 0.05, 0.62, uv_scale=(0.2, 0.2))
    for a, c in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        box(b, f, "iron", a * 0.6, 4.15, c * 0.6, 0.62 if c else 0.03, 0.14, 0.62 if a else 0.03, uv_scale=(0.2, 0.2))
    box(b, f, "flame", 0, 4.24, 0, 0.46, 0.2, 0.46, uv_scale=(1, 1))
    S.lights.append({"p": [SUMMIT[0], SUMMIT[2] + 5.0, SUMMIT[1]], "c": [1.0, 0.45, 0.16], "r": 20.0, "i": 26.0, "flicker": 0.9})
    S.collider(SUMMIT[0], SUMMIT[1], 2.1, 2.0, 0.3, 3.0)


def write_indoor(S):
    """The insides of the houses, for the shader, which keeps the sun off them: between the markers in src/gfx/shaders.js."""
    tests = []
    for h in S.homes:
        turned = abs(math.sin(h["yaw"])) > 0.5
        along, across = h["w"] / 2 * h["k"] - 0.05, h["d"] / 2 * h["k"] - 0.05
        hx, hz = (across, along) if turned else (along, across)
        jx, jz = (h["jet"], 0.0) if turned else (0.0, h["jet"])
        y1, top = h["h1"] + 0.1, h["h1"] + 0.3 + h["h2"] - 0.23
        tests.append(f"inHome(p, {h['mid'][0]:.2f}, {h['mid'][1]:.2f}, {hx:.2f}, {hz:.2f}, {jx:.2f}, {jz:.2f}, {y1:.2f}, {top:.2f})")
    body = "    return select(0.0, 1.25, " + "\n      || ".join(tests) + ");\n"
    path = os.path.join(ROOT, "src", "gfx", "shaders.js")
    with open(path, encoding="utf8", newline="") as fh:
        src = fh.read()
    nl = "\r\n" if "\r\n" in src else "\n"
    a = src.index("// <homes>")
    a = src.index("\n", a) + 1
    b = src.rindex("\n", 0, src.index("// </homes>")) + 1
    src = src[:a] + body.replace("\n", nl) + src[b:]
    with open(path, "w", encoding="utf8", newline="") as fh:
        fh.write(src)


def make_material(name, tex_dir):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    path = os.path.join(tex_dir, f"{name}_c.webp")
    if os.path.exists(path) and not bsdf.inputs["Base Color"].is_linked:
        img = bpy.data.images.load(path, check_existing=True)
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.image = img
        mat.node_tree.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
        mat.node_tree.links.new(node.outputs["Alpha"], bsdf.inputs["Alpha"])
        if "door_" in name and name != "door_wall" or name == "leaves":
            mat.blend_method = "CLIP"
    elif name == "iron":
        bsdf.inputs["Base Color"].default_value = (0.04, 0.04, 0.045, 1)
    elif name == "flame":
        bsdf.inputs["Base Color"].default_value = (1.0, 0.6, 0.2, 1)
    return mat


def build(export=True):
    tex_dir = os.path.join(ROOT, "assets", "game", "tex")
    col = bpy.data.collections.get("Village")
    if col:
        for o in list(col.objects):
            bpy.data.objects.remove(o)
    else:
        col = bpy.data.collections.new("Village")
        bpy.context.scene.collection.children.link(col)
    S = compose()
    objs = []
    total = 0
    for name, m in S.b.mats.items():
        verts = [(p[0], -p[2], p[1]) for p in m["p"]]
        faces = [(i, i + 1, i + 2) for i in range(0, len(verts), 3)]
        me = bpy.data.meshes.new(name)
        me.from_pydata(verts, [], faces)
        uv = me.uv_layers.new(name="UVMap")
        for i, loop in enumerate(me.loops):
            u, v = m["uv"][loop.vertex_index]
            uv.data[i].uv = (u, 1 - v)
        me.update()
        me.normals_split_custom_set_from_vertices([(n[0], -n[2], n[1]) for n in m["n"]])
        me.materials.append(make_material(name, tex_dir))
        ob = bpy.data.objects.new(name, me)
        col.objects.link(ob)
        objs.append(ob)
        total += len(faces)
    print(f"{len(objs)} materials, {total} triangles, {len(S.colliders)} colliders, {len(S.lights)} lights")
    if export:
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        out = os.path.join(ROOT, "assets", "game", "village.glb")
        bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, export_image_format="NONE",
                                  export_texcoords=True, export_normals=True, export_materials="EXPORT", export_apply=False)
        with open(os.path.join(ROOT, "assets", "game", "village.json"), "w") as fh:
            json.dump({"colliders": S.colliders, "footprints": S.footprints, "homes": S.homes, "lights": S.lights, "smoke": S.smoke, "doors": S.doors, "trees": S.trees, "fences": S.fences}, fh, separators=(",", ":"))
        write_indoor(S)
        print(f"exported {os.path.getsize(out) / 1048576:.2f} MB")
    return objs
