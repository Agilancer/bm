# Measuring what the game holds

`raw.mjs` runs the game in a plain Chrome (the real GPU, its window parked off screen) and speaks to it over the debugger's
socket only. Nothing else is attached, so the numbers are a player's browser's. Windows, Node 22 or later, the server up.

    PHONE=pixel node tools/memory/raw.mjs steps.json

`steps.json` is a list of steps, each one object: `{"wait": ms}`, `{"eval": "page code"}`, `{"log": "page code that
returns"}`, `{"shot": "name"}`, `{"mem": "label"}` (the page's and the GPU's processes, and what's been asked of the GPU),
`{"threads": "label"}` (each thread's heap and buffers; needs `ATTACH=1`), `{"gc": 1}`, `{"dump": "label"}` (Chrome's own
account by allocator; the planners must be stopped first, `Atomics.store(bm.shared.ctrl, 5, 0)`, or it never answers),
`{"regions": "label"}`, `{"top": 30}` (the biggest textures and buffers by the code that made them), `{"x": "label"}`
(sound decoded, pictures open, canvases), `{"tap": [x, y]}`, `{"touch": [type, x, y]}`.

Env: `PORT` (8861), `PHONE` (`pixel`, `iphone`, `small`, `tablet`; none is a desk), `W`, `H`, `GFX` (a Graphics setting:
`medium`, `high`...), `HC` and `DM` (the cores and the memory the page is told of), `NOAUTO=1` (the real title), `Q`
(more query string), `OUT`.
