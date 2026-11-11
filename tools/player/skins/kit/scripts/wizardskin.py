"""Bellmourn's wizard: new gear painted onto his body, from a recipe.

His colour map is one 2048 x 2048 picture that Tripo cut into hundreds of scraps: nobody can paint on it by eye. So a
set of gear is painted in his own space instead. Every texel of the map knows which part of his gear it is (template/
parts.png), where on his body it lies and which way it faces (template/geometry.npz), and what it was painted as: cloth,
gilt trim, or leather. A recipe says what each of those becomes for each part, and this bakes it:

  - a colour, or a tiling picture (a "swatch") laid over him in 3D so it never shows a seam at the map's scraps;
  - the folds, shading and stitching of the sculpt's own paint kept on top, so it still reads as cloth on a body;
  - a second-colour pattern (brocade, scales, runes) woven into the cloth;
  - emblems ("decals") projected onto named places: the chest, the back, the tabard, the hat, the shoulders, the knees.

Skin, hair and eyes are never touched. See README.md for the recipe's fields, and scripts/make_set.py to run one.
Needs only numpy and Pillow."""
import json
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
TEMPLATE = os.path.join(KIT, "template")
PARTS = ["none", "head", "shoulders", "chest", "legs", "feet"]
MATERIALS = ["cloth", "trim", "leather"]
GUARDS_TOP = 0.56        # (m) the knee guards reach this high; above, the legs are trousers
FORMAT = "bm-wizard-skin/1"
PALETTES = ["ash", "moss", "night", "crimson", "amethyst"]
SHAPES = {"head": ["pointed", "wide", "hood"], "chest": ["long", "jacket", "coat"], "shoulders": ["mantle", "cowl"], "legs": ["pants", "wraps"], "feet": ["boots", "curled"]}


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def rgb_of(c):
    """'#rrggbb', or [r, g, b] in 0..255 or 0..1, as floats 0..1."""
    if isinstance(c, str):
        c = c.lstrip("#")
        return np.array([int(c[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255
    c = np.array(c, np.float32)
    return c / 255 if c.max() > 1 else c


def hsv(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    sat = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    safe = np.maximum(d, 1e-6)
    hue = np.where(mx == r, ((g - b) / safe) % 6, np.where(mx == g, (b - r) / safe + 2, (r - g) / safe + 4)) * 60
    return np.where(d < 1e-6, 0, hue), sat, mx


class Template:
    """Everything the kit knows about his body, loaded once."""

    def __init__(self, folder=TEMPLATE):
        self.folder = folder
        self.base = np.asarray(Image.open(os.path.join(folder, "base_color.png")).convert("RGB"), np.float32) / 255
        self.size = self.base.shape[0]
        self.parts = np.asarray(Image.open(os.path.join(folder, "parts.png")))
        g = np.load(os.path.join(folder, "geometry.npz"))
        k = self.size // g["pos"].shape[0]
        up = lambda a: np.repeat(np.repeat(a, k, 0), k, 1)
        # Where each texel lies on him (metres: x his left, y up, z ahead, arms out as he was sculpted), and the way it faces.
        self.pos = up(g["pos"]).astype(np.float32) * g["pos_scale"] + g["pos_min"]
        self.nrm = up(g["nrm"]).astype(np.float32) / 127
        self.anchors = json.load(open(os.path.join(folder, "anchors.json")))
        v = np.load(os.path.join(folder, "views.npz"))
        self.views = [{"name": n, "uv": v[n + "_uv"], "shade": v[n + "_shade"]} for n in v["names"]]
        # What each texel was painted as. Gilt: the pale gold lines and studs. Cloth: the purple. Leather: everything else
        # that isn't skin (the boots, the belt, the trousers, the dark linings).
        h, s, val = hsv(self.base)
        gold = smooth(s, 0.14, 0.3) * smooth(val, 0.3, 0.5) * smooth(h, 22, 32) * (1 - smooth(h, 62, 80))
        b = self.base
        purple = smooth(b[..., 2] - np.maximum(b[..., 0] * 0.9, b[..., 1] * 1.05), 0.0, 0.05) * smooth(s, 0.1, 0.25)
        gold = gold * (1 - purple)
        leather = np.clip(1 - gold - purple, 0, 1)
        # The greaves and knee guards are painted worn: their scuffs and shadows aren't purple, and would be taken for the
        # trousers' leather, and show as stains of the trousers' colour on them. Below the knee guards' tops all that
        # isn't gilt is the guards' own cloth.
        guards = (self.parts == PARTS.index("legs")) & (self.pos[..., 1] < GUARDS_TOP)
        purple = np.where(guards, purple + leather, purple)
        leather = np.where(guards, 0, leather)
        self.mat = {"trim": gold, "cloth": purple, "leather": leather}
        self.lum = (b * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1)

    def mask(self, part):
        return self.parts == PARTS.index(part)

    @property
    def skin_views(self):
        """How each part's paint-over template lies on his body (templates/<part>_lines.png): made once, when first asked."""
        if not hasattr(self, "_skin_views"):
            self._skin_views = np.load(os.path.join(self.folder, "skin_views.npz"))
        return self._skin_views


def load_image(path, mode="RGB"):
    return np.asarray(Image.open(path).convert(mode), np.float32) / 255


def sample_tiling(img, u, v, tile="mirror"):
    """A picture read at (u, v) in tiles, with a little smoothing. mirror: every other tile flipped, so any picture tiles
    without a seam. repeat: laid side by side as it is (for pictures already made to tile)."""
    h, w = img.shape[:2]
    if tile == "mirror":
        u = np.abs(((u + 1) % 2) - 1)
        v = np.abs(((v + 1) % 2) - 1)
    else:
        u = u % 1
        v = v % 1
    x = u * (w - 1)
    y = v * (h - 1)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    x1 = np.minimum(x0 + 1, w - 1)
    y1 = np.minimum(y0 + 1, h - 1)
    fx = (x - x0)[..., None] if img.ndim == 3 else x - x0
    fy = (y - y0)[..., None] if img.ndim == 3 else y - y0
    return (img[y0, x0] * (1 - fx) + img[y0, x1] * fx) * (1 - fy) + (img[y1, x0] * (1 - fx) + img[y1, x1] * fx) * fy


def triplanar(img, pos, nrm, scale, tile="mirror"):
    """A tiling picture laid over him in 3D: seen from the front on what faces front, from the side on what faces
    sideways, from above on what faces up, blended between. scale: the size of one tile on him, in metres."""
    w = np.abs(nrm) ** 4 + 1e-5
    w /= w.sum(-1, keepdims=True)
    x, y, z = pos[..., 0] / scale, pos[..., 1] / scale, pos[..., 2] / scale
    expand = (lambda a: a[..., None]) if img.ndim == 3 else (lambda a: a)
    return (sample_tiling(img, x, -y, tile) * expand(w[..., 2]) + sample_tiling(img, z, -y, tile) * expand(w[..., 0])
            + sample_tiling(img, x, z, tile) * expand(w[..., 1]))


def _look(spec, default):
    """A material's entry in a recipe, filled out: a bare colour is a colour."""
    if spec is None:
        spec = {}
    if isinstance(spec, (str, list, tuple)):
        spec = {"color": spec}
    out = dict(default)
    out.update(spec)
    return out


def bake(recipe, template=None, folder="."):
    """The recipe painted onto his colour map. folder: where the recipe's pictures are found.
    Returns (colour map as floats 0..1, the parts it changed)."""
    T = template or Template()
    out = T.base.copy()
    defaults = recipe.get("defaults", {})
    done = []
    for part in PARTS[1:]:
        spec = recipe.get("parts", {}).get(part)
        if spec is None:
            continue
        m = T.mask(part)
        if not m.any():
            continue
        pos, nrm, lum, base = T.pos[m], T.nrm[m], T.lum[m], T.base[m]
        result = np.zeros_like(base)
        keep_trim = spec.get("keep_trim", defaults.get("keep_trim", True))
        weights = {k: T.mat[k][m] for k in MATERIALS}
        if not keep_trim:
            # A plain garment: the sculpt's gilt lines are painted over as cloth.
            weights["cloth"] = np.clip(weights["cloth"] + weights["trim"], 0, 1)
            weights["trim"] = np.zeros_like(weights["trim"])
        for name in MATERIALS:
            w = weights[name]
            if w.max() <= 0:
                continue
            look = _look(spec.get(name, defaults.get(name)), {"color": None, "swatch": None, "scale": 0.25, "tile": "mirror", "shading": 1.0, "bright": 1.0, "keep": 0.0})
            if look["color"] is None and look["swatch"] is None:
                result += base * w[:, None]        # (nothing said: left as it was)
                continue
            if look["swatch"]:
                colour = triplanar(load_image(os.path.join(folder, look["swatch"])), pos, nrm, float(look["scale"]), look["tile"])
                if look["color"] is not None:
                    colour = colour * rgb_of(look["color"])     # (a tint over a grey swatch)
            else:
                colour = np.broadcast_to(rgb_of(look["color"]), base.shape)
            # The sculpt's own light and dark, against what that material usually is in this part: folds, creases, the worn
            # edges of the gilt. shading: how much of it is kept (0 flat, 1 as painted, more for deeper folds).
            heavy = w > 0.5
            ref = np.median(lum[heavy]) if heavy.sum() > 50 else np.median(lum)
            shade = np.clip(lum / max(ref, 0.02), 0.05, 3.0) ** float(look["shading"])
            if name == "trim":
                shade = shade ** 1.15 * 1.05                  # (metal: brighter lights, darker pits)
            painted = np.clip(colour * shade[:, None] * float(look["bright"]), 0, 1)
            k = float(look["keep"])                           # (keep: how much of the original paint shows through, 0..1)
            result += (painted * (1 - k) + base * k) * w[:, None]
        # A second colour woven into the cloth: the picture's brightness (or its alpha) says where.
        pat = spec.get("pattern", defaults.get("pattern"))
        if pat:
            img = Image.open(os.path.join(folder, pat["image"]))
            a = np.asarray(img.convert("RGBA"), np.float32) / 255
            where = a[..., 3] if a[..., 3].min() < 0.99 else a[..., :3].mean(-1)
            amount = triplanar(where, pos, nrm, float(pat.get("scale", 0.2)), pat.get("tile", "mirror")) * float(pat.get("strength", 0.8)) * weights["cloth"]
            ref = np.median(lum[weights["cloth"] > 0.5]) if (weights["cloth"] > 0.5).sum() > 50 else np.median(lum)
            shade = np.clip(lum / max(ref, 0.02), 0.05, 3.0)
            ink = np.clip(rgb_of(pat.get("color", "#d8b25a")) * shade[:, None], 0, 1)
            result = result * (1 - amount[:, None]) + ink * amount[:, None]
        # A skin file: the part painted by hand (or by an image model) over its template. Over the materials above where
        # there were any; where the sheet can't see, those show.
        if spec.get("skin"):
            said = any(spec.get(k2) is not None or defaults.get(k2) is not None for k2 in MATERIALS)
            result = paint_skin(T, part, os.path.join(folder, spec["skin"]), pos, nrm, lum, result, weights, float(spec.get("skin_detail", 0.6)), fill=True if said else None)
        # Emblems, projected onto him from in front of where they go.
        for d in spec.get("decals", []):
            result = _decal(T, d, folder, pos, nrm, lum, result, weights)
        out[m] = np.clip(result, 0, 1)
        done.append(part)
    return out, done


# The six panels of a paint-over template, in the order they're laid out (three across, two down): the way each looks
# from, and the way that's up on it.
PANELS = [("front", [0, 0, 1], [0, 1, 0]), ("back", [0, 0, -1], [0, 1, 0]), ("left", [1, 0, 0], [0, 1, 0]),
          ("right", [-1, 0, 0], [0, 1, 0]), ("top", [0, 1, 0], [0, 0, -1]), ("under", [0, -1, 0], [0, 0, 1])]


def _bilinear(img, x, y):
    h, w = img.shape[:2]
    x = np.clip(x, 0, w - 1.001)
    y = np.clip(y, 0, h - 1.001)
    x0, y0 = x.astype(np.int32), y.astype(np.int32)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    if img.ndim == 2:
        fx, fy = fx[:, 0], fy[:, 0]
    return (img[y0, x0] * (1 - fx) + img[y0, x0 + 1] * fx) * (1 - fy) + (img[y0 + 1, x0] * (1 - fx) + img[y0 + 1, x0 + 1] * fx) * fy


def paint_skin(T, part, path, pos, nrm, lum, under, weights, detail=0.6, fill=None):
    """A part painted from its skin file: a picture drawn over templates/<part>_lines.png (any size, the same shape).
    Each texel takes its paint from the panels that see it, most from the one it faces. What no panel sees (a fold, the
    inside of a sleeve) takes `under`: the recipe's own bake if the part had one, else the painted colours' average on
    the sculpt's shading. detail: how much of the sculpt's fine relief is pressed back into the paint (0 none, 1 all)."""
    V = T.skin_views
    panel, scale, centres, zbuf = int(V["panel"]), float(V[part + "_scale"]), V[part + "_centre"], V[part + "_z"]
    skin = np.asarray(Image.open(path).convert("RGBA"), np.float32) / 255
    sh, sw = skin.shape[:2]
    if abs(sw / sh - 1.5) > 0.02:
        raise SystemExit(f"{path}: {sw} x {sh} isn't the template's shape (three panels across, two down: 3 to 2)")
    k = sw / (panel * 3)                              # (the skin's pixels to the template's)
    tdir = os.path.join(os.path.dirname(T.folder), "templates")
    inside = np.asarray(Image.open(os.path.join(tdir, part + "_mask.png")).resize((sw, sh), Image.BILINEAR), np.float32) / 255
    original = np.asarray(Image.open(os.path.join(tdir, part + "_original.jpg")).convert("L").resize((sw, sh), Image.BILINEAR), np.float32) / 255
    colour = np.zeros_like(under)
    total = np.zeros(len(pos), np.float32)
    relief = np.zeros(len(pos), np.float32)
    for i, (_, toward, up) in enumerate(PANELS):
        t, u = np.array(toward, np.float32), np.array(up, np.float32)
        r = np.cross(u, t)
        x = panel / 2 + (pos @ r - centres[i, 0]) * scale
        y = panel / 2 - (pos @ u - centres[i, 1]) * scale
        ok = (x >= 0) & (x < panel) & (y >= 0) & (y < panel)
        zi = zbuf[i][np.clip(y / 2, 0, panel // 2 - 1).astype(np.int32), np.clip(x / 2, 0, panel // 2 - 1).astype(np.int32)].astype(np.float32)
        seen = ok & (pos @ t > zi - 0.012)
        w = np.clip(nrm @ t, 0, 1) ** 2 * seen
        if not w.any():
            continue
        sx, sy = ((i % 3) * panel + x) * k - 0.5, ((i // 3) * panel + y) * k - 0.5
        hit = w > 0
        px = _bilinear(skin, sx[hit], sy[hit])
        # Only what's inside his outline on the sheet, and painted (a transparent skin is paint only where it's opaque).
        w_hit = w[hit] * px[:, 3] * smooth(_bilinear(inside, sx[hit], sy[hit]), 0.5, 0.95)
        colour[hit] += px[:, :3] * w_hit[:, None]
        relief[hit] += _bilinear(original, sx[hit], sy[hit]) * w_hit
        total[hit] += w_hit
    got = total > 1e-4
    out = under.copy()
    if not got.any():
        return out
    paint = colour[got] / total[got][:, None]
    # The sculpt's fine relief (stitching, the edges of the gilt), which the sheet is too coarse to carry: the map's own
    # light against the sheet's at the same place.
    if detail > 0:
        ratio = np.clip(lum[got] / np.maximum(relief[got] / total[got], 0.03), 0.7, 1.4)
        paint = np.clip(paint * (1 + (ratio[:, None] - 1) * detail), 0, 1)
    if fill is None:
        # Nothing baked under it: what the panels don't see takes the paint's own colours, by what the sculpt had there.
        for name in MATERIALS:
            m = weights[name] > 0.5
            both = m[got]
            if both.sum() < 20:
                continue
            mean = paint[both].mean(0)
            ref = np.median(lum[m])
            shade = np.clip(lum / max(ref, 0.02), 0.2, 2.0)
            miss = m & ~got
            out[miss] = np.clip(mean * shade[miss][:, None], 0, 1)
    blend = smooth(total[got], 0.0, 0.12)[:, None]
    out[got] = out[got] * (1 - blend) + paint * blend
    return out


def _decal(T, d, folder, pos, nrm, lum, result, weights):
    A = T.anchors[d["anchor"]]
    o, n, up = np.array(A["at"], np.float32), np.array(A["out"], np.float32), np.array(A["up"], np.float32)
    right = np.cross(up, n)
    size = float(d.get("size", A.get("size", 0.15)))
    img = np.asarray(Image.open(os.path.join(folder, d["image"])).convert("RGBA"), np.float32) / 255
    aspect = img.shape[0] / img.shape[1]
    rel = pos - o + np.array(d.get("offset", [0, 0, 0]), np.float32) * -1
    turn = np.deg2rad(float(d.get("turn", 0)))
    lx, ly = rel @ right, rel @ up
    x = (lx * np.cos(turn) + ly * np.sin(turn)) / size + 0.5
    y = 0.5 - (-lx * np.sin(turn) + ly * np.cos(turn)) / (size * aspect)
    depth = rel @ n
    facing = nrm @ n
    inside = (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1) & (np.abs(depth) < float(d.get("depth", 0.12))) & (facing > 0.1)
    if not inside.any():
        return result
    px = sample_tiling(img, np.clip(x[inside], 0, 1), np.clip(y[inside], 0, 1), "repeat")
    alpha = px[:, 3] * smooth(facing[inside], 0.1, 0.45) * float(d.get("opacity", 1.0))
    mode = d.get("mode", "paint")
    ref = np.median(lum)
    shade = np.clip(lum[inside] / max(ref, 0.02), 0.2, 2.0) ** 0.6
    if mode == "gilt":
        # The emblem's shape in a metal or thread colour: only where the picture is opaque (or bright, if it has no alpha).
        if img[..., 3].min() >= 0.99:
            alpha = px[:, :3].mean(-1) * smooth(facing[inside], 0.1, 0.45) * float(d.get("opacity", 1.0))
        ink = rgb_of(d.get("color", "#d8b25a")) * shade[:, None]
    else:
        ink = px[:, :3] * shade[:, None]
    if d.get("under_trim", True):
        alpha = alpha * (1 - weights["trim"][inside])       # (the sculpt's own gilt lines stay on top)
    out = result.copy()
    out[inside] = result[inside] * (1 - alpha[:, None]) + np.clip(ink, 0, 1) * alpha[:, None]
    return out


def render(T, colour, view):
    """One of the kit's set views of him, wearing a colour map: (h, w, 3) floats."""
    uv, shade = view["uv"], view["shade"]
    hit = shade > 0
    img = np.full(uv.shape[:2] + (3,), 0.42, np.float32)
    s = T.size
    px = colour[np.clip((uv[..., 1][hit].astype(np.float32) / 65535 * s).astype(int), 0, s - 1), np.clip((uv[..., 0][hit].astype(np.float32) / 65535 * s).astype(int), 0, s - 1)]
    img[hit] = px * (shade[hit].astype(np.float32) / 255)[:, None] * 1.25
    return np.clip(img, 0, 1)


def preview(T, colour, before=True):
    """A sheet of the set from every view; with before, the gear he came in on the row above."""
    rows = [np.concatenate([render(T, c, v) for v in T.views], 1) for c in ([T.base, colour] if before else [colour])]
    return Image.fromarray((np.concatenate(rows, 0) * 255).astype(np.uint8))


def check(recipe):
    """What's wrong with a recipe, as a list of plain sentences (empty: nothing)."""
    bad = []
    sid = recipe.get("id", "")
    if not sid or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789_" for c in sid) or len(sid) > 32:
        bad.append("id must be 1 to 32 of a-z, 0-9 and _ (it becomes a file name)")
    if not recipe.get("name"):
        bad.append("name is missing: what the set is called in the game")
    parts = recipe.get("parts", {})
    if not parts:
        bad.append("parts is empty: say what at least one of head, shoulders, chest, legs, feet becomes")
    for p in parts:
        if p not in PARTS[1:]:
            bad.append(f"parts.{p}: not a part. The parts are {', '.join(PARTS[1:])}")
    w = recipe.get("wears", {})
    if "palette" in w and w["palette"] not in PALETTES:
        bad.append(f"wears.palette: {w['palette']} isn't one of the game's ({', '.join(PALETTES)})")
    for p, shapes in (w.get("shapes") or {}).items():
        for s in shapes:
            if s not in SHAPES.get(p, []):
                bad.append(f"wears.shapes.{p}: {s} isn't one of {SHAPES.get(p)}")
    return bad
