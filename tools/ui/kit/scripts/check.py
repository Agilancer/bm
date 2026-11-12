"""Checks the art made for Bellmourn's interface kit, shows how it will look in the game, and zips it to hand back.

    python scripts/check.py            (from the kit's folder)

It reads every sheet you've saved in art/ (art/<sheet id>.png: the ids are in PROMPTS.md), cuts each into its pictures
the way the game will, and writes into out/:
  <sheet>_contact.png   every picture on the sheet, on dark and on something like the game's own picture
  <sheet>_stretched.png a frame, plate or bar drawn out to the sizes the game uses it at
  hud.png               a phone's screen put together from whatever pieces you've made so far
  report.txt            what's missing or wrong, sheet by sheet
  bellmourn_ui_art.zip  the sheets, to give back. Made whenever at least one sheet is good

Needs numpy and Pillow."""
import datetime
import json
import os
import sys
import zipfile

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import uikit  # noqa: E402


def hud(spec, pics):
    """A phone's screen from the pieces there are (the places are the game's own: spec['hud'])."""
    lay = spec.get("hud")
    if not lay:
        return None
    S = 2
    W, H = lay["size"][0] * S, lay["size"][1] * S
    im = uikit.backdrop(W, H)
    d = ImageDraw.Draw(im)

    def put(pic, x, y, r, scale=1.0):
        side = max(2, int(round(2 * r * S * scale)))
        p = pic.resize((side, side), Image.LANCZOS).convert("RGBA")
        im.alpha_composite(p, (int(x * S - side / 2), int(y * S - side / 2)))

    def ring(x, y, r, col=(201, 163, 92, 255)):
        d.ellipse([x * S - r * S, y * S - r * S, x * S + r * S, y * S + r * S], fill=(16, 12, 9, 200), outline=col, width=3)

    for b in lay["boxes"]:
        base = pics.get(b.get("base") or "")
        if b.get("square"):
            # The corner map: what it shows, and its frame round it (the map sits inside the frame's band).
            x, y, r = b["x"] * S, b["y"] * S, b["r"] * S
            q = r * (b.get("inset", 1.0) if base is not None else 1.0)
            d.rectangle([x - q, y - q, x + q, y + q], fill=(22, 26, 18, 255), outline=None if base is not None else (201, 163, 92, 255), width=3)
            if base is not None:
                put(base, b["x"], b["y"], b["r"])
        elif base is not None:
            put(base, b["x"], b["y"], b["r"])
        elif b.get("base"):
            ring(b["x"], b["y"], b["r"])
        top = pics.get(b.get("icon") or "")
        if top is not None:
            put(top, b["x"], b["y"], b["r"], b.get("scale", 0.62))
    # The bars, top left: their trough, then what fills them.
    x0, y0 = lay["bars"]["x"] * S, lay["bars"]["y"] * S
    bw = lay["bars"]["w"] * S
    if "bar_frame" in pics:
        im.alpha_composite(uikit.plate(pics["bar_frame"], bw + 36, 32 * S + 20), (x0 - 18, y0 - 10))
    for name, top, hgt, part, col in [("bar_life", 0, 13, 0.72, (184, 42, 29)), ("bar_mana", 16, 8, 0.55, (74, 141, 240)), ("bar_stamina", 27, 5, 0.9, (217, 192, 120))]:
        y, h = y0 + top * S, hgt * S
        d.rectangle([x0, y, x0 + bw, y + h], fill=(6, 5, 4, 200))
        fill_w = int(bw * part)
        if name in pics:
            f = pics[name]
            tile = f.resize((max(1, int(f.width * h / f.height)), h), Image.LANCZOS).convert("RGBA")
            for x in range(0, fill_w, tile.width):
                im.alpha_composite(tile.crop((0, 0, min(tile.width, fill_w - x), h)), (x0 + x, y))
        else:
            d.rectangle([x0, y, x0 + fill_w, y + h], fill=col + (255,))
    return im.convert("RGB")


