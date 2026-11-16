"""A Meshy-rigged character onto the townsfolk's skeleton, so it plays Lisandra's clips like everyone in Bellmourn.  Background Blender:

    blender -b --factory-startup --python-exit-code 1 -P tools/phobos/meshy_to_folk.py -- <meshy.glb> <donor.glb> <out.glb> [drop parts...]

Meshy's auto-rig is 24 bones with its own names (Spine01, neck, head_end, headfront) and no fingers. The townsfolk's rig
(src/folk/rig.js) matches bones by Tripo's `mixamorig:` names, fingers included. So:
  1. Meshy's bones are renamed to those names (its spine by the chain: Meshy numbers it from the top, Mixamo from the
     hips); headfront's weights go to the head.
  2. Each hand gets the donor's (a Tripo townsperson's) finger bones, carried from the donor's hand to this one: moved to
     this hand bone, turned by the least rotation from the donor's forearm-to-hand line to this one's (so the thumb stays
     forward), and scaled by how far each hand reaches past its wrist.
  3. Each chain is then laid down the middle of its own finger (the vertices past its knuckle nearest it), and the hand's
     own weight is split onto the fingers by Blender's heat weighting, worked out on the hand alone.
  4. Sliver faces (an edge over 25 cm, or over 15 cm long and under 5 mm across) are deleted, and "drop" names loose
     parts (by index, as listed) to delete: stray threads the 3D step left. Drop by index only after a look: a stray
     face can tie a real piece (a boot) into the same part.
Meshy's weights stay as they are everywhere else; the mesh's shape and paint are not touched.
"""
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DONOR, OUT = argv[:3]
DROP = {int(a) for a in argv[3:]}

RENAME = {"neck": "Neck", "head_end": "HeadTop_End"}  # the spine's three are named by the chain (below)
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")


def log(*a):
    print("M2F", *a, flush=True)


def load(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in list(new):
        if o.type == "MESH" and o.name.lower().startswith("icosphere") and not o.find_armature():
            new.remove(o); bpy.data.objects.remove(o)
    arm = next(o for o in new if o.type == "ARMATURE")
    meshes = [o for o in new if o.type == "MESH"]
    return arm, meshes


def world_verts(mesh):
    mw = mesh.matrix_world
    return [mw @ v.co for v in mesh.data.vertices]


def group_weights(mesh, name):
    g = mesh.vertex_groups.get(name)
    out = {}
    if g is None:
        return out
    for v in mesh.data.vertices:
        for e in v.groups:
            if e.group == g.index and e.weight > 0:
                out[v.index] = e.weight
    return out


def reach(mesh, hand_name, H, d):
    """Where the hand's vertices (the hand's and its fingers' weights together) start and end along d, from the wrist joint."""
    vs = world_verts(mesh)
    w = {}
    for g in mesh.vertex_groups:
        if g.name == hand_name or g.name.startswith(hand_name):
            for i, x in group_weights(mesh, g.name).items():
                w[i] = w.get(i, 0) + x
    ps = [(vs[i] - H).dot(d) for i, x in w.items() if x > 0.4]
    return min(ps), max(ps)


bpy.ops.wm.read_factory_settings(use_empty=True)

# The donor's hands, in the world, then the donor is gone.
darm, dmeshes = load(DONOR)
dmesh = max(dmeshes, key=lambda o: len(o.data.vertices))
donor = {}
for side in ("Left", "Right"):
    bones = darm.data.bones
    H = darm.matrix_world @ bones[f"mixamorig:{side}Hand"].head_local
    F = darm.matrix_world @ bones[f"mixamorig:{side}ForeArm"].head_local
    d = (H - F).normalized()
    fing = []
    for f in FINGERS:
        for k in (1, 2, 3, 4):
            b = bones.get(f"mixamorig:{side}Hand{f}{k}")
            if b is None:
                continue
            m = darm.matrix_world @ b.matrix_local
            fing.append((b.name, b.parent.name, m, b.length * darm.matrix_world.to_scale()[0]))
    donor[side] = dict(H=H, d=d, L=reach(dmesh, f"mixamorig:{side}Hand", H, d), fing=fing)
    log("donor", side, "hand from", tuple(round(x, 4) for x in donor[side]["L"]), "fingers", len(fing))
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)

