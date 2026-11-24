"""A hero's body in the live Blender (the Blender MCP), built straight from its GLB with no operator at all.

The glTF import operator hangs the MCP's command queue in Blender 5.2 (twice, 2026-11-20: CPU at zero, every session's
Blender calls dead until the server was restarted by hand), so nothing here calls bpy.ops. The GLB is read with numpy;
the mesh, its UVs, its pieces' pictures (each primitive's base colour, as an image) and its skin (vertex groups) are made
through bpy.data. Posing is the game's own: tools/heroes/posedump.mjs runs the real Hero code with no page and writes
every joint's world turn and place for each frame asked for; pose() skins the mesh to one of them (linear blend skinning,
as the GPU does), so what is looked at here is what the game draws.

    g = {'__file__': R + '/tools/heroes/blend_body.py'}; exec(open(g['__file__']).read(), g)
    B = g['load'](R + '/assets/game/heroes/paladin_m1.glb', 'pal_m1')    an object 'pal_m1' in collection 'H3'
    g['pose'](B, frames[i])                                                frames from posedump's JSON
    B.save(R + '/assets/game/heroes/paladin_m1.glb')                       (edit.py writes edits back; see there)

Axes: glTF's (x, y up, z ahead) are shown as Blender's (x, -z, y), so up is Blender's z and the body faces -y.
"""
import json
import os
import struct

import bpy
import numpy as np

CT = {5120: 'i1', 5121: 'u1', 5122: 'i2', 5123: 'u2', 5125: 'u4', 5126: 'f4'}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
TMP = os.path.join(os.environ.get('TEMP', '/tmp'), 'h3_tex')


