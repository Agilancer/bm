"""Tries staffs.py's DANGLES on the cut files as they are, and draws what would swing. python dcheck.py out.png id..."""
import sys
from PIL import Image, ImageDraw
import cut, preview, zoom
from staffs import DANGLES

tiles = []
for n in sys.argv[2:]:
    g = preview.load(n)
    print(n)
    try:
        g["D"], _ = cut.mark_dangles(g["P"], g["F"], DANGLES[n])
    except AssertionError as e:
        print("   ", e); g["D"] = None
    a = zoom.view(g, -0.45, 0.72); b = zoom.view(g, -0.45, 0.72, "side")
    t = Image.new("RGB", (a.width * 2 + 4, a.height + 14)); t.paste(a, (0, 14)); t.paste(b, (a.width + 4, 14))
    ImageDraw.Draw(t).text((4, 1), n, fill=(255, 255, 255)); tiles.append(t)
S = Image.new("RGB", (sum(t.width + 6 for t in tiles), tiles[0].height)); x = 0
for t in tiles: S.paste(t, (x, 0)); x += t.width + 6
S.save(sys.argv[1])
