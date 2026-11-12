"""The lancers' spinning shields: the four golden shields of VELSCOUR's Lancer (its 44x56 turntables, art/lancer_shields:
a round one, a diamond, a kite and a tower, each with a painted front and a rear of dark hide and gold grips), made up
for a world in three dimensions. A shield twenty pixels wide has no detail to enlarge, so what's taken from each sheet is
what it is: how wide it stands to its height, where it's widest, and the wear of its gold. Its outline is drawn clean to
those measures, and its face is worked in relief: a rolled rim, a bead inside it, bosses, ridges and studs, and on the
rear the hide and the grips.

    python tools/shields/lancer_spin.py            (needs pillow, numpy, scipy)

Writes assets/game/fx/lancer_shields.webp (four shields across, front over rear: red the gold's tone, green and blue
the relief's lean, alpha less where it's hide) and src/gfx/shieldshapes.js (each outline, which the renderer builds its
mesh from: src/gfx/spellfx.js). `--sheet` also writes tools/build/lancer_shields.png to look at.

No letters on them, and nothing that reads as one (CLAUDE.md, the two sides): no chevrons, no bar across a bar's end
(the kite's ridge runs down from its boss, never up to its top edge).
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "art", "lancer_shields")
NAMES = ["round", "diamond", "kite", "tower"]
FW, FH, FRONT, BACK = 44, 56, 0, 4     # the turntable's cells; which hold the two faces
CELL, TALL = 384, 348                  # an atlas cell, and how tall a shield stands in it
SPOKES = 96                            # points round an outline
HALF = TALL / 2
RIM, BEAD = 0.075, 0.16                # the rolled edge's width, and how far in the bead runs (half heights)

yy, xx = np.mgrid[0:CELL, 0:CELL]
U = (xx + 0.5 - CELL / 2) / HALF       # across, to the right as you face it
V = (CELL / 2 - yy - 0.5) / HALF       # up


def measure(name):
    """What the old sheet says of a shield: its width to its height, how far down it's widest, and its gold's wear."""
    im = Image.open(os.path.join(SRC, f"spinning_{name}.png")).convert("RGBA")
    out = []
    for f in (FRONT, BACK):
        px = np.asarray(im.crop(((f % 4) * FW, (f // 4) * FH, (f % 4 + 1) * FW, (f // 4 + 1) * FH)), dtype=np.float32) / 255
        lab, n = nd.label(px[..., 3] > 0.1, structure=np.ones((3, 3)))
        big = 1 + int(np.argmax(nd.sum(np.ones_like(lab), lab, range(1, n + 1))))
        mask = (lab == big) & (px[..., 3] > 0.35)
        ys, xs = np.nonzero(mask)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        lum = (px[..., 0] * 0.4 + px[..., 1] * 0.45 + px[..., 2] * 0.15) * mask
        # The wear: the paint's light and dark, far too soft to show a pixel, stretched over the new face.
        k = TALL / (y1 - y0)
        w = int(round((x1 - x0) * k))
        soft = lambda a: np.asarray(Image.fromarray(a[y0:y1, x0:x1].astype(np.float32), mode="F").resize((w, TALL), Image.BICUBIC), dtype=np.float32)
        a = nd.gaussian_filter(soft(mask.astype(np.float32)), k * 0.9)
        t = nd.gaussian_filter(soft(lum), k * 0.9) / np.maximum(a, 0.05)
        wear = np.full((CELL, CELL), float(t.mean()), np.float32)
        px0, py0 = (CELL - w) // 2, (CELL - TALL) // 2
        wear[py0:py0 + TALL, max(px0, 0):max(px0, 0) + w] = t
        wear = (wear - wear[py0:py0 + TALL, px0:px0 + w].mean()) / max(float(t.std()), 1e-3)
        rows = mask.sum(1)[y0:y1]
        out.append(wear)
    return (x1 - x0) / (y1 - y0), float(np.argmax(rows)) / (y1 - y0), out


def outline(name, hw, widest):
    """The shield's edge, clean: corner points in half heights, joined and rounded."""
    S = 4
    im = Image.new("L", (CELL * S, CELL * S), 0)
    d = ImageDraw.Draw(im)
    P = lambda pts: [((u * HALF + CELL / 2) * S, (CELL / 2 - v * HALF) * S) for u, v in pts]
    arc = lambda a, b, c, n=24: [((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]) for t in np.linspace(0, 1, n)]
    side = lambda right: right + [(-u, v) for u, v in reversed(right)]
    if name == "round":
        d.ellipse(P([(-hw, 1), (hw, -1)])[0] + P([(-hw, 1), (hw, -1)])[1], fill=255)
    elif name == "diamond":            # four points, its sides bowed out a little
        d.polygon(P(side(arc((0, 1), (hw, 0), (hw * 0.6, 0.6)) + arc((hw, 0), (0, -1), (hw * 0.6, -0.6)))), fill=255)
    elif name == "kite":               # a low peak, square shoulders, and long curved sides to its point
        sh = 1 - 2 * widest
        d.polygon(P(side(arc((0, 1), (hw, 0.9), (hw * 0.5, 0.98)) + [(hw, sh)] + arc((hw, sh), (0, -1), (hw * 0.96, -0.3)))), fill=255)
    else:                              # a tall board, its top arched and its corners taken off
        d.polygon(P(side(arc((0, 1), (hw, 0.9), (hw * 0.6, 1.0)) + [(hw, -0.88)] + arc((hw, -0.88), (0, -1), (hw * 0.8, -1.0)))), fill=255)
    a = np.asarray(im.resize((CELL, CELL), Image.LANCZOS), dtype=np.float32) / 255
    a = nd.gaussian_filter(a, 4 if name != "round" else 1)       # (a point of gold is rounded, not a needle)
    radii = []
    for i in range(SPOKES):
        ang = i * 2 * np.pi / SPOKES
        r = np.arange(0, CELL * 0.7, 0.25)
        x = np.clip(CELL / 2 + np.cos(ang) * r - 0.5, 0, CELL - 1)
        y = np.clip(CELL / 2 - np.sin(ang) * r - 0.5, 0, CELL - 1)
        hit = nd.map_coordinates(a, [y, x], order=1) > 0.5
        radii.append(float(r[np.nonzero(hit)[0].max()]) / HALF)
    radii = np.array(radii)
    radii = 0.5 * (radii + radii[(SPOKES // 2 - np.arange(SPOKES)) % SPOKES])   # the same either side
    ang = np.arctan2(V, U) % (2 * np.pi)
    edge = np.interp(ang, np.arange(SPOKES + 1) * 2 * np.pi / SPOKES, np.append(radii, radii[0]))
    return radii, np.hypot(U, V) < edge


# Raised things, each 0..1: a bar between two points, a stud, a ring.
def bar(u0, v0, u1, v1, w):
    du, dv = u1 - u0, v1 - v0
    t = np.clip(((U - u0) * du + (V - v0) * dv) / (du * du + dv * dv), 0, 1)
    q = np.hypot(U - u0 - du * t, V - v0 - dv * t) / w
    return np.sqrt(np.clip(1 - q * q, 0, 1))


def stud(u, v, r):
    q = np.hypot(U - u, V - v) / r
    return np.sqrt(np.clip(1 - q * q, 0, 1))


def ring(u, v, r, w):
    q = (np.hypot(U - u, V - v) - r) / w
    return np.sqrt(np.clip(1 - q * q, 0, 1))


def build(name):
    hw, widest, wear = measure(name)
    radii, shape = outline(name, hw, widest)
    d = nd.distance_transform_edt(shape) / HALF                   # how far in from the edge, in half heights
    rim = np.clip(d / (RIM * 0.3), 0, 1) ** 0.6 * np.sqrt(np.clip(1 - np.clip((d - RIM * 0.45) / (RIM * 0.55), 0, 1) ** 2, 0, 1))
    bead = np.sqrt(np.clip(1 - ((d - BEAD) / 0.016) ** 2, 0, 1))
    field = np.clip((d - RIM) / 0.02, 0, 1)                       # the face inside the rim
    inner = np.clip((d - BEAD - 0.02) / 0.02, 0, 1)               # and inside the bead
    edge = lambda a: np.interp(a % (2 * np.pi), np.arange(SPOKES + 1) * 2 * np.pi / SPOKES, np.append(radii, radii[0]))
    # Studs between the rim and the bead, evenly round it.
    studs = np.zeros_like(U)
    n = {"round": 16, "diamond": 12, "kite": 14, "tower": 16}[name]
    for i in range(n):
        a = (i + 0.5) * 2 * np.pi / n
        r = edge(a) - (RIM + BEAD) / 2 - 0.012
        if name != "round":                                        # (a spoke meets a straight side aslant: come in square to it)
            r -= 0.02
        studs = np.maximum(studs, stud(np.cos(a) * r, np.sin(a) * r, 0.022))
    faces = []
    for rear in (False, True):
        hide = np.zeros_like(U)
        # (each: its height, and how bright its gold)
        parts = [(rim, 1.0, 0.9), (bead * field, 0.45, 0.85)]
        if not rear:
            parts.append((studs * field, 0.5, 1.0))
            if name == "round":
                parts += [(stud(0, 0, 0.24), 1.6, 0.95), (ring(0, 0, 0.3, 0.022), 0.6, 0.85), (ring(0, 0, 0.56, 0.018) * inner, 0.4, 0.8)]
                for i in range(8):
                    a = i * np.pi / 4
                    parts.append((bar(np.cos(a) * 0.34, np.sin(a) * 0.34, np.cos(a) * 0.53, np.sin(a) * 0.53, 0.02), 0.4, 0.8))
                    parts.append((stud(np.cos(a + np.pi / 8) * 0.44, np.sin(a + np.pi / 8) * 0.44, 0.03), 0.5, 1.0))
            elif name == "diamond":
                parts += [(stud(0, 0, 0.17), 1.5, 0.95), (ring(0, 0, 0.22, 0.02), 0.6, 0.85)]
                parts += [(bar(0, 0.25, 0, 0.72, 0.022) * inner, 0.5, 0.85), (bar(0, -0.25, 0, -0.72, 0.022) * inner, 0.5, 0.85)]
                parts += [(bar(0.25, 0, hw * 0.66, 0, 0.022) * inner, 0.5, 0.85), (bar(-0.25, 0, -hw * 0.66, 0, 0.022) * inner, 0.5, 0.85)]
                parts += [(stud(s * 0.17, t * 0.25, 0.03), 0.5, 1.0) for s in (-1, 1) for t in (-1, 1)]
            elif name == "kite":
                parts += [(bar(0, 0.3, 0, -0.66, 0.03) * inner, 0.9, 0.9), (stud(0, 0.36, 0.13), 1.4, 0.95), (ring(0, 0.36, 0.17, 0.018), 0.5, 0.85)]
                parts += [(stud(s * 0.24, 0.36, 0.03), 0.5, 1.0) for s in (-1, 1)] + [(stud(0, -0.2, 0.035), 0.6, 1.0)]
            else:
                parts += [(bar(0, 0.78, 0, -0.78, 0.035) * inner, 0.9, 0.9)]
                parts += [(bar(-hw, v, hw, v, 0.026) * inner, 0.6, 0.85) for v in (0.42, -0.42)]
                parts += [(stud(0, v, 0.075), 1.2, 0.97) for v in (0.42, -0.42, 0)]
                parts += [(stud(s * hw * 0.42, v, 0.03), 0.5, 1.0) for s in (-1, 1) for v in (0.66, 0.0, -0.66)]
        else:
            # The rear as the old sheet has it: dark hide inside the gold, and the grips it's held by.
            hide = inner.copy()
            grips = []
            if name == "round":
                grips = [bar(-0.42, 0.06, 0.42, 0.06, 0.05), stud(-0.5, 0.06, 0.08), stud(0.5, 0.06, 0.08)]
            elif name == "diamond":
                grips = [bar(0, 0.34, 0, -0.34, 0.045), stud(0, 0.42, 0.07), stud(0, -0.42, 0.07)]
            elif name == "kite":
                grips = [bar(-hw * 0.6, 0.42, hw * 0.6, 0.42, 0.04), bar(-hw * 0.5, 0.0, hw * 0.5, 0.0, 0.04)] + [stud(s * hw * k, v, 0.06) for s in (-1, 1) for k, v in ((0.66, 0.42), (0.56, 0.0))]
            else:
                grips = [bar(0, 0.4, 0, -0.4, 0.045), stud(0, 0.48, 0.07), stud(0, -0.48, 0.07)]
            for g in grips:
                parts.append((g, 1.1, 0.9))
                hide *= 1 - np.clip(g * 3, 0, 1)
        height = np.zeros_like(U)
        tone = field * (0.52 + 0.1 * np.clip(wear[1 if rear else 0], -2, 2))      # the plain face, worn as the paint was
        for p, hgt, lum in parts:
            height = np.maximum(height, p * hgt)
            tone = np.where(p > 0.02, np.maximum(tone, lum * (0.55 + 0.45 * p)), tone)
        # Hammered: the face is never quite flat. And the hollows round what's raised are darker than its paint.
        rng = np.random.default_rng(7 + rear)
        dimple = nd.gaussian_filter(rng.standard_normal(U.shape), 4)
        height += field * dimple / dimple.std() * (0.035 if not rear else 0.06)
        height = nd.gaussian_filter(height, 1.0)
        hollow = np.clip(nd.gaussian_filter(height, 7) - height, 0, 1)
        tone = np.clip(nd.gaussian_filter(tone, 1.0) * (1 - 1.6 * hollow), 0.04, 1)
        gy, gx = np.gradient(height)
        s = 8.5
        nx, ny, nz = -gx * s, gy * s, np.ones_like(gx)             # (ny: up the shield, which is up the picture)
        L = np.sqrt(nx * nx + ny * ny + nz * nz)
        # (Paint carried out past the edge, so a far-off shield's rim doesn't pick up nothing.)
        tone = np.where(shape, tone, 0.8)
        faces.append(np.stack([tone, nx / L * 0.5 + 0.5, ny / L * 0.5 + 0.5, 1 - 0.75 * nd.gaussian_filter(hide, 1.5)], -1))
    return faces, radii


def main():
    atlas = np.zeros((CELL * 2, CELL * len(NAMES), 4), np.float32)
    shapes = {}
    for i, name in enumerate(NAMES):
        (front, rear), radii = build(name)
        atlas[:CELL, i * CELL:(i + 1) * CELL] = front
        atlas[CELL:, i * CELL:(i + 1) * CELL] = rear
        shapes[name] = [round(float(r), 4) for r in radii]
    out = Image.fromarray((np.clip(atlas, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    os.makedirs(os.path.join(ROOT, "assets", "game", "fx"), exist_ok=True)
    out.save(os.path.join(ROOT, "assets", "game", "fx", "lancer_shields.webp"), lossless=True, exact=True, method=6)
    with open(os.path.join(ROOT, "src", "gfx", "shieldshapes.js"), "w", newline="\n") as f:
        f.write("// Written by tools/shields/lancer_spin.py: don't edit. The lancers' four spinning shields (VELSCOUR's, made up in size).\n")
        f.write("// Each outline: how far it is from the middle to the edge along each of its spokes, the first to the right as you face\n")
        f.write("// it, then on up over its top; in half heights. SHIELD_CELL: how much of an atlas cell one half height is.\n")
        f.write(f"export const SHIELD_NAMES = {json.dumps(NAMES)};\n")
        f.write(f"export const SHIELD_CELL = {HALF / CELL};\n")
        f.write("export const SHIELD_OUTLINE = {\n")
        for name in NAMES:
            f.write(f"  {name}: {json.dumps(shapes[name]).replace(' ', '')},\n")
        f.write("};\n")
    if "--sheet" in sys.argv:
        a = np.clip(atlas, 0, 1)
        tone, nx, ny = a[..., 0], a[..., 1] * 2 - 1, a[..., 2] * 2 - 1
        nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
        lit = np.clip(nx * -0.45 + ny * 0.55 + nz * 0.7, 0, 1)[..., None]      # a light up and to the left
        gold = np.array([1.0, 0.66, 0.2]) * (0.2 + 1.0 * tone[..., None]) * (0.25 + 0.95 * lit) + (lit ** 30) * 0.6
        hide = np.array([0.22, 0.12, 0.06]) * (0.4 + 0.9 * lit)
        lth = ((1 - a[..., 3]) / 0.75)[..., None]
        rgb = gold * (1 - lth) + hide * lth
        os.makedirs(os.path.join(ROOT, "tools", "build"), exist_ok=True)
        Image.fromarray((np.clip(rgb, 0, 1) ** (1 / 2.2) * 255).astype(np.uint8)).resize((CELL * 2, CELL), Image.LANCZOS).save(os.path.join(ROOT, "tools", "build", "lancer_shields.png"))


if __name__ == "__main__":
    main()
