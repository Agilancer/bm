"""Fill a texture atlas's empty background from its islands (push-pull), so shrinking and mipmaps don't pull black in.

    python tools/phobos/pad_texture.py <in.png> <out.png>

Meshy's atlases are hundreds of small islands on pure black. The game shrinks the paint to 1024 (tools/folk/paint.py)
and the GPU's mipmaps average further, so every island's edge, and at a distance the whole body, goes dark and grey
(Apricot's skin read as ash, her face speckled). Here each empty texel (pure black) takes a smooth blend of the nearest
painted ones: the image is halved again and again keeping only painted texels, then filled back up level by level.
Painted texels are never changed.
"""
import sys

import numpy as np
from PIL import Image


def push_pull(rgb, filled):
    """rgb (H, W, 3) float, filled (H, W) bool -> rgb with every unfilled texel taken from the coarser levels."""
    if min(rgb.shape[:2]) <= 1 or filled.all():
        return rgb
    h, w = rgb.shape[:2]
    H, W = (h + 1) // 2 * 2, (w + 1) // 2 * 2
    c = np.zeros((H, W, 3), np.float32); c[:h, :w] = rgb * filled[..., None]
    m = np.zeros((H, W), np.float32); m[:h, :w] = filled
    cs = c.reshape(H // 2, 2, W // 2, 2, 3).sum((1, 3)); ms = m.reshape(H // 2, 2, W // 2, 2).sum((1, 3))
    small = cs / np.maximum(ms, 1e-6)[..., None]
    small = push_pull(small, ms > 0)
    up = np.repeat(np.repeat(small, 2, 0), 2, 1)[:h, :w]
    out = rgb.copy()
    out[~filled] = up[~filled]
    return out


def pad(src, dst):
    img = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
    filled = img.sum(-1) > 3
    out = push_pull(img, filled)
    Image.fromarray(np.clip(np.rint(out), 0, 255).astype(np.uint8)).save(dst)
    print("padded", dst, "empty texels filled", int((~filled).sum()), "of", filled.size)


if __name__ == "__main__":
    pad(sys.argv[1], sys.argv[2])
