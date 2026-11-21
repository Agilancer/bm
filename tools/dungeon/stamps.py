# The delves' modelled props ("stamps"): built here in Blender, written out as plain corners into
# src/core/delve-stamps-data.js, and laid into a delve's own geometry by src/core/delve-stamps.js (K.stamp), on the
# game's own tiled paintings, so they cost no draw and no texture of their own.
#
# Run in Blender (Blender MCP's execute_blender_code, or in the background: tools/dungeon/stamps_bg.py says how):
#   exec(open(r'<repo>/tools/dungeon/stamps.py').read()); build(); export(r'<repo>/src/core/delve-stamps-data.js')
#
# Each prop is one object in the collection "stamps". Its materials are named for the game's layers ('iron', 'wood',
# 'dark:stone'...); '$flame' is the delve's own flame (look.flame), '$wall' its wall, '$foot' its masonry. Blender's
# metres, Z up; the game's Y up: (x, y, z) game = (x, z, -y) Blender. A wall prop's wall is the plane y = 0 and it stands
# out toward -y (the game's +z, the way out of the wall). Empties parented to a prop, named 'spot.<what>', are written
# out as points: where its flame burns, where a chain hangs from.
import bpy, bmesh, math
from mathutils import Matrix, Vector

COLL = 'stamps'


def coll():
    c = bpy.data.collections.get(COLL)
    if not c:
        c = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(c)
    return c


def mat(name):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
        cols = {'iron': (0.08, 0.08, 0.09), 'wood': (0.25, 0.15, 0.08), '$flame': (1, 0.6, 0.2), 'flame': (1, 0.6, 0.2), 'white': (0.9, 0.88, 0.8)}
        base = name.split(':')[-1]
        m.diffuse_color = (*cols.get(name, cols.get(base, (0.45, 0.43, 0.4))), 1)
        m.use_nodes = True
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b:
            b.inputs['Base Color'].default_value = m.diffuse_color
            if 'flame' in name:
                try:
                    b.inputs['Emission Color'].default_value = (1, 0.55, 0.18, 1); b.inputs['Emission Strength'].default_value = 4
                except KeyError:
                    pass
    return m


