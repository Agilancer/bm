"""Flat pictures of a dragon's vertices and bones, three ways (side, top, front), for fitting a skeleton by eye.

    from plot import views
    views(P, colors, joints=[(name, pos, parent_pos)], path='x.png')
"""
import colorsys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

VIEWS = {
    # name: (horizontal axis, sign, vertical axis, sign) in glTF axes (0 x across, 1 up, 2 forward)
    'side': (2, -1, 1, 1),     # seen from the dragon's right (-X): the snout to the left... (forward is screen left)
    'top': (0, -1, 2, 1),      # seen from above: snout up the page, its left (+X) on screen left
    'front': (0, -1, 1, 1),    # seen from in front: its left on screen right... no, on screen left, as a mirror
    'back': (0, 1, 1, 1),
    'below': (0, 1, 2, 1),     # seen from underneath: snout up the page
}


def palette(n, s=0.75, v=0.95):
    return [tuple(int(255 * c) for c in colorsys.hsv_to_rgb((i * 0.618) % 1, s, v)) for i in range(n)]


def views(P, colors, joints=(), path='plot.png', which=('side', 'top', 'front'), size=900, labels=True, focus=None, pad=0.04, grid=None, tri=None):
    """colors: (N,3) uint8. joints: (name, pos, parent_pos or None). focus: (lo, hi) box to frame, else all of P."""
    lo, hi = (P.min(0), P.max(0)) if focus is None else focus
    tiles = []
    try:
        font = ImageFont.truetype('arial.ttf', 11)
    except OSError:
        font = ImageFont.load_default()
    for name in which:
        ha, hs, va, vs = VIEWS[name]
        span = max(hi[ha] - lo[ha], hi[va] - lo[va]) * (1 + 2 * pad)
        cx, cy = (lo[ha] + hi[ha]) / 2, (lo[va] + hi[va]) / 2

        def px(p):
            return (size / 2 + hs * (p[..., ha] - cx) / span * size, size / 2 - vs * (p[..., va] - cy) / span * size)
        img = Image.new('RGB', (size, size), (24, 24, 28))
        arr = np.asarray(img).copy()
        # depth order: far points first
        depth_axis = [a for a in range(3) if a not in (ha, va)][0]
        sgn = {'side': -1, 'top': 1, 'front': 1, 'back': -1, 'below': -1}[name]
        order = np.argsort(sgn * P[:, depth_axis])
        u, v = px(P[order])
        ok = (u >= 0) & (u < size - 1) & (v >= 0) & (v < size - 1)
        ui, vi = u[ok].astype(int), v[ok].astype(int)
        arr[vi, ui] = colors[order][ok]
        arr[vi, ui + 1] = colors[order][ok]
        img = Image.fromarray(arr)
        d = ImageDraw.Draw(img)
        if tri is not None:
            img = Image.new('RGB', (size, size), (24, 24, 28))
            d = ImageDraw.Draw(img)
            T = tri[np.all(np.isin(tri, np.nonzero(np.ones(len(P), bool))[0]), 1)]
            cz = sgn * P[T].mean(1)[:, depth_axis]
            uu, vv = px(P)
            for t in T[np.argsort(cz)]:
                c = tuple(int(x) for x in colors[t].mean(0))
                d.polygon([(uu[t[0]], vv[t[0]]), (uu[t[1]], vv[t[1]]), (uu[t[2]], vv[t[2]])], fill=c)
        if grid:
            for axis, horiz in ((ha, True), (va, False)):
                g0 = np.floor((cx if horiz else cy) - span / 2) if False else None
                a0 = (cx if horiz else cy) - span / 2
                k = np.ceil(a0 / grid)
                while k * grid < a0 + span:
                    val = k * grid
                    q = np.zeros(3); q[axis] = val; q[ha if not horiz else va] = (cy if horiz else cx)
                    x, y = px(q)
                    if horiz:
                        d.line([(x, 0), (x, size)], fill=(60, 60, 70)); d.text((x + 2, size - 14), f'{val:.2f}', fill=(140, 140, 160), font=font)
                    else:
                        d.line([(0, y), (size, y)], fill=(60, 60, 70)); d.text((2, y - 12), f'{val:.2f}', fill=(140, 140, 160), font=font)
                    k += 1
        for nm, p, pp in joints:
            x, y = px(np.asarray(p, float))
            if pp is not None:
                x0, y0 = px(np.asarray(pp, float))
                d.line([(x0, y0), (x, y)], fill=(255, 255, 255), width=2)
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(255, 255, 0), outline=(0, 0, 0))
            if labels and nm:
                d.text((x + 4, y - 6), nm, fill=(255, 255, 160), font=font)
        d.text((6, 6), name, fill=(200, 200, 200), font=font)
        tiles.append(img)
    out = Image.new('RGB', (size * len(tiles), size))
    for i, t in enumerate(tiles):
        out.paste(t, (i * size, 0))
    out.save(path)
    return path
