"""How a hero's armour holds together when it moves: holes you can see through, and what shows in the gaps.

Each body (assets/game/heroes/<id>.glb) is posed with the game's own clips (clips.json/.bin, as src/sim/anim.js samples
them), skinned the way the GPU skins it (dual quaternions), and splatted into an orthographic z-buffer from several sides.
For each view it counts, inside the body's outline:

  hole    nothing at all, within a bone's own volume: the sky through the body (not the air between an arm and the ribs)
  inside  the back of a plate: looking into its shell from where it's parted from the next
  mail    the mail sleeves under the plates (rig_armor.py add_sleeves): a gap, covered
  skin    the rest

and writes a picture of each, the parts coloured by what they are, for looking over.

Usage: python tools/heroes/gaps.py [ids...] [--out DIR] [--poses idle,crouch,...] [--res N] [--dir GLB_DIR]
"""
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
HEROES = os.path.join(ROOT, "assets", "game", "heroes")

# Poses: a clip, and how far into it.
POSES = {
    "idle": ("Idle_Loop", 0.3),
    "crouch": ("Crouch_Idle_Loop", 0.5),
    "attack": ("Sword_Attack", 0.42),
    "run": ("Sprint_Loop", 0.3),
    "cheer": ("LP_cheer", 0.5),
    "kick": ("LP_front_kick_01", 0.45),
}
# Views about the body, by yaw (0: from the front).
VIEWS = {"front": 0.0, "side": np.pi / 2, "back": np.pi, "left": -np.pi / 2}


def load_glb(path):
    data = open(path, "rb").read()
    n = struct.unpack_from("<I", data, 12)[0]
    g = json.loads(data[20:20 + n])
    blob = data[20 + n + 8:]
    return g, blob


def accessor(g, blob, i):
    a = g["accessors"][i]
    bv = g["bufferViews"][a["bufferView"]]
    comp = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a["componentType"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}[a["type"]]
    off = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
    count = a["count"]
    stride = bv.get("byteStride")
    item = np.dtype(comp).itemsize * width
    if stride and stride != item:
        raw = np.frombuffer(blob, np.uint8, count * stride, off).reshape(count, stride)[:, :item]
        return np.frombuffer(raw.tobytes(), comp).reshape(count, width)
    out = np.frombuffer(blob, comp, count * width, off)
    return out.reshape(count, width) if width > 1 else out


def qmul(a, b):
    ax, ay, az, aw = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    bx, by, bz, bw = b[..., 0], b[..., 1], b[..., 2], b[..., 3]
    return np.stack([aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
                     aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz], -1)


def qrot(q, v):
    u, w = q[..., :3], q[..., 3:4]
    t = 2 * np.cross(u, v)
    return v + w * t + np.cross(u, t)


def mat_to_quat(m):
    t = np.trace(m)
    if t > 0:
        s = np.sqrt(t + 1) * 2
        return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, 0.25 * s])
    i = int(np.argmax([m[0, 0], m[1, 1], m[2, 2]]))
    j, k = (i + 1) % 3, (i + 2) % 3
    s = np.sqrt(1 + m[i, i] - m[j, j] - m[k, k]) * 2
    q = np.zeros(4)
    q[i] = 0.25 * s
    q[j] = (m[j, i] + m[i, j]) / s
    q[k] = (m[k, i] + m[i, k]) / s
    q[3] = (m[k, j] - m[j, k]) / s
    return q


