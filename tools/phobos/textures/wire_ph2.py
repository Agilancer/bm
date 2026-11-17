"""The PH2 pack (assets/phobos/textures: 100 paintings in five batches, asked for in tools/phobos/texture_requests/
request_list.py) as a second texture array of the game's, beside the static one (which is full: its per-layer table holds 64).

    python tools/phobos/textures/wire_ph2.py

For each painting, in the request list's order (so layer 200 + i is the i-th, and src/gfx/renderer.js and the shader
know it as p2_<id>):
  - a tile that shows a seam across its wrap (the batch's check_report.json, over 1.6) is cut to a span that repeats on
    that axis (seamless.py wrap_x: a cut, not a fade), and how far one repeat goes shrinks with it;
  - a strip is made to repeat across only; a single, a mask or a decal is laid once, not repeated;
  - a mask or decal (white on black) becomes a cut-out: its whiteness the alpha, its colour what it is (soot, blood, rust,
    cobweb...); banners and the stained glass lose the ground round their shape (flood from the corners);
  - all squeezed to one square (768 colour, 384 relief: build_sets.detail's normal, roughness and height), the metres one
    repeat covers kept as [across, up, a floor's other way].
Writes assets/game/tex/p2/<name>_c.webp and _d.webp, the manifest's "ph2" section, and src/core/phobos-p2.js (the metres,
read by src/core/sites.js tileOf). Safe to run again.
"""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "texture_requests"))
from seamless import wrap_x, scores, LUM   # noqa: E402
from build_sets import detail              # noqa: E402
from request_list import BATCHES          # noqa: E402

SRC = os.path.join(ROOT, "assets", "phobos", "textures")
OUT = os.path.join(ROOT, "assets", "game", "tex", "p2")
SIZE, DET = 768, 384
SEAM = 1.6
# (Too regular to cut short: a 4 by 4 checker cut anywhere but at its squares isn't a checker.)
NOWRAP = {"bone_checker"}

# What each is, for its relief and how the shader treats it (renderer.js: parallax by kind; glass and lit glass shine).
KIND = {
    "iron": "metal", "rust_iron": "metal", "boards": "wood", "char_timber": "wood", "panelling": "wood", "roof": "roof",
    "leather": "cloth", "red_damask": "cloth", "plum_damask": "cloth", "grey_plaster": "plaster", "sewer_brick": "brick",
    "soot_brick": "brick", "wet_grit": "stone",
}
OWN = {
    "moat_water": "wet", "door_iron": "wood", "door_poor": "wood", "door_rich": "wood", "shutters": "wood",
    "leaded_glass": "glass", "leaded_lit": "lit", "demon_glass": "stained", "railing_mask": "metal", "book_spines": "wood",
    "jar_shelves": "wood", "lead_roof": "metal", "verdigris_roof": "metal", "bronze_plates": "metal", "shingle_roof": "roof",
    "basalt_columns": "stone", "granite_cliff": "stone", "straw_ground": "cloth", "street_litter": "stone", "moss_patches": "cloth",
    "lichen_spots": "stone", "bones_ground": "stone", "chain_strip": "metal",
}
# (Relief class for build_sets.detail.)
CLS = {"stone": "stone", "brick": "brick", "plaster": "plaster", "wood": "wood", "cloth": "cloth", "wet": "wet", "metal": "metal",
       "roof": "stone", "glass": "metal", "lit": "metal", "stained": "metal", "decal": "cloth"}
# The masks' and decals' own colours (linear-ish sRGB 0-1), what their white becomes. Their grey is kept as shading in it.
INK = {
    "soot_streaks": (0.05, 0.045, 0.04), "damp_rise": (0.09, 0.1, 0.07), "blood_splashes": (0.24, 0.02, 0.02),
    "rust_streaks": (0.36, 0.16, 0.06), "cracks": (0.05, 0.045, 0.045), "grime_noise": (0.1, 0.09, 0.075),
    "ash_dust": (0.5, 0.48, 0.45), "cobweb": (0.72, 0.72, 0.7), "gouges": (0.42, 0.36, 0.3), "scorch_mark": (0.03, 0.025, 0.02),
    "puddles": (0.03, 0.04, 0.045), "dead_ivy": (0.3, 0.22, 0.13), "torn_rags": (0.42, 0.38, 0.32), "wax_drips": (0.82, 0.76, 0.6),
    "chain_strip": None, "railing_mask": (0.06, 0.06, 0.065),
}
# Cut out of their ground by a flood from the corners that ground fills: which corners.
FLOOD = {"banner_blood": "bottom", "banner_blue": "bottom", "banner_white": "bottom", "banner_green": "bottom",
         "banner_greygold": "bottom", "war_banner": "bottom", "demon_glass": "top"}


