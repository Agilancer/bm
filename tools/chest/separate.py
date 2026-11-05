"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Takes the open treasure chest in F:/!    BM V2/! TRIPO MODELS/Objects for Scenes apart at the rim and closes it. The source lid stands open about
its back edge, a little shorter along its flat edge than the box is deep, so it's turned down onto the rim and stretched along that edge to meet the front.
Leaves chest_body and chest_lid in the scene Chest, the lid's origin on the hinge with an opening keyed on it, and writes assets/game/items/chest.glb
(two meshes, one set of maps; the game plays the opening itself, at OPEN_DEG, off the same hinge: see src/gfx/things.js).
"""
import math
import os

import bmesh
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = r"F:\!    BM V2\! TRIPO MODELS\Objects for Scenes\OPEN TREASURE CHEST.glb"
SCENE = "Chest"
TRIS = 1500       # each of the two parts, against about 3700 in the source: the relief is in its normal map
OPEN_DEG = 72.0
SCALE = 0.92      # a chest a man can get his arms round, and no more
# The flat edge of the open lid (y, z), as measured: its hull's longest side.
HINGE, TOP = Vector((0.1637, 0.4259)), Vector((-0.1004, 0.7993))
# That side isn't quite the rim's line: the lower edge of the lid, once down, still rises this far to the front.
SETTLE = math.radians(8.617)
# The box's rim.
BACK, FRONT, RIM = 0.182, -0.418, 0.434


def is_lid(c):
    return c.z > 0.452 or (c.y > 0.178 and c.z > 0.40)


def part(scene, source, name, lid):
    me = source.data.copy()
    me.name = name
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if is_lid(f.calc_center_median()) != lid], context="FACES")
    bm.to_mesh(me)
    bm.free()
    me.update()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob


def close_lid(lid):
    vs = lid.data.vertices
    along = (TOP - HINGE).normalized()
    up = Vector((abs(along.y), abs(along.x)))
    uw = [((Vector((v.co.y, v.co.z)) - HINGE).dot(along), (Vector((v.co.y, v.co.z)) - HINGE).dot(up)) for v in vs]
    u0 = min(u for u, _ in uw)
    for v, (u, w) in zip(vs, uw):
        v.co.y, v.co.z = -(u - u0), w
    # Settled, about its back edge.
    ca, sa = math.cos(SETTLE), math.sin(SETTLE)
    for v in vs:
        v.co.y, v.co.z = v.co.y * ca - v.co.z * sa, v.co.y * sa + v.co.z * ca
    y1 = max(v.co.y for v in vs)
    k = (BACK - FRONT) / (y1 - min(v.co.y for v in vs))
    for v in vs:
        v.co.y = BACK + (v.co.y - y1) * k
    # The flat edge on the rim: what most of the lower edge rests at, not the hasp that hangs below it.
    low = {}
    for v in vs:
        q = round(v.co.y * 50)
        low[q] = min(low.get(q, 9), v.co.z)
    flat = sorted(z for q, z in low.items() if -0.36 < q / 50 < 0.12)
    dz = RIM - flat[len(flat) // 4]
    for v in vs:
        v.co.z += dz
    lid.data.update()


def cut(ob):
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    was = len(ob.data.polygons)
    mod = ob.modifiers.new("cut", "DECIMATE")
    mod.ratio = min(1.0, TRIS / was)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    ob.data.shade_smooth()
    ob.data.set_sharp_from_angle(angle=math.radians(50))
    print(f"{ob.name}: {was} to {len(ob.data.polygons)} faces")


def build():
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    new = [o for o in bpy.data.objects if o not in before]
    source = next(o for o in new if o.type == "MESH")
    body, lid = part(scene, source, "chest_body", False), part(scene, source, "chest_lid", True)
    close_lid(lid)
    for o in new:
        bpy.data.objects.remove(o)
    cut(body)
    cut(lid)
    # To the game's frame: on the floor, about the box's middle, at its size. The lid's own origin is the hinge.
    mid = (BACK + FRONT) / 2
    for ob, oy, oz in ((body, mid, 0.0), (lid, BACK, RIM)):
        for v in ob.data.vertices:
            v.co = Vector((v.co.x, v.co.y - oy, v.co.z - oz)) * SCALE
        ob.data.update()
    lid.location = (0, (BACK - mid) * SCALE, RIM * SCALE)
    lid.rotation_mode = "XYZ"
    lid.rotation_euler = (0, 0, 0)
    lid.keyframe_insert("rotation_euler", frame=1)
    lid.rotation_euler = (-math.radians(OPEN_DEG), 0, 0)
    lid.keyframe_insert("rotation_euler", frame=24)
    scene.frame_start, scene.frame_end = 1, 24
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    lid.select_set(True)
    out = os.path.join(ROOT, "assets", "game", "items", "chest.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=True, use_active_scene=True, export_yup=True, export_apply=False,
                              export_extras=False, export_animations=True, export_skins=False, export_morph=False, export_lights=False, export_cameras=False,
                              export_tangents=False, export_normals=True, export_texcoords=True, export_materials="EXPORT", export_image_format="WEBP", export_image_quality=82)
    print(out, round(os.path.getsize(out) / 1048576, 2), "MB", "hinge", (BACK - mid) * SCALE, RIM * SCALE)


if __name__ == "__main__":
    build()
