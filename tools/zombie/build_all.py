"""Rig a zombie, solve its clips and write its GLBs, from nothing, in a background Blender:

    blender -b --factory-startup --python-exit-code 1 --python tools/zombie/build_all.py -- 1

Keep this out of a live Blender: it clears the file first. What comes after -- picks the model: 1 to 6, ogre, necromancer, zombie_necromancer or evil_wizard.
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import caster
import clips
import export
import rig

model = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "1"
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
arm, mesh, _ = rig.build(model)
if model in caster.CASTERS:
    export.run_caster(model, arm, mesh, caster.build(arm, mesh))
else:
    export.run(model, arm, mesh, clips.build(arm, mesh))
