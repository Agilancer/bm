"""Phobos's shop signs: twenty boards painted with their names and a picture of the trade, in one square of four by five,
laid into the PH2 pack as p2_signs (the owner, 2026-11-19: "put words on the signs outside the houses").

    python tools/phobos/textures/signs.py

Writes assets/game/tex/p2/p2_signs_c.webp and _d.webp and puts p2_signs at the end of the manifest's "ph2" layers and of
src/core/phobos-p2.js (if it's not there already); wire_ph2.py calls this again after a rebuild of the pack. The board
src/core/phobos-build.js hangs (shopSign) takes one cell of it by its number, SIGNS below.

The V/T rule: no crosses in any picture (no crossed tools, no scissors, no sword and hilt), no bells, no gold: the paint is
bone-cream and faded ox-blood on dark timber. Words are the shops' names, never a mark. The face: IM Fell English (SIL
Open Font License, tools/phobos/textures/fonts/IM_FELL_LICENSE.txt).
"""
import json, math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
from build_sets import detail   # noqa: E402

SIZE, DET, COLS, ROWS = 768, 384, 4, 5
FONT = os.path.join(HERE, "fonts", "im-fell-english-latin-400-normal.woff")
# [name over two lines, the trade's picture]. The order is the cells' order: src/core/phobos-build.js SIGNS.
SIGNS = [
    ("The Drowned|Rat", "rat"), ("Tallow &|Wick", "candle"), ("Black Salt|Fish", "fish"), ("Old Mag's|Pies", "pie"),
    ("Gutter|Ales", "tankard"), ("Coffin|Nails", "coffin"), ("Bone &|Button", "bone"), ("The Rusty|Hook", "hook"),
    ("Pawn &|Pledge", "key"), ("Cobbler", "boot"), ("Mother Gall's|Remedies", "bottle"), ("The Hanged|Man", "noose"),
    ("Ash & Ember|Forge", "anvil"), ("Rag &|Bone", "sack"), ("Charnel|Candles", "skullcandle"), ("Cooper", "barrel"),
    ("The Bitter|End", "tankard"), ("Fat Hen|Poultry", "hen"), ("Loaves", "loaf"), ("The Slough|Ferry", "boat"),
]
CREAM, BLOOD, DARK = (226, 210, 178), (168, 38, 30), (20, 14, 11)


def board(rng, w, h):
    """Dark weathered planks running across, a bevelled frame, nail heads."""
    a = np.zeros((h, w, 3), np.float32)
    base = np.array([58, 42, 30], np.float32) * (0.8 + 0.3 * rng.random())
    y = 0
    while y < h:
        ph = int(h / 3 + rng.integers(-6, 7))
        tone = base * (0.85 + 0.3 * rng.random())
        xs = np.arange(w)[None, :]
        ys = np.arange(min(ph, h - y))[:, None]
        grain = np.sin(xs * 0.11 + np.sin(ys * 0.35 + rng.random() * 6) * 2.2 + rng.random() * 9) * 0.5 + 0.5
        streak = rng.random((1, w)) * 0.25
        a[y:y + ph] = tone[None, None, :] * (0.78 + 0.28 * grain[..., None] + streak[..., None] - 0.12)
        a[min(y + ph, h) - 2:min(y + ph, h)] *= 0.35   # the joint
        y += ph
    a += rng.normal(0, 5, a.shape)
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    d.rectangle([1, 1, w - 2, h - 2], outline=(18, 12, 9), width=5)
    d.rectangle([6, 6, w - 7, h - 7], outline=(92, 70, 50), width=1)
    for (x, yy) in [(10, 10), (w - 11, 10), (10, h - 11), (w - 11, h - 11)]:
        d.ellipse([x - 3, yy - 3, x + 3, yy + 3], fill=(40, 36, 34), outline=(90, 84, 78))
    return im


