"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Tears the five Tripo suits in F:/!    BM V2/! TRIPO MODELS/ARMOR into gear pieces, in a scene of their own. Each suit's segments go to a
piece by the bones that move them (PIECES), are stood at the height of a man, facing the same way, and share one atlas per piece. Exports
tools/build/swords/<id>.glb, for tools/gear/atlas.py.
"""
import math
import os
import runpy

import bpy
import numpy as np
from mathutils import Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SCENE = "Gear"
SOURCE = r"F:\!    BM V2\! TRIPO MODELS\ARMOR"
export = runpy.run_path(os.path.join(ROOT, "tools", "swords", "separate.py"))["export"]

HEIGHT = 1.85     # a suit stands this tall
TILE = 512        # the texels a segment gets in its piece's atlas
SUITS = {
    "knight": ("NORMAL KNIGHT - SEGMENTED + SKINNED + RIGGED + ANIMATED.glb", 0, dict(
        head=[4], chest=[3, 13], shoulders=[5, 6, 9, 10], hands=[7, 8], legs=[2, 11, 12], feet=[0, 1])),
    "t_purple": ("TESSARIELS KNIGHT - PURPLE - EVERYTHING.glb", 0, dict(
        head=[8], chest=[6], shoulders=[3, 5], hands=[12, 9], legs=[1, 4, 7, 10, 11], feet=[0, 2])),
    # These two face +X in the file: a quarter turn brings them round.
    "t_silver": ("TESSARIELS KNIGHT - SILVER + PURPLE - NO ANIMATIONS.glb", 1, dict(
        head=[6], chest=[3], shoulders=[7, 8, 10, 13, 14, 15], hands=[11, 9], legs=[1, 4, 5, 12, 16, 17, 18, 19], feet=[0, 2])),
    "t_pale": ("TESSARIELS KNIGHT - SILVER + PURPLE + LIGHTER - NO ANIMATIONS.glb", 1, dict(
        head=[8], chest=[1, 15, 16], shoulders=[4, 6, 13, 14], hands=[7, 10, 12], legs=[0, 5, 9, 11], feet=[2, 3])),
    "t_white": ("TESSARIELS KNIGHT - WHITE + PURPLE - EVERYTHING.glb", 0, dict(
        head=[5, 17], chest=[1], shoulders=[7, 8, 9, 10, 11, 16], hands=[4, 6], legs=[0, 12, 13, 14, 15], feet=[2, 3])),
}


def base_image(mat):
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    return bsdf.inputs[0].links[0].from_node.image


def atlas_of(name, images):
    """One image holding each of the segments' maps as a square tile. Returns it and each tile's corner, as fractions."""
    cols = math.ceil(math.sqrt(len(images)))
    rows = math.ceil(len(images) / cols)
    S = cols * TILE
    px = np.zeros((S, S, 4), np.float32)
    px[..., 3] = 1
    corners = []
    for i, im in enumerate(images):
        c = im.copy()
        c.scale(TILE, TILE)
        a = np.empty(TILE * TILE * 4, np.float32)
        c.pixels.foreach_get(a)
        bpy.data.images.remove(c)
        x, y = (i % cols) * TILE, (i // cols) * TILE
        px[y:y + TILE, x:x + TILE] = a.reshape(TILE, TILE, 4)
        corners.append((x / S, y / S))
    out = bpy.data.images.new(name, S, S)
    out.pixels.foreach_set(px.ravel())
    out.pack()
    return out, corners, TILE / S, rows


def piece(scene, name, parts, world):
    obs = []
    for p in parts:
        o = p.copy()
        o.data = p.data.copy()
        o.modifiers.clear()
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(world)
        scene.collection.objects.link(o)
        obs.append(o)
    images = [base_image(o.data.materials[0]) for o in obs]
    # Each segment's UVs into its tile, before they are joined.
    img, corners, k, _ = atlas_of(name, images)
    for o, (cx, cy) in zip(obs, corners):
        uv = o.data.uv_layers[0].data
        a = np.empty(len(uv) * 2, np.float32)
        uv.foreach_get("uv", a)
        a = a.reshape(-1, 2)
        a = a * k + (cx, cy)
        uv.foreach_set("uv", a.ravel())
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = img
    mat.node_tree.links.new(tex.outputs[0], bsdf.inputs[0])
    for o in obs:
        o.data.materials.clear()
        o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obs[0]
    bpy.ops.object.select_all(action="DESELECT")
    for o in obs:
        o.select_set(True)
    if len(obs) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = ob.data.name = name
    # About its own middle, feet of the suit forgotten.
    pts = np.empty(len(ob.data.vertices) * 3, np.float32)
    ob.data.vertices.foreach_get("co", pts)
    pts = pts.reshape(-1, 3)
    mid = (pts.min(0) + pts.max(0)) / 2
    ob.data.transform(Matrix.Translation(-mid))
    ob.data.update()
    export(ob)
    print(f"{name}: {len(ob.data.polygons)} faces, {pts.max(0) - pts.min(0)}, atlas {img.size[0]}, parts {len(parts)}")
    return ob


def separate(only=None):
    first_scene_objs = set(bpy.data.scenes[0].objects)
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    keep = bpy.context.window.scene
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    made = []
    for row, (suit, (file, turn, pieces)) in enumerate(SUITS.items()):
        if only and suit not in only:
            continue
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(SOURCE, file))
        new = [o for o in bpy.data.objects if o not in before]
        by_part = {int(o.name.split("tripo_part_")[1].split(".")[0]): o for o in new if o.type == "MESH" and "tripo_part_" in o.name}
        top = max(v.co.z for o in by_part.values() for v in o.data.vertices)
        world = Matrix.Scale(HEIGHT / top, 4)
        if turn:
            world = Matrix.Rotation(-math.pi / 2, 4, "Z") @ world
        for c, (slot, parts) in enumerate(pieces.items()):
            ob = piece(scene, f"{suit}_{slot}", [by_part[p] for p in parts], world)
            ob.location = (c * 1.0, 0, row * 1.1)
            made.append(ob)
        for o in new:
            bpy.data.objects.remove(o)
        for a in [a for a in bpy.data.actions if a.users == 0]:
            bpy.data.actions.remove(a)
    # The importer's bone-display sphere lands in the file's first scene, whichever one the window is on.
    for o in list(bpy.data.scenes[0].objects):
        if o not in first_scene_objs and o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o)
    bpy.context.window.scene = keep
    print(len(made), "pieces")


if __name__ == "__main__":
    separate()
