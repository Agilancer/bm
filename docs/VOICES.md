# Voices: how the game's dialogue is voiced, and how to add more

Every word said aloud is a **recording**, made ahead of time with
[Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) (Apache-2.0). Nothing is synthesised in the player's browser. A line with
no recording is shown and not said.

**The owner's rule: every voice extremely consistent, for everyone.** A voice is one woman from her first line to her
last. So each voice is made by **one model** with **one anchor**, and every line is judged against the same approved sample.
Two models, or a voice described afresh for each line, give a different woman line to line (the owner heard it: "The
voices in the demo aren't consistent").

## The method (owner-approved, November 2026)

- **One model:** Qwen3-TTS 1.7B **CustomVoice**, on the CPU at fp32. Another precision is another voice.
- **One anchor per voice:** the speaker vector (x-vector) of the voice's approved sample (`tools/voice/refs/`, listed
  in `refs.json`), saved as `tools/voice/anchors/<voice>.pt`. It goes in the model's speaker slot, voice only.
- **One description per voice** (`anchors.json` `who`), and **one fixed note per kind of line** (`notes`: calm, quiet,
  an order, raised, a shout, called out, an incantation, from out of sight). Notes say what to do, never what to avoid.
  A line's kind comes from its marks in the script (`big`, `mutter`, `call`, ...; `tools/voice/script.mjs`).
- **Many takes, judged by rule.** Each line gets 8 takes (16 for orders and shouts), each with its own seed. The two voice
  critics (two voice-acting veterans) set the rules, which `pick.py` runs on each take as it would ship: cut to 250 ms
  pauses, levelled by one loudness meter, through MP3.
  - **Words:** every word heard as written (Whisper).
  - **Pitch:** the median in the voice's band and its 90th percentile under the cap. Old voice: 181-228 Hz, cap 280.
    Young voice: 190-240 Hz, cap 320. A young shout peaks no higher than 360 Hz.
  - **Tone:** voiced share at least 0.5, flatness at most 0.01. On a calm line, the low band is within 0.15 of the
    sample's.
  - **Pace:** within 25% of the voice's syllables a second: the old voice's sample, and for the young voice the owner's
    approved take (`refs.json` `pace`).
  - **Likeness:** to the sample, by the Chatterbox voice encoder: at least 0.84 calm, 0.82 raised.

  The best passing take ships. A line with fewer than two passing takes is **rewritten**, never let through by loosening
  a rule (`docs/VOICE-REWRITES.md` lists them).
- **Lines written for her voice:** no lone words or barks (a lone "Out!" never came out as her), no "!" for the model
  (the subtitle keeps it), and an order said late in a whole sentence.
- **Loudness, one meter:** calm -22 dB, quiet -24, orders and calls +2, shouts +4.
- **A human listens at the end.** The critics can't hear; their numbers are not the owner's ear.

The owner approved the method on four lines: "Hold still. It doesn't hurt. It never hurts.", the two tunnel orders, and
"What have you done?!". Those four takes are kept as they are (`<key>.a.wav` in the takes folder).

## Recording status (2026-11-10)

**The run is done.** Every line got all its takes (8, or 16 for orders, calls and shouts) with the notes in
`anchors.json` as they are now. Each line's best take is in the game. `tools/voice/shipped.json` lists, for each line,
its shipped take, its status, its passing takes, the rules the shipped take misses, its pitch, pace and likeness, and
whether it's on the rewrite list.

| | Old voice | Young voice | All |
|---|---|---|---|
| Lines | 97 | 82 | 179 |
| `approved`: the owner's own take | 3 | 1 | 4 |
| `passed`: a take that passed every rule | 68 | 55 | 123 |
| `unchecked`: no take passed; the one missing the fewest rules shipped | 26 | 26 | 52 |
| On the rewrite list (under two passes) | 39 | 46 | 85 |

- **What a line ships with:** the owner's approved take, if there is one. If not, the passing take most like her
  sample. If nothing passed, the take that missed the fewest rules, then the one most like her.
- **The rewrite list:** `docs/VOICE-REWRITES.md` lists the 85 lines in plain words. 52 have no passing take and 33 have
  one. The critics' rule is new words for these, not looser rules, and new words are the owner's call. Until then
  each line plays its best take.
- **What the misses are:**
  - The young voice often has less chest than her sample, or comes out under her band (about 170-188 Hz).
  - The witch often has more boom than hers.
  - Short lines ("…Oh.", "Velscour's.", "No. No, no, no.") come out drawn out, and less like her.
  - A few long town lines had a word misheard.
- **How the run went:**
  - The first run's notes made both voices slow and the young one low.
  - A note test fixed both, and the run was restarted from round 0 with the new notes.
  - The takes made with the old notes are kept in `C:\Users\agila\tts\anchor_all\old_note` (with `notes.json`). None
    of them ship, so no kind of line mixes two notes.
