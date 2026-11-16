"""Close-ups of both hands of a folk-rigged body, open and curled to a fist, to check the fingers' bones and weights.
Background Blender:  blender -b --factory-startup -P tools/phobos/hand_check.py -- <body.glb> <out_prefix> [curl]

curl (default 1): the fist's strength, src/folk/rig.js FIST's angles, each joint turned about the line across the palm
(found from the mesh), so this checks where the bones and weights lie, whatever the bones' roll.
Writes <out_prefix>_hands.png: a row per hand, open from above, open from the front, fist from above, fist from the front.
"""
import math
import sys

import bpy
from mathutils import Quaternion, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[:2]
CURL = float(argv[2]) if len(argv) > 2 else 1.0
FIST = {"Thumb": (0.5, 0.35, 0.2), "Index": (1.2, 1.3, 0.9), "Middle": (1.2, 1.3, 0.9), "Ring": (1.2, 1.3, 0.9), "Pinky": (1.2, 1.3, 0.9)}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and o.name.lower().startswith("icosphere") and not o.find_armature():
        bpy.data.objects.remove(o)
arm = next(o for o in sc.objects if o.type == "ARMATURE")
for e in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
    try:
        sc.render.engine = e
        break
    except TypeError:
        pass
sc.render.resolution_x = sc.render.resolution_y = 512
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND"); bg.inputs[0].default_value = (0.75, 0.75, 0.75, 1)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); sun.data.energy = 3
sun.rotation_euler = (math.radians(30), 0, math.radians(20)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"

mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))


def palm_normal(side):
    """The palm's normal from its rest vertices (their thinnest direction), toward the palm side (downward)."""
    import numpy as np
    g = mesh.vertex_groups[f"mixamorig:{side}Hand"]
    for cut in (0.6, 0.3, 0.1):
        ps = np.array([tuple(mesh.matrix_world @ v.co) for v in mesh.data.vertices
                       if any(e.group == g.index and e.weight > cut for e in v.groups)])
        if len(ps) > 30:
            break
    w, v = np.linalg.eigh(np.cov((ps - ps.mean(0)).T))
    hb = arm.data.bones[f"mixamorig:{side}Hand"]
    d = (arm.matrix_world.to_3x3() @ (hb.head_local - arm.data.bones[f"mixamorig:{side}ForeArm"].head_local)).normalized()
    axes = sorted((Vector(v[:, k]) for k in range(3)), key=lambda a: abs(a.dot(d)))[:2]
    n = max(axes, key=lambda a: abs(a.z))
    return -n if n.z > 0 else n


NORMALS = {s: palm_normal(s) for s in ("Left", "Right")}


def pose(curl):
    """Each finger's joints turned about the line across the palm, toward the palm (the thumb a little, across it)."""
    aw = arm.matrix_world.to_quaternion()
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        for side in ("Left", "Right"):
            for f, turns in FIST.items():
                for k in (1, 2, 3):
                    if pb.name == f"mixamorig:{side}Hand{f}{k}":
                        rest = aw @ pb.bone.matrix_local.to_quaternion()
                        dirw = (aw @ (pb.bone.tail_local - pb.bone.head_local)).normalized()
                        axis = dirw.cross(NORMALS[side]).normalized()
                        qw = Quaternion(axis, turns[k - 1] * curl)
                        pb.rotation_quaternion = rest.inverted() @ qw @ rest
    bpy.context.view_layer.update()




def hand_centre(side):
    """The middle of the posed hand: its vertices (the hand's and fingers' weights over a half), as deformed."""
    ids = {g.index for g in mesh.vertex_groups if g.name.startswith(f"mixamorig:{side}Hand")}
    keep = [v.index for v in mesh.data.vertices if sum(e.weight for e in v.groups if e.group in ids) > 0.5]
    ev = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
    ps = [ev.matrix_world @ ev.data.vertices[i].co for i in keep]
    lo = Vector([min(p[k] for p in ps) for k in range(3)]); hi = Vector([max(p[k] for p in ps) for k in range(3)])
    return (lo + hi) / 2


shots = []
for side in ("Left", "Right"):
    for curl in (0, CURL):
        pose(curl)
        c = hand_centre(side)
        for view, loc, rot in (("top", Vector((0, 0, 1)), (0, 0, 0)), ("front", Vector((0, -1, 0)), (math.radians(90), 0, 0))):
            cam.location = c + loc
            cam.rotation_euler = rot
            cam.data.ortho_scale = 0.32
            path = f"{OUT}_{side}_{curl}_{view}.png"
            sc.render.filepath = path
            bpy.ops.render.render(write_still=True)
            shots.append(path)
print("HANDS", " ".join(shots))
