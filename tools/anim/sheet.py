# Stills of an action for review, from fixed cameras: run inside Blender (the Blender MCP), after tools/anim/gait.py.
#
#   S = bpy.app.driver_namespace['sheet']
#   S.tiles(arm, 'A_run', frames=[0, 2, 4], views=['side', 'front'], out='.../tiles/wizard_run', unit=1.0)
#
# It writes one PNG a view and frame (side_000.png ...) and a tiles.json saying what's there; tools/anim/compose.py lays
# them out as a labelled sheet. The camera doesn't follow the body, so what moves in the pictures moved.
import bpy, json, math, os
from mathutils import Vector

VIEWS = {            # where the camera stands from the body (he faces -Y), as a direction
    'side': Vector((-1, 0, 0.07)),       # from his right, a little above so the ground shows: he runs to the right of the picture
    'left': Vector((1, 0, 0)),
    'front': Vector((0, -1, 0.07)),
    'back': Vector((0, 1, 0.07)),
    'q': Vector((-0.75, -0.66, 0.18)),   # three-quarter, front right
    'qb': Vector((-0.6, 0.8, 0.25)),     # three-quarter, from behind: the game's own view
    'top': Vector((0, 0.001, 1)),
}


def setup(size=(300, 380)):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = 'PNG'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_shadows = True; sh.shadow_intensity = 0.45
    sh.show_cavity = True; sh.show_object_outline = True
    sc.display.light_direction = (0.35, 0.4, 0.85)
    # (Dark leathers and plate are lifted so their shapes read.)
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.exposure = 1.1; sc.view_settings.gamma = 1.15
    if not sc.world: sc.world = bpy.data.worlds.new('W')
    sc.world.color = (0.36, 0.39, 0.42)
    cam = bpy.data.objects.get('SheetCam')
    if not cam:
        cam = bpy.data.objects.new('SheetCam', bpy.data.cameras.new('SheetCam'))
        sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    sc.camera = cam
    g = bpy.data.objects.get('SheetGround')
    if not g:
        me = bpy.data.meshes.new('SheetGround')
        n = 14; verts = []; faces = []; cols = []
        for i in range(-n, n):
            for j in range(-n, n):
                b = len(verts); s = 0.5
                verts += [(i * s, j * s, 0), ((i + 1) * s, j * s, 0), ((i + 1) * s, (j + 1) * s, 0), (i * s, (j + 1) * s, 0)]
                faces.append((b, b + 1, b + 2, b + 3)); cols.append((i + j) % 2)
        me.from_pydata(verts, [], faces)
        ma = bpy.data.materials.new('SheetGroundA'); ma.diffuse_color = (0.30, 0.42, 0.25, 1)
        mb = bpy.data.materials.new('SheetGroundB'); mb.diffuse_color = (0.26, 0.37, 0.22, 1)
        me.materials.append(ma); me.materials.append(mb)
        for p, c in zip(me.polygons, cols): p.material_index = c
        g = bpy.data.objects.new('SheetGround', me); sc.collection.objects.link(g)
    return cam


def tiles(arm, action, frames, views, out, height=1.8, size=(400, 500), look=0.52, zoom=1.0, show=None, hide=None):
    """height: how tall the body stands in its own units; look: how far up it the camera looks."""
    G = bpy.app.driver_namespace['gait']
    cam = setup(size)
    sc = bpy.context.scene
    os.makedirs(out, exist_ok=True)
    act = bpy.data.actions[action]
    G.use_action(arm, act)
    # Only this body in the picture.
    was = {}
    for o in sc.objects:
        if o.type in ('MESH', 'ARMATURE') and o.name != 'SheetGround':
            was[o.name] = o.hide_render
            mine = (o.parent == arm) or any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers) or (show and o.name in show)
            o.hide_render = not mine or (hide is not None and o.name in hide)
    at = Vector((0, 0, height * look))
    cam.data.ortho_scale = height * 1.5 / zoom
    made = []
    for v in views:
        d = VIEWS[v].normalized()
        cam.location = at + d * height * 6
        cam.rotation_euler = (at - cam.location).to_track_quat('-Z', 'Y').to_euler()
        for f in frames:
            sc.frame_set(int(f), subframe=f - int(f))
            name = f'{v}_{int(round(f * 10)):04d}.png'
            sc.render.filepath = os.path.join(out, name)
            bpy.ops.render.render(write_still=True)
            made.append(dict(view=v, frame=f, file=name))
    for n, h in was.items(): bpy.data.objects[n].hide_render = h
    json.dump(dict(action=action, fps=sc.render.fps, frames=list(frames), views=list(views), tiles=made, loop_s=act.get('loop_s'), speed=act.get('speed')), open(os.path.join(out, 'tiles.json'), 'w'))
    return len(made)


class _NS: pass
S = _NS()
S.tiles = tiles; S.setup = setup; S.VIEWS = VIEWS
bpy.app.driver_namespace['sheet'] = S
