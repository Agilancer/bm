"""Rigs the spell hands and animates their casts. Run inside Blender, through Blender MCP:

    path = ".../tools/fp_spells/hands.py"
    g = {"__file__": path, "__name__": "hands"}
    exec(compile(open(path).read(), path, "exec"), g)
    g["take"]()     # once, for the Attack sculpt: reads it from the owner's file
    g["take_fist"]()     # once, for the fist: from EmptyHand_L, the hand cut out of "Sword and empty hand.glb" in Blender, and EmptyHand_R, its mirror
    r = g["build"]("attack"); g["measure"](r); g["show"](r); g["pose_at"](r, "cast_both", 0.25)

Writes assets/fp/spell_<model>.glb, and leaves the same rig, posed, in Blender's scene SpellRig, seen by its camera exactly as the game's.

Each arm is two sculpts of the same size and scale on all three axes. Nothing is ever squeezed: the view model camera sees them at their
true depth, the fingers as round as they were modelled. A cast starts on the owner's closed fist (the empty hand of "Sword and empty
hand.glb", and its mirror). Fists can't open, their fingers are fused, so in the middle of the throw it gives way to the open sculpt with
its own fingers shut on the palm, and they fly open. Whichever isn't in use waits far below the screen.

Attack's open sculpt is the owner's "CASTING FINGERS CLOSER.glb", and its mesh is not to be changed: its points are the file's, under one
scale and one rigid move for the whole model, its fingers and its pose its own. All that moves it is the skeleton, shoulder, elbow, wrist, knuckles.
"""
import json
import os
import struct

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUILD = os.path.join(ROOT, "tools", "build", "spells")
VM_FOV = 76.0       # the renderer's view model camera, degrees up and down
RATE = 60           # samples a second
FINGERS = ("thumb", "index", "middle", "ring", "pinky")
SPLITS = dict(thumb=(0.38, 0.70), finger=(0.40, 0.72))    # where the two upper knuckles are, along a finger's own length
BASE_BACK = dict(thumb=0.06, finger=0.012)                  # how far behind where it parts from the hand a finger pivots, metres
CURL = dict(thumb=(55.0, 50.0, 36.0), finger=(55.0, 70.0, 45.0))    # each knuckle's bend, degrees, with a curl of 1
FINGER_CURL = dict(thumb=0.7, index=0.9, middle=1.0, ring=1.05, pinky=1.1)
RIPPLE = dict(index=0.0, middle=0.012, ring=0.024, pinky=0.036, thumb=0.02)     # a hand doesn't open all at once: seconds each finger lags
TUCK_MOST = dict(thumb=85.0, finger=42.0)    # how far, degrees, a finger will swing in towards the rest of them
SKIN_PASSES = 4     # how far weights are blended across a joint, in edges of the mesh
WRIST_BAND = 0.035  # the wrist bends a long way, so it blends further than that: metres, either side of it
WAITING = np.array([0.0, -8.0, 0.0])    # where the sculpt not in use goes
ELBOW_BAND = 0.05   # how far the elbow blends, metres, either side of it
TAKE_SCALE = 0.01   # the owner's file is in hundredths of the metres used here
BOTH_LAG = 0.02     # with both hands, the left a shade behind the right
HOLD_TIME = 2.4     # the loop that holds a channelled spell
HOLD = dict(near=0.006, curl=0.014, flex=1.2, shake=0.006)

# Where each model stands in the view.
#   back: from the sculpt's centre back to the eye, metres. spread, lift: each arm swung about its shoulder, outwards and upwards, degrees
#   drop: then the whole arm down, metres. (The sculpts' shoulders stand higher and wider than a body's: this brings them to where one's would be)
#   rest: the wrist at rest, degrees, negative is bent back, which turns a palm to the target; bending it forward turns a palm to the eye. palm_out: where magic gathers, out from the palm, metres
#   fist_roll: the fist about its forearm, degrees, as it is the moment it gives way to the open hand. fist_scale: the fist, the same on all axes, to the open arm's thickness at the wrist
#   source: the name of the sculpt's files, if not the model's own. eye, pitch: where the eye stands to the whole sculpt, metres and degrees, if not from its fitted camera
#   elbow: how far along the arm's length from the shoulder its elbow is, metres, if it has one
PLACE = dict(
    # As modelled, from one eye, through the game's lens: the owner's picture, within 21 pixels of 1024, with the sculpt not moved at all
    attack=dict(source="closer", eye=(0.0, -0.279, 0.444), pitch=-30.7, back=1.0, spread=0.0, lift=0.0, drop=0.0, rest=0.0, palm_out=0.05, fist_roll=0.0, fist_scale=1.1, elbow=0.22),
    raise_=dict(back=0.55, spread=2.0, lift=12.0, drop=0.15, rest=36.0, palm_out=0.08, fist_roll=150.0),
)

# The poses of a cast, one arm's worth, at key times. Between keys they ease. Missing values carry on from the key before.
#   away: how far out of sight the arm has gone: 1 is off the bottom of the screen, 0 at rest
#   near: towards the eye, metres. roll: about the screen, degrees, towards the middle. flex: wrist towards the palm, degrees
#   dev: wrist sideways. curl: fingers closing on the palm, 0 as sculpted. tuck: fingers drawn together, 0 as sculpted
#   turn: the arm about its own line, degrees. The fist is on from fist_roll. elbow: bent past its rest, degrees
#   oflex: the open hand's wrist alone, on top of flex: an open hand stands more upright on its arm than the fist does, and this lines them up for the swap, and brings the palm, where magic gathers, into the fist
POSE = dict(away=0.0, near=0.0, roll=0.0, flex=0.0, dev=0.0, curl=0.0, tuck=0.0, turn=0.0, elbow=0.0, oflex=0.0)
HIDDEN = dict(POSE, away=1.0, flex=12.0, curl=0.95, tuck=0.8, roll=-7.0)
A_REST = PLACE["attack"]["rest"]
R_REST = PLACE["raise_"]["rest"]
R_TURN = -PLACE["raise_"]["fist_roll"]

