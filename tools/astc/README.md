# A phone's pictures packed to ASTC

`src/gfx/astc.js` packs a phone's pictures on its own GPU as they load: ASTC 4x4, 16 bytes for each 4x4 block of texels,
a quarter of the plain 8-bit picture. An iPhone counts what its GPU holds against the page, and the textures were 244 MB
of it (measured as an iPhone in Chrome, November 2026), 200 of them the models' and the land's pictures.

Nothing in `assets/` changes. Each picture is decoded, shrunk and given its mips as before. A compute pass then packs every
mip into a buffer, the buffer is copied into the packed texture, and the plain one is let go once the GPU is done with it.
A land array is packed a layer at a time, so the whole plain array is never held.

## Where it packs

On the Mobile tier, when the GPU has `texture-compression-astc` and the packer passes its own check (below). Every iPhone
with WebGPU has the feature, and so do most Android phones; a PC's GPU doesn't. `?astc=0` turns it off; `?astc=1` turns
it on for any tier whose GPU has it.

- **Packed:** the land's colour arrays, the interiors' and the cave's colours, and every model's colour, normal and
  metal-roughness picture (`Renderer.bitmapTexture`). Also the heroes' painted pictures (`herolook.js`), worn skins
  (`bodyskin.js`) and the Tripo crowds' tinted skins (`tripo-slots.js`).
