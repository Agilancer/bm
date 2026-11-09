# The few sounds taken from two general packs, into assets/game/audio/ as mono MP3 (src/audio.js BANKS says what each is for):
#   "400 Sounds Pack.zip"   pickups (coins, gems, orbs), the book and the map, the pack's gear, bone and gore. (No licence in the zip.)
#   MenuSFX.zip             Kevin Fowler's menu sounds (CC BY: credited in README.md), the in-game panels' clicks. Named ui_*.
#
# Unzip the files wanted anywhere (any layout: they're found by name), then run with Blender (its `aud` module; no ffmpeg needed):
#   blender -b --factory-startup --python tools/audio/build_extra_sfx.py -- <folder>
# Each is brought to one peak (the packs are mastered louder than the Fantasy SFX Pack, tools/audio/build_fantasy_sfx.py).
import aud, os, re, sys, glob

SRC = sys.argv[sys.argv.index('--') + 1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'game', 'audio')
PEAK = 0.8

# 400 Sounds Pack: kept as named. MenuSFX: abs-<what>-1 -> ui_<what>.
KEEP = r'^(coin_collect|coins_gather_\w+|coin_jingle_small|gem_collect|heart_collect|item_equip|book_open|book_close|page_turn|map_open|map_close|' \
       r'keys_jingling|bone_snap|crunch\w*|splat_quick|squelching_\d|glass_ping_small|clothing_1|wood_small_pickup|weapon_pick_up|weapon_equip)$'
MENU = r'^abs-(pointer|confirm|cancel|popup|popdown)-1$'

for p in sorted(glob.glob(os.path.join(SRC, '**', '*.wav'), recursive=True)):
    stem = os.path.splitext(os.path.basename(p))[0]
    m = re.match(MENU, stem)
    k = f'ui_{m.group(1)}' if m else stem if re.match(KEEP, stem) else None
    if not k: continue
    import numpy as np
    s = aud.Sound(p).cache()
    peak = float(abs(s.data()).max() + 1e-12)
    s = s.volume(PEAK / peak).rechannel(1)
    if s.specs[0] != 44100: s = s.resample(44100, True)
    out = os.path.join(OUT, f'{k}.mp3')
    s.write(out, 44100, aud.CHANNELS_MONO, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, 96000, 4096)
    print(f'  {k:24} {os.path.getsize(out) // 1024} KB  (x{PEAK / peak:.2f})', flush=True)
