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
    skinned mesh itself, facing the eye and in frame;
  * no joint jumps: none turns further in one frame than JOINT_MAX;
  * on a one-hander the arm carries the swing, not the wrist: from the wind-up to the end of the follow-through the wrist only
    cocks in the blade's own plane (at most COCK_MAX from how the sculpt holds it, and no further back than BACK_MAX), and
    hardly goes sideways (SIDEWAYS_MAX), which is what reads as a broken wrist;
  * and what the eye gets from the hit to the end of the follow-through: the hand stays up (HAND_LOW), the forearm and the handle
    don't fold against each other on the screen (FOLD_MAX), the fist doesn't hang off the forearm's line (HOOK_MAX), the forearm
    and handle don't bend apart in space either (BEND_MAX), and the steel and the forearm both show (STEEL_MIN, FOREARM_MIN);
  * the arm carries the finish: the fist keeps travelling on the screen (TRAVEL_MIN), and the blade doesn't turn much further
    than the forearm does (TURN_MAX). A blade turning about a still fist is a wrist doing the arm's work.

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
HAND_LOW = -0.78    # a one-hander's fist, from the hit on: no lower on the screen than this (from -1 to 1)
FOLD_MAX = 110.0    # degrees between forearm and handle on the screen, past the hit (0: one straight line)
HOOK_MAX = 0.20     # how far a fist may hang off its forearm's line on the screen, past the hit (half the screen's height is 1)
BEND_MAX = 75.0     # degrees between forearm and handle in space, past the hit
STEEL_MIN, FOREARM_MIN = 0.40, 0.15     # how much of each shows on the screen, past the hit, the steel from the guard to the tip (half the screen's height is 1)
GUARD_AT = 0.065    # the guard, along the sword from the fist (metres)
TRAVEL_MIN = 0.20   # how far the fist goes on the screen from the hit to the end of the follow-through (half the screen's height is 1)
TURN_MAX = 55.0     # degrees the blade may turn on the screen beyond what the forearm does, over the same stretch
DARK_MAX = 0.015    # the share of the screen the sculpt's unpainted back may fill, on any frame (what's behind the shield counts too)
CARRY_MIN = {"2h": 30, "1h": 48}


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


