"""Run inside Blender, through Blender MCP: exec(open(path).read(), dict(__file__=path, __name__="__main__")).

Builds assets/fp/arms_staff.glb, in a scene of its own: the right arm of art/fp_staff/arms_holding_staff.glb with its stick cut out,
on a skeleton, carrying a staff as Bellmourn did (tools/templates/anims.py there, STAFF_CARRY and R1S_CAST): upright at the right
of the view, held a third of the way down. A cast lifts it straight up, tips the head forward a little and fires from the head, then
settles back. The staff itself comes from the pack, hung on `weapon`, so the file holds the arm and its clips alone.

Blender's axes are the arms' eye frame, the eye at the origin: x right, y ahead, z up. The clips are bone tracks, solved here: the
fist and the staff follow the keys, the wrist rides on the fist, and the elbow goes where a two-bone arm from the shoulder puts it.
"""
import json
import math
import os
import struct

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SOURCE = os.path.join(ROOT, "art", "fp_staff", "arms_holding_staff.glb")
OUT = os.path.join(ROOT, "assets", "fp", "arms_staff.glb")
ITEM = os.path.join(ROOT, "assets", "game", "items", "crystal_staff.glb")
SCENE = "StaffArm"
HZ = 60

# The sculpt's old stick, its bottom and top on the axis, and where the fist's middle lies along it.
STICK = (np.array((0.209, 0.288, 0.0)), np.array((0.2265, 0.2345, 0.69)))
FIST_T = 0.43
# Shoulder, elbow and wrist on the sculpt, from its cross-sections.
ARM = dict(S=(0.415, -0.235, 0.165), E=(0.385, -0.035, 0.215), W=(0.262, 0.155, 0.365))
FINGER_T = dict(index=0.05, middle=0.02, ring=-0.01, pinky=-0.04)
FINGER_ARC = [(50, 0.046), (105, 0.056), (165, 0.042), (-130, 0.028)]
THUMB = [(-0.025, -25, 0.055), (0.005, -60, 0.052), (0.035, -90, 0.038), (0.055, -118, 0.030)]
DIGITS = ("thumb", "index", "middle", "ring", "pinky")
ELBOW_BLEND, WRIST_BLEND = 0.060, (0.022, 0.026)
FINGER_R = dict(thumb=0.030, finger=0.021)
TWIST_AT = (0.42, 0.75)

# The carry: where the fist sits in the eye's frame, and the way the staff's top leans.
CARRY_FIST = np.array((0.51, 0.62, -0.55))
CARRY_AXIS = (-0.05, 0.05, 1.0)
GRIP = 0.20                                 # how far below its usual place the fist holds the shaft
TIP = 0.49                                  # the staff's head, up the shaft from the usual place: bolts leave from here
FOV, NEAR = 76.0, 0.05
# time, then the fist's move from the carry (right, ahead, up, metres), then the tilt (forward, inward, degrees)
CAST = [(0.00, 0.000, 0.000, 0.000, 0.0, 0.0),
        (0.08, 0.000, 0.000, -0.025, -1.5, 0.0),
        (0.18, -0.055, 0.015, 0.135, 1.5, 2.0),
        (0.26, -0.100, 0.030, 0.220, 4.0, 4.0),
        (0.34, -0.115, 0.040, 0.235, 9.0, 6.0),
        (0.40, -0.115, 0.075, 0.230, 18.0, 7.0),
        (0.46, -0.112, 0.055, 0.242, 13.5, 6.0),
        (0.60, -0.085, 0.030, 0.185, 8.0, 4.0),
        (0.78, -0.032, 0.008, 0.058, 1.5, 1.5),
        (0.90, 0.004, -0.002, -0.006, -0.6, -0.2),
        (1.00, 0.000, 0.000, 0.000, 0.0, 0.0)]
CAST_AT = dict(wind=0.24, hit=0.40, through=0.55)
WALK_T, WALK = 0.92, dict(x=0.012, z=0.018, rock=1.5)
IDLE_K = 0.4


