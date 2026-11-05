"""Builds assets/fp/arms_1h.glb: the repaired sword-and-empty-hand arms on their skeleton, Bellmourn's Arming
Sword in the right fist and Iron-Bound Roundshield on the left, and the game's one-handed moves as clips.

    python tools/fp_arms/repair.py 1h     # first (and again only if the repair changes)
    python tools/fp_arms/build1h.py       # then this
"""
import json
import os
import runpy
import struct

import numpy as np

import rig
import swings1h as M
from build import C, Glb, mat2quat, same_hemisphere
from repair import BUILD, ROOT
from swings import rot_about

OUT = os.path.join(ROOT, "assets", "fp", "arms_1h.glb")
DRAWN_OUT = runpy.run_path(os.path.join(ROOT, "tools", "swords", "lengthen.py"))["drawn_out"]
NICE = dict(blade_d1="Slash, upper right", blade_d2="Slash, upper left", blade_over="Overhead cut", blade_rise1="Rising, from the right",
            blade_rise2="Rising, from the left", blade_flat1="Flat, right to left", blade_flat2="Flat, left to right", blade_stab="Thrust",
            blade_sky1="Skyrim 1: across from the right", blade_sky2="Skyrim 2: back from the left", blade_sky3="Skyrim 3: rising, from the right",
            blade_sky4="Skyrim 4: down from the left", blade_sky5="Skyrim 5: overhead finisher")


def embed_item(g, path, images, materials, meshes, name, tip=None):
    """An item from the game: its mesh, material and texture, as they are (`tip`: its blade drawn out to there)."""
    raw = open(path, "rb").read()
    jl = struct.unpack("<I", raw[12:16])[0]
    sj = json.loads(raw[20:20 + jl])
    sb = raw[20 + jl + 8:]

    def sacc(i):
        a = sj["accessors"][i]
        bv = sj["bufferViews"][a["bufferView"]]
        n_ = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[a["type"]]
        dt = {5126: np.float32, 5125: np.uint32, 5123: np.uint16}[a["componentType"]]
        arr = np.frombuffer(sb, dt, a["count"] * n_, bv.get("byteOffset", 0) + a.get("byteOffset", 0))
        return arr.reshape(-1, n_) if n_ > 1 else arr

    sp = sj["meshes"][0]["primitives"][0]
    P_, N_ = sacc(sp["attributes"]["POSITION"]), sacc(sp["attributes"]["NORMAL"])
    if tip is not None:
        P_, N_, _, _ = DRAWN_OUT(P_, N_, tip)
    prim = dict(attributes=dict(POSITION=g.accessor(P_, "VEC3", 5126, 34962, minmax=True),
                                NORMAL=g.accessor(N_, "VEC3", 5126, 34962),
                                TEXCOORD_0=g.accessor(sacc(sp["attributes"]["TEXCOORD_0"]), "VEC2", 5126, 34962)),
                indices=g.accessor(sacc(sp["indices"]).astype(np.uint32), "SCALAR", 5125, 34963), material=len(materials))
    sim = sj["images"][0]
    sbv = sj["bufferViews"][sim["bufferView"]]
    images.append(dict(bufferView=g.view(sb[sbv.get("byteOffset", 0):sbv.get("byteOffset", 0) + sbv["byteLength"]]), mimeType=sim["mimeType"], name=name))
    materials.append(dict(name=name, doubleSided=True, pbrMetallicRoughness=dict(baseColorTexture=dict(index=len(images) - 1), metallicFactor=0.0, roughnessFactor=1.0)))
    meshes.append(dict(name=name, primitives=[prim]))
    return len(meshes) - 1


