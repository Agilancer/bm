"""Pictures of the party's gear for the pack and the party's book (src/ui/hgicons.js), drawn in Blender.

  each hero weapon and shield (assets/game/heroes/kit/<id>.glb)       -> assets/game/heroes/icons/<id>.webp
  each armour group of each hero body (assets/game/heroes/<id>.glb)   -> assets/game/heroes/icons/<body>_<group>.webp

A piece is drawn as it is on its body (its bind pose), straight on, orthographic, on nothing, in its own colours: the game
dyes the picture in the gear's colours itself (src/gfx/recolour.js), as it dyes the body. The meshes are made straight from
the GLBs' arrays (no glTF import: a rigged import drops an icosphere into the scene), in a scene of their own that's
removed after.

Run it in Blender, through the MCP or in the background:
  blender -b --python tools/heroes/icons.py -- [props|armour|all] [ids...]
  (in a live Blender: exec(open(path).read(), {'__name__': 'bm_icons', 'ARGS': ['props']}) )
"""
import json
import math
import os
import struct
import sys
import tempfile

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else globals().get('HERE')
ROOT = os.path.dirname(os.path.dirname(HERE))
HEROES = os.path.join(ROOT, 'assets', 'game', 'heroes')
OUT = os.path.join(HEROES, 'icons')
CELL = 128                          # pixels a cell of the pack (src/items/partygear.js sizeOfHG)
GROUPS = ('helm', 'shoulders', 'chest', 'arms', 'legs', 'boots')
TALL = {'dagger': 2, 'boomerang': 2, 'sword': 3, 'mace': 3}
LIGHT = ('archer', 'rogue', 'ninja', 'bard')   # the classes in cloth and leather: their shoulders are sleeves and cowls


def load_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jl])
    return j, b[20 + jl + 8:]


def acc(j, binb, i):
    a = j['accessors'][i]
    bv = j['bufferViews'][a['bufferView']]
    n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a['componentType']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.frombuffer(binb, dt, a['count'] * n, off).reshape(a['count'], n).copy()


