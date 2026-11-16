"""The four bells of the Tower of the Four Watches, modelled. Run inside Blender, through Blender MCP:

    exec(open(path).read(), dict(__file__=path, __name__="__main__"))

Each bell is turned bronze on a lathe (a real bell's profile: the lip, the sound bow, the waist, the shoulder with a band
round it, the crown), hung from an oak headstock with iron straps, its gudgeons out either end, and on one side the
wheel its rope goes round. Its clapper is apart, to swing inside it; the rope is a unit length, stretched by the game, and
the sally (the woollen grip) is apart too. One painted atlas for the lot: bronze, oak, iron, hemp, and the sally's white
wool with Tessariel's gold.

Local frame (game coordinates, x east, y up, z south): a bell's axle along x through the origin, its wheel at x = -1.25,
the bell hanging under the origin; z is the way it swings out. A clapper hangs from its pivot at the origin, which the game puts 0.07 H under the crown (TOP - 0.07 H), so its ball
comes to the sound bow. The rope runs
up y from 0 to 1, the sally from 0 to 0.8. The game hangs them: src/core/belltower.js BELLS, src/items/bells.js.
Writes assets/game/items/bells.glb and leaves the lot in the scene Bells to look at.
"""
import math
import os

import bmesh
import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BUILD = os.path.join(ROOT, 'tools', 'build', 'bells')
SCENE = 'Bells'

# As src/core/belltower.js has them: each bell's mouth radius D; its height H = 1.45 D; its wheel's radius 1.1 D, at x = -1.25.
BELLS = {'tenor': 0.8, 'third': 0.71, 'second': 0.63, 'treble': 0.56}
# The headstock's half length stops short of the frame's beams (their faces 0.87 out), so it turns clear of them.
TALL, WHEEL, WHEEL_X, TOP, HEAD = 1.45, 1.1, -1.25, -0.15, 0.82

# Where each material's painted in the atlas, in uv: (u0, v0, u1, v1).
REGION = {'bronze': (0.0, 0.5, 0.5, 1.0), 'oak': (0.5, 0.5, 1.0, 1.0), 'iron': (0.0, 0.25, 0.5, 0.5), 'hemp': (0.5, 0.25, 1.0, 0.5), 'sally': (0.0, 0.0, 1.0, 0.25)}
# Roughness and metal, by material.
SURFACE = {'bronze': (0.36, 1.0), 'oak': (0.78, 0.0), 'iron': (0.55, 0.85), 'hemp': (0.92, 0.0), 'sally': (0.95, 0.0)}

# The bell's profile, as (radius, height) shares of D and H from the lip up: outside, and in.
OUTER = [(1.00, 0.00), (0.995, 0.035), (0.968, 0.09), (0.915, 0.15), (0.83, 0.23), (0.74, 0.33), (0.68, 0.45), (0.645, 0.58), (0.625, 0.70),
         (0.612, 0.80), (0.628, 0.81), (0.628, 0.84), (0.606, 0.85), (0.592, 0.89), (0.556, 0.94), (0.48, 0.975), (0.32, 0.995), (0.0, 1.0)]
INNER = [(0.925, 0.0), (0.90, 0.07), (0.82, 0.17), (0.69, 0.32), (0.60, 0.50), (0.56, 0.68), (0.535, 0.80), (0.48, 0.88), (0.33, 0.925), (0.0, 0.935)]


class Mesher:
    """Faces in game coordinates, each with its uvs, made into a mesh at the end (Blender's frame: x, -z, y)."""

    def __init__(self, name):
        self.name, self.v, self.f, self.uv, self.smooth = name, [], [], [], []

    def face(self, pts, uvs, smooth=False):
        base = len(self.v)
        self.v += [(p[0], -p[2], p[1]) for p in pts]
        self.f.append(list(range(base, base + len(pts))))
        self.uv.append(uvs)
        self.smooth.append(smooth)

    def finish(self, collection):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata(self.v, [], self.f)
        uvl = me.uv_layers.new(name='UVMap')
        for poly, uvs in zip(me.polygons, self.uv):
            for li, uv in zip(poly.loop_indices, uvs):
                uvl.data[li].uv = uv
        for poly, sm in zip(me.polygons, self.smooth):
            poly.use_smooth = sm
        bm = bmesh.new()
        bm.from_mesh(me)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me)
        bm.free()
        me.update()
        ob = bpy.data.objects.new(self.name, me)
        collection.objects.link(ob)
        return ob


def reg(mat, s, t):
    """A point s, t (0-1 each) of a material's place in the atlas, kept a little in from its edges."""
    u0, v0, u1, v1 = REGION[mat]
    s, t = min(max(s, 0.02), 0.98), min(max(t, 0.02), 0.98)
    return (u0 + (u1 - u0) * s, v0 + (v1 - v0) * t)


