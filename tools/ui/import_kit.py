"""Brings painted interface art made with the UI kit into the game.

    python tools/ui/import_kit.py path/to/bellmourn_ui_art.zip      what the kit's scripts/check.py zipped
    python tools/ui/import_kit.py path/to/folder                     or a folder of sheets (<sheet id>.png)
    python tools/ui/import_kit.py --list                             what's in the game now, sheet by sheet
    python tools/ui/import_kit.py --remove buttons [more sheet ids]  takes a sheet's pictures back out
    python tools/ui/import_kit.py --recut                            cuts every kept sheet again (after changing pieces.mjs)

Each sheet is one picture (tools/ui/pieces.mjs says what's on it; tools/ui/spec.json is that list as this reads it). A sheet
is cut into its pictures here, by the kit's own cutting code (tools/ui/kit/scripts/uikit.py: nothing from the zip is run),
and written to assets/ui/kit/ as webp, with assets/ui/kit/manifest.json listing what's there: the game puts a painted
picture over its drawn one wherever the manifest names it (src/ui/skin.js), and draws the rest as before. Any part of the
kit can come back, in any order. The sheets themselves are kept in art/ui/sheets/, so they can be cut again.

It writes tools/build/ui_import/<sheet>_contact.png for every sheet brought in: look at each before committing, and check
nothing on it breaks the rule of the two sides (CLAUDE.md): no letters or monograms, none of Velscour's marks or
Tessariel's on the frames and buttons everything shares.
Needs numpy and Pillow."""
import io
import json
import os
import sys
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(HERE, "kit", "scripts"))
import uikit  # noqa: E402

KIT_DIR = os.path.join(ROOT, "assets", "ui", "kit")
KEPT = os.path.join(ROOT, "art", "ui", "sheets")
LOOK = os.path.join(ROOT, "tools", "build", "ui_import")
MANIFEST = os.path.join(KIT_DIR, "manifest.json")
GROUPS = ("pieces", "icons", "spells", "goods")
SUB = {"pieces": "", "icons": "icons/", "spells": "spells/", "goods": "goods/"}
MAX_BYTES = 40 * 1024 * 1024      # a sheet bigger than this isn't one of ours


def spec():
    return uikit.load_spec(os.path.join(HERE, "spec.json"))


def manifest():
    if os.path.isfile(MANIFEST):
        m = json.load(open(MANIFEST, encoding="utf-8"))
    else:
        m = {}
    m.setdefault("version", 1)
    for g in GROUPS:
        m.setdefault(g, {})
    m.setdefault("sheets", {})
    return m


def save_manifest(m):
    os.makedirs(KIT_DIR, exist_ok=True)
    for g in GROUPS:
        m[g] = dict(sorted(m[g].items()))
    m["sheets"] = dict(sorted(m["sheets"].items()))
    json.dump(m, open(MANIFEST, "w", encoding="utf-8"), indent=2)
    open(MANIFEST, "a", encoding="utf-8").write("\n")


def names_of(sheet):
    """[(name, group)] for every picture a sheet holds."""
    if sheet["kind"] == "grid":
        return [(c["name"], c["group"]) for c in sheet["cells"] if c.get("name")]
    if sheet["kind"] == "boxes":
        return [(b["name"], b["group"]) for b in sheet["boxes"]]
    return [(sheet["name"], sheet["group"])]


def sheets_from(path, S):
    """{ sheet id: (picture, extension) } from a zip or a folder. A zip is only ever read: nothing is unpacked from it, and
    only members named for a sheet are looked at."""
    ids = {s["id"] for s in S["sheets"]}
    found = {}
    if os.path.isdir(path):
        for sid in ids:
            f = uikit.find_sheet(path, sid) or uikit.find_sheet(os.path.join(path, "sheets"), sid) or uikit.find_sheet(os.path.join(path, "art"), sid)
            if f:
                found[sid] = (open(f, "rb").read(), os.path.splitext(f)[1].lower())
        return found
    with zipfile.ZipFile(path) as z:
        for info in z.infolist():
            if info.is_dir() or info.file_size > MAX_BYTES:
                continue
            stem, ext = os.path.splitext(os.path.basename(info.filename))
            if ext.lower() in uikit.EXTS and stem.lower() in ids and "__MACOSX" not in info.filename:
                found[stem.lower()] = (z.read(info), ext.lower())
    return found


def remove_sheet(m, sheet):
    for name, group in names_of(sheet):
        f = m[group].pop(name, None)
        if f and os.path.isfile(os.path.join(KIT_DIR, f)):
            os.remove(os.path.join(KIT_DIR, f))
    m["sheets"].pop(sheet["id"], None)
    if sheet["id"] == "app_icon":
        app_icon(None)


