"""Phobos's street crowd in the townsfolk's own bodies, recoloured so none of them wears a Bellmourn face's clothes: clothes
and hair moved in hue and dulled and darkened (a city of soot and rain), skin (by its colour) left as it is. As
tools/folk/posted_swaps.py did for the people posted out in the land.

    python tools/phobos/crowd_swaps.py            (all of them)
    python tools/phobos/crowd_swaps.py ph_cut      (just those named)

Writes assets/game/folk/<id>_c.webp and the swap into assets/game/folk/folk.json (swaps), where src/folk/people.js CROWD
finds them by id. Each is about 100 KB, and 1024 square on the GPU. (Who wears which: src/folk/people.js CROWD.)
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
D = os.path.join(ROOT, "assets", "game", "folk")
# id: (base, hue shift (turns), saturation scale, value scale, note)
S = {
    "ph_cut": ("worker", 0.62, 0.45, 0.62, "a cutpurse: soot-grey hood, slate jerkin"),
    "ph_sword": ("wes", 0.97, 0.8, 0.7, "a sellsword: oxblood leathers gone brown"),
    "ph_drunk": ("elder", 0.12, 0.55, 0.75, "a drunk: mustard coat stained dark"),
    "ph_beggar": ("old_man", 0.0, 0.2, 0.62, "a beggar: rags with the colour gone out of them"),
    "ph_dicer": ("dude", 0.75, 0.7, 0.72, "a dicer: plum doublet, dirty"),
    "ph_fence": ("sage", 0.42, 0.55, 0.6, "a fence: bottle-green robe, greasy"),
    "ph_delver": ("worker_2", 0.08, 0.85, 0.8, "a delver: tan leathers, rust kerchief"),
    "ph_hunter": ("smith", 0.5, 0.35, 0.55, "a demon hunter: charcoal and iron"),
    "ph_crone": ("crone", 0.83, 0.6, 0.7, "a fortune-teller: faded violet shawl"),
    "ph_doxy": ("young_5", 0.92, 0.75, 0.78, "a tavern girl: wine-red bodice"),
    "ph_rat": ("worker_f", 0.25, 0.45, 0.62, "a rat-catcher: moss and mud"),
    "ph_urchin": ("boy_3", 0.05, 0.3, 0.6, "an urchin: brown rags"),
    "ph_bravo": ("dude", 0.02, 0.5, 0.5, "a bravo: rust and soot"),
    "ph_knuckle": ("youth_red", 0.35, 0.5, 0.6, "a ruffian: the noble's cut gone mouldy green"),
    "ph_lark": ("young_1", 0.7, 0.6, 0.7, "a delver: dusk-blue jerkin"),
    "ph_brute": ("worker", 0.1, 0.65, 0.5, "a hired brute: dun leather"),
    "ph_glass": ("young_3", 0.95, 0.6, 0.7, "a tavern girl: madder skirt"),
    "ph_tib": ("girl_3", 0.55, 0.4, 0.6, "a street girl: faded teal rags"),
    # The three hubs' givers (src/folk/people.js HUBFOLK).
    "ph_penny": ("dude", 0.3, 0.4, 0.55, "the Pennyless' purse: a good coat gone soot-green"),
    "ph_watch": ("young_3", 0.1, 0.35, 0.72, "the Quiet Watch's captain: a dyer's plain oat and umber"),
    "ph_ash": ("worker_f", 0.0, 0.12, 0.45, "the Ashwardens' warden: ash-grey, nothing bright"),
}


def rgb2hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn; m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)); h = np.where(m, (h / 6) % 1, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    return h, s, mx


def hsv2rgb(h, s, v):
    i = np.floor(h * 6).astype(int) % 6; f = h * 6 - np.floor(h * 6); p = v * (1 - s); q = v * (1 - f * s); t = v * (1 - (1 - f) * s)
    return np.stack([np.choose(i, [v, q, p, p, t, v]), np.choose(i, [t, v, v, q, p, p]), np.choose(i, [p, p, t, v, v, q])], -1)


def main():
    path = os.path.join(D, "folk.json")
    folk = json.load(open(path))
    only = sys.argv[1:]
    for k, (base, dh, ss, vs, note) in S.items():
        if only and k not in only:
            continue
        a = np.asarray(Image.open(os.path.join(D, folk["models"][base]["c"])).convert("RGB")).astype(np.float32) / 255
        h, s, v = rgb2hsv(a)
        # (Skin: an orange-pink hue, middling saturation, light. Kept as it was.)
        hd = np.minimum(np.abs(h - 0.055), 1 - np.abs(h - 0.055))
        skin = np.clip(1 - hd / 0.045, 0, 1) * np.clip((s - 0.16) / 0.1, 0, 1) * np.clip((0.62 - s) / 0.1, 0, 1) * np.clip((v - 0.42) / 0.12, 0, 1)
        skin = np.clip(ndi.gaussian_filter(skin, 2.0) * 1.6, 0, 1)
        out = hsv2rgb((h + dh) % 1, np.clip(s * ss, 0, 1), np.clip(v * vs, 0, 1))
        res = out * (1 - skin[..., None]) + a * skin[..., None]
        Image.fromarray((np.clip(res, 0, 1) * 255).astype(np.uint8)).save(os.path.join(D, k + "_c.webp"), quality=88, method=4)
        folk["swaps"][k] = {"base": base, "c": k + "_c.webp", "note": "Phobos's crowd: " + note}
        print(k, "<", base)
    # (In the file's own style: one line to each model and each swap.)
    secs = []
    for sec in ("models", "swaps"):
        rows = ",\n".join(f'    {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in folk[sec].items())
        secs.append(f'  "{sec}": {{\n{rows}\n  }}')
    open(path, "w", encoding="utf-8", newline="\n").write("{\n" + ",\n".join(secs) + "\n}\n")


if __name__ == "__main__":
    main()
