"""Cut the owner's generated sheets into single textures, each measured on its own.

Tile sheets: find the gutter between the tiles from the sheet's own brightness, then slide each edge a little either way
until the opposite edges match best, since that's where the tile wraps. Banner and window sheets: find each piece by what
isn't black, and turn the black around it into alpha.

Usage: python cut_sheets.py ATTACHED_DIR F_TEXTURES_DIR OUT_DIR
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

# The attached images, by number: which is which, in the order the owner sent them.
BANNERS = {1: 'tess_a', 2: 'tess_b', 3: 'tess_c', 4: 'tess_d', 5: 'vel_a', 6: 'vel_b', 7: 'vel_c', 8: 'vel_d'}
WINDOWS = {9: 'glass_a', 10: 'glass_b', 11: 'glass_c', 12: 'glass_d', 13: 'glass_e'}
WOOD = {14: 'lacquer_a', 15: 'lacquer_b', 16: 'lacquer_c'}
ROSE = 17
# On the F: drive, 2 x 2 unless it says otherwise.
TILES = {f'Catacombs Seamless Tiles {i}': f'cata_{i}' for i in range(1, 9)}
TILES.update({'Catacombs Seamless Tiles 9 - VELSCOUR V': 'cata_9', 'Catacombs Seamless Tiles 10 - VELSCOUR V': 'cata_10', 'Catacombs Seamless Tiles 11 - VELSCOUR V': 'cata_11'})
TILES.update({f'Stone Church Walls {i}': f'church_{i}' for i in range(1, 5)})
TILES.update({f'White Marble Texture {i}': f'marble_{i}' for i in (1, 2)})
TILES.update({f'Inside Castle Keep {i}': f'keep_{i}' for i in (2, 3, 7)})
PANELS = {f'Catacombs Seamless Tiles Vertical Breakup {i}': f'panel_{i}' for i in range(1, 7)}


def lum(a):
    return a @ np.array([0.2126, 0.7152, 0.0722])


def gutter(profile, centre, reach=60):
    """Where the sheet's dividing line is, near centre: the column whose brightness breaks most from its neighbours."""
    best, at = -1e9, centre
    for x in range(centre - reach, centre + reach):
        lo, hi = max(0, x - 6), min(len(profile), x + 7)
        around = np.median(np.r_[profile[lo:x], profile[x + 1:hi]])
        score = abs(profile[x] - around) - abs(x - centre) * 0.004
        if score > best:
            best, at = score, x
    return at


def wrap_cost(a, axis, lo, hi):
    """How far apart the two edges are, against how far apart any two neighbouring rows inside the tile are."""
    if axis == 1:
        a = a.transpose(1, 0, 2)
    seam = np.abs(a[lo] - a[hi]).mean()
    inside = np.abs(np.diff(a[lo + 8:hi - 8, ::4], axis=0)).mean() + 1e-4
    return seam / inside


def best_edges(a, axis, lo0, hi0, slide=14):
    """Slide both edges for the cut that wraps best. Never in past a frame: the tile keeps as much of itself as it can."""
    best = (1e9, lo0, hi0)
    n = a.shape[axis]
    for lo in range(max(0, lo0 - 3), lo0 + slide):
        for hi in range(min(n - 1, hi0 + 3), hi0 - slide, -1):
            c = wrap_cost(a, axis, lo, hi) + (lo - lo0 + hi0 - hi) * 0.002
            if c < best[0]:
                best = (c, lo, hi)
    return best


def frame_in(mean, start, step, limit=20):
    """Walk in from a sheet's edge or gutter past the frame: a line whose average colour isn't the colour of the lines inside it."""
    x = start
    for _ in range(limit):
        inner = np.median(mean[x + step * 3:x + step * 15:step] if step > 0 else mean[x - 14:x - 2], axis=0)
        if np.abs(mean[x] - inner).max() < 0.028:
            break
        x += step
    return x + step   # (and one more: the frame's last line is half blended into the picture)


