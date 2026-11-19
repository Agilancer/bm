"""The townsfolk's skin kit: every villager body's colour map with templates and a guide, zipped for an outside painter
(ChatGPT, or anyone) to make new skins for Phobos's people from. Plain Python (NumPy, SciPy, Pillow):

    python tools/phobos/skin_kit.py [--shots DIR] [ids...]

Writes tools/build/phobos_skin_kit.zip (and the folder beside it). For each body in assets/game/folk/folk.json models:

  <id>/color.png      its colour map as the game has it (1024 square): the picture to paint over
  <id>/regions.png    each texel coloured by the part of the body it lies on (by its strongest bone), legend in the guide
  <id>/overlay.png    color.png greyed, with the regions laid over it: what is where, and what it looks like now
  <id>/face.png       white where the front of the face is (most of a person's look, and very few texels)
  <id>/skin.png       white where the map is skin-coloured now
  <id>/lines.png      the outline of every chart of the atlas (transparent): paint inside them, never across
  <id>/preview.jpg    the body in the game's viewer: face front and three-quarter, whole front and back (--shots DIR
                      holding <id>_faces_{f,q}.png and <id>_turn_{f,b}.png, as the session's shoot script writes them)
  <id>/info.json      height, triangles, who in the game wears this body now, and which swaps of it exist

Plus BODIES.md (each body, and who wears it), HANDOFF.md (tools/phobos/skin_kit_handoff.md: how the maps work, the rules, how to paint and send skins back),
skin_template/ (what a finished skin's folder looks like), example_ph_tallow/ (Wes and the grim skin made from him),
and all_villagers.jpg. Skins come back through tools/phobos/import_skins.py.
"""
import json
import os
import re
import shutil
import struct
import sys
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
FOLK = os.path.join(ROOT, "assets", "game", "folk")
OUT = os.path.join(ROOT, "tools", "build", "phobos_skin_kit")
N = 1024

# Body parts by bone: (name, colour, bone name patterns). Left parts a shade lighter than right.
PARTS = [
    ("head", (220, 40, 40), r"Head"),
    ("neck", (240, 140, 30), r"Neck"),
    ("chest", (235, 215, 40), r"Spine2|Shoulder"),
    ("belly", (180, 170, 40), r"Spine1|Spine$"),
    ("hips", (130, 120, 30), r"Hips"),
    ("upper arm", (40, 180, 60), r"Arm$"),
    ("forearm", (30, 160, 150), r"ForeArm"),
    ("hand", (60, 210, 240), r"Hand"),
    ("thigh", (50, 90, 230), r"UpLeg"),
    ("shin", (140, 70, 220), r"Leg$"),
    ("foot", (230, 60, 200), r"Foot|Toe"),
]


