"""The casters' clips. Run inside Blender.

The three caster models come from Tripo with motion of their own, on its skeleton. Each clip is baked onto the
fitted UAL skeleton, from the armature in the file that holds it, by keeping each bone's turn away from the T-pose
in world space. Being hit, dying and throwing a bolt come from UAL, like the zombies' hits.
"""
import bpy
from mathutils import Quaternion

import clips
import rig as riglib

CASTERS = ("necromancer", "zombie_necromancer", "evil_wizard")
# name in the game: (model file that has it, its clip there, loop)
TRIPO = {
    "idle": ("NECROMANCER", "idle", True),
    "walk": ("NECROMANCER", "Slow, menacing walk with longer strides.", True),
    "run": ("NECROMANCER", "run", True),
    "hex": ("EVIL WIZARD", "cast_a_spell", False),
    "summon": ("NECROMANCER", "Make the character swing his arms like he's casting a very powe", False),
}
UAL = {"bolt": "Spell_Simple_Shoot", "hit": "Hit_Chest", "death": "Death01"}
FPS = riglib.FPS


def home(file):
    """The armature of a caster's source file, with its clips. Imported once."""
    arm = bpy.data.objects.get("home_" + file)
    if arm:
        return arm
    new, actions = riglib.import_glb(riglib.MODELS.format(file), "TEMPERANCE")
    arm = next(o for o in new if o.type == "ARMATURE")
    arm.name = "home_" + file
    arm["to_rig"] = riglib.bone_targets(arm, next(o for o in new if o.type == "MESH"))[1].to_scale()[0]
    arm["clips"] = {a.name.rsplit(".", 1)[0]: a.name for a in actions}
    for a in actions:
        a.use_fake_user = True
    return arm


def bake(target, file, clip, name):
    arm = home(file)
    action = bpy.data.actions[arm["clips"][clip]]
    riglib.play(arm, action)
    sc = bpy.context.scene
    world = arm.matrix_world.to_quaternion()
    pairs = [(riglib.ual_name(b.name), b.name) for b in arm.data.bones]
    pairs = [(u, n) for u, n in pairs if u]
    source_rest = {u: world @ arm.data.bones[n].matrix_local.to_quaternion() for u, n in pairs}
    rest = {b.name: b.matrix_local.to_quaternion() for b in target.data.bones}
    order = sorted(target.data.bones, key=lambda b: len(b.parent_recursive))
    hips = next(n for u, n in pairs if u == "pelvis")
    hips0 = (arm.matrix_world @ arm.data.bones[hips].head_local) * arm["to_rig"]
    start, end = int(action.frame_range[0]), int(action.frame_range[1])
    frames = max(2, end - start)  # imported at the scene's rate, which is ours
    poses, pelvis = [], []
    for f in range(frames + 1):
        sc.frame_set(start + f)
        turn = {u: (world @ arm.pose.bones[n].matrix.to_quaternion()) @ source_rest[u].inverted() for u, n in pairs}
        posed, frame = {}, {}
        for b in order:
            parent = b.parent.name if b.parent else None
            d = turn.get(b.name) or posed.get(parent) or Quaternion()
            posed[b.name] = d
            pd = posed.get(parent, Quaternion()) if parent else Quaternion()
            frame[b.name] = rest[b.name].inverted() @ pd.inverted() @ d @ rest[b.name]
        poses.append(frame)
        pelvis.append((arm.matrix_world @ arm.pose.bones[hips].head) * arm["to_rig"] - hips0)
    # In place: what the clip travels goes to the game, as with the zombies' clips.
    run = pelvis[-1] - pelvis[0]
    run.z = 0
    speed = run.length / (frames / FPS) if run.length > .1 else 0
    to_bone = rest["pelvis"].inverted()
    write(name, poses, [to_bone @ (p - run * (i / frames)) for i, p in enumerate(pelvis)])
    return dict(frames=frames, fps=FPS, duration=frames / FPS, speed=speed)


def write(name, poses, pelvis):
    old = bpy.data.actions.get("z_" + name)
    if old:
        bpy.data.actions.remove(old)
    action = bpy.data.actions.new("z_" + name)
    action.use_fake_user = True
    slot = action.slots.new("OBJECT", "rig")
    bag = action.layers.new("layer").strips.new(type="KEYFRAME").channelbag(slot, ensure=True)
    count = len(poses)

    def key(path, index, group, values):
        fc = bag.fcurves.new(path, index=index, group_name=group)
        fc.keyframe_points.add(count)
        fc.keyframe_points.foreach_set("co", [v for f in range(count) for v in (f, values[f])])
        fc.update()

    for bone in poses[0]:
        for i in range(4):
            key(f'pose.bones["{bone}"].rotation_quaternion', i, bone, [p[bone][i] for p in poses])
    for i in range(3):
        key('pose.bones["pelvis"].location', i, "pelvis", [p[i] for p in pelvis])
    return action


def build(rig, mesh):
    meta = clips.build(rig, mesh, only=("crawl", "crawl_attack"))
    for name, (file, clip, loop) in TRIPO.items():
        meta[name] = dict(bake(rig, file, clip, name), loop=loop)
    _, ual = riglib.source_clips()
    for name, clip in UAL.items():
        copy, m = riglib.adopt_clip(ual[clip], 1.0, 1)
        old = bpy.data.actions.get("z_" + name)
        if old and old != copy:
            bpy.data.actions.remove(old)
        copy.name = "z_" + name
        meta[name] = m
    print({k: (v["frames"], round(v["speed"], 2)) for k, v in meta.items()})
    return meta
