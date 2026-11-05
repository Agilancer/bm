"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Separates art/staffs/staffs_3_common.glb, four staffs side by side on one mesh, into one object each, in a scene of its own. Each
is put in the frame the game holds a weapon in: the fist at the origin, a third of the way down from the head, the head up, the
sheet's width across. That one model is what the player holds and what lies on the ground. Exports tools/build/swords/<id>.glb,
for tools/staffs/atlas.py to give each its own atlas.
"""
import os
import runpy

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCENE = "Staffs"
SOURCE = os.path.join(ROOT, "art", "staffs", "staffs_3_common.glb")
export = runpy.run_path(os.path.join(ROOT, "tools", "swords", "separate.py"))["export"]

LENGTH = 1.50                               # metres, foot to head
GAPS = (-0.31, -0.04, 0.28)                 # along the sheet's X
# grip: where the fist goes, as a height on the sheet. sockets: slot, how far up the staff, radius, in the order they fill.
FILL = [("guard", 0.76, 0.016), ("blade", 0.56, 0.012), ("blade", 0.24, 0.012), ("pommel", 0.06, 0.014)]
STAFFS = [dict(id="greenwood_staff", grip=0.49), dict(id="crystal_staff", grip=0.49), dict(id="skullhorn_staff", grip=0.49), dict(id="gnarled_crook", grip=0.45)]
# The sheet's X to across (-Y), its Y to +X, up stays up: nothing flips inside out.
TURN = Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1)))


def separate_one(scene, source, k, spec):
    me = source.data.copy()
    me.name = spec["id"]
    bm = bmesh.new()
    bm.from_mesh(me)
    gone = [f for f in bm.faces if sum(f.calc_center_median().x > g for g in GAPS) != k]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.to_mesh(me)
    bm.free()

    pts = [v.co.copy() for v in me.vertices]
    foot, head = min(p.z for p in pts), max(p.z for p in pts)
    tall = head - foot
    scale = LENGTH / tall

    def middle(z, reach=0.012):
        # (The shaft's, not what hangs off it: a ribbon or a vine would pull the plain middle of the slice off the wood.)
        near = [p for p in pts if abs(p.z - z) < reach]

        def of(values):
            m = sorted(values)[len(values) // 2]
            kept = [v for v in values if abs(v - m) < 0.022]
            return (min(kept) + max(kept)) / 2

        return of([p.x for p in near]), of([p.y for p in near])

    ax, ay = middle(spec["grip"], 0.03)
    fist = Vector((ax, ay, spec["grip"]))
    me.transform((TURN * scale).to_4x4() @ Matrix.Translation(-fist))
    me.update()
    mat = me.materials[0].copy()
    mat.name = spec["id"]
    me.materials[0] = mat
    ob = bpy.data.objects.new(spec["id"], me)
    scene.collection.objects.link(ob)
    ob["hands"] = 3
    ob["scale_from_source"] = scale
    for i, (slot, up, r) in enumerate(FILL):
        z = foot + up * tall
        cx, _ = middle(z)
        s = bpy.data.objects.new(f"socket_{i + 1}", None)
        scene.collection.objects.link(s)
        s.parent = ob
        s.location = (0, -(cx - ax) * scale, (z - spec["grip"]) * scale)
        s.empty_display_type = "SPHERE"
        s.empty_display_size = r * scale
        s["slot"] = slot
        s["radius"] = r * scale
    export(ob)
    print(f"{spec['id']}: {len(me.vertices)} verts, {len(me.polygons)} faces, scale {scale:.3f}, head {(head - spec['grip']) * scale:.3f} above the fist, foot {(spec['grip'] - foot) * scale:.3f} below, "
          f"size {ob.dimensions.x:.3f} x {ob.dimensions.y:.3f} x {ob.dimensions.z:.3f}")
    return ob


def separate():
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    made = [o for o in bpy.data.objects if o not in before]
    source = next(o for o in made if o.type == "MESH")
    total = len(source.data.polygons)
    mine = [separate_one(scene, source, k, spec) for k, spec in enumerate(STAFFS)]
    assert sum(len(o.data.polygons) for o in mine) == total, "faces lost or doubled"
    print(f"all {total} faces accounted for, across {len(mine)} staffs")
    for o in made:
        bpy.data.objects.remove(o)
    for i, o in enumerate(mine):
        o.location.y = i * 0.5


if __name__ == "__main__":
    separate()
