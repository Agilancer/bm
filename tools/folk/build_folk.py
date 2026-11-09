"""The townsfolk's bodies, from the owner's Tripo models.  In a background Blender:

    blender -b --factory-startup --python-exit-code 1 --python tools/folk/build_folk.py -- [ids...]

For each model in tools/folk/models.json: the person stood at their own height with their feet on the ground, cut down to
their triangle budget, at most four bone weights a vertex, and written with its skeleton but no clips and no paint to
assets/game/folk/<id>.glb. The paint is tools/folk/paint.py's. A model that came without a skeleton (`donor`) gets its
donor's, with the arms drawn out or in to its own span, and the donor's skin weights carried over to it by nearest surface.

Tripo cuts its UV seams open in the mesh, and a collapse decimation tears those open edges apart (cracked faces, smeared
paint). So the seams are welded first and held by the Decimate modifier's vertex group (seams, the head and the hands
weighted so they lose the fewest triangles; a weight of exactly 1 would make Blender skip those edges and miss the
budget), and afterwards every decimated face is laid back onto the source UV island it lies on, so the source maps
fit it as they are. A model flagged "skirt" in models.json also gets a _SKIRT vertex attribute (0..1, as Lisandra's
gown has) on the cloth that hangs below mid-thigh away from the legs, and folk.json its skirt centre (the hips' x, z)
and leg radii (Lisandra's, scaled by the hip span), for the game's cloth-off-the-legs pass.

Every Tripo rig keeps its bind pose only in its inverse bind matrices, its joints all at the origin. Blender's importer
rebuilds the bones from those, and its exporter writes them back as the joints' own rest transforms, which is what the
game's retargeting (src/sim/folk/rig.js) reads.
"""
import json
import math
import os
import sys

import bmesh
import bpy
import mathutils
import mathutils.bvhtree
import mathutils.geometry

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CFG = json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))
OUT = os.environ.get("FOLK_OUT") or os.path.join(ROOT, "assets", "game", "folk")
# Lisandra's legRadii (src/core/lisandra.js, pretty, in metres at her size) and the span between her hip joints there.
LISANDRA_LEG_RADII = (0.095, 0.068, 0.058)
LISANDRA_HIP_SPAN = 0.187
SKIRT_GAP = (0.012, 0.04)
SKIRT_ALL = bool(os.environ.get("FOLK_SKIRT_ALL"))
SEAM_HOLD = float(os.environ.get("FOLK_SEAM_HOLD", 1000))
SEAM_WEIGHT = float(os.environ.get("FOLK_SEAM_WEIGHT", 0.95))
HEAD_WEIGHT = float(os.environ.get("FOLK_HEAD_WEIGHT", 0.99))
HAND_WEIGHT = float(os.environ.get("FOLK_HAND_WEIGHT", 0.9))
ARM_CHAIN = ("Shoulder", "Arm", "ForeArm", "Hand", "HandThumb", "HandIndex", "HandMiddle", "HandRing", "HandPinky")


def log(*a):
    print("FOLK", *a, flush=True)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def override(obj):
    return bpy.context.temp_override(object=obj, active_object=obj, selected_objects=[obj], selected_editable_objects=[obj])


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        # The importer's bone-display sphere.
        if o.type == "MESH" and o.name.lower().startswith("icosphere") and not o.find_armature():
            bpy.data.objects.remove(o, do_unlink=True)
            new.remove(o)
    arm = next((o for o in new if o.type == "ARMATURE"), None)
    mesh = max((o for o in new if o.type == "MESH"), key=lambda o: len(o.data.vertices))
    # Flatten: no empties above, every transform applied, so model space is world space.
    for o in (arm, mesh):
        if o is None:
            continue
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in new:
        if o.type == "EMPTY" and o.name in bpy.data.objects:
            bpy.data.objects.remove(o, do_unlink=True)
    for o in (arm, mesh):
        if o is None:
            continue
        with override(o):
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if arm:
        mesh.parent = arm
        mod = next((m for m in mesh.modifiers if m.type == "ARMATURE"), None) or mesh.modifiers.new("Armature", "ARMATURE")
        mod.object = arm
        arm.data.pose_position = "REST"
    return arm, mesh


