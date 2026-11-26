"""The strap across the wizard's back, between the two round medallions, made level: run inside Blender (through the
Blender MCP), on the wizard imported from assets/game/player/wizard.glb. The whole of it, from the file before to the
mesh that tools/player/strap_glb.py writes back into the file:

    exec(open(r'<repo>/tools/player/strap_level.py').read(), {'__name__': 'strap'})
    strap = bpy.app.driver_namespace['strap_level']
    strap.build(r'<wizard.glb before>', r'<scratch folder>')       # -> <scratch>/strap_mesh.npz
    python tools/player/strap_glb.py <wizard.glb before> <scratch>/strap_mesh.npz assets/game/player/wizard.glb

(The file before is the one from before this edit: git show 8bf79560:assets/game/player/wizard.glb.) build does:
    r = measure(obj, path)          # the band's top and bottom edges and the medallions, read off a flat render of his back
    new, w = warp(obj, r)           # where every point of the mesh goes (nothing moves but the back between the medallions)
    junctions(...)                  # the band's two ends cut clean at the rings and given the level band's map

The sculpt (Tripo's) had the strap tilted about ten degrees, low on his left, and sagging: in the mesh (it's a raised band)
and in the paint alike. Both are fixed by moving the mesh's points, not by painting: each point of his back between the
medallions slides up or down the surface, carrying its place on the colour map with it, so the painted band and the raised
band go level together, and stay so on every set of gear painted on the same map (assets/game/player/skins).

Down each column of his back the points are moved by a stretch that takes the band's two edges to two level lines, one
through the medallions' middles less half the band, one plus half; above and below the band the cloth is let out or taken
in back to nothing at REACH. The medallions don't move; round each, the move fades out over RIM. Depth is kept against the
back's own smooth surface, so the band keeps its relief and the back its shape.
"""
import json
import math
import os
import struct
import types

import bpy
import numpy as np

SHOT = 0.55 / 1800          # metres a pixel, in the flat render (orthographic, 0.55 m across 1800 px)
CENTRE = (0.0, 1.42)        # the render's middle, on his back (x, height)
REACH = (240, 260)          # px: over how far above the band's top and below its bottom the move fades to nothing
RIM = (3, 44)               # px out from a medallion's edge: no move inside the first, all of it past the second
                            # (inside JUNCTION, whose map is the level band's: the fade's slope there isn't seen)
JUNCTION = 46               # px out from a medallion's edge: the band's end given the level band's map (junctions)
SIDE = 95                   # px past each medallion's middle, out toward his shoulders, by which the move has faded out


def _render(scene, path, res=(1800, 1200)):
    """A flat render of his back (colour only, no light) through the TabCam set up for it."""
    sh = scene.display.shading
    scene.render.engine = 'BLENDER_WORKBENCH'
    sh.light = 'FLAT'
    sh.color_type = 'TEXTURE'
    sh.show_cavity = False
    scene.view_settings.view_transform = 'Standard'
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(path, check_existing=False)
    w, h = im.size
    a = np.array(im.pixels[:]).reshape(h, w, 4)[::-1, :, :3] * 255
    bpy.data.images.remove(im)
    return a


def to_px(co):
    """Blender space (x his right..left, y back, z up) to the render's pixels (x across, y down)."""
    return -co[:, 0] / SHOT + 900, (CENTRE[1] - co[:, 2]) / SHOT + 600


def edges(a, x0, x1, mid=None):
    """The band's top and bottom edge in each column (px): from its middle (mid(x), or the middle of the longest run of
    the strap's leather), up and down to where his cloth starts (bluer than it is red, for four pixels running). The
    band's own light lip and stitching aren't cloth, so they don't stop it; the shadow under the band is the cloth's."""
    cloth = (a[..., 2] - a[..., 0]) > 6
    lea = ((a[..., 0] - a[..., 2]) >= 2) & (a[..., 0] > 38)
    xs, top, bot = [], [], []
    for x in range(x0, x1 + 1, 4):
        if mid is None:
            k = np.convolve(lea[560:1040, x].astype(float), np.ones(9) / 9, 'same') > 0.5
            ys = np.where(k)[0] + 560
            if not len(ys):
                continue
            runs = np.split(ys, np.where(np.diff(ys) > 2)[0] + 1)
            big = max(runs, key=len)
            m = int((big[0] + big[-1]) / 2)
        else:
            m = int(mid(x))
        run = np.convolve(cloth[:, x].astype(float), np.ones(4), 'full')[3:]   # run[y]: how much of y..y+3 is cloth
        up = m
        while up > m - 200 and run[up - 4] < 4:
            up -= 1
        dn = m
        while dn < m + 200 and run[dn + 1] < 4:
            dn += 1
        xs.append(x)
        top.append(up)
        bot.append(dn)
    return np.array(xs, float), np.array(top, float), np.array(bot, float)


