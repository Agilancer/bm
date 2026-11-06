"""Run in background Blender: blender -b -P tools/staffs/new_staffs.py

The eight elemental staffs, from the owner's Tripo models outside the repo, one model each. Same frame as tools/staffs/separate.py:
fist at the origin, head up, the model's width across. Cut to 16k triangles and 1024 maps, written to assets/game/items with their
icons and their lines in swords.json. The shape is the model's own: only one uniform scale.
"""
import json
import os
import runpy

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = r"F:\!    BM V2\! TRIPO MODELS\NEW STAFFS"
OUT = os.path.join(ROOT, "assets", "game", "items")
ICONS = runpy.run_path(os.path.join(ROOT, "tools", "swords", "render_icons.py"))
MODELS = {"dark_staff": "DARK STAFF 1", "death_staff": "DEATH STAFF 1", "earth_staff": "EARTH STAFF 1", "fire_staff": "FIRE STAFF 1",
          "ice_staff": "ICE STAFF 1", "life_staff": "LIFE STAFF 2", "vine_staff": "VINE STAFF 1", "wind_staff": "WIND STAFF 1"}
LENGTH, GRIP = 1.824, 0.637                 # as the staffs already in the hand: metres foot to head, and how far up the fist is
TRIS, TEX = 16000, 1024
FILL = [("guard", 0.76, 0.03), ("blade", 0.56, 0.024), ("blade", 0.24, 0.024), ("pommel", 0.06, 0.028)]
TURN = Matrix(((0, 1, 0), (-1, 0, 0), (0, 0, 1)))


def middle(values, tol=0.04):
    m = np.median(values)
    kept = values[np.abs(values - m) < tol]
    return (kept.min() + kept.max()) / 2


def convert(name, stem, scene, cam, lights, manifest):
    before = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, f"{stem}.glb"))
    made = [o for o in scene.objects if o not in before]
    ob = next(o for o in made if o.type == "MESH")
    world = ob.matrix_world.copy()
    ob.parent = None
    ob.matrix_world = Matrix.Identity(4)
    me = ob.data
    me.transform(world)

    P = np.array([v.co for v in me.vertices])       # Blender's axes: z up
    foot, head = P[:, 2].min(), P[:, 2].max()
    # Some come leaning. Stood up by the lower shaft: a turn of the whole thing, nothing bent.
    tall, tol = head - foot, 0.022 * (head - foot)
    hs = [foot + t * tall for t in np.linspace(0.08, 0.6, 9)]
    cut = [P[np.abs(P[:, 2] - h) < 0.015 * tall] for h in hs]
    axis = Vector((np.polyfit(hs, [middle(c[:, 0], tol) for c in cut], 1)[0], np.polyfit(hs, [middle(c[:, 1], tol) for c in cut], 1)[0], 1)).normalized()
    if axis.angle(Vector((0, 0, 1))) > 0.035:
        print(f"{name} stood up by {np.degrees(axis.angle(Vector((0, 0, 1)))):.1f} degrees")
        me.transform(axis.rotation_difference(Vector((0, 0, 1))).to_matrix().to_4x4())
        P = np.array([v.co for v in me.vertices])
        foot, head = P[:, 2].min(), P[:, 2].max()
        tol = 0.022 * (head - foot)
    scale = LENGTH / (head - foot)
    grip = foot + GRIP * (head - foot)
    near = P[np.abs(P[:, 2] - grip) < 0.02 * (head - foot)]
    fist = Vector((middle(near[:, 0], tol), middle(near[:, 1], tol), grip))
    me.transform((TURN * scale).to_4x4() @ Matrix.Translation(-fist))
    me.update()

    # Item axes are glTF's: x depth, y up, z across. Blender (x, y, z) is glTF (x, z, -y).
    P = np.array([v.co for v in me.vertices])
    V = np.stack([P[:, 0], P[:, 2], -P[:, 1]], 1)
    sockets = []
    y0, y1 = V[:, 1].min(), V[:, 1].max()
    for slot, up, r in FILL:
        y = y0 + up * (y1 - y0)
        s = V[np.abs(V[:, 1] - y) < 0.025]
        z = middle(s[:, 2])
        on = s[np.abs(s[:, 2] - z) < 0.05]
        sockets.append(dict(slot=slot, y=round(float(y), 4), z=round(float(z), 4), radius=r, back=round(float(on[:, 0].min()), 4), front=round(float(on[:, 0].max()), 4)))

    d = ob.modifiers.new("cut", "DECIMATE")
    d.ratio = min(1, TRIS / sum(len(p.vertices) - 2 for p in me.polygons))
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=d.name)
    ob.name = name
    for img in bpy.data.images:
        if img.size[0] > TEX:
            img.scale(TEX, TEX)

    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    path = os.path.join(OUT, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_animations=False, export_skins=False, export_morph=False,
                              export_normals=True, export_texcoords=True, export_materials="EXPORT", export_image_format="JPEG", export_jpeg_quality=85)
    margin = 0.02
    a, b = float(y0) - margin, float(y1) + margin
    across = float(np.abs(V[:, 2]).max()) + margin
    h = max(b - a, across * 8)
    mid = (a + b) / 2
    frame = dict(y=[round(mid - h / 2, 4), round(mid + h / 2, 4)], z=round(h / 8, 4))
    manifest[name] = dict(file=f"assets/game/items/{name}.glb", icon=f"assets/game/items/icons/{name}.webp", hands=3, tip=0.5, pommel=round(float(y0), 4),
                          guard=round(float(np.abs(V[:, 2]).max()), 4), frame=frame, sockets=sockets)
    ICONS["shoot"](scene, cam, lights, ob, frame["y"], os.path.join(ICONS["ICONS"], f"{name}.webp"), ICONS["SIZE"], "WEBP")
    for o in made:
        bpy.data.objects.remove(o)
    print(f"{name}: {os.path.getsize(path) / 1e6:.2f} MB, across +-{float(np.abs(V[:, 2]).max()):.2f} m")


def main():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    cam, lights = ICONS["setup"](scene)
    scene.cycles.samples = 24
    with open(ICONS["MANIFEST"]) as f:
        full = json.load(f)
    for name, stem in MODELS.items():
        convert(name, stem, scene, cam, lights, full["swords"])
    with open(ICONS["MANIFEST"], "w") as f:
        json.dump(full, f, indent=1)


if __name__ == "__main__":
    main()