def main():
    spec = uikit.load_spec(os.path.join(KIT, "spec.json"))
    art = os.path.join(KIT, "art")
    out = os.path.join(KIT, "out")
    os.makedirs(art, exist_ok=True)
    os.makedirs(out, exist_ok=True)
    done, notes, files = uikit.process_folder(spec, art)
    pics = {}
    for group in done.values():
        pics.update(group)
    by = {s["id"]: s for s in spec["sheets"]}
    lines = [f"Bellmourn's interface kit: checked {datetime.datetime.now():%Y-%m-%d %H:%M}", ""]
    good = []
    for sheet in spec["sheets"]:
        sid = sheet["id"]
        mine = [n for n in notes if n[1].startswith(sid + ":")]
        if sid not in files:
            lines.append(f"[ ] {sid:<18} priority {sheet['priority']}   not made yet")
            continue
        bad = [n for n in mine if n[0] == "error"]
        warn = [n for n in mine if n[0] == "warn"]
        lines.append(f"[{'x' if not bad else '!'}] {sid:<18} priority {sheet['priority']}   {os.path.basename(files[sid])}   {len(done.get(sid, {}))} pictures{'' if not bad else '   NEEDS REDOING'}")
        for level, text in bad + warn:
            lines.append(f"      {level.upper()}: {text.split(': ', 1)[1]}")
        if not bad and done.get(sid):
            good.append(sid)
        got = done.get(sid, {})
        c = uikit.contact(sheet, got, pics.get("btn_round") if sid.startswith("icons_a") or sid.startswith("icons_m") else pics.get("slot_spell") if sid.startswith("spells_") else None)
        if c:
            c.save(os.path.join(out, f"{sid}_contact.png"))
        if sheet["kind"] == "nine" and sheet["name"] in got:
            s = int(round(sheet["slice"] / sheet["size"][0] * sheet["out"]))
            board = uikit.backdrop(1100, 520)
            board.alpha_composite(uikit.nine_slice(got[sheet["name"]], s, 700, 380, 44), (20, 20))
            board.alpha_composite(uikit.nine_slice(got[sheet["name"]], s, 330, 200, 44), (750, 20))
            board.alpha_composite(uikit.nine_slice(got[sheet["name"]], s, 330, 110, 28), (750, 250))
            board.convert("RGB").save(os.path.join(out, f"{sid}_stretched.png"))
        if sheet["kind"] == "boxes" and got:
            board = uikit.backdrop(1100, 80 + 90 * len(got))
            y = 20
            for name, p in got.items():
                for k, w in enumerate((140, 300, 560)):
                    h = 44 if not name.startswith("bar_") or name == "bar_frame" else 22
                    board.alpha_composite(uikit.plate(p, w, h), (20 + [0, 170, 500][k], y))
                ImageDraw.Draw(board).text((20, y + 50), name, fill=(240, 225, 190, 255))
                y += 90
            board.convert("RGB").save(os.path.join(out, f"{sid}_stretched.png"))
    h = hud(spec, pics)
    if h:
        h.save(os.path.join(out, "hud.png"))
    lines += ["", f"{len(good)} of {len(spec['sheets'])} sheets are good to go." + ("" if good else " Nothing to zip yet.")]
    report = "\n".join(lines)
    open(os.path.join(out, "report.txt"), "w", encoding="utf-8").write(report + "\n")
    print(report)
    if good:
        z = os.path.join(out, "bellmourn_ui_art.zip")
        with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("kit.json", json.dumps({"format": uikit.FORMAT, "made": datetime.datetime.now().isoformat(timespec="seconds"), "sheets": good}, indent=2))
            for sid in good:
                ext = os.path.splitext(files[sid])[1].lower()
                zf.write(files[sid], f"sheets/{sid}{ext}")
        print(f"\nTo give back: {os.path.relpath(z, KIT)}  ({os.path.getsize(z) / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