class Glb:
    def __init__(self, path):
        self.path = path
        b = open(path, 'rb').read()
        n = struct.unpack('<I', b[12:16])[0]
        self.js = json.loads(b[20:20 + n])
        self.blob = b[20 + n + 8:]

    def acc(self, i):
        a = self.js['accessors'][i]
        bv = self.js['bufferViews'][a['bufferView']]
        dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
        st = bv.get('byteStride') or dt.itemsize * n
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        raw = np.frombuffer(self.blob, np.uint8, (a['count'] - 1) * st + dt.itemsize * n, off)
        out = np.lib.stride_tricks.as_strided(raw, (a['count'], dt.itemsize * n), (st, 1)).copy().view(dt).reshape(a['count'], n)
        if a.get('normalized') and dt.kind in 'ui':
            out = out.astype(np.float64) / np.iinfo(dt).max
        return out

    def image_bytes(self, i):
        im = self.js['images'][i]
        bv = self.js['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        return self.blob[o:o + bv['byteLength']], im.get('mimeType', 'image/png')


def to_b(v):
    """glTF (x, y, z) to Blender's (x, -z, y)."""
    v = np.asarray(v, np.float64)
    return np.stack([v[..., 0], -v[..., 2], v[..., 1]], -1)


class Body:
    pass


def _collection():
    c = bpy.data.collections.get('H3')
    if not c:
        c = bpy.data.collections.new('H3')
        bpy.context.scene.collection.children.link(c)
    return c


def load(path, name, at=(0.0, 0.0, 0.0)):
    g = Glb(path)
    js = g.js
    skin = js['skins'][0]
    joints = skin['joints']
    jname = [js['nodes'][j].get('name', str(j)) for j in joints]
    ibm = g.acc(skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)     # column-major in the file
    # The skinned mesh's node.
    mnode = next(i for i, nd in enumerate(js['nodes']) if 'mesh' in nd and 'skin' in nd)
    mesh = js['meshes'][js['nodes'][mnode]['mesh']]
    P, N, UV, J, W, F, MI = [], [], [], [], [], [], []
    base = 0
    mats = []
    for pi, pr in enumerate(mesh['primitives']):
        at_ = pr['attributes']
        p = g.acc(at_['POSITION']).astype(np.float64)
        P.append(p)
        N.append(g.acc(at_['NORMAL']).astype(np.float64) if 'NORMAL' in at_ else np.zeros_like(p))
        UV.append(g.acc(at_['TEXCOORD_0']).astype(np.float64) if 'TEXCOORD_0' in at_ else np.zeros((len(p), 2)))
        J.append(g.acc(at_['JOINTS_0']).astype(np.int64))
        W.append(g.acc(at_['WEIGHTS_0']).astype(np.float64))
        idx = g.acc(pr['indices']).reshape(-1, 3).astype(np.int64) if 'indices' in pr else np.arange(len(p)).reshape(-1, 3)
        F.append(idx + base)
        MI.append(np.full(len(idx), len(mats)))
        mats.append(pr.get('material'))
        base += len(p)
    P = np.concatenate(P); N = np.concatenate(N); UV = np.concatenate(UV); J = np.concatenate(J); W = np.concatenate(W)
    F = np.concatenate(F); MI = np.concatenate(MI)
    W = W / np.maximum(W.sum(1, keepdims=True), 1e-9)
    # The mesh, in Blender.
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(P)); me.vertices.foreach_set('co', to_b(P).ravel().astype(np.float32))
    me.loops.add(F.size); me.loops.foreach_set('vertex_index', F.ravel().astype(np.int32))
    me.polygons.add(len(F)); me.polygons.foreach_set('loop_start', (np.arange(len(F)) * 3).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(F), 3, np.int32))
    me.polygons.foreach_set('material_index', MI.astype(np.int32))
    uvl = me.uv_layers.new(name='UV')
    uv = UV[F.ravel()].copy(); uv[:, 1] = 1 - uv[:, 1]
    uvl.data.foreach_set('uv', uv.ravel().astype(np.float32))
    me.update(calc_edges=True)
    me.validate(clean_customdata=False)
    for p in me.polygons: p.use_smooth = True
    # Materials: each primitive's base colour picture (and its factor), unlit enough to see its paint.
    os.makedirs(TMP, exist_ok=True)
    for k, mi in enumerate(mats):
        m = bpy.data.materials.new(f'{name}.{k}')
        m.use_nodes = True
        nt = m.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        md = js['materials'][mi] if mi is not None else {}
        pbr = md.get('pbrMetallicRoughness', {})
        fac = pbr.get('baseColorFactor', [1, 1, 1, 1])
        bsdf.inputs['Base Color'].default_value = fac
        bsdf.inputs['Roughness'].default_value = 0.6
        bsdf.inputs['Metallic'].default_value = 0.0
        tex = pbr.get('baseColorTexture')
        if tex is not None:
            src = js['textures'][tex['index']]['source']
            data, mime = g.image_bytes(src)
            fp = os.path.join(TMP, f'{name}_{src}.{"png" if "png" in mime else "jpg"}')
            if not os.path.exists(fp):
                open(fp, 'wb').write(data)
            img = bpy.data.images.load(fp, check_existing=True)
            tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img
            nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
        if md.get('alphaMode') == 'MASK' or md.get('alphaMode') == 'BLEND':
            pass
        if md.get('doubleSided'):
            m.use_backface_culling = False
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    ob.location = at
    _collection().objects.link(ob)
    # The skin as vertex groups (for weight work in Blender).
    vg = [ob.vertex_groups.new(name=n) for n in jname]
    for k in range(4):
        for j in np.unique(J[:, k]):
            sel = np.nonzero((J[:, k] == j) & (W[:, k] > 0))[0]
            for v in sel:
                vg[int(j)].add([int(v)], float(W[v, k]), 'ADD')
    B = Body()
    B.ob, B.glb, B.P, B.N, B.UV, B.J, B.W, B.F, B.MI = ob, g, P, N, UV, J, W, F, MI
    B.jname, B.ibm, B.joints = jname, ibm, joints
    B.index = {n: i for i, n in enumerate(jname)}
    return B


def qmul(a, b):
    x1, y1, z1, w1 = np.moveaxis(a, -1, 0); x2, y2, z2, w2 = np.moveaxis(b, -1, 0)
    return np.stack([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
                     w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2], -1)


def qrot(q, v):
    u = q[..., :3]; w = q[..., 3:4]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


