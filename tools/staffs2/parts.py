"""Lists a cut staff's connected pieces (welded), biggest first, with their boxes in item metres. python parts.py id..."""
import sys
import numpy as np
import cut, preview

for n in sys.argv[1:]:
    g = preview.load(n)
    P, F = g["P"], g["F"]
    w = cut.weld(P)
    lab = cut.labels(w[F], w.max() + 1)[w[F[:, 0]]]
    ids, cnt = np.unique(lab, return_counts=True)
    print(n, len(ids), "pieces")
    for i in ids[np.argsort(-cnt)][:40]:
        V = P[np.unique(F[lab == i])]
        lo, hi = V.min(0), V.max(0)
        if (lab == i).sum() < 12: continue
        print(f"  {(lab == i).sum():6d} tris  y {lo[1]:+.3f}..{hi[1]:+.3f}  z {lo[2]:+.3f}..{hi[2]:+.3f}  x {lo[0]:+.3f}..{hi[0]:+.3f}")
