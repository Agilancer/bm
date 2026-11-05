"""blender -b --factory-startup --python-exit-code 1 --python tools/interior/run_build.py"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
path = os.path.join(HERE, "build_interior.py")
g = {"ROOT_OVERRIDE": os.path.dirname(os.path.dirname(HERE)), "__name__": "build", "__file__": path}
exec(open(path, encoding="utf8").read(), g)
g["build"]()