def cut_grid(sheet, cols, rows):
    a = sheet.astype(np.float32) / 255
    h, w = a.shape[:2]
    pc, pr = lum(a).mean(0), lum(a).mean(1)
    mc, mr = a.mean(0), a.mean(1)
    xs = [0] + [gutter(pc, w * i // cols) for i in range(1, cols)] + [w - 1]
    ys = [0] + [gutter(pr, h * j // rows) for j in range(1, rows)] + [h - 1]
    out = []
    for j in range(rows):
        for i in range(cols):
            sub_x0, sub_x1 = xs[i], xs[i + 1]
            sub_y0, sub_y1 = ys[j], ys[j + 1]
            x0 = frame_in(mc, sub_x0, 1); x1 = frame_in(mc, sub_x1, -1)
            y0 = frame_in(mr, sub_y0, 1); y1 = frame_in(mr, sub_y1, -1)
            band = a[y0:y1 + 1]
            cx, x0, x1 = best_edges(band, 1, x0, x1)
            band = a[:, x0:x1 + 1]
            cy, y0, y1 = best_edges(band, 0, y0, y1)
            # (The two edges are the same line of the tile, so one of them goes: hi is exclusive.)
            out.append(dict(box=[int(x0), int(y0), int(x1), int(y1)], cost=[round(float(cx), 2), round(float(cy), 2)]))
    return out


def alpha_of(rgb):
    """The black around a cut-out goes; black inside it stays. Flood from the sheet's edge through the near black."""
    h, w = rgb.shape[:2]
    dark = rgb.max(2) < 9
    seen = np.zeros((h, w), bool)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if dark[y, x]] + [(y, x) for y in range(h) for x in (0, w - 1) if dark[y, x]]
    while stack:
        y, x = stack.pop()
        if seen[y, x] or not dark[y, x]:
            continue
        seen[y, x] = True
        if y > 0: stack.append((y - 1, x))
        if y < h - 1: stack.append((y + 1, x))
        if x > 0: stack.append((y, x - 1))
        if x < w - 1: stack.append((y, x + 1))
    al = Image.fromarray((~seen * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    return np.asarray(al)


def solid(alpha, boxes):
    """Glass has no holes: everything between the first and last lit pixel of each row of a piece is the piece."""
    out = np.zeros_like(alpha)
    for x0, y0, x1, y1 in boxes:
        for y in range(y0, y1 + 1):
            c = np.where(alpha[y, x0:x1 + 1] > 128)[0]
            if len(c):
                out[y, x0 + c[0]:x0 + c[-1] + 1] = 255
    return np.asarray(Image.fromarray(out).filter(ImageFilter.GaussianBlur(0.6)))


def pieces(alpha, want):
    """Split into `want` pieces along the widest empty columns, then trim each to what's in it."""
    used = (alpha > 128).sum(0)
    w = len(used)
    runs, x = [], 0
    while x < w:
        if used[x] < 2:
            y = x
            while y < w and used[y] < 2:
                y += 1
            if x > 0 and y < w:
                runs.append((y - x, x, y))
            x = y
        else:
            x += 1
    runs.sort(reverse=True)
    cuts = sorted((a + b) // 2 for _, a, b in runs[:want - 1])
    if len(cuts) < want - 1:   # (their finials touch: cut at the thinnest column round the middle)
        m = w // 2
        cuts = [m - 40 + int(np.argmin(used[m - 40:m + 40]))]
    edges = [0] + cuts + [w]
    boxes = []
    for i in range(want):
        c = np.where(used[edges[i]:edges[i + 1]] >= 2)[0]
        rows = np.where((alpha[:, edges[i]:edges[i + 1]] > 128).sum(1) >= 2)[0]
        boxes.append([int(edges[i] + c[0]), int(rows[0]), int(edges[i] + c[-1]), int(rows[-1])])
    return boxes


def main(att, fdir, out):
    os.makedirs(out, exist_ok=True)
    report = {}

    def tiles(rgb, name, cols, rows):
        for k, t in enumerate(cut_grid(rgb, cols, rows)):
            x0, y0, x1, y1 = t['box']
            # (hi is the same line as lo when it wraps, so stop one short of it)
            Image.fromarray(rgb[y0:y1, x0:x1]).save(f'{out}/{name}_{k}.webp', quality=92)
            report[f'{name}_{k}'] = t

    for num, name in {**BANNERS, **WINDOWS, ROSE: 'rose'}.items():
        rgb = np.asarray(Image.open(f'{att}/{num}.webp').convert('RGB'))
        al = alpha_of(rgb)
        n = 1 if num == ROSE else 2
        boxes = pieces(al, n)
        if num not in BANNERS:
            al = solid(al, boxes)
        for k, b in enumerate(boxes):
            x0, y0, x1, y1 = b
            rgba = np.dstack([rgb, al])[y0:y1 + 1, x0:x1 + 1]
            Image.fromarray(rgba, 'RGBA').save(f'{out}/{name}_{k}.webp', lossless=False, quality=94, alpha_quality=100)
            report[f'{name}_{k}'] = dict(box=b)
    for num, name in WOOD.items():
        tiles(np.asarray(Image.open(f'{att}/{num}.webp').convert('RGB')), name, 2, 2)
    for f, name in TILES.items():
        tiles(np.asarray(Image.open(f'{fdir}/{f}.png').convert('RGB')), name, 2, 2)
    for f, name in PANELS.items():
        # Four panels side by side: they repeat upward, and each stands alone across.
        im = Image.open(f'{fdir}/{f}.png').convert('RGB')
        tiles(np.asarray(im), name, 4, 1)
    with open(f'{out}/cuts.json', 'w') as fp:
        json.dump(report, fp, indent=0)
    bad = sorted(((max(v['cost']), k) for k, v in report.items() if 'cost' in v), reverse=True)
    print(len(report), 'pieces. Worst wraps:', bad[:12])


if __name__ == '__main__':
    main(*sys.argv[1:4])
