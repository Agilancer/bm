# Bellmourn: the wizard's gear kit

This kit makes new sets of gear for the wizard you play in Bellmourn's third-person view: a hat, a mantle (shoulder
guards and collar), a tunic, legs (trousers, knee guards, greaves) and boots. Each set you make comes out as one zip.
Give that zip to Claude in the game's repository and it goes into the game: when the player wears a robe piece the set
was made for, that part of the wizard's body changes to match.

If you are an AI assistant reading this for someone: read `PROMPT.md` next. It says what to do, step by step.

## Why it works this way

The wizard's colour map (`template/base_color.png`) was cut by a machine into hundreds of scraps
(`reference/wizard_as_he_is.jpg` is him; open `base_color.png` to see the scraps). Nobody can paint on it by eye, and an
image model can't either. So you don't paint the map. There are two ways to say what a part looks like, and a set can
use either for each part, or both together:

- **A skin file**: a picture you paint over that part's **template**. `templates/` has one sheet for each of the five
  parts, with the part's outlines drawn from six sides. One skin file for each part: a hat file, a chest file, and so on.
- **A recipe**: what the part's cloth, gilt trim and leather become, as colours, tiling pictures, woven patterns and
  emblems. No painting at all.

Either way the script puts the paint on him in 3D, keeps the sculpt's own folds and stitching on top, leaves his skin
and hair alone, renders a preview, and zips the set.

## What's in here

| Path | What |
| --- | --- |
| `PROMPT.md` | The instructions to give an AI assistant along with this zip |
| `scripts/make_set.py` | Bakes a recipe into a set and zips it: `python scripts/make_set.py recipes/my_set.json` |
| `scripts/swatches.py` | Makes tiling cloth, leather, metal, patterns and simple emblems from numbers: `python scripts/swatches.py list` |
| `scripts/paint_helpers.py` | Small helpers for painting a skin file by program: open a template, find a panel, clip to the outlines |
| `scripts/example_skins.py` | Paints the two skin files of the `harlequin_example` recipe, as a worked example |
| `scripts/wizardskin.py` | The baking itself. You don't need to edit it |
| `templates/` | **The templates.** For each part: `<part>_lines.png` (its outlines, to paint on), `<part>_original.jpg` (the same sheet with the paint it came in), `<part>_mask.png` (white where the sheet is him) |
| `skins/` | Skin files: yours go here. The two there are the example's |
| `recipes/` | Five finished recipes to copy from, one for each robe colour in the game |
| `swatches/`, `decals/` | The pictures those recipes use. Put your own here too |
| `template/` | His colour map, which part each texel is, where each lies on his body, the preview views, the emblem places. Don't edit |
| `reference/` | Pictures to go by: him as he is, his parts in colours, where emblems go |
| `out/` | Where sets are written. `out/crimson_regalia.zip` is a finished one, to show what you're making |

Needs Python 3 with `numpy` and `Pillow`. Nothing else.

## Making a set

1. Copy a recipe in `recipes/` to a new name and edit it (the fields are below). `harlequin_example.json` is the one
   that uses skin files; the five `_regalia` ones are recipes only.
2. Paint any skin files into `skins/`, and make or draw any other pictures it needs into `swatches/` and `decals/`.
3. `python scripts/make_set.py recipes/your_set.json`
4. Look at `out/your_set/preview.jpg`: the top row is him as he came, the bottom row is your set, front, front
   three-quarter, back, back three-quarter. Change the recipe and run it again until it's right.
5. `out/your_set.zip` is the set. One zip for each set.

## Skin files: painting a part on its template

Open `templates/head_lines.png`. It's one sheet of six panels, three across and two down, the same for every part:

| | | |
| --- | --- | --- |
| **front** | **back** | **his left side** |
| **his right side** | **from above** (his front at the bottom) | **from below** (his front at the top) |

Black lines are the part's outline in that view. Light grey lines are the sculpt's raised trim (the stars, bands and
edging), so you can see where they are. `<part>_original.jpg` is the same sheet with the paint he came in.

A **skin file** is that sheet painted: one file for one part. Put it in `skins/` and name it in the recipe:

```json
"parts": {
  "head":      { "skin": "skins/emberwake_hat.png" },
  "shoulders": { "skin": "skins/emberwake_mantle.png" },
  "chest":     { "skin": "skins/emberwake_tunic.png" },
  "legs":      { "skin": "skins/emberwake_legs.png" },
  "feet":      { "skin": "skins/emberwake_boots.png" }
}
```

The rules that make it work:

