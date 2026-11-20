"""Phobos's palette swaps: five of each of the city's Meshy-made people (src/folk/people.js swapsOf), the same body in other
clothes, recoloured in the shader rather than painted (src/gfx/folk.js swapCode, src/gfx/materials.js ARMOR): no texture
of their own, so two hundred and sixty of them cost the GPU nothing but their bodies' bones.

    python tools/phobos/crowd_tints.py

Writes each swap into assets/game/folk/folk.json swaps as { base, dye: [dark cloth's dye, light cloth's, strength, how
dark], hat }: its cloth dyed out of the colours it was made in (greys and blacks too), dark and light each its own of
sixteen dyes with no blue among them (src/gfx/materials.js), and, unless its body has something on its head already, most
of them a hat, a hood, a coif or a kerchief (tools/folk/hats.py, src/folk/hats.js). The four of a body are a quarter of
the dyes apart, so no two look alike across a street.
"""
import json
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "assets", "game", "folk")
sys.path.insert(0, os.path.join(ROOT, "tools", "folk"))
import manifest  # noqa: E402  (folk.json, one line a body, as the folk tools write it)
PER = 4   # (src/folk/people.js SWAPS_PER)
# The shader's sixteen dyes (src/gfx/materials.js DYES), by name, none of them blue: madder, rust, russet, fox, ochre, mustard,
# straw-yellow, olive, moss, green, bottle, plum, wine, claret, crimson, oxblood.
DYES = 16
# Headwear (src/folk/hats.js HATS_OF, HEADGEAR): who'd wear what, and who has something on already.
HATS_OF = {"m": ["flatcap", "widebrim", "tallhat", "knitcap", "hood", "straw"], "f": ["coif", "kerchief", "hood", "straw", "knitcap"]}
HEADGEAR = {"acolyte", "baker", "beggarwoman", "cutpurse", "dyer", "ferryman", "fiddler", "fishwife", "gravedigger", "graverobber",
            "grinder", "ladysmaid", "lamplighter", "mourner", "netmender", "peddler", "pieseller", "plaguedoctor", "ragwoman", "sweep",
            "tollkeeper", "urchingirl", "washerwoman", "watchman", "bargewoman", "moneylender", "noblewoman", "hedgewitch"}
WOMEN = {"fishwife", "tanner", "ragwoman", "apothecary"}


def h32(s):
    """A steady hash of a name (FNV-1a), so the same swap's always dressed the same."""
    h = 2166136261
    for ch in s.encode():
        h = ((h ^ ch) * 16777619) & 0xFFFFFFFF
    return h


def main():
    res = json.load(open(os.path.join(ROOT, "tools", "phobos", "residents.json")))["people"]
    # (Not the fifty-five who came in the swaps' places, nor the castle's: they've none. tools/phobos/crowd_roster2.json.)
    newer = {p["body"] for p in json.load(open(os.path.join(ROOT, "tools", "phobos", "crowd_roster2.json")))["people"]}
    newer |= {k for k in res if k.endswith("_b")}
    count, hatted = [0], [0]

    def change(doc):
        for body, v in res.items():
            if body in newer:
                for k in range(1, 6): doc["swaps"].pop(f"{body}_s{k}", None)
                continue
            if v.get("area") == "castle" or body not in doc["models"]:
                continue
            sex = v.get("sex") or ("f" if body in WOMEN else "m")
            h = h32(body)
            for k in range(1, PER + 1):
                # The four of a body: dark dyes a quarter of the way round from each other, light dyes set against them, one
                # strongly dyed and one faded, worn darker and lighter.
                d = (h + k * 4) % DYES
                l = (d + 5 + (h >> 8) % 6) % DYES
                a = (k + (h >> 4)) % 4
                val = [5, 8, 9, 7][(k + (h >> 12)) % 4]
                sw = {"base": body, "dye": [d, l, a, val]}
                if body not in HEADGEAR and (h32(f"{body}{k}") % 10) < 7:
                    opts = HATS_OF[sex]
                    sw["hat"] = opts[(h32(f"{body}:{k}") >> 3) % len(opts)]
                    hatted[0] += 1
                doc["swaps"][f"{body}_s{k}"] = sw
                count[0] += 1
            doc["swaps"].pop(f"{body}_s5", None)
    manifest.update(OUT, change)
    print(count[0], "swaps,", hatted[0], "with a hat")

if __name__ == "__main__":
    main()
