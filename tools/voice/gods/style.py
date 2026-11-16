"""Choose each god line's take and make what ships from it (docs/VOICES.md, "The gods").

Judging, on the raw take with its silence trimmed (the two voice critics' rules):
  words    every word heard exactly as written, in order (Whisper small.en; letters and digits only, case aside);
  pitch    its median within 120 cents of that god's own median over all its takes that have their words;
  spikes   its 90th-percentile pitch no more than 1.45 times its median (no line lifted or wailed);
  fall     the last fifth of its voiced frames no more than 5% over its own median: each sentence falls at its end
           (a question may rise), and no lower than 0.7 of it (creak);
  pace     articulation rate (syllables over the time actually speaking: pauses of 150 ms and more left out) within
           20% of that god's median;
  pauses   none to fail: a pause inside a line is cut to 0.7 s in what ships;
  likeness its voice-encoder vector (Chatterbox's) no further from that god's centroid than the mean less two
           standard deviations, and never under 0.83.
And on what ships: the limiter takes off no more than 3 dB.
The passing take nearest the god's medians ships; with none passing, the one failing least (and it's listed).

The owner's approved treatment (gods.json style; no echo, no reverb, no drive, no growl): the voice four semitones
down, one voice an octave under that and one a fifth under it a moment behind, a third a shade flat, the bottom
brought up, rumble under 45 Hz off, evened by a slow compressor, and a look-ahead limiter that only touches peaks. Every
line at the same speech loudness. Pitch shifts with long windows, so nothing smears into static.

  python tools/voice/gods/style.py lines.json --takes DIR --out assets/game/audio/gods [--only thyrraxis]
Writes <out>/<key>.mp3 (played by src/audio.js voice), tools/voice/gods/report.json, and src/core/god-voiced.js (which
lines have a recording, and how long each runs).
"""
import argparse, io, json, os, re, sys

import numpy as np
import soundfile as sf
import librosa
from scipy.signal import butter, sosfiltfilt
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from pick import syllables, tighten  # noqa: E402

PAUSE = 0.7   # s: the longest pause left inside a line
VER = 2   # (of what's measured of a take: scores.json is made again when it changes)


def tokens(t):
    return re.findall(r"[a-z0-9']+", t.lower().replace('’', "'"))


def measure(y16, text):
    """What's judged of a take, bar its words and its likeness: pitch, spikes, fall, pace, pauses."""
    f0 = librosa.pyin(y16, fmin=50, fmax=400, sr=16000)[0]
    v = f0[~np.isnan(f0)]
    segs = librosa.effects.split(y16, top_db=30, frame_length=1024, hop_length=256)
    # (Pauses of 150 ms and more are pauses; shorter gaps are stops inside words.)
    spoke, gap, last = 0.0, 0.0, None
    for a, b in segs:
        if last is not None:
            g = (a - last) / 16000
            if g >= 0.15:
                gap = max(gap, g)
            else:
                spoke += g
        spoke += (b - a) / 16000
        last = b
    tail = v[int(len(v) * 0.8):] if len(v) >= 10 else v
    med = float(np.median(v)) if len(v) else 0.0
    return {'pitch': med, 'p90': float(np.percentile(v, 90)) if len(v) else 0.0, 'fall': float(np.median(tail) / med) if med else 1.0,
            'art': syllables(text) / max(0.2, spoke), 'gap': gap, 'secs': len(y16) / 16000}


def shift(y, sr, semis):
    return librosa.effects.pitch_shift(y, sr=sr, n_steps=semis, n_fft=4096, hop_length=512, res_type='soxr_vhq')


def speech_db(y):
    f = librosa.feature.rms(y=y.astype('float32'), frame_length=2048, hop_length=512)[0]
    on = f > f.max() * 0.1
    return float(20 * np.log10(np.sqrt(np.mean(f[on] ** 2)) + 1e-9))


def loud(y, sr, target, ceiling):
    y = y / (np.max(np.abs(y)) + 1e-9)
    env = np.sqrt(uniform_filter1d(y.astype('float64') ** 2, int(sr * 0.05)) + 1e-12)
    over = np.maximum(0, 20 * np.log10(env) + 24)
    y = y * 10 ** (uniform_filter1d(-over * (1 - 1 / 2.5), int(sr * 0.15)) / 20)
    y = y * 10 ** ((target - speech_db(y)) / 20)
    w = int(sr * 0.008) * 2 + 1
    g = np.minimum(1.0, ceiling / (maximum_filter1d(np.abs(y), w) + 1e-9))
    g = uniform_filter1d(uniform_filter1d(minimum_filter1d(g, w), int(sr * 0.016)), int(sr * 0.016))
    return (y * g).astype('float32'), float(20 * np.log10(g.min()))


