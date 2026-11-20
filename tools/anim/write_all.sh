#!/bin/sh
# Every body's gaits out of tools/build/anim/motions (tools/anim/export.py wrote them) into the game's files.
set -e
cd "$(dirname "$0")/../.."
M=tools/build/anim/motions
python tools/anim/write.py glb assets/game/player/wizard.glb $M/wizard --rename walk=walk_old,run=run_old | tail -1
python tools/anim/write.py bank assets/game/clips.json assets/game/clips.bin $M/hero --prefix A_ | tail -1
python tools/anim/write.py glb assets/game/lisandra/pretty.glb $M/pretty --rename run=run_old | tail -1
python tools/anim/write.py glb assets/game/lisandra/witch.glb $M/witch --rename run=run_old | tail -1
