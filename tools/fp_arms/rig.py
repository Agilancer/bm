"""Step 2 of the first-person arms: the skeleton and its skin.

The joints are placed on the repaired sculpt: shoulder, elbow and wrist from fitted cross-sections
of each limb (the sculpt's arms aren't the same length, so each arm keeps its own), the fingers and
thumbs from the height map of each fist about the old sword's axis (angle round the axis, 0 toward
the wrist; radius from it).

    root
      upperarm_R  forearm_R  [forearm_twist1_R, forearm_twist2_R]  hand_R
                                                                     thumb/index/middle/ring/pinky _01 _02 _03 _end _R
      upperarm_L  (the same)
      weapon  weapon_tip      (the sword hangs here: origin on the right fist, +y to the tip, z along the guard)

The one-handed model hangs `weapon` from `hand_R` instead, since one fist holds it, and has a `shield`
on `hand_L` (origin on the grip, +y along it, -z toward the enemy).

Every joint's +y runs down its bone. Frames: `eye` is x right, y ahead, z up, the eye at the origin
(as Bellmourn's swing keys are written); three.js / glTF is (x, z, -y).

    python tools/fp_arms/rig.py     # checks and reports; build.py uses it
"""
import os

import numpy as np

from repair import BUILD

# Each model: `bind`, the rest pose in the eye's frame (the sculpt, moved so its shoulders sit about where
# the swing's are); `arm`, shoulder, elbow and wrist in the model's frame, from the cross-sections; `fist_t`,
# where each fist's middle lies along its grip's axis. Fingers: `finger_t` (t along the axis), `finger_arc`
# (angle round it in degrees, radius) for MCP, PIP, DIP and tip; `thumb` (t, angle, radius).
# `grip`: a fist's own axis (point, direction), where it isn't the old sword's.
TWO_HANDED = dict(
    bind=np.array([0.0, 0.222, -0.2375]),
    arm={"R": dict(S=(0.440, -0.365, 0.088), E=(0.238, -0.180, 0.095), W=(0.080, 0.031, 0.272)),
         "L": dict(S=(-0.430, -0.380, 0.092), E=(-0.231, -0.172, 0.095), W=(-0.072, -0.012, 0.210))},
    fist_t={"R": -0.325, "L": -0.440},
    finger_t={"R": dict(index=-0.268, middle=-0.297, ring=-0.325, pinky=-0.352),
              "L": dict(index=-0.372, middle=-0.402, ring=-0.432, pinky=-0.460)},
    finger_arc={"R": [(52, 0.044), (103, 0.053), (160, 0.045), (-140, 0.032)],
                "L": [(-38, 0.058), (-88, 0.074), (-135, 0.053), (-172, 0.030)]},
    thumb={"R": [(-0.335, -30, 0.055), (-0.310, -62, 0.058), (-0.285, -95, 0.045), (-0.268, -128, 0.040)],
           "L": [(-0.445, 22, 0.060), (-0.430, 55, 0.040), (-0.420, 82, 0.030), (-0.410, 108, 0.022)]},
    tip=1.0, weapon_parent="root", grip={}, shield=None)
SWORD_SHIELD = dict(
    bind=np.array([0.0, 0.3585, -0.421]),
    arm={"R": dict(S=(0.408, -0.405, 0.112), E=(0.421, -0.224, 0.066), W=(0.314, -0.061, 0.149)),
         "L": dict(S=(-0.435, -0.352, 0.130), E=(-0.395, -0.149, 0.099), W=(-0.235, 0.060, 0.200))},
    fist_t={"R": -0.405, "L": 0.0},
    finger_t={"R": dict(index=-0.355, middle=-0.385, ring=-0.415, pinky=-0.445),
              "L": dict(index=0.045, middle=0.015, ring=-0.015, pinky=-0.045)},
    finger_arc={"R": [(50, 0.045), (105, 0.055), (170, 0.038), (-125, 0.022)],
                "L": [(-110, 0.045), (-170, 0.042), (140, 0.040), (100, 0.025)]},
    thumb={"R": [(-0.43, -25, 0.055), (-0.40, -60, 0.050), (-0.37, -90, 0.035), (-0.35, -118, 0.030)],
           "L": [(0.060, 45, 0.050), (0.050, 85, 0.035), (0.020, 125, 0.040), (-0.020, 130, 0.040)]},
    # the empty fist's axis runs along its knuckles (thumb side +)
    grip={"L": ((-0.205, 0.135, 0.195), (0.857, -0.511, -0.060))},
    # the sculpt's sword arm has a much shorter forearm than the other (0.21 m to 0.28 m): drawn out to match
    stretch={"R": 1.25},
    # ...and its upper arm stops short of the shoulder (0.19 m to a real arm's 0.30): drawn out too, so the arm can reach across
    # the view and run off the bottom of the screen, its cut end out of sight, with the fist anywhere on a cut's line
    stretch_upper={"R": 1.6},
    tip=1.00, weapon_parent="hand_R",
    # the shield: strapped along the forearm, the board on the back of the hand's side, clear of the knuckles and the arm
    shield=dict(back=(-0.139, -0.342, 0.929), seat=0.05))
