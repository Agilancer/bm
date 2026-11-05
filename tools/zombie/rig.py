"""Combine the zombie clips from the two UAL mannequin files and fit that rig to a Tripo zombie.

Run inside Blender. Both files share one skeleton and one T-pose rest, and the zombies are
modelled in a T-pose too, so bones keep their rest orientation apart from a small aim at the
model's limb, and clip rotations carry over unchanged. Tripo's finger weights are kept, each
finger joint mapping to its UAL joint, so the hands bend.

Clips arrive with root motion, which is stripped: they play in place and CLIP_META records the
floor speed (or the one-shot's travel), as the other monsters' clips.json does.
"""
import json
import os
import re

import bpy
import numpy as np
from mathutils import Matrix, Vector, kdtree

UAL1 = r"F:\!  BELLMOURN\Universal Animation Library[Standard]\Unreal-Godot\UAL1_Standard_RM.glb"
UAL2 = r"F:\!  BELLMOURN\Universal Animation Library 2[Standard]\Unreal-Godot\UAL2_Standard_RM.glb"
MODELS = r"F:\!    BM V2\!  GENERATED TRIPO MONSTERS\{}.glb"
# What each model is called in the game. The numbers are the zombies; the casters have clips of their own (caster.py).
NAMES = {**{str(n): (f"ZOMBIE {n}", f"zombie_{n}") for n in range(1, 7)}, "ogre": ("ZOMBIE OGRE", "zombie_ogre"), "necromancer": ("NECROMANCER", "necromancer"),
         "zombie_necromancer": ("ZOMBIE NECROMANCER", "zombie_necromancer"), "evil_wizard": ("EVIL WIZARD", "evil_wizard")}
SCENE = "ZombieRig"
FPS = 30
HEIGHT = 1.8
META_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "ual_clips.json")

# Only the first three are named for zombies, and all are in UAL2. A zombie also needs to be hit,
# to die and to rise, so those general clips come along from both files.
CLIPS = {
    "Zombie_Idle_Loop": UAL2, "Zombie_Walk_Fwd_Loop": UAL2, "Zombie_Scratch": UAL2,
    "Hit_Chest": UAL1, "Hit_Head": UAL1, "Hit_Knockback": UAL2, "Death01": UAL1, "LayToIdle": UAL2,
}
# Not shipped: motion the authored clips can lean on.
LOOPS = {"Zombie_Idle_Loop", "Zombie_Walk_Fwd_Loop"}

CORE = {"Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03", "Neck": "neck_01", "Head": "Head"}
LIMB = {"Shoulder": "clavicle", "Arm": "upperarm", "ForeArm": "lowerarm", "Hand": "hand", "UpLeg": "thigh", "Leg": "calf",
        "Foot": "foot", "ToeBase": "ball", "Toe_End": "ball_leaf"}
DIGITS = ("Index", "Middle", "Ring", "Pinky", "Thumb")
AIM = {"pelvis": "spine_01", "spine_01": "spine_02", "spine_02": "spine_03", "spine_03": "neck_01", "neck_01": "Head"}
for s in "lr":
    AIM.update({f"clavicle_{s}": f"upperarm_{s}", f"upperarm_{s}": f"lowerarm_{s}", f"lowerarm_{s}": f"hand_{s}", f"hand_{s}": f"middle_01_{s}",
                f"thigh_{s}": f"calf_{s}", f"calf_{s}": f"foot_{s}", f"foot_{s}": f"ball_{s}", f"ball_{s}": f"ball_leaf_{s}"})
    for d in DIGITS:
        d = d.lower()
        AIM.update({f"{d}_01_{s}": f"{d}_02_{s}", f"{d}_02_{s}": f"{d}_03_{s}", f"{d}_03_{s}": f"{d}_04_leaf_{s}"})


