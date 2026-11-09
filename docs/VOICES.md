# Voices: how the game's dialogue is voiced, and how to add more

Every word said aloud is a **recording**, made ahead of time with
[Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (the 1.7B VoiceDesign model, Apache-2.0) in the speaker's own voice,
described in words. This is the method the Bellmourn repository (Agilancer/Bellmourn, `docs/VOICES.md`) settled on, and
the tools in `tools/voice/` come from there. Nothing is synthesised in the player's browser. A line with no recording is
shown and not said.

## What's recorded

Lisandra, all of the opening (`src/core/opening-script.js`): 38 lines in two voices.

| Voice | Who | When |
|---|---|---|
| `Lisandra` | young, while you see her lovely | the summons and her first words, from the dust on in the collapse, and the road down |
| `LisandraWitch` | old, while you see the witch | from the flash, through the name and the herding, walking out, and her first cry in the collapse |

`voiceOf(stage, line)` in `opening-script.js` picks the voice by the same rule that picks which of her is drawn
(`prettyShown` in `src/core/opening.js`), so the glamour breaks in your ears as well. A cue said while walking out is marked
`witch: true`.

**Your name isn't said.** It's typed in the game, so nobody can record it. A line with `{name}` in it has a `say`: the
words she says aloud. "Bellmourn. You're taking me there, {name}." says "Bellmourn. You're taking me there." "{name}!
Wait!" says "Wait!". The bare "{name}." says nothing (`say: ''`). The bubble still shows the whole line.

## How the game plays them

- A recording is `assets/voice/<voice>/<key>.mp3`, where `key` is `voiceKey(words)` (`src/core/voicekey.js`, a hash of
  the exact words). Change one letter and the key changes, so the line needs recording again.
- `src/core/voiced.js` lists which keys each voice has; `tools/voice/manifest.mjs` writes it from the files.
- `src/ui/opening-sound.js` fetches and decodes them all as soon as there's an audio context. It plays each line once
  as it comes up, placed at her mouth: the summons in your head, and the tunnel line from out of sight with an echo.
  If the line before has under 0.7 s left, the new one waits for it; otherwise, or on a skip, it's cut off. Her young
  voice stops a quarter of a second after the flash, so it never carries over the witch.
- `tests/voice.test.mjs` fails if any line she says has no recording.

## Recording

| File | What |
|---|---|
| `script.mjs` | reads her lines from the game and writes `lines.json`: `[{ voice, text, key, say, how, take, pause }]`. `say` is the words as the model reads them; `how` is a delivery note; `take` a chosen take (seed shift) and `pause` the longest pause kept, for lines whose first take didn't do |
| `voices.json` | each voice, described in words. One fixed description and seed per voice, so a voice stays itself |
| `say.json` | respellings of invented names, for the model only |
| `record.py` | records every line not yet recorded, as `<out>/<voice>/<key>.mp3` (trimmed, long pauses shortened, one loudness) |
| `gentle.py` | 2 CPU threads at idle priority, so the PC stays usable |
| `manifest.mjs` | writes `src/core/voiced.js` and checks every line has its recording |

Setup, once (already done on the owner's PC):

```
py -3.12 -m venv C:\Users\agila\tts\qwen
C:\Users\agila\tts\qwen\Scripts\python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
C:\Users\agila\tts\qwen\Scripts\python -m pip install qwen-tts soundfile hf_xet
```

To add or change lines:

```
node tools/voice/script.mjs C:\Users\agila\tts\bm_lines.json
C:\Users\agila\tts\qwen\Scripts\python tools/voice/record.py C:\Users\agila\tts\bm_lines.json --out assets/voice
node tools/voice/manifest.mjs assets/voice C:\Users\agila\tts\bm_lines.json
```

It takes about eight times as long as the speech it makes. Don't run it on the GPU or with more threads: on Bellmourn it
crashed the PC. For a bad take, delete its MP3 and run `record.py` again with `--take 1` (or 2, 3...) and `--redo` a file
of `voice/key` lines. Delete the old MP3 when a line's words change.

## Voices

- **No anime or children's voices** (the owner's rule). This model leans high for women. Lisandra's young voice started
  at a median pitch of about 255 Hz with "low, warm, smoky alto". Leading with "A deep, low-pitched, husky female voice"
  brought her to about 170-230 Hz. Check a new woman's voice for pitch before recording all her lines.
- Each line is made afresh from the description, so one line can come out higher, slower or with a stray word ("Ugh,
  lovely. Eh..."). Check every take for pitch, words and length against the gap before the next line, and try other
  takes of the bad ones (the `TAKE` and `PAUSE` tables in `script.mjs` keep the choice, so the files can be made again).
- Pronunciation goes in `say.json`: Velscour is "Vel-scower".
- Write lines to be said: no brackets or stage directions, numbers as words, and no names typed in at run time.
