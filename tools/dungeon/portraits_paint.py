"""The Gallery of a Thousand Portraits' paintings: the sitters tools/dungeon/portraits_blender.py rendered in Blender (the
house of Velscour, head and shoulders), made oil paintings of. Broad strokes (a Kuwahara filter: flat patches with their
edges kept, how paint lies), the near-black warm ground an old master laid, a glow of it behind the head, the brush's drag
in the paint, a varnish gone amber, the craquelure of three hundred years, a canvas weave. And one the Painter hasn't
finished: a face done, the rest charcoal on bare canvas (the Unfinished Hall's easel).

    python tools/dungeon/portraits_paint.py [renders dir]

Six to a square, three across and two down (a cell 256 x 384, a portrait's own shape), in two squares: p2_portraits_a
and p2_portraits_b, laid into the PH2 pack like the shop signs (tools/phobos/textures/signs.py). src/core/delve-build.js
portrait() takes one cell by its number, 0 to 11 (11: the unfinished one).

The V/T rule: these are Velscour's own, royal blue; nothing of Tessariel's in them (no bells, no crosses, no seals).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "phobos", "textures"))
from build_sets import detail   # noqa: E402

SIZE, DET, COLS, ROWS, CW, CH = 768, 384, 3, 2, 256, 384
NAMES = ["p2_portraits_a", "p2_portraits_b"]
CANVAS = np.array([0.74, 0.67, 0.53], np.float32)


def kuwahara(a, r):
    """Each pixel the mean of whichever of its four quarters is calmest: flat patches, edges kept."""
    k = r + 1
    out = np.zeros_like(a); best = np.full(a.shape[:2], np.inf, np.float32)
    lum = a.mean(-1)
    m_l = ndimage.uniform_filter(lum, k); v_l = ndimage.uniform_filter(lum * lum, k) - m_l * m_l
    m_c = np.stack([ndimage.uniform_filter(a[..., c], k) for c in range(3)], -1)
    for dy in (-r // 2, r // 2):
        for dx in (-r // 2, r // 2):
            v = np.roll(v_l, (dy, dx), (0, 1)); m = np.roll(m_c, (dy, dx), (0, 1))
            sel = v < best; best[sel] = v[sel]; out[sel] = m[sel]
    return out


def strokes(rng, h, w, angle):
    """The brush's drag: noise smeared one way."""
    n = rng.standard_normal((h, w)).astype(np.float32)
    n = ndimage.gaussian_filter(n, (1.0, 6.0))
    n = ndimage.rotate(n, angle, reshape=False, mode="wrap")
    return n / max(float(n.std()), 1e-4)


def cracks(rng, h, w, cells):
    """Craquelure: the edges of an irregular net of cells (distance to the second-nearest seed less the nearest's)."""
    pts = rng.random((cells, 2)) * [h, w]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d1 = np.full((h, w), 1e9, np.float32); d2 = d1.copy()
    for py, px in pts:
        d = np.hypot(yy - py, xx - px)
        m = d < d1; d2 = np.where(m, d1, np.minimum(d2, d)); d1 = np.where(m, d, d1)
    edge = np.clip(1 - (d2 - d1) / 0.9, 0, 1)
    return edge * (0.5 + 0.5 * ndimage.gaussian_filter(rng.random((h, w)).astype(np.float32), 8) * 2)


