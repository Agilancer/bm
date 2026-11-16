"""Line a front picture up with a model's front views and cut the face patch (step 2 of tools/phobos/face_fix.py).

    python tools/phobos/face_patch.py patch <dir> <picture.png>
        <dir> holds face_fix.py's full.png, face.png and cams.json. Lines the picture up with full.png by the
        silhouettes (height and middle), then refines scale and shift on the face (eyes, nose, mouth) by normalised
        correlation. Writes <dir>/patch.png (the picture seen through the face camera, its skin shifted to the
        model's skin tone) and <dir>/mask.png (the face from brows to chin, feathered, minus hair in either image),
        plus <dir>/patch_look.jpg to check by eye.
    python tools/phobos/face_patch.py blemish <dir> x,y,r [x,y,r ...]
        No picture: small dark or pale marks in face.png (pixel x, y and radius r) are painted over with the skin
        around them (a median of the view, 21 px). For marks a picture can't fix, or a turned face camera.
    python tools/phobos/face_patch.py compose <dir> <original_texture.png> <out.png>
        After face_fix.py's bake: out = original * (1 - w) + baked * w, texel by texel, so nothing outside the face
        is resampled.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter


def load(p, mode="RGB"):
    return np.asarray(Image.open(p).convert(mode)).astype(np.float32)


def sample(img, xs, ys):
    """Bilinear samples of img (H, W, C) at float pixel positions, clamped to the edge."""
    h, w = img.shape[:2]
    xs = np.clip(xs, 0, w - 1.001); ys = np.clip(ys, 0, h - 1.001)
    x0 = xs.astype(int); y0 = ys.astype(int); fx = (xs - x0)[..., None]; fy = (ys - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def to_px(cam, x, z, res):
    return ((x - cam["cx"]) / cam["size"] + 0.5) * res, (0.5 - (z - cam["cz"]) / cam["size"]) * res


def to_world(cam, px, py, res):
    return (px / res - 0.5) * cam["size"] + cam["cx"], (0.5 - py / res) * cam["size"] + cam["cz"]


def hairish(rgb):
    """Red hair: red well over green (skin sits near 1.3, this hair near 2)."""
    return rgb[..., 0] > 1.6 * np.maximum(rgb[..., 1], 1)


def patch(d, pic_path):
    cams = json.load(open(os.path.join(d, "cams.json")))
    full = load(os.path.join(d, "full.png"), "RGBA"); face = load(os.path.join(d, "face.png"), "RGBA")
    pic = load(pic_path)
    R = full.shape[0]
    # Silhouettes: the render's alpha; the picture against its own corner colour.
    sr = full[..., 3] > 128
    bg = np.median(np.concatenate([pic[:8, :8].reshape(-1, 3), pic[:8, -8:].reshape(-1, 3)]), 0)
    sp = np.abs(pic - bg).sum(-1) > 40
    rows_r = np.where(sr.any(1))[0]; rows_p = np.where(sp.any(1))[0]
    s = (rows_p[-1] - rows_p[0]) / (rows_r[-1] - rows_r[0])
    ty = rows_p[0] - s * rows_r[0]
    tx = np.where(sp)[1].mean() - s * np.where(sr)[1].mean()
    print("silhouettes: scale", round(s, 4), "shift", round(tx, 1), round(ty, 1))
    fc = cams["face"]; F = face.shape[0]
    # Face box in the world: from the face camera's middle, eyes to chin (about 6 cm either side, 13 cm tall).
    gx, gz = np.meshgrid(np.linspace(fc["cx"] - 0.055, fc["cx"] + 0.045, 90), np.linspace(fc["cz"] + 0.055, fc["cz"] - 0.065, 110))
    fx, fy = to_px(fc, gx, gz, F)
    lum = lambda a: a[..., :3] @ np.array([0.3, 0.59, 0.11], np.float32)
    ref = lum(sample(face, fx, fy)); ok = sample(face, fx, fy)[..., 3] > 200
    ref = ref - ref[ok].mean()

    def pic_at(sc_, dx, dy, x, z):
        rx, ry = to_px(cams["full"], x, z, R)
        return sample(pic, rx * s * sc_ + tx + dx, ry * s * sc_ + ty + dy)

    best = (-2, 1, 0, 0)
    for sc_ in np.linspace(0.96, 1.04, 9):
        for dx in np.arange(-8, 8.5, 0.5):
            for dy in np.arange(-8, 8.5, 0.5):
                # Scale about the face's middle, so the shift search stays centred.
                cx_, cy_ = to_px(cams["full"], fc["cx"], fc["cz"], R)
                v = lum(pic_at(sc_, dx - (sc_ - 1) * (cx_ * s), dy - (sc_ - 1) * (cy_ * s), gx, gz))
                v = v - v[ok].mean()
                ncc = (v[ok] * ref[ok]).sum() / (np.linalg.norm(v[ok]) * np.linalg.norm(ref[ok]) + 1e-6)
                if ncc > best[0]:
                    best = (ncc, sc_, dx - (sc_ - 1) * (cx_ * s), dy - (sc_ - 1) * (cy_ * s))
    ncc, sc_, dx, dy = best
    print("face fit: ncc", round(float(ncc), 3), "scale", round(float(sc_), 3), "shift", round(float(dx), 2), round(float(dy), 2))
    # The picture through the face camera.
    py, px = np.mgrid[0:F, 0:F].astype(np.float32)
    wx, wz = to_world(fc, px + 0.5, py + 0.5, F)
    pv = pic_at(sc_, dx, dy, wx, wz)
    # Mask: an ellipse from brows to chin and cheek to cheek, feathered; no hair in either image; only on the model.
    ex, ez = fc["cx"] - 0.005, fc["cz"] - 0.006
    r = np.sqrt(((wx - ex) / 0.058) ** 2 + ((wz - ez) / 0.075) ** 2)
    m = np.clip((1.0 - r) / 0.25, 0, 1)
    # Hair only counts toward the edge of the face (lips are reddish too, and redder in the picture).
    hair = (hairish(face[..., :3]) & (r > 0.55)) | (hairish(pv) & (r > 0.8))
    # Opened first (specks under 5 px are blemishes, not hair), then grown a little.
    hair = np.asarray(Image.fromarray((hair * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))
                      .filter(ImageFilter.MaxFilter(13))) > 0
    m = m * (~hair) * (face[..., 3] > 200)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32) / 255
    # Skin tone: shift the picture's colour so its median skin matches the model's under the mask.
    sel = m > 0.5
    pv = pv * (np.median(face[..., :3][sel], 0) / np.maximum(np.median(pv[sel], 0), 1))
    Image.fromarray(np.clip(pv, 0, 255).astype(np.uint8)).save(os.path.join(d, "patch.png"))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(d, "mask.png"))
    a = face[..., 3:] / 255
    before = face[..., :3] * a + 128 * (1 - a)
    after = before * (1 - m[..., None]) + pv * m[..., None]
    look = np.concatenate([before, after, np.repeat(m[..., None] * 255, 3, -1)], 1)
    Image.fromarray(np.clip(look, 0, 255).astype(np.uint8)).resize((1536, 512)).save(os.path.join(d, "patch_look.jpg"), quality=88)
    print("patch written", d)


def blemish(d, spots, med=21):
    face = load(os.path.join(d, "face.png"), "RGBA")
    rgb = Image.fromarray(face[..., :3].astype(np.uint8))
    pv = np.asarray(rgb.filter(ImageFilter.MedianFilter(med))).astype(np.float32)
    F = face.shape[0]
    yy, xx = np.mgrid[0:F, 0:F].astype(np.float32)
    m = np.zeros((F, F), np.float32)
    for x, y, r in spots:
        m = np.maximum(m, np.clip((r - np.hypot(xx - x, yy - y)) / (0.35 * r), 0, 1))
    m *= face[..., 3] > 200
    Image.fromarray(np.clip(pv, 0, 255).astype(np.uint8)).save(os.path.join(d, "patch.png"))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(d, "mask.png"))
    a = face[..., 3:] / 255
    before = face[..., :3] * a + 128 * (1 - a)
    after = before * (1 - m[..., None]) + pv * m[..., None]
    look = np.concatenate([before, after, np.repeat(m[..., None] * 255, 3, -1)], 1)
    Image.fromarray(np.clip(look, 0, 255).astype(np.uint8)).resize((1536, 512)).save(os.path.join(d, "patch_look.jpg"), quality=88)
    print("blemish patch written", d, len(spots), "spots")


def compose(d, orig, out):
    o = load(orig); c = load(os.path.join(d, "bake_col.png")); w = load(os.path.join(d, "bake_w.png"), "L")[..., None] / 255
    Image.fromarray(np.clip(o * (1 - w) + c * w, 0, 255).astype(np.uint8)).save(out)
    print("composed", out, "texels changed", int((w > 0.01).sum()))


if __name__ == "__main__":
    if sys.argv[1] == "patch":
        patch(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == "blemish":
        blemish(sys.argv[2], [tuple(float(v) for v in a.split(",")) for a in sys.argv[3:]])
    else:
        compose(sys.argv[2], sys.argv[3], sys.argv[4])