def un(v):
    return v / np.linalg.norm(v)


def frame(y, ref):
    y = un(np.asarray(y, float))
    x = ref - y * (ref @ y)
    x = un(x)
    return np.c_[x, y, np.cross(x, y)]


def rotation_between(a, b):
    a, b = un(a), un(b)
    v = np.cross(a, b)
    k = np.array(((0, -v[2], v[1]), (v[2], 0, -v[0]), (-v[1], v[0], 0)))
    return np.eye(3) + k + k @ k / (1 + a @ b)


def axis_rot(ax, deg):
    return np.array(Matrix.Rotation(math.radians(deg), 3, Vector(ax)))


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cut_arm(scene):
    """The right arm, without the stick: the stick is told from the skin by where it is and its paint, far more saturated than any skin."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    src = next(o for o in bpy.data.objects if o not in before)
    me = src.data
    tex = next(n for n in me.materials[0].node_tree.nodes if n.type == "TEX_IMAGE" and "basecolor" in n.image.name)
    W, H = tex.image.size
    px = np.empty(W * H * tex.image.channels, np.float32)
    tex.image.pixels.foreach_get(px)
    px = px.reshape(H, W, -1)[:, :, :3]
    V = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    uv = np.empty(len(me.loops) * 2)
    me.uv_layers[0].data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)
    vi = np.empty(len(me.loops), int)
    me.loops.foreach_get("vertex_index", vi)
    tri = vi.reshape(-1, 3)
    cen = V[tri].mean(1)
    u = uv.reshape(-1, 3, 2).mean(1)
    col = px[np.clip((u[:, 1] * H).astype(int), 0, H - 1), np.clip((u[:, 0] * W).astype(int), 0, W - 1)]
    sat = (col.max(1) - col.min(1)) / np.maximum(col.max(1), 1e-3)
    b, ax = STICK[0], un(STICK[1] - STICK[0])
    d = cen - b
    r = np.linalg.norm(d - (d @ ax)[:, None] * ax, axis=1)
    near = r < 0.04
    stick = (near & (sat > 0.72) & (col.max(1) < 0.55)) | (near & ((cen[:, 2] > 0.515) | (cen[:, 2] < 0.33)))
    kill = (cen[:, 0] <= 0) | stick
    arm = me.copy()
    arm.name = "staff_arm"
    bm = bmesh.new()
    bm.from_mesh(arm)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in np.where(kill)[0]], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(arm)
    bm.free()
    bpy.data.objects.remove(src)
    ob = bpy.data.objects.new("staff_arm", arm)
    scene.collection.objects.link(ob)
    print(f"arm: {len(arm.vertices)} verts, {len(arm.polygons)} faces; {int(stick.sum())} faces of stick cut")
    return ob


def bind_of():
    """The sculpt moved so its fist and its stick's axis are the carry's: at rest the arm is in the carry."""
    b, ax = STICK[0], un(STICK[1] - STICK[0])
    fist0 = b + ax * FIST_T
    R = rotation_between(ax, np.array(CARRY_AXIS, float))
    return (lambda p: R @ (np.asarray(p, float) - fist0) + CARRY_FIST), R, fist0, ax


def joints():
    place, Rb, fist0, ax0 = bind_of()
    ax = Rb @ ax0
    S, E, W = (place(ARM[k]) for k in "SEW")
    fist = CARRY_FIST.copy()
    ud, fd = un(E - S), un(W - E)
    hinge = un(np.cross(ud, fd))
    B = {}

    def add(name, parent, p, R, length=0.04):
        B[name] = dict(parent=parent, p=np.asarray(p, float), R=R, len=length)

    add("root", None, np.zeros(3), np.eye(3), 0.05)
    add("upperarm_R", "root", S, frame(ud, hinge), np.linalg.norm(E - S))
    F = np.linalg.norm(W - E)
    add("forearm_R", "upperarm_R", E, frame(fd, hinge), F)
    for i, a in enumerate(TWIST_AT):
        add(f"forearm_twist{i + 1}_R", "forearm_R", E + fd * F * a, frame(fd, hinge), 0.03)
    add("hand_R", "forearm_R", W, frame(un(fist - W), ax), np.linalg.norm(fist - W))
    ref = W - fist
    ref = un(ref - ax * (ref @ ax))
    side = np.cross(ax, ref)

    def at(t, th, r):
        return fist + ax * t + r * (math.cos(math.radians(th)) * ref + math.sin(math.radians(th)) * side)

    for dg in DIGITS:
        pts = [at(*q) for q in THUMB] if dg == "thumb" else [at(FINGER_T[dg], *q) for q in FINGER_ARC]
        parent = "hand_R"
        for i, p in enumerate(pts):
            nm = f"{dg}_{'end' if i == 3 else f'0{i + 1}'}_R"
            y = pts[i + 1] - p if i < 3 else p - pts[i - 1]
            add(nm, parent, p, frame(y, ax), np.linalg.norm(y))
            parent = nm
    across = un(np.array((1.0, 0, 0)) - ax * ax[0])
    Rw = np.c_[np.cross(ax, across), ax, across]
    add("weapon", "hand_R", fist + ax * GRIP, Rw, TIP)
    add("weapon_tip", "weapon", fist + ax * (GRIP + TIP), Rw, 0.04)
    info = dict(S=S, E=E, W=W, fist=fist, U=np.linalg.norm(E - S), F=F, hinge=hinge, ax=ax, Rw=Rw)
    return B, info


def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)


def skin(ob, B, I):
    """Along the limb by planes across the elbow and wrist, each digit's bones claiming the skin within reach, then smoothed along the surface."""
    me = ob.data
    V = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", V)
    V = V.reshape(-1, 3)
    names = list(B)
    index = {n: i for i, n in enumerate(names)}
    W = np.zeros((len(V), len(names)))
    ud, fd, hd = un(I["E"] - I["S"]), un(I["W"] - I["E"]), un(I["fist"] - I["W"])
    fore = smoothstep(-ELBOW_BLEND, ELBOW_BLEND, (V - I["E"]) @ un(ud + fd))
    hand = smoothstep(-WRIST_BLEND[0], WRIST_BLEND[1], (V - I["W"]) @ un(fd + hd * 0.4))
    u = ((V - I["E"]) @ fd) / I["F"]
    t1 = smoothstep(TWIST_AT[0] - 0.22, TWIST_AT[0] + 0.08, u)
    t2 = smoothstep(TWIST_AT[1] - 0.17, TWIST_AT[1] + 0.13, u)
    w_hand, w_arm = fore * hand, fore * (1 - hand)
    W[:, index["upperarm_R"]] = 1 - fore
    W[:, index["forearm_R"]] = w_arm * (1 - t1)
    W[:, index["forearm_twist1_R"]] = w_arm * t1 * (1 - t2)
    W[:, index["forearm_twist2_R"]] = w_arm * t1 * t2
    hm = w_hand > 1e-4
    ph = V[hm]
    claims = {}
    sn = ("01", "02", "03", "end")
    for dg in DIGITS:
        R0 = FINGER_R["thumb" if dg == "thumb" else "finger"]
        for i in range(3):
            d = seg_dist(ph, B[f"{dg}_{sn[i]}_R"]["p"], B[f"{dg}_{sn[i + 1]}_R"]["p"])
            claims[f"{dg}_{sn[i]}_R"] = np.clip(1 - d / (R0 * (0.85 if i == 0 else 1.0)), 0, 1) ** 2
    C = np.stack(list(claims.values()), 1)
    total = C.sum(1) + 0.04
    for j, n in enumerate(claims):
        W[np.where(hm)[0], index[n]] = w_hand[hm] * C[:, j] / total
    W[np.where(hm)[0], index["hand_R"]] = w_hand[hm] * 0.04 / total
    W[np.where(~hm)[0], index["hand_R"]] = w_hand[~hm]
    # Smoothing along the surface, seams included.
    _, wid = np.unique(np.round(V / 1e-5).astype(np.int64), axis=0, return_inverse=True)
    wid = wid.ravel()
    n = wid.max() + 1
    W0 = np.zeros((n, W.shape[1]))
    np.add.at(W0, wid, W)
    W0 /= np.maximum(np.bincount(wid, minlength=n), 1)[:, None]
    tri = np.empty(len(me.polygons) * 3, int)
    me.polygons.foreach_get("vertices", tri)
    tri = wid[tri.reshape(-1, 3)]
    e = np.unique(np.sort(np.vstack([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]), axis=1), axis=0)
    deg = np.maximum(np.bincount(e.ravel(), minlength=n), 1)[:, None]
    for _ in range(3):
        acc = np.zeros_like(W0)
        np.add.at(acc, e[:, 0], W0[e[:, 1]])
        np.add.at(acc, e[:, 1], W0[e[:, 0]])
        W0 = 0.5 * W0 + 0.5 * acc / deg
    W = W0[wid]
    order = np.argsort(-W, axis=1)[:, :4]
    wts = np.take_along_axis(W, order, 1)
    wts /= np.maximum(wts.sum(1, keepdims=True), 1e-9)
    groups = [ob.vertex_groups.new(name=n) for n in names]
    for i in range(len(V)):
        for j in range(4):
            if wts[i, j] > 1e-4:
                groups[order[i, j]].add([i], float(wts[i, j]), "REPLACE")