class Mesh:
    """A prop under construction: bmesh pieces, each on a material."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.spots = {}

    def _slot(self, m):
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def _add(self, m, verts, faces):
        slot = self._slot(m)
        vs = [self.bm.verts.new(v) for v in verts]
        for f in faces:
            try:
                face = self.bm.faces.new([vs[i] for i in f])
                face.material_index = slot
            except ValueError:
                pass
        return vs

    def box(self, m, c, s, rot=(0, 0, 0)):
        """Box centred at c, full size s, turned by rot (radians, XYZ)."""
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        R = Matrix.Rotation(rot[2], 3, 'Z') @ Matrix.Rotation(rot[1], 3, 'Y') @ Matrix.Rotation(rot[0], 3, 'X')
        pts = [Vector(c) + R @ Vector((x, y, z)) for z in (-hz, hz) for y in (-hy, hy) for x in (-hx, hx)]
        faces = [(0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)]
        self._add(m, pts, faces)

    def cyl(self, m, a, b, r, n=8, r2=None, cap=True):
        """A tube from a to b, radius r (r2 at b), n sides."""
        a, b = Vector(a), Vector(b)
        ax = (b - a).normalized()
        u = ax.orthogonal().normalized(); v = ax.cross(u)
        r2 = r if r2 is None else r2
        pts = []
        for end, rr in ((a, r), (b, r2)):
            for i in range(n):
                t = i / n * math.tau
                pts.append(end + (u * math.cos(t) + v * math.sin(t)) * rr)
        faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        if cap:   # (cap='top': the far end's only, where the near one sits on something and is never seen)
            if cap != 'top':
                faces.append(tuple(reversed(range(n))))
            faces.append(tuple(range(n, 2 * n)))
        self._add(m, pts, faces)

    def path(self, m, pts, r, n=6):
        """A bar bent along a list of points."""
        for p, q in zip(pts, pts[1:]):
            self.cyl(m, p, q, r, n)

    def ring(self, m, c, R, r, axis='Y', n=10, k=6):
        """A torus: a ring of bar round centre c, its hole along axis."""
        c = Vector(c)
        A = {'X': Vector((1, 0, 0)), 'Y': Vector((0, 1, 0)), 'Z': Vector((0, 0, 1))}[axis]
        u = A.orthogonal().normalized(); v = A.cross(u)
        pts = [c + (u * math.cos(i / n * math.tau) + v * math.sin(i / n * math.tau)) * R for i in range(n + 1)]
        self.path(m, pts, r, k)

    def pyramid(self, m, c, w, h, n=4, turn=math.pi / 4):
        c = Vector(c)
        base = [c + Vector((math.cos(turn + i / n * math.tau) * w, math.sin(turn + i / n * math.tau) * w, 0)) for i in range(n)]
        self._add(m, base + [c + Vector((0, 0, h))], [(i, (i + 1) % n, n) for i in range(n)] + [tuple(reversed(range(n)))])

    def spot(self, name, p):
        self.spots[name] = tuple(p)

    def done(self):
        old = bpy.data.objects.get(self.name)
        if old:
            for ch in list(old.children):
                bpy.data.objects.remove(ch, do_unlink=True)
            bpy.data.objects.remove(old, do_unlink=True)
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me); self.bm.free()
        for m in self.mats:
            me.materials.append(mat(m))
        ob = bpy.data.objects.new(self.name, me)
        coll().objects.link(ob)
        for k, p in self.spots.items():
            e = bpy.data.objects.new('spot.' + k, None)
            e.empty_display_size = 0.05
            e.location = p
            e.parent = ob
            coll().objects.link(e)
        return ob


# ---- the props -------------------------------------------------------------------------------------------------------------

def lantern(M, top, w=0.13, h=0.3, glass='$flame'):
    """A keeper's lantern hung from `top` (the ring's top): a square iron frame with four panes, a pyramid roof and a ring."""
    x, y, z = top
    zr = z - 0.06          # the ring's bottom
    zt = zr - 0.11         # the roof's foot
    zb = zt - h            # the base's top
    M.ring('iron', (x, y, z - 0.03), 0.03, 0.007, 'X', 8, 4)
    M.pyramid('iron', (x, y, zt), w * 1.25, zr - zt + 0.01)
    M.box('iron', (x, y, zt - 0.012), (w * 1.85, w * 1.85, 0.024))
    M.box('iron', (x, y, zb - 0.02), (w * 1.8, w * 1.8, 0.04))
    M.box('iron', (x, y, zb - 0.07), (w * 1.1, w * 1.1, 0.06))
    for sx in (-1, 1):
        for sy in (-1, 1):
            M.box('iron', (x + sx * w * 0.82, y + sy * w * 0.82, (zt + zb) / 2), (0.018, 0.018, zt - zb))
    # The panes, inset, and a band of iron round their middle. The horn smoked and dull ('soot:flame'), and on each face,
    # low and in the middle, the bright of the flame behind it ($flame): a lantern with a flame in it, not a lit box.
    # (A dead one's glass is all one, dark: o.flame 'slate:iron' takes both.)
    M.box('soot:flame' if glass == '$flame' else glass, (x, y, (zt + zb) / 2), (w * 1.5, w * 1.5, zt - zb - 0.02))
    hh = zt - zb
    for ax, sx in ((0, 1), (0, -1), (1, 1), (1, -1)):
        c = [x, y, zb + hh * 0.36]
        c[ax] += sx * (w * 0.75 + 0.002)
        M.box(glass, tuple(c), (0.004, w * 0.7, hh * 0.42) if ax == 0 else (w * 0.7, 0.004, hh * 0.42))
    M.box('iron', (x, y, zb + (zt - zb) * 0.55), (w * 1.58, w * 1.58, 0.014))
    M.spot('flame', (x, y, zb + (zt - zb) * 0.4))


def lantern_wall():
    """A lantern on a wrought bracket: a plate on the wall, an arm out with a scroll under it, the lantern hung off its end."""
    M = Mesh('lantern_wall')
    M.box('iron', (0, -0.012, -0.05), (0.09, 0.024, 0.34))
    for z in (0.07, -0.17):
        M.cyl('iron', (0, 0.0, z), (0, -0.03, z), 0.014, 6)      # (its nails' heads)
    reach = 0.48
    M.path('iron', [(0, -0.02, 0.04), (0, -0.25, 0.05), (0, -reach, 0.04), (0, -reach - 0.04, 0.0)], 0.014, 6)
    # The scroll: a curl of bar under the arm, back to the plate.
    sc = [(0, -0.02, -0.14)] + [(0, -0.16 - 0.08 * math.sin(t), -0.04 - 0.08 * math.cos(t) * 0.9) for t in [i / 6 * math.pi * 1.4 for i in range(7)]]
    M.path('iron', sc, 0.01, 5)
    M.path('iron', [(0, -reach - 0.04, 0.0), (0, -reach - 0.04, -0.06)], 0.008, 4)
    lantern(M, (0, -reach - 0.04, -0.05))
    return M.done()


def lantern_hang():
    """A lantern alone, to hang on a chain from a vault: the ring's top at the origin."""
    M = Mesh('lantern_hang')
    lantern(M, (0, 0, 0), w=0.16, h=0.36)
    return M.done()


