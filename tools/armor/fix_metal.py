"""Give models made by rig_armor.py the metal map its paint calls for: steel and gold metal, skin, hair, leather and
coloured cloth not (rig_armor.paint_metal). Before 2026-11-09 every non-cloth texel was marked 96% metal, so the heroes',
the town knights' and the Bellwright's faces were drawn as blackened steel: nearly black.

Only the metal/roughness picture changes (image 2: R occlusion, G roughness, B metal). The paint, the normal map, the
mesh and the rig are copied byte for byte. A model done once is marked (asset.extras.metalFix) and left alone after.

Usage:
  python fix_metal.py <model.glb> ...        # rewrite in place
  python fix_metal.py --check <model.glb>    # print what would change, write nothing
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig_armor import repaint_metal  # noqa: E402

PAINT, MR = 0, 2  # image indices, as renderer.js buildCharacter reads them


def read_glb(path):
    b = open(path, "rb").read()
    n = struct.unpack_from("<I", b, 12)[0]
    js = json.loads(b[20:20 + n])
    o = 20 + n
    bn = struct.unpack_from("<I", b, o)[0]
    return js, bytearray(b[o + 8:o + 8 + bn])


def view_bytes(js, blob, image):
    bv = js["bufferViews"][js["images"][image]["bufferView"]]
    off = bv.get("byteOffset", 0)
    return bytes(blob[off:off + bv["byteLength"]])


def replace_view(js, blob, view, data):
    """A new buffer with one view's bytes swapped: every view copied in its old order, each started on 4 bytes."""
    out = bytearray()
    for i in sorted(range(len(js["bufferViews"])), key=lambda i: js["bufferViews"][i].get("byteOffset", 0)):
        bv = js["bufferViews"][i]
        off = bv.get("byteOffset", 0)
        chunk = data if i == view else blob[off:off + bv["byteLength"]]
        out += b"\0" * (-len(out) % 4)
        bv["byteOffset"] = len(out)
        bv["byteLength"] = len(chunk)
        out += chunk
    js["buffers"][0]["byteLength"] = len(out)
    return out


def write_glb(path, js, blob):
    j = json.dumps(js, separators=(",", ":")).encode()
    j += b" " * (-len(j) % 4)
    blob = bytes(blob) + b"\0" * (-len(blob) % 4)
    with open(path, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 28 + len(j) + len(blob)))
        f.write(struct.pack("<I4s", len(j), b"JSON") + j)
        f.write(struct.pack("<I4s", len(blob), b"BIN\0") + blob)


def fix(path, check=False):
    js, blob = read_glb(path)
    if js.get("asset", {}).get("extras", {}).get("metalFix"):
        print(f"{os.path.basename(path):28s} done already")
        return
    mr_img = Image.open(io.BytesIO(view_bytes(js, blob, MR))).convert("RGB")
    mr = np.asarray(mr_img, dtype=np.float32) / 255
    paint = Image.open(io.BytesIO(view_bytes(js, blob, PAINT))).convert("RGB").resize(mr_img.size, Image.BOX)
    a = np.asarray(paint, dtype=np.float32) / 255
    metal, rough = repaint_metal(a, mr[..., 2], mr[..., 1])
    print(f"{os.path.basename(path):28s} metal {mr[..., 2].mean():.2f} -> {metal.mean():.2f}, "
          f"rough {mr[..., 1].mean():.2f} -> {rough.mean():.2f}")
    if check:
        return
    out = np.stack([mr[..., 0], rough, metal], -1)
    buf = io.BytesIO()
    mime = js["images"][MR].get("mimeType", "image/jpeg")
    img = Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))
    if mime == "image/png":
        img.save(buf, "PNG")
    else:
        img.save(buf, "JPEG", quality=86, subsampling=0)  # as rig_armor.py writes it
    blob = replace_view(js, blob, js["images"][MR]["bufferView"], buf.getvalue())
    js.setdefault("asset", {}).setdefault("extras", {})["metalFix"] = 1
    write_glb(path, js, blob)


if __name__ == "__main__":
    args = sys.argv[1:]
    check = "--check" in args
    for p in [a for a in args if a != "--check"]:
        fix(p, check)
