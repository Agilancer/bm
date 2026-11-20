"""The crowd's hands, rigged from their own meshes in Blender.

Meshy sculpts a hand well (flat and open, five fingers) and rigs it badly: on 132 of the 236 hands of Phobos's people no
vert followed any finger joint, so nothing could close them (the karate chop on every passer-by), and on the rest only a
few did, off joints that lay up to 80 degrees round from the fingers. Here each hand's fingers are found in its mesh
(segment, plan), its fifteen finger joints are put in them, every vert is weighted to the hand and its fingers afresh,
and the hand's rest is turned to lie and face as hers does (apply). The mesh itself isn't touched.

After that her clips' own fingers carry over like any other joint, and they are all a hand needs: a loose curl walking
and standing, a fist running. (bake_hands puts right the clips that had them wrong. The game adds no curl of its own any
more: it used to, about each of her finger joints' own z, which on her skeleton is the hinge on some joints and the
palm's normal on others.)

    g = {'__file__': R + '/tools/folk/hands.py'}; exec(open(g['__file__']).read(), g); g['setroot'](R)
    g['apply'](body)          every fitted body (folk.json "upright"); a record of each in tools/folk/hands_report.json
    g['bake_hands']()         once, after the clips are packed
    g['posed_sheet'](...)     to look: hands as the game poses them (tools/folk/hands_check.mjs checks that against the game)
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else None
RF = {}
FINGERS = ("Thumb", "Index", "Middle", "Ring", "Pinky")


def setroot(root):
    RF.clear()
    RF["__file__"] = os.path.join(root, "tools", "folk", "rig_fit.py")
    exec(open(RF["__file__"]).read(), RF)
    RF["setroot"](root)
    globals()["ROOT"] = root


def _pca(V):
    c = V.mean(0); ev, U = np.linalg.eigh((V - c).T @ (V - c) / max(len(V), 1))
    return c, ev, U


def hand(B, side):
    """One hand as its mesh has it (bind pose): its frame, and each finger's cloud of verts against its joints."""
    idx, P, v, jo, we = B["idx"], B["P"], B["pos"].astype(np.float64), B["jo"], B["we"]
    hj = [i for n, i in idx.items() if n.startswith(side + "Hand")]
    wsum = np.zeros(len(v))
    for k in range(4): wsum += np.where(np.isin(jo[:, k], hj), we[:, k], 0)
    hm = wsum > 0.5
    if hm.sum() < 40: return None
    H = v[hm]; wrist = P[idx[side + "Hand"]]
    fj = {f: [idx[side + "Hand" + f + str(i)] for i in (1, 2, 3) if side + "Hand" + f + str(i) in idx] for f in FINGERS}
    fw = {}
    for f in FINGERS:
        w = np.zeros(len(v))
        for k in range(4): w += np.where(np.isin(jo[:, k], fj[f]), we[:, k], 0)
        fw[f] = w
    four = np.zeros(len(v), bool)
    for f in FINGERS[1:]: four |= fw[f] > 0.5
    c, ev, U = _pca(H)
    # Along the hand: wrist to the middle of its far half (the fingers, whatever joints they follow or don't).
    L0 = c - wrist; L0 /= np.linalg.norm(L0); a0 = (H - wrist) @ L0
    L = H[a0 > 0.5 * a0.max()].mean(0) - wrist; L /= np.linalg.norm(L)
    # The palm's normal: the hand's flattest way, square to its length.
    N = U[:, 0] - L * (U[:, 0] @ L)
    flat = float(ev[0] / ev.sum())
    if np.linalg.norm(N) < 0.3: N = U[:, 1] - L * (U[:, 1] @ L)
    N /= np.linalg.norm(N)
    A = np.cross(L, N)
    # Which face is the palm: the thumb's side by its verts, and failing that its joint; a right hand's palm is across x
    # along seen from its back. (Also kept: what the body says, a hand at rest never showing its palm up and out.)
    th = fw["Thumb"] > 0.5
    tside = None
    if th.sum() > 10: tside = v[th].mean(0) - (wrist + L * ((v[th].mean(0) - wrist) @ L))
    elif fj["Thumb"]: tside = P[fj["Thumb"][0]] - (wrist + L * ((P[fj["Thumb"][0]] - wrist) @ L))
    out = dict(side=side, n=int(hm.sum()), flat=round(flat, 3), wrist=wrist, L=L, N=N, mask=hm, fw=fw, fj=fj, fingers={})
    sgn = 1 if side == "Right" else -1
    if tside is not None and np.linalg.norm(tside) > 1e-4:
        ts = tside - L * (tside @ L)
        out["thumb_in_plane"] = round(float(abs(ts @ A) / (np.linalg.norm(ts) + 1e-9)), 2)
        Pn = np.cross(ts, L) * sgn
        if Pn @ N < 0: N = -N
        out["N"] = N; A = np.cross(L, N)
    out["A"] = A
    for f in FINGERS:
        m = fw[f] > 0.5; js = fj[f]
        d = dict(n=int(m.sum()))
        if len(js) >= 2:
            ch = P[js[-1]] - P[js[0]]; d["chain_len"] = float(np.linalg.norm(ch)); ch = ch / (np.linalg.norm(ch) + 1e-9); d["chain"] = ch
            d["chain_to_L"] = round(float(np.degrees(np.arccos(np.clip(ch @ L, -1, 1)))), 0)
        if m.sum() >= 12:
            fc, fev, fU = _pca(v[m]); ax = fU[:, 2] * (1 if fU[:, 2] @ L > 0 else -1)
            d.update(c=fc, ax=ax, long=round(float(np.sqrt(fev[2] / (fev[1] + 1e-12))), 1), across=round(float((fc - wrist) @ A) * 100, 1),
                     up=round(float((fc - wrist) @ N) * 100, 1))
            if len(js) >= 2:
                d["chain_to_mesh"] = round(float(np.degrees(np.arccos(np.clip(abs(d["chain"] @ ax), -1, 1)))), 0)
                # How far the first joint sits off the finger it moves (cm, off the cloud's own long axis).
                r = P[js[0]] - fc; d["j1_off"] = round(float(np.linalg.norm(r - ax * (r @ ax))) * 100, 1)
                # The finger as modelled: how far it droops toward the palm from the hand's own length (degrees).
                d["droop"] = round(float(np.degrees(np.arctan2(ax @ N, ax @ L))), 0)
        out["fingers"][f] = d
    return out


