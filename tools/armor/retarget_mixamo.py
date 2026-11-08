"""Retarget Mixamo-skeleton clips (Lisandra's) onto the UAL master skeleton, for the clip bank.

Each mapped UAL bone takes the world-space turn its Mixamo partner makes away from that partner's rest pose.
First, though, the UAL bone is laid along the Mixamo rest bone (the shortest turn), so a T-pose source drives an
A-pose target without lifting its arms. Hands are laid by two axes, the fingers and the knuckle line, so a weapon
sits in the fist the way it does in the UAL clips. Fingers keep the UAL rest: the knights close their own fists.

On a clip marked root, the hips' horizontal travel is taken out of the pelvis and handed back as a per-frame
forward distance, so the game moves the body itself and the feet stay planted wherever the clip goes.

A mirrored clip swaps the sides and reflects every turn across the body's middle: a left-handed chop becomes a
right-handed one.
"""
import numpy as np

from rig_to_ual import read_accessor, ual_name, unit, world_matrices  # noqa: E402

AIM = {
    "pelvis": "spine_01", "spine_01": "spine_02", "spine_02": "spine_03", "spine_03": "neck_01", "neck_01": "Head",
}
for _s in "lr":
    AIM.update({f"clavicle_{_s}": f"upperarm_{_s}", f"upperarm_{_s}": f"lowerarm_{_s}", f"lowerarm_{_s}": f"hand_{_s}",
                f"hand_{_s}": f"middle_01_{_s}", f"thigh_{_s}": f"calf_{_s}", f"calf_{_s}": f"foot_{_s}",
                f"foot_{_s}": f"ball_{_s}", f"ball_{_s}": f"ball_leaf_{_s}"})
MIX_EXTRA = {"middle_01_l": "LeftHandMiddle1", "middle_01_r": "RightHandMiddle1",
             "index_01_l": "LeftHandIndex1", "index_01_r": "RightHandIndex1",
             "pinky_01_l": "LeftHandPinky1", "pinky_01_r": "RightHandPinky1"}


def q2m(q):
    """Quaternions [..., 4] (x, y, z, w) to rotation matrices [..., 3, 3]."""
    x, y, z, w = q[..., 0], q[..., 1], q[..., 2], q[..., 3]
    m = np.empty(q.shape[:-1] + (3, 3))
    m[..., 0, 0] = 1 - 2 * (y * y + z * z); m[..., 0, 1] = 2 * (x * y - z * w); m[..., 0, 2] = 2 * (x * z + y * w)
    m[..., 1, 0] = 2 * (x * y + z * w); m[..., 1, 1] = 1 - 2 * (x * x + z * z); m[..., 1, 2] = 2 * (y * z - x * w)
    m[..., 2, 0] = 2 * (x * z - y * w); m[..., 2, 1] = 2 * (y * z + x * w); m[..., 2, 2] = 1 - 2 * (x * x + y * y)
    return m


def m2q(m):
    """Rotation matrices [n, 3, 3] to quaternions [n, 4], continuous in sign along n."""
    n = m.shape[0]
    q = np.empty((n, 4))
    t = m[:, 0, 0] + m[:, 1, 1] + m[:, 2, 2]
    for i in range(n):
        a = m[i]
        if t[i] > 0:
            s = np.sqrt(t[i] + 1) * 2
            q[i] = [(a[2, 1] - a[1, 2]) / s, (a[0, 2] - a[2, 0]) / s, (a[1, 0] - a[0, 1]) / s, 0.25 * s]
        elif a[0, 0] > a[1, 1] and a[0, 0] > a[2, 2]:
            s = np.sqrt(1 + a[0, 0] - a[1, 1] - a[2, 2]) * 2
            q[i] = [0.25 * s, (a[0, 1] + a[1, 0]) / s, (a[0, 2] + a[2, 0]) / s, (a[2, 1] - a[1, 2]) / s]
        elif a[1, 1] > a[2, 2]:
            s = np.sqrt(1 + a[1, 1] - a[0, 0] - a[2, 2]) * 2
            q[i] = [(a[0, 1] + a[1, 0]) / s, 0.25 * s, (a[1, 2] + a[2, 1]) / s, (a[0, 2] - a[2, 0]) / s]
        else:
            s = np.sqrt(1 + a[2, 2] - a[0, 0] - a[1, 1]) * 2
            q[i] = [(a[0, 2] + a[2, 0]) / s, (a[1, 2] + a[2, 1]) / s, 0.25 * s, (a[1, 0] - a[0, 1]) / s]
    q /= np.linalg.norm(q, axis=1, keepdims=True)
    for i in range(1, n):
        if q[i] @ q[i - 1] < 0:
            q[i] = -q[i]
    return q


