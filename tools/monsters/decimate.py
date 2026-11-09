"""Decimate a static Tripo GLB in background Blender, keeping UVs and textures.

    blender -b --factory-startup --python-exit-code 1 -P tools/monsters/decimate.py -- SRC.glb OUT.glb TRIS
"""
import sys
import bpy

src, out, tris = sys.argv[sys.argv.index('--') + 1:][:3]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    m = o.modifiers.new('dec', 'DECIMATE')
    m.ratio = min(1.0, int(tris) / max(n, 1))
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
    print(o.name, n, '->', sum(len(p.vertices) - 2 for p in o.data.polygons))
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_skins=False)