def medallions(a):
    gold = (a[..., 0] > 95) & (a[..., 0] - a[..., 2] > 25)
    out = []
    for cx, cy in ((530, 750), (1270, 745)):
        row = np.where(gold[cy, cx - 160:cx + 160])[0] + cx - 160
        col = np.where(gold[cy - 160:cy + 160, cx])[0] + cy - 160
        out.append(((row.min() + row.max()) / 2, (col.min() + col.max()) / 2, (row.max() - row.min()) / 2, (col.max() - col.min()) / 2))
    return out


def measure(obj, path):
    a = _render(bpy.context.scene, path)
    med = medallions(a)
    (lx, ly, lr, _), (rx, ry, rr, _) = med
    xs, top, bot = edges(a, int(lx + lr + 2), int(rx - rr - 2))
    # (A robust line through each edge, then each column's own reading where it's close to it: the gold of a rim or a
    # stitch in a column throws a reading off, never the line.)
    out = {'med': med, 'xs': xs, 'top_raw': top, 'bot_raw': bot}
    # Each edge as a smooth curve (a robust quadratic): the band was cut straight and sits tilted and bowed on him; what a
    # column reads off that curve is its stitching and lip, which the warp carries along as they are.
    for k, v in (('top', top), ('bot', bot)):
        keep = np.ones(len(xs), bool)
        for _ in range(5):
            c = np.polyfit(xs[keep], v[keep], 2)
            res = v - np.polyval(c, xs)
            keep = np.abs(res) < max(2.0, 2.5 * np.std(res[keep]))
        out[k] = np.polyval(c, xs)
        out[k + '_fit'] = c
        out[k + '_res'] = res
    return out


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def plan(r):
    """The level lines: through the medallions' middles, the band as wide as it is on average."""
    if 'T' in r:
        return r['T'], r['B']
    (lx, ly, lr, _), (rx, ry, rr, _) = r['med']
    mid = (ly + ry) / 2
    half = float(np.mean(r['bot'] - r['top'])) / 2
    return mid - half, mid + half


def warp(obj, r, base_radius=0.05):
    """The new place of every point of the mesh (Blender space), as an (n, 3) array."""
    me = obj.data
    co = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    nrm = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('normal', nrm)
    nrm = nrm.reshape(-1, 3)
    px, py = to_px(co)
    T, B = plan(r)
    (lx, ly, lr, lv), (rx, ry, rr, rv) = r['med']
    top = np.interp(px, r['xs'], r['top'])
    bot = np.interp(px, r['xs'], r['bot'])
    # Down each column: the band's edges to the level lines, and back to nothing at REACH above and below.
    y0, y1 = top - REACH[0], bot + REACH[1]
    ny = np.where(py <= top, y0 + (py - y0) * (T - y0) / (top - y0),
                  np.where(py <= bot, T + (py - top) * (B - T) / (bot - top), B + (py - bot) * (y1 - B) / (y1 - bot)))
    ny = np.where((py < y0) | (py > y1), py, ny)
    # Only on his back (behind his middle), between the medallions and fading out past them, and not on them. (By place
    # alone: a point's every copy along a seam of the map must go the same way, or the surface tears there. Weighed by
    # which way each faced, it tore into steps over the wrinkles.)
    w = smooth(0.02, 0.06, co[:, 1])
    w *= smooth(lx - SIDE, lx, px) * (1 - smooth(rx, rx + SIDE, px))
    for cx, cy, rad, radv in r['med']:
        d = np.hypot((px - cx) / rad, (py - cy) / radv) * rad - rad
        w *= smooth(RIM[0], RIM[1], d)
    dy = (ny - py) * w
    new = co.copy()
    new[:, 2] -= dy * SHOT
    # Depth against the back's smooth surface: what it is where each point goes, less what it is where it was.
    back = w > 0
    if back.any():
        sel = np.where((co[:, 1] > 0.02) & (np.abs(px - 900) < 700) & (np.abs(py - 760) < 600))[0]
        P = co[sel]

        def surface(q):
            out = np.zeros(len(q))
            for i0 in range(0, len(q), 2000):
                qq = q[i0:i0 + 2000]
                d2 = (qq[:, None, 0] - P[None, :, 0]) ** 2 + (qq[:, None, 1] - P[None, :, 2]) ** 2
                k = np.exp(-d2 / (2 * base_radius ** 2))
                out[i0:i0 + 2000] = (k * P[None, :, 1]).sum(1) / np.maximum(k.sum(1), 1e-9)
            return out
        idx = np.where(back)[0]
        was = surface(np.c_[co[idx, 0], co[idx, 2]])
        now = surface(np.c_[co[idx, 0], new[idx, 2]])
        new[idx, 1] += now - was
    return new, w