def ortho(m):
    u, _, vt = np.linalg.svd(m[:3, :3])
    return u @ vt


def arc(u, v):
    u, v = unit(u), unit(v)
    c = float(u @ v)
    x = np.cross(u, v)
    if c < -0.9999:
        return -np.eye(3)
    k = np.array([[0, -x[2], x[1]], [x[2], 0, -x[0]], [-x[1], x[0], 0]])
    return np.eye(3) + k + k @ k / (1 + c)


def frame(a, b):
    """Right-handed basis with a as its first axis and b in its first two."""
    x = unit(a)
    z = unit(np.cross(x, b))
    return np.stack([x, np.cross(z, x), z], 1)


def facing(pos, left, right, up=np.array([0.0, 1.0, 0.0])):
    l = pos[left] - pos[right]
    l = unit(l - up * (l @ up))
    return np.cross(l, up), l


class Source:
    """A Mixamo GLB: rest pose and per-frame world rotations and positions of its joints."""

    def __init__(self, g, blob):
        self.g, self.blob = g, blob
        nodes = g["nodes"]
        self.ids = {n.get("name"): i for i, n in enumerate(nodes)}
        self.parent = {}
        for i, n in enumerate(nodes):
            for c in n.get("children", []):
                self.parent[c] = i
        self.order = []
        roots = [i for i in range(len(nodes)) if i not in self.parent]

        def walk(i):
            self.order.append(i)
            for c in nodes[i].get("children", []):
                walk(c)
        for r in roots:
            walk(r)
        W = world_matrices(g)
        self.rest_pos = {i: W[i][:3, 3].copy() for i in W}
        self.rest_rot = {i: ortho(W[i]) for i in W}
        self.anims = {a["name"]: a for a in g.get("animations", [])}

    def node(self, mix):
        return self.ids.get("mixamorig:" + mix)

    def sample(self, name, fps=30, start=0.0, end=None):
        """World rotations [n,3,3] and positions [n,3] of every node, on a uniform grid."""
        g, blob, nodes = self.g, self.blob, self.g["nodes"]
        anim = self.anims[name]
        tracks = {}
        dur = 0.0
        for c in anim["channels"]:
            s = anim["samplers"][c["sampler"]]
            t = read_accessor(g, blob, s["input"])
            dur = max(dur, float(t[-1]))
            tracks[(c["target"]["node"], c["target"]["path"])] = (t, read_accessor(g, blob, s["output"]).astype(float))
        end = dur if end is None else min(end, dur)
        n = max(2, int(round((end - start) * fps)) + 1)
        grid = np.linspace(start, end, n)
        rot, pos = {}, {}
        for i in self.order:
            nd = nodes[i]
            if "matrix" in nd:
                M = np.array(nd["matrix"], float).reshape(4, 4).T
                lr = np.repeat(ortho(M)[None], n, 0)
                lt = np.repeat(M[:3, 3][None], n, 0)
                sc = np.linalg.norm(M[:3, :3], axis=0)
            else:
                q = tracks.get((i, "rotation"))
                if q is not None:
                    v = q[1].copy()
                    for k in range(1, len(v)):
                        if v[k] @ v[k - 1] < 0:
                            v[k] = -v[k]
                    r = np.stack([np.interp(grid, q[0], v[:, k]) for k in range(4)], 1)
                    lr = q2m(r / np.linalg.norm(r, axis=1, keepdims=True))
                else:
                    lr = np.repeat(q2m(np.array(nd.get("rotation", [0, 0, 0, 1]), float))[None], n, 0)
                tt = tracks.get((i, "translation"))
                lt = (np.stack([np.interp(grid, tt[0], tt[1][:, k]) for k in range(3)], 1) if tt is not None
                      else np.repeat(np.array(nd.get("translation", [0, 0, 0]), float)[None], n, 0))
                sc = np.array(nd.get("scale", [1, 1, 1]), float)
            p = self.parent.get(i)
            if p is None:
                rot[i] = lr
                pos[i] = lt
                self._scale = {i: sc}
            else:
                ps = self._scale[p]
                # Scale is uniform on these rigs (the armature's 0.01), so it only shrinks what hangs below it.
                rot[i] = rot[p] @ lr
                pos[i] = pos[p] + np.einsum("nij,nj->ni", rot[p], lt * ps)
                self._scale[i] = ps * sc
        return rot, pos, n, end - start


