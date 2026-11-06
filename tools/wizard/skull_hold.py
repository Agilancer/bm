"""Run inside Blender, through Blender MCP, with assets/fp/spell_attack.glb (armature `hands`, mesh `open`) and skull_01.glb (mesh `HeldSkull`) in the scene SkullHold. Importing a rigged glb also drops a stray Icosphere: delete it.
The arm is the spell hands' open one because it has fingers: arms_1h.glb's are a fused mass sculpted round a grip and shred when opened. The older holds in HOLDS still use arms_1h.glb (armature `arms`, mesh `arms.001`).
exec(compile(open(path).read(), path, 'exec'), dict(__name__='__main__', W=<repo root>))

The skull in the left hand, as in the owner's photo: held out in front of the eye and looking straight back at it, the palm behind and under it, the fingers out of sight behind the bone,
only the heel of the hand and the thumb's side showing at the cheek, and the forearm rising from the lower left.
PHOTO is that hold (pass DRY=True to pose it without writing anything to the game). HOLDS keeps the holds before it (pass HOLD='claw', 'yorick' or 'lantern' beside W). TWEAK is the palm-up pose they replaced.
Joints only: nothing is bent mid bone and the mesh isn't edited. The arm moves as one piece, and only the wrist joint and the fingers bend.
Bakes the arm's left side to assets/game/items/skull_arm.glb in the view's own space (then run tools/wizard/fix_arm.py) and writes SKULL_SEAT into src/gfx/renderer.js. TWEAK holds the pose.
"""
import math
import os
import re

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector
from mathutils.bvhtree import BVHTree

