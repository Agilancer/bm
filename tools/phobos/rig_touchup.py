"""Rig fixes for a fitted Phobos body.  Background Blender:

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/rig_touchup.py -- <in.glb> <out.glb> [tpose] [pauldrons] [props]

tpose      The game's retargeting (src/folk/rig.js) hands Lisandra's joint turns to a body as turns from its rest
           pose, and her rest is a T. Martleboro came out of Meshy with his arms 45 degrees down, so every clip put
           them that much too far: folded behind his back in the idle. Each arm is raised to level (shoulder joint
           to wrist along x), the mesh carried with it, and that made the new rest pose.
pauldrons  A shoulder plate weighted to the upper arm swings down with it and balloons. Within 12 cm of the shoulder
           joint along the arm, the arm's weight is handed to the clavicle: all of it on what stands clear of the
           arm (the plate), part of it on the sleeve under it, fading to none at 12 cm.
props      Small separate pieces hung at the hips (keys, wrench, rope, lantern, pouch) were weighted across hip and
           thigh and bent with the leg. Each such piece is made rigid on the hips.
"""
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[:2]
DO = set(argv[2:])

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and not o.find_armature():
        bpy.data.objects.remove(o)
mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = mesh.find_armature()
B = lambda n: arm.data.bones["mixamorig:" + n]


def active(o, mode="OBJECT"):
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    for x in sc.objects:
        x.select_set(x is o)
    bpy.context.view_layer.objects.active = o
    if mode != "OBJECT":
        bpy.ops.object.mode_set(mode=mode)


if "tpose" in DO:
    active(arm, "POSE")
    turned = []
    for side, sx in (("Left", 1), ("Right", -1)):
        a, h = B(side + "Arm"), B(side + "Hand")
        d = (h.head_local - a.head_local).normalized()
        # (Which way is this side's x: wherever the shoulder joint sits from the middle.)
        want = Vector((1 if a.head_local.x > 0 else -1, 0, 0))
        q = d.rotation_difference(want)
        turned.append(round(q.angle * 57.3, 1))
        pb = arm.pose.bones[a.name]
        T = Matrix.Translation(a.head_local)
        pb.matrix = T @ q.to_matrix().to_4x4() @ T.inverted() @ a.matrix_local
        bpy.context.view_layer.update()
    active(mesh)
    mod = next(m for m in mesh.modifiers if m.type == "ARMATURE")
    name = mod.name
    bpy.ops.object.modifier_apply(modifier=name)
    active(arm, "POSE")
    bpy.ops.pose.armature_apply()
    bpy.ops.object.mode_set(mode="OBJECT")
    m = mesh.modifiers.new(name, "ARMATURE"); m.object = arm
    print("RIG arms raised to level by", turned, "degrees")

mw = mesh.matrix_world; aw = arm.matrix_world
vg = mesh.vertex_groups

if "pauldrons" in DO:
    moved = 0
    for side in ("Left", "Right"):
        a = aw @ B(side + "Arm").head_local; h = aw @ B(side + "ForeArm").head_local
        ax = (h - a).normalized()
        ga, gs = vg["mixamorig:" + side + "Arm"], vg["mixamorig:" + side + "Shoulder"]
        # The bare arm's radius: the median distance from the axis of what the arm carries between 14 and 20 cm out.
        rs = sorted(((mw @ v.co - a) - ax * (mw @ v.co - a).dot(ax)).length for v in mesh.data.vertices
                    if 0.14 < (mw @ v.co - a).dot(ax) < 0.20 and any(e.group == ga.index and e.weight > 0.5 for e in v.groups))
        rad = rs[len(rs) // 2] if rs else 0.05
        for v in mesh.data.vertices:
            w = next((e.weight for e in v.groups if e.group == ga.index), 0)
            if w <= 0:
                continue
            p = mw @ v.co - a
            t = p.dot(ax); r = (p - ax * t).length
            if t > 0.12:
                continue
            clear = min(1.0, max(0.0, (r - rad * 1.15) / (rad * 0.35)))  # 0 on the sleeve, 1 on what stands off it
            f = min(1.0, max(0.0, 1 - t / 0.12)) * (0.35 + 0.65 * clear) if t > 0 else 0.35 + 0.65 * clear
            ga.add([v.index], w * (1 - f), "REPLACE"); gs.add([v.index], w * f, "ADD")
            moved += 1
    print("RIG shoulder vertices handed toward the clavicle:", moved)

if "props" in DO:
    # Pieces: joined by edges, and across the UV seams the exporter cuts open (vertices at the same spot).
    n = len(mesh.data.vertices)
    par = list(range(n))

    def find(i):
        while par[i] != i:
            par[i] = par[par[i]]; i = par[i]
        return i

    spot = {}
    for v in mesh.data.vertices:
        k = tuple(round(c * 2e4) for c in v.co)
        if k in spot:
            par[find(v.index)] = find(spot[k])
        else:
            spot[k] = v.index
    for e in mesh.data.edges:
        par[find(e.vertices[0])] = find(e.vertices[1])
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    comps = list(groups.values())
    low = {vg[n].index for n in ("mixamorig:Hips", "mixamorig:LeftUpLeg", "mixamorig:RightUpLeg") if n in vg}
    hips = vg["mixamorig:Hips"]
    hz = (aw @ B("Hips").head_local).z
    rigid = 0
    for comp in comps:
        if len(comp) > 900:
            continue
        ws = [sum(e.weight for e in mesh.data.vertices[i].groups if e.group in low) for i in comp]
        zs = [(mw @ mesh.data.vertices[i].co).z for i in comp]
        if sum(ws) / len(ws) > 0.85 and hz - 0.45 < sum(zs) / len(zs) < hz + 0.12:
            for g in vg:
                g.remove(comp)
            hips.add(comp, 1.0, "REPLACE")
            rigid += 1
    print("RIG hip props made rigid:", rigid, "of", len(comps), "pieces")

for o in sc.objects:
    o.select_set(o in (mesh, arm))
active(arm)
for o in sc.objects:
    o.select_set(o in (mesh, arm))
kw = dict(filepath=OUT, export_format="GLB", use_selection=True, export_skins=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animations=False)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("RIG wrote", OUT)
