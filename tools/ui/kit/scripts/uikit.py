"""Cuts the sheets of Bellmourn's interface kit into the pictures the game uses. Shared by the kit's own check
(scripts/check.py, run where the art is made) and by the game's importer (tools/ui/import_kit.py), so both see a sheet
the same way. Needs numpy and Pillow, nothing else.

A sheet is described in spec.json (made from tools/ui/pieces.mjs):
  grid   cols x rows cells, one picture in each
  boxes  named boxes at given places
  nine   one frame filling the sheet (cut in nine by the game)
  full   the whole sheet is the picture
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

FORMAT = "bm-ui-kit/1"
EXTS = (".png", ".webp", ".jpg", ".jpeg")


def load_spec(path):
    spec = json.load(open(path, encoding="utf-8"))
    if spec.get("format") != FORMAT:
        raise ValueError(f"{path}: not a {FORMAT} spec")
    return spec


def find_sheet(folder, sheet_id):
    """The picture for a sheet in a folder, whatever it was saved as: <id>.png, or a name that starts with the id."""
    names = sorted(os.listdir(folder)) if os.path.isdir(folder) else []
    for n in names:
        stem, ext = os.path.splitext(n)
        if ext.lower() in EXTS and stem.lower() == sheet_id:
            return os.path.join(folder, n)
    for n in names:
        stem, ext = os.path.splitext(n)
        if ext.lower() in EXTS and stem.lower().startswith(sheet_id) and "template" not in stem.lower():
            return os.path.join(folder, n)
    return None


# ---- the background taken off -------------------------------------------------------------------------------------------

def _border(a, w=3):
    return np.concatenate([a[:w].reshape(-1, a.shape[2]), a[-w:].reshape(-1, a.shape[2]), a[:, :w].reshape(-1, a.shape[2]), a[:, -w:].reshape(-1, a.shape[2])])


def cutout(im, whole=False):
    """The picture with its background made clear, and how: 'alpha' (it came with one), 'keyed' (a flat colour was taken
    out), 'flood' (a flat dark, grey or white ground was taken out from the edges in), or 'opaque' (nothing to take).
    whole: the picture is meant to fill the sheet (a frame, the app's icon), so only an unmistakable ground is taken."""
    im = im.convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    if (a[..., 3] < 250).mean() > 0.02:
        return im, "alpha"
    edge = _border(a[..., :3])
    key = np.median(edge, axis=0)
    flat = (np.abs(edge - key).max(axis=1) < (14 if whole else 34)).mean()
    if flat < (0.985 if whole else 0.9):
        return im, "opaque"
    chroma = float(key.max() - key.min())
    luma = float(key @ np.array([0.299, 0.587, 0.114]))
    if whole and chroma < 90 and luma < 236:
        return im, "opaque"           # (a dark or grey edge on a frame is the frame)
    rgb = a[..., :3]
    if chroma > 90:
        # A chroma key: gone wherever it is, holes and all, and its tint taken off what's left at the edges.
        d = np.sqrt(((rgb - key) ** 2).sum(-1))
        alpha = np.clip((d - 46) / 70, 0, 1)
        hi = int(np.argmax(key))
        others = [c for c in range(3) if c != hi]
        cap = rgb[..., others].max(-1)
        rgb = rgb.copy()
        rgb[..., hi] = np.minimum(rgb[..., hi], np.maximum(cap, rgb[..., hi] * alpha))
        out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
        return Image.fromarray(out, "RGBA"), "keyed"
    # A plain ground (black, grey, white): only what joins the edges, so dark or pale parts of the art are kept.
    small = im.convert("RGB")
    mark = (255, 0, 254) if luma < 128 else (0, 255, 1)
    W, H = small.size
    seeds = [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]
    for s in seeds:
        if small.getpixel(s) != mark:
            ImageDraw.floodfill(small, s, mark, thresh=42)
    m = np.asarray(small)
    bg = (m[..., 0] == mark[0]) & (m[..., 1] == mark[1]) & (m[..., 2] == mark[2])
    alpha = Image.fromarray(((~bg) * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy()
    out.putalpha(alpha)
    return out, "flood"


def bbox(alpha, x0, y0, x1, y1, level=20):
    """The box of what's there (alpha over level) inside a box of the sheet, or None."""
    part = alpha[y0:y1, x0:x1] > level
    if not part.any():
        return None
    ys = np.where(part.any(axis=1))[0]
    xs = np.where(part.any(axis=0))[0]
    return x0 + int(xs[0]), y0 + int(ys[0]), x0 + int(xs[-1]) + 1, y0 + int(ys[-1]) + 1


def squared(im, box, out, margin=0.05):
    """What's in the box, middled on a clear square with a little room round it, at the size it's kept."""
    part = im.crop(box)
    side = int(round(max(part.size) * (1 + 2 * margin)))
    sq = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    sq.alpha_composite(part, ((side - part.width) // 2, (side - part.height) // 2))
    return sq.resize((out, out), Image.LANCZOS)


# ---- a sheet cut up ------------------------------------------------------------------------------------------------------

def process_sheet(sheet, im):
    """{ name: picture } for every picture on a sheet, and what there is to say about it: [(level, text)] with level
    'error' (that picture can't be used), 'warn' (look at it) or 'note'."""
    out, notes = {}, []
    W, H = sheet["size"]
    if im.size != (W, H):
        ratio = (im.width / im.height) / (W / H)
        if abs(ratio - 1) > 0.04:
            notes.append(("warn", f"{sheet['id']}: is {im.width} x {im.height}, a different shape from the template's {W} x {H}: stretched to fit"))
        im = im.convert("RGBA").resize((W, H), Image.LANCZOS)
    kind = sheet["kind"]
    cut, how = cutout(im, whole=kind in ("nine", "full"))
    alpha = np.asarray(cut)[..., 3]
    if kind == "grid":
        if how == "opaque":
            notes.append(("error", f"{sheet['id']}: no transparent background (and no flat one to take out): every picture on it would come with its ground"))
            return out, notes
        cw, ch = W / sheet["cols"], H / sheet["rows"]
        for k, cell in enumerate(sheet["cells"]):
            if not cell.get("name"):
                continue
            c, r = k % sheet["cols"], k // sheet["cols"]
            x0, y0, x1, y1 = int(c * cw), int(r * ch), int((c + 1) * cw), int((r + 1) * ch)
            b = bbox(alpha, x0, y0, x1, y1)
            if not b or (b[2] - b[0]) * (b[3] - b[1]) < 0.02 * cw * ch:
                notes.append(("error", f"{sheet['id']}: cell {k + 1} ({cell['name']}) is empty"))
                continue
            if b[0] <= x0 + 1 or b[1] <= y0 + 1 or b[2] >= x1 - 1 or b[3] >= y1 - 1:
                notes.append(("warn", f"{sheet['id']}: cell {k + 1} ({cell['name']}) runs to the edge of its cell: it may be cut off, or its neighbour may be in with it"))
            fill = max(b[2] - b[0], b[3] - b[1]) / min(cw, ch)
            if fill < 0.45:
                notes.append(("warn", f"{sheet['id']}: cell {k + 1} ({cell['name']}) is small in its cell ({fill:.0%}): it will be soft when it's blown up"))
            out[cell["name"]] = squared(cut, b, sheet["out"], 0.0 if sheet.get("fill") else 0.05)
    elif kind == "boxes":
        if how == "opaque":
            notes.append(("error", f"{sheet['id']}: no transparent background (and no flat one to take out)"))
            return out, notes
        for box in sheet["boxes"]:
            x, y, w, h = box["rect"]
            gx, gy = int(w * 0.03), int(h * 0.12)
            b = bbox(alpha, max(0, x - gx), max(0, y - gy), min(W, x + w + gx), min(H, y + h + gy))
            if not b or (b[2] - b[0]) < 0.3 * w:
                notes.append(("error", f"{sheet['id']}: nothing in the box for {box['name']}"))
                continue
            part = cut.crop(b)
            ow, oh = box["out"]
            if box.get("keep") and box["name"].startswith("bar_") and box["name"] != "bar_frame":
                # A fill: its middle, clear of whatever its ends do.
                part = part.crop((int(part.width * 0.1), 0, int(part.width * 0.9), part.height))
            if box.get("keep") and box["name"] == "rule":
                fit = min(ow / part.width, oh / part.height)
                small = part.resize((max(1, int(part.width * fit)), max(1, int(part.height * fit))), Image.LANCZOS)
                canvas = Image.new("RGBA", (ow, oh), (0, 0, 0, 0))
                canvas.alpha_composite(small, ((ow - small.width) // 2, (oh - small.height) // 2))
                out[box["name"]] = canvas
            else:
                shape = (part.width / part.height) / (ow / oh)
                if not 0.6 < shape < 1.6:
                    notes.append(("warn", f"{sheet['id']}: {box['name']} is a different shape from its box ({part.width} x {part.height}): stretched"))
                out[box["name"]] = part.resize((ow, oh), Image.LANCZOS)
    elif kind == "nine":
        b = bbox(alpha, 0, 0, W, H)
        if not b:
            notes.append(("error", f"{sheet['id']}: empty"))
            return out, notes
        part = cut.crop(b)
        if min(part.size) < 0.8 * min(W, H):
            notes.append(("warn", f"{sheet['id']}: the frame doesn't fill the sheet ({part.width} x {part.height} of {W} x {H}): its corners will be soft"))
        if abs(part.width / part.height - 1) > 0.06:
            notes.append(("warn", f"{sheet['id']}: the frame isn't square ({part.width} x {part.height}): stretched"))
        out[sheet["name"]] = part.resize((sheet["out"], sheet["out"]), Image.LANCZOS)
        notes.extend(nine_notes(sheet, out[sheet["name"]]))
    elif kind == "full":
        full = im.convert("RGB") if sheet.get("opaque") else cut
        if sheet.get("opaque") and how == "alpha":
            flat = Image.new("RGB", im.size, (11, 9, 7))
            flat.paste(im, mask=im.split()[3])
            full = flat
            notes.append(("warn", f"{sheet['id']}: came with transparency, which this one mustn't have: laid on near-black"))
        out[sheet["name"]] = full.resize((sheet["out"], sheet["out"]), Image.LANCZOS)
    notes.append(("note", f"{sheet['id']}: background {how}; {len(out)} picture{'s' if len(out) != 1 else ''}"))
    return out, notes


def nine_notes(sheet, im):
    """A frame's sides must be the same all along (they're stretched): how much each side changes along its length."""
    a = np.asarray(im.convert("RGB")).astype(np.float32)
    n = im.width
    s = int(round(sheet["slice"] / sheet["size"][0] * n))
    sides = {"top": a[:s, s:n - s], "bottom": a[n - s:, s:n - s], "left": a[s:n - s, :s].transpose(1, 0, 2), "right": a[s:n - s, n - s:].transpose(1, 0, 2)}
    notes = []
    for name, band in sides.items():
        change = float(np.abs(band - band.mean(axis=1, keepdims=True)).mean())
        if change > 14:
            notes.append(("warn", f"{sheet['id']}: the {name} side isn't the same along its length (it changes by {change:.0f} of 255): it will smear when the frame is stretched. Keep ornament in the corners"))
    return notes


# ---- looking at them ----------------------------------------------------------------------------------------------------

def nine_slice(im, slice_px, w, h, border):
    """A frame drawn at w x h: corners kept at `border` px, sides and middle drawn out, as the game's border-image does."""
    n = im.width
    s = slice_px
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    xs = [(0, s, 0, border), (s, n - s, border, w - border), (n - s, n, w - border, w)]
    ys = [(0, s, 0, border), (s, n - s, border, h - border), (n - s, n, h - border, h)]
    for sx0, sx1, dx0, dx1 in xs:
        for sy0, sy1, dy0, dy1 in ys:
            if dx1 > dx0 and dy1 > dy0:
                out.alpha_composite(im.crop((sx0, sy0, sx1, sy1)).resize((dx1 - dx0, dy1 - dy0), Image.LANCZOS), (dx0, dy0))
    return out


def plate(im, w, h):
    """A button's or tab's plate at w x h: ends kept, middle drawn out."""
    k = h / im.height
    end = int(im.width * 0.2)
    left = im.crop((0, 0, end, im.height)).resize((max(1, int(end * k)), h), Image.LANCZOS)
    right = im.crop((im.width - end, 0, im.width, im.height)).resize((max(1, int(end * k)), h), Image.LANCZOS)
    mid_w = max(1, w - left.width - right.width)
    mid = im.crop((end, 0, im.width - end, im.height)).resize((mid_w, h), Image.LANCZOS)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(left, (0, 0)); out.alpha_composite(mid, (left.width, 0)); out.alpha_composite(right, (left.width + mid_w, 0))
    return out


def backdrop(w, h):
    """Something like the game's picture to lay pieces on: sky, a dark wood, the ground."""
    g = np.zeros((h, w, 3), np.float32)
    stops = [(0.0, (88, 112, 140)), (0.34, (150, 160, 152)), (0.36, (52, 62, 44)), (0.52, (40, 50, 34)), (0.54, (66, 62, 48)), (1.0, (84, 76, 56))]
    t = np.linspace(0, 1, h)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        k = ((t[m] - t0) / max(1e-6, t1 - t0))[:, None]
        g[m] = (np.array(c0) * (1 - k) + np.array(c1) * k)[:, None, :]
    return Image.fromarray(g.astype(np.uint8), "RGB").convert("RGBA")


def contact(sheet, pics, under=None, cell=150):
    """A sheet's pictures side by side on dark and on the game's backdrop, named: for looking at."""
    names = list(pics)
    if not names:
        return None
    cols = min(8, len(names))
    rows = (len(names) + cols - 1) // cols
    W, H = cols * cell, rows * (cell + 16)
    sheet_im = Image.new("RGBA", (W, H * 2), (16, 13, 10, 255))
    sheet_im.alpha_composite(backdrop(W, H), (0, H))
    d = ImageDraw.Draw(sheet_im)
    for half in (0, 1):
        for k, n in enumerate(names):
            x, y = (k % cols) * cell, half * H + (k // cols) * (cell + 16)
            p = pics[n]
            fit = min((cell - 16) / p.width, (cell - 16) / p.height)
            q = p.resize((max(1, int(p.width * fit)), max(1, int(p.height * fit))), Image.LANCZOS).convert("RGBA")
            ox, oy = x + (cell - q.width) // 2, y + (cell - q.height) // 2
            if under is not None and sheet["kind"] == "grid" and not sheet.get("fill"):
                u = under.resize((cell - 8, cell - 8), Image.LANCZOS)
                sheet_im.alpha_composite(u, (x + 4, y + 4))
                q = q.resize((int(q.width * 0.6), int(q.height * 0.6)), Image.LANCZOS)
                ox, oy = x + (cell - q.width) // 2, y + (cell - q.height) // 2
            sheet_im.alpha_composite(q, (ox, oy))
            d.text((x + 4, y + cell + 1), n[:22], fill=(220, 205, 170, 255))
    return sheet_im.convert("RGB")


def process_folder(spec, folder):
    """Every sheet found in a folder, cut up: ({ sheet id: { name: picture } }, notes, { sheet id: its file })."""
    done, notes, files = {}, [], {}
    for sheet in spec["sheets"]:
        path = find_sheet(folder, sheet["id"])
        if not path:
            continue
        files[sheet["id"]] = path
        try:
            im = Image.open(path)
            im.load()
        except Exception as e:  # noqa: BLE001
            notes.append(("error", f"{sheet['id']}: can't be read ({e})"))
            continue
        pics, n = process_sheet(sheet, im)
        done[sheet["id"]] = pics
        notes.extend(n)
    return done, notes, files
