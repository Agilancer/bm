"""The casters' clips. Run inside Blender.

All of it is the standard library's motion, UAL's own clips on the fitted UAL skeleton, like the zombies' hits: no text-prompted
motion from Tripo, and nothing authored. The crawl alone is shared with the zombies, for one with its legs off.
"""
import bpy

import clips
import rig as riglib

CASTERS = ("necromancer", "zombie_necromancer", "evil_wizard")
# name in the game: (its clip in UAL, loop)
UAL = {
    "idle": ("Idle_Loop", True),
    "guard": ("Idle_FoldArms_Loop", True),
    "tend": ("Fixing_Kneeling", True),
    "walk": ("Walk_Loop", True),
    "stride": ("Walk_Formal_Loop", True),
    "run": ("Jog_Fwd_Loop", True),
    "cast_in": ("Spell_Simple_Enter", False),
    "cast_hold": ("Spell_Simple_Idle_Loop", True),
    "cast_out": ("Spell_Simple_Exit", False),
    "bolt": ("Spell_Simple_Shoot", False),
    "lob": ("OverhandThrow", False),
    "hit": ("Hit_Chest", False),
    "hit_head": ("Hit_Head", False),
    "knock": ("Hit_Knockback", False),
    "death": ("Death01", False),
}
# These files carry their travel in the feet, not in the root, so what each stride covers in a second is measured off a planted foot.
SPEED = {"walk": 1.03, "stride": 0.96, "run": 3.3}


def build(rig, mesh):
    meta = clips.build(rig, mesh, only=("crawl", "crawl_attack"))
    _, ual = riglib.source_clips()
    for name, (clip, loop) in UAL.items():
        copy, m = riglib.adopt_clip(ual[clip], 1.0, 1)
        old = bpy.data.actions.get("z_" + name)
        if old and old != copy:
            bpy.data.actions.remove(old)
        copy.name = "z_" + name
        meta[name] = dict(m, loop=loop, speed=SPEED.get(name, 0))
    print({k: (v["frames"], round(v["speed"], 2)) for k, v in meta.items()})
    return meta
