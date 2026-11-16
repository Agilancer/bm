"""Build the Phobos material sets' tiles and their review sheets.

    python tools/phobos/textures/build_sets.py

For every tile named in tools/phobos/textures/sets.json:
  - its source (src, or whichever of src_any comes out with the least seam) is made seamless at full size
    (seamless.make_tile), with odd stones knocked back (despot) where the tile asks;
  - it is graded to its grade: brought to one mean brightness, its colour thinned and tinted, and its own light and
    dark flattened (contrast under 1: for photographs taken in hard sun, whose shadows would be lit twice);
  - written to assets/game/phobos/tex/ as <tile>_c.webp (colour, 1024) and <tile>_d.webp (512: normal x, normal y,
    roughness, height). Height comes from the picture after a high-pass, the right way up for its mortar (pale
    mortar is still low), with relief and roughness by class (stone, brick, plaster, wood, cloth, wet), not by how
    bright the picture is.
A manifest goes with them. Then one sheet per set, art/phobos/textures/set_<name>.jpg (every part as a wall 8 m by
5 m with a 1.8 m figure), sets_overview.jpg (each set's main wall), and ramp.jpg (the main walls in the order the
player climbs, with their brightness and accent). Fails if a used tile's seam is over 1.6 or its brightness under
0.10. A tile's "joints" paints its joints, cracks and grooves a colour after grading (the Keep's bone-pale joints).
"""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seamless import make_tile, blur, LUM

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "assets", "game", "phobos", "tex")
SHEETS = os.path.join(ROOT, "art", "phobos", "textures")
PX_M = 110   # sheet pixels a metre
CLASS = {"stone": (0.86, 1.0), "brick": (0.82, 0.9), "plaster": (0.9, 0.5), "wood": (0.62, 0.7), "cloth": (0.95, 0.25), "wet": (0.38, 1.0), "metal": (0.45, 0.4)}  # roughness, relief
ORDER = ["marches", "wall", "city_poor", "city_burnt", "city_market", "city_bones", "city_rich", "sewers", "castle", "keep"]


