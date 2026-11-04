"""Builds assets/fp/arms_2h.glb: the repaired arms on their skeleton, the Greatsword in both fists, and
Bellmourn's two-handed swings, smoothed, as clips.

    python tools/fp_arms/repair.py     # first (and again only if the repair changes)
    python tools/fp_arms/build.py      # then this

A GLB of its own making rather than Blender's export, so that every joint keeps exactly the frame
the swings were solved in. (Blender reads it back for checking: tools/fp_arms/blender_check.py.)
"""
import json
import os
import struct

import numpy as np

import rig
import swings
from repair import BUILD, ROOT, read_glb

OUT = os.path.join(ROOT, "assets", "fp", "arms_2h.glb")
SWORD = os.path.join(ROOT, "art", "fp_arms", "greatsword.glb")
C = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)     # eye (x right, y ahead, z up) -> glTF (x, up, back)


def mat2quat(R):
    """Rotation matrices (.., 3, 3) to quaternions (.., 4) as x, y, z, w."""
    R = np.asarray(R)
    t = R[..., 0, 0] + R[..., 1, 1] + R[..., 2, 2]
    q = np.zeros(R.shape[:-2] + (4,))
    m = t > 0
    s = np.sqrt(np.maximum(t + 1, 1e-12)) * 2
    q[..., 3] = np.where(m, s / 4, 0)
    q[..., 0] = np.where(m, (R[..., 2, 1] - R[..., 1, 2]) / s, 0)
    q[..., 1] = np.where(m, (R[..., 0, 2] - R[..., 2, 0]) / s, 0)
    q[..., 2] = np.where(m, (R[..., 1, 0] - R[..., 0, 1]) / s, 0)
    for k, (a, b, c) in enumerate(((0, 1, 2), (1, 2, 0), (2, 0, 1))):
        mk = (~m) & (R[..., a, a] >= R[..., b, b]) & (R[..., a, a] >= R[..., c, c])
        sk = np.sqrt(np.maximum(1 + R[..., a, a] - R[..., b, b] - R[..., c, c], 1e-12)) * 2
        q[..., a] = np.where(mk, sk / 4, q[..., a])
        q[..., b] = np.where(mk, (R[..., a, b] + R[..., b, a]) / sk, q[..., b])
        q[..., c] = np.where(mk, (R[..., a, c] + R[..., c, a]) / sk, q[..., c])
        q[..., 3] = np.where(mk, (R[..., c, b] - R[..., b, c]) / sk, q[..., 3])
    return q / np.linalg.norm(q, axis=-1, keepdims=True)


def same_hemisphere(q):
    q = q.copy()
    for i in range(1, len(q)):
        if q[i] @ q[i - 1] < 0:
            q[i] = -q[i]
    return q


class Glb:
    def __init__(self):
        self.bin = bytearray()
        self.views, self.accessors = [], []

    def view(self, data, target=None):
        while len(self.bin) % 4:
            self.bin.append(0)
        v = dict(buffer=0, byteOffset=len(self.bin), byteLength=len(data))
        if target:
            v["target"] = target
        self.bin += data
        self.views.append(v)
        return len(self.views) - 1

    def accessor(self, arr, kind, ctype, target=None, minmax=False, normalized=False):
        arr = np.asarray(arr)
        dt = {5126: "<f4", 5125: "<u4", 5123: "<u2", 5121: "u1"}[ctype]
        a = dict(bufferView=self.view(arr.astype(dt).tobytes(), target), componentType=ctype, count=len(arr), type=kind)
        if normalized:
            a["normalized"] = True
        if minmax:
            n = 1 if arr.ndim == 1 else arr.shape[1]
            flat = arr.reshape(len(arr), n)
            a["min"], a["max"] = [float(x) for x in flat.min(0)], [float(x) for x in flat.max(0)]
        self.accessors.append(a)
        return len(self.accessors) - 1


