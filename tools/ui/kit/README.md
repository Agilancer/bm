# Bellmourn: the interface art kit

This kit is for painting the pieces of Bellmourn's interface: the round buttons a thumb presses on a phone, the icons on
them, the frames of its windows, its bars, and an icon for each of its sixty spells. The game works without any of them:
it draws every piece itself, in plain lines. Each painted piece that comes back takes the place of the drawn one, on
phones and on a desk alike.

If you are an AI assistant reading this for someone: read `PROMPT.md` next. It says what to do, step by step.

## What's in here

| Path | What |
| --- | --- |
| `PROMPT.md` | The instructions to give an AI assistant along with this zip |
| `STYLE.md` | **The art style lock**: the one description every picture is made to, and why |
| `PROMPTS.md` | Every sheet: its size, its template, what's in each cell, and the exact words for the image tool |
| `templates/` | **The size templates.** One for each sheet, at the sheet's exact size: where each picture goes, how much room it has, and the game's own line drawing of it, faint, so you can see what it is of |
| `reference/style_anchors.png` | The painted pieces already in the game, and the palette: what the set must match |
| `reference/where_pieces_go_phone.png` | A phone's screen with each place named for the piece that sits there |
| `reference/form_example_NOT_the_style.png` | One sheet in stand-in line drawings, to show the form a finished sheet takes: transparent, one picture to a cell, nothing else. Not how it should look |
| `art/` | **Finished sheets go here**, each saved as `<sheet id>.png` |
| `scripts/check.py` | Checks the sheets in `art/`, shows how they'll look in the game, and zips them to hand back |
| `scripts/uikit.py` | How a sheet is cut into its pictures (the game's importer uses this same file) |
| `spec.json` | The list of sheets as the scripts read it. Don't edit |
| `out/` | Where `check.py` writes |

Needs Python 3 with `numpy` and `Pillow` for the scripts. Nothing else.

## How a sheet works

A sheet is one picture, 1024 x 1024 or 1536 x 1024. There are four kinds:

- **A grid of pictures** (the icons, the round buttons, the sockets, the rings). So many cells across and down, one picture
  in the middle of each, nothing touching a cell's edge. The game finds each picture by its cell, trims the empty space
  round it and keeps it at 192 to 320 pixels. So what matters is which cell a picture is in and that it is whole, not
  that it sits on the guides to the pixel.
- **Boxes** (the button plates, the tabs, the rule, the bars). Named boxes of different shapes, one piece filling each.
- **A frame cut in nine** (the window frame, the parchment). One frame fills the whole sheet. The game keeps the four
  corners as they are and draws out the four sides and the middle to fit any window. So ornament belongs in the corners,
  and each side must look the same all along its length.
- **A whole picture** (the app's icon).

The template for a sheet shows all of this. Its lines, numbers and names are guides: they are not part of the art and
must not appear in it.

## Making the art

1. Read `STYLE.md`, and look at `reference/style_anchors.png` and `reference/where_pieces_go_phone.png`.
2. For each sheet in `PROMPTS.md`, in the order given there (A, then B, then C): make the picture with the prompt written
   for it, with the sheet's template and `reference/style_anchors.png` attached. Save it as `art/<sheet id>.png`.
3. Run `python scripts/check.py`.
4. Look at what it wrote in `out/`:
   - `report.txt`: which sheets are there, and anything wrong with them;
   - `<sheet>_contact.png`: every picture on the sheet as the game will cut it, on dark and on something like the game's
     own picture;
   - `<sheet>_stretched.png`: a frame, plate or bar drawn out to the sizes the game uses;
   - `hud.png`: a phone's screen put together from the pieces made so far.
5. Make again any sheet that's wrong, and run the check again.
6. `out/bellmourn_ui_art.zip` is what goes back. Any part of the kit can go back: the game uses what it's given.

## What goes wrong, and what to do

- **No real transparency.** The picture came back on white, on black, or with a checkerboard painted in. Ask again, saying
  "transparent background, PNG with an alpha channel". If the tool can't, ask for a flat pure green (#00ff00) background:
  the check takes that out. A painted checkerboard can't be taken out: make the sheet again.
- **Pictures in the wrong cells, or too few.** The image tool has miscounted. Ask again and number the cells in the
  request, or make the sheet in two halves and put them together with Pillow at the template's size.
- **A picture touches its neighbour or the edge.** It will be cut off. Ask for more space round each.
- **Words or letters have crept in.** Make it again: no lettering at all, anywhere (see `STYLE.md` for why).
- **A frame's sides have ornament along them.** It smears when stretched (`<sheet>_stretched.png` shows it). Ask for
  plain sides, ornament in the corners only.
- **The sheet doesn't match the others.** Make it again with the style lock unchanged and the anchors attached, and say
  which earlier sheet it must match; attach that sheet too.
- **The size is a little off** (1024 x 1024 asked for, something near it given). The check fits it to the template. A
  different shape altogether (portrait for landscape) is made again.
