"""Marks painted out of a body's colour map that would break the V and T rule (CLAUDE.md): a cross, a sunburst-like star.
Each box (x0, y0, x1, y1 in the colour map's pixels at 1024) has whatever's brighter than the cloth round it filled with
that cloth's own colour. Run after tools/folk/paint.py whenever a body here is built again.

    python tools/phobos/paint_out.py
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = {
    # Brother Abel's cassock: the white cross on his chest (he was defrocked; it's off).
    "abel_b": [(38, 636, 62, 672)],
    # The astrologer's cap: the eight-pointed star on its front (too like the old sunburst). His sleeves' little stars stay.
    "astrologer": [(704, 852, 750, 900)],
}

def fill(im, box):
    x0, y0, x1, y1 = box
    a = im[y0:y1, x0:x1].astype(float)
    L = a.mean(-1)
    dark = a[L < np.percentile(L, 45)]
    cloth = np.median(dark, 0)
    # (Only what's bright and grey or white, as the marks are: never skin or a coloured cloth beside them.)
    sat = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1)
    mark = (L > np.percentile(L, 45) + 18) & (sat < 0.25)
    # (A little of the cloth's own grain kept: its darkest texels' spread, not one flat colour.)
    rng = np.random.default_rng(1)
    a[mark] = cloth + rng.normal(0, dark.std(0) * 0.6, (mark.sum(), 3))
    im[y0:y1, x0:x1] = np.clip(a, 0, 255).astype(np.uint8)
    return int(mark.sum())

for k, boxes in OUT.items():
    p = os.path.join(ROOT, "assets", "game", "folk", f"{k}_c.webp")
    img = Image.open(p).convert("RGB")
    im = np.array(img); sx = img.width / 1024
    n = sum(fill(im, tuple(int(v * sx) for v in b)) for b in boxes)
    Image.fromarray(im).save(p, "WEBP", quality=90, method=6)
    print(k, n, "texels painted out")
