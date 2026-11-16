"""Warm a texture's skin a little: python tools/phobos/grade_skin.py <in.png> <out.png> [r g b multipliers]

Apricot is the redhead townswoman's body, but Meshy painted her skin paler and cooler than Tamsin's (forearm
190,157,138 against Tamsin's face 176,141,120), and under the game's cool sky light it read as ash. Skin-coloured
texels (red over green over blue, not hair-red, not cloth) are multiplied by the given factors (default 0.96 0.93
0.90), feathered by how skin-like they are, so cloth, hair and eyes keep their colour.
"""
import sys

import numpy as np
from PIL import Image

src, dst = sys.argv[1:3]
k = np.array([float(v) for v in sys.argv[3:6]] or [0.96, 0.93, 0.90], np.float32)
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
q = r / np.maximum(g, 1)
w = np.clip((r - 120) / 40, 0, 1) * np.clip((q - 1.08) / 0.06, 0, 1) * np.clip((1.52 - q) / 0.08, 0, 1) * np.clip((g - b + 4) / 8, 0, 1) \
    * np.clip((g / np.maximum(b, 1) - 1.02) / 0.05, 0, 1) * np.clip((1.45 - g / np.maximum(b, 1)) / 0.1, 0, 1)
out = a * (1 - w[..., None]) + a * k * w[..., None]
Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)).save(dst)
print("graded", dst, "skin share", round(float(w.mean()), 3))
