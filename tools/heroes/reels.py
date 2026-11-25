"""Reels for anim.html's "Before and after" scenes: what a hero does, as the game's own code poses it, recorded frame by
frame from main as it was (a checkout of it at tools/build/h3/beforetree, its bodies and code) and from this checkout.

    python tools/heroes/reels.py [ids...]        -> tools/build/h3/reels/<id>.before.json, <id>.after.json

Each: {body, fps, glb, kit, scenes: {name: {loop, frames: [{q, t, p}]}}}: every joint's world turn (q, x y z w) and place
(t, metres, from where he stood at the scene's start; a gait's from where he is that frame, so he runs on the spot), and
each thing he carries as [id, its matrix] (null if nothing). Facing +z.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BEFORE = os.path.join(ROOT, "tools", "build", "h3", "beforetree")
OUT = os.path.join(ROOT, "tools", "build", "h3", "reels")
FPS = 24
GAITS = {"walk", "jog", "run", "sprint"}

REELS = {
    "paladin_m1": "run,sprint,armed,blow,blow1,blow2,skill:zeal,skill:smite,skill:hammer_throw,skill:consecration",
    "paladin_m2": "run,guard,blow,blow1,blow2,skill:zeal,skill:smite,skill:blessed_hammers",
    "archer_f1": "run,armed,blow,skill:volley,skill:rain_of_arrows,skill:strafe",
    "rogue_m2": "run,armed,blow,blow1,skill:flurry,skill:vanish",
    "ninja_m1": "run,blow,skill:leaping_kick,skill:ninja_flurry,skill:throwing_stars",
    "bard_m1": "run,armed,skill:war_song,skill:mending_song",
    "dragoon_f1": "run,blow,skill:spear_barrage,skill:jump",
    "lancer_m1": "run,blow,skill:charge,skill:shield_bash",
    "boomerang_f1": "run,blow,skill:double_throw",
}


def r4(v):
    return [round(x, 4) for x in v]


def record(hid, scenes, tree):
    raw = subprocess.run(["node", os.path.join(tree, "tools", "heroes", "posedump.mjs"), hid, scenes, f"--fps={FPS}", "--span=3"],
                         cwd=tree, capture_output=True, text=True, check=True).stdout
    fr = json.loads(raw)["frames"]
    out = {}
    for f in fr:
        name = f["scene"]
        s = out.setdefault(name, {"loop": name in GAITS or name in ("armed", "guard"), "frames": [], "o": f["at"]})
        o = f["at"] if name in GAITS else s["o"]
        t = list(f["wt"])
        for j in range(0, len(t), 3):
            t[j] -= o[0]; t[j + 1] -= o[1]; t[j + 2] -= o[2]
        p = []
        for q in f["props"]:
            m = q["m"]
            if not q["id"] or not any(m[:12]):
                p.append(None)
                continue
            m = list(m)
            m[12] -= o[0]; m[13] -= o[1]; m[14] -= o[2]
            p.append([q["id"], r4(m)])
        s["frames"].append({"q": r4(f["wq"]), "t": r4(t), "p": p})
    for s in out.values():
        del s["o"]
    return out


def main():
    ids = [a for a in sys.argv[1:] if not a.startswith("--")] or list(REELS)
    os.makedirs(OUT, exist_ok=True)
    for hid in ids:
        for tag, tree, glb in (("before", BEFORE, "tools/build/h3/beforetree/assets/game/heroes"), ("after", ROOT, "assets/game/heroes")):
            sc = record(hid, REELS[hid], tree)
            doc = {"body": hid, "fps": FPS, "glb": f"{glb}/{hid}.glb", "kit": f"{glb}/kit/", "scenes": sc}
            path = os.path.join(OUT, f"{hid}.{tag}.json")
            json.dump(doc, open(path, "w"), separators=(",", ":"))
            print(hid, tag, {k: len(v["frames"]) for k, v in sc.items()}, f"{os.path.getsize(path) / 1e6:.1f} MB", flush=True)


if __name__ == "__main__":
    main()
