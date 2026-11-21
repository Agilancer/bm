# Wenna Coyle, who keeps the Sill's lamps (src/folk/people.js POSTED fv_wenna): the candle-maker's body (chandler) with her
# clothes moved to a lamp-soot grey-green and her hair gone grey; skin (by its colour) left as it is. As
# tools/folk/posted_swaps.py does the small towns' people. Writes assets/game/folk/fv_wenna_c.webp and a before|after sheet.
#   python tools/firstvisit/wenna_swap.py [sheet.jpg]
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage as ndi
D = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'game', 'folk')
BASE, OUT = 'chandler', 'fv_wenna'
DH, SS, VS, GREY = 0.33, 0.55, 0.92, 0.55
def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]; mx = a.max(-1); mn = a.min(-1); d = mx - mn; m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)); h = np.where(m, (h / 6) % 1, 0)
    return h, np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0), mx
def hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    return np.stack([np.choose(i, [v, q, p, p, t, v]), np.choose(i, [t, v, v, q, p, p]), np.choose(i, [p, p, t, v, v, q])], -1)
a = np.asarray(Image.open(os.path.join(D, BASE + '_c.webp')).convert('RGB')).astype(np.float32) / 255
h, s, v = rgb2hsv(a)
hd = np.minimum(np.abs(h - 0.055), 1 - np.abs(h - 0.055))
skin = np.clip(1 - hd / 0.045, 0, 1) * np.clip((s - 0.16) / 0.1, 0, 1) * np.clip((0.62 - s) / 0.1, 0, 1) * np.clip((v - 0.42) / 0.12, 0, 1)
skin = np.clip(ndi.gaussian_filter(skin, 2.0) * 1.6, 0, 1)
out = hsv2rgb((h + DH) % 1, np.clip(s * SS, 0, 1), np.clip(v * VS, 0, 1))
# (Hair: dark and not skin, lifted toward grey.)
hair = np.clip((0.35 - v) / 0.2, 0, 1) * (1 - skin)
g = out.mean(-1, keepdims=True); out = out * (1 - GREY * hair[..., None]) + (g * 0.6 + 0.35) * GREY * hair[..., None]
res = out * (1 - skin[..., None]) + a * skin[..., None]
Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8)).save(os.path.join(D, OUT + '_c.webp'), quality=90, method=4)
if len(sys.argv) > 1:
    Image.fromarray((np.concatenate([a, res], 1) * 255).astype(np.uint8)).resize((1536, 768)).save(sys.argv[1])
print('wrote', OUT + '_c.webp')
