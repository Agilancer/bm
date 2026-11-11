"""Brings sets of gear made with the skin kit into the game.

    python tools/player/skins/import_set.py path/to/emberwake.zip [more.zip ...]
    python tools/player/skins/import_set.py path/to/folder             (a set unzipped, or a folder of them, however deep)
    python tools/player/skins/import_set.py --rarity rare garnet_court [more ids]
    python tools/player/skins/import_set.py --list
    python tools/player/skins/import_set.py --remove emberwake

Each zip is what the kit's scripts/make_set.py wrote: set.json, color.jpg, preview.jpg and source/. This checks it, writes
assets/game/player/skins/<id>.webp, adds it to assets/game/player/skins/sets.json (a set of the same id is replaced), and
keeps its recipe and pictures in art/player/skins/<id>/ so it can be baked again. The game picks a set for each part of
the body by what's worn in that slot (src/gfx/bodyskin.js pickSets): `wears` in set.json says which robes it's for.
Needs numpy and Pillow."""
import io
import json
import os
import shutil
import sys
import zipfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
SKINS = os.path.join(ROOT, "assets", "game", "player", "skins")
ART = os.path.join(ROOT, "art", "player", "skins")
FORMAT = "bm-wizard-skin/1"
PARTS = ["head", "shoulders", "chest", "legs", "feet"]
PALETTES = ["ash", "moss", "night", "crimson", "amethyst"]
SHAPES = {"head": ["pointed", "wide", "hood"], "chest": ["long", "jacket", "coat"], "shoulders": ["mantle", "cowl"], "legs": ["pants", "wraps"], "feet": ["boots", "curled"]}
RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"]
SIZE = 2048


def listing():
    path = os.path.join(SKINS, "sets.json")
    return json.load(open(path)) if os.path.isfile(path) else {"sets": []}


def save(data):
    os.makedirs(SKINS, exist_ok=True)
    json.dump(data, open(os.path.join(SKINS, "sets.json"), "w"), indent=1)
    open(os.path.join(SKINS, "sets.json"), "a").write("\n")
    write_items(data)


def rarity_of(sid, said=None):
    """How rare a set's pieces come: what it says, else the end of its id (hedgeway_common), else not said."""
    if said in RARITIES:
        return RARITIES.index(said)
    if isinstance(said, int) and 0 <= said < len(RARITIES):
        return said
    end = sid.rsplit("_", 1)[-1]
    return RARITIES.index(end) if end in RARITIES else None


def write_items(data):
    """src/items/robesets.js: the sets whose pieces are things to find and wear (those with a rarity), for the game's
    dice and tooltips. A piece is named for its set: 'Vesperglass Pointed Hat'."""
    import re
    lines = []
    for s in data["sets"]:
        if s.get("rarity") is None or not s.get("wears", {}).get("palette") or sorted(s["pieces"]) != sorted(PARTS):
            continue
        name = re.sub(r"\s+(?:(?:Common|Uncommon|Rare|Epic|Legendary|Mythic)\s+)?(?:Gear|Regalia|Armor|Armour|Set)$", "", s["name"]).strip()
        lines.append(f"  {s['id']}: {{ name: {json.dumps(name)}, palette: '{s['wears']['palette']}', rarity: {s['rarity']} }},")
    out = ("// The sets of gear whose pieces are found and worn, each with its look on the body (assets/game/player/skins) and its\n"
           "// rarity. Written by tools/player/skins/import_set.py from sets.json: don't edit it by hand.\n"
           "export const ROBE_SETS = {\n" + "\n".join(lines) + "\n};\n")
    open(os.path.join(ROOT, "src", "items", "robesets.js"), "w").write(out)


