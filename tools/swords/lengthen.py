"""Draws out the blades of the one-handed swords, the hilts left as they are on the fist.

A sheet's swords were laid out with their tips 0.60 m from the fist, which is a long knife: a real arming sword has a blade of
80 to 85 cm (an Angus Trim type XIV: blade 84.5 cm, overall 97.8 cm, 0.98 kg, balance 14.6 cm from the guard). Seen from behind
the fist, foreshortened, even that reads short, so they run a little past it, to the greatswords' reach from the fist. Scaling the
whole sword would swell its handle out of the fist, so only what's past the guard moves, along the blade.

    python tools/swords/atlas.py       # (after that, if it's run again)
    python tools/swords/lengthen.py    # safe to run twice: a blade that's already long stays as it is
"""
import io
import json
import os
import struct

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, "assets", "game", "items")
TIP = 1.00                                 # the tip from the fist (metres)
HANDS = 1                                  # (a two-hander's blade is already a metre)
SHOULDER = 0.012                           # how far past the guard's top the blade starts to draw out
WIDTH = 1.30                               # drawn out along its length only a blade tapers like a skewer: this much wider toward its point (a real blade's nearly parallel)
WIDTH_BY = 0.35                            # ...reached this far up the blade, from nothing at the guard


def guard_top(P):
    """Where the hilt stops along the sword: the top of the guard, whatever hangs off it."""
    y, z = P[:, 1], np.abs(P[:, 2])
    low = (y > 0.0) & (y < 0.25)
    wide = z[low].max()
    return float(y[low][z[low] > 0.55 * wide].max())      # (the manifest's numbers must be plain floats)


def widened(s, width):
    """How much wider a blade is this far up it (from 0 at the guard to 1 at the tip)."""
    q = np.clip(s / WIDTH_BY, 0, 1)
    return 1 + (width - 1) * q * q * (3 - 2 * q)


def drawn_out(P, N, tip=TIP, top=None, had=1.0):
    """Points and normals with the blade running on to `tip` and widened, and the hilt's top and the blade's factor. `had`: how wide it's been made already."""
    top = guard_top(P) if top is None else top
    y0 = top + SHOULDER
    k = float((tip - y0) / (P[:, 1].max() - y0))
    Q, M = P.copy(), N.copy()
    past = Q[:, 1] > y0
    Q[past, 1] = y0 + (Q[past, 1] - y0) * k
    M[past, 1] = M[past, 1] / k
    wide = widened((Q[past, 1] - y0) / (tip - y0), WIDTH) / widened((Q[past, 1] - y0) / (tip - y0), had)
    Q[past, 2] = Q[past, 2] * wide
    M[past, 2] = M[past, 2] / wide
    M[past] /= np.maximum(np.linalg.norm(M[past], axis=1, keepdims=True), 1e-9)
    return Q, M, y0, k


def lengthen_glb(path, had=1.0):
    """Rewrites a sword's GLB in place: its points, its normals and the bounds in its header, nothing else."""
    raw = bytearray(open(path, "rb").read())
    jl = struct.unpack("<I", raw[12:16])[0]
    j = json.loads(raw[20:20 + jl])
    base = 20 + jl + 8
    pr = next(m for m in j["meshes"])["primitives"][0]

    def where(i):
        a = j["accessors"][i]
        bv = j["bufferViews"][a["bufferView"]]
        return base + bv.get("byteOffset", 0) + a.get("byteOffset", 0), a["count"]

    (op, n), (on, _) = where(pr["attributes"]["POSITION"]), where(pr["attributes"]["NORMAL"])
    P = np.frombuffer(raw, np.float32, n * 3, op).reshape(-1, 3).copy()
    N = np.frombuffer(raw, np.float32, n * 3, on).reshape(-1, 3).copy()
    Q, M, y0, k = drawn_out(P, N, had=had)
    raw[op:op + n * 12] = Q.astype(np.float32).tobytes()
    raw[on:on + n * 12] = M.astype(np.float32).tobytes()
    a = j["accessors"][pr["attributes"]["POSITION"]]
    a["min"], a["max"] = [float(x) for x in Q.min(0)], [float(x) for x in Q.max(0)]
    text = json.dumps(j, separators=(",", ":")).encode()
    text += b" " * (-len(text) % 4)
    rest = bytes(raw[base - 8:])       # (the binary chunk, with its header)
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(text) + len(rest)) + struct.pack("<II", len(text), 0x4E4F534A) + text + rest
    open(path, "wb").write(out)
    return y0, k, Q


