"""Velscour's possessed knights: one of his knights with the helm struck off and a possessed villager's head on the
shoulders, its eyes burning red. The castle's bosses (the game draws them bigger: VARIANTS in src/core/tripo-monsters.js).

    python tools/monsters/possessed_knights.py            # all three, and their lines in roster.json
    python tools/monsters/possessed_knights.py --look DIR # pictures of each as well (rest, and a few moments of its clips)

What it does to each, from the two models' own meshes and maps (tools/monsters/meshkit.py):
  - The knight's helm is cut off where the head bone takes over from the neck (half the weight). What's left under that line
    is the helm's own bevor and the collar, which stand as a gorget; the hole is floored a little way down with dark iron.
  - The villager is cut the same way and through the neck, the head (hair and all) sized to the armour, stood on the knight's
    head bone and hung wholly off it, the neck's stump down inside the gorget.
  - The villager's colour map goes in the empty corner of the knight's sheet (the knights' sheets are half empty), its purple
    veins and eye-light turned to Velscour's red; the head's roughness goes in the metal/rough map the same way.
  - The eyes: a small disc before each, painted hot, and marked in the metal/rough map's alpha, which is what the body
    shader lights of itself (src/gfx/materials.js ARMOR: every other body's map has no alpha, so nothing else glows).
    The light is the shader's own red, not the paint's, so no palette (palettes.json) can wash it out.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from meshkit import TRIPO, Mesh, Model, _raster, clip, draw, sheet  # noqa: E402

SHEET = 4096
HEAD_AT = (3072, 3072, 1024)        # the villager's map on the knight's sheet: x, y, size
EYE_AT = (2816, 3840, 128)          # the eyes' hot patch
FLOOR_AT = (2816, 3712, 64)         # dark iron for the gorget's floor
MR = 1024                           # the metal/rough map: big enough that the eyes' patch outlives a few mips

# id: the knight, the villager, how big the head is against the villager's own (in the knight's units), and where its head
# bone goes from the knight's (across, up, forward).
BUILDS = {
    'possessed_knight_1': dict(knight='velscour_knight_1', head='possessed_man_1', size=1.12, shift=(0, 0.006, -0.014)),
    'possessed_knight_2': dict(knight='velscour_knight_2', head='possessed_man_2', size=1.12, shift=(0, 0.006, -0.014)),
    'possessed_knight_3': dict(knight='velscour_lancer', head='possessed_woman_2', size=1.12, shift=(0, 0.024, -0.016), top_y=0.838),
}


def rest_frame(model):
    """The turn and move that take the raw mesh to where it stands at rest (the head bone's, which is everyone's)."""
    return model.skin_mats()[model.joint('Head')]


def red_veins(img):
    """The possession shows purple on the villagers; on Velscour's it's his red."""
    a = np.asarray(img.convert('HSV'), np.float64)
    h, s = a[..., 0] * 360 / 255, a[..., 1] / 255
    purple = np.clip((h - 235) / 20, 0, 1) * np.clip((345 - h) / 15, 0, 1) * np.clip((s - 0.12) / 0.15, 0, 1)
    a[..., 0] = (h + (358 - h) * purple) % 360 * 255 / 360
    a[..., 1] = np.clip(s * (1 + 0.5 * purple), 0, 1) * 255
    return Image.fromarray(a.astype(np.uint8), 'HSV').convert('RGB')


def eye_spots(head, P, N, tex):
    """Where the villager's lit eyes are: the brightest of the painted glow, found on the map and carried to the face."""
    size = tex.size[0]
    S = head.UV * size
    zb, fid, bary = np.full((size, size), -1e9), np.full((size, size), -1, np.int64), np.zeros((size, size, 2))
    _raster(S, np.zeros(len(S)), head.F, size, size, zb, fid, bary)
    a = np.asarray(tex.convert('RGB'), np.float64) / 255
    hot = (fid >= 0) & (a[..., 0] > 0.75) & (a[..., 2] > 0.6) & (a[..., 1] < a[..., 2] - 0.12)      # bright, and magenta
    f = head.F[fid[hot]]
    b0, b1 = bary[hot][:, 0:1], bary[hot][:, 1:2]
    pts = P[f[:, 0]] * b0 + P[f[:, 1]] * b1 + P[f[:, 2]] * (1 - b0 - b1)
    nrm = N[f[:, 0]] * b0 + N[f[:, 1]] * b1 + N[f[:, 2]] * (1 - b0 - b1)
    face = pts[:, 2] > np.median(P[:, 2])                   # the front of the head only
    pts, nrm = pts[face], nrm[face]
    level = np.abs(pts[:, 1] - np.median(pts[:, 1])) < 0.012   # (one of them has a lit mark on her brow as well)
    pts, nrm = pts[level], nrm[level]
    out = []
    mid = (pts[:, 0].min() + pts[:, 0].max()) / 2
    for side in (pts[:, 0] < mid, pts[:, 0] >= mid):
        c = np.median(pts[side], 0)
        near = side & (np.linalg.norm(pts - c, axis=1) < 0.012)
        n = nrm[near].mean(0)
        out.append((pts[near].mean(0), n / np.linalg.norm(n), np.percentile(np.abs(pts[near][:, 0] - pts[near][:, 0].mean()), 90)))
    return out


