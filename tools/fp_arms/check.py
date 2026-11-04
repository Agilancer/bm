"""Checks the finished assets/fp/arms_*.glb against the rules, from the file alone (none of the solver):
every joint is read back and posed from the GLB's own tracks.

  * the tip is on the X at the hit, on a frame;
  * while it's on screen it keeps to the drawn line through the X;
  * both fists stay put on the sword;
  * the blade's speed through the swing is one bell: no holds, no second wind, no jumps;
  * every blow starts and ends on the one guard, so any can follow any;
  * the follow-through carries well past the hit (the game's two-handers carried 33 degrees, 24 on the
    slam; its one-handers 38 to 68);
  * the fist never whips across the screen, and an arm's cut-off end never comes into view
    (the sword and shield; the two-hander's are reported).

    python tools/fp_arms/check.py [2h|1h]     # exits non-zero if a rule fails
"""
import json
import math
import os
import struct
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASPECT = 16 / 9
FIST_MAX = 8.0      # metres a second: past this a fist reads as a pop, not a swing
CARRY_MIN = {"2h": 30, "1h": 60}


def read(model):
    raw = open(os.path.join(ROOT, "assets", "fp", f"arms_{model}.glb"), "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    b = raw[20 + jl + 8:]

    def acc(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        n = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[a["type"]]
        arr = np.frombuffer(b, np.float32, a["count"] * n, bv.get("byteOffset", 0))
        return arr.reshape(-1, n) if n > 1 else arr
    return j, acc


def qmat(q):
    x, y, z, w = q / np.linalg.norm(q)
    return np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
                     [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
                     [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])


def main(model):
    j, acc = read(model)
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
    for anim in j["animations"]:
        name = anim["name"]
        ev = meta["clips"][name]
        tracks = {}
        for ch in anim["channels"]:
            s = anim["samplers"][ch["sampler"]]
            tracks[(ch["target"]["node"], ch["target"]["path"])] = (acc(s["input"]), acc(s["output"]))
        times = next(iter(tracks.values()))[0]

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
        for e_ in (np.array(ends_R), np.array(ends_L)):        # (the end's middle on the screen, a little to spare)
            a_ = -e_[:, 2]
            shown += int(((a_ > 0.05) & (fx * (np.abs(e_[:, 0]) - 0.05) / np.maximum(a_, 1e-3) < 1) & (fy * (np.abs(e_[:, 1]) - 0.05) / np.maximum(a_, 1e-3) < 1)).sum())
        if one_fist and fist_speed > FIST_MAX:
            fails.append(f"{name}: the fist whips across at {fist_speed:.1f} m/s")
        if one_fist and shown:
            fails.append(f"{name}: an arm's cut end shows on {shown} frames")
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
