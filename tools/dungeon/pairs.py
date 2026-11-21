# Before and after, side by side, per delve, for the dungeon critics: every room shot in both sets (tools/dungeon/survey.mjs
# OUT=<before> and OUT=<after>) on one row, the before on the left.
#   python tools/dungeon/pairs.py b0 r2            -> tools/build/shots/pair_r2_<delve>.jpg
#   python tools/dungeon/pairs.py r2 r2 only       -> just the after set, two shots a row (sheet_r2_<delve>.jpg)
import glob, os, sys
from PIL import Image, ImageDraw

SHOTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'build', 'shots')
A, B = sys.argv[1], sys.argv[2]
ONLY = len(sys.argv) > 3 and sys.argv[3] == 'only'
W, H = 640, 360


def rooms(prefix):
    out = {}
    for f in glob.glob(os.path.join(SHOTS, prefix + '_*.png')):
        rest = os.path.basename(f)[len(prefix) + 1:-4]
        delve, room = rest.split('_', 1)
        out.setdefault(delve, {})[room] = f
    return out


ra, rb = rooms(A), rooms(B)
for delve, shots in sorted(rb.items()):
    names = sorted(shots)
    if ONLY:
        rows = [(names[i:i + 2]) for i in range(0, len(names), 2)]
        S = Image.new('RGB', (W * 2, H * len(rows)), (20, 20, 20))
        for y, row in enumerate(rows):
            for x, n in enumerate(row):
                S.paste(Image.open(shots[n]).convert('RGB').resize((W, H)), (x * W, y * H))
                ImageDraw.Draw(S).text((x * W + 8, y * H + 6), n, fill=(255, 255, 0))
        out = os.path.join(SHOTS, 'sheet_%s_%s.jpg' % (B, delve))
    else:
        S = Image.new('RGB', (W * 2, H * len(names)), (20, 20, 20))
        for y, n in enumerate(names):
            if n in ra.get(delve, {}):
                S.paste(Image.open(ra[delve][n]).convert('RGB').resize((W, H)), (0, y * H))
            S.paste(Image.open(shots[n]).convert('RGB').resize((W, H)), (W, y * H))
            d = ImageDraw.Draw(S)
            d.text((8, y * H + 6), 'BEFORE ' + n, fill=(255, 255, 0)); d.text((W + 8, y * H + 6), 'AFTER ' + n, fill=(255, 255, 0))
        out = os.path.join(SHOTS, 'pair_%s_%s.jpg' % (B, delve))
    S.save(out, quality=82)
    print(out)
