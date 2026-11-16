"""Paint a clean face onto a Meshy model's texture from a front picture (the design picture the owner approved).

Meshy's texture step leaves blotches on faces (a pale cheek, a dark speck, a white streak) and its atlas is hundreds of
tiny charts, so the fix is done in a front view and projected back:

  1. render:  blender -b --factory-startup -P tools/phobos/face_fix.py -- render <body.glb> <dir> [yaw=35 dz=0.12 ...]
     Writes <dir>/full.png and <dir>/face.png (flat albedo, no light, transparent ground) and <dir>/cams.json (each
     view's ortho centre, size and yaw), so tools/phobos/face_patch.py can line the picture up with the model. A turned
     face camera (yaw) is for face_patch.py's blemish mode (a hood's side): only the straight-on one lines up a picture.
  2. python tools/phobos/face_patch.py <dir> <picture.png>  ->  <dir>/patch.png and <dir>/mask.png in the face view.
  3. bake:    blender -b --factory-startup -P tools/phobos/face_fix.py -- bake <body.glb> <dir> [grazing=1]
     Projects patch.png from the face camera onto every texel that camera sees (ray-cast visibility, faded where the
     surface turns away), weighted by mask.png: <dir>/bake_col.png and <dir>/bake_w.png in the model's own UVs.
  4. python tools/phobos/face_patch.py compose <dir> <original_texture.png> <out_texture.png>, and
     meshy_to_folk.py takes it with M2F_TEX=<out_texture.png>.
"""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
MODE, SRC, DIR = argv[:3]
# render's options, key=value: yaw (degrees, turning the face camera to her left like render_front.py's angles),
# dx, dz (metres from the head bone; dz defaults to 0.09, the face's middle) and size (the view's width, 0.26 m).
OPT = {k: float(v) for k, v in (a.split("=") for a in argv[3:] if "=" in a)}

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and o.name.lower().startswith("icosphere") and not o.find_armature():
        bpy.data.objects.remove(o)
mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = next(o for o in sc.objects if o.type == "ARMATURE")
mat = mesh.data.materials[0]
nt = mat.node_tree
tex = next(n for n in nt.nodes if n.type == "TEX_IMAGE")
IMG = tex.image
mw = mesh.matrix_world
ws = [mw @ v.co for v in mesh.data.vertices]
lo = Vector([min(p[k] for p in ws) for k in range(3)])
hi = Vector([max(p[k] for p in ws) for k in range(3)])
head = arm.matrix_world @ arm.data.bones["Head"].head_local if "Head" in arm.data.bones else \
    arm.matrix_world @ next(b for b in arm.data.bones if b.name.endswith("Head")).head_local
# Ortho views: centre (x, y, z), size (m) and yaw (degrees; 0 looks +y at her front, picture x = world x, up = z).
CAMS = {"full": dict(cx=(lo.x + hi.x) / 2, cy=(lo.y + hi.y) / 2, cz=(lo.z + hi.z) / 2,
                     size=max(hi.x - lo.x, hi.z - lo.z) * 1.04, yaw=0.0),
        "face": dict(cx=head.x + OPT.get("dx", 0), cy=head.y, cz=head.z + OPT.get("dz", 0.09), size=OPT.get("size", 0.26),
                     yaw=OPT.get("yaw", 0.0))}
if MODE == "bake":
    CAMS = json.load(open(os.path.join(DIR, "cams.json")))  # the camera the patch was cut in
RES = 1024


def basis(c):
    """A view's centre, look direction and picture-right direction."""
    a = math.radians(c.get("yaw", 0))
    return Vector((c["cx"], c.get("cy", 0), c["cz"])), Vector((-math.sin(a), math.cos(a), 0)), Vector((math.cos(a), math.sin(a), 0))


def proj_uv(c, p):
    """World point -> that view's picture coordinates, 0..1 from the bottom left."""
    C, f, r = basis(c)
    return ((p - C).dot(r) / c["size"] + 0.5, (p.z - C.z) / c["size"] + 0.5)


if MODE == "render":
    os.makedirs(DIR, exist_ok=True)
    # Flat albedo: the base colour straight to the output, no light, no tone curve.
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    for e in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        try:
            sc.render.engine = e
            break
        except TypeError:
            pass
    sc.view_settings.view_transform = "Standard"
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = RES
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"
    for name, c in CAMS.items():
        C, f, r = basis(c)
        cam.data.ortho_scale = c["size"]
        cam.location = C - 3 * f
        cam.rotation_euler = (math.radians(90), 0, math.radians(c["yaw"]))
        sc.render.filepath = os.path.join(DIR, name + ".png")
        bpy.ops.render.render(write_still=True)
    json.dump(dict(CAMS, height=hi.z - lo.z, texture=list(IMG.size)), open(os.path.join(DIR, "cams.json"), "w"), indent=1)
    print("FACEFIX rendered", DIR)