def audit(ks, verbose=False):
    rows = {}
    for k in ks:
        B = RF["body"](k); r = {}
        for side in ("Left", "Right"):
            h = hand(B, side)
            if h is None: r[side] = None; continue
            fs = h["fingers"]
            r[side] = dict(n=h["n"], flat=h["flat"], tip=h.get("thumb_in_plane"),
                           fn=[fs[f]["n"] for f in FINGERS],
                           c2m=[fs[f].get("chain_to_mesh") for f in FINGERS],
                           c2L=[fs[f].get("chain_to_L") for f in FINGERS],
                           off=[fs[f].get("j1_off") for f in FINGERS],
                           across=[fs[f].get("across") for f in FINGERS],
                           droop=[fs[f].get("droop") for f in FINGERS],
                           long=[fs[f].get("long") for f in FINGERS])
        rows[k] = r
        if verbose: print(k, r)
    return rows


# ---- Finding the fingers in a hand's mesh ----
# Meshy's hands are sculpted well (five separate fingers, flat and open) and rigged badly: on more than half of them no
# vert follows any finger joint, and on the rest only a few do. The fingers are found from the mesh alone: the distance
# over the surface from the wrist grows out along each finger to its tip, and sweeping that distance downward from the
# tips, each finger is a patch that stays apart from its neighbours until the webbing between them (a merge tree).

def weld(B):
    """Verts that share a place (split along UV seams) as one: the welded id of each vert."""
    if "weld" not in B:
        key = np.round(B["pos"].astype(np.float64) / 2e-5).astype(np.int64)
        _, inv = np.unique(key, axis=0, return_inverse=True)
        B["weld"] = inv.reshape(-1)
    return B["weld"]


def segment(B, side, min_pers=0.015):
    import heapq
    h = hand(B, side)
    if h is None: return None
    v = B["pos"].astype(np.float64); F = RF["faces"](B); wid = weld(B)
    nw = int(wid.max()) + 1
    pw = np.zeros((nw, 3)); pw[wid] = v
    reg = np.zeros(nw, bool); reg[wid[h["mask"]]] = True
    Fw = wid[F]; Fw = Fw[reg[Fw].all(1)]
    adj = [[] for _ in range(nw)]
    for a, b in ((0, 1), (1, 2), (2, 0)):
        for x, y in zip(Fw[:, a], Fw[:, b]):
            if x != y:
                l = float(np.linalg.norm(pw[x] - pw[y])); adj[x].append((y, l)); adj[y].append((x, l))
    along = (pw - h["wrist"]) @ h["L"]
    ids = np.nonzero(reg)[0]
    # (From the wrist end of the hand's own skin: the piece of the mesh that reaches furthest out, not a bracelet or a
    # cuff sculpted as a shell of its own round the wrist.)
    seen = {}; best = None
    for i in ids:
        i = int(i)
        if i in seen or not adj[i]: continue
        stack = [i]; seen[i] = i; mem = [i]
        while stack:
            x = stack.pop()
            for y, _ in adj[x]:
                if y not in seen: seen[y] = i; stack.append(y); mem.append(y)
        ext = float(along[mem].max() - along[mem].min())
        if best is None or ext > best[0]: best = (ext, mem)
    main = np.array(best[1]) if best else ids
    a0 = max(float(along[main].min()) + 0.01, 0.0)
    src = [int(i) for i in main if along[i] <= a0]
    d = np.full(nw, np.inf); pq = []
    for s in src: d[s] = 0.0; pq.append((0.0, int(s)))
    heapq.heapify(pq)
    while pq:
        dv, x = heapq.heappop(pq)
        if dv > d[x]: continue
        for y, l in adj[x]:
            if dv + l < d[y]: d[y] = dv + l; heapq.heappush(pq, (dv + l, int(y)))
    order = [int(i) for i in ids[np.argsort(-d[ids])] if np.isfinite(d[i])]
    root = {}; comp = {}
    def find(x):
        while root[x] != x:
            root[x] = root[root[x]]; x = root[x]
        return x
    branches = []
    for x in order:
        rs = {find(y) for y, _ in adj[x] if y in root}
        if not rs:
            root[x] = x; comp[x] = dict(birth=d[x], tip=x, members=[x], rec=False); continue
        sig = [r for r in rs if comp[r]["birth"] - d[x] >= min_pers and len(comp[r]["members"]) >= 6]
        if len(sig) >= 2:
            for r in sig:
                c = comp[r]
                if not c["rec"]:
                    # (with: the tips of what it met there, so fingers that part only near their tips can be told.)
                    branches.append(dict(tip=c["tip"], birth=float(c["birth"]), level=float(d[x]), members=list(c["members"]),
                                         met=[comp[o]["tip"] for o in sig if o != r]))
        keep = max(rs, key=lambda r: comp[r]["birth"]); ck = comp[keep]
        ck["rec"] = ck["rec"] or len(sig) >= 2 or any(comp[r]["rec"] for r in rs)
        for r in rs:
            if r != keep:
                ck["members"].extend(comp[r]["members"]); root[r] = keep; del comp[r]
        root[x] = keep; ck["members"].append(x)
    amax = float(along[ids].max())
    branches = [b for b in branches if along[b["tip"]] > 0.3 * amax]
    branches.sort(key=lambda b: b["level"] - b["birth"])
    return dict(hand=h, pw=pw, wid=wid, d=d, along=along, adj=adj, reg=reg, branches=branches[:6], all=branches, amax=amax, nsrc=len(src))


