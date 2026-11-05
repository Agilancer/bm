"""Gives each shield from tools/shields/separate.py an atlas of its own, the same way as the swords (tools/swords/atlas.py), at half the
sheet's texels, since a shield takes a quarter of a sheet, and writes it to assets/game/items.

    (separate.py, in Blender)
    python tools/shields/atlas.py
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "swords"))
import atlas  # noqa: E402

IDS = ["kite_cross", "kite_lion", "kite_fleur", "kite_eagle", "kite_royal_lion", "kite_silver_cross", "kite_dragon", "kite_tree",
       "kite_v_red", "kite_v_violet", "kite_v_bone", "kite_v_steel", "kite_t_white", "kite_t_black", "kite_t_red", "kite_t_blue",
       "kite_sun", "kite_ember", "kite_elder", "kite_frost"]
SIDE = 1024       # the atlas each is written at, whatever its charts packed into


def build():
    for name in IDS:
        g = atlas.read_glb(os.path.join(atlas.BUILD, f"{name}.glb"))
        charts = atlas.all_charts([g])
        placed = None
        for S in range(512, atlas.TEX + 1, 256):
            placed = atlas.pack(charts, S)
            if placed:
                break
        assert placed, f"{name} doesn't fit a {atlas.TEX} atlas"
        UVn = np.zeros((len(g["UV"]), 2))
        out = [np.zeros((S, S, 3), np.uint8) for _ in g["maps"]]
        done = np.zeros((S, S), bool)
        for c in charts:
            dx, dy = placed[c["id"]]
            ys, xs = c["copy"]
            ty, tx = ys + dy, xs + dx
            for o, m in zip(out, g["maps"]):
                o[ty, tx] = m[ys + c["y"], xs + c["x"]]
            done[ty, tx] = True
            UVn[c["verts"]] = (g["UV"][c["verts"]] * atlas.TEX + (dx - c["x"], dy - c["y"])) / S
        near = ndimage.distance_transform_edt(~done, return_distances=False, return_indices=True)
        out = [o[near[0], near[1]] for o in out]
        if S > SIDE:
            out = [np.array(Image.fromarray(o).resize((SIDE, SIDE), Image.LANCZOS)) for o in out]
        size = atlas.write(os.path.join(atlas.OUT, f"{name}.glb"), name, g, UVn, out, [])
        V = g["P"]
        print(f"{name:18s} {size / 1e6:5.2f} MB  {len(V):5d} verts {len(g['F']):5d} tris  {len(charts):4d} charts  packed {S}  use {done.mean() * 100:.0f}%  "
              f"x +-{np.abs(V[:, 0]).max():.3f} y[{V[:, 1].min():+.3f},{V[:, 1].max():+.3f}] z[{V[:, 2].min():+.3f},{V[:, 2].max():+.3f}]", flush=True)


if __name__ == "__main__":
    build()