CLIPS = dict(
    # The fist comes up from below, the elbow draws it back, and it's thrown, the arm straightening behind it. It bursts open, past the sculpted claw, as the spell
    # leaves, the flash of that covering the moment one sculpt gives way to the other. The blast kicks the hand up and back into its pose, for a beat.
    # Then the arm starts down, the hand closing as it goes: it's the fist again by close, still in plain sight, and the fist sinks away.
    attack=dict(hit=0.27, wind=0.22, swap=0.2667, close=0.69, keys=[
        (0.00, dict(HIDDEN, near=0.02, elbow=16.0, oflex=28.0)),
        (0.12, dict(away=0.34, near=0.02, roll=-3.0, flex=6.0, elbow=14.0)),
        (0.22, dict(away=0.20, near=0.03, roll=-3.0, flex=8.0, elbow=18.0)),
        (0.2667, dict(away=0.12, near=0.0, roll=-1.0, flex=4.0, elbow=11.0)),
        (0.30, dict(away=0.03, near=-0.05, roll=3.0, flex=A_REST + 10.0, curl=-0.30, tuck=-0.06, elbow=-3.0, oflex=6.0)),
        (0.36, dict(away=-0.012, near=0.01, roll=0.0, flex=A_REST - 5.0, curl=0.0, tuck=0.0, elbow=1.5, oflex=0.0)),
        (0.50, dict(away=0.0, near=0.0, flex=A_REST, curl=0.0, elbow=0.0)),
        (0.56, dict(away=0.004, curl=0.03)),
        (0.66, dict(away=0.06, near=0.01, roll=-1.0, flex=2.0, curl=0.68, tuck=0.32, elbow=6.0, oflex=28.0)),
        (0.70, dict(away=0.11, flex=4.0, curl=0.78, tuck=0.36, elbow=9.0)),
        (0.76, dict(away=0.20, near=0.0, roll=-2.0, flex=6.0, elbow=12.0)),
        (0.95, dict(HIDDEN, near=0.02, elbow=16.0, oflex=28.0)),
    ]),
    # Palms up: the fists rise, knuckles up, and turn over as they come. Nearly over, they open, and what's in them lifts away.
    raise_=dict(hit=0.40, wind=0.30, swap=0.30, keys=[
        (0.00, dict(HIDDEN, turn=R_TURN)),
        (0.14, dict(away=0.36, near=0.02, roll=-3.0, flex=6.0, turn=R_TURN * 0.8)),
        (0.30, dict(away=0.12, roll=-1.0, flex=R_REST * 0.5, turn=-25.0, curl=0.5, tuck=0.25)),
        (0.40, dict(away=-0.03, near=-0.03, roll=0.0, flex=R_REST - 6.0, curl=-0.05, tuck=-0.02, turn=0.0)),
        (0.52, dict(away=0.005, near=0.0, flex=R_REST + 1.0, curl=0.01, tuck=0.0)),
        (0.66, dict(away=0.0, flex=R_REST, curl=0.0)),
        (0.72, dict(away=0.003, curl=0.02)),
        (1.00, dict(HIDDEN, curl=0.6, tuck=0.4, roll=-6.0, turn=-60.0)),
    ]),
)


def axis_angle(axis, deg):
    """deg, an array of degrees; the quaternions as x, y, z, w."""
    a = np.radians(np.asarray(deg, float)) / 2
    return np.concatenate([np.outer(np.sin(a), axis), np.cos(a)[:, None]], 1)


def qmul(a, b):
    x1, y1, z1, w1 = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    x2, y2, z2, w2 = b[..., 0], b[..., 1], b[..., 2], b[..., 3]
    return np.stack([w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
                     w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2], -1)


def unit(v):
    return v / np.linalg.norm(v)


def rotation(axis, deg):
    a = np.radians(deg)
    x, y, z = unit(np.asarray(axis, float))
    K = np.array([[0, -z, y], [z, 0, -x], [-y, x, 0]])
    return np.eye(3) + np.sin(a) * K + (1 - np.cos(a)) * K @ K


def turning(a, b):
    """The smallest rotation that takes direction a onto direction b."""
    a, b = unit(a), unit(b)
    v = np.cross(a, b)
    if np.linalg.norm(v) < 1e-8:
        return np.eye(3)
    return rotation(v, np.degrees(np.arctan2(np.linalg.norm(v), a @ b)))


class Glb:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accessors = [], []

    def view(self, data):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.views.append(dict(buffer=0, byteOffset=len(self.bin), byteLength=len(data)))
        self.bin += data
        return len(self.views) - 1

    def accessor(self, arr, kind, ctype, minmax=False):
        arr = np.asarray(arr)
        dt = {5126: "<f4", 5125: "<u4", 5123: "<u2"}[ctype]
        a = dict(bufferView=self.view(arr.astype(dt).tobytes()), componentType=ctype, count=len(arr), type=kind)
        if minmax:
            n = 1 if arr.ndim == 1 else arr.shape[1]
            flat = arr.reshape(len(arr), n)
            a["min"], a["max"] = [float(x) for x in flat.min(0)], [float(x) for x in flat.max(0)]
        self.accessors.append(a)
        return len(self.accessors) - 1


class Place:
    """From a sculpt into the view model's space: x right, y up, z back, the eye at the origin. Only ever rotates and moves."""

    def __init__(self, cam, spec):
        eye, at = np.array(cam["eye"]), np.array(cam["at"])
        self.cz = unit(at - eye)
        self.cx = unit(np.cross(self.cz, (0, 0, 1.0)))
        self.cy = np.cross(self.cx, self.cz)
        self.eye = at - spec["back"] * self.cz
        self.spec = spec
        self.arm = {}

    def _view(self, d):
        return np.stack([d @ self.cx, d @ self.cy, -(d @ self.cz)], -1)

    def set_arm(self, s, shoulder):
        sh = self._view(np.asarray(shoulder) - self.eye)
        yaw = self.spec["spread"] * (-1.0 if s == "R" else 1.0)
        self.arm[s] = (sh, rotation((0, 1, 0), yaw) @ rotation((1, 0, 0), self.spec["lift"]))

    def point(self, s, p):
        sh, R = self.arm[s]
        return (self._view(np.asarray(p) - self.eye) - sh) @ R.T + sh - np.array([0, self.spec["drop"], 0])

    def normal(self, s, n):
        return self._view(np.asarray(n)) @ self.arm[s][1].T


