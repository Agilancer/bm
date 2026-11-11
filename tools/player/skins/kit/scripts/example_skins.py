"""Makes the two skin files the example recipe recipes/harlequin_example.json uses, to show how a skin file is painted
by a program: a hat in two-colour diamonds, and boots with a painted toe cap and cuff.

    python scripts/example_skins.py

An image model can paint one instead: give it templates/head_lines.png (or head_original.jpg) and ask it to paint the
hat in every panel, keeping each shape where it is. See README.md, "Skin files"."""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paint_helpers import KIT, clip, panel, start  # noqa: E402


def hat():
    w, h = start("head").size
    # Diamonds, two colours turn about, across every panel alike: a chequer turned on its corner.
    import numpy as np
    y, x = np.mgrid[0:h, 0:w]
    step = w // 30
    odd = (((x + y) // step) + ((x - y) // step)) % 2 == 1
    px = np.where(odd[..., None], np.array([0x6b, 0x1d, 0x2a], np.uint8), np.array([0xc9, 0xa2, 0x27], np.uint8)).astype(np.uint8)
    img = Image.fromarray(px, "RGB")
    d = ImageDraw.Draw(img)
    # A plain band low on the crown in the four side panels.
    for name in ("front", "back", "left", "right"):
        x0, y0, x1, y1 = panel("head", name)
        band = y0 + int((y1 - y0) * 0.585)
        d.rectangle((x0, band, x1, band + (y1 - y0) // 22), fill="#1f1a17")
    clip("head", img).save(os.path.join(KIT, "skins", "harlequin_hat.png"))


def boots():
    img = start("feet", "original").convert("RGB")
    # Over the boots as they came: dyed green, with a gold toe and cuff in the side and front panels.
    tint = Image.new("RGB", img.size, "#2f5d3a")
    img = Image.blend(Image.composite(tint, img, img.convert("L").point(lambda v: 150)), tint, 0.35)
    d = ImageDraw.Draw(img)
    for name in ("left", "right"):
        x0, y0, x1, y1 = panel("feet", name)
        w, h = x1 - x0, y1 - y0
        toe = (x0, x0 + int(w * 0.4)) if name == "left" else (x0 + int(w * 0.6), x1)      # (his toes are to the left in his left side's panel)
        d.rectangle((toe[0], y0 + int(h * 0.5), toe[1], y1), fill="#c9a227")
        d.rectangle((x0, y0 + int(h * 0.415), x1, y0 + int(h * 0.445)), fill="#c9a227")
    clip("feet", img).save(os.path.join(KIT, "skins", "harlequin_boots.png"))


if __name__ == "__main__":
    os.makedirs(os.path.join(KIT, "skins"), exist_ok=True)
    hat()
    boots()
    print("skins/harlequin_hat.png, skins/harlequin_boots.png")