def uv_pass(obj, path, res=(3600, 2400), what='uv'):
    """Where on the colour map each pixel of the flat back view is: (h, w, 2) UVs (glTF's: v down), and a mask of him.
    Rendered by Cycles, one sample and no filter, his material swapped for one that shines its own UV."""
    scene = bpy.context.scene
    m = bpy.data.materials.get('UVPass') or bpy.data.materials.new('UVPass')
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    tc, em, out = nt.nodes.new('ShaderNodeTexCoord'), nt.nodes.new('ShaderNodeEmission'), nt.nodes.new('ShaderNodeOutputMaterial')
    if what == 'uv':
        nt.links.new(tc.outputs['UV'], em.inputs['Color'])
    else:   # his shading normal (the file's, set as custom normals), in Blender space, as 0.5 + n / 2
        geo = nt.nodes.new('ShaderNodeNewGeometry')
        mad = nt.nodes.new('ShaderNodeVectorMath')
        mad.operation = 'MULTIPLY_ADD'
        mad.inputs[1].default_value = (0.5, 0.5, 0.5)
        mad.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(geo.outputs['Normal'], mad.inputs[0])
        nt.links.new(mad.outputs[0], em.inputs['Color'])
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    keep = (scene.render.engine, scene.render.resolution_x, scene.render.resolution_y, scene.render.film_transparent,
            scene.render.image_settings.file_format, scene.render.filepath, scene.view_layers[0].material_override)
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.cycles.pixel_filter_type = 'BOX'
    scene.cycles.filter_width = 0.01
    scene.render.film_transparent = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.image_settings.file_format = 'OPEN_EXR'
    scene.render.image_settings.color_depth = '32'
    scene.view_layers[0].material_override = m
    scene.render.filepath = path
    try:
        bpy.ops.render.render(write_still=True)
    finally:
        (scene.render.engine, scene.render.resolution_x, scene.render.resolution_y, scene.render.film_transparent,
         scene.render.image_settings.file_format, scene.render.filepath, scene.view_layers[0].material_override) = keep
    im = bpy.data.images.load(path, check_existing=False)
    w, h = im.size
    a = np.array(im.pixels[:], np.float32).reshape(h, w, 4)[::-1]
    bpy.data.images.remove(im)
    if what != 'uv':
        n = a[..., :3] * 2 - 1
        return n / np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-9), a[..., 3] > 0.999
    uv = np.stack([a[..., 0], 1 - a[..., 1]], -1)
    return uv, a[..., 3] > 0.999