def app_icon(im):
    """The home screen's icon: the files a phone asks for, and the manifest's list of them. None takes it back out."""
    web = os.path.join(ROOT, "manifest.webmanifest")
    doc = json.load(open(web, encoding="utf-8"))
    sizes = (192, 512)
    for s in sizes + (180,):
        f = os.path.join(KIT_DIR, f"icon-{s}.png")
        if im is None:
            if os.path.isfile(f):
                os.remove(f)
        else:
            im.convert("RGB").resize((s, s), Image.LANCZOS).save(f)
    doc["icons"] = [] if im is None else [{"src": f"assets/ui/kit/icon-{s}.png", "sizes": f"{s}x{s}", "type": "image/png", "purpose": "any maskable"} for s in sizes]
    json.dump(doc, open(web, "w", encoding="utf-8"), indent=2)
    open(web, "a", encoding="utf-8").write("\n")
    # (and the line an iPhone reads, in the page's head)
    page = os.path.join(ROOT, "index.html")
    html = open(page, encoding="utf-8").read()
    line = '<link rel="apple-touch-icon" href="assets/ui/kit/icon-180.png">\n'
    if im is None:
        html = html.replace(line, "")
    elif line not in html:
        html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '<link rel="manifest" href="manifest.webmanifest">\n' + line)
    open(page, "w", encoding="utf-8").write(html)


def bring(found, S, m, keep=True):
    os.makedirs(LOOK, exist_ok=True)
    bad = 0
    for sheet in S["sheets"]:
        sid = sheet["id"]
        if sid not in found:
            continue
        data, ext = found[sid]
        try:
            im = Image.open(io.BytesIO(data))
            im.load()
        except Exception as e:  # noqa: BLE001
            print(f"  {sid}: can't be read ({e})")
            bad += 1
            continue
        pics, notes = uikit.process_sheet(sheet, im)
        errors = [t for lv, t in notes if lv == "error"]
        for lv, t in notes:
            if lv != "note":
                print(f"  {lv.upper()}: {t}")
        if not pics:
            print(f"  {sid}: nothing usable on it, left out")
            bad += 1
            continue
        remove_sheet(m, sheet)           # (a sheet of the same id is replaced whole)
        for name, group in names_of(sheet):
            if name not in pics:
                continue
            rel = f"{SUB[group]}{name}.webp"
            dest = os.path.join(KIT_DIR, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            if sid == "app_icon":
                app_icon(pics[name])
                rel = "icon-512.png"
            else:
                pics[name].save(dest, "WEBP", quality=92, method=6)
            m[group][name] = rel
        m["sheets"][sid] = {"pictures": len(pics), "missing": [n for n, _ in names_of(sheet) if n not in pics]}
        if keep:
            os.makedirs(KEPT, exist_ok=True)
            for old in os.listdir(KEPT):
                if os.path.splitext(old)[0] == sid:
                    os.remove(os.path.join(KEPT, old))
            open(os.path.join(KEPT, sid + ext), "wb").write(data)
        c = uikit.contact(sheet, pics)
        if c:
            c.save(os.path.join(LOOK, f"{sid}_contact.png"))
        print(f"  {sid}: {len(pics)} picture{'s' if len(pics) != 1 else ''} in{'' if not errors else f', {len(errors)} left out'}")
    return bad


def main(argv):
    S = spec()
    by = {s["id"]: s for s in S["sheets"]}
    m = manifest()
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    if argv[0] == "--list":
        for sheet in S["sheets"]:
            got = m["sheets"].get(sheet["id"])
            miss = f"   missing: {', '.join(got['missing'])}" if got and got.get("missing") else ""
            print(f"[{'x' if got else ' '}] {sheet['id']:<18} priority {sheet['priority']}   {sheet['title']}{miss}")
        print(f"\n{len(m['sheets'])} of {len(S['sheets'])} sheets are in the game.")
        return 0
    if argv[0] == "--remove":
        for sid in argv[1:]:
            if sid not in by:
                print(f"no sheet called {sid}")
                continue
            remove_sheet(m, by[sid])
            for old in os.listdir(KEPT) if os.path.isdir(KEPT) else []:
                if os.path.splitext(old)[0] == sid:
                    os.remove(os.path.join(KEPT, old))
            print(f"{sid}: taken out")
        save_manifest(m)
        return 0
    if argv[0] == "--recut":
        found = sheets_from(KEPT, S) if os.path.isdir(KEPT) else {}
        bad = bring(found, S, m, keep=False)
        save_manifest(m)
        return 1 if bad else 0
    bad = 0
    for path in argv:
        if not os.path.exists(path):
            print(f"{path}: not there")
            bad += 1
            continue
        found = sheets_from(path, S)
        print(f"{path}: {len(found)} sheet{'s' if len(found) != 1 else ''}")
        if not found:
            print("  no sheets in it: they're named for their ids (python tools/ui/import_kit.py --list)")
            bad += 1
            continue
        bad += bring(found, S, m)
    save_manifest(m)
    print(f"\n{len(m['sheets'])} of {len(S['sheets'])} sheets are in the game. Look at tools/build/ui_import/ before committing.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