def fit_axis(p, t, deg=2):
    m = t > 0.15
    return np.linalg.lstsq(np.vander(t[m], deg + 1), p[m], rcond=None)[0]


def hand_of(Q, h, eye):
    """Where a hand's joints are, on the sculpt."""
    f = np.array(h["f"])
    on = np.where(f >= 0)[0]
    fs = {b["name"]: b for b in h["fingers"]}
    out = {}
    bases = []
    for name in FINGERS:
        b = fs[name]
        ids = np.array(b["verts"])
        t = np.clip((f[ids] - b["saddle"]) / (b["tip_f"] - b["saddle"]), 0, 1)
        co = fit_axis(Q[ids], t)
        at = lambda u: np.vander([u], 3)[0] @ co
        kind = "thumb" if name == "thumb" else "finger"
        p0 = at(0.0)
        direction = unit(at(0.3) - p0)
        p = [p0 - BASE_BACK[kind] * direction, at(SPLITS[kind][0]), at(SPLITS[kind][1]), at(1.0)]
        out[name] = dict(ids=ids, t=t, p=p, kind=kind, saddle=b["saddle"], tip_f=b["tip_f"])
        if name != "thumb":
            bases.append(p0)
    # the wrist: where the arm is narrowest, on its way to the hand
    top = min(fs[n]["saddle"] for n in FINGERS)
    edges = np.linspace(0.3 * top, 0.95 * top, 28)
    radius, centre = [], []
    for a, b in zip(edges, edges[1:]):
        ring = on[(f[on] >= a) & (f[on] < b)]
        if len(ring) < 8:
            radius.append(np.inf)
            centre.append(np.zeros(3))
            continue
        c = Q[ring].mean(0)
        centre.append(c)
        radius.append(np.median(np.linalg.norm(Q[ring] - c, axis=1)))
    i = int(np.argmin(radius))
    wrist = centre[i]
    stump = on[f[on] < 0.05]
    bases = np.array(bases)
    # the palm, and which way it faces: the way the fingers curl
    knuckles = bases.mean(0)
    n = unit(np.cross(bases[0] - bases[-1], knuckles - wrist))
    tips = np.mean([out[name]["p"][3] for name in FINGERS if name != "thumb"], axis=0)
    n = n if (tips - knuckles) @ n > 0 else -n
    f_wrist = 0.5 * (edges[i] + edges[i + 1])
    forearm = unit(wrist - Q[on[np.abs(f[on] - f_wrist + 0.12) < 0.02]].mean(0))
    return dict(f=f, on=on, fingers=out, wrist=wrist, f_wrist=f_wrist, forearm=forearm, shoulder=Q[stump].mean(0), palm=wrist + 0.62 * (knuckles - wrist), n=n)


def fist_of(V):
    """The fist's arm: its shoulder, its wrist, where it's narrowest on the way to the fist, and the way its forearm runs into that."""
    S = V[V[:, 1] < V[:, 1].min() + 0.03].mean(0)
    axis = unit(V[np.argmax(np.linalg.norm(V - S, axis=1))] - S)
    u = (V - S) @ axis
    edges = np.linspace(0.55 * u.max(), 0.9 * u.max(), 26)
    radius, centre = [], []
    for a, b in zip(edges, edges[1:]):
        ring = V[(u >= a) & (u < b)]
        c = ring.mean(0)
        centre.append(c)
        radius.append(np.median(np.linalg.norm(ring - c, axis=1)))
    W = centre[int(np.argmin(radius))]
    back = (W - S) @ axis
    return S, W, unit(W - V[np.abs(u - back + 0.12) < 0.02].mean(0))


def elbow_of(Q, h, f_elbow):
    """Where the line of the upper arm comes closest to the line of the forearm."""
    f, on = h["f"], h["on"]
    ring = lambda a, b: Q[on[(f[on] >= a) & (f[on] < b)]].mean(0)
    a, u = ring(0.04, 0.08), unit(ring(f_elbow - 0.06, f_elbow - 0.02) - ring(0.04, 0.08))
    w, v = h["wrist"], h["forearm"]
    s, t = np.linalg.lstsq(np.stack([u, -v], 1), w - a, rcond=None)[0]
    return 0.5 * (a + s * u + w + t * v)


