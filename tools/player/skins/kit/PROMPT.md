# Prompt: make gear sets for Bellmourn's wizard

Paste everything below the line into ChatGPT (or another assistant that can run Python and make images), attach
`wizard_skin_kit.zip`, and fill in the part in [brackets].

---

I've attached `wizard_skin_kit.zip`. It's a kit for making new sets of gear (hat, mantle, tunic, legs, boots) for the
wizard in my game, Bellmourn. Please make these sets for me:

[Say what you want. For example:
 1. "Emberwake": for the Crimson robes. Smouldering red and black, brass trim, flames.
 2. "Tidecaller": for the Midnight robes. Sea blue-green scale cloth, silver trim, a wave on the back.
 3. "Gravewarden": for the Ashen robes, hoods only. Bone white and charcoal, iron trim.
 Or: "Surprise me with five sets, one for each palette, each clearly different from the others."]

How to work:

1. Unzip the kit in your Python environment and read `wizard_skin_kit/README.md` all the way through before anything
   else. It explains why you must not paint the colour map directly, and every field of a recipe.
2. Look at `reference/wizard_as_he_is.jpg`, `reference/parts.jpg` and `reference/emblem_places.jpg` so you know the
   body, its five parts and where emblems can go. Open one recipe in `recipes/` and its preview in `out/`.
3. For each set I asked for:
   a. Decide the design in a sentence or two: the cloth, the trim metal, the leather, any pattern, any emblems, and
      what makes it different from the others. Each part (head, shoulders, chest, legs, feet) should be considered:
      they can share materials or differ.
   b. Make the pictures it needs into `swatches/` and `decals/`. Use your image tool for richer cloth, metal and
      emblems (prompts and rules are in the README under "Things to know"), or `python scripts/swatches.py` for
      quick ones (`python scripts/swatches.py list`). Emblems must be simple, bold shapes: they are small on him.
   c. Write `recipes/<id>.json`. Set `wears` to the palette (and shapes, if I named any) the set is for. If I didn't
      say, pick the nearest of the five palettes by colour and tell me which you chose.
   d. Run `python scripts/make_set.py recipes/<id>.json` from the kit's folder.
   e. Open `out/<id>/preview.jpg` and really look at it: top row is the original, bottom row is your set. Check it
      against this list and fix the recipe until it passes:
      - The five parts read as one outfit, and the set is plainly different from the original and from my other sets.
      - Cloth isn't a flat blob: you can see folds, and any swatch or pattern is the right size (not noise, not giant).
      - Trim is visible against the cloth. Leather isn't lost in black.
      - Emblems are where intended, the right way up, not stretched, not cut off by a seam.
      - Nothing is blown out to white or sunk to black.
4. Follow Bellmourn's rule on marks (in the README): no letters, monograms, V shapes used as a badge, demonic
   heraldry, or real-world logos and symbols.
5. When all are done, give me:
   - each set's zip from `out/` as its own download, named `<id>.zip` (one zip for each set: do not merge them, and
     do not re-zip or rename what `make_set.py` wrote);
   - each set's `preview.jpg` shown in the chat;
   - one line for each set: its id, its name, what it's worn for, and the design in a few words.

Don't edit anything in `template/` or `scripts/wizardskin.py`, and don't try to draw on `base_color.png` yourself: the
script is the only thing that can put paint in the right places. If the script reports a problem with a recipe, fix
the recipe. If something in the kit itself seems broken, stop and tell me what it said.