- **Kept plain:**
  - Lisandra's pictures, as the owner made her (`buildCrabs(..., plain)`).
  - The detail maps (`_d`) of the land and the cave (`bitmapTexture(..., pack = false)`). Their normal (rg), roughness
    (b) and height (a) are each their own, and one line through a block's four channels lost too much: 19-29 dB at full
    size, against 33-42 for the colours.
  - A map whose numbers aren't colours (a normal, a metal-roughness: not sRGB) with any alpha under 255. A shader may read
    that alpha as a mask (the possessed knights' eyes glow by `1 - mr.a`, `ARMOR` in `src/gfx/materials.js`), and the
    packing would share its four steps with the other three channels. The packer can't tell which maps a shader reads
    that way, so it looks: the compute pass sets a flag for any block with alpha (`seen`), and `pack` keeps the plain map
    if it's set. The load's log counts them ("N of them for a mask in their alpha").
  - A prop picture with its metal in the alpha (`herolook.js` `canvasTexture`), the lancer shields, data the game writes
    as it goes (the far map, the ground map, the heights), render targets.

## The check

Nothing here had run on an Apple GPU or in WebKit when it was written. So before anything is packed, `AstcPacker.check`
builds both shaders (asking `getCompilationInfo` for errors, then `create*PipelineAsync`, which fail by rejecting), and
`trial` packs a 12x8 picture of six blocks in both `rgba8unorm` and `rgba8unorm-srgb`, with its 6x4, 3x2 and 1x1 mips
(the last two smaller than a block, copied as whole blocks rounded up, as a 448x256 land array's small ends are), into
the second layer of a two-layer array (as the land's are), and reads the plain and the packed back alike. The blocks are
each one the packing should give back near exactly: colours on a line at the 3-bit steps; a line where one channel rises
as another falls (which the old fit's start missed, below); colours and alpha at the 2-bit steps; one flat colour. The top
level must come back within 8 levels (of 0-255) on every channel, the small ones within a mean of 24, and the alpha flag
must be set.

The GPU's own objections are caught in validation, internal and out-of-memory error scopes pushed round each run of the
check's own calls and popped straight after, never held across an await: held open, they'd catch the game's own errors
made meanwhile (the renderer goes on building while the check waits), blame the packing for them, and keep them from the
game's handler, which notes an out-of-memory to start lighter next time. The check gives up after 8 s of the page being
seen; time with it hidden doesn't count, as an app put away mid-boot has its timers and its GPU stopped alike.

Any fault and `on` turns false, `why` says what, the load warns in the console and notes "phone pictures left unpacked" in
the crash trail (`src/core/lastrun.js`), and every picture stays plain. Tried on the software GPU with the packing broken
on purpose: blocks overwritten with zeros fail the read-back ("off by up to 245"); a copy that isn't whole blocks fails on
the GPU's own message; neither reaches the game's error handler; unbroken, it passes.

It reads back through a draw (`textureLoad` in a fragment shader), as the game reads its pictures, not a compute pass:
Chrome's software GPU gives all zeros for a packed texture read in a compute pass, though it draws it right. The game's
compute passes (the grass's cull, the particles, the skinning) read no packed picture.

On a phone `pack` waits for the GPU, packed or not, as the load's pictures always did (that wait paces how many are in
hand at once). Off (a PC, or a phone whose check failed), `bitmapTexture` waits as it did before any of this.

## The blocks

One thread packs one block. It fits the block's colours to a line through them (their principal axis), takes the line's
ends as the block's two colours, and gives every texel the step between them nearest its own colour. The ends are then
fitted again to those steps (least squares) and the steps chosen again. There are two kinds of block, chosen block by
block:

| | colour endpoint mode | ends | weights | block mode |
|---|---|---|---|---|
| opaque (every alpha 255) | 8, LDR RGB direct | 6 x 8 bits | 16 x 3 bits (8 steps) | `0x53` |
| with alpha | 12, LDR RGBA direct | 8 x 8 bits | 16 x 2 bits (4 steps) | `0x42` |

Both have one partition, one plane, and a 4x4 weight grid, so every texel has its own weight.

**The line.** The principal axis is found by power iteration from two starts, the block's box diagonal (`hi - lo`) and
the covariance's widest column, and the stronger kept. From the diagonal alone, a block where one channel rises as another
falls by as much (a bevel in a normal map, metal against rough) starts square to the line, finds nothing, and both ends
fall to the mean (found by the veteran critic, porting the shader to JavaScript).

**A texel with no alpha** takes the colour of its block's seen texels' mean before the fit, so whatever was painted round
a cut-out doesn't pull the line away from the edge that shows.

**Why these two layouts.** ASTC doesn't say how finely a block's ends are stored. The decoder works it out: the finest step
that fits the bits left after the 17 bits of header and the weights. Most layouts leave room for a step count made with
trits or quints (192 = 3 x 64, 160 = 5 x 32), packed five or three values at a time. These two leave exactly enough for
plain 8 bits and nothing finer:

- opaque: 128 - 17 - 48 = 63 bits, and 6 ends at 8 bits take 48;
- alpha: 128 - 17 - 32 = 79 bits, and 8 ends take 64.

So the packer writes plain bits. 4-bit weights for opaque blocks would leave 47 bits, where the decoder would pick 192
steps, trits (6 x 6 bits and 10 for the trits: 46). `tests/astc-layout.test.mjs` decodes both block modes as the spec does
and works out the decoder's choice.

The decoder takes the ends in the order given only if the second is the brighter (r + g + b, equal counting as brighter).
Otherwise it reads them "blue contracted", so the packer swaps them, and turns the steps round, when the first is brighter.

## Checking it

Chrome on a PC has no ASTC on its real GPU, but its software one (SwiftShader) reads it:

    FLAGS="--enable-unsafe-swiftshader" node tools/astc/check.mjs "http://localhost:8861/tools/astc/check.html?soft=1" out

`check.html` runs the packer's own check first, then makes each picture as the game does, packs it, reads both back
through the GPU, and compares them mip by mip (PSNR), with a sheet of the plain picture, the packed one, and the difference
times four. A picture with alpha is shown as it's drawn, over grey through its alpha, and its colour is also measured
where it's seen (alpha half or more). `?dims=448x256` shrinks to a land array's size on the Mobile tier; `?size=512` caps
a side; `?pics=a,b` names the pictures, `glb:<path>#<image>[:srgb]` a model's. The game itself runs on the software GPU
with `?soft=1` (slowly): `Q="&soft=1"` and `FLAGS="--enable-unsafe-swiftshader"` for `tools/memory/raw.mjs`.

Mip 0, packed against plain (over 40 dB is hard to see; the low 30s only up close):

| picture | RGB dB | alpha dB |
|---|---|---|
| witch colour, 512 (Lisandra: since kept plain) | 40.6 | exact |
| witch normal, 512 (since kept plain) | 45.8 | exact |
| witch metal-roughness, 512 (since kept plain) | 46.0 | exact |
| possessed knight colour, 256 | 41.2 | exact |
| archer colour, 512 | 41.0 | exact |
| archer normal, 512 | 38.3 | exact |
| archer metal-roughness, 512 | 34.1 (roughness 31.4) | exact |
| townsfolk colour (`skinner_c`), 256 | 37.0 | exact |
| townsfolk normal (`skinner_n`), 256 | 47.8 | exact |
| townsfolk metal-roughness (`skinner_m`), 256 | 45.1 | exact |
| bark colour, 448x256 | 37.2 | exact |
| ashlar colour, 448x256 | 42.2 | exact |
| grass colour, 448x256 | 33.4 | exact |
| leaves colour (cut out), 448x256 | 32.8; 35.0 where seen | 32.5 |
| bark detail, 224x128 (kept plain) | 23.7 | 19.2 |

## Could be better

- 4-bit weights with 192-step trit-coded ends, and a second plane (dual-plane blocks) for metal-roughness and a normal's
  X and Y: probably 3-6 dB more, and a detail map's height could be packed apart from its normal.
- Two partitions, for blocks across an edge between two colours.
- Read an sRGB source through an `rgba8unorm` view rather than the shader's `pow` back to sRGB bytes (each source would
  need the view format at creation).
- The far pictures packed as they're drawn.