arm, meshes = load(SRC)
bpy.context.view_layer.objects.active = arm

# Loose parts: list them all with their size, drop those named.
for mesh in meshes:
    bm = bmesh.new(); bm.from_mesh(mesh.data); bm.verts.ensure_lookup_table()
    seen, parts = set(), []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack, comp = [v], []
        seen.add(v.index)
        while stack:
            a = stack.pop(); comp.append(a)
            for e in a.link_edges:
                b = e.other_vert(a)
                if b.index not in seen:
                    seen.add(b.index); stack.append(b)
        parts.append(comp)
    mw = mesh.matrix_world
    for i, comp in enumerate(parts):
        ps = [mw @ v.co for v in comp]
        lo = Vector((min(p.x for p in ps), min(p.y for p in ps), min(p.z for p in ps)))
        hi = Vector((max(p.x for p in ps), max(p.y for p in ps), max(p.z for p in ps)))
        dims = sorted(hi - lo, reverse=True)
        thin = dims[0] > 0.25 and dims[1] < 0.06
        if thin or len(comp) > 2000 or i in DROP:
            log("part", i, "verts", len(comp), "dims", tuple(round(x, 3) for x in dims), "at", tuple(round(x, 2) for x in (lo + hi) / 2), "THIN" if thin else "", "DROP" if i in DROP else "")
    log("parts", len(parts))
    # Slivers: threads the 3D step strung between parts, often from one stray vertex to many places (Apricot's boot toe
    # to her face). Faces with an edge over 25 cm, or over 15 cm long and under 5 mm across: nothing real on a 30k body
    # has them (the longest real faces on all three are boot soles, 14 cm). Faces only, so the parts they tied together
    # keep their real faces; then the vertices left with no face go.
    sliver = []
    for f in bm.faces:
        ps = [mw @ v.co for v in f.verts]
        long = max((ps[k] - ps[k - 1]).length for k in range(len(ps)))
        if long > 0.25 or (long > 0.15 and 2 * f.calc_area() * mw.median_scale ** 2 / long < 0.005):
            sliver.append(f)
    log("slivers", len(sliver))
    if sliver:
        bmesh.ops.delete(bm, geom=sliver, context="FACES_ONLY")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bm.to_mesh(mesh.data)
    if DROP:
        bmesh.ops.delete(bm, geom=[v for i, c in enumerate(parts) if i in DROP for v in c], context="VERTS")
        bm.to_mesh(mesh.data)
    bm.free()

# Names. Meshy counts its spine down from the neck (Hips > Spine02 > Spine01 > Spine > neck); Mixamo counts up
# (Hips > Spine > Spine1 > Spine2 > Neck), and the game's rig matches each bone's parent too, so name them by the chain.
chain, b = [], arm.data.bones["Hips"]
while (b := next((c for c in b.children if c.name.lower().startswith("spine")), None)):
    chain.append(b.name)
RENAME.update({n: ("Spine", "Spine1", "Spine2")[k] for k, n in enumerate(chain[:3])})
log("spine", " > ".join(chain), "->", ", ".join(RENAME[n] for n in chain[:3]))
bpy.ops.object.mode_set(mode="EDIT")
eb = arm.data.edit_bones
for b in list(eb):
    if b.name == "headfront":
        continue
    b.name = "mixamorig:" + RENAME.get(b.name, b.name)