def grade(t, g, joints=None):
    a = np.asarray(t, np.float32) / 255
    if joints:
        # Where the joints, cracks and grooves are: darker than what is round them, at joint width.
        l0 = a @ LUM
        t3 = np.tile(l0, (3, 3)); h, w = l0.shape
        d = blur(t3, 5)[h:2 * h, w:2 * w] - l0
        sd = float(d.std()) + 1e-6
        jm = np.clip((d - 0.9 * sd) / (1.4 * sd), 0, 1)
    lum = a @ LUM
    m = float(lum.mean())
    a = m + (a - m) * g["contrast"]                                  # its own light and dark, flattened
    lum = a @ LUM
    a = lum[..., None] + (a - lum[..., None]) * g["sat"]             # colour thinned
    a = a * np.array(g["tint"], np.float32)
    a = a * (g["value"] / max(float((a @ LUM).mean()), 1e-3))        # one brightness
    if joints:
        k = (jm * joints[3])[..., None]
        a = a * (1 - k) + np.array(joints[:3], np.float32) * k
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def detail(rgb, cls, mortar):
    """(normal x, normal y, roughness, height) from a colour tile, wrapping."""
    rough0, relief = CLASS[cls]
    a = np.asarray(rgb.resize((512, 512), Image.LANCZOS), np.float32) / 255
    lum = a @ LUM
    lum = (lum - lum.mean()) / max(float(lum.std()), 1e-3) * 0.12   # the same strength whatever the grade
    t3 = np.tile(lum, (3, 3)); h, w = lum.shape
    broad = lum - blur(t3, 10)[h:2 * h, w:2 * w]
    fine = lum - blur(t3, 1.6)[h:2 * h, w:2 * w]
    if mortar == "pale":
        broad = -np.abs(broad) * 0.8 + broad * 0.2                   # joints low whichever way they are lit
    height = np.clip(0.5 + (np.clip(broad, -0.4, 0.4) * 1.2 + fine * 0.6) * relief, 0, 1)
    dx = np.roll(height, -1, 1) - np.roll(height, 1, 1); dy = np.roll(height, -1, 0) - np.roll(height, 1, 0)
    n = np.stack([-dx * 2.6, -dy * 2.6, np.ones_like(dx)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    rough = np.clip(rough0 + (0.5 - height) * 0.12, 0.2, 0.98)       # joints a little rougher than faces
    d = np.stack([n[..., 0] * 0.5 + 0.5, n[..., 1] * 0.5 + 0.5, rough, height], -1)
    return Image.fromarray((d * 255 + 0.5).astype(np.uint8), "RGBA")


def one(job):
    name, meta, srcs, g = job
    best = None
    for sid, path in srcs:
        t, s, p, asp = make_tile(Image.open(os.path.join(ROOT, path)), 1024, work=2048, calm_by=meta.get("calm", 0.6), despot_by=meta.get("despot", 0.0))
        if best is None or s < best[1]:
            best = (t, s, p, asp, sid)
    t, s, p, asp, sid = best
    t = grade(t, g, meta.get("joints"))
    t.save(os.path.join(OUT, name + "_c.webp"), quality=84, method=5)
    detail(t, meta["cls"], meta.get("mortar", "dark")).save(os.path.join(OUT, name + "_d.webp"), quality=62, method=5, alpha_quality=72, exact=True)
    return name, {"m": [meta["m"], round(meta["m"] / asp, 2)], "lay": meta["lay"], "cls": meta["cls"], "grade": meta["grade"], "seam": round(s, 2), "patch": round(p, 3),
                  "value": round(float((np.asarray(t, np.float32) / 255 @ LUM).mean()), 3), "source": sid, **({"placeholder": True} if meta.get("placeholder") else {})}


def wall(tid, man, wm=8, hm=5):
    t = Image.open(os.path.join(OUT, tid + "_c.webp")).convert("RGB")
    mw, mh = man[tid]["m"]
    t = t.resize((max(int(mw * PX_M), 8), max(int(mh * PX_M), 8)), Image.LANCZOS)
    im = Image.new("RGB", (wm * PX_M, hm * PX_M))
    for i in range(0, im.size[0], t.size[0]):
        for j in range(0, im.size[1], t.size[1]):
            im.paste(t, (i, j))
    return im


if __name__ == "__main__":
    S = json.load(open(os.path.join(HERE, "sets.json"), encoding="utf-8"))
    cat = {c["id"]: c for c in json.load(open(os.path.join(HERE, "catalog.json")))}
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))  # (only what the sets name is kept)
    used = {}
    for name, st in S["sets"].items():
        for part, tid in st["parts"].items():
            assert tid in S["tiles"], f"{tid} ({name}.{part}) has no entry in tiles"
            used.setdefault(tid, []).append(f"{name}.{part}")
    jobs = []
    for tid in sorted(used):
        meta = S["tiles"][tid]
        ids = meta.get("src_any") or [meta["src"]]
        for i in ids:
            assert i in cat, f"{i} is not in the catalog"
        jobs.append((tid, meta, [(i, cat[i]["source"]) for i in ids], S["grades"][meta["grade"]]))
    with ProcessPoolExecutor(6) as ex:
        man = dict(ex.map(one, jobs))
    for tid in man:
        man[tid]["used"] = used[tid]
    json.dump({"size": 1024, "detail": 512, "tiles": man, "sets": S["sets"]}, open(os.path.join(OUT, "manifest.json"), "w"), indent=1)
    W, H = 8 * PX_M, 5 * PX_M
    for name, st in S["sets"].items():
        parts = list(st["parts"].items()); cols = 3; rows = -(-len(parts) // cols)
        sh = Image.new("RGB", (cols * (W + 12), rows * (H + 40) + 46), (24, 24, 24)); d = ImageDraw.Draw(sh)
        d.text((10, 10), f"{name}: {st['where']}   (each panel is a wall 8 m by 5 m; the figure is 1.8 m)", fill=(240, 240, 200))
        for k, (part, tid) in enumerate(parts):
            x, y = (k % cols) * (W + 12) + 6, (k // cols) * (H + 40) + 40
            im = wall(tid, man); dd = ImageDraw.Draw(im)
            fx, fy = 60, H - int(1.8 * PX_M)
            dd.rectangle([fx, fy + 30, fx + 44, H], fill=(200, 200, 200)); dd.ellipse([fx + 6, fy, fx + 38, fy + 32], fill=(200, 200, 200))
            sh.paste(im, (x, y))
            m = man[tid]
            d.text((x, y + H + 4), f"{part}: {tid} ({m['source'][:30]})  {m['m'][0]} x {m['m'][1]} m, {m['lay']}, seam {m['seam']}, value {m['value']}", fill=(255, 90, 90) if m["seam"] > 1.6 else (230, 230, 120))
        sh.save(os.path.join(SHEETS, f"set_{name}.jpg"), quality=86)
        sm = sh.copy(); sm.thumbnail((1700, 1700)); sm.save(os.path.join(SHEETS, f"small_set_{name}.jpg"), quality=84)
    ov = Image.new("RGB", (5 * 450, 2 * 310), (24, 24, 24)); d = ImageDraw.Draw(ov)
    for k, name in enumerate(ORDER):
        tid = S["sets"][name]["parts"]["wall"]
        ov.paste(wall(tid, man).resize((440, 275), Image.LANCZOS), ((k % 5) * 450 + 5, (k // 5) * 310 + 5))
        d.text(((k % 5) * 450 + 8, (k // 5) * 310 + 284), f"{name}: {tid}  value {man[tid]['value']}", fill=(230, 230, 120))
    ov.save(os.path.join(SHEETS, "sets_overview.jpg"), quality=88)
    rp = Image.new("RGB", (len(ORDER) * 220, 330), (24, 24, 24)); d = ImageDraw.Draw(rp)
    for k, name in enumerate(ORDER):
        tid = S["sets"][name]["parts"]["wall"]
        rp.paste(wall(tid, man, 4, 5).resize((216, 270), Image.LANCZOS), (k * 220 + 2, 2))
        d.text((k * 220 + 6, 276), name, fill=(240, 240, 200)); d.text((k * 220 + 6, 292), f"value {man[tid]['value']}", fill=(230, 230, 120))
        d.text((k * 220 + 6, 308), S["sets"][name].get("accent", "")[:36], fill=(200, 200, 200))
    rp.save(os.path.join(SHEETS, "ramp.jpg"), quality=88)
    over = [f"{k} {v['seam']}" for k, v in man.items() if v["seam"] > 1.6]
    kb = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) // 1024
    print(len(man), "tiles in", len(S["sets"]), "sets;", kb, "KB; brightest", max(v["value"] for v in man.values()), "| seams over 1.6:", ", ".join(over) or "none")
    lowv = [f"{k} {v['value']}" for k, v in man.items() if v["value"] < 0.10]
    if lowv:
        print("under 0.10 (a black rectangle in the game):", ", ".join(lowv))
    if over or lowv:
        sys.exit(1)