def take():
    """The owner's Attack model, read from the file, and its fingers found. Run inside Blender."""
    import bpy
    with open(os.path.join(ROOT, "art", "fp_spells", "attack_closer.glb"), "rb") as fp:
        blob = fp.read()
    n = struct.unpack("<I", blob[12:16])[0]
    js = json.loads(blob[20:20 + n])
    data = blob[20 + n + 8:]

    def read(i):
        a = js["accessors"][i]
        v = js["bufferViews"][a["bufferView"]]
        size = dict(SCALAR=1, VEC2=2, VEC3=3)[a["type"]]
        dt = {5126: "<f4", 5125: "<u4", 5123: "<u2"}[a["componentType"]]
        return np.frombuffer(data, dt, a["count"] * size, v.get("byteOffset", 0) + a.get("byteOffset", 0)).reshape(-1, size)
    p = js["meshes"][0]["primitives"][0]
    Pg, Ng, Tg = (read(p["attributes"][k]).astype(np.float64) for k in ("POSITION", "NORMAL", "TEXCOORD_0"))
    V = np.stack([Pg[:, 0], -Pg[:, 2], Pg[:, 1]], 1) * TAKE_SCALE     # (from y up to z up: only a turn of the whole)
    N = np.stack([Ng[:, 0], -Ng[:, 2], Ng[:, 1]], 1)
    uv = np.stack([Tg[:, 0], 1 - Tg[:, 1]], 1)
    tri = read(p["indices"]).reshape(-1, 3).astype(np.int64)
    sc = bpy.context.window.scene
    old = bpy.data.objects.get("closer")
    if old:
        bpy.data.objects.remove(old)
    me = bpy.data.meshes.new("closer")
    me.from_pydata(V.tolist(), [], tri.tolist())
    me.update()
    o = bpy.data.objects.new("closer", me)
    sc.collection.objects.link(o)
    o.hide_set(True)
    path = os.path.join(ROOT, "tools", "fp_spells", "fingers.py")
    g = dict(__file__=path, __name__="fingers")
    exec(compile(open(path, encoding="utf-8").read(), path, "exec"), g)
    g["find_fingers"]("closer")
    np.savez(os.path.join(BUILD, "closer_fixed.npz"), V=V, uv=uv, tri=tri, N=N, inv=np.load(os.path.join(BUILD, "closer_mesh.npz"))["inv"])


def take_fist():
    """The fist's arm, as hands.py and skin_tone.py use it, from Blender's objects EmptyHand_L and EmptyHand_R."""
    import bpy
    out = {}
    for s in "LR":
        o = bpy.data.objects["EmptyHand_" + s]
        me = o.data
        n = len(me.vertices)
        P, nv = np.empty(n * 3), np.empty(n * 3)
        me.vertices.foreach_get("co", P)
        me.vertex_normals.foreach_get("vector", nv)
        M = np.array(o.matrix_world)
        Nw = nv.reshape(-1, 3) @ np.linalg.inv(M[:3, :3])
        me.calc_loop_triangles()
        tri = np.empty(len(me.loop_triangles) * 3, int)
        me.loop_triangles.foreach_get("vertices", tri)
        at, lu = np.empty(len(me.loops), int), np.empty(len(me.loops) * 2)
        me.loops.foreach_get("vertex_index", at)
        me.uv_layers.active.data.foreach_get("uv", lu)
        uv = np.zeros((n, 2))
        uv[at] = lu.reshape(-1, 2)
        out["V_" + s] = P.reshape(-1, 3) @ M[:3, :3].T + M[:3, 3]
        out["N_" + s] = Nw / np.linalg.norm(Nw, axis=1, keepdims=True)
        out["uv_" + s] = uv
        out["tri_" + s] = tri.reshape(-1, 3)
    np.savez(os.path.join(BUILD, "fist_arm.npz"), **out)