def mat_to_quat(m):
    tr = m[0, 0] + m[1, 1] + m[2, 2]
    if tr > 0:
        s = np.sqrt(tr + 1) * 2; return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s])
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]]))
    if i == 0:
        s = np.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; return np.array([0.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s])
    if i == 1:
        s = np.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; return np.array([(m[0, 1] + m[1, 0]) / s, 0.25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s])
    s = np.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; return np.array([(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, 0.25 * s, (m[1, 0] - m[0, 1]) / s])


def skin(B, wq, wt):
    """Dual-quaternion skinning, as src/gfx/shaders.js does: wq, wt each joint's world turn and place (glTF axes), in the
    GLB's joint order. Returns the posed places."""
    if not hasattr(B, 'ibq'):
        B.ibq = np.array([mat_to_quat(m[:3, :3]) for m in B.ibm]); B.ibt = B.ibm[:, :3, 3].copy()
    sq = qmul(wq, B.ibq); st = qrot(wq, B.ibt) + wt
    dq = 0.5 * qmul(np.concatenate([st, np.zeros((len(st), 1))], 1), sq)
    r = sq[B.J]; d = dq[B.J]                                  # (V, 4, 4)
    sign = np.sign(np.einsum('vk,vjk->vj', r[:, 0], r)); sign[sign == 0] = 1
    w = B.W * sign
    br = np.einsum('vj,vjk->vk', w, r); bd = np.einsum('vj,vjk->vk', w, d)
    L = np.linalg.norm(br, axis=1, keepdims=True); br /= L; bd /= L
    p = qrot(br, B.P)
    conj = br * np.array([-1, -1, -1, 1.0])
    t = 2 * qmul(bd, conj)[:, :3]
    return p + t


def pose(B, frame, origin=None):
    """The mesh skinned to a frame of posedump (the game's own pose: frame['names'], ['wq'], ['wt'], world, glTF axes),
    moved so `origin` (default the frame's root, frame['at']) is at the object's own origin."""
    names = frame['names']; at = {n: i for i, n in enumerate(names)}
    FQ = np.asarray(frame['wq'], np.float64).reshape(-1, 4); FT = np.asarray(frame['wt'], np.float64).reshape(-1, 3)
    wq = np.zeros((len(B.jname), 4)); wt = np.zeros((len(B.jname), 3))
    for i, n in enumerate(B.jname):
        k = at[n]; wq[i] = FQ[k]; wt[i] = FT[k]
    out = skin(B, wq, wt)
    o = np.asarray(origin if origin is not None else frame.get('at', [0, 0, 0]), np.float64)
    out = unyaw(out - o, frame.get('yaw', 0.0))
    B.ob.data.vertices.foreach_set('co', to_b(out).ravel().astype(np.float32))
    B.ob.data.update()
    return out


def unyaw(v, yaw):
    """Turned about the up so a body at `yaw` faces glTF's +z (Blender's -y): every body is looked at from the same side."""
    c, s_ = np.cos(-yaw), np.sin(-yaw)
    x, y, z = v[..., 0], v[..., 1], v[..., 2]
    return np.stack([x * c + z * s_, y, -x * s_ + z * c], -1)


def rest(B):
    B.ob.data.vertices.foreach_set('co', to_b(B.P).ravel().astype(np.float32))
    B.ob.data.update()


# ---- what's held and slung: the kit's pieces (assets/game/heroes/kit/ID.glb), placed by the game's own matrices ----
PROPS = bpy.app.driver_namespace.setdefault('bb_props', {})     # (kept between calls: each MCP call runs this file afresh)


def load_prop(path, name):
    """A kit piece as a mesh object of its own (no skin), its vertices kept in the piece's own frame (glTF axes) so a matrix
    from the game places it."""
    g = Glb(path)
    js = g.js
    m = js['meshes'][0]
    P, UV, F, MI, mats = [], [], [], [], []
    base = 0
    for pr in m['primitives']:
        p = g.acc(pr['attributes']['POSITION']).astype(np.float64)
        P.append(p)
        UV.append(g.acc(pr['attributes']['TEXCOORD_0']).astype(np.float64) if 'TEXCOORD_0' in pr['attributes'] else np.zeros((len(p), 2)))
        idx = g.acc(pr['indices']).reshape(-1, 3).astype(np.int64)
        F.append(idx + base); MI.append(np.full(len(idx), len(mats))); mats.append(pr.get('material')); base += len(p)
    P = np.concatenate(P); UV = np.concatenate(UV); F = np.concatenate(F); MI = np.concatenate(MI)
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(P)); me.vertices.foreach_set('co', to_b(P).ravel().astype(np.float32))
    me.loops.add(F.size); me.loops.foreach_set('vertex_index', F.ravel().astype(np.int32))
    me.polygons.add(len(F)); me.polygons.foreach_set('loop_start', (np.arange(len(F)) * 3).astype(np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(F), 3, np.int32)); me.polygons.foreach_set('material_index', MI.astype(np.int32))
    uvl = me.uv_layers.new(name='UV'); uv = UV[F.ravel()].copy(); uv[:, 1] = 1 - uv[:, 1]; uvl.data.foreach_set('uv', uv.ravel().astype(np.float32))
    me.update(calc_edges=True)
    for pl in me.polygons: pl.use_smooth = True
    os.makedirs(TMP, exist_ok=True)
    for k, mi in enumerate(mats):
        mt = bpy.data.materials.new(f'{name}.{k}'); mt.use_nodes = True; nt = mt.node_tree
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        md = js['materials'][mi] if mi is not None else {}
        pbr = md.get('pbrMetallicRoughness', {})
        bsdf.inputs['Base Color'].default_value = pbr.get('baseColorFactor', [1, 1, 1, 1]); bsdf.inputs['Roughness'].default_value = 0.6; bsdf.inputs['Metallic'].default_value = 0.0
        tex = pbr.get('baseColorTexture')
        if tex is not None:
            src = js['textures'][tex['index']]['source']; data, mime = g.image_bytes(src)
            fp = os.path.join(TMP, f'{name}_{src}.{"png" if "png" in mime else "jpg"}')
            open(fp, 'wb').write(data)
            img = bpy.data.images.load(fp, check_existing=True); tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = img
            nt.links.new(tn.outputs['Color'], bsdf.inputs['Base Color'])
        me.materials.append(mt)
    ob = bpy.data.objects.new(name, me)
    _collection().objects.link(ob)
    ob.rotation_mode = 'QUATERNION'
    PROPS[name] = (ob, P)
    return ob


