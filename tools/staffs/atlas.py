"""Gives each staff from tools/staffs/separate.py an atlas of its own, the same way as the swords (tools/swords/atlas.py), and adds
them to assets/game/items/swords.json.

    (separate.py, in Blender)
    python tools/staffs/atlas.py
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "swords"))
import atlas  # noqa: E402

SOURCE = "staffs_3_common.glb"
IDS = ("greenwood_staff", "crystal_staff", "skullhorn_staff", "gnarled_crook")


def check(sheet, staffs):
    """Nothing lost and nothing from a neighbour."""
    src = atlas.read_glb(os.path.join(atlas.ROOT, "art", "staffs", SOURCE))
    total = 0
    for spec, raw in zip(sheet["swords"], staffs):
        g = atlas.read_glb(os.path.join(atlas.OUT, f"{spec['id']}.glb"))
        assert (g["F"] == raw["F"]).all() and (g["P"] == raw["P"]).all(), "the atlas step moved geometry"
        total += len(g["F"])
    assert total == len(src["F"]), f"{total} triangles of {len(src['F'])}"
    print(f"check {SOURCE}: {total} triangles, the whole sheet and none twice")


def build():
    path = os.path.join(atlas.OUT, "swords.json")
    with open(path) as f:
        manifest = json.load(f)
    atlas.check = check
    atlas.build_sheet(dict(source=SOURCE, hands=3, tip=0.5, swords=[dict(id=i) for i in IDS]), manifest)
    with open(path, "w") as f:
        json.dump(manifest, f, indent=1)


if __name__ == "__main__":
    build()
