"""Velscour's rank and file, told apart: more bodies made from his three knights' own meshes and paint.

    python tools/monsters/knight_variants.py              # all of them, and their lines in roster.json
    python tools/monsters/knight_variants.py --look DIR   # and a sheet of pictures of each
    python tools/monsters/knight_variants.py velscour_knight_4 --no-roster

Each is one of the three with a few things done to it (VARIANTS below), so that no two read the same at ten metres and all
of them stay his: blackened plate, his red, iron, rust and blood; no new colours, no marks, no letters.

  horns     the helm's horns or crown: cut off (the stumps capped), or drawn out longer or shorter
  plume     a tail of red horsehair from the top of the helm, hung off the head
  cape      cut short and ragged at some height (a mantle), or left
  shoulders the pauldrons made bigger or smaller about the shoulder
  cloth     the cape's and tabard's red turned: 'black' (charred), 'oxblood' (darker), 'blood' (brighter)
  temper    the plate's colour: darker, or with a cast
  rust      rust come through in patches, laid by where on the body it is, not where on the sheet
  blood     old blood, the same way, heaviest on the arms and the front
  height    the roster's height (the game scales the body to it)

Mesh work is in tools/monsters/meshkit.py. The plume takes its colour from a square put in the empty corner of the
knight's sheet (the knights' sheets are half empty); nothing else about the model changes, so every clip and weapon in
the knight's roster line is the variant's too.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshkit import TRIPO, Mesh, Model, _raster, clip, draw, sheet  # noqa: E402

SHEET = 4096
HAIR_AT = (3072, 3392, 256, 512)   # the plume's horsehair: x, y, w, h

# The helm of each, about the head bone as the knight stands (X across, Y up, Z to the front): the middle and radii of the
# egg the helm's shell lies inside, and what counts as horn outside it (a test on the place from the head bone).
HELMS = {
    'velscour_knight_1': dict(c=(0, 0.018, 0.004), r=(0.047, 0.056, 0.068), horn=lambda q: (np.abs(q[:, 0]) > 0.03) | (q[:, 1] > 0.072), top=0.066),
    'velscour_knight_2': dict(c=(0, 0.018, 0.004), r=(0.047, 0.058, 0.066), horn=lambda q: (np.abs(q[:, 0]) > 0.028) | (q[:, 1] > 0.078), top=0.068),
    'velscour_lancer': dict(c=(0, 0.02, 0.002), r=(0.046, 0.052, 0.064), horn=lambda q: q[:, 1] > 0.05, top=0.066),
}

VARIANTS = {
    # On the first knight (short horns, a black cloak lined red).
    'velscour_knight_3': dict(base='velscour_knight_1', height=2.12, horns=0, cape=0.5, temper=dict(val=0.78, tint=(0.8, 0.86, 1.0), amt=0.25), rust=0.25),
    'velscour_knight_4': dict(base='velscour_knight_1', height=1.97, horns=1.9, cloth='blood', blood=0.42, shoulders=1.18),
    # On the second (tall horns, a red cloak, spiked shoulders).
    'velscour_knight_5': dict(base='velscour_knight_2', height=2.16, horns=0, cloth='black', rust=0.55, shoulders=1.12),
    'velscour_knight_6': dict(base='velscour_knight_2', height=2.02, horns=0.45, cape=0.56, cloth='oxblood', temper=dict(val=0.7), shoulders=0.84, blood=0.3),
    # On the lancer (a crown of spikes, a ragged red cloak).
    'velscour_lancer_2': dict(base='velscour_lancer', height=2.1, horns=0, plume=1.0, cape=0.48, temper=dict(val=0.85, tint=(1.0, 0.86, 0.8), amt=0.3)),
    'velscour_lancer_3': dict(base='velscour_lancer', height=2.0, horns=1.5, cloth='black', rust=0.4, blood=0.35),
}


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


_LAT = np.random.default_rng(7).random((32, 32, 32))


def noise(P, scale, octaves=3):
    """Lumps in space: 0 to 1, the same wherever two bits of the sheet meet on the body."""
    out, amp, tot = np.zeros(len(P)), 1.0, 0.0
    for o in range(octaves):
        q = P * scale * 2 ** o + 11.3 * o
        i = np.floor(q).astype(int)
        f = q - i
        f = f * f * (3 - 2 * f)
        v = np.zeros(len(P))
        for dx in (0, 1):
            for dy in (0, 1):
                for dz in (0, 1):
                    w = np.where(dx, f[:, 0], 1 - f[:, 0]) * np.where(dy, f[:, 1], 1 - f[:, 1]) * np.where(dz, f[:, 2], 1 - f[:, 2])
                    v += w * _LAT[(i[:, 0] + dx) % 32, (i[:, 1] + dy) % 32, (i[:, 2] + dz) % 32]
        out += v * amp
        tot += amp
        amp *= 0.5
    return out / tot


def cap_loops(mesh, rim, inset=0.0):
    """Close each hole a cut left: a fan from the middle of its edge."""
    on = np.zeros(len(mesh.P), bool)
    on[rim] = True
    count = {}
    for f in mesh.F:
        for k in range(3):
            a, b = int(f[k]), int(f[(k + 1) % 3])
            if on[a] and on[b]:
                count[(min(a, b), max(a, b))] = count.get((min(a, b), max(a, b)), 0) + 1
    edges = [e for e, c in count.items() if c == 1]
    parent = {}

    def find(x):
        parent.setdefault(x, x)
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for a, b in edges:
        parent[find(a)] = find(b)
    loops = {}
    for a, b in edges:
        loops.setdefault(find(a), []).append((a, b))
    P, N, UV, J, W, F = [mesh.P], [mesh.N], [mesh.UV], [mesh.J], [mesh.W], [mesh.F]
    base = len(mesh.P)
    for es in loops.values():
        vs = np.unique(np.array(es))
        if len(vs) < 3:
            continue
        n = mesh.N[vs].mean(0)
        n /= max(np.linalg.norm(n), 1e-9)
        P.append((mesh.P[vs].mean(0) - n * inset)[None])
        N.append(n[None])
        UV.append(mesh.UV[vs[0]][None])
        J.append(mesh.J[vs[0]][None])
        W.append(mesh.W[vs[0]][None])
        F.append(np.array([[base, a, b] for a, b in es]))
        base += 1
    return Mesh(np.concatenate(P), np.concatenate(N), np.concatenate(UV), np.concatenate(J), np.concatenate(W), np.concatenate(F))


def texel_colours(mesh, tex):
    T = np.asarray(tex, np.float64) / 255
    h, w = T.shape[:2]
    return T[np.clip((mesh.UV[:, 1] * h).astype(int), 0, h - 1), np.clip((mesh.UV[:, 0] * w).astype(int), 0, w - 1)]


def is_red(c):
    return (c[..., 0] > c[..., 1] * 1.3 + 0.025) & (c[..., 0] > c[..., 2] * 1.3 + 0.025)


def horsehair(colour, w, h):
    """Strands running the length of the patch (down it), in the cloth's own red."""
    rng = np.random.default_rng(3)
    col = rng.random(w)
    for _ in range(2):
        col = (col + np.roll(col, 1)) / 2
    col = (col - col.min()) / (col.max() - col.min())
    fine = rng.random((h, w)) * 0.25
    lengthwise = np.linspace(0.75, 1.1, h)[:, None]
    shade = (0.35 + 0.9 * col[None, :] ** 1.5) * lengthwise - fine
    drift = np.sin(np.linspace(0, 7, h))[:, None] * 0.05
    out = np.clip(shade + drift, 0.08, 1.4)[..., None] * np.asarray(colour, float)[None, None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))


