"""Takes the repeat out of the paintings themselves: what in a painting the eye finds again tile after tile.

    python tools/world/unrepeat_tex.py [--from <git ref>] [--only name,name] [--sheet out.jpg]

Reads each painting as it was at the ref (default the commit before this was made, so running it twice gives the same
files) and writes it back over assets/game/tex at the same size, so nothing more is held anywhere:

- grass_1..3: the pale strands that net across the grass (grass_2 above all) toned down, highlights more than shadows,
  and the relief in their detail maps eased, since it's the light on those strands that drew the net;
- the masonry (stone, rubble, block, course, ashlar, flags): its broad light and dark, anything bigger than a quarter of
  a repeat, half divided out, so no blotch marks the period of the tile; the stones and their joints are kept. The shader
  gives the stones their own tones back, in the world's space (src/gfx/materials.js STATIC);
- the timbered fronts (wall_07..wall_20, door_wall): the pale plaster between the timbers evened out, the dark rim and
  the stains that every bay of a front had in the same place lifted (only ever lightened, so the cream stays), but not
  the splashed dirt at the foot of each panel over the timber below it; the timber, the glass and the stone infill left
  exactly as painted. The shader gives each bay its own tone and the dirt
  along its timbers and at the foot of the wall.

Needs numpy and Pillow; git for the originals. --sheet writes a before-and-after of each, three repeats wide.
"""
import argparse
import io
import os
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TEX = os.path.join(ROOT, "assets", "game", "tex")
BASE_REF = "ac25d11"

GRASS = ["grass_1", "grass_2", "grass_3"]
MASONRY = ["stone", "rubble", "block", "course", "ashlar", "flags"]
FRONTS = [f"wall_{i:02d}" for i in range(7, 21)] + ["door_wall"]


def original(ref, name):
    data = subprocess.run(["git", "show", f"{ref}:assets/game/tex/{name}.webp"], cwd=ROOT, capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data))


def blur(a, sigma):
    """Gaussian blur that wraps round (a painting that tiles), by FFT: a is HxW or HxWxC float."""
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sigma ** 2) * (fx ** 2 + fy ** 2))
    if a.ndim == 3:
        return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., c]) * g)) for c in range(a.shape[2])], -1)
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def to_lin(s):
    return np.where(s <= 0.04045, s / 12.92, ((s + 0.055) / 1.055) ** 2.4)


def to_srgb(l):
    l = np.clip(l, 0, 1)
    return np.where(l <= 0.0031308, l * 12.92, 1.055 * l ** (1 / 2.4) - 0.055)


