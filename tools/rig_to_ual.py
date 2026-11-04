"""Move a Tripo (Mixamo-named) rigged GLB onto the UAL master skeleton.

Writes a GLB with the source mesh, materials and textures, the master's joints,
hierarchy and rest rotations, and all of its clips.

The mesh keeps its modelled pose as the bind pose, which the inverse bind
matrices record, so nothing is re-skinned or baked into a T-pose. Clip rotations
are copied byte for byte. Node translations are refit to the model's proportions
and pelvis motion is scaled to its leg length, so feet stay on the ground.

Hands: Tripo places wrist and finger joints unreliably on closed fists, so finger
weights collapse onto the hand and the wrist is re-derived from the mesh. The UAL
finger joints are kept but carry no weight.

Usage: python rig_to_ual.py SOURCE.glb UAL_Master_Skeleton.glb OUT.glb --height 1.8
"""
import argparse
import hashlib
import json
import struct

import numpy as np

COMPONENT = {5126: "f4", 5125: "u4", 5123: "u2", 5121: "u1"}
COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}

CORE_MAP = {
    "Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03",
    "Neck": "neck_01", "Head": "Head",
}
SIDE_MAP = {
    "Shoulder": "clavicle", "Arm": "upperarm", "ForeArm": "lowerarm", "Hand": "hand",
    "UpLeg": "thigh", "Leg": "calf", "Foot": "foot", "ToeBase": "ball", "Toe_End": "ball_leaf",
}
AIM_CHILD = {
    "pelvis": "spine_01", "spine_01": "spine_02", "spine_02": "spine_03", "spine_03": "neck_01",
    "neck_01": "Head",
}
for s in "lr":
    AIM_CHILD.update({
        f"clavicle_{s}": f"upperarm_{s}", f"upperarm_{s}": f"lowerarm_{s}", f"lowerarm_{s}": f"hand_{s}",
        f"thigh_{s}": f"calf_{s}", f"calf_{s}": f"foot_{s}", f"foot_{s}": f"ball_{s}", f"ball_{s}": f"ball_leaf_{s}",
    })
FINGERS = ("index", "middle", "pinky", "ring", "thumb")
FIST_LENGTH = 0.095  # wrist to knuckles, as a fraction of model height
WRIST_BLEND = 0.012  # half-width of the wrist weight blend, same units
GROUND_CLIP = "Idle_Loop"


def load_glb(path):
    with open(path, "rb") as f:
        raw = f.read()
    length = struct.unpack_from("<I", raw, 12)[0]
    return json.loads(raw[20:20 + length]), raw[28 + length:]


def read_accessor(g, blob, index):
    a = g["accessors"][index]
    bv = g["bufferViews"][a["bufferView"]]
    n = COUNT[a["type"]]
    data = np.frombuffer(blob, "<" + COMPONENT[a["componentType"]], a["count"] * n,
                         bv.get("byteOffset", 0) + a.get("byteOffset", 0))
    return data.reshape(-1, n) if n > 1 else data


def quat_matrix(q):
    x, y, z, w = q
    return np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ])


def node_matrix(n):
    if "matrix" in n:
        return np.array(n["matrix"], dtype=float).reshape(4, 4).T
    m = np.eye(4)
    m[:3, :3] = quat_matrix(n.get("rotation", (0, 0, 0, 1))) @ np.diag(n.get("scale", (1, 1, 1)))
    m[:3, 3] = n.get("translation", (0, 0, 0))
    return m


def world_matrices(g):
    out = {}

    def walk(i, parent):
        out[i] = parent @ node_matrix(g["nodes"][i])
        for c in g["nodes"][i].get("children", []):
            walk(c, out[i])

    for root in g["scenes"][g.get("scene", 0)]["nodes"]:
        walk(root, np.eye(4))
    return out


def unit(v):
    return v / np.linalg.norm(v)


