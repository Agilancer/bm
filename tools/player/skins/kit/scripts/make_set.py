"""Bakes one set of gear from its recipe, and zips it up ready to go back into the game.

    python scripts/make_set.py recipes/my_set.json            ->  out/my_set.zip  (and out/my_set/ to look at)
    python scripts/make_set.py recipes/*.json                  several at once

The zip holds: set.json (what it is and what wears it), color.jpg (his whole colour map with this set's parts painted),
preview.jpg (before above, after below, from four sides), and source/ (the recipe and its pictures, so it can be made again).
Look at the preview before you hand the zip over."""
import datetime
import json
import os
import shutil
import sys
import zipfile

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wizardskin as W  # noqa: E402


def files_of(recipe):
    """Every picture a recipe names."""
    out = []
    looks = [recipe.get("defaults", {})] + list(recipe.get("parts", {}).values())
    for part in looks:
        for key in W.MATERIALS:
            v = part.get(key)
            if isinstance(v, dict) and v.get("swatch"):
                out.append(v["swatch"])
        if part.get("pattern"):
            out.append(part["pattern"]["image"])
        if part.get("skin"):
            out.append(part["skin"])
        for d in part.get("decals", []):
            out.append(d["image"])
    return sorted(set(out))


def make(path, T, out_root):
    if not os.path.isfile(path):
        print(f"{path}: no such recipe.")
        return None
    try:
        recipe = json.load(open(path))
    except ValueError as e:
        print(f"{path}: not valid JSON ({e}).")
        return None
    folder = os.path.dirname(os.path.dirname(os.path.abspath(path))) if os.path.basename(os.path.dirname(os.path.abspath(path))) == "recipes" else os.path.dirname(os.path.abspath(path))
    bad = W.check(recipe)
    for f in files_of(recipe):
        if not os.path.isfile(os.path.join(folder, f)):
            bad.append(f"{f}: no such picture (paths are from the kit's top folder)")
    for part in recipe.get("parts", {}).values():
        for d in part.get("decals", []):
            if d.get("anchor") not in T.anchors:
                bad.append(f"decal anchor {d.get('anchor')}: not one of {', '.join(T.anchors)}")
    if bad:
        print(f"{path}: not made.")
        for b in bad:
            print("  -", b)
        return None
    colour, done = W.bake(recipe, T, folder)
    # Nothing but gear may change: his skin, hair and eyes are as they were.
    skin = T.parts == 0
    if np.abs(colour[skin] - T.base[skin]).max() > 1e-6:
        raise SystemExit("the bake touched skin: that's a fault in the kit, not in the recipe")
    sid = recipe["id"]
    out = os.path.join(out_root, sid)
    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(os.path.join(out, "source"))
    Image.fromarray((colour * 255 + 0.5).astype(np.uint8)).save(os.path.join(out, "color.jpg"), quality=93, subsampling=0)
    W.preview(T, colour).save(os.path.join(out, "preview.jpg"), quality=90)
    manifest = {
        "format": W.FORMAT, "id": sid, "name": recipe["name"], "blurb": recipe.get("blurb", ""),
        "wears": recipe.get("wears", {}), "pieces": done, "size": T.size, "made": datetime.date.today().isoformat(),
    }
    json.dump(manifest, open(os.path.join(out, "set.json"), "w"), indent=1)
    json.dump(recipe, open(os.path.join(out, "source", "recipe.json"), "w"), indent=1)
    for f in files_of(recipe):
        os.makedirs(os.path.dirname(os.path.join(out, "source", f)), exist_ok=True)
        shutil.copy(os.path.join(folder, f), os.path.join(out, "source", f))
    zpath = os.path.join(out_root, sid + ".zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(out):
            for f in sorted(files):
                full = os.path.join(base, f)
                z.write(full, os.path.relpath(full, out))
    print(f"{zpath}: {recipe['name']} ({', '.join(done)}), {os.path.getsize(zpath) / 1e6:.1f} MB. Preview: {os.path.join(out, 'preview.jpg')}")
    return zpath


def main():
    paths = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not paths:
        print(__doc__)
        return
    T = W.Template()
    out_root = os.path.join(W.KIT, "out")
    os.makedirs(out_root, exist_ok=True)
    made = [make(p, T, out_root) for p in paths]
    if None in made:
        sys.exit(1)


if __name__ == "__main__":
    main()
