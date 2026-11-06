"""Run inside Blender, through Blender MCP, with arms_1h.glb and skull_01.glb imported into the scene SkullHold (armature `arms`, mesh `arms.001`, mesh `HeldSkull`).

The skull in the left hand: palm on the crown, index and middle fingers hooked down into the eye sockets, thumb and the last two fingers round the sides.
Joints only: nothing is bent mid bone and the arm's mesh is not edited. The arm's left side is baked to assets/game/items/skull_arm.glb in the view's own space,
and it prints the matrix for SKULL_SEAT in src/gfx/renderer.js, which seats whichever skull is held. TWEAK holds the pose's numbers.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

TWEAK = {
    'scale': 0.74,            # the skull, of life size
    'tilt': 30,              # degrees its face turns up, bringing the sockets nearer the fingers
    'fwd': -0.012, 'gap': 0.032,   # how far along the fingers and how far under the palm its centre sits
    'yaw': -58, 'move': (-0.107, 0.186, 0.09),   # the whole arm, skull and all: the arm moves, the wrist stays straight
}
ROOT = os.environ.get('BM_ROOT') or globals().get('W')
Z_UP_TO_GLTF = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))


def aim_chain(arm, names, target, iters=14):
    """CCD on a finger's joints, tip to knuckle, in armature space."""
    pbs = [arm.pose.bones[n] for n in names]
    tip = arm.pose.bones[names[-1].rsplit('_', 1)[0].rsplit('_', 1)[0] + '_end_L']
    for _ in range(iters):
        for pb in reversed(pbs):
            bpy.context.view_layer.update()
            a = tip.head - pb.head
            b = target - pb.head
            if a.length < 1e-5 or b.length < 1e-5: continue
            q = a.rotation_difference(b)
            # Half a step at a time, so the curl shares itself along the finger.
            q = Quaternion(q.axis, q.angle * 0.55)
            mat = pb.matrix.copy()
            r = (q.to_matrix() @ mat.to_3x3()).to_4x4()
            r.translation = mat.translation
            pb.matrix = r
    bpy.context.view_layer.update()
    return (tip.head - target).length


def main(root):
    sc = bpy.data.scenes['SkullHold']
    bpy.context.window.scene = sc
    arm = sc.objects['arms']
    body = sc.objects['arms.001']
    sk = sc.objects['HeldSkull']
    bpy.context.view_layer.objects.active = arm
    for b in arm.pose.bones:
        b.rotation_mode = 'QUATERNION'; b.rotation_quaternion = (1, 0, 0, 0); b.location = (0, 0, 0)
    bpy.context.view_layer.update()
    P = arm.pose.bones
    wrist, kn_i, kn_p = P['hand_L'].head.copy(), P['index_01_L'].head.copy(), P['pinky_01_L'].head.copy()
    palm = (wrist + (kn_i + kn_p) / 2) / 2
    fd = ((kn_i + kn_p) / 2 - wrist).normalized()
    n = (kn_i - wrist).cross(kn_p - wrist).normalized()
    if n.z < 0: n = -n
    # The skull's frame: its front (-y) along the fingers, tilted up; its top (+z) to the palm.
    t = math.radians(TWEAK['tilt'])
    s = TWEAK['scale']
    fr = (fd * math.cos(t) + n * math.sin(t)).normalized()
    up = (n - fr * n.dot(fr)).normalized()
    y = -fr; x = y.cross(up)
    R = Matrix((x, y, up)).transposed().to_4x4()
    centre = palm - n * (0.0886 * s + TWEAK['gap']) + fd * TWEAK['fwd']
    S = Matrix.Translation(centre) @ R @ Matrix.Scale(s, 4)
    at = lambda lx, ly, lz: S @ Vector((lx, ly, lz))
    # In the skull's own frame. The index is on the side of the world's right, which is the skull's -x.
    err = {}
    err['index'] = aim_chain(arm, ['index_01_L', 'index_02_L', 'index_03_L'], at(-0.034, -0.058, -0.03))
    err['middle'] = aim_chain(arm, ['middle_01_L', 'middle_02_L', 'middle_03_L'], at(0.05, -0.058, -0.03))
    err['ring'] = aim_chain(arm, ['ring_01_L', 'ring_02_L', 'ring_03_L'], at(0.092, -0.015, 0.012))
    err['pinky'] = aim_chain(arm, ['pinky_01_L', 'pinky_02_L', 'pinky_03_L'], at(0.09, 0.04, 0.012))
    err['thumb'] = aim_chain(arm, ['thumb_01_L', 'thumb_02_L', 'thumb_03_L'], at(-0.095, 0.012, 0.0))
    print('tip misses, m', {k: round(v, 3) for k, v in err.items()})
    # All of it moved together.
    G = Matrix.Translation(TWEAK['move']) @ Matrix.Translation(P['forearm_L'].head) @ Matrix.Rotation(math.radians(TWEAK['yaw']), 4, 'Z') @ Matrix.Translation(-P['forearm_L'].head)
    sk.matrix_world = G @ S
    # Bake: what the armature made of the skin, left arm only.
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(body.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    names = {g.index: g.name for g in body.vertex_groups}
    bm = bmesh.new(); bm.from_mesh(me)
    dl = bm.verts.layers.deform.active
    # (Whose vertex it is goes by the rest mesh's weights.)
    drop = []
    for v in bm.verts:
        w = v[dl]
        if not w or names[max(w.items(), key=lambda kv: kv[1])[0]][-2:] != '_L': drop.append(v)
    bmesh.ops.delete(bm, geom=drop, context='VERTS')
    bm.to_mesh(me); bm.free()
    for g in list(me.attributes):
        pass
    old = sc.objects.get('SkullArm')
    if old: bpy.data.objects.remove(old)
    ob = bpy.data.objects.new('SkullArm', me)
    sc.collection.objects.link(ob)
    ob.matrix_world = G @ body.matrix_world
    print('arm verts', len(me.vertices), 'materials', [m.name for m in me.materials])
    body.hide_set(True); body.hide_render = True
    for o in sc.objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.export_scene.gltf(filepath=os.path.join(root, 'assets', 'game', 'items', 'skull_arm.glb'), export_format='GLB', use_selection=True, export_skins=False, export_animations=False, export_morph=False, export_tangents=False, export_apply=True)
    seat = Z_UP_TO_GLTF @ G @ S @ Z_UP_TO_GLTF.inverted()
    print('SKULL_SCALE', s)
    print('SKULL_SEAT', [round(seat[r][c], 5) for c in range(4) for r in range(4)])


if __name__ == '__main__':
    main(ROOT)
