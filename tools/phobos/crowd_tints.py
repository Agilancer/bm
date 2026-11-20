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
import re
import os
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "assets", "game", "folk")
sys.path.insert(0, os.path.join(ROOT, "tools", "folk"))
import manifest  # noqa: E402  (folk.json, one line a body, as the folk tools write it)
PER = 4   # (src/folk/people.js SWAPS_PER)
WEAR_HATS = False
# The shader's sixteen dyes (src/gfx/materials.js DYES), by name, none of them blue: madder, rust, russet, fox, ochre, mustard,
# straw-yellow, olive, moss, green, bottle, plum, wine, claret, crimson, oxblood.
DYES = 16
# Headwear (src/folk/hats.js HATS_OF, HEADGEAR): who'd wear what, and who has something on already.
HATS_OF = {"m": ["flatcap", "widebrim", "tallhat", "knitcap", "hood", "straw"], "f": ["coif", "kerchief", "hood", "straw", "knitcap"]}
HEADGEAR = {"acolyte", "baker", "beggarwoman", "cutpurse", "dyer", "ferryman", "fiddler", "fishwife", "gravedigger", "graverobber",
            "grinder", "ladysmaid", "lamplighter", "mourner", "netmender", "peddler", "pieseller", "plaguedoctor", "ragwoman", "sweep",
            "tollkeeper", "urchingirl", "washerwoman", "watchman", "bargewoman", "moneylender", "noblewoman", "hedgewitch"}
# Whose own head stays: their hair or their hood or veil hangs down their backs on the neck and the spine, and would be left
# there under another's head (the gravedigger's long grey hair under a bald one). The rest, cap or hat or no, take another's:
# a cap's on the head, and goes with it.
KEEP_HEAD = {"gravedigger", "hedgewitch", "plaguedoctor", "mourner", "acolyte", "noblewoman", "ragwoman", "beggarwoman", "graverobber",
             "sweep", "urchingirl"}
WOMEN = {"fishwife", "tanner", "ragwoman", "apothecary"}


def h32(s):
    """A steady hash of a name (FNV-1a), so the same swap's always dressed the same."""
    h = 2166136261
    for ch in s.encode():
        h = ((h ^ ch) * 16777619) & 0xFFFFFFFF
    return h


GEAR_WORDS = r"\b(hat|cap|hood|hooded|kerchief|helmet|coif|veil|wimple|bonnet|hairnet|net|headscarf|cowl|turban|skullcap|circlet|goggles|tied cloth|mantilla)\b"
# (Not "old" alone: "about nine years old" is a child.)
OLD_WORDS = r"\b(elderly|old (?:man|woman|soldier|lady)|grey|gray|white hair|white-haired|silver|sixty|seventy|eighty|wrinkled)\b"


def heads_offered(res, doc):
    """Who'll lend a head: the city's grown, bare-headed people (a hood or a helmet would come off in pieces), with a face
    read (tools/folk/skin_tones.json), by sex, and whether they're old."""
    import re
    tones = json.load(open(os.path.join(ROOT, "tools", "folk", "skin_tones.json")))
    out = []
    for k, v in res.items():
        if v.get("area") == "castle" or k not in doc["models"] or k not in tones or v.get("height", 1.7) < 1.55:
            continue
        if k in HEADGEAR or re.search(GEAR_WORDS, v["prompt"], re.I):
            continue
        sex = v.get("sex") or ("f" if k in WOMEN else "m")
        out.append({"k": k, "sex": sex, "tone": sum(tones[k]) / 3, "old": bool(re.search(OLD_WORDS, v["prompt"], re.I))})
    return out, tones


def ages():
    """Each swap's age, by its body (src/folk/people.js): what hair it may have. Its prompt's words won't say: a grey
    neckerchief isn't grey hair."""
    import subprocess
    js = "import('./src/folk/people.js').then((m) => console.log(JSON.stringify(Object.fromEntries(m.FOLK.map((p) => [p.body, p.age])))))"
    return json.loads(subprocess.run(["node", "-e", js], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def main():
    res = json.load(open(os.path.join(ROOT, "tools", "phobos", "residents.json")))["people"]
    # (Not the fifty-five who came in the swaps' places, nor the castle's: they've none. tools/phobos/crowd_roster2.json.)
    newer = {p["body"] for p in json.load(open(os.path.join(ROOT, "tools", "phobos", "crowd_roster2.json")))["people"]}
    newer |= {k for k in res if k.endswith("_b")}
    count, hatted, heads = [0], [0], [0]

    global AGE
    AGE = ages()

    def change(doc):
        offered, tones = heads_offered(res, doc)
        for body, v in res.items():
            if body in newer:
                for k in range(1, 6): doc["swaps"].pop(f"{body}_s{k}", None)
                continue
            if v.get("area") == "castle" or body not in doc["models"]:
                continue
            sex = v.get("sex") or ("f" if body in WOMEN else "m")
            h = h32(body)
            used = set()
            for k in range(1, PER + 1):
                # The four of a body: dark dyes a quarter of the way round from each other, light dyes set against them, one
                # strongly dyed and one faded, worn darker and lighter.
                d = (h + k * 4) % DYES
                l = (d + 5 + (h >> 8) % 6) % DYES
                a = (k + (h >> 4)) % 4
                val = [5, 8, 9, 7][(k + (h >> 12)) % 4]
                sw = {"base": body, "dye": [d, l, a, val]}
                # Another's head (src/folk/headswap.js): every one of a body's, if it's bare-headed itself (or a
                # hood would be left on its shoulders), from someone of its sex whose skin's near enough its own, a
                # different one for each; and their hair, sometimes, another colour fit for their years.
                donor = None
                if body not in KEEP_HEAD and body in tones and v.get("height", 1.7) >= 1.6:
                    mine = sum(tones[body]) / 3
                    fits = [o for o in offered if o["sex"] == sex and o["k"] != body and abs(o["tone"] - mine) < 0.3 * mine and o["k"] not in used]
                    if fits:
                        donor = fits[h32(f"{body}^{k}") % len(fits)]
                        sw["head"] = donor["k"]; used.add(donor["k"]); heads[0] += 1
                old = AGE.get(f"{body}_s{k}", 30) >= 55
                tones_ok = [6, 7] if old else [1, 2, 3, 4, 5]
                if h32(f"{body}~{k}") % 3:
                    sw["dye"].append(tones_ok[h32(f"{body}*{k}") % len(tones_ok)])
                # (No hats: made of simple shapes, they looked it next to the Meshy-made, a lumpy cap, a coif standing
                # off the head, a brim through a face. The owner's eye, 2026-11-20. tools/folk/hats.py keeps them, unused.)
                if WEAR_HATS and body not in HEADGEAR and (h32(f"{body}{k}") % 10) < 7:
                    opts = HATS_OF[sex]
                    sw["hat"] = opts[(h32(f"{body}:{k}") >> 3) % len(opts)]
                    hatted[0] += 1
                doc["swaps"][f"{body}_s{k}"] = sw
                count[0] += 1
            doc["swaps"].pop(f"{body}_s5", None)
    manifest.update(OUT, change)
    print(count[0], "swaps,", hatted[0], "with a hat,", heads[0], "with another's head")

if __name__ == "__main__":
    main()
