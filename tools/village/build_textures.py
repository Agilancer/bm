"""Turn the painted village textures into the game's material arrays.

Every structure layer is a colour map (rgb + cutout alpha) and a detail map (normal xy, roughness,
height). Normal and height come from reading the painting: dark brown is timber standing proud of the
plaster, dark blue-grey behind leaded lines is recessed glass, mortar lines are low.

Usage: python build_textures.py ATTACHED_WEBP_DIR TEXTURES_DIR OUT_DIR
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

SIZE = (1792, 1024)
DETAIL = (896, 512)


def lum_of(a):
    return a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def blur(x, r):
    return np.asarray(Image.fromarray(np.clip(x * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255


def wrap_x(a, band=48):
    """Crossfade the left and right edges so a wall can repeat sideways without a seam."""
    h, w = a.shape[:2]
    t = np.linspace(0, 1, band)[:, None]
    if a.ndim == 3:
        t = t[None]
    else:
        t = t[None, :, 0]
    out = a.copy()
    right = a[:, w - band:]
    left = a[:, :band]
    out[:, :band] = left * t + right * (1 - t) if a.ndim == 3 else left * t + right * (1 - t)
    return out


def wrap_xy(a, band=64):
    a = wrap_x(a, band)
    return np.transpose(wrap_x(np.transpose(a, (1, 0, 2)), band), (1, 0, 2))


def normal_from(height, strength):
    dx = np.roll(height, -1, 1) - np.roll(height, 1, 1)
    dy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
    nx, ny = -dx * strength, dy * strength
    ln = np.sqrt(nx * nx + ny * ny + 1)
    return nx / ln * 0.5 + 0.5, ny / ln * 0.5 + 0.5


def analyse(a, kind):
    """Height (0-1) and roughness from colour. a is float rgb, shape HxWx3."""
    lum = lum_of(a)
    sat = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1e-3)
    fine = lum - blur(lum, 5)
    broad = lum - blur(lum, 22)
    if kind in ("wall", "door"):
        brown = np.clip((a[..., 0] - a[..., 2]) * 7, 0, 1)
        wood = np.clip((0.40 - lum) * 7, 0, 1) * brown
        wood = blur(wood, 1.6)
        grey_dark = np.clip((0.26 - lum) * 9, 0, 1) * np.clip((a[..., 2] - a[..., 0] + 0.05) * 14, 0, 1)
        glass = blur(grey_dark, 1.2)
        height = 0.42 + wood * 0.34 - glass * 0.28 + np.clip(broad, -0.3, 0.3) * 0.55 + fine * 0.35
        rough = np.clip(0.92 - wood * 0.14 - glass * 0.84 + np.abs(fine) * 0.3, 0.05, 1)
    elif kind == "roof":
        height = 0.5 + np.clip(broad, -0.4, 0.4) * 1.1 + fine * 0.5
        rough = np.clip(0.9 + fine, 0.55, 1)
    elif kind == "stone":
        height = 0.5 + np.clip(broad, -0.4, 0.4) * 1.3 + fine * 0.5
        rough = np.clip(0.88 + fine, 0.5, 1)
    elif kind == "wood":
        height = 0.5 + np.clip(broad, -0.4, 0.4) * 0.8 + fine * 0.6
        rough = np.clip(0.8 + fine, 0.45, 1)
    elif kind == "ground":
        height = 0.5 + np.clip(broad, -0.4, 0.4) * 1.2 + fine * 0.7
        rough = np.clip(0.95 + fine * 0.5, 0.6, 1)
    else:
        height = 0.5 + fine
        rough = np.full_like(lum, 0.9)
    return np.clip(height, 0, 1), rough


def save_pair(rgb, alpha, kind, out, name, strength, size, detail):
    img = Image.fromarray((rgb * 255 + 0.5).astype(np.uint8))
    h, r = analyse(rgb, kind)
    nx, ny = normal_from(h, strength)
    d = np.stack([nx, ny, r, h], -1)
    img_d = Image.fromarray((d * 255 + 0.5).astype(np.uint8), "RGBA").resize(detail, Image.LANCZOS)
    img_d.save(os.path.join(out, f"{name}_d.webp"), quality=60, method=5, alpha_quality=70, exact=True)
    if alpha is not None:
        rgba = np.dstack([(rgb * 255 + 0.5).astype(np.uint8), (alpha * 255 + 0.5).astype(np.uint8)])
        img = Image.fromarray(rgba, "RGBA")
        img.resize(size, Image.LANCZOS).save(os.path.join(out, f"{name}_c.webp"), quality=80, method=5, exact=True)
    else:
        img.resize(size, Image.LANCZOS).save(os.path.join(out, f"{name}_c.webp"), quality=76, method=5)


def load(path, size=None):
    im = Image.open(path).convert("RGB")
    if size:
        im = im.resize(size, Image.LANCZOS)
    return np.asarray(im, dtype=np.float32) / 255


def key_magenta(a):
    """Alpha from the magenta key, with the fringe's colour pulled back to its neighbours."""
    mag = np.clip((np.minimum(a[..., 0], a[..., 2]) - a[..., 1]) * 3.2 - 0.6, 0, 1)
    alpha = 1 - mag
    alpha = blur(alpha, 0.8)
    alpha = np.clip((alpha - 0.45) * 8, 0, 1)
    solid = alpha > 0.9
    rgb = a.copy()
    for _ in range(8):
        mean = np.stack([blur(rgb[..., c] * solid, 2) for c in range(3)], -1)
        w = np.maximum(blur(solid.astype(np.float32), 2), 1e-3)[..., None]
        rgb = np.where(solid[..., None], rgb, mean / w)
        solid = blur(solid.astype(np.float32), 2) > 0.1
    return rgb, alpha


