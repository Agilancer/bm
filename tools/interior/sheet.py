"""Tile tour shots into one sheet: python tools/interior/sheet.py out.jpg name name ... (no names: every i_ shot)"""
import glob, os, sys
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2:]
paths = [f'tools/build/shots/i_{n}.png' for n in names] or sorted(glob.glob('tools/build/shots/i_*.png'))
cols, w = 4, 480
ims = [Image.open(p).convert('RGB') for p in paths]
h = int(w * ims[0].height / ims[0].width)
sheet = Image.new('RGB', (cols * w, ((len(ims) + cols - 1) // cols) * h))
for i, (im, p) in enumerate(zip(ims, paths)):
    t = im.resize((w, h), Image.LANCZOS)
    ImageDraw.Draw(t).text((5, 4), os.path.basename(p)[2:-4], fill=(255, 255, 0))
    sheet.paste(t, ((i % cols) * w, (i // cols) * h))
sheet.save(out, quality=82)
