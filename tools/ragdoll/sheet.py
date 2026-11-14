# The pictures tools/ragdoll/shots.mjs took, one row a body: python tools/ragdoll/sheet.py [names...] -> tools/build/shots/ragdoll_sheet.png
import sys, glob, os
from PIL import Image
d = os.path.join(os.path.dirname(__file__), '..', 'build', 'shots')
names = sys.argv[1:] or sorted({os.path.basename(f)[8:-6] for f in glob.glob(os.path.join(d, 'ragdoll_*_0.png'))})
rows = [[Image.open(os.path.join(d, f'ragdoll_{n}_{i}.png')).convert('RGB') for i in range(5)] for n in names]
w, h = 440, 280
sheet = Image.new('RGB', (w * 5, h * len(rows)))
for r, row in enumerate(rows):
    for c, im in enumerate(row):
        sheet.paste(im.resize((w, h)), (c * w, r * h))
out = os.path.join(d, 'ragdoll_sheet.png')
sheet.save(out)
print(out)
