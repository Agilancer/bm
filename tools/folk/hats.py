"""The townsfolk's headwear, for the palette swaps (src/gfx/folk.js hats): a flat cap, a wide-brimmed felt hat, a tall felt
hat, a straw hat, a hood, a coif, a knitted cap and a kerchief. Each made round a head of radius 1 at the origin (+Y up,
+Z the way the face looks, as glTF has it): the game fits it to each body's own head (its Head joint's vertices) and
hangs it on that joint. Felt and wool are left undyed, for the swap's dye to colour (src/gfx/materials.js).

    blender -b --factory-startup --python-exit-code 1 --python tools/folk/hats.py

Writes assets/game/folk/hats.glb (one mesh a hat, named) and assets/game/folk/hats_c.webp (four swatches, 2 x 2: felt,
straw, wool, leather), and a picture of them all, tools/build/hats.png.
"""
import math
import os
import sys

import bmesh
import bpy
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "assets", "game", "folk")
SW = {"felt": (0, 0), "straw": (1, 0), "wool": (0, 1), "leather": (1, 1)}   # swatch: which quarter of the map


def swatch_map(path):
    """The four swatches, each with its own grain: felt dark and close, straw light and streaked, wool pale and soft, leather brown."""
    N = 256; rng = np.random.default_rng(7)
    img = np.zeros((N, N, 3))
    def noise(sc, amp):
        g = rng.normal(0, 1, (N // sc + 2, N // sc + 2))
        g = np.kron(g, np.ones((sc, sc)))[:N, :N]
        return g * amp
    q = N // 2
    def put(ix, iy, base, grain):
        sl = (slice(iy * q, iy * q + q), slice(ix * q, ix * q + q))
        img[sl] = np.clip(np.array(base)[None, None, :] * (1 + grain[sl][..., None]), 0, 1)
    put(0, 0, (0.20, 0.19, 0.18), noise(2, 0.10) + noise(8, 0.06))
    streak = np.repeat(rng.normal(0, 0.12, (1, N)), N, 0) + noise(2, 0.05)
    put(1, 0, (0.66, 0.55, 0.33), streak)
    put(0, 1, (0.60, 0.57, 0.52), noise(3, 0.07) + noise(16, 0.05))
    put(1, 1, (0.30, 0.19, 0.11), noise(2, 0.08) + noise(6, 0.08))
    from PIL import Image
    Image.fromarray((img * 255).astype(np.uint8)).save(path, "WEBP", quality=90)


def obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def uv_into(bm, part_faces, sw):
    """Each face's UVs, from where its vertices are round the head (a cylinder's unwrap), squeezed into one swatch."""
    uv = bm.loops.layers.uv.verify()
    ix, iy = SW[sw]
    for f in part_faces:
        for l in f.loops:
            x, y, z = l.vert.co
            u = (math.atan2(x, z) / (2 * math.pi) + 0.5); v = (y + 1.5) / 4
            l[uv].uv = ((ix + 0.04 + u * 0.92) / 2, 1 - (iy + 0.04 + min(max(v, 0), 1) * 0.92) / 2)


def sphere(bm, r, scale=(1, 1, 1), at=(0, 0, 0), seg=24, rings=14):
    res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in res["verts"]:
        v.co.x = v.co.x * scale[0] + at[0]; v.co.y = v.co.y * scale[1] + at[1]; v.co.z = v.co.z * scale[2] + at[2]
    return res["verts"]


def frustum(bm, r1, r2, y0, h, seg=24, cap=True):
    res = bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=h)
    for v in res["verts"]:
        v.co.y, v.co.z = v.co.z + y0 + h / 2, -v.co.y
    return res["verts"]


def keep(bm, verts, test):
    """Takes away every vertex of verts that fails test(co)."""
    bmesh.ops.delete(bm, geom=[v for v in verts if not test(v.co)], context="VERTS")


def solid(o, t):
    m = o.modifiers.new("solid", "SOLIDIFY"); m.thickness = t; m.offset = 1
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.modifier_apply(modifier="solid"); o.select_set(False)


def made(name, parts):
    """parts: [(fn(bm) -> verts, swatch, solidify thickness or 0)], each its own piece, joined."""
    objs = []
    for i, (fn, sw, th) in enumerate(parts):
        bm = bmesh.new(); fn(bm)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        uv_into(bm, list(bm.faces), sw)
        o = obj(f"{name}_{i}", bm)
        if th: solid(o, th)
        objs.append(o)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    objs[0].name = name; objs[0].data.name = name
    bpy.ops.object.shade_smooth()
    return objs[0]


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # (Blender's up is Z: made Y-up here, as glTF, and the exporter's +Y up is turned off, so what's written is as made.)
    hats = []
    # A flat cap: a soft crown pulled down to the brows, a short peak.
    hats.append(made("flatcap", [
        (lambda bm: keep(bm, sphere(bm, 1.0, (1.12, 0.62, 1.18), (0, 0.42, -0.02)), lambda c: c.y > 0.3), "felt", 0.05),
        (lambda bm: keep(bm, frustum(bm, 0.78, 0.78, 0.36, 0.05, cap=True), lambda c: c.z > 0.42), "felt", 0),
    ]))
    # A wide-brimmed felt hat: a round crown, a brim to keep the rain off the shoulders.
    hats.append(made("widebrim", [(lambda bm: frustum(bm, 1.04, 0.92, 0.3, 0.85), "felt", 0),
                                  (lambda bm: frustum(bm, 1.95, 1.95, 0.28, 0.05), "felt", 0),
                                  (lambda bm: frustum(bm, 1.06, 1.06, 0.34, 0.16, cap=False), "leather", 0)]))
    # A tall felt hat, narrowing to its flat top, a small brim.
    hats.append(made("tallhat", [(lambda bm: frustum(bm, 1.03, 0.78, 0.3, 1.45), "felt", 0),
                                 (lambda bm: frustum(bm, 1.45, 1.45, 0.28, 0.05), "felt", 0),
                                 (lambda bm: frustum(bm, 1.05, 1.0, 0.34, 0.2, cap=False), "leather", 0)]))
    # A straw hat, low and wide.
    hats.append(made("straw", [(lambda bm: frustum(bm, 1.04, 0.85, 0.3, 0.55), "straw", 0),
                               (lambda bm: frustum(bm, 2.25, 2.25, 0.28, 0.05), "straw", 0)]))
    # A hood: over the head and down the back of the neck, open for the face.
    # (Close round the face, not standing off it: a ring round the head would read as a halo, and nothing here may.)
    hats.append(made("hood", [(lambda bm: keep(bm, sphere(bm, 1.0, (1.1, 1.16, 1.14), (0, 0.04, -0.1), 28, 18),
                                               lambda c: c.y > -1.3 and not (c.z > 0.28 and c.y < 0.62)), "wool", 0.06),
                              (lambda bm: keep(bm, frustum(bm, 1.05, 0.95, -1.35, 0.6, seg=28, cap=False), lambda c: c.z < 0.3), "wool", 0.05)]))
    # A coif: close over the crown and the back of the head, tied under it.
    hats.append(made("coif", [(lambda bm: keep(bm, sphere(bm, 1.0, (1.04, 1.06, 1.07), (0, 0.04, -0.04)),
                                               lambda c: c.y > -0.62 and not (c.z > 0.2 and c.y < 0.5)), "wool", 0.035)]))
    # A knitted cap, rolled at its edge.
    hats.append(made("knitcap", [(lambda bm: keep(bm, sphere(bm, 1.0, (1.1, 1.25, 1.12), (0, 0.18, -0.03)), lambda c: c.y > 0.22), "wool", 0.05),
                                 (lambda bm: frustum(bm, 1.14, 1.14, 0.18, 0.2, cap=False), "wool", 0.05)]))
    # A kerchief: knotted over the hair, its corner down the back.
    hats.append(made("kerchief", [(lambda bm: keep(bm, sphere(bm, 1.0, (1.04, 1.06, 1.08), (0, 0.04, -0.03)),
                                                   lambda c: c.y > 0.1 and not (c.z > 0.6 and c.y < 0.45)), "wool", 0.03),
                                  (lambda bm: keep(bm, frustum(bm, 0.55, 0.02, -0.45, 0.6, seg=8), lambda c: True), "wool", 0)]))
    return hats


def place_tail():
    o = bpy.data.objects["kerchief"]
    # (Its corner hangs at the back.)
    for v in o.data.vertices:
        if v.co.y < 0.0 and abs(v.co.x) < 0.6 and v.co.z > -0.6: v.co.z -= 0.95


if __name__ == "__main__":
    hats = build()
    place_tail()
    swatch_map(os.path.join(OUT, "hats_c.webp"))
    for o in bpy.context.scene.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "hats.glb"), export_format="GLB", use_selection=True, export_yup=False,
                              export_materials="NONE", export_normals=True, export_texcoords=True)
    print("HATS", [(o.name, len(o.data.vertices)) for o in hats])