def streetgrate():
    """A street's drain grate seen from below, in the vault: the bars, the daylight behind them, a deep frame of dressed
    stone round them coming down out of the roof. The vault's face isn't cut, so all of it hangs under it: the origin is
    on the roof's face, the middle of the grate, and everything is below z = 0. The sky behind the bars is 'glow'."""
    M = Mesh('streetgrate')
    W, D = 0.75, 0.42
    M.box('slate:glow', (0, 0, -0.015), (2 * W, 2 * W, 0.02))
    for sx in (-1, 1):   # the throat: four deep sides of stone, and a frame round its mouth a step wider
        M.box('$foot', (sx * (W + 0.12), 0, -D / 2), (0.24, 2 * W + 0.48, D))
        M.box('$foot', (0, sx * (W + 0.12), -D / 2), (2 * W + 0.48, 0.24, D))
        M.box('$foot', (sx * (W + 0.36), 0, -D - 0.06), (0.36, 2 * W + 1.08, 0.14))
        M.box('$foot', (0, sx * (W + 0.36), -D - 0.06), (2 * W + 1.08, 0.36, 0.14))
    for i in range(-4, 5):   # the bars, square, set on edge, two ways
        M.box('iron', (i * W / 4.6, 0, -0.07), (0.035, 2 * W, 0.05), (0, 0, 0))
    for j in (-1, 0, 1):
        M.box('iron', (0, j * W / 1.6, -0.1), (2 * W, 0.04, 0.03))
    # Moss in the throat's corners, and its tails hanging out of the mouth.
    for k in range(6):
        sx, sy = (1 if k % 2 else -1), (1 if k % 3 else -1)
        M.box('moss:rubble', (sx * (W - 0.02), sy * (W * 0.4 * (k % 3)), -D + 0.02 - 0.12 * (k % 2)), (0.05, 0.16, 0.3 + 0.12 * (k % 2)), (0, 0.12 * sx, 0))
    M.spot('light', (0, 0, -0.05))
    return M.done()


def outfall():
    """A brick-lined pipe mouth in a wall, a little out from it, with a lip of stone under it: water trickles out of it.
    The wall is y = 0; the mouth's middle at height 0."""
    M = Mesh('outfall')
    R, n = 0.42, 12
    for i in range(n):   # the ring of voussoirs, standing a hand proud of the wall
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        am = (a0 + a1) / 2
        M.box('$foot', (math.cos(am) * (R + 0.12), -0.08, math.sin(am) * (R + 0.12)), (0.2, 0.2, 0.3), (0, -am, 0))
    # The bore: a short tube of sooted brick in front of the wall's face (the wall isn't cut), shut at its back by a disc
    # of black, so the mouth reads as a hole going in and not as a ring stuck on the stone.
    M.cyl('char:stone', (0, -0.035, 0), (0, -0.2, 0), R, n, cap=False)
    M.cyl('char:rubble', (0, -0.03, 0), (0, -0.04, 0), R * 1.02, n)
    M.cyl('dark:stone', (0, -0.2, 0), (0, -0.21, 0), R + 0.02, n, R + 0.02, cap=False)
    M.box('$foot', (0, -0.3, -R - 0.12), (1.0, 0.5, 0.12))
    M.box('moss:rubble', (0, -0.42, -R - 0.17), (0.5, 0.25, 0.04))
    M.spot('lip', (0, -0.5, -R - 0.06))
    return M.done()