def retarget(master_g, master_blob, skeleton, src, spec, fps=30):
    """Local UAL rotations [n, J, 4], pelvis translations [n, 3] (pelvis parent space) and forward travel [n]."""
    names = [b["name"] for b in skeleton]
    J = len(names)
    idx = {n: i for i, n in enumerate(names)}
    mnodes = master_g["nodes"]
    mids = {n.get("name"): i for i, n in enumerate(mnodes)}
    MW = world_matrices(master_g)
    u_rot = {n: ortho(MW[mids[n]]) for n in names}
    u_pos = {n: MW[mids[n]][:3, 3].copy() for n in names}
    root_parent = None
    for i, nd in enumerate(mnodes):
        if mids["root"] in nd.get("children", []):
            root_parent = i
    P = MW[root_parent] if root_parent is not None else np.eye(4)
    P_rot = ortho(P)

    mirror = spec.get("mirror", False)

    def mix_of(u):
        """The Mixamo node for a UAL joint, with sides swapped on a mirrored clip."""
        mname = None
        for i, nd in enumerate(src.g["nodes"]):
            if ual_name(nd.get("name", "")) == u:
                mname = nd["name"]
        if mname is None and u in MIX_EXTRA:
            mname = "mixamorig:" + MIX_EXTRA[u]
        if mname is None:
            return None
        if mirror:
            mname = mname.replace("Left", "\0").replace("Right", "Left").replace("\0", "Right")
        return src.ids.get(mname)

    # Facing of each model at rest, and the turn that brings the source round to the master.
    u_fwd, u_left = facing(u_pos, "thigh_l", "thigh_r")
    sp = {k: src.rest_pos[v] for k, v in (("l", src.node("LeftUpLeg")), ("r", src.node("RightUpLeg")))}
    m_fwd, m_left = facing(sp, "l", "r")
    Y = frame(u_fwd, np.array([0.0, 1.0, 0.0])) @ frame(m_fwd, np.array([0.0, 1.0, 0.0])).T
    M = np.eye(3) - 2 * np.outer(m_left, m_left) if mirror else np.eye(3)

    def src_dir(a, b):
        return Y @ (M @ (src.rest_pos[b] - src.rest_pos[a]))

    rot, pos, n, dur = src.sample(spec["src"], fps, spec.get("start", 0.0), spec.get("end"))
    world = {}
    out = np.zeros((n, J, 4))
    for j, b in enumerate(skeleton):
        name = b["name"]
        pj = b["parent"]
        mj = mix_of(name)
        child = AIM.get(name)
        if mj is not None and child is not None and mix_of(child) is not None:
            mc = mix_of(child)
            d_u = u_pos[child] - u_pos[name]
            d_m = src_dir(mj, mc)
            if name.startswith("hand_"):
                s = name[-1]
                k_u = u_pos[f"index_01_{s}"] - u_pos[f"pinky_01_{s}"]
                k_m = src_dir(mix_of(f"pinky_01_{s}"), mix_of(f"index_01_{s}"))
                A = frame(d_m, k_m) @ frame(d_u, k_u).T
            else:
                A = arc(d_u, d_m)
            R_rest_m = M @ src.rest_rot[mj] @ M
            D = np.einsum("ij,njk,kl->nil", M, rot[mj], M) @ R_rest_m.T
            D = np.einsum("ij,njk,lk->nil", Y, D, Y)
            W = D @ (A @ u_rot[name])
        else:
            W = None
        parentW = world[skeleton[pj]["name"]] if pj >= 0 else np.repeat(P_rot[None], n, 0)
        if W is None:
            W = parentW @ q2m(np.array(b["r"], float))
        world[name] = W
        L = np.einsum("nji,njk->nik", parentW, W)
        out[:, j] = m2q(L)

    # The pelvis: the hips' path, scaled to the master's leg, less the horizontal travel.
    hips = src.node("Hips")
    toe = src.node("LeftToe_End") or src.node("LeftToeBase")
    ground_m = min(src.rest_pos[toe][1], src.rest_pos[src.node("RightToe_End") or src.node("RightToeBase")][1])
    scale = (u_pos["pelvis"][1] - min(u_pos["ball_leaf_l"][1], u_pos["ball_leaf_r"][1])) / (src.rest_pos[hips][1] - ground_m)
    delta = np.einsum("ij,nj->ni", Y @ M, pos[hips] - src.rest_pos[hips]) * scale
    up = np.array([0.0, 1.0, 0.0])
    horiz = delta - np.outer(delta @ up, up)
    travel = horiz @ u_fwd
    # A clip that goes somewhere hands its journey to the game. The rest keep their hips' sway in the body.
    if not spec.get("root"):
        return out, (np.linalg.inv(MW[mids["root"]])[:3, :3] @ (u_pos["pelvis"][None] + delta).T).T + np.linalg.inv(MW[mids["root"]])[:3, 3], None, n, dur
    flat = delta - horiz
    pw = u_pos["pelvis"][None] + flat
    root_w = MW[mids["root"]]
    inv = np.linalg.inv(root_w)
    pel = (inv[:3, :3] @ pw.T).T + inv[:3, 3]
    return out, pel, travel - travel[0], n, dur