def lathe(m, rings, sides, mat, y0, smooth=True):
    """Rings of (radius, y) turned about the y axis; a quad strip between each two. uv: round, and along the rings."""
    for i in range(len(rings) - 1):
        (ra, ya), (rb, yb) = rings[i], rings[i + 1]
        for j in range(sides):
            a, b = 2 * math.pi * j / sides, 2 * math.pi * (j + 1) / sides
            pts = [(ra * math.cos(a), y0 + ya, ra * math.sin(a)), (ra * math.cos(b), y0 + ya, ra * math.sin(b)),
                   (rb * math.cos(b), y0 + yb, rb * math.sin(b)), (rb * math.cos(a), y0 + yb, rb * math.sin(a))]
            ta, tb = i / (len(rings) - 1), (i + 1) / (len(rings) - 1)
            m.face(pts, [reg(mat, j / sides, ta), reg(mat, (j + 1) / sides, ta), reg(mat, (j + 1) / sides, tb), reg(mat, j / sides, tb)], smooth)


def box(m, c, h, mat, axes=((1, 0, 0), (0, 1, 0), (0, 0, 1))):
    """A box about c, half sizes h along its three axes."""
    ax = [np.array(a, float) for a in axes]
    corner = lambda sx, sy, sz: tuple(np.array(c, float) + ax[0] * sx * h[0] + ax[1] * sy * h[1] + ax[2] * sz * h[2])
    quads = [[(-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)], [(-1, -1, 1), (-1, 1, 1), (1, 1, 1), (1, -1, 1)],
             [(-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)], [(1, -1, -1), (1, -1, 1), (1, 1, 1), (1, 1, -1)],
             [(-1, -1, -1), (-1, -1, 1), (1, -1, 1), (1, -1, -1)], [(-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)]]
    for q in quads:
        m.face([corner(*p) for p in q], [reg(mat, (p[0] + 1) / 2 * 0.6 + (p[2] + 1) / 2 * 0.4, (p[1] + 1) / 2) for p in q])


def cyl(m, a, b, r, sides, mat, r2=None, caps=True):
    """A round rod from a to b, radius r (r2 at b)."""
    a, b = np.array(a, float), np.array(b, float)
    d = b - a
    d /= np.linalg.norm(d)
    up = np.array((0, 1, 0)) if abs(d[1]) < 0.9 else np.array((1, 0, 0))
    u = np.cross(d, up)
    u /= np.linalg.norm(u)
    v = np.cross(u, d)
    r2 = r if r2 is None else r2
    ring = lambda p, rr, k: tuple(p + (u * math.cos(2 * math.pi * k / sides) + v * math.sin(2 * math.pi * k / sides)) * rr)
    for k in range(sides):
        m.face([ring(a, r, k), ring(a, r, k + 1), ring(b, r2, k + 1), ring(b, r2, k)],
               [reg(mat, k / sides, 0), reg(mat, (k + 1) / sides, 0), reg(mat, (k + 1) / sides, 1), reg(mat, k / sides, 1)], True)
    if caps:
        for p, rr in ((a, r), (b, r2)):
            for k in range(sides):
                m.face([tuple(p), ring(p, rr, k), ring(p, rr, k + 1)], [reg(mat, 0.5, 0.5)] * 3)


def ring_x(m, x0, x1, r0, r1, sides, mat):
    """An annulus about the x axis from x0 to x1, radii r0 to r1: a wheel's rim."""
    P = lambda x, r, k: (x, r * math.cos(2 * math.pi * k / sides), r * math.sin(2 * math.pi * k / sides))
    for k in range(sides):
        t0, t1 = k / sides, (k + 1) / sides
        uv = [reg(mat, t0, 0), reg(mat, t1, 0), reg(mat, t1, 1), reg(mat, t0, 1)]
        m.face([P(x0, r1, k), P(x0, r1, k + 1), P(x1, r1, k + 1), P(x1, r1, k)], uv)
        m.face([P(x0, r0, k), P(x1, r0, k), P(x1, r0, k + 1), P(x0, r0, k + 1)], uv)
        m.face([P(x0, r0, k), P(x0, r0, k + 1), P(x0, r1, k + 1), P(x0, r1, k)], uv)
        m.face([P(x1, r0, k), P(x1, r1, k), P(x1, r1, k + 1), P(x1, r0, k + 1)], uv)


