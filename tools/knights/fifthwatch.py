"""Ser Hale Orrowick, Paladin of the Fifth Watch: assets/game/knights/paladin_fifthwatch.glb.

A Millhaven man who swore himself a fifth watch at the Bell Tower, in harness put together from what the fallen of the
forty-three left on the downs. So he's made of theirs (assets/game/heroes, each a set of rigid pieces on the master
skeleton, listed in the scene's extras) and a villager's head (assets/game/folk), with no Blender:

  - the body is a lancer's, whole: blue steel and gilt, the blue tabard, his own mail between the plates;
  - the helm comes off (the collar plate under it stays, as a gorget);
  - the pauldrons and the white cloak are a paladin's, moved from that body's bones onto this one's (a piece keeps its
    place against the bone it rides, and is sized by the two bodies' heights);
  - the head is a villager's, cut through the neck, sized to the body, stood on the head bone and hung wholly off it; its
    neck goes down inside the gorget and the mail coif, which is cut down to a collar;
  - the three colour sheets (lancer, paladin, villager) go on one 2048 sheet, a quarter each, and the normal and metal
    maps the same way. The villager's quarter of the metal map is no metal at all: skin marked metal goes black
    (docs/RENDERING.md, "Metal maps from the armour tool").

    python tools/knights/fifthwatch.py [--look DIR]

The game stands him by the tower as a town knight (src/core/knights.js, flagged `hale`), as the Bellwright is.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'monsters'))
from meshkit import Mesh, acc, clip, draw, image, read_glb, sheet  # noqa: E402

HEROES = os.path.join(ROOT, 'assets', 'game', 'heroes')
FOLK = os.path.join(ROOT, 'assets', 'game', 'folk')
OUT = os.path.join(ROOT, 'assets', 'game', 'knights', 'paladin_fifthwatch.glb')

BODY = 'lancer_m1'
DONOR = 'paladin_m2'
VILLAGER = 'old_man'
HEAD_SIZE = 1.25           # the villager's head against its own size on him (he's 1.72 m; the lancer's body 2.03 m)
HEAD_SHIFT = (0, 0.02, 0.0) # from the body's head bone: across, up, forward
SHEET = 2048
QUARTER = {'body': (0, 0), 'donor': (1, 0), 'head': (0, 1)}      # which quarter of the sheet each one's maps go in


class Hero:
    """A hero's body: corners, the pieces they're in, the bones as bound."""

    def __init__(self, name):
        self.name = name
        self.doc, self.buf = read_glb(os.path.join(HEROES, name + '.glb'))
        doc, buf = self.doc, self.buf
        pr = doc['meshes'][0]['primitives'][0]
        a = pr['attributes']
        self.P, self.N, self.UV = (acc(doc, buf, a[k]).astype(np.float64) for k in ('POSITION', 'NORMAL', 'TEXCOORD_0'))
        self.J, self.W = acc(doc, buf, a['JOINTS_0']).astype(np.int64), acc(doc, buf, a['WEIGHTS_0']).astype(np.float64)
        self.flex, self.piece = acc(doc, buf, a['_FLEX']).ravel().astype(np.float64), acc(doc, buf, a['_PIECE']).ravel().astype(np.int64)
        self.F = acc(doc, buf, pr['indices']).ravel().astype(np.int64).reshape(-1, 3)
        self.extras = doc['scenes'][0]['extras']
        self.pieces = self.extras['pieces']
        self.names = [doc['nodes'][j]['name'] for j in doc['skins'][0]['joints']]
        ibm = acc(doc, buf, doc['skins'][0]['inverseBindMatrices']).astype(np.float64).reshape(-1, 4, 4).transpose(0, 2, 1)
        self.ibm, self.bind = ibm, np.linalg.inv(ibm)
        self.maps = [Image.open(io.BytesIO(buf[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])).convert('RGB')
                     for v in (doc['bufferViews'][im['bufferView']] for im in doc['images'][:3])]

    def joint(self, name):
        return self.names.index(name)

    def part(self, i):
        """Piece i as arrays of its own: (P, N, UV, J, W, flex, cloth bit, F from nought)."""
        p = self.pieces[i]
        s = slice(p['vstart'], p['vstart'] + p['vcount'])
        F = self.F[p['tstart']:p['tstart'] + p['tcount']] - p['vstart']
        assert F.min() >= 0 and F.max() < p['vcount'], f"{self.name}: piece {p['name']} shares corners"
        return dict(P=self.P[s].copy(), N=self.N[s].copy(), UV=self.UV[s].copy(), J=self.J[s].copy(), W=self.W[s].copy(), flex=self.flex[s].copy(),
                    cloth=int(self.piece[s][0]) & 0x4000, F=F.copy(), meta={k: v for k, v in p.items() if k in ('name', 'kind', 'joints')})


def onto(part, src, dst, scale):
    """Move a piece from one body's bones to another's: each corner keeps its place against the bones it rides."""
    M = np.einsum('nk,nkij->nij', part['W'], dst.bind[part['J']] @ (np.diag([scale, scale, scale, 1.0]) @ src.ibm[part['J']]))
    part['P'] = (M[:, :3, :3] @ part['P'][:, :, None])[:, :, 0] + M[:, :3, 3]
    n = (M[:, :3, :3] @ part['N'][:, :, None])[:, :, 0]
    part['N'] = n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
    return part


def to_quarter(part, which):
    """The piece's place on its own sheet, moved to that sheet's quarter of the joined one. (Mail's is no place on a
    sheet: its u is past 1.5, which is how the shader knows it, so it's left.)"""
    qx, qy = QUARTER[which]
    on = part['UV'][:, 0] < 1.5
    part['UV'][on] = (np.clip(part['UV'][on], 0, 1) + [qx, qy]) / 2
    return part


def villager_head(body):
    """The villager's head as a piece on the body's head bone."""
    doc, buf = read_glb(os.path.join(FOLK, VILLAGER + '.glb'))
    pr = doc['meshes'][0]['primitives'][0]
    a = pr['attributes']
    w = acc(doc, buf, a['WEIGHTS_0']).astype(np.float64)
    m = Mesh(acc(doc, buf, a['POSITION']), acc(doc, buf, a['NORMAL']), acc(doc, buf, a['TEXCOORD_0']), acc(doc, buf, a['JOINTS_0']),
             w / np.maximum(w.sum(1, keepdims=True), 1e-9), acc(doc, buf, pr['indices']).ravel())
    names = [doc['nodes'][j]['name'].split(':')[-1] for j in doc['skins'][0]['joints']]
    bind = np.linalg.inv(acc(doc, buf, doc['skins'][0]['inverseBindMatrices']).astype(np.float64).reshape(-1, 4, 4).transpose(0, 2, 1))
    head, neck = bind[names.index('Head')][:3, 3], bind[names.index('Neck')][:3, 3]
    wt = (m.W * np.isin(m.J, [names.index('Head'), names.index('Neck')])).sum(1)
    top, _ = clip(m, 0.5 - wt)
    top, _ = clip(top, (neck[1] + 0.012) - top.P[:, 1])
    bh = body.bind[body.joint('Head')][:3, 3]
    top.P = (top.P - head) * HEAD_SIZE + bh + np.asarray(HEAD_SHIFT)
    j = body.joint('Head')
    n = len(top.P)
    part = dict(P=top.P, N=top.N, UV=top.UV.copy(), J=np.tile([j, 0, 0, 0], (n, 1)), W=np.tile([1.0, 0, 0, 0], (n, 1)), flex=np.zeros(n), cloth=0,
                F=top.F, meta=dict(name='head_villager', kind='plate', joints=[[j, 1.0]]))
    maps = [Image.open(os.path.join(FOLK, f'{VILLAGER}_{k}.webp')).convert('RGB') for k in 'cnm']
    return part, maps


def build(look=None):
    B, D = Hero(BODY), Hero(DONOR)
    scale = B.extras['height'] / D.extras['height']
    parts = []
    for i, p in enumerate(B.pieces):
        name = p['name']
        if name.startswith('helm_') and any(B.names[j] == 'Head' for j, _ in p['joints']):
            continue                                    # the helm; the collar under it (on the neck) stays
        if name.startswith('shoulders_'):
            continue                                    # the paladin's go on instead
        part = to_quarter(B.part(i), 'body')
        if name == 'mail_coif':
            # Inside a helm the coif is a hood. Bare-headed it's a collar: cut off under the jaw.
            top = B.bind[B.joint('Head')][1, 3] + 0.035
            m = Mesh(part['P'], part['N'], part['UV'], part['J'], part['W'], part['F'])
            m.extra = None
            cut, _ = clip(m, part['P'][:, 1] - top)
            part.update(P=cut.P, N=cut.N, UV=cut.UV, J=cut.J, W=cut.W, F=cut.F, flex=np.zeros(len(cut.P)))
        parts.append(part)
    for i, p in enumerate(D.pieces):
        if p['name'].startswith('shoulders_') or (p['name'].startswith('chest_') and p['kind'] == 'cloth'):
            parts.append(to_quarter(onto(D.part(i), D, B, scale), 'donor'))
    head, head_maps = villager_head(B)
    parts.append(to_quarter(head, 'head'))

    # The sheets: a quarter each.
    half = SHEET // 2
    sheets = []
    for k in range(3):
        flat = [(0, 0, 0), (128, 128, 255), (255, 200, 0)][k]
        s = Image.new('RGB', (SHEET, SHEET), flat)
        for which, im in (('body', B.maps[k]), ('donor', D.maps[k]), ('head', head_maps[k])):
            qx, qy = QUARTER[which]
            im = im.resize((half, half), Image.LANCZOS)
            if k == 2 and which == 'head':
                # Skin, hair and linen: no metal, and none of the gloss the villagers' own shader allows them.
                a = np.asarray(im).copy()
                a[..., 2] = 0
                a[..., 1] = np.maximum(a[..., 1], 190)
                im = Image.fromarray(a)
            s.paste(im, (qx * half, qy * half))
        sheets.append(s)

    # One piece after another, as the game wants them: corners and faces in runs, a number per piece.
    cat = {k: [] for k in ('P', 'N', 'UV', 'J', 'W', 'flex', 'piece')}
    F, pieces, v0, t0 = [], [], 0, 0
    for i, part in enumerate(parts):
        n = len(part['P'])
        for k in ('P', 'N', 'UV', 'J', 'W', 'flex'):
            cat[k].append(part[k])
        cat['piece'].append(np.full(n, i | part['cloth']))
        F.append(part['F'] + v0)
        pieces.append(dict(part['meta'], vstart=v0, vcount=n, tstart=t0 * 3 if False else t0, tcount=len(part['F']),
                           min=part['P'].min(0).tolist(), max=part['P'].max(0).tolist()))
        v0 += n
        t0 += len(part['F'])
    assert len(pieces) <= 64, f'{len(pieces)} pieces: the game keeps 64 (src/core/layout.js MAX_PIECES)'
    A = {k: np.concatenate(v) for k, v in cat.items()}
    F = np.concatenate(F)
    return B, A, F, pieces, sheets


def tunit(B):
    """Are a piece's tstart/tcount counted in faces or in corners of faces? (As the body's own are.)"""
    p = max(B.pieces, key=lambda q: q['tstart'])
    return 3 if p['tstart'] + p['tcount'] > len(B.F) else 1


def write(B, A, F, pieces, sheets, path):
    doc = json.loads(json.dumps(B.doc))
    out, views, accs = bytearray(), [], []

    def view(raw, target=None):
        while len(out) % 4:
            out.append(0)
        v = {'buffer': 0, 'byteOffset': len(out), 'byteLength': len(raw)}
        if target:
            v['target'] = target
        out.extend(raw)
        views.append(v)
        return len(views) - 1

    def new(arr, ctype, typ, target=None, minmax=False):
        arr = np.ascontiguousarray(arr.astype({5126: np.float32, 5123: np.uint16, 5125: np.uint32}[ctype]))
        a = {'bufferView': view(arr.tobytes(), target), 'componentType': ctype, 'count': len(arr), 'type': typ}
        if minmax:
            a['min'], a['max'] = arr.min(0).tolist(), arr.max(0).tolist()
        accs.append(a)
        return len(accs) - 1
    ib = B.ibm.transpose(0, 2, 1).reshape(-1, 16)
    doc['skins'][0]['inverseBindMatrices'] = new(ib, 5126, 'MAT4')
    W = A['W'] / np.maximum(A['W'].sum(1, keepdims=True), 1e-9)
    prim = {'attributes': {
        'POSITION': new(A['P'], 5126, 'VEC3', 34962, True), 'NORMAL': new(A['N'], 5126, 'VEC3', 34962), 'TEXCOORD_0': new(A['UV'], 5126, 'VEC2', 34962),
        'JOINTS_0': new(A['J'], 5123, 'VEC4', 34962), 'WEIGHTS_0': new(W, 5126, 'VEC4', 34962),
        '_FLEX': new(A['flex'], 5126, 'SCALAR', 34962), '_PIECE': new(A['piece'], 5123, 'SCALAR', 34962),
    }, 'indices': new(F.ravel(), 5125, 'SCALAR', 34963), 'material': 0}

    def jpeg(im, q):
        b = io.BytesIO()
        im.save(b, 'JPEG', quality=q)
        return b.getvalue()
    doc['images'] = [{'bufferView': view(jpeg(s, q)), 'mimeType': 'image/jpeg'} for s, q in zip(sheets, (90, 88, 88))]
    doc['textures'] = [{'sampler': 0, 'source': i} for i in range(3)]
    doc['materials'][0]['name'] = 'paladin_fifthwatch'
    doc['meshes'] = [{'name': 'paladin_fifthwatch', 'primitives': [prim]}]
    for n in doc['nodes']:
        if 'mesh' in n:
            n['name'] = 'paladin_fifthwatch'
    unit = tunit(B)
    for p in pieces:
        p['tstart'] *= unit
        p['tcount'] *= unit
    doc['scenes'][0]['extras'] = dict(B.extras, pieces=pieces)
    doc['asset']['generator'] = 'bm/tools/knights/fifthwatch.py'
    doc['accessors'], doc['bufferViews'] = accs, views
    doc.pop('animations', None)
    while len(out) % 4:
        out.append(0)
    doc['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(out)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(out), 0x004E4942) + bytes(out))
    return os.path.getsize(path)


if __name__ == '__main__':
    look = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else None
    B, A, F, pieces, sheets = build()
    size = write(B, A, F, pieces, sheets, OUT)
    print(f'paladin_fifthwatch: {len(A["P"])} corners, {len(F)} faces, {len(pieces)} pieces, {size / 1e6:.2f} MB')
    if look:
        m = Mesh(A['P'], A['N'], A['UV'], A['J'], A['W'], F)
        mail = A['UV'][:, 0] > 1.5
        m.UV = np.where(mail[:, None], [0.99, 0.99], m.UV)          # (mail has no paint: the empty quarter, for the picture)
        tex = sheets[0].copy()
        tex.paste(Image.new('RGB', (SHEET // 2, SHEET // 2), (70, 74, 82)), (SHEET // 2, SHEET // 2))
        hb = B.bind[B.joint('Head')][:3, 3]
        pics = [draw(m.P, m.N, m, tex, yaw=y, size=(360, 480), centre=[0, 1.05, 0], span=2.2, light=1.5) for y in (0, 90, 180)]
        pics += [draw(m.P, m.N, m, tex, yaw=y, pitch=p, size=(360, 480), centre=hb + [0, 0.02, 0], span=0.75, light=1.5) for y, p in ((0, 0), (60, 10), (180, 10), (0, 50))]
        os.makedirs(look, exist_ok=True)
        sheet(pics).save(os.path.join(look, 'paladin_fifthwatch.png'))
