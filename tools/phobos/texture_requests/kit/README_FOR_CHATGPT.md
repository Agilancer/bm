# Texture request: Bellmourn : Velscour's Throne, batch {BATCH} of {NBATCH}: {TITLE}

You are making **{N} textures** for a dark-fantasy first-person game, *Bellmourn : Velscour's Throne*, for its endgame
zone, **City State Phobos** and **Castle Velscour**: a huge walled city of soot, bone and old stone under a demon lord's
castle and Keep. Everything you need is in this zip. Please read all of this file first, then do every item, then hand
back one zip.

## What's in this zip

| File | What it is |
|---|---|
| `REQUEST.json` | The {N} items: `id`, `name`, `kind`, `aspect`, `wrap`, `metres`, `use`, `palette`, and the `prompt` to use |
| `REQUEST.md` | The same list, easier to read |
| `STYLE_GUIDE.md` | The look, and what must never appear (read it: some rules are strict) |
| `ref/<id>_match.jpg` | The game's current texture this one will sit beside: match its **mood, colour temperature and level of realism**, not its content (not every item has one) |
| `ref/<id>_palette.png` | Plain colour swatches for the item's palette |
| `templates/<id>_guide.png` | For strips, single objects and decals: the shape and where the content goes (grey = content, black = empty). Reference only: never draw the guide itself |
| `scripts/check_textures.py` | Checks seams, even light, brightness, saturation, mask rules; makes repeat previews |
| `scripts/make_tileable.py` | Fixes seams: shifts the picture by half and makes a mask of the band to repaint |
| `scripts/pack_return.py` | Packs everything into the zip to hand back (several zips, each under 30 MB, if it's bigger) |

## What to do, for each item in order

1. **Generate one image** with your image tool from the item's `prompt`, exactly as written (you may add detail to
   it, never remove a rule from it). Size: `square` 1024x1024, `wide` 1536x1024, `tall` 1024x1536 (or the closest
   your tool gives; the biggest it can do is best). Show it `ref/<id>_match.jpg`, `ref/<id>_palette.png` and
   `templates/<id>_guide.png` (when they exist) as references if your tool takes reference images.
   **One texture per image.** Never a sheet, grid or set of samples.
2. **Look at it.** Reject and regenerate (up to 3 tries, keep the best) if it has: perspective or a vanishing point,
   a scene or sky, cast sun shadows or a bright patch, a dark vignette, text or symbols, a frame or border, a plastic
   or cartoon look, or any of the forbidden things in STYLE_GUIDE.md.
3. **Make it repeat** (items with `wrap` = `xy`, `x` or `y`): run
   `python scripts/make_tileable.py raw/<id>.png <wrap>`, then use your image tool's **masked edit** on
   `work/<id>_shifted.png` with `work/<id>_mask.png`, asking it to repaint only the white band so the material runs on
   naturally and matches the rest. Save the result as `finished/<id>.png`. (If you cannot do masked edits, read the
   note at the top of make_tileable.py.) Items with `wrap` = `none` (doors, banners, decals) go straight to
   `finished/<id>.png`.
4. **Check**: `python scripts/check_textures.py finished/`. Fix anything marked WARN if you can (regenerate, or
   repair the seam). Open `previews/<id>_repeat.jpg` and look: a stone, stain or blotch that you notice on every
   repeat is a failure even if the numbers pass; regenerate with that feature asked away.
5. Keep the prompt you finally used for each item in `prompts_used.json` (`{"<id>": "prompt"}`), and write anything
   worth knowing in `notes.txt` (what failed, what you changed, what you'd do differently).

When every item is done (or you've run out of generations: hand back what you have, ids unchanged), run
`python scripts/pack_return.py finished/` and give back **`RETURN_PH2_BATCH_{BATCH}.zip`**.

**No zip may be over 30 MB.** If everything together is bigger, pack_return.py splits it for you into
`RETURN_PH2_BATCH_{BATCH}_part1.zip`, `_part2.zip` and so on, each under 30 MB (part 1 also holds the catalog, contact
sheet and notes). Give back **every** part, each as its own download link. If you pack by hand instead, follow the same
rule: start a new zip before one would pass 30 MB, never shrink or recompress the textures to make them fit.

## The rules that matter most

- **Flat, even, shadowless light.** These are colour (albedo) maps: the game lights them. No sun, no shadows cast by
  anything, no highlights, no vignette, no darker corners. Relief is fine; lighting is not.
- **Straight-on, orthographic, the material fills the frame** edge to edge. For `tile`: nothing but the material. For
  `strip`: the band fills the frame top to bottom and runs left-right. For `single`: the one object fills the frame
  (no wall or background around it). For `mask` and `decal`: white shape on pure black, greyscale only.
- **Midtone exposure**: the mean brightness of a tile should be between about 18% and 55% grey even for black stone.
  We grade them darker in the game; detail lost in black can't be recovered.
- **Scale**: `metres` is how wide a piece of the world the picture shows. A 4 m wall tile has about 6 to 8 courses of
  big blocks; a 1.5 m tile of bricks has about 20 courses. Keep the sizes believable against that.
- **No repeating standouts**: no single odd stone, bright stain, hole or blob that will be spotted on every repeat.
- **Never**: text, letters, numbers, runes, monograms, signatures, watermarks; crosses, sunbursts, haloes, bells, saints,
  angels, doves or any holy sign. Velscour's own signs are allowed and wanted: horned skulls, crowns of thorns, thorn
  branches, bat wings, curling horns.

Thank you. This is a long job: steady and careful beats fast.