def image_of(j, binb, index, tmp, name):
    """An image of the GLB's, written out and loaded into Blender."""
    im = j['images'][index]
    bv = j['bufferViews'][im['bufferView']]
    data = binb[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    ext = '.png' if im.get('mimeType') == 'image/png' else '.jpg'
    p = os.path.join(tmp, name + ext)
    open(p, 'wb').write(data)
    img = bpy.data.images.load(p)
    img.pack()
    return img


def make_material(name, alb, nrm=None, mr=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    t = nt.nodes.new('ShaderNodeTexImage'); t.image = alb
    nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.6
    bsdf.inputs['Metallic'].default_value = 0.15
    if mr is not None:
        tm = nt.nodes.new('ShaderNodeTexImage'); tm.image = mr; mr.colorspace_settings.name = 'Non-Color'
        sep = nt.nodes.new('ShaderNodeSeparateColor')
        nt.links.new(tm.outputs['Color'], sep.inputs['Color'])
        nt.links.new(sep.outputs[1], bsdf.inputs['Roughness'])
        # (The heroes' metal was guessed from the paint and runs high: the game itself tones it down. materials.js heroLook.)
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 0.55
        nt.links.new(sep.outputs[2], mul.inputs[0])
        nt.links.new(mul.outputs[0], bsdf.inputs['Metallic'])
    if nrm is not None:
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = nrm; nrm.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nt.links.new(tn.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def make_mesh(name, pos, uv, idx, mat):
    """glTF's Y up made Blender's Z up: (x, y, z) -> (x, -z, y). Its V runs down: Blender's up."""
    P = np.stack([pos[:, 0], -pos[:, 2], pos[:, 1]], 1)
    me = bpy.data.meshes.new(name)
    tris = idx.reshape(-1, 3)
    me.from_pydata(P.tolist(), [], tris.tolist())
    uvl = me.uv_layers.new(name='UV')
    loops = tris.reshape(-1)
    uvs = np.stack([uv[loops, 0], 1.0 - uv[loops, 1]], 1).astype(np.float32)
    uvl.data.foreach_set('uv', uvs.reshape(-1))
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    me.validate()
    ob = bpy.data.objects.new(name, me)
    return ob, P


class Stage:
    """A scene of its own: a camera, the light, a transparent film."""

    def __init__(self):
        self.prev = bpy.context.window.scene if bpy.context.window else bpy.context.scene
        self.sc = bpy.data.scenes.new('BM_Icons')
        sc = self.sc
        engines = [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]
        for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
            if e in engines:
                try:
                    sc.render.engine = e
                    break
                except TypeError:
                    pass
        sc.render.film_transparent = True
        sc.view_settings.view_transform = 'Standard'
        fmts = [i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items]
        self.ext = '.webp' if 'WEBP' in fmts else '.png'
        sc.render.image_settings.file_format = 'WEBP' if 'WEBP' in fmts else 'PNG'
        sc.render.image_settings.color_mode = 'RGBA'
        try:
            sc.render.image_settings.quality = 90
        except Exception:
            pass
        sc.render.resolution_percentage = 100
        w = bpy.data.worlds.new('BM_Icons_World'); w.use_nodes = True
        bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
        bg.inputs['Color'].default_value = (0.32, 0.32, 0.34, 1); bg.inputs['Strength'].default_value = 1.0
        sc.world = w
        cam = bpy.data.cameras.new('BM_Icons_Cam'); cam.type = 'ORTHO'
        self.cam = bpy.data.objects.new('BM_Icons_Cam', cam)
        sc.collection.objects.link(self.cam); sc.camera = self.cam
        self.lights = []
        for nm, energy, rot in (('key', 3.2, (55, 0, -35)), ('fill', 1.1, (70, 0, 40)), ('rim', 2.4, (120, 0, 180))):
            ld = bpy.data.lights.new('BM_Icons_' + nm, 'SUN'); ld.energy = energy
            lo = bpy.data.objects.new('BM_Icons_' + nm, ld)
            lo.rotation_euler = [math.radians(a) for a in rot]
            sc.collection.objects.link(lo); self.lights.append(lo)

    def shoot(self, obs, pts, w, h, path, pad=1.1):
        """obs: objects to draw; pts: their points (Blender space), for the framing; w x h: the picture."""
        sc = self.sc
        for ob in obs:
            sc.collection.objects.link(ob)
        lo, hi = pts.min(0), pts.max(0)
        c = (lo + hi) / 2
        sx, sz = hi[0] - lo[0], hi[2] - lo[2]
        aspect = w / h
        self.cam.data.ortho_scale = max(sx, sz * aspect) * pad if aspect >= 1 else max(sx / aspect, sz) * pad
        self.cam.location = (c[0], lo[1] - 5, c[2])
        self.cam.rotation_euler = (math.radians(90), 0, 0)
        self.cam.data.clip_end = 50
        sc.render.resolution_x, sc.render.resolution_y = w, h
        sc.render.filepath = path
        if bpy.context.window:
            bpy.context.window.scene = sc
        bpy.ops.render.render(write_still=True, scene=sc.name)
        for ob in obs:
            sc.collection.objects.unlink(ob)

    def done(self):
        if bpy.context.window and self.prev:
            bpy.context.window.scene = self.prev
        for o in [self.cam, *self.lights]:
            d = o.data
            bpy.data.objects.remove(o)
            if isinstance(d, bpy.types.Camera):
                bpy.data.cameras.remove(d)
            else:
                bpy.data.lights.remove(d)
        w = self.sc.world
        bpy.data.scenes.remove(self.sc)
        if w:
            bpy.data.worlds.remove(w)


def clear(obs, mats, imgs):
    for ob in obs:
        me = ob.data
        bpy.data.objects.remove(ob)
        bpy.data.meshes.remove(me)
    for m in mats:
        bpy.data.materials.remove(m)
    for i in imgs:
        bpy.data.images.remove(i)


def props(stage, ids=None, tmp=None):
    kit = json.load(open(os.path.join(HEROES, 'kit.json'), encoding='utf-8'))
    done = []
    for pid, meta in sorted(kit['props'].items()):
        if ids and pid not in ids:
            continue
        if meta['kind'] == 'lute':
            continue
        j, b = load_glb(os.path.join(HEROES, 'kit', pid + '.glb'))
        pr = j['meshes'][0]['primitives'][0]; a = pr['attributes']
        mat_i = j['materials'][pr['material']]
        img = image_of(j, b, j['textures'][mat_i['pbrMetallicRoughness']['baseColorTexture']['index']]['source'], tmp, pid)
        mat = make_material('BM_' + pid, img)
        next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Metallic'].default_value = 0.35
        ob, P = make_mesh('BM_' + pid, acc(j, b, a['POSITION']), acc(j, b, a['TEXCOORD_0']), acc(j, b, pr['indices']).reshape(-1), mat)
        shield = meta['kind'] in ('kite', 'tower')
        # (A shield's made facing away, as it's carried: turned round, its face. A weapon edge on as it's held is a line:
        # a quarter turn shows its face, as a sword's shown on a rack.)
        a = math.pi if shield else (math.pi / 2 if (P[:, 1].max() - P[:, 1].min()) > (P[:, 0].max() - P[:, 0].min()) else 0)
        ob.rotation_euler = (0, 0, a)
        R = np.array([[math.cos(a), -math.sin(a), 0], [math.sin(a), math.cos(a), 0], [0, 0, 1]])
        P = P @ R.T
        w, h = (2 * CELL, 3 * CELL) if shield else (CELL, TALL.get(meta['kind'], 4) * CELL)
        stage.sc.view_settings.exposure = 0.2
        stage.shoot([ob], P, w, h, os.path.join(OUT, pid + stage.ext), pad=1.06)
        clear([ob], [mat], [img])
        done.append(pid)
    return done


def armour(stage, ids=None, tmp=None, only=None):
    roster = json.load(open(os.path.join(HEROES, 'roster.json'), encoding='utf-8'))
    done = []
    for r in roster:
        body = r['id']
        if ids and body not in ids:
            continue
        j, b = load_glb(os.path.join(HEROES, body + '.glb'))
        pr = j['meshes'][0]['primitives'][0]; a = pr['attributes']
        pos, uv, idx = acc(j, b, a['POSITION']), acc(j, b, a['TEXCOORD_0']), acc(j, b, pr['indices']).reshape(-1)
        imgs = [image_of(j, b, k, tmp, f'{body}_{k}') for k in range(3)]
        mat = make_material('BM_' + body, imgs[0], imgs[1], imgs[2])
        pieces = j['scenes'][0]['extras']['pieces']
        def cut(name, ps):
            tri = np.concatenate([idx[p['tstart'] * 3:(p['tstart'] + p['tcount']) * 3] for p in ps])
            used = np.unique(tri)
            remap = np.full(len(pos), -1, np.int64); remap[used] = np.arange(len(used))
            return make_mesh(name, pos[used], uv[used], remap[tri], mat)

        def turn(ob, P, axis, a):
            c, s = math.cos(a), math.sin(a)
            R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]]) if axis == 'Y' else np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
            ob.rotation_euler = (0, a, 0) if axis == 'Y' else (0, 0, a)
            return P @ R.T

        def orient(ob, P, R, t=(0, 0, 0)):
            # (Any turn at all, as a matrix: Blender's euler angles come in one order only. t: then moved by that.)
            from mathutils import Matrix
            ob.matrix_world = Matrix([[*R[0], t[0]], [*R[1], t[1]], [*R[2], t[2]], [0, 0, 0, 1]])
            return P @ R.T + np.array(t)

        def Rz(a):
            c, s_ = math.cos(a), math.sin(a)
            return np.array([[c, -s_, 0], [s_, c, 0], [0, 0, 1]])

        def Rx(a):
            c, s_ = math.cos(a), math.sin(a)
            return np.array([[1, 0, 0], [0, c, -s_], [0, s_, c]])

        def Ry(a):
            c, s_ = math.cos(a), math.sin(a)
            return np.array([[c, 0, s_], [0, 1, 0], [-s_, 0, c]])

        def bulk(ps):
            # (How much room a side's pieces take: a pauldron's a lot, a ribbon or a strap hardly any.)
            if not ps:
                return 0.0
            Q = np.concatenate([pos[p['vstart']:p['vstart'] + p['vcount']] for p in ps])
            return float(np.prod(np.ptp(Q, 0) + 1e-3))

        for g in GROUPS:
            if only and g not in only:
                continue
            mine = [p for p in pieces if p['name'].split('_')[0] == g]
            if not mine:
                continue
            if g == 'legs' and len(mine) > 1:
                # (What hangs off the belt isn't the breeches: a knife standing up past the waist, a small piece reaching well
                # over the rest, is left out, or it floats beside them in the picture.)
                tops = [float(pos[p['vstart']:p['vstart'] + p['vcount'], 1].max()) for p in mine]
                tt = sum(p['tcount'] for p in mine)
                mine = [p for k, p in enumerate(mine) if not (tops[k] > max(t for q, t in enumerate(tops) if q != k) + 0.12 and p['tcount'] < 0.3 * tt)]
            span = lambda p, k: float(np.ptp(pos[p['vstart']:p['vstart'] + p['vcount'], k]))
            if g == 'shoulders' and body.startswith('archer'):
                # (An archer's mantle is its pads: the quiver that stands on its back, tall, isn't drawn, or the picture is of
                # a quiver and it's a quiver you think you've found.)
                mine = [p for p in mine if not (span(p, 1) > 0.35 and pos[p['vstart']:p['vstart'] + p['vcount'], 2].max() < 0)] or mine
            side = [pos[p['vstart']:p['vstart'] + p['vcount'], 0].mean() for p in mine]
            left, right = [p for p, x in zip(mine, side) if x > 0], [p for p, x in zip(mine, side) if x <= 0]
            # (Shoulders as a pair, as they're worn, when both sides have something to them; a group that's one strap or a
            # baldric is shown whole.)
            pair = g == 'shoulders' and left and right and min(bulk(left), bulk(right)) >= 0.15 * bulk(mine)
            obs, pts = [], []
            if pair:
                # (Cut from a body in its T, each side let down as it's worn with the arms at the sides, and the two side by
                # side, front on and tipped toward you a little, so their tops read: a sleeve hangs straight, a pauldron sits
                # half way. Seen end on from the T, a sleeve is a croissant and a pauldron a lump.)
                light = body.split('_')[0] in LIGHT
                down, tip = math.radians(86 if light else 52), math.radians(12 if light else 24)
                # (An archer's quiver strap, flat down the back, isn't a shoulder: let down with one, it's a blade.)
                strap = lambda p: body.startswith('archer') and span(p, 2) < 0.04 and span(p, 1) > 2 * span(p, 0)
                for k, (ps, a) in enumerate(((left, down), (right, -down))):
                    ps = [p for p in ps if not strap(p)] or ps
                    ob, P = cut(f'BM_{body}_{g}{k}', ps)
                    P = orient(ob, P, Rx(tip) @ Ry(a))
                    dx = 0.015 - P[:, 0].min() if k == 0 else -0.015 - P[:, 0].max()
                    ob.location = (dx, 0, 0); P = P + np.array([dx, 0, 0])
                    obs.append(ob); pts.append(P)
            elif g == 'arms' and left and right:
                # (Cut from a body standing in its T, the two arms out level a body's breadth apart: each let down straight,
                # and the pair side by side, as gauntlets lie in a pack.)
                for k, (ps, a) in enumerate(((left, math.radians(90)), (right, math.radians(-90)))):
                    ob, P = cut(f'BM_{body}_{g}{k}', ps)
                    P = turn(ob, P, 'Y', a)
                    dx = 0.02 - P[:, 0].min() if k == 0 else -0.02 - P[:, 0].max()
                    ob.location = (dx, 0, 0); P = P + np.array([dx, 0, 0])
                    obs.append(ob); pts.append(P)
            else:
                ob, P = cut(f'BM_{body}_{g}', mine)
                if g == 'shoulders' and body.startswith('archer'):
                    # (An archer's is the quiver on its strap, worn on the back: seen from behind, a little turned, it's a
                    # quiver; from the front it's a stick.)
                    P = orient(ob, P, Rx(math.radians(14)) @ Rz(math.radians(155)))
                elif g == 'shoulders':
                    # (A strap, a baldric or a mantle all of a piece: front on, tipped toward you, as it hangs.)
                    P = orient(ob, P, Rx(math.radians(20)))
                elif g == 'chest':
                    # (A coat turned three-quarter, so its depth and its folds read: straight on, a cuirass is a shrug.)
                    P = turn(ob, P, 'Z', math.radians(-28))
                elif g == 'legs':
                    # (Cuisses and breeches turned three-quarter and seen a little from below, so the legs show past the
                    # drape before them: straight on, a pair of cuisses was a tabard and a pair of breeches a blouse.)
                    P = orient(ob, P, Rx(math.radians(-12)) @ Rz(math.radians(-38)))
                obs.append(ob); pts.append(P)
            w, h = (2 * CELL, 3 * CELL) if g in ('chest', 'legs') else (2 * CELL, 2 * CELL)
            # (Armour's darker than a blade, and a pack's cells are dark: a little more light on it, to be read there.)
            stage.sc.view_settings.exposure = 0.55
            stage.shoot(obs, np.concatenate(pts), w, h, os.path.join(OUT, f'{body}_{g}{stage.ext}'), pad=1.06 if g == 'shoulders' else 1.08)
            clear(obs, [], [])
            done.append(f'{body}_{g}')
        clear([], [mat], imgs)
    return done


def run(args):
    os.makedirs(OUT, exist_ok=True)
    what = args[0] if args else 'all'
    # (groups=chest,shoulders: only those groups of the bodies' armour.)
    only = next((set(a.split('=', 1)[1].split(',')) for a in args[1:] if a.startswith('groups=')), None)
    ids = set(a for a in args[1:] if '=' not in a) or None
    tmp = tempfile.mkdtemp(prefix='bm_icons_')
    stage = Stage()
    out = []
    try:
        if what in ('props', 'all'):
            out += props(stage, ids, tmp)
        if what in ('armour', 'all'):
            out += armour(stage, ids, tmp, only)
    finally:
        stage.done()
    return out


if __name__ == '__main__':
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    print(len(run(argv)), 'pictures')
elif __name__ == 'bm_icons':
    RESULT = run(globals().get('ARGS', []))
