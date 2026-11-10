"""Makes the wizard's skin kit: what goes to ChatGPT (or anyone) to paint new sets of gear for the third-person body, and
what the game needs to wear them.

    node tools/player/skins/pose.mjs tools/build/player_posed.f32
    python tools/player/skins/build_kit.py [out.zip]

Writes:
  - assets/game/player/parts.png: which part of his gear every texel of his colour map is (the game mixes sets by it:
    src/gfx/renderer.js bodySkin);
  - tools/build/wizard_skin_kit/ and its zip: template/ (his colour map, the parts, where each texel lies on him, the
    preview views, the places emblems go), the scripts and words kept in tools/player/skins/kit/, and the example sets.
The parts are told apart in tools/player/skins/parts.py. Needs numpy and Pillow."""
import json
import os
import shutil
import sys
import zipfile

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, HERE)
import glb  # noqa: E402
import parts as P  # noqa: E402
from raster import raster  # noqa: E402

SIZE = 2048
GEO = 1024
VIEW_W, VIEW_H = 380, 620
SHOWN = "crimson_regalia"     # the example set that goes in the kit whole
VIEWS = [("front", 0.0), ("front_side", 0.75), ("back", np.pi), ("back_side", np.pi + 0.75)]
TINT = np.array([[1, 1, 1], [1, 0.25, 0.25], [1, 0.85, 0.1], [0.2, 0.9, 0.3], [0.25, 0.5, 1], [1, 0.3, 1]])
# Where emblems go: a name, the part it's on, the way it faces, and where (two of x, y, z: the third is found on him).
# The paint-over templates: each part of his gear laid out flat from six sides, on one sheet of three panels by two, as he
# was sculpted (arms out). (name, the way the panel looks from, the way that's up on it.)
PANEL = 1024
PANELS = [("front", [0, 0, 1], [0, 1, 0]), ("back", [0, 0, -1], [0, 1, 0]), ("left", [1, 0, 0], [0, 1, 0]),
          ("right", [-1, 0, 0], [0, 1, 0]), ("top", [0, 1, 0], [0, 0, -1]), ("under", [0, -1, 0], [0, 0, 1])]
WORDS = {"front": "FRONT", "back": "BACK", "left": "HIS LEFT SIDE", "right": "HIS RIGHT SIDE", "top": "FROM ABOVE (his front is at the bottom)", "under": "FROM BELOW (his front is at the top)"}
ANCHORS = [
    ("chest", "chest", [0, 0, 1], {"x": 0, "y": 1.3}, 0.16, "the middle of the chest"),
    ("back", "chest", [0, 0, -1], {"x": 0, "y": 1.27}, 0.24, "between the shoulder blades"),
    ("tabard", "chest", [0, 0, 1], {"x": 0, "y": 0.86}, 0.13, "the panel that hangs in front, below the belt"),
    ("tabard_back", "chest", [0, 0, -1], {"x": 0, "y": 0.86}, 0.15, "the panel that hangs behind"),
    ("belt", "chest", [0, 0, 1], {"x": 0, "y": 1.065}, 0.07, "the belt's buckle"),
    ("hat", "head", [0, 0, 1], {"x": 0, "y": 1.755}, 0.09, "the front of the hat, above the band"),
    ("hat_back", "head", [0, 0, -1], {"x": 0, "y": 1.755}, 0.09, "the back of the hat"),
    ("shoulder_left", "shoulders", [1, 0, 0], {"y": 1.4, "z": -0.05}, 0.11, "his left shoulder guard, from the side"),
    ("shoulder_right", "shoulders", [-1, 0, 0], {"y": 1.4, "z": -0.05}, 0.11, "his right shoulder guard, from the side"),
    ("knee_left", "legs", [0, 0, 1], {"x": 0.105, "y": 0.5}, 0.07, "his left knee guard"),
    ("knee_right", "legs", [0, 0, 1], {"x": -0.105, "y": 0.5}, 0.07, "his right knee guard"),
    ("shin_left", "legs", [0, 0, 1], {"x": 0.105, "y": 0.33}, 0.06, "his left greave"),
    ("shin_right", "legs", [0, 0, 1], {"x": -0.105, "y": 0.33}, 0.06, "his right greave"),
]


