"""Fit the Elder Dragon Gods' one skeleton into each of the four Tripo dragons, and skin them to it.

    python tools/dragons/fit.py [black green red undead]

Each Tripo dragon came rigged its own rough way (two neck bones and four tail bones on the black, no jaw on any, two or
three wing fingers, the undead rigged as if it were a man: no tail at all). This gives all four the same skeleton (SKELETON
below): a jaw; six neck bones; fourteen tail bones; four legs to the claw, each toe in two bones; and wings with the arm,
the thumb's hook and every finger strut of the membrane in three bones. So every clip in tools/dragons/clips.py plays on
all four.

Where the joints go: the main ones are landmarks per dragon (LANDMARKS in landmarks.json, read off flat pictures made by
plot.py), then centred in the body's cross-section there. The rest are found: every claw, every finger strut's tip and the
tail's end are the points furthest along the skin from the wrist, ankle or root they hang from (geodesic distance on the
welded mesh), and each is traced back down its middle (the centre of each ring of equal distance).

How the skin follows: each vertex belongs to the bone it's nearest to along the skin (a geodesic Voronoi from seeds on
every bone, so a toe never takes its neighbour's claw and the jaw comes away from the head at the mouth), smoothed a few
rings across each border so the joints bend. The wing membrane between two struts is shared out between them by how far
along the skin it is from each, so it stretches evenly across a panel as the fingers spread or fold.

Writes art/dragons/rigged/<id>.glb (mesh, textures, skeleton at rest, no clips) and art/dragons/rigged/<id>.json (joints).
"""
import json
import os
import re
import sys

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import dijkstra
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from glbio import Out, Source, shrink, weld  # noqa: E402

SRC = "F:/!    BM V2/!  GENERATED TRIPO MONSTERS/DRAGON - %s.glb"
OUT = os.path.join(ROOT, 'art', 'dragons', 'rigged')
NECK = 6
TAIL = 14


def load_landmarks():
    return json.load(open(os.path.join(HERE, 'landmarks.json')))


class Mesh:
    """The welded surface: one node per position, edges from the triangles, for distances along the skin."""

    def __init__(self, src):
        self.src = src
        self.inv, first = weld(src.P)
        self.P = src.P[first]
        n = len(self.P)
        t = self.inv[src.tri]
        e = np.concatenate([t[:, [0, 1]], t[:, [1, 2]], t[:, [2, 0]]])
        e = e[e[:, 0] != e[:, 1]]
        e = np.unique(np.sort(e, 1), axis=0)
        self.E = e
        L = np.linalg.norm(self.P[e[:, 0]] - self.P[e[:, 1]], axis=1) + 1e-9
        self.G = coo_matrix((np.r_[L, L], (np.r_[e[:, 0], e[:, 1]], np.r_[e[:, 1], e[:, 0]])), shape=(n, n)).tocsr()
        self.tree = cKDTree(self.P)
        self.edge = float(np.median(L))
        # neighbours, for smoothing
        self.nb = [[] for _ in range(n)]
        for a, b in e:
            self.nb[a].append(b)
            self.nb[b].append(a)

    def sub(self, mask):
        """The graph with only the masked nodes joined (others cut off)."""
        G = self.G.tocoo()
        keep = mask[G.row] & mask[G.col]
        n = len(self.P)
        return coo_matrix((G.data[keep], (G.row[keep], G.col[keep])), shape=(n, n)).tocsr()

    def snap(self, p, mask=None):
        if mask is None:
            return int(self.tree.query(p)[1])
        idx = np.nonzero(mask)[0]
        return int(idx[np.argmin(np.linalg.norm(self.P[idx] - p, axis=1))])

    def geo(self, src, G=None, limit=np.inf, pred=False):
        G = self.G if G is None else G
        r = dijkstra(G, directed=False, indices=src, min_only=True, limit=limit, return_predecessors=pred)
        return r[:2] if pred else r


def center(M, p, axis, R, t=None):
    """Centre p in the body's cross-section across `axis` (a unit vector along the limb): the middle of the extent of
    the vertices within R of p that lie in a thin slab through p. Only the two directions across the axis move."""
    t = t or max(0.004, R * 0.12)
    idx = M.tree.query_ball_point(p, R)
    if len(idx) < 6:
        return p
    Q = M.P[idx]
    along = (Q - p) @ axis
    Q = Q[np.abs(along) < t]
    if len(Q) < 6:
        return p
    # two directions across the axis
    a = np.cross(axis, [0, 1, 0] if abs(axis[1]) < 0.9 else [1, 0, 0])
    a /= np.linalg.norm(a)
    b = np.cross(axis, a)
    out = p.copy()
    for d in (a, b):
        s = (Q - p) @ d
        out += d * (s.min() + s.max()) / 2
    return out