TWEAK = {
    'scale': 0.62,           # the skull, of life size
    'roll': 198,            # degrees the arm rolls about the forearm: 180 is palm straight up
    'yaw': -35, 'pitch': 0,  # the whole arm turned about the elbow
    'palm': (-0.235, 0.45, -0.262),  # where the palm's middle ends up, in view space (x right, y forward, z up)
    'face': (0.95, -0.85, 0.35),     # which way the skull looks: back at the eye, a little up
    'lean': 0.2,            # how much its crown leans with the palm rather than straight up
    'gap': 0.035, 'fwd': 0.03,     # its centre: off the palm, and along the fingers
    # Where each fingertip comes to, in the skull's frame (front -y, crown +z, its right-of-view +x), metres of life size. Snapped to the surface.
    'tips': {
        'index': (0.072, 0.05, -0.03), 'middle': (0.082, 0.005, -0.035), 'ring': (0.075, -0.04, -0.045), 'pinky': (0.05, -0.07, -0.06),
        'thumb': (0.06, -0.07, -0.05),
    },
    'skin': 0.009,          # how far a fingertip's joint stands off the bone
}
# Other holds: pass HOLD='claw' (or another name) alongside W. Each only names what differs from TWEAK.
HOLDS = {
    # The hand comes down over the crown from the left and the skull hangs under it. The thumb stays at rest: aimed at the skull, it goes through the bone.
    'claw': {
        'scale': 0.8, 'roll': -24, 'yaw': -48, 'pitch': 0, 'palm': (-0.28, 0.46, -0.07), 'face': (0.45, -0.85, 0.2), 'lean': -0.25, 'gap': 0.05, 'fwd': 0.01,
        'tips': {'index': (0.04, -0.06, 0.075), 'middle': (0.065, -0.01, 0.07), 'ring': (0.06, 0.035, 0.07), 'pinky': (0.03, 0.07, 0.065)},
    },
    # Thumb up, arm out: the back of its head in the palm, looking across the view, thumb over the crown.
    'yorick': {
        'scale': 0.58, 'roll': 250, 'yaw': -10, 'pitch': 20, 'palm': (-0.38, 0.5, -0.15), 'face': (0.9, -0.42, 0.3), 'lean': 0.1, 'gap': 0.05, 'fwd': 0.045,
        'tips': {'index': (0.08, 0.03, 0.04), 'middle': (0.085, 0.0, 0.0), 'ring': (0.08, -0.01, -0.035), 'pinky': (0.06, 0.01, -0.06), 'thumb': (-0.05, 0.0, 0.085)},
    },
    # Held up high like a lantern: palm up, seen from beneath, the fingers curling up its far side.
    'lantern': {
        'scale': 0.68, 'roll': 212, 'yaw': -18, 'pitch': 35, 'palm': (-0.25, 0.43, 0.03), 'face': (0.45, -0.8, -0.35), 'lean': 0.6, 'gap': 0.035, 'fwd': 0.03,
        'tips': {'index': (0.0, 0.085, -0.03), 'middle': (0.04, 0.075, -0.035), 'ring': (0.07, 0.04, -0.04), 'pinky': (0.08, 0.0, -0.05), 'thumb': (-0.085, -0.02, -0.01)},
    },
}
# The owner's photo. The skull is placed first and the hand comes to it.
PHOTO = {
    'scale': 1.0,                    # life size, as the photo's looks beside the hand
    'centre': (-0.223, 0.365, -0.075),  # the skull's middle in view space: left of the crosshair and a little low
    'look': (0.1, 0.0, 0.14),        # added to the way back to the eye: the photo's skull looks a hair to the right and up. Less and its sockets squint
    'crown': (0.13, 0.18, 1),        # leans right in the world, which reads level from here: the eye sees it from the right, so upright reads tipped
    'forearm': (0.45, 0.78, 0.47),   # the way the forearm runs, elbow to wrist: the long diagonal up from the lower left
    'fingers': (0.71, 0.32, 0.62),   # the way the hand's fingers run: from behind the skull's left, across its back to the right
    'palm': (0.6, -0.6, 0.52),       # the way its palm faces: into the skull. These three lie in one plane, so the wrist only flexes
    'seat': (-0.075, 0.03, -0.05),   # where the palm's middle meets the skull, on its own frame: low on the left of the back of the head, so the hand's edge shows up the skull's left and no fingertip shows on its right
    'gap': 0.105,                    # palm's bones off that point, along the way the palm faces. Closer and the fingers' middles go through the bone
    'reach': {'index': 0.055, 'middle': 0.065, 'ring': 0.065, 'pinky': 0.055},  # how far along the fingers' way each tip goes from its knuckle
    'spread': {'index': 0.012, 'middle': 0.0, 'ring': -0.012, 'pinky': -0.026},  # and how far it fans out, thumbwards
    'skin': 0.02,
    'thumb': (-0.07, 0.045, -0.03),  # its tip on the skull's own frame: behind the temple on the left of the view, out of sight as in the photo. Forward of that the tip shows end on, a pale ball on a stalk
}
HOLD = globals().get('HOLD')
if HOLD: TWEAK.update(HOLDS[HOLD])
TWEAK.update(globals().get('OVER', {}))
PHOTO.update(globals().get('OVER', {}))
DRY = globals().get('DRY', False)
ROOT = os.environ.get('BM_ROOT') or globals().get('W')
Z_UP_TO_GLTF = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


def aim_chain(arm, names, tipname, target, iters=16, free=False):
    """CCD on a finger's joints, tip to knuckle, in armature space."""
    pbs = [arm.pose.bones[n] for n in names]
    tip = arm.pose.bones[tipname]
    if not free:
        kn = pbs[0]
        bpy.context.view_layer.update()
        q = (tip.head - kn.head).rotation_difference(target - kn.head)
        q = Quaternion(q.axis, min(q.angle, math.radians(14)))
        mat = kn.matrix.copy()
        r = (q.to_matrix() @ mat.to_3x3()).to_4x4()
        r.translation = mat.translation
        kn.matrix = r
    for _ in range(iters):
        for pb in reversed(pbs):
            bpy.context.view_layer.update()
            a, b = tip.head - pb.head, target - pb.head
            if a.length < 1e-5 or b.length < 1e-5: continue
            if free:
                q = a.rotation_difference(b)
                q = Quaternion(q.axis, q.angle * 0.55)
            else:
                # A finger only hinges: about its own x, or the skin crumples. Half a step at a time, so the curl shares itself along it.
                ax = pb.matrix.col[0].to_3d().normalized()
                ap, bp = a - ax * a.dot(ax), b - ax * b.dot(ax)
                if ap.length < 1e-5 or bp.length < 1e-5: continue
                q = Quaternion(ax, math.copysign(ap.angle(bp), ax.dot(ap.cross(bp))) * 0.55)
            mat = pb.matrix.copy()
            r = (q.to_matrix() @ mat.to_3x3()).to_4x4()
            r.translation = mat.translation
            pb.matrix = r
    bpy.context.view_layer.update()
    return (tip.head - target).length


