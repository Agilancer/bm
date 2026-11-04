"""Pack the clips the game uses from the UAL master skeleton into one small binary.

Rotations become normalized int16 on a uniform 30 Hz grid and tracks that don't move are stored once,
so a sampler is an array lookup and the whole set is about a megabyte. Each clip also records how far
it carries the pelvis horizontally, which the game turns into root motion.

Writes assets/game/clips.json and assets/game/clips.bin.
Usage: python pack_clips.py UAL_Master_Skeleton.glb OUT_DIR
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from rig_to_ual import load_glb, read_accessor, world_matrices  # noqa: E402

CLIPS = [
    "Idle_Loop", "Walk_Loop", "Walk_Formal_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Crouch_Idle_Loop", "Crouch_Fwd_Loop",
    "Idle_Shield_Loop", "Idle_Shield_Break", "Shield_OneShot", "Shield_Dash",
    "Sword_Idle", "Sword_Block", "Sword_Attack", "Sword_Dash", "Sword_Heavy_Combo", "Sword_Regular_Combo",
    "Sword_Regular_A", "Sword_Regular_A_Rec", "Sword_Regular_B", "Sword_Regular_B_Rec", "Sword_Regular_C",
    "Melee_Hook", "Melee_Hook_Rec", "Punch_Cross", "Roll", "Hit_Chest", "Hit_Head", "Hit_Knockback", "Death01",
    "LayToIdle", "Jump_Start", "Jump_Loop", "Jump_Land", "Zombie_Walk_Fwd_Loop", "Zombie_Idle_Loop", "Idle_No_Loop",
    "Yes", "Idle_FoldArms_Loop", "Idle_Talking_Loop", "Interact",
]
LOOPING = {c for c in CLIPS if c.endswith("_Loop")} | {"Sword_Idle"}


def unit(v):
    return v / np.linalg.norm(v)


def grip_frames(worlds, ids):
    """Where a weapon sits in each fist, in the hand joint's own frame, measured on the master."""
    out = {}
    for s in "lr":
        hand = worlds[ids[f"hand_{s}"]]
        R = hand[:3, :3]
        fingers = R.T @ (worlds[ids[f"middle_01_{s}"]][:3, 3] - hand[:3, 3])
        thumb = R.T @ (worlds[ids[f"thumb_01_{s}"]][:3, 3] - hand[:3, 3])
        length = float(np.linalg.norm(fingers))
        f = unit(fingers)
        t = unit(thumb - f * (thumb @ f))
        palm_world = np.array([0.0, -1.0, 0.0])
        p = R.T @ palm_world
        p = unit(p - f * (p @ f) - t * (p @ t))
        knuckles = R.T @ (worlds[ids[f"index_01_{s}"]][:3, 3] - worlds[ids[f"pinky_01_{s}"]][:3, 3])
        k = unit(knuckles - f * (knuckles @ f) - p * (knuckles @ p))
        out[s] = {"fingers": f.tolist(), "thumb": t.tolist(), "palm": p.tolist(), "knuckles": k.tolist(), "length": length}
    return out


def main():
    master, out_dir = sys.argv[1:3]
    g, blob = load_glb(master)
    nodes = g["nodes"]
    ids = {n["name"]: i for i, n in enumerate(nodes) if "name" in n}
    joints = [nodes[j]["name"] for j in g["skins"][0]["joints"]]
    index = {n: i for i, n in enumerate(joints)}
    parent = {}
    for n in nodes:
        for c in n.get("children", []):
            parent[nodes[c].get("name")] = n.get("name")
    worlds = world_matrices(g)

    skeleton = []
    for j in joints:
        n = nodes[ids[j]]
        skeleton.append({"name": j, "parent": index.get(parent.get(j), -1),
                         "t": n.get("translation", [0, 0, 0]), "r": n.get("rotation", [0, 0, 0, 1])})

    rot_chunks, pelvis_chunks = [], []
    rot_off = pel_off = 0
    clips = {}
    pelvis_rest = np.array(nodes[ids["pelvis"]]["translation"])
    for anim in g["animations"]:
        name = anim["name"]
        if name not in CLIPS:
            continue
        frames = 0
        tracks = {}
        pelvis = None
        for c in anim["channels"]:
            s = anim["samplers"][c["sampler"]]
            joint = nodes[c["target"]["node"]]["name"]
            times = read_accessor(g, blob, s["input"])
            values = read_accessor(g, blob, s["output"])
            frames = max(frames, len(times))
            if c["target"]["path"] == "rotation" and joint in index:
                tracks[index[joint]] = (times, values)
            elif c["target"]["path"] == "translation" and joint == "pelvis":
                pelvis = (times, values)
        dur = float(max(t[-1] for t, _ in tracks.values()))
        n = max(2, int(round(dur * 30)) + 1)
        grid = np.linspace(0, dur, n)
        table = []
        for j, (t, q) in sorted(tracks.items()):
            # Resample on the grid with sign continuity, then quantise.
            q = q.copy()
            for i in range(1, len(q)):
                if q[i] @ q[i - 1] < 0:
                    q[i] = -q[i]
            r = np.stack([np.interp(grid, t, q[:, k]) for k in range(4)], 1)
            r /= np.linalg.norm(r, axis=1, keepdims=True)
            still = np.abs(r - r[0]).max() < 2e-4
            data = np.round((r[:1] if still else r) * 32767).astype("<i2")
            table.append([j, rot_off, 1 if still else 0])
            rot_chunks.append(data.tobytes())
            rot_off += data.size
        p = np.stack([np.interp(grid, pelvis[0], pelvis[1][:, k]) for k in range(3)], 1) if pelvis else np.tile(pelvis_rest, (n, 1))
        pelvis_chunks.append(p.astype("<f4").tobytes())
        clips[name] = {"frames": n, "dur": dur, "loop": name in LOOPING, "tracks": table, "pelvis": pel_off}
        pel_off += p.size

    missing = [c for c in CLIPS if c not in clips]
    if missing:
        raise ValueError(f"not in master: {missing}")

    os.makedirs(out_dir, exist_ok=True)
    rot_bytes = b"".join(rot_chunks)
    pad = b"\0" * (-len(rot_bytes) % 4)
    with open(os.path.join(out_dir, "clips.bin"), "wb") as f:
        f.write(rot_bytes + pad + b"".join(pelvis_chunks))
    meta = {"fps": 30, "skeleton": skeleton, "clips": clips, "pelvisRest": pelvis_rest.tolist(),
            "pelvisByteOffset": len(rot_bytes) + len(pad), "grip": grip_frames(worlds, ids)}
    with open(os.path.join(out_dir, "clips.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    print(f"{len(clips)} clips, {(len(rot_bytes) + pel_off * 4) / 1048576:.2f} MB")


if __name__ == "__main__":
    main()
