"""Swap one embedded image in a .glb for another file, leaving everything else byte for byte (no Blender round trip).

    python tools/phobos/glb_swap_texture.py <in.glb> <image.png|jpg|webp> <out.glb> [image index, default 0]

Used after tools/phobos/face_fix.py mends a face: the fitted body keeps its mesh, rig and weights, only the paint changes.
"""
import json
import struct
import sys

MIME = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}


def swap(src, img, out, idx=0):
    b = open(src, "rb").read()
    n = struct.unpack_from("<I", b, 12)[0]
    doc = json.loads(b[20:20 + n])
    bl = struct.unpack_from("<I", b, 20 + n)[0]
    binc = b[28 + n:28 + n + bl]
    new = open(img, "rb").read()
    target = doc["images"][idx]["bufferView"]
    doc["images"][idx]["mimeType"] = MIME[img.rsplit(".", 1)[-1].lower()]
    order = sorted(range(len(doc["bufferViews"])), key=lambda i: doc["bufferViews"][i].get("byteOffset", 0))
    parts, off = [], 0
    for i in order:
        v = doc["bufferViews"][i]
        data = new if i == target else binc[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
        pad = (-off) % 4
        parts.append(b"\0" * pad); off += pad
        v["byteOffset"] = off; v["byteLength"] = len(data)
        parts.append(data); off += len(data)
    blob = b"".join(parts); blob += b"\0" * ((-len(blob)) % 4)
    doc["buffers"][0]["byteLength"] = len(blob)
    js = json.dumps(doc, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(out, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack("<II", len(blob), 0x004E4942)); f.write(blob)
    print("swapped image", idx, "->", out, total)


if __name__ == "__main__":
    swap(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 0)
