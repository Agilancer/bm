# TomMusic's Free Fantasy SFX Pack, converted into assets/game/audio/ as MP3 (which every browser plays, iPhones included).
#
# Run with Blender (its `aud` module reads OGG and writes MP3; no ffmpeg needed):
#   blender -b --factory-startup --python tools/audio/build_fantasy_sfx.py -- "<pack>/OGG Files" [--force]
#
# Names are the pack's, in snake case: "Wood Chain Walk 3.ogg" -> wood_chain_walk_3.mp3, "Inside Night Rain.ogg" -> inside_night_rain.mp3.
#   one-shots          mono, 96 kbps, at the pack's own levels (they're made to match each other)
#   BGS Loops/         the 60 s beds (forest, cave, inside, beach, sea; each plain, rain and storm), stereo, 96 kbps, all at one loudness
#   the water and torch loops   the same, the torch mono (it's heard from a place: the panner gives it its side)
# Files already there are left alone (several of this pack's came in earlier, with the dirt steps and the swords); --force remakes them.
import aud, os, re, sys, glob, json

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = ARGS[0] if ARGS and not ARGS[0].startswith('--') else '.'
FORCE = '--force' in ARGS
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'assets', 'game', 'audio')

BED_DB = -30                       # a bed's loudness, dBFS RMS (the earlier beds' own: src/ui/lands.js mixes them)
LOOPS = {'waterfall_loop', 'river_loop', 'river_stream_loop', 'torch_loop'}
MONO_LOOPS = {'torch_loop'}


def snake(name):
    return re.sub(r'[^a-z0-9]+', '_', os.path.splitext(name)[0].lower()).strip('_')


def level(s):
    """(rms, peak) of a sound, both linear."""
    import numpy as np
    d = s.data()
    m = d.mean(axis=1) if d.ndim > 1 else d
    return float(np.sqrt((m ** 2).mean()) + 1e-12), float(abs(d).max() + 1e-12)


def write(s, out, ch, kbps, rate=44100):
    s = s.rechannel(ch)
    if s.specs[0] != rate: s = s.resample(rate, True)
    s.write(out, rate, aud.CHANNELS_MONO if ch == 1 else aud.CHANNELS_STEREO, aud.FORMAT_S16, aud.CONTAINER_MP3, aud.CODEC_MP3, kbps * 1000, 4096)
    return os.path.getsize(out)


report = {}
os.makedirs(OUT, exist_ok=True)
for p in sorted(glob.glob(os.path.join(SRC, '**', '*.ogg'), recursive=True)):
    k = snake(os.path.basename(p))
    out = os.path.join(OUT, f'{k}.mp3')
    if os.path.exists(out) and not FORCE:
        report[k] = {'from': os.path.basename(p), 'kept': True}
        continue
    bed = k in LOOPS or os.sep + 'BGS Loops' + os.sep in p or '/BGS Loops/' in p
    if bed:
        s = aud.Sound(p).cache()
        rms, peak = level(s)
        g = min(10 ** (BED_DB / 20) / rms, 0.95 / peak)
        size = write(s.volume(g), out, 1 if k in MONO_LOOPS else 2, 64 if k in MONO_LOOPS else 96)
        report[k] = {'from': os.path.basename(p), 'kb': round(size / 1024), 'gain': round(g, 2)}
    else:
        size = write(aud.Sound(p), out, 1, 96)
        report[k] = {'from': os.path.basename(p), 'kb': round(size / 1024)}
    print(f'  {k:28} {report[k]}', flush=True)

with open(os.path.join(ROOT, 'tools', 'audio', 'fantasy_sfx_report.json'), 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=1, sort_keys=True)
print('done:', len(report), 'files,', sum(1 for v in report.values() if not v.get('kept')), 'made')