def _cut(bm, value, level, zone_pt):
    """Cut every edge that crosses value(p) == level (p: a vertex's (px, py)), where both ends pass zone_pt, at the
    crossing (bisected in the render's pixels), and join the new points across each face they share. Returns the new
    vertices. bmesh's edge split carries the vertex's custom data (its UV per corner is set later; its skin is mixed)."""
    import bmesh
    from mathutils import Vector
    px = lambda v: to_px(np.array([v.co[:]]))
    cross = []
    for e in list(bm.edges):
        a, b = e.verts
        if a.co.y < 0.03 and b.co.y < 0.03:      # (his back only)
            continue
        pa, pb = [np.array([float(q[0][0]), float(q[1][0])]) for q in (px(a), px(b))]
        if not (zone_pt(pa) or zone_pt(pb)):
            continue
        fa, fb = value(pa) - level, value(pb) - level
        if fa * fb >= 0 or abs(fa - fb) < 1e-9:
            continue
        lo, hi = 0.0, 1.0
        for _ in range(30):
            m = (lo + hi) / 2
            fm = value(pa + (pb - pa) * m) - level
            if (fm < 0) == (fa < 0):
                lo = m
            else:
                hi = m
        cross.append((e, (lo + hi) / 2))
    made = []
    for e, t in cross:
        if not e.is_valid:
            continue
        a = e.verts[0]
        ne, nv = bmesh.utils.edge_split(e, a, t)
        made.append(nv)
    made_set = set(made)
    for f in list({f for v in made for f in v.link_faces}):
        on = [v for v in f.verts if v in made_set]
        if len(on) == 2 and not any(e for e in f.edges if set(e.verts) == set(on)):
            bmesh.ops.connect_verts(bm, verts=on)
    return made


def junctions(obj, r, uv, him, normals=None, npass=None, reach=JUNCTION, above=10, below=6, gap=1.5):
    """The band's two ends, made over: beside each medallion, on the band's side, from just outside its gilt rim out to
    `reach` px, over the band's rows and a little above and below, the mesh is cut along the rim and the zone's edges
    (and along every seam of the map that the straight band's column there crosses), and that zone's faces take their
    places on the colour map from that column: the level band, and its cloth above and below, run straight on to the rim.
    (The warp's move fades out to nothing at the fixed medallions; between, the faces were stretched up the rim and the
    band's lines ran up it in a smear.) obj's mesh is changed in place; uv, him: uv_pass of it, as warped."""
    import bmesh
    T, B = plan(r)
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.active
    # Each point's own index and normal (the file's), carried as numbers so the cuts' new points get them mixed:
    # tools/player/strap_glb.py writes the file from these.
    if normals is not None and 'oi' not in bm.verts.layers.float:
        lay = [bm.verts.layers.float.new(k) for k in ('oi', 'nx', 'ny', 'nz')]
        bm.verts.ensure_lookup_table()
        for v in bm.verts:
            v[lay[0]] = v.index
            v[lay[1]], v[lay[2]], v[lay[3]] = normals[v.index]
    zones = []
    for side, (cx, cy, rad, radv) in zip((1, -1), r['med']):
        ra, rv = rad + gap, radv + gap
        ell = lambda p, cx=cx, cy=cy, ra=ra, rv=rv: np.hypot((p[0] - cx) / ra, (p[1] - cy) / rv)
        xc = cx + side * (rad + reach)
        ya, yb = T - above, B + below
        box = lambda p, cx=cx, xc=xc, ya=ya, yb=yb: (min(cx, xc) - 4 <= p[0] <= max(cx, xc) + 4) and (ya - 30 <= p[1] <= yb + 30)
        # The seams of the map down the column the zone takes from: rows where its UV jumps.
        col = uv[int(ya * 2) - 4:int(yb * 2) + 5, int(round(xc * 2))]
        jump = np.where(np.linalg.norm(np.diff(col, axis=0), axis=1) > 0.002)[0]
        seams = sorted({(int(ya * 2) - 4 + j + 1) / 2 for j in jump})   # (between the two rows of the jump)
        bm.verts.ensure_lookup_table()
        _cut(bm, ell, 1.0, box)
        _cut(bm, lambda p: p[0], xc, box)
        _cut(bm, lambda p: p[1], ya, box)
        _cut(bm, lambda p: p[1], yb, box)
        for sy in seams:
            _cut(bm, lambda p: p[1], sy, box)
        zones.append((side, ell, xc, ya, yb, seams))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
    # Each zone face: its corners' places on the map, from the column at the same height (nudged a hair toward the
    # face's middle, so a corner on a seam reads the face's own side of it).
    h, w = uv.shape[:2]
    done = 0
    for f in bm.faces:
        f.tag = False
    for f in bm.faces:
        c = np.mean([to_px(np.array([v.co[:]])) for v in f.verts], axis=0).ravel()
        if f.normal.y < -0.2:
            continue
        for side, ell, xc, ya, yb, seams in zones:
            cx = r['med'][0 if side == 1 else 1][0]
            if not (ell(c) > 1 and ya < c[1] < yb and (c[0] - xc) * side < 0 and (c[0] - cx) * side > 0):
                continue
            for l in f.loops:
                p = np.array(to_px(np.array([l.vert.co[:]]))).ravel()
                yy = min(max(p[1] * 2 - 0.5, 0), h - 2)
                y0 = int(np.floor(yy))
                fy = yy - y0
                xx = int(round(xc * 2))
                a0, a1 = uv[y0, xx], uv[y0 + 1, xx]
                if np.linalg.norm(a1 - a0) > 0.002:      # a seam between the two rows: the face's own side of it
                    q = a0 if c[1] < p[1] else a1
                else:
                    q = a0 * (1 - fy) + a1 * fy
                l[uvl].uv = (float(q[0]), float(1 - q[1]))
            f.tag = True
            done += 1
            break
    # And the zone's own points (those on its faces only) take the straight band's normal from the same column, so the
    # light on them is the band's, not the old relief's stretched up the rim. (Its edge points keep theirs.)
    if npass is not None and 'nx' in bm.verts.layers.float:
        lay = [bm.verts.layers.float[k] for k in ('nx', 'ny', 'nz')]
        for v in bm.verts:
            if not v.link_faces or not all(f.tag for f in v.link_faces):
                continue
            p = np.array(to_px(np.array([v.co[:]]))).ravel()
            xc = min((z[2] for z in zones), key=lambda x: abs(x - p[0]))
            q = npass[int(min(max(round(p[1] * 2 - 0.5), 0), h - 1)), int(round(xc * 2))]
            v[lay[0]], v[lay[1]], v[lay[2]] = float(q[0]), float(q[2]), float(-q[1])   # (Blender's to the file's: x, z, -y)
    # (Every face of his back here faces out, as its points' normals do: a face the cuts rebuilt the other way round is
    # turned back, or the game, which draws a body's faces from the front only, shows a hole there.)
    if 'nx' in bm.verts.layers.float:
        lay = [bm.verts.layers.float[k] for k in ('nx', 'ny', 'nz')]
        inward = []
        for f in bm.faces:
            c = f.calc_center_median()
            if c.y < 0.05:
                continue
            m = sum((np.array([v[lay[0]], -v[lay[2]], v[lay[1]]]) for v in f.verts), np.zeros(3))
            if float(np.dot(np.array(f.normal), m)) < 0:
                inward.append(f)
        if inward:
            bmesh.ops.reverse_faces(bm, faces=inward)
    bm.to_mesh(me)
    me.update()
    bm.free()
    return done, [z[5] for z in zones]


