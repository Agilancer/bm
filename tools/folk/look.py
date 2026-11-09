"""Pictures of the built townsfolk, for judging them by eye.  In a background Blender:

    blender -b --factory-startup --python-exit-code 1 --python tools/folk/look.py -- OUT_DIR [--pose apose|stride|reach|tpose]
        [--views front,q34,side,back,face,face_q34]  (poses: apose arms down, stride a long step, reach arms forward,
    bend elbows and fingers and a knee bent, tpose as built) [--paint <name>] [--weights BONE] ids...

Each body (assets/game/folk/<id>.glb) in its own maps (or --paint's: a swap's <name>_c.webp), in a pose, lit the same way,
rendered by orthographic cameras at one fixed scale (PX_PER_M), so heights compare across pictures: OUT_DIR/<id>_<view>.png,
the ground PAD px above the bottom edge. The face views frame the head bone. tools/folk/sheets.py lays them out.
--weights paints the body by its weights to the named bones' chains instead (red: left side, blue: right side), for
seeing which way the skirt and sleeves will go; --weights _SKIRT paints the skirt mask (orange 1, grey 0).
"""
import json
import math
import os
import sys

import bpy
import mathutils

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FOLK = os.environ.get("FOLK_OUT") or os.path.join(ROOT, "assets", "game", "folk")
MAPS = os.path.join(ROOT, "assets", "game", "folk")
PX_PER_M = int(os.environ.get("FOLK_PX_PER_M", 300))
FRAME_H = 2.15
PAD = 0.05
FACE_H = 0.42
FACE_PX = 360


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    try:
        sc.render.engine = "BLENDER_EEVEE"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    try:
        sc.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    sc.view_settings.look = "None"
    try:
        sc.eevee.taa_render_samples = 32
    except AttributeError:
        pass
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (0.42, 0.43, 0.46, 1)
    bg.inputs[1].default_value = 0.9
    # Key from the front left and above, a cool rim from behind.
    for name, rot, energy, col in (("key", (50, 0, -35), 2.6, (1.0, 0.96, 0.9)), ("rim", (60, 0, 160), 1.2, (0.85, 0.9, 1.0))):
        light = bpy.data.lights.new(name, "SUN")
        light.energy = energy
        light.color = col
        light.angle = math.radians(8)
        o = bpy.data.objects.new(name, light)
        o.rotation_euler = [math.radians(a) for a in rot]
        sc.collection.objects.link(o)


def load(mid):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(FOLK, mid + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if o.type == "MESH" and o.name.lower().startswith("icosphere") and not o.find_armature():
            bpy.data.objects.remove(o, do_unlink=True)
            new.remove(o)
    arm = next(o for o in new if o.type == "ARMATURE")
    mesh = next(o for o in new if o.type == "MESH")
    return arm, mesh


def image(path, colour=True):
    img = bpy.data.images.load(path)
    if not colour:
        img.colorspace_settings.name = "Non-Color"
    return img


def paint(mesh, mid, swap=None):
    mat = bpy.data.materials.new(mid)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    c = nt.nodes.new("ShaderNodeTexImage")
    c.image = image(swap if swap and os.path.exists(swap) else os.path.join(MAPS, (swap or mid) + "_c.webp"))
    nt.links.new(c.outputs[0], bsdf.inputs["Base Color"])
    n = nt.nodes.new("ShaderNodeTexImage")
    n.image = image(os.path.join(MAPS, mid + "_n.webp"), False)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs[0], nm.inputs["Color"])
    nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
    m = nt.nodes.new("ShaderNodeTexImage")
    m.image = image(os.path.join(MAPS, mid + "_m.webp"), False)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(m.outputs[0], sep.inputs[0])
    nt.links.new(sep.outputs[1], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs[2], bsdf.inputs["Metallic"])
    mesh.data.materials.clear()
    mesh.data.materials.append(mat)


def paint_weights(mesh, bones):
    """Vertex colours: red for the weight on the named left chains, blue on the right, grey for the rest."""
    groups = {g.index: g.name.replace("mixamorig:", "") for g in mesh.vertex_groups}
    col = mesh.data.color_attributes.new("w", "FLOAT_COLOR", "POINT")
    for v in mesh.data.vertices:
        l = r = 0.0
        for g in v.groups:
            n = groups[g.group]
            for b in bones:
                if n.startswith("Left" + b):
                    l += g.weight
                elif n.startswith("Right" + b):
                    r += g.weight
        k = 1 - min(1, l + r)
        col.data[v.index].color = (0.55 * k + l, 0.55 * k, 0.55 * k + r, 1)
    mat = bpy.data.materials.new("weights")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    a = nt.nodes.new("ShaderNodeVertexColor")
    a.layer_name = "w"
    nt.links.new(a.outputs[0], bsdf.inputs["Base Color"])
    mesh.data.materials.clear()
    mesh.data.materials.append(mat)