def tube(spine, radius, uv_rect, joint, n=10, flat=0.6):
    """A tapering tail along a spine (k,3), radius (k); flat squeezes it across. The patch runs down its length."""
    k = len(spine)
    t = np.gradient(spine, axis=0)
    t /= np.linalg.norm(t, axis=1, keepdims=True)
    side = np.tile([1.0, 0, 0], (k, 1))
    other = np.cross(t, side)
    other /= np.linalg.norm(other, axis=1, keepdims=True)
    ang = np.linspace(0, 2 * np.pi, n + 1)
    P = spine[:, None, :] + radius[:, None, None] * (np.cos(ang)[None, :, None] * side[:, None, :] + flat * np.sin(ang)[None, :, None] * other[:, None, :])
    u0, v0, u1, v1 = uv_rect
    UV = np.zeros((k, n + 1, 2))
    UV[:, :, 0] = u0 + (u1 - u0) * np.linspace(0, 1, n + 1)
    UV[:, :, 1] = (v0 + (v1 - v0) * np.linspace(0, 1, k))[:, None]
    F = []
    for i in range(k - 1):
        for j in range(n):
            a, b, c, d = i * (n + 1) + j, i * (n + 1) + j + 1, (i + 1) * (n + 1) + j, (i + 1) * (n + 1) + j + 1
            F += [[a, c, b], [b, c, d]]
    m = Mesh(P.reshape(-1, 3), np.zeros((k * (n + 1), 3)), UV.reshape(-1, 2), np.zeros((k * (n + 1), 4), int), np.tile([1.0, 0, 0, 0], (k * (n + 1), 1)), F)
    m.recompute_normals()
    out = m.P - np.repeat(spine, n + 1, 0)
    m.N[(m.N * out).sum(1) < 0] *= -1
    return m.bind(joint)


