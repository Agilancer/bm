"""Frames of the dragons' clips, rendered in a background Blender (never the one that's open):

    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup --python tools/dragons/render_clips.py -- \
        <glb> <out_dir> <clip>[,<clip>...] [frames=8] [views=side,front] [size=480x360]

Each clip gives <out_dir>/<clip>_<view>_<i>.png at evenly spaced times (first to last), the camera keeping the hips in the
middle of the shot so a walk stays in frame, over a gridded floor (feet that slide show against it). A clip named with
@times (bite@0.9,1.08,1.3) is shot at those seconds instead.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
GLB, OUT, CLIPS = argv[0], argv[1], argv[2].split(';')
opts = dict(a.split('=') for a in argv[3:])
N = int(opts.get('frames', 8))
VIEWS = opts.get('views', 'side,front').split(',')
W, H = (int(v) for v in opts.get('size', '480x360').split('x'))
os.makedirs(OUT, exist_ok=True)

sc = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
sc.render.fps = 30
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in sc.objects if o.type == 'ARMATURE')
for o in list(sc.objects):
    if o.type == 'MESH' and o.name.startswith('Icosphere'):
        bpy.data.objects.remove(o)

# a floor with a grid on it
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
floor = sc.objects[-1] if sc.objects[-1].type == 'MESH' else bpy.context.object
mat = bpy.data.materials.new('floor')
mat.use_nodes = True
nt = mat.node_tree
bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
chk = nt.nodes.new('ShaderNodeTexChecker')
chk.inputs['Scale'].default_value = 80
chk.inputs['Color1'].default_value = (0.32, 0.30, 0.28, 1)
chk.inputs['Color2'].default_value = (0.22, 0.21, 0.20, 1)
nt.links.new(chk.outputs['Color'], bsdf.inputs['Base Color'])
floor.data.materials.append(mat)

cam_data = bpy.data.cameras.new('cam')
cam_data.lens = 40
cam = bpy.data.objects.new('cam', cam_data)
sc.collection.objects.link(cam)
sc.camera = cam
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.0
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(-35))
sc.collection.objects.link(sun)
if sc.world is None:
    sc.world = bpy.data.worlds.new('w')
sc.world.use_nodes = True
bg = next(n for n in sc.world.node_tree.nodes if n.type == 'BACKGROUND')
bg.inputs['Color'].default_value = (0.42, 0.45, 0.5, 1)
bg.inputs['Strength'].default_value = 0.6

try:
    sc.render.engine = 'BLENDER_EEVEE_NEXT'
except TypeError:
    try:
        sc.render.engine = 'BLENDER_EEVEE'
    except TypeError:
        pass
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'

# how big it is, from the mesh at rest
mesh = next(o for o in sc.objects if o.type == 'MESH' and o is not floor)
bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
size = max((max(v[i] for v in bb) - min(v[i] for v in bb)) for i in range(3))


def set_clip(name):
    act = bpy.data.actions.get(name) or next((a for a in bpy.data.actions if a.name.startswith(name + '_') or a.name.split('_Armature')[0] == name), None)
    if act is None:
        raise SystemExit(f'no clip {name}: {[a.name for a in bpy.data.actions]}')
    ad = arm.animation_data or arm.animation_data_create()
    for tr in list(ad.nla_tracks):
        tr.mute = True
    ad.action = act
    if hasattr(ad, 'action_slot') and getattr(act, 'slots', None):
        ad.action_slot = act.slots[0]
    lo, hi = act.frame_range
    return lo, hi


def hips():
    pb = arm.pose.bones.get('hips') or arm.pose.bones[0]
    return arm.matrix_world @ pb.head


VIEW = {'side': Vector((1.0, 0.0, 0.18)), 'front': Vector((0.55, -0.9, 0.22)), 'back': Vector((-0.5, 0.95, 0.3)),
        'top': Vector((0.3, 0.2, 1.0)), 'player': Vector((0.25, -1.0, 0.02))}   # player: a man's eye height, in front

for spec in CLIPS:
    name, _, at = spec.partition('@')
    lo, hi = set_clip(name)
    if at:
        frames = [lo + float(x) * 30 for x in at.split(',')]
    else:
        frames = [lo + (hi - lo) * i / max(N - 1, 1) for i in range(N)]
    for view in VIEWS:
        for i, f in enumerate(frames):
            sc.frame_set(int(f), subframe=f - int(f))
            # the whole posed body in the shot (head, wing tips and tail too, not just round the hips): its bones' ends,
            # their middle, and far enough back that a ball round them all fits the frame's height
            pts = [arm.matrix_world @ v for pb in arm.pose.bones for v in (pb.head, pb.tail)]
            lo_ = Vector((min(v.x for v in pts), min(v.y for v in pts), min(v.z for v in pts)))
            hi_ = Vector((max(v.x for v in pts), max(v.y for v in pts), max(v.z for v in pts)))
            aim = (lo_ + hi_) / 2
            aim.z = max(aim.z, size * 0.12)
            rad = max((v - aim).length for v in pts)
            fov = 2 * math.atan(18 * sc.render.resolution_y / sc.render.resolution_x / cam_data.lens)
            dist = max(rad / math.sin(fov / 2) * 1.04, size * 0.6)
            cam.location = aim + VIEW[view].normalized() * dist
            if view == 'player':
                cam.location.z = size * 0.045           # about 1.8 m up, on a dragon some 40 m across the wings
            d = aim - cam.location
            cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
            sc.render.filepath = os.path.join(OUT, f'{name}_{view}_{i}.png')
            bpy.ops.render.render(write_still=True)
print('rendered', CLIPS)
