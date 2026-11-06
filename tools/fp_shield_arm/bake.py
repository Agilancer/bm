"""The game's copy of the raised arm: left_shield_arm.glb's hold pose baked into the view's own space, with the grip's two brackets to the board, one rigid mesh.
assets/game/items/shield_arm.glb, drawn like the skull's arm. Rerun after build.py, and paste what it prints into src/gfx/renderer.js. Run from this folder."""
from lib import *
import os
BM = os.path.abspath("../..")
RIG = BM + "/assets/fp/left_shield_arm.glb"
OUT = BM + "/assets/game/items/shield_arm.glb"
meta = json.load(open("view/meta.json"))


def trs(n):
    x, y, z, w = n.get("rotation", [0, 0, 0, 1]); s = n.get("scale", [1, 1, 1]); m = np.eye(4)
    m[:3, :3] = np.array([[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)], [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)], [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]]) @ np.diag(s)
    m[:3, 3] = n.get("translation", [0, 0, 0]); return m


j, b = load(RIG)
nodes = j["nodes"]; par = {c: i for i, n in enumerate(nodes) for c in n.get("children", [])}
def world(i):
    m = trs(nodes[i])
    while i in par: i = par[i]; m = trs(nodes[i]) @ m
    return m
idx = {n["name"]: i for i, n in enumerate(nodes)}
sk = j["skins"][0]; ibm = acc(j, b, sk["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1).astype(float)
pal = np.stack([world(x) @ ibm[k] for k, x in enumerate(sk["joints"])])
pr = j["meshes"][0]["primitives"][0]; A = pr["attributes"]
P = acc(j, b, A["POSITION"]).astype(float); N = acc(j, b, A["NORMAL"]).astype(float); UV = acc(j, b, A["TEXCOORD_0"]); I = acc(j, b, pr["indices"]).astype("u4").ravel()
J = acc(j, b, A["JOINTS_0"]); W = acc(j, b, A["WEIGHTS_0"]).astype(float)
H = np.c_[P, np.ones(len(P))]; Hn = np.c_[N, np.zeros(len(N))]
Vw = np.zeros((len(P), 3)); Nw = np.zeros((len(P), 3))
for k in range(4):
    Vw += W[:, k:k + 1] * np.einsum("nij,nj->ni", pal[J[:, k]], H)[:, :3]
    Nw += W[:, k:k + 1] * np.einsum("nij,nj->ni", pal[J[:, k]], Hn)[:, :3]
Nw /= np.linalg.norm(Nw, axis=1, keepdims=True)
S = world(idx["ShieldSocket"]); S[:3, :3] /= np.cbrt(np.linalg.det(S[:3, :3]))

# The brackets, dark from the grip's own texels: the vertex at the grip's middle that's nearest the fist's dark bar.
from PIL import Image
tex = j["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]; bv = j["bufferViews"][j["images"][j["textures"][tex]["source"]]["bufferView"]]
img = np.asarray(Image.open(io.BytesIO(b[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB")); h, w, _ = img.shape
col = img[(UV[:, 1] % 1 * h).astype(int).clip(0, h - 1), (UV[:, 0] % 1 * w).astype(int).clip(0, w - 1)]
dark = np.where((col.mean(1) < 45) & (np.ptp(col, axis=1) < 25))[0]; duv = UV[dark[0]]
vs, ns = [], []; tris = []
for a, c in meta["posts"]:
    a = (S @ np.r_[a, 1])[:3]; c = (S @ np.r_[c, 1])[:3]; ax = c - a; ax /= np.linalg.norm(ax); c = c + ax * 0.012
    s = np.cross(ax, [1.0, 0, 0]); s /= np.linalg.norm(s); t = np.cross(ax, s)
    hw, ht = 0.017, 0.004
    for nrm, u, v in ((t, s * hw, ax), (-t, -s * hw, ax), (s, t * ht, ax), (-s, -t * ht, ax)):
        off = nrm * (ht if abs(nrm @ t) > .5 else hw); base = len(P) + len(vs)
        vs += [a + off - u, a + off + u, c + off + u, c + off - u]; ns += [nrm] * 4
        q = [base, base + 1, base + 2, base, base + 2, base + 3]
        d = np.cross(vs[base - len(P) + 1] - vs[base - len(P)], vs[base - len(P) + 2] - vs[base - len(P)])
        tris += q if d @ nrm > 0 else [q[0], q[2], q[1], q[3], q[5], q[4]]
Vo = np.vstack([Vw, vs]).astype("f4"); No = np.vstack([Nw, ns]).astype("f4"); Uo = np.vstack([UV, np.tile(duv, (len(vs), 1))]).astype("f4"); Io = np.r_[I, np.array(tris, "u4")]

# A plain one-mesh file keeping the source's maps untouched.
nb = bytearray()
views = []; accs = []
def add(arr, ctype, atype, mm=False):
    while len(nb) % 4: nb.append(0)
    o = len(nb); nb.extend(arr.tobytes()); views.append({"buffer": 0, "byteOffset": o, "byteLength": arr.nbytes})
    a = {"bufferView": len(views) - 1, "componentType": ctype, "count": len(arr), "type": atype}
    if mm: a["min"] = [float(x) for x in arr.min(0)]; a["max"] = [float(x) for x in arr.max(0)]
    accs.append(a); return len(accs) - 1
attrs = {"POSITION": add(Vo, 5126, "VEC3", True), "NORMAL": add(No, 5126, "VEC3"), "TEXCOORD_0": add(Uo, 5126, "VEC2")}; ind = add(Io, 5125, "SCALAR")
imgs = []
for im in j["images"]:
    v = j["bufferViews"][im["bufferView"]]; data = b[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
    while len(nb) % 4: nb.append(0)
    views.append({"buffer": 0, "byteOffset": len(nb), "byteLength": len(data)}); nb.extend(data)
    imgs.append({"name": im.get("name"), "mimeType": im["mimeType"], "bufferView": len(views) - 1})
while len(nb) % 4: nb.append(0)
out = {"asset": {"version": "2.0", "generator": "tools/fp_shield_arm/bake.py"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"name": "shield_arm", "mesh": 0}],
       "meshes": [{"name": "shield_arm", "primitives": [{"attributes": attrs, "indices": ind, "material": 0}]}], "materials": j["materials"], "textures": j["textures"], "samplers": j["samplers"], "images": imgs,
       "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(nb)}]}
for m in out["materials"]: m.pop("extensions", None)
js = json.dumps(out, separators=(",", ":")).encode(); js += b" " * (-len(js) % 4)
open(OUT, "wb").write(b"glTF" + struct.pack("<II", 2, 28 + len(js) + len(nb)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(nb), 0x004E4942) + bytes(nb))

clip = j["animations"][1]; lo = acc(j, b, clip["samplers"][0]["output"])  # ShieldLower: held to lowered
travel = (lo[-1] - lo[0]).astype(float)
print("file MB %.2f, verts %d + %d bracket" % (os.path.getsize(OUT) / 1e6, len(P), len(vs)))
print("export const SHIELD_SOCKET = [" + ", ".join("%.5f" % v for v in S.T.ravel()) + "];")
print("const SHIELD_TRAVEL = [%.4f, %.4f, %.4f];" % tuple(travel))
