"""Phone copies of the models' big pictures: assets/lean/.

A model's pictures come inside its GLB at 2048 or 4096 a side, and a phone shows none of them over 1024 (src/gfx/gpu.js
TIERS.mobile: texScale 0.25 of the picture, and a cap under that). Decoding the whole picture to shrink it was the phone's
biggest passing want of memory: 64 MB at once for a 4096 picture, 16 MB for a 2048, and some 2 GB of pixels decoded through
a load. This writes each such picture again at 1024 on its longer side, in its own kind (a JPEG as a JPEG at the same
chroma, a PNG as a PNG, a WebP as a WebP), and assets/lean/pictures.json, which names them by the original's own bytes
(src/gfx/lean-pictures.js pictureKey: its length and a hash of three samples of it). The game decodes a copy only where
what it wants is no bigger than the copy, and sizes what it makes from the original's sides, so every texture comes out
the size it was (src/gfx/renderer.js bitmapTexture).

Not Lisandra's (assets/game/lisandra/): she is shown as the owner made her, file for file. The game finds a copy by the
picture's bytes, not its file, so no copy is made of any picture that is also hers, wherever else it sits.

What a copy would change is left alone, and the picture is decoded from its model as before: one turned by its EXIF, one
with any see-through pixel (a resize mixes colour by its alpha, and some maps keep data there), a CMYK JPEG, a 16-bit PNG
and a lossless WebP.

Run it again whenever a model's pictures change: a copy whose original has gone is removed, and one the game can't match
to a picture is never used (tests/lean-pictures.test.mjs checks they agree).

    python tools/lean_pictures/make.py
"""
import hashlib
import io
import json
import os
import struct
import sys

from PIL import Image, JpegImagePlugin

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ASSETS = os.path.join(ROOT, "assets")
OUT = os.path.join(ASSETS, "lean")
SIDE = 1024
# (A picture only a little over 1024, as the skulls' 1025 to 1028, is decoded at near the same cost either way.)
WORTH = 1.5
SKIP = ("game/lisandra/", "lean/")
SAMPLE = 4096


def fnv1a(data):
    h = 0x811C9DC5
    for b in data:
        h = ((h ^ b) * 0x01000193) & 0xFFFFFFFF
    return h


