"""Phobos's Meshy people (tools/phobos/residents.mjs) onto the townsfolk's rig and into tools/folk/models.json.

    python tools/phobos/residents_folk.py [names...]      then:
    blender -b --factory-startup --python-exit-code 1 --python tools/folk/build_folk.py -- <names...>
    python tools/folk/paint.py <names...>

For each: tools/phobos/meshy_to_folk.py with a built townsperson as the donor of finger bones (worker_2 for a man,
worker_f for a woman: the Tripo originals are on the owner's drive), its base colour padded (pad_texture.py: Meshy's
islands on black go grey at a distance) and swapped back in byte for byte (glb_swap_texture.py), saved as
art/phobos/models/<name>.glb (kept out of git, like the chunk 0 three); and its entry in models.json as theirs are: in the
repo, its UVs kept, 32000 triangles (the builder's cut tears Meshy's small islands), a loose fist.
"""
import json, os, struct, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
CFG = json.load(open(os.path.join(HERE, "residents.json")))
WOMEN = {"fishwife", "tanner", "ragwoman", "apothecary"}


def base_colour(glb):
    """The index of the image a glb's first material takes its base colour from, and that image's bytes."""
    data = open(glb, "rb").read()
    jl = struct.unpack("<I", data[12:16])[0]
    js = json.loads(data[20:20 + jl])
    bin0 = 20 + jl + 8
    tex = js["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    img = js["textures"][tex]["source"]
    bv = js["bufferViews"][js["images"][img]["bufferView"]]
    return img, data[bin0 + bv.get("byteOffset", 0): bin0 + bv.get("byteOffset", 0) + bv["byteLength"]], js["images"][img].get("mimeType", "image/png")


def one(name):
    src = os.path.join(ROOT, "art", "phobos", "residents", f"{name}.glb")
    out = os.path.join(ROOT, "art", "phobos", "models", f"{name}.glb")
    woman = name in WOMEN or CFG["people"][name].get("sex") == "f"
    donor = os.path.join(ROOT, "assets", "game", "folk", ("worker_f" if woman else "worker_2") + ".glb")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        fitted = os.path.join(tmp, "fitted.glb")
        r = subprocess.run(["blender", "-b", "--factory-startup", "--python-exit-code", "1", "-P", os.path.join(HERE, "meshy_to_folk.py"), "--", src, donor, fitted], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f"{name}: meshy_to_folk failed\n{r.stdout[-1500:]}{r.stderr[-1500:]}")
        idx, raw, mime = base_colour(fitted)
        ext = "jpg" if "jpeg" in mime else "png"
        a, b = os.path.join(tmp, f"c.{ext}"), os.path.join(tmp, "c_pad.png")
        open(a, "wb").write(raw)
        subprocess.run([sys.executable, os.path.join(HERE, "pad_texture.py"), a, b], check=True)
        subprocess.run([sys.executable, os.path.join(HERE, "glb_swap_texture.py"), fitted, b, out, str(idx)], check=True)
    # (A line of its own after the last of the Meshy bodies, as the file's laid out by hand: one body a line.)
    path = os.path.join(ROOT, "tools", "folk", "models.json")
    lines = open(path, encoding="utf-8").read().split("\n")
    if not any(l.strip().startswith(f'"{name}":') for l in lines):
        at = max(i for i, l in enumerate(lines) if '"art/phobos/models/' in l)
        h = CFG["people"][name]["height"]
        last = lines[at + 1].strip().startswith("}")
        if not lines[at].rstrip().endswith(","): lines[at] = lines[at].rstrip() + ","
        lines.insert(at + 1, f'    "{name}": {{ "file": "art/phobos/models/{name}.glb", "repo": true, "keep_uv": true, "fist": 0.45, "calm_head": 0.01, "height": {h:.2f}, "tris": 32000 }}' + ("" if last else ","))
        open(path, "w", encoding="utf-8", newline="\n").write("\n".join(lines))
    json.load(open(path))   # (still JSON)
    print(name, "fitted, padded, in models.json")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(CFG["people"])):
        one(n)