def fill(valid, rounds=96):
    """For every texel, the texel it takes its value from: itself if it's on him, else the nearest one that is."""
    h, w = valid.shape
    src = np.where(valid, np.arange(h * w).reshape(h, w), -1)
    for _ in range(rounds):
        hole = src < 0
        if not hole.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            near = np.roll(src, (dy, dx), (0, 1))
            take = hole & (near >= 0)
            src[take] = near[take]
            hole = src < 0
    src[src < 0] = 0
    return src


def label(img, xy, text, size=30, fill=(20, 20, 20)):
    try:
        from PIL import ImageFont
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
        ImageDraw.Draw(img).text(xy, text, font=font, fill=fill)
    except OSError:
        small = Image.new("L", (len(text) * 7, 12), 0)
        ImageDraw.Draw(small).text((0, 0), text, fill=255)
        big = small.resize((small.width * size // 11, small.height * size // 11), Image.NEAREST)
        img.paste(Image.new("RGB", big.size, fill), xy, big)


def edges(mask):
    """The pixels of a mask that have a neighbour outside it."""
    inner = mask.copy()
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        inner &= np.roll(mask, (dy, dx), (0, 1))
    return mask & ~inner


def thicken(mask, n):
    out = mask.copy()
    for _ in range(n):
        grown = out.copy()
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            grown |= np.roll(out, (dy, dx), (0, 1))
        out = grown
    return out


def templates(kit, tpl, mesh, col, part, trim):
    """For each part: a sheet of its outlines to paint on, the same sheet with the paint it came in, a mask of what's him on
    the sheet, and (template/skin_views.npz) how the sheet lies on his body, so paint on it can be put back."""
    tris, uv, pos = mesh["tris"], mesh["uv"], mesh["pos"]
    folder = os.path.join(kit, "templates")
    os.makedirs(folder, exist_ok=True)
    views = {"panel": np.int32(PANEL), "names": np.array([n for n, _, _ in PANELS])}
    for pid, name in enumerate(P.PARTS):
        if pid == 0:
            continue
        sel = tris[part == pid]
        used = np.unique(sel)
        # One size for all six panels of a part, so a pattern painted across them is the same size on him.
        scale, frames = 1e9, []
        for _, toward, up in PANELS:
            t, u = np.array(toward, float), np.array(up, float)
            r = np.cross(u, t)
            a, b = pos[used] @ r, pos[used] @ u
            scale = min(scale, PANEL * 0.9 / max(a.max() - a.min(), b.max() - b.min()))
            frames.append((r, u, t, (a.max() + a.min()) / 2, (b.max() + b.min()) / 2))
        lines = Image.new("RGB", (PANEL * 3, PANEL * 2), (150, 150, 150))
        paint = Image.new("RGB", (PANEL * 3, PANEL * 2), (60, 60, 60))
        mask = Image.new("L", (PANEL * 3, PANEL * 2), 0)
        zs, centres = [], []
        for k, ((vname, _, _), (r, u, t, ca, cb)) in enumerate(zip(PANELS, frames)):
            xy = np.stack([PANEL / 2 + (pos @ r - ca) * scale, PANEL / 2 - (pos @ u - cb) * scale], 1)
            d = pos @ t
            tri, bary = raster(xy, sel, PANEL, PANEL, depth=-d)
            hit = tri >= 0
            cn = sel[tri[hit]]
            w = bary[hit][:, :, None]
            tuv = (uv[cn] * w).sum(1)
            ty, tx = np.clip((tuv[:, 1] * SIZE).astype(int), 0, SIZE - 1), np.clip((tuv[:, 0] * SIZE).astype(int), 0, SIZE - 1)
            z = np.full((PANEL, PANEL), -9.0, np.float32)
            z[hit] = (d[cn] * bary[hit]).sum(1)
            # (Kept at half size, the nearest of each four: enough to tell what's in front.)
            zs.append(z.reshape(PANEL // 2, 2, PANEL // 2, 2).max((1, 3)).astype(np.float16))
            centres.append([ca, cb])
            x0, y0 = (k % 3) * PANEL, (k // 3) * PANEL
            img = np.full((PANEL, PANEL, 3), 60, np.uint8)
            img[hit] = (col[ty, tx] * 255).astype(np.uint8)
            paint.paste(Image.fromarray(img), (x0, y0))
            mask.paste(Image.fromarray((hit * 255).astype(np.uint8)), (x0, y0))
            # The lines: his outline heavy, the sculpt's gilt work light, so you can see what's where without its colours.
            gilt = np.zeros((PANEL, PANEL), bool)
            gilt[hit] = trim[ty, tx] > 0.5
            sheet = np.full((PANEL, PANEL, 3), 150, np.uint8)
            sheet[hit] = 255
            sheet[thicken(edges(gilt), 1) & hit] = 185
            sheet[thicken(edges(hit), 2)] = 0
            lines.paste(Image.fromarray(sheet), (x0, y0))
            for im, ink in ((lines, (20, 20, 20)), (paint, (235, 235, 235))):
                label(im, (x0 + 18, y0 + 14), WORDS[vname], 30, ink)
                ImageDraw.Draw(im).rectangle((x0, y0, x0 + PANEL - 1, y0 + PANEL - 1), outline=(110, 110, 110))
        label(lines, (18, PANEL * 2 - 46), f"{name.upper()}: paint inside the black outlines. Grey lines are the sculpt's raised trim.", 26)
        lines.save(os.path.join(folder, f"{name}_lines.png"), optimize=True)
        paint.save(os.path.join(folder, f"{name}_original.jpg"), quality=93)
        mask.save(os.path.join(folder, f"{name}_mask.png"), optimize=True)
        views[f"{name}_scale"] = np.float32(scale)
        views[f"{name}_centre"] = np.array(centres, np.float32)
        views[f"{name}_z"] = np.stack(zs)
        print(f"template {name}: {scale:.0f} pixels a metre")
    np.savez_compressed(os.path.join(tpl, "skin_views.npz"), **views)


def main():
    out_zip = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "tools", "build", "wizard_skin_kit.zip")
    kit = os.path.join(ROOT, "tools", "build", "wizard_skin_kit")
    if os.path.isdir(kit):
        shutil.rmtree(kit)
    shutil.copytree(os.path.join(HERE, "kit"), kit, ignore=shutil.ignore_patterns("__pycache__", "out", "*.pyc"))
    tpl = os.path.join(kit, "template")
    ref = os.path.join(kit, "reference")
    os.makedirs(tpl, exist_ok=True)
    os.makedirs(ref, exist_ok=True)

    mesh = glb.load(os.path.join(ROOT, "assets", "game", "player", "wizard.glb"))
    colour = mesh["color"].resize((SIZE, SIZE), Image.LANCZOS) if mesh["color"].size != (SIZE, SIZE) else mesh["color"]
    col = np.asarray(colour, np.float64) / 255
    tris, uv, pos, nrm = mesh["tris"], mesh["uv"], mesh["pos"], mesh["nrm"]
    part, _ = P.classify(mesh, col)
    print({P.PARTS[i]: int((part == i).sum()) for i in range(len(P.PARTS))})

    # His colour map's own space: which triangle each texel is, and so its part, its place on him and the way it faces.
    tri, bary = raster(uv * SIZE, tris, SIZE, SIZE)
    on = tri >= 0
    src = fill(on)
    tri_f, bary_f = tri.ravel()[src], bary.reshape(-1, 3)[src.ravel()].reshape(SIZE, SIZE, 3)
    parts_map = part[tri_f].astype(np.uint8)
    corner = tris[tri_f]
    place = (pos[corner] * bary_f[..., None]).sum(2)
    facing = (nrm[corner] * bary_f[..., None]).sum(2)
    facing /= np.maximum(np.linalg.norm(facing, axis=-1, keepdims=True), 1e-6)
    print(f"{on.mean() * 100:.0f}% of the map is on him")

    pal = Image.fromarray(parts_map, "P")
    pal.putpalette(sum(([int(c * 255) for c in t] for t in TINT), []) + [0] * (768 - 18))
    pal.save(os.path.join(tpl, "parts.png"), optimize=True)
    # (For the game, a grey for each part, 40 a step: a browser hands a palette picture back as its colours, not its numbers.)
    Image.fromarray(parts_map * 40, "L").save(os.path.join(ROOT, "assets", "game", "player", "parts.png"), optimize=True)
    colour.save(os.path.join(tpl, "base_color.png"), optimize=True)
    k = SIZE // GEO
    lo, hi = place.min((0, 1)), place.max((0, 1))
    scale = (hi - lo).max() / 65535
    np.savez_compressed(os.path.join(tpl, "geometry.npz"), pos=np.round((place[::k, ::k] - lo) / scale).astype(np.uint16), pos_min=lo.astype(np.float32),
                        pos_scale=np.float32(scale), nrm=np.round(facing[::k, ::k] * 127).astype(np.int8))

    # The places emblems go, found on him.
    anchors = {}
    centre = pos[tris].mean(1)
    tn = nrm[tris].mean(1)
    for name, where, axis, at, size, words in ANCHORS:
        axis = np.array(axis, float)
        sel = (part == P.PARTS.index(where)) & (tn @ axis > 0.4)
        d = np.zeros(len(tris))
        for key, v in at.items():
            d += (centre[:, "xyz".index(key)] - v) ** 2
        sel &= d < 0.035 ** 2
        if not sel.any():
            raise SystemExit(f"anchor {name}: nothing of the {where} there")
        depth = np.percentile(centre[sel] @ axis, 85)
        p = np.zeros(3)
        for key, v in at.items():
            p["xyz".index(key)] = v
        p += axis * (depth - p @ axis)
        up = [0, 1, 0]
        anchors[name] = {"part": where, "at": [round(float(v), 4) for v in p], "out": [float(v) for v in axis], "up": up, "size": size, "where": words}
    json.dump(anchors, open(os.path.join(tpl, "anchors.json"), "w"), indent=1)

    # The views the previews are made from: him as he stands in the game, and for each pixel where in the colour map it reads.
    posed_file = os.path.join(ROOT, "tools", "build", "player_posed.f32")
    posed = np.fromfile(posed_file, np.float32).reshape(2, -1, 3).astype(np.float64)
    views, hits = {"names": np.array([n for n, _ in VIEWS])}, {}
    light = np.array([0.35, 0.55, 0.75]); light /= np.linalg.norm(light)
    for name, yaw in VIEWS:
        c, s = np.cos(yaw), np.sin(yaw)
        turn = lambda v: np.stack([v[:, 0] * c - v[:, 2] * s, v[:, 1], v[:, 0] * s + v[:, 2] * c], 1)
        q, qn = turn(posed[0]), turn(posed[1])
        sc = VIEW_H / 2.0
        xy = np.stack([VIEW_W / 2 + q[:, 0] * sc, VIEW_H - 10 - q[:, 1] * sc], 1)
        t, b = raster(xy, tris, VIEW_W, VIEW_H, depth=-q[:, 2])
        hit = t >= 0
        cn = tris[t[hit]]
        tuv = (uv[cn] * b[hit][:, :, None]).sum(1)
        n = (qn[cn] * b[hit][:, :, None]).sum(1)
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-6)
        shade = np.zeros((VIEW_H, VIEW_W), np.uint8)
        shade[hit] = np.clip((0.5 + 0.5 * np.clip(n @ light, 0, 1)) * 204, 1, 255)
        u16 = np.zeros((VIEW_H, VIEW_W, 2), np.uint16)
        u16[hit] = np.clip(tuv * 65535, 0, 65535)
        views[name + "_uv"], views[name + "_shade"] = u16, shade
        hits[name] = (t, q)
    np.savez_compressed(os.path.join(tpl, "views.npz"), **views)

    # Pictures to go by: him as he is, his parts in colours, and where the emblems' places are.
    sys.path.insert(0, os.path.join(kit, "scripts"))
    import wizardskin as W
    T = W.Template(tpl)
    # The paint-over templates, a sheet for each part.
    templates(kit, tpl, mesh, col, part, T.mat["trim"])
    W.preview(T, T.base, before=False).save(os.path.join(ref, "wizard_as_he_is.jpg"), quality=92)
    tinted = T.base * 0.45 + (T.base.mean(-1, keepdims=True) * 0.6 + 0.4) * TINT[T.parts].astype(np.float32) * 0.55
    sheet = W.preview(T, tinted.astype(np.float32), before=False)
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(P.PARTS[1:]):
        d.rectangle((8, 8 + i * 20, 22, 22 + i * 20), fill=tuple(int(c * 255) for c in TINT[i + 1]))
        d.text((28, 9 + i * 20), n, fill=(255, 255, 255))
    sheet.save(os.path.join(ref, "parts.jpg"), quality=92)
    # (The anchors are in his sculpted pose, arms out: drawn on a plain front and back of that.)
    marks = []
    for sign, title in ((1, "front"), (-1, "back")):
        sc = 330
        xy = np.stack([330 + pos[:, 0] * sc * sign, 640 - pos[:, 1] * sc], 1)
        t, b = raster(xy, tris, 660, 650, depth=-pos[:, 2] * sign)
        hit = t >= 0
        tuv = (uv[tris[t[hit]]] * b[hit][:, :, None]).sum(1)
        img = np.full((650, 660, 3), 0.42)
        img[hit] = col[np.clip((tuv[:, 1] * SIZE).astype(int), 0, SIZE - 1), np.clip((tuv[:, 0] * SIZE).astype(int), 0, SIZE - 1)]
        im = Image.fromarray((img * 255).astype(np.uint8))
        dr = ImageDraw.Draw(im)
        for name, a in anchors.items():
            if a["out"][2] * sign < 0 or (a["out"][2] == 0 and sign < 0):
                continue
            x, y = 330 + a["at"][0] * sc * sign, 640 - a["at"][1] * sc
            h = a["size"] * sc / 2
            dr.rectangle((x - h, y - h, x + h, y + h), outline=(255, 235, 60))
            dr.text((x + h + 3, y - 6), name, fill=(255, 255, 255))
        dr.text((8, 6), f"{title}: where emblems go (the squares are each one's usual size)", fill=(255, 255, 255))
        marks.append(np.asarray(im))
    Image.fromarray(np.concatenate(marks, 1)).save(os.path.join(ref, "emblem_places.jpg"), quality=92)

    # The example sets, baked with the kit's own script, so what's in the zip is known to run.
    made = []
    import subprocess
    subprocess.run([sys.executable, os.path.join(kit, "scripts", "example_skins.py")], check=True)
    for f in sorted(os.listdir(os.path.join(kit, "recipes"))):
        if f.endswith(".json"):
            subprocess.run([sys.executable, os.path.join(kit, "scripts", "make_set.py"), os.path.join(kit, "recipes", f)], check=True)
            made.append(f[:-5])
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for folder, _, files in os.walk(kit):
            for f in sorted(files):
                # (Of the sets just made, one goes along whole, to show what a finished one is; the rest are only their previews.)
                rel = os.path.relpath(os.path.join(folder, f), kit).replace(os.sep, "/")
                if "__pycache__" in folder or (rel.startswith("out/") and rel != f"out/{SHOWN}.zip" and not rel.endswith("preview.jpg")):
                    continue
                full = os.path.join(folder, f)
                z.write(full, os.path.join("wizard_skin_kit", os.path.relpath(full, kit)))
    print(f"{out_zip}: {os.path.getsize(out_zip) / 1e6:.1f} MB, example sets: {', '.join(made)}")


if __name__ == "__main__":
    main()