def disc(centre, normal, radius, uv_rect, n=12):
    """A flat disc facing along `normal`, the patch at uv_rect laid on it middle to middle."""
    normal = normal / np.linalg.norm(normal)
    a = np.cross(normal, [0, 1.0, 0])
    a /= np.linalg.norm(a)
    b = np.cross(normal, a)
    ang = np.linspace(0, 2 * np.pi, n, endpoint=False)
    ring = centre + radius * (np.cos(ang)[:, None] * a + np.sin(ang)[:, None] * b * 0.8)     # a little wider than tall
    u0, v0, u1, v1 = uv_rect
    cu, cv, ru, rv = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) * 0.46, (v1 - v0) * 0.46
    P = np.vstack([centre, ring])
    UV = np.vstack([[cu, cv], np.stack([cu + ru * np.cos(ang), cv + rv * np.sin(ang)], 1)])
    F = [[0, 1 + i, 1 + (i + 1) % n] for i in range(n)]
    return Mesh(P, np.tile(normal, (n + 1, 1)), UV, np.zeros((n + 1, 4), int), np.tile([1.0, 0, 0, 0], (n + 1, 1)), F)


def rim_floor(P, rim, drop, uv, n=16):
    """A floor in the hole the cut left: a flat oval a little below the cut's edge, as wide as the edge is."""
    R = P[rim]
    R = R[np.abs(R[:, 1] - np.median(R[:, 1])) < 0.02]      # (a stray scrap cut higher up is no part of the hole)
    c = np.array([np.median(R[:, 0]), np.median(R[:, 1]) - drop, (R[:, 2].min() + R[:, 2].max()) / 2])
    rx, rz = np.percentile(np.abs(R[:, 0] - c[0]), 90) * 1.05, (R[:, 2].max() - R[:, 2].min()) / 2 * 1.02
    ang = np.linspace(0, 2 * np.pi, n, endpoint=False)
    pts = np.vstack([c, c + np.stack([rx * np.cos(ang), np.zeros(n), rz * np.sin(ang)], 1)])
    F = [[0, 1 + i, 1 + (i + 1) % n] for i in range(n)]
    return Mesh(pts, np.tile([0, 1.0, 0], (n + 1, 1)), np.tile(uv, (n + 1, 1)), np.zeros((n + 1, 4), int), np.tile([1.0, 0, 0, 0], (n + 1, 1)), F)


def drop_scraps(mesh, rim, most=80):
    """The cut can leave slivers of the helm hanging in the air (a crest's foot, a horn's): away with any small piece on the cut."""
    lab = mesh.islands()
    count = np.bincount(lab)
    scrap = np.zeros(len(count), bool)
    scrap[np.unique(lab[rim])] = True
    scrap &= count < most
    keep = ~scrap[lab]
    new = np.cumsum(keep) - 1
    return mesh.verts_where(keep), new[rim[keep[rim]]]


