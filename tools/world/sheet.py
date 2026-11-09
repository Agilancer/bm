"""Contact sheet of a round's shots: python tools/world/sheet.py r1 out.jpg [cols] [width] [skip prefix, e.g. r1_t_]"""
import glob, os, sys
from PIL import Image, ImageDraw
rnd, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
W = int(sys.argv[4]) if len(sys.argv) > 4 else 640
files = sorted(glob.glob(os.path.join(os.path.dirname(__file__), '..', 'build', 'shots', 'lands', f'{rnd}_*.png')), key=os.path.getmtime)
if len(sys.argv) > 5: files = [f for f in files if not os.path.basename(f).startswith(tuple(sys.argv[5].split(",")))]
H = W * 9 // 16
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * W, rows * (H + 18)), (16, 16, 16))
d = ImageDraw.Draw(sheet)
for k, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS)
    x, y = (k % cols) * W, (k // cols) * (H + 18)
    sheet.paste(im, (x, y + 18))
    d.text((x + 4, y + 3), os.path.basename(f)[:-4], fill=(230, 230, 230))
sheet.save(out, quality=85)