def trace(M, a, b, G, n_rings=24):
    """The middle line from node a to node b: centres of the rings of equal skin distance from a, near the shortest path."""
    dist, pred = M.geo(a, G, pred=True)
    if not np.isfinite(dist[b]):
        return np.array([M.P[a], M.P[b]])
    path = [b]
    while path[-1] != a and pred[path[-1]] >= 0:
        path.append(pred[path[-1]])
    path = path[::-1]
    total = dist[b]
    out = [M.P[a]]
    D = dist
    for k in range(1, n_rings):
        d = total * k / n_rings
        # the path node at this distance
        i = path[int(np.searchsorted(dist[path], d).clip(0, len(path) - 1))]
        band = max(total / n_rings * 0.6, M.edge * 1.5)
        idx = M.tree.query_ball_point(M.P[i], max(total / n_rings * 3, 0.012))
        idx = np.array([j for j in idx if abs(D[j] - d) < band])
        if len(idx) < 3:
            out.append(M.P[i])
            continue
        Q = M.P[idx]
        out.append((Q.min(0) + Q.max(0)) / 2 * 0.5 + Q.mean(0) * 0.5)
    out.append(M.P[b])
    line = np.array(out)
    # smooth (keep the ends)
    for _ in range(2):
        line[1:-1] = (line[:-2] + 2 * line[1:-1] + line[2:]) / 4
    return line


def along(line, fracs):
    """Points at fractions of a polyline's length."""
    seg = np.linalg.norm(np.diff(line, axis=0), axis=1)
    s = np.r_[0, np.cumsum(seg)]
    out = []
    for f in fracs:
        d = f * s[-1]
        i = int(np.searchsorted(s, d).clip(1, len(s) - 1))
        u = (d - s[i - 1]) / max(seg[i - 1], 1e-9)
        out.append(line[i - 1] + (line[i] - line[i - 1]) * u)
    return np.array(out)


def tips(M, base, mask, k, sep, exclude=(), min_d=0.0):
    """The k points furthest along the skin from `base` within mask that are each a local furthest (no node within sep
    of them is further), well apart from each other."""
    G = M.sub(mask)
    d = M.geo(base, G)
    ok = np.isfinite(d) & mask & (d > min_d)
    idx = np.nonzero(ok)[0]
    order = idx[np.argsort(-d[idx])]
    chosen = []
    for i in order:
        p = M.P[i]
        if any(np.linalg.norm(M.P[c] - p) < sep for c in chosen):
            continue
        if any(np.linalg.norm(np.asarray(e) - p) < sep for e in exclude):
            continue
        # a local maximum: nothing near is further
        near = M.tree.query_ball_point(p, sep * 0.5)
        if any(d[j] > d[i] + 1e-6 for j in near if ok[j]):
            continue
        chosen.append(i)
        if len(chosen) == k:
            break
    return chosen, d


# ---- the skeleton --------------------------------------------------------------------------------------------------------

