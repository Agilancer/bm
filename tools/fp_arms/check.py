"""Checks the finished assets/fp/arms_*.glb against the rules, from the file alone (none of the solver):
every joint is read back and posed from the GLB's own tracks.

  * the tip is on the X at the hit, on a frame;
  * while it's on screen it keeps to the drawn line through the X;
  * both fists stay put on the sword;
  * the blade's speed through the swing is one bell: no holds, no second wind, no jumps;
  * every blow starts and ends on the one guard, so any can follow any;
  * the follow-through carries well past the hit (the game's two-handers carried 33 degrees, 24 on the
    slam; its one-handers 38 to 68);
  * the fist never whips across the screen, and an arm's cut-off end never comes into view;
  * the sculpt's unpainted back (the arm's far side, baked nearly black) never shows: at most DARK_MAX of the screen, on the
    skinned mesh itself, facing the eye and in frame; and the near plane never cuts a hole in an arm on the screen;
  * no joint jumps: none turns further in one frame than JOINT_MAX;
  * on a one-hander the arm carries the swing, not the wrist: from the wind-up to the end of the follow-through the wrist only
    cocks in the blade's own plane (at most COCK_MAX from how the sculpt holds it, and no further back than BACK_MAX), and
    hardly goes sideways (SIDEWAYS_MAX), which is what reads as a broken wrist;
  * and what the eye gets from the hit to the end of the follow-through: the hand stays up (HAND_LOW), the forearm and the handle
    don't fold against each other on the screen (FOLD_MAX), the fist doesn't hang off the forearm's line (HOOK_MAX), the forearm
    and handle don't bend apart in space either (BEND_MAX), and the steel and the forearm both show (STEEL_MIN, FOREARM_MIN);
  * the arm carries the finish: the fist keeps travelling on the screen (TRAVEL_MIN), and the blade doesn't turn much further
    than the forearm does (TURN_MAX). A blade turning about a still fist is a wrist doing the arm's work;
  * a one-hander's cut is a cut, with weight: the knuckle edge leads through the hit (EDGE_MIN), never the back of the blade; the arm's
    fastest in the frames before the hit, not on the way up or the way back (PEAK_FRAMES, RISE_MAX, HOME_MAX), the blade's tip fastest
    within a frame or two of it; nothing stops dead from the wind-up till it's home (STILL_MAX), and the tip carries on well past the X
    (TIP_CARRY: Bellmourn's own one-hander goes 0.37 m);
  * the blade is one length: from the fist to the tip it's the same on every frame, with nothing scaled (LENGTH_OFF), and a one-hander's
    looks it. On the screen, guard to tip, it doesn't swell and shrink through a blow (SHOWN_SWING) or change quickly at any time (SHOWN_RATE).

(Whether a one-hander's pommel shows through the skin takes the skinned mesh: tools/fp_arms/blender_check.py.)

    python tools/fp_arms/check.py [2h|1h]     # exits non-zero if a rule fails
"""
import io
import json
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASPECT = 16 / 9
FIST_MAX = 8.0      # metres a second: past this a fist reads as a pop, not a swing
JOINT_MAX = 25.0    # degrees a joint may turn in one frame (a 60th of a second): past this it reads as a pop
SIDEWAYS_MAX, COCK_MAX, BACK_MAX = 30.0, 70.0, 20.0     # degrees a one-hander's wrist may go, through a blow (see above)
HAND_LOW = -1.06    # a one-hander's fist, from the hit on: no lower on the screen than this (from -1 to 1; the game's own overhead chop has it about -0.8)
FOLD_WHOLE = 62.0   # ...and at any time in a blow, on one fist (the handle's further from the forearm's line at the top of a wind-up, with the wrist cocked)
FOLD_MAX = {"1h": 45.0, "2h": 70.0}     # degrees between forearm and handle on the screen, past the hit (0: one straight line; a hammer's square is 90)
HOOK_MAX = 0.13     # how far a fist may hang off its forearm's line on the screen, past the hit (half the screen's height is 1)
BEND_MAX = {"1h": 30.0, "2h": 60.0}     # degrees between forearm and handle in space, past the hit
STEEL_MIN, FOREARM_MIN = {"1h": 0.60, "2h": 0.40}, {"1h": 0.25, "2h": 0.15}     # how much of each shows on the screen: the steel, from the guard to the tip, past the hit, and the forearm at the hit (half the screen's height is 1)
GUARD_AT = 0.065    # the guard, along the sword from the fist (metres)
TRAVEL_MIN = 0.25   # how far the fist gets on the screen past the hit, by the end of the follow-through (half the screen's height is 1)
TURN_MAX = 55.0     # degrees the blade may turn on the screen beyond what the forearm does, over the same stretch
DARK_MAX = 0.012    # the share of the screen the sculpt's unpainted back may fill, on any frame (what's behind the shield counts too)
CARRY_MIN = {"2h": 30}
EDGE_MIN = 0.70      # the knuckle edge against the way the tip's going, at the hit (1: dead true; it sits a little off so its flat shows)
PEAK_FRAMES = 4      # how many frames before the hit the fist may be at its fastest in the strike
RISE_MAX, HOME_MAX = 0.70, 0.70      # the fist's top speed on the way up and on the way home, against the strike's
STILL_MAX = 8        # frames in a row the tip may hardly move (under STILL_SPEED m/s), from the top of the wind-up till nearly home
STILL_SPEED = 0.35
TIP_CARRY = 0.55     # metres the tip goes on past the X, from the hit to the end of the follow-through
LENGTH_OFF = 1e-3    # metres a sword's length from the fist to the tip may change by
FLAT_MIN = 10.0      # the degrees a one-hander's flat is turned to the eye, from the top of the wind-up to the end of the follow-through: under it the blade's a wire
SHOWN_SWING = 1.85   # how many times longer the blade may look at its longest than its shortest, from the wind-up to the end of the follow-through
SHOWN_RATE = 1.45     # ...and in any tenth of a second of the clip
FOLDED_MAX = 80.0     # a one-hander's cuts: how far the elbow must fold on the draw-back (the degrees inside it)
ELBOW_OPENS = 50.0    # ...and how many degrees it must open from there through the strike: it's the elbow that swings
DRAWN_BACK = 0.25     # ...and how near the eye the fist must come (metres ahead): drawn right back, off the screen


