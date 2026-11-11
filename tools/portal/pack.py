"""The town portal: the owner's Tripo model (TOWN PORTAL MODEL.glb), packed for the game as assets/game/items/portal.glb.

Nothing about its shape changes. It's only slid sideways so the middle of its doorway sits on the origin (the doorway is a
little off the model's centre), and its maps go out as webp like the doors' and the chest's. The swirl that fills the doorway
is drawn by the game (src/gfx/renderer.js portalModel, src/gfx/materials.js ITEM).

  blender -b --factory-startup --python tools/portal/pack.py -- "<TOWN PORTAL MODEL.glb>" assets/game/items/portal.glb

The doorway, measured by casting rays through the model (in its own units, Y up, 0.973 tall): the painted face is a slab at
z = +-0.02; the opening runs x -0.176..0.212 (so its middle is x = 0.018), from the rubble to z = 0.55 straight, and then
round over a half circle of radius 0.194 to its top at z = 0.745. See DOOR in src/gfx/renderer.js.
"""
import bpy, sys

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.data.objects if o.type == 'MESH'][0]
ob.name = 'portal'
# (Blender is Z up: the glb's x is Blender's x.)
for v in ob.data.vertices:
    v.co.x -= 0.018
for o in list(bpy.data.objects):
    if o is not ob:
        bpy.data.objects.remove(o)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False, export_tangents=False,
                          export_normals=True, export_texcoords=True, export_materials='EXPORT',
                          export_image_format='WEBP', export_image_quality=82)