def bounds(mesh):
    zs = [v.co.z for v in mesh.data.vertices]
    xs = [v.co.x for v in mesh.data.vertices]
    ys = [v.co.y for v in mesh.data.vertices]
    return min(xs), max(xs), min(ys), max(ys), min(zs), max(zs)


def transform(arm, mesh, m):
    """Apply a model-space transform to the mesh and the bones' rest."""
    mesh.data.transform(m)
    mesh.data.update()
    if arm:
        arm.data.transform(m)


def bone_head(arm, name):
    b = arm.data.bones.get("mixamorig:" + name)
    return b.head_local.copy() if b else None


def span(mesh, z, band=0.05):
    """How far out the arms reach, at height z, each side."""
    left = max((v.co.x for v in mesh.data.vertices if abs(v.co.z - z) < band), default=0.0)
    right = min((v.co.x for v in mesh.data.vertices if abs(v.co.z - z) < band), default=0.0)
    return left, right


def give_skeleton(mesh, donor_id):
    """Fit the donor's skeleton to this mesh and carry its skin weights over."""
    d = CFG["models"][donor_id]
    arm, dmesh = import_glb(os.path.join(CFG["src"], d["file"]))
    # Same height, same feet.
    x0, x1, y0, y1, z0, z1 = bounds(mesh)
    dx0, dx1, dy0, dy1, dz0, dz1 = bounds(dmesh)
    s = (z1 - z0) / (dz1 - dz0)
    m = mathutils.Matrix.Translation((0, 0, z0)) @ mathutils.Matrix.Scale(s, 4) @ mathutils.Matrix.Translation((-(dx0 + dx1) / 2, -(dy0 + dy1) / 2, -dz0))
    transform(arm, dmesh, m)
    mesh.data.transform(mathutils.Matrix.Translation((-(x0 + x1) / 2, -(y0 + y1) / 2, 0)))
    # Draw the arms out or in to this one's reach in its T: each side's chain stretched along x from the shoulder.
    shoulder_z = bone_head(arm, "LeftArm").z
    tl, tr = span(mesh, shoulder_z)
    dl, dr = span(dmesh, shoulder_z)
    bpy.context.view_layer.objects.active = arm
    with override(arm):
        bpy.ops.object.mode_set(mode="EDIT")
        for side, t_tip, d_tip in (("Left", tl, dl), ("Right", tr, dr)):
            root = arm.data.edit_bones["mixamorig:" + side + "Arm"].head.x
            k = (t_tip - root) / (d_tip - root) if abs(d_tip - root) > 1e-3 else 1.0
            for b in arm.data.edit_bones:
                n = b.name.replace("mixamorig:", "")
                if n.startswith(side) and n[len(side):].startswith(ARM_CHAIN) and not n[len(side):].startswith("Shoulder"):
                    b.head.x = root + (b.head.x - root) * k
                    b.tail.x = root + (b.tail.x - root) * k
            log("arm", side, round(k, 3))
        bpy.ops.object.mode_set(mode="OBJECT")
    # The donor's weights, by nearest face.
    for g in dmesh.vertex_groups:
        if g.name not in mesh.vertex_groups:
            mesh.vertex_groups.new(name=g.name)
    dt = mesh.modifiers.new("weights", "DATA_TRANSFER")
    dt.object = dmesh
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"
    dt.layers_vgroup_select_dst = "NAME"
    with override(mesh):
        bpy.ops.object.modifier_apply(modifier=dt.name)
    bpy.data.objects.remove(dmesh, do_unlink=True)
    mesh.parent = arm
    mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    return arm


