"""Write the zombie's GLBs and clip list. Run inside Blender.

Clips export from NLA tracks on the rig, so nothing else in the open file can leak in: the glTF
exporter's ACTIONS mode gathers every compatible action in the file, and the file holds other rigs.
"""
import json
import os

import bpy

import clips as cliplib
import rig as riglib

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(REPO, "assets", "monsters", "zombie")


def set_tracks(arm, names, prefix="z_"):
    arm.animation_data_create()
    data = arm.animation_data
    data.action = None
    for t in list(data.nla_tracks):
        data.nla_tracks.remove(t)
    for name in names:
        action = bpy.data.actions[prefix + name]
        track = data.nla_tracks.new()
        track.name = name
        start, end = action.frame_range
        strip = track.strips.new(name, int(start), action)
        strip.frame_end = end
        strip.extrapolation = "NOTHING"
        track.mute = False
    for pb in arm.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.scale = (1, 1, 1)


def export(path, objects, active, **options):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", use_selection=True, use_active_scene=True, export_yup=True,
        export_animations=True, export_animation_mode="NLA_TRACKS", export_force_sampling=True, export_frame_step=1,
        export_def_bones=False, export_optimize_animation_size=False, export_tangents=False, export_morph=False,
        export_anim_slide_to_zero=True, **options)
    return os.path.getsize(path) / 1048576


def anim_rig(names):
    """The combined rig: the mannequin's own skeleton and every zombie clip, with no mesh, like the master file.

    Authored clips are solved afresh on the mannequin, because their IK depends on the skeleton's proportions,
    and library clips keep the mannequin's own pelvis travel.
    """
    source = bpy.data.objects["UAL_src"]
    cliplib.build(source, bpy.data.objects["Mannequin"], prefix="m_")
    ual = riglib.source_clips()[1]
    for clip in riglib.CLIPS:
        riglib.adopt_clip(ual[clip], 1.0, 1, "m_")
    proxy = bpy.data.objects.get("zombie_anim_rig")
    if not proxy:
        proxy = bpy.data.objects.new("zombie_anim_rig", source.data)
        bpy.context.scene.collection.objects.link(proxy)
    proxy.rotation_mode = "QUATERNION"
    bpy.context.view_layer.update()  # a new armature object has no pose until then
    set_tracks(proxy, names, "m_")
    size = export(os.path.join(OUT, "zombie_rig.glb"), [proxy], proxy, export_skins=False)
    proxy.animation_data_clear()
    proxy.hide_set(True)
    return size


def lighten(mesh, tris):
    """Down to what a field full of bodies can afford. Tripo's quads are unwelded, so they're welded before they can collapse."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bm.to_mesh(mesh.data)
    bm.free()
    mesh.data.polygons.foreach_set("use_smooth", [True] * len(mesh.data.polygons))
    mesh.data.update()
    have = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    bpy.context.view_layer.objects.active = mesh
    if have > tris:
        m = mesh.modifiers.new("Lighten", "DECIMATE")
        m.ratio = tris / have
        mesh.modifiers.move(len(mesh.modifiers) - 1, 0)
        bpy.ops.object.modifier_apply(modifier=m.name)
    print(mesh.name, have, "->", sum(len(p.vertices) - 2 for p in mesh.data.polygons), "triangles, verts", len(mesh.data.vertices))


def write_model(model, rig, mesh, names, tris):
    lighten(mesh, tris)
    set_tracks(rig, names)
    name = riglib.NAMES[str(model)][1]
    mb = export(os.path.join(OUT, f"{name}.glb"), [rig, mesh], rig, export_skins=True, export_image_format="JPEG", export_jpeg_quality=88)
    print(f"{name}.glb {mb:.2f} MB, {len(names)} clips")


def run(model, rig, mesh, authored_meta):
    os.makedirs(OUT, exist_ok=True)
    meta = json.load(open(riglib.META_PATH))
    meta.update(authored_meta)
    names = list(meta)
    json.dump(meta, open(os.path.join(OUT, "clips.json"), "w"), indent=1)
    if str(model) == "1":
        anim_rig(names)
    write_model(model, rig, mesh, names, 34000 if model == "ogre" else 24000)
    return meta


def run_caster(model, rig, mesh, meta):
    os.makedirs(OUT, exist_ok=True)
    json.dump(meta, open(os.path.join(OUT, "caster_clips.json"), "w"), indent=1)
    write_model(model, rig, mesh, list(meta), 24000)
    return meta
