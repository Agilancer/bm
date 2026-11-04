"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Separates the sheets in art/swords (sheets.py), four swords side by side on each, into one object each, in a scene of their
own so the open scene is left alone. Each is put in the frame the game holds a sword in: the fist at the origin, the tip up the
blade at the distance that hand's swings are solved on, the guard across the swing. That one model is what the player swings
and what lies on the ground. A two-hander's handle is also drawn out to take both fists. Sockets are empties under each sword,
in the order they fill. Exports tools/build/swords/<id>.glb, for tools/swords/atlas.py to give each its own atlas.
"""
import os
import runpy

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ART = os.path.join(ROOT, "art", "swords")
BUILD = os.path.join(ROOT, "tools", "build", "swords")
SCENE = "Swords"
TABLE = runpy.run_path(os.path.join(HERE, "sheets.py"))
SHEETS, FIST_TO_GUARD, TWO_HAND_GRIP = TABLE["SHEETS"], TABLE["FIST_TO_GUARD"], TABLE["TWO_HAND_GRIP"]
# Pommel up with the guard along X, to tip up with the guard along Y: a half turn, so nothing flips inside out.
TURN = Matrix(((0, -1, 0), (-1, 0, 0), (0, 0, -1)))


def export(ob):
    # (use_active_scene: left to itself the exporter also walks every other scene, and takes whatever is selected there.)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    for c in ob.children:
        c.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(BUILD, f"{ob.name}.glb"), export_format="GLB", use_selection=True, use_active_scene=True, export_yup=True, export_apply=False,
                              export_extras=True, export_animations=False, export_skins=False, export_morph=False, export_lights=False, export_cameras=False,
                              export_tangents=False, export_normals=True, export_texcoords=True, export_materials="EXPORT", export_image_format="AUTO")


def separate_one(scene, source, sheet, k, spec):
    # Its faces and nothing else.
    me = source.data.copy()
    me.name = spec["id"]
    gaps = sheet["gaps"]
    bm = bmesh.new()
    bm.from_mesh(me)
    gone = [f for f in bm.faces if sum(f.calc_center_median().x > g for g in gaps) != k]
    bmesh.ops.delete(bm, geom=gone, context="FACES")
    bm.to_mesh(me)
    bm.free()

    # The frame: the fist on the handle's axis, the tip at the rig's distance.
    pts = [v.co.copy() for v in me.vertices]
    bottom, top = spec["grip"]
    x0, x1 = spec.get("grip_x", (-9, 9))
    grip = [p for p in pts if bottom < p.z < top and x0 < p.x < x1]
    ax, ay = (min(p.x for p in grip) + max(p.x for p in grip)) / 2, (min(p.y for p in grip) + max(p.y for p in grip)) / 2
    tip = min(p.z for p in pts)
    if sheet["hands"] == 2:
        scale = (sheet["tip"] - FIST_TO_GUARD) / (bottom - tip)
        fist_z = bottom + FIST_TO_GUARD / scale
        handle = (top - bottom) * scale
        stretch = TWO_HAND_GRIP / handle
    else:
        fist_z = (bottom + top) / 2
        scale = sheet["tip"] / (fist_z - tip)
        handle, stretch = 0.0, 1.0

    def drawn_out(z):
        return z - min(max(FIST_TO_GUARD - z, 0.0), handle) * (stretch - 1)

    fist = Vector((ax, ay, fist_z))
    me.transform((TURN * scale).to_4x4() @ Matrix.Translation(-fist))
    for v in me.vertices:
        v.co.z = drawn_out(v.co.z)
    me.update()

    mat = me.materials[0].copy()
    mat.name = spec["id"]
    me.materials[0] = mat
    ob = bpy.data.objects.new(spec["id"], me)
    scene.collection.objects.link(ob)
    ob["scale_from_source"] = scale
    ob["hands"] = sheet["hands"]
    ob["fist_x"], ob["fist_y"], ob["fist_z"] = ax, ay, fist_z
    ob["stretch_a"], ob["stretch_g"], ob["stretch_k"] = FIST_TO_GUARD, handle, stretch
    for i, (slot, y, r) in enumerate(spec["sockets"]):
        cx = ax
        if slot == "blade":
            near = [p.x for p in pts if abs(p.z - y) < 0.012]
            cx = (min(near) + max(near)) / 2
        s = bpy.data.objects.new(f"socket_{i + 1}", None)
        scene.collection.objects.link(s)
        s.parent = ob
        s.location = (0, -(cx - ax) * scale, drawn_out((fist_z - y) * scale))
        s.empty_display_type = "SPHERE"
        s.empty_display_size = r * scale
        s["slot"] = slot
        s["radius"] = r * scale

    export(ob)
    print(f"{spec['id']}: {len(me.vertices)} verts, {len(me.polygons)} faces, scale {scale:.4f}, handle x{stretch:.2f}, custom normals {me.has_custom_normals}, "
          f"size {ob.dimensions.x:.3f} x {ob.dimensions.y:.3f} x {ob.dimensions.z:.3f}")
    return ob


def separate():
    # From nothing each run: the scene is this script's own, and the sheets in it were only ever places to copy from.
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    others = {s.name: len(s.objects) for s in bpy.data.scenes if s is not scene}
    os.makedirs(BUILD, exist_ok=True)
    swords = []
    for sheet in SHEETS:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(ART, sheet["source"]))
        made = [o for o in bpy.data.objects if o not in before]
        source = next(o for o in made if o.type == "MESH")
        total = len(source.data.polygons)
        mine = [separate_one(scene, source, sheet, k, spec) for k, spec in enumerate(sheet["swords"])]
        assert sum(len(o.data.polygons) for o in mine) == total, "faces lost or doubled"
        print(f"{sheet['source']}: all {total} faces accounted for, across {len(mine)} swords")
        swords += mine
        for o in made:
            bpy.data.objects.remove(o)
    # Side by side, for looking at: the exports above were each at the origin.
    for i, o in enumerate(swords):
        o.location.y = i * 0.3
    assert others == {s.name: len(s.objects) for s in bpy.data.scenes if s is not scene}, "touched another scene"
    print(f"other scenes untouched: {others}")


if __name__ == "__main__":
    separate()