bpy.ops.object.mode_set(mode="OBJECT")
for mesh in meshes:
    for g in mesh.vertex_groups:
        if g.name != "headfront" and not g.name.startswith("mixamorig:"):
            g.name = "mixamorig:" + RENAME.get(g.name, g.name)
    hf = mesh.vertex_groups.get("headfront")
    if hf:
        head = mesh.vertex_groups["mixamorig:Head"]
        for i, w in group_weights(mesh, "headfront").items():
            head.add([i], w, "ADD")
        mesh.vertex_groups.remove(hf)
bpy.ops.object.mode_set(mode="EDIT")
if "headfront" in eb:
    eb.remove(eb["headfront"])
bpy.ops.object.mode_set(mode="OBJECT")

# Fingers.
mesh = max(meshes, key=lambda o: len(o.data.vertices))
aw = arm.matrix_world
targets = {}
for side in ("Left", "Right"):
    H = aw @ arm.data.bones[f"mixamorig:{side}Hand"].head_local
    F = aw @ arm.data.bones[f"mixamorig:{side}ForeArm"].head_local
    d = (H - F).normalized()
    L = reach(mesh, f"mixamorig:{side}Hand", H, d)
    D = donor[side]
    R = D["d"].rotation_difference(d).to_matrix().to_4x4()
    # Lined up at the fingertips, scaled by the hands' lengths (the wrist joints sit at different places in the two rigs).
    s = (L[1] - L[0]) / (D["L"][1] - D["L"][0])
    targets[side] = (H, d, s, R, H + d * L[1], D["H"] + D["d"] * D["L"][1])
    log(side, "hand from", tuple(round(x, 4) for x in L), "scale", round(s, 3), "turn", round(D["d"].angle(d) * 57.3, 1))
bpy.ops.object.mode_set(mode="EDIT")
inv = aw.inverted()
for side in ("Left", "Right"):
    H, d, s, R, tip, dtip = targets[side]
    D = donor[side]
    for name, parent, m, length in D["fing"]:
        b = eb.new(name)
        rot = R @ Matrix(m.to_3x3()).to_4x4()
        head = tip + (R @ ((m.to_translation() - dtip) * s).to_4d()).to_3d()
        b.matrix = inv @ (Matrix.Translation(head) @ rot)
        b.length = length * s
    for name, parent, m, length in D["fing"]:
        eb[name].parent = eb[parent]
        eb[name].use_connect = False


# The donor's fingers only roughly fit this hand. Lay each finger's chain down the middle of its own finger: the vertices
# past the chain's knuckle that lie nearer it than any other chain, their main line; the knuckle stays where the donor's
# hand put it (on that line), the tip goes to the finger's end, the three joints split as the donor's are.
def pca(ps):
    n = len(ps)
    c = sum(ps, Vector()) / n
    m = [[sum((p[i] - c[i]) * (p[j] - c[j]) for p in ps) / n for j in range(3)] for i in range(3)]
    a = Vector((1, 1, 1)).normalized()
    for _ in range(40):
        a = Vector([sum(m[i][j] * a[j] for j in range(3)) for i in range(3)]).normalized()
    return c, a


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-12)))
    return (p - (a + ab * t)).length


# How a finger's length from knuckle to tip is shared by its three joints (fingers; thumb), as in a real hand.
SPLIT = {False: (0.46, 0.30, 0.24), True: (0.40, 0.33, 0.27)}
vs_rest = world_verts(mesh)
bm_all = bmesh.new(); bm_all.from_mesh(mesh.data); bm_all.verts.ensure_lookup_table()
edges = [(e.verts[0].index, e.verts[1].index) for e in bm_all.edges]
bm_all.free()


def lay(side, f, base, tip):
    """A finger's three joints (and its end) along base..tip, rolled as before."""
    at = base
    for k in range(3):
        b = eb[f"mixamorig:{side}Hand{f}{k + 1}"]
        z = b.z_axis.copy()
        nxt = at + (tip - base) * SPLIT[f == "Thumb"][k]
        b.head, b.tail = inv @ at, inv @ nxt
        b.align_roll(z)
        at = nxt
    end = eb.get(f"mixamorig:{side}Hand{f}4")
    if end is not None:
        z = end.z_axis.copy()
        end.head, end.tail = inv @ tip, inv @ (tip + (tip - base).normalized() * 0.01)
        end.align_roll(z)