def _S(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


W0 = 0.105          # a finger's width, as a share of the hand's length (wrist to the longest tip)
MCP_BELOW = 0.09    # a knuckle sits this far (share of the hand's length) toward the wrist from its finger's webbing
FUSED = 0.77        # webbing further out than this share of the hand's length: those fingers are sculpted together
MCP_BLOB = 0.55     # fingers sculpted together: their knuckles' row, as a share of the hand's length
PIP, DIP = 0.44, 0.70                  # the two finger joints past the knuckle, as shares of knuckle to tip
HALF = (0.055, 0.028, 0.028)           # half the width of the blend at each joint (share of the hand's length)


def _polydist(p, pts):
    best = (1e9, 0.0); acc = 0.0
    for a, b2 in zip(pts[:-1], pts[1:]):
        ab = b2 - a; l = np.linalg.norm(ab); t = np.clip((p - a) @ ab / (l * l), 0, 1); q = a + ab * t
        dd = np.linalg.norm(p - q)
        if dd < best[0]: best = (dd, acc + t * l)
        acc += l
    return best


def plan(B, side):
    """Where a hand's fifteen finger joints belong, and how its verts follow them: the thumb's branch, the four fingers
    as one to four groups (fingers sculpted touching curl together, off the middle one's joints), each joint's place and
    hinge (a turn about it closes the finger toward the palm), and each vert's weights."""
    sg = segment(B, side, min_pers=0.010)
    if sg is None: return None
    h = sg["hand"]; pw, al, d, amax = sg["pw"], sg["along"], sg["d"], sg["amax"]
    L, N, wrist = h["L"], h["N"], h["wrist"]
    A0 = np.cross(L, N); ac0 = (pw - wrist) @ A0
    br = [b for b in sg["all"] if len(b["members"]) >= 6]
    for b in br:
        m = np.array(b["members"]); lo = m[d[m] < b["level"] + 0.004]
        if len(lo) < 3: lo = m[d[m] <= np.percentile(d[m], 15)]
        b["m"] = m; b["base_al"] = float(al[lo].mean()); b["base"] = pw[lo].mean(0); b["tip_al"] = float(al[b["tip"]]); b["pers"] = b["birth"] - b["level"]
    notes = []
    # The thumb: free for 1.5 cm or more, out to the side, and the branch that leaves the hand nearest the wrist.
    # (And short, and the furthest out to its side of anything. Where a little finger could pass for it, the body says
    # which: sculpted arms out, nobody's palms face up or back, so the thumb is on the side that turns the palm down or
    # forward.)
    sgn = 1 if side == "Right" else -1
    F = RF["body_frame"](B["P"], B["idx"])
    def palm_ok(sign):
        p = F @ (np.cross(A0 * sign, L) * sgn)
        return float(-p[1] + p[2])
    far = [ac0[b["tip"]] for b in br if b["pers"] >= 0.010 and b["tip_al"] > 0.45 * amax]
    cands = [b for b in br if b["pers"] >= 0.015 and len(b["m"]) >= 10 and b["base_al"] < 0.72 * amax and b["tip_al"] < 0.9 * amax
             and abs(ac0[b["tip"]]) > 0.022 and (ac0[b["tip"]] >= max(far) - 1e-9 or ac0[b["tip"]] <= min(far) + 1e-9)]
    good = [b for b in cands if palm_ok(1.0 if ac0[b["tip"]] > 0 else -1.0) > 0]
    thumb = min(good, key=lambda b: b["tip_al"]) if good else None
    if thumb is not None: s = 1.0 if ac0[thumb["tip"]] > 0 else -1.0
    else:
        notes.append("nothumb"); s = 1.0 if palm_ok(1.0) > 0 else -1.0
    A = A0 * s; P = np.cross(A, L) * sgn; ac = ac0 * s
    tm = set(int(x) for x in thumb["members"]) if thumb is not None else set()
    groups = [b for b in br if b is not thumb and b["tip"] not in tm and b["tip_al"] > 0.6 * amax]
    reg = np.nonzero(sg["reg"])[0]
    if not groups:
        m = np.array([i for i in reg if al[i] > MCP_BLOB * amax and int(i) not in tm and np.isfinite(d[i])])
        if len(m) < 12: return dict(fail="no fingers", notes=notes)
        groups = [dict(m=m, tip=int(m[np.argmax(al[m])]), tip_al=float(al[m].max()), base_al=MCP_BLOB * amax, pers=0.0)]
        notes.append("mitten")
    # Fingers that part only near their tips (their webbing past FUSED of the hand's length) are one group.
    owner = {}
    for gi, b in enumerate(groups):
        for x in b["m"]: owner[int(x)] = gi
    par = list(range(len(groups)))
    def top(i):
        while par[i] != i: i = par[i]
        return i
    for gi, b in enumerate(groups):
        if b["base_al"] > FUSED * amax:
            for t in b.get("met", []):
                o = owner.get(int(t))
                if o is not None: par[top(gi)] = top(o)
    merged = {}
    for gi, b in enumerate(groups):
        r = top(gi)
        if r not in merged: merged[r] = dict(m=[], tip=b["tip"], tip_al=b["tip_al"], base_al=MCP_BLOB * amax, pers=b["pers"], parts=0)
        g = merged[r]; g["m"].extend(int(x) for x in b["m"]); g["parts"] += 1; g["pers"] = max(g["pers"], b["pers"])
        if b["tip_al"] > g["tip_al"]: g["tip"], g["tip_al"] = b["tip"], b["tip_al"]
        if par[gi] == gi and g["parts"] == 1: g["base_al"] = b["base_al"]
    groups = []
    for r, g in merged.items():
        g["m"] = np.array(g["m"])
        if g["parts"] > 1: g["base_al"] = MCP_BLOB * amax
        groups.append(g)
    groups.sort(key=lambda b: -b["pers"]); groups = sorted(groups[:4], key=lambda b: -float(ac[b["m"]].mean()))
    w0 = W0 * amax
    for b in groups:
        m = b["m"]; f = m[al[m] > max(b["base_al"], 0.6 * amax)]
        if len(f) < 4: f = m
        wmax = 0.0
        for lv in np.arange(al[f].min(), al[f].max(), 0.004):
            sl = f[np.abs(al[f] - lv) < 0.003]
            if len(sl) >= 3: wmax = max(wmax, float(np.ptp(ac[sl])))
        b["free"] = f; b["width"] = wmax; b["n"] = max(b.get("parts", 1), int(round(wmax / w0)))
    while sum(b["n"] for b in groups) > 4: max(groups, key=lambda b: (b["n"], -b["width"] / b["n"]))["n"] -= 1
    while sum(b["n"] for b in groups) < 4: max(groups, key=lambda b: b["width"] / b["n"])["n"] += 1
    # Each finger's line: its knuckle, its tip, the way it points. A finger on its own keeps its own line (through its
    # verts); fingers together share the hand's length for a direction and split their width evenly.
    fingers = []
    for gi, b in enumerate(groups):
        f = b["free"]; n = b["n"]
        if n == 1:
            c, ev, U = _pca(pw[b["m"]]); u = U[:, 2] * (1 if U[:, 2] @ L > 0 else -1)
            if ev[2] < 2.2 * ev[1] or u @ L < 0.75: u = L.copy()
            mcp_al = float(np.clip(b["base_al"] - MCP_BELOW * amax, 0.42 * amax, 0.60 * amax))
            t0 = (mcp_al - (c - wrist) @ L) / (u @ L)
            J1 = c + u * t0; tip = c + u * float(((pw[b["m"]] - c) @ u).max())
            fingers.append(dict(J1=J1, tip=tip, u=u, group=gi, driver=True))
        else:
            lo, hi = float(ac[f].min()), float(ac[f].max()); nm = float(((pw[f] - wrist) @ N).mean())
            drv = (n - 1) // 2
            for k in range(n):
                # (Slots from the thumb's side: across runs toward the thumb, so the first slot is the highest.)
                a_c = hi - (k + 0.5) / n * (hi - lo)
                sl = f[np.abs(ac[f] - a_c) < (hi - lo) / n / 2]
                tip_al = float(al[sl].max()) if len(sl) else b["tip_al"]
                J1 = wrist + L * (MCP_BLOB * amax) + A * a_c + N * nm
                tip = wrist + L * tip_al + A * a_c + N * nm
                fingers.append(dict(J1=J1, tip=tip, u=L.copy(), group=gi, driver=k == drv))
            # (One unit: every chain in it hinges where the driver does.)
            dt = max(float((fg["tip"] - wrist) @ L) for fg in fingers[-n:])
            for fg in fingers[-n:]: fg["tip"] = fg["tip"] + L * (dt - float((fg["tip"] - wrist) @ L))
    # (The knuckles lie in a row: one read far off the others' line, an index measured from the thumb's webbing, is
    # brought back to within 3% of the hand's length of the middle of them; a little finger may sit 9% short.)
    mal = [float((fg["J1"] - wrist) @ L) for fg in fingers]
    med = float(np.median(mal[:3]))
    for i, fg in enumerate(fingers):
        lo_, hi_ = med - (0.09 if i == 3 else 0.03) * amax, med + 0.03 * amax
        want = float(np.clip(mal[i], lo_, hi_))
        if abs(want - mal[i]) > 1e-6: fg["J1"] = fg["J1"] + fg["u"] * ((want - mal[i]) / float(fg["u"] @ L))
    for fg in fingers:
        ln = float(np.linalg.norm(fg["tip"] - fg["J1"])); fg["len"] = ln
        fg["J"] = [fg["J1"], fg["J1"] + fg["u"] * ln * PIP, fg["J1"] + fg["u"] * ln * DIP]
        hg = np.cross(fg["u"], P); fg["hinge"] = hg / np.linalg.norm(hg)
    # The thumb's joints: its second at the root of its free part, its third half way out, its first a third of the way
    # from the wrist to the second; it closes toward the palm and the index's knuckle.
    T = None
    if thumb is not None:
        m = thumb["m"]; c, ev, U = _pca(pw[m]); tipv = pw[thumb["tip"]]
        u = U[:, 2] * (1 if U[:, 2] @ (tipv - thumb["base"]) > 0 else -1)
        if ev[2] < 1.6 * ev[1]: u = (tipv - thumb["base"]) / np.linalg.norm(tipv - thumb["base"])
        pr = (pw[m] - c) @ u; low = d[m] < thumb["level"] + 0.004
        s_lo = float(np.median(pr[low])) if low.any() else float(pr.min())
        s_hi = float(pr.max()); Lt = s_hi - s_lo
        J2 = c + u * (s_lo - 0.08 * Lt); J3 = c + u * (s_lo + 0.5 * Lt); tip = c + u * s_hi
        J1 = wrist + (J2 - wrist) * 0.32
        ix = fingers[0]["J1"] - J2
        to = P * 0.6 + ix / (np.linalg.norm(ix) + 1e-9) * 0.4
        hg = np.cross(u, to); hg /= np.linalg.norm(hg)
        rad = float(np.median(np.linalg.norm((pw[m] - c) - np.outer(pr, u), axis=1)))
        T = dict(J=[J1, J2, J3], tip=tip, u=u, hinge=hg, rad=max(rad, 0.006), len=Lt)
    # Whose each vert is: its own group's, the thumb's, or the nearest line's; then eased over the surface, so webbing
    # and fingers sculpted together blend, and fingers that stand apart don't.
    drivers = [i for i, fg in enumerate(fingers) if fg["driver"]]
    gdrv = {fingers[i]["group"]: ci for ci, i in enumerate(drivers)}
    ncls = len(drivers) + 1
    K = np.zeros((len(pw), ncls)); cls = {}
    for gi, b in enumerate(groups):
        for x in b["m"]: cls[int(x)] = gdrv[gi]
    for x in tm: cls[int(x)] = ncls - 1
    tpoly = None if T is None else [T["J"][0], T["J"][1], T["J"][2], T["tip"]]
    tdist = np.zeros(len(pw)); ts = np.zeros(len(pw))
    for x in reg:
        x = int(x); p = pw[x]
        if T is not None: tdist[x], ts[x] = _polydist(p, tpoly)
        if x in cls: K[x, cls[x]] = 1; continue
        best = None
        for ci, fi in enumerate(drivers):
            fg = fingers[fi]; r = p - fg["J1"]; dd = np.linalg.norm(r - fg["u"] * (r @ fg["u"]))
            if best is None or dd < best[0]: best = (dd, ci)
        if T is not None and tdist[x] < best[0]: best = (tdist[x], ncls - 1)
        K[x, best[1]] = 1
    adj = sg["adj"]
    for _ in range(3):
        K2 = K.copy()
        for x in reg:
            nb = adj[x]
            if nb: K2[x] = 0.5 * K[x] + 0.5 * np.mean([K[y] for y, _ in nb], axis=0)
        K = K2
    # Each vert's weights on the hand and the fifteen joints (welded verts, the hand's own share only).
    W = {}
    hb = [x * amax for x in HALF]
    for x in reg:
        x = int(x); p = pw[x]; w = {}
        for ci, fi in enumerate(drivers):
            a = K[x, ci]
            if a < 1e-3: continue
            fg = fingers[fi]; s = (p - fg["J1"]) @ fg["u"]; s2, s3 = fg["len"] * PIP, fg["len"] * DIP
            e1, e2, e3 = _S(s, -hb[0], hb[0]), _S(s, s2 - hb[1], s2 + hb[1]), _S(s, s3 - hb[2], s3 + hb[2])
            nm = side + "Hand" + FINGERS[1 + fi]
            for nmi, wv in ((nm + "1", e1 - e2), (nm + "2", e2 - e3), (nm + "3", e3)):
                if wv * a > 1e-4: w[nmi] = w.get(nmi, 0) + float(wv * a)
        a = K[x, ncls - 1]
        if T is not None and a > 1e-3:
            s = ts[x]; s2 = float(np.linalg.norm(T["J"][1] - T["J"][0])); s3 = s2 + float(np.linalg.norm(T["J"][2] - T["J"][1]))
            fall = 1.0 if x in tm else float(1 - _S(tdist[x], T["rad"] * 1.1, T["rad"] * 2.4))
            e1, e2, e3 = _S(s, 0.2 * s2, 0.75 * s2), _S(s, s2 - 0.008, s2 + 0.008), _S(s, s3 - 0.006, s3 + 0.006)
            nm = side + "HandThumb"
            for nmi, wv in ((nm + "1", e1 - e2), (nm + "2", e2 - e3), (nm + "3", e3)):
                if wv * a * fall > 1e-4: w[nmi] = w.get(nmi, 0) + float(wv * a * fall)
        tot = sum(w.values())
        if tot > 1: w = {k2: v2 / tot for k2, v2 in w.items()}; tot = 1.0
        w[side + "Hand"] = 1 - tot
        W[x] = w
    return dict(side=side, sg=sg, L=L, A=A, P=P, N=N, wrist=wrist, amax=amax, fingers=fingers, thumb=T, groups=groups, W=W, notes=notes,
                shape=[b["n"] for b in groups])


def curled(B, pl, curl):
    """The hand's verts with its fingers curled (to look at, before anything is written): curl is radians per finger
    (thumb first) per joint, as the game's; each joint turns about its hinge, a finger's three in a chain."""
    v = B["pos"].astype(np.float64).copy(); wid = pl["sg"]["wid"]; side = pl["side"]
    chains = {}
    for fi, fg in enumerate(pl["fingers"]): chains[FINGERS[1 + fi]] = (fg["J"], fg["hinge"], curl[1 + fi])
    if pl["thumb"] is not None: chains["Thumb"] = (pl["thumb"]["J"], pl["thumb"]["hinge"], [c * 0.8 for c in curl[0]])
    M = {}
    for f, (J, hg, cs) in chains.items():
        cur = np.eye(4)
        for i in range(3):
            Rm = RF["_rot_axis"](hg, cs[i]); T1 = np.eye(4); T1[:3, :3] = Rm; T1[:3, 3] = J[i] - Rm @ J[i]
            cur = cur @ T1; M[side + "Hand" + f + str(i + 1)] = cur.copy()
    out = v.copy(); reg = pl["sg"]["reg"]
    for i in np.nonzero(reg[wid])[0]:
        w = pl["W"].get(int(wid[i]))
        if not w: continue
        p = np.append(v[i], 1.0); acc = np.zeros(3)
        for nm, wv in w.items():
            acc += wv * ((M[nm] @ p)[:3] if nm in M else v[i])
        out[i] = acc
    return out




# ---- Writing a body's hands ----

BEND_CAP = 30.0     # the most a wrist is bent at rest to lay the hand along hers (degrees); the roll about its length is free


def her_hand(side):
    """Her hand at rest, in her body's frame: the way it points (wrist to the middle of her finger joints) and the way
    its palm faces (her knuckles' row and her thumb's side give it: thumb side cross length, for a right hand). Not her
    finger joints' own axes: on her skeleton a finger joint's z is the hinge on some joints and the palm's normal on
    others."""
    C = RF["clips"]()["meta"]["skeleton"]
    par = [j["parent"] for j in C]; T = np.array([j["t"] for j in C], np.float64); Rq = np.array([j["r"] for j in C], np.float64)
    WR, WT = RF["fk_rest"](par, T, Rq)
    idx = {j["name"].split(":")[-1]: i for i, j in enumerate(C)}
    HF = RF["body_frame"](WT, idx)
    fj = [idx[side + "Hand" + f + str(i)] for f in FINGERS[1:] for i in (1, 2, 3)]
    L = WT[fj].mean(0) - WT[idx[side + "Hand"]]; L /= np.linalg.norm(L)
    A = WT[idx[side + "HandIndex1"]] - WT[idx[side + "HandPinky1"]]; A -= L * (A @ L); A /= np.linalg.norm(A)
    P = np.cross(A, L) * (1 if side == "Right" else -1)
    return HF @ L, HF @ P


def _frame(L, P):
    P = P - L * (P @ L); P = P / np.linalg.norm(P)
    return np.stack([L, P, np.cross(L, P)], 1)


def apply(k, write=True):
    """Rigs both hands of a body from its mesh (plan) and writes them: the fifteen finger joints' places and frames
    (inverse binds and rests; y along the finger, z the hinge that closes it), every vert's weights on the hand and its
    fingers, and the hand's rest turned so it lies and faces as hers does. The mesh itself is not touched."""
    B = RF["body"](k); js = B["js"]; data, b0 = B["data"], B["b0"]
    names, parent, T, Rq = RF["skeleton"](js)
    base = [n.split(":")[-1] for n in names]; idx = {n: i for i, n in enumerate(base)}
    WRr, WTr = RF["fk_rest"](parent, T, Rq)
    RB = B["W"][:, :3, :3].copy(); Pb = B["W"][:, :3, 3].copy()
    Frest = RF["body_frame"](WTr, idx)
    at = B["prim"]["attributes"]
    JO = RF["view"](data, js, b0, at["JOINTS_0"]); WE = RF["view"](data, js, b0, at["WEIGHTS_0"])
    wmax = {np.dtype(np.float32): 1.0, np.dtype(np.uint8): 255.0, np.dtype(np.uint16): 65535.0}[WE.dtype]
    nodes = js["nodes"]; J = js["skins"][0]["joints"]; ibm = B["ibm"]
    rec = {}
    newR = {}; newP = {}       # rest world (rotation matrix, place) of the joints rewritten
    for side in ("Left", "Right"):
        pl = plan(B, side)
        if pl is None or pl.get("fail"):
            rec[side] = {"fail": (pl or {}).get("fail", "no hand")}; continue
        hj = idx[side + "Hand"]; fore = idx[side + "ForeArm"]
        # The hand's rest: as the forearm carries it, then its length laid along hers (a wrist's bend, capped) and its
        # palm turned to face as hers (free).
        R0 = RF["qmat"](WRr[fore]) @ RB[fore].T
        hL, hP = her_hand(side); Lt = Frest.T @ hL; Pt = Frest.T @ hP
        Lc = R0 @ pl["L"]; bend = float(np.degrees(np.arccos(np.clip(Lc @ Lt, -1, 1))))
        if bend > BEND_CAP:
            ax = np.cross(Lc, Lt); Lt = RF["_rot_axis"](ax, np.radians(BEND_CAP)) @ Lc
        Q = _frame(Lt, Pt) @ _frame(pl["L"], pl["P"]).T
        Pc = R0 @ pl["P"]; Pc -= Lt * (Pc @ Lt); Pn = Pt - Lt * (Pt @ Lt)
        roll = float(np.degrees(np.arccos(np.clip(Pc @ Pn / (np.linalg.norm(Pc) * np.linalg.norm(Pn) + 1e-12), -1, 1))))
        newR[hj] = Q @ RB[hj]; newP[hj] = WTr[hj]
        chains = [("Thumb", pl["thumb"])] + [(FINGERS[1 + i], fg) for i, fg in enumerate(pl["fingers"])]
        for f, fg in chains:
            for i in (0, 1, 2):
                j = idx.get(side + "Hand" + f + str(i + 1))
                if j is None: continue
                if fg is None:
                    # (No thumb found apart from the hand: its joints ride the hand where they were.)
                    Rn, Pn_ = RB[j], Pb[j]
                else:
                    y = fg["u"]; z = fg["hinge"] - y * (fg["hinge"] @ y); z /= np.linalg.norm(z)
                    Rn = np.stack([np.cross(y, z), y, z], 1); Pn_ = fg["J"][i]
                    M = np.eye(4); M[:3, :3] = Rn; M[:3, 3] = Pn_
                    ibm[j] = np.linalg.inv(M).T.reshape(16).astype(np.float32)
                newR[j] = Q @ Rn; newP[j] = WTr[hj] + Q @ (Pn_ - Pb[hj])
        # Weights: each vert's share on this hand and its fingers, dealt again.
        fam = {idx[n]: n for n in idx if n.startswith(side + "Hand")}
        wid = pl["sg"]["wid"]; Wn = pl["W"]
        jo = JO.astype(np.int64); we = WE.astype(np.float64) / wmax
        hs = np.zeros(len(jo))
        for c in range(4): hs += np.where(np.isin(jo[:, c], list(fam)), we[:, c], 0)
        for i in np.nonzero(hs > 1e-6)[0]:
            ent = {}
            for c in range(4):
                if we[i, c] > 0 and jo[i, c] not in fam: ent[int(jo[i, c])] = ent.get(int(jo[i, c]), 0) + we[i, c]
            w = Wn.get(int(wid[i]))
            if w is None: ent[hj] = ent.get(hj, 0) + hs[i]
            else:
                for nm, wv in w.items():
                    jj = idx.get(nm)
                    if jj is None: jj = hj
                    if wv > 0: ent[jj] = ent.get(jj, 0) + hs[i] * wv
            top = sorted(ent.items(), key=lambda e: -e[1])[:4]
            tot = sum(v2 for _, v2 in top)
            jw = [(j2, v2 / tot) for j2, v2 in top] + [(0, 0.0)] * (4 - len(top))
            if wmax == 1.0: vals = [v2 for _, v2 in jw]
            else:
                vals = [int(round(v2 * wmax)) for _, v2 in jw]; vals[0] += int(wmax) - sum(vals)
            for c in range(4): JO[i, c] = jw[c][0]; WE[i, c] = vals[c]
        rec[side] = {"fingers": pl["shape"], "thumb": pl["thumb"] is not None, "bend": round(min(bend, BEND_CAP), 1), "bent": round(bend, 1), "roll": round(roll, 1)}
    # Rests, each rewritten joint from its parent (parents first, as the joints are listed).
    for j in sorted(newR):
        p = parent[j]
        Rp = newR[p] if p in newR else RF["qmat"](WRr[p]); Pp = newP[p] if p in newP else WTr[p]
        q = RF["mat_q"](Rp.T @ newR[j]); q /= np.linalg.norm(q)
        nd = nodes[J[j]]
        nd["rotation"] = [float(x) for x in q]; nd["translation"] = [float(x) for x in Rp.T @ (newP[j] - Pp)]
        nd.pop("scale", None)
    ex = js.setdefault("asset", {}).setdefault("extras", {}).setdefault("rigfit", {})
    ex["hands"] = rec; ex.pop("palm", None)
    if write: RF["save"](B)
    return rec


# ---- Her clips' hands ----
# Her own clips hold their fingers in a loose curl, as a hand hangs: on a body whose fingers follow their joints that is
# all a walking hand needs. But the clips laid on her from the library (UAL) carry clenched fists whatever they are, a
# stroll and standing about as much as a jog, and a few of her own hold the fingers out dead straight. Each of those
# takes its fingers from a clip that has them right: a loose hand from her walk, a fist (for running and fighting) from
# the jog. Baked into clips.json / clips.bin, so every body gets them, hers and the first town's too.

LOOSE = ("walk", 0.0)
FIST = ("jog", 0.0)
HANDS = {"walk_ual": LOOSE, "walk_formal": LOOSE, "swagger": LOOSE, "idle_ual": LOOSE, "fold_arms_ual": LOOSE, "nod": LOOSE,
         "walk_proud": LOOSE, "rant": LOOSE, "frustrated": LOOSE, "cry": LOOSE, "sit_idle": LOOSE,
         "run": FIST, "spar": FIST, "hit": FIST}


def bake_hands():
    import re
    C = RF["clips"](); meta = C["meta"]; rot = C["rot"].copy(); sk = meta["skeleton"]
    fj = [i for i, j in enumerate(sk) if re.search(r"Hand(Thumb|Index|Middle|Ring|Pinky)[123]$", j["name"])]
    src = {}
    for s, tt in set(HANDS.values()):
        src[s] = RF["sample"](s, meta["clips"][s]["dur"] * tt)[0]
    extra = []; base = len(rot); done = []
    for clip, (s, tt) in HANDS.items():
        c = meta["clips"].get(clip)
        if c is None or c.get("hands") == s: continue
        tr = {t[0]: list(t) for t in c["tracks"]}
        for j in fj:
            q = src[s][j] / np.linalg.norm(src[s][j])
            tr[j] = [j, base + 4 * len(extra), 1]; extra.append(np.round(q * 32767).astype(np.int16))
        c["tracks"] = [tr[j] for j in sorted(tr)]; c["hands"] = s; done.append(clip)
    if not done: return []
    rot = np.concatenate([rot] + extra)
    if len(rot) % 2: rot = np.concatenate([rot, np.zeros(1, np.int16)])
    meta["hipsByteOffset"] = len(rot) * 2
    folk = os.path.join(ROOT, "assets", "game", "folk")
    open(os.path.join(folk, "clips.bin"), "wb").write(rot.tobytes() + C["hips"].tobytes())
    open(os.path.join(folk, "clips.json"), "w").write(json.dumps(meta, separators=(",", ":")))
    RF["_CLIPS"].clear()
    return done


# ---- Looking at hands in Blender ----

def posed_sheet(items, name="hands", cols=8, cw=0.5, ch=0.3):
    """A sheet of hands as the game poses them. items: (body, side, clip, t as a share of the clip). Each cell shows the
    hand twice, fingers up: from its thumb's side with the palm to the left, and onto the palm. (Look from -Y.)"""
    import bpy
    Vs = []; Fs = []; off = 0; cache = {}
    for n, (k, s, clip, tt) in enumerate(items):
        if k not in cache:
            B = RF["body"](k); cache[k] = (B, RF["Rig"](B), RF["faces"](B))
        B, rig, F = cache[k]
        dur = RF["clips"]()["meta"]["clips"][clip]["dur"]
        M, WT = rig.pose(clip, dur * tt); v = rig.skin(M)
        ix = {x.split(":")[-1]: i for i, x in enumerate(rig.names)}
        wrist = WT[ix[s + "Hand"]]
        k1 = [ix[s + "Hand" + f + "1"] for f in FINGERS[1:] if s + "Hand" + f + "1" in ix]
        L = WT[k1].mean(0) - wrist; L /= np.linalg.norm(L)
        A = WT[ix[s + "HandIndex1"]] - WT[ix[s + "HandPinky1"]]; A -= L * (A @ L); A /= np.linalg.norm(A)
        P = np.cross(A, L) * (1 if s == "Right" else -1)
        idx, jo, we = B["idx"], B["jo"], B["we"]
        hj = [i for x, i in idx.items() if x.startswith(s + "Hand")] + [idx[s + "ForeArm"]]
        w = np.zeros(len(v))
        for c in range(4): w += np.where(np.isin(jo[:, c], hj), we[:, c], 0)
        rel = v - wrist
        m = (w > 0.5) & (rel @ L > -0.05)
        f = F[m[F].all(1)]; used = np.unique(f); remap = -np.ones(len(v), int); remap[used] = np.arange(len(used)); f = remap[f]
        p = rel[used]; ox = (n % cols) * cw; oz = -(n // cols) * ch
        side = np.stack([-(p @ P) + ox, -(p @ A), p @ L + oz], 1)
        palm = np.stack([(p @ A) * (1 if s == "Right" else -1) + ox + 0.22, -(p @ P), p @ L + oz], 1)
        for q in (side, palm):
            Vs.append(q); Fs.append(f + off); off += len(q)
    me = bpy.data.meshes.new(name); me.from_pydata(np.vstack(Vs).tolist(), [], np.vstack(Fs).tolist())
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def clear():
    import bpy
    for o in [o for o in bpy.data.objects if o.type == "MESH"]: bpy.data.objects.remove(o)


def camera(x, z, scale, w, hgt, y=-12.0, turn=0.0):
    """The sheet's camera: straight on from -Y, `scale` metres across, centred at (x, z); turn swings it about the up."""
    import bpy, math
    sc = bpy.context.scene; cam = bpy.data.objects.get("SheetCam")
    if cam is None:
        cam = bpy.data.objects.new("SheetCam", bpy.data.cameras.new("SheetCam")); sc.collection.objects.link(cam)
    cam.data.type = "ORTHO"; cam.data.ortho_scale = scale; cam.data.clip_end = 200
    cam.rotation_euler = (math.pi / 2, 0, turn)
    cam.location = (x + y * -math.sin(turn) * -1, y * math.cos(turn), z) if turn else (x, y, z)
    sc.camera = cam; sc.render.resolution_x = w; sc.render.resolution_y = hgt
    return cam
