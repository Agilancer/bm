"""Makes the sheet of the two finest cuts of gem (fine_gems: Brilliant and Perfect) out of the painted Flawless stones.

    python tools/ui/fine_gems.py            writes art/ui/sheets/fine_gems.png
    python tools/ui/import_kit.py art/ui/sheets     then cuts it into assets/ui/kit/goods/gem_<kind>_3 and _4

Nobody painted these two: they're only ever made in the game, three of a cut into one of the next (Pack.combine), and each
is its kind's own Flawless stone from art/ui/sheets/gems.png made grander. Brilliant: brighter, a light at its heart, a close
halo of its own colour and a second glint. Perfect: brighter again, a little bigger, rays of its own colour behind it, a wide
halo, a white four-pointed star on its upper edge and small sparks about it. No letters, nothing of either side's.
If the owner paints a fine_gems sheet, it's brought in like any other and replaces this one.
Needs numpy and Pillow."""
import math
import os

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "art", "ui", "sheets", "gems.png")
OUT = os.path.join(ROOT, "art", "ui", "sheets", "fine_gems.png")
KINDS = ["ruby", "topaz", "emerald", "sapphire", "amethyst", "diamond"]
TINT = {"ruby": (255, 70, 50), "topaz": (255, 190, 70), "emerald": (80, 255, 120), "sapphire": (90, 160, 255), "amethyst": (200, 110, 255), "diamond": (225, 245, 255)}
W, H, COLS = 1536, 1024, 6
CW, CH = W // COLS, H // 2          # a cell of the new sheet
SW, SH = 1536 // 6, 1024 // 3       # a cell of the painted one