def fit_line(ps, toward):
    c, a = pca(ps)
    return c, (-a if a.dot(toward) < 0 else a)


for side in () if os.environ.get("M2F_NOREFIT") else ("Left", "Right"):
    H, d, s = targets[side][0], targets[side][1], targets[side][2]
    hw = group_weights(mesh, f"mixamorig:{side}Hand")
    idx = [i for i, w in hw.items() if w > 0.3]
    P = {i: vs_rest[i] for i in idx}
    chain = lambda f: [aw @ eb[f"mixamorig:{side}Hand{f}{k}"].head for k in (1, 2, 3)] + [aw @ eb[f"mixamorig:{side}Hand{f}3"].tail]
    # The hand's frame: d along it, n through the palm (its thinnest way, not along d), w across it.
    c0, _ = pca(list(P.values()))
    import numpy as np
    A = np.array([tuple(p - c0) for p in P.values()])
    ev, vec = np.linalg.eigh(A.T @ A)
    cand = [(ev[k], Vector(vec[:, k])) for k in range(3) if abs(Vector(vec[:, k]).dot(d)) < 0.7]
    n = min(cand, key=lambda t: t[0])[1]
    wv = d.cross(n).normalized()
    thumb_side = 1 if (chain("Thumb")[0] - H).dot(wv) > 0 else -1
    # The fingers' own way (a hand can bend at the wrist): from the wrist to the middle of the hand's far third.
    u0 = {i: (p - H).dot(d) for i, p in P.items()}
    far = [P[i] for i in idx if u0[i] > max(u0.values()) * 0.66]
    df = (sum(far, Vector()) / len(far) - H).normalized()
    df = (df - n * df.dot(n)).normalized()
    wv = df.cross(n).normalized()
    thumb_side = 1 if (chain("Thumb")[0] - H).dot(wv) > 0 else -1
    log(side, "fingers point", round(df.angle(d) * 57.3), "degrees off the forearm")
    u = {i: (p - H).dot(df) for i, p in P.items()}
    v = {i: (p - H).dot(wv) for i, p in P.items()}
    umax = max(u.values())
    # Cut near the tips: what's left there falls apart into the fingers (the thumb's tip is further back). The cut is tried
    # from deep to shallow until it leaves exactly four fingers of about one width (a deep cut can leave two joined by their
    # web). Pieces laid over each other (a nail, a glove's end) go with the finger whose span across the hand they share.
    def fingers_at(depth):
        zone = {i for i in idx if u[i] > umax - depth}
        adj = {i: [] for i in zone}
        for x, y in edges:
            if x in zone and y in zone:
                adj[x].append(y); adj[y].append(x)
        seen, comps = set(), []
        for i in zone:
            if i in seen:
                continue
            st, comp = [i], []
            seen.add(i)
            while st:
                q = st.pop(); comp.append(q)
                for r in adj[q]:
                    if r not in seen:
                        seen.add(r); st.append(r)
            comps.append([min(v[i] for i in comp), max(v[i] for i in comp), comp])
        comps.sort(key=lambda c: c[0])
        groups = []
        for lo, hi, comp in comps:
            g = groups[-1] if groups else None
            if g and min(hi, g[1]) - max(lo, g[0]) > 0.3 * min(hi - lo, g[1] - g[0]):
                g[0], g[1] = min(lo, g[0]), max(hi, g[1]); g[2].extend(comp)
            else:
                groups.append([lo, hi, list(comp)])
        return [g for g in groups if len(g[2]) >= 8]

    groups = None
    for depth in (0.05, 0.045, 0.04, 0.035, 0.03, 0.025, 0.02):
        gs = fingers_at(depth * s / 1.5)
        widths = sorted(g[1] - g[0] for g in gs)
        cs = sorted(sum(v[i] for i in g[2]) / len(g[2]) for g in gs)
        gaps = [cs[k + 1] - cs[k] for k in range(len(cs) - 1)]
        even = len(gaps) == 3 and min(gaps) > 0.55 * sorted(gaps)[1] and max(gaps) < 1.8 * sorted(gaps)[1]
        if len(gs) == 4 and widths[-1] < 1.6 * widths[1] and even:
            groups = sorted(([sum(v[i] for i in g[2]) / len(g[2]), g[2]] for g in gs), key=lambda g: -thumb_side * g[0])
            log(side, "fingers found at a cut", depth, "m from the tips")
            break
    if groups is None:
        log(side, "never found four fingers at the tips; kept the donor's")
        continue
    order = ("Index", "Middle", "Ring", "Pinky")
    lines = {}
    for f, g in zip(order, groups):
        lines[f] = fit_line([P[i] for i in g[1]], df)
    # Each finger's own vertices: those past the knuckles nearest its line; then its line again, from all of them.
    knu = {f: (chain(f)[0] - H).dot(df) for f in order}
    sets = {f: [] for f in order}
    for i in idx:
        best = min(order, key=lambda f: (P[i] - lines[f][0] - lines[f][1] * (P[i] - lines[f][0]).dot(lines[f][1])).length)
        if u[i] > knu[best] + 0.25 * (umax - knu[best]):
            sets[best].append(P[i])
    for f in order:
        c, a = fit_line(sets[f] or [P[i] for i in groups[order.index(f)][1]], df)
        base = c + a * ((H + df * knu[f] - c).dot(a))
        tip = c + a * (max((p - c).dot(a) for p in sets[f]) - 0.004)
        lay(side, f, base, tip)
        log(side, f, "at", round((c - H).dot(wv) * thumb_side, 4), "across, turn", round(a.angle(df) * 57.3), "length", round((tip - base).length, 4), "verts", len(sets[f]))
    # The thumb: the vertices nearer its chain than the fingers' and past its first joint's start.
    th = chain("Thumb")
    ts = []
    for i in idx:
        dt = min(seg_dist(P[i], th[k], th[k + 1]) for k in range(3))
        dfin = min((P[i] - lines[f][0] - lines[f][1] * (P[i] - lines[f][0]).dot(lines[f][1])).length for f in order)
        if dt < dfin and dt < seg_dist(P[i], H, H + df * min(knu.values())) and (P[i] - th[0]).dot(th[3] - th[0]) > 0.15 * (th[3] - th[0]).length_squared:
            ts.append(P[i])
    if len(ts) > 12:
        c, a = fit_line(ts, th[3] - th[0])
        base = c + a * (th[0] - c).dot(a)
        tip = c + a * (max((p - c).dot(a) for p in ts) - 0.004)
        lay(side, "Thumb", base, tip)
        log(side, "Thumb turn", round(a.angle(d) * 57.3), "length", round((tip - base).length, 4), "verts", len(ts))
