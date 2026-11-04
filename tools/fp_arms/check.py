"""Checks the finished assets/fp/arms_2h.glb against the rules, from the file alone (none of the solver):
every joint is read back and posed from the GLB's own tracks.

  * the tip is on the X at the hit, on a frame;
  * while it's on screen it keeps to the drawn line through the X;
  * both fists stay put on the sword;
  * the blade's speed through the swing is one bell: no holds, no second wind, no jumps;
  * every blow starts and ends on the one guard, so any can follow any;
  * the follow-through carries well past the hit (the game's carried 33 degrees, 24 on the slam).

    python tools/fp_arms/check.py     # exits non-zero if a rule fails
"""
import json
import math
import os
import struct
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GLB = os.path.join(ROOT, "assets", "fp", "arms_2h.glb")
ASPECT = 16 / 9


def read():
    raw = open(GLB, "rb").read()
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


def main():
    j, acc = read()
    nodes = j["nodes"]
    meta = j["scenes"][0]["extras"]
    parent = {}
    for i, n in enumerate(nodes):
        for c in n.get("children", []):
            parent[c] = i
    named = {n["name"]: i for i, n in enumerate(nodes)}
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
        tips, blades, lockR, lockL, first = [], [], [], [], None
        for k in range(N):
            w = pose(k)
            Rw, pw = w(named["weapon"])
            tips.append(w(named["weapon_tip"])[1])
            blades.append(Rw[:, 1])
            lockR.append(np.linalg.norm(Rw.T @ (w(named["hand_R"])[1] - pw)))
            lockL.append(np.linalg.norm(Rw.T @ (w(named["hand_L"])[1] - pw)))
        tips, blades = np.array(tips), np.array(blades)
        # the guard: first and last frames, all joints, against the first clip's
        ends = []
        for k in (0, N - 1):
            w = pose(k)
            ends.append(np.concatenate([w(i)[1] for i in range(len(nodes) - 2)]))
        if guard is None:
            guard = ends[0]
        off = max(np.abs(ends[0] - guard).max(), np.abs(ends[1] - guard).max())
        if off > 2e-3:
            fails.append(f"{name}: leaves the guard by {off * 1000:.1f} mm at its ends")
        if max(lockR) - min(lockR) > 1e-3 or max(lockL) - min(lockL) > 1e-3:
            fails.append(f"{name}: a fist slides on the sword")
        if ev.get("loop"):
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
        # the drawn line, in the eye's frame (x, up): on screen, keep on it from the wind-up to the end
        al = math.radians(meta["lines"][name.replace("great_", "")])
        wind, through = int(round(ev["wind"] * 60)), int(round(ev["through"] * 60))
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
        if past < 30:
            fails.append(f"{name}: follow-through only {past:.0f} degrees past the hit")
        rows.append(f"{name:14s} {ev['duration']:.2f}s  hit {ev['hit']:.3f}s  tip from X {err:.5f}  off its line {stray:.5f}  "
                    f"peak {sp.max():4.0f} deg/s  carries {past:3.0f} deg past the hit  fists slide {1000 * max(max(lockR) - min(lockR), max(lockL) - min(lockL)):.2f} mm")
    print("\n".join(rows))
    if fails:
        print("\nFAILED:\n  " + "\n  ".join(fails))
        sys.exit(1)
    print(f"\nall rules hold, {len(rows)} swings")


if __name__ == "__main__":
    main()