def glb_normals(path):
    """The file's own normals (glTF space), in its points' order: the importer keeps that order, and its smoothing
    differs from the file's."""
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    a = doc['accessors'][doc['meshes'][0]['primitives'][0]['attributes']['NORMAL']]
    v = doc['bufferViews'][a['bufferView']]
    off = 20 + n + 8 + v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(data, np.float32, a['count'] * 3, off).reshape(-1, 3).astype(np.float64)


def stage(glb):
    """His mesh imported (object 'wizard'; its working copy 'wiz_level') and the camera square on his back ('TabCam':
    orthographic, 0.55 m across, centred at CENTRE). Objects of those names already there are used as they are."""
    w = bpy.data.objects.get('wizard')
    if w is None:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=glb)
        new = [o for o in bpy.data.objects if o not in before]
        for o in new:
            if o.type == 'MESH' and o.name.startswith('Icosphere'):   # (the importer's stray bone shape, in a live Blender)
                bpy.data.objects.remove(o)
        w = next(o for o in bpy.data.objects if o not in before and o.type == 'MESH')
        w.name = 'wizard'
    lvl = bpy.data.objects.get('wiz_level')
    if lvl is None:
        lvl = bpy.data.objects.new('wiz_level', w.data.copy())
        bpy.context.scene.collection.objects.link(lvl)
        lvl.matrix_world = w.matrix_world.copy()
    cam = bpy.data.objects.get('TabCam')
    if cam is None:
        cam = bpy.data.objects.new('TabCam', bpy.data.cameras.new('TabCam'))
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 0.55
    cam.location = (CENTRE[0], 2, CENTRE[1])
    cam.rotation_euler = (math.pi / 2, 0, math.pi)
    bpy.context.scene.camera = cam
    return w, lvl


