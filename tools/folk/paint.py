"""The townsfolk's paint, from the owner's Tripo models.  Plain Python (Pillow, NumPy):

    python tools/folk/paint.py [ids...]          every model's maps, then every swap
    python tools/folk/paint.py --swaps [swaps...]  only the swaps

For each model in tools/folk/models.json, the three maps of its SOURCE glb, made small for the game:
assets/game/folk/<id>_c.webp (base colour, 1024 square), <id>_n.webp (normal, 512, lossless: a lossy WebP's
halved chroma bends fine creases by tens of degrees) and <id>_m.webp (occlusion/roughness/metal, 256). The decimated
body keeps the source's UVs, so the maps fit it as they are.

Then the palette swaps (tools/folk/swaps.py): the same body in another person's clothes, as <swap>_c.webp.

Both write their part of assets/game/folk/folk.json; build_folk.py writes the bodies' part.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import manifest  # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CFG = json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))
OUT = os.path.join(ROOT, "assets", "game", "folk")
SIZES = {"c": 1024, "n": 512, "m": 256}


def log(*a):
    print("PAINT", *a, flush=True)


class Glb:
    """A glb read with json and struct: its document, its binary chunk, accessors as NumPy arrays and images as Pillow's."""

    def __init__(self, path):
        b = open(path, "rb").read()
        n = struct.unpack_from("<I", b, 12)[0]
        self.doc = json.loads(b[20:20 + n])
        m = struct.unpack_from("<I", b, 20 + n)[0]
        self.bin = b[28 + n:28 + n + m]

    def view(self, i):
        v = self.doc["bufferViews"][i]
        o = v.get("byteOffset", 0)
        return self.bin[o:o + v["byteLength"]]

    def accessor(self, i):
        a = self.doc["accessors"][i]
        comp = {5120: "i1", 5121: "u1", 5122: "<i2", 5123: "<u2", 5125: "<u4", 5126: "<f4"}[a["componentType"]]
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
        v = self.doc["bufferViews"][a["bufferView"]]
        size = np.dtype(comp).itemsize
        arr = np.ndarray((a["count"], width), comp, self.bin, v.get("byteOffset", 0) + a.get("byteOffset", 0),
                         (v.get("byteStride", width * size), size))
        arr = np.array(arr)
        if a.get("normalized") and comp != "<f4":
            arr = arr.astype(np.float32) / np.iinfo(comp).max
        return arr

    def image(self, tex):
        t = self.doc["textures"][tex]
        src = t.get("source", t.get("extensions", {}).get("EXT_texture_webp", {}).get("source"))
        return Image.open(io.BytesIO(self.view(self.doc["images"][src]["bufferView"])))

    def maps(self):
        """The first material's base colour, normal and metal-rough images, None where it has none."""
        mat = (self.doc.get("materials") or [{}])[0]
        pbr = mat.get("pbrMetallicRoughness", {})
        get = lambda d: self.image(d["index"]) if d else None
        return get(pbr.get("baseColorTexture")), get(mat.get("normalTexture")), get(pbr.get("metallicRoughnessTexture"))


def source(mid):
    return os.path.join(CFG["src"], CFG["models"][mid]["file"])


def save(img, name, **kw):
    path = os.path.join(OUT, name)
    img.save(path, "WEBP", method=6, **kw)
    return os.path.getsize(path)


def shrink_normal(img, size):
    """Down to size, each texel's vector made unit length again (averaging shortens them)."""
    a = np.asarray(img.convert("RGB").resize((size, size), Image.LANCZOS)).astype(np.float32) / 127.5 - 1
    a /= np.maximum(np.linalg.norm(a, axis=2, keepdims=True), 1e-6)
    return Image.fromarray(np.clip(np.rint((a + 1) * 127.5), 0, 255).astype(np.uint8))


def paint(mid):
    c, n, m = Glb(source(mid)).maps()
    flat = []
    if c is None:
        c, _ = Image.new("RGB", (8, 8), (150, 140, 128)), flat.append("c")
    if n is None:
        n, _ = Image.new("RGB", (8, 8), (128, 128, 255)), flat.append("n")
    if m is None:
        # glTF metal-rough: occlusion 1, roughness 0.85, not metal.
        m, _ = Image.new("RGB", (8, 8), (255, 217, 0)), flat.append("m")
    kb = save(c.convert("RGB").resize((SIZES["c"],) * 2, Image.LANCZOS), mid + "_c.webp", quality=90)
    kb += save(shrink_normal(n, SIZES["n"]), mid + "_n.webp", lossless=True, quality=100)
    kb += save(m.convert("RGB").resize((SIZES["m"],) * 2, Image.LANCZOS), mid + "_m.webp", quality=90)
    log(mid, "from", c.size[0], "kb", kb // 1024, "flat" if flat else "", *flat)
    update_manifest(lambda doc: doc["models"].setdefault(mid, {}).update(c=mid + "_c.webp", n=mid + "_n.webp", m=mid + "_m.webp"))
    return flat


def update_manifest(change):
    manifest.update(OUT, change)


if __name__ == "__main__":
    args = sys.argv[1:]
    os.makedirs(OUT, exist_ok=True)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    if "--swaps" in args:
        import swaps
        swaps.run([a for a in args if a != "--swaps"])
    else:
        flat = {mid: f for mid in (args or list(CFG["models"])) if (f := paint(mid))}
        if flat:
            log("flat maps written for", flat)
        if not args:
            import swaps
            swaps.run([])