def stone(k):
    """The Flawless stone of the k-th kind, cut from its glow: its own picture, tight."""
    cell = Image.open(SRC).convert("RGBA").crop((k * SW, 2 * SH, (k + 1) * SW, 3 * SH))
    a = np.asarray(cell)[..., 3]
    # (The painted glow round it is faint: the stone is what's nearly solid.)
    solid = Image.fromarray(((a > 170) * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = cell.copy()
    out.putalpha(ImageChops.darker(cell.split()[3], solid.point(lambda v: min(255, v * 2))))
    return out.crop(out.getbbox())


def star(size, arms=4, thin=0.11, colour=(255, 255, 255)):
    """A star of light with long thin points, soft at the edges."""
    im = Image.new("RGBA", (size * 4, size * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = size * 2
    pts = []
    for i in range(arms * 2):
        r = size * 1.9 if i % 2 == 0 else size * 1.9 * thin
        ang = math.pi * i / arms - math.pi / 2
        pts.append((c + r * math.cos(ang), c + r * math.sin(ang)))
    d.polygon(pts, fill=colour + (255,))
    d.ellipse([c - size * 0.42, c - size * 0.42, c + size * 0.42, c + size * 0.42], fill=colour + (255,))
    im = im.resize((size, size), Image.LANCZOS)
    glow = im.filter(ImageFilter.GaussianBlur(size * 0.07))
    return Image.alpha_composite(glow, im)


def tinted(mask, colour, strength):
    im = Image.new("RGBA", mask.size, colour + (0,))
    im.putalpha(mask.point(lambda v: int(min(255, v * strength))))
    return im


def lit(st, bright, sat, heart, colour):
    """The stone brighter and richer, with a light at its heart."""
    rgb = ImageEnhance.Color(st.convert("RGB")).enhance(sat)
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    w, h = st.size
    g = Image.new("L", (w, h), 0)
    ImageDraw.Draw(g).ellipse([w * 0.26, h * 0.2, w * 0.74, h * 0.74], fill=255)
    g = g.filter(ImageFilter.GaussianBlur(w * 0.13)).point(lambda v: int(v * heart))
    white = Image.new("RGB", (w, h), tuple(int(c * 0.35 + 255 * 0.65) for c in colour))
    rgb = ImageChops.screen(rgb, Image.composite(white, Image.new("RGB", (w, h), (0, 0, 0)), g))
    out = rgb.convert("RGBA")
    out.putalpha(st.split()[3])
    return out


def cell(k, perfect):
    kind = KINDS[k]
    colour = TINT[kind]
    st = stone(k)
    scale = (1.0 if perfect else 0.9) * 150 / st.width
    st = st.resize((round(st.width * scale), round(st.height * scale)), Image.LANCZOS)
    st = lit(st, 1.3 if perfect else 1.16, 1.3 if perfect else 1.18, 0.75 if perfect else 0.42, colour)
    c = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ox, oy = (CW - st.width) // 2, (CH - st.height) // 2 + 6
    shape = Image.new("L", (CW, CH), 0)
    shape.paste(st.split()[3], (ox, oy))
    cx, cy = CW // 2, oy + st.height * 0.42
    if perfect:
        # Rays of its own colour behind it, long and short by turns.
        rays = Image.new("L", (CW * 2, CH * 2), 0)
        d = ImageDraw.Draw(rays)
        for i in range(16):
            ang = math.tau * i / 16 + math.pi / 16
            r = (94 if i % 2 == 0 else 78) * 2
            wd = 0.085 if i % 2 == 0 else 0.06
            d.polygon([(cx * 2 + 30 * math.cos(ang - wd * 4), cy * 2 + 30 * math.sin(ang - wd * 4)), (cx * 2 + r * math.cos(ang), cy * 2 + r * math.sin(ang)),
                       (cx * 2 + 30 * math.cos(ang + wd * 4), cy * 2 + 30 * math.sin(ang + wd * 4))], fill=255)
        rays = rays.resize((CW, CH), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6))
        c.alpha_composite(tinted(rays, tuple(int(v * 0.5 + 255 * 0.5) for v in colour), 0.62))
    # The halo: the stone's own shape, spread and softened, in its colour; wide and bright on a Perfect one.
    for spread, blur, strength in ([(15, 9, 0.95), (7, 4, 0.8)] if perfect else [(11, 7, 0.75), (5, 3, 0.55)]):
        halo = shape.filter(ImageFilter.MaxFilter(spread)).filter(ImageFilter.GaussianBlur(blur))
        under = tinted(halo, colour, strength)
        under.alpha_composite(c)
        c = under
    # A bright line round its edge.
    rim = ImageChops.subtract(shape.filter(ImageFilter.MaxFilter(5 if perfect else 3)), shape).filter(ImageFilter.GaussianBlur(0.8))
    c.alpha_composite(tinted(rim, tuple(int(v * 0.35 + 255 * 0.65) for v in colour), 0.95 if perfect else 0.7))
    c.alpha_composite(st, (ox, oy))
    def glint(size, x, y, arms=4, colour=(255, 255, 255)):
        s = star(size, arms, colour=colour)
        c.alpha_composite(s, (int(x - size / 2), int(y - size / 2)))
    pale = tuple(int(v * 0.25 + 255 * 0.75) for v in colour)
    if perfect:
        glint(84, ox + st.width * 0.74, oy + st.height * 0.13)          # the great star, on its upper edge
        glint(40, ox + st.width * 0.16, oy + st.height * 0.3, colour=pale)
        glint(30, ox + st.width * 0.5, oy + st.height * 0.9, colour=pale)
        glint(20, ox + 4, oy - 8, colour=pale)
        glint(20, ox + st.width - 2, oy + st.height * 0.66, colour=pale)
    else:
        glint(46, ox + st.width * 0.74, oy + st.height * 0.14)
        glint(26, ox + st.width * 0.2, oy + st.height * 0.34, colour=pale)
    return c


def main():
    sheet = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for row, perfect in enumerate((False, True)):
        for k in range(COLS):
            sheet.alpha_composite(cell(k, perfect), (k * CW, row * CH))
    sheet.save(OUT)
    print(f"{os.path.relpath(OUT, ROOT)}: {COLS * 2} stones")


if __name__ == "__main__":
    main()