def build():
    cfg = rig.SWORD_SHIELD
    d, cfg = rig.stretched(dict(np.load(os.path.join(BUILD, "repaired_1h.npz"))), cfg)
    B, info = rig.joints(d, cfg)
    idx, wts, names = rig.skin(d, B, info, cfg)
    index = {n: i for i, n in enumerate(names)}
    clips, armR, armL = M.build_clips(info, B)
    report = {k: M.metrics(*v) for k, v in clips.items()}

    g = Glb()
    rest_world = {n: (C @ B[n]["R"], C @ B[n]["p"]) for n in names}
    nodes = []
    for n in names:
        b = B[n]
        if b["parent"] is None:
            Rl, tl = C, np.zeros(3)
        else:
            P = B[b["parent"]]
            Rl = P["R"].T @ b["R"]
            tl = P["R"].T @ (b["p"] - P["p"])
        node = dict(name=n, translation=[float(x) for x in tl], rotation=[float(x) for x in mat2quat(Rl)])
        kids = [index[c] for c in names if B[c]["parent"] == n]
        if kids:
            node["children"] = kids
        nodes.append(node)

    V = (d["V"] + cfg["bind"]) @ C.T
    Nrm = d["N"] @ C.T
    tris = d["F"]
    prim = dict(attributes=dict(POSITION=g.accessor(V, "VEC3", 5126, 34962, minmax=True), NORMAL=g.accessor(Nrm, "VEC3", 5126, 34962),
                                TEXCOORD_0=g.accessor(d["UV"], "VEC2", 5126, 34962), JOINTS_0=g.accessor(idx, "VEC4", 5123, 34962),
                                WEIGHTS_0=g.accessor(wts, "VEC4", 5126, 34962)),
                indices=g.accessor(tris.ravel(), "SCALAR", 5125, 34963), material=0)
    ibm = np.zeros((len(names), 4, 4))
    for i, n in enumerate(names):
        R, p = rest_world[n]
        Mt = np.eye(4)
        Mt[:3, :3] = R
        Mt[:3, 3] = p
        ibm[i] = np.linalg.inv(Mt).T
    a_ibm = g.accessor(ibm.reshape(len(names), 16), "MAT4", 5126)

    def image(path_, mime):
        return dict(bufferView=g.view(open(path_, "rb").read()), mimeType=mime, name=os.path.basename(path_))

    images = [image(os.path.join(BUILD, "arms_1h_basecolor.jpg"), "image/jpeg"), image(os.path.join(BUILD, "arms_1h_rm.jpg"), "image/jpeg"),
              image(os.path.join(BUILD, "arms_1h_normal.png"), "image/png")]
    materials = [dict(name="arms", pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicRoughnessTexture=dict(index=1)), normalTexture=dict(index=2))]
    meshes = [dict(name="arms", primitives=[prim])]
    i_sword = embed_item(g, os.path.join(ROOT, "art", "fp_arms", "arming_sword.glb"), images, materials, meshes, "arming_sword", M.TIP)
    i_shield = embed_item(g, os.path.join(ROOT, "art", "fp_arms", "ironbound.glb"), images, materials, meshes, "ironbound")
    i_arms = len(nodes)
    nodes.append(dict(name="arms", mesh=0, skin=0))
    nodes.append(dict(name="arming_sword", mesh=i_sword))
    nodes.append(dict(name="ironbound", mesh=i_shield))
    nodes[index["weapon"]].setdefault("children", []).append(i_arms + 1)
    nodes[index["shield"]].setdefault("children", []).append(i_arms + 2)
    textures = [dict(source=i, sampler=0) for i in range(len(images))]
    samplers = [dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)]
    skins = [dict(name="arms", joints=list(range(len(names))), inverseBindMatrices=a_ibm, skeleton=index["root"])]

    fov = 2 * np.degrees(np.arctan(1 / (1.6 * M.ZOOM)))
    meta = dict(kind="sword_shield", idle="guard_idle", walk="guard_walk", nice=NICE, combos={str(k): [f"blade_{c}" for c in v] for k, v in M.COMBOS.items()},
                combo=[f"blade_{c}" for c in M.COMBOS[1]], lines=M.LINES, clips={},
                view=dict(fov=float(fov), near=0.10), block=dict(up="shield_up", hold="shield_hold", down="shield_down", bash="shield_bash", stab="blade_stab_block"),
                sword=dict(id="arming_sword", tip=M.TIP, pommel=M.POMMEL), shield=dict(id="ironbound"))
    animations = []
    for cname, (path, sol) in clips.items():
        T = sol["T"]
        a_t = g.accessor(T, "SCALAR", 5126, minmax=True)
        samplers_, channels = [], []

        def rotation(bone, R):
            a = g.accessor(same_hemisphere(mat2quat(R)), "VEC4", 5126)
            samplers_.append(dict(input=a_t, output=a, interpolation="LINEAR"))
            channels.append(dict(sampler=len(samplers_) - 1, target=dict(node=index[bone], path="rotation")))

        def translation(bone, P):
            a = g.accessor(P, "VEC3", 5126)
            samplers_.append(dict(input=a_t, output=a, interpolation="LINEAR"))
            channels.append(dict(sampler=len(samplers_) - 1, target=dict(node=index[bone], path="translation")))

        for s in "RL":
            A = sol[s]
            rotation(f"upperarm_{s}", A["Ru"])
            translation(f"upperarm_{s}", A["S"])
            rotation(f"forearm_{s}", np.swapaxes(A["Ru"], -1, -2) @ A["Rf"])
            rotation(f"hand_{s}", np.swapaxes(A["Rf"], -1, -2) @ A["Rh"])
            for k, frac in ((1, 1 / 3), (2, 2 / 3)):
                rotation(f"forearm_twist{k}_{s}", rot_about((0, 1, 0), A["twist"] * frac))
        animations.append(dict(name=cname, samplers=samplers_, channels=channels))
        ev = dict(duration=float(T[-1]), loop=cname in ("guard_idle", "guard_walk", "shield_hold"))
        if ev["loop"]:
            ev["walk"] = True       # (a carry, standing or on the move: played by how fast you go)
        if path["hit"] is not None:
            ev.update(hit=float(T[path["hit"]]), wind=float(T[path["wind"]]), on=float(T[path.get("on", path["wind"])]), through=float(T[path["end"]]))
        if path.get("thrust"):
            ev["thrust"] = True
        if path.get("line") is not None:
            ev["line"] = path["line"]
            if "free" in path:
                ev["free"] = float(T[path["free"]])
                ev["lean"] = M.lean_of(path["line"])
        # (clips that leave the guard, or come back to something else)
        ev["rest"] = cname not in ("shield_up", "shield_hold", "shield_bash", "shield_down", "blade_stab_block")
        meta["clips"][cname] = ev

    gltf = dict(asset=dict(version="2.0", generator="bm tools/fp_arms/build1h.py"), scene=0,
                scenes=[dict(name="arms_1h", nodes=[index["root"], i_arms], extras=meta)],
                nodes=nodes, meshes=meshes, skins=skins, materials=materials, textures=textures, samplers=samplers,
                images=images, animations=animations, accessors=g.accessors, bufferViews=g.views, buffers=[dict(byteLength=0)])
    while len(g.bin) % 4:
        g.bin.append(0)
    gltf["buffers"][0]["byteLength"] = len(g.bin)
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(g.bin)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(g.bin), 0x004E4942) + bytes(g.bin))
    print(f"wrote {OUT}: {total / 1e6:.2f} MB, {len(names)} joints, {len(V)} verts, {len(tris)} faces, {len(clips)} clips")
    for k, r in report.items():
        line = f"{k:17s} {r['duration']:.2f}s"
        if "hit_time" in r:
            line += f" hit@{r['hit_time']:.3f} tip ({r['tip_ndc_at_hit'][0]:+.4f},{r['tip_ndc_at_hit'][1]:+.4f}) peak {r['peak_deg_s']:.0f} deg/s"
            if "carries" in r:
                line += f" carries {r['carries']:.0f}"
        print(line + f"  wrist bend R{r['wrist_bend_max']['R']:.0f} L{r['wrist_bend_max']['L']:.0f} twist R{r['wrist_twist_max']['R']:.0f} L{r['wrist_twist_max']['L']:.0f}  eye {r['nearest_eye']:.2f}  fist {r['fist_m_s']:.1f} m/s  stump frames {r['stump_frames']}")


if __name__ == "__main__":
    build()