def build(name):
    L = load_landmarks()[name]
    src = Source(SRC % name.upper())
    M = Mesh(src)
    H = src.P[:, 1].max()
    J = []          # dicts: name, parent, pos, tip (where its segment ends, for weighting), deform

    def add(nm, parent, pos, tip=None, deform=True):
        J.append(dict(name=nm, parent=parent, pos=np.asarray(pos, float), tip=None if tip is None else np.asarray(tip, float), deform=deform))
        return nm

    def lm(key, side=0):
        p = np.array(L[key], float)
        if side > 0:
            p[0] = -p[0]      # landmarks are written for the right side (-X); the left mirrors them
        return p

    def ctr(p, d, R=0.05):
        d = np.asarray(d, float)
        return center(M, p, d / (np.linalg.norm(d) + 1e-9), R)

    # spine: hips to chest, centred, kept on the middle line
    hips, chest = lm('hips'), lm('chest')
    spine = [hips + (chest - hips) * f for f in (0, 0.34, 0.67, 1.0)]
    line = [p.copy() for p in spine]
    spine = [ctr(p, chest - hips, 0.07) for p in spine]
    for p, q in zip(spine, line):
        p[0] = 0.0
        p[1] = np.clip(p[1], q[1] - 0.015, q[1] + 0.015)    # the wing roots sit on the back: don't let them lift it
    add('root', None, [spine[0][0], 0.0, spine[0][2]], deform=False)
    add('hips', 'root', spine[0], spine[1])
    add('spine1', 'hips', spine[1], spine[2])
    add('spine2', 'spine1', spine[2], spine[3])
    neck0 = lm('neck0')
    add('chest', 'spine2', spine[3], neck0)

    # neck: traced from its root to the head, six bones
    head = lm('head')
    body = M.P[:, 2] > hips[2] - 0.02
    nk = trace(M, M.snap(neck0), M.snap(head), M.sub(body & (np.abs(M.P[:, 0]) < 0.09)))
    nk[:, 0] = 0.0
    pts = along(nk, np.linspace(0, 1, NECK + 1))
    pts = [ctr(p, nk[-1] - nk[0], 0.06) for p in pts]
    for p in pts:
        p[0] = 0.0
    parent = 'chest'
    for i in range(NECK):
        parent = add(f'neck{i + 1}', parent, pts[i], pts[i + 1])
    snout = lm('snout')
    add('head', parent, pts[NECK], snout)
    add('jaw', 'head', lm('jaw'), lm('jaw_tip'))

    # tail: from its root to its far end
    tb = lm('tail0')
    behind = M.P[:, 2] < tb[2] + 0.02
    tail_mask = behind & ~((M.P[:, 1] < 0.11 * H) & (np.abs(M.P[:, 0]) < 0.14) & (M.P[:, 2] > tb[2] - 0.12))   # not the hind feet
    a = M.snap(tb, tail_mask)
    end = M.snap(lm('tail_end'), tail_mask) if 'tail_end' in L else tips(M, a, tail_mask, 1, 0.05)[0][0]
    tl = trace(M, a, end, M.sub(tail_mask), n_rings=40)
    tl[0] = ctr(tb, tl[min(3, len(tl) - 1)] - tb, 0.06)
    # bones get shorter toward the tip
    fr = np.cumsum([0] + [0.92 ** i for i in range(TAIL)])
    fr /= fr[-1]
    tp = along(tl, fr)
    parent = 'hips'
    for i in range(TAIL):
        parent = add(f'tail{i + 1}', parent, tp[i], tp[i + 1])

    for side, S in ((-1, 'R'), (1, 'L')):
        sgn = side
        # front leg: scapula, upper arm, forearm, hand; then each toe in two bones
        sc, sh, el, wr, ha = (lm(k, side) for k in ('f_scap', 'f_shoulder', 'f_elbow', 'f_wrist', 'f_hand'))
        sh, el, wr = ctr(sh, el - sh, 0.05), ctr(el, wr - sh, 0.045), ctr(wr, ha - el, 0.035)
        add(f'scap_{S}', 'chest', sc, sh)
        add(f'upperarm_{S}', f'scap_{S}', sh, el)
        add(f'forearm_{S}', f'upperarm_{S}', el, wr)
        add(f'hand_{S}', f'forearm_{S}', wr, ha)
        toes(M, add, L, f'hand_{S}', ha, wr, sgn, H, 'f', S)
        # hind leg: thigh, shin, the long bone of the foot (metatarsus), foot; toes
        hp, kn, an, ft = (lm(k, side) for k in ('h_hip', 'h_knee', 'h_ankle', 'h_foot'))
        hp, kn, an = ctr(hp, kn - hp, 0.06), ctr(kn, an - hp, 0.045), ctr(an, ft - kn, 0.035)
        add(f'thigh_{S}', 'hips', hp, kn)
        add(f'shin_{S}', f'thigh_{S}', kn, an)
        add(f'meta_{S}', f'shin_{S}', an, ft)
        add(f'foot_{S}', f'meta_{S}', ft, ft + np.array([0, 0, 0.02]))
        toes(M, add, L, f'foot_{S}', ft, an, sgn, H, 'h', S)
        # wing: root on the back, shoulder, elbow, wrist; the thumb's hook; each finger strut in three bones
        wings(M, add, L, lm, side, S, H)
    return src, M, J


