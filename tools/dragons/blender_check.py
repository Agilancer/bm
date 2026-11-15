"""Run inside Blender (through the Blender MCP, or blender -b --python): bring the rigged dragons in and bend them hard.

    exec(open(r'.../tools/dragons/blender_check.py').read()); load_all(); stress('black')

Everything lands in its own scene, EDG_Dragons, so whatever file is open is left alone. Blender's glTF importer drops a
bone-display Icosphere into the file's first scene on every rigged import: it's removed again straight after.
Blender's axes: the dragon's left is +X, up is +Z, its snout points -Y.
"""
import math
import os

import bpy
from mathutils import Quaternion, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) if '__file__' in globals() else None
RIGGED = None
COLORS = ('black', 'green', 'red', 'undead')
FWD, UP, LEFT = Vector((0, -1, 0)), Vector((0, 0, 1)), Vector((1, 0, 0))


def scene():
    sc = bpy.data.scenes.get('EDG_Dragons') or bpy.data.scenes.new('EDG_Dragons')
    bpy.context.window.scene = sc
    return sc


def load(color, x=0.0, folder=None):
    folder = folder or RIGGED
    sc = scene()
    first = bpy.data.scenes[0]
    for o in [o for o in sc.objects if o.name.startswith(f'EDG_{color}')]:
        bpy.data.objects.remove(o)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(folder, f'dragon_{color}.glb'))
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if o.name.startswith('Icosphere') and sc not in o.users_scene:
            me = o.data
            bpy.data.objects.remove(o)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)
            new.remove(o)
    arm = next(o for o in new if o.type == 'ARMATURE')
    mesh = next(o for o in new if o.type == 'MESH')
    arm.name, mesh.name = f'EDG_{color}_arm', f'EDG_{color}_mesh'
    arm.location.x = x
    return arm, mesh, len(first.objects)


def load_all(folder=None, gap=1.3):
    out = {}
    for i, c in enumerate(COLORS):
        out[c] = load(c, i * gap, folder)
    return out


def turn(arm, bone, axis, deg):
    """Turn a bone by deg about a world axis (on top of what it already has)."""
    pb = arm.pose.bones[bone]
    R = (arm.matrix_world.to_3x3() @ pb.bone.matrix_local.to_3x3()).normalized()
    ax = (R.inverted() @ axis).normalized()
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = Quaternion(ax, math.radians(deg)) @ pb.rotation_quaternion


def chain(arm, prefix, n, axis, deg_total, start=1, suffix=''):
    for i in range(start, start + n):
        nm = f'{prefix}{i}{suffix}'
        if nm in arm.pose.bones:
            turn(arm, nm, axis, deg_total / n)


def rest(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)


def stress(color):
    """Every part pushed well past what a clip will ask, to find what tears."""
    arm = bpy.data.objects[f'EDG_{color}_arm']
    rest(arm)
    B = arm.pose.bones
    turn(arm, 'jaw', LEFT, 32)                      # mouth wide open
    chain(arm, 'neck', 6, LEFT, -35)                # neck reared back and up
    turn(arm, 'head', LEFT, 20)
    chain(arm, 'neck', 6, UP, 40)                   # and turned to its left
    chain(arm, 'tail', 14, UP, -150, suffix='')      # tail swept round to its right
    # left wing: up and spread wide; right wing folded tight
    turn(arm, 'whum_L', FWD, -30)
    for k in range(1, 6):
        for s in 'abc':
            nm = f'wf{k}{s}_L'
            if nm in B:
                turn(arm, nm, FWD, -6 * (k - 2))
    turn(arm, 'whum_R', FWD, 25)
    turn(arm, 'wfore_R', UP, -40)
    for k in range(1, 6):
        for s in 'abc':
            nm = f'wf{k}{s}_R'
            if nm in B:
                turn(arm, nm, UP, -25 if s == 'a' else -15)
    # right foreleg up off the ground, claws curled; left hind leg stepping back
    turn(arm, 'upperarm_R', LEFT, -45)
    turn(arm, 'forearm_R', LEFT, 70)
    for k in range(1, 6):
        for s, d in (('a', 45), ('b', 50)):
            nm = f'ftoe{k}{s}_R'
            if nm in B:
                turn(arm, nm, LEFT, d)
    turn(arm, 'thigh_L', LEFT, 35)
    turn(arm, 'shin_L', LEFT, -30)
    bpy.context.view_layer.update()
    return arm