def items():
    out, i = [], 0
    reports = {}
    for b in "12345":
        for e in json.load(open(os.path.join(ROOT, "assets", "phobos", f"batch_0{b}", "check_report.json"))):
            reports[e["id"].split("_", 3)[3]] = e
    files = sorted(os.listdir(SRC))
    for _, _, its in BATCHES:
        for t in its:
            tid, _name, kind, aspect, metres, _where, _pal, ref = t[:8]
            f = files[i]; i += 1
            assert tid in f, (tid, f)
            k = OWN.get(tid) or KIND.get(ref) or ("decal" if kind in ("mask", "decal") else "stone" if kind in ("tile", "strip") else "cloth")
            if tid in INK:
                k = "decal" if tid not in ("chain_strip", "railing_mask") else k
            out.append(dict(id=tid, file=f, kind=kind, look=k, m=metres, rep=reports.get(tid, {})))
    # His banner, made from the skull field (banner_white) dyed oxblood: the pack's own red banners have a crown of thorns
    # on the skull (the V/T rule), and the game's blood tint left it salmon. (Its cut-out: the white one's, FLOOD.)
    w = next(o for o in out if o["id"] == "banner_white")
    out.append(dict(w, id="banner_skull", dye=(0.62, 0.05, 0.045)))
    return out


def flood_alpha(a, where, tol=0.11):
    """Alpha 0 over the ground round a shape: what's near the corner's colour and joined to that corner."""
    h, w = a.shape[:2]
    corners = [(h - 3, 2), (h - 3, w - 3)] if where == "bottom" else [(2, 2), (2, w - 3)]
    alpha = np.ones((h, w), np.float32)
    for (y, x) in corners:
        c = a[max(y - 2, 0):y + 3, max(x - 2, 0):x + 3].reshape(-1, 3).mean(0)
        near = np.sqrt(((a - c) ** 2).sum(-1)) < tol
        lab, _ = ndimage.label(near)
        if lab[y, x]:
            alpha[lab == lab[y, x]] = 0
    # (A pixel's worth of soft edge, and the ground's colour under it taken from the cloth, so no dark rim at a distance.)
    alpha = ndimage.binary_opening(alpha > 0.5, iterations=1).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, 0.8)
    return alpha


def bleed(rgb, alpha):
    """What's under the cut-away keeps the nearest kept colour, so the mips don't pull a dark halo in."""
    keep = alpha > 0.5
    if keep.all() or not keep.any():
        return rgb
    _, (iy, ix) = ndimage.distance_transform_edt(~keep, return_indices=True)
    return rgb[iy, ix]


