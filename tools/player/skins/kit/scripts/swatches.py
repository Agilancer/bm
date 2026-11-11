"""Tiling pictures made from numbers, for when you'd rather not draw one: cloth weaves, leather, metal, and patterns.

    python scripts/swatches.py weave swatches/my_weave.png --color "#7a1f1a" --seed 3
    python scripts/swatches.py list

Swatches (weave, twill, velvet, leather, hammered, scales) are colour pictures for a recipe's cloth, trim or leather "swatch".
Patterns (diamonds, stars, stripes, vines, runes) are white on black, for a recipe's "pattern" image: white is where the
second colour goes. All of those repeat without a seam: use "tile": "repeat" with them.
Emblems (sun, moon, flame, leaf) are a white shape on nothing, for a decal in "gilt" mode.
Or call them from Python: swatches.make("weave", color="#7a1f1a", seed=3).save(path)."""
import sys

import numpy as np
from PIL import Image

N = 256


def _rgb(c):
    c = c.lstrip("#")
    return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def _noise(rng, octaves=(4, 8, 16, 32), fall=0.55):
    """Soft noise that wraps at the edges: a few sizes of blobs added up."""
    out = np.zeros((N, N), np.float32)
    amp = 1.0
    for k in octaves:
        g = rng.random((k, k)).astype(np.float32)
        img = np.asarray(Image.fromarray((np.tile(g, (3, 3)) * 255).astype(np.uint8)).resize((N * 3, N * 3), Image.BICUBIC), np.float32) / 255
        out += img[N:2 * N, N:2 * N] * amp
        amp *= fall
    out -= out.min()
    return out / max(out.max(), 1e-6)


def _grid():
    y, x = np.mgrid[0:N, 0:N].astype(np.float32) / N
    return x, y


def _paint(value, color, depth=0.35):
    """A grey picture (0..1) as shades of a colour."""
    return np.clip(_rgb(color)[None, None] * (1 - depth + depth * 2 * value[..., None]), 0, 1)


def weave(color="#6d6a66", seed=1, threads=48):
    """Plain woven cloth: threads over and under."""
    rng = np.random.default_rng(seed)
    x, y = _grid()
    warp = 0.5 + 0.5 * np.sin(x * threads * 2 * np.pi)
    weft = 0.5 + 0.5 * np.sin(y * threads * 2 * np.pi)
    over = (np.floor(x * threads) + np.floor(y * threads)) % 2
    v = np.where(over > 0, warp, weft) * 0.5 + 0.25 + (_noise(rng) - 0.5) * 0.25
    return _paint(v, color, 0.22)


def twill(color="#3a4a2a", seed=1, threads=40):
    """Twill: the weave's lines run on the slant, as in a heavy coat."""
    rng = np.random.default_rng(seed)
    x, y = _grid()
    v = 0.5 + 0.5 * np.sin((x + y) * threads * 2 * np.pi) * (0.6 + 0.4 * np.sin((x - y) * threads * np.pi))
    return _paint(v * 0.5 + 0.25 + (_noise(rng) - 0.5) * 0.3, color, 0.24)


def velvet(color="#5a2a86", seed=1):
    """Velvet: soft, cloudy, with a fine nap."""
    rng = np.random.default_rng(seed)
    v = _noise(rng, (3, 6, 12, 24, 64), 0.6) * 0.7 + rng.random((N, N)).astype(np.float32) * 0.3
    return _paint(v, color, 0.2)


def leather(color="#3b2a1e", seed=1):
    """Leather: pebbled grain and a few creases."""
    rng = np.random.default_rng(seed)
    grain = _noise(rng, (32, 64, 128), 0.8)
    crease = np.abs(_noise(rng, (4, 8), 0.5) - 0.5) * 2
    return _paint(grain * 0.6 + crease * 0.4, color, 0.3)


def hammered(color="#c9a24a", seed=1):
    """Beaten metal: shallow dents catching the light."""
    rng = np.random.default_rng(seed)
    v = _noise(rng, (10, 20), 0.5)
    v = np.abs(np.sin(v * 9)) * 0.6 + _noise(rng, (64,), 1) * 0.15 + 0.2
    return _paint(v, color, 0.3)


def scales(color="#2c4a52", seed=1, rows=10):
    """Overlapping scales: fish, dragon, or a coat of plates."""
    x, y = _grid()
    v = np.zeros((N, N), np.float32)
    for shift, row in ((0.0, 0.0), (0.5, 0.5)):
        cx = ((x * rows + shift) % 1) - 0.5
        cy = ((y * rows + row) % 1)
        r = np.hypot(cx, cy - 0.15)
        v = np.maximum(v, np.clip(1 - r * 1.7, 0, 1) * (cy < 0.9))
    edge = np.clip(v * 3, 0, 1)
    return _paint(edge * 0.45 + v * 0.55, color, 0.38)


def diamonds(seed=1, count=8, line=0.08):
    """Pattern: a lattice of diamonds, as on brocade."""
    x, y = _grid()
    a = np.abs(((x + y) * count) % 1 - 0.5)
    b = np.abs(((x - y) * count) % 1 - 0.5)
    v = (np.minimum(a, b) < line).astype(np.float32)
    dot = (np.hypot(((x + y) * count) % 1 - 0.5, ((x - y) * count) % 1 - 0.5) < 0.12).astype(np.float32)
    return np.repeat(np.maximum(v, dot)[..., None], 3, -1)


def stars(seed=1, count=5):
    """Pattern: small four-pointed stars in rows, each row stepped half a place."""
    x, y = _grid()
    v = np.zeros((N, N), np.float32)
    for sx, sy in ((0, 0), (0.5, 0.5)):
        cx = np.abs(((x * count + sx) % 1) - 0.5)
        cy = np.abs(((y * count + sy) % 1) - 0.5)
        v = np.maximum(v, ((cx * cy < 0.004) & (cx + cy < 0.3)).astype(np.float32))
    return np.repeat(v[..., None], 3, -1)