def build():
    d = dict(np.load(os.path.join(BUILD, "repaired.npz")))
    B, info = rig.joints(d)
    idx, wts, names = rig.skin(d, B, info)
    index = {n: i for i, n in enumerate(names)}

    # --- the swings
    half = np.linalg.norm(info["R"]["fist"] - info["L"]["fist"]) / 2
    arms = {s: swings.Arm(s, info, B) for s in "RL"}
    guard = swings.guard_rolls(arms, half)
    clips = {}
    report = {}
    for name in swings.ORDER:
        path = swings.path_of(name, half)
        sol = swings.solve_clip(path, arms, half, guard)
        clips[f"great_{name}"] = (path, sol)
        report[name] = swings.metrics(path, sol, half)
        report[name]["wrist_bend_max"] = {s: float(sol["bend"][s].max()) for s in "RL"}
        report[name]["wrist_twist_max"] = {s: float(np.abs(sol["twist"][s]).max()) for s in "RL"}
        report[name]["shoulder_shift_max"] = {s: float(np.linalg.norm(sol[s]["S"] - arms[s].S0, axis=1).max()) for s in "RL"}
    path = swings.idle_path(half)
    clips["great_idle"] = (path, swings.solve_clip(path, arms, half, guard))

    # --- the GLB
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

    # the arms: positions in the bind pose (glTF frame)
    V = (d["V"] + rig.TWO_HANDED["bind"]) @ C.T
    Nrm = d["N"] @ C.T
    tris = d["F"]
    a_pos = g.accessor(V, "VEC3", 5126, 34962, minmax=True)
    a_nrm = g.accessor(Nrm, "VEC3", 5126, 34962)
    a_uv = g.accessor(d["UV"], "VEC2", 5126, 34962)
    a_jnt = g.accessor(idx, "VEC4", 5123, 34962)
    a_wts = g.accessor(wts, "VEC4", 5126, 34962)
    a_idx = g.accessor(tris.ravel(), "SCALAR", 5125, 34963)
    ibm = np.zeros((len(names), 4, 4))
    for i, n in enumerate(names):
        R, p = rest_world[n]
        M = np.eye(4)
        M[:3, :3] = R
        M[:3, 3] = p
        ibm[i] = np.linalg.inv(M).T        # (glTF stores matrices by column)
    a_ibm = g.accessor(ibm.reshape(len(names), 16), "MAT4", 5126)

    def image(path_, mime):
        return dict(bufferView=g.view(open(path_, "rb").read()), mimeType=mime, name=os.path.basename(path_))

    images = [image(os.path.join(BUILD, "arms_basecolor.jpg"), "image/jpeg"),
              image(os.path.join(BUILD, "arms_rm.jpg"), "image/jpeg"),
              image(os.path.join(BUILD, "arms_normal.png"), "image/png")]
    # the sword: Bellmourn's Greatsword, as is
    raw = open(SWORD, "rb").read()
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
    s_pos = g.accessor(sacc(sp["attributes"]["POSITION"]), "VEC3", 5126, 34962, minmax=True)
    s_nrm = g.accessor(sacc(sp["attributes"]["NORMAL"]), "VEC3", 5126, 34962)
    s_uv = g.accessor(sacc(sp["attributes"]["TEXCOORD_0"]), "VEC2", 5126, 34962)
    s_idx = g.accessor(sacc(sp["indices"]).astype(np.uint32), "SCALAR", 5125, 34963)
    sim = sj["images"][0]
    sbv = sj["bufferViews"][sim["bufferView"]]
    images.append(dict(bufferView=g.view(sb[sbv.get("byteOffset", 0):sbv.get("byteOffset", 0) + sbv["byteLength"]]), mimeType=sim["mimeType"], name="greatsword"))

    materials = [
        dict(name="arms", pbrMetallicRoughness=dict(baseColorTexture=dict(index=0), metallicRoughnessTexture=dict(index=1)), normalTexture=dict(index=2)),
        dict(name="greatsword", doubleSided=True, pbrMetallicRoughness=dict(baseColorTexture=dict(index=3), metallicFactor=0.0, roughnessFactor=1.0)),
    ]
    textures = [dict(source=i, sampler=0) for i in range(4)]
    samplers = [dict(magFilter=9729, minFilter=9987, wrapS=10497, wrapT=10497)]
    meshes = [dict(name="arms", primitives=[dict(attributes=dict(POSITION=a_pos, NORMAL=a_nrm, TEXCOORD_0=a_uv, JOINTS_0=a_jnt, WEIGHTS_0=a_wts), indices=a_idx, material=0)]),
              dict(name="greatsword", primitives=[dict(attributes=dict(POSITION=s_pos, NORMAL=s_nrm, TEXCOORD_0=s_uv), indices=s_idx, material=1)])]
    i_arms = len(nodes)
    nodes.append(dict(name="arms", mesh=0, skin=0))
    i_sword = len(nodes)
    nodes.append(dict(name="greatsword", mesh=1))
    nodes[index["weapon"]].setdefault("children", []).append(i_sword)
    skins = [dict(name="arms", joints=list(range(len(names))), inverseBindMatrices=a_ibm, skeleton=index["root"])]

    # --- the clips
    animations = []
    fov = 2 * np.degrees(np.arctan(1 / (1.6 * swings.ZOOM)))
    meta = dict(combo=[f"great_{c}" for c in swings.COMBO], lines=swings.LINES, clips={}, view=dict(fov=float(fov), near=0.10))
    for cname, (path_, sol) in clips.items():
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

        rotation("weapon", sol["sword_R"])
        translation("weapon", sol["sword_p"])
        for s in "RL":
            A = sol[s]
            arm = arms[s]
            rotation(f"upperarm_{s}", A["Ru"])
            translation(f"upperarm_{s}", A["S"])
            rotation(f"forearm_{s}", np.swapaxes(A["Ru"], -1, -2) @ A["Rf"])
            rotation(f"hand_{s}", np.swapaxes(A["Rf"], -1, -2) @ A["Rh"])
            for k, frac in ((1, 1 / 3), (2, 2 / 3)):
                rotation(f"forearm_twist{k}_{s}", swings.rot_about((0, 1, 0), A["twist"] * frac))
        animations.append(dict(name=cname, samplers=samplers_, channels=channels))
        ev = dict(duration=float(T[-1]), loop=path_["hit"] is None)
        if path_["hit"] is not None:
            ev.update(hit=float(T[path_["hit"]]), wind=float(T[path_["wind"]]), through=float(T[path_["end"]]))
        meta["clips"][cname] = ev

    meta["sword"] = dict(id="greatsword", tip=swings.TIP, from_="Bellmourn2 templates/models/items/twohand/greatsword")
    gltf = dict(asset=dict(version="2.0", generator="bm tools/fp_arms/build.py"), scene=0,
                scenes=[dict(name="arms_2h", nodes=[index["root"], i_arms], extras=meta)],
                nodes=nodes, meshes=meshes, skins=skins, materials=materials, textures=textures, samplers=samplers,
                images=images, animations=animations, accessors=g.accessors, bufferViews=g.views,
                buffers=[dict(byteLength=0)])
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
    with open(os.path.join(BUILD, "report.json"), "w") as f:
        json.dump(report, f, indent=1)
    print(f"wrote {OUT}: {total / 1e6:.2f} MB, {len(names)} joints, {len(V)} verts, {len(tris)} faces, {len(clips)} clips")
    for k, r in report.items():
        print(f"{k:7s} {r['duration']:.2f}s hit@{r['hit_time']:.3f} tip NDC at hit ({r['tip_ndc_at_hit'][0]:+.4f},{r['tip_ndc_at_hit'][1]:+.4f}) off-plane {r['off_plane_deg']:.3f} deg, "
              f"past {r['blade_past_deg']:.0f} deg, peak {r['peak_deg_s']:.0f} deg/s, biggest speed step {100 * r['max_step_in_speed']:.1f}%, "
              f"wrist bend R{r['wrist_bend_max']['R']:.0f} L{r['wrist_bend_max']['L']:.0f}, twist R{r['wrist_twist_max']['R']:.0f} L{r['wrist_twist_max']['L']:.0f}, "
              f"shoulder moves R{r['shoulder_shift_max']['R']:.2f} L{r['shoulder_shift_max']['L']:.2f}, arms from the eye {r['nearest_eye']:.2f}")


if __name__ == "__main__":
    build()
