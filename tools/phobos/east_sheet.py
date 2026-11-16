"""Contact sheets of the east's in-game pictures (tools/build/shots/e*.png, taken with bm.shot: tools/phobos/README.md,
"The east"): python tools/phobos/east_sheet.py [round] -> art/phobos/east/shots_<round>_a.jpg, _b.jpg (eight each)."""
import glob, os, re, sys
from PIL import Image, ImageDraw
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
rnd = sys.argv[1] if len(sys.argv) > 1 else "r1"
pre = sys.argv[2] if len(sys.argv) > 2 else "e"   # the pictures' first letter: e the east, p Phobos's block-out
fs = sorted(glob.glob(os.path.join(ROOT, "tools", "build", "shots", pre + "[0-9]*.png")), key=lambda f: int(re.search(r"(\d+)_", os.path.basename(f)).group(1)))
for part, chunk in (("a", fs[:8]), ("b", fs[8:16]), ("c", fs[16:24])):
    W, H = 760, 428
    sh = Image.new("RGB", (2 * W + 12, 4 * (H + 22) + 6), (20, 20, 20)); d = ImageDraw.Draw(sh)
    for k, f in enumerate(chunk):
        im = Image.open(f).convert("RGB"); im.thumbnail((W, H))
        x, y = (k % 2) * (W + 6) + 3, (k // 2) * (H + 22) + 3
        sh.paste(im, (x, y)); d.text((x + 4, y + H + 4), os.path.basename(f)[:-4], fill=(240, 230, 160))
        im.save(os.path.join(ROOT, "art", "phobos", "east", os.path.basename(f)[:-4] + ".jpg"), quality=86)
    if not chunk: continue
    sh.save(os.path.join(ROOT, "art", "phobos", "east", f"shots_{pre}_{rnd}_{part}.jpg" if pre != "e" else f"shots_{rnd}_{part}.jpg"), quality=84)
print(len(fs), "pictures")