def make_armature(scene, ob, B):
    arm = bpy.data.armatures.new("arms_staff")
    rig = bpy.data.objects.new("arms_staff", arm)
    scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for n, b in B.items():
        eb = arm.edit_bones.new(n)
        M = np.eye(4)
        M[:3, :3], M[:3, 3] = b["R"], b["p"]
        eb.length = max(b["len"], 0.01)
        eb.matrix = Matrix(M.tolist())
        eb.length = max(b["len"], 0.01)
        eb.use_deform = True
    for n, b in B.items():
        if b["parent"]:
            arm.edit_bones[n].parent = arm.edit_bones[b["parent"]]
    bpy.ops.object.mode_set(mode="OBJECT")
    ob.parent = rig
    ob.modifiers.new("arm", "ARMATURE").object = rig
    return rig


def solve(B, I, pos, deg_f, deg_i, rock=0.0):
    """One frame: the world rotations of the arm's bones, and the shoulder if the arm can't reach."""
    forward = axis_rot((1, 0, 0), deg_f + rock * 0.5)          # top of the staff away from the eye
    inward = axis_rot((0, 1, 0), -deg_i + rock)               # top of the staff toward the crosshair
    Rd = inward @ forward
    fist = I["fist"] + pos
    W = fist + Rd @ (I["W"] - I["fist"])
    S = I["S"].copy()
    d = W - S
    L = np.linalg.norm(d)
    reach = (I["U"] + I["F"]) * 0.995
    if L > reach:
        S = S + d * (1 - reach / L)
        d = W - S
        L = reach
    dn = d / L
    a = (I["U"] ** 2 - I["F"] ** 2 + L * L) / (2 * L)
    h = math.sqrt(max(I["U"] ** 2 - a * a, 1e-9))
    d0 = un(I["W"] - I["S"])
    pole = (I["E"] - I["S"]) - d0 * ((I["E"] - I["S"]) @ d0)
    perp = un(pole - dn * (pole @ dn))
    E = S + dn * a + perp * h
    ud, fd = un(E - S), un(W - E)
    hinge = un(np.cross(ud, fd))
    return dict(S=S, Ru=frame(ud, hinge), Rf=frame(fd, hinge), Rh=Rd @ B["hand_R"]["R"])