DIGITS = ("thumb", "index", "middle", "ring", "pinky")

ELBOW_BLEND = 0.060     # half-width of the blend across the elbow (m)
WRIST_BLEND = (0.022, 0.026)   # behind and ahead of the wrist's plane
FINGER_R = {"thumb": 0.030, "finger": 0.021}    # how far a digit's bones reach (m)
TWIST_AT = (0.42, 0.75)  # the two twist joints, as fractions of the forearm


def un(v):
    return v / np.linalg.norm(v)


def frame(y, ref):
    """Rotation matrix whose +y is y and whose +x lies as near `ref` as it can."""
    y = un(y)
    x = ref - y * (ref @ y)
    if np.linalg.norm(x) < 1e-6:
        x = np.array([1.0, 0.0, 0.0]) - y * y[0]
    x = un(x)
    return np.c_[x, y, np.cross(x, y)]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def stretched(d, cfg):
    """The sculpt with a forearm drawn out along itself: the hand and all past it just move along."""
    if not cfg.get("stretch"):
        return d, cfg
    d = dict(d)
    cfg = dict(cfg, arm={k: dict(v) for k, v in cfg["arm"].items()})
    V = d["V"].copy()
    for s, k in cfg["stretch"].items():
        J = cfg["arm"][s]
        E, W = np.array(J["E"]), np.array(J["W"])
        L = np.linalg.norm(W - E)
        fd = (W - E) / L
        m = d["side"] == (1 if s == "R" else -1)
        V[m] += (k - 1) * np.clip((V[m] - E) @ fd, 0, L)[:, None] * fd
        J["W"] = tuple(E + fd * L * k)
        if s == "R":
            d["sword_c"] = d["sword_c"] + fd * L * (k - 1)
    for s, k in cfg.get("stretch_upper", {}).items():
        J = cfg["arm"][s]
        E, S_ = np.array(J["E"]), np.array(J["S"])
        L = np.linalg.norm(S_ - E)
        ud = (S_ - E) / L
        m = d["side"] == (1 if s == "R" else -1)
        V[m] += (k - 1) * np.clip((V[m] - E) @ ud, 0, L)[:, None] * ud
        J["S"] = tuple(E + ud * L * k)
    d["V"] = V
    return d, cfg


