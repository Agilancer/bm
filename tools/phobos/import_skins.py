"""Skins for Phobos's people, back from the skin kit (tools/phobos/skin_kit.py, HANDOFF.md there):

    python tools/phobos/import_skins.py skins.zip [more.zip | folder ...] [--replace] [--check] [--force]

Each skin is a folder holding skin.json ({"id": "ph_...", "base": "<body id>", "name": ..., "note": ...}) and color.png
(1024 square, the base body's atlas repainted). For each: the id is checked (ph_, lowercase, new unless --replace), the
base must be a body in assets/game/folk/folk.json, the picture's edges must line up with the base's (a moved
layout can't be mended; --force takes it anyway), the picture is brought to 1024 square RGB, and the gaps between
the atlas's charts are filled from the charts' own edges (the base's old padding would show along every seam). It is
written as assets/game/folk/<id>_c.webp and the swap into folk.json. --check does everything but write.

Then look at it: tools/folk/viewer.html?ids=<base>,<id> (python tools/serve.py), and give it to someone in
src/folk/people.js by `body: '<id>'`. Nothing loads until someone wears it.
"""
import io
import json
import os
import re
import sys
import tempfile
import zipfile

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FOLK = os.path.join(ROOT, "assets", "game", "folk")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skin_kit import raster  # noqa: E402


def folders(path):
    """(name, skin.json text, color.png bytes) for each skin under a zip or a folder."""
    out = []
    if zipfile.is_zipfile(path):
        z = zipfile.ZipFile(path)
        names = z.namelist()
        for n in names:
            if n.endswith("skin.json") and "__MACOSX" not in n:
                d = n[: -len("skin.json")]
                png = next((m for m in names if m.startswith(d) and m[len(d):].lower() in ("color.png", "color.jpg", "color.webp")), None)
                out.append((d, z.read(n).decode("utf8"), z.read(png) if png else None))
    else:
        for dp, _, fs in os.walk(path):
            if "skin.json" in fs:
                png = next((f for f in fs if f.lower() in ("color.png", "color.jpg", "color.webp")), None)
                out.append((dp, open(os.path.join(dp, "skin.json"), encoding="utf8").read(), open(os.path.join(dp, png), "rb").read() if png else None))
    return out


def write_folk(folk):
    secs = []
    for sec in ("models", "swaps"):
        rows = ",\n".join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in folk[sec].items())
        secs.append(f'  "{sec}": {{\n{rows}\n  }}')
    open(os.path.join(FOLK, "folk.json"), "w", encoding="utf-8", newline="\n").write("{\n" + ",\n".join(secs) + "\n}\n")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    replace, check = "--replace" in sys.argv, "--check" in sys.argv
    folk = json.load(open(os.path.join(FOLK, "folk.json")))
    bad = 0
    for src in args:
        for where, js, png in folders(src):
            try:
                s = json.loads(js)
                sid, base = s.get("id", ""), s.get("base", "")
                if not re.fullmatch(r"ph_[a-z0-9_]+", sid):
                    raise ValueError(f"id {sid!r}: must be ph_ and lowercase letters, digits, _")
                if base not in folk["models"]:
                    raise ValueError(f"base {base!r} is not a body in folk.json")
                if (sid in folk["swaps"] or sid in folk["models"]) and not replace:
                    raise ValueError(f"{sid} is taken (--replace to overwrite)")
                if png is None:
                    raise ValueError("no color.png")
                im = Image.open(io.BytesIO(png))
                if im.size[0] != im.size[1]:
                    raise ValueError(f"picture is {im.size}, not square: the layout has been changed")
                if im.mode in ("RGBA", "LA") and np.asarray(im.convert("RGBA"))[..., 3].min() < 250:
                    print(f"  {sid}: has transparency; laid on black")
                a = np.asarray(im.convert("RGB").resize((1024, 1024), Image.LANCZOS))
                _, _, _, _, _, cov = raster(os.path.join(FOLK, folk["models"][base]["glb"]))
                _, (iy, ix) = ndi.distance_transform_edt(~cov, return_indices=True)
                a = a[iy, ix]
                # A rough look at whether the layout held: the base's and the skin's edges should line up.
                b = np.asarray(Image.open(os.path.join(FOLK, folk["models"][base]["c"])).convert("L").resize((1024, 1024))).astype(float)
                g = a.mean(-1)
                ea, eb = ndi.sobel(g), ndi.sobel(b)
                corr = float(np.corrcoef(np.abs(ea[cov]), np.abs(eb[cov]))[0, 1])
                note = s.get("note", "")
                if s.get("name"):
                    note = f"{s['name']}, {note}" if note else s["name"]
                print(f"{sid} < {base}: edges agree with the base's {corr:.2f} (a faithful repaint is about 0.5 or more)")
                if corr < 0.3 and "--force" not in sys.argv:
                    raise ValueError("its edges don't line up with the base's: the layout has moved (--force to take it anyway)")
                if not check:
                    Image.fromarray(a).save(os.path.join(FOLK, sid + "_c.webp"), quality=88, method=4)
                    folk["swaps"][sid] = {"base": base, "c": sid + "_c.webp", "note": "Phobos's crowd: " + note}
            except Exception as e:  # noqa: BLE001
                bad += 1
                print(f"SKIPPED {where}: {e}")
    if not check:
        write_folk(folk)
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
