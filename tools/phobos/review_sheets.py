"""Contact sheets for a critic round from tools/folk/viewer.html's shots: python tools/phobos/review_sheets.py <round, e.g. r1>
Reads tools/build/shots/phobos_<round>_*.png, writes art/phobos/review/<round>_{lineup,faces,walk,run,acts}.jpg."""
import glob, os, sys
from PIL import Image, ImageDraw
R = sys.argv[1]
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
src = lambda n: os.path.join(ROOT, "tools", "build", "shots", f"phobos_{R}_{n}.png")
def sheet(name, names, cols, w=750):
    ims = [(n, Image.open(src(n)).convert("RGB")) for n in names if os.path.exists(src(n))]
    if not ims: return
    h = int(w * ims[0][1].size[1] / ims[0][1].size[0]); rows = -(-len(ims) // cols)
    s = Image.new("RGB", (cols * w, rows * h), (40, 40, 40)); d = ImageDraw.Draw(s)
    for k, (n, im) in enumerate(ims):
        x, y = (k % cols) * w, (k // cols) * h
        s.paste(im.resize((w, h), Image.LANCZOS), (x, y)); d.text((x + 8, y + 6), n, fill=(255, 255, 0))
    out = os.path.join(ROOT, "art", "phobos", "review", f"{R}_{name}.jpg"); s.save(out, quality=88); print(out, s.size)
sheet("lineup", ["idle_front", "idle_back", "idle_left", "idle_right"], 2)
ids = ("apricot", "martleboro", "louis_g")
sheet("faces", [f"face_{i}_{v}" for i in ids for v in ("front", "q")] + [f"talkdist_{i}" for i in ids] + ["face_apricot_front", "face_apricot", "face_apricot_side", "face_martleboro", "face_louis"], 3)
sheet("walk", [f"walk_{t}_{v}" for t in ("01", "035", "06", "085") for v in ("a", "side")], 2)
sheet("run", [f"run_{t}_{v}" for t in ("01", "035", "06", "085") for v in ("a", "side")], 2)
sheet("acts", ["talk_02_a", "talk_06_a", "sit_idle_03_a", "greet_05_a", "wave_05_a"], 2)
sheet("hands", [f"hand_{i}_{k}" for i in ids for k in (0, 1)], 3, 600)