BUILDERS = [lantern_wall, lantern_hang, streetgrate, outfall]


def candles():
    """The grave-singers' candles: a rough slab with a crowd of tallow candles stuck to it in their own wax, burnt down to
    different heights, wax run down them and pooled. Spots f0.. at each wick (src/core/delve-build.js lights the tallest)."""
    M = Mesh('candles')
    M.box('dark:rubble', (0, 0, 0.05), (0.62, 0.44, 0.1), (0, 0, 0.1))
    M.cyl('umber:white', (0.02, 0.0, 0.1), (0.02, 0.0, 0.115), 0.26, 9, 0.22, cap='top')   # (the wax all run together, yellowed)
    cs = [(-0.16, -0.08, 0.34), (0.0, 0.06, 0.26), (0.15, -0.05, 0.2), (-0.05, -0.12, 0.14), (0.2, 0.1, 0.11), (-0.2, 0.1, 0.22), (0.08, -0.15, 0.08)]
    for i, (x, y, h) in enumerate(cs):
        r = 0.028 + 0.006 * (i % 3)
        tallow = ('white', 'umber:white', 'pale:cloth_oat')[i % 3]   # (new tallow white, old yellowed, older still)
        M.cyl(tallow, (x, y, 0.11), (x, y, 0.11 + h), r, 6, r * 0.92, cap='top')
        M.cyl('umber:white', (x + 0.01, y, 0.11), (x + 0.012, y, 0.11 + h * 0.55), r * 1.2, 4, r * 1.02, cap='top')   # (a run of wax down it)
        M.cyl(tallow, (x, y, 0.11 + h - 0.012), (x + 0.004, y, 0.11 + h + 0.004), r * 1.08, 6, r * 0.7, cap='top')   # (its lip, melted in round the wick)
        M.cyl('dark:iron', (x, y, 0.11 + h), (x, y, 0.11 + h + 0.018), 0.004, 3, cap=False)
        M.spot('f%d' % i, (x, y, 0.11 + h + 0.012))
    return M.done()


def boards():
    """A mudlarks' walk: three metres of planks laid across two runners on stakes driven into the mud, one plank gone.
    The origin at the walk's middle, its top at z = 0.28; it runs along x."""
    M = Mesh('boards')
    for sy in (-0.42, 0.42):
        M.box('dark:wood', (0, sy, 0.17), (3.0, 0.1, 0.09), (0.02 * sy, 0, 0))
        for sx in (-1.3, 0.0, 1.3):
            M.box('dark:wood', (sx, sy + 0.06, 0.02), (0.08, 0.08, 0.5), (0.08 * sx, 0.1 * sy, 0))
    for i in range(12):
        if i == 7:
            continue
        x = -1.38 + i * 0.25
        M.box('wood', (x, 0.03 * ((i * 5) % 3 - 1), 0.245 + 0.012 * ((i * 3) % 2)), (0.22, 1.05 + 0.08 * (i % 3), 0.04), (0.03 * ((i * 7) % 3 - 1), 0, 0.04 * ((i * 5) % 3 - 1)))
    M.box('wood', (0.38, -0.55, 0.06), (0.22, 0.9, 0.04), (0.5, 0.2, 1.2))   # (the one that's gone, in the mud beside)
    return M.done()


BUILDERS += [candles, boards]


