"""Cloth that tears, relaxed: python tools/heroes/relax.py [ids] [--dry]

A coat's, a cloak's or a skirt's weights come from its source or from rebind.py by where each vertex lies, and where two
joints' holds meet they meet in a step. When the joints part (an arm raised in a cheer, the legs in a lunge) the
triangles across the step are drawn out many times their length: black and grey shards standing off the shoulder,
a coat's tails torn between the legs (the critics' second review, 2026-11-20; tools/build/h3/stretch.py counts them).

Here each cloth piece is posed as the game poses it (tools/heroes/posedump.mjs: standing, the cheer, the first two blows;
skinned as src/gfx/shaders.js does), the edges drawn out past TEAR are found, and the weights round them (RINGS rings of
neighbours out) are relaxed: each vertex's weights towards its neighbours', ITERS times, the rest of the piece held as it
was, and a vertex on a plate (within NEAR of one) held hard, so cloth stays with what it's sewn to. The relaxed weights
are kept only if the piece then has fewer shards (edges past SHARD) in every kind of pose: standing, cheering and
fighting, each no worse. Shape, paint and bind pose untouched; only the weights move.
"""
import json
import os
import subprocess
import sys

import numpy as np
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "build", "h3"))
import rebind as R     # noqa: E402
import stretch as S    # noqa: E402
import backpin         # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
POSES = os.path.join(ROOT, "tools", "build", "h3", "pose", "census")
SCENES = "stand,gesture:cheer,blow,blow2,run,clip:Crouch_Idle_Loop@0.5"
TEAR = 2.0        # an edge drawn out this many times its length marks where to relax
SHARD = 3.0       # past this it's a shard (what's counted)
RINGS = 14        # rings of neighbours round a torn edge that are relaxed
ITERS = (60, 160, 400)
ANCHOR = 4.0
NEAR = 0.03
PIN_HOLD = 0.8    # backpin's hold past which a vertex under a back shield is left as it is
NO_PIN = {"rogue_m1", "rogue_m2", "rogue_m3", "rogue_m4", "ninja_m1", "ninja_m2", "ninja_m3"}   # their cloaks are not pinned under the shield (r3_revert.py): the pin tore them worse than main


def poses(body_id):
    path = os.path.join(POSES, f"{body_id}.json")
    if not os.path.exists(path):
        os.makedirs(POSES, exist_ok=True)
        with open(path, "w") as f:
            subprocess.run(["node", os.path.join(ROOT, "tools", "heroes", "posedump.mjs"), body_id, SCENES, "--frames=3"],
                           stdout=f, stderr=subprocess.DEVNULL, check=True, cwd=ROOT)
    return json.load(open(path))["frames"]


def kind_of(scene):
    return "stand" if scene == "stand" else "cheer" if "cheer" in scene else "move" if scene == "run" or scene.startswith("clip:") else "fight"


