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


class Frame:
    """A local frame on the ground: local z is the building's front."""

    def __init__(self, x, z, yaw, y=0.0):
        self.x, self.z, self.y, self.yaw = x, z, y, yaw
        self.c, self.s = math.cos(yaw), math.sin(yaw)

    def p(self, lx, ly, lz):
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
        self.windows = []
        self.trees = []

    def collider(self, x, z, hx, hz, yaw=0.0, h=4.0):
        self.colliders.append({"x": round(x, 3), "z": round(z, 3), "hx": round(hx, 3), "hz": round(hz, 3), "yaw": round(yaw, 4), "h": h})


def house(S, cx, cz, yaw, w, d, sp):
    """A two-storey jettied timber house. Front is local +z."""
    b = S.b
    f = Frame(cx, cz, yaw)
    hw, hd = w / 2, d / 2
    h1 = sp.get("h1", 3.2)
    h2 = sp.get("h2", 2.7)
    jet = sp.get("jetty", 0.42)
    below = 1.2
    # Ground floor. The texture's own stone skirt meets the ground.
    gf = sp["ground"]
    gf_tile = {True: h1, False: h1 * 1792 / 1024}
    for side, (mat, square) in zip(("front", "back", "left", "right"), gf):
        tile = gf_tile[square]
        if side == "front":
            wall(b, f, mat, -hw, hw, hd, -below, h1, tile, 0, 1 + below / h1, u_off=0.13)
        elif side == "back":
            wall(b, f, mat, -hw, hw, -hd, -below, h1, tile, 0, 1 + below / h1, u_off=0.41, depth_sign=-1)
        elif side == "left":
            side_wall(b, f, mat, -hd, hd, -hw, -below, h1, tile, 0, 1 + below / h1, u_off=0.27, sign=-1)
        else:
            side_wall(b, f, mat, -hd, hd, hw, -below, h1, tile, 0, 1 + below / h1, u_off=0.63, sign=1)
    # Stone sill course around the foot, to seat the walls in the ground.
    for sx, sz, hx, hz in ((0, hd + 0.05, hw + 0.15, 0.13), (0, -hd - 0.05, hw + 0.15, 0.13), (hw + 0.05, 0, 0.13, hd), (-hw - 0.05, 0, 0.13, hd)):
        box(b, f, "rubble", sx, -0.25, sz, hx, 0.45, hz, uv_scale=(0.30, 0.30))
    # Corner posts.
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(b, f, "wood", sx * (hw + 0.03), h1 / 2 - 0.1, sz * (hd + 0.03), 0.17, h1 / 2 + 0.1, 0.17, uv_scale=(0.9, 0.3))
    # Girt: the heavy beam the jetty rests on.
    box(b, f, "wood", 0, h1 + 0.02, hd + 0.08, hw + 0.2, 0.13, 0.13, uv_scale=(0.9, 0.2), grain="x")
    box(b, f, "wood", 0, h1 + 0.02, -hd - 0.08, hw + 0.2, 0.13, 0.13, uv_scale=(0.9, 0.2), grain="x")
    box(b, f, "wood", hw + 0.08, h1 + 0.02, 0, 0.13, 0.13, hd, uv_scale=(0.9, 0.2))
    box(b, f, "wood", -hw - 0.08, h1 + 0.02, 0, 0.13, 0.13, hd, uv_scale=(0.9, 0.2))
    # Joist ends under the overhang, front and back.
    n_j = int(w / 0.85)
    for i in range(n_j + 1):
        x = -hw + i * w / n_j
        for sz in (-1, 1):
            box(b, f, "wood", x, h1 + 0.2, sz * (hd + jet * 0.5), 0.08, 0.08, jet * 0.5 + 0.1, uv_scale=(0.5, 0.25))
    # Upper floor, jettied front and back.
    y0, y1 = h1 + 0.28, h1 + 0.28 + h2
    uz = hd + jet
    up = sp["upper"]
    for side, (mat, v0, v1, tile) in zip(("front", "back", "left", "right"), up):
        if side == "front":
            wall(b, f, mat, -hw, hw, uz, y0, y1, tile, v0, v1, u_off=0.31)
        elif side == "back":
            wall(b, f, mat, -hw, hw, -uz, y0, y1, tile, v0, v1, u_off=0.55, depth_sign=-1)
        elif side == "left":
            side_wall(b, f, mat, -uz, uz, -hw, y0, y1, tile, v0, v1, u_off=0.07, sign=-1)
        else:
            side_wall(b, f, mat, -uz, uz, hw, y0, y1, tile, v0, v1, u_off=0.77, sign=1)
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(b, f, "wood", sx * (hw + 0.02), (y0 + y1) / 2, sz * (uz + 0.02), 0.13, h2 / 2 + 0.02, 0.13, uv_scale=(0.9, 0.3))
    # Close the underside of the jetty.
    for sz in (-1, 1):
        n = f.d(0, -1, 0)
        z_a, z_b = sz * hd, sz * uz
        pa, pb, pc, pd = f.p(-hw, h1 + 0.28, z_a), f.p(hw, h1 + 0.28, z_a), f.p(hw, h1 + 0.28, z_b), f.p(-hw, h1 + 0.28, z_b)
        if sz > 0:
            b.quad("wood", pa, pd, pc, pb, (0, 0), (0, 0.3), (2, 0.3), (2, 0), n)
        else:
            b.quad("wood", pa, pb, pc, pd, (0, 0), (2, 0), (2, 0.3), (0, 0.3), n)
    # Roof: ridge along local x, gables on the sides.
    over_x, over_z = sp.get("over_x", 0.55), sp.get("over_z", 0.5)
    pitch = sp.get("pitch", 52) * math.pi / 180
    rise = math.tan(pitch) * uz
    ye = y1 - 0.05
    yr = ye + rise
    drop_eave = over_z * math.tan(pitch)
    roofmat = sp["roof"]
    tile = sp.get("roof_tile", 3.4)
    sag_x, sag_y = sp.get("sag", (0.12, 0.08))
    th = 0.14
    for sz in (1, -1):
        roof_slope(b, f, roofmat, -hw - over_x, hw + over_x, sz * (uz + over_z), ye - drop_eave + th, 0, yr + th, tile, sag_x, sag_y)
        # Underside, which sags with the shingles, and the fascia.
        z_e = sz * (uz + over_z)
        y_e = ye - drop_eave
        roof_slope(b, f, "wood", -hw - over_x, hw + over_x, z_e, y_e, 0, yr, 2.2, sag_x, sag_y, under=True)
        box(b, f, "wood", 0, y_e + th * 0.5, z_e, hw + over_x, th * 0.6, 0.05, uv_scale=(0.9, 0.2))
    # Barge boards and gable triangles.
    gable = sp["gable"]
    gtile = sp.get("gable_tile", 4.6)
    for sx in (-1, 1):
        x = sx * hw
        n = f.d(sx, 0, 0)
        steps = 1
        low_l, low_r = f.p(x, y1, -uz), f.p(x, y1, uz)
        top = f.p(x, yr + 0.02, 0)
        ul, ur = 0.2, 0.2 + 2 * uz / gtile
        vt = 1 - (yr - y1) / (gtile * 1024 / 1792)
        if sx > 0:
            b.tri(gable, (low_r, low_l, top), ((ur, 1), (ul, 1), ((ul + ur) / 2, vt)), (n, n, n))
        else:
            b.tri(gable, (low_l, low_r, top), ((ul, 1), (ur, 1), ((ul + ur) / 2, vt)), (n, n, n))
        # Tie beam at the gable's foot and a king post.
        box(b, f, "wood", x + sx * 0.04, y1 - 0.02, 0, 0.09, 0.11, uz + 0.08, uv_scale=(0.9, 0.2))
        box(b, f, "wood", x + sx * 0.04, (y1 + yr) / 2, 0, 0.08, (yr - y1) / 2, 0.09, uv_scale=(0.9, 0.3))
        # Bargeboards along the rake.
        for sz in (-1, 1):
            z_low = sz * (uz + over_z)
            y_low = ye - drop_eave + th
            x_b = sx * (hw + over_x + 0.02)
            mid_z, mid_y = z_low / 2, (y_low + yr + th) / 2
            L = math.hypot(z_low, yr + th - y_low) / 2
            ang = math.atan2(yr + th - y_low, -z_low)
            bf = Frame(0, 0, 0)
            nrm = (sx, 0, 0)
            dirz, diry = -z_low / (2 * L), (yr + th - y_low) / (2 * L)
            perp_z, perp_y = -diry, dirz
            T = 0.16
            pts = [(x_b, mid_y - diry * L - perp_y * T, mid_z - dirz * L - perp_z * T),
                   (x_b, mid_y + diry * L - perp_y * T, mid_z + dirz * L - perp_z * T),
                   (x_b, mid_y + diry * L + perp_y * T, mid_z + dirz * L + perp_z * T),
                   (x_b, mid_y - diry * L + perp_y * T, mid_z - dirz * L + perp_z * T)]
            quad = [f.p(*q) for q in pts]
            order = quad if (sx > 0) == (sz > 0) else [quad[1], quad[0], quad[3], quad[2]]
            b.quad("wood", order[0], order[1], order[2], order[3], (0, 2 * L * 0.25), (0, 0), (0.35, 0), (0.35, 2 * L * 0.25), f.d(sx, 0, 0))
    # Ridge: a beam, capped with a run of shingles lapped over it.
    box(b, f, "wood", 0, yr + th + 0.02, 0, hw + over_x + 0.04, 0.08, 0.09, uv_scale=(0.8, 0.2))
    for sz in (1, -1):
        cap0 = f.p(-hw - over_x - 0.04, yr + th + 0.13, 0)
        cap1 = f.p(hw + over_x + 0.04, yr + th + 0.13, 0)
        cap2 = f.p(hw + over_x + 0.04, yr + th - 0.02, sz * 0.24)
        cap3 = f.p(-hw - over_x - 0.04, yr + th - 0.02, sz * 0.24)
        ulen = (2 * hw + 2 * over_x) / tile
        if sz > 0:
            b.quad(roofmat, cap3, cap2, cap1, cap0, (0, 0.2), (ulen, 0.2), (ulen, 0.09), (0, 0.09))
        else:
            b.quad(roofmat, cap0, cap1, cap2, cap3, (0, 0.09), (ulen, 0.09), (ulen, 0.2), (0, 0.2))
    # Chimney.
    if "chimney" in sp:
        cxl, czl = sp["chimney"]
        top = yr + 1.15
        box(b, f, "rubble", cxl, top / 2 + 0.1, czl, 0.42, top / 2, 0.42, uv_scale=(0.42, 0.42))
        box(b, f, "stone", cxl, top + 0.14, czl, 0.5, 0.09, 0.5, uv_scale=(0.42, 0.42))
        # A dark flue, so the smoke has somewhere to come from.
        box(b, f, "rubble", cxl, top + 0.3, czl, 0.2, 0.09, 0.2, uv_scale=(0.42, 0.42))
        S.smoke.append({"p": [round(v, 3) for v in f.p(cxl, top + 0.45, czl)]})
    # Doors: a card proud of the wall, stone step, lantern.
    for dd in sp.get("doors", []):
        dx, dmat = dd["x"], dd["mat"]
        dh = dd.get("h", 3.0)
        dw = dh * 1792 / 1024
        dz = hd + 0.04
        wall(b, f, dmat, dx - dw / 2, dx + dw / 2, dz, -0.02, dh, dw, 0, 1)
        box(b, f, "stone", dx, 0.03, hd + 0.34, 0.95, 0.09, 0.32, uv_scale=(0.3, 0.3))
        box(b, f, "stone", dx, -0.03, hd + 0.72, 1.15, 0.07, 0.3, uv_scale=(0.3, 0.3))
        S.doors.append({"p": [round(v, 3) for v in f.p(dx, 0, hd + 1.2)]})
        lx = dx + dd.get("lamp", 1.05)
        lantern(S, f, lx, dh * 0.9, hd + 0.05)
    S.collider(cx, cz, hw + 0.14, hd + 0.14, yaw)
    # Extra lit windows, for the shader's glow and the light they throw.
    for lw in sp.get("glow", []):
        S.lights.append({"p": [round(v, 3) for v in f.p(lw[0], lw[1], lw[2])], "c": [1.0, 0.55, 0.22], "r": 4.0, "i": 1.1, "flicker": 0.25})
    return f


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
    pitch_h = 0.72
    roof_slope(b, f, "roof_2", -1.42, 1.42, 1.05, 2.74, 0, 2.74 + pitch_h, 2.0, 0.02, 0.015, (4, 3))
    roof_slope(b, f, "roof_2", -1.42, 1.42, -1.05, 2.74, 0, 2.74 + pitch_h, 2.0, 0.02, 0.015, (4, 3))
    roof_slope(b, f, "wood", -1.42, 1.42, 1.05, 2.71, 0, 2.71 + pitch_h, 2.0, 0.02, 0.015, (4, 3), under=True)
    roof_slope(b, f, "wood", -1.42, 1.42, -1.05, 2.71, 0, 2.71 + pitch_h, 2.0, 0.02, 0.015, (4, 3), under=True)
    box(b, f, "wood", 0, 2.74 + pitch_h + 0.02, 0, 1.46, 0.05, 0.07, uv_scale=(1.0, 0.45))
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
    box(b, f, "wood", 0, 0.92, 0.1, w, 0.04, d * 0.8, uv_scale=(1.8, 1.8))
    box(b, f, "wood", 0, 0.48, 0.1 + d * 0.78, w, 0.44, 0.02, uv_scale=(1.8, 1.8))
    # Striped awning that sags between its poles.
    for i in range(6):
        x0 = -w - 0.12 + i * (2 * w + 0.24) / 6
        x1 = x0 + (2 * w + 0.24) / 6
        mat = "cloth_red" if i % 2 == 0 else "cloth_oat"
        roof_slope(b, f, mat, x0, x1, d + 0.5, 2.28, -d - 0.05, 2.0, 1.2, 0.0, 0.1, (1, 6))
    for i in range(5):
        tray_x = -1.25 + i * 0.62
        box(b, f, "wood", tray_x, 0.985, 0.1, 0.26, 0.024, 0.24, uv_scale=(1.5, 1.5))
        for sxx, szz, hh in ((-1, -1, 0), (0, -1, 0), (1, -1, 0), (-1, 0, 0), (0, 0, 0), (1, 0, 0), (-1, 1, 0), (0, 1, 0), (1, 1, 0), (-0.5, -0.5, 1), (0.5, -0.5, 1), (-0.5, 0.5, 1), (0.5, 0.5, 1), (0, 0, 2)):
            rad = Rng.uniform(0.042, 0.052)
            ax = tray_x + sxx * 0.088 + Rng.uniform(-0.007, 0.007)
            az = 0.1 + szz * 0.08 + Rng.uniform(-0.007, 0.007)
            ball(b, f, "fruit" if i % 2 else "fruit2", ax, 1.058 + hh * 0.07, az, rad, 7)
    S.collider(x, z, w + 0.08, d + 0.08, yaw, 1.0)


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