def build(model):
    key = "raise_" if model == "raise" else model
    spec, clip_spec = PLACE[key], CLIPS[key]
    source = spec.get("source", model)
    jointed = "elbow" in spec
    d = np.load(os.path.join(BUILD, source + "_fixed.npz"))
    V, uv, tri, N, inv = d["V"], d["uv"], d["tri"], d["N"], d["inv"]
    if "eye" in spec:
        p_ = np.radians(spec["pitch"])
        cam = dict(eye=spec["eye"], at=np.array(spec["eye"]) + spec["back"] * np.array([0.0, np.cos(p_), np.sin(p_)]))
    else:
        cam = json.load(open(os.path.join(BUILD, source + "_camera.json")))
    hands = json.load(open(os.path.join(BUILD, source + "_fingers.json")))["hands"]
    n_q = inv.max() + 1
    Q = np.zeros((n_q, 3))
    Q[inv] = V
    place = Place(cam, spec)
    H_ = {s: hand_of(Q, hands[s], place.eye) for s in "RL"}
    for s in "RL":
        place.set_arm(s, H_[s]["shoulder"])
    fg = 1 / np.tan(np.radians(VM_FOV) / 2)

    names, parent, pos = [], {}, {}

    def joint(name, up, p):
        names.append(name)
        parent[name] = up
        pos[name] = np.asarray(p, float)

    joint("root", None, np.zeros(3))
    for s in "RL":
        h = H_[s]
        n_view = place.normal(s, h["n"])
        shoulder, wrist = place.point(s, h["shoulder"]), place.point(s, h["wrist"])
        elbow = place.point(s, elbow_of(Q, h, spec["elbow"])) if jointed else None
        joint("pose_" + s, "root", shoulder)        # carries the arm through the clip, whichever sculpt is showing
        if jointed:
            joint("elbow_" + s, "pose_" + s, elbow)
        joint("wrist_" + s, ("elbow_" if jointed else "pose_") + s, wrist)
        joint("palm_" + s, "wrist_" + s, place.point(s, h["palm"]) + n_view * spec["palm_out"])
        joint("arm_" + s, "pose_" + s, shoulder)    # the open sculpt
        if jointed:
            joint("fore_" + s, "arm_" + s, elbow)
        joint("hand_" + s, ("fore_" if jointed else "arm_") + s, wrist)
        for name in FINGERS:
            for k in range(3):
                joint("%s%d_%s" % (name, k + 1, s), ("%s%d_%s" % (name, k, s)) if k else "hand_" + s, place.point(s, h["fingers"][name]["p"][k]))
        joint("garm_" + s, "pose_" + s, shoulder)   # the fist's
        if jointed:
            joint("gfore_" + s, "garm_" + s, elbow)
        joint("gfist_" + s, ("gfore_" if jointed else "garm_") + s, wrist)
    joint("weapon", "palm_R", pos["palm_R"])        # (the renderer and the sim's arms both ask for these two)
    joint("weapon_tip", "weapon", pos["palm_R"] + np.array([0, 0, -0.1]))
    index = {n: i for i, n in enumerate(names)}

    # --- the open sculpt: which bone each point follows, blended across the mesh
    bone = np.full(n_q, -1)
    for s in "RL":
        h = H_[s]
        side = h["on"]
        limb = np.where(h["f"][side] < spec["elbow"], index["arm_" + s], index["fore_" + s]) if jointed else index["arm_" + s]
        bone[side] = np.where(h["f"][side] < h["f_wrist"], limb, index["hand_" + s])
        for name in FINGERS:
            g = h["fingers"][name]
            a, b = SPLITS[g["kind"]]
            bone[g["ids"]] = [index["%s%d_%s" % (name, 3 if u > b else 2 if u > a else 1, s)] for u in g["t"]]
        # a thumb's root is in the mound of the hand
        g = h["fingers"]["thumb"]
        base, tip = np.array(g["p"][0]), np.array(g["p"][1])
        u_ = unit(tip - base)
        rest = side[(h["f"][side] >= g["saddle"] - BASE_BACK["thumb"]) & (h["f"][side] < g["saddle"])]
        dv = Q[rest] - base
        off = np.linalg.norm(dv - (dv @ u_)[:, None] * u_, axis=1)
        r_ = np.median(np.linalg.norm(Q[g["ids"]] - Q[g["ids"]].mean(0), axis=1))
        bone[rest[off < 1.4 * r_]] = index["thumb1_" + s]
    if (bone < 0).any():
        bone[bone < 0] = index["root"]
    welded = inv[tri]
    edges = np.unique(np.sort(np.vstack([welded[:, [0, 1]], welded[:, [1, 2]], welded[:, [2, 0]]]), axis=1), axis=0)
    edges = edges[edges[:, 0] != edges[:, 1]]
    W_ = np.zeros((n_q, len(names)), np.float32)
    W_[np.arange(n_q), bone] = 1
    deg = np.maximum(np.bincount(edges.ravel(), minlength=n_q), 1)[:, None]
    for _ in range(SKIN_PASSES):
        s_ = np.zeros_like(W_)
        np.add.at(s_, edges[:, 0], W_[edges[:, 1]])
        np.add.at(s_, edges[:, 1], W_[edges[:, 0]])
        W_ = 0.5 * W_ + 0.5 * s_ / deg
    for s in "RL":
        h = H_[s]
        arm, hand = index[("fore_" if jointed else "arm_") + s], index["hand_" + s]
        ids = h["on"][W_[h["on"], arm] + W_[h["on"], hand] > 0.999]
        w = np.clip((h["f"][ids] - h["f_wrist"] + WRIST_BAND) / (2 * WRIST_BAND), 0, 1)
        w = w * w * (3 - 2 * w)
        W_[ids, arm], W_[ids, hand] = 1 - w, w
        if jointed:
            arm, fore = index["arm_" + s], index["fore_" + s]
            ids = h["on"][W_[h["on"], arm] + W_[h["on"], fore] > 0.999]
            w = np.clip((h["f"][ids] - spec["elbow"] + ELBOW_BAND) / (2 * ELBOW_BAND), 0, 1)
            w = w * w * (3 - 2 * w)
            W_[ids, arm], W_[ids, fore] = 1 - w, w
    top = np.argsort(-W_, axis=1)[:, :4]
    wts = np.take_along_axis(W_, top, 1)
    wts /= wts.sum(1, keepdims=True)

    side_of = np.zeros(len(V), int)
    r_on = np.zeros(n_q, bool)
    r_on[H_["R"]["on"]] = True
    side_of = r_on[inv]
    pv, nv = np.zeros_like(V), np.zeros_like(N)
    for s, m in (("R", side_of), ("L", ~side_of)):
        pv[m] = place.point(s, V[m])
        nv[m] = place.normal(s, N[m])

    # --- the fist: laid along the open arm, wrist on wrist
    fa = np.load(os.path.join(BUILD, "fist_arm.npz"))
    f_pos, f_nrm, f_uv, f_tri, f_jnt, f_wts = [], [], [], [], [], []
    base = 0
    for s in "RL":
        h = H_[s]
        Vf, Nf = fa["V_" + s], fa["N_" + s]
        Sf, Wf, fore = fist_of(Vf)
        axis = h["forearm"]
        R = rotation(axis, spec["fist_roll"] * (1.0 if s == "L" else -1.0)) @ turning(fore, axis)
        q = (Vf - Wf) @ R.T * spec.get("fist_scale", 1.0) + h["wrist"]
        p_ = place.point(s, q)
        u = (q - h["wrist"]) @ axis
        w = np.clip((u + 0.025) / 0.05, 0, 1)
        w = w * w * (3 - 2 * w)
        f_pos.append(p_)
        f_nrm.append(place.normal(s, Nf @ R.T))
        f_uv.append(fa["uv_" + s])
        f_tri.append(fa["tri_" + s] + base)
        base += len(Vf)
        f_jnt.append(np.stack([np.full(len(u), index[("gfore_" if jointed else "garm_") + s]), np.full(len(u), index["gfist_" + s]), np.zeros(len(u), int), np.zeros(len(u), int)], 1))
        f_wts.append(np.stack([1 - w, w, np.zeros(len(u)), np.zeros(len(u))], 1))
        print("%s fist: wrist was %s, moved %.3f, forearm off by %.1f deg" % (s, np.round(Wf, 3), np.linalg.norm(h["wrist"] - Wf), np.degrees(np.arccos(np.clip(fore @ axis, -1, 1)))))
    f_pos, f_nrm, f_uv, f_tri, f_jnt, f_wts = np.vstack(f_pos), np.vstack(f_nrm), np.vstack(f_uv), np.vstack(f_tri), np.vstack(f_jnt), np.vstack(f_wts)

    # --- the axes a hand moves about, in the view model's space
    axes = {}
    c_ = 1.12 / fg      # (just under the bottom of the screen)
    for s in "RL":
        h = H_[s]
        n_view = place.normal(s, h["n"])
        wrist, shoulder = pos["hand_" + s], pos["arm_" + s]
        along = unit(wrist - shoulder)
        mid = unit(pos["middle1_" + s] - wrist)
        tips = {}
        for name in FINGERS:
            dirs = [unit(place.point(s, h["fingers"][name]["p"][k + 1]) - place.point(s, h["fingers"][name]["p"][k])) for k in range(3)]
            tips[name] = dict(curl=[unit(np.cross(x, n_view)) for x in dirs], d=dirs[0])
        for name in FINGERS:
            ref = tips["index" if name == "thumb" else "middle"]["d"]
            d0 = tips[name]["d"]
            # (signed, about the palm's normal: how far round this finger stands from the one it closes on)
            most = TUCK_MOST["thumb" if name == "thumb" else "finger"]
            tips[name]["tuck"] = float(np.clip(np.degrees(np.arctan2(np.cross(d0, ref) @ n_view, d0 @ ref)), -most, most))
        # an arm comes in along its own line and up from below: how far back along that everything of it, this side of the eye, is off the screen
        enter = unit(along + np.array([0, 1.0, 0]))
        pts = pv[side_of if s == "R" else ~side_of]
        pts = pts[pts[:, 2] < -0.1]
        gone = float(np.max((pts[:, 1] - c_ * pts[:, 2]) / (enter[1] - c_ * enter[2])))
        axes[s] = dict(n=n_view, along=along, enter=enter, flex=unit(np.cross(mid, n_view)), fingers=tips, gone=gone, sign=1.0 if s == "R" else -1.0)
        if jointed:     # (the way that closes the forearm on the upper arm)
            axes[s]["bend"] = unit(np.cross(pos["fore_" + s] - shoulder, wrist - pos["fore_" + s]))

    # --- the clips
    def eased(keys, t):
        """Each value along t, through its keys, on a curve that carries its speed through them: only a turn or a stop slows it."""
        times = np.array([k[0] for k in keys])
        filled, last = [], dict(POSE)
        for _, k in keys:
            last = dict(last, **k)
            filled.append(last)
        out = {}
        h = np.diff(times)
        i = np.clip(np.searchsorted(times, t, side="right") - 1, 0, len(times) - 2)
        u = np.clip((t - times[i]) / h[i], 0, 1)
        for name in POSE:
            vals = np.array([k[name] for k in filled], float)
            d = np.diff(vals) / h
            m = np.zeros(len(vals))
            same = d[:-1] * d[1:] > 0
            m[1:-1][same] = 2 * d[:-1][same] * d[1:][same] / (d[:-1][same] + d[1:][same])
            out[name] = ((2 * u ** 3 - 3 * u ** 2 + 1) * vals[i] + (u ** 3 - 2 * u ** 2 + u) * h[i] * m[i]
                         + (3 * u ** 2 - 2 * u ** 3) * vals[i + 1] + (u ** 3 - u ** 2) * h[i] * m[i + 1])
        return out

    def arm_tracks(s, t, pose_of, opened):
        ax = axes[s]
        p = pose_of(t)
        tr, ro = {}, {}
        tr["pose_" + s] = pos["pose_" + s] - np.outer(p["away"] * ax["gone"], ax["enter"]) + np.outer(p["near"], (0, 0, 1.0))
        ro["pose_" + s] = axis_angle((0, 0, 1.0), p["roll"] * ax["sign"])
        o = opened(t)
        tr["arm_" + s] = np.outer(~o, WAITING)
        # No flash covers the fist's return, and between samples a sculpt on its way is out of sight: so the fist is there a sample before the open hand goes.
        tr["garm_" + s] = np.outer(o & np.r_[o[1:], o[-1]], WAITING)
        turned = axis_angle(ax["along"], -p["turn"] * ax["sign"])
        ro["garm_" + s] = ro["arm_" + s] = turned
        bend = qmul(axis_angle(ax["flex"], p["flex"]), axis_angle(ax["n"], -p["dev"] * ax["sign"]))
        ro["gfist_" + s] = bend
        ro["hand_" + s] = qmul(axis_angle(ax["flex"], p["oflex"]), bend)
        ro["wrist_" + s] = qmul(turned, ro["hand_" + s])
        if jointed:
            ro["elbow_" + s] = ro["fore_" + s] = ro["gfore_" + s] = axis_angle(ax["bend"], p["elbow"])
        for name in FINGERS:
            q = pose_of(t - RIPPLE[name])
            g = ax["fingers"][name]
            kind = "thumb" if name == "thumb" else "finger"
            for k in range(3):
                r = axis_angle(g["curl"][k], q["curl"] * CURL[kind][k] * FINGER_CURL[name])
                if k == 0:
                    r = qmul(r, axis_angle(ax["n"], q["tuck"] * g["tuck"]))
                ro["%s%d_%s" % (name, k + 1, s)] = r
        return tr, ro

    dur = clip_spec["keys"][-1][0]
    t = np.arange(0, int(round(dur * RATE)) + 1) / RATE
    hidden = lambda u: {n: np.full(len(u), HIDDEN[n], float) for n in POSE}
    cast = lambda lag: (lambda u: eased(clip_spec["keys"], u - lag))
    swapped = lambda lag: (lambda u: (u - lag >= clip_spec["swap"] - 1e-6) & (u - lag < clip_spec.get("close", np.inf) - 1e-6))
    always = lambda u: np.ones(len(u), bool)
    clips = {}
    meta = {}
    for name, poses in (("cast_r", dict(R=(cast(0), swapped(0)), L=(hidden, always))), ("cast_l", dict(R=(hidden, always), L=(cast(0), swapped(0)))),
                        ("cast_both", dict(R=(cast(0), swapped(0)), L=(cast(BOTH_LAG), swapped(BOTH_LAG))))):
        trs, ros = {}, {}
        for s in "RL":
            a, b = arm_tracks(s, t, *poses[s])
            trs.update(a)
            ros.update(b)
        clips[name] = (t, trs, ros)
        meta[name] = dict(duration=float(t[-1]), hit=clip_spec["hit"], wind=clip_spec["wind"], through=clip_spec["hit"] + 0.06)

    # the hold: the pose at rest, alive, for as long as a channelled spell runs. It loops, so everything in it does.
    th = np.arange(0, int(HOLD_TIME * RATE) + 1) / RATE
    wob = lambda u, a, b: np.sin(2 * np.pi * (a * u / HOLD_TIME + b))

    def held(phase):
        def of(u):
            p = {n: np.zeros(len(u)) for n in POSE}
            p["near"] = HOLD["near"] * wob(u, 2, phase) + HOLD["shake"] * 0.3 * wob(u, 17, phase)
            p["flex"] = spec["rest"] + HOLD["flex"] * wob(u, 3, phase + 0.3) + 0.5 * wob(u, 23, phase)
            p["curl"] = 0.01 + HOLD["curl"] * wob(u, 5, phase + 0.1) + 0.006 * wob(u, 31, phase)
            p["away"] = HOLD["shake"] * wob(u, 13, phase + 0.2)
            p["elbow"] = HOLD["flex"] * 0.5 * wob(u, 2, phase + 0.15)
            return p
        return of
    for name, poses in (("hold_r", dict(R=held(0.0), L=hidden)), ("hold_l", dict(R=hidden, L=held(0.0))), ("hold_both", dict(R=held(0.0), L=held(0.37)))):
        trs, ros = {}, {}
        for s in "RL":
            a, b = arm_tracks(s, th, poses[s], always)
            trs.update(a)
            ros.update(b)
        clips[name] = (th, trs, ros)
        meta[name] = dict(duration=float(th[-1]), loop=True)

    for s in "RL":
        a = axes[s]
        print("%s: wrist %s, palm %s, palm faces %s (%.0f deg off dead ahead), out of sight at %.2f" % (s, np.round(pos["hand_" + s], 3), np.round(pos["palm_" + s], 3),
              np.round(a["n"], 2), np.degrees(np.arccos(np.clip(-a["n"][2], -1, 1))), a["gone"]))
    assert len(names) <= 56

    # --- the file
    g = Glb()
    nodes = []
    for n in names:
        node = dict(name=n, translation=[float(x) for x in (pos[n] - pos[parent[n]] if parent[n] else pos[n])], rotation=[0.0, 0.0, 0.0, 1.0])
        kids = [index[c] for c in names if parent[c] == n]
        if kids:
            node["children"] = kids
        nodes.append(node)

    def prim(p, n_, uv_, j, w, idx, material):
        return dict(attributes=dict(POSITION=g.accessor(p, "VEC3", 5126, minmax=True), NORMAL=g.accessor(n_, "VEC3", 5126),
                                    TEXCOORD_0=g.accessor(np.stack([uv_[:, 0], 1 - uv_[:, 1]], 1), "VEC2", 5126),
                                    JOINTS_0=g.accessor(j, "VEC4", 5123), WEIGHTS_0=g.accessor(w, "VEC4", 5126)),
                    indices=g.accessor(idx.ravel(), "SCALAR", 5125), material=material)
    meshes = [dict(name="open", primitives=[prim(pv, nv, uv, top[inv], wts[inv], tri, 0)]),
              dict(name="fist", primitives=[prim(f_pos, f_nrm, f_uv, f_jnt, f_wts, f_tri, 1)])]
    ibm = np.zeros((len(names), 16))
    for i, n in enumerate(names):
        M = np.eye(4)
        M[3, :3] = -pos[n]      # (by column: a translation, back to the joint)
        ibm[i] = M.ravel()
    a_ibm = g.accessor(ibm, "MAT4", 5126)
    images = []
    for prefix in (source, "fist"):
        for part in ("skin", "mr", "nrm"):
            name = "%s_%s.jpg" % (prefix, part)
            with open(os.path.join(BUILD, name), "rb") as fp:
                images.append(dict(bufferView=g.view(fp.read()), mimeType="image/jpeg", name=name))
    materials = [dict(name=n_, pbrMetallicRoughness=dict(baseColorTexture=dict(index=i), metallicRoughnessTexture=dict(index=i + 1)), normalTexture=dict(index=i + 2))
                 for n_, i in (("open", 0), ("fist", 3))]
    animations = []
    for name, (tt, trs, ros) in clips.items():
        a_t = g.accessor(tt, "SCALAR", 5126, minmax=True)
        samplers, channels = [], []
        for path, tracks, kind in (("translation", trs, "VEC3"), ("rotation", ros, "VEC4")):
            for bone_name, data in tracks.items():
                samplers.append(dict(input=a_t, output=g.accessor(data, kind, 5126), interpolation="LINEAR"))
                channels.append(dict(sampler=len(samplers) - 1, target=dict(node=index[bone_name], path=path)))
        animations.append(dict(name=name, samplers=samplers, channels=channels))
    i_mesh = len(nodes)
    nodes.append(dict(name="open", mesh=0, skin=0))
    nodes.append(dict(name="fist", mesh=1, skin=0))
    extras = dict(clips=meta, view=dict(fov=VM_FOV, near=0.05), model=model, palm=dict(R="palm_R", L="palm_L"), sword=None)
    gltf = dict(asset=dict(version="2.0", generator="bm tools/fp_spells/hands.py"), scene=0,
                scenes=[dict(name="spell_" + model, nodes=[index["root"], i_mesh, i_mesh + 1], extras=extras)],
                nodes=nodes, meshes=meshes,
                skins=[dict(name="hands", joints=list(range(len(names))), inverseBindMatrices=a_ibm, skeleton=index["root"])],
                materials=materials, textures=[dict(source=i, sampler=0) for i in range(6)],
                samplers=[dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)],
                images=images, animations=animations, accessors=g.accessors, bufferViews=g.views, buffers=[dict(byteLength=0)])
    while len(g.bin) % 4:
        g.bin.append(0)
    gltf["buffers"][0]["byteLength"] = len(g.bin)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(g.bin)
    out = os.path.join(ROOT, "assets", "fp", "spell_%s.glb" % model)
    with open(out, "wb") as fp:
        fp.write(struct.pack("<III", 0x46546C67, 2, total))
        fp.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        fp.write(struct.pack("<II", len(g.bin), 0x004E4942) + bytes(g.bin))
    print("wrote %s: %.2f MB, %d joints, %d + %d points, %d clips" % (os.path.basename(out), total / 1e6, len(names), len(V), len(f_pos), len(clips)))
    return dict(model=model, source=source, names=names, parent=parent, pos=pos, clips=clips, Q=Q, H=H_, place=place,
                open=dict(p=pv, n=nv, uv=uv, tri=tri, j=top[inv], w=wts[inv]), fist=dict(p=f_pos, n=f_nrm, uv=f_uv, tri=f_tri, j=f_jnt, w=f_wts))


