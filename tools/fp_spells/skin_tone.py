"""Takes the textures out of the owner's three models, and brings the open hands' skin round to the closed fist's, so that neither
the swap between them nor the pink of RAISE shows:

    python tools/fp_spells/skin_tone.py

Needs art/fp_spells/{attack_closer,raise,empty_hand}.glb, and from tools/build/spells <model>_fixed.npz and fist_arm.npz. Writes, to the same
place, <model>_skin.jpg, <model>_mr.jpg, <model>_nrm.jpg, and fist_skin.jpg, fist_mr.jpg, fist_nrm.jpg, for hands.py. Only ever textures: no mesh.
"""
import io
import json
import os
import struct

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUILD = os.path.join(ROOT, "tools", "build", "spells")
ART = os.path.join(ROOT, "art", "fp_spells")
STATS_ABOVE = -0.25     # (the sculpt's y) only the arm from here to the hand counts towards the skin's colour: the shoulder's cut end doesn't
FACING = dict(attack=(0, -0.88, 0.47), closer=(0, -0.86, 0.51), raise_=(0, -0.98, 0.19))     # nor its far side, which the player never sees: this is from where they do
SPREAD = 0.85           # how much of the fist's range of tone an open hand takes on
PINK_RED, PINK_BLUE = 0.03, 0.05    # how far past its skin's usual red, and short of its usual yellow, a point is pink
TINT_RANGE = 0.35
TINT_MOST = np.array([0.02, 0.01])
DETAIL = 0.2            # how far the creases the normal map knows of darken the skin, and its ridges lighten it, so that it doesn't read as plastic
LIFE = np.array([np.log10(0.68) * np.sqrt(3), -0.025, -0.004])    # all three, in the l of l alpha beta: the game's sun is strong, and as they were modelled they burn out in it
RANGE_MOST = 1.15       # (the fist's own range is mostly baked shadow, which an open hand shouldn't copy)


def images(path):
    """base, metal and roughness, normal: as the glb has them."""
    with open(path, "rb") as fp:
        fp.read(12)
        n = struct.unpack("<I", fp.read(4))[0]
        fp.read(4)
        js = json.loads(fp.read(n))
        fp.read(8)
        blob = fp.read()
    mat = js["materials"][0]
    out = []
    for ref in (mat["pbrMetallicRoughness"]["baseColorTexture"], mat["pbrMetallicRoughness"]["metallicRoughnessTexture"], mat["normalTexture"]):
        v = js["bufferViews"][js["images"][js["textures"][ref["index"]]["source"]]["bufferView"]]
        off = v.get("byteOffset", 0)
        out.append(Image.open(io.BytesIO(blob[off:off + v["byteLength"]])).convert("RGB"))
    return out


def mask(V, N, uv, tri, size, eye):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    keep = (V[tri, 1].mean(1) > STATS_ABOVE) & (N[tri].mean(1) @ np.asarray(eye) > 0.35)
    for t in tri[keep]:
        d.polygon([(uv[i, 0] * size, (1 - uv[i, 1]) * size) for i in t], fill=255)
    return np.asarray(m) > 0


def to_lab(rgb):
    """Reinhard's l alpha beta, from an sRGB image in 0..1."""
    lin = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    lms = lin @ np.array([[0.3811, 0.5783, 0.0402], [0.1967, 0.7244, 0.0782], [0.0241, 0.1288, 0.8444]]).T
    log = np.log10(np.maximum(lms, 1e-4))
    return log @ np.array([[1, 1, 1], [1, 1, -2], [1, -1, 0]]).T * np.array([1 / np.sqrt(3), 1 / np.sqrt(6), 1 / np.sqrt(2)])


def from_lab(lab):
    log = (lab * np.array([1 / np.sqrt(3), 1 / np.sqrt(6), 1 / np.sqrt(2)])) @ np.array([[1, 1, 1], [1, 1, -1], [1, -2, 0]]).T
    lin = (10 ** log) @ np.array([[4.4679, -3.5873, 0.1193], [-1.2186, 2.3809, -0.1624], [0.0497, -0.2439, 1.2045]]).T
    lin = np.clip(lin, 0, 1)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def middle(lab):
    lo, mid, hi = np.percentile(lab, [25, 50, 75], axis=0)
    return mid, hi - lo


