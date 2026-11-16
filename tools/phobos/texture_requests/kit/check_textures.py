"""Check finished textures against REQUEST.json before packing them.

Usage:  python scripts/check_textures.py finished/          (files named <id>.png, .jpg or .webp)
Writes: check_report.json and previews/<id>_repeat.jpg (the picture repeated, so a seam or a repeating blotch shows).

For each texture it measures:
  seam     how much sharper the picture changes across its wrap than inside it, on each axis it must repeat on
           (1.0 = no different; up to 1.6 passes; over 2.5 is a visible seam)
  light    how uneven the broad light is across the picture (0 = even; over 0.45 means a vignette, a sun patch or a
           dark corner, which shows as a grid when the tile repeats)
  value    mean brightness, 0 to 1 (tiles want 0.18 to 0.55: we darken them later, but detail lost to black is lost)
  sat      mean colour saturation (over 0.55 is usually too garish for this game)
  ground   masks and decals: how much of the background is not black (decals want under 0.35; edges must be black)
Nothing here judges taste: look at every preview yourself as well.
Needs only Pillow and numpy.
"""
import json, sys, os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REQ = json.load(open(os.path.join(HERE, '..', 'REQUEST.json'), encoding='utf-8'))


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def seam(L, axis):
    # Mean change across the wrap (last line to first) over mean change between neighbouring lines inside.
    if axis == 'x':
        wrap = np.abs(L[:, -1] - L[:, 0]).mean(); inside = np.abs(np.diff(L, axis=1)).mean()
    else:
        wrap = np.abs(L[-1, :] - L[0, :]).mean(); inside = np.abs(np.diff(L, axis=0)).mean()
    return float(wrap / max(inside, 1e-4))


def light(L):
    s = Image.fromarray((L * 255).astype(np.uint8)).resize((8, 8), Image.BOX)
    v = np.asarray(s, dtype=np.float32) / 255
    return float((np.percentile(v, 95) - np.percentile(v, 5)) / max(v.mean(), 0.05))


def preview(img, wrap, path):
    w, h = img.size
    nx, ny = (2 if 'x' in wrap else 1), (2 if 'y' in wrap else 1)
    if wrap == 'x': nx = 3
    if wrap == 'y': ny = 3
    out = Image.new('RGB', (w * nx, h * ny))
    for i in range(nx):
        for j in range(ny):
            out.paste(img, (i * w, j * h))
    out.thumbnail((1400, 1400))
    out.save(path, quality=85)


def check(folder):
    os.makedirs('previews', exist_ok=True)
    found = {os.path.splitext(f)[0]: os.path.join(folder, f) for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))}
    report = []
    for it in REQ['items']:
        r = {'id': it['id'], 'name': it['name']}
        p = found.get(it['id'])
        if not p:
            r['status'] = 'MISSING'; report.append(r); continue
        img = Image.open(p).convert('RGB')
        a = np.asarray(img, dtype=np.float32) / 255
        L = lum(a)
        r['size'] = list(img.size)
        r['value'] = round(float(L.mean()), 3)
        mx, mn = a.max(2), a.min(2)
        r['sat'] = round(float(((mx - mn) / np.maximum(mx, 1e-3)).mean()), 3)
        warn = []
        wrap = it['wrap']
        for ax in wrap:
            s = round(seam(L, ax), 2); r['seam_' + ax] = s
            if s > 1.6: warn.append(f'seam on {ax} is {s} (want <= 1.6): run make_tileable.py and repaint the band')
        want = {'square': 1.0, 'wide': 1.5, 'tall': 2 / 3}[it['aspect']]
        if abs(img.size[0] / img.size[1] - want) > 0.08: warn.append(f'aspect is {img.size[0]}x{img.size[1]}, wanted {it["aspect"]}')
        if it['kind'] in ('mask', 'decal'):
            ground = float((L > 0.12).mean()); r['ground'] = round(ground, 3)
            if r['sat'] > 0.15: warn.append('a mask must be greyscale (white on black)')
            if it['kind'] == 'decal':
                edge = np.concatenate([L[:4].ravel(), L[-4:].ravel(), L[:, :4].ravel(), L[:, -4:].ravel()])
                if edge.mean() > 0.05: warn.append('a decal must not touch the edges')
                if ground > 0.35: warn.append(f'decal covers {ground:.0%} of the picture (want under 35%)')
        else:
            g = round(light(L), 2); r['light'] = g
            if g > 0.45: warn.append(f'uneven light {g} (want <= 0.45): no vignette, sun patch or dark corner')
            if r['value'] < 0.18: warn.append(f'too dark ({r["value"]}): want mean 0.18 to 0.55')
            if r['value'] > 0.55 and it['kind'] != 'single': warn.append(f'too bright ({r["value"]})')
            if r['sat'] > 0.55: warn.append(f'too saturated ({r["sat"]})')
        r['warnings'] = warn
        r['status'] = 'PASS' if not warn else 'WARN'
        preview(img, wrap if wrap else 'none', os.path.join('previews', it['id'] + '_repeat.jpg'))
        report.append(r)
    json.dump(report, open('check_report.json', 'w'), indent=1)
    for r in report:
        print(f"{r['id']:<28} {r['status']:<8} " + '; '.join(r.get('warnings', [])))
    n = sum(r['status'] == 'PASS' for r in report)
    print(f'\n{n} pass, {sum(r["status"] == "WARN" for r in report)} warn, {sum(r["status"] == "MISSING" for r in report)} missing of {len(report)}')


if __name__ == '__main__':
    check(sys.argv[1] if len(sys.argv) > 1 else 'finished')
