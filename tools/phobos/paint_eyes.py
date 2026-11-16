"""Paint a pair of eyes into a face view, for tools/phobos/face_fix.py to bake onto the model.

    python tools/phobos/paint_eyes.py <dir> <eyes.json>

<dir> holds face_fix.py's face.png (flat albedo through the face camera). Meshy's eyes come out as grey smears with no
iris, pupil or lid line. This draws each eye where the smear is: white with a shadow under the upper lid, iris with a
dark rim and paler spokes, pupil, one small catchlight, a lash line along the upper lid, a soft lower lid and a crease
above. Drawn at four times the size and shrunk, so edges are smooth. Writes <dir>/patch.png (face.png with the eyes)
and <dir>/mask.png (just the eyes, feathered), and <dir>/patch_look.jpg.

eyes.json: {"eyes": [{"x": 412, "y": 447, "w": 58, "up": 19, "down": 11, "tilt": -2, "inner": 1}, ...],
            "iris": [92, 128, 142], "iris_r": 0.40, "look": [0, -1], "lash": [58, 34, 26]}
x, y: the eye's middle in face.png pixels; w: half its width; up/down: how far the lids open above and below;
tilt: degrees, outer corner up; inner: 1 when the nose is to the picture's right of this eye, -1 to its left.
iris_r: the iris's radius as a share of w.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

SS = 4


def paint(d, spec):
    face = Image.open(os.path.join(d, "face.png")).convert("RGBA")
    F = face.size[0]
    base = np.asarray(face).astype(np.float32)
    # First the old smear goes: a patch round each eye is refilled from the skin outside it (push-pull, as
    # pad_texture.py fills an atlas), so no grey shows past the new lids.
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from pad_texture import push_pull
    rgb = base[..., :3].copy()
    y1, x1 = np.mgrid[0:F, 0:F].astype(np.float32)
    tonem = np.zeros((F, F), np.float32)
    if "tone" in spec:
        # The face brought to the chest's colour: Meshy (and the picture patch) left it a step greyer and darker.
        t = spec["tone"]
        rr_ = np.sqrt(((x1 - t["x"]) / t["rx"]) ** 2 + ((y1 - t["y"]) / t["ry"]) ** 2)
        hairy = rgb[..., 0] > 1.6 * np.maximum(rgb[..., 1], 1)
        tonem = np.clip((1 - rr_) / 0.2, 0, 1) * ~hairy * (base[..., 3] > 200)
        tonem = np.asarray(Image.fromarray((tonem * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))).astype(np.float32) / 255
        x0_, y0_, x1_, y1_ = t.get("ref", [0, 0, 8, 8])
        ref = np.median(rgb[y0_:y1_, x0_:x1_].reshape(-1, 3), 0)
        cur = np.median(rgb[tonem > 0.6], 0)
        gain = np.array(t["gain"], np.float32) if "gain" in t else np.clip(ref / np.maximum(cur, 1), 0.88, 1.18) ** t.get("amount", 1.0)
        rgb = rgb * (1 - tonem[..., None]) + rgb * gain * tonem[..., None]
        print("tone gain", gain.round(3))
    hole = np.zeros((F, F), bool)
    for e in spec["eyes"]:
        hole |= ((x1 - e["x"]) / (e["w"] * 1.42)) ** 2 + ((y1 - e["y"] - 4) / ((e["up"] + e["down"]) * 1.75)) ** 2 < 1
    rgb = push_pull(rgb, ~hole)
    sm = np.asarray(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))).astype(np.float32)
    rgb[hole] = sm[hole]
    big = np.asarray(Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).resize((F * SS, F * SS), Image.BICUBIC)).astype(np.float32)
    fillm = np.asarray(Image.fromarray((np.maximum(hole, tonem) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)).resize((F * SS, F * SS), Image.BILINEAR)).astype(np.float32) / 255
    mask = fillm.copy()
    yy, xx = np.mgrid[0:F * SS, 0:F * SS].astype(np.float32)
    iris_c = np.array(spec.get("iris", [92, 128, 142]), np.float32)
    lash_c = np.array(spec.get("lash", [58, 34, 26]), np.float32)
    lookx, looky = spec.get("look", [0, -1])
    rng = np.random.default_rng(7)

    def over(col, a):
        nonlocal big
        big = big * (1 - a[..., None]) + np.asarray(col, np.float32) * a[..., None]

    def soft(v, edge):
        return np.clip(v / edge + 0.5, 0, 1)

    for e in spec["eyes"]:
        cx, cy, w = e["x"] * SS, e["y"] * SS, e["w"] * SS
        up, down = e["up"] * SS, e["down"] * SS
        t = math.radians(e.get("tilt", 0)) * e.get("inner", 1)
        # Eye frame: u along the eye toward the outer corner, v down.
        dx, dy = xx - cx, yy - cy
        u = (dx * math.cos(t) + dy * math.sin(t)) * -e.get("inner", 1) / w
        v = -dx * math.sin(t) + dy * math.cos(t)
        inb = np.abs(u) < 1
        s = np.sqrt(np.clip(1 - u * u, 0, 1))
        # The upper lid peaks a little toward the nose; the lower lid is shallower and peaks a little outward.
        top = -up * s ** 0.72 * (1 - 0.16 * u)
        bot = down * s ** 0.95 * (1 + 0.22 * u)
        open_ = soft(v - top, 1.5 * SS) * soft(bot - v, 1.5 * SS) * inb
        # White: warm off-white, darker toward the corners and under the upper lid, pink at the inner corner.
        shade = 0.60 + 0.40 * np.clip((v - top) / (0.9 * up), 0, 1)
        shade *= 0.80 + 0.20 * s
        wc = spec.get("white", [226, 216, 210])
        white = np.stack([wc[0] * shade, wc[1] * shade, wc[2] * shade], -1)
        duct = np.clip((-u - 0.80) / 0.2, 0, 1)[..., None]
        white = white * (1 - duct) + np.array([196, 138, 128], np.float32) * duct
        big[...] = big * (1 - open_[..., None]) + white * open_[..., None]
        # Iris.
        R = spec.get("iris_r", 0.40) * w
        ix, iy = cx + (lookx + e.get("inner", 1) * spec.get("converge", 0)) * SS, cy + looky * SS
        rr = np.hypot(xx - ix, yy - iy) / R
        ang = np.arctan2(yy - iy, xx - ix)
        spokes = 0.5 + 0.5 * np.sin(ang * 23 + 2.0 * np.sin(ang * 5)) * np.sin(ang * 37 + 1.3)
        tone = 0.80 + 0.45 * spokes * np.clip(rr * 1.3, 0, 1) * np.clip(1.25 - rr, 0, 1)
        irisc = iris_c[None, None, :] * tone[..., None]
        # Warmer and lighter round the pupil, a dark rim at the edge, shadowed under the lid.
        inner = np.clip(1 - np.abs(rr - 0.42) / 0.22, 0, 1)[..., None]
        irisc = irisc * (1 - 0.35 * inner) + np.array([150, 150, 118], np.float32) * 0.35 * inner
        rim = np.clip((rr - 0.78) / 0.22, 0, 1)[..., None]
        irisc = irisc * (1 - 0.62 * rim)
        irisc *= (0.45 + 0.55 * np.clip((v - top) / (0.9 * up), 0, 1))[..., None]
        a = soft(1 - rr, 2.0 * SS / R) * open_
        big[...] = big * (1 - a[..., None]) + irisc * a[..., None]
        a = soft(0.40 - rr, 1.6 * SS / R) * open_
        over([14, 11, 12], a)
        # One catchlight, up and toward the picture's left, on both eyes alike.
        cs = spec.get("catch", 1.0)  # the catchlight's size: bigger reads further off
        hl = np.hypot((xx - (ix - 0.36 * R)) / (0.20 * R * cs), (yy - (iy - 0.36 * R)) / (0.15 * R * cs))
        over([250, 250, 248], np.clip(1.3 - hl, 0, 1) * 0.92 * open_)
        # Lids. Upper lash line: dark, thicker toward the outer corner, a short flick past it.
        thick = (2.6 + 3.8 * np.clip((u + 1) / 2, 0, 1) ** 1.3) * SS
        lash = np.clip(1.2 - np.abs(v - (top - 0.6 * thick)) / thick, 0, 1) * (np.abs(u) < 1.10) * np.clip((1.12 - np.abs(u)) / 0.12, 0, 1)
        over(lash_c, np.clip(lash * 1.25, 0, 1))
        low = np.clip(1 - np.abs(v - (bot + 0.8 * SS)) / (1.3 * SS), 0, 1) * inb * np.clip((u + 0.75) / 0.6, 0, 1)
        over([122, 78, 68], low * 0.50)
        under = np.clip(1 - np.abs(v - (bot + 5.0 * SS)) / (5.0 * SS), 0, 1) * (np.abs(u) < 0.9)
        over([150, 104, 96], under * 0.16)
        crease = np.clip(1 - np.abs(v - (top * 1.0 - 0.62 * up * s - 2.0 * SS)) / (1.8 * SS), 0, 1) * (np.abs(u) < 0.92)
        over([132, 86, 74], crease * 0.34)
        # What gets baked: the eye, its lids and the crease, feathered.
        reg = soft(v - (top - 0.62 * up * s - 6.0 * SS), 3.0 * SS) * soft((bot + 4.5 * SS) - v, 3.0 * SS) * soft(1.16 - np.abs(u), 0.06)
        mask = np.maximum(mask, reg)
    # Soft tints (lips, blush, lid shadow): ellipses of a colour laid over at an alpha.
    for t in spec.get("tints", []):
        a = np.clip(1 - np.sqrt(((xx - t["x"] * SS) / (t["rx"] * SS)) ** 2 + ((yy - t["y"] * SS) / (t["ry"] * SS)) ** 2), 0, 1) ** t.get("soft", 1.0)
        over(t["color"], a * t["alpha"]); mask = np.maximum(mask, np.clip(a * 3, 0, 1))
    # Brows: an arched band over each eye, thick toward the nose, thinning out, with hair strokes in it.
    for b in spec.get("brows", []):
        u = (xx - b["x"] * SS) / (b["w"] * SS) * b.get("inner", 1) * -1   # -1 at the nose end, 1 at the outer end
        arch = b["y"] * SS - b.get("arch", 5) * SS * (1 - (u - 0.15) ** 2) + b.get("drop", 4) * SS * np.clip(u, 0, 1) ** 2
        th = (b.get("thick", 6) * (1 - 0.45 * np.clip((u + 1) / 2, 0, 1)) + 1) * SS
        strokes = 0.88 + 0.12 * np.sin((xx + 0.6 * yy) / (1.1 * SS))
        a = np.clip(1.15 - np.abs(yy - arch) / th, 0, 1) * np.clip((1 - np.abs(u)) / 0.18, 0, 1) * strokes
        over(b["color"], a * b.get("alpha", 0.8)); mask = np.maximum(mask, np.clip(a * 3, 0, 1))
    # Freckles: small soft dots scattered in a box, the same every run.
    fr = spec.get("freckles")
    if fr:
        r2 = np.random.default_rng(11)
        for _ in range(fr["n"]):
            fx, fy = r2.uniform(fr["x0"], fr["x1"]) * SS, r2.uniform(fr["y0"], fr["y1"]) * SS
            rad = r2.uniform(1.0, 2.2) * SS; al = r2.uniform(0.15, 0.4)
            x0_, x1_, y0_, y1_ = int(fx - 2 * rad), int(fx + 2 * rad) + 1, int(fy - 2 * rad), int(fy + 2 * rad) + 1
            sub = np.clip(1 - np.hypot(xx[y0_:y1_, x0_:x1_] - fx, yy[y0_:y1_, x0_:x1_] - fy) / rad, 0, 1)
            big[y0_:y1_, x0_:x1_] = big[y0_:y1_, x0_:x1_] * (1 - (sub * al)[..., None]) + np.array(fr["color"], np.float32) * (sub * al)[..., None]
            mask[y0_:y1_, x0_:x1_] = np.maximum(mask[y0_:y1_, x0_:x1_], np.clip(sub * 3, 0, 1))
    # A little grain so the paint isn't cleaner than the skin round it.
    big += rng.normal(0, 1.2, big.shape).astype(np.float32) * mask[..., None]
    patch = Image.fromarray(np.clip(big, 0, 255).astype(np.uint8)).resize((F, F), Image.LANCZOS)
    m = Image.fromarray((mask * 255).astype(np.uint8)).resize((F, F), Image.LANCZOS)
    mk = np.asarray(m).astype(np.float32) / 255 * (base[..., 3] > 200)
    patch.save(os.path.join(d, "patch.png"))
    Image.fromarray((mk * 255).astype(np.uint8)).save(os.path.join(d, "mask.png"))
    a = base[..., 3:] / 255
    before = base[..., :3] * a + 128 * (1 - a)
    after = before * (1 - mk[..., None]) + np.asarray(patch).astype(np.float32) * mk[..., None]
    xs = [e["x"] for e in spec["eyes"]]; ys = [e["y"] for e in spec["eyes"]]
    box = (max(min(xs) - 110, 0), max(min(ys) - 90, 0), min(max(xs) + 110, F), min(max(ys) + 90, F))
    look = np.concatenate([before, after], 0).astype(np.uint8)
    im = Image.fromarray(look)
    top_ = im.crop(box); bot_ = im.crop((box[0], box[1] + F, box[2], box[3] + F))
    sheet = Image.new("RGB", (top_.size[0] * 3, top_.size[1] * 6))
    sheet.paste(top_.resize((top_.size[0] * 3, top_.size[1] * 3), Image.LANCZOS), (0, 0))
    sheet.paste(bot_.resize((top_.size[0] * 3, top_.size[1] * 3), Image.LANCZOS), (0, top_.size[1] * 3))
    sheet.save(os.path.join(d, "patch_look.jpg"), quality=90)
    print("eyes painted", d)


if __name__ == "__main__":
    paint(sys.argv[1], json.load(open(sys.argv[2])))