def ual_name(mixamo):
    n = mixamo.replace("mixamorig:", "")
    if n in CORE:
        return CORE[n]
    for side, s in (("Left", "l"), ("Right", "r")):
        if not n.startswith(side):
            continue
        rest = n[len(side):]
        if rest in LIMB:
            return f"{LIMB[rest]}_{s}"
        for d in DIGITS:
            if rest.startswith("Hand" + d):
                k = int(rest[-1])
                return f"{d.lower()}_{k:02d}{'_leaf' if k == 4 else ''}_{s}"
    return None


def scene():
    if bpy.context.window:
        sc = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
        bpy.context.window.scene = sc
    else:  # a background Blender has one scene and can't switch
        sc = bpy.context.scene
        sc.name = SCENE
    sc.render.fps, sc.render.fps_base = FPS, 1
    return sc


def channels(action):
    return action.layers[0].strips[0].channelbag(action.slots[0]).fcurves


def import_glb(path, heuristic="BLENDER"):
    objects, actions = set(bpy.data.objects), set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=path, disable_bone_shape=True, bone_heuristic=heuristic)
    new = [o for o in bpy.data.objects if o not in objects]
    for o in new:
        o.hide_set(True)
        o.hide_render = True
    return new, [a for a in bpy.data.actions if a not in actions]


def source_clips():
    """Import each UAL file once. Returns the first armature and {clip name: action}."""
    armature, found = bpy.data.objects.get("UAL_src"), {}
    if armature:
        return armature, {a["ual_clip"]: a for a in bpy.data.actions if "ual_clip" in a and not a.name.startswith("z_")}
    for path in (UAL1, UAL2):
        new, actions = import_glb(path)
        arm = next(o for o in new if o.type == "ARMATURE")
        if armature is None:
            armature = arm
            arm.name = "UAL_src"
        for a in actions:
            clip = re.sub(r"\.\d+$", "", a.name)
            if clip not in found:
                a["ual_clip"] = clip
                a.use_fake_user = True
                found[clip] = a
    return armature, found


def joint_targets(number):
    """Tripo joint positions by UAL name, with the model scaled to HEIGHT and on the floor."""
    src, mesh = bpy.data.objects.get(f"Z{number}_src"), bpy.data.objects.get(f"Z{number}_src_mesh")
    if not src:
        new, _ = import_glb(MODELS.format(NAMES[str(number)][0]), "TEMPERANCE")
        src = next(o for o in new if o.type == "ARMATURE")
        mesh = next(o for o in new if o.type == "MESH")
        src.name, mesh.name = f"Z{number}_src", f"Z{number}_src_mesh"
    return bone_targets(src, mesh) + (src, mesh)


def bone_targets(src, mesh):
    corners = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    floor = min(c.z for c in corners)
    scale = HEIGHT / (max(c.z for c in corners) - floor)
    out = {}
    for b in src.data.bones:
        name = ual_name(b.name)
        if name:
            p = src.matrix_world @ b.head_local
            out[name] = Vector((p.x, p.y, p.z - floor)) * scale
    return out, Matrix.Translation((0, 0, -floor * scale)) @ Matrix.Scale(scale, 4)


def fit_skeleton(rig, target):
    """Move bones onto the model's joints, aiming each with the smallest turn so its roll stays UAL's."""
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    bones = rig.data.edit_bones
    old = {b.name: (b.head.copy(), b.matrix.copy()) for b in bones}
    turn = {}
    for b in bones:
        b.use_connect = False
    for name, child in AIM.items():
        turn[name] = (old[child][0] - old[name][0]).rotation_difference(target[child] - target[name])
    for b in bones:
        if b.name not in target:
            continue
        parent = b.parent.name if b.parent else None
        q = turn.get(b.name) or (turn.get(parent) if b.name != "Head" else None)
        rot = old[b.name][1].to_3x3()
        if q:
            rot = q.to_matrix() @ rot
        m = rot.to_4x4()
        m.translation = target[b.name]
        child = AIM.get(b.name)
        length = (target[child] - target[b.name]).length if child else b.length * 0.5
        b.matrix = m
        b.length = max(length, 0.008)
    bpy.ops.object.mode_set(mode="OBJECT")


