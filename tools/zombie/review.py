"""Contact sheets and motion measurements for the zombie's clips. Run inside Blender.

The measurements read the evaluated rig and skinned mesh, not the plan: foot slip against the
moving floor, sole depth, one-frame joint jumps, elbow, knee and wrist angles, hands inside the
body, and how far the skin stretches.
"""
import json
import math
import os

import bpy
import numpy as np
from mathutils import Vector

import body as bodylib
import clips as cliplib
import rig as riglib

VIEWS = {"front": (0, -1, .08), "side": (1, 0, .08), "three_quarter": (-.8, -.75, .22)}
CELL = (200, 250)
LIMBS = ("thigh", "calf", "foot", "upperarm", "lowerarm", "hand", "clavicle")
TRUNK = ("pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "Head")


def stage():
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "STUDIO"
    sc.display.shading.color_type = "TEXTURE"
    sc.display.shading.show_shadows = True
    sc.display.shading.show_cavity = True
    sc.display.shading.background_type = "VIEWPORT"
    sc.display.shading.background_color = (.32, .36, .38)
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.exposure = 1.35
    sc.render.resolution_x, sc.render.resolution_y = CELL
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    cam = bpy.data.objects.get("review_cam")
    if not cam:
        data = bpy.data.cameras.new("review_cam")
        data.lens = 60
        cam = bpy.data.objects.new("review_cam", data)
        sc.collection.objects.link(cam)
    sc.camera = cam
    floor = bpy.data.objects.get("review_floor")
    if not floor:
        n = 40
        size = .2
        verts = [(x * size, y * size, 0) for y in range(-n, n + 1) for x in range(-n, n + 1)]
        faces, w = [], 2 * n + 1
        for y in range(2 * n):
            for x in range(2 * n):
                faces.append((y * w + x, y * w + x + 1, (y + 1) * w + x + 1, (y + 1) * w + x))
        me = bpy.data.meshes.new("review_floor")
        me.from_pydata(verts, [], faces)
        floor = bpy.data.objects.new("review_floor", me)
        sc.collection.objects.link(floor)
        mats = [bpy.data.materials.new("review_a"), bpy.data.materials.new("review_b")]
        mats[0].diffuse_color = (.2, .23, .25, 1)
        mats[1].diffuse_color = (.26, .29, .31, 1)
        me.materials.append(mats[0])
        me.materials.append(mats[1])
        for i, p in enumerate(me.polygons):
            p.material_index = (i % (2 * n) + i // (2 * n)) % 2
    floor.hide_render = False
    return cam


def aim(cam, view, center=(0, -.1, .95), dist=3.95):
    d = Vector(VIEWS[view]).normalized()
    eye = Vector(center) + d * dist
    cam.location = eye
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = (Vector(center) - eye).to_track_quat("-Z", "Y")


def render_cell(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return px.reshape(h, w, 4)


def save_sheet(rows, path):
    h, w = rows.shape[:2]
    img = bpy.data.images.new("sheet", w, h)
    img.pixels.foreach_set(rows.ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)


def sample_frames(n, count):
    return [round(i * n / count) for i in range(count)]


def contact_sheet(rig, action, out_dir, count=8, frames=None):
    """Rows are views, columns are frames, with time running left to right."""
    cam = stage()
    riglib.play(rig, action)
    start, end = (int(v) for v in action.frame_range)
    picks = frames or sample_frames(end - start, count)
    tmp = os.path.join(out_dir, "_cell.png")
    rows = []
    for view in reversed(VIEWS):
        aim(cam, view)
        cells = []
        for f in picks:
            bpy.context.scene.frame_set(start + f)
            cells.append(render_cell(tmp))
        rows.append(np.hstack(cells))
    path = os.path.join(out_dir, action.name[2:] + ".png")
    save_sheet(np.vstack(rows), path)
    if os.path.exists(tmp):
        os.remove(tmp)
    return path, picks


def overview(rig, names, out_path, view="three_quarter", count=8):
    """One row per clip, to compare a family at a glance."""
    cam = stage()
    aim(cam, view)
    tmp = out_path + "_cell.png"
    rows = []
    for name in reversed(names):
        action = bpy.data.actions["z_" + name]
        riglib.play(rig, action)
        start, end = (int(v) for v in action.frame_range)
        cells = []
        for f in sample_frames(end - start, count):
            bpy.context.scene.frame_set(start + f)
            cells.append(render_cell(tmp))
        rows.append(np.hstack(cells))
    save_sheet(np.vstack(rows), out_path)
    if os.path.exists(tmp):
        os.remove(tmp)


def turned(a, b):
    """Degrees between two rotations, the short way round."""
    d = math.degrees(a.rotation_difference(b).angle)
    return min(d, 360 - d)


def angle(a, b):
    return math.degrees(a.angle(b)) if a.length and b.length else 0


def segment_distance(p, a, b):
    ab = b - a
    t = max(min((p - a).dot(ab) / max(ab.dot(ab), 1e-9), 1), 0)
    return (a + ab * t - p).length


def mesh_points(mesh, dg):
    ev = mesh.evaluated_get(dg)
    me = ev.to_mesh()
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    return co.reshape(-1, 3)


def edges_of(mesh):
    e = np.empty(len(mesh.data.edges) * 2, dtype=np.int32)
    mesh.data.edges.foreach_get("vertices", e)
    return e.reshape(-1, 2)


def measure(rig, mesh, name, make=None):
    """Numbers for one clip. `make` gives the plan, for slip: UAL clips have none, so skip it."""
    action = bpy.data.actions["z_" + name]
    riglib.play(rig, action)
    sc = bpy.context.scene
    start, end = (int(v) for v in action.frame_range)
    n = end - start
    plan = make(bodylib.Body(rig, mesh)) if make else None
    bones = rig.pose.bones
    dg = bpy.context.evaluated_depsgraph_get()
    edges = edges_of(mesh)
    rest = np.empty(len(mesh.data.vertices) * 3, dtype=np.float32)
    mesh.data.vertices.foreach_get("co", rest)
    rest = rest.reshape(-1, 3)
    rest_len = np.linalg.norm(rest[edges[:, 0]] - rest[edges[:, 1]], axis=1) + 1e-6
    watch = LIMBS + TRUNK
    quats = {}
    slip = {"l": 0.0, "r": 0.0}
    prev_ball = {}
    low = (9.0, -1)
    elbow = {"l": [180, 0], "r": [180, 0]}
    knee = {"l": [180, 0], "r": [180, 0]}
    wrist = {"l": 0.0, "r": 0.0}
    wrist_at = {"l": -1, "r": -1}
    inside = (9.0, "", -1)
    stretch = (0.0, -1)
    p999 = 0.0
    reach_hand = 0.0
    speed_hand = {"l": 0.0, "r": 0.0}
    prev_hand = {}
    drive = {s: dict(path=0.0, arm=0.0, wrist=0.0) for s in "lr"}
    prev_q = {}
    for f in range(n + 1):
        sc.frame_set(start + f)
        dg = bpy.context.evaluated_depsgraph_get()
        for b in watch:
            for s in ("_l", "_r") if b in LIMBS else ("",):
                pb = bones[b + s]
                quats.setdefault(b + s, []).append(pb.matrix.to_quaternion())
        pts = mesh_points(mesh, dg)
        z = float(pts[:, 2].min())
        if z < low[0]:
            low = (z, f)
        if f % 4 == 0:
            ln = np.linalg.norm(pts[edges[:, 0]] - pts[edges[:, 1]], axis=1) / rest_len
            big = rest_len > .008
            m = float(ln[big].max())
            p999 = max(p999, float(np.percentile(ln[big], 99.9)))
            if m > stretch[0]:
                stretch = (m, f)
        for s in "lr":
            ball = bones[f"ball_{s}"].head.copy()
            if plan and f > 0 and all(plan.feet[s][g]["stance"] and plan.feet[s][g]["phi"] >= 0 for g in (f - 1, f)):
                moved = plan.floor(f) - plan.floor(f - 1)
                slip[s] = max(slip[s], (ball - prev_ball[s] - Vector((0, moved, 0))).length)
            prev_ball[s] = ball
            sh, el, wr = bones[f"upperarm_{s}"].head, bones[f"lowerarm_{s}"].head, bones[f"hand_{s}"].head
            a = 180 - angle(sh - el, wr - el)
            elbow[s] = [min(elbow[s][0], a), max(elbow[s][1], a)]
            th, ca, ft = bones[f"thigh_{s}"].head, bones[f"calf_{s}"].head, bones[f"foot_{s}"].head
            k = 180 - angle(th - ca, ft - ca)
            knee[s] = [min(knee[s][0], k), max(knee[s][1], k)]
            fingers = bones[f"middle_01_{s}"].head - wr
            bend = angle(wr - el, fingers)
            if bend > wrist[s]:
                wrist[s], wrist_at[s] = bend, f
            fore_q, hand_q = bones[f"lowerarm_{s}"].matrix.to_quaternion(), bones[f"hand_{s}"].matrix.to_quaternion()
            if s in prev_hand:
                step_len = (wr - prev_hand[s]).length
                speed_hand[s] = max(speed_hand[s], step_len * bodylib.FPS)
                if step_len * bodylib.FPS > 2.0:  # how the hand gets there while it is really moving
                    drive[s]["path"] += step_len
                    drive[s]["arm"] += turned(fore_q, prev_q[s][0])
                    was = prev_q[s][0].rotation_difference(prev_q[s][1])
                    now = fore_q.rotation_difference(hand_q)
                    drive[s]["wrist"] += turned(was, now)
            prev_hand[s] = wr.copy()
            prev_q[s] = (fore_q, hand_q)
            for b1, b2, r, tag in ((f"thigh_{o}", f"calf_{o}", .085, "thigh") for o in "lr"):
                d = segment_distance(wr, bones[b1].head, bones[b2].head) - r
                if d < inside[0]:
                    inside = (d, f"{s} wrist in {b1}", f)
            for b1, b2, r in (("pelvis", "spine_03", .15), ("spine_03", "Head", .11)):
                d = segment_distance(wr, bones[b1].head, bones[b2].head) - r
                if d < inside[0]:
                    inside = (d, f"{s} wrist in {b1}-{b2}", f)
    heights = {}
    for f in ATTACK_IMPACTS.get(name, ()):
        sc.frame_set(start + f)
        heights[f] = {j: round(bones[j].head.z, 2) for j in ("hand_l", "hand_r", "Head")}
    chain = {}
    if name in ATTACK_CHAINS:
        s, f0, f1 = ATTACK_CHAINS[name]
        for b in ("pelvis", "spine_03", f"upperarm_{s}", f"lowerarm_{s}", f"hand_{s}"):
            turn = [turned(quats[b][f], quats[b][f - 1]) for f in range(f0, f1 + 1)]
            chain[b] = f0 + int(np.argmax(turn))
    jump = (0.0, "", -1)
    seam = (0.0, "")
    for b, q in quats.items():
        for f in range(1, n + 1):
            d = turned(q[f], q[f - 1])
            if d > jump[0]:
                jump = (d, b, f)
        if plan and plan.loop:
            d = math.degrees(q[0].rotation_difference(q[n]).angle)
            d = min(d, 360 - d)
            if d > seam[0]:
                seam = (d, b)
    return dict(
        frames=n,
        foot_slip_mm={s: round(v * 1000, 1) for s, v in slip.items()},
        lowest_vertex_mm=(round(low[0] * 1000, 1), low[1]),
        worst_joint_jump_deg_per_frame=(round(jump[0], 1), jump[1], jump[2]),
        loop_seam_deg=(round(seam[0], 2), seam[1]),
        elbow_flex_deg={s: [round(v) for v in elbow[s]] for s in "lr"},
        knee_flex_deg={s: [round(v) for v in knee[s]] for s in "lr"},
        wrist_bend_max_deg={s: (round(wrist[s]), wrist_at[s]) for s in "lr"},
        hand_speed_max_m_s={s: round(speed_hand[s], 2) for s in "lr"},
        impact_heights_m=heights,
        strike_peak_turn_frame=chain,
        fast_hand_travel_m={s: round(drive[s]["path"], 2) for s in "lr"},
        fast_forearm_turn_deg={s: round(drive[s]["arm"]) for s in "lr"},
        fast_wrist_turn_deg={s: round(drive[s]["wrist"]) for s in "lr"},
        wrist_clearance_to_body_m=(round(inside[0], 3), inside[1], inside[2]),
        edge_stretch_max=(round(stretch[0], 2), stretch[1]),
        edge_stretch_999th=round(p999, 2),
    )


def measure_all(rig, mesh, out_path, only=None):
    out = {}
    if os.path.exists(out_path):
        out = json.load(open(out_path))
    for name, make in cliplib.ALL.items():
        if only and name not in only:
            continue
        out[name] = measure(rig, mesh, name, make)
    json.dump(out, open(out_path, "w"), indent=1)
    return out


ATTACK_FRAMES = {
    "attack_rake": [0, 6, 10, 13, 16, 19, 23, 33], "attack_flurry": [0, 6, 12, 16, 19, 27, 32, 45],
    "attack_bite": [0, 7, 14, 20, 29, 36, 46, 56], "attack_pounce": [0, 12, 18, 22, 27, 31, 36, 50],
}
# The frames a blow lands and the strike's chain, for the numbers a first-person player cares about.
ATTACK_IMPACTS = {"attack_rake": [18, 23, 33], "attack_flurry": [19, 32, 45], "attack_bite": [15, 29, 36, 46], "attack_pounce": [27, 36, 44]}
ATTACK_CHAINS = {"attack_rake": ("r", 11, 24), "attack_flurry": ("r", 11, 24), "attack_bite": ("r", 6, 20), "attack_pounce": ("r", 16, 30)}
UAL_GROUPS = {
    "ual_zombie": ["Zombie_Idle_Loop", "Zombie_Walk_Fwd_Loop", "Zombie_Scratch"],
    "ual_reactions": ["Hit_Chest", "Hit_Head", "Hit_Knockback", "Death01", "LayToIdle"],
}


def beauty(rig, out_path):
    """Real materials: the idle from four sides, then a pose from each family."""
    sc = bpy.context.scene
    cam = stage()
    sc.render.engine = "BLENDER_EEVEE"
    sc.view_settings.exposure = 0
    sc.render.resolution_x, sc.render.resolution_y = 400, 500
    if not bpy.data.objects.get("review_sun"):
        sun = bpy.data.lights.new("review_sun", "SUN")
        o = bpy.data.objects.new("review_sun", sun)
        sc.collection.objects.link(o)
        o.rotation_euler = (.9, .2, -.5)
    bpy.data.objects["review_sun"].data.energy = 3
    if not sc.world:
        sc.world = bpy.data.worlds.new("review_world")
    sc.world.use_nodes = True
    bg = next(n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND")
    bg.inputs[0].default_value = (.5, .55, .6, 1)
    bg.inputs[1].default_value = .55
    VIEWS["back"] = (.15, 1, .1)
    shots = [("Zombie_Idle_Loop", 10, v) for v in ("front", "side", "back", "three_quarter")]
    shots += [("walk_reach", 11, "three_quarter"), ("run_charge", 5, "three_quarter"), ("attack_rake", 20, "three_quarter"), ("attack_bite", 30, "side")]
    cells = []
    for name, f, view in shots:
        riglib.play(rig, bpy.data.actions["z_" + name], f)
        aim(cam, view, dist=3.3)
        cells.append(render_cell(out_path + "_cell.png"))
    del VIEWS["back"]
    save_sheet(np.vstack([np.hstack(cells[4:]), np.hstack(cells[:4])]), out_path)
    os.remove(out_path + "_cell.png")
    sc.render.resolution_x, sc.render.resolution_y = CELL


def all_sheets(rig, mesh, out_dir, only=None):
    index = {}
    for name in cliplib.ALL:
        if only and name not in only:
            continue
        path, picks = contact_sheet(rig, bpy.data.actions["z_" + name], out_dir, frames=ATTACK_FRAMES.get(name))
        index[name] = picks
    if not only:
        for key, names in UAL_GROUPS.items():
            overview(rig, names, os.path.join(out_dir, key + ".png"))
        beauty(rig, os.path.join(out_dir, "beauty.png"))
        stage()
    return index


def stretch_map(rig, mesh, names, every=2):
    """Where the skin stretches most: worst ratio per vertex over the clips, reported as 5 cm clusters."""
    edges = edges_of(mesh)
    count = len(mesh.data.vertices)
    rest = np.empty(count * 3, dtype=np.float32)
    mesh.data.vertices.foreach_get("co", rest)
    rest = rest.reshape(-1, 3)
    rest_len = np.linalg.norm(rest[edges[:, 0]] - rest[edges[:, 1]], axis=1) + 1e-6
    usable = rest_len > .008
    worst = np.ones(count)
    for name in names:
        action = bpy.data.actions["z_" + name]
        riglib.play(rig, action)
        start, end = (int(v) for v in action.frame_range)
        for f in range(start, end + 1, every):
            bpy.context.scene.frame_set(f)
            pts = mesh_points(mesh, bpy.context.evaluated_depsgraph_get())
            ratio = np.linalg.norm(pts[edges[:, 0]] - pts[edges[:, 1]], axis=1) / rest_len
            ratio[~usable] = 1
            np.maximum.at(worst, edges[:, 0], ratio)
            np.maximum.at(worst, edges[:, 1], ratio)
    return rest, worst


def stretch_clusters(rest, worst, over=2.0, top=10):
    keys = {}
    for p, w in zip(rest[worst > over], worst[worst > over]):
        k = tuple(np.round(p / .05).astype(int))
        c = keys.setdefault(k, [0, 0.0])
        c[0] += 1
        c[1] = max(c[1], float(w))
    rows = sorted(keys.items(), key=lambda kv: -kv[1][0])[:top]
    return int((worst > over).sum()), [(tuple(round(float(x) * .05, 2) for x in k), n, round(w, 1)) for k, (n, w) in rows]


def stretch_heatmap(rig, mesh, worst, out_path):
    """Paint the worst stretch on the model: white under 1.4x, through yellow to red at 3x, on the T-pose from four sides."""
    me = mesh.data
    attr = me.color_attributes.get("stretch") or me.color_attributes.new("stretch", "BYTE_COLOR", "POINT")
    t = np.clip((worst - 1.4) / 1.6, 0, 1)
    colors = np.stack([np.full_like(t, .9), .9 * (1 - t), .9 * (1 - t) ** 3, np.ones_like(t)], 1)
    attr.data.foreach_set("color", colors.astype(np.float32).ravel())
    me.color_attributes.active_color = attr
    cam = stage()
    sc = bpy.context.scene
    sc.display.shading.color_type = "VERTEX"
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
    sc.render.resolution_x, sc.render.resolution_y = 400, 500
    VIEWS["back"], VIEWS["left"] = (0, 1, .1), (1, .02, .1)
    cells = []
    for view in ("front", "back", "left"):
        aim(cam, view, dist=4.6, center=(0, 0, .95))
        cells.append(render_cell(out_path + "_cell.png"))
    del VIEWS["back"], VIEWS["left"]
    save_sheet(np.hstack(cells), out_path)
    os.remove(out_path + "_cell.png")
    sc.display.shading.color_type = "TEXTURE"
    sc.render.resolution_x, sc.render.resolution_y = CELL
    me.color_attributes.remove(attr)