def twist_angle(Rf, Rh, Rf0, Rh0):
    Qd = (Rf.T @ Rh) @ (Rf0.T @ Rh0).T
    q = Matrix(Qd.tolist()).to_quaternion()
    a = 2 * math.atan2(q.y, q.w)
    return (a + math.pi) % (2 * math.pi) - math.pi


def key_clip(rig, B, I, name, frames):
    """frames: one solve() per frame. Local tracks, from a bone's rest against its parent's."""
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    rot = dict(upperarm_R="Ru", forearm_R="Rf", hand_R="Rh")
    pb = rig.pose.bones
    for k, f in enumerate(frames):
        frame_no = k + 1
        world = {n: f[key] for n, key in rot.items()}
        for n in rot:
            par = B[n]["parent"]
            Rrest_local = (B[par]["R"].T if par in world else np.eye(3)) @ B[n]["R"]
            Rpose_local = (world[par].T if par in world else np.eye(3)) @ world[n]
            basis = Rrest_local.T @ Rpose_local
            pb[n].rotation_mode = "QUATERNION"
            pb[n].rotation_quaternion = Matrix(basis.tolist()).to_quaternion()
            pb[n].keyframe_insert("rotation_quaternion", frame=frame_no)
        dS = f["S"] - I["S"]
        pb["upperarm_R"].location = Vector(B["upperarm_R"]["R"].T @ dS)
        pb["upperarm_R"].keyframe_insert("location", frame=frame_no)
        tw = twist_angle(f["Rf"], f["Rh"], B["forearm_R"]["R"], B["hand_R"]["R"])
        for i, frac in ((1, 1 / 3), (2, 2 / 3)):
            n = f"forearm_twist{i}_R"
            pb[n].rotation_mode = "QUATERNION"
            pb[n].rotation_quaternion = Quaternion((0, 1, 0), tw * frac)
            pb[n].keyframe_insert("rotation_quaternion", frame=frame_no)
    return act