def one(it):
    im = Image.open(os.path.join(SRC, it["file"])).convert("RGB")
    a = np.asarray(im, np.float32) / 255
    h, w = a.shape[:2]
    across, up = it["m"], it["m"] * h / w
    alpha = None
    note = ""
    if it["kind"] in ("tile", "strip") and it["id"] not in NOWRAP:
        rep = it["rep"]
        small = lambda arr: np.asarray(Image.fromarray((np.clip(arr @ LUM, 0, 1) * 255).astype(np.uint8)).resize((arr.shape[1] // 4, arr.shape[0] // 4), Image.BILINEAR), np.float32) / 255
        if (rep.get("seam_x") or 0) > SEAM:
            w0 = a.shape[1]; a = wrap_x(a, small(a)); across *= a.shape[1] / w0; note += f" x{a.shape[1] / w0:.2f}"
        if it["kind"] == "tile" and (rep.get("seam_y") or 0) > SEAM:
            a = np.swapaxes(a, 0, 1); h0 = a.shape[1]; a = wrap_x(a, small(a)); up *= a.shape[1] / h0; a = np.swapaxes(a, 0, 1); note += f" y{a.shape[0] / h0:.2f}"
    if it["id"] in INK:
        lum = a @ LUM
        hi = float(np.percentile(lum, 99.5)) or 1.0
        v = np.clip(lum / hi, 0, 1)
        alpha = np.clip((v - 0.12) / 0.5, 0, 1)
        ink = INK[it["id"]]
        shade = 0.55 + 0.45 * v
        rgb = (a * 0.9 if ink is None else np.array(ink, np.float32)[None, None, :] * shade[..., None] * 1.6)
        a = np.clip(rgb, 0, 1)
    elif it["id"] in FLOOD or it.get("dye"):
        alpha = flood_alpha(a, FLOOD["banner_white" if it.get("dye") else it["id"]])
        if it.get("dye"):
            lum = np.clip(a @ LUM, 0, 1)
            a = np.clip((lum ** 1.15)[..., None] * np.array(it["dye"], np.float32)[None, None, :] * 1.3, 0, 1)
    if alpha is not None:
        # (Nothing at the very edge: a single's painting is laid once, and the sampler repeats.)
        alpha[:2, :] = 0; alpha[-2:, :] = 0; alpha[:, :2] = 0; alpha[:, -2:] = 0
        a = bleed(a, alpha)
    rgb8 = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").resize((SIZE, SIZE), Image.LANCZOS)
    name = "p2_" + it["id"]
    if alpha is not None:
        al = Image.fromarray((alpha * 255 + 0.5).astype(np.uint8), "L").resize((SIZE, SIZE), Image.LANCZOS)
        col = rgb8.copy(); col.putalpha(al)
        col.save(os.path.join(OUT, name + "_c.webp"), quality=86, method=5, alpha_quality=90, exact=True)
    else:
        rgb8.save(os.path.join(OUT, name + "_c.webp"), quality=86, method=5)
    d = detail(rgb8, CLS[it["look"]], "dark").resize((DET, DET), Image.LANCZOS)
    d.save(os.path.join(OUT, name + "_d.webp"), quality=70, method=5, alpha_quality=80, exact=True)
    s = scores(np.asarray(rgb8, np.float32) / 255)[0] if it["kind"] == "tile" else None
    return name, {"cutout": alpha is not None, "kind": it["look"], "repeat": it["kind"] in ("tile", "strip"),
                  "m": [round(across, 2), round(up, 2), round(up, 2)], "seam": None if s is None else round(s, 2), "note": note.strip()}


def main():
    os.makedirs(OUT, exist_ok=True)
    its = items()
    with ProcessPoolExecutor(8) as ex:
        res = list(ex.map(one, its))
    path = os.path.join(ROOT, "assets", "game", "tex", "manifest.json")
    man = json.load(open(path))
    man["ph2"] = {"size": [SIZE, SIZE], "detail": [DET, DET], "dir": "p2/",
                  "layers": [{"name": n, "kind": r["kind"], "cutout": r["cutout"]} for n, r in res]}
    json.dump(man, open(path, "w"), indent=1)
    # (Big walls want big stones: the castle's and the Keep's courses about 0.7 m, its cones' scales seen from the city.
    # The critics, round 1: at the asked-for metres the castle's towers looked toys and its stone crawled.)
    big = {"p2_curtain_granite": 6.0, "p2_keep_basalt": 6.0, "p2_fishscale_slate": 4.0, "p2_bridge_ashlar": 4.0}
    tiles = {n: ([big[n]] * 3 if n in big else r["m"]) for n, r in res}
    js = ("// Made by tools/phobos/textures/wire_ph2.py. Not edited by hand. The PH2 pack, the game's second array (layers 200 on):\n"
          "// metres one repeat of each covers, [across, up, a floor's other way] (src/core/sites.js tileOf); a single, a\n"
          "// mask or a decal is laid once over that much.\nexport const P2_TILE = {\n"
          + ",\n".join(f" {json.dumps(n)}: {json.dumps(m)}" for n, m in tiles.items()) + "\n};\n")
    open(os.path.join(ROOT, "src", "core", "phobos-p2.js"), "w", encoding="utf-8", newline="\n").write(js)
    for n, r in res:
        if r["note"] or (r["seam"] and r["seam"] > SEAM) or r["cutout"]:
            print(n.ljust(26), r["kind"].ljust(8), r["m"], "seam", r["seam"], r["note"], "cut" if r["cutout"] else "")
    print(len(res), "layers")


if __name__ == "__main__":
    main()