def curl(arm, names, target, across, iters=24):
    """The spell hands' fingers to a point: a little swing at the knuckle, then each joint hinging in the plane the finger already curls in. With no `across` (the thumb), every joint turns freely."""
    pbs = [arm.pose.bones[n] for n in names]
    tip = pbs[-1]
    ax = None
    if across is not None:
        bpy.context.view_layer.update()
        a, b = pbs[0].tail - pbs[0].head, pbs[-1].tail - pbs[0].tail
        ax = a.cross(b)
        if ax.length < 1e-4: ax = across.copy()
        ax.normalize()
        if ax.dot(across) < 0: ax = -ax
        kn = pbs[0]
        q = (tip.tail - kn.head).rotation_difference(target - kn.head)
        q = Quaternion(q.axis, min(q.angle, math.radians(14)))
        m = kn.matrix.copy()
        r = (q.to_matrix() @ m.to_3x3()).to_4x4(); r.translation = m.translation; kn.matrix = r
        ax = q @ ax
    for _ in range(iters):
        for pb in reversed(pbs):
            bpy.context.view_layer.update()
            a, b = tip.tail - pb.head, target - pb.head
            if a.length < 1e-5 or b.length < 1e-5: continue
            if ax is None:
                q = a.rotation_difference(b); q = Quaternion(q.axis, q.angle * 0.5)
            else:
                ap, bp = a - ax * a.dot(ax), b - ax * b.dot(ax)
                if ap.length < 1e-5 or bp.length < 1e-5: continue
                q = Quaternion(ax, math.copysign(ap.angle(bp), ax.dot(ap.cross(bp))) * 0.5)
            m = pb.matrix.copy()
            r = (q.to_matrix() @ m.to_3x3()).to_4x4(); r.translation = m.translation; pb.matrix = r
    bpy.context.view_layer.update()
    return (tip.tail - target).length


def pose_hold(arm, sk, P):
    """The holds before the photo: the arm rolled to a palm the skull sits in, and the fingers to tips named in TWEAK."""
    elbow, wrist = P['forearm_L'].head.copy(), P['hand_L'].head.copy()
    kn_i, kn_p = P['index_01_L'].head.copy(), P['pinky_01_L'].head.copy()
    palm = (wrist + (kn_i + kn_p) / 2) / 2
    fd = ((kn_i + kn_p) / 2 - wrist).normalized()
    back = (kn_i - wrist).cross(kn_p - wrist).normalized()
    if back.z < 0: back = -back      # the back of the hand: straight up, at rest
    axis = (wrist - elbow).normalized()

    # The whole arm, as one piece: rolled about the forearm, turned about the elbow, and put where the palm should be.
    about = lambda m: Matrix.Translation(elbow) @ m @ Matrix.Translation(-elbow)
    G = about(Matrix.Rotation(math.radians(TWEAK['yaw']), 4, 'Z') @ Matrix.Rotation(math.radians(TWEAK['pitch']), 4, 'X') @ Matrix.Rotation(math.radians(TWEAK['roll']), 4, axis))
    G = Matrix.Translation(Vector(TWEAK['palm']) - G @ palm) @ G
    R3 = G.to_3x3()
    palm_up = (R3 @ -back).normalized()    # the way the palm faces, in the view
    fd_w = (R3 @ fd).normalized()

    # The skull, in the view: crown between the palm's up and the world's, face as asked.
    s = TWEAK['scale']
    crown = (palm_up * TWEAK['lean'] + Vector((0, 0, 1)) * (1 - TWEAK['lean'])).normalized()
    face = Vector(TWEAK['face']).normalized()
    face = (face - crown * face.dot(crown)).normalized()
    y = -face; x = y.cross(crown)
    Rw = Matrix((x, y, crown)).transposed().to_4x4()
    centre = Vector(TWEAK['palm']) + palm_up * (0.0886 * s + TWEAK['gap']) + fd_w * TWEAK['fwd']
    Sw = Matrix.Translation(centre) @ Rw @ Matrix.Scale(s, 4)
    sk.matrix_world = Sw

    # The fingers are posed in the arm's rest space, so everything's carried back there.
    S = G.inverted() @ Sw
    me0 = sk.data
    verts = [S @ v.co for v in me0.vertices]
    tree = BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in me0.polygons])
    err = {}
    ctr = S @ Vector((0, 0, 0))
    for f, local in TWEAK['tips'].items():
        loc, nrm, _, _ = tree.find_nearest(S @ Vector(local))
        target = loc + (loc - ctr).normalized() * TWEAK['skin']   # out: away from the skull's middle
        err[f] = round(aim_chain(arm, [f'{f}_01_L', f'{f}_02_L', f'{f}_03_L'], f'{f}_end_L', target, free=f == 'thumb'), 3)
    print('tip misses, m', err)
    return G, Sw, s