def catmull(keys, t):
    keys = np.array(keys)
    T, Y = keys[:, 0], keys[:, 1:]
    i = min(int(np.searchsorted(T, t, side="right")) - 1, len(T) - 2)
    i = max(i, 0)
    h = T[i + 1] - T[i]
    m = lambda j: np.zeros(Y.shape[1]) if j <= 0 or j >= len(T) - 1 else (Y[j + 1] - Y[j - 1]) / (T[j + 1] - T[j - 1])
    s = (t - T[i]) / h
    return (2 * s**3 - 3 * s**2 + 1) * Y[i] + (s**3 - 2 * s**2 + s) * h * m(i) + (-2 * s**3 + 3 * s**2) * Y[i + 1] + (s**3 - s**2) * h * m(i + 1)


def clips(B, I):
    out = {}
    n = int(round(CAST[-1][0] * HZ)) + 1
    frames = []
    for k in range(n):
        v = catmull(CAST, k / HZ)
        frames.append(solve(B, I, v[:3], v[3], v[4]))
    out["staff_cast"] = frames

    def carry(amount):
        n_ = int(round(WALK_T * HZ)) + 1
        fr = []
        for k in range(n_):
            a = 2 * math.pi * k / (n_ - 1)
            fr.append(solve(B, I, np.array((WALK["x"] * math.sin(a), 0.0, WALK["z"] * math.sin(2 * a))) * amount, 0.0, 0.0, WALK["rock"] * math.sin(a) * amount))
        return fr

    out["staff_walk"] = carry(1.0)
    out["staff_idle"] = carry(IDLE_K)
    return out


