"""Run inside Blender, through Blender MCP, with arms_1h.glb and skull_01.glb imported into the scene SkullHold (armature `arms`, mesh `arms.001`, mesh `HeldSkull`):
exec(compile(open(path).read(), path, 'exec'), dict(__name__='__main__', W=<repo root>))

The skull in the left hand, in a claw: the hand comes down over the crown and the skull hangs under it looking back at you.
HOLDS also keeps the two holds the owner passed over (pass HOLD='yorick' or 'lantern' beside W). TWEAK is the palm-up pose they replaced, and only the base each hold's values go over.
Joints only, and the fingers only: nothing is bent mid bone, the mesh isn't edited, and the wrist stays as it was. The hand is placed by moving the whole arm.
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
TWEAK.update(HOLDS[globals().get('HOLD', 'claw')]); TWEAK.update(globals().get('OVER', {}))
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


def main(root):
    sc = bpy.data.scenes['SkullHold']
    bpy.context.window.scene = sc
    arm, body, sk = sc.objects['arms'], sc.objects['arms.001'], sc.objects['HeldSkull']
    body.hide_set(False); body.hide_render = False
    bpy.context.view_layer.objects.active = arm
    for b in arm.pose.bones:
        b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    P = arm.pose.bones
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