def oculus():
    """A light well's mouth seen from below, in a vault: a ring of dressed stone hung under the roof's face, a throat going up
    into it, a grille of iron across it and the day ('slate:glow') beyond. Radius 1 at its throat: o.s is the well's radius.
    Its origin on the roof's face, the middle of the well; all of it below z = 0 (the roof isn't cut)."""
    M = Mesh('oculus')
    n = 20
    M.cyl('slate:glow', (0, 0, -0.01), (0, 0, -0.02), 1.0, n)
    M.cyl('$foot', (0, 0, -0.02), (0, 0, -0.42), 1.0, n, 1.0, cap=False)         # (the throat)
    M.cyl('$foot', (0, 0, -0.42), (0, 0, -0.5), 1.0, n, 1.32, cap=False)         # (its mouth's chamfer, out to the moulding)
    for i in range(n):   # (the moulding round it: a ring of blocks, not a smooth tube)
        a = (i + 0.5) / n * math.tau
        M.box('$foot', (math.cos(a) * 1.2, math.sin(a) * 1.2, -0.54), (0.36, 0.42, 0.14), (0, 0, a))
    for k in range(8):   # (the grille: eight bars from a hub out to the throat, a ring of bar half way)
        a = k / 8 * math.tau
        M.cyl('iron', (0, 0, -0.22), (math.cos(a) * 1.0, math.sin(a) * 1.0, -0.22), 0.025, 4, cap=False)
    M.ring('iron', (0, 0, -0.22), 0.55, 0.022, 'Z', 16, 4)
    M.cyl('iron', (0, 0, -0.18), (0, 0, -0.27), 0.08, 8)
    for k in range(7):   # (rain's run down the throat: dark streaks of it)
        a = k * 0.9 + 0.3
        M.box('dark:stone', (math.cos(a) * 0.985, math.sin(a) * 0.985, -0.24), (0.04, 0.09, 0.38), (0, 0, a))
    M.spot('light', (0, 0, -0.3))
    return M.done()


def jar():
    """One of the Undercroft's great vessels: a jar of green glass a man high, round-shouldered, an iron lid and three iron
    bands; a stand of stone under it; a lamp set in the stand's hollow (spot 'lamp'): its glow, low behind the dark green
    glass, is a card the game puts there (src/core/delve-props-a.js glassjar). Unit: 1 m radius at its belly, 2.8 m of glass."""
    M = Mesh('jar')
    n = 16
    prof = [(0.0, 0.62), (0.1, 0.9), (0.35, 1.0), (1.05, 1.0), (1.6, 1.0), (2.2, 0.92), (2.55, 0.66), (2.75, 0.5), (2.8, 0.5)]
    z0 = 0.5
    for (h0, r0), (h1, r1) in zip(prof, prof[1:]):
        M.cyl('forest:obsidian', (0, 0, z0 + h0), (0, 0, z0 + h1), r0, n, r1, cap=False)
    M.cyl('iron', (0, 0, z0 + 2.8), (0, 0, z0 + 2.96), 0.56, n, 0.3)
    M.cyl('iron', (0, 0, z0 + 2.96), (0, 0, z0 + 3.04), 0.12, 8)
    for h, r in ((0.12, 0.93), (1.3, 1.0), (2.3, 0.88)):
        M.cyl('iron', (0, 0, z0 + h - 0.05), (0, 0, z0 + h + 0.05), r + 0.025, n, r + 0.025, cap=False)
    M.cyl('dark:block', (0, 0, 0), (0, 0, z0), 1.15, 8, 1.05)
    # (What's in it against the light: a body hung curled, a dark shape, seen through the glass: drawn on the glass's face
    # by src/core/delve-props-a.js, since the glass isn't clear.)
    M.spot('lamp', (0, 0, 0.3))
    return M.done()


def gravelamp():
    """The Kingsbarrow's hung grave-lamp: a wide dished bowl of dark iron on three chains from a ring, tallow in it and a
    crowd of wicks round its rim (spots w0..w5). Origin at the ring, the bowl 0.9 m under it."""
    M = Mesh('gravelamp')
    M.ring('iron', (0, 0, 0), 0.09, 0.015, 'Z', 10, 4)
    for k in range(3):
        a = k / 3 * math.tau
        M.path('iron', [(0, 0, -0.02), (math.cos(a) * 0.6, math.sin(a) * 0.6, -0.86)], 0.012, 4)
    M.cyl('dark:iron', (0, 0, -0.88), (0, 0, -1.08), 0.64, 14, 0.22, cap='top')   # (the bowl's dish, open at the top)
    M.cyl('dark:iron', (0, 0, -0.9), (0, 0, -0.86), 0.66, 14, 0.66, cap=False)   # (its lip)
    M.cyl('umber:white', (0, 0, -0.93), (0, 0, -0.92), 0.6, 14)                   # (the tallow in it)
    M.cyl('dark:iron', (0, 0, -1.08), (0, 0, -1.2), 0.18, 8, 0.05)               # (a drop under it)
    for k in range(6):
        a = (k + 0.5) / 6 * math.tau
        M.cyl('dark:iron', (math.cos(a) * 0.5, math.sin(a) * 0.5, -0.92), (math.cos(a) * 0.5, math.sin(a) * 0.5, -0.9), 0.006, 3, cap=False)
        M.spot('w%d' % k, (math.cos(a) * 0.5, math.sin(a) * 0.5, -0.89))
    return M.done()