def export(rig, ob, names):
    """Each clip its own action. The meta the game reads goes into the scene's extras afterwards."""
    # (As NLA tracks: "ACTIONS" would take every action in the open file along, whoever's they are.)
    for name in names:
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, bpy.data.actions[name])
        track.mute = True
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, use_active_scene=True, export_yup=True, export_apply=False,
                              export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True, export_frame_step=1, export_skins=True,
                              export_def_bones=False, export_morph=False, export_lights=False, export_cameras=False, export_tangents=False,
                              export_normals=True, export_texcoords=True, export_materials="EXPORT", export_image_format="AUTO", export_extras=False)
    raw = open(OUT, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    fov = FOV
    meta = dict(kind="staff", idle="staff_idle", walk="staff_walk", combo=["staff_cast"], view=dict(fov=fov, near=NEAR), nice=dict(staff_cast="Cast from the staff"),
                sword=dict(id="crystal_staff", tip=TIP), clips=dict(
        staff_idle=dict(duration=WALK_T, loop=True, walk=True, rest=True),
        staff_walk=dict(duration=WALK_T, loop=True, walk=True, rest=True),
        staff_cast=dict(duration=CAST[-1][0], loop=False, rest=True, wind=CAST_AT["wind"], on=CAST_AT["wind"], hit=CAST_AT["hit"], through=CAST_AT["through"])))
    j["scenes"][j.get("scene", 0)]["extras"] = meta
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    chunk = raw[20 + jl:]
    with open(OUT, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + len(chunk)))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(chunk)
    print(f"wrote {OUT}: {os.path.getsize(OUT) / 1e6:.2f} MB; {[a['name'] for a in j['animations']]}; joints {len(j['skins'][0]['joints'])}")


def review(scene, rig):
    """To look through: a camera on the eye, and the staff on its bone."""
    cam = bpy.data.cameras.new("eye")
    cam.sensor_fit = "VERTICAL"
    cam.angle = math.radians(FOV)
    cam.clip_start = NEAR
    co = bpy.data.objects.new("eye", cam)
    co.rotation_euler = (math.pi / 2, 0, 0)
    scene.collection.objects.link(co)
    scene.camera = co
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.fps = HZ
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=ITEM)
    st = next(o for o in bpy.data.objects if o not in before and o.type == "MESH")
    for o in [o for o in bpy.data.objects if o not in before and o is not st]:
        bpy.data.objects.remove(o)
    st.name = "held_staff"
    st.parent = rig
    st.parent_type = "BONE"
    st.parent_bone = "weapon"
    # (A bone child hangs from the bone's tail, and glTF's y-up import turned the item: laid back along the bone's own axes.)
    st.rotation_mode = "QUATERNION"
    st.matrix_parent_inverse = Matrix.Identity(4)
    st.location = (0, -rig.data.bones["weapon"].length, 0)
    st.rotation_quaternion = Quaternion((1, 0, 0), -math.pi / 2)
    t = bpy.data.objects.new("crosshair", None)
    t.empty_display_type = "PLAIN_AXES"
    t.empty_display_size = 0.02
    t.location = (0, 2, 0)
    scene.collection.objects.link(t)


def build():
    scene = bpy.data.scenes.get(SCENE) or bpy.data.scenes.new(SCENE)
    bpy.context.window.scene = scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    for a in [a for a in bpy.data.actions if a.name.startswith("staff_")]:
        bpy.data.actions.remove(a)
    scene.render.fps = HZ
    ob = cut_arm(scene)
    place, Rb, _, _ = bind_of()
    M = np.eye(4)
    M[:3, :3], M[:3, 3] = Rb, place((0, 0, 0))
    ob.data.transform(Matrix(M.tolist()))       # (the normals turn with it)
    ob.data.update()
    B, I = joints()
    skin(ob, B, I)
    rig = make_armature(scene, ob, B)
    made = clips(B, I)
    for name, frames in made.items():
        key_clip(rig, B, I, name, frames)
    print(f"upper {I['U']:.3f}  fore {I['F']:.3f}  shoulder {I['S'].round(3)}  wrist {I['W'].round(3)}")
    for name, frames in made.items():
        moved = max(np.linalg.norm(f["S"] - I["S"]) for f in frames)
        print(f"{name}: {len(frames)} frames, shoulder eased {moved:.3f}")
    rig.animation_data.action = None
    export(rig, ob, list(made))
    review(scene, rig)
    return rig


if __name__ == "__main__":
    build()
