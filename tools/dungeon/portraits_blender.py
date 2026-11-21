"""The Gallery of a Thousand Portraits' sitters, painted from the game's own house of Velscour (assets/game/folk: the royal
blue lords and ladies, his knight, his steward), in Blender: each head and shoulders, arms let down from the rig's T, turned
a little, lit by one warm window from high on the left the way an old master lit a face, the ground near black.

Run inside Blender (Blender MCP, or: blender -b -P tools/dungeon/portraits_blender.py) in a scene of its own; writes
<scratch>/portraits/pNN_<name>.png at 512 x 768. tools/dungeon/portraits_paint.py then makes oil paintings of them.
"""
import bpy, os, math
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in globals() else None
ROOT = os.environ.get('BM_ROOT') or (os.path.normpath(os.path.join(HERE, '..', '..')) if HERE else '.')
F = os.path.join(ROOT, 'assets', 'game', 'folk')
OUT = os.environ.get('BM_PORTRAITS') or os.path.join(ROOT, 'tools', 'build', 'portraits')
# (sitter, turn in degrees, how much of them: 0 a head and shoulders, up to a half-length)
JOBS = [('lord_blue', 18, 0.0), ('lady_blue', -16, 0.1), ('dame_blue', 20, 0.0), ('dowager', -12, 0.15), ('younglord', 15, 0.2),
        ('noblewoman', -20, 0.0), ('knight_blue', 10, 0.25), ('youth_blue', -15, 0.1), ('majordomo', 18, 0.05), ('elder', -10, 0.0),
        ('lord_blue', -24, 0.35), ('lady_blue', 22, 0.3)]


def scene():
    sc = bpy.data.scenes.get('bm_portraits') or bpy.data.scenes.new('bm_portraits')
    if bpy.context.window: bpy.context.window.scene = sc
    sc.render.resolution_x, sc.render.resolution_y = 512, 768
    sc.eevee.taa_render_samples = 64
    cam = bpy.data.objects.get('pcam') or bpy.data.objects.new('pcam', bpy.data.cameras.new('pcam'))
    if cam.name not in sc.objects: sc.collection.objects.link(cam)
    sc.camera = cam; cam.data.lens = 85
    for n in ('key', 'fill', 'rim'):
        o = bpy.data.objects.get('p_' + n)
        if o: bpy.data.objects.remove(o)
    def light(n, loc, tgt, e, col, size):
        L = bpy.data.lights.new('p_' + n, 'AREA'); L.energy = e; L.color = col; L.size = size
        o = bpy.data.objects.new('p_' + n, L); sc.collection.objects.link(o); aim(o, loc, tgt)
    light('key', (-1.2, -1.3, 2.3), (0, 0, 1.55), 90, (1.0, 0.86, 0.66), 0.6)     # (the window, high and left)
    light('fill', (1.6, -1.6, 1.4), (0, 0, 1.45), 16, (0.6, 0.7, 0.9), 1.5)        # (what the room gives back, cool)
    light('rim', (0.8, 1.2, 2.0), (0, 0, 1.6), 25, (1.0, 0.8, 0.6), 0.4)          # (a candle behind, the hair's edge)
    w = sc.world or bpy.data.worlds.new('pw'); sc.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (0.012, 0.01, 0.008, 1)
    return sc, cam


def aim(obj, eye, tgt):
    obj.location = eye; obj.rotation_euler = (Vector(tgt) - Vector(eye)).to_track_quat('-Z', 'Y').to_euler()


def sitter(sc, name):
    for o in list(sc.objects):
        if o.type in ('MESH', 'ARMATURE'): bpy.data.objects.remove(o)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(F, name + '.glb'))
    for o in [o for o in bpy.data.objects if o not in before]:
        if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)   # (the importer's stray, a rigged GLB's)
    m = next(o for o in sc.objects if o.type == 'MESH'); a = next((o for o in sc.objects if o.type == 'ARMATURE'), None)
    mat = bpy.data.materials.get('sit_' + name)
    if not mat:
        mat = bpy.data.materials.new('sit_' + name); mat.use_nodes = True; nt = mat.node_tree
        b = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'); tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(F, name + '_c.webp'), check_existing=True)
        nt.links.new(tex.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.75
    m.data.materials.clear(); m.data.materials.append(mat)
    if a:   # (the arms down from the T, about the way out of the picture, at the shoulder)
        for bn, ang in (('mixamorig:LeftArm', 72), ('mixamorig:RightArm', -72)):
            if bn not in a.pose.bones: continue
            pb = a.pose.bones[bn]; bpy.context.view_layer.update(); h = pb.head.copy()
            pb.matrix = Matrix.Translation(h) @ Matrix.Rotation(math.radians(ang), 4, 'Y') @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()
    return m, a


def shoot(sc, cam, name, turn, crop, out):
    m, a = sitter(sc, name)
    top = max((m.matrix_world @ v.co).z for v in m.data.vertices)
    hz = top - 0.14
    (a or m).rotation_euler[2] = math.radians(turn)
    bpy.context.view_layer.update()
    dist = 1.35 + 1.1 * crop
    aim(cam, (math.sin(math.radians(14)) * dist, -dist, hz + 0.06), (0, 0, hz - 0.13 - 0.3 * crop))
    sc.render.filepath = os.path.join(OUT, out)
    bpy.ops.render.render(write_still=True)


def main(jobs=JOBS):
    os.makedirs(OUT, exist_ok=True)
    sc, cam = scene()
    done = []
    for i, (n, tu, cr) in enumerate(jobs):
        shoot(sc, cam, n, tu, cr, 'p%02d_%s.png' % (i, n)); done.append(n)
    return done


if __name__ == '__main__' or os.environ.get('BM_PORTRAITS_RUN'):
    print(main())