def lum(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def save(img, name, quality):
    img.save(os.path.join(TEX, f"{name}.webp"), quality=quality, method=5, exact=True)


def grass(ref, name):
    c = np.asarray(original(ref, f"{name}_c").convert("RGB"), np.float64) / 255
    lin = to_lin(c)
    L = lum(lin) + 1e-4
    low = blur(L, 3.0)
    hi = L / low
    # Strands brighter than the grass about them come down by about two fifths, darker ones by a little.
    k = np.where(hi > 1, 0.58, 0.85)
    L2 = low * (1 + (hi - 1) * k)
    out = lin * (L2 / L)[..., None]
    # (And their yellow, which is what made them a net, a little toward the green round them.)
    sat_low = blur(out, 3.0)
    yellow = np.clip((out[..., 0] - out[..., 1] * 0.8) * 6, 0, 1)[..., None]
    out = out * (1 - 0.3 * yellow) + sat_low * 0.3 * yellow
    save(Image.fromarray((to_srgb(out) * 255 + 0.5).astype(np.uint8)), f"{name}_c", 80)
    d = original(ref, f"{name}_d")
    da = np.asarray(d.convert("RGBA"), np.float64) / 255
    da[..., 0:2] = 0.5 + (da[..., 0:2] - 0.5) * 0.55
    da[..., 3] = 0.5 + (da[..., 3] - 0.5) * 0.7
    Image.fromarray((da * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(TEX, f"{name}_d.webp"), quality=60, method=5, alpha_quality=70, exact=True)


def masonry(ref, name):
    im = original(ref, f"{name}_c").convert("RGB")
    c = np.asarray(im, np.float64) / 255
    lin = to_lin(c)
    h, w = lin.shape[:2]
    L = lum(lin) + 1e-4
    # Anything bigger than about a quarter of the repeat across its shorter side: blurred out at a sixteenth of it.
    low = blur(L, min(h, w) / 16)
    # (Half way: all the way flattened the stone to wallpaper, the critics. The shader gives each stone its own tone.)
    flat = (L.mean() / low) ** 0.5
    out = lin * flat[..., None]
    # (Its colour's broad drift too, a little, toward the painting's own mean.)
    clow = blur(out, min(h, w) / 16)
    out = out - clow * 0.3 + out.reshape(-1, 3).mean(0) * 0.3
    save(Image.fromarray((to_srgb(out) * 255 + 0.5).astype(np.uint8)), f"{name}_c", 76)


def front(ref, name):
    im = original(ref, f"{name}_c")
    has_alpha = im.mode == "RGBA"
    rgba = np.asarray(im.convert("RGBA"), np.float64) / 255
    c = rgba[..., :3]
    # Timber and glass as tools/village/build_textures.py reads them from the paint: never touched, nor what's beside them.
    L = lum(c)
    brown = np.clip((c[..., 0] - c[..., 2]) * 7, 0, 1)
    wood = np.clip((0.40 - L) * 7, 0, 1) * brown
    grey_dark = np.clip((0.26 - L) * 9, 0, 1) * np.clip((c[..., 2] - c[..., 0] + 0.05) * 14, 0, 1)
    keep = np.clip(blur(np.maximum(wood, grey_dark), 2.5) * 2.2, 0, 1)
    # Plaster only: what's pale over a stretch (stone infill, darker and broken, is left as painted).
    pale = np.clip((blur(L, 6.0) - 0.5) / 0.14, 0, 1)
    plaster = (1 - keep) * pale
    lin = to_lin(c)
    Ll = lum(lin) + 1e-4
    # The plaster's own light over about a panel's edge, measured over the plaster alone. Where it falls below the
    # plaster's usual (its upper quartile: clean limewash) it's lifted, by most of the way; nothing is darkened. That
    # takes out the dark rim and the stains that every bay of a front had in the same place, and keeps the cream.
    s = 16.0
    local = blur(Ll * plaster, s) / (blur(plaster, s) + 1e-3)
    w = plaster > 0.5
    target = np.percentile(Ll[w], 70) if w.any() else Ll.mean()
    gain = np.clip((target / np.maximum(local, 1e-3)) ** 0.75, 1.0, 1.6)
    # (But not the dirt splashed up at the foot of a panel, just over the timber under it: that's where it belongs.)
    below = np.zeros_like(wood)
    for k in range(2, int(c.shape[0] * 0.06), 3):
        below = np.maximum(below, np.roll(wood, -k, axis=0) * (1 - k / (c.shape[0] * 0.06)))
    gain = 1 + (gain - 1) * plaster * (1 - np.clip(below * 1.5, 0, 1))
    out = lin * gain[..., None]
    rgb = (to_srgb(out) * 255 + 0.5).astype(np.uint8)
    if has_alpha:
        img = Image.fromarray(np.dstack([rgb, (rgba[..., 3] * 255 + 0.5).astype(np.uint8)]), "RGBA")
    else:
        img = Image.fromarray(rgb)
    save(img, f"{name}_c", 80 if has_alpha else 76)


def sheet(ref, names, out):
    rows = []
    for n in names:
        a = original(ref, f"{n}_c").convert("RGB")
        b = Image.open(os.path.join(TEX, f"{n}_c.webp")).convert("RGB")
        tw, th = 300, int(300 * a.height / a.width)
        row = Image.new("RGB", (tw * 6 + 20, th), (255, 255, 255))
        for k, im in enumerate((a, b)):
            t = im.resize((tw, th))
            for i in range(3):
                row.paste(t, (k * (tw * 3 + 20) + i * tw, 0))
        rows.append(row)
    s = Image.new("RGB", (rows[0].width, sum(r.height + 6 for r in rows)), (255, 255, 255))
    y = 0
    for r in rows:
        s.paste(r, (0, y))
        y += r.height + 6
    s.save(out, quality=85)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="ref", default=BASE_REF)
    ap.add_argument("--only", default="")
    ap.add_argument("--sheet", default="")
    a = ap.parse_args()
    only = set(a.only.split(",")) if a.only else None
    done = []
    for names, fn in ((GRASS, grass), (MASONRY, masonry), (FRONTS, front)):
        for n in names:
            if only and n not in only:
                continue
            fn(a.ref, n)
            done.append(n)
            print(n, file=sys.stderr)
    if a.sheet:
        sheet(a.ref, done, a.sheet)


if __name__ == "__main__":
    main()
