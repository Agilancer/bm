"""Record takes of the Elder Dragon Gods' lines (docs/VOICES.md, "The gods"): Qwen3-TTS 1.7B CustomVoice, each god one
of the model's own speakers under one description (gods.json), the way the owner's approved samples were made. One
model and one speaker for every line of a god, never another.

Takes are <takes>/<god>/<key>.<k>.wav; one already there is skipped, so a run can stop and start again. On the CPU at
fp32 (another precision is another voice), gentle on the machine (../gentle.py). style.py makes what ships from them.

  node tools/voice/gods/lines.mjs lines.json
  python tools/voice/gods/record.py lines.json --takes DIR [--only thyrraxis,kaldurra] [--n 4] [--keys a,b]
"""
import argparse, json, os, re, sys, time, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import gentle  # noqa: E402  (before torch: the thread caps)
import soundfile as sf  # noqa: E402
import torch  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--takes', required=True)
    ap.add_argument('--only', default='')
    ap.add_argument('--n', type=int, default=4)
    ap.add_argument('--start', type=int, default=0, help='the first take number to make')
    ap.add_argument('--keys', default='', help='only these lines (more takes for the ones with none passing)')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, 'gods.json'), encoding='utf-8'))
    lines = json.load(open(a.lines, encoding='utf-8'))
    only = set(filter(None, a.only.split(',')))
    keys = set(filter(None, a.keys.split(',')))
    todo = []
    # (Every line its first take before any has a second.)
    for k in range(a.start, a.n):
        for ln in lines:
            if (only and ln['god'] not in only) or (keys and ln['key'] not in keys):
                continue
            p = os.path.join(a.takes, ln['god'], f"{ln['key']}.{k}.wav")
            if not os.path.exists(p):
                todo.append((ln, k, p))
    print(f'{len(todo)} takes to record', flush=True)
    if not todo:
        return
    gentle.torch_threads(torch)
    from qwen_tts import Qwen3TTSModel
    m = Qwen3TTSModel.from_pretrained(cfg['model'], device_map='cpu', dtype=torch.float32)
    t0, said = time.time(), 0.0
    for n, (ln, k, p) in enumerate(todo, 1):
        g = cfg['gods'][ln['god']]
        os.makedirs(os.path.dirname(p), exist_ok=True)
        # (No "!" for the model: it shouts out of voice. The bubble keeps the line as written.)
        text = re.sub(r'!', '.', ln['text'])
        torch.manual_seed(zlib.crc32(ln['key'].encode()) + k * 7919)
        # (Calm sampling from take calmFrom on: the model's defaults wander in pitch from take to take.)
        kw = {'temperature': cfg['temperature'], 'top_k': cfg['topK'], 'subtalker_temperature': cfg['temperature'], 'subtalker_top_k': cfg['topK']} if k >= cfg['calmFrom'] else {}
        wavs, sr = m.generate_custom_voice(text=text, language='English', speaker=g['speaker'], instruct=g['who'], **kw)
        sf.write(p + '.tmp.wav', wavs[0], sr)
        os.replace(p + '.tmp.wav', p)
        said += len(wavs[0]) / sr
        print(f"{n}/{len(todo)} {ln['key']}.{k} {len(wavs[0]) / sr:.1f}s  ({(time.time() - t0) / 60:.0f} min, {said:.0f}s said)", flush=True)


if __name__ == '__main__':
    main()