def creases(nrm):
    """From a normal map, -1 at the bottom of a crease to 1 along a ridge."""
    a = np.asarray(nrm, float) / 127.5 - 1
    div = np.gradient(a[..., 0], axis=1) - np.gradient(a[..., 1], axis=0)
    scale = 3 * np.std(div)
    im = Image.fromarray(((np.clip(div / scale, -1, 1) + 1) * 127.5).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    return np.asarray(im, float)[..., None] / 127.5 - 1


def skin_mr(im):
    """Skin isn't metal, whatever the generator thought, and it's never glossy."""
    a = np.asarray(im, float)
    a[..., 1] = np.clip(a[..., 1], 0.5 * 255, 0.8 * 255)
    a[..., 2] = 0
    return Image.fromarray(a.astype(np.uint8))


def save(im, name, size, quality):
    if im.size[0] != size:
        im = im.resize((size, size), Image.LANCZOS)
    im.save(os.path.join(BUILD, name), quality=quality, subsampling=0 if quality > 88 else 2)
    print(name, os.path.getsize(os.path.join(BUILD, name)) // 1024, "KB")


def main():
    f = np.load(os.path.join(BUILD, "fist_arm.npz"))
    base, mr, nrm = images(os.path.join(ART, "empty_hand.glb"))
    fist = to_lab(np.asarray(base, float) / 255)
    want = fist[mask(f["V_L"], f["N_L"], f["uv_L"], f["tri_L"], base.size[0], FACING["attack"])]
    w_mean, w_std = middle(want)
    print("the fist's skin: mean", w_mean.round(3), "spread", w_std.round(3))
    save(Image.fromarray((from_lab(fist + LIFE + DETAIL * creases(nrm) * [1, 0, 0]) * 255 + 0.5).astype(np.uint8)), "fist_skin.jpg", 2048, 90)
    save(skin_mr(mr), "fist_mr.jpg", 1024, 85)
    save(nrm, "fist_nrm.jpg", 2048, 85)
    for model, art in (("closer", "attack_closer"), ("raise", "raise")):
        d = np.load(os.path.join(BUILD, model + "_fixed.npz"))
        base, mr, nrm = images(os.path.join(ART, art + ".glb"))
        lab = to_lab(np.asarray(base, float) / 255)
        here = lab[mask(d["V"], d["N"], d["uv"], d["tri"], base.size[0], FACING["raise_" if model == "raise" else model])]
        mean, std = middle(here)
        print(model, "skin: mean", mean.round(3), "spread", std.round(3))
        # (the sculpts were made from pictures on a magenta screen, and it's still along their edges: those points get the skin's own colour back)
        pink = np.maximum(np.clip((lab[..., 2] - mean[2] - PINK_RED) / 0.03, 0, 1), np.clip((mean[1] - lab[..., 1] - PINK_BLUE) / 0.04, 0, 1))[..., None]
        lab[..., 1:] = lab[..., 1:] * (1 - pink) + mean[1:] * pink
        ratio = np.minimum(1 + SPREAD * (w_std / std - 1), RANGE_MOST)
        ratio[1:] = TINT_RANGE      # (blotches of red are how the pink shows: the skin keeps its light and dark, and evens out its colour)
        out = (lab - mean) * ratio
        out[..., 1:] = TINT_MOST * np.tanh(out[..., 1:] / TINT_MOST)     # (and no blotch of any colour stands out, however strong it was)
        out += w_mean + LIFE + DETAIL * creases(nrm) * [1, 0, 0]
        save(Image.fromarray((from_lab(out) * 255 + 0.5).astype(np.uint8)), model + "_skin.jpg", 2048, 90)
        save(skin_mr(mr), model + "_mr.jpg", 1024, 85)
        save(nrm, model + "_nrm.jpg", 2048, 85)


if __name__ == "__main__":
    main()
