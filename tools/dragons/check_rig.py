"""Pictures of a fitted dragon: its skin coloured by the bone that owns each vertex, the skeleton drawn over it.

    python tools/dragons/check_rig.py black [out_dir]
"""
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbio import Source, accessor, load  # noqa: E402
from plot import palette, views  # noqa: E402
from fit import OUT  # noqa: E402


def main(name, out):
    path = os.path.join(OUT, f'dragon_{name}.glb')
    meta = json.load(open(os.path.join(OUT, f'dragon_{name}.json')))
    doc, buf = load(path)
    p = doc['meshes'][0]['primitives'][0]
    P = accessor(doc, buf, p['attributes']['POSITION'])
    N = accessor(doc, buf, p['attributes']['NORMAL'])
    js = accessor(doc, buf, p['attributes']['JOINTS_0']).astype(int)
    ws = accessor(doc, buf, p['attributes']['WEIGHTS_0'])
    tri = accessor(doc, buf, p['indices']).astype(int).reshape(-1, 3)
    J = meta['joints']
    pal = np.array(palette(len(J)), float)
    hi_ = os.environ.get('HILITE')
    if hi_:
        keys = hi_.split(',')
        hues = [(255, 60, 60), (255, 230, 40), (60, 140, 255), (60, 220, 90), (230, 80, 255), (255, 150, 40)]
        pal[:] = 90
        for k, nm in enumerate(keys):
            for i, j in enumerate(J):
                if j['name'] == nm:
                    pal[i] = hues[k % len(hues)]
    col = np.einsum('nk,nkc->nc', ws, pal[js])
    L = np.array([0.3, 0.8, 0.5]); L /= np.linalg.norm(L)
    sh = np.clip(np.abs(N @ L), 0.35, 1)
    col = (col * sh[:, None]).clip(0, 255).astype(np.uint8)
    pos = {j['name']: np.array(j['pos']) for j in J}
    joints = [(j['name'] if not any(s in j['name'] for s in ('toe', 'wf', 'tail', 'neck')) or j['name'].endswith(('1a_R', '1a_L', 'tail1', 'neck1')) else '',
               j['pos'], pos[j['parent']] if j['parent'] else None) for j in J]
    os.makedirs(out, exist_ok=True)
    views(P, col, joints, path=os.path.join(out, f'rig_{name}.png'), which=('side', 'top', 'front'), size=900, tri=tri, labels=True)
    # close-ups
    regions = {'head': ((-0.12, 0.3, 0.1), (0.12, 0.56, 0.37), ('side', 'front')),
               'feet': ((-0.2, -0.01, -0.2), (0.2, 0.1, 0.36), ('top', 'side')),
               'wing': ((-0.55, 0.0, -0.3), (-0.05, 0.58, 0.2), ('front', 'top'))}
    for rn, (lo, hi, which) in regions.items():
        lo, hi = np.array(lo), np.array(hi)
        m = np.all((P >= lo) & (P <= hi), 1)
        T = tri[m[tri].all(1)]
        jj = [(nm, q, pp) for nm, q, pp in joints if np.all((np.array(q) >= lo - 0.02) & (np.array(q) <= hi + 0.02))]
        views(P, col, jj, path=os.path.join(out, f'rig_{name}_{rn}{os.environ.get("TAG", "")}.png'), which=which, size=800, tri=T, focus=(lo, hi), labels=False)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'build', 'dragons'))
