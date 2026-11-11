"""The portals: the owner's two Tripo models, packed for the game. Both go out as two meshes on one set of maps: 'stone', the
model as it was made, and 'swirl', the face painted with the whirl, which the game draws moving (src/gfx/materials.js ITEM).
The swirl's uv is its place in the model, not its paint: the shader works out its whirl from that.

  blender -b --factory-startup --python tools/portal/pack.py -- ground "<NORMAL PORTAL.glb>" assets/game/items/portal-ground.glb
  blender -b --factory-startup --python tools/portal/pack.py -- dungeon "<DUNGEON PORTAL (NEEDS BACKING OBJECT OR WALL).glb>" assets/game/items/portal-dungeon.glb

ground: the seals' portal, a round dais you stand on. Its file comes tilted, its top rising 1 in 4 from front to back
(measured: the swirl's face is a plane, dz/dy = 0.2503, residue under a millimetre), so it's turned level first, stood on
y = 0 and slid so the swirl's middle is on the origin. Then (model units, Y up as the game has it): the swirl a disc of
radius 0.267 at y 0.086, the rune ring round it at 0.107 out to 0.45, a step at 0.065 out to the edge at 0.5. Its four
posts stand 0.23 high.

dungeon: the Warrens' portal, an arch on a round dais, whose whirl is a funnel that runs back out of the arch: it has to be
set into a wall. It stands level as it comes. Its front is +z. The dais is at y 0.107, with three steps down at the front
(0.102, 0.066, 0.022) to z = 0.5. The arch's frame runs z -0.02..-0.16, 0.83 high. Its doorway is round, about 0.31
across from (0, 0.36), down to the dais. The funnel's rim is at z -0.17 and its middle 0.34 back. See src/core/sites.js
portalWall and src/gfx/renderer.js PORTALS.
"""
import bpy, bmesh, sys, math, mathutils

kind, src, out = sys.argv[sys.argv.index('--') + 1:][:3]
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=src)
ob = [o for o in bpy.data.objects if o.type == 'MESH'][0]
for o in list(bpy.data.objects):
    if o is not ob:
        bpy.data.objects.remove(o)
me = ob.data
mat = ob.active_material
base_img = next(n.image for n in mat.node_tree.nodes if n.type == 'TEX_IMAGE' and 'basecolor' in n.image.name)
W, H = base_img.size
px = base_img.pixels[:]

# (Blender is Z up: the glb's y is Blender's z, and its z is Blender's -y.)
if kind == 'ground':
    R = mathutils.Matrix.Rotation(-math.atan(0.2503), 4, 'X')
    for v in me.vertices:
        v.co = R @ v.co
    # The swirl's middle: the middle of the disc of faces lying on its plane.
    top = max(v.co.z for v in me.vertices if v.co.x ** 2 + v.co.y ** 2 < 0.15 ** 2)
    disc = [v.co for v in me.vertices if abs(v.co.z - top) < 0.003 and v.co.x ** 2 + v.co.y ** 2 < 0.32 ** 2]
    xs, ys = [c.x for c in disc], [c.y for c in disc]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    z0 = min(v.co.z for v in me.vertices)
    for v in me.vertices:
        v.co.x -= cx; v.co.y -= cy; v.co.z -= z0
    print('ground: centre', round(cx, 4), round(cy, 4), 'radius', round((max(xs) - min(xs)) / 2, 4), 'disc at', round(top - z0, 4))
else:
    z0 = min(v.co.z for v in me.vertices)
    for v in me.vertices:
        v.co.z -= z0
me.update()

# Which faces are the swirl: by where they are, and that they're painted the swirl's blue.
uvl = me.uv_layers.active.data
def blue(poly):
    u = sum(uvl[li].uv[0] for li in poly.loop_indices) / poly.loop_total
    v = sum(uvl[li].uv[1] for li in poly.loop_indices) / poly.loop_total
    i = (min(H - 1, int(v * H)) * W + min(W - 1, int(u * W))) * 4
    r, g, b = px[i], px[i + 1], px[i + 2]
    # (Blue, or the white of its heart.)
    return b > 0.3 and (b > r * 1.4 or r + g + b > 1.8)

swirl = set()
disc_z = max(v.co.z for v in me.vertices if v.co.x ** 2 + v.co.y ** 2 < 0.1 ** 2)
for p in me.polygons:
    c = p.center
    if kind == 'ground':
        if all(me.vertices[i].co.x ** 2 + me.vertices[i].co.y ** 2 < 0.272 ** 2 and me.vertices[i].co.z > disc_z - 0.004 for i in p.vertices):
            swirl.add(p.index)
    else:
        if c.y > 0.165 and c.z > 0.125 and abs(c.x) < 0.36 and blue(p):
            swirl.add(p.index)
print(kind, 'swirl faces', len(swirl), 'of', len(me.polygons))

# Split it in two: the swirl to its own object.
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
for f in bm.faces:
    f.select = f.index in swirl
bm.to_mesh(me); bm.free()
bpy.context.view_layer.objects.active = ob
ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_mode(type='FACE')
bpy.ops.mesh.separate(type='SELECTED')
bpy.ops.object.mode_set(mode='OBJECT')
parts = [o for o in bpy.data.objects if o.type == 'MESH']
sw = next(o for o in parts if o is not ob)
ob.name = ob.data.name = 'stone'
sw.name = sw.data.name = 'swirl'
# The swirl's uv: its place, in the glb's own terms (x, and y up for the arch's face; x and z across the dais). glTF turns
# v over on the way out (v' = 1 - v), so it's turned over here first. (The dais: Blender's y is the glb's -z.)
for loop in sw.data.loops:
    co = sw.data.vertices[loop.vertex_index].co
    u, v = (co.x, -co.y) if kind == 'ground' else (co.x, co.z)
    sw.data.uv_layers.active.data[loop.index].uv = (u, 1 - v)
# Smaller maps: 2048 is what the game's best tier draws a thing this size at.
for img in bpy.data.images:
    if img.size[0] > 2048:
        img.scale(2048, 2048)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_yup=True, export_apply=False, export_tangents=False,
                          export_normals=True, export_texcoords=True, export_materials='EXPORT', use_selection=True,
                          export_image_format='WEBP', export_image_quality=82)