def leaves(size=1024, seed=3):
    """A card of leafy sprigs with air between them, for the village trees."""
    rng = np.random.default_rng(seed)
    S = size
    rgb = np.zeros((S, S, 3), np.float32)
    alpha = np.zeros((S, S), np.float32)
    yy, xx = np.mgrid[:S, :S]
    sprigs = [(rng.uniform(0.18, 0.82) * S, rng.uniform(0.18, 0.82) * S, rng.uniform(0.09, 0.2) * S) for _ in range(15)]
    for sx, sy, sr in sprigs:
        hue_base = rng.uniform(0, 1)
        for i in range(70):
            ang = rng.uniform(0, np.pi * 2)
            rad = np.sqrt(rng.uniform(0, 1)) * sr
            cx, cy = sx + np.cos(ang) * rad, sy + np.sin(ang) * rad
            L = rng.uniform(15, 27)
            W = L * rng.uniform(0.34, 0.48)
            th = rng.uniform(0, np.pi * 2)
            x0, x1 = int(max(cx - L, 0)), int(min(cx + L + 1, S))
            y0, y1 = int(max(cy - L, 0)), int(min(cy + L + 1, S))
            if x1 <= x0 or y1 <= y0:
                continue
            dx, dy = xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy
            u = dx * np.cos(th) + dy * np.sin(th)
            v = -dx * np.sin(th) + dy * np.cos(th)
            d = (u / L) ** 2 + (v / (W * (1 - np.clip(u / L, -1, 1) ** 2) ** 0.6 + 1e-3)) ** 2
            mask = d < 1
            tint = rng.uniform(0.7, 1.15)
            hue = np.clip(hue_base + rng.uniform(-0.25, 0.25), 0, 1)
            col = np.array([0.17 + 0.17 * hue, 0.27 + 0.13 * hue, 0.07 + 0.03 * hue]) * tint
            vein = 1 - 0.25 * np.exp(-(v / 1.2) ** 2)
            shade = (0.7 + 0.3 * (u / L * 0.5 + 0.5)) * vein
            rgb[y0:y1, x0:x1][mask] = (col[None, None] * shade[..., None])[mask]
            alpha[y0:y1, x0:x1][mask] = 1
    return np.clip(rgb, 0, 1), alpha


def cloth(base, dark):
    S = 512
    rng = np.random.default_rng(11)
    n = rng.normal(0, 1, (S, S))
    weave = (np.sin(np.arange(S) * np.pi / 2)[None, :] * np.sin(np.arange(S) * np.pi / 2)[:, None]) * 0.04
    broad = np.asarray(Image.fromarray(((n * 40 + 128).clip(0, 255)).astype(np.uint8)).filter(ImageFilter.GaussianBlur(24)), dtype=np.float32) / 255 - 0.5
    t = np.clip(0.5 + broad * 4 + weave + n * 0.02, 0, 1)[..., None]
    return np.array(dark, dtype=np.float32) * (1 - t) + np.array(base, dtype=np.float32) * t