def weld(mesh):
    """Tripo cuts the surface apart at every UV seam. Weld it whole again (the seams live on in the UVs), so the
    decimation cannot open cracks along them and the shading runs smooth across, and keep the seam's vertices in a
    group, _seam, for the decimation to hold still."""
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    seam = {v.index for v in bm.verts if v.is_boundary}
    bm.free()
    # The face and head too: QEM sees a face as nearly flat and would leave it a few dozen triangles. The hands as well, or the fingers melt into mittens.
    head = {mesh.vertex_groups[n].index for n in ("mixamorig:Head", "mixamorig:HeadTop_End", "mixamorig:Neck") if n in mesh.vertex_groups}
    hand = {g.index for g in mesh.vertex_groups if "Hand" in g.name}
    g = mesh.vertex_groups.new(name="_seam")
    for v in mesh.data.vertices:
        h = sum(x.weight for x in v.groups if x.group in head)
        f = sum(x.weight for x in v.groups if x.group in hand)
        w = max(SEAM_WEIGHT if v.index in seam else 0.0, HEAD_WEIGHT * min(1.0, h), HAND_WEIGHT * min(1.0, f))
        if w > 0:
            g.add([v.index], w, "REPLACE")
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.to_mesh(mesh.data)
    bm.free()
    with override(mesh):
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
    mesh.data.shade_smooth()
    mesh.data.update()


def decimate(mesh, ratio):
    """Collapse edges down to ratio of the triangles. An edge touching a seam vertex costs a great deal more, so the
    interior of each UV island goes first: moving a seam vertex drags the texture on one side of the seam with it."""
    dec = mesh.modifiers.new("dec", "DECIMATE")
    dec.decimate_type = "COLLAPSE"
    dec.ratio = ratio
    dec.use_collapse_triangulate = True
    dec.vertex_group = "_seam"
    dec.invert_vertex_group = True
    dec.vertex_group_factor = SEAM_HOLD
    while mesh.modifiers[0] != dec:
        with override(mesh):
            bpy.ops.object.modifier_move_up(modifier=dec.name)
    with override(mesh):
        bpy.ops.object.modifier_apply(modifier=dec.name)


class UvSource:
    """The cut-apart surface as it came, before welding: each UV island (a piece of the cut surface) on its own, to
    put a decimated corner back on the island its face belongs to and read the UV there."""

    def __init__(self, mesh):
        me = mesh.data
        me.calc_loop_triangles()
        uv = me.uv_layers.active.data
        co = [v.co.copy() for v in me.vertices]
        tris = [tuple(t.vertices) for t in me.loop_triangles]
        self.uv = [tuple(mathutils.Vector((uv[l].uv[0], uv[l].uv[1], 0)) for l in t.loops) for t in me.loop_triangles]
        self.co = [tuple(co[i] for i in t) for t in tris]
        parent = list(range(len(co)))

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a
        for a, b, c in tris:
            ra, rb, rc = find(a), find(b), find(c)
            parent[rb] = ra
            parent[find(rc)] = ra
        self.island = [find(t[0]) for t in tris]
        flat = [p for t in self.uv for p in t]
        self.uv_tree = mathutils.bvhtree.BVHTree.FromPolygons(flat, [(3 * i, 3 * i + 1, 3 * i + 2) for i in range(len(tris))])
        members = {}
        for i, k in enumerate(self.island):
            members.setdefault(k, []).append(i)
        self.trees = {}
        for k, ts in members.items():
            pts = [p for i in ts for p in self.co[i]]
            self.trees[k] = (mathutils.bvhtree.BVHTree.FromPolygons(pts, [(3 * j, 3 * j + 1, 3 * j + 2) for j in range(len(ts))]), ts)

    def repair(self, mesh):
        """Each decimated face onto the island whose surface it lies on, and each corner's UV read from there: a seam
        vertex the decimation moved no longer drags its far side's texture along."""
        me = mesh.data
        uv = me.uv_layers.active.data
        moved = 0
        for f in me.polygons:
            corners = [(l, me.vertices[me.loops[l].vertex_index].co) for l in f.loop_indices]
            cands = {self.island[self.uv_tree.find_nearest(mathutils.Vector((uv[l].uv[0], uv[l].uv[1], 0)))[2]] for l, _ in corners}
            best = min(cands, key=lambda k: sum(self.trees[k][0].find_nearest(p)[3] for _, p in corners))
            tree, ts = self.trees[best]
            for l, p in corners:
                q, _, j, _ = tree.find_nearest(p)
                i = ts[j]
                a, b, c = self.co[i]
                ua, ub, uc = self.uv[i]
                w = mathutils.geometry.barycentric_transform(q, a, b, c, ua, ub, uc)
                if (mathutils.Vector(uv[l].uv) - w.xy).length > 0.002:
                    moved += 1
                uv[l].uv = w.xy
        return moved