def picture_key(data):
    """As src/gfx/lean-pictures.js pictureKey: the length, and FNV-1a over its first, middle and last 4 KB."""
    n = len(data)
    mid = n // 2
    sample = data[:SAMPLE] + data[max(0, mid - SAMPLE // 2):mid + SAMPLE // 2] + data[max(0, n - SAMPLE):]
    return f"{n}-{fnv1a(sample):08x}"


def glb_pictures(path):
    """(index, bytes) of every picture held in a GLB's own buffer."""
    b = open(path, "rb").read()
    if b[:4] != b"glTF":
        return []
    jl = struct.unpack_from("<I", b, 12)[0]
    js = json.loads(b[20:20 + jl])
    start = 20 + jl + 8
    out = []
    for k, im in enumerate(js.get("images", [])):
        if "bufferView" not in im:
            continue
        bv = js["bufferViews"][im["bufferView"]]
        o = start + bv.get("byteOffset", 0)
        out.append((k, b[o:o + bv["byteLength"]]))
    return out


def models(skipped=False):
    """(path under assets/, file) of every model; skipped: those under SKIP instead."""
    for base, dirs, files in os.walk(ASSETS):
        dirs.sort()
        for f in sorted(files):
            if f.lower().endswith(".glb"):
                p = os.path.join(base, f)
                rel = os.path.relpath(p, ASSETS).replace(os.sep, "/")
                if rel.startswith(SKIP) == skipped:
                    yield rel, p


def webp_lossless(data):
    """Whether a WebP's picture is lossless (a VP8L chunk), which a copy at quality 92 wouldn't be."""
    at = 12
    while at + 8 <= len(data):
        tag, n = data[at:at + 4], struct.unpack_from("<I", data, at + 4)[0]
        if tag in (b"VP8 ", b"VP8L"):
            return tag == b"VP8L"
        at += 8 + n + (n & 1)
    return False


def copy_of(data):
    """The picture at SIDE on its longer side, as bytes of its own kind, or None where it isn't worth one."""
    im = Image.open(io.BytesIO(data))
    w, h = im.size
    if w * h < WORTH * SIDE * SIDE:
        return None
    if im.getexif().get(0x0112, 1) != 1:
        raise ValueError("turned by its EXIF, which a copy would lose")
    s = SIDE / max(w, h)
    size = (max(1, round(w * s)), max(1, round(h * s)))
    kind = im.format
    if kind == "JPEG" and im.mode not in ("RGB", "L"):
        raise ValueError(f"a {im.mode} JPEG")
    if kind == "PNG" and data[24] != 8:
        raise ValueError(f"a {data[24]}-bit PNG")
    if kind == "WEBP" and webp_lossless(data):
        raise ValueError("a lossless WebP")
    sampling = JpegImagePlugin.get_sampling(im) if kind == "JPEG" else None
    if im.mode not in ("RGB", "RGBA", "L"):
        im = im.convert("RGBA" if "A" in im.mode or "transparency" in im.info else "RGB")
    if im.mode == "RGBA":
        if im.getchannel("A").getextrema()[0] < 255:
            raise ValueError("see-through, which a resize would mix by")
        im = im.convert("RGB")
    small = im.resize(size, Image.LANCZOS)
    buf = io.BytesIO()
    if kind == "JPEG":
        small.save(buf, "JPEG", quality=92, subsampling=sampling, optimize=True)
        ext = "jpg"
    elif kind == "PNG":
        small.save(buf, "PNG", optimize=True)
        ext = "png"
    elif kind == "WEBP":
        small.save(buf, "WEBP", quality=92, method=6)
        ext = "webp"
    else:
        raise ValueError(f"a {kind}, which this doesn't copy")
    return (w, h), size, ext, buf.getvalue()


def main():
    os.makedirs(OUT, exist_ok=True)
    pictures, seen, left = {}, {}, {}
    made = 0
    theirs = {picture_key(data) for _, path in models(skipped=True) for _, data in glb_pictures(path)}
    for rel, path in models():
        for k, data in glb_pictures(path):
            w, h = Image.open(io.BytesIO(data)).size
            if w * h < WORTH * SIDE * SIDE:
                continue
            key = picture_key(data)
            full = hashlib.sha1(data).hexdigest()
            if key in theirs:
                if key not in seen:
                    left[key] = f"{rel}#{k}: also Lisandra's"
                seen[key] = full
                continue
            if key in seen:
                if seen[key] != full:
                    sys.exit(f"two different pictures share the key {key} ({rel} #{k}): lengthen the sample")
                if key in pictures:
                    pictures[key]["in"].append(f"{rel}#{k}")
                continue
            seen[key] = full
            try:
                got = copy_of(data)
            except ValueError as e:
                left[key] = f"{rel}#{k}: {e}"
                continue
            if not got:
                continue
            (w, h), (cw, ch), ext, small = got
            name = f"{key}.{ext}"
            dest = os.path.join(OUT, name)
            if not os.path.exists(dest) or open(dest, "rb").read() != small:
                with open(dest, "wb") as f:
                    f.write(small)
                made += 1
            pictures[key] = {"file": name, "size": [w, h], "copy": [cw, ch], "sha1": full, "in": [f"{rel}#{k}"]}
    keep = {p["file"] for p in pictures.values()} | {"pictures.json"}
    gone = [f for f in os.listdir(OUT) if f not in keep]
    for f in gone:
        os.remove(os.path.join(OUT, f))
    # (left: big pictures with no copy, and why; tests/lean-pictures.test.mjs knows them from one that was missed.)
    manifest = {"side": SIDE, "pictures": dict(sorted(pictures.items())), "left": dict(sorted(left.items()))}
    with open(os.path.join(OUT, "pictures.json"), "w", newline="\n") as f:
        json.dump(manifest, f, indent=1)
        f.write("\n")
    size = sum(os.path.getsize(os.path.join(OUT, p["file"])) for p in pictures.values())
    for why in left.values():
        print(f"left {why}")
    print(f"{len(pictures)} copies ({made} written, {len(gone)} removed, {len(left)} left), {size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