def _layer(me, k, n):
    a = np.zeros(n)
    me.attributes[k].data.foreach_get('value', a)
    return a


def _set_normals(me):
    """The shading normals from the oi/nx/ny/nz layers (the file's, and the level band's in the junctions)."""
    n = len(me.vertices)
    N = np.c_[_layer(me, 'nx', n), -_layer(me, 'nz', n), _layer(me, 'ny', n)]
    N /= np.linalg.norm(N, axis=1, keepdims=True)
    me.normals_split_custom_set_from_vertices(N.tolist())


def build(glb, scratch, out='strap_mesh.npz'):
    """The whole edit, from the file before: measured, warped, its two ends cut at the rings, and written for
    tools/player/strap_glb.py. Returns (points, triangles)."""
    scene = bpy.context.scene
    w, lvl = stage(glb)
    nrm = glb_normals(glb)
    w.hide_render, lvl.hide_render = False, True
    r = measure(w, os.path.join(scratch, 'back_before.png'))
    old = lvl.data
    me = lvl.data = w.data.copy()
    me.name = 'wiz_level_mesh'
    if old.users == 0:
        bpy.data.meshes.remove(old)
    new, _ = warp(w, r)
    me.vertices.foreach_set('co', new.ravel())
    me.update()
    me.normals_split_custom_set_from_vertices(np.c_[nrm[:, 0], -nrm[:, 2], nrm[:, 1]].tolist())
    w.hide_render, lvl.hide_render = True, False
    uv, him = uv_pass(lvl, os.path.join(scratch, 'uvpass.exr'))
    npass, _ = uv_pass(lvl, os.path.join(scratch, 'npass.exr'), what='normal')
    junctions(lvl, r, uv, him, normals=nrm, npass=npass)
    _set_normals(me)
    _render(scene, os.path.join(scratch, 'back_after.png'))
    return export(lvl, os.path.join(scratch, out), len(nrm))


def export(obj, path, n0):
    """The mesh for tools/player/strap_glb.py: points (Blender space), the file's index of each (oi), normals (glTF),
    triangles with their corners' UVs, and the skin of each point the cuts made (index n0 and on), as vertex groups."""
    me = obj.data
    n = len(me.vertices)
    co = np.zeros(n * 3)
    me.vertices.foreach_get('co', co)
    me.calc_loop_triangles()
    lt = me.loop_triangles
    tv = np.zeros(len(lt) * 3, np.int64)
    lt.foreach_get('vertices', tv)
    tl = np.zeros(len(lt) * 3, np.int64)
    lt.foreach_get('loops', tl)
    uv = np.zeros(len(me.loops) * 2)
    me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    gj, gw = np.zeros((n, 8), np.int64), np.zeros((n, 8))
    for v in me.vertices:
        if v.index < n0:
            continue
        for k, (wt, gi) in enumerate(sorted(((g.weight, g.group) for g in v.groups), reverse=True)[:8]):
            gj[v.index, k], gw[v.index, k] = gi, wt
    np.savez(path, co=co.reshape(-1, 3), oi=_layer(me, 'oi', n),
             nrm=np.c_[_layer(me, 'nx', n), _layer(me, 'ny', n), _layer(me, 'nz', n)], tri_v=tv.reshape(-1, 3),
             tri_uv=uv[tl].reshape(-1, 3, 2), gnames=np.array([g.name for g in obj.vertex_groups]), gj=gj, gw=gw)
    return n, len(lt)


bpy.app.driver_namespace['strap_level'] = types.SimpleNamespace(
    measure=measure, warp=warp, render=_render, uv_pass=uv_pass, junctions=junctions, plan=plan, to_px=to_px, edges=edges,
    medallions=medallions, glb_normals=glb_normals, stage=stage, build=build, export=export)