def build(id_, base, height, horns=1, plume=0, cape=None, shoulders=1, cloth=None, temper=None, rust=0, blood=0, look=None):
    K = Model(f'{TRIPO}/{base}.glb')
    mesh = K.mesh.copy()
    mesh.P, mesh.N = K.posed()                    # everything below is done as the knight stands
    alb = K.albedo.copy()
    for x, y, w, h in (HAIR_AT,):
        assert np.asarray(alb.crop((x, y, x + w, y + h))).mean() < 3, f"{base}: the sheet isn't empty at {x},{y}"
    head, hj = K.rest_world('Head'), K.joint('Head')
    H = HELMS[base]
    c, r = head + H['c'], np.array(H['r'])
    extra = []

    def horn_of(m):
        q = m.P - head
        f = np.linalg.norm((m.P - c) / r, axis=1)
        return f, (K.weight_of('Head', mesh=m) > 0.5) & H['horn'](q) & (q[:, 1] > -0.005)

    # -- the helm's horns
    if horns == 0:
        f, on = horn_of(mesh)
        mesh, rim = clip(mesh, f - 1.0, only=on)
        mesh = cap_loops(mesh, rim, inset=-0.003)
    elif horns != 1:
        f, on = horn_of(mesh)
        out = on & (f > 1)
        k = 1 + (horns - 1) * smooth(1.0, 1.25, f[out])
        mesh.P[out] = c + (mesh.P[out] - c) * ((1 + (f[out] - 1) * k) / f[out])[:, None]

    # -- the cloak, cut short
    if cape is not None:
        col = texel_colours(mesh, alb)
        P = mesh.P
        # The cloak: what hangs behind the back, what's red and isn't the tabard down the front, and (below the arms)
        # whatever hangs well wide of the legs.
        cloak = ((P[:, 2] < -0.06) | (is_red(col) & ~((np.abs(P[:, 0]) < 0.06) & (P[:, 2] > 0.02))) | ((np.abs(P[:, 0]) > 0.125) & (P[:, 2] < 0.02) & (P[:, 1] < 0.62))) \
            & (np.abs(P[:, 0]) < 0.24) & (P[:, 1] < cape + 0.08)
        jag = 0.028 * np.sin(P[:, 0] * 90 + len(id_)) + 0.02 * np.sin(P[:, 0] * 37 + 1) + 0.012 * np.sin(P[:, 2] * 140)
        mesh, _ = clip(mesh, (cape + jag) - P[:, 1], only=cloak)
        # (the body is one piece, so anything small left hanging in the air is a scrap of the cloak)
        lab = mesh.islands()
        mesh = mesh.verts_where((np.bincount(lab) >= 150)[lab])

    # -- the shoulders
    if shoulders != 1:
        P = mesh.P
        for side in ('Left', 'Right'):
            j = K.rest_world(side + 'Arm')
            w = smooth(0.25, 0.6, K.weight_of(side + 'Shoulder', side + 'Arm', mesh=mesh)) * smooth(0.055, 0.085, np.abs(P[:, 0])) \
                * smooth(-0.075, -0.045, P[:, 2]) * smooth(j[1] - 0.05, j[1] - 0.015, P[:, 1]) * (1 - smooth(0.17, 0.21, np.abs(P[:, 0])))
            P += (P - j) * ((shoulders - 1) * w)[:, None]

    # -- a tail of horsehair
    if plume:
        hx, hy, hw_, hh = HAIR_AT
        red = np.asarray(K.albedo, np.float64).reshape(-1, 3)[::97]
        red = red[is_red(red / 255) & (red[:, 0] > 60)]
        alb.paste(horsehair(np.percentile(red, 80, axis=0) * 1.25, hw_, hh), (hx, hy))
        t = np.linspace(0, 1, 16)
        top = c + [0, r[1] * 0.93, -0.004]
        # Up out of the helm, over, and down behind to the shoulders.
        spine = top + np.stack([np.zeros(16), 0.05 * np.sin(np.pi * np.minimum(t * 1.9, 1) * 0.5) - 0.14 * np.maximum(t - 0.3, 0) ** 1.5 * plume,
                                -0.085 * t ** 1.3 * plume], 1)
        rad = 0.004 + 0.021 * np.sin(np.pi * np.clip(t * 1.25, 0, 1)) ** 0.6 * (1 - 0.75 * t ** 3)
        m_ = 6 / SHEET
        extra.append(tube(spine, rad, (hx / SHEET + m_, hy / SHEET + m_, (hx + hw_) / SHEET - m_, (hy + hh) / SHEET - m_), hj))

    if extra:
        mesh = Mesh.join([mesh] + extra)

    # -- the paint, by where on the body each bit of the sheet lies
    if cloth or temper or rust or blood:
        n = 2048
        zb, fid, bary = np.full((n, n), -1e9), np.full((n, n), -1, np.int64), np.zeros((n, n, 2))
        _raster(mesh.UV * n, np.zeros(len(mesh.P)), mesh.F, n, n, zb, fid, bary)
        hit = fid >= 0
        f = mesh.F[fid[hit]]
        b0, b1 = bary[hit][:, 0:1], bary[hit][:, 1:2]
        pos = mesh.P[f[:, 0]] * b0 + mesh.P[f[:, 1]] * b1 + mesh.P[f[:, 2]] * (1 - b0 - b1)
        A = np.asarray(alb, np.float64) / 255
        small = np.asarray(alb.resize((n, n), Image.BOX), np.float64) / 255
        red_s = is_red(small).astype(np.float64)
        mask = lambda v: np.asarray(Image.fromarray((np.clip(v, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)).resize((SHEET, SHEET), Image.BILINEAR), np.float64)[..., None] / 255
        # Cloth is what's painted red, and what hangs behind the back or wider than the hips (the first knight's cloak is black).
        hang = np.zeros((n, n))
        hang[hit] = ((pos[:, 2] < -0.065) | ((np.abs(pos[:, 0]) > 0.125) & (pos[:, 2] < 0.02) & (pos[:, 1] < 0.62))) & (np.abs(pos[:, 0]) < 0.24) & (pos[:, 1] < 0.74)
        dyed = mask(red_s)                       # what a dye takes on: the red only
        redm = np.maximum(dyed, mask(hang))      # what rust and the plate's temper leave alone
        # (the new shapes' squares are painted already: leave them)
        own = np.ones((SHEET, SHEET, 1))
        own[HAIR_AT[1]:HAIR_AT[1] + HAIR_AT[3], HAIR_AT[0]:HAIR_AT[0] + HAIR_AT[2]] = 0
        lum = A.mean(2, keepdims=True)
        if cloth:
            to = {'black': lum * np.array([0.36, 0.33, 0.33]) + 0.01, 'oxblood': A * np.array([0.62, 0.45, 0.45]),
                  'blood': np.clip(A * np.array([1.45, 0.75, 0.7]) + [0.03, 0, 0], 0, 1)}[cloth]
            A = A + (to - A) * (redm if cloth == 'black' else dyed) * own
        if temper:
            t_ = np.clip(A * temper.get('val', 1), 0, 1)
            if 'tint' in temper:
                t_ = t_ + (t_.mean(2, keepdims=True) * np.array(temper['tint']) - t_) * temper.get('amt', 0.3)
            A = A + (t_ - A) * (1 - redm) * own
        field = np.zeros((n, n))
        if rust:
            # Patches, eaten in at their edges, more of it low on the body where the wet gets.
            v = noise(pos, 22) * 0.7 + noise(pos, 80, 2) * 0.3
            low = 0.03 * (1 - smooth(0.2, 0.8, pos[:, 1]))
            edge = 0.635 - 0.085 * rust
            field[hit] = smooth(edge, edge + 0.035, v + low)
            m = mask(field) * (1 - redm) * own
            # Rust keeps the plate's own lights and darks, in brown: dull, and a little lighter than blackened steel.
            grain = np.clip(0.55 + lum * 3.2, 0.5, 2.2)
            A = A + (np.clip(np.array([0.15, 0.072, 0.036]) * grain, 0, 1) - A) * m * 0.8
        if blood:
            v = noise(pos + 5.0, 30) * 0.65 + noise(pos + 5.0, 110, 2) * 0.35
            where = 0.03 * smooth(-0.02, 0.05, pos[:, 2]) + 0.05 * smooth(0.2, 0.42, np.abs(pos[:, 0]))      # the front, and the arms
            edge = 0.66 - 0.07 * blood
            field[...] = 0
            field[hit] = smooth(edge, edge + 0.025, v + where)
            m = mask(field) * own
            A = A + (np.array([0.105, 0.008, 0.008]) * np.clip(0.7 + lum * 2.5, 0.6, 2.0) - A) * m * 0.85
        alb = Image.fromarray((np.clip(A, 0, 1) * 255).astype(np.uint8))

    # -- back to the raw mesh's space, and out
    mesh.W = mesh.W / mesh.W.sum(1, keepdims=True)
    mesh.P, mesh.N = K.unposed(mesh)
    out = f'{TRIPO}/{id_}.glb'
    size = K.save(out, mesh, alb)
    print(f'{id_}: on {base}, {len(mesh.P)} corners, {len(mesh.F)} faces, {size / 1e6:.2f} MB')
    if look:
        M = Model(out)
        P, N = M.posed()
        hc = head + [0, 0.05, 0]
        pics = [draw(P, N, M.mesh, M.albedo, yaw=y, size=(300, 400), light=2.4) for y in (0, 135, 180)]
        pics += [draw(P, N, M.mesh, M.albedo, yaw=y, pitch=p, size=(300, 400), centre=hc, span=0.36, light=2.4) for y, p in ((20, 5), (100, 5))]
        for clip_, fr in (('walk', 0.4), ('atk1', 0.5)):
            P, N = M.posed(clip=clip_, frac=fr)
            pics.append(draw(P, N, M.mesh, M.albedo, yaw=40, pitch=8, size=(300, 400), light=2.4))
        os.makedirs(look, exist_ok=True)
        sheet(pics).save(f'{look}/{id_}.png')
    return out


def roster_line(id_, base, height):
    """The knight's own line with this one's name and height: every clip and weapon is his."""
    path = f'{TRIPO}/roster.json'
    roster = json.load(open(path))
    e = json.loads(json.dumps(roster[base]))
    e['id'], e['height'] = id_, height
    e['bytes'] = os.path.getsize(f'{TRIPO}/{id_}.glb')
    roster[id_] = e
    json.dump(roster, open(path, 'w'), indent=1)
    open(path, 'a').write('\n')


if __name__ == '__main__':
    look = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else None
    only = [a for a in sys.argv[1:] if a in VARIANTS]
    for id_, v in VARIANTS.items():
        if only and id_ not in only:
            continue
        build(id_, look=look, **v)
        if '--no-roster' not in sys.argv:
            roster_line(id_, v['base'], v['height'])