bpy.ops.object.mode_set(mode="OBJECT")


# The hand's weight split onto the fingers by Blender's heat weighting, worked out on the hand alone: a copy of the mesh
# cut down to the hand, bound to a copy of the rig cut down to the hand and its fingers. Each vertex keeps the hand's
# whole weight from Meshy's rig; heat says what share of it each finger takes.
def select_only(*objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[-1]


for side in ("Left", "Right"):
    hand_name = f"mixamorig:{side}Hand"
    hw = group_weights(mesh, hand_name)
    piece = mesh.copy(); piece.data = mesh.data.copy(); bpy.context.collection.objects.link(piece)
    for m in list(piece.modifiers):
        piece.modifiers.remove(m)
    piece.parent = None; piece.matrix_world = mesh.matrix_world
    oid = piece.data.attributes.new("oid", "INT", "POINT")
    oid.data.foreach_set("value", list(range(len(piece.data.vertices))))
    bm = bmesh.new(); bm.from_mesh(piece.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if hw.get(v.index, 0) < 0.02], context="VERTS")
    bm.to_mesh(piece.data); bm.free()
    piece.vertex_groups.clear()
    rig = arm.copy(); rig.data = arm.data.copy(); bpy.context.collection.objects.link(rig)
    select_only(rig)
    bpy.ops.object.mode_set(mode="EDIT")
    for b in list(rig.data.edit_bones):
        if not b.name.startswith(hand_name):
            rig.data.edit_bones.remove(b)
    bpy.ops.object.mode_set(mode="OBJECT")
    for b in rig.data.bones:
        b.use_deform = not b.name.endswith("4")
    select_only(piece, rig)
    bpy.ops.object.parent_set(type="ARMATURE_AUTO")
    ids = piece.data.attributes["oid"].data
    names = {g.index: g.name for g in piece.vertex_groups}
    groups = {}
    moved = 0
    for v in piece.data.vertices:
        ws = {names[e.group]: e.weight for e in v.groups if e.weight > 0}
        tot = sum(ws.values())
        if tot <= 0:
            continue
        i = ids[v.index].value
        w = hw[i]
        fing = {n: x for n, x in ws.items() if n != hand_name}
        if not fing:
            continue
        mesh.vertex_groups[hand_name].add([i], w * ws.get(hand_name, 0) / tot, "REPLACE")
        for n, x in fing.items():
            g = groups.get(n) or mesh.vertex_groups.get(n) or mesh.vertex_groups.new(name=n)
            groups[n] = g
            g.add([i], w * x / tot, "REPLACE")
        moved += 1
    log(side, "hand vertices sharing with fingers", moved, "of", len(hw))
    bpy.data.objects.remove(piece); bpy.data.objects.remove(rig)

    # Meshy builds a body from separate pieces laid over each other (a glove over a hand), and heat weights each piece on
    # its own, so touching pieces part when the fingers bend. Smooth the hand's and fingers' shares over everything within
    # a few millimetres, joined or not, keeping each vertex's total.
    import mathutils.kdtree
    gs = [mesh.vertex_groups[hand_name]] + [g for g in mesh.vertex_groups if g.name.startswith(hand_name) and g.name != hand_name]
    gi = {g.index: k for k, g in enumerate(gs)}
    ids = list(hw)
    W = {i: [0.0] * len(gs) for i in ids}
    for i in ids:
        for e in mesh.data.vertices[i].groups:
            if e.group in gi:
                W[i][gi[e.group]] = e.weight
    kd = mathutils.kdtree.KDTree(len(ids))
    for k, i in enumerate(ids):
        kd.insert(vs_rest[i], k)
    kd.balance()
    radius = 0.006 * targets[side][2]
    for _ in range(3):
        nw = {}
        for i in ids:
            near = kd.find_range(vs_rest[i], radius)
            acc = [0.0] * len(gs)
            for co, k, dist in near:
                f = 1 - dist / radius * 0.5
                for g in range(len(gs)):
                    acc[g] += W[ids[k]][g] * f
            tot = sum(acc)
            nw[i] = [x / tot * hw[i] for x in acc] if tot > 0 else W[i]
        W = nw
    for i in ids:
        for g, x in zip(gs, W[i]):
            if x > 1e-4:
                g.add([i], x, "REPLACE")
            else:
                g.remove([i])

for o in bpy.data.objects:
    o.select_set(o in meshes or o == arm)
kw = dict(filepath=OUT, export_format="GLB", use_selection=True, export_skins=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_animations=False)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
log("wrote", OUT, "bones", len(arm.data.bones))