def bell(name, D):
    H = TALL * D
    m = Mesher('bell_' + name)
    lip = TOP - H
    # The bronze: outside up from the lip, the lip's edge, inside up to the crown.
    lathe(m, [(r * D, h * H) for r, h in OUTER], 32, 'bronze', lip)
    lathe(m, [(INNER[0][0] * D, 0), (OUTER[0][0] * D, 0)], 32, 'bronze', lip, False)
    lathe(m, [(r * D, h * H) for r, h in INNER], 32, 'bronze', lip)
    # The canons on the crown it's bolted up by: a boss.
    lathe(m, [(0.3 * D, 0), (0.3 * D, 0.06), (0.22 * D, 0.1), (0.0, 0.1)], 12, 'bronze', TOP - 0.05)
    # The headstock: oak, along the axle, iron straps down over the crown either side, the gudgeons out the ends.
    box(m, (0, 0.02, 0), (HEAD, 0.17, 0.18), 'oak')
    for sx in (-0.34, 0.34):
        box(m, (sx, -0.06, 0), (0.035, 0.26, 0.195), 'iron')
        cyl(m, (sx, 0.21, -0.12), (sx, 0.21, 0.12), 0.03, 6, 'iron')
    cyl(m, (HEAD, 0, 0), (1.13, 0, 0), 0.05, 10, 'iron')
    cyl(m, (-HEAD, 0, 0), (WHEEL_X - 0.07, 0, 0), 0.05, 10, 'iron')
    # The wheel: a rim with a groove the rope runs in (flanges either side of it), four spokes, the hub on the gudgeon.
    R = WHEEL * D
    ring_x(m, WHEEL_X - 0.045, WHEEL_X + 0.045, R - 0.07, R, 40, 'oak')
    for x in (WHEEL_X - 0.045, WHEEL_X + 0.03):
        ring_x(m, x, x + 0.015, R - 0.03, R + 0.04, 40, 'oak')
    cyl(m, (WHEEL_X - 0.07, 0, 0), (WHEEL_X + 0.07, 0, 0), 0.11, 10, 'oak')
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        d = (0, math.cos(a), math.sin(a))
        mid = (R - 0.07 + 0.08) / 2
        box(m, (WHEEL_X, d[1] * mid, d[2] * mid), (0.025, (R - 0.07 - 0.08) / 2 + 0.02, 0.04), 'oak', axes=((1, 0, 0), d, (0, -d[2], d[1])))
    return m


def clapper(name, D):
    H = TALL * D
    m = Mesher('clapper_' + name)
    # Iron: a staple at the pivot, the shaft, the ball (the flight) where it strikes the sound bow, a short tail.
    box(m, (0, 0.0, 0), (0.05 * D, 0.04, 0.03), 'iron')
    cyl(m, (0, 0, 0), (0, -0.8 * H, 0), 0.032 * D, 8, 'iron', r2=0.045 * D)
    rings = []
    for i in range(9):
        a = math.pi * i / 8
        rings.append((0.11 * D * math.sin(a), -0.11 * D * math.cos(a)))
    lathe(m, rings, 12, 'iron', -0.8 * H)
    cyl(m, (0, -0.8 * H, 0), (0, -0.9 * H, 0), 0.04 * D, 8, 'iron', r2=0.03 * D)
    return m


def rope():
    m = Mesher('rope')
    cyl(m, (0, 0, 0), (0, 1, 0), 0.017, 6, 'hemp')
    return m


def sally():
    m = Mesher('sally')
    rings = [(0.02, 0.0), (0.034, 0.05), (0.039, 0.15), (0.04, 0.4), (0.039, 0.65), (0.034, 0.75), (0.02, 0.8)]
    lathe(m, rings, 12, 'sally', 0.0)
    return m


