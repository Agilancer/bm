# Phobos skin kit: handoff

This kit is for making **new skins for the people of City State Phobos** in the game *Bellmourn*. A skin is a new
colour picture painted onto one of the game's existing villager bodies. The body's shape, its bones and its walk stay
as they are; only what it is painted with changes. One body can wear many skins, so one body can be many different people.

Read this whole page before painting anything. It is written for whoever paints the skins (a person, or ChatGPT's image
tools), and for whoever brings them back into the game.

---

## 1. What's in the kit

```
HANDOFF.md              this page
BODIES.md               every body: what kind of person it is, its height, who in the game wears it now
all_villagers.jpg       every body from the front, side by side
regions_legend.png      the colour key for every regions.png and overlay.png
bodies/<id>/
    color.png           the body's colour picture as the game has it now (1024 x 1024). THIS is what you paint over.
    overlay.png         color.png greyed, with the body part of every bit tinted over it (see regions_legend.png)
    regions.png         just the body-part colours, flat
    face.png            white where the front of the face is
    skin.png            white where the picture is skin-coloured now (face, neck, arms, hands)
    lines.png           the outline of every piece of the picture (transparent PNG; lay it over color.png)
    preview.jpg         how the body looks in the game now: face front and three-quarter, whole body front and back
    info.json           the same facts as BODIES.md, for this body
skin_template/ph_example/
    skin.json           the card that goes with a finished skin (fill it in)
    color.png           a finished skin's picture goes here (this one is just Wes's, as a stand-in)
example_ph_tallow/      a finished grim Phobos skin, Mordo Grisk on the "wes" body, beside the original
```

---

## 2. How the picture works (important)

Each `color.png` is an **atlas**: the surface of the 3D body cut into hundreds of small pieces, laid out flat and packed
into one square. It does not look like a person. A piece of the face sits next to a piece of a boot, and the
two halves of one shirt may be on opposite sides of the square.

- **Every pixel belongs to one exact spot on the body.** The game wraps the picture back onto the body by position. So
  a finished skin must keep **every piece exactly where it is**, at the same size, the same way round. Never move,
  turn, scale, crop, mirror or rearrange anything. Never "tidy up" the layout.
- **What you can change is colour:** hue, darkness, dirt, stains, wear, a different shirt colour, different hair,
  a scar, a tattoo-like mark (no letters), age lines, stubble.
- **Use `overlay.png` and `regions.png` to know what each piece is.** Red is the head, yellow the chest, blue the
  thighs, and so on (see `regions_legend.png`). Darker tints are the body's right side, lighter tints its left.
  `face.png` shows the front of the face: the most important area and the smallest.
  Loose clothes are tinted by the bone that carries them: an apron or a skirt hanging over the legs shows as
  thigh, a hood as head. Tell garments apart by `color.png` itself; the tint says where on the body a piece is.