def joints(d, cfg=TWO_HANDED):
    """{bone: dict(parent, p (eye frame), R (rest rotation, eye frame))}; plus the facts the swings need."""
    bind = cfg["bind"]
    ce0, ax0 = d["sword_c"], d["sword_ax"]
    guard = d["guard"]
    ce_e0 = ce0 + bind
    B = {}

    def add(name, parent, p, R):
        B[name] = dict(name=name, parent=parent, p=np.asarray(p, float), R=R)

    add("root", None, np.zeros(3), np.eye(3))
    info = {}
    for s, J in cfg["arm"].items():
        S, E, W = (np.array(J[k], float) + bind for k in "SEW")
        ce_e, ax = ce_e0, ax0
        if s in cfg["grip"]:
            ce_e, ax = np.array(cfg["grip"][s][0]) + bind, un(np.array(cfg["grip"][s][1]))
        fist = ce_e + ax * cfg["fist_t"][s]
        ud, fd = un(E - S), un(W - E)
        hinge = un(np.cross(ud, fd))
        add(f"upperarm_{s}", "root", S, frame(ud, hinge))
        add(f"forearm_{s}", f"upperarm_{s}", E, frame(fd, hinge))
        L = np.linalg.norm(W - E)
        for i, a in enumerate(TWIST_AT):
            add(f"forearm_twist{i + 1}_{s}", f"forearm_{s}", E + fd * L * a, frame(fd, hinge))
        hd = un(fist - W)
        add(f"hand_{s}", f"forearm_{s}", W, frame(hd, ax))
        ref = W - ce_e
        ref = un(ref - ax * (ref @ ax))
        side = np.cross(ax, ref)
        at = lambda t, th, r: ce_e + ax * t + r * (np.cos(np.radians(th)) * ref + np.sin(np.radians(th)) * side)
        for dg in DIGITS:
            if dg == "thumb":
                pts = [at(*q) for q in cfg["thumb"][s]]
            else:
                pts = [at(cfg["finger_t"][s][dg], *q) for q in cfg["finger_arc"][s]]
            parent = f"hand_{s}"
            for i, p in enumerate(pts):
                nm = f"{dg}_{'end' if i == 3 else f'0{i + 1}'}_{s}"
                y = pts[i + 1] - p if i < 3 else p - pts[i - 1]
                add(nm, parent, p, frame(y, ax))
                parent = nm
        info[s] = dict(S=S, E=E, W=W, fist=fist, U=np.linalg.norm(E - S), F=L, hinge=hinge)
    y = ax0
    z = un(guard - y * (guard @ y))
    x = np.cross(y, z)
    Rw = np.c_[x, y, z]
    add("weapon", cfg["weapon_parent"], info["R"]["fist"], Rw)
    add("weapon_tip", "weapon", info["R"]["fist"] + y * cfg["tip"], Rw)
    info["sword"] = dict(R=Rw, p=info["R"]["fist"])
    if cfg["shield"]:
        back = un(np.array(cfg["shield"]["back"], float))
        zs = -back
        ys = un(ax - zs * (ax @ zs))          # (ax: the left fist's, the last the arm loop set)
        Rs = np.c_[np.cross(ys, zs), ys, zs]
        ps = info["L"]["fist"] + back * cfg["shield"]["seat"]
        add("shield", "hand_L", ps, Rs)
        info["shield"] = dict(R=Rs, p=ps)
    return B, info


def weld(V):
    _, w = np.unique(np.round(V / 1e-5).astype(np.int64), axis=0, return_inverse=True)
    return w.ravel()


def seg_dist(p, a, b):
    """Distance of points p to segment a-b, and how far along it (0..1)."""
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1), t


