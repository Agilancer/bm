"""How a finger is nudged onto the picture. Shared by fit_fingers.py, which finds the amounts, and fix.py, which makes the move
through Blender MCP. t runs along the finger's own surface, from 0 where it leaves the hand to 1 at its tip, so nothing moves at
the finger's base, and nothing outside the finger moves at all.
"""
import numpy as np

KNOTS = (0.0, 0.33, 0.66, 1.0)      # (nudges in the picture's plane, and each finger's thickness, at each of these)


def camera_axes(c):
    eye, at = np.array(c["eye"]), np.array(c["at"])
    z = at - eye
    z = z / np.linalg.norm(z)
    x = np.cross(z, [0, 0, 1.0])
    x /= np.linalg.norm(x)
    return eye, x, np.cross(x, z), z


def axis_of(p, t, deg=2):
    """A curve down the middle of the finger, against t: past its webby base, which would pull it sideways."""
    m = t > 0.2
    if m.sum() < deg + 2:
        return np.tile(p.mean(0), (len(p), 1))
    co = np.linalg.lstsq(np.vander(t[m], deg + 1), p[m], rcond=None)[0]
    tt = np.maximum(t, 0.2)
    return np.vander(tt, deg + 1) @ co


def nudge(p, t, x, cam):
    """p, the finger's vertices; t, their place along it; x, what's fitted: three nudges in picture pixels, and three thicknesses."""
    eye, cx, cy, cz = camera_axes(cam)
    dv = np.stack([np.interp(t ** 1.5, KNOTS, [0, x[i], x[i + 2], x[i + 4]]) for i in (0, 1)], 1)     # (eased in from the base)
    k = np.interp(t, KNOTS, (1.0, x[6], x[7], x[8]))
    axis = axis_of(p, t)
    out = axis + (p - axis) * k[:, None]
    depth = (p - eye) @ cz
    return out + (dv[:, 0, None] * cx - dv[:, 1, None] * cy) * (depth / cam["f"])[:, None]