def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def skirt(arm, mesh, height):
    """For a long skirt or gown, what the game's skinning pass needs to keep it outside the walking legs (as for
    Lisandra: tools/lisandra_skirt.py, src/core/lisandra.js, SKIN in src/gfx/shaders.js):

    _SKIRT, a point attribute from 0 to 1 on the free-hanging cloth: 1 well clear of the legs (each leg a tapered
    capsule along its bones, legRadii wide, each shoe its bones' outline from above down to the floor), 0 on the legs
    and shoes themselves and on the arms (a noble's hanging sleeves), faded out above the middle of the thigh, where
    the cloth follows the hips.  Only for the bodies models.json marks "skirt": the men's coats and aprons hang over
    baggy breeches wider than any leg, which this would mark too.
    center, the hips joint's x and z in the glb's space (+Z forward), as Lisandra's skirtCenter.
    legRadii, the leg's radius at the hip joint, the knee and the ankle: Lisandra's, in proportion to the space
    between this body's hip joints (her thighs fill hers; so do everyone's). Under a gown there is no leg in the mesh
    to measure, and the boots below a village skirt measure inside these."""
    head = lambda side, n: arm.data.bones["mixamorig:" + side + n].head_local
    sep = (head("Left", "UpLeg") - head("Right", "UpLeg")).length
    k = sep / LISANDRA_HIP_SPAN
    radii = [round(r * k, 3) for r in LISANDRA_LEG_RADII]
    segs, feet = [], []
    for side in ("Left", "Right"):
        joints = [head(side, n) for n in ("UpLeg", "Leg", "Foot", "ToeBase")]
        end = arm.data.bones.get("mixamorig:" + side + "Toe_End")
        joints.append(end.head_local if end else joints[-1])
        segs += [(joints[i], joints[i + 1], radii[i], radii[i + 1]) for i in range(2)]
        # A shoe: its bones seen from above, standing down to the floor, so heel and sole count as foot too.
        flat = [mathutils.Vector((j.x, j.y, 0)) for j in joints[2:]]
        feet += [(flat[0], flat[1]), (flat[1], flat[2])]
    ankle_z = max(head(side, "Foot").z for side in ("Left", "Right"))
    foot_r = radii[2] * 1.15
    hip_z = head("Left", "UpLeg").z
    knee_z = head("Left", "Leg").z
    mid = (hip_z + knee_z) / 2
    arms = {g.index for g in mesh.vertex_groups if any(c in g.name for c in ("Shoulder", "Arm", "Hand"))}
    values = []
    for v in mesh.data.vertices:
        p = v.co
        gap = 1.0
        for a, b, ra, rb in segs:
            q, t = mathutils.geometry.intersect_point_line(p, a, b)
            t = min(1.0, max(0.0, t))
            gap = min(gap, (p - a.lerp(b, t)).length - (ra + (rb - ra) * t))
        if p.z < ankle_z + 0.03:
            f = mathutils.Vector((p.x, p.y, 0))
            for a, b in feet:
                q, t = mathutils.geometry.intersect_point_line(f, a, b)
                t = min(1.0, max(0.0, t))
                gap = min(gap, (f - a.lerp(b, t)).length - foot_r)
        arm_w = sum(g.weight for g in v.groups if g.group in arms)
        values.append(smooth(SKIRT_GAP[0], SKIRT_GAP[1], gap) * (1 - smooth(mid - 0.02 * height, mid + 0.03 * height, p.z)) * (1 - min(1.0, 2 * arm_w)))
    hips = arm.data.bones["mixamorig:Hips"].head_local
    # Below the knee, how much of the way round the cloth goes: a gown all of it, a split coat or an apron part.
    ring = [math.atan2(v.co.x - hips.x, -v.co.y + hips.y) for v, w in zip(mesh.data.vertices, values) if w > 0.9 and v.co.z < knee_z]
    cover = len({int((a + math.pi) / (2 * math.pi) * 36) % 36 for a in ring}) / 36
    hem = min((v.co.z for v, w in zip(mesh.data.vertices, values) if w > 0.5), default=None)
    return values, {"center": [round(hips.x, 3), round(-hips.y, 3)], "legRadii": radii}, cover, hem, knee_z