def main():
    attached, textures, out = sys.argv[1:4]
    os.makedirs(out, exist_ok=True)
    layers = []

    def add(name, a, kind, alpha=None, strength=9.0):
        save_pair(np.clip(a, 0, 1), alpha, kind, out, name, strength, SIZE, DETAIL)
        layers.append({"name": name, "kind": kind, "cutout": alpha is not None})
        print(name, kind)

    # The 20 attached paintings: 1-3 dirt, 4-6 grass, 7-12 plain walls, 13-20 walls with windows.
    for i in range(7, 21):
        name = f"wall_{i:02d}"
        add(name, wrap_x(load(os.path.join(attached, f"{i}.webp"), SIZE)), "wall")
    for i in range(1, 5):
        add(f"roof_{i}", wrap_x(load(os.path.join(textures, f"Home Roof {i}.png"), SIZE)), "roof", strength=11.0)
    add("door_wall", load(os.path.join(textures, "Door + outer wall.png"), SIZE), "wall")
    for i in range(1, 6):
        rgb, alpha = key_magenta(load(os.path.join(textures, f"Door {i}.png"), SIZE))
        add(f"door_{i}", rgb, "door", alpha)

    # Materials cut from the paintings, for beams, props and masonry.
    d = load(os.path.join(textures, "Door 5.png"))
    h, w = d.shape[:2]
    planks = d[int(h * 0.36):int(h * 0.66), int(w * 0.455):int(w * 0.56)]
    planks = np.asarray(Image.fromarray((planks * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
    add("wood", wrap_xy(planks) * np.array([0.58, 0.5, 0.44], dtype=np.float32), "wood", strength=8.0)
    d = load(os.path.join(textures, "Door + outer wall.png"))
    h, w = d.shape[:2]
    stone = np.concatenate([d[int(h * 0.60):int(h * 0.92), int(w * 0.112):int(w * 0.295)],
                            d[int(h * 0.60):int(h * 0.92), int(w * 0.705):int(w * 0.888)]], 1)
    stone = np.asarray(Image.fromarray((stone * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
    add("stone", wrap_xy(stone), "stone", strength=12.0)
    d = load(os.path.join(attached, "17.webp"))
    h, w = d.shape[:2]
    rubble = d[int(h * 0.80):int(h * 0.995), int(w * 0.0):int(w * 0.5)]
    rubble = np.asarray(Image.fromarray((rubble * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
    add("rubble", wrap_xy(rubble), "stone", strength=12.0)
    rgb, alpha = leaves()
    rgb = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
    add("leaves", rgb, "other", alpha)
    add("bark", wrap_xy(np.asarray(Image.fromarray((np.transpose(planks * np.array([0.5, 0.45, 0.4], dtype=np.float32), (1, 0, 2)) * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255), "wood", strength=14.0)
    for name, base, dark in (("cloth_red", (0.42, 0.09, 0.07), (0.25, 0.05, 0.04)),
                             ("cloth_oat", (0.62, 0.52, 0.36), (0.42, 0.34, 0.22))):
        c = cloth(base, dark)
        c = np.asarray(Image.fromarray((c * 255).astype(np.uint8)).resize(SIZE, Image.BICUBIC), dtype=np.float32) / 255
        add(name, c, "other", strength=2.0)

    # Ground: three of each, kept square. Colour plus (normal xy, rough, height).
    ground = []
    for i, (src, nm) in enumerate(((1, "dirt_1"), (2, "dirt_2"), (3, "dirt_3"), (4, "grass_1"), (5, "grass_2"), (6, "grass_3"))):
        a = wrap_xy(load(os.path.join(attached, f"{src}.webp")))
        save_pair(a, None, "ground", out, nm, 8.0, (1024, 1024), (512, 512))
        ground.append(nm)
        print(nm)

    with open(os.path.join(out, "manifest.json"), "w") as f:
        json.dump({"size": SIZE, "detail": DETAIL, "layers": layers, "ground": ground}, f, indent=1)
    total = sum(os.path.getsize(os.path.join(out, n)) for n in os.listdir(out))
    print(f"{len(layers)} layers, {total / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
