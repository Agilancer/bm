"""Make a texture's seams fixable: shift it by half so the old edges meet in the middle, and draw a mask over that band.

Usage:  python scripts/make_tileable.py raw/<id>.png <wrap>        (wrap: xy, x or y, as REQUEST.json says)
Writes: work/<id>_shifted.png  (the picture rolled by half; its outer edges now already repeat perfectly)
        work/<id>_mask.png     (white where the old seam now runs: the band to repaint; black: keep exactly)
        work/<id>_quickfix.png (a fallback with the band blended, for when masked editing is not possible)

Then, with your image tool's masked edit (inpainting), give it the shifted picture and the mask and ask it to repaint
only the white band so the material runs on naturally through it, matching the rest exactly. The result repeats
seamlessly. Save it as finished/<id>.png.
If masked editing is not available, check work/<id>_quickfix.png: it is acceptable for masks, cloth, ground and
other irregular materials, but NOT for coursed stone, brick, tiles or planks (the courses go soft and doubled in the
band). For those, regenerate instead and say so in notes.txt.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter


def main(path, wrap):
    os.makedirs('work', exist_ok=True)
    name = os.path.splitext(os.path.basename(path))[0]
    img = Image.open(path).convert('RGB')
    a = np.asarray(img)
    h, w = a.shape[:2]
    sx, sy = (w // 2 if 'x' in wrap else 0), (h // 2 if 'y' in wrap else 0)
    rolled = np.roll(np.roll(a, sx, axis=1), sy, axis=0)
    Image.fromarray(rolled).save(f'work/{name}_shifted.png')
    m = np.zeros((h, w), np.uint8)
    bw, bh = max(16, w // 9), max(16, h // 9)
    if 'x' in wrap: m[:, sx - bw // 2: sx + bw // 2] = 255
    if 'y' in wrap: m[sy - bh // 2: sy + bh // 2, :] = 255
    Image.fromarray(m).save(f'work/{name}_mask.png')
    # Fallback: inside the band, blend toward the picture mirrored about the seam (a soft fade).
    soft = np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(max(bw, bh) / 4)), dtype=np.float32)[..., None] / 255
    blur = np.asarray(Image.fromarray(rolled).filter(ImageFilter.GaussianBlur(3)), dtype=np.float32)
    mix = rolled.astype(np.float32) * (1 - soft * 0.6) + blur * (soft * 0.6)
    Image.fromarray(mix.clip(0, 255).astype(np.uint8)).save(f'work/{name}_quickfix.png')
    print(f'work/{name}_shifted.png, work/{name}_mask.png, work/{name}_quickfix.png')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'xy')
