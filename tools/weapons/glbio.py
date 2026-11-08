"""The staffs' cutter's GLB reading, atlas packing and writing (tools/staffs2/cut.py), for any sheet's map size."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "staffs2"))
import cut as staffcut  # noqa: E402


def read_glb(path):
    g = staffcut.read_glb(path)
    staffcut.TEX = g["maps"][0].shape[0]      # (the cutter's charts are in texels of the sheet's maps)
    assert all(m.shape[:2] == (staffcut.TEX, staffcut.TEX) for m in g["maps"]), "maps not square or not alike"
    return g