def styled(y, sr, st):
    y = y / (np.max(np.abs(y)) + 1e-9)
    voice = shift(y, sr, st['main']) * st['mainGain']
    for semis, behind, gain in st['layers']:
        voice = voice + np.roll(shift(y, sr, semis), int(sr * behind)) * gain
    voice = voice + sosfiltfilt(butter(2, st['lowBoost'][0], btype='low', fs=sr, output='sos'), voice) * st['lowBoost'][1]
    voice = sosfiltfilt(butter(2, st['highPass'], btype='high', fs=sr, output='sos'), voice)
    return loud(voice, sr, st['speechDb'], st['ceiling'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--takes', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, 'gods.json'), encoding='utf-8'))
    lines = json.load(open(a.lines, encoding='utf-8'))
    only = set(filter(None, a.only.split(',')))
    lines = [ln for ln in lines if not only or ln['god'] in only]
    cache_p = os.path.join(a.takes, 'scores.json')
    cache = json.load(open(cache_p, encoding='utf-8')) if os.path.exists(cache_p) else {}
    asr = ve = None
    # ---- every take measured once ----
    for ln in lines:
        d = os.path.join(a.takes, ln['god'])
        for k in range(24):
            p = os.path.join(d, f"{ln['key']}.{k}.wav")
            if not os.path.exists(p):
                continue
            ck = f"{ln['key']}.{k}"
            c = cache.get(ck)
            if c and c.get('mtime') == os.path.getmtime(p) and c.get('ver') == VER and c.get('text') == ln['text']:
                continue
            if asr is None:
                from transformers import pipeline
                from chatterbox.models.voice_encoder import VoiceEncoder
                from huggingface_hub import snapshot_download
                from safetensors.torch import load_file
                asr = pipeline('automatic-speech-recognition', model='openai/whisper-small.en', device='cpu')
                ve = VoiceEncoder()
                ve.load_state_dict(load_file(os.path.join(snapshot_download('ResembleAI/chatterbox', allow_patterns=['ve.safetensors']), 've.safetensors')))
                ve.eval()
            y, sr = sf.read(p, dtype='float32')
            y = librosa.effects.trim(y, top_db=40)[0]
            y16 = librosa.resample(y, orig_sr=sr, target_sr=16000)
            heard = asr({'raw': y16, 'sampling_rate': 16000})['text'].strip()
            t = measure(y16, ln['text'])
            t.update({'mtime': os.path.getmtime(p), 'ver': VER, 'text': ln['text'], 'heard': heard, 'ok': tokens(heard) == tokens(ln['text']),
                      'emb': [round(float(q), 5) for q in ve.embeds_from_wavs([y16], sample_rate=16000)[0]]})
            cache[ck] = t
            print(ck, 'ok' if t['ok'] else 'WORDS', '%.0f Hz' % t['pitch'], 'x%.2f' % (t['p90'] / max(1, t['pitch'])), '%.2f syl/s' % t['art'], '|', heard, flush=True)
            json.dump(cache, open(cache_p, 'w', encoding='utf-8'))
    # ---- each god's own middle, and the take of each line nearest it ----
    os.makedirs(a.out, exist_ok=True)
    report, voiced = {'gods': {}, 'lines': {}}, {}
    for god in cfg['gods']:
        mine = [ln for ln in lines if ln['god'] == god]
        if not mine:
            continue
        of = lambda ln: [(k, t) for k in range(24) if (t := cache.get(f"{ln['key']}.{k}")) and t.get('text') == ln['text'] and t.get('ver') == VER]
        ts = [t for ln in mine for _, t in of(ln) if t['ok']]
        mp, ms = float(np.median([t['pitch'] for t in ts])), float(np.median([t['art'] for t in ts]))
        cen = np.mean([t['emb'] for t in ts], axis=0)
        cen = cen / np.linalg.norm(cen)
        like = lambda t: float(np.dot(t['emb'], cen) / np.linalg.norm(t['emb']))
        ls = [like(t) for t in ts]
        # (Never looser than 0.83, however the god's own takes spread.)
        floor = max(0.83, float(np.mean(ls) - 2 * np.std(ls)))
        cents = lambda t: float(1200 * np.log2(max(1, t['pitch']) / mp))

        def judge(t):
            f = [] if t['ok'] else ['words']
            if abs(cents(t)) > 120: f.append('pitch %+.0f cents' % cents(t))
            if t['p90'] / max(1, t['pitch']) > 1.45: f.append('spike x%.2f' % (t['p90'] / max(1, t['pitch'])))
            # (A question rises: only what isn't one must fall.)
            if t['fall'] > 1.05 and not t['text'].rstrip().endswith('?'): f.append('ends up x%.2f' % t['fall'])
            # (And no further down than seven tenths of it: under that it's creak, or the voice has dropped out.)
            if t['fall'] < 0.7: f.append('ends in creak x%.2f' % t['fall'])
            if abs(t['art'] / ms - 1) > 0.2: f.append('pace %+.0f%%' % ((t['art'] / ms - 1) * 100))
            if like(t) < floor: f.append('likeness %.2f' % like(t))
            return f

        levels, picks = [], []
        for ln in mine:
            cands = []
            for k, t in of(ln):
                fails = judge(t)
                # (Words first: a line misheard is no line.)
                # (Then pitch: one voice from line to line matters more than any other miss.)
                cands.append([(0 if t['ok'] else 10) + len(fails) + (3 if abs(cents(t)) > 120 else 0) + abs(cents(t)) / 400 + abs(t['art'] / ms - 1) * 0.5, k, t, fails])
            if not cands:
                continue
            cands.sort(key=lambda c: c[0])
            passing = sum(1 for c in cands if not c[3])
            # (One of the lines that is shown and not said unless a take passes everything.)
            if not passing and ln['key'] in cfg.get('textOnly', []):
                mp3 = os.path.join(a.out, ln['key'] + '.mp3')
                if os.path.exists(mp3): os.remove(mp3)
                report['lines'][ln['key']] = {'god': god, 'text': ln['text'], 'status': 'text only', 'takes': len(cands), 'passing': 0, 'fails': cands[0][3]}
                print(ln['key'], 'TEXT ONLY', cands[0][3], flush=True)
                continue
            for n, (_, k, t, fails) in enumerate(cands):
                y, sr = sf.read(os.path.join(a.takes, god, f"{ln['key']}.{k}.wav"), dtype='float32')
                # (No dead air: a pause inside the line is cut to 0.7 s at most.)
                y = tighten(librosa.effects.trim(y, top_db=40)[0], sr, PAUSE)
                out, limited = styled(y, sr, cfg['style'])
                # (The limiter working hard is a burst in the take: the next, if it passes too.)
                if limited >= -3 or n + 1 >= len(cands) or cands[n + 1][3]:
                    break
            if limited < -3:
                fails = fails + ['limiter %.1f dB' % limited]
            b = io.BytesIO()
            sf.write(b, out, sr, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.3)
            open(os.path.join(a.out, ln['key'] + '.mp3'), 'wb').write(b.getvalue())
            back = sf.read(io.BytesIO(b.getvalue()), dtype='float32')[0]
            db = speech_db(back)
            levels.append(db)
            voiced[ln['key']] = round(len(out) / sr, 2)
            report['lines'][ln['key']] = {'god': god, 'text': ln['text'], 'take': k, 'takes': len(cands), 'status': 'passed' if not fails else 'unchecked', 'fails': fails, 'passing': passing,
                                         'heard': t['heard'], 'pitch': round(t['pitch']), 'cents': round(cents(t)), 'spike': round(t['p90'] / max(1, t['pitch']), 2), 'fall': round(t['fall'], 2),
                                         'art': round(t['art'], 2), 'gap': round(t['gap'], 2), 'likeness': round(like(t), 3), 'secs': round(len(out) / sr, 2),
                                         'speechDb': round(db, 1), 'limiterDb': round(limited, 1), 'peak': round(float(np.max(np.abs(back))), 2)}
            picks.append(t)
            print(ln['key'], 'take', k, 'passed' if not fails else fails, '%.1f dB' % db, flush=True)
        report['gods'][god] = {'pitch': round(mp), 'art': round(ms, 2), 'likenessFloor': round(floor, 3), 'lines': len(mine),
                               'passed': sum(1 for ln in mine if report['lines'].get(ln['key'], {}).get('status') == 'passed'),
                               'pickedCents': [round(min(cents(t) for t in picks)), round(max(cents(t) for t in picks))],
                               'pickedPace': [round(min(t['art'] for t in picks), 2), round(max(t['art'] for t in picks), 2)],
                               'pickedLikeness': [round(min(like(t) for t in picks), 3), round(max(like(t) for t in picks), 3)],
                               'speechDb': [round(min(levels), 1), round(max(levels), 1)]}
        print(god, report['gods'][god], flush=True)
    json.dump(report, open(os.path.join(HERE, 'report.json'), 'w', encoding='utf-8'), indent=1)
    if not only:
        js = "// Which of the Elder Dragon Gods' lines have a recording (assets/game/audio/gods/<key>.mp3), and how long each runs, in\n// seconds. Written by tools/voice/gods/style.py: don't edit.\nexport const GOD_VOICED = " + json.dumps(voiced, indent=1) + ";\n"
        open(os.path.join(HERE, '../../../src/core/god-voiced.js'), 'w', encoding='utf-8', newline='\n').write(js)


if __name__ == '__main__':
    main()
