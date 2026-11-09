"""Record takes of Lisandra's lines the way the owner approved (docs/VOICES.md): Qwen3-TTS 1.7B CustomVoice, with her
voice's anchor (anchors/<voice>.pt, the x-vector of her approved sample) in the speaker's place, the voice's one
description and the line's kind's one fixed note (anchors.json). One model for every line of a voice, never another.

A round is one take of every line that wants that many (anchors.json types: 8, or 16 for orders and shouts), in the
order of lines.json (the old voice's opening, the young voice's, the town), so every line has a first take before any
has a second. Takes are <takes>/<voice>/<key>.<round>.wav; one already there is skipped, so a run can stop and start
again. A line with an owner-approved take (<key>.a.wav) gets no more. pick.py judges them.

Gentle on the machine (gentle.py: 2 CPU threads at idle priority), on the CPU at fp32 (another precision is another
voice), about 6.5 times slower than real time.

  node tools/voice/script.mjs lines.json
  python tools/voice/anchor.py lines.json --takes DIR --round 0 [--only LisandraWitch]
"""
import argparse, json, math, os, re, sys, time, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import gentle  # noqa: E402  (before torch: the thread caps)
import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
import torch  # noqa: E402

FRAMES = 12.5   # codec frames a second


def respell(text, say):
    for name, sound in say.items():
        text = re.sub(r'\b' + re.escape(name) + r'\b', sound, text)
    return text


def todo_for(lines, cfg, takes, k, only=()):
    out = []
    for ln in lines:
        if only and ln['voice'] not in only:
            continue
        if cfg['types'][ln['type']]['takes'] <= k:
            continue
        d = os.path.join(takes, ln['voice'])
        if os.path.exists(os.path.join(d, ln['key'] + '.a.wav')) or os.path.exists(os.path.join(d, f"{ln['key']}.{k}.wav")):
            continue
        out.append(ln)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('lines')
    ap.add_argument('--takes', required=True)
    ap.add_argument('--round', type=int, required=True)
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    lines = json.load(open(a.lines, encoding='utf-8'))
    cfg = json.load(open(os.path.join(HERE, 'anchors.json'), encoding='utf-8'))
    say = json.load(open(os.path.join(HERE, 'say.json'), encoding='utf-8'))
    todo = todo_for(lines, cfg, a.takes, a.round, set(filter(None, a.only.split(','))))
    print(f'round {a.round}: {len(todo)} takes to record', flush=True)
    if not todo:
        return
    gentle.torch_threads(torch)
    from qwen_tts import Qwen3TTSModel
    m = Qwen3TTSModel.from_pretrained(cfg['model'], device_map='cpu', dtype=torch.float32)
    anchor = {v: torch.load(os.path.join(HERE, 'anchors', v + '.pt')) for v in cfg['voices']}
    t0, said = time.time(), 0.0
    for n, ln in enumerate(todo, 1):
        v, k = ln['voice'], a.round
        voice = cfg['voices'][v]
        text = respell(ln['say'], say)
        short = len(re.findall(r"[A-Za-z']+", ln['say'])) < 5
        temp = cfg['shortTemperature'] if short else cfg['temperature']
        cap = int(math.ceil(FRAMES * (len(text) * 0.16 + 4)))
        # One seed per line and take, so a take can always be made again.
        torch.manual_seed(zlib.crc32(f"{v}/{ln['key']}".encode()) + k * 7919)
        prompt = {'ref_spk_embedding': [anchor[v]], 'x_vector_only_mode': [True], 'icl_mode': [False], 'ref_code': None}
        kw = m._merge_generate_kwargs(max_new_tokens=cap, temperature=temp, top_k=cfg['topK'], subtalker_temperature=temp, subtalker_top_k=cfg['topK'])
        with torch.inference_mode():
            codes, _ = m.model.generate(input_ids=m._tokenize_texts([m._build_assistant_text(text)]),
                                        instruct_ids=[m._tokenize_texts([m._build_instruct_text(voice['who'] + ' ' + voice['notes'][ln['type']])])[0]],
                                        voice_clone_prompt=prompt, languages=['English'], non_streaming_mode=True, **kw)
            wavs, sr = m.model.speech_tokenizer.decode([{'audio_codes': c} for c in codes])
        y = np.asarray(wavs[0], dtype=np.float32)
        path = os.path.join(a.takes, v, f"{ln['key']}.{k}.wav")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        sf.write(path + '.tmp.wav', y, sr)
        os.replace(path + '.tmp.wav', path)
        said += len(y) / sr
        el = time.time() - t0
        print(f"{n}/{len(todo)} {v} {ln['type']}: {len(y) / sr:.1f} s | {said:.0f} s of speech in {el / 60:.1f} min | {ln['text'][:60]}", flush=True)


if __name__ == '__main__':
    main()