def paint():
    """The atlas, its normals (flat) and its roughness and metal, as pngs in tools/build/bells."""
    N = 512
    rng = np.random.default_rng(7)
    vv, uu = np.mgrid[0:N, 0:N] / N
    noise = rng.random((N, N))
    # (A soft noise: the white noise blurred a few times.)
    soft = noise.copy()
    for _ in range(6):
        soft = (soft + np.roll(soft, 1, 0) + np.roll(soft, -1, 0) + np.roll(soft, 1, 1) + np.roll(soft, -1, 1)) / 5
    soft = (soft - soft.min()) / (soft.max() - soft.min())
    col = np.zeros((N, N, 4))
    col[..., 3] = 1
    mr = np.zeros((N, N, 4))
    mr[..., 0] = 1
    mr[..., 3] = 1

    def where(mat):
        u0, v0, u1, v1 = REGION[mat]
        return (uu >= u0) & (uu < u1) & (vv >= v0) & (vv < v1)

    def put(mat, rgb):
        w = where(mat)
        for k in range(3):
            col[..., k][w] = np.clip(rgb[k][w] if hasattr(rgb[k], 'shape') else rgb[k], 0, 1)
        mr[..., 1][w] = SURFACE[mat][0]
        mr[..., 2][w] = SURFACE[mat][1]

    # Bronze: warm, a little tarnished, green running down from the crown in streaks.
    streak = np.clip((np.sin(uu * 2 * math.pi * 23) * 0.5 + 0.5) * soft * 1.6 - 0.55, 0, 1) * np.clip((vv - 0.5) * 2, 0, 1) ** 2
    t = 0.85 + 0.25 * soft
    bronze = [0.52 * t, 0.36 * t, 0.18 * t]
    green = [0.27, 0.42, 0.34]
    put('bronze', [bronze[k] * (1 - streak * 0.7) + green[k] * streak * 0.7 for k in range(3)])
    # Oak: grain along u.
    grain = 0.8 + 0.2 * np.sin(vv * 2 * math.pi * 60 + soft * 9) + 0.12 * (noise - 0.5)
    put('oak', [0.33 * grain, 0.21 * grain, 0.12 * grain])
    # Iron, black and a little rusty.
    t = 0.75 + 0.5 * soft
    put('iron', [0.16 * t + 0.05 * soft, 0.15 * t, 0.15 * t])
    # Hemp: twisted strands.
    tw = 0.82 + 0.18 * np.sin((uu * 18 + vv * 70) * 2 * math.pi)
    put('hemp', [0.6 * tw, 0.48 * tw, 0.31 * tw])
    # The sally: white wool, two gold bands edged with blue, along its length (v, 0 to 0.25 of the atlas).
    s = vv / 0.25
    gold = ((s > 0.3) & (s < 0.4)) | ((s > 0.6) & (s < 0.7))
    blue = ((s > 0.28) & (s <= 0.3)) | ((s >= 0.4) & (s < 0.42)) | ((s > 0.58) & (s <= 0.6)) | ((s >= 0.7) & (s < 0.72))
    fuzz = 0.9 + 0.1 * noise
    r = np.where(gold, 0.78, np.where(blue, 0.16, 0.88)) * fuzz
    g = np.where(gold, 0.58, np.where(blue, 0.24, 0.86)) * fuzz
    b = np.where(gold, 0.2, np.where(blue, 0.48, 0.8)) * fuzz
    put('sally', [r, g, b])
    nrm = np.zeros((N, N, 4))
    nrm[..., 0] = 0.5
    nrm[..., 1] = 0.5
    nrm[..., 2] = 1.0
    nrm[..., 3] = 1
    os.makedirs(BUILD, exist_ok=True)
    out = {}
    for key, arr, colour in (('c', col, True), ('n', nrm, False), ('m', mr, False)):
        name = 'bells_' + key
        img = bpy.data.images.get(name) or bpy.data.images.new(name, N, N, alpha=False)
        img.colorspace_settings.name = 'sRGB' if colour else 'Non-Color'
        img.pixels.foreach_set(arr.astype(np.float32).ravel())
        img.filepath_raw = os.path.join(BUILD, name + '.png')
        img.file_format = 'PNG'
        img.save()
        out[key] = img
    return out


def material(imgs):
    mat = bpy.data.materials.get('bells') or bpy.data.materials.new('bells')
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type in ('TEX_IMAGE', 'NORMAL_MAP', 'SEPARATE_COLOR'):
            nt.nodes.remove(n)
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')

    def tex(img):
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        return n
    c, nm, mr = tex(imgs['c']), tex(imgs['n']), tex(imgs['m'])
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
    mat = material(paint())
    meshes = []
    for name, D in BELLS.items():
        meshes += [bell(name, D), clapper(name, D)]
    meshes += [rope(), sally()]
    objs = [m.finish(scene.collection) for m in meshes]
    for o in objs:
        o.data.materials.append(mat)
    # (Laid out side by side to look at; the glb keeps each at its own origin regardless: export_apply is off and
    # the game reads only the meshes.)
    return scene, objs


def export(scene, objs):
    win = bpy.context.window or bpy.context.window_manager.windows[0]
    prev = win.scene
    win.scene = scene
    try:
        layer = bpy.context.view_layer
        layer.active_layer_collection = layer.layer_collection
        out = os.path.join(ROOT, 'assets', 'game', 'items', 'bells.glb')
        bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_active_scene=True, use_active_collection=True, export_image_format='WEBP', export_image_quality=85, export_texcoords=True, export_normals=True, export_materials='EXPORT', export_apply=False, export_yup=True)
    finally:
        win.scene = prev
    print('bells.glb', round(os.path.getsize(out) / 1048576, 3), 'MB')


if __name__ == '__main__':
    scene, objs = build()
    for o in objs:
        print(o.name, len(o.data.polygons))
    export(scene, objs)