def place_prop(ob, P, m16, origin, at=(0.0, 0.0, 0.0), yaw=0.0):
    """The piece's vertices put where the game's matrix (column-major, glTF axes, scale in it) has them, less `origin`; the
    object stays at `at` so it moves with its body."""
    M = np.asarray(m16, np.float64).reshape(4, 4).T
    if not np.any(M[:3, :3]):
        ob.hide_viewport = ob.hide_render = True; return
    ob.hide_viewport = ob.hide_render = False
    Q = unyaw((np.concatenate([P, np.ones((len(P), 1))], 1) @ M.T)[:, :3] - np.asarray(origin, np.float64), yaw)
    ob.data.vertices.foreach_set('co', to_b(Q).ravel().astype(np.float32)); ob.data.update()
    ob.location = at


def show(B, frame, kit_dir, at=(0.0, 0.0, 0.0)):
    """The body and everything it holds, as the game has them in one frame of posedump, at `at` in Blender."""
    pose(B, frame)
    B.ob.location = at
    B.props = getattr(B, 'props', {})
    for k, p in enumerate(frame['props']):
        nm = f'{B.ob.name}.p{k}'
        if not p['id']:
            if nm in bpy.data.objects: bpy.data.objects[nm].hide_viewport = bpy.data.objects[nm].hide_render = True
            continue
        if B.props.get(k, (None,))[0] != p['id'] or nm not in bpy.data.objects:
            load_prop(os.path.join(kit_dir, p['id'] + '.glb'), nm); B.props[k] = (p['id'],)
        ob, P = PROPS[nm]
        place_prop(ob, P, p['m'], frame['at'], at, frame.get('yaw', 0.0))