def bind_mesh(mesh_src, rig, to_rig, name):
    mesh = mesh_src.copy()
    mesh.data = mesh_src.data.copy()
    mesh.name = mesh.data.name = name
    bpy.context.scene.collection.objects.link(mesh)
    mesh.parent = None
    mesh.data.transform(to_rig @ mesh_src.matrix_world)
    mesh.matrix_world = Matrix.Identity(4)
    mesh.hide_set(False)
    mesh.hide_render = False
    for g in list(mesh.vertex_groups):
        ual = ual_name(g.name)
        if ual:
            g.name = ual
        else:
            used = any(any(e.group == g.index for e in v.groups) for v in mesh.data.vertices)
            if used:
                raise ValueError(f"{g.name} carries weight and has no UAL joint")
            mesh.vertex_groups.remove(g)
    clean_shoulders(mesh, rig)
    mods = [m for m in mesh.modifiers if m.type == "ARMATURE"] or [mesh.modifiers.new("Armature", "ARMATURE")]
    mods[0].object = rig
    mesh.parent = rig
    return mesh


def step(t):
    t = min(max(t, 0), 1)
    return t * t * (3 - 2 * t)


def clean_shoulders(mesh, rig):
    """Tripo's arm weights bleed up to a quarter metre into the chest, which tears the vest when the arm drops.

    In the T-pose the torso is what lies inside the shoulder joint and below the armpit, so arm weight
    fades out over both and passes to the ribs. Beyond the shoulder everything rides the arm, including
    the rags that hang well below it.
    """
    groups = mesh.vertex_groups
    high, low = groups["spine_03"], groups["spine_02"]
    for s, side in (("l", 1), ("r", -1)):
        joint = rig.data.bones[f"upperarm_{s}"].head_local
        for name, z0, z1, inner in ((f"upperarm_{s}", joint.z - .15, joint.z - .05, .07), (f"clavicle_{s}", joint.z - .24, joint.z - .08, .14)):
            g = groups[name]
            for v in mesh.data.vertices:
                if v.co.x * side <= 0:
                    continue
                w = next((e.weight for e in v.groups if e.group == g.index), 0)
                if not w:
                    continue
                across = v.co.x * side - joint.x * side
                keep = max(step((v.co.z - z0) / (z1 - z0)) * step((across + inner) / inner), step((across - .015) / .05))
                if keep < 1:
                    g.add([v.index], w * keep, "REPLACE")
                    (high if v.co.z > joint.z - .2 else low).add([v.index], w * (1 - keep), "ADD")
        blur_weights(mesh, lambda co: joint.x * side - .03 < co.x * side < joint.x * side + .11 and joint.z - .25 < co.z < joint.z - .02,
                     (f"upperarm_{s}", f"clavicle_{s}", "spine_03", "spine_02"), .04)
    hip = rig.data.bones["pelvis"].head_local
    blur_weights(mesh, lambda co: abs(co.x) < .07 and hip.z - .3 < co.z < hip.z - .03, ("thigh_l", "thigh_r", "pelvis"), .05)


def blur_weights(mesh, inside, names, radius):
    """Average these bones' weights between nearby vertices, so limbs hand over smoothly where they meet.

    The mesh is unwelded quads, so neighbours are found by position. Each vertex keeps its total for
    these bones, which leaves its weights on any other bone in proportion.
    """
    verts = mesh.data.vertices
    groups = [mesh.vertex_groups[n] for n in names]
    index = {g.index: k for k, g in enumerate(groups)}
    ids = [v.index for v in verts if inside(v.co)]
    tree = kdtree.KDTree(len(ids))
    weights = {}
    for i in ids:
        tree.insert(verts[i].co, i)
        row = np.zeros(len(groups))
        for e in verts[i].groups:
            if e.group in index:
                row[index[e.group]] = e.weight
        weights[i] = row
    tree.balance()
    for i in ids:
        mix = np.zeros(len(groups))
        for _, j, d in tree.find_range(verts[i].co, radius):
            mix += weights[j] * (1 - d / radius)
        total = mix.sum()
        if total > 0:
            mix *= weights[i].sum() / total
            for g, w in zip(groups, mix):
                g.add([i], float(w), "REPLACE")