def photo_pose(arm, sk, P, T):
    """Skull first, then the arm that reaches it: the roll about the forearm that leaves the wrist the least to do, and the wrist joint does the rest."""
    elbow, wrist = P['fore_L'].head.copy(), P['hand_L'].head.copy()
    kn_i, kn_p = P['index1_L'].head.copy(), P['pinky1_L'].head.copy()
    palm0 = (wrist + (kn_i + kn_p) / 2) / 2
    y0 = ((kn_i + kn_p) / 2 - wrist).normalized()
    x0 = ((kn_i - kn_p) - y0 * (kn_i - kn_p).dot(y0)).normalized()   # across the hand, thumbwards
    H0 = Matrix((x0, y0, x0.cross(y0))).transposed()                 # z: out of the back of the hand
    axis = (wrist - elbow).normalized()
    s = T['scale']
    C = Vector(T['centre'])
    face = (-C.normalized() + Vector(T['look'])).normalized()
    crown = Vector(T['crown']).normalized()
    face = (face - crown * face.dot(crown)).normalized()
    y = -face; x = y.cross(crown)
    Sw = Matrix.Translation(C) @ Matrix((x, y, crown)).transposed().to_4x4() @ Matrix.Scale(s, 4)
    sk.matrix_world = Sw
    verts = [Sw @ v.co for v in sk.data.vertices]
    tree = BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in sk.data.polygons])

    fd = Vector(T['fingers']).normalized()
    n = Vector(T['palm']); n = (n - fd * n.dot(fd)).normalized()
    Ht = Matrix((n.cross(fd), fd, -n)).transposed()
    f = Vector(T['forearm']).normalized()
    Rf = axis.rotation_difference(f).to_matrix()
    best = None
    for deg in range(0, 360, 1):
        G3 = Rf @ Matrix.Rotation(math.radians(deg), 3, axis)
        Q = G3.inverted() @ Ht @ H0.inverted()
        a = Q.to_quaternion().angle
        if not best or a < best[0]: best = (a, deg, G3, Q)
    a, deg, G3, Q = best
    # Say what the wrist is asked to do, about the hand's own axes.
    e = (H0.inverted() @ Q @ H0).to_euler('YXZ')
    print('roll', deg, 'wrist turn', round(math.degrees(a), 1), 'flex (x)', round(math.degrees(e.x), 1), 'twist (y)', round(math.degrees(e.y), 1), 'side (z)', round(math.degrees(e.z), 1))
    pb = P['hand_L']; m = pb.matrix.copy()
    r = (Q @ m.to_3x3()).to_4x4(); r.translation = m.translation; pb.matrix = r
    bpy.context.view_layer.update()

    palm_at = Sw @ Vector(T['seat']) - n * T['gap']
    wrist_at = palm_at - Ht @ H0.inverted() @ (palm0 - wrist)
    G = Matrix.Translation(wrist_at - f * (wrist - elbow).length) @ G3.to_4x4() @ Matrix.Translation(-elbow)
    Gi = G.inverted()

    wc = C
    err = {}
    for name in ('index', 'middle', 'ring', 'pinky'):
        kn = G @ P[f'{name}1_L'].head
        aim = kn + fd * T['reach'][name] + n.cross(fd) * T['spread'][name]
        loc, _, _, _ = tree.find_nearest(aim)
        target = loc + (loc - wc).normalized() * T['skin']
        err[name] = round(curl(arm, [f'{name}{i}_L' for i in (1, 2, 3)], Gi @ target, Q @ x0), 3)
    loc, _, _, _ = tree.find_nearest(Sw @ Vector(T['thumb']))
    err['thumb'] = round(curl(arm, [f'thumb{i}_L' for i in (1, 2, 3)], Gi @ (loc + (loc - wc).normalized() * T['skin']), None), 3)
    print('tip misses, m', err)
    return G, Sw, s