def read_glb(path):
    b = open(path, "rb").read()
    jl = struct.unpack_from("<I", b, 12)[0]
    J = json.loads(b[20:20 + jl])
    b0 = 20 + jl + 8
    CT = {5126: "f4", 5125: "u4", 5123: "u2", 5121: "u1"}
    NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

    def acc(i):
        a = J["accessors"][i]
        bv = J["bufferViews"][a["bufferView"]]
        dt = CT[a["componentType"]]
        arr = np.frombuffer(b, dtype=dt, count=a["count"] * NC[a["type"]], offset=b0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        arr = arr.reshape(a["count"], NC[a["type"]])
        return arr / {"u1": 255.0, "u2": 65535.0}[dt] if a.get("normalized") and dt != "f4" else arr

    pr = J["meshes"][0]["primitives"][0]
    A = pr["attributes"]
    names = [J["nodes"][j]["name"].split(":")[-1] for j in J["skins"][0]["joints"]]
    return (acc(A["POSITION"]).astype(float), acc(A["NORMAL"]).astype(float), acc(A["TEXCOORD_0"]).astype(float),
            acc(pr["indices"]).reshape(-1, 3).astype(int), acc(A["JOINTS_0"]).astype(int), acc(A["WEIGHTS_0"]).astype(float), names)


def part_of(name):
    for k, (_, _, pat) in enumerate(PARTS):
        if re.search(pat, name):
            return k
    return 3


def raster(glb):
    """Per texel: the bind-pose point, normal, head weight, body part and left side; and which texels any chart covers."""
    P, Nn, UV, I, JO, W, names = read_glb(glb)
    jpart = np.array([part_of(n) for n in names])
    jleft = np.array([n.startswith("Left") for n in names])
    top = JO[np.arange(len(JO)), W.argmax(1)]
    vpart, vleft = jpart[top], jleft[top]
    head = [k for k, n in enumerate(names) if n == "Head"]
    hw = sum((W * (JO == k)).sum(1) for k in head)
    pos = np.zeros((N, N, 3)); nrm = np.zeros((N, N, 3)); hd = np.zeros((N, N)); part = np.full((N, N), -1); left = np.zeros((N, N), bool)
    uvp = UV * N - 0.5
    for t in I:
        u = uvp[t]
        x0, y0 = np.maximum(np.floor(u.min(0)).astype(int), 0)
        x1, y1 = np.minimum(np.ceil(u.max(0)).astype(int), N - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        (ax, ay), (bx, by), (cx, cy) = u
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-12:
            continue
        l0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / d
        l1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / d
        L = np.stack([l0, l1, 1 - l0 - l1], -1)
        m = (L >= -0.03).all(-1)
        if not m.any():
            continue
        L = L[m]; yy, xx = ys[m], xs[m]
        pos[yy, xx] = L @ P[t]; nrm[yy, xx] = L @ Nn[t]; hd[yy, xx] = L @ hw[t]
        near = t[L.argmax(1)]
        part[yy, xx] = vpart[near]; left[yy, xx] = vleft[near]
    cov = part >= 0
    nrm /= np.maximum(np.linalg.norm(nrm, axis=-1, keepdims=True), 1e-9)
    return pos, nrm, hd, part, left, cov


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def skin_mask(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a.max(-1); mn = a.min(-1); d = mx - mn; m = d > 1e-6
    rc = np.where(m, (mx - r) / np.where(m, d, 1), 0); gc = np.where(m, (mx - g) / np.where(m, d, 1), 0); bc = np.where(m, (mx - b) / np.where(m, d, 1), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2 + rc - bc, 4 + gc - rc)); h = np.where(m, (h / 6) % 1, 0)
    s = np.where(mx > 1e-6, d / np.where(mx > 1e-6, mx, 1), 0)
    hdist = np.minimum(np.abs(h - 0.055), 1 - np.abs(h - 0.055))
    return np.clip(1 - hdist / 0.05, 0, 1) * smooth(s, 0.14, 0.24) * smooth(-s, -0.66, -0.56) * smooth(mx, 0.36, 0.5)


def body(bid, model, folk, people, shots, out):
    os.makedirs(out, exist_ok=True)
    a8 = np.asarray(Image.open(os.path.join(FOLK, model["c"])).convert("RGB").resize((N, N), Image.LANCZOS))
    a = a8.astype(float) / 255
    pos, nrm, hd, part, left, cov = raster(os.path.join(FOLK, model["glb"]))
    Image.fromarray(a8).save(os.path.join(out, "color.png"), optimize=True)
    # Regions.
    reg = np.zeros((N, N, 3), np.uint8)
    for k, (_, col, _) in enumerate(PARTS):
        m = part == k
        c = np.array(col, float)
        reg[m & ~left] = (c * 0.72).astype(np.uint8)
        reg[m & left] = np.minimum(c * 1.0 + 30, 255).astype(np.uint8)
    Image.fromarray(reg).save(os.path.join(out, "regions.png"), optimize=True)
    grey = a.mean(-1, keepdims=True) * 0.8 + 0.1
    ov = np.where(cov[..., None], grey * 0.55 + reg / 255 * 0.45, 0)
    Image.fromarray((np.clip(ov, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, "overlay.png"), optimize=True)
    # Face: the head's skin that faces forward, in front of the ears.
    z = pos[..., 2]
    head = cov & (part == 0)
    zf = np.percentile(z[head], 97) if head.any() else 0.1
    face = head & (nrm[..., 2] > 0.25) & (z > zf - 0.07) & (hd > 0.5)
    face = ndi.binary_opening(face, iterations=1)
    Image.fromarray((face * 255).astype(np.uint8)).save(os.path.join(out, "face.png"), optimize=True)
    sk = (np.clip(ndi.gaussian_filter(skin_mask(a), 1.0) * 1.6, 0, 1) * cov)
    Image.fromarray((sk * 255).astype(np.uint8)).save(os.path.join(out, "skin.png"), optimize=True)
    # Chart outlines.
    edge = cov & ~ndi.binary_erosion(cov, iterations=1)
    ln = np.zeros((N, N, 4), np.uint8)
    ln[edge] = (255, 255, 255, 255)
    Image.fromarray(ln, "RGBA").save(os.path.join(out, "lines.png"), optimize=True)
    # Preview.
    if shots and all(os.path.exists(os.path.join(shots, f"{bid}_{v}.png")) for v in ("faces_f", "faces_q", "turn_f", "turn_b")):
        T = 420
        im = Image.new("RGB", (T * 4, 760), (30, 30, 32))
        for k, v in enumerate(("faces_f", "faces_q")):
            im.paste(Image.open(os.path.join(shots, f"{bid}_{v}.png")).convert("RGB").crop((140, 90, 660, 610)).resize((T, T), Image.LANCZOS), (k * T, 170))
        for k, v in enumerate(("turn_f", "turn_b")):
            im.paste(Image.open(os.path.join(shots, f"{bid}_{v}.png")).convert("RGB").crop((230, 40, 570, 800)).resize((T, 760), Image.LANCZOS), ((2 + k) * T, 0))
        ImageDraw.Draw(im).text((10, 10), f"{bid}: face front, face 3/4, front, back", fill=(240, 220, 150))
        im.save(os.path.join(out, "preview.jpg"), quality=86)
    worn = [{"id": p["id"], "name": p.get("name"), "body": p["body"]} for p in people if p["body"] == bid or folk["swaps"].get(p["body"], {}).get("base") == bid]
    swaps = {k: v.get("note", "") for k, v in folk["swaps"].items() if v["base"] == bid}
    face_mm = 0
    if face.sum() > 10:
        dc = np.linalg.norm(np.roll(pos, -1, 1) - pos, axis=-1)
        face_mm = float(np.median(dc[face & (dc < 0.01)]) * 1000)
    info = {"id": bid, "height_m": model["height"], "triangles": model["tris"], "skirt": bool(model.get("skirt")),
            "face_texels": int(face.sum()), "face_mm_per_texel": round(face_mm, 2), "worn_by": worn, "existing_swaps": swaps}
    json.dump(info, open(os.path.join(out, "info.json"), "w"), indent=1)
    return info


def people_list():
    """Who wears what, read from src/folk/people.js's lines (id, name and body)."""
    out = []
    for line in open(os.path.join(ROOT, "src", "folk", "people.js"), encoding="utf8"):
        i, bd = re.search(r"\bid: '([^']+)'", line), re.search(r"\bbody: '([^']+)'", line)
        if i and bd:
            nm = re.search(r"\bname: (['\"])(.*?)\1", line)
            out.append({"id": i.group(1), "name": nm.group(2) if nm else None, "body": bd.group(1)})
    return out


def lineup(ids, shots, path):
    T, H = 230, 470
    cols = 9
    rows = -(-len(ids) // cols)
    im = Image.new("RGB", (cols * T, rows * (H + 22)), (30, 30, 32))
    d = ImageDraw.Draw(im)
    for k, bid in enumerate(ids):
        f = os.path.join(shots, f"{bid}_turn_f.png")
        x, y = (k % cols) * T, (k // cols) * (H + 22)
        if os.path.exists(f):
            im.paste(Image.open(f).convert("RGB").crop((230, 40, 570, 800)).resize((T, H), Image.LANCZOS), (x, y + 22))
        d.text((x + 6, y + 5), bid, fill=(240, 220, 150))
    im.save(path, quality=85)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    shots = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
    if shots in args:
        args.remove(shots)
    folk = json.load(open(os.path.join(FOLK, "folk.json")))
    people = people_list()
    ids = args or list(folk["models"])
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    index = []
    for bid in ids:
        info = body(bid, folk["models"][bid], folk, people, shots, os.path.join(OUT, "bodies", bid))
        index.append(info)
        print(bid, f"face {info['face_texels']} texels at {info['face_mm_per_texel']} mm", "worn by", len(info["worn_by"]))
    json.dump(index, open(os.path.join(OUT, "bodies", "index.json"), "w"), indent=1)
    # BODIES.md: what each body is (its Tripo model's own name says), and who wears it.
    src = json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))["models"]
    taken = sorted(set(folk["swaps"]) | set(folk["models"]))
    rows = ["# The bodies", "", "| id | what it is | height | skirt | worn in the game by | Phobos skins of it already |", "|---|---|---|---|---|---|"]
    for i in index:
        what = os.path.splitext(os.path.basename(src.get(i["id"], {}).get("file", i["id"])))[0].replace(" - ", ", ").title()
        worn = ", ".join(sorted({w["name"] or w["id"] for w in i["worn_by"]})) or "nobody"
        ph = ", ".join(k for k in i["existing_swaps"] if k.startswith("ph_")) or "none"
        rows.append(f"| `{i['id']}` | {what} | {i['height_m']} m | {'yes' if i['skirt'] else ''} | {worn} | {ph} |")
    rows += ["", "Ids already taken (a new skin's id must be none of these):", "", ", ".join(f"`{t}`" for t in taken), ""]
    open(os.path.join(OUT, "BODIES.md"), "w").write("\n".join(rows))
    if shots:
        lineup(ids, shots, os.path.join(OUT, "all_villagers.jpg"))
    shutil.copy(os.path.join(ROOT, "tools", "phobos", "skin_kit_handoff.md"), os.path.join(OUT, "HANDOFF.md"))
    # The legend, as a picture too.
    lg = Image.new("RGB", (520, 30 * len(PARTS) + 20), (30, 30, 32))
    d = ImageDraw.Draw(lg)
    for k, (name, col, _) in enumerate(PARTS):
        c = np.array(col, float)
        d.rectangle([10, 10 + 30 * k, 60, 34 + 30 * k], fill=tuple(int(v) for v in c * 0.72))
        d.rectangle([64, 10 + 30 * k, 114, 34 + 30 * k], fill=tuple(int(v) for v in np.minimum(c + 30, 255)))
        d.text((126, 16 + 30 * k), f"{name}  (darker: his/her right, lighter: left)", fill=(235, 235, 235))
    lg.save(os.path.join(OUT, "regions_legend.png"))
    # A skin's folder, as it comes back.
    tpl = os.path.join(OUT, "skin_template", "ph_example")
    os.makedirs(tpl)
    json.dump({"id": "ph_example", "base": "wes", "name": "Firstname Lastname",
               "note": "who this is in a few words: their trade, their clothes and colours, what marks them"}, open(os.path.join(tpl, "skin.json"), "w"), indent=1)
    shutil.copy(os.path.join(OUT, "bodies", "wes", "color.png"), os.path.join(tpl, "color.png"))
    # The worked example.
    ex = os.path.join(OUT, "example_ph_tallow")
    os.makedirs(ex)
    Image.open(os.path.join(FOLK, "ph_tallow_c.webp")).convert("RGB").save(os.path.join(ex, "ph_tallow_color.png"), optimize=True)
    for f in ("ph_tallow_vs_wes.jpg", "ph_tallow_rounds.jpg"):
        p = os.path.join(ROOT, "art", "phobos", "review", f)
        if os.path.exists(p):
            shutil.copy(p, ex)
    zp = OUT + ".zip"
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for dp, _, fs in os.walk(OUT):
            for f in sorted(fs):
                z.write(os.path.join(dp, f), os.path.join("phobos_skin_kit", os.path.relpath(os.path.join(dp, f), OUT)))
    print(zp, round(os.path.getsize(zp) / 1e6, 1), "MB")


if __name__ == "__main__":
    main()
