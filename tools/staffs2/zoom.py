"""Zoomed front view of a staff's top, with a 5 cm grid labelled in metres, to place the boxes of what hangs. python zoom.py out.png id... """
import sys
import numpy as np
from PIL import Image, ImageDraw
import preview

K = 700


def view(g, y0=-0.45, y1=0.72, axis="front"):
    P, F, UV, alb = g["P"], g["F"], g["UV"], g["maps"][0]
    sx, sy, depth = (P[:, 2], P[:, 1], -P[:, 0]) if axis == "front" else (-P[:, 0], P[:, 1], -P[:, 2])
    w = int(0.56 * K); H = int((y1 - y0) * K)
    img = Image.new("RGB", (w, H), (40, 40, 44)); d = ImageDraw.Draw(img)
    X = w / 2 + sx * K; Y = H - (sy - y0) * K
    h, ww = alb.shape[:2]; c = UV[F].mean(1)
    col = alb[np.clip((c[:, 1] * h).astype(int), 0, h - 1), np.clip((c[:, 0] * ww).astype(int), 0, ww - 1)].astype(float)
    if g["D"] is not None:
        dd = g["D"][F, 1].mean(1)
        col = col * (1 - 0.6 * dd[:, None]) + np.array([255, 40, 200]) * 0.6 * dd[:, None]
    for t in np.argsort(depth[F].mean(1)):
        d.polygon([(X[i], Y[i]) for i in F[t]], fill=tuple(int(v) for v in col[t]))
    for v in np.arange(-0.25, 0.26, 0.05):
        x = w / 2 + v * K; d.line([(x, 0), (x, H)], fill=(90, 90, 90) if abs(v) > 1e-6 else (200, 200, 0)); d.text((x + 2, 2), f"{v:+.2f}", fill=(160, 160, 160))
    for v in np.arange(np.ceil(y0 / 0.05) * 0.05, y1, 0.05):
        y = H - (v - y0) * K; d.line([(0, y), (w, y)], fill=(90, 90, 90)); d.text((2, y - 11), f"{v:+.2f}", fill=(160, 160, 160))
    return img


if __name__ == "__main__":
    tiles = []
    for n in sys.argv[2:]:
        g = preview.load(n)
        a = view(g); b = view(g, axis="side")
        t = Image.new("RGB", (a.width * 2 + 4, a.height + 14)); t.paste(a, (0, 14)); t.paste(b, (a.width + 4, 14))
        ImageDraw.Draw(t).text((4, 1), n, fill=(255, 255, 255)); tiles.append(t)
    S = Image.new("RGB", (sum(t.width + 6 for t in tiles), tiles[0].height)); x = 0
    for t in tiles: S.paste(t, (x, 0)); x += t.width + 6
    S.save(sys.argv[1])