def stripes(seed=1, count=6, width=0.18):
    """Pattern: stripes down the cloth, a thin one beside each broad one."""
    x, _ = _grid()
    p = (x * count) % 1
    v = ((p < width) | ((p > width + 0.08) & (p < width + 0.12))).astype(np.float32)
    return np.repeat(v[..., None], 3, -1)


def vines(seed=1, count=3):
    """Pattern: wandering stems with leaves."""
    x, y = _grid()
    v = np.zeros((N, N), np.float32)
    for k in range(count):
        cx = (k + 0.5) / count + 0.09 * np.sin(y * 2 * np.pi * 2 + k * 2.1)
        d = np.abs(((x - cx + 0.5) % 1) - 0.5)
        v = np.maximum(v, (d < 0.012).astype(np.float32))
        leaf = np.hypot(((x - cx + 0.5) % 1) - 0.5 - 0.035 * np.sign(np.sin(y * 2 * np.pi * 6 + k)), ((y * 6 + k * 0.3) % 1 - 0.5) / 6 * 1.6)
        v = np.maximum(v, (leaf < 0.022).astype(np.float32))
    return np.repeat(v[..., None], 3, -1)


def runes(seed=1, count=6):
    """Pattern: rows of made-up marks (strokes on a grid: no letters of any real alphabet)."""
    rng = np.random.default_rng(seed)
    v = np.zeros((N, N), np.float32)
    cell = N // count
    for j in range(count):
        for i in range(count):
            x0, y0 = i * cell + cell // 4, j * cell + cell // 5
            w, h = cell // 2, cell * 3 // 5
            pts = [(x0 + int(rng.integers(0, 3)) * w // 2, y0 + int(rng.integers(0, 4)) * h // 3) for _ in range(4)]
            for (ax, ay), (bx, by) in zip(pts, pts[1:]):
                for t in np.linspace(0, 1, 40):
                    px, py = int(ax + (bx - ax) * t), int(ay + (by - ay) * t)
                    v[max(py - 1, 0):py + 2, max(px - 1, 0):px + 2] = 1
    return np.repeat(v[..., None], 3, -1)


def _emblem(alpha):
    """White with the shape as its alpha: for a decal in "gilt" mode, or to colour yourself."""
    return np.concatenate([np.ones((N, N, 3), np.float32), np.clip(alpha, 0, 1)[..., None]], -1)


def sun(seed=1, rays=12):
    """Emblem: a sun, a disc with pointed rays."""
    x, y = _grid()
    r, a = np.hypot(x - 0.5, y - 0.5), np.arctan2(y - 0.5, x - 0.5)
    ray = 0.24 + 0.2 * np.abs(np.cos(a * rays / 2)) ** 3
    shape = (r < 0.17) | ((r > 0.2) & (r < ray))
    return _emblem(shape.astype(np.float32))


def moon(seed=1):
    """Emblem: a crescent moon with a small star."""
    x, y = _grid()
    crescent = (np.hypot(x - 0.47, y - 0.5) < 0.34) & (np.hypot(x - 0.6, y - 0.44) > 0.3)
    cx, cy = np.abs(x - 0.7), np.abs(y - 0.42)
    star = (cx * cy < 0.0006) & (cx + cy < 0.1)
    return _emblem((crescent | star).astype(np.float32))


def flame(seed=1):
    """Emblem: a single flame."""
    x, y = _grid()
    t = np.clip((0.92 - y) / 0.8, 0, 1)
    half = 0.26 * np.sin(np.pi * t ** 0.75) * (1 - 0.35 * t)
    lean = 0.06 * np.sin(t * 5)
    outer = np.abs(x - 0.5 - lean) < half
    inner = (np.abs(x - 0.5 - lean * 0.5) < half * 0.42) & (t < 0.55) & (t > 0.06)
    return _emblem((outer & ~inner & (t > 0)).astype(np.float32))


def leaf(seed=1):
    """Emblem: an oak-ish leaf with a stem."""
    x, y = _grid()
    t = np.clip((0.9 - y) / 0.75, 0, 1)
    half = 0.22 * np.sin(np.pi * t) * (1 + 0.25 * np.sin(t * 22))
    body = (np.abs(x - 0.5) < half) & (t > 0) & (t < 1)
    vein = (np.abs(x - 0.5) < 0.012) & (y > 0.2)
    return _emblem((body & ~vein | ((np.abs(x - 0.5) < 0.014) & (y > 0.86))).astype(np.float32))


KINDS = {"sun": sun, "moon": moon, "flame": flame, "leaf": leaf, "weave": weave, "twill": twill, "velvet": velvet, "leather": leather, "hammered": hammered, "scales": scales,
         "diamonds": diamonds, "stars": stars, "stripes": stripes, "vines": vines, "runes": runes}


def make(kind, **opts):
    a = (np.clip(KINDS[kind](**opts), 0, 1) * 255 + 0.5).astype(np.uint8)
    return Image.fromarray(a, "RGBA" if a.shape[-1] == 4 else "RGB")


def main():
    a = sys.argv[1:]
    if not a or a[0] == "list":
        for k, f in KINDS.items():
            print(f"{k:10} {f.__doc__}")
        return
    kind, path, opts = a[0], a[1], {}
    for flag, val in zip(a[2::2], a[3::2]):
        key = flag.lstrip("-")
        opts[key] = val if key == "color" else float(val) if "." in val else int(val)
    make(kind, **opts).save(path)
    print(path)


if __name__ == "__main__":
    main()