def main(root):
    sc = bpy.data.scenes['SkullHold']
    bpy.context.window.scene = sc
    arm, body = (sc.objects['arms'], sc.objects['arms.001']) if HOLD else (sc.objects['hands'], sc.objects['open'])
    sk = sc.objects['HeldSkull']
    sk.hide_set(False); sk.hide_render = False
    if arm.animation_data: arm.animation_data.action = None
    body.hide_set(False); body.hide_render = False
    bpy.context.view_layer.objects.active = arm
    for b in arm.pose.bones:
        b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0); b.scale = (1, 1, 1)
    bpy.context.view_layer.update()
    P = arm.pose.bones
    if HOLD:
        G, Sw, s = pose_hold(arm, sk, P)
    else:
        G, Sw, s = photo_pose(arm, sk, P, PHOTO)
    me0 = sk.data

    # Bake: what the armature made of the skin, left arm only.
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    names = {g.index: g.name for g in body.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(me)
    dl = bm.verts.layers.deform.active
    drop = [v for v in bm.verts if not v[dl] or names[max(v[dl].items(), key=lambda kv: kv[1])[0]][-2:] != '_L']
    bmesh.ops.delete(bm, geom=drop, context='VERTS')
    # How much of the hand has gone into the bone: a vertex nearer the skull's middle than the nearest of its surface.
    inside, depth = 0, 0.0
    M = G @ body.matrix_world
    world_tree = BVHTree.FromPolygons([Sw @ v.co for v in me0.vertices], [tuple(p.vertices) for p in me0.polygons])
    wc = Sw @ Vector((0, 0, 0))
    for v in bm.verts:
        w = M @ v.co
        if (w - wc).length > 0.13: continue
        loc, nrm, _, d = world_tree.find_nearest(w)
        if (w - wc).length < (loc - wc).length - 0.002:
            inside += 1; depth = max(depth, d)
    print('hand verts inside the skull', inside, 'deepest', round(depth, 4))
    bm.to_mesh(me); bm.free()
    old = sc.objects.get('SkullArm')
    if old: bpy.data.objects.remove(old)
    ob = bpy.data.objects.new('SkullArm', me)
    sc.collection.objects.link(ob)
    ob.matrix_world = M
    body.hide_set(True); body.hide_render = True
    for o in sc.objects: o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    # On the screen, in the arm camera: 76 degrees top to bottom, 16 by 9.
    t38 = math.tan(math.radians(38))
    pts = [Sw @ v.co for v in me0.vertices]
    sx = [p.x / p.y / (t38 * 16 / 9) for p in pts]; sz = [p.z / p.y / t38 for p in pts]
    print('skull on screen: x', round(min(sx), 3), round(max(sx), 3), 'y', round(min(sz), 3), round(max(sz), 3), 'tall', round((max(sz) - min(sz)) / 2, 3), 'wide', round((max(sx) - min(sx)) / 2, 3))
    if DRY: return
    bpy.ops.export_scene.gltf(filepath=os.path.join(root, 'assets', 'game', 'items', 'skull_arm.glb'), export_format='GLB', use_selection=True, export_skins=False, export_animations=False, export_morph=False, export_tangents=False, export_apply=True)

    # Into the game.
    seat = Z_UP_TO_GLTF @ Sw @ Z_UP_TO_GLTF.inverted()
    flat = [round(seat[r][c], 5) for c in range(4) for r in range(4)]
    path = os.path.join(root, 'src', 'gfx', 'renderer.js')
    t = open(path, encoding='utf8', newline='').read()
    t = re.sub(r'const SKULL_SCALE = [^;]+;', f'const SKULL_SCALE = {s};', t)
    t = re.sub(r'(export )?const SKULL_SEAT = \[[^\]]+\];', f'export const SKULL_SEAT = {flat};', t)
    open(path, 'w', encoding='utf8', newline='').write(t)
    print('seat written; skull centre in view', [round(v, 3) for v in flat[12:15]])


if __name__ == '__main__':
    main(ROOT)