def paint(src, seed, unfinished=False):
    rng = np.random.default_rng(seed)
    im = Image.open(src).convert("RGB").resize((CW * 2, CH * 2), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    h, w = a.shape[:2]
    lum = a @ np.array([0.3, 0.59, 0.11], np.float32)
    # The ground: warm near-black, a glow of it behind the head (upper middle, toward the light).
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    glow = np.exp(-(((xx - w * 0.42) / (w * 0.5)) ** 2 + ((yy - h * 0.3) / (h * 0.42)) ** 2))
    ground = np.array([0.05, 0.035, 0.022], np.float32) + glow[..., None] * np.array([0.16, 0.11, 0.06], np.float32)
    fig = np.clip((lum - 0.03) / 0.05, 0, 1)
    fig = ndimage.gaussian_filter(fig, 2)[..., None]
    a = a * fig + ground * (1 - fig)
    # Paint: broad flat patches, then the old masters' grade (the lights warm, the darks into brown, the blue sombre).
    a = kuwahara(a, 4)
    l2 = a @ np.array([0.3, 0.59, 0.11], np.float32)
    a = l2[..., None] + (a - l2[..., None]) * 0.72
    a = np.clip(a, 0, 1) ** 1.12 * 1.12
    a *= np.array([1.0, 0.9, 0.7], np.float32)                     # the varnish, gone amber
    a += strokes(rng, h, w, rng.uniform(-35, 35))[..., None] * 0.018 * (0.3 + l2[..., None])
    if unfinished:
        # The Painter's own: the face and collar done, the rest charcoal lines on canvas, the ground not yet laid.
        done = np.exp(-(((xx - w * 0.5) / (w * 0.28)) ** 2 + ((yy - h * 0.3) / (h * 0.2)) ** 2))
        done = np.clip(done * 1.6 - 0.2, 0, 1)
        e = np.hypot(ndimage.sobel(ndimage.gaussian_filter(lum, 1.6), 0), ndimage.sobel(ndimage.gaussian_filter(lum, 1.6), 1))
        line = np.clip(e * 3.5, 0, 1) * (0.6 + 0.4 * rng.random((h, w)))
        canvas = CANVAS * (1 - 0.06 * strokes(rng, h, w, 80)[..., None] * 0.3)
        sketch = canvas * (1 - line[..., None] * 0.75)
        wash = np.clip((fig[..., 0] - 0.2), 0, 1) * 0.35   # (a thin first wash of umber over the figure)
        sketch = sketch * (1 - wash[..., None]) + np.array([0.32, 0.22, 0.14]) * wash[..., None]
        done = done * fig[..., 0]
        a = a * done[..., None] + sketch * (1 - done[..., None])
    else:
        c = cracks(rng, h, w, 2600)
        a *= 1 - c[..., None] * 0.1 * (0.4 + l2[..., None])
        # Dirt and age: the corners darker, a bloom of grime.
        v = 1 - 0.35 * (((xx / w - 0.5) * 1.6) ** 2 + ((yy / h - 0.45) * 1.2) ** 2)
        a *= np.clip(v, 0.5, 1)[..., None]
    weave = 1 + 0.025 * (np.sin(xx * 1.9) * np.sin(yy * 1.9))
    a *= weave[..., None]
    a = np.clip(a, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8), "RGB").resize((CW, CH), Image.LANCZOS)


def wire():
    """Only put the two squares back in the manifest and phobos-p2.js (wire_ph2.py rewrites both): the paintings stay."""
    man_path = os.path.join(ROOT, "assets", "game", "tex", "manifest.json")
    man = json.load(open(man_path))
    js = os.path.join(ROOT, "src", "core", "phobos-p2.js")
    s = open(js, encoding="utf-8").read()
    for name in NAMES:
        if not any(l["name"] == name for l in man["ph2"]["layers"]):
            man["ph2"]["layers"].append({"name": name, "kind": "single", "cutout": False})
        if '"%s"' % name not in s:
            s = s.replace("\n};\n", ',\n "%s": [1.0, 1.0, 1.0]\n};\n' % name)
    json.dump(man, open(man_path, "w"), indent=1)
    open(js, "w", encoding="utf-8", newline="\n").write(s)


def main(src=None):
    src = src or os.path.join(ROOT, "tools", "build", "portraits")
    files = sorted(f for f in os.listdir(src) if f.startswith("p") and f.endswith(".png") and f[1:3].isdigit())
    assert len(files) >= 12, files
    out = os.path.join(ROOT, "assets", "game", "tex", "p2")
    cells = [paint(os.path.join(src, f), i, unfinished=(i == 11)) for i, f in enumerate(files[:12])]
    man_path = os.path.join(ROOT, "assets", "game", "tex", "manifest.json")
    man = json.load(open(man_path))
    js = os.path.join(ROOT, "src", "core", "phobos-p2.js")
    s = open(js, encoding="utf-8").read()
    for k, name in enumerate(NAMES):
        sheet = Image.new("RGB", (SIZE, SIZE), (12, 9, 6))
        for j in range(COLS * ROWS):
            sheet.paste(cells[k * 6 + j], ((j % COLS) * CW, (j // COLS) * CH))
        sheet.save(os.path.join(out, name + "_c.webp"), quality=90, method=5)
        detail(sheet, "cloth", "dark").resize((DET, DET), Image.LANCZOS).save(os.path.join(out, name + "_d.webp"), quality=70, method=5, alpha_quality=80, exact=True)
        if os.path.isdir(os.path.join(ROOT, "tools", "build")): sheet.save(os.path.join(ROOT, "tools", "build", name + ".png"))
        if not any(l["name"] == name for l in man["ph2"]["layers"]):
            man["ph2"]["layers"].append({"name": name, "kind": "single", "cutout": False})
        if '"%s"' % name not in s:
            s = s.replace("\n};\n", ',\n "%s": [1.0, 1.0, 1.0]\n};\n' % name)
    json.dump(man, open(man_path, "w"), indent=1)
    open(js, "w", encoding="utf-8", newline="\n").write(s)
    print(len(cells), "portraits")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
