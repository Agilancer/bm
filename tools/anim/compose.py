# Lays the stills tools/anim/sheet.py rendered out as one labelled sheet: a row a view, a column a frame.
#   python tools/anim/compose.py <tiles folder> <out.jpg> ["title"] [scale] [view] [wrap]
# With a view named, only that view's stills, wrapped into rows of `wrap`: bigger pictures of one side of him.
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
title = sys.argv[3] if len(sys.argv) > 3 else ''
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
meta = json.load(open(os.path.join(src, 'tiles.json')))
views, frames = meta['views'], meta['frames']
only = sys.argv[5] if len(sys.argv) > 5 else None
wrap = int(sys.argv[6]) if len(sys.argv) > 6 else len(frames)
if only: views = [only]
cols = min(wrap, len(frames)); rows_per = -(-len(frames) // cols)
first = Image.open(os.path.join(src, meta['tiles'][0]['file']))
w, h = int(first.width * scale), int(first.height * scale)
pad, top = 2, 26 if title else 0
sheet = Image.new('RGB', (cols * (w + pad) + pad, top + len(views) * rows_per * (h + pad) + pad), (20, 20, 22))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype('arial.ttf', 13)
except Exception: font = ImageFont.load_default()
if title: d.text((6, 5), title, fill=(240, 230, 200), font=font)
fps = meta.get('fps', 30)
for t in meta['tiles']:
    if t['view'] not in views: continue
    i = frames.index(t['frame'])
    r, c = views.index(t['view']) * rows_per + i // cols, i % cols
    im = Image.open(os.path.join(src, t['file'])).convert('RGB')
    if scale != 1.0: im = im.resize((w, h), Image.LANCZOS)
    x, y = pad + c * (w + pad), top + pad + r * (h + pad)
    sheet.paste(im, (x, y))
    d.text((x + 4, y + 3), f"{t['view']}  f{t['frame']:g}  {t['frame'] / fps:.2f}s", fill=(255, 255, 255), font=font)
sheet.save(out, quality=88)
print(out, sheet.size)
