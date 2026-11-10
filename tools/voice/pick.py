"""Judge every take anchor.py made by the voice critics' rules, keep the best of each line, and ship it.

Each take is first made into the file the game would play: lead and tail trimmed, every pause cut to 250 ms, brought to
its kind's loudness by the one meter (meter() below; anchors.json types), and through MP3. Then, on that file:
  1. every word heard as written (Whisper small.en; names may be heard any way, a spelling can differ by one letter);
  2. pitch from every 40 ms frame whose autocorrelation periodicity is >= 0.6 and within 35 dB of the loudest: the median
     in the voice's band, the 90th percentile under its cap (anchors.json voices band), a young shout's peak <= 360 Hz;
  3. voiced share >= 0.5, spectral flatness <= 0.01; a calm line's low band (80-400 Hz share) within 0.15 of the sample's;
  4. pace (syllables a second, pauses cut to 250 ms) within 25% of the voice's (its sample's, or the recording refs.json
     names as its `pace`: for the young voice, the owner's own approved take); a line of under five words from -40% to
     +25%, and no more than 0.45 s a syllable;
  5. Chatterbox likeness to the voice's approved sample >= 0.84 (calm) or 0.82 (raised); the highest passing take wins.
An owner-approved take (<key>.a.wav) is shipped whatever it scores. A line whose takes are all made with fewer than two
passing is listed to be rewritten (the critics: rewrite the line, never loosen a rule); one pass is shipped meanwhile.

Scores are kept in <takes>/scores.json, so a run only judges new takes. Gentle (gentle.py). In the Chatterbox venv:
  python tools/voice/pick.py lines.json --takes DIR [--ship assets/voice]
"""
import argparse, functools, glob, io, json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gentle  # noqa: E402,F401  (before torch: the thread caps)
import numpy as np  # noqa: E402
import librosa  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402

RULES = 'critics-r2.1'   # change when a rule changes, so every take is judged again
SR = 24000
NAMES = {'velscour', 'velscours', 'tessariel', 'tessariels', 'bellmourn', 'bellmourns', 'eldravayne', 'lisandra', 'lis'}


def syllables(text):
    n = 0
    for w in re.findall(r"[a-z']+", text.lower()):
        w = w.replace("'", '')
        k = len(re.findall(r'[aeiouy]+', w))
        if w.endswith('e') and not w.endswith(('le', 'ee')) and k > 1: k -= 1
        n += max(1, k)
    return n


def tighten(y, sr, most=0.25):
    iv = librosa.effects.split(y, top_db=38, frame_length=1024, hop_length=256)
    if not len(iv): return y
    pad, f = int(0.03 * sr), int(0.02 * sr)
    out = []
    for i, (a, b) in enumerate(iv):
        a, b = max(0, a - pad), min(len(y), b + pad)
        seg = y[a:b].copy(); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        out.append(seg)
        if i + 1 < len(iv):
            out.append(np.zeros(int(min(max((iv[i + 1][0] - pad) - b, 0), most * sr)), np.float32))
    return np.concatenate(out)


def meter(y16):
    # The one loudness meter: mean RMS over frames louder than 0.01, on 16 kHz audio trimmed at 40 dB.
    y, _ = librosa.effects.trim(y16, top_db=40)
    rms = librosa.feature.rms(y=y)[0]
    return float(20 * np.log10(np.mean(rms[rms > 0.01]) + 1e-9)) if (rms > 0.01).any() else -99.0


def acpitch(y, sr=16000):
    win, hop = int(0.04 * sr), int(0.02 * sr)
    lo, hi = int(sr / 500), int(sr / 80)
    fr = [y[i:i + win] * np.hanning(win) for i in range(0, len(y) - win, hop)]
    if not fr: return 0, 0, 0, 0
    en = np.array([10 * np.log10((f ** 2).mean() + 1e-12) for f in fr])
    hz, n = [], 0
    for f, e in zip(fr, en):
        if e < en.max() - 35: continue
        n += 1
        ac = np.correlate(f, f, 'full')[win - 1:]; ac /= ac[0] + 1e-12
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] >= 0.6: hz.append(sr / k)
    hz = np.array(hz)
    if not len(hz): return 0, 0, 0, 0
    return float(np.median(hz)), float(np.percentile(hz, 90)), float(hz.max()), len(hz) / max(1, n)