class Bank:
    """The heroes' clips, sampled as ClipBank.sample does."""

    def __init__(self):
        self.meta = json.load(open(os.path.join(HEROES, "clips.json")))
        bin_ = open(os.path.join(HEROES, "clips.bin"), "rb").read()
        self.rot = np.frombuffer(bin_, np.int16, self.meta["pelvisByteOffset"] // 2).astype(np.float32) / 32767
        self.names = [s["name"] for s in self.meta["skeleton"]]

    def sample(self, name, frac):
        c = self.meta["clips"][name]
        last = c["frames"] - 1
        f = frac * last
        i = min(int(f), max(0, last - 1))
        a = f - i
        out = {}
        for j, off, still in c["tracks"]:
            if still:
                q = self.rot[off:off + 4]
            else:
                q0, q1 = self.rot[off + i * 4:off + i * 4 + 4], self.rot[off + (i + 1) * 4:off + (i + 1) * 4 + 4]
                if np.dot(q0, q1) < 0:
                    q1 = -q1
                q = q0 * (1 - a) + q1 * a
            out[self.names[j]] = q / np.linalg.norm(q)
        return out


class Body:
    def __init__(self, path):
        g, blob = load_glb(path)
        self.g = g
        prim = g["meshes"][0]["primitives"][0]
        at = prim["attributes"]
        self.pos = accessor(g, blob, at["POSITION"]).astype(np.float64)
        self.nrm = accessor(g, blob, at["NORMAL"]).astype(np.float64)
        self.uv = accessor(g, blob, at["TEXCOORD_0"]).astype(np.float64)
        self.jnt = accessor(g, blob, at["JOINTS_0"]).astype(np.int64)
        self.wt = accessor(g, blob, at["WEIGHTS_0"]).astype(np.float64)
        self.idx = accessor(g, blob, prim["indices"]).reshape(-1, 3).astype(np.int64)
        self.piece = accessor(g, blob, at["_PIECE"]).astype(np.int64).reshape(-1) if "_PIECE" in at else None
        skin = g["skins"][0]
        self.joints = skin["joints"]
        self.ibm = accessor(g, blob, skin["inverseBindMatrices"]).reshape(-1, 4, 4).transpose(0, 2, 1).astype(np.float64)
        nodes = g["nodes"]
        self.jname = [nodes[n].get("name", "") for n in self.joints]
        node_to_j = {n: i for i, n in enumerate(self.joints)}
        self.parent = [-1] * len(self.joints)
        for i, n in enumerate(self.joints):
            for c in nodes[n].get("children", []):
                if c in node_to_j:
                    self.parent[node_to_j[c]] = i
        self.restT = np.array([nodes[n].get("translation", [0, 0, 0]) for n in self.joints], np.float64)
        self.restR = np.array([nodes[n].get("rotation", [0, 0, 0, 1]) for n in self.joints], np.float64)
        ex = g["scenes"][0].get("extras", {})
        self.pieces = ex.get("pieces", [])
        self.height = ex.get("height", 1.8)
        self.kind = np.array([{"plate": 0, "flex": 0, "cloth": 1, "mail": 2}.get(p["kind"], 0) for p in self.pieces] or [0])
        # Each vertex's piece from the table if the attribute's missing.
        if self.piece is None:
            self.piece = np.zeros(len(self.pos), np.int64)
            for k, p in enumerate(self.pieces):
                self.piece[p["vstart"]:p["vstart"] + p["vcount"]] = k
        self.albedo = None
        img = g["images"][g["textures"][g["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]]
        bv = g["bufferViews"][img["bufferView"]]
        import io
        self.albedo = np.asarray(Image.open(io.BytesIO(blob[bv.get("byteOffset", 0):bv.get("byteOffset", 0) + bv["byteLength"]])).convert("RGB"), np.float32) / 255

    def pose(self, rots):
        """World rotation and translation of each joint, the clip's rotations on the body's own bones."""
        n = len(self.joints)
        wq = np.zeros((n, 4)); wt = np.zeros((n, 3))
        for j in range(n):
            q = rots.get(self.jname[j], self.restR[j])
            p = self.parent[j]
            if p < 0:
                wq[j] = q; wt[j] = self.restT[j]
            else:
                wq[j] = qmul(wq[p], q); wt[j] = wt[p] + qrot(wq[p], self.restT[j])
        return wq, wt

    def skin(self, wq, wt):
        """Dual-quaternion skinning, as src/gfx/shaders.js does."""
        n = len(self.joints)
        sq = np.zeros((n, 4)); st = np.zeros((n, 3))
        for j in range(n):
            ib = self.ibm[j]
            iq = mat_to_quat(ib[:3, :3])
            sq[j] = qmul(wq[j], iq)
            st[j] = qrot(wq[j], ib[:3, 3]) + wt[j]
        # dual part: 0.5 * (t, 0) * q
        tq = np.concatenate([st, np.zeros((n, 1))], 1)
        dq = 0.5 * qmul(tq, sq)
        r = sq[self.jnt]; d = dq[self.jnt]              # (V, 4, 4)
        sign = np.sign(np.einsum("vk,vjk->vj", r[:, 0], r))
        sign[sign == 0] = 1
        w = self.wt * sign
        br = np.einsum("vj,vjk->vk", w, r); bd = np.einsum("vj,vjk->vk", w, d)
        L = np.linalg.norm(br, axis=1, keepdims=True)
        br /= L; bd /= L
        p = qrot(br, self.pos)
        t = 2 * qmul(bd, br * np.array([-1, -1, -1, 1]))[:, :3]
        nn = qrot(br, self.nrm)
        return p + t, nn


# The body's own volume, as capsules round its bones: a hole counts only inside one (between an arm and the ribs is air, not
# a gap). (joint, child, radius as a fraction of a 1.9 m body)
BONES = [("pelvis", "spine_02", 0.1), ("spine_02", "neck_01", 0.1), ("neck_01", "Head", 0.05)]
for _s in "lr":
    BONES += [(f"clavicle_{_s}", f"upperarm_{_s}", 0.04), (f"upperarm_{_s}", f"lowerarm_{_s}", 0.045), (f"lowerarm_{_s}", f"hand_{_s}", 0.035),
              (f"thigh_{_s}", f"calf_{_s}", 0.065), (f"calf_{_s}", f"foot_{_s}", 0.045), ("pelvis", f"thigh_{_s}", 0.07)]


def splat(P, N, tris, kinds, yaw, res, colours, density=2.2, bones=None):
    """Points over every triangle, nearest kept per pixel. Returns kind (-1 none), front-facing, and the colour image."""
    c, s = np.cos(yaw), np.sin(yaw)
    # Camera looks along -dir; dir points from the body to the camera. Front (yaw 0) looks at the body's +z face.
    dirv = np.array([s, 0, c])
    right = np.array([c, 0, -s]); up = np.array([0, 1, 0])
    lo = P.min(0); hi = P.max(0)
    height = hi[1] - lo[1]
    px = height * 1.08 / res
    W = int(res * 0.75)
    cx = (lo + hi) / 2
    a, b, cc = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    area = np.linalg.norm(np.cross(b - a, cc - a), axis=1) / 2
    n_per = np.clip(np.ceil(area / (px * px) * density * 2), 1, 400).astype(np.int64)
    tri_id = np.repeat(np.arange(len(tris)), n_per)
    u = np.random.rand(len(tri_id)); v = np.random.rand(len(tri_id))
    flip = u + v > 1
    u[flip] = 1 - u[flip]; v[flip] = 1 - v[flip]
    pts = a[tri_id] + (b[tri_id] - a[tri_id]) * u[:, None] + (cc[tri_id] - a[tri_id]) * v[:, None]
    fn = np.cross(b - a, cc - a)
    front = (fn @ dirv)[tri_id] > 0
    rel = pts - cx
    sx = (rel @ right) / px + W / 2
    sy = res / 2 - (rel @ up) / px
    depth = -(rel @ dirv)
    ix = np.floor(sx).astype(np.int64); iy = np.floor(sy).astype(np.int64)
    ok = (ix >= 0) & (ix < W) & (iy >= 0) & (iy < res)
    ix, iy, depth, tri_id, front = ix[ok], iy[ok], depth[ok], tri_id[ok], front[ok]
    key = iy * W + ix
    order = np.lexsort((depth, key))
    key, tri_id, front = key[order], tri_id[order], front[order]
    first = np.ones(len(key), bool)
    first[1:] = key[1:] != key[:-1]
    kind = np.full(res * W, -1, np.int64)
    face = np.zeros(res * W, bool)
    col = np.zeros((res * W, 3), np.float32)
    kind[key[first]] = kinds[tri_id[first]]
    face[key[first]] = front[first]
    col[key[first]] = colours[tri_id[first]]
    inner = np.zeros((res, W), bool)
    if bones is not None:
        yy, xx = np.mgrid[0:res, 0:W]
        for a, b, r in bones:
            pa = np.array([((a - cx) @ right) / px + W / 2, res / 2 - ((a - cx) @ up) / px])
            pb = np.array([((b - cx) @ right) / px + W / 2, res / 2 - ((b - cx) @ up) / px])
            ab = pb - pa
            L2 = max(ab @ ab, 1e-6)
            t = np.clip(((xx - pa[0]) * ab[0] + (yy - pa[1]) * ab[1]) / L2, 0, 1)
            d = np.hypot(xx - (pa[0] + ab[0] * t), yy - (pa[1] + ab[1] * t))
            inner |= d < r / px
    return kind.reshape(res, W), face.reshape(res, W), col.reshape(res, W, 3), inner


def holes(kind):
    """Pixels with nothing that the outside can't reach: the sky seen through the body."""
    from collections import deque
    H, W = kind.shape
    empty = kind < 0
    seen = np.zeros_like(empty)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if empty[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if empty[y, x] and not seen[y, x]:
                seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and empty[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    return empty & ~seen


def analyse(body_id, bank, poses, res, out, src=HEROES):
    B = Body(os.path.join(src, f"{body_id}.glb"))
    tri_piece = B.piece[B.idx[:, 0]]
    tri_kind = B.kind[np.clip(tri_piece, 0, len(B.kind) - 1)]
    # Paint per triangle, from its first corner's texel (mail has u past the atlas: drawn orange).
    uv = B.uv[B.idx[:, 0]]
    Ht, Wt = B.albedo.shape[:2]
    tx = np.clip((uv[:, 0] % 1) * Wt, 0, Wt - 1).astype(int); ty = np.clip((uv[:, 1] % 1) * Ht, 0, Ht - 1).astype(int)
    paint = B.albedo[ty, tx]
    paint[tri_kind == 2] = (1.0, 0.55, 0.1)
    rows = []
    tiles = []
    for pose in poses:
        clip, frac = POSES[pose]
        rots = bank.sample(clip, frac) if clip in bank.meta["clips"] else {}
        wq, wt = B.pose(rots)
        P, N = B.skin(wq, wt)
        row = []
        # Where the bones are now, for the capsules (a joint's world position is its skin matrix times its bind position).
        unit = B.height / 1.9
        jpos = {n: wt[i] for i, n in enumerate(B.jname)}
        bones = [(jpos[a], jpos[b], r * unit) for a, b, r in BONES if a in jpos and b in jpos]
        for vname, yaw in VIEWS.items():
            kind, face, col, inner = splat(P, N, B.idx, tri_kind, yaw, res, paint, bones=bones)
            hole = holes(kind) & inner
            body = (kind >= 0) | holes(kind)
            nb = max(1, int(body.sum()))
            # (The back of a cape or a tabard is meant to be seen: only plate counts.)
            inside = (kind == 0) & ~face
            mail = kind == 2
            st = {"hole": hole.sum() / nb * 100, "inside": inside.sum() / nb * 100, "mail": mail.sum() / nb * 100}
            row.append(st)
            img = np.where(body[..., None], col * 0.85 + 0.1, 0.12)
            img[inside] = (0.9, 0.1, 0.1)
            img[hole] = (1.0, 0.0, 1.0)
            tiles.append((pose, vname, (np.clip(img, 0, 1) * 255).astype(np.uint8)))
        rows.append((pose, row))
    if out:
        os.makedirs(out, exist_ok=True)
        th, tw = tiles[0][2].shape[:2]
        sheet = Image.new("RGB", (tw * len(VIEWS), th * len(poses)), (30, 30, 30))
        for k, (pose, vname, im) in enumerate(tiles):
            sheet.paste(Image.fromarray(im), ((k % len(VIEWS)) * tw, (k // len(VIEWS)) * th))
        sheet.save(os.path.join(out, f"{body_id}.png"))
    return rows


def main():
    args = sys.argv[1:]
    out = None; poses = list(POSES); res = 360; src = HEROES
    if "--dir" in args:
        k = args.index("--dir"); src = args[k + 1]; del args[k:k + 2]
    if "--out" in args:
        k = args.index("--out"); out = args[k + 1]; del args[k:k + 2]
    if "--poses" in args:
        k = args.index("--poses"); poses = args[k + 1].split(","); del args[k:k + 2]
    if "--res" in args:
        k = args.index("--res"); res = int(args[k + 1]); del args[k:k + 2]
    ids = args or [h["id"] for h in json.load(open(os.path.join(HEROES, "roster.json")))]
    bank = Bank()
    np.random.seed(1)
    print(f"{'body':14s} {'pose':7s}  hole%  inside%  mail%   (worst view; % of the body's outline)")
    tot = []
    for b in ids:
        for pose, row in analyse(b, bank, poses, res, out, src):
            worst = max(row, key=lambda s: s["hole"] * 4 + s["inside"])
            tot.append(worst)
            print(f"{b:14s} {pose:7s}  {worst['hole']:5.2f}  {worst['inside']:6.2f}  {worst['mail']:5.2f}")
    if tot:
        print(f"{'all':14s} {'mean':7s}  {np.mean([t['hole'] for t in tot]):5.2f}  {np.mean([t['inside'] for t in tot]):6.2f}  {np.mean([t['mail'] for t in tot]):5.2f}")


if __name__ == "__main__":
    main()
