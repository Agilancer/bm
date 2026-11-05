"""blender -b --factory-startup --python-exit-code 1 --python tools/village/run_build.py"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(HERE, "build_village.py")
g = {"__name__": "build", "__file__": path}
exec(open(path, encoding="utf8").read(), g)
g["build"]()