def toes(M, add, L, parent, ha, wr, sgn, H, kind, S):
    """Each claw: the furthest points along the skin from the wrist (or ankle) on that foot, traced back."""
    n = L.get(f'{kind}_toes', 4)
    reach = L.get(f'{kind}_reach', 0.075)
    foot = (np.linalg.norm(M.P - ha, axis=1) < reach) & (M.P[:, 1] < max(ha[1] + 0.03, wr[1] + 0.012)) & (np.sign(M.P[:, 0]) == sgn)
    base = M.snap(wr, foot | (np.linalg.norm(M.P - wr, axis=1) < 0.02))
    foot |= np.linalg.norm(M.P - wr, axis=1) < 0.02
    tp, d = tips(M, base, foot, n, L.get(f'{kind}_sep', 0.014), min_d=np.linalg.norm(ha - wr) * 0.8)
    G = M.sub(foot)
    for k, t in enumerate(sorted(tp, key=lambda i: -sgn * M.P[i, 0])):
        line = trace(M, M.snap(ha, foot), t, G, n_rings=12)
        pts = along(line, (0.25, 0.62, 1.0))
        a = add(f'{kind}toe{k + 1}a_{S}', parent, pts[0], pts[1])
        add(f'{kind}toe{k + 1}b_{S}', a, pts[1], pts[2])


def wings(M, add, L, lm, side, S, H):
    rt, sh, el, wr = (lm(k, side) for k in ('w_root', 'w_shoulder', 'w_elbow', 'w_wrist'))
    add(f'wroot_{S}', 'chest', rt, sh)
    add(f'whum_{S}', f'wroot_{S}', sh, el)
    add(f'wfore_{S}', f'whum_{S}', el, wr)
    add(f'whand_{S}', f'wfore_{S}', wr, wr + (wr - el) * 0.15)
    # the wing: everything on this side out past the shoulder and above the legs
    x0 = abs(sh[0]) * 0.9
    wing = (np.sign(M.P[:, 0]) == side) & (np.abs(M.P[:, 0]) > x0) & ((M.P[:, 1] > L.get('w_low', 0.12) * 1.0) | (np.abs(M.P[:, 0]) > abs(sh[0]) + 0.1))
    near_wr = np.linalg.norm(M.P - wr, axis=1) < 0.025
    G = M.sub(wing | near_wr)
    base = M.snap(wr, wing | near_wr)
    # the thumb's hook: the furthest point up and in from the wrist within a short reach
    th = lm('w_thumb', side) if 'w_thumb' in L else None
    excl = []
    if th is not None:
        t = M.snap(th, wing | near_wr)
        line = trace(M, base, t, G, n_rings=8)
        p = along(line, (0.0, 1.0))
        add(f'wthumb_{S}', f'whand_{S}', p[0] + (p[1] - p[0]) * 0.25, p[1])
        excl.append(M.P[t])
    n = L.get('w_fingers', 4)
    if 'w_tips' in L:
        tp = [M.snap(lm(f'w_tip{k + 1}', side) if False else np.array(L['w_tips'][k], float) * [side * -1, 1, 1], wing) for k in range(n)]
    else:
        tp, _ = tips(M, base, wing, n, L.get('w_sep', 0.07), exclude=excl, min_d=0.12)
    # outermost (leading edge) first
    ang = lambda i: np.arctan2(M.P[i, 1] - wr[1], abs(M.P[i, 0]) - abs(wr[0]))
    tp = sorted(tp, key=lambda i: -ang(i))
    for k, t in enumerate(tp):
        line = trace(M, base, t, G, n_rings=30)
        pts = along(line, (0.06, 0.38, 0.7, 1.0))
        a = add(f'wf{k + 1}a_{S}', f'whand_{S}', pts[0], pts[1])
        b = add(f'wf{k + 1}b_{S}', a, pts[1], pts[2])
        add(f'wf{k + 1}c_{S}', b, pts[2], pts[3])


# ---- the skin ------------------------------------------------------------------------------------------------------------