- **Keep every shape exactly where it is.** The script reads each panel at the template's own places. Paint that has
  drifted, grown or shrunk lands in the wrong spot on him. Any size is fine as long as the sheet is still 3 wide to
  2 high (1536 x 1024 from an image model, or the template's own 3072 x 2048).
- **Paint all six panels**, and paint the same thing where they meet: the front and the left side both see the front-left
  of him, and the script blends them. A hat striped in the front panel should be striped the same in the side panels.
- **Outside the outlines doesn't matter.** It's thrown away, so paint past the lines rather than short of them.
- **Transparent means "not painted".** Where a skin file (a PNG with alpha) is transparent, the recipe's materials show
  if the part has any, else the original. So a skin can be just a few painted details over a recipe.
- **Flat colour and pattern, not lighting.** Don't paint shadows, highlights or a 3D look: the game lights him, and the
  script presses the sculpt's own fine relief back into your paint (`"skin_detail"`, 0 to 1, usually 0.6; 0 for none).
- What no panel can see (deep in a fold, inside a sleeve) is filled for you: with the recipe's materials if the part
  has any, else with your paint's average colours.
- A part can have a `skin` **and** materials, a `pattern` and `decals`: the materials go on first, the skin over them,
  the emblems last.

Three ways to make one:

1. **With an image model.** Give it `templates/<part>_lines.png` (or `_original.jpg`, for "this, but ...") and ask it
   to paint that part in every panel as flat game-texture colour, changing nothing about the layout: same canvas, same
   panels, every outline exactly where it is, no perspective, no shading, no new objects, nothing moved. Then look at
   what came back beside the template. If the shapes have drifted, don't use it: ask again, or use way 2 or 3.
2. **By program**, which never drifts. `scripts/paint_helpers.py` opens a template, gives a panel's rectangle and clips
   to the outlines; draw with Pillow on top. `scripts/example_skins.py` is a short worked example (a diamond hat, boots
   with gold toes). You can also paste an image-model texture through the mask: `tiled("chest", "swatches/x.png")`.
3. **By hand**, in any paint program, over the lines.

## The recipe

```json
{
  "id": "emberwake",
  "name": "Emberwake Regalia",
  "blurb": "One line on what it is, for the game's notes.",
  "wears": { "palette": "crimson" },
  "defaults": {
    "cloth":   { "swatch": "swatches/ember_velvet.png", "scale": 0.12, "tile": "repeat" },
    "trim":    { "color": "#d6a64c" },
    "leather": { "color": "#2a1512", "keep": 0.25 }
  },
  "parts": {
    "head":      { "decals": [ { "image": "decals/flame.png", "anchor": "hat", "size": 0.07, "mode": "gilt", "color": "#d6a64c" } ] },
    "shoulders": { "cloth": { "color": "#3a0d10" } },
    "chest":     { "pattern": { "image": "swatches/diamonds.png", "color": "#d6a64c", "scale": 0.16, "strength": 0.5, "tile": "repeat" } },
    "legs":      { "leather": { "color": "#120a0a" } },
    "feet":      {}
  }
}
```

- **`id`**: a short name in `a-z`, `0-9` and `_`. It becomes the zip's and the game file's name. Make it unique.
- **`name`**, **`blurb`**: what the set is called, and a line about it.
- **`wears`**: which robes in the game this set is the look of. See "What it's worn for" below.
- **`parts`**: `head`, `shoulders`, `chest`, `legs`, `feet`. A part you list is painted; `{}` paints it with the
  defaults. A part you leave out stays as the wizard came (and the set won't offer that piece).
- **`defaults`**: the materials for every part that doesn't say otherwise.

Each part is made of three **materials**, found from how the sculpt was painted (`reference/parts.jpg` shows the parts):

- **`cloth`**: the main fabric (purple on the original).
- **`trim`**: the gilt lines, studs, stars and edging (pale gold on the original).
- **`leather`**: everything else: boots, belt, straps, trousers, dark linings.

A material is a colour (`"#7a1f1a"`), or an object:

| Field | What it does | Usual |
| --- | --- | --- |
| `color` | Its colour. With a `swatch`, a tint multiplied over it | |
| `swatch` | A picture laid over him in 3D instead of a flat colour: weave, velvet, scales, anything that tiles | |
| `scale` | The size of one tile of the swatch on his body, in metres (he is 1.8 m tall) | 0.25 |
| `tile` | `"mirror"`: every other tile flipped, so any picture tiles without a seam. `"repeat"`: as it is, for pictures made to tile (everything from `swatches.py`) | mirror |
| `shading` | How much of the sculpt's painted folds and creases is kept: 0 flat, 1 as painted, up to 2 for deeper folds | 1 |
| `bright` | Brightness, multiplied in. If a set comes out dull, raise it; washed out, lower it | 1 |
| `keep` | How much of the original paint shows through, 0 to 1. Good on leather, to keep its scuffs | 0 |

A part can also have:

- **`skin`**: its skin file (above), and `skin_detail`.
- **`keep_trim`**: `false` paints the sculpt's gilt lines over as cloth, for a plain garment. (Also allowed in `defaults`.)
- **`pattern`**: a second colour woven into the cloth. `image`: white (or opaque) is where it goes. `color`, `scale`
  (metres a tile), `strength` (0 to 1), `tile`.
- **`decals`**: emblems, a list. Each: `image` (a PNG, transparent around the shape), `anchor` (a place, below), `size`
  (its width on him in metres), `mode`: `"paint"` puts the picture's own colours on, `"gilt"` takes only its shape and
  fills it with `color` (for thread and metal; a white shape on transparent is all it needs). Optional: `offset`
  (`[x, y, z]` metres to move it: x his left, y up, z ahead), `turn` (degrees), `opacity`, `under_trim` (`false` to
  let it cover the sculpt's own gilt lines).

### Where emblems go (`anchor`)

`reference/emblem_places.jpg` shows them. A decal only lands on the part its anchor belongs to, so put it in that
part's `decals`.

| Anchor | Part | Where | Usual size |
| --- | --- | --- | --- |
| `chest` | chest | the middle of the chest | 0.16 |
| `back` | chest | between the shoulder blades (the biggest clear space) | 0.24 |
| `tabard` | chest | the panel that hangs in front below the belt | 0.13 |
| `tabard_back` | chest | the panel that hangs behind | 0.15 |
| `belt` | chest | the buckle | 0.07 |
| `hat` | head | the front of the hat, above the band | 0.09 |
| `hat_back` | head | the back of the hat | 0.09 |
| `shoulder_left`, `shoulder_right` | shoulders | each shoulder guard, from the side | 0.11 |
| `knee_left`, `knee_right` | legs | each knee guard | 0.07 |
| `shin_left`, `shin_right` | legs | each greave | 0.06 |

### What it's worn for (`wears`)

The game's robes come in five palettes, each with these pieces:

| | Palettes | Shapes |
| --- | --- | --- |
| | `ash` (Ashen), `moss` (Mossgrown), `night` (Midnight), `crimson` (Crimson), `amethyst` (Amethyst) | |
| head | | `pointed` (Pointed Hat), `wide` (Wide-Brimmed Hat), `hood` (Hood) |
| chest | | `long` (Robe), `jacket` (Jacket), `coat` (Long Coat) |
| shoulders | | `mantle` (Mantle), `cowl` (Cowl Cape) |
| legs | | `pants` (Pants), `wraps` (Wrapped Trousers) |
| feet | | `boots` (Boots), `curled` (Curl-Toed Boots) |

- `"wears": { "palette": "crimson" }`: the look of every Crimson piece. Wearing the Crimson Hood changes the hat to
  this set's hat; the Crimson Boots, its boots.
- `"wears": { "palette": "crimson", "shapes": { "head": ["hood"], "chest": ["coat"] } }`: only for those shapes, so
  one palette can have several sets (a hood's look, a wide hat's look). Parts not named under `shapes` take any shape.
- `"wears": {}`: not tied to anything yet. Say in `blurb` what it's meant for (a new item, a reward) and Claude will
  wire it up when it's imported.

The five recipes in `recipes/` are the looks the game ships with for the five palettes. A new set for the same palette
replaces that look if it has the same `id`, or wins over it if it's more exact (names shapes).

## Things to know

- **A skin file or a recipe?** A recipe is the sure way to a good-looking set: it can't go wrong at a seam, and it keeps
  the sculpt's gilt linework. A skin file is for what a recipe can't say: stripes that follow the hat, a painted scene
  on the back, two-colour halves, flames licking up from the hems. Mixing them is usual: recipe everywhere, a skin file
  on the one or two parts that need it.
- **The shapes don't change.** The hat is always a pointed hat with a brim, the tunic always this tunic: a set is new
  cloth, metal, leather, pattern and emblems on the same body. A "hood" in the game wears the hat's paint.
- **The sculpt's gilt linework stays** (the stars, the edging) unless `keep_trim` is false. Recolour it with `trim`:
  silver, blackened iron, bone, verdigris.
- **Swatches from an image model**: ask for "a flat, evenly lit, seamless texture of ..., no shading, no objects", save
  it into `swatches/`, and leave `tile` as `mirror`. Any square picture works. 256 to 1024 pixels is plenty.
- **Emblems from an image model**: ask for one simple shape, flat, on a plain background, and make the background
  transparent before using it (or use `"mode": "gilt"`, which reads brightness when there's no transparency: a white
  shape on black works).
- **Bellmourn's rule on marks.** V is Velscour, the demon lord; T is Tessariel, the hero you play. Their marks never
  go together, and the wizard never wears Velscour's. So: **no letters or monograms of any kind**, no V shapes or
  chevrons used as a badge, no horned or demonic heraldry, no real-world logos, flags or religious symbols. Suns,
  moons, stars, flames, leaves, trees, waves, beasts, runes that aren't letters: all fine.
- **Skin, hair and eyes can't be changed.** The script refuses to.
- A dark recipe on a dark part loses its detail. Keep cloth colours above about `#30...` in their brightest channel,
  or raise `bright`.

## Sending sets back

Each `out/<id>.zip` is complete in itself (the set, its preview, and its recipe and pictures so it can be baked again).
Give the zips to Claude in the game's repository and say "import these gear sets". There, it's:

```
python tools/player/skins/import_set.py path/to/set.zip [more.zip ...]
```