def update_manifest(mid, entry):
    """This body's line in assets/game/folk/folk.json; paint.py's maps (c, n, m) are kept, a skirt dropped if gone."""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import manifest

    def change(doc):
        old = doc["models"].get(mid, {})
        new = {"glb": entry["glb"], **{k: old[k] for k in ("c", "n", "m") if k in old}}
        new.update((k, v) for k, v in entry.items() if k != "glb")
        doc["models"][mid] = new
    manifest.update(OUT, change)


def build(mid):
    m = CFG["models"][mid]
    reset()
    arm, mesh = import_glb(os.path.join(CFG["src"], m["file"]))
    if arm is None:
        arm = give_skeleton(mesh, m["donor"])
    # Their own height, feet on the ground, centred over the feet.
    x0, x1, y0, y1, z0, z1 = bounds(mesh)
    s = m["height"] / (z1 - z0)
    feet = [v.co for v in mesh.data.vertices if v.co.z < z0 + 0.04 * (z1 - z0)]
    cx = sum(c.x for c in feet) / len(feet)
    cy = sum(c.y for c in feet) / len(feet)
    transform(arm, mesh, mathutils.Matrix.Scale(s, 4) @ mathutils.Matrix.Translation((-cx, -cy, -z0)))
    # Down to budget, the UV seams held.
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    src = UvSource(mesh)
    weld(mesh)
    if tris > m["tris"]:
        decimate(mesh, m["tris"] / tris)
    moved = src.repair(mesh)
    mesh.vertex_groups.remove(mesh.vertex_groups["_seam"])
    with override(mesh):
        bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    out_tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    hips = bone_head(arm, "Hips")
    head = bone_head(arm, "Head")
    entry = {"glb": mid + ".glb", "height": m["height"], "hips": round(hips.z, 3), "head": round(head.z, 3),
             "joints": len(arm.data.bones), "tris": out_tris}
    if m.get("skirt") or SKIRT_ALL:
        values, info, cover, hem, knee = skirt(arm, mesh, m["height"])
        attr = mesh.data.attributes.new("_SKIRT", "FLOAT", "POINT")
        attr.data.foreach_set("value", values)
        log("skirt", mid, info, "round", round(cover, 2), "hem", round(hem, 3) if hem is not None else None, "knee", round(knee, 3),
            "marked", sum(1 for x in values if x > 0.5))
        if m.get("skirt"):
            entry["skirt"] = info
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, mid + ".glb")
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_animations=False, export_skins=True,
                              export_materials="NONE", export_yup=True, export_apply=False, export_texcoords=True, export_normals=True,
                              export_morph=False, export_extras=False, export_attributes=True)
    update_manifest(mid, entry)
    log("built", mid, "tris", tris, "->", out_tris, "verts", len(mesh.data.vertices), "hips", round(hips.z, 3), "head", round(head.z, 3),
        "bones", len(arm.data.bones), "uv fixed", moved, "kb", os.path.getsize(path) // 1024)


ids = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
for mid in ids or list(CFG["models"]):
    build(mid)