def strip(B, frames, kit_dir, tag, spacing=1.1, at=(0.0, 0.0, 0.0), axis=0, cols=None, drop=2.15):
    """Each frame as a copy of the body (and what it holds) of its own, in a row `spacing` apart along Blender's x (axis 0)
    or y (1): a stride, a blow, a gesture, seen at once. Copies are named TAG.i (and TAG.i.pK); old ones of TAG go first."""
    for o in [o for o in bpy.data.objects if o.name.startswith(tag + '.')]:
        bpy.data.objects.remove(o, do_unlink=True)
    names = []
    for i, fr in enumerate(frames):
        me = B.ob.data.copy(); ob = bpy.data.objects.new(f'{tag}.{i}', me); _collection().objects.link(ob)
        pos = list(at); c_ = i % cols if cols else i; r_ = i // cols if cols else 0
        pos[axis] += c_ * spacing; pos[2] -= r_ * drop
        out = pose_into(B, fr, me)
        ob.location = pos; names.append(ob.name)
        for k, p in enumerate(fr['props']):
            if not p['id']: continue
            src = os.path.join(kit_dir, p['id'] + '.glb')
            key = 'kit:' + p['id']
            if key not in PROPS: load_prop(src, key); PROPS[key][0].hide_viewport = PROPS[key][0].hide_render = True
            pob, P = PROPS[key]
            pm = pob.data.copy(); po = bpy.data.objects.new(f'{tag}.{i}.p{k}', pm); _collection().objects.link(po)
            place_prop(po, P, p['m'], fr['at'], pos, fr.get('yaw', 0.0)); names.append(po.name)
    return names


def pose_into(B, frame, me, origin=None):
    names = frame['names']; at = {n: i for i, n in enumerate(names)}
    FQ = np.asarray(frame['wq'], np.float64).reshape(-1, 4); FT = np.asarray(frame['wt'], np.float64).reshape(-1, 3)
    wq = np.array([FQ[at[n]] for n in B.jname]); wt = np.array([FT[at[n]] for n in B.jname])
    out = skin(B, wq, wt)
    o = np.asarray(origin if origin is not None else frame.get('at', [0, 0, 0]), np.float64)
    out = unyaw(out - o, frame.get('yaw', 0.0))
    me.vertices.foreach_set('co', to_b(out).ravel().astype(np.float32)); me.update()
    return out


def joint_at(frame, name, origin=None):
    """Where a joint is in a frame of posedump, as pose()/pose_into() place the body (its root at the object's origin,
    unyawed), in Blender's axes."""
    k = frame['names'].index(name)
    p = np.asarray(frame['wt'][k * 3:k * 3 + 3], np.float64)
    o = np.asarray(origin if origin is not None else frame.get('at', [0, 0, 0]), np.float64)
    return to_b(unyaw(p - o, frame.get('yaw', 0.0)))


def crop(src_ob, center, r, name, keep_props=()):
    """A copy of src_ob (and of the prop objects named in keep_props) with only the faces within r of center (Blender
    axes, relative to src_ob's origin): one hand, a neck, a shoulder, close enough to judge. Old ones named so go first."""
    import bmesh
    out = []
    for k, ob in enumerate([src_ob] + [bpy.data.objects[n] for n in keep_props if n in bpy.data.objects]):
        nm = name if k == 0 else f'{name}.p{k}'
        old = bpy.data.objects.get(nm)
        if old: bpy.data.objects.remove(old, do_unlink=True)
        me = ob.data.copy(); bm = bmesh.new(); bm.from_mesh(me)
        c = np.asarray(center, np.float64) + np.asarray(src_ob.location) - np.asarray(ob.location)
        kill = [f for f in bm.faces if min(np.linalg.norm(np.asarray(v.co) - c) for v in f.verts) > r]
        bmesh.ops.delete(bm, geom=kill, context='FACES')
        bm.to_mesh(me); bm.free()
        o2 = bpy.data.objects.new(nm, me); _collection().objects.link(o2); o2.location = ob.location.copy()
        out.append(nm)
    return out