def picture(d, kind, cx, cy, s, ink):
    """The trade, drawn plain, as a sign-painter would: one colour, a dark edge."""
    L = lambda pts, wd=3: d.line(pts, fill=ink, width=wd, joint="curve")
    E = lambda box, **k: d.ellipse(box, **k)
    if kind == "rat":
        E([cx - s, cy - s * 0.45, cx + s * 0.5, cy + s * 0.35], fill=ink); E([cx + s * 0.3, cy - s * 0.35, cx + s * 0.9, cy + s * 0.15], fill=ink)
        E([cx + s * 0.35, cy - s * 0.55, cx + s * 0.6, cy - s * 0.25], fill=ink); L([(cx - s, cy), (cx - s * 1.5, cy - s * 0.3), (cx - s * 1.8, cy + s * 0.1)], 2)
    elif kind == "candle" or kind == "skullcandle":
        d.rectangle([cx - s * 0.25, cy - s * 0.4, cx + s * 0.25, cy + s * 0.9], fill=ink); L([(cx, cy - s * 0.4), (cx, cy - s * 0.6)], 2)
        d.polygon([(cx, cy - s * 1.2), (cx - s * 0.18, cy - s * 0.75), (cx + s * 0.18, cy - s * 0.75)], fill=(196, 120, 50))
        if kind == "skullcandle":
            E([cx - s * 0.9, cy + s * 0.2, cx - s * 0.35, cy + s * 0.75], fill=ink); E([cx - s * 0.78, cy + s * 0.38, cx - s * 0.66, cy + s * 0.5], fill=DARK); E([cx - s * 0.6, cy + s * 0.38, cx - s * 0.48, cy + s * 0.5], fill=DARK)
    elif kind == "fish":
        E([cx - s, cy - s * 0.4, cx + s * 0.6, cy + s * 0.4], fill=ink); d.polygon([(cx + s * 0.5, cy), (cx + s * 1.1, cy - s * 0.45), (cx + s * 1.1, cy + s * 0.45)], fill=ink)
        E([cx - s * 0.75, cy - s * 0.12, cx - s * 0.6, cy + s * 0.03], fill=DARK)
    elif kind == "pie":
        d.chord([cx - s, cy - s * 0.5, cx + s, cy + s * 0.9], 180, 360, fill=ink); d.rectangle([cx - s, cy + s * 0.2, cx + s, cy + s * 0.45], fill=ink)
        # (Its crust's vents cut dark, and a crimped rim: a pie, not the loaf's dome.)
        for k in (-0.4, 0, 0.4): d.line([(cx + s * k - 0.1 * s, cy - s * 0.32), (cx + s * k + 0.1 * s, cy - s * 0.12)], fill=DARK, width=3)
        for k in range(9): E([cx - s + k * s * 0.25 - s * 0.08, cy + s * 0.12, cx - s + k * s * 0.25 + s * 0.08, cy + s * 0.3], fill=DARK)
    elif kind == "tankard":
        d.rectangle([cx - s * 0.5, cy - s * 0.6, cx + s * 0.4, cy + s * 0.8], fill=ink); d.arc([cx + s * 0.2, cy - s * 0.35, cx + s * 0.9, cy + s * 0.45], 270, 90, fill=ink, width=5)
        E([cx - s * 0.65, cy - s * 0.9, cx + s * 0.55, cy - s * 0.45], fill=(200, 190, 170))
    elif kind == "coffin":
        d.polygon([(cx - s * 0.35, cy - s), (cx + s * 0.35, cy - s), (cx + s * 0.55, cy - s * 0.4), (cx + s * 0.3, cy + s), (cx - s * 0.3, cy + s), (cx - s * 0.55, cy - s * 0.4)], fill=ink)
    elif kind == "bone":
        L([(cx - s * 0.8, cy + s * 0.3), (cx + s * 0.8, cy - s * 0.3)], 6)
        for (x, yy) in [(cx - s * 0.85, cy + s * 0.2), (cx - s * 0.75, cy + s * 0.45), (cx + s * 0.85, cy - s * 0.2), (cx + s * 0.75, cy - s * 0.45)]: E([x - s * 0.17, yy - s * 0.17, x + s * 0.17, yy + s * 0.17], fill=ink)
    elif kind == "hook":
        L([(cx, cy - s), (cx, cy + s * 0.4)], 5); d.arc([cx - s * 0.6, cy - s * 0.1, cx + s * 0.05, cy + s * 0.75], 0, 200, fill=ink, width=5)
        E([cx - s * 0.12, cy - s * 1.15, cx + s * 0.12, cy - s * 0.9], outline=ink, width=3)
    elif kind == "key":
        E([cx - s * 0.95, cy - s * 0.35, cx - s * 0.3, cy + s * 0.35], outline=ink, width=5); L([(cx - s * 0.3, cy), (cx + s, cy)], 5)
        L([(cx + s * 0.75, cy), (cx + s * 0.75, cy + s * 0.35)], 4); L([(cx + s * 0.95, cy), (cx + s * 0.95, cy + s * 0.3)], 4)
    elif kind == "boot":
        d.polygon([(cx - s * 0.4, cy - s), (cx + s * 0.2, cy - s), (cx + s * 0.2, cy + s * 0.3), (cx + s, cy + s * 0.5), (cx + s, cy + s * 0.9), (cx - s * 0.4, cy + s * 0.9)], fill=ink)
    elif kind == "bottle":
        d.rectangle([cx - s * 0.12, cy - s, cx + s * 0.12, cy - s * 0.45], fill=ink); E([cx - s * 0.6, cy - s * 0.5, cx + s * 0.6, cy + s * 0.9], fill=ink)
        E([cx - s * 0.3, cy + s * 0.05, cx + s * 0.1, cy + s * 0.45], fill=(60, 110, 70))
    elif kind == "noose":
        L([(cx, cy - s * 1.1), (cx, cy - s * 0.2)], 3); E([cx - s * 0.35, cy - s * 0.25, cx + s * 0.35, cy + s * 0.55], outline=ink, width=4)
        # (Its coils a thicker band of the rope, not strokes across it: a bar across a cord is a cross. The V/T rule.)
        E([cx - s * 0.13, cy - s * 0.75, cx + s * 0.13, cy - s * 0.2], fill=ink)
    elif kind == "anvil":
        d.polygon([(cx - s, cy - s * 0.4), (cx + s * 0.6, cy - s * 0.4), (cx + s * 0.6, cy - s * 0.1), (cx + s * 0.2, cy + s * 0.15), (cx + s * 0.35, cy + s * 0.7), (cx - s * 0.55, cy + s * 0.7), (cx - s * 0.4, cy + s * 0.15), (cx - s * 0.7, cy - s * 0.15)], fill=ink)
        for k in range(4): d.polygon([(cx - s * 0.2 + k * s * 0.25, cy - s * 0.95), (cx - s * 0.08 + k * s * 0.25, cy - s * 0.55), (cx - s * 0.32 + k * s * 0.25, cy - s * 0.55)], fill=(196, 110, 40))
    elif kind == "sack":
        E([cx - s * 0.7, cy - s * 0.4, cx + s * 0.7, cy + s * 0.95], fill=ink); d.polygon([(cx - s * 0.3, cy - s * 0.45), (cx + s * 0.3, cy - s * 0.45), (cx + s * 0.15, cy - s * 0.85), (cx - s * 0.15, cy - s * 0.85)], fill=ink)
    elif kind == "barrel":
        E([cx - s * 0.65, cy - s * 0.95, cx + s * 0.65, cy + s * 0.95], fill=ink)
        # (Its hoops cut dark, so it reads as a cask and not a red egg. Hoops only: staves across them were a grid of crosses.)
        for k in (-0.6, -0.2, 0.2, 0.6): d.line([(cx - s * 0.6, cy + s * k), (cx + s * 0.6, cy + s * k)], fill=DARK, width=3 if abs(k) > 0.5 else 2)
    elif kind == "hen":
        E([cx - s * 0.8, cy - s * 0.3, cx + s * 0.5, cy + s * 0.7], fill=ink); E([cx + s * 0.2, cy - s * 0.85, cx + s * 0.75, cy - s * 0.2], fill=ink)
        d.polygon([(cx + s * 0.72, cy - s * 0.6), (cx + s * 1.0, cy - s * 0.5), (cx + s * 0.72, cy - s * 0.42)], fill=(190, 120, 40)); L([(cx - s * 0.2, cy + s * 0.65), (cx - s * 0.2, cy + s)], 3)
    elif kind == "loaf":
        # (A long loaf lying, scored three times dark: not the pie's round.)
        E([cx - s * 1.2, cy - s * 0.45, cx + s * 1.2, cy + s * 0.45], fill=ink)
        for k in (-0.55, 0, 0.55): d.line([(cx + s * k - 0.18 * s, cy + s * 0.25), (cx + s * k + 0.18 * s, cy - s * 0.25)], fill=DARK, width=3)
    elif kind == "boat":
        d.polygon([(cx - s, cy), (cx + s, cy), (cx + s * 0.7, cy + s * 0.5), (cx - s * 0.7, cy + s * 0.5)], fill=ink); L([(cx + s * 0.6, cy - s * 1.0), (cx + s * 0.3, cy + s * 0.1)], 3)


