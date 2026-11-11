"""Pack the clips the townsfolk live by, from Lisandra's rig, into one small binary every one of them shares.

Lisandra (assets/game/lisandra/pretty.glb) carries 175 clips on Tripo's `mixamorig:` skeleton: Tripo's own and the UAL ones
laid onto her. The townsfolk are Tripo rigs too, but their bones point other ways, so nothing is baked per person here: the
game retargets these at run time (src/sim/folk/rig.js), from her rest pose, which this file carries, to each body's.

- Rotations are int16 on a 30 Hz grid, one track per joint; a track that doesn't move is stored once.
- Fingers keep one pose per clip, its average: at the distance you meet people in the street their fingers' motion is lost,
  and they're two thirds of the joints.
- The hips' path: walks and runs have their forward travel taken out and measured (`travel`, metres of her unscaled rig per
  cycle), so the game can carry the body and match the feet to the ground. Everything else that's meant to stay put has its
  drift taken out, so it loops or hands over without a jump.

Writes assets/game/folk/clips.json and clips.bin.   python tools/folk/pack_clips.py [SRC_GLB]
Then run `node tools/folk/smith_clips.mjs`, which adds the smith's own clips at his anvil: they're made, not hers.
"""
import json
import os
import struct
import sys

import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

# name in the game: (her clip, options). loop: it repeats. move: it travels (a walk or run). keep: leave its hips' wander.
# from/to: the part of her clip used, in seconds.
CLIPS = {
    # Going places.
    "walk": ("walk", {"loop": True, "move": True}),
    "walk_ual": ("Walk_Loop", {"loop": True, "move": True}),
    "walk_formal": ("Walk_Formal_Loop", {"loop": True, "move": True}),
    "walk_proud": ("Slow, proud walk with longer strides.", {"loop": True, "move": True}),
    "walk_carry": ("Walk_Carry_Loop", {"loop": True, "move": True}),
    "jog": ("Jog_Fwd_Loop", {"loop": True, "move": True}),
    "run": ("run", {"loop": True, "move": True}),
    "flee": ("flee_01", {"loop": True, "move": True}),
    "swagger": ("swagger", {"loop": True, "move": True}),
    "crouch_walk": ("Crouch_Fwd_Loop", {"loop": True, "move": True}),
    # Standing about.
    "idle": ("idle", {"loop": True}),
    "relax": ("standing_relax", {"loop": True}),
    "idle_ual": ("Idle_Loop", {"loop": True}),
    "wait": ("wait", {"loop": True}),
    "look_around": ("look_around", {"loop": True}),
    "fold_arms": ("fold_arms", {"loop": True}),
    "fold_arms_ual": ("Idle_FoldArms_Loop", {"loop": True}),
    "talk": ("Idle_Talking_Loop", {"loop": True}),
    "lantern": ("Idle_Lantern_Loop", {"loop": True}),
    "torch": ("Idle_Torch_Loop", {"loop": True}),
    "crouch": ("Crouch_Idle_Loop", {"loop": True}),
    "scratch": ("scratch", {}),
    "turn": ("turn", {}),
    # Talking with someone.
    "greet": ("greet_01", {}),
    "greet_2": ("greet_02", {}),
    "greet_3": ("greet_03", {}),
    "greet_4": ("greet_04", {}),
    "wave": ("wave_goodbye_01", {}),
    "wave_2": ("wave_goodbye_02", {}),
    "bow": ("bow", {}),
    "agree": ("agree", {}),
    "nod": ("Yes", {}),
    "laugh": ("laugh_01", {}),
    "laugh_2": ("laugh_02", {}),
    "complain": ("complain_01", {}),
    "complain_2": ("complain_02", {}),
    "angry": ("angry_01", {}),
    "angry_2": ("angry_02", {}),
    "angry_3": ("angry_03", {}),
    "rant": ("Talking to someone angrily", {"loop": True}),
    "frustrated": ("frustrated_01", {}),
    "frustrated_2": ("frustrated_02", {}),
    "clap": ("clap", {"loop": True}),
    "cheer": ("cheer", {}),
    "hug": ("hug", {}),
    "sob": ("sob", {"loop": True}),
    "cry": ("cry", {"loop": True}),
    "depressed": ("depressed", {"loop": True}),
    "point": ("Pointing into the distance", {}),
    "heart": ("heart_pose", {}),
    # Play, song and dance.
    "dance_1": ("dance_01", {"loop": True, "keep": True}),
    "dance_2": ("dance_02", {"loop": True, "keep": True}),
    "dance_3": ("dance_03", {"loop": True, "keep": True}),
    "dance_4": ("dance_04", {"loop": True, "keep": True}),
    "dance_5": ("dance_05", {"loop": True, "keep": True}),
    "dance_6": ("dance_06", {"loop": True, "keep": True}),
    "sing_1": ("sing_01", {"loop": True}),
    "sing_2": ("sing_02", {"loop": True}),
    "sing_3": ("sing_03", {"loop": True}),
    "sing_4": ("sing_04", {"loop": True}),
    "flip": ("flip", {"keep": True}),
    "jump": ("jump", {}),
    "spar": ("box_01", {}),
    "spar_2": ("box_02", {}),
    "kick": ("front_kick_01", {}),
    "warm_up": ("warm_up", {"loop": True}),
    "press_up": ("press-up", {"loop": True}),
    "throw": ("basketball_shot", {}),
    "dribble": ("crossover_dribble", {"loop": True, "keep": True}),
    # Work.
    "dig": ("dig", {"loop": True}),
    "shovel": ("shovel", {"loop": True}),
    "lift": ("lift_heavy", {}),
    "chop": ("chop", {"loop": True}),
    "chop_wood": ("TreeChopping_Loop", {"loop": True}),
    "harvest": ("Farm_Harvest", {"loop": True}),
    "plant": ("Farm_PlantSeed", {"loop": True}),
    "water": ("Farm_Watering", {"loop": True}),
    "interact": ("Interact", {}),
    "pick_up": ("PickUp_Table", {}),
    "open_chest": ("Chest_Open", {}),
    "eat": ("Consume", {}),
    # Sitting and lying.
    "sit": ("sit", {"keep": True}),
    "sit_down": ("Sitting_Enter", {"keep": True}),
    "sit_idle": ("Sitting_Idle_Loop", {"loop": True}),
    "sit_up": ("Sitting_Exit", {"keep": True}),
    "get_up": ("LayToIdle", {"keep": True}),
    "fall": ("fall", {"keep": True}),
    # Fright.
    "afraid": ("afraid", {}),
    "scared": ("scared_01", {}),
    "scared_2": ("scared_02", {}),
    "frightened": ("frightened", {}),
    "hit": ("hit_to_body_01", {}),
}
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")


