"""Contact sheets of the townsfolk from tools/folk/look.py's pictures.  Plain Python (Pillow):

    python tools/folk/sheets.py TILES_DIR OUT_DIR

lineup.png: every body from the front, in rows at one scale, with the ground, 1 m and 2 m drawn across.
bodies_<group>.png: front and three-quarter, the same scale and lines.  faces.png: every face, front and three-quarter.
swap_<name>.png: a palette swap beside its base, body and face (when TILES_DIR has <swap>_*.png).
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CFG = json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))
PX_PER_M = 300
PAD = 0.05
BG = (78, 80, 86)
INK = (235, 230, 220)
LINE = (150, 154, 162)
GROUPS = {
    "children": ["boy_1", "boy_2", "boy_3", "girl_1", "girl_lily", "girl_3"],
    "ladies": ["lady_blue", "dame_blue", "lady_red_1", "lady_red_2", "lady_red_3", "lady_red_busty"],
    "women": ["wife_big", "wife_jolly", "crone", "redhead", "worker_f", "young_1", "young_2", "young_3", "young_4", "young_5"],
    "men": ["smith", "sage", "dude", "elder", "old_man", "wes", "worker_2", "worker"],
    "lords": ["lord_blue", "knight_blue", "youth_blue", "lord_red", "youth_red"],
}


def font(size):
    for f in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def tile(d, name):
    p = os.path.join(d, name + ".png")
    return Image.open(p).convert("RGBA") if os.path.exists(p) else None


def heights(img, x0, x1, y_ground, f):
    """Ground, 1 m and 2 m lines across a row, labelled at the left."""
    dr = ImageDraw.Draw(img)
    for m in (0, 1, 2):
        y = y_ground - m * PX_PER_M
        if y < 0:
            continue
        for x in range(x0, x1, 14):
            dr.line([(x, y), (min(x + 7, x1), y)], fill=LINE, width=1 if m else 2)
        dr.text((x0 + 4, y - 22), f"{m} m", fill=LINE, font=f)


def row_sheet(d, rows, views, out, title):
    """rows: [(label, [tile names...] per entry)]; each entry one or more views side by side."""
    f, fb = font(20), font(26)
    th = Image.open(os.path.join(d, rows[0][1][0] + ".png")).height
    tw = Image.open(os.path.join(d, rows[0][1][0] + ".png")).width
    per = len(views)
    cols = max(len(r[1]) // per for r in rows)
    W = 70 + cols * (tw * per + 16)
    rh = th + 40
    H = 50 + len(rows) * rh
    img = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(img)
    dr.text((16, 10), title, fill=INK, font=fb)
    for r, (label, names) in enumerate(rows):
        y0 = 50 + r * rh
        ground = y0 + th - int(PAD * PX_PER_M)
        heights(img, 0, W, ground, f)
        for k in range(0, len(names), per):
            x = 70 + (k // per) * (tw * per + 16)
            for j, n in enumerate(names[k:k + per]):
                t = tile(d, n)
                if t:
                    img.paste(t, (x + j * tw, y0), t)
            mid = names[k].rsplit("_", 1)[0] if names[k].endswith(("_front", "_q34")) else names[k]
            h = CFG["models"].get(mid, {}).get("height")
            text = label[k // per] if isinstance(label, list) else mid
            dr.text((x + 6, y0 + th + 4), f"{text}" + (f"  {h:.2f} m" if h else ""), fill=INK, font=f)
    img.save(out)
    return out


def faces_sheet(d, ids, out, cols=5):
    f = font(18)
    t0 = tile(d, ids[0] + "_face")
    s = t0.width
    W = cols * (2 * s + 12) + 12
    H = ((len(ids) + cols - 1) // cols) * (s + 30) + 12
    img = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(img)
    for i, mid in enumerate(ids):
        x = 12 + (i % cols) * (2 * s + 12)
        y = 12 + (i // cols) * (s + 30)
        for j, v in enumerate(("face", "face_q34")):
            t = tile(d, f"{mid}_{v}")
            if t:
                img.paste(t, (x + j * s, y), t)
        dr.text((x + 4, y + s + 2), mid, fill=INK, font=f)
    img.save(out)
    return out


def swap_sheet(d, swap, base, note, out):
    """Base beside swap: body front, body three-quarter and face, each pair side by side."""
    f, fb = font(20), font(24)
    pairs = [(base + "_front", swap + "_front"), (base + "_q34", swap + "_q34"), (base + "_face", swap + "_face")]
    ims = [(tile(d, a), tile(d, b)) for a, b in pairs]
    bw, bh = ims[0][0].size
    fs = int(bh * 0.5)
    W = 2 * bw * 2 + 2 * fs + 60
    H = bh + 70
    img = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(img)
    dr.text((14, 8), f"{base}  ->  {swap}: {note}", fill=INK, font=fb)
    heights(img, 0, 4 * bw + 30, 50 + bh - int(PAD * PX_PER_M), f)
    x = 10
    for (a, b), (na, nb) in zip(ims[:2], pairs[:2]):
        img.paste(a, (x, 50), a)
        img.paste(b, (x + bw, 50), b)
        dr.text((x + 6, 50 + bh - 4), "base", fill=INK, font=f)
        dr.text((x + bw + 6, 50 + bh - 4), "swap", fill=INK, font=f)
        x += 2 * bw + 10
    a, b = ims[2]
    a, b = a.resize((fs, fs), Image.LANCZOS), b.resize((fs, fs), Image.LANCZOS)
    img.paste(a, (x + 10, 50), a)
    img.paste(b, (x + 10 + fs, 50), b)
    q = [tile(d, base + "_face_q34"), tile(d, swap + "_face_q34")]
    if q[0] and q[1]:
        img.paste(q[0].resize((fs, fs), Image.LANCZOS), (x + 10, 50 + fs), q[0].resize((fs, fs), Image.LANCZOS))
        img.paste(q[1].resize((fs, fs), Image.LANCZOS), (x + 10 + fs, 50 + fs), q[1].resize((fs, fs), Image.LANCZOS))
    img.save(out)
    return out


def main(d, out):
    os.makedirs(out, exist_ok=True)
    made = []
    ids = [m for g in GROUPS.values() for m in g]
    missing = set(CFG["models"]) - set(ids)
    assert not missing, missing
    # Lineup: three rows, children with the women so the scale reads.
    rows = [(None, [m + "_front" for m in GROUPS["children"] + GROUPS["ladies"]]),
            (None, [m + "_front" for m in GROUPS["women"]]),
            (None, [m + "_front" for m in GROUPS["men"] + GROUPS["lords"]])]
    rows = [(None, r) for _, r in rows]
    made.append(row_sheet(d, rows, ["front"], os.path.join(out, "lineup.png"), "Townsfolk lineup: one scale, ground / 1 m / 2 m"))
    for g, ms in GROUPS.items():
        names = [m + v for m in ms for v in ("_front", "_q34")]
        made.append(row_sheet(d, [(None, names)], ["front", "q34"], os.path.join(out, f"bodies_{g}.png"), f"{g}: front and three-quarter"))
    made.append(faces_sheet(d, ids, os.path.join(out, "faces.png")))
    swaps_cfg = os.path.join(ROOT, "assets", "game", "folk", "folk.json")
    if os.path.exists(swaps_cfg):
        for s, v in json.load(open(swaps_cfg)).get("swaps", {}).items():
            if tile(d, s + "_front"):
                made.append(swap_sheet(d, s, v["base"], v.get("note", ""), os.path.join(out, f"swap_{s}.png")))
    for m in made:
        print("SHEET", m)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