def colour(y, sr=16000):
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=256)) ** 2
    hz = librosa.fft_frequencies(sr=sr, n_fft=1024)
    r = librosa.feature.rms(y=y, frame_length=1024, hop_length=256)[0][:S.shape[1]]
    on = r > 0.01
    fr = S[:, :len(r)][:, on] if on.any() else S
    low = fr[(hz >= 80) & (hz <= 400)].sum() / max(1e-12, fr[(hz >= 80) & (hz <= 5000)].sum())
    flat = librosa.feature.spectral_flatness(S=np.sqrt(S))[0][:len(r)]
    return float(low), float(np.median(flat[on] if on.any() else flat))


def speech_secs(y, sr=16000):
    iv = librosa.effects.split(y, top_db=35, frame_length=1024, hop_length=256)
    if not len(iv): return len(y) / sr
    t = sum(b - a for a, b in iv) / sr
    for (a0, b0), (a1, b1) in zip(iv, iv[1:]): t += min(0.25, (a1 - b0) / sr)
    return t


ONES = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split()
TENS = 'x x twenty thirty forty fifty sixty seventy eighty ninety'.split()


def say_number(n):
    if n < 20: return ONES[n]
    if n < 100: return TENS[n // 10] + ('' if n % 10 == 0 else ' ' + ONES[n % 10])
    if n < 1000: return ONES[n // 100] + ' hundred' + ('' if n % 100 == 0 else ' and ' + say_number(n % 100))
    return say_number(n // 1000) + ' thousand' + ('' if n % 1000 == 0 else ' ' + say_number(n % 1000))


def words(t):
    t = re.sub(r'\d+', lambda m: ' ' + say_number(int(m.group())) + ' ', t.lower().replace('-', ' '))
    return re.sub(r'[^a-z ]', '', t).split()


def lev(a, b):
    if abs(len(a) - len(b)) > 1: return 2
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def same(e, g):
    if e == g: return True
    if e in ('shh', 'sh') and re.fullmatch(r's+h+', g): return True
    return len(e) >= 4 and lev(e, g) <= 1   # colours/colors, armour/armor


def heard_as_written(text, heard):
    """Every word heard, in order; a name may be heard as one to three words, a word may run into the next ("every one")."""
    exp, got = words(text), words(heard)

    @functools.lru_cache(None)
    def f(i, j):
        if i == len(exp): return j == len(got)
        e = exp[i]
        if e in NAMES:
            return any(f(i + 1, j + n) for n in range(1, 4) if j + n <= len(got))
        if j < len(got) and same(e, got[j]) and f(i + 1, j + 1): return True
        if j + 1 < len(got) and same(e, got[j] + got[j + 1]) and f(i + 1, j + 2): return True
        if i + 1 < len(exp) and j < len(got) and same(e + exp[i + 1], got[j]) and f(i + 2, j + 1): return True
        return False
    return f(0, 0)


def shape(path, loud):
    """The take as the game would play it, through MP3: (24 kHz samples, 16 kHz samples, MP3 bytes)."""
    y = librosa.load(path, sr=SR)[0]
    y = tighten(librosa.effects.trim(y, top_db=40)[0], SR)
    y = np.clip(y * 10 ** ((loud - meter(librosa.resample(y, orig_sr=SR, target_sr=16000))) / 20), -0.98, 0.98).astype(np.float32)
    b = io.BytesIO()
    sf.write(b, y, SR, format='MP3', subtype='MPEG_LAYER_III', compression_level=0.6)
    mp3 = b.getvalue()
    y = sf.read(io.BytesIO(mp3), dtype='float32')[0]
    if y.ndim > 1: y = y.mean(1)
    return y, librosa.resample(y, orig_sr=SR, target_sr=16000), mp3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--takes', required=True)
    ap.add_argument('--ship', default='')
    a = ap.parse_args()
    lines = json.load(open(a.lines, encoding='utf-8'))
    cfg = json.load(open(os.path.join(HERE, 'anchors.json'), encoding='utf-8'))
    refs = json.load(open(os.path.join(HERE, 'refs.json'), encoding='utf-8'))
    cache_path = os.path.join(a.takes, 'scores.json')
    cache = json.load(open(cache_path, encoding='utf-8')) if os.path.exists(cache_path) else {}
    if cache.get('rules') != RULES: cache = {'rules': RULES, 'takes': {}}
    gentle.torch_threads(torch)
    from safetensors.torch import load_file
    from huggingface_hub import snapshot_download
    from chatterbox.models.voice_encoder import VoiceEncoder
    from transformers import pipeline
    ve = VoiceEncoder(); ve.load_state_dict(load_file(os.path.join(snapshot_download('ResembleAI/chatterbox', allow_patterns=['ve.safetensors']), 've.safetensors'))); ve.eval()
    asr = pipeline('automatic-speech-recognition', model='openai/whisper-small.en', device='cpu')

    def emb(y16):
        e = ve.embeds_from_wavs([y16], sample_rate=16000)[0]
        return e / np.linalg.norm(e)

    # Each voice's sample: what a take's likeness and colour are measured against. Its pace is the sample's too, unless
    # refs.json names another recording for it (`pace`): the owner chose her own approved take for the young voice,
    # whose sample was made by the old model and runs about 30% faster than this one ever speaks.
    ref = {}
    for v, r in refs.items():
        y = librosa.load(os.path.join(HERE, r['audio']), sr=16000)[0]
        yt = librosa.effects.trim(y, top_db=40)[0]
        sample_sps = syllables(r['text']) / speech_secs(y)
        sps = sample_sps
        if r.get('pace'):
            yp = librosa.load(os.path.join(HERE, r['pace']['audio']), sr=16000)[0]
            sps = syllables(r['pace']['text']) / speech_secs(yp)
        ref[v] = dict(e=emb(y), sps=sps, sample_sps=sample_sps, low=colour(yt)[0])
        print(f"{v}: pace {sps:.2f} syllables a second{' (from ' + r['pace']['audio'] + ')' if r.get('pace') else ''}", flush=True)

    def judge(ln, path):
        """What's measured on a take (kept in scores.json); rules() says which rules it fails."""
        T = cfg['types'][ln['type']]
        y, y16, mp3 = shape(path, T['loud'])
        with open(path[:-4] + '.ship.mp3', 'wb') as fh: fh.write(mp3)
        pad = np.zeros(6400, np.float32)
        heard = asr(np.concatenate([pad, y16, pad]))['text'].strip()
        med, p90, top, vs = acpitch(y16)
        low, flat = colour(y16)
        sps = syllables(ln['say']) / speech_secs(y16)
        like = float(emb(y16) @ ref[ln['voice']]['e'])
        return dict(heard=heard, median=round(med), p90=round(p90), peak=round(top), voiced=round(vs, 2), flatness=round(flat, 4),
                    low_band=round(low, 2), sps=round(sps, 3), likeness=round(like, 3), loudness=round(meter(y16), 1),
                    secs=round(len(y) / SR, 2))

    def rules(ln, t):
        """The critics' rules on a take's numbers: the rules it fails (and its pace against the voice's, in t)."""
        T, V, R = cfg['types'][ln['type']], cfg['voices'][ln['voice']], ref[ln['voice']]
        if 'sps' not in t:   # judged before pace was kept as syllables a second: from its pace against the sample
            t['sps'] = round((1 + t['pace_pct'] / 100) * R['sample_sps'], 3)
        syl = syllables(ln['say'])
        pace = t['sps'] / R['sps'] - 1
        t['pace_pct'] = round(100 * pace)
        lo, hi, cap = V['band']
        fails = []
        if not heard_as_written(ln['say'], t['heard']): fails.append('words')
        if not lo <= t['median'] <= hi: fails.append(f"median {t['median']}")
        if t['p90'] > cap: fails.append(f"p90 {t['p90']}")
        if ln['type'] == 'shout' and 'shoutPeak' in V and t['peak'] > V['shoutPeak']: fails.append(f"peak {t['peak']}")
        if t['voiced'] < 0.5: fails.append(f"voiced {t['voiced']:.2f}")
        if t['flatness'] > 0.01: fails.append(f"flatness {t['flatness']:.3f}")
        if not T['raised'] and abs(t['low_band'] - R['low']) > 0.15: fails.append(f"low band {t['low_band']:.2f}")
        if len(re.findall(r"[A-Za-z']+", ln['say'])) < 5:
            if not -0.40 <= pace <= 0.25: fails.append(f'pace {100 * pace:+.0f}%')
            if 1 / t['sps'] > 0.45: fails.append(f"{1 / t['sps']:.2f} s a syllable")
        elif abs(pace) > 0.25: fails.append(f'pace {100 * pace:+.0f}%')
        if t['likeness'] < (0.82 if T['raised'] else 0.84): fails.append(f"likeness {t['likeness']:.3f}")
        return fails

    report, n_new = {'lines': [], 'rewrite': [], 'missing': []}, 0
    for ln in lines:
        d = os.path.join(a.takes, ln['voice'])
        paths = sorted(p for p in glob.glob(os.path.join(d, ln['key'] + '.*.wav')) if not p.endswith('.tmp.wav'))
        takes = {}
        for p in paths:
            name = f"{ln['voice']}/{os.path.basename(p)[:-4]}"
            c = cache['takes'].get(name)
            new = not c or c.get('mtime') != os.path.getmtime(p) or not os.path.exists(p[:-4] + '.ship.mp3')
            if new:
                c = judge(ln, p); c['mtime'] = os.path.getmtime(p)
                cache['takes'][name] = c; n_new += 1
            c['fails'] = rules(ln, c)
            if new:
                print(name, ln['type'], {k: c[k] for k in ('median', 'p90', 'likeness', 'pace_pct', 'fails')}, '|', c['heard'][:60], flush=True)
                if n_new % 10 == 0:
                    json.dump(cache, open(cache_path, 'w', encoding='utf-8'), indent=0)
            takes[name] = c
        approved = [k for k in takes if k.endswith('.a')]
        ok = sorted((k for k, t in takes.items() if not t['fails']), key=lambda k: -takes[k]['likeness'])
        pick = approved[0] if approved else (ok[0] if ok else None)
        want = cfg['types'][ln['type']]['takes']
        made = sum(1 for k in takes if not k.endswith('.a'))
        row = dict(voice=ln['voice'], key=ln['key'], text=ln['text'], type=ln['type'], made=made, want=want, passed=len(ok), pick=pick,
                   approved=bool(approved))
        report['lines'].append(row)
        if not approved and made >= want and len(ok) < 2: report['rewrite'].append(row)
        if not pick: report['missing'].append(row)
        if pick and a.ship:
            src = os.path.join(a.takes, pick + '.ship.mp3')
            dst = os.path.join(a.ship, ln['voice'], ln['key'] + '.mp3')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copyfile(src, dst + '.tmp'); os.replace(dst + '.tmp', dst)
    json.dump(cache, open(cache_path, 'w', encoding='utf-8'), indent=0)
    json.dump(report, open(os.path.join(a.takes, 'report.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    picked = sum(1 for r in report['lines'] if r['pick'])
    print(f"{n_new} takes judged; {picked} of {len(lines)} lines have a take to ship; {len(report['rewrite'])} to rewrite", flush=True)


if __name__ == '__main__':
    main()