def stretch_icon(path, y0_old, y1_old, cut, k, y0_new, y1_new):
    """A sword's inventory icon to match: the blade's rows drawn out, then the whole fitted back into the same 1 by 4."""
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    row = lambda y: int(round((y1_old - y) / (y1_old - y0_old) * h))
    r = row(cut)
    blade, hilt = im.crop((0, 0, w, r)), im.crop((0, r, w, h))
    tall = Image.new("RGBA", (w, int(round(r * k)) + h - r), (0, 0, 0, 0))
    tall.paste(blade.resize((w, int(round(r * k))), Image.LANCZOS), (0, 0))
    tall.paste(hilt, (0, int(round(r * k))))
    scale = (y1_old - y0_old) / (y1_new - y0_new)
    small = tall.resize((max(1, int(round(w * scale))), h), Image.LANCZOS)
    back = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    back.paste(small, ((w - small.width) // 2, 0))
    buf = io.BytesIO()
    back.save(buf, "WEBP", quality=90, method=6)
    open(path, "wb").write(buf.getvalue())


def widen_icon(path, y0_old, y1_old, cut, tip, had):
    """A sword's inventory icon to match: each of the blade's rows widened about the middle."""
    im = np.asarray(Image.open(path).convert("RGBA"), float)
    h, w = im.shape[:2]
    xs = np.arange(w) - (w - 1) / 2
    for r in range(h):
        y = y1_old - (r + 0.5) / h * (y1_old - y0_old)
        if y <= cut:
            continue
        f = float(widened(np.array((y - cut) / (tip - cut)), WIDTH) / widened(np.array((y - cut) / (tip - cut)), had))
        for c in range(4):
            im[r, :, c] = np.interp(xs / f, xs, im[r, :, c])
    buf = io.BytesIO()
    Image.fromarray(im.round().astype(np.uint8), "RGBA").save(buf, "WEBP", quality=90, method=6)
    open(path, "wb").write(buf.getvalue())


def main():
    at = os.path.join(OUT, "swords.json")
    manifest = json.load(open(at))
    for name, m in manifest["swords"].items():
        if m.get("hands") != HANDS or "file" not in m:
            continue
        had = m.get("blade_width", 1.0)
        y0, k, Q = lengthen_glb(os.path.join(ROOT, m["file"]), had)
        y0 = float(y0)
        was = m["tip"]
        if abs(k - 1) > 1e-4:
            old_y = list(m["frame"]["y"])
            for s in m["sockets"]:
                if s["y"] > y0:
                    s["y"] = round(y0 + (s["y"] - y0) * k, 4)
            top = old_y[1] + (TIP - was)
            h = top - old_y[0]
            m["frame"] = dict(y=[round(old_y[0], 4), round(top, 4)], z=round(h / 8, 4))
            stretch_icon(os.path.join(ROOT, m["icon"]), old_y[0], old_y[1], y0, k, old_y[0], top)
        if abs(had - WIDTH) > 1e-4:
            widen_icon(os.path.join(ROOT, m["icon"]), m["frame"]["y"][0], m["frame"]["y"][1], y0, TIP, had)
        m["blade_width"] = WIDTH
        m["tip"] = TIP
        print(f"{name:20s} the blade from {y0:+.3f} drawn out x{k:.3f}, tip {was:.2f} to {float(Q[:, 1].max()):.3f}")
    text = json.dumps(manifest, indent=1)
    with open(at, "w") as f:
        f.write(text)


if __name__ == "__main__":
    main()