- **Her young pace (the owner's call, 2026-11-09):** "Yes, use my take". So her pace is judged against the owner's
  approved young shout (`refs.json` `pace`, about 3.0 syllables a second), not her sample, which the old model made
  about 30% faster than this one ever speaks.
- **Where the takes are:** outside the repo, in `C:\Users\agila\tts\anchor_all`:
  - the takes: `<voice>/<key>.<round>.wav`, with the shipped form beside each as `.ship.mp3`;
  - `scores.json`: every take's numbers;
  - `report.json`: each line's passes, pick and the `rewrite` list;
  - `lines.json`: the line list.

  `pick.py` works out each take's rules afresh from its stored numbers, so a rule change needs no take judged again.
- **Not done:** no human has listened to the new set. The critics can't hear; their numbers are not the owner's ear.

## What's recorded

Lisandra: the whole opening (`src/core/opening-script.js` with the cave's long story in `src/core/opening-cave.js`), and
what she says in Bellmourn once she's walked you down (`src/folk/lines/lisandra.js`, through `tools/voice/folk.mjs`),
each town line in both voices. 179 lines.

| Voice | Who | When |
|---|---|---|
| `Lisandra` | young, while you see her lovely | the summons and her first words, from the dust on in the collapse, the road down, the town by day |
| `LisandraWitch` | old, while you see the witch | from the flash, through the name and the herding, walking out, her first cry in the collapse, the town by night |

`voiceOf(stage, line)` in `opening-script.js` picks the voice by the same rule that picks which of her is drawn
(`prettyShown` in `src/core/opening.js`), so the glamour breaks in your ears as well. A cue said while walking out is marked
`witch: true`.

**Your name isn't said.** It's typed in the game, so nobody can record it. A line with `{name}` in it has a `say`: the
words she says aloud. "{name}! Wait!" says "Wait!". The bare "{name}." says nothing (`say: ''`). The bubble still shows the
whole line.

## How the game plays them

- A recording is `assets/voice/<voice>/<key>.mp3`, where `key` is `voiceKey(words)` (`src/core/voicekey.js`, a hash of
  the exact words). Change one letter and the key changes, so the line needs recording again.
- `src/core/voiced.js` lists which keys each voice has and how long each runs; `tools/voice/manifest.mjs` writes it from
  the files. The cave's scene is timed by those lengths (`src/core/opening-cave.js`).
- `src/ui/opening-sound.js` fetches and decodes the opening's lines as soon as there's an audio context. It plays each
  line once as it comes up, placed at her mouth: the summons in your head, and the tunnel line from out of sight with an
  echo. If the line before has under 0.7 s left, the new one waits for it; otherwise, or on a skip, it's cut off. Her
  young voice stops a quarter of a second after the flash, so it never carries over the witch.
- In the town, `src/ui/folk.js` `speak` says her line as it comes up on the talk panel, in your head, in the voice of
  whichever of her you see (lovely from dawn to dusk, the crone at night: `DAWN_HOUR`, `DUSK_HOUR`). It's fetched as it's
  wanted (`Audio.voice`), and cut off by the next line or by closing the panel.
- A line with `{name}` in the town is said without it (`unnamed` in `voicekey.js`): "I can count, {name}." says "I can
  count."
- `tests/voice.test.mjs` fails if any line she says has no recording.

## Recording

| File | What |
|---|---|
| `script.mjs` | reads every line she says from the game and writes `lines.json`: `[{ voice, text, key, say, type, group }]`. `say` is the words as the model reads them; `type` the kind of line |
| `anchors.json` | the model, each voice's description, pitch band and notes, and each kind's takes and loudness |
| `anchors/` | each voice's anchor |
| `refs/`, `refs.json` | each voice's approved sample and its words: what every take is judged against |
| `say.json` | respellings of invented names, for the model only |
| `anchor.py` | one round of takes: one more take of every line that wants one (Qwen venv) |
| `pick.py` | judges new takes by the rules, ships the best of each line, and lists lines to rewrite (Chatterbox venv) |
| `record_all.py` | runs the rounds, `anchor.py` then `pick.py`, never both at once. Stop it any time; run it again to carry on |
| `gentle.py` | 2 CPU threads at idle priority, so the PC stays usable |
| `manifest.mjs` | writes `src/core/voiced.js` and checks every line has its recording |

Setup, once (already done on the owner's PC): a Qwen venv (`torch` for the CPU, `qwen-tts`, `soundfile`) at
`C:\Users\agila\tts\qwen`, and a Chatterbox venv (`chatterbox-tts`, `librosa`, `transformers`) at `C:\Users\agila\tts\chatterbox`.

To add or change lines:

```
node tools/voice/script.mjs C:\Users\agila\tts\anchor_all\lines.json
python tools/voice/record_all.py C:\Users\agila\tts\anchor_all --qwen C:\Users\agila\tts\qwen\Scripts\python.exe --judge C:\Users\agila\tts\chatterbox\Scripts\python.exe --ship assets/voice
node tools/voice/manifest.mjs assets/voice C:\Users\agila\tts\anchor_all\lines.json
```

Takes are kept in the takes folder (`<voice>/<key>.<round>.wav`, with the shipped form beside each as `.ship.mp3`), with
`scores.json` (every take's numbers) and `report.json` (each line's passes and pick, and the `rewrite` list). A take
runs about 6.5 times as long as the speech it makes: all 179 lines, about 13 hours. Don't run it on the GPU or with
more threads: on Bellmourn it crashed the PC. The voice model needs about 7 GB of memory, so keep the disk with the page
file from filling up.

When a line's words change, run the three commands again: only the new line is recorded. Delete the old MP3, or
`manifest.mjs` keeps listing it.

## Voices

- **No anime or children's voices** (the owner's rule). This model leans high for women. A description leading with a
  low, deep, chest voice and a grown woman's age holds her in her band; check a new voice's pitch on a few lines first.
- A new character gets their own approved sample, anchor, description and band before any line is recorded, and the two
  voice critics' two rounds.
- Pronunciation goes in `say.json`: Velscour is "VEL-skower", Tessariel "Tess-are-ee-ell", Bellmourn "Bell-morn".
- Write lines to be said: no brackets or stage directions, numbers as words, no lone words, and no names typed in at run
  time.
