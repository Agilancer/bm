# Measuring what the game holds

`raw.mjs` runs the game in a plain Chrome (the real GPU, its window parked off screen) and speaks to it over the debugger's
socket only. Nothing else is attached, so the numbers are a player's browser's. Windows, Node 22 or later, the server up.

    PHONE=pixel node tools/memory/raw.mjs steps.json

`steps.json` is a list of steps, each one object: `{"wait": ms}`, `{"eval": "page code"}`, `{"log": "page code that
returns"}`, `{"shot": "name"}`, `{"mem": "label"}` (the page's and the GPU's processes, and what's been asked of the GPU),
`{"threads": "label"}` (each thread's heap and buffers; needs `ATTACH=1`), `{"gc": 1}`, `{"dump": "label"}` (Chrome's own
account by allocator; the planners must be stopped first, `Atomics.store(bm.shared.ctrl, 5, 0)`, or it never answers),
`{"regions": "label"}`, `{"top": 30}` (the biggest textures and buffers by the code that made them), `{"x": "label"}`
(sound decoded, pictures open, canvases), `{"tap": [x, y]}`, `{"touch": [type, x, y]}`, `{"tapOn": "css selector",
"text": "words in it", "hold": ms}` (a finger on the first one shown, waiting up to 60 s for it: the real title's buttons;
`hold` keeps it down that long, as on the story's "Hold here to skip"),
`{"emulate": ["Domain.method", {...}]}` (any emulation call: a turn of the phone is `Emulation.setDeviceMetricsOverride`
with the sizes swapped), `{"layers": "label"}` (the compositor's painted layers and what each weighs at the screen's
pixel ratio, as an iPhone keeps a picture for each, the biggest named; `WHY=1` adds the compositor's reason for each),
`{"snap": "sim"}` (a heap snapshot of the thread whose script's name has that in it, `page` for the page, to
`OUT/<name>.heapsnapshot`; needs `ATTACH=1`).

Env: `PORT` (8861), `PHONE` (`pixel`, `iphone`, `small`, `tablet`; none is a desk), `W`, `H`, `GFX` (a Graphics setting:
`medium`, `high`...), `HC` and `DM` (the cores and the memory the page is told of), `NOAUTO=1` (the real title), `Q`
(more query string), `OUT`, `OPENING=1` (the story from its start, not skipped), `LS='{"key":"value"}'` (put in
the page's storage before it starts: `{"bm-threads-consent":"all"}` with `NOAUTO=1` gets past the threads' question),
`WHY=1`, `GPUDUMP=1` (each `mem` also gives the GPU process's own account, its allocators two deep), `DEBUG_PORT`
(9351; another for a second run at once, though two at once share the GPU process and swell its figures: run them one
after the other for numbers). The Chrome it starts plays sound before any tap (`--autoplay-policy=no-user-gesture-required`),
which an iPhone never does. `FLAGS` adds Chrome flags: `FLAGS="--enable-unsafe-swiftshader" Q="&soft=1"` runs the game on
Chrome's software GPU, slowly, the one GPU on a PC that reads a phone's packed pictures (`src/gfx/astc.js`; `&astc=0` to
see it without them). The textures' count by format and size is in `window.__gpu.texBy`.

`node tools/memory/heapbig.mjs OUT/sim.heapsnapshot 40`: the biggest buffers in a snapshot, each with the chain of
properties holding it, then the same summed by holder. `init.js` (put in every page and thread) also gives the page
`__gpuBy(n)` (what's asked of the GPU summed by the line of `src/gfx/renderer.js` or the function that asked) and
`__made(ms)` (the GPU's textures, views and buffers made a second over that many ms, and the MB a second written to it,
by where), from a `log` step: `{"log": "return __gpuBy()"}`.

`init.js` also models a WebKit bug (bugs.webkit.org 329399, fixed on WebKit's main 4 November 2026): an iPhone's WebGPU
keeps in each texture view the id of every command encoder it was used in (attachments, and views in bind groups set in a
pass), until the view is let go. `__slots(ms)`: encoders and view-ids added a second, by where each view was made;
`__leak(n)`: the ids held now by views not yet collected, and the `n` biggest holders (after a `{"gc": 1}` step, or the
collected ones still count). `src/gfx/freshviews.js` is the game's answer; `Q="&fresh=0"` to see it without.

A phone's browser keeps a picture for every layer the compositor makes, and an iPhone counts them, and the GPU's
textures and buffers, against the page. So on a phone, measure `layers` and the GPU's ask as well as the page's own.