def measure(r):
    """How round the fingers are, as they ship: each segment's cross-section, its thin way over its wide way. 1 is a perfect circle."""
    all_ratios = []
    for s in "RL":
        h = r["H"][s]
        row = []
        for name in FINGERS:
            g = h["fingers"][name]
            pts = r["place"].point(s, r["Q"][g["ids"]])
            ratios = []
            for u0 in (0.3, 0.55, 0.8):
                ring = pts[np.abs(g["t"] - u0) < 0.05]
                if len(ring) < 8:
                    continue
                c = ring - ring.mean(0)
                along = unit(pts[np.argmin(np.abs(g["t"] - min(u0 + 0.1, 1)))] - pts[np.argmin(np.abs(g["t"] - (u0 - 0.1)))])
                c = c - (c @ along)[:, None] * along
                ev = np.sqrt(np.maximum(np.linalg.eigvalsh(c.T @ c / len(c)), 0))
                ratios.append(float(ev[1] / ev[2]))
            row.append("%s %s" % (name, "/".join("%.2f" % x for x in ratios)))
            all_ratios += ratios
        print(s, "; ".join(row))
    print("thin over wide: lowest %.2f, median %.2f, highest %.2f" % (min(all_ratios), float(np.median(all_ratios)), max(all_ratios)))