def dark_share(world, dark, fx, fy):
    """How much of the screen the unpainted back fills on this pose (0 to 1), whatever may be in front of it."""
    V, Jn, Wt, Ibm, joints, tris = dark
    M = np.zeros((len(joints), 4, 4))
    for i, node in enumerate(joints):
        R, T = world(node)
        A = np.eye(4)
        A[:3, :3], A[:3, 3] = R, T
        M[i] = A @ Ibm[i].T          # (glTF stores matrices by column)
    h = np.c_[V, np.ones(len(V))]
    P = np.einsum("vi,vijk,vk->vj", Wt, M[Jn], h)[:, :3]
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
    worst_dark = {}
    screen_rows = {}
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
        tips, blades, lockR, lockL, fists, ends_R, ends_L = [], [], [], [], [], [], []
        for k in range(N):
            w = pose(k)
            Rw, pw = w(named["weapon"])
            tips.append(w(named["weapon_tip"])[1])
            blades.append(Rw[:, 1])
            fists.append(pw)
            ends_R.append(w(named["upperarm_R"])[1])
            ends_L.append(w(named["upperarm_L"])[1])
            lockR.append(np.linalg.norm(Rw.T @ (w(named["hand_R"])[1] - pw)))
            lockL.append(0.0 if one_fist else np.linalg.norm(Rw.T @ (w(named["hand_L"])[1] - pw)))
        tips, blades, fists = np.array(tips), np.array(blades), np.array(fists)
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
        shares = [dark_share(pose(k), dark, fx, fy) for k in range(0, N, 2)]
        worst_dark[name] = max(shares)
        if max(shares) > DARK_MAX:
            fails.append(f"{name}: the arm's unpainted back fills {100 * max(shares):.1f}% of the screen, at {2 * int(np.argmax(shares)) / 60:.2f} s")
        if ev.get("loop") or ev.get("hit") is None:
            continue
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
                    steel_, fore_ = min(steel_, showing(Gs, Ts)), min(fore_, showing(Es, Ws))
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
                travel_ = float(np.linalg.norm((along_sword(through, 0.0) - along_sword(h_, 0.0)) * sq_))
                screen_rows[name] = f"hand low {low_:+.2f}  fold {fold_:3.0f}  hook {hook_:.2f}  bend {bend_:3.0f}  steel {steel_:.2f}  forearm {fore_:.2f}  fist travels {travel_:.2f}  blade turns {turn_:3.0f} more than the forearm"
                if travel_ < TRAVEL_MIN:
                    fails.append(f"{name}: the fist only travels {travel_:.2f} on the screen past the hit: the wrist's doing the arm's work")
                if turn_ > TURN_MAX:
                    fails.append(f"{name}: the blade turns {turn_:.0f} degrees more than the forearm past the hit: the wrist's doing the arm's work")
                if low_ < HAND_LOW:
                    fails.append(f"{name}: the hand sinks to {low_:+.2f} on the screen")
                if fold_ > FOLD_MAX:
                    fails.append(f"{name}: forearm and handle fold {fold_:.0f} degrees on the screen")
                if hook_ > HOOK_MAX:
                    fails.append(f"{name}: the fist hangs {hook_:.2f} off the forearm's line on the screen")
                if bend_ > BEND_MAX:
                    fails.append(f"{name}: forearm and handle bend {bend_:.0f} degrees apart")
                if steel_ < STEEL_MIN:
                    fails.append(f"{name}: only {steel_:.2f} of the steel shows")
                if fore_ < FOREARM_MIN:
                    fails.append(f"{name}: only {fore_:.2f} of the forearm shows")
        if ev.get("thrust"):
            # a thrust has no line: from the chamber to the end of the drive its tip stays on the X's own ray
            off_x = float(np.hypot(sx[wind:through + 1], sy[wind:through + 1]).max())
            if off_x > 2e-3:
                fails.append(f"{name}: tip leaves the X by {off_x:.4f} during the thrust")
            rows.append(f"{name:17s} {ev['duration']:.2f}s  hit {ev['hit']:.3f}s  tip from X {err:.5f}  on the X all the way in (off by {off_x:.5f})  fist {fist_speed:.1f} m/s  cut end shown {shown}")
            continue
        # the drawn line, in the eye's frame (x, up): on screen, keep on it from the wind-up to the end
        al = math.radians(ev.get("line", meta["lines"].get(name.replace("great_", ""), 0.0)))
        on = np.where(ok[wind:through + 1] & (np.abs(sx[wind:through + 1]) < 1) & (np.abs(sy[wind:through + 1]) < 1))[0] + wind
        # (the screen is stretched by fx, fy: back to eye-space ratios before measuring)
        ex, ey = sx[on] / fx, sy[on] / fy
        stray = np.abs(ex * math.sin(al) - ey * math.cos(al)).max() if len(on) else 9
        if stray > 0.01:
            fails.append(f"{name}: tip strays {stray:.3f} off its line")
        sp = np.degrees(np.arccos(np.clip((blades[1:] * blades[:-1]).sum(1), -1, 1))) * 60
        swing = sp[wind:through]
        peaks = ((swing[1:-1] > swing[:-2]) & (swing[1:-1] > swing[2:]) & (swing[1:-1] > 0.05 * swing.max())).sum()
        if peaks != 1:
            fails.append(f"{name}: {peaks} peaks of speed in the swing (want one bell)")
        holds = (sp[wind + 2:through - 2] < 1).sum()
        if holds:
            fails.append(f"{name}: {holds} held frames in the swing")
        # how far past the X the blade carries: its angle from the line of sight at the end
        d_end, d_hit = blades[through], blades[h]
        past = math.degrees(math.acos(float(np.clip(d_end @ d_hit, -1, 1))))
        if past < CARRY_MIN[model]:
            fails.append(f"{name}: follow-through only {past:.0f} degrees past the hit")
        rows.append(f"{name:17s} {ev['duration']:.2f}s  hit {ev['hit']:.3f}s  tip from X {err:.5f}  off its line {stray:.5f}  "
                    f"peak {sp.max():4.0f} deg/s  carries {past:3.0f} deg past the hit  fists slide {1000 * max(max(lockR) - min(lockR), max(lockL) - min(lockL)):.2f} mm  "
                    f"fist {fist_speed:.1f} m/s  cut end shown {shown}")
    print("\n".join(rows))
    for k_, v_ in screen_rows.items():
        print(f"{k_:17s} on the screen, past the hit: {v_}")
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
