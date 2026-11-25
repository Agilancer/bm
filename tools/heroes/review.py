"""Every body of the other Tessariels looked over, for review: plans for tools/heroes/moves.mjs, and the sheets from its frames.

    python tools/heroes/review.py plan            writes tools/build/review_bodies_<n>.json, sixteen bodies to a plan
    node tools/heroes/moves.mjs tools/build/review_bodies_0.json <port> --real     (and _1, _2: the real GPU, at High)
    python tools/heroes/review.py sheets [ids]    lays each body's frames out: tools/build/shots/body_<id>.png
    python tools/heroes/review.py plan neck       the neck and shoulders alone, close (NECK_STRIPS): one plan, all 44
    python tools/heroes/review.py necks [ids]     their sheets: tools/build/shots/neck_<id>.png, and all of them on one

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
    ("run", {"clip": "Jog_Fwd_Loop", "at": 0.25, "foes": 0}, [270], "run"),
    ("cheer", {"clip": "LP_cheer", "at": 0.5, "foes": 0}, [20], "arms up"),
    ("crouch", {"clip": "Crouch_Idle_Loop", "at": 0.5, "foes": 0}, [50], "crouch"),
    # (Walked round at ease after the run, the cheer and the crouch: the dust of the last body's practice dead has settled by then.)
    ("turn", {"foes": 0, "lead": 900}, [0, 45, 90, 180, 270, 315], "at ease"),
    # (tail: the dust of the dead that was stood up for it is let settle, or it hangs before the next body's first picture.)
    ("arms", {"stance": True, "foes": 1, "lead": 150, "up": 1.55, "tail": 300}, [320, 80, 200], "armed"),
]
CELL = (430, 40, 850, 700)
# The neck and shoulders close, where the coif, the gorget and the mail at the arms' roots meet: walked round at ease, the
# head turned (LP_look_around, where a coif shows most), and both arms up (where the armpits open). Heights are of a body's
# own height (the eye stands at its collar and looks at its throat).
NECK_STRIPS = [
    ("nk", {"foes": 0, "lead": 40}, [0, 60, 120, 180, 240, 300], "at ease", 1.6),
    ("nklook", {"clip": "LP_look_around", "at": 0.3, "foes": 0}, [0, 90, 270], "head turned", 1.6),
    # (From further off and higher, so the whole raised arm is in the picture, and once from the side for the armpit.)
    ("nkup", {"clip": "LP_cheer", "at": 0.5, "foes": 0, "look": 0.92}, [35, 90, 325], "arms up", 2.9),
]
NECK_CELL = (340, 0, 940, 720)


def plan_neck():
    # (Sixteen bodies to a plan, as for plan(): the game has sixteen of them out at once.)
    for n in range(0, len(ROSTER), 16):
        strips = []
        for h in ROSTER[n:n + 16]:
            for name, o, turn, _, r in NECK_STRIPS:
                H = h["height"]
                o = dict(o); look = o.pop("look", 0.78)
                # (The eye stands off by the body's height: a two-metre knight's shoulders filled the picture at an archer's distance.)
                strips.append({"name": f"N_{h['id']}_{name}", "body": h["id"], "turn": turn, "frames": len(turn), "every": 2, "dist": 2.4, "cam": [0, 6, 2],
                               "r": round(r * H / 1.7, 3), "up": round(H * (look + 0.08), 3), "lookY": round(H * look, 3), "fov": 26, "tail": 6, **o})
        path = os.path.join(BUILD, f"review_necks_{n // 16}.json")
        json.dump({"name": f"necks{n // 16}", "size": [1280, 720], "hour": 13, "at": [80, -28], "gfx": "high", "bodies": [h["id"] for h in ROSTER[n:n + 16]], "strips": strips}, open(path, "w"), indent=1)
        print(path, len(strips), "strips")


def necks(only):
    every = []
    for h in ROSTER:
        i = h["id"]
        if only and i not in only:
            continue
        cells = []
        for name, _, turn, label, _ in NECK_STRIPS:
            for k, deg in enumerate(turn):
                f = os.path.join(SHOTS, f"mv_N_{i}_{name}_{k:02d}.png")
                if os.path.exists(f):
                    cells.append((Image.open(f).convert("RGB").crop(NECK_CELL).resize((400, 480)), f"{label} {deg}"))
        if not cells:
            continue
        w, hgt = cells[0][0].size
        cols = 6
        out = Image.new("RGB", (cols * w, 2 * hgt + 22), (16, 14, 12))
        d = ImageDraw.Draw(out)
        d.text((6, 5), f"{i}   {h['cls']} ({h['sex']})   palette: {h['palette']}   height {h['height']} m", fill=(230, 215, 170))
        for n, (im, label) in enumerate(cells):
            x, y = (n % cols) * w, 22 + (n // cols) * hgt
            out.paste(im, (x, y))
            d.text((x + 5, y + 4), label, fill=(255, 240, 160))
        path = os.path.join(SHOTS, f"neck_{i}.png")
        out.save(path)
        every.append(path)
        print(path)
    return every


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
    if len(sys.argv) > 2 and sys.argv[1] == "plan" and sys.argv[2] == "neck":
        plan_neck()
    elif len(sys.argv) > 1 and sys.argv[1] == "plan":
        plan()
    elif len(sys.argv) > 1 and sys.argv[1] == "necks":
        necks(sys.argv[2:])
    else:
        sheets(sys.argv[2:])