def read(model):
    raw = open(os.path.join(ROOT, "assets", "fp", f"arms_{model}.glb"), "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    b = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a["componentType"]]
        arr = np.frombuffer(b, dt, a["count"] * n, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n) if n > 1 else arr
    return j, acc, b


def qmat(q):
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def dark_skin(j, acc, blob):
    """The triangles of the sculpt's unpainted back, and what's needed to skin them: (vertices, joints, weights, inverse binds,
    the skin's joint nodes, triangles as indices into those vertices)."""
    prim = j["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    V, UV = acc(at["POSITION"]), acc(at["TEXCOORD_0"])
    F = acc(prim["indices"]).reshape(-1, 3)
    tex = j["textures"][j["materials"][prim["material"]]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
    bv = j["bufferViews"][j["images"][tex]["bufferView"]]
    im = np.asarray(Image.open(io.BytesIO(blob[bv["byteOffset"]:bv["byteOffset"] + bv["byteLength"]])).convert("RGB"), float) / 255
    h, w = im.shape[:2]
    lum = im[(UV[:, 1] % 1 * (h - 1)).astype(int), (UV[:, 0] % 1 * (w - 1)).astype(int)].sum(1)
    F = F[(lum[F] < 0.6).all(1)]
    used, inv = np.unique(F, return_inverse=True)
    skin = j["skins"][0]
    return V[used], acc(at["JOINTS_0"])[used], acc(at["WEIGHTS_0"])[used], acc(skin["inverseBindMatrices"]).reshape(-1, 4, 4), skin["joints"], inv.reshape(-1, 3)


def skinned(world, mesh):
    """A mesh's vertices on this pose."""
    V, Jn, Wt, Ibm, joints, _ = mesh
    M = np.zeros((len(joints), 4, 4))
    for i, node in enumerate(joints):
        R, T = world(node)
        A = np.eye(4)
        A[:3, :3], A[:3, 3] = R, T
        M[i] = A @ Ibm[i].T          # (glTF stores matrices by column)
    h = np.c_[V, np.ones(len(V))]
    return np.einsum("vi,vijk,vk->vj", Wt, M[Jn], h)[:, :3]


def whole_skin(j, acc):
    """The whole of the arms, in the shape skinned() takes."""
    prim = j["meshes"][0]["primitives"][0]
    at = prim["attributes"]
    skin = j["skins"][0]
    return acc(at["POSITION"]), acc(at["JOINTS_0"]), acc(at["WEIGHTS_0"]), acc(skin["inverseBindMatrices"]).reshape(-1, 4, 4), skin["joints"], acc(prim["indices"]).reshape(-1, 3)


def near_cuts(world, mesh, near, fx, fy):
    """How many of the mesh's edges the near plane cuts inside the frame on this pose: each is a hole in the arm, on the screen."""
    P = skinned(world, mesh)
    tris = mesh[5]
    d = -P[:, 2] - near
    edges = np.r_[tris[:, [0, 1]], tris[:, [1, 2]], tris[:, [2, 0]]]
    a, b = d[edges[:, 0]], d[edges[:, 1]]
    cut = (a > 0) != (b > 0)
    if not cut.any():
        return 0
    at = P[edges[cut, 0]] + (P[edges[cut, 1]] - P[edges[cut, 0]]) * (a[cut] / (a[cut] - b[cut]))[:, None]
    return int(((fx * np.abs(at[:, 0]) / near < 1) & (fy * np.abs(at[:, 1]) / near < 1)).sum())


def dark_share(world, dark, fx, fy):
    """How much of the screen the unpainted back fills on this pose (0 to 1), whatever may be in front of it."""
    tris = dark[5]
    P = skinned(world, dark)
    a, b, c = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    centre = (a + b + c) / 3
    facing = (np.cross(b - a, c - a) * -centre).sum(1) > 0
    z = np.maximum(-P[:, 2], 1e-3)
    S = np.c_[fx * P[:, 0] / z, fy * P[:, 1] / z]
    in_view = (-P[:, 2] > 0.1)[tris].all(1) & (np.abs(S[tris]).max((1, 2)) < 1.6) & (np.abs(S[tris].mean(1)).max(1) < 1)
    sa, sb, sc = S[tris[:, 0]], S[tris[:, 1]], S[tris[:, 2]]
    area = np.abs((sb[:, 0] - sa[:, 0]) * (sc[:, 1] - sa[:, 1]) - (sc[:, 0] - sa[:, 0]) * (sb[:, 1] - sa[:, 1])) / 2
    return float(area[facing & in_view].sum() / 4)


def end_rings(j, acc, nodes, named):
    """Each arm's cut-off end, as the mesh has it: the skin's vertices at the very end of each upper arm, and that bone's rest
    place and turn, all in the eye's frame (x right, y ahead, z up), which is the frame the upper arms' tracks are in."""
    V = acc(j["meshes"][0]["primitives"][0]["attributes"]["POSITION"])
    V = np.c_[V[:, 0], -V[:, 2], V[:, 1]]
    rings = {}
    for side, sign in (("R", 1), ("L", -1)):
        n = nodes[named[f"upperarm_{side}"]]
        S0, R0 = np.array(n["translation"], float), qmat(np.array(n["rotation"], float))
        ours = V[V[:, 0] * sign > 0]
        t = (ours - S0) @ R0[:, 1]
        rings[side] = (ours[t < t.min() + 0.012] - S0, S0, R0)
    return rings


def main(model):
    j, acc, blob = read(model)
    nodes = j["nodes"]
    meta = j["scenes"][0]["extras"]
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i
    named = {n["name"]: i for i, n in enumerate(nodes)}
    one_fist = parent[named["weapon"]] == named["hand_R"]       # (a one-hander hangs from its fist: it can't slide)
    fy = 1 / math.tan(math.radians(meta["view"]["fov"]) / 2)
    fx = fy / ASPECT
    fails = []
    guard = None
    rows = []
    rings = end_rings(j, acc, nodes, named)
    dark = dark_skin(j, acc, blob)
    whole = whole_skin(j, acc)
    near = meta["view"]["near"]
    worst_dark = {}
    screen_rows = {}
    shown_rows = {}
    for anim in j["animations"]:
        name = anim["name"]
        ev = meta["clips"][name]
        tracks = {}
        for ch in anim["channels"]:
            s = anim["samplers"][ch["sampler"]]
            tracks[(ch["target"]["node"], ch["target"]["path"])] = (acc(s["input"]), acc(s["output"]))
        times = next(iter(tracks.values()))[0]
        for (node, path), (_, values) in tracks.items():
            if path == "rotation":
                dots = np.abs((values[1:] * values[:-1]).sum(1)) / (np.linalg.norm(values[1:], axis=1) * np.linalg.norm(values[:-1], axis=1))
                turn = 2 * np.degrees(np.arccos(np.clip(dots, 0, 1)))
                if turn.max() > JOINT_MAX:
                    fails.append(f"{name}: {nodes[node]['name']} jumps {turn.max():.0f} degrees in a frame, at {(turn.argmax() + 1) / 60:.2f} s")

        def pose(k):
            cache = {}

            def world(i):
                if i in cache:
                    return cache[i]
                n = nodes[i]
                t = tracks.get((i, "translation"))
                r = tracks.get((i, "rotation"))
                T = np.array(t[1][k] if t else n.get("translation", (0, 0, 0)), float)
                R = qmat(np.array(r[1][k] if r else n.get("rotation", (0, 0, 0, 1)), float))
                if i in parent:
                    Rp, Tp = world(parent[i])
                    out = (Rp @ R, Rp @ T + Tp)
                else:
                    out = (R, T)
                cache[i] = out
                return out
            return world
        N = len(times)
        tips, blades, lockR, lockL, fists, ends_R, ends_L, flats = [], [], [], [], [], [], [], []
        for k in range(N):
            w = pose(k)
            Rw, pw = w(named["weapon"])
            tips.append(w(named["weapon_tip"])[1])
            blades.append(Rw[:, 1])
            mid_ = pw + Rw[:, 1] * 0.5
            flats.append(math.degrees(math.asin(min(1.0, abs(float(Rw[:, 0] @ mid_)) / float(np.linalg.norm(mid_))))))
            fists.append(pw)
            ends_R.append(w(named["upperarm_R"])[1])
            ends_L.append(w(named["upperarm_L"])[1])
            lockR.append(np.linalg.norm(Rw.T @ (w(named["hand_R"])[1] - pw)))
            lockL.append(0.0 if one_fist else np.linalg.norm(Rw.T @ (w(named["hand_L"])[1] - pw)))
        tips, blades, fists = np.array(tips), np.array(blades), np.array(fists)
        length = np.linalg.norm(tips - fists, axis=1)
        if length.max() - length.min() > LENGTH_OFF or any(p_ == "scale" for _, p_ in tracks):
            fails.append(f"{name}: the sword's length changes, {length.min():.4f} to {length.max():.4f} m")
        # the guard: first and last frames, all joints, against the first clip's
        ends = []
        for k in (0, N - 1):
            w = pose(k)
            ends.append(np.concatenate([w(i)[1] for i in range(len(nodes) - 2)]))
        if guard is None:
            guard = ends[0]
        off = max(np.abs(ends[0] - guard).max(), np.abs(ends[1] - guard).max()) if ev.get("rest", True) else 0.0
        if off > 2e-3:
            fails.append(f"{name}: leaves the guard by {off * 1000:.1f} mm at its ends")
        if max(lockR) - min(lockR) > 1e-3 or max(lockL) - min(lockL) > 1e-3:
            fails.append(f"{name}: a fist slides on the sword")
        dt = float(times[1] - times[0])
        fist_speed = float(np.linalg.norm(np.diff(fists, axis=0), axis=1).max() / dt)
        shown = 0
        for side, (ring, S0, R0) in rings.items():      # (any of the mesh's end ring on the screen)
            P_, Q_ = tracks[(named[f"upperarm_{side}"], "translation")][1], tracks[(named[f"upperarm_{side}"], "rotation")][1]
            for k in range(N):
                e_ = P_[k] + ring @ R0 @ qmat(np.array(Q_[k], float)).T
                a_ = np.maximum(e_[:, 1], 1e-3)
                shown += int(((e_[:, 1] > 0.05) & (fx * np.abs(e_[:, 0]) / a_ < 1) & (fy * np.abs(e_[:, 2]) / a_ < 1)).any())
        if fist_speed > FIST_MAX:
            fails.append(f"{name}: the fist whips across at {fist_speed:.1f} m/s")
        if shown:
            fails.append(f"{name}: an arm's cut end shows on {shown} frames")
        holes = [k for k in range(0, N, 2) if near_cuts(pose(k), whole, near, fx, fy)]
        if holes:
            fails.append(f"{name}: the near plane cuts a hole in an arm on the screen, on {len(holes)} of {(N + 1) // 2} frames, first at {holes[0] / 60:.2f} s")
        shares = [dark_share(pose(k), dark, fx, fy) for k in range(0, N, 2)]
        worst_dark[name] = max(shares)
        if max(shares) > DARK_MAX:
            fails.append(f"{name}: the arm's unpainted back fills {100 * max(shares):.1f}% of the screen, at {2 * int(np.argmax(shares)) / 60:.2f} s")
        if ev.get("loop") or ev.get("hit") is None:
            continue
        guards = fists + blades * GUARD_AT
        look = lambda q_: np.c_[ASPECT * fx * q_[:, 0], fy * q_[:, 1]] / np.maximum(-q_[:, 2], 1e-3)[:, None]
        shows = np.linalg.norm(look(tips) - look(guards), axis=1)
        w0_, t0_ = int(round(ev.get("on", ev["wind"]) * 60)), int(round(ev["through"] * 60))
        seen_ = lambda q_: (q_[:, 2] < -0.05) & (np.abs(look(q_)[:, 0]) < ASPECT) & (np.abs(look(q_)[:, 1]) < 1)      # (a hand may be off the screen, as in first-person Skyrim: what's there to swell is what's on it)
        whole_ = seen_(tips) & seen_(guards) if one_fist else np.ones(N, bool)
        whole_[:w0_] = False
        whole_[t0_ + 1:] = False
        if not whole_.any():
            whole_[int(round(ev["hit"] * 60))] = True
        swing_ = shows[whole_].max() / shows[whole_].min()
        both_ = whole_[6:] & whole_[:-6]
        rate_ = float((np.maximum(shows[6:], shows[:-6]) / np.minimum(shows[6:], shows[:-6]))[both_].max()) if both_.any() else 1.0
        if one_fist and swing_ > SHOWN_SWING and not ev.get("thrust"):       # (the two-hander's still built the old way: its numbers are printed, not held)
            fails.append(f"{name}: the blade looks {swing_:.1f} times longer at its longest than its shortest through the blow ({shows[whole_].min():.2f} to {shows[whole_].max():.2f})")
        if one_fist and rate_ > SHOWN_RATE and not ev.get("thrust"):
            fails.append(f"{name}: the blade's length on the screen changes {rate_:.2f} times over in a tenth of a second")
        flat_ = min(flats[w0_:t0_ + 1])
        if one_fist and flat_ < FLAT_MIN:
            fails.append(f"{name}: the blade's a wire: only {flat_:.0f} degrees of its flat to the eye")
        shown_rows[name] = f"{shows[whole_].min():.2f} to {shows[whole_].max():.2f}, x{swing_:.2f}; worst in a tenth of a second x{rate_:.2f}; flat to the eye at least {flat_:.0f} degrees, {min(flats):.0f} on the way up or home"
        ahead = -tips[:, 2]     # (glTF: -z ahead)
        ok = ahead > 0.05
        sx, sy = fx * tips[:, 0] / np.where(ok, ahead, 1), fy * tips[:, 1] / np.where(ok, ahead, 1)
        h = int(round(ev["hit"] * 60))
        if abs(times[h] - ev["hit"]) > 1e-4:
            fails.append(f"{name}: no frame on the hit")
        err = math.hypot(sx[h], sy[h])
        if err > 2e-3:
            fails.append(f"{name}: tip misses the X by {err:.4f}")
        wind, through = int(round(ev["wind"] * 60)), int(round(ev["through"] * 60))
        if one_fist:
            hand = named["hand_R"]
            in_hand = qmat(np.array(nodes[named["weapon"]]["rotation"], float)).T       # (the hand's frame to the sword's)
            parts = lambda Q: (lambda f: (math.degrees(math.atan2(f[0], math.hypot(f[1], f[2]))), math.degrees(math.atan2(-f[2], f[1]))))(in_hand @ qmat(np.array(Q, float)).T[:, 1])
            side0, cock0 = parts(nodes[hand]["rotation"])
            q_hand = tracks[(hand, "rotation")][1]
            wind = int(round(ev.get("on", ev["wind"]) * 60))      # (from where the blade joins its line, the strike on: drawn back it's off the screen)
            got = np.array([parts(q_hand[k]) for k in range(wind, through + 1)]) - np.array([side0, cock0])
            side_, cock_ = np.abs(got[:, 0]), got[:, 1]
            if side_.max() > SIDEWAYS_MAX:
                fails.append(f"{name}: the wrist breaks sideways, {side_.max():.0f} degrees, at {(wind + int(np.argmax(side_))) / 60:.2f} s")
            if cock_.max() > COCK_MAX:
                fails.append(f"{name}: the wrist is cocked {cock_.max():.0f} degrees, at {(wind + int(np.argmax(cock_))) / 60:.2f} s")
            if cock_.min() < -BACK_MAX:
                fails.append(f"{name}: the wrist is bent back {-cock_.min():.0f} degrees, at {(wind + int(np.argmin(cock_))) / 60:.2f} s")
            if not ev.get("thrust"):
                def on_screen(i_, k_):
                    q_ = pose(k_)(i_)[1]
                    return np.array([fx * q_[0], fy * q_[1]]) / max(-q_[2], 1e-3)

                def showing(a_, b_):
                    t_ = np.linspace(0, 1, 16)[:, None]
                    return float((np.abs(a_ + (b_ - a_) * t_) <= 1).all(1).mean() * np.linalg.norm((b_ - a_) * np.array([ASPECT, 1.0])))
                def along_sword(k_, d_):
                    R_, T_ = pose(k_)(named["weapon"])
                    q_ = T_ + R_[:, 1] * d_
                    return np.array([fx * q_[0], fy * q_[1]]) / max(-q_[2], 1e-3)

                h_ = int(round(ev["hit"] * 60))
                sq_ = np.array([ASPECT, 1.0])
                low_, fold_, steel_, fore_, hook_, bend_ = 9.0, 0.0, 9.0, 9.0, 0.0, 0.0
                for k_ in range(h_, through + 1):
                    Es, Ws, Ts = on_screen(named["forearm_R"], k_), on_screen(named["hand_R"], k_), on_screen(named["weapon_tip"], k_)
                    Fs, Gs = along_sword(k_, 0.0), along_sword(k_, GUARD_AT)
                    u_, v_ = (Ws - Es) * sq_, (Gs - along_sword(k_, meta["sword"]["pommel"])) * sq_
                    low_ = min(low_, float(Fs[1]))
                    if k_ >= h_ + 2:
                        fold_ = max(fold_, math.degrees(math.acos(float(np.clip(u_ @ v_ / max(np.linalg.norm(u_) * np.linalg.norm(v_), 1e-6), -1, 1)))))
                    b_ = (Fs - Ws) * sq_
                    hook_ = max(hook_, abs(float(u_[0] * b_[1] - u_[1] * b_[0])) / max(float(np.linalg.norm(u_)), 1e-6))
                    w_, e_ = pose(k_)(named["hand_R"])[1], pose(k_)(named["forearm_R"])[1]
                    bend_ = max(bend_, math.degrees(math.acos(float(np.clip((w_ - e_) @ pose(k_)(named["weapon"])[0][:, 1] / np.linalg.norm(w_ - e_), -1, 1)))))
                    steel_ = min(steel_, showing(Gs, Ts))
                    if k_ == h_:
                        fore_ = showing(Es, Ws)
                # ...and the whole clip, the wind-up and the way home too: a wrist hooked there is just as broken
                fold_all = [0.0, 0]
                for k_ in range(0, N):
                    u_, v_ = (on_screen(named["hand_R"], k_) - on_screen(named["forearm_R"], k_)) * sq_, (along_sword(k_, GUARD_AT) - along_sword(k_, meta["sword"]["pommel"])) * sq_
                    f_ = math.degrees(math.acos(float(np.clip(u_ @ v_ / max(np.linalg.norm(u_) * np.linalg.norm(v_), 1e-6), -1, 1))))
                    if f_ > fold_all[0]:
                        fold_all = [f_, k_]
                if model != "1h" and fold_all[0] > FOLD_WHOLE:
                    fails.append(f"{name}: forearm and handle fold {fold_all[0]:.0f} degrees on the screen at {fold_all[1] / 60:.2f} s")
                def bearing(k_):
                    a_, b_, c_ = on_screen(named["forearm_R"], k_) * sq_, on_screen(named["hand_R"], k_) * sq_, on_screen(named["weapon_tip"], k_) * sq_
                    return math.atan2(*(b_ - a_)[::-1]), math.atan2(*(c_ - b_)[::-1])

                fa_, bl_ = 0.0, 0.0
                was_f, was_b = bearing(h_)
                for k_ in range(h_ + 1, through + 1):       # (added up frame by frame, so a turn past straight back still counts)
                    now_f, now_b = bearing(k_)
                    fa_ += (now_f - was_f + math.pi) % (2 * math.pi) - math.pi
                    bl_ += (now_b - was_b + math.pi) % (2 * math.pi) - math.pi
                    was_f, was_b = now_f, now_b
                turn_ = abs(math.degrees(bl_)) - abs(math.degrees(fa_))
                travel_ = max(float(np.linalg.norm((along_sword(k_, 0.0) - along_sword(h_, 0.0)) * sq_)) for k_ in range(h_, through + 1))      # (the furthest it gets: the way home's begun by the end)
                screen_rows[name] = f"hand low {low_:+.2f}  fold {fold_:3.0f} ({fold_all[0]:.0f} at {fold_all[1] / 60:.2f} s in the whole clip)  hook {hook_:.2f}  bend {bend_:3.0f}  steel {steel_:.2f}  forearm {fore_:.2f}  fist travels {travel_:.2f}  blade turns {turn_:3.0f} more than the forearm"
                if model != "1h" and travel_ < TRAVEL_MIN:
                    fails.append(f"{name}: the fist only travels {travel_:.2f} on the screen past the hit: the wrist's doing the arm's work")
                if model == "1h":
                    upper_, fore__ = [], []
                    for k_ in range(N):
                        a_, b_, c_ = pose(k_)(named["upperarm_R"])[1], pose(k_)(named["forearm_R"])[1], pose(k_)(named["hand_R"])[1]
                        upper_.append(a_ - b_)
                        fore__.append(c_ - b_)
                    upper_, fore__ = np.array(upper_), np.array(fore__)
                    elbow_ = np.degrees(np.arccos(np.clip((upper_ * fore__).sum(1) / np.linalg.norm(upper_, axis=1) / np.linalg.norm(fore__, axis=1), -1, 1)))
                    folded_, opened_ = float(elbow_[:h_ + 1].min()), float(elbow_[h_ - 2:through + 1].max())
                    near_ = float((-fists[:h_ + 1, 2]).min())
                    screen_rows[name] += f"  elbow folds to {folded_:.0f}, opens to {opened_:.0f} ({elbow_[h_]:.0f} at the hit)  fist back to {near_:.2f} ahead"
                    if folded_ > FOLDED_MAX:
                        fails.append(f"{name}: the elbow only folds to {folded_:.0f} degrees: that's not a draw-back")
                    if opened_ - folded_ < ELBOW_OPENS:
                        fails.append(f"{name}: the elbow only opens {opened_ - folded_:.0f} degrees through the strike")
                    if near_ > DRAWN_BACK:
                        fails.append(f"{name}: the fist only comes back to {near_:.2f} m ahead of the eye")
                if turn_ > TURN_MAX:
                    fails.append(f"{name}: the blade turns {turn_:.0f} degrees more than the forearm past the hit: the wrist's doing the arm's work")
                if model != "1h" and low_ < HAND_LOW:
                    fails.append(f"{name}: the hand sinks to {low_:+.2f} on the screen")
                if model != "1h" and fold_ > FOLD_MAX[model]:
                    fails.append(f"{name}: forearm and handle fold {fold_:.0f} degrees on the screen")
                if model != "1h" and hook_ > HOOK_MAX:
                    fails.append(f"{name}: the fist hangs {hook_:.2f} off the forearm's line on the screen")
                if bend_ > BEND_MAX[model]:
                    fails.append(f"{name}: forearm and handle bend {bend_:.0f} degrees apart")
                if model != "1h" and steel_ < STEEL_MIN[model]:
                    fails.append(f"{name}: only {steel_:.2f} of the steel shows")
                if model != "1h" and fore_ < FOREARM_MIN[model]:
                    fails.append(f"{name}: only {fore_:.2f} of the forearm shows")
        if ev.get("thrust"):
            # a thrust has no line: from the hit to the end of the drive its tip stays on the X's own ray
            off_x = float(np.hypot(sx[h:through + 1], sy[h:through + 1]).max())
            if off_x > 2e-3:
                fails.append(f"{name}: tip leaves the X by {off_x:.4f} during the thrust")
            rows.append(f"{name:17s} {ev['duration']:.2f}s  hit {ev['hit']:.3f}s  tip from X {err:.5f}  on the X from there on (off by {off_x:.5f})  fist {fist_speed:.1f} m/s  cut end shown {shown}")
            continue
        # the drawn line, in the eye's frame (x, up): on screen, keep on it from the wind-up to the end
        al = math.radians(ev.get("line", meta["lines"].get(name.replace("great_", ""), 0.0)))
        free = int(round(ev.get("free", ev["through"]) * 60))      # (from here the way home's begun, on top of the last of the sweep)
        joined = int(round(ev.get("on", ev["wind"]) * 60))      # (before that it's coming off where it was drawn back to, off the screen)
        on = np.where(ok[joined:free + 1] & (np.abs(sx[joined:free + 1]) < 1) & (np.abs(sy[joined:free + 1]) < 1))[0] + joined
        # (the screen is stretched by fx, fy: back to eye-space ratios before measuring)
        ex, ey = sx[on] / fx, sy[on] / fy
        stray = np.abs(ex * math.sin(al) - ey * math.cos(al)).max() if len(on) else 9
        if stray > 0.01:
            fails.append(f"{name}: tip strays {stray:.3f} off its line")
        sp = np.degrees(np.arccos(np.clip((blades[1:] * blades[:-1]).sum(1), -1, 1))) * 60
        swing = sp[joined:free]      # (from `free` the way home has begun, and the blade turns round)
        peaks = ((swing[1:-1] > swing[:-2]) & (swing[1:-1] > swing[2:]) & (swing[1:-1] > 0.05 * swing.max())).sum()
        if peaks != 1:
            fails.append(f"{name}: {peaks} peaks of speed in the swing (want one bell)")
        holds = (sp[wind + 2:int(round(ev["free"] * 60)) if "free" in ev else through - 2] < 1).sum()      # (once it's started home the blade turns round: it's no hold)
        if holds:
            fails.append(f"{name}: {holds} held frames in the swing")
        # how far past the X the blade carries: its angle from the line of sight at the end
        d_end, d_hit = blades[through], blades[h]
        past = math.degrees(math.acos(float(np.clip(d_end @ d_hit, -1, 1))))
        if model in CARRY_MIN and past < CARRY_MIN[model]:
            fails.append(f"{name}: follow-through only {past:.0f} degrees past the hit")
        tip_past = float(np.linalg.norm(np.diff(tips[h:through + 1], axis=0), axis=1).sum())
        if one_fist:
            tv = np.linalg.norm(np.diff(tips, axis=0), axis=1) * 60
            fv = np.linalg.norm(np.diff(fists, axis=0), axis=1) * 60
            strike = fv[wind:through]
            at_peak = int(np.argmax(strike)) + wind - h
            if at_peak < -PEAK_FRAMES or at_peak > 1:
                fails.append(f"{name}: the fist's fastest {at_peak:+d} frames from the hit")
            tip_peak = int(np.argmax(tv[wind:through])) + wind - h
            if abs(tip_peak) > 2:
                fails.append(f"{name}: the tip's fastest {tip_peak:+d} frames from the hit")
            top = float(strike.max())
            if fv[:wind].max() > RISE_MAX * top:
                fails.append(f"{name}: the fist goes up at {fv[:wind].max():.1f} m/s, the strike's only {top:.1f}: a feather duster")
            if fv[through:].max() > HOME_MAX * top:
                fails.append(f"{name}: the fist goes home at {fv[through:].max():.1f} m/s, the strike's only {top:.1f}")
            run_, worst_ = 0, 0
            for v_ in tv[wind:N - 6]:
                run_ = run_ + 1 if v_ < STILL_SPEED else 0
                worst_ = max(worst_, run_)
            if worst_ > STILL_MAX:
                fails.append(f"{name}: the tip hangs still for {worst_} frames")
            going = tips[h + 1] - tips[h - 1]
            going = going / np.linalg.norm(going)
            edge_ = float(-pose(h)(named["weapon"])[0][:, 2] @ going)
            if edge_ < EDGE_MIN:
                fails.append(f"{name}: the knuckle edge only leads by {edge_:+.2f} at the hit: that's the flat or the back of the blade")
            if tip_past < TIP_CARRY:
                fails.append(f"{name}: the tip only goes on {tip_past:.2f} m past the X")
            screen_rows[name] = screen_rows.get(name, "") + f"  edge {edge_:+.2f}  tip on {tip_past:.2f} m  fist {top:.1f} m/s, up {fv[:wind].max():.1f}, home {fv[through:].max():.1f}  still {worst_} frames"
        rows.append(f"{name:17s} {ev['duration']:.2f}s  hit {ev['hit']:.3f}s  tip from X {err:.5f}  off its line {stray:.5f}  "
                    f"peak {sp.max():4.0f} deg/s  carries {past:3.0f} deg past the hit  fists slide {1000 * max(max(lockR) - min(lockR), max(lockL) - min(lockL)):.2f} mm  "
                    f"fist {fist_speed:.1f} m/s  cut end shown {shown}")
    print("\n".join(rows))
    for k_, v_ in screen_rows.items():
        print(f"{k_:17s} on the screen, past the hit: {v_}")
    for k_, v_ in shown_rows.items():
        print(f"{k_:17s} the blade's length on the screen, wind-up to follow-through: {v_}")
    print("unpainted back, most of the screen: " + ", ".join(f"{k} {100 * v:.1f}%" for k, v in worst_dark.items() if v > 0.002))
    if fails:
        print("\nFAILED:\n  " + "\n  ".join(fails))
        return 1
    print(f"\nall rules hold, {len(rows)} blows")
    return 0


if __name__ == "__main__":
    status = 0
    for m_ in sys.argv[1:] or ("2h", "1h"):
        print(f"--- arms_{m_}.glb")
        status |= main(m_)
    sys.exit(status)