def gallery(cells, at, spacing=0.3, cols=5):
    """Crops (lists of object names, each with the place it was cut round, in Blender axes relative to its first object's
    origin) moved side by side, `cols` to a row, rows going down: to look at many hands or necks at once."""
    for i, (objs, center) in enumerate(cells):
        cell = np.asarray(at, np.float64) + np.array([(i % cols) * spacing, 0.0, -(i // cols) * spacing])
        base = np.asarray(bpy.data.objects[objs[0]].location, np.float64) + np.asarray(center, np.float64)
        for n in objs:
            o = bpy.data.objects[n]; o.location = tuple(np.asarray(o.location, np.float64) + cell - base)
            o.hide_viewport = o.hide_render = False


def _view_scene():
    """A scene of this tool's own (H3view): the H3 collection linked in, a key, a fill and a rim light, a grey world and an
    orthographic camera. Rendered by name (shoot), so the shared file's active scene, whoever's it is, is never touched."""
    sc = bpy.data.scenes.get('H3view')
    if sc is None:
        sc = bpy.data.scenes.new('H3view')
        sc.collection.children.link(_collection())
        w = bpy.data.worlds.new('H3view.world'); w.use_nodes = True
        bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.23, 0.23, 0.24, 1); bg.inputs[1].default_value = 0.9
        sc.world = w
        for nm, rot, en in (('H3.key', (0.9, 0.1, 0.6), 3.2), ('H3.fill', (1.1, 0.0, -2.3), 1.3), ('H3.rim', (2.3, 0.0, 3.0), 1.6)):
            ld = bpy.data.lights.new(nm, 'SUN'); ld.energy = en
            lo = bpy.data.objects.new(nm, ld); lo.rotation_euler = rot; sc.collection.objects.link(lo)
        cd = bpy.data.cameras.new('H3.cam'); cd.type = 'ORTHO'
        co = bpy.data.objects.new('H3.cam', cd); sc.collection.objects.link(co); sc.camera = co
        for e in [i.identifier for i in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items]:
            if 'EEVEE' in e:
                sc.render.engine = e; break
        sc.render.film_transparent = False
        sc.view_settings.view_transform = 'Standard' if 'Standard' in [i.identifier for i in sc.view_settings.bl_rna.properties['view_transform'].enum_items] else sc.view_settings.view_transform
    return sc


def shoot(targets, views, out_dir, tag, size=900, pad=1.08):
    """Each view of the named objects (Blender axes, from the side the vector points to, as `look` takes them) rendered
    orthographic and framed to them, to out_dir/tag_<i>.png. Returns the paths."""
    import mathutils
    sc = _view_scene()
    co = sc.camera
    pts = []
    for n in targets:
        o = bpy.data.objects[n]
        if o.type == 'MESH' and len(o.data.vertices):
            v = np.empty(len(o.data.vertices) * 3, np.float32); o.data.vertices.foreach_get('co', v)
            M = np.array(o.matrix_basis); v = v.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]     # (basis: a world matrix waits for an update)
            pts.append(v)
    P = np.concatenate(pts); c = (P.min(0) + P.max(0)) / 2
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    out = []
    os.makedirs(out_dir, exist_ok=True)
    for i, d in enumerate(views):
        d = np.asarray(d, np.float64); d /= np.linalg.norm(d)
        q = mathutils.Vector(tuple(-d)).to_track_quat('-Z', 'Y')
        R = np.array(q.to_matrix())
        rel = (P - c) @ R                            # camera axes: x right, y up, z back
        half = max(np.ptp(rel[:, 0]), np.ptp(rel[:, 1])) / 2 * pad
        mid = (rel[:, :2].min(0) + rel[:, :2].max(0)) / 2
        co.data.ortho_scale = 2 * half
        co.rotation_mode = 'QUATERNION'; co.rotation_quaternion = q
        co.location = tuple(c + R[:, 0] * mid[0] + R[:, 1] * mid[1] + d * (np.ptp(rel[:, 2]) + 5))
        co.data.clip_end = np.ptp(rel[:, 2]) + 20
        fp = os.path.join(out_dir, f'{tag}_{i}.png'); sc.render.filepath = fp
        bpy.ops.render.render(write_still=True, scene=sc.name)
        out.append(fp)
    return out