def load_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    jlen = struct.unpack_from("<I", data, 12)[0]
    g = json.loads(data[20:20 + jlen])
    blob = data[20 + jlen + 8:]
    return g, blob


def read(g, blob, i):
    a = g["accessors"][i]
    bv = g["bufferViews"][a["bufferView"]]
    n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
    dt = {5126: "<f4", 5123: "<u2", 5125: "<u4", 5121: "u1"}[a["componentType"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    arr = np.frombuffer(blob, dtype=dt, count=a["count"] * n, offset=off)
    return arr.reshape(a["count"], n) if n > 1 else arr


def resample(times, values, grid, quat):
    v = values.astype(np.float64).copy()
    if quat:
        for i in range(1, len(v)):
            if v[i] @ v[i - 1] < 0:
                v[i] = -v[i]
    out = np.stack([np.interp(grid, times, v[:, k]) for k in range(v.shape[1])], 1)
    if quat:
        out /= np.linalg.norm(out, axis=1, keepdims=True)
    return out


def mean_quat(q):
    q = q.copy()
    for i in range(1, len(q)):
        if q[i] @ q[0] < 0:
            q[i] = -q[i]
    m = q.mean(0)
    return m / np.linalg.norm(m)


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "assets", "game", "lisandra", "pretty.glb")
    out_dir = os.path.join(ROOT, "assets", "game", "folk")
    os.makedirs(out_dir, exist_ok=True)
    g, blob = load_glb(src)
    nodes = g["nodes"]
    skin = g["skins"][0]
    joints = [j for j in skin["joints"] if nodes[j].get("name", "").startswith("mixamorig:")]
    names = [nodes[j]["name"] for j in joints]
    index = {j: i for i, j in enumerate(joints)}
    parent = [-1] * len(joints)
    for ni, n in enumerate(nodes):
        for c in n.get("children", []):
            if c in index and ni in index:
                parent[index[c]] = index[ni]
    skeleton = [{"name": names[i], "parent": parent[i], "t": nodes[j].get("translation", [0, 0, 0]), "r": nodes[j].get("rotation", [0, 0, 0, 1])}
                for i, j in enumerate(joints)]
    hips = names.index("mixamorig:Hips")
    finger = [any(f in n for f in FINGERS) for n in names]
    anims = {a["name"]: a for a in g["animations"]}

    rot_chunks, hip_chunks = [], []
    rot_off = hip_off = 0
    clips = {}
    for game_name, (src_name, opt) in CLIPS.items():
        anim = anims.get(src_name)
        if anim is None:
            raise ValueError(f"Lisandra has no clip {src_name!r}")
        tracks, hip = {}, None
        for c in anim["channels"]:
            node = c["target"]["node"]
            if node not in index:
                continue
            s = anim["samplers"][c["sampler"]]
            t, v = read(g, blob, s["input"]), read(g, blob, s["output"])
            if c["target"]["path"] == "rotation":
                tracks[index[node]] = (t, v)
            elif c["target"]["path"] == "translation" and index[node] == hips:
                hip = (t, v)
        t0 = float(opt.get("from", 0.0))
        t1 = float(opt.get("to", max(float(t[-1]) for t, _ in tracks.values())))
        dur = t1 - t0
        n = max(2, int(round(dur * 30)) + 1)
        grid = np.linspace(t0, t1, n)
        table = []
        for j, (t, v) in sorted(tracks.items()):
            r = resample(t, v, grid, True)
            still = finger[j] or np.abs(r - r[0]).max() < 2e-4
            if finger[j]:
                r = mean_quat(r)[None]
            data = np.round((r[:1] if still else r) * 32767).astype("<i2")
            table.append([j, rot_off, 1 if still else 0])
            rot_chunks.append(data.tobytes())
            rot_off += data.size
        rest = np.array(skeleton[hips]["t"], dtype=np.float64)
        p = resample(hip[0], hip[1], grid, False) if hip else np.tile(rest, (n, 1))
        travel = 0.0
        if opt.get("move"):
            # The way it goes: the body's forward is +Z. What's left is its sway and bob.
            d = p[-1] - p[0]
            travel = float(np.hypot(d[0], d[2]))
            for k in (0, 2):
                p[:, k] -= np.linspace(0, d[k], n)
        elif not opt.get("keep"):
            # Stays where it stands: no drift from start to end, and none of its wander further than a step.
            d = p[-1] - p[0]
            for k in (0, 2):
                p[:, k] -= np.linspace(0, d[k], n)
                p[:, k] = p[0, k] + np.clip(p[:, k] - p[0, k], -0.12, 0.12)
        hip_chunks.append(p.astype("<f4").tobytes())
        clips[game_name] = {"frames": n, "dur": round(dur, 5), "loop": bool(opt.get("loop")), "tracks": table, "hips": hip_off,
                            "travel": round(travel, 5), "src": src_name}
        hip_off += p.size

    rot_bytes = b"".join(rot_chunks)
    pad = (-len(rot_bytes)) % 4
    with open(os.path.join(out_dir, "clips.bin"), "wb") as f:
        f.write(rot_bytes + b"\0" * pad)
        f.write(b"".join(hip_chunks))
    meta = {"fps": 30, "skeleton": skeleton, "hipsByteOffset": len(rot_bytes) + pad, "clips": clips}
    with open(os.path.join(out_dir, "clips.json"), "w") as f:
        json.dump(meta, f, separators=(",", ":"))
    size = os.path.getsize(os.path.join(out_dir, "clips.bin"))
    print(f"{len(clips)} clips, {len(names)} joints, {size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