def build(id_, knight, head, size, shift, top_y=None, look=None):
    K, D = Model(f'{TRIPO}/{knight}.glb'), Model(f'{TRIPO}/{head}.glb')
    khead, G = K.joint('Head'), rest_frame(K)
    Gi = np.linalg.inv(G)

    # The knight, less his helm.
    hw = K.weight_of('Head')
    d = hw - 0.5
    if top_y is not None:                # (the lancer's visor stands higher than that line: off at the chin)
        d = np.maximum(d, np.where(hw > 0.08, K.posed()[0][:, 1] - top_y, -1))
    body, rim = clip(K.mesh, d)
    body, rim = drop_scraps(body, rim)
    Pb, _ = K.posed(body)

    # The villager's head, through the neck.
    Pd, Nd = D.posed()
    neck_y = D.rest_world('Neck')[1]
    top, _ = clip(D.mesh, 0.5 - D.weight_of('Head', 'Neck'))
    Pt, Nt = D.posed(top)
    top, _ = clip(top, (neck_y + 0.004) - Pt[:, 1])
    Pt, Nt = D.posed(top)
    eyes = eye_spots(top, Pt, Nt, D.albedo)
    # Sized about its own head bone, and stood on the knight's.
    dh, kh = D.rest_world('Head'), K.rest_world('Head')
    place = lambda p: (p - dh) * size + kh + np.asarray(shift)
    hx, hy, hs = HEAD_AT
    top.UV = np.clip(top.UV, 0, 1) * hs / SHEET + [hx / SHEET, hy / SHEET]
    parts = []
    ex, ey, es = EYE_AT
    for c, n, r in eyes:
        d = disc(place(c + n * 0.0012), n, max(r, 0.004) * size * 0.9, (ex / SHEET, ey / SHEET, (ex + es) / SHEET, (ey + es) / SHEET))
        parts.append(d)
    fx, fy, fs = FLOOR_AT
    floor = rim_floor(Pb, rim, 0.012, [(fx + fs / 2) / SHEET, (fy + fs / 2) / SHEET])
    top.P, top.N = place(Pt), Nt
    new = Mesh.join([top, floor] + parts)
    # From where it stands at rest back to the raw mesh's space, hung off the head.
    new.P = new.P @ Gi[:3, :3].T + Gi[:3, 3]
    new.N = new.N @ Gi[:3, :3].T
    new.N /= np.maximum(np.linalg.norm(new.N, axis=1, keepdims=True), 1e-12)
    new.bind(khead)
    mesh = Mesh.join([body, new])

    # The maps.
    alb = K.albedo.copy()
    assert alb.size == (SHEET, SHEET), f'{knight}: sheet is {alb.size}'
    for x, y, s in (HEAD_AT, EYE_AT, FLOOR_AT):
        assert np.asarray(alb.crop((x, y, x + s, y + s))).mean() < 3, f"{knight}: the sheet isn't empty at {x},{y}"
    alb.paste(red_veins(D.albedo).resize((hs, hs), Image.LANCZOS), (hx, hy))
    yy, xx = np.mgrid[0:es, 0:es]
    rr = np.hypot(xx - es / 2 + 0.5, yy - es / 2 + 0.5) / (es / 2)
    t = np.clip(rr, 0, 1)[..., None]
    hot = np.array([255, 150, 70]) * (1 - t) ** 2 + np.array([200, 12, 6]) * (1 - (1 - t) ** 2)
    alb.paste(Image.fromarray(hot.astype(np.uint8)), (ex, ey))
    alb.paste(Image.new('RGB', (fs, fs), (14, 13, 13)), (fx, fy))
    k = SHEET // MR
    mr = np.zeros((MR, MR, 4), np.uint8)
    mr[...] = (0, 230, 0, 255)
    dn, dmr = D.maps()
    rough = np.asarray(dmr.convert('RGB').resize((hs // k, hs // k), Image.LANCZOS))[..., 1]
    mr[hy // k:(hy + hs) // k, hx // k:(hx + hs) // k, 1] = rough
    # How strongly each texel of the eyes' patch shines: all of it at the middle, a third at the edge.
    g = np.asarray(Image.fromarray(((1 - 0.67 * np.clip(rr, 0, 1) ** 2) * 255).astype(np.uint8)).resize((es // k, es // k), Image.LANCZOS))
    mr[ey // k:(ey + es) // k, ex // k:(ex + es) // k, 3] = 255 - g
    mr = Image.fromarray(mr, 'RGBA')

    out = f'{TRIPO}/{id_}.glb'
    size_b = K.save(out, mesh, alb, None, mr)
    M = Model(out)
    print(f'{id_}: {len(mesh.P)} corners, {len(mesh.F)} faces, {size_b / 1e6:.2f} MB; head bone at {K.rest_world("Head")[1]:.4f}, top of the head {M.posed()[0][:, 1].max():.4f}')
    if look:
        glow = Image.fromarray(255 - np.asarray(mr)[..., 3])
        P, N = M.posed()
        h = kh + [0, 0.05, 0]
        pics = [draw(P, N, M.mesh, M.albedo, yaw=y, pitch=p, size=(340, 340), centre=h, span=0.34, light=2.2, glow=glow) for y, p in ((0, 0), (50, 10), (180, 10), (0, 55))]
        pics += [draw(P, N, M.mesh, M.albedo, yaw=y, size=(340, 340), light=2.2, glow=glow) for y in (0, 180)]
        for clip_, fr in (('idle', 0.3), ('walk', 0.4), ('atk1', 0.5), ('atk3', 0.45), ('roar', 0.5), ('death', 0.4)):
            P, N = M.posed(clip=clip_, frac=fr)
            c = P[M.mesh.J[:, 0] == khead].mean(0) if (M.mesh.J[:, 0] == khead).any() else P.mean(0)
            pics.append(draw(P, N, M.mesh, M.albedo, yaw=35, pitch=8, size=(340, 340), centre=c - [0, 0.02, 0], span=0.42, light=2.2, glow=glow))
        os.makedirs(look, exist_ok=True)
        sheet(pics, 6).save(f'{look}/{id_}.png')
    return M


def roster_line(id_, knight, model):
    """The knight's own line, with this one's name and size: every clip and weapon is his."""
    path = f'{TRIPO}/roster.json'
    roster = json.load(open(path))
    e = json.loads(json.dumps(roster[knight]))
    e['id'] = id_
    e['bytes'] = os.path.getsize(f'{TRIPO}/{id_}.glb')
    roster[id_] = e
    json.dump(roster, open(path, 'w'), indent=1)
    open(path, 'a').write('\n')


if __name__ == '__main__':
    look = sys.argv[sys.argv.index('--look') + 1] if '--look' in sys.argv else None
    only = [a for a in sys.argv[1:] if a in BUILDS]
    for id_, b in BUILDS.items():
        if only and id_ not in only:
            continue
        m = build(id_, look=look, **b)
        if '--no-roster' not in sys.argv:
            roster_line(id_, b['knight'], m)
