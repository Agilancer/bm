"""Run every Phobos source texture through seamless.py and lay each out 3 x 3 on contact sheets.

    python tools/phobos/textures/process_all.py

Sources: assets/citystatephobos/*.jpg (the owner's photographs, ids p000..) and the generated tiles in its batch
folders (their own BM_* ids). Writes tools/build/phobos_tex/tiles/<id>.png (512, for review; not in the repo),
tools/phobos/textures/catalog.json (id, source, seam and patch scores, aspect) and art/phobos/textures/sheet_NN.jpg
(20 a page, each tile repeated 3 x 3 at its true aspect, its id and scores under it; seams over 1.6 marked red).
"""
import glob, json, os, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seamless import make_tile

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SRC = os.path.join(ROOT, "assets", "citystatephobos")
TILES = os.path.join(ROOT, "tools", "build", "phobos_tex", "tiles")
SHEETS = os.path.join(ROOT, "art", "phobos", "textures")


def sources():
    out = [(f"p{k:03d}", f) for k, f in enumerate(sorted(glob.glob(os.path.join(SRC, "*.jpg"))))]
    for f in sorted(glob.glob(os.path.join(SRC, "*", "textures", "**", "*.png"), recursive=True)):
        out.append((os.path.basename(f).replace("_Color.png", "").replace(".png", ""), f))
    return out


def one(job):
    tid, f = job
    t, s, p, asp = make_tile(Image.open(f), 512)
    t.save(os.path.join(TILES, tid + ".png"))
    return {"id": tid, "source": os.path.relpath(f, ROOT).replace("\\", "/"), "seam": round(s, 2), "patch": round(p, 3), "aspect": round(asp, 3)}


if __name__ == "__main__":
    os.makedirs(TILES, exist_ok=True); os.makedirs(SHEETS, exist_ok=True)
    with ProcessPoolExecutor(6) as ex:
        cat = list(ex.map(one, sources()))
    json.dump(cat, open(os.path.join(ROOT, "tools", "phobos", "textures", "catalog.json"), "w"), indent=0)
    C, CELL = 5, 420
    for page in range(0, len(cat), 20):
        part = cat[page:page + 20]
        s = Image.new("RGB", (C * CELL, 4 * (CELL + 24)), (24, 24, 24)); d = ImageDraw.Draw(s)
        for k, c in enumerate(part):
            t = Image.open(os.path.join(TILES, c["id"] + ".png"))
            a = c["aspect"]; tw, th = (140, max(int(140 / a), 40)) if a >= 1 else (max(int(140 * a), 40), 140)
            t = t.resize((tw, th), Image.LANCZOS)
            cell = Image.new("RGB", (CELL - 8, CELL - 8))
            for i in range(0, CELL, tw):
                for j in range(0, CELL, th):
                    cell.paste(t, (i, j))
            x, y = (k % C) * CELL, (k // C) * (CELL + 24)
            s.paste(cell, (x + 4, y + 4))
            d.text((x + 6, y + CELL - 2), f"{c['id'][:34]}  seam {c['seam']}  patch {c['patch']}", fill=(255, 90, 90) if c["seam"] > 1.6 else (230, 230, 120))
        s.save(os.path.join(SHEETS, f"sheet_{page // 20 + 1:02d}.jpg"), quality=84)
    bad = [c["id"] for c in cat if c["seam"] > 1.6]
    print(len(cat), "tiles;", len(bad), "with a seam over 1.6:", " ".join(bad))
