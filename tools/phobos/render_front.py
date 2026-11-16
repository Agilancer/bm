import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index('--')+1:]
src, out = argv[0], argv[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name.lower().startswith('icosphere'): bpy.data.objects.remove(o)
meshes = [o for o in sc.objects if o.type == 'MESH']
mn = mathutils.Vector((1e9,)*3); mx = -mn
for o in meshes:
    for c in o.bound_box:
        w = o.matrix_world @ mathutils.Vector(c)
        mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
ctr = (mn+mx)/2; h = mx.z-mn.z
print('BOUNDS', tuple(mn), tuple(mx))
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
print('TRIS', tris, 'BONES', sum(len(a.data.bones) for a in sc.objects if a.type == 'ARMATURE'))
for im in bpy.data.images: print('IMAGE', im.name, tuple(im.size))
VIEWS = [(v.split(':') + ['0.91'])[:4] for v in (argv[2].split(',') if len(argv) > 2 else ['front:0:1', 'side:90:1', 'head:0:0.2', 'head34:35:0.2', 'back:180:0.2'])]
for name, ang, zoom, at in [(n, float(a), float(z), float(h)) for n, a, z, h in VIEWS]:
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = max(mx.x-mn.x, h)*1.05 if zoom==1 else h*zoom
    d = 6
    a = math.radians(ang)
    cz = ctr.z if zoom==1 else mn.z + h*at
    cam.location = (ctr.x + d*math.sin(a), ctr.y - d*math.cos(a), cz)
    cam.rotation_euler = (math.radians(90), 0, a)
    sc.camera = cam
    for e in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE', 'BLENDER_WORKBENCH'):
        try: sc.render.engine = e; break
        except TypeError: pass
    sc.render.resolution_x = 1024; sc.render.resolution_y = 1024
    w = sc.world or bpy.data.worlds.new('w'); sc.world = w
    w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs[0].default_value = (0.8, 0.8, 0.8, 1); bg.inputs[1].default_value = 1.0
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(ang-20))
    sc.collection.objects.link(sun)
    sc.render.filepath = out.replace('.png', f'_{name}.png')
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(sun); bpy.data.objects.remove(cam)