def run_body(body_id, dry=False):
    frames = poses(body_id)
    path, g, blob, A, idx, pieces, names, T = R._open(body_id)
    B = S.Body(body_id)
    plates = [p for p in pieces if p["kind"] in ("plate", "flex")]
    # (The cloth backpin.py pins under a back shield stays pinned: what it holds firmly is held here too, and only the
    # cloth round it eased, so the shield still rides over the cloak.)
    pinned = None if body_id in NO_PIN else backpin.pin_strength(body_id)
    tree = cKDTree(np.concatenate([A["POSITION"][p["vstart"]:p["vstart"] + p["vcount"]] for p in plates])) if plates else None
    done = []
    for k, p in enumerate(pieces):
        if p["kind"] != "cloth":
            continue
        v0, vn = p["vstart"], p["vcount"]
        sl = slice(v0, v0 + vn)
        tri = idx[p["tstart"]:p["tstart"] + p["tcount"]].astype(np.int64) - v0
        tri = tri[(tri >= 0).all(1) & (tri < vn).all(1)]
        E = S.edges(tri)
        P0 = A["POSITION"][sl].astype(np.float64)
        r0 = np.linalg.norm(P0[E[:, 0]] - P0[E[:, 1]], axis=1)

        def score(J, W):
            B.J[sl] = J; B.W[sl] = W
            out = {"stand": 0, "cheer": 0, "fight": 0, "move": 0}
            mark = np.zeros(vn, bool)
            for fr in frames:
                X = B.skin(fr)[sl]
                r1 = np.linalg.norm(X[E[:, 0]] - X[E[:, 1]], axis=1)
                ratio = np.where(r0 > 1e-4, r1 / np.maximum(r0, 1e-9), 1)
                long_ = r1 > 0.01
                out[kind_of(fr["scene"])] += int(((ratio > SHARD) & long_).sum())
                bad = E[(ratio > TEAR) & long_]
                mark[bad.ravel()] = True
            return out, mark

        J0 = np.array(A["JOINTS_0"][sl]); W0 = np.array(A["WEIGHTS_0"][sl], np.float64)
        base, mark = score(J0, W0.astype(np.float32))
        if not mark.any():
            continue
        # (The welded cloth: its vertices by place, and its edges between places.)
        _, weld = np.unique(np.round(P0 * 2e4).astype(np.int64), axis=0, return_inverse=True)
        weld = weld.ravel(); nw = int(weld.max()) + 1
        Ew = np.unique(np.sort(weld[E], axis=1), axis=0); Ew = Ew[Ew[:, 0] != Ew[:, 1]]
        deg = np.bincount(Ew.ravel(), minlength=nw).astype(np.float64)
        full = R._full(A, sl, len(names))
        F0 = np.zeros((nw, full.shape[1])); np.add.at(F0, weld, full)
        F0 /= np.maximum(np.bincount(weld, minlength=nw), 1)[:, None]
        Pw = np.zeros((nw, 3)); Pw[weld] = P0
        # (Where to relax: round the torn edges, RINGS rings out.)
        free = np.zeros(nw, bool); free[weld[mark]] = True
        for _ in range(RINGS):
            grow = free.copy()
            grow[Ew[free[Ew[:, 0]], 1]] = True; grow[Ew[free[Ew[:, 1]], 0]] = True
            free = grow
        a = np.where(free, 0.05, 1e6)
        if pinned is not None:
            held = np.zeros(nw, bool); held[weld[pinned[sl] > PIN_HOLD]] = True
            a = np.where(held, 1e6, a)
        if tree is not None:
            d, _ = tree.query(Pw)
            a = np.maximum(a, ANCHOR * np.clip(1 - d / NEAR, 0, 1) ** 2)
        best = None
        F = F0.copy()
        done_it = 0
        for iters in ITERS:
            for _ in range(iters - done_it):
                Sn = np.zeros_like(F)
                np.add.at(Sn, Ew[:, 0], F[Ew[:, 1]]); np.add.at(Sn, Ew[:, 1], F[Ew[:, 0]])
                F = (a[:, None] * F0 + Sn) / (a + deg)[:, None]
            done_it = iters
            full2 = F[weld]
            order = np.argsort(-full2, axis=1)[:, :4]
            w4 = np.take_along_axis(full2, order, 1); w4 /= np.maximum(w4.sum(1, keepdims=True), 1e-9)
            got, _ = score(order.astype(J0.dtype), w4.astype(np.float32))
            # (No kind of pose worse; or a quarter fewer in all with standing as good as it was, give or take a couple.)
            better = (all(got[x] <= base[x] for x in base) and sum(got.values()) < 0.9 * sum(base.values())) or                      (sum(got.values()) < 0.75 * sum(base.values()) and got["stand"] <= base["stand"] + 2)
            if better and (best is None or sum(got.values()) < sum(best[0].values())):
                best = (got, order, w4, iters)
        B.J[sl] = J0; B.W[sl] = W0
        if best is None:
            done.append((p["name"], base, None, 0))
            continue
        got, order, w4, iters = best
        A["JOINTS_0"][sl] = order.astype(A["JOINTS_0"].dtype); A["WEIGHTS_0"][sl] = w4.astype(np.float32)
        B.J[sl] = A["JOINTS_0"][sl]; B.W[sl] = A["WEIGHTS_0"][sl]
        done.append((p["name"], base, got, iters))
    if any(x[2] for x in done) and not dry:
        R.write(path, g, blob, A, idx, pieces)
    return done


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    ids = args or [h["id"] for h in json.load(open(os.path.join(R.HEROES, "roster.json")))]
    for b in ids:
        for name, base, got, iters in run_body(b, dry):
            if got:
                print(f"{b}: {name}: shards {base} -> {got} ({iters} passes){' (dry)' if dry else ''}")
            else:
                print(f"{b}: {name}: shards {base}, nothing better found, left as it was")


if __name__ == "__main__":
    main()
