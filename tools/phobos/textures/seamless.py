"""Make a photograph (or a nearly tiling painting) of masonry repeat with no seam.

    python tools/phobos/textures/seamless.py <image> <out.png> [size]          one image
    from seamless import make_tile                                             as a library

How. A plain cross-fade of the edges ghosts every stone it crosses, so instead:
  1. Light is evened: the broad light and dark across the photo (a sunlit side, a shadowed corner) is divided out,
     or the repeat shows as a grid of light patches on a long wall.
  2. A span that repeats is found: for many candidate widths, the strip just past the window's right edge is compared
     with the strip at its left edge; the width where they agree best is where the courses and joints line up. The
     same for the height.
  3. The two strips are joined along a cut, not a fade: the cheapest path down the overlap (dynamic programming, as
     in image quilting), which runs along joints and through flat stone where the two already agree. A pixel or two
     of feather hides what's left.
  4. The result is checked: `seam_score` is how much sharper the picture's change is across the wrap than inside it
     (1.0 = no different from anywhere else; over about 1.6 a seam can be seen), and `patch_score` how uneven it
     still is at a quarter of its width (a visible repeat on a big wall). Before that, `calm` pulls standout patches
     toward the tile's mean colour.
Returns the tile and those two numbers, so a whole folder can be sorted by them.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

LUM = np.array([0.2126, 0.7152, 0.0722], np.float32)


def blur(a, r):
    """Gaussian blur of a float array (H, W) or (H, W, 3), edges reflected. Done small and scaled back up: these
    blurs are all broad, so nothing is lost and it is quick."""
    if a.ndim == 3:
        return np.stack([blur(a[..., k], r) for k in range(a.shape[2])], -1)
    pad = int(r * 2)
    b = np.pad(a, pad, mode="reflect")
    k = max(1.0, r / 4.0)
    h, w = b.shape
    small = Image.fromarray(b.astype(np.float32), "F").resize((max(int(w / k), 2), max(int(h / k), 2)), Image.BILINEAR)
    lo, hi = small.getextrema()
    s8 = Image.fromarray(((np.asarray(small) - lo) / max(hi - lo, 1e-6) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r / k))
    out = np.asarray(Image.fromarray(np.asarray(s8, np.float32) / 255 * (hi - lo) + lo, "F").resize((w, h), Image.BICUBIC), np.float32)
    return out[pad:-pad, pad:-pad]


def even_light(a, strength=0.85):
    """Divide out the broad light and dark (a sixth of the width and coarser)."""
    lum = a @ LUM
    broad = blur(lum, max(lum.shape) / 6)
    return np.clip(a * ((lum.mean() / np.maximum(broad, 0.02)) ** strength)[..., None], 0, 1)


def best_span(g, lo, hi, band, step):
    """The span (in pixels along axis 1 of the grey picture g) between lo and hi whose two edge strips agree best,
    and where it starts. Compares the strip at the start with the strip one span on."""
    h, w = g.shape
    best = (1e18, lo, 0)
    for span in range(lo, hi + 1, step):
        room = w - span - band
        if room < 0:
            break
        for x0 in range(0, room + 1, max(step * 2, room // 6 or 1)):
            d = g[:, x0:x0 + band] - g[:, x0 + span:x0 + span + band]
            e = float((d * d).mean())
            if e < best[0]:
                best = (e, span, x0)
    return best[1], best[2], best[0]


def cut(a, b):
    """Join strip a (the window's own start) and strip b (what follows the window's end) along the cheapest path
    from top to bottom: b to the left of the cut, a to its right. Both (H, B, 3)."""
    cost = ((a - b) ** 2).sum(-1)
    # (A cut should also not run along a strong edge of either strip.)
    gx = np.abs(np.diff(a @ LUM, axis=1, append=a[:, -1:] @ LUM)) + np.abs(np.diff(b @ LUM, axis=1, append=b[:, -1:] @ LUM))
    cost = cost + 0.15 * gx
    H, B = cost.shape
    acc = cost.copy()
    for y in range(1, H):
        prev = acc[y - 1]
        left = np.concatenate([[np.inf], prev[:-1]]); right = np.concatenate([prev[1:], [np.inf]])
        acc[y] += np.minimum(prev, np.minimum(left, right))
    path = np.zeros(H, int)
    path[-1] = int(acc[-1, B // 6: B - B // 6].argmin()) + B // 6
    for y in range(H - 2, -1, -1):
        x = path[y + 1]
        lo, hi = max(x - 1, 0), min(x + 2, B)
        path[y] = lo + int(acc[y, lo:hi].argmin())
    xs = np.arange(B)[None, :]
    m = np.clip((xs - path[:, None]) / 2.0 + 0.5, 0, 1)[..., None]  # 0 left of the cut (b), 1 right of it (a)
    return b * (1 - m) + a * m


def wrap_x(a, g, frac=(0.55, 0.92), band_frac=0.09):
    """Crop a (H, W, 3) to a span that repeats along x and join its ends. g: a small grey copy for the search."""
    h, w = a.shape[:2]
    s = g.shape[1] / w
    band_s = max(int(g.shape[1] * band_frac), 6)
    span_s, x0_s, _ = best_span(g, int(g.shape[1] * frac[0]), int(g.shape[1] * frac[1]) - band_s, band_s, 1)
    span, x0, band = int(round(span_s / s)), int(round(x0_s / s)), int(round(band_s / s))
    # (Refine the span by a few full-size pixels either way.)
    full = a @ LUM
    best = (1e18, span)
    for d in range(-int(2 / s), int(2 / s) + 1):
        if x0 + span + d + band > w or span + d < band * 2:
            continue
        e = float(((full[:, x0:x0 + band] - full[:, x0 + span + d:x0 + span + d + band]) ** 2).mean())
        if e < best[0]:
            best = (e, span + d)
    span = best[1]
    head = cut(a[:, x0:x0 + band], a[:, x0 + span:x0 + span + band])
    return np.concatenate([head, a[:, x0 + band:x0 + span]], 1)


def calm(a, strength=0.6):
    """Take the standout patches out of a finished tile (an orange stone, a pale smear: what the eye catches on the
    third repeat): colour's drift at an eighth of the width is pulled toward the tile's mean, wrapping."""
    h, w = a.shape[:2]
    low = blur(np.tile(a, (3, 3, 1)), w / 8)[h:2 * h, w:2 * w]
    return np.clip(a - (low - low.mean((0, 1))) * strength, 0, 1)


def despot(a, strength):
    """Knock back the odd stones: the ones whose colour stands furthest from the tile's own (a white-mortared patch, a
    teal brick, a tuft of weeds, a black hole), which no offset or tint hides because the eye finds them on every
    repeat. At stone size (a fortieth of the width) each patch's difference from the mean is measured; past about two
    standard deviations it is pulled back toward the mean, wrapping."""
    if strength <= 0:
        return a
    h, w = a.shape[:2]
    low = blur(np.tile(a, (3, 3, 1)), w / 40)[h:2 * h, w:2 * w]
    dev = low - low.mean((0, 1))
    mag = np.sqrt((dev ** 2).sum(-1))
    sd = float(mag.std()) + 1e-6; mu = float(mag.mean())
    k = np.clip((mag - (mu + 1.2 * sd)) / (1.5 * sd), 0, 1)
    return np.clip(a - dev * (k * strength)[..., None], 0, 1)


def scores(t):
    """(seam_score, patch_score) of a finished tile."""
    lum = t @ LUM
    dx = np.abs(lum - np.roll(lum, 1, 1)); dy = np.abs(lum - np.roll(lum, 1, 0))
    inside = (np.median(dx.mean(0)[4:-4]) + np.median(dy.mean(1)[4:-4])) / 2
    seam = max(dx[:, 0].mean(), dy[0].mean()) / max(inside, 1e-6)
    big = np.tile(lum, (3, 3)); h, w = lum.shape
    low = blur(big, w / 8)[h:2 * h, w:2 * w]
    return float(seam), float(low.std() / max(lum.std(), 1e-6))


def make_tile(img, size=1024, work=1600, even=0.85, calm_by=0.6, despot_by=0.0):
    """img: a PIL image. Returns (tile as PIL RGB size x size, seam_score, patch_score, aspect): the tile is squeezed
    square, so lay it aspect times as wide as it is tall (aspect = the cropped span's width over its height)."""
    im = img.convert("RGB")
    k = work / max(im.size)
    if k < 1:
        im = im.resize((int(im.size[0] * k), int(im.size[1] * k)), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255
    a = even_light(a, even)
    small = lambda arr: np.asarray(Image.fromarray((np.clip(arr @ LUM, 0, 1) * 255).astype(np.uint8)).resize((arr.shape[1] // 4, arr.shape[0] // 4), Image.BILINEAR), np.float32) / 255
    a = wrap_x(a, small(a))
    a = np.swapaxes(a, 0, 1)
    a = wrap_x(a, small(a))
    a = np.swapaxes(a, 0, 1)
    a = despot(calm(even_light(a, 0.5), calm_by), despot_by)
    aspect = a.shape[1] / a.shape[0]
    t = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((size, size), Image.LANCZOS)
    s, p = scores(np.asarray(t, np.float32) / 255)
    return t, s, p, aspect


if __name__ == "__main__":
    t, s, p, asp = make_tile(Image.open(sys.argv[1]), int(sys.argv[3]) if len(sys.argv) > 3 else 1024)
    t.save(sys.argv[2]); print("seam", round(s, 2), "patch", round(p, 3))
