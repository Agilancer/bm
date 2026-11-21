# A contact sheet of every stamp, from a background Blender (Workbench, material colours), for its review:
#   blender --background --factory-startup --python tools/dungeon/stamps_sheet.py -- <out dir>
# Writes <out dir>/stamp_<name>.png, each prop from three-quarters in front and a little above.
import bpy, os, sys, math
from mathutils import Vector
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(HERE, '..', 'build', 'shots')
os.makedirs(OUT, exist_ok=True)
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
exec(open(os.path.join(HERE, 'stamps.py'), encoding='utf-8').read())
build()
TINT = {'dark': 0.45, 'char': 0.12, 'pale': 1.4, 'moss': None, 'umber': 0.7, 'slate': 0.6}
for m in bpy.data.materials:
    pre = m.name.split(':')[0] if ':' in m.name else ''
    base = list(m.diffuse_color)
    if pre == 'moss':
        base = [0.18, 0.3, 0.12, 1]
    elif pre in TINT and TINT[pre]:
        base = [min(1, c * TINT[pre]) for c in base[:3]] + [1]
    if 'glow' in m.name:
        base = [0.75, 0.85, 1, 1]
    m.diffuse_color = base
sc = bpy.context.scene
try:
    sc.render.engine = 'BLENDER_WORKBENCH'
except TypeError as e:
    print(e)
sh = sc.display.shading
sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_shadows = True; sh.show_cavity = True
sc.render.resolution_x, sc.render.resolution_y = 640, 640
sc.render.film_transparent = False
sc.world = sc.world or bpy.data.worlds.new('w')
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
sc.collection.objects.link(cam); sc.camera = cam
props = [o for o in bpy.data.collections['stamps'].objects if o.type == 'MESH']
for o in props:
    for p in props:
        p.hide_render = p is not o
        for ch in p.children:
            ch.hide_render = True
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    c = (lo + hi) / 2; R = max((hi - lo).length / 2, 0.2)
    # (Wall props stand out toward -y: look at them from -y.)
    # (Three-quarters, then side on, then from above and behind: the orbit the critics ask for.)
    views = [(0.55, -1, 0.45), (1, -0.05, 0.1), (-0.5, 0.6, 0.9)] if o.name not in ('streetgrate', 'oculus') else [(0.4, -0.6, -1), (1, 0, -0.15), (0, 0, -1)]
    for k, v in enumerate(views):
        d = Vector(v).normalized()
        cam.location = c + d * R * 3.2
        cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
        cam.data.lens = 50
        sc.render.filepath = os.path.join(OUT, 'stamp_%s%s.png' % (o.name, '' if k == 0 else '_v%d' % k))
        bpy.ops.render.render(write_still=True)
        print('rendered', sc.render.filepath)