def seg_dist(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def chain_of(name):
    """Which limb a bone belongs to: the skin is first shared out between limbs, then along each one."""
    import re
    if name in ('hips', 'spine1', 'spine2', 'chest'):
        return 'spine'
    m = re.match(r'(neck|tail)\d+$', name)
    if m:
        return m.group(1)
    m = re.match(r'([fh]toe\d+)[ab]_([RL])$', name)
    if m:
        return m.group(1) + m.group(2)
    m = re.match(r'(wf\d+)[abc]_([RL])$', name)
    if m:
        return m.group(1) + m.group(2)
    m = re.match(r'(scap|upperarm|forearm|hand)_([RL])$', name)
    if m:
        return 'farm' + m.group(2)
    m = re.match(r'(thigh|shin|meta|foot)_([RL])$', name)
    if m:
        return 'hleg' + m.group(2)
    m = re.match(r'(wroot|whum|wfore|whand)_([RL])$', name)
    if m:
        return 'warm' + m.group(2)
    return name


FAT = re.compile(r'^(hips|spine\d|chest|neck\d|tail\d+|scap|upperarm|forearm|thigh|shin|wroot|whum)(_[RL])?$')
CAPSULE = float(os.environ.get('CAPSULE', 0.85))
LEG_REACH = 0.06      # how far along the body a leg's skin may run past its top joint


def skin(M, J, smooth=4, jaw_mode='jaw'):
    """jaw_mode: 'jaw' (a real lower jaw), 'throat' (no lower jaw; the bone keeps the throat under the open maw, moved
    only a little) or 'none' (the bone keeps nothing: the head has it all)."""
    names = [j['name'] for j in J]
    at = {nm: i for i, nm in enumerate(names)}
    deform = [i for i, j in enumerate(J) if j['deform']]
    n = len(M.P)
    D = np.full((n, len(J)), np.inf)
    U = np.zeros((n, len(J)))
    for i in deform:
        j = J[i]
        a, b = j['pos'], j['tip'] if j['tip'] is not None else j['pos']
        ab = b - a
        u = np.clip(((M.P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
        U[:, i] = u
        D[:, i] = np.linalg.norm(M.P - (a + u[:, None] * ab), axis=1)
    chains = sorted({chain_of(names[i]) for i in deform})
    cid = {c: k for k, c in enumerate(chains)}
    members = {c: [i for i in deform if chain_of(names[i]) == c] for c in chains}
    C = np.stack([D[:, members[c]].min(1) for c in chains], 1)      # distance to each limb
    # The fat bones (trunk, neck, tail, the legs' and wing-arms' long bones) are measured to the skin of a capsule round
    # them, not to their centre line: the spine runs high in a deep torso, so a bare distance hands the belly to the
    # upper arms and thighs that hang beside it.
    nearest = np.argmin(np.where(np.isfinite(D), D, np.inf), 1)
    R = np.zeros(len(J))
    for i in deform:
        if not FAT.match(names[i]):
            continue
        mine = (nearest == i) & (U[:, i] > 0.2) & (U[:, i] < 0.8)
        if mine.sum() > 30:
            R[i] = np.percentile(D[mine, i], 25)
    Dc = D - CAPSULE * R[None, :]
    Ce = np.stack([Dc[:, members[c]].min(1) for c in chains], 1)
    # what each limb may never have
    allow = np.ones((n, len(chains)), bool)
    x, y, z = M.P[:, 0], M.P[:, 1], M.P[:, 2]
    # the jaw only ever has what is in front of its hinge and below the line of the mouth
    if 'jaw' in at:
        jw = J[at['jaw']]
        hz, hy = jw['pos'][2], jw['pos'][1]
        tip = jw['tip']
        slope = (tip[1] - hy) / max(tip[2] - hz, 1e-6)
        below = y < hy + 0.006 + (z - hz) * slope * 0.5
        jaw_ok = (z > hz - 0.008) & below & (D[:, at['jaw']] < np.linalg.norm(tip - jw['pos']) * 0.9)
        if jaw_mode == 'none':
            jaw_ok[:] = False
        allow[:, cid['jaw']] = jaw_ok
    # the legs never have the belly between them, nor the flank in front of the haunch or behind the shoulder
    for S in ('R', 'L'):
        if f'thigh_{S}' in at and f'hleg{S}' in cid:
            hp = J[at[f'thigh_{S}']]['pos']
            allow[:, cid[f'hleg{S}']] &= ~(((np.abs(x) < 0.5 * abs(hp[0])) & (y < hp[1])) | ((z > hp[2] + LEG_REACH) & (y < hp[1] + 0.02)))
        if f'upperarm_{S}' in at and f'farm{S}' in cid:
            sp = J[at[f'upperarm_{S}']]['pos']
            low = y < sp[1] - 0.02
            allow[:, cid[f'farm{S}']] &= ~(((np.abs(x) < 0.5 * abs(sp[0])) & low) | ((z < sp[2] - LEG_REACH) & low))
    Ce = np.where(allow, Ce, np.inf)
    order = np.argsort(Ce, 1)
    near = order[:, 0]
    dn = C[np.arange(n), near]
    gap = Ce[np.arange(n), order[:, 1]] - Ce[np.arange(n), near]
    r10 = np.array([np.percentile(dn[near == k], 10) if (near == k).any() else 0.0 for k in range(len(chains))])
    # seeds: plainly a limb's own (in its core and clearly nearer it, or far nearer it wherever)
    ok = ((dn < 1.7 * r10[near] + 2 * M.edge) & (gap > 0.15 * dn)) | (gap > 0.8 * dn)
    seeds = np.nonzero(ok & np.isfinite(Ce[np.arange(n), near]))[0]
    dist, pred, srcs = dijkstra(M.G, directed=False, indices=seeds, min_only=True, return_predecessors=True)
    reached = np.isfinite(dist)
    lab = np.full(n, -1)
    lab[reached] = near[srcs[reached]]
    lab[~reached] = near[~reached]
    bad = ~allow[np.arange(n), lab]
    lab[bad] = np.argmin(Ce[bad], 1)
    # within each limb: along it, the bone it lies over, blended into the next across each joint by the bone's length
    W = np.zeros((n, len(J)), np.float32)
    for c in chains:
        rows = np.nonzero(lab == cid[c])[0]
        if not len(rows):
            continue
        mem = members[c]
        k = np.array(mem)[np.argmin(D[np.ix_(rows, mem)], 1)]
        u = U[rows, k]
        W[rows, k] = 1
        for r, kk, uu in zip(rows, k, u):
            par = J[kk]['parent']
            pi = at.get(par) if par else None
            kids = [q for q in mem if J[q]['parent'] == names[kk]]
            if uu < 0.3 and pi is not None and pi in mem:
                w = 0.5 * (0.3 - uu) / 0.3
                W[r, kk] -= w
                W[r, pi] += w
            elif uu > 0.7 and kids:
                w = 0.5 * (uu - 0.7) / 0.3
                W[r, kk] -= w
                W[r, kids[0]] += w
    # across the borders between limbs, a little smoothing over the welded neighbours
    nbi = np.repeat(np.arange(n), [len(x) for x in M.nb])
    nbj = np.concatenate([np.array(x, int) for x in M.nb if len(x)] or [np.zeros(0, int)])
    A = coo_matrix((np.ones(len(nbi), np.float32), (nbi, nbj)), shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(1)).ravel() + 1
    for _ in range(smooth):
        W = (A @ W + W) / deg[:, None]
    return W, lab, names


def wing_membrane(M, J, W, names):
    """Spread each wing panel between the two struts it hangs from, by skin distance, and along each strut by where the
    vertex lies along it."""
    for S in ('R', 'L'):
        fingers = sorted({nm[:3] for nm in names if len(nm) > 3 and nm.startswith('wf') and nm[2].isdigit() and nm.endswith('_' + S)})
        if len(fingers) < 2:
            continue
        idx = {nm: i for i, nm in enumerate(names)}
        fbones = {f: [idx[f'{f}{c}_{S}'] for c in 'abc'] for f in fingers}
        allf = sorted(i for v in fbones.values() for i in v) + [idx[f'whand_{S}'], idx[f'wfore_{S}']]
        # vertices that are wing finger or hand now
        own = W[:, allf].sum(1) > 0.5
        if own.sum() < 50:
            continue
        G = M.sub(own)
        F = []
        for f in fingers:
            ids = fbones[f]
            seeds = np.nonzero(own & (np.argmax(W, 1)[:, None] == np.array(ids)[None]).any(1))[0]
            # only seeds that hug the strut
            segd = np.min([seg_dist(M.P[seeds], J[i]['pos'], J[i]['tip']) for i in ids], 0)
            seeds = seeds[segd < max(np.percentile(segd, 30), M.edge * 2)]
            F.append(M.geo(seeds, G) if len(seeds) else np.full(len(M.P), np.inf))
        F = np.array(F)    # (fingers, n)
        order = np.argsort(F, 0)
        rows = np.nonzero(own)[0]
        for v in rows:
            a, b = order[0, v], order[1, v]
            da, db = F[a, v], F[b, v]
            if not np.isfinite(da):
                continue
            if abs(a - b) != 1 or not np.isfinite(db):
                wa, wb = 1.0, 0.0
            else:
                wa = db / (da + db + 1e-9)
                wa = np.clip((wa - 0.5) * 1.35 + 0.5, 0, 1)   # a little firmer by each strut
                wb = 1 - wa
            hand_w = W[v, idx[f'whand_{S}']] + W[v, idx[f'wfore_{S}']]
            keep = min(hand_w, 1.0) if hand_w > 0.6 else hand_w * 0.5
            new = np.zeros(len(names), np.float32)
            for f, w in ((fingers[a], wa), (fingers[b], wb)):
                if w <= 0:
                    continue
                ids = fbones[f]
                d = np.array([seg_dist(M.P[v:v + 1], J[i]['pos'], J[i]['tip'])[0] for i in ids])
                k = np.argsort(d)[:2]
                dd = d[k] + 1e-6
                ww = (1 / dd) / (1 / dd).sum()
                for kk, w2 in zip(k, ww):
                    new[ids[kk]] += w * w2 * (1 - keep)
            rest = W[v].copy()
            rest[allf] = 0
            new[idx[f'whand_{S}']] += keep * W[v, idx[f'whand_{S}']] / max(hand_w, 1e-6)
            new[idx[f'wfore_{S}']] += keep * W[v, idx[f'wfore_{S}']] / max(hand_w, 1e-6)
            tot = W[v, allf].sum()
            W[v] = rest + new * tot
    return W


WING_SKIN = re.compile(r'^(whum|wfore|whand|wthumb|wf\d+[abc])_[RL]$')
MEMBRANE = re.compile(r'^(wfore|whand|wf\d+[abc])_[RL]$')


def seam_blend(M, W, names, band=0.05, iters=60):
    """Where a wing's membrane meets the body (the trailing panel on the flank, its edge on the thigh), spread the
    change of owner over a band instead of one row of edges, so a spreading wing stretches its membrane instead of
    tearing it away from the body. The wing's shoulder (its upper arm against the back) is left firm."""
    wing = np.array([bool(WING_SKIN.match(nm)) for nm in names])
    memb = np.array([bool(MEMBRANE.match(nm)) for nm in names])
    isw = W[:, wing].sum(1) > 0.5
    dom = np.argmax(W, 1)
    a, b = M.E[:, 0], M.E[:, 1]
    cross = isw[a] != isw[b]
    wv = np.where(isw[a], a, b)
    cross &= memb[dom[wv]]
    seam = np.unique(M.E[cross].ravel())
    if not len(seam):
        return W
    g = M.geo(seam, limit=band)
    inb = np.nonzero(np.isfinite(g))[0]
    n = len(M.P)
    nbi = np.repeat(np.arange(n), [len(x) for x in M.nb])
    nbj = np.concatenate([np.array(x, int) for x in M.nb if len(x)])
    A = coo_matrix((np.ones(len(nbi), np.float32), (nbi, nbj)), shape=(n, n)).tocsr()[inb]
    deg = np.asarray(A.sum(1)).ravel() + 1
    W = W.copy()
    for _ in range(iters):
        W[inb] = (A @ W + W[inb]) / deg[:, None]
    print(f'  seam: {len(seam)} vertices on the membrane-body seam, {len(inb)} blended')
    return W


def top4(W):
    J = np.argsort(-W, 1)[:, :4]
    w = np.take_along_axis(W, J, 1)
    w[w < 0.015] = 0
    w /= w.sum(1, keepdims=True) + 1e-12
    return J.astype(np.uint8), w.astype(np.float32)


# ---- writing ---------------------------------------------------------------------------------------------------------------

JAW_SCALE = {'jaw': 1.0, 'throat': 0.3, 'none': 0.0}


def write(name, src, M, J, Jw, Ww, tex=(2048, 1024, 2048), jaw_mode='jaw'):
    os.makedirs(OUT, exist_ok=True)
    o = Out()
    names = [j['name'] for j in J]
    at = {nm: i for i, nm in enumerate(names)}
    base = 0
    for j in J:
        node = {'name': j['name']}
        pp = J[at[j['parent']]]['pos'] if j['parent'] else np.zeros(3)
        node['translation'] = (j['pos'] - pp).tolist()
        o.doc['nodes'].append(node)
    for i, j in enumerate(J):
        if j['parent']:
            o.doc['nodes'][at[j['parent']]].setdefault('children', []).append(i)
    # the mesh: back to the source's split vertices
    inv = M.inv
    P = src.P.astype(np.float32)
    jj, ww = Jw[inv], Ww[inv]
    attrs = {'POSITION': o.acc(P, 'VEC3', target=34962, minmax=True)}
    if src.N is not None:
        attrs['NORMAL'] = o.acc(src.N.astype(np.float32), 'VEC3', target=34962)
    attrs['TEXCOORD_0'] = o.acc(src.uv.astype(np.float32), 'VEC2', target=34962)
    attrs['JOINTS_0'] = o.acc(jj, 'VEC4', 5121, target=34962)
    attrs['WEIGHTS_0'] = o.acc(ww, 'VEC4', target=34962)
    ind = o.acc(src.tri.astype(np.uint32).ravel(), 'SCALAR', 5125, target=34963)
    mat = {'name': f'dragon_{name}', 'pbrMetallicRoughness': {'metallicFactor': 1.0, 'roughnessFactor': 1.0}, 'doubleSided': True}
    sizes = {'base': tex[0], 'mr': tex[1], 'normal': tex[2], 'emissive': 1024, 'occlusion': 1024}
    for slot, mime, data in src.images():
        m2, d2 = shrink(mime, data, sizes[slot])
        ti = o.image(m2, d2)
        if slot == 'base':
            mat['pbrMetallicRoughness']['baseColorTexture'] = {'index': ti}
        elif slot == 'mr':
            mat['pbrMetallicRoughness']['metallicRoughnessTexture'] = {'index': ti}
        elif slot == 'normal':
            mat['normalTexture'] = {'index': ti}
    sm = src.material or {}
    for k in ('metallicFactor', 'roughnessFactor', 'baseColorFactor'):
        if k in sm.get('pbrMetallicRoughness', {}):
            mat['pbrMetallicRoughness'][k] = sm['pbrMetallicRoughness'][k]
    o.doc['materials'].append(mat)
    o.doc['meshes'].append({'name': f'dragon_{name}', 'primitives': [{'attributes': attrs, 'indices': ind, 'material': 0}]})
    ibm = np.tile(np.eye(4, dtype=np.float32), (len(J), 1, 1))
    for i, j in enumerate(J):
        ibm[i, :3, 3] = -j['pos']
    ibm_acc = o.acc(ibm.transpose(0, 2, 1).reshape(len(J), 16), 'MAT4')
    o.doc['skins'].append({'joints': list(range(len(J))), 'inverseBindMatrices': ibm_acc, 'skeleton': 0, 'name': 'edg'})
    mesh_node = len(o.doc['nodes'])
    o.doc['nodes'].append({'name': f'dragon_{name}_mesh', 'mesh': 0, 'skin': 0})
    o.doc['scenes'][0]['nodes'] = [0, mesh_node]
    path = os.path.join(OUT, f'dragon_{name}.glb')
    o.save(path)
    meta = dict(name=name, joints=[dict(name=j['name'], parent=j['parent'], pos=np.round(j['pos'], 5).tolist(),
                                        tip=None if j['tip'] is None else np.round(j['tip'], 5).tolist(), deform=j['deform']) for j in J],
                height=float(src.P[:, 1].max()), jaw=jaw_mode, jawScale=JAW_SCALE[jaw_mode], bbox=[src.P.min(0).round(4).tolist(), src.P.max(0).round(4).tolist()])
    json.dump(meta, open(os.path.join(OUT, f'dragon_{name}.json'), 'w'), indent=1)
    print(f'{name}: {len(J)} joints, {os.path.getsize(path) / 1e6:.1f} MB -> {path}')
    return path


def main(names):
    for name in names or ['black', 'green', 'red', 'undead']:
        src, M, J = build(name)
        jm = load_landmarks()[name].get('jaw_mode', 'jaw')
        W, lab, names_ = skin(M, J, jaw_mode=jm)
        W = wing_membrane(M, J, W, names_)
        W = seam_blend(M, W, names_)
        Jw, Ww = top4(W)
        np.save(os.path.join(HERE, f'.lab_{name}.npy'), lab) if os.environ.get('KEEP_LAB') else None
        write(name, src, M, J, Jw, Ww, jaw_mode=jm)


if __name__ == '__main__':
    main(sys.argv[1:])