def skin(d, B, info, cfg=TWO_HANDED):
    """Weights per vertex: joint names to [n, 4] indices and weights. Arms are tubes, so along the
    limb the weights go by planes across the elbow and wrist; the forearm hands off to its twist
    joints on the way to the hand so a turned wrist doesn't pinch; each digit's bones claim the skin
    within reach of them, the palm the rest. Then a little smoothing along the surface."""
    V = d["V"] + cfg["bind"]
    F = d["F"]
    side = d["side"]
    names = list(B)
    index = {n: i for i, n in enumerate(names)}
    W = np.zeros((len(V), len(names)))
    for s, sg in (("R", 1), ("L", -1)):
        m = np.where(side == sg)[0]
        p = V[m]
        I = info[s]
        ud, fd = un(I["E"] - I["S"]), un(I["W"] - I["E"])
        hd = un(I["fist"] - I["W"])
        # across the elbow
        ne = un(ud + fd)
        fore = smoothstep(-ELBOW_BLEND, ELBOW_BLEND, (p - I["E"]) @ ne)
        # across the wrist
        nw = un(fd + hd * 0.4)
        hand = smoothstep(-WRIST_BLEND[0], WRIST_BLEND[1], (p - I["W"]) @ nw)
        # along the forearm: base bone, then the twist joints
        u = ((p - I["E"]) @ fd) / I["F"]
        t1 = smoothstep(TWIST_AT[0] - 0.22, TWIST_AT[0] + 0.08, u)
        t2 = smoothstep(TWIST_AT[1] - 0.17, TWIST_AT[1] + 0.13, u)
        w_up = 1 - fore
        w_hand = fore * hand
        w_arm = fore * (1 - hand)
        W[m, index[f"upperarm_{s}"]] = w_up
        W[m, index[f"forearm_{s}"]] = w_arm * (1 - t1)
        W[m, index[f"forearm_twist1_{s}"]] = w_arm * t1 * (1 - t2)
        W[m, index[f"forearm_twist2_{s}"]] = w_arm * t1 * t2
        # the hand: its digits, by reach
        hm = w_hand > 1e-4
        ph = p[hm]
        claims = {}
        for dg in DIGITS:
            sn = ("01", "02", "03", "end")
            R0 = FINGER_R["thumb" if dg == "thumb" else "finger"]
            for i in range(3):
                a, b = B[f"{dg}_{sn[i]}_{s}"]["p"], B[f"{dg}_{sn[i + 1]}_{s}"]["p"]
                dist, tt = seg_dist(ph, a, b)
                # the first segment of a finger reaches less: its root is inside the hand
                reach = R0 * (0.85 if i == 0 else 1.0)
                claim = np.clip(1 - dist / reach, 0, 1) ** 2
                claims[f"{dg}_{sn[i]}_{s}"] = claim
        names_c = list(claims)
        C = np.stack([claims[n] for n in names_c], 1)
        palm = np.full(len(ph), 0.04)
        total = C.sum(1) + palm
        for j, n in enumerate(names_c):
            W[m[hm], index[n]] = w_hand[hm] * C[:, j] / total
        W[m[hm], index[f"hand_{s}"]] = w_hand[hm] * palm / total
        W[m[~hm], index[f"hand_{s}"]] = w_hand[~hm]
    # smoothing along the surface, seams included
    wid = weld(V)
    n = wid.max() + 1
    W0 = np.zeros((n, W.shape[1]))
    np.add.at(W0, wid, W)
    cnt = np.bincount(wid, minlength=n)[:, None]
    W0 /= np.maximum(cnt, 1)
    e = np.vstack([wid[F[:, [0, 1]]], wid[F[:, [1, 2]]], wid[F[:, [2, 0]]]])
    e = np.unique(np.sort(e, axis=1), axis=0)
    import scipy.sparse as sp
    A = sp.csr_matrix((np.ones(len(e) * 2), (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n))
    deg = np.asarray(A.sum(1)).ravel()
    deg[deg == 0] = 1
    P = sp.diags(1 / deg) @ A
    for _ in range(3):
        W0 = 0.5 * W0 + 0.5 * (P @ W0)
    W = W0[wid]
    # four largest, normalised
    order = np.argsort(-W, axis=1)[:, :4]
    wts = np.take_along_axis(W, order, 1)
    wts /= np.maximum(wts.sum(1, keepdims=True), 1e-9)
    return order, wts, names


if __name__ == "__main__":
    import sys
    one = "1h" in sys.argv
    cfg = SWORD_SHIELD if one else TWO_HANDED
    d, cfg = stretched(dict(np.load(os.path.join(BUILD, "repaired_1h.npz" if one else "repaired.npz"))), cfg)
    B, info = joints(d, cfg)
    idx, wts, names = skin(d, B, info, cfg)
    for s in "RL":
        I = info[s]
        print(s, f"upper {I['U']:.3f}  fore {I['F']:.3f}  wrist->fist {np.linalg.norm(I['fist'] - I['W']):.3f}  shoulder {I['S'].round(3)}")
    print(len(B), "joints; fists apart", np.linalg.norm(info["R"]["fist"] - info["L"]["fist"]).round(3))
    used = np.bincount(idx.ravel(), weights=wts.ravel(), minlength=len(names))
    for n, u in zip(names, used):
        if not n.endswith(("_end_R", "_end_L")) and n not in ("root", "weapon", "weapon_tip", "shield"):
            print(f"  {n:22s} {u:8.1f}")
    # for the overlay check
    np.savez(os.path.join(BUILD, "joints_1h.npz" if one else "joints.npz"), V=d["V"], F=d["F"], names=np.array(names), pos=np.array([B[n]["p"] - cfg["bind"] for n in names]),
             parent=np.array([names.index(B[n]["parent"]) if B[n]["parent"] else -1 for n in names]),
             idx=idx, wts=wts)
