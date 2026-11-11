"""Lays the frames of each strip from tools/heroes/moves.mjs side by side, numbered, for looking at a move whole.

    python tools/heroes/sheet.py [name ...] [--cols N] [--crop x0,y0,x1,y1] [--scale S]

With no names, every strip listed in tools/build/shots/mv__*.json. Sheets go to tools/build/shots/sheet_<name>.png.
"""
import glob
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "tools", "build", "shots")


def sheet(name, files, cols, crop, scale, note=""):
    ims = [Image.open(f).convert("RGB") for f in files if os.path.exists(f)]
    if not ims:
        return None
    if crop:
        w, h = ims[0].size
        box = (int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h))
        ims = [im.crop(box) for im in ims]
    if scale != 1:
        ims = [im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS) for im in ims]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (cols * w, rows * h + 18), (16, 14, 12))
    d = ImageDraw.Draw(out)
    d.text((4, 3), f"{name}  {note}", fill=(230, 215, 170))
    for i, im in enumerate(ims):
        x, y = (i % cols) * w, (i // cols) * h + 18
        out.paste(im, (x, y))
        d.text((x + 4, y + 3), str(i + 1), fill=(255, 240, 160))
    path = os.path.join(ROOT, f"sheet_{name}.png")
    out.save(path)
    return path


def main():
    args = sys.argv[1:]
    opt = lambda k, d: args[args.index(k) + 1] if k in args else d
    cols = int(opt("--cols", 4))
    crop = [float(v) for v in opt("--crop", "0,0,1,1").split(",")]
    scale = float(opt("--scale", 1))
    names = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or not args[i - 1].startswith("--"))]
    strips = {}
    for j in glob.glob(os.path.join(ROOT, "mv__*.json")):
        for s in json.load(open(j)):
            strips[s["name"]] = s
    for name in names or sorted(strips):
        s = strips.get(name) or {"files": sorted(glob.glob(os.path.join(ROOT, f"mv_{name}_[0-9][0-9].png"))), "note": ""}
        p = sheet(name, s["files"], cols, crop if crop != [0, 0, 1, 1] else None, scale, s.get("note", ""))
        print(p or f"{name}: no frames")


if __name__ == "__main__":
    main()
