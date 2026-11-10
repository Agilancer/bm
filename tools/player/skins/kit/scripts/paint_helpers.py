"""Helpers for painting a skin file: one picture for one part of his gear, drawn over that part's template.

A template (templates/<part>_lines.png) is a sheet of six panels, three across and two down: the part seen from the
front, the back, his left, his right, above and below, with his outline in black. A skin file is the same sheet painted.
It can be any size, as long as it's the template's shape (3 wide to 2 high): 1536 x 1024 from an image model is fine.
Paint that falls outside the outlines is thrown away, so you needn't be neat at the edges. Where a skin file is
transparent, nothing is painted (the recipe's materials, or the original, show there).

    from paint_helpers import *
    img = start("head")                       # the lines template, to draw on
    img = start("head", "original")           # or the part as it came, to paint over or recolour
    img = tiled("chest", "swatches/x.png", 6) # a tiling picture across the whole sheet, 6 tiles across each panel
    box = panel("chest", "back")              # (left, top, right, bottom) of one panel on the sheet, in pixels
    img = clip("head", img)                   # transparent outside his outlines (optional: the bake does it anyway)
    img.save("skins/my_hat.png")

Then in the recipe:  "head": { "skin": "skins/my_hat.png" }"""
import os

from PIL import Image

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES = os.path.join(KIT, "templates")
PANEL_NAMES = ["front", "back", "left", "right", "top", "under"]


def start(part, what="lines"):
    """The part's template as a picture to draw on: "lines" (outlines on white) or "original" (the paint it came in)."""
    name = f"{part}_lines.png" if what == "lines" else f"{part}_original.jpg"
    return Image.open(os.path.join(TEMPLATES, name)).convert("RGBA")


def mask(part, size=None):
    """White where the sheet is him, black where it isn't."""
    m = Image.open(os.path.join(TEMPLATES, f"{part}_mask.png")).convert("L")
    return m.resize(size, Image.BILINEAR) if size else m


def panel(part, name, size=None):
    """One panel's rectangle on the sheet (left, top, right, bottom), for a sheet of this size (the template's own if none)."""
    w, h = size or mask(part).size
    i = PANEL_NAMES.index(name)
    pw, ph = w // 3, h // 2
    return ((i % 3) * pw, (i // 3) * ph, (i % 3 + 1) * pw, (i // 3 + 1) * ph)


def clip(part, img):
    """The picture with everything outside his outlines made transparent."""
    out = img.convert("RGBA")
    out.putalpha(Image.composite(out.getchannel("A"), Image.new("L", out.size, 0), mask(part, out.size)))
    return out


def tiled(part, picture, across=6, size=None):
    """A tiling picture laid over the whole sheet, `across` tiles to a panel's width, clipped to his outlines."""
    w, h = size or mask(part).size
    tile = Image.open(picture if os.path.isabs(picture) else os.path.join(KIT, picture)).convert("RGB")
    side = max(8, w // 3 // across)
    tile = tile.resize((side, side), Image.LANCZOS)
    out = Image.new("RGB", (w, h))
    for y in range(0, h, side):
        for x in range(0, w, side):
            out.paste(tile, (x, y))
    return clip(part, out)
