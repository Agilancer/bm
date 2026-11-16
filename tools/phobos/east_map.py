"""Draw the east's ground from the grid tools/phobos/east_profile.mjs writes:
    node tools/phobos/east_profile.mjs art/phobos/east/grid.bin && python tools/phobos/east_map.py
-> art/phobos/east/relief.jpg (hill-shaded, heights tinted, the layout's places marked)."""
import json, os
import numpy as np
from PIL import Image, ImageDraw
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
D = os.path.join(ROOT, "art", "phobos", "east")
X0, X1, Z0, Z1, C = 5000, 11800, -5696, 5696, 16
W, H = (X1 - X0) // C, (Z1 - Z0) // C
g = np.fromfile(os.path.join(D, "grid.bin"), np.float32).reshape(H, W)
dx = np.gradient(g, C, axis=1); dz = np.gradient(g, C, axis=0)
n = np.stack([-dx, np.ones_like(g), -dz], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
sun = np.array([-0.5, 0.7, -0.5]); sun /= np.linalg.norm(sun)
sh = np.clip(n @ sun, 0, 1) * 0.85 + 0.15
t = np.clip(g / 330, 0, 1)[..., None]
col = np.array([0.42, 0.47, 0.36]) * (1 - t) + np.array([0.82, 0.78, 0.72]) * t
steep = np.clip((np.hypot(dx, dz) - 0.7) / 0.6, 0, 1)[..., None]
col = col * (1 - steep) + np.array([0.35, 0.33, 0.33]) * steep
im = Image.fromarray((np.clip(col * sh[..., None] * 1.25, 0, 1) * 255).astype(np.uint8)).resize((W * 2, H * 2), Image.LANCZOS)
d = ImageDraw.Draw(im)
P = lambda x, z: ((x - X0) / C * 2, (z - Z0) / C * 2)
L = json.load(open(os.path.join(ROOT, "tools", "phobos", "layout.json"), encoding="utf-8"))
d.line([P(5600, Z0), P(5600, Z1)], fill=(255, 220, 0), width=1)
d.rectangle([P(5000, -5600), P(11700, 5600)], outline=(255, 60, 60))
for k in L["marches"]["keeps"]:
    x, y = P(k["x"], k["z"]); d.ellipse([x - 5, y - 5, x + 5, y + 5], outline=(255, 80, 80), width=2); d.text((x + 8, y - 6), k["name"], fill=(255, 255, 255))
for name, x, z in [("Widow's Notch", 7500, 0), ("Broken Span", 8400, 120), ("The Sill", 8950, 0), ("Drawbridge Gate", 9350, 0), ("Castle", 11050, 0), ("Charnel Gate", 9900, -782), ("Water Gate", 9950, 794)]:
    x, y = P(x, z); d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 255, 120)); d.text((x + 6, y + 4), name, fill=(255, 255, 160))
c = L["city"]; cx, cz = c["centre"]
d.polygon([P(x, z) for x, z in c["wall"]["pts"]], outline=(120, 200, 255))
im.save(os.path.join(D, "relief.jpg"), quality=88)
im.crop((int(P(7000, 0)[0]), int(P(0, -1700)[1]), int(P(11800, 0)[0]), int(P(0, 1700)[1]))).resize((1200, 850), Image.LANCZOS).save(os.path.join(D, "relief_way.jpg"), quality=90)
print("drawn", im.size)
