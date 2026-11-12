"""Every body of the other Tessariels looked over, for review: plans for tools/heroes/moves.mjs, and the sheets from its frames.

    python tools/heroes/review.py plan            writes tools/build/review_bodies_<n>.json, sixteen bodies to a plan
    node tools/heroes/moves.mjs tools/build/review_bodies_0.json <port> --real     (and _1, _2: the real GPU, at High)
    python tools/heroes/review.py sheets [ids]    lays each body's frames out: tools/build/shots/body_<id>.png

A body's sheet, twelve pictures: walked round as it stands in town, its arms put away (from before it, the quarters, each
side, behind); stood to a foe with its arms in hand (three sides); and held in a run, a cheer with both arms up and a
crouch, which is where plates part.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUILD = os.path.join(ROOT, "tools", "build")
SHOTS = os.path.join(BUILD, "shots")
ROSTER = json.load(open(os.path.join(ROOT, "assets", "game", "heroes", "roster.json")))
# How far off each class stands from what it fights (so the foe's out of the picture, or near its edge).
DIST = {"archer": 8, "bard": 6, "boomerang": 5.5, "lancer": 3.4}
# strip, what it is, the bearings it's seen from (0: from before it), and the label under each picture.
STRIPS = [
    # (lead: the dust of the practice dead swept away from before the last body is let settle first.)
    ("turn", {"foes": 0, "lead": 420}, [0, 45, 90, 180, 270, 315], "at ease"),
    ("run", {"clip": "Jog_Fwd_Loop", "at": 0.25, "foes": 0}, [270], "run"),
    ("cheer", {"clip": "LP_cheer", "at": 0.5, "foes": 0}, [20], "arms up"),
    ("crouch", {"clip": "Crouch_Idle_Loop", "at": 0.5, "foes": 0}, [50], "crouch"),
    # (tail: the dust of the dead that was stood up for it is let settle, or it hangs before the next body's first picture.)
    ("arms", {"stance": True, "foes": 1, "lead": 150, "up": 1.55, "tail": 300}, [320, 80, 200], "armed"),
]
CELL = (430, 40, 850, 700)


def plan():
    ids = [h["id"] for h in ROSTER]
    for n in range(0, len(ids), 16):
        part = ids[n:n + 16]
        strips = []
        for i in part:
            cls = next(h["cls"] for h in ROSTER if h["id"] == i)
            for name, o, turn, _ in STRIPS:
                strips.append({"name": f"B_{i}_{name}", "body": i, "turn": turn, "frames": len(turn), "every": 2, "dist": DIST.get(cls, 2.4), "cam": [0, 6, 2], **{"tail": 6, **o}})
        path = os.path.join(BUILD, f"review_bodies_{n // 16}.json")
        json.dump({"name": f"bodies{n // 16}", "size": [1280, 720], "hour": 13, "at": [80, -28], "gfx": "high", "bodies": part, "strips": strips}, open(path, "w"), indent=1)
        print(path, len(strips), "strips")


def sheets(only):
    for h in ROSTER:
        i = h["id"]
        if only and i not in only:
            continue
        cells = []
        for name, _, turn, label in STRIPS:
            for k, deg in enumerate(turn):
                f = os.path.join(SHOTS, f"mv_B_{i}_{name}_{k:02d}.png")
                if os.path.exists(f):
                    cells.append((Image.open(f).convert("RGB").crop(CELL), f"{label} {deg}"))
        if not cells:
            continue
        w, hgt = cells[0][0].size
        cols = 6
        rows = (len(cells) + cols - 1) // cols
        out = Image.new("RGB", (cols * w, rows * hgt + 22), (16, 14, 12))
        d = ImageDraw.Draw(out)
        parts = sorted(set(h["groups"].values()))
        d.text((6, 5), f"{i}   {h['cls']} ({h['sex']})   palette: {h['palette']}   {'one suit' if len(parts) == 1 else 'mixed from ' + str(len(parts)) + ' suits'}   height {h['height']} m", fill=(230, 215, 170))
        for n, (im, label) in enumerate(cells):
            x, y = (n % cols) * w, (n // cols) * hgt + 22
            out.paste(im, (x, y))
            d.text((x + 5, y + 4), label, fill=(255, 240, 160))
        path = os.path.join(SHOTS, f"body_{i}.png")
        out.save(path)
        print(path)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "plan":
        plan()
    else:
        sheets(sys.argv[2:])
