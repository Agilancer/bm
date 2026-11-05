"""Rebuilds the Gravehart from art/gravehart/gravehart_source.glb. Needs Blender on PATH, or in $BLENDER.

    python tools/gravehart/build.py
"""
import os
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
HERE = os.path.join(ROOT, "tools", "gravehart")
BUILD = os.path.join(HERE, "build")
OUT = os.path.join(ROOT, "assets", "monsters", "gravehart")
BLENDER = os.environ.get("BLENDER", "blender")


def blender(script, blend=None):
    cmd = [BLENDER, "-b"] + ([os.path.join(BUILD, blend)] if blend else ["--factory-startup"])
    subprocess.run(cmd + ["--python-exit-code", "1", "--python", os.path.join(HERE, script)], cwd=ROOT, check=True)


os.makedirs(BUILD, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
blender("rig.py")
blender("anim.py", "rigged.blend")
blender("export.py", "anim.blend")
subprocess.run([sys.executable, os.path.join(HERE, "strip_glb.py"), os.path.join(BUILD, "gravehart.glb")], check=True)
shutil.copy(os.path.join(BUILD, "gravehart.glb"), os.path.join(OUT, "gravehart.glb"))
shutil.copy(os.path.join(BUILD, "clips.json"), os.path.join(OUT, "clips.json"))
shutil.copy(os.path.join(BUILD, "anim.blend"), os.path.join(ROOT, "art", "gravehart", "gravehart_rig.blend"))