def bring(path):
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        # (Zipped with or without a folder round it.)
        top = next((n[:-len("set.json")] for n in names if n.endswith("set.json") and n.count("/") <= 1), None)
        if top is None:
            raise SystemExit(f"{path}: no set.json in it. Is it a set made by the kit's make_set.py?")
        m = json.loads(z.read(top + "set.json"))
        bad = []
        if m.get("format") != FORMAT:
            bad.append(f"format is {m.get('format')!r}, not {FORMAT!r}")
        sid = m.get("id", "")
        if not sid or any(c not in "abcdefghijklmnopqrstuvwxyz0123456789_" for c in sid) or len(sid) > 32:
            bad.append("id must be 1 to 32 of a-z, 0-9 and _")
        pieces = m.get("pieces", [])
        if not pieces or any(p not in PARTS for p in pieces):
            bad.append(f"pieces must be some of {PARTS}")
        w = m.get("wears", {})
        if "palette" in w and w["palette"] not in PALETTES:
            bad.append(f"wears.palette {w['palette']!r} isn't a robe palette of the game's ({', '.join(PALETTES)})")
        for part, shapes in (w.get("shapes") or {}).items():
            bad += [f"wears.shapes.{part}: {s!r} isn't one of {SHAPES.get(part)}" for s in shapes if s not in SHAPES.get(part, [])]
        picture = next((top + n for n in ("color.png", "color.jpg", "color.webp") if top + n in names), None)
        if not picture:
            bad.append("no color.jpg (or .png, .webp)")
        if bad:
            raise SystemExit(f"{path}: not brought in.\n  - " + "\n  - ".join(bad))
        img = Image.open(io.BytesIO(z.read(picture))).convert("RGB")
        if img.size[0] != img.size[1]:
            raise SystemExit(f"{path}: color is {img.size}, not square")
        if img.size != (SIZE, SIZE):
            img = img.resize((SIZE, SIZE), Image.LANCZOS)
        # What it changes, by the parts: a set that says it has a piece should have painted it, and none should touch skin.
        import glb
        base = np.asarray(glb.load(os.path.join(ROOT, "assets", "game", "player", "wizard.glb"))["color"].resize((SIZE, SIZE)), np.int16)
        part = np.asarray(Image.open(os.path.join(ROOT, "assets", "game", "player", "parts.png"))) // 40
        diff = np.abs(np.asarray(img, np.int16) - base).mean(-1)
        notes = []
        if diff[part == 0].mean() > 6:
            notes.append("its skin isn't the body's own (the game only takes the gear from it, so that's harmless)")
        for i, p in enumerate(PARTS):
            if p in pieces and diff[part == i + 1].mean() < 3:
                notes.append(f"its {p} looks the same as the body's own")
        os.makedirs(SKINS, exist_ok=True)
        img.save(os.path.join(SKINS, sid + ".webp"), quality=90, method=6)
        # Its recipe and pictures, kept to bake it again.
        keep = os.path.join(ART, sid)
        if os.path.isdir(keep):
            shutil.rmtree(keep)
        os.makedirs(keep)
        for n in names:
            if n.startswith(top + "source/") and not n.endswith("/"):
                dest = os.path.join(keep, n[len(top + "source/"):])
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                open(dest, "wb").write(z.read(n))
        if top + "preview.jpg" in names:
            open(os.path.join(keep, "preview.jpg"), "wb").write(z.read(top + "preview.jpg"))
    entry = {"id": sid, "name": m.get("name", sid), "blurb": m.get("blurb", ""), "wears": w, "pieces": pieces}
    data = listing()
    # Its rarity: its own word for it, the end of its id, or what it was before. A set with none dresses plain robes of its palette.
    was = next((s.get("rarity") for s in data["sets"] if s["id"] == sid), None)
    rarity = rarity_of(sid, m.get("rarity"))
    rarity = was if rarity is None else rarity
    if rarity is not None:
        entry["rarity"] = rarity
    data["sets"] = [s for s in data["sets"] if s["id"] != sid] + [entry]
    save(data)
    for_what = f"robes of the {w['palette']} palette" + (f" ({', '.join(f'{k}: {v}' for k, v in w['shapes'].items())})" if w.get("shapes") else "") if w.get("palette") else \
        f"the items {', '.join(w['items'])}" if w.get("items") else "nothing yet: give set.json a wears (a palette, or items), or try it with bm.wear('%s') in the console" % sid
    print(f"{sid}: {entry['name']} ({', '.join(pieces)}), worn for {for_what}. {os.path.getsize(os.path.join(SKINS, sid + '.webp')) // 1024} KB.")
    for n in notes:
        print(f"  note: {n}")


def main():
    sys.path.insert(0, HERE)
    args = sys.argv[1:]
    if not args:
        print(__doc__)
    elif args[0] == "--rarity":
        # --rarity rare id [id ...]: says how rare sets come that don't say so themselves.
        data = listing()
        for s in data["sets"]:
            if s["id"] in args[2:]:
                s["rarity"] = RARITIES.index(args[1])
        save(data)
    elif args[0] == "--list":
        for s in listing()["sets"]:
            print(f"{s['id']:24} {s['name']:28} {json.dumps(s['wears'])}  {', '.join(s['pieces'])}")
    elif args[0] == "--remove":
        data = listing()
        for sid in args[1:]:
            data["sets"] = [s for s in data["sets"] if s["id"] != sid]
            for f in (os.path.join(SKINS, sid + ".webp"),):
                if os.path.isfile(f):
                    os.remove(f)
            shutil.rmtree(os.path.join(ART, sid), ignore_errors=True)
        save(data)
    else:
        import tempfile
        for path in args:
            if not os.path.isdir(path):
                bring(path)
                continue
            # A set already unzipped, or a folder of them: each is zipped as the kit would have, and brought in.
            found = sorted(base for base, _, files in os.walk(path) if "set.json" in files and os.path.basename(base) != "source")
            if not found:
                raise SystemExit(f"{path}: no set.json anywhere in it")
            for folder in found:
                with tempfile.TemporaryDirectory() as tmp:
                    z = os.path.join(tmp, os.path.basename(folder) + ".zip")
                    with zipfile.ZipFile(z, "w", zipfile.ZIP_STORED) as out:
                        for base, _, files in os.walk(folder):
                            for f in files:
                                out.write(os.path.join(base, f), os.path.relpath(os.path.join(base, f), folder))
                    bring(z)


if __name__ == "__main__":
    main()
