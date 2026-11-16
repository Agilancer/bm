"""Close a Meshy body's seams and small holes, and make its faces agree which way is out.  Background Blender:

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/weld_fill.py -- <in.glb> <out.glb> [max_hole_cm]

A Meshy mesh looks like hundreds of loose pieces, but nearly all of that is its UV seams cut open: the pieces' edges
sit exactly on each other. What is really wrong is small: a few hundred real gaps (the dark specks on Apricot's face,
the slivers on Louis G's cheek), pieces wound the wrong way, and shading that breaks at every seam because each piece
has its own normals. So:
  1. vertices within 0.2 mm are welded (UVs live on face corners, so the paint doesn't move);
  2. every connected surface is wound one way (out);
  3. holes whose rim is at most `max_hole_cm` round (default 6) are filled, each new face taking one rim corner's UV
     (a flat patch of the colour beside it, never a smear across the atlas);
  4. Meshy's per-piece normals are dropped for smooth ones worked out on the welded surface.
The rig, the weights and every existing face's UVs are kept. Open cloth edges (hems, ribbons, hair ends) have long
rims and are left alone.
"""
import sys

import bmesh
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, OUT = argv[:2]
MAXRIM = (float(argv[2]) if len(argv) > 2 else 6.0) / 100

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.type == "MESH" and not o.find_armature():
        bpy.data.objects.remove(o)
mesh = max((o for o in sc.objects if o.type == "MESH"), key=lambda o: len(o.data.vertices))
arm = mesh.find_armature()
me = mesh.data
scale = mesh.matrix_world.median_scale

bm = bmesh.new(); bm.from_mesh(me)
uv = bm.loops.layers.uv.active
rim0 = sum(e.is_boundary for e in bm.edges)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0002 / scale)
rim1 = sum(e.is_boundary for e in bm.edges)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

# Rims: closed loops of boundary edges. Fill the short ones.
edges = {e for e in bm.edges if e.is_boundary}
loops = []
while edges:
    e = edges.pop(); loop = [e]; v0, v = e.verts
    while v is not v0:
        nxt = next((x for x in v.link_edges if x in edges), None)
        if nxt is None:
            loop = None
            break
        edges.discard(nxt); loop.append(nxt); v = nxt.other_vert(v)
    if loop:
        loops.append(loop)
small = [l for l in loops if sum(e.calc_length() for e in l) * scale <= MAXRIM and len(l) <= 24]
old = set(bm.faces)
filled = 0
for l in small:
    try:
        r = bmesh.ops.edgeloop_fill(bm, edges=l)
    except Exception:
        continue
    for f in r.get("faces", []):
        src = None
        for lp in f.loops:
            src = next((o for o in lp.vert.link_loops if o.face in old), None)
            if src:
                break
        for lp in f.loops:
            if src:
                lp[uv].uv = src[uv].uv
        f.smooth = True
        filled += 1
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
rim2 = sum(e.is_boundary for e in bm.edges)
for f in bm.faces:
    f.smooth = True
bm.to_mesh(me); bm.free()
# Smooth normals from the welded surface, not Meshy's per-piece ones.
bpy.context.view_layer.objects.active = mesh
for o in sc.objects:
    o.select_set(o is mesh)
if me.has_custom_normals:
    bpy.ops.mesh.customdata_custom_splitnormals_clear()
print("WELD open edges", rim0, "-> welded", rim1, "-> filled", rim2, "| rims", len(loops), "filled", len(small), "new faces", filled)

for o in sc.objects:
    o.select_set(o in (mesh, arm))
bpy.context.view_layer.objects.active = arm
kw = dict(filepath=OUT, export_format="GLB", use_selection=True, export_skins=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animations=False)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("WELD wrote", OUT)
