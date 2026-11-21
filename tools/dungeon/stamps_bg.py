# Builds and writes every stamp in a background Blender, when the live one (Blender MCP) can't be reached:
#   "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --factory-startup --python tools/dungeon/stamps_bg.py
# Optionally --  NAME ... to rebuild only those (the rest are built too, since the file is new; the list just prints).
import bpy, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, '..', '..'))
for ob in list(bpy.data.objects):
    bpy.data.objects.remove(ob, do_unlink=True)
exec(open(os.path.join(HERE, 'stamps.py'), encoding='utf-8').read())
print('built', build())
print('wrote', export(os.path.join(REPO, 'src', 'core', 'delve-stamps-data.js')))
