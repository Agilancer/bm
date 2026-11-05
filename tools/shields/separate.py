"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Separates the five kite shield sheets in F:/!    BM V2/! TRIPO MODELS/Kite Shields into one object each, in a scene of their own.
Each is put in the frame the game holds a shield in: the grip at the origin, on the back of the board, the top up (+Y in glTF),
the face out (-Z in glTF), all of about the same area, and cut down to TRIS triangles: the relief is in the normal map. Exports
tools/build/swords/<id>.glb, for tools/shields/atlas.py to give each its own atlas.
"""
import math
import os
import runpy

import bmesh
import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCENE = "Shields"
SOURCE = r"F:\!    BM V2\! TRIPO MODELS\Kite Shields"
export = runpy.run_path(os.path.join(ROOT, "tools", "swords", "separate.py"))["export"]

AREA = 0.33       # square metres, width by height: about 0.39 by 0.86 for the plainest, and slimmer ones taller
GRIP = 0.58       # how far up from the point the fist goes, of its height
TRIS = 6000
# The sheets' columns (x gaps) and, top row first, what's in them, left to right.
SHEETS = [
    ("Kite Shields 1 - Common.glb", (-25.6, 0.3, 26.0), None, ["kite_cross", "kite_lion", "kite_fleur", "kite_eagle"]),
    ("Kite Shields 2 - Rare.glb", (0.0,), 50.5, ["kite_royal_lion", "kite_silver_cross", "kite_dragon", "kite_tree"]),
    ("Kite Shields 3 - FOR VELSCOURS KNIGHTS ONLY.glb", (0.0,), 51.0, ["kite_v_red", "kite_v_violet", "kite_v_bone", "kite_v_steel"]),
    ("Kite Shields 4 - FOR TESSARIEL AND HIS FOLLOWERS ONLY.glb", (-25.8, 0.0, 25.8), None, ["kite_t_white", "kite_t_black", "kite_t_red", "kite_t_blue"]),
    ("Kite Shields 5 - Epic.glb", (-25.5, 0.2, 26.0), None, ["kite_sun", "kite_ember", "kite_elder", "kite_frost"]),
]
# A half turn about the height, so the face that looks along -Y on the sheet looks along +Y here, and -Z once it's in glTF's axes.
TURN = Matrix(((-1, 0, 0), (0, -1, 0), (0, 0, 1)))


def islands(bm):
    """The sheet's loose parts, as lists of faces."""
    seen, out = set(), []
    for f0 in bm.faces:
        if f0.index in seen:
            continue
        seen.add(f0.index)
        part, stack = [], [f0]
        while stack:
            f = stack.pop()
            part.append(f)
            for v in f.verts:
                for g in v.link_faces:
                    if g.index not in seen:
                        seen.add(g.index)
                        stack.append(g)
        out.append(part)
    return out


def cell_of(part, gaps, row_gap):
    """Which shield a loose part is on, by the middle of its bounds."""
    xs = [v.co.x for f in part for v in f.verts]
    zs = [v.co.z for f in part for v in f.verts]
    col = sum((min(xs) + max(xs)) / 2 > g for g in gaps)
    if row_gap is None:
        return col
    return col + (0 if (min(zs) + max(zs)) / 2 > row_gap else len(gaps) + 1)


def separate_one(scene, source, keep, name):
    me = source.data.copy()
    me.name = name
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    bm.to_mesh(me)
    bm.free()

    pts = [v.co.copy() for v in me.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
    z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
    w, h = x1 - x0, z1 - z0
    scale = math.sqrt(AREA / (w * h))
    # The back of the board: most of the middle of it, not a strap standing off it.
    cx = (x0 + x1) / 2
    middle = sorted(p.y for p in pts if abs(p.x - cx) < w * 0.15)
    back = middle[int(len(middle) * 0.85)]
    me.transform((TURN * scale).to_4x4() @ Matrix.Translation(-Vector((cx, back, z0 + h * GRIP))))
    me.update()
    mat = me.materials[0].copy()
    mat.name = name
    me.materials[0] = mat
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    was = len(me.polygons)
    mod = ob.modifiers.new("cut", "DECIMATE")
    mod.ratio = min(1.0, TRIS / was)
    bpy.ops.object.modifier_apply(modifier=mod.name)
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(50))
    export(ob)
    print(f"{name}: {was} to {len(me.polygons)} faces, {w * scale:.3f} x {h * scale:.3f} x {ob.dimensions.y:.3f} m")
    return ob


def separate():
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    made = []
    for row, (file, gaps, row_gap, ids) in enumerate(SHEETS):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE, file))
        new = [o for o in bpy.data.objects if o not in before]
        source = next(o for o in new if o.type == "MESH")
        bm = bmesh.new()
        bm.from_mesh(source.data)
        bm.faces.ensure_lookup_table()
        cells = [set() for _ in ids]
        for part in islands(bm):
            cells[cell_of(part, gaps, row_gap)].update(f.index for f in part)
        bm.free()
        assert sum(len(c) for c in cells) == len(source.data.polygons), "faces lost or doubled"
        for k, name in enumerate(ids):
            ob = separate_one(scene, source, cells[k], name)
            made.append(ob)
            ob.location = (k * 0.6, 0, row * 1.2)
        for o in new:
            bpy.data.objects.remove(o)
    print(f"{len(made)} shields")


if __name__ == "__main__":
    separate()
