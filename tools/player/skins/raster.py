"""A small software rasteriser: which triangle covers each pixel, and where in it (numpy only)."""
import numpy as np


def raster(xy, tris, width, height, depth=None):
    """xy: (n, 2) points in pixels. depth: (n,) smaller is nearer, or None to let later triangles win.
    Returns (tri, bary): the triangle at each pixel (-1: none) and its three weights there."""
    tri = np.full((height, width), -1, np.int32)
    bary = np.zeros((height, width, 3), np.float32)
    zbuf = np.full((height, width), np.inf, np.float32)
    p = xy[tris]
    lo = np.floor(p.min(1)).astype(int)
    hi = np.ceil(p.max(1)).astype(int)
    area = (p[:, 1, 0] - p[:, 0, 0]) * (p[:, 2, 1] - p[:, 0, 1]) - (p[:, 2, 0] - p[:, 0, 0]) * (p[:, 1, 1] - p[:, 0, 1])
    for t in range(len(tris)):
        a = area[t]
        if abs(a) < 1e-12:
            continue
        x0, y0, x1, y1 = max(lo[t, 0], 0), max(lo[t, 1], 0), min(hi[t, 0], width - 1), min(hi[t, 1], height - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs = np.arange(x0, x1 + 1) + 0.5
        ys = np.arange(y0, y1 + 1) + 0.5
        gx, gy = np.meshgrid(xs, ys)
        (ax, ay), (bx, by), (cx, cy) = p[t]
        w0 = ((bx - gx) * (cy - gy) - (cx - gx) * (by - gy)) / a
        w1 = ((cx - gx) * (ay - gy) - (ax - gx) * (cy - gy)) / a
        w2 = 1 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not inside.any():
            continue
        if depth is not None:
            d = depth[tris[t]]
            z = (w0 * d[0] + w1 * d[1] + w2 * d[2]).astype(np.float32)
            inside &= z < zbuf[y0:y1 + 1, x0:x1 + 1]
            zbuf[y0:y1 + 1, x0:x1 + 1][inside] = z[inside]
        tri[y0:y1 + 1, x0:x1 + 1][inside] = t
        sub = bary[y0:y1 + 1, x0:x1 + 1]
        sub[inside, 0] = w0[inside]; sub[inside, 1] = w1[inside]; sub[inside, 2] = w2[inside]
    return tri, bary


def grow(labels, empty, rounds):
    """Labels spread into the empty pixels beside them, a pixel a round: so nothing bleeds in at an island's edge."""
    out = labels.copy()
    for _ in range(rounds):
        hole = out == empty
        if not hole.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            near = np.roll(out, (dy, dx), (0, 1))
            take = hole & (near != empty)
            out[take] = near[take]
            hole = out == empty
    return out