def cell(i, name, kind, w, h):
    rng = np.random.default_rng(1000 + i)
    im = board(rng, w, h)
    d = ImageDraw.Draw(im)
    ink = CREAM if i % 3 else BLOOD
    edge = DARK if ink == CREAM else (210, 190, 160)
    lines = name.split("|")
    fs = 33 if max(len(t) for t in lines) < 11 else 27
    f = ImageFont.truetype(FONT, fs)
    pic_h = h * 0.42
    picture(d, kind, w / 2, 14 + pic_h / 2, pic_h * 0.42, ink)
    ty = 14 + pic_h + 2
    for t in lines:
        bb = d.textbbox((0, 0), t, font=f)
        x = (w - (bb[2] - bb[0])) / 2 - bb[0]
        # (Bold: the letters stroked with their own paint, and a dark shadow under, to read from across the street.)
        d.text((x + 2, ty + 2), t, font=f, fill=edge, stroke_width=1, stroke_fill=edge)
        d.text((x, ty), t, font=f, fill=ink, stroke_width=1, stroke_fill=ink)
        ty += fs * 1.02
    # (Weather: the paint flaked here and there, the whole a little dulled.)
    a = np.asarray(im, np.float32)
    flake = (rng.random(a.shape[:2]) > 0.985)
    flake = np.asarray(Image.fromarray((flake * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), np.float32) / 255
    a = a * (1 - 0.35 * flake[..., None]) * 0.92
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def main():
    out = os.path.join(ROOT, "assets", "game", "tex", "p2")
    cw, ch = SIZE // COLS, SIZE // ROWS
    sheet = Image.new("RGB", (SIZE, SIZE), DARK)
    for i, (name, kind) in enumerate(SIGNS):
        sheet.paste(cell(i, name, kind, cw, ch), ((i % COLS) * cw, (i // COLS) * ch))
    sheet.save(os.path.join(out, "p2_signs_c.webp"), quality=90, method=5)
    detail(sheet, "wood", "dark").resize((DET, DET), Image.LANCZOS).save(os.path.join(out, "p2_signs_d.webp"), quality=70, method=5, alpha_quality=80, exact=True)
    sheet.save(os.path.join(ROOT, "tools", "build", "signs_sheet.png")) if os.path.isdir(os.path.join(ROOT, "tools", "build")) else None
    path = os.path.join(ROOT, "assets", "game", "tex", "manifest.json")
    man = json.load(open(path))
    if not any(l["name"] == "p2_signs" for l in man["ph2"]["layers"]):
        man["ph2"]["layers"].append({"name": "p2_signs", "kind": "single", "cutout": False})
        json.dump(man, open(path, "w"), indent=1)
    js = os.path.join(ROOT, "src", "core", "phobos-p2.js")
    s = open(js, encoding="utf-8").read()
    if '"p2_signs"' not in s:
        s = s.replace("\n};\n", ',\n "p2_signs": [1.0, 1.0, 1.0]\n};\n')
        open(js, "w", encoding="utf-8", newline="\n").write(s)
    print(len(SIGNS), "signs")


if __name__ == "__main__":
    main()
