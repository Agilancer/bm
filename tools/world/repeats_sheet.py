"""Lays one round of tools/world/repeats.mjs's pictures beside another's, place by place, for the critics.

    python tools/world/repeats_sheet.py <before round> <after round> [out dir]

Writes <out>/<before>_vs_<after>_<name>.jpg for each place both rounds have (before on the left), and one small overview
sheet of all of them, <out>/<before>_vs_<after>.jpg. Needs Pillow.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "tools", "build", "shots")


def main():
    a, b = sys.argv[1], sys.argv[2]
    out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(SHOTS, "sheets")
    os.makedirs(out, exist_ok=True)
    names = sorted(f[len(a) + 1:-4] for f in os.listdir(SHOTS) if f.startswith(a + "_") and f.endswith(".png"))
    pairs = []
    for n in names:
        pb = os.path.join(SHOTS, f"{b}_{n}.png")
        if not os.path.exists(pb):
            continue
        ia = Image.open(os.path.join(SHOTS, f"{a}_{n}.png")).convert("RGB")
        ib = Image.open(pb).convert("RGB").resize(ia.size)
        w, h = ia.size
        s = Image.new("RGB", (w * 2 + 8, h + 28), (20, 20, 20))
        s.paste(ia, (0, 28))
        s.paste(ib, (w + 8, 28))
        d = ImageDraw.Draw(s)
        d.text((8, 8), f"{n}: before ({a})", fill=(230, 230, 230))
        d.text((w + 16, 8), f"{n}: after ({b})", fill=(230, 230, 230))
        p = os.path.join(out, f"{a}_vs_{b}_{n}.jpg")
        s.save(p, quality=90)
        pairs.append(s)
        print(p)
    if pairs:
        tw = 900
        th = int(pairs[0].height * tw / pairs[0].width)
        o = Image.new("RGB", (tw, th * len(pairs)), (20, 20, 20))
        for i, s in enumerate(pairs):
            o.paste(s.resize((tw, th)), (0, i * th))
        o.save(os.path.join(out, f"{a}_vs_{b}.jpg"), quality=85)


if __name__ == "__main__":
    main()
