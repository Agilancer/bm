"""Bakes sets of gear again from what's kept of them in art/player/skins/<id>/ (recipe.json and its pictures), after a
recipe or one of its pictures has been changed by hand.

    python tools/player/skins/rebake.py vesperglass_epic [more ids ...]     (--all for every set that has a recipe)
    python tools/player/skins/rebake.py --look out_folder [ids ...]          only renders what's in the game now

Writes assets/game/player/skins/<id>.webp and art/player/skins/<id>/preview.jpg (the set alone, from four sides), and
brings the set's name, blurb and wears in sets.json up to the recipe's. Needs the kit built: tools/build/wizard_skin_kit
(python tools/player/skins/build_kit.py, after node tools/player/skins/pose.mjs tools/build/player_posed.f32)."""
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
KIT = os.path.join(ROOT, "tools", "build", "wizard_skin_kit")
SKINS = os.path.join(ROOT, "assets", "game", "player", "skins")
ART = os.path.join(ROOT, "art", "player", "skins")
sys.path.insert(0, os.path.join(KIT, "scripts"))


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    if not os.path.isdir(KIT):
        raise SystemExit("the kit isn't built: see the top of this file")
    import make_set
    import wizardskin as W
    T = W.Template()
    look = None
    if args[0] == "--look":
        look, args = args[1], args[2:]
        os.makedirs(look, exist_ok=True)
    listing = json.load(open(os.path.join(SKINS, "sets.json")))
    before = json.dumps(listing)
    ids = [s["id"] for s in listing["sets"] if os.path.isfile(os.path.join(ART, s["id"], "recipe.json"))] if (not args or args[0] == "--all") else args
    for sid in ids:
        if look:
            colour = np.asarray(Image.open(os.path.join(SKINS, sid + ".webp")).convert("RGB"), np.float32) / 255
            W.preview(T, colour, before=False).save(os.path.join(look, sid + ".jpg"), quality=88)
            continue
        folder = os.path.join(ART, sid)
        recipe = json.load(open(os.path.join(folder, "recipe.json")))
        bad = W.check(recipe) + [f"{f}: no such picture" for f in make_set.files_of(recipe) if not os.path.isfile(os.path.join(folder, f))]
        if recipe.get("id") != sid:
            bad.append(f"its id is {recipe.get('id')!r}")
        if bad:
            raise SystemExit(f"{sid}: not baked.\n  - " + "\n  - ".join(bad))
        colour, done = W.bake(recipe, T, folder)
        skin = T.parts == 0
        colour[skin] = T.base[skin]
        # (A set held out of the game, import_set.py --hold, is baked for its preview only.)
        if any(e["id"] == sid for e in listing["sets"]):
            Image.fromarray((colour * 255 + 0.5).astype(np.uint8)).save(os.path.join(SKINS, sid + ".webp"), quality=90, method=4)
        W.preview(T, colour, before=False).save(os.path.join(folder, "preview.jpg"), quality=88)
        for s in listing["sets"]:
            if s["id"] == sid:
                s.update(name=recipe["name"], blurb=recipe.get("blurb", ""), wears=recipe.get("wears", {}), pieces=done)
        print(f"{sid}: baked ({', '.join(done)})")
    if not look and json.dumps(listing) != before:
        sys.path.insert(0, HERE)
        import import_set
        import_set.save(listing)


if __name__ == "__main__":
    main()