- **`lines.png` shows the edges of the pieces.** Where two pieces meet on the body, their edges touch on the body but
  not in the picture. So anything that runs **across an edge** (a stripe, a scar, a stain) breaks there in the game.
  Keep sharp designs inside one piece. Keep changes that cover big areas (a garment's colour, dirt, darkening)
  **even across the whole garment**, so both sides of every edge match.
- **The black or dark background between pieces doesn't matter.** Leave it, or let colour spill a little into it.
  Don't paint anything that only works there.
- **The output must be 1024 x 1024**, PNG, no transparency, with no text, labels, grid, overlay tint or outlines left
  in it. If a tool returns another size, it must be the same square picture scaled, never cropped or padded.
- **Resolution:** the face gets only about **2.5 to 3.3 mm of skin per pixel**. A line one or two pixels wide is
  smeared or stair-stepped in the game. Make face marks **broad and soft**: a scar about 2 pixels wide with a soft dark
  edge, shadows under the eyes as soft patches, not drawn lines. A body's `info.json` gives its own figure.

---

## 3. The game's rules (never break these)

1. **No letters, numbers, words, monograms or signatures anywhere**, not even small ones, not even hidden in a
   pattern. No shape that reads as a letter: no T, no V, no cross. Watch scars and wrinkles: a vertical frown line
   under a horizontal forehead line makes a T, and a scar straight across an eyebrow makes a cross. Keep forehead lines
   off the middle of the brow, and break the eyebrow where a scar passes through it.
2. **Never Tessariel's colours or marks on Phobos's people.** Tessariel is the game's good god: pale blue and gold,
   sunbursts. Phobos is the dark lord Velscour's city, and its people don't wear his enemy's colours. No sky blue, no
   royal blue, no gold trim, no yellow sunbursts.
3. **No marks of Velscour on ordinary people either** (no sigils, no emblems, no heraldry) unless the owner asks for
   one of his own men. Plain folk wear plain cloth.
4. **No real people, brands or logos.**

---

## 4. What Phobos looks like

Phobos is a vast walled city of soot and rain under a dark lord: tenements ten thousand deep, canals of filth (the
Slough), a castle that eats its servants. Its people are poor, wary, tired and hard. A Phobos skin should read
at a glance as **someone who lives there**:

- **Darker, duller clothes.** No bright dyes. Linen gone grey or dishwater yellow, leather near black, wool in mud,
  soot, rust, ash, slate, bottle green, wine and umber. One muted colour at most to mark them out.
- **Dirt where dirt goes.** Soot over everything, heavier at hems, cuffs and knees. Mud up the boots and shins. Grease,
  stains and wear where the trade puts them (a tallow-boiler's apron, a rat-catcher's knees).
- **Hard, grim faces.** Hollows under the eyes, a heavier, lower brow, frown lines, deeper folds from the nose to the
  mouth, the mouth's corners turned down. Sallow skin that never sees the sun, sallow rather than grey or green. A
  scar, a broken nose, broken veins, stubble.
- **Keep the garments apart in lightness**, or the person is one dark blob in the game's dim light. Give each garment
  its own value: a mid-grey shirt, the darkest apron or coat, the trousers between, the boots dark. Black hair and
  beards should be very dark brown with some lighter strands, not flat black.

To make someone **look like a different person** from the body's usual one, change most of: hair colour, beard colour
(a beard must follow where a beard grows: up the jaw, high on the upper lip, never a straight line across the cheek),
skin tone, the eyebrows' weight, and the face's marks. Change the clothes' colours too.

---

## 5. How to make one skin (step by step, for ChatGPT or anyone)

1. **Choose a body** from `BODIES.md` / `all_villagers.jpg`: the right sex, age and build, and clothes that suit the
   person you want (an apron for a tradesman, a long gown for a widow). Note its id (e.g. `wes`).
2. **Write who the person is** in one or two lines: name, trade, what they wear, what marks them.
3. **Give the painter these files from `bodies/<id>/`:** `color.png` (the one to edit), `overlay.png`,
   `regions_legend.png`, `face.png` and `preview.jpg`, plus this page.
4. **Ask for an edit of `color.png`, not a new picture.** A prompt that works:

   > Edit the attached texture atlas `color.png` (1024x1024). It is a UV atlas for a 3D game character: keep every
   > shape, piece and position exactly as it is; change only colours and surface detail. Use `overlay.png` and the
   > legend to see which piece is which body part (red = head, yellow = chest, blue = thighs, ...). `face.png` marks the
   > face. The character is: *[your one or two lines]*. Make the clothes darker and dirtier for a grim city of soot and
   > rain: *[the garments and their new colours]*. Make the hair and beard *[colour]*. Make the face grimmer: soft
   > shadows under the eyes, a heavier brow, deeper lines from nose to mouth, *[a scar / broken nose / stubble]*. No
   > text, letters, symbols, logos, blue or gold anywhere. Return a 1024x1024 PNG with the same layout.

5. **Check what comes back** against the checklist below. If the layout moved at all (lay `lines.png` over it: every
   piece must still sit inside its outline), throw it away and ask again; nothing can rescue a moved atlas.
6. **Put it in a folder** named for the skin's id, like `skin_template/ph_example/`:
   `color.png` (the finished picture) and `skin.json`:

   ```json
   { "id": "ph_tallow", "base": "wes", "name": "Mordo Grisk",
     "note": "a tallow-boiler of the Slough: black greasy hair and beard, a broken nose, a scar through his left brow; linen gone dishwater grey, the apron black and waxed with tallow" }
   ```

   `id` must start `ph_`, use only lowercase letters, digits and `_`, and be new (`BODIES.md` lists the ones taken).
   `base` is the body's id.
7. **Zip the folders** (one zip can hold many skins) and give it to Claude in the project, saying it's for
   `tools/phobos/import_skins.py`.

---

## 6. Checklist before a skin goes in

- [ ] 1024 x 1024 PNG; laid under `lines.png`, every piece's colours still sit inside its outline.
- [ ] No text, letters, numbers, symbols, T, V or cross shapes; no blue or gold; no emblems.
- [ ] Face, neck, forearms and hands are one skin tone (they're scattered pieces: check each in `overlay.png`).
- [ ] Hair, beard and eyebrows are one colour wherever they are; the beard edge follows a real growth line.
- [ ] Each garment is one colour on all its pieces (find them by its old colour and `overlay.png`), and the garments
      differ from each other in lightness.
- [ ] Nothing sharp crosses a piece's edge; dirt and stains are soft and even.
- [ ] Face marks are broad and soft (2+ pixels), not one-pixel lines.
- [ ] It reads as a different, grimmer person than `preview.jpg`.

---

## 7. Bringing skins into the game (for Claude in the project)

```
python tools/phobos/import_skins.py skins.zip [--replace]
```

It checks each folder (id, base, size, no stray transparency), fills the gaps between the pieces from their edges
(so the old colours don't show along the seams), writes `assets/game/folk/<id>_c.webp` and the skin into
`assets/game/folk/folk.json` (`swaps`). It also says how well the picture's edges agree with the base's: a low
figure means the layout has moved. Look at it beside its base in the game's viewer (`python tools/serve.py`, then
`tools/folk/viewer.html?ids=<base>,<id>`), check it
against the rules above (nothing on it may break the V and T rule in CLAUDE.md), then give it to someone:
`body: '<id>'` on a person in `src/folk/people.js` (Phobos's crowd: `CROWD`), and run
`node --test tests/phobos-crowd.test.mjs`. Nothing loads until someone wears it.

A skin that needs more than paint (a different face shape, the normal map's folds) is
`tools/phobos/grim_skin.py`'s work: that's how `ph_tallow` got his own head. See `tools/phobos/README.md`.