def arc(u, v):
    """Shortest rotation taking direction u to direction v."""
    u, v = unit(u), unit(v)
    c = float(u @ v)
    if c < -0.9999:
        raise ValueError("cannot align opposite directions")
    x = np.cross(u, v)
    k = np.array([[0, -x[2], x[1]], [x[2], 0, -x[0]], [-x[1], x[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def smoothstep(x):
    t = np.clip(x, 0, 1)
    return t * t * (3 - 2 * t)


def ual_name(mixamo):
    name = mixamo.replace("mixamorig:", "")
    if name in CORE_MAP:
        return CORE_MAP[name]
    for side, s in (("Left", "l"), ("Right", "r")):
        if name.startswith(side) and name[len(side):] in SIDE_MAP:
            return f"{SIDE_MAP[name[len(side):]]}_{s}"
    return None


class Packer:
    """Accumulates accessors, sharing buffer views between identical byte runs."""

    def __init__(self):
        self.blob, self.views, self.accessors, self.seen = bytearray(), [], [], {}

    def add(self, data, component, kind, target=None, bounds=False):
        raw = data.astype("<" + COMPONENT[component]).tobytes()
        key = hashlib.sha1(raw).digest() + bytes([target is not None])
        if key not in self.seen:
            self.blob.extend(b"\0" * (-len(self.blob) % 4))
            view = {"buffer": 0, "byteOffset": len(self.blob), "byteLength": len(raw)}
            if target:
                view["target"] = target
            self.blob.extend(raw)
            self.views.append(view)
            self.seen[key] = len(self.views) - 1
        n = COUNT[kind]
        acc = {"bufferView": self.seen[key], "componentType": component, "count": len(raw) // (n * int(COMPONENT[component][1])), "type": kind}
        if bounds:
            flat = data.reshape(-1, n)
            acc["min"] = [float(x) for x in flat.min(0)]
            acc["max"] = [float(x) for x in flat.max(0)]
        self.accessors.append(acc)
        return len(self.accessors) - 1

    def add_image(self, raw):
        self.blob.extend(b"\0" * (-len(self.blob) % 4))
        self.views.append({"buffer": 0, "byteOffset": len(self.blob), "byteLength": len(raw)})
        self.blob.extend(raw)
        return len(self.views) - 1


def bake_bind_mesh(g, blob, prim, worlds):
    """Vertices and normals where the source skin actually places them."""
    skin = g["skins"][0]
    ibm = read_accessor(g, blob, skin["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1)
    mats = np.array([worlds[j] @ ibm[i] for i, j in enumerate(skin["joints"])])
    spread = np.abs(mats - mats[0]).max()
    if spread > 1e-3:
        raise ValueError(f"source joints are not in their bind pose (spread {spread:.4f})")
    m = mats[0]
    pos = read_accessor(g, blob, prim["attributes"]["POSITION"]) @ m[:3, :3].T + m[:3, 3]
    nrm = read_accessor(g, blob, prim["attributes"]["NORMAL"]) @ np.linalg.inv(m[:3, :3])
    return pos, nrm / np.linalg.norm(nrm, axis=1, keepdims=True)


def remap_weights(src_names, joints, weights, ual_joints):
    """Per-vertex weights over UAL joints, as a (vertices, joints) matrix."""
    index = {n: i for i, n in enumerate(ual_joints)}
    lookup = np.zeros(len(src_names), dtype=int)
    for i, name in enumerate(src_names):
        short = name.replace("mixamorig:", "")
        if short.startswith(("LeftHand", "RightHand")):
            lookup[i] = index[f"hand_{'l' if short.startswith('Left') else 'r'}"]
        else:
            target = ual_name(name)
            if target is None:
                raise ValueError(f"no UAL joint for {name}")
            lookup[i] = index[target]
    full = np.zeros((len(joints), len(ual_joints)))
    rows = np.repeat(np.arange(len(joints)), joints.shape[1])
    np.add.at(full, (rows, lookup[joints.ravel()]), weights.ravel())
    return full


def fit_hand(pos, full, index, elbow, side, height):
    """Find the fist from the mesh and re-blend forearm/hand weights across its wrist."""
    fore, hand = index[f"lowerarm_{side}"], index[f"hand_{side}"]
    share = full[:, fore] + full[:, hand]
    axis = unit(pos[full[:, hand] > 0.25].mean(0) - elbow)
    arm = share > 0.5
    tip = (pos[arm] - elbow) @ axis
    far = tip.max()
    length = FIST_LENGTH * height
    fist = pos[arm][tip > far - length]
    center = fist.mean(0)
    direction = unit(center - elbow)
    wrist = center - direction * length * 0.5

    rel = pos - wrist
    along = rel @ direction
    radial = np.linalg.norm(rel - np.outer(along, direction), axis=1)
    reach = length * 0.9
    s = smoothstep((along + WRIST_BLEND * height) / (2 * WRIST_BLEND * height))
    s[radial > reach] = 0
    affected = share > 0
    full[affected, hand] = share[affected] * s[affected]
    full[affected, fore] = share[affected] * (1 - s[affected])
    return wrist, center


def top_four(full):
    order = np.argsort(-full, axis=1)[:, :4]
    weights = np.take_along_axis(full, order, axis=1)
    weights /= weights.sum(1, keepdims=True)
    return order, weights


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("source")
    ap.add_argument("master")
    ap.add_argument("output")
    ap.add_argument("--height", type=float, required=True, help="model height in metres")
    ap.add_argument("--name", default="Monster")
    args = ap.parse_args()

    src, src_blob = load_glb(args.source)
    ual, ual_blob = load_glb(args.master)
    prim = src["meshes"][0]["primitives"][0]
    src_worlds = world_matrices(src)
    ual_worlds = world_matrices(ual)
    src_nodes, ual_nodes = src["nodes"], ual["nodes"]
    src_joint_names = [src_nodes[j]["name"] for j in src["skins"][0]["joints"]]
    ual_joints = [ual_nodes[j]["name"] for j in ual["skins"][0]["joints"]]
    ual_id = {n["name"]: i for i, n in enumerate(ual_nodes)}
    parent = {}
    for n in ual_nodes:
        for c in n.get("children", []):
            parent[ual_nodes[c]["name"]] = n["name"]

    pos, nrm = bake_bind_mesh(src, src_blob, prim, src_worlds)
    floor = pos[:, 1].min()
    scale = args.height / (pos[:, 1].max() - floor)
    pos = (pos - np.array([0, floor, 0])) * scale

    # Bind positions of the source joints, by UAL name.
    target = {}
    for i, n in enumerate(src_nodes):
        name = ual_name(n.get("name", ""))
        if name and i in src_worlds:
            target[name] = (src_worlds[i][:3, 3] - np.array([0, floor, 0])) * scale
    target["root"] = np.zeros(3)

    index = {n: i for i, n in enumerate(ual_joints)}
    full = remap_weights(src_joint_names, read_accessor(src, src_blob, prim["attributes"]["JOINTS_0"]),
                         read_accessor(src, src_blob, prim["attributes"]["WEIGHTS_0"]), ual_joints)
    fists = {}
    for s in "lr":
        target[f"hand_{s}"], fists[s] = fit_hand(pos, full, index, target[f"lowerarm_{s}"], s, args.height)
    order, weights = top_four(full)

    # Master rest frames and joint positions.
    rest_rot = {n: ual_worlds[ual_id[n]][:3, :3] for n in ual_joints}
    rest_pos = {n: ual_worlds[ual_id[n]][:3, 3] for n in ual_joints}

    # Aim each bone from its T-pose direction to where it runs in the model.
    align = {"root": np.eye(3), "Head": np.eye(3)}
    for name, child in AIM_CHILD.items():
        align[name] = arc(rest_pos[child] - rest_pos[name], target[child] - target[name])
    hand_scale = 0
    for s in "lr":
        ref = rest_pos[f"middle_01_{s}"] - rest_pos[f"hand_{s}"]
        align[f"hand_{s}"] = arc(ref, fists[s] - target[f"hand_{s}"])
        hand_scale += np.linalg.norm(fists[s] - target[f"hand_{s}"]) / np.linalg.norm(ref) / 2
    for joint in ual_joints:
        if joint not in align:  # fingers and thumb ride rigidly on the hand
            s = joint[-1]
            hand = f"hand_{s}"
            align[joint] = align[hand]
            target[joint] = target[hand] + align[hand] @ (rest_pos[joint] - rest_pos[hand]) * hand_scale

    bind_rot = {n: align[n] @ rest_rot[n] for n in ual_joints}

    # Rest translations keep each joint's offset from its parent in the parent's bind frame.
    rest_t = {}
    for name in ual_joints:
        p = parent.get(name)
        if name == "root" or p not in index:
            rest_t[name] = np.array(ual_nodes[ual_id[name]].get("translation", (0, 0, 0)), dtype=float)
        else:
            rest_t[name] = bind_rot[p].T @ (target[name] - target[p])

    # Legs straighten between the bind pose and the T-pose: lift the pelvis to keep feet down.
    def fk_position(joint):
        chain = []
        while joint in index:
            chain.append(joint)
            joint = parent.get(joint)
        m = np.eye(4)
        for j in reversed(chain):
            local = np.eye(4)
            local[:3, :3] = quat_matrix(ual_nodes[ual_id[j]].get("rotation", (0, 0, 0, 1)))
            local[:3, 3] = rest_t[j]
            m = m @ local
        return m[:3, 3]

    root_rot = rest_rot["root"]
    drop = np.mean([target[f"ball_{s}"][1] - fk_position(f"ball_{s}")[1] for s in "lr"])
    rest_t["pelvis"] = rest_t["pelvis"] + root_rot.T @ np.array([0, drop, 0])
    pelvis_height = fk_position("pelvis")[1]
    motion_scale = pelvis_height / rest_pos["pelvis"][1]

    ibm = []
    for name in ual_joints:
        m = np.eye(4)
        m[:3, :3] = bind_rot[name]
        m[:3, 3] = target[name]
        ibm.append(np.linalg.inv(m))

    # Rest the soles on the floor as they land in the idle, which the joints alone can't tell us.
    pelvis_rest = np.array(ual_nodes[ual_id["pelvis"]]["translation"])
    idle = next(a for a in ual["animations"] if a["name"] == GROUND_CLIP)
    pose = {}
    for c in idle["channels"]:
        pose[(ual_nodes[c["target"]["node"]]["name"], c["target"]["path"])] = \
            read_accessor(ual, ual_blob, idle["samplers"][c["sampler"]]["output"])[0]
    posed = {}
    skin_mats = np.zeros((len(ual_joints), 4, 4))
    for i, name in enumerate(ual_joints):
        local = np.eye(4)
        local[:3, :3] = quat_matrix(pose.get((name, "rotation"), ual_nodes[ual_id[name]].get("rotation", (0, 0, 0, 1))))
        local[:3, 3] = rest_t[name]
        if name == "pelvis":
            local[:3, 3] = rest_t[name] + (pose[(name, "translation")] - pelvis_rest) * motion_scale
        posed[name] = (posed[parent[name]] if parent.get(name) in posed else np.eye(4)) @ local
        skin_mats[i] = posed[name] @ ibm[i]
    homogeneous = np.c_[pos, np.ones(len(pos))]
    skinned = np.einsum("vi,vijk,vk->vj", weights, skin_mats[order], homogeneous)
    rest_t["pelvis"] = rest_t["pelvis"] + root_rot.T @ np.array([0, -skinned[:, 1].min(), 0])

    pk = Packer()
    out_nodes = []
    new_id = {}
    for n in ual_nodes:
        new_id[n["name"]] = len(out_nodes)
        node = dict(n)
        if n["name"] in rest_t:
            node["translation"] = [float(x) for x in rest_t[n["name"]]]
        node.pop("scale", None)
        out_nodes.append(node)
    armature = next(i for i, n in enumerate(out_nodes) if n["name"] == "Armature")
    mesh_node = len(out_nodes)
    out_nodes.append({"name": args.name, "mesh": 0, "skin": 0})
    out_nodes[armature]["children"] = list(out_nodes[armature].get("children", [])) + [mesh_node]

    ibm_acc = pk.add(np.array([m.T.ravel() for m in ibm]), 5126, "MAT4")

    attrs = {
        "POSITION": pk.add(pos, 5126, "VEC3", 34962, bounds=True),
        "NORMAL": pk.add(nrm, 5126, "VEC3", 34962),
        "TEXCOORD_0": pk.add(read_accessor(src, src_blob, prim["attributes"]["TEXCOORD_0"]), 5126, "VEC2", 34962),
        "JOINTS_0": pk.add(order, 5123, "VEC4", 34962),
        "WEIGHTS_0": pk.add(weights, 5126, "VEC4", 34962),
    }
    indices = pk.add(read_accessor(src, src_blob, prim["indices"]), 5125, "SCALAR", 34963)

    images = []
    for img in src["images"]:
        bv = src["bufferViews"][img["bufferView"]]
        off = bv.get("byteOffset", 0)
        images.append({"name": img.get("name", "image"), "mimeType": img["mimeType"],
                       "bufferView": pk.add_image(src_blob[off:off + bv["byteLength"]])})

    animations = []
    for anim in ual["animations"]:
        channels, samplers = [], []
        for c in anim["channels"]:
            s = anim["samplers"][c["sampler"]]
            name = ual_nodes[c["target"]["node"]]["name"]
            path = c["target"]["path"]
            values = read_accessor(ual, ual_blob, s["output"])
            if path == "scale":
                if np.abs(values - 1).max() > 1e-3:
                    raise ValueError(f"{anim['name']}: scale animated on {name}")
                continue
            if path == "translation":
                if name != "pelvis":
                    rest = np.array(ual_nodes[c["target"]["node"]].get("translation", (0, 0, 0)))
                    if np.abs(values - rest).max() > 1e-3:
                        raise ValueError(f"{anim['name']}: translation animated on {name}")
                    continue
                values = rest_t["pelvis"] + (values - pelvis_rest) * motion_scale
            samplers.append({
                "input": pk.add(read_accessor(ual, ual_blob, s["input"]), 5126, "SCALAR", bounds=True),
                "interpolation": s.get("interpolation", "LINEAR"),
                "output": pk.add(values, 5126, "VEC4" if path == "rotation" else "VEC3"),
            })
            channels.append({"sampler": len(samplers) - 1, "target": {"node": new_id[name], "path": path}})
        animations.append({"name": anim["name"], "channels": channels, "samplers": samplers})

    out = {
        "asset": {"version": "2.0", "generator": "bm/tools/rig_to_ual.py"},
        "scene": 0,
        "scenes": [{"name": "Scene", "nodes": ual["scenes"][ual.get("scene", 0)]["nodes"]}],
        "nodes": out_nodes,
        "meshes": [{"name": args.name, "primitives": [{"attributes": attrs, "indices": indices, "material": 0, "mode": 4}]}],
        "skins": [{"name": "Armature", "joints": [new_id[n] for n in ual_joints], "inverseBindMatrices": ibm_acc}],
        "animations": animations,
        "materials": src["materials"],
        "textures": src["textures"],
        "samplers": src.get("samplers", []),
        "images": images,
        "accessors": pk.accessors,
        "bufferViews": pk.views,
        "buffers": [{"byteLength": len(pk.blob)}],
    }
    js = json.dumps(out, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    body = bytes(pk.blob) + b"\0" * (-len(pk.blob) % 4)
    with open(args.output, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, 28 + len(js) + len(body)))
        f.write(struct.pack("<I4s", len(js), b"JSON") + js)
        f.write(struct.pack("<I4s", len(body), b"BIN\0") + body)

    print(f"scale {scale:.3f}, pelvis height {pelvis_height:.3f}, pelvis motion scale {motion_scale:.3f}")
    print(f"wrists l={np.round(target['hand_l'], 3)} r={np.round(target['hand_r'], 3)}")
    print(f"{len(animations)} clips, {(28 + len(js) + len(body)) / 1048576:.2f} MB -> {args.output}")


if __name__ == "__main__":
    main()