def compose():
    S = Scene()
    W = lambda n, sq=False: (f"wall_{n:02d}", sq)
    # 1. The inn: long, on the north side of the square, facing it.
    house(S, 1.0, -19.0, 0.0, 15.0, 7.4, {
        "ground": [W(16), W(19), W(17), W(17)],
        "upper": [("wall_08", 0, 1, 5.1), ("wall_10", 0, 1, 5.1), ("wall_09", 0, 1, 5.1), ("wall_09", 0, 1, 5.1)],
        "gable": "wall_07", "roof": "roof_1", "pitch": 50, "chimney": (5.2, -0.8), "sag": (0.2, 0.1),
        "doors": [{"x": -1.4, "mat": "door_3"}],
        "glow": [(3.0, 1.7, 4.3), (-5.0, 1.7, 4.3)],
    })
    # 2. West house, ridge running north-south, door to the east.
    house(S, -19.0, 0.5, math.pi / 2, 9.5, 7.0, {
        "ground": [("door_wall", False), W(18), W(13, True), W(13, True)],
        "upper": [("wall_12", 0, 1, 5.1), ("wall_11", 0, 1, 5.1), ("wall_12", 0, 1, 5.1), ("wall_12", 0, 1, 5.1)],
        "gable": "wall_09", "roof": "roof_3", "pitch": 54, "chimney": (-2.6, 0.8), "sag": (0.14, 0.08),
        "glow": [(2.6, 1.7, 3.9)],
    })
    # 3. East house, stone infill, door to the west.
    house(S, 18.5, 3.5, -math.pi / 2, 10.5, 6.6, {
        "ground": [W(19), W(14, True), W(15, True), W(15, True)],
        "upper": [("wall_07", 0, 1, 5.1), ("wall_09", 0, 1, 5.1), ("wall_10", 0, 1, 5.1), ("wall_10", 0, 1, 5.1)],
        "gable": "wall_11", "roof": "roof_2", "pitch": 48, "chimney": (3.0, -0.6), "sag": (0.16, 0.12),
        "doors": [{"x": 0.6, "mat": "door_1"}],
        "glow": [(-3.2, 1.7, 3.7)],
    })
    # 4. South cottage, facing north across the square, leaving the road open to the south-west.
    house(S, 9.5, 21.0, math.pi, 10.0, 6.6, {
        "ground": [W(17), W(20, True), W(20, True), W(16)],
        "upper": [("wall_11", 0, 1, 5.1), ("wall_07", 0, 1, 5.1), ("wall_08", 0, 1, 5.1), ("wall_08", 0, 1, 5.1)],
        "gable": "wall_10", "roof": "roof_4", "pitch": 56, "chimney": (-2.8, 0.4), "sag": (0.22, 0.14), "h2": 2.5,
        "doors": [{"x": -1.0, "mat": "door_5"}],
        "glow": [(2.6, 1.7, 3.9)],
    })
    well(S, -1.5, 1.0)
    stall(S, -6.5, -9.8, 0.08)
    cart(S, 11.5, -9.0, 1.1)
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
    # Paddock fence on the south-west and a run behind the inn.
    fence(S, [(-24, 9), (-24, 21), (-8, 26), (-3.5, 27)])
    fence(S, [(-9, -24.5), (-20, -22), (-27, -13)])
    fence(S, [(19, -24), (27, -14), (27.5, -6)])
    fence(S, [(21, 27), (31, 20), (33, 12)])
    # Low stone walls and a stack of crates in the square: cover, corners, and something to back an enemy against.
    low_wall(S, -8.5, 6.5, -5.0, 9.5)
    low_wall(S, 6.2, -2.0, 9.6, -5.2)
    low_wall(S, 5.8, 8.6, 9.8, 7.8)
    crate(S, -4.3, 9.3, 0.5, 0.42)
    crate(S, 9.9, -3.5, 0.2, 0.5)
    tree_sites = [(-26, -22, 12, 5.2, 0), (-31, -6, 14, 6.2, 1), (-29, 19, 11, 5.0, 2), (-15, 28, 13, 6.0, 0), (24, 30, 12, 5.4, 3), (32, 13, 14, 6.4, 1),
                  (32, -14, 12, 5.5, 2), (19, -31, 15, 6.5, 0), (-10, -33, 13, 6.0, 3), (-40, 8, 16, 7, 2), (40, -2, 15, 6.5, 0), (2, 38, 14, 6, 1),
                  (-22, -38, 15, 7, 1), (36, 27, 15, 6, 2), (-38, 28, 16, 7, 0), (30, -31, 16, 7, 3)]
    for i, (x, z, h, sp, kind) in enumerate(tree_sites):
        tree(S, x, z, h, sp * (0.72 if kind == 3 else 1), 100 + i, kind)
    return S


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
            json.dump({"colliders": S.colliders, "lights": S.lights, "smoke": S.smoke, "doors": S.doors, "trees": S.trees}, fh, separators=(",", ":"))
        print(f"exported {os.path.getsize(out) / 1048576:.2f} MB")
    return objs
