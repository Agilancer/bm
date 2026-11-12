# Prompt: paint the interface for Bellmourn

Paste everything below the line into ChatGPT (or another assistant that can make images and run Python), attach
`bellmourn_ui_kit.zip`, and fill in the part in [brackets].

---

I've attached `bellmourn_ui_kit.zip`. It's a kit for painting the interface of my game, Bellmourn: buttons, icons,
window frames, bars and spell icons, as a set of sheets. Please make these sheets for me:

[All of them, in the order PROMPTS.md gives: every sheet in the kit.]

(Or say which, if you only want some. For example: "Just buttons, icons_actions and icons_menus, then stop and show
me." Or: "spells_fire and spells_ice again: I didn't like the last ones, make the icons bolder.")

How to work:

1. Unzip the kit in your Python environment. Read `bellmourn_ui_kit/README.md` and `STYLE.md` all the way through before
   anything else. Look at `reference/style_anchors.png` (what the set must match), `reference/where_pieces_go_phone.png`
   (where the pieces are used) and `reference/form_example_NOT_the_style.png` (the form a finished sheet takes).
2. For each sheet I asked for, in the order `PROMPTS.md` lists them:
   a. Open its template in `templates/` and its section of `PROMPTS.md`.
   b. Make the picture with your image tool, using the prompt written for that sheet **in full** (it begins with the style
      lock: don't shorten or reword that), at the size given, with a transparent background. Give the tool the sheet's
      template and `reference/style_anchors.png` to go by. The template's lines, numbers and names are guides only:
      none of them may appear in the picture.
   c. Save it, unchanged, as `art/<sheet id>.png`.
   d. Run `python scripts/check.py` from the kit's folder, and open `out/report.txt`, `out/<sheet id>_contact.png` and,
      for frames, plates and bars, `out/<sheet id>_stretched.png`. Really look at them, against this list:
      - Every cell that should have a picture has one, in the right cell, whole, and nothing in the cells marked empty.
      - The background is truly clear: no white or black box, no checkerboard, no halo.
      - No letters, numbers, words or symbols that read as letters anywhere. No V, no T.
      - It is plainly the same set as the style anchors and as the sheets already made: same iron, same gold, same
        garnets, same outline.
      - Each icon reads at a glance when small (the contact sheet shows them small on a button).
      - A frame, plate or bar looks right when stretched: plain sides, no smeared ornament.
      Make the sheet again if any of these fail, saying in the request what was wrong, and check again. Three tries at
      most for one sheet: after that, keep the best and tell me what's still wrong with it.
3. After the first A sheets are done, open `out/hud.png`: a phone's screen made from your pieces. If the buttons and the
   icons on them don't sit well together (icons too dark to read on the buttons, different outline weights), fix that
   before going on, because every later sheet has to match.
4. When all the sheets I asked for are done, give me:
   - `out/bellmourn_ui_art.zip` as a download (don't re-zip or rename what `check.py` wrote);
   - `out/hud.png` and each sheet's contact picture shown in the chat;
   - the lines of `out/report.txt`, and one line for any sheet you weren't happy with.

Don't edit `spec.json`, `scripts/uikit.py` or anything in `templates/`. Don't draw the pieces by program instead of
painting them: the game already has drawn ones. If the image tool can't make a transparent background, say so and use
the flat green the style lock allows, rather than giving me pictures on white.