def paint_skirt(mesh):
    """The _SKIRT attribute: orange where the cloth is kept off the legs, grey where it is not."""
    a = mesh.data.attributes.get("_SKIRT")
    vals = [0.0] * len(mesh.data.vertices)
    if a:
        a.data.foreach_get("value", vals)
    col = mesh.data.color_attributes.new("w", "FLOAT_COLOR", "POINT")
    for i, x in enumerate(vals):
        col.data[i].color = (0.5 + 0.5 * x, 0.5 - 0.15 * x, 0.5 - 0.45 * x, 1)
    mat = bpy.data.materials.new("skirt")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    c = nt.nodes.new("ShaderNodeVertexColor")
    c.layer_name = "w"
    nt.links.new(c.outputs[0], bsdf.inputs["Base Color"])
    mesh.data.materials.clear()
    mesh.data.materials.append(mat)


def turn(arm, name, axis, deg):
    """Turn a bone by deg about an armature-space axis through its head (its parents as they rest)."""
    pb = arm.pose.bones.get("mixamorig:" + name)
    if pb is None:
        return
    rest = pb.bone.matrix_local.to_3x3()
    r = mathutils.Matrix.Rotation(math.radians(deg), 3, axis)
    q = (rest.inverted() @ r @ rest).to_quaternion()
    pb.rotation_mode = "QUATERNION"
    pb.rotation_quaternion = q @ pb.rotation_quaternion


def pose(arm, kind):
    arm.data.pose_position = "POSE"
    if kind == "tpose":
        return
    down = {"apose": 62, "stride": 62, "reach": -20, "bend": 62}[kind]
    turn(arm, "LeftArm", "Y", down)
    turn(arm, "RightArm", "Y", -down)
    if kind == "apose":
        turn(arm, "LeftForeArm", "Z", 12)
        turn(arm, "RightForeArm", "Z", -12)
    if kind == "reach":
        # Arms forward and up, elbows bent: a sleeve on the chest stays down.
        turn(arm, "LeftArm", "Z", -70)
        turn(arm, "RightArm", "Z", 70)
    if kind == "bend":
        # Elbows bent forward, fists closed, a knee raised: where a joint off the limb's middle shows.
        turn(arm, "LeftForeArm", "Z", -95)
        turn(arm, "RightForeArm", "Z", 95)
        for side, sign in (("Left", 1), ("Right", -1)):
            for f in ("Index", "Middle", "Ring", "Pinky"):
                for i in (1, 2, 3):
                    turn(arm, f"{side}Hand{f}{i}", "Y", sign * 65)
        turn(arm, "LeftUpLeg", "X", -75)
        turn(arm, "LeftLeg", "X", 95)
    if kind == "stride":
        # A long walking step and a lifted knee: where a skirt panel weighted to the wrong leg tears.
        turn(arm, "LeftUpLeg", "X", -38)
        turn(arm, "LeftLeg", "X", 30)
        turn(arm, "RightUpLeg", "X", 26)
        turn(arm, "RightLeg", "X", 20)
    bpy.context.view_layer.update()


def camera(name, target, yaw, ortho, w, h):
    cam = bpy.data.cameras.new(name)
    cam.type = "ORTHO"
    cam.ortho_scale = ortho
    cam.clip_start = 0.01
    cam.clip_end = 100
    o = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(o)
    # Front is -Y in Blender (the glb's +Z); yaw turns the camera round to the body's left.
    d = mathutils.Vector((math.sin(math.radians(yaw)), -math.cos(math.radians(yaw)), 0))
    o.location = target + d * 10
    o.rotation_euler = (math.radians(90), 0, math.radians(yaw))
    sc = bpy.context.scene
    sc.camera = o
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    return o


VIEWS = {"front": 0, "q34": 35, "side": 90, "back": 180, "face": 0, "face_q34": 35}


def run(out, ids, views, kind, swap, weights):
    os.makedirs(out, exist_ok=True)
    for mid in ids:
        reset()
        arm, mesh = load(mid)
        if weights == ["_SKIRT"]:
            paint_skirt(mesh)
        elif weights:
            paint_weights(mesh, weights)
        else:
            paint(mesh, mid, swap)
        pose(arm, kind)
        head = arm.data.bones["mixamorig:Head"].head_local
        for view in views:
            if view.startswith("face"):
                target = mathutils.Vector((0, 0, head.z + 0.1))
                camera(view, target, VIEWS[view], FACE_H, FACE_PX, FACE_PX)
            else:
                w = int(round(PX_PER_M * (1.35 if kind == "tpose" else (0.9 if kind != "reach" else 1.0))))
                h = int(round(PX_PER_M * FRAME_H))
                target = mathutils.Vector((0, 0, FRAME_H / 2 - PAD))
                camera(view, target, VIEWS[view], FRAME_H * max(1, w / h), w, h)
            tag = os.path.splitext(os.path.basename(swap))[0] if swap and os.path.exists(swap) else (swap or mid)
            bpy.context.scene.render.filepath = os.path.join(out, f"{tag}_{view}.png")
            bpy.ops.render.render(write_still=True)
        print("LOOK", mid, swap or "", kind, flush=True)


argv = sys.argv[sys.argv.index("--") + 1:]
out = argv.pop(0)
opts = {"--pose": "apose", "--views": "front,q34", "--paint": None, "--weights": None}
ids = []
while argv:
    a = argv.pop(0)
    if a in opts:
        opts[a] = argv.pop(0)
    else:
        ids.append(a)
if not ids:
    ids = list(json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))["models"])
run(out, ids, opts["--views"].split(","), opts["--pose"], opts["--paint"], opts["--weights"].split(",") if opts["--weights"] else None)