def cocoon():
    """What the Spider Queen keeps: a body wound in silk and hung by a rope of it, lumpy, the wraps in bands round it.
    The origin at its top (where the rope meets it), 1.72 m long, hanging down -z."""
    M = Mesh('cocoon')
    prof = [(0, 0.06), (0.15, 0.2), (0.4, 0.3), (0.75, 0.34), (1.05, 0.3), (1.35, 0.33), (1.6, 0.2), (1.72, 0.05)]
    for i, ((h0, r0), (h1, r1)) in enumerate(zip(prof, prof[1:])):
        M.cyl('white' if i % 2 else 'pale:cloth_oat', (0.02 * (i % 3 - 1), 0, -h0), (0.02 * ((i + 1) % 3 - 1), 0, -h1), r0, 8, r1, cap=False)
    for h, r in ((0.5, 0.32), (0.9, 0.33), (1.2, 0.32)):   # (the wraps across it)
        M.cyl('pale:cloth_oat', (0, 0, -h + 0.03), (0, 0, -h - 0.03), r + 0.012, 8, r + 0.012, cap=False)
    M.cyl('white', (0, 0, -1.72), (0, 0, -1.74), 0.05, 6)
    for k in range(3):   # (silk strands from its shoulders up to the rope)
        a = k / 3 * math.tau
        M.path('white', [(math.cos(a) * 0.18, math.sin(a) * 0.18, -0.16), (0, 0, 0.25)], 0.006, 3)
    M.spot('top', (0, 0, 0))
    return M.done()


BUILDERS += [oculus, jar, gravelamp, cocoon]


def build(only=None):
    out = []
    for b in BUILDERS:
        if only and b.__name__ not in only:
            continue
        out.append(b().name)
    return out


def export(path):
    """Every prop in the collection to the game: per material, its triangles' corners and normals (flat, by the face)."""
    lines = ['// Made by tools/dungeon/stamps.py in Blender: never edit by hand. src/core/delve-stamps.js lays them.',
             '// name: { parts: { layer: [x, y, z, nx, ny, nz, ...per corner, three corners a triangle] }, spots: { name: [x, y, z] } }',
             'export const STAMPS = {']
    for ob in sorted(coll().objects, key=lambda o: o.name):
        if ob.type != 'MESH':
            continue
        me = ob.data
        parts = {}
        for poly in me.polygons:
            m = me.materials[poly.material_index].name if me.materials else 'stone'
            vs = [me.vertices[i].co for i in poly.vertices]
            n = poly.normal
            for k in range(1, len(vs) - 1):
                for v in (vs[0], vs[k], vs[k + 1]):
                    parts.setdefault(m, []).extend([v.x, v.z, -v.y, n.x, n.z, -n.y])
        spots = {ch.name.split('.')[1]: [ch.location.x, ch.location.z, -ch.location.y] for ch in ob.children if ch.name.startswith('spot.')}
        f = lambda a: ','.join(('%.4f' % x).rstrip('0').rstrip('.') for x in a)
        lines.append('  %s: { parts: { %s }, spots: { %s } },' % (
            ob.name,
            ', '.join("'%s': [%s]" % (k, f(v)) for k, v in parts.items()),
            ', '.join("%s: [%s]" % (k, f(v)) for k, v in spots.items())))
        print(ob.name, {k: len(v) // 18 for k, v in parts.items()}, 'tris')
    lines.append('};')
    open(path, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
    return path