elif MODE == "bake":
    c = CAMS["face"]
    C, f, r = basis(c)
    me = mesh.data
    # The face camera's picture as a second UV map.
    proj = me.uv_layers.new(name="proj")
    for lp in me.loops:
        proj.data[lp.index].uv = proj_uv(c, mw @ me.vertices[lp.vertex_index].co)
    # What the face camera sees: a ray through every masked pixel; the faces they hit first are painted, no others.
    # Per pixel, not per vertex or face middle: Meshy's pieces overlap, and a blemish can poke through a gap with its
    # corners and middle hidden.
    dg = bpy.context.evaluated_depsgraph_get()
    mk = bpy.data.images.load(os.path.join(DIR, "mask.png")); mk.colorspace_settings.name = "Non-Color"
    import array
    px = array.array("f", [0.0]) * (mk.size[0] * mk.size[1] * 4); mk.pixels.foreach_get(px)
    MW, MH = mk.size
    seen = set()
    for j in range(0, MH, 1):
        for i in range(0, MW, 1):
            if px[(j * MW + i) * 4] < 0.01:
                continue
            o = C + r * (((i + 0.5) / MW - 0.5) * c["size"]) + Vector((0, 0, ((j + 0.5) / MH - 0.5) * c["size"])) - 2 * f
            hit, loc, nor, idx, *_ = sc.ray_cast(dg, o, f)
            if hit:
                seen.add(idx)
    vis = me.color_attributes.new("vis", "FLOAT_COLOR", "CORNER")
    for poly in me.polygons:
        v = 1.0 if poly.index in seen else 0.0
        for li in poly.loop_indices:
            vis.data[li].color = (v, v, v, 1)
    print("FACEFIX faces seen", len(seen))
    me.uv_layers.active = me.uv_layers[0]
    patch = bpy.data.images.load(os.path.join(DIR, "patch.png"))
    maskim = bpy.data.images.load(os.path.join(DIR, "mask.png")); maskim.colorspace_settings.name = "Non-Color"

    def node(kind, **kw):
        n = nt.nodes.new(kind)
        for k, v in kw.items():
            setattr(n, k, v)
        return n

    uvp = node("ShaderNodeUVMap", uv_map="proj")
    tp = node("ShaderNodeTexImage", image=patch, extension="CLIP")
    tm = node("ShaderNodeTexImage", image=maskim, extension="CLIP")
    nt.links.new(uvp.outputs["UV"], tp.inputs["Vector"]); nt.links.new(uvp.outputs["UV"], tm.inputs["Vector"])
    # Facing: full where the surface faces the camera within ~70 degrees, nothing past ~85. Low on purpose: Meshy's
    # faces are a patchwork of small overlapping pieces, and the pale and dark specks are their edges and fins turned
    # half away; painting those with the skin around them is the fix. The mask keeps it to the face.
    geo = node("ShaderNodeNewGeometry")
    dot = node("ShaderNodeVectorMath", operation="DOT_PRODUCT"); dot.inputs[1].default_value = tuple(-f)
    nt.links.new(geo.outputs["Normal"], dot.inputs[0])
    # Either side: the material is double-sided and some pieces face backwards (the dark speck under her nose is one,
    # seen through a gap). The visibility test below keeps the back of the head out.
    absd = node("ShaderNodeMath", operation="ABSOLUTE")
    nt.links.new(dot.outputs["Value"], absd.inputs[0])
    face = node("ShaderNodeMapRange"); face.inputs["From Min"].default_value = 0.08; face.inputs["From Max"].default_value = 0.35
    if OPT.get("grazing"):  # bake ... grazing=1: every face the camera sees, however edge-on (fins in a blemish patch)
        face.inputs["From Min"].default_value = -2; face.inputs["From Max"].default_value = -1
    nt.links.new(absd.outputs[0], face.inputs["Value"])
    ca = node("ShaderNodeVertexColor", layer_name="vis")
    m1 = node("ShaderNodeMath", operation="MULTIPLY"); m2 = node("ShaderNodeMath", operation="MULTIPLY")
    nt.links.new(face.outputs["Result"], m1.inputs[0]); nt.links.new(ca.outputs["Color"], m1.inputs[1])
    nt.links.new(m1.outputs[0], m2.inputs[0]); nt.links.new(tm.outputs["Color"], m2.inputs[1])
    em = node("ShaderNodeEmission")
    out = next(n for n in nt.nodes if n.type == "OUTPUT_MATERIAL")
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    W, H = IMG.size
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 4
    sc.render.bake.margin = 3
    for o in sc.objects:
        o.select_set(o == mesh)
    bpy.context.view_layer.objects.active = mesh
    results = {}
    for what, src, cs in (("col", tp.outputs["Color"], "sRGB"), ("w", m2.outputs[0], "Non-Color")):
        tgt = bpy.data.images.new("bake_" + what, W, H)
        tgt.colorspace_settings.name = cs
        tn = node("ShaderNodeTexImage", image=tgt)
        nt.nodes.active = tn
        nt.links.new(src, em.inputs["Color"])
        bpy.ops.object.bake(type="EMIT")
        p = os.path.join(DIR, f"bake_{what}.png")
        tgt.filepath_raw = p; tgt.file_format = "PNG"; tgt.save()
        nt.nodes.remove(tn)
        results[what] = p
    print("FACEFIX baked", results)