def adopt_clip(action, pelvis_scale, forward, prefix="z_"):
    """A copy of the UAL clip without root motion and with pelvis travel scaled to the model's legs."""
    old = bpy.data.actions.get(prefix + action["ual_clip"])
    if old:
        bpy.data.actions.remove(old)
    copy = action.copy()
    copy.name = prefix + action["ual_clip"]
    del copy["ual_clip"]
    copy.use_fake_user = True
    fcurves = channels(copy)
    root = {}
    for fc in list(fcurves):
        if 'bones["root"]' in fc.data_path and fc.data_path.endswith("location"):
            root[fc.array_index] = fc.keyframe_points[-1].co[1] - fc.keyframe_points[0].co[1]
            fcurves.remove(fc)
        elif 'bones["pelvis"]' in fc.data_path and fc.data_path.endswith("location"):
            for k in fc.keyframe_points:
                k.co[1] *= pelvis_scale
                k.handle_left[1] *= pelvis_scale
                k.handle_right[1] *= pelvis_scale
    start, end = copy.frame_range
    frames = int(round(end - start))
    meta = {"frames": frames, "loop": action["ual_clip"] in LOOPS, "fps": FPS, "duration": frames / FPS, "speed": 0}
    travel = sum(v * v for v in root.values()) ** 0.5 * pelvis_scale
    if travel > 0.01:
        if meta["loop"]:
            meta["speed"] = travel / (frames / FPS)
        else:
            meta["root"] = {"start": 0, "end": frames, "dist": travel if max(root.values(), key=abs) * forward > 0 else -travel, "ramp": 0}
    return copy, meta


def play(rig, action, frame=None):
    rig.animation_data_create()
    rig.animation_data.action = action
    rig.animation_data.action_slot = action.slots[0]
    start, end = action.frame_range
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = int(start), int(end)
    bpy.context.scene.frame_set(int(start if frame is None else frame))


def build(number=1):
    sc = scene()
    source, clips = source_clips()
    name = NAMES[str(number)][1]
    os.makedirs(os.path.dirname(META_PATH), exist_ok=True)
    for old in (name + "_mesh", name + "_rig"):
        if old in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[old])
    target, to_rig, src, src_mesh = joint_targets(number)

    rig = bpy.data.objects.new(name + "_rig", source.data.copy())
    sc.collection.objects.link(rig)
    rig.rotation_mode = "QUATERNION"
    rig.hide_set(False)
    ual_thigh = source.data.bones["thigh_l"].head_local.z
    fit_skeleton(rig, target)
    mesh = bind_mesh(src_mesh, rig, to_rig, name + "_mesh")
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"

    pelvis_scale = target["thigh_l"].z / ual_thigh
    meta = {}
    walk_root = [k for fc in channels(clips["Zombie_Walk_Fwd_Loop"]) if 'bones["root"]' in fc.data_path and fc.data_path.endswith("location")
                 for k in [fc.keyframe_points[-1].co[1] - fc.keyframe_points[0].co[1]]]
    forward = 1 if max(walk_root, key=abs) > 0 else -1
    for clip in CLIPS:
        action, meta[clip] = adopt_clip(clips[clip], pelvis_scale, forward)
    play(rig, bpy.data.actions["z_Zombie_Walk_Fwd_Loop"])
    json.dump(meta, open(META_PATH, "w"), indent=1)
    print("clips available", len(clips), "pelvis scale", round(pelvis_scale, 3))
    print("adopted", {k: (v["frames"], round(v["speed"], 3), v.get("root", {}).get("dist")) for k, v in meta.items()})
    return rig, mesh, meta