def show(r):
    """The rig in Blender, in the scene SpellRig, seen by a camera that is the game's: at the origin, looking down -z."""
    import math
    import bpy
    sc = bpy.data.scenes.get("SpellRig") or bpy.data.scenes.new("SpellRig")
    bpy.context.window.scene = sc
    model = r["model"]
    cam = bpy.data.objects.get("rig_cam")
    if cam is None:
        cam = bpy.data.objects.new("rig_cam", bpy.data.cameras.new("rig_cam"))
        sc.collection.objects.link(cam)
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(VM_FOV)
    cam.data.clip_start = 0.05
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    for o in list(sc.objects):
        if o.name.split("_")[0] == model:
            bpy.data.objects.remove(o)
        elif o is not cam:
            o.hide_set(True)
    data = bpy.data.armatures.new(model + "_rig")
    rig = bpy.data.objects.new(model + "_rig", data)
    sc.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="EDIT")
    for n in r["names"]:
        b = data.edit_bones.new(n)
        b.head = r["pos"][n].tolist()
        b.tail = (r["pos"][n] + [0, 0.02, 0]).tolist()
        b.roll = 0
    for n in r["names"]:
        if r["parent"][n]:
            data.edit_bones[n].parent = data.edit_bones[r["parent"][n]]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in rig.pose.bones:
        pb.rotation_mode = "QUATERNION"
    rig.show_in_front = True
    rig.hide_set(True)

    def mesh(part, prefix):
        d = r[part]
        me = bpy.data.meshes.new("%s_%s" % (model, part))
        me.from_pydata(d["p"].tolist(), [], d["tri"].tolist())
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        me.update()
        me.normals_split_custom_set_from_vertices(d["n"].tolist())
        layer = me.uv_layers.new(name="UV")
        for lp, l in zip(layer.data, me.loops):
            lp.uv = d["uv"][l.vertex_index]
        mat = bpy.data.materials.new("%s_%s" % (model, part))
        mat.use_nodes = True
        nt = mat.node_tree
        bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")

        def tex(suffix, colour):
            t = nt.nodes.new("ShaderNodeTexImage")
            t.image = bpy.data.images.load(os.path.join(BUILD, "%s_%s.jpg" % (prefix, suffix)), check_existing=True)
            if not colour:
                t.image.colorspace_settings.name = "Non-Color"
            return t
        nt.links.new(tex("skin", True).outputs[0], bsdf.inputs["Base Color"])
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(tex("nrm", False).outputs[0], nm.inputs["Color"])
        nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.6
        me.materials.append(mat)
        o = bpy.data.objects.new("%s_%s" % (model, part), me)
        sc.collection.objects.link(o)
        groups = [o.vertex_groups.new(name=n) for n in r["names"]]
        for i, (js, ws) in enumerate(zip(d["j"].tolist(), d["w"].tolist())):
            for j, w in zip(js, ws):
                if w > 0.001:
                    groups[j].add([i], w, "REPLACE")
        mod = o.modifiers.new("arm", "ARMATURE")
        mod.object = rig
        mod.use_deform_preserve_volume = True
        return o
    mesh("open", r["source"])
    mesh("fist", "fist")
    r["rig"] = rig
    bpy.app.driver_namespace["bm_rig_" + model] = r


def pose_at(r, clip, t):
    """Sets the Blender rig to where a clip has it at time t."""
    import bpy
    tt, trs, ros = r["clips"][clip]
    i = int(np.argmin(np.abs(tt - t)))
    rig = bpy.data.objects[r["model"] + "_rig"]
    for n in r["names"]:
        pb = rig.pose.bones[n]
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        if n in trs:
            rest = r["pos"][n] - (r["pos"][r["parent"][n]] if r["parent"][n] else 0)
            pb.location = (trs[n][i] - rest).tolist()
        if n in ros:
            q = ros[n][i]
            pb.rotation_quaternion = (float(q[3]), float(q[0]), float(q[1]), float(q[2]))
    bpy.context.view_layer.update()
