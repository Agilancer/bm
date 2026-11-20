# Takes actions out of Blender as "motions": for every bone, each frame, how it's turned from its rest (in the world's
# space, so it doesn't matter how Blender's bones lie against the file's joints), and where the hips have gone. Run inside
# Blender (the Blender MCP), after tools/anim/gait.py; tools/anim/write.py puts motions into the game's files.
#
#   E = bpy.app.driver_namespace['export']
#   E.motion(rig, 'A_run', '.../motions/wizard/run.json', name='run')
import bpy, json, os


def motion(rig, action, out, name=None, extra=None):
    G = bpy.app.driver_namespace['gait']
    arm = rig.arm
    act = bpy.data.actions[action]
    G.use_action(arm, act)
    sc = bpy.context.scene
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    Mo = arm.matrix_world
    Ro = Mo.to_quaternion(); M3 = Mo.to_3x3()
    bones = [b.name for b in arm.data.bones]
    q0 = {b.name: b.matrix_local.to_quaternion() for b in arm.data.bones}
    p0 = arm.data.bones[rig.hips].head_local.copy()
    turns = {b: [] for b in bones}; hips = []
    # (glTF's axes from Blender's: x, z, -y.)
    ax = lambda v: [round(v.x, 6), round(v.z, 6), round(-v.y, 6)]
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        for b in bones:
            pb = arm.pose.bones[b]
            d = Ro @ (pb.matrix.to_quaternion() @ q0[b].inverted()) @ Ro.inverted()
            turns[b].append([round(d.w, 6), round(d.x, 6), round(d.z, 6), round(-d.y, 6)])
        hips.append(ax(M3 @ (arm.pose.bones[rig.hips].matrix.translation - p0)))
    # Only the bones the gait poses are kept: the rest ride on them.
    posed = set(rig.posed)
    moving = {b: t for b, t in turns.items() if b in posed}
    data = dict(name=name or action, fps=sc.render.fps, frames=f1 - f0 + 1, loop=True, seconds=(f1 - f0) / sc.render.fps,
                hips=rig.hips, hips_delta=hips, turns=moving,
                travel=act.get('travel'), speed=act.get('speed'), gait=act.get('gait'), steps=G.STRIDES * 2)
    if extra: data.update(extra)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    return dict(name=data['name'], frames=data['frames'], bones=len(moving))


class _NS: pass
E = _NS(); E.motion = motion
bpy.app.driver_namespace['export'] = E
