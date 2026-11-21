# A contact sheet of pictures from tools/build/shots, each with its name on it, for the critics and the owner.
#   python tools/phobos/sheet.py <out.jpg> <cols> <name> [name ...]     (names without .png; WIDTH=<each picture's width, 640>)
import os, sys
from PIL import Image, ImageDraw
out, cols, names = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W = int(os.environ.get('WIDTH', 640)); H = W * 9 // 16
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * H), (12, 12, 12))
for i, n in enumerate(names):
    p = os.path.join('tools/build/shots', n + '.png')
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS)
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 + 7 * len(n), 16], fill=(0, 0, 0)); d.text((4, 2), n, fill=(255, 230, 160))
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
sheet.save(out, quality=88)
print(out, sheet.size)
